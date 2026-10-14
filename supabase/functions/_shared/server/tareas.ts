// Tareas programadas (pg_cron llama /tareas cada 5 minutos). Cada aviso
// lleva una clave única, así que correr la tarea de más no duplica correos.

import { diasEntre, fechaLarga, fechaLocal, inicioDelDia, partes, rangoTexto, sumarDias, horaLocal } from '../core/tiempo.ts';
import { dinero } from '../core/util.ts';
import type { Ctx } from './ctx.ts';
import { ajuste, type Avisos, type Negocio } from './db.ts';
import { avisar } from './correo.ts';
import { vencerPedido } from './pedidos.ts';
import { infoPedido, sesionesActivas, tokenCliente, urlMisReservas, urlPanelPedido, varsPedido } from './info.ts';

// deno-lint-ignore no-explicit-any
type Fila = Record<string, any>;
const TZ = 'America/Mexico_City';

function cuandoTexto(hoy: string, fecha: string) {
  const d = diasEntre(hoy, fecha);
  return d === 0 ? 'hoy' : d === 1 ? 'mañana' : d === 2 ? 'pasado mañana' : `el ${fechaLarga(fecha, false)}`;
}

export async function ejecutarTareas(ctx: Ctx) {
  const res: Record<string, number | string> = {};
  const ahora = ctx.ahora();
  const avisos = await ajuste<Avisos>(ctx.sql, 'avisos');
  const negocio = await ajuste<Negocio>(ctx.sql, 'negocio');
  const hoy = fechaLocal(ahora, TZ);
  const hora = partes(ahora, TZ).hora;
  const paso = async (nombre: string, fn: () => Promise<number>) => {
    try { res[nombre] = await fn(); } catch (e) { res[nombre] = `error: ${(e as Error).message}`; console.error('Tarea', nombre, e); }
  };

  await paso('apartados_vencidos', async () => {
    const vencidos = await ctx.sql`select id from pedidos where estado in ('apartado', 'pendiente_pago') and apartado_vence < ${ahora}`;
    for (const p of vencidos) await vencerPedido(ctx, p.id, { avisar: true });
    await ctx.sql`delete from ocupacion where vence is not null and vence < ${ahora}`;
    await ctx.sql`delete from accesos where vence < ${new Date(ahora.getTime() - 30 * 86400000)}`;
    return vencidos.length;
  });

  await paso('recordatorios', async () => {
    let n = 0;
    const horas = [...(avisos.recordatoriosH ?? [48, 24])].sort((a, b) => b - a);
    const sesiones = await ctx.sql`
      select s.id, s.inicio, s.pedido_id from sesiones s join pedidos p on p.id = s.pedido_id
      where s.estado = 'activa' and p.estado = 'pagado' and s.inicio > ${ahora} and s.inicio < ${new Date(ahora.getTime() + horas[0] * 3600000)}`;
    for (const s of sesiones) {
      const faltan = (new Date(s.inicio).getTime() - ahora.getTime()) / 3600000;
      const h = [...horas].reverse().find((x) => faltan <= x);
      if (h == null) continue;
      const i = await infoPedido(ctx.sql, s.pedidoId);
      const ses = i.sesiones.find((x) => x.id === s.id)!;
      const token = await tokenCliente(ctx, i.cliente.id, 30);
      const enlace = urlMisReservas(ctx, token);
      const lista: string[] = [];
      if (i.espacio.id === 'foro') lista.push(`Registra a tu equipo e invitados en "Mis reservas" (aforo de ${i.espacio.aforo ?? 25} personas). Las visitas sin registro tienen un cargo de $100 por persona.`);
      if (i.trabajos.some((t) => t.estado === 'esperando_material')) lista.push('Todavía no recibimos el material de tu postproducción.');
      const ok = await avisar(ctx, 'recordatorio_sesion', {
        para: i.cliente.correo, pedidoId: i.pedido.id, clave: `rec:${h}:${s.id}:${new Date(s.inicio).toISOString()}`,
        vars: { ...varsPedido(i, enlace), fecha: ses.texto, cuando: cuandoTexto(hoy, ses.fecha) },
        bloques: {
          datos: [['Cuándo', ses.texto], ['Dónde', negocio.direccion], ['Pedido', i.pedido.numero]],
          lista: lista.length ? { titulo: 'Antes de llegar', elementos: lista } : undefined,
          botones: [{ texto: 'Ver mis reservas', url: enlace }, ...(negocio.mapa ? [{ texto: 'Cómo llegar', url: negocio.mapa, secundario: true }] : [])],
          nota: negocio.llegada,
        },
      });
      if (ok) n++;
    }
    return n;
  });

  await paso('visitas', async () => {
    let n = 0;
    const vs = await ctx.sql`select v.*, e.nombre_corto from visitas v join espacios e on e.id = v.espacio_id where v.estado = 'agendada' and v.inicio > ${ahora} and v.inicio < ${new Date(ahora.getTime() + 24 * 3600000)}`;
    for (const v of vs) {
      const ok = await avisar(ctx, 'visita_recordatorio', {
        para: v.correo, clave: `visita-rec:${v.id}`,
        vars: { nombre: v.nombre.split(' ')[0], espacio: v.nombreCorto.toLowerCase(), fecha: rangoTexto(new Date(v.inicio), new Date(v.fin), TZ), enlace: negocio.mapa },
        bloques: { botones: negocio.mapa ? [{ texto: 'Cómo llegar', url: negocio.mapa }] : [], nota: negocio.llegada },
      });
      if (ok) n++;
    }
    return n;
  });

  await paso('oxxo_por_vencer', async () => {
    let n = 0;
    const pagos = await ctx.sql`select id, pedido_id, oxxo from pagos where estado = 'pendiente' and metodo = 'oxxo' and (oxxo->>'vence')::timestamptz between ${ahora} and ${new Date(ahora.getTime() + 6 * 3600000)}`;
    for (const p of pagos) {
      const i = await infoPedido(ctx.sql, p.pedidoId);
      const vence = new Date(p.oxxo.vence);
      const ok = await avisar(ctx, 'oxxo_por_vencer', {
        para: i.cliente.correo, pedidoId: i.pedido.id, clave: `oxxo-pronto:${p.id}`,
        vars: { ...varsPedido(i, ''), vence: `${fechaLarga(fechaLocal(vence, TZ))} a las ${horaLocal(vence, TZ)}` },
        bloques: { botones: p.oxxo.url ? [{ texto: 'Ver ficha de pago', url: p.oxxo.url }] : [] },
      });
      if (ok) n++;
    }
    return n;
  });

  await paso('pedidos_completados', async () => {
    const r = await ctx.sql`
      update pedidos p set estado = 'completado', actualizado = now()
      where p.estado = 'pagado'
        and exists (select 1 from sesiones s where s.pedido_id = p.id and s.estado <> 'cancelada')
        and not exists (select 1 from sesiones s where s.pedido_id = p.id and s.estado = 'activa' and s.fin > ${ahora})
        and not exists (select 1 from trabajos t where t.pedido_id = p.id and t.estado not in ('aprobado', 'cancelado'))
      returning id`;
    return r.length;
  });

  await paso('gracias', async () => {
    if (hora < (avisos.horaGracias ?? 10)) return 0;
    let n = 0;
    const desde = inicioDelDia(sumarDias(hoy, -2), TZ);
    const hasta = inicioDelDia(hoy, TZ);
    const pedidos = await ctx.sql`
      select p.id from pedidos p where p.estado in ('pagado', 'completado')
        and exists (select 1 from sesiones s where s.pedido_id = p.id and s.estado = 'activa' and s.fin >= ${desde} and s.fin < ${hasta})
        and not exists (select 1 from sesiones s where s.pedido_id = p.id and s.estado = 'activa' and s.fin >= ${hasta})`;
    for (const p of pedidos) {
      const i = await infoPedido(ctx.sql, p.id);
      const ok = await avisar(ctx, 'gracias', {
        para: i.cliente.correo, pedidoId: p.id, clave: `gracias:${p.id}`,
        vars: { ...varsPedido(i, ''), resena: avisos.resenaUrl ?? '' },
        bloques: { botones: avisos.resenaUrl ? [{ texto: 'Dejar una reseña', url: avisos.resenaUrl }] : [] },
      });
      if (ok) n++;
    }
    return n;
  });

  await paso('creditos_por_vencer', async () => {
    let n = 0;
    const cs = await ctx.sql`select cr.*, c.nombre, c.correo from creditos cr join clientes c on c.id = cr.cliente_id
      where cr.saldo > 0 and cr.vence > ${ahora} and cr.vence < ${new Date(ahora.getTime() + (avisos.creditoAvisoDias ?? 15) * 86400000)}`;
    for (const c of cs) {
      const token = await tokenCliente(ctx, c.clienteId, 30);
      const ok = await avisar(ctx, 'credito_por_vencer', {
        para: c.correo, clave: `credito-aviso:${c.id}`,
        vars: { nombre: c.nombre.split(' ')[0], monto: dinero(c.saldo), vence: fechaLarga(fechaLocal(new Date(c.vence), TZ)), enlace: urlMisReservas(ctx, token) },
        bloques: { botones: [{ texto: 'Reservar', url: `${ctx.env.sitioUrl}/estudio/` }] },
      });
      if (ok) n++;
    }
    return n;
  });

  await paso('material', async () => {
    let n = 0;
    for (const d of avisos.materialRecordatoriosDias ?? [3, 7]) {
      const ps = await ctx.sql`select distinct t.pedido_id from trabajos t join pedidos p on p.id = t.pedido_id
        where t.estado = 'esperando_material' and p.estado = 'pagado' and p.pagado_en < ${new Date(ahora.getTime() - d * 86400000)}`;
      for (const p of ps) {
        const i = await infoPedido(ctx.sql, p.pedidoId);
        const faltan = i.trabajos.filter((t) => t.estado === 'esperando_material');
        const token = await tokenCliente(ctx, i.cliente.id, 30);
        const servicios = [...new Set(faltan.map((t) => String(t.productoNombre ?? '').toLowerCase()))].join(', ');
        const ok = await avisar(ctx, 'recordatorio_material', {
          para: i.cliente.correo, pedidoId: i.pedido.id, clave: `material:${p.pedidoId}:${d}`,
          vars: { ...varsPedido(i, urlMisReservas(ctx, token)), servicios: `tu ${servicios}` },
          bloques: { lista: { elementos: faltan.map((t) => `${t.productoNombre}${t.titulo ? ` · ${t.titulo}` : ` · pieza ${t.unidad}`}`) }, botones: [{ texto: 'Mandar material', url: urlMisReservas(ctx, token) }] },
        });
        if (ok) n++;
      }
    }
    return n;
  });

  await paso('entregas_por_vencer', async () => {
    let n = 0;
    const ts = await ctx.sql`select t.*, pr.nombre as producto_nombre, to_char(t.fecha_entrega, 'YYYY-MM-DD') as fecha from trabajos t left join productos pr on pr.id = t.producto_id
      where t.estado in ('en_cola', 'en_proceso', 'en_revision') and t.fecha_entrega between ${hoy}::date and ${sumarDias(hoy, 1)}::date`;
    for (const t of ts) {
      const i = await infoPedido(ctx.sql, t.pedidoId);
      const cuando = t.fecha === hoy ? 'hoy' : 'mañana';
      const ok = await avisar(ctx, 'trabajo_por_vencer', {
        para: 'equipo', pedidoId: t.pedidoId, clave: `entrega:${t.id}:${t.fecha}:${cuando}`,
        vars: { ...varsPedido(i, ''), nombre: i.cliente.nombre, servicio: String(t.productoNombre ?? '').toLowerCase(), titulo: t.titulo ?? `pieza ${t.unidad}`, cuando },
        bloques: { datos: [['Encargado', t.encargado ?? 'sin asignar'], ['Estado', t.estado.replace('_', ' ')]], botones: [{ texto: 'Abrir en el panel', url: urlPanelPedido(ctx, t.pedidoId) }] },
      });
      if (ok) n++;
    }
    return n;
  });

  await paso('auto_aprobar', async () => {
    const r = await ctx.sql`update trabajos set estado = 'aprobado', aprobado_en = ${ahora}, notas = coalesce(notas || E'\n', '') || 'Aprobado automáticamente sin respuesta del cliente.'
      where estado = 'entregado' and entregado_en < ${new Date(ahora.getTime() - (avisos.autoAprobarDias ?? 14) * 86400000)} returning id`;
    return r.length;
  });

  await paso('pintura', async () => {
    let n = 0;
    const ts = await ctx.sql`select t.*, s.inicio from tareas t join sesiones s on s.id = t.sesion_id where t.tipo = 'programar_pintura' and t.hecha_en is null
      and t.vence between ${ahora} and ${new Date(ahora.getTime() + (avisos.pinturaAvisoDias ?? 3) * 86400000)}`;
    for (const t of ts) {
      const i = await infoPedido(ctx.sql, t.pedidoId);
      const ses = i.sesiones.find((x) => x.id === t.sesionId);
      const ok = await avisar(ctx, 'pintura_ciclorama', {
        para: 'equipo', pedidoId: t.pedidoId, clave: `pintura-aviso:${t.id}`,
        vars: { ...varsPedido(i, ''), color: t.detalle.split(' · ')[1] ?? '', fecha: ses?.texto ?? '', desde: fechaLarga(fechaLocal(new Date(t.vence), TZ), false) },
        bloques: { botones: [{ texto: 'Abrir en el panel', url: urlPanelPedido(ctx, t.pedidoId) }] },
      });
      if (ok) n++;
    }
    return n;
  });

  await paso('resumen_manana', async () => {
    if (hora < (avisos.horaResumen ?? 20)) return 0;
    const manana = sumarDias(hoy, 1);
    const a = inicioDelDia(manana, TZ);
    const b = inicioDelDia(sumarDias(manana, 1), TZ);
    const [sesiones, visitas, bloqueos, tareas] = await Promise.all([
      ctx.sql`select s.id, s.inicio, s.fin, s.espacio_id, s.ingeniero_asignado, s.extras, p.numero, c.nombre, c.telefono, m.nombre as modalidad,
          (select string_agg(i.nombre, ', ') from invitados i where i.sesion_id = s.id) as invitados
        from sesiones s join pedidos p on p.id = s.pedido_id join clientes c on c.id = p.cliente_id left join modalidades m on m.id = s.modalidad_id
        where s.estado = 'activa' and p.estado in ('pagado', 'pendiente_pago') and s.inicio >= ${a} and s.inicio < ${b} order by s.espacio_id, s.inicio`,
      ctx.sql`select * from visitas where estado = 'agendada' and inicio >= ${a} and inicio < ${b} order by inicio`,
      ctx.sql`select espacio_id, lower(rango) as inicio, upper(rango) as fin, tipo, nota from ocupacion where tipo in ('bloqueo', 'pintura') and vence is null and rango && tstzrange(${a}, ${b})`,
      ctx.sql`select t.detalle from tareas t join sesiones s on s.id = t.sesion_id where t.hecha_en is null and s.inicio >= ${a} and s.inicio < ${b}`,
    ]);
    const filas = [
      ...sesiones.map((s: Fila) => [s.espacioId === 'foro' ? 'Foro' : 'Estudio', `${horaLocal(new Date(s.inicio), TZ)}–${horaLocal(new Date(s.fin), TZ)}`, `${s.nombre} (${s.telefono ?? ''})`, `${s.modalidad ?? ''}${s.ingenieroAsignado ? ` · ${s.ingenieroAsignado}` : ''}${(s.extras ?? []).length ? ' · con extras' : ''}`, s.invitados ?? '']),
      ...visitas.map((v: Fila) => [v.espacioId === 'foro' ? 'Foro' : 'Estudio', `${horaLocal(new Date(v.inicio), TZ)}`, `Visita: ${v.nombre} (${v.telefono ?? ''})`, '', '']),
      ...bloqueos.map((o: Fila) => [o.espacioId, `${horaLocal(new Date(o.inicio), TZ)}–${horaLocal(new Date(o.fin), TZ)}`, o.tipo === 'pintura' ? 'Pintura del ciclorama' : `Bloqueado ${o.nota ?? ''}`, '', '']),
    ];
    await avisar(ctx, 'resumen_manana', {
      para: 'equipo', clave: `resumen:${manana}`, vars: { fecha: fechaLarga(manana) },
      bloques: {
        tabla: filas.length ? { columnas: ['Espacio', 'Horario', 'Quién', 'Modalidad', 'Invitados'], filas } : undefined,
        lista: tareas.length ? { titulo: 'Pendientes para mañana', elementos: tareas.map((t: Fila) => t.detalle) } : undefined,
        nota: filas.length ? undefined : 'No hay sesiones ni visitas mañana.',
        botones: [{ texto: 'Abrir la agenda', url: `${ctx.env.sitioUrl}/admin/#/agenda` }],
      },
    });
    return 1;
  });

  await paso('resumen_semanal', async () => {
    const dia = new Date(`${hoy}T12:00:00Z`).getUTCDay();
    if (dia !== (avisos.diaResumenSemanal ?? 1) || hora < 9) return 0;
    const desde = sumarDias(hoy, -7);
    const a = inicioDelDia(desde, TZ);
    const b = inicioDelDia(hoy, TZ);
    const [[ing], [ped], [canc], [prox], [pend]] = await Promise.all([
      ctx.sql`select coalesce(sum(case when tipo = 'cobro' then monto else -monto end), 0) as monto from pagos where estado = 'pagado' and confirmado >= ${a} and confirmado < ${b}`,
      ctx.sql`select count(*)::int as n from pedidos where pagado_en >= ${a} and pagado_en < ${b}`,
      ctx.sql`select count(*)::int as n from pedidos where estado = 'cancelado' and cancelado_en >= ${a} and cancelado_en < ${b}`,
      ctx.sql`select count(*)::int as n from sesiones s join pedidos p on p.id = s.pedido_id where s.estado = 'activa' and p.estado = 'pagado' and s.inicio >= ${b} and s.inicio < ${inicioDelDia(sumarDias(hoy, 7), TZ)}`,
      ctx.sql`select count(*)::int as n from tareas where hecha_en is null`,
    ]);
    await avisar(ctx, 'resumen_semanal', {
      para: 'equipo', clave: `semana:${hoy}`, vars: { desde: fechaLarga(desde, false), hasta: fechaLarga(sumarDias(hoy, -1), false) },
      bloques: {
        datos: [['Ingresos', dinero(Number(ing.monto))], ['Pedidos pagados', String(ped.n)], ['Cancelaciones', String(canc.n)], ['Sesiones esta semana', String(prox.n)], ['Pendientes abiertos', String(pend.n)]],
        botones: [{ texto: 'Ver reportes', url: `${ctx.env.sitioUrl}/admin/#/reportes` }],
      },
    });
    return 1;
  });

  void sesionesActivas;
  return res;
}
