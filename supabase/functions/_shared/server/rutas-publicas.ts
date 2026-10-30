// Rutas del sitio: catálogo, disponibilidad, pedidos, visitas, solicitudes
// y "Mis reservas" (con enlace de acceso, sin contraseña).

import type { Catalogo } from '../core/tipos.ts';
import { horariosDelDia, opcionesVisita } from '../core/disponibilidad.ts';
import { diasEntre, fechaLocal, rangoTexto, sumarDias, inicioDelDia } from '../core/tiempo.ts';
import { dinero } from '../core/util.ts';
import type { Ctx, Sql } from './ctx.ts';
import { ajuste, cargarCatalogo, esEmpalme, ocupacionDe, type Negocio } from './db.ts';
import { correoValido, Enrutador, esFecha, falla, json, noEncontrado, texto, type Solicitud } from './http.ts';
import { acceso, clienteDeToken, codigoCorto, crearAcceso } from './seguridad.ts';
import { avisar } from './correo.ts';
import { calendarioIcs, type EventoIcs } from './ics.ts';
import { cambiarFecha, cancelarPedido, cotizarEnServidor, crearPedido, iniciarPago, limpiarCarrito, vencerPedido, vistaPreviaCancelacion } from './pedidos.ts';
import { accionCliente, materialSesion } from './trabajos.ts';
import { feedPersona } from './equipo.ts';
import { eventosIcs, infoPedido, sesionesActivas, urlMisReservas } from './info.ts';
import { puedeCambiarFecha } from '../core/politicas.ts';

// deno-lint-ignore no-explicit-any
type Fila = Record<string, any>;

/** Catálogo público de un espacio, con la forma que espera el núcleo. */
function catalogoPublico(c: Catalogo, espacioId: string, hoy: string): Catalogo {
  const de = <T extends { espacioId: string | null }>(xs: T[]) => xs.filter((x) => x.espacioId === espacioId);
  return {
    espacios: c.espacios.filter((e) => e.id === espacioId),
    horarios: de(c.horarios),
    excepciones: de(c.excepciones).filter((e) => e.fecha >= hoy),
    modalidades: de(c.modalidades),
    bloques: de(c.bloques),
    extras: de(c.extras),
    productos: de(c.productos),
    paquetes: de(c.paquetes),
    tiposCargo: [],
  };
}

async function pedidoDelCliente(ctx: Ctx, token: string | null, pedidoId: string) {
  const clienteId = await clienteDeToken(ctx, token);
  const i = await infoPedido(ctx.sql, pedidoId);
  if (i.cliente.id !== clienteId) throw noEncontrado('Pedido');
  return i;
}

function vistaPedido(ctx: Ctx, i: Awaited<ReturnType<typeof infoPedido>>) {
  const ahora = ctx.ahora();
  const oxxo = i.pagos.find((p) => p.metodo === 'oxxo' && p.estado === 'pendiente');
  return {
    id: i.pedido.id,
    numero: i.pedido.numero,
    estado: i.pedido.estado,
    creado: i.pedido.creado,
    pagadoEn: i.pedido.pagadoEn,
    espacio: { id: i.espacio.id, nombre: i.espacio.nombre, nombreCorto: i.espacio.nombreCorto, zonaHoraria: i.espacio.zonaHoraria, aforo: i.espacio.aforo, politica: i.espacio.politica },
    total: i.pedido.total,
    iva: i.pedido.iva,
    saldo: i.saldo,
    lineas: i.lineas.map((l) => ({ concepto: l.concepto, importe: l.importe, tipo: l.tipo })),
    sesiones: i.sesiones.map((s) => ({
      id: s.id, inicio: s.inicio, fin: s.fin, texto: s.texto, estado: s.estado, bloqueId: s.bloqueId, modalidadId: s.modalidadId,
      horas: (new Date(s.fin).getTime() - new Date(s.inicio).getTime()) / 3600000, extras: s.extras, conflicto: s.conflicto,
      invitados: i.invitados.filter((x) => x.sesionId === s.id).map((x) => x.nombre),
      cambio: s.estado === 'activa' && i.pedido.estado === 'pagado' ? puedeCambiarFecha(i.espacio, new Date(s.inicio), ahora) : { permitido: false },
    })),
    trabajos: i.trabajos.filter((t) => t.estado !== 'cancelado').map((t) => ({
      id: t.id, producto: t.productoNombre, unidad: t.unidad, titulo: t.titulo, estado: t.estado, materialUrl: t.materialUrl, referencias: t.referencias,
      entregaUrl: ['entregado', 'en_revision', 'aprobado'].includes(t.estado) ? t.entregaUrl : null, fechaEntrega: t.fechaEntrega,
      revisionesIncluidas: t.revisionesIncluidas, revisionesUsadas: t.revisionesUsadas,
    })),
    // Productor, músico: el cliente manda demos y referencias; ve quién le tocó.
    enSesion: i.lineas.filter((l) => l.enSesion).map((l) => ({
      id: l.id, servicio: l.productoNombre ?? l.concepto, concepto: l.concepto,
      sesion: i.sesiones.find((s) => s.id === l.sesionId)?.texto ?? null,
      asignado: l.datos?.asignado ?? null, material: l.datos?.material ?? null,
    })),
    pagos: i.pagos.filter((p) => p.estado !== 'fallido').map((p) => ({ fecha: p.confirmado ?? p.creado, tipo: p.tipo, metodo: p.metodo, monto: p.monto, estado: p.estado })),
    oxxo: oxxo?.oxxo ?? null,
    cancelacion: i.pedido.estado === 'pagado' ? vistaPreviaCancelacion(ctx, i) : null,
    cancelado: i.pedido.cancelacion,
  };
}

export function rutasPublicas(r: Enrutador) {
  r.get('/salud', async ({ ctx }) => { await ctx.sql`select 1`; return { ok: true, pasarela: ctx.pasarela.nombre, correo: ctx.correo.nombre }; });

  r.get('/catalogo', async ({ ctx, q }) => {
    const espacio = q('espacio') ?? '';
    const cat = await cargarCatalogo(ctx.sql, true);
    const esp = cat.espacios.find((e) => e.id === espacio && e.reservable);
    if (!esp) throw noEncontrado('Espacio');
    const negocio = await ajuste<Negocio>(ctx.sql, 'negocio');
    const ahora = ctx.ahora();
    return json(
      { catalogo: catalogoPublico(cat, espacio, fechaLocal(ahora, esp.zonaHoraria)), ahora: ahora.toISOString(), negocio: { whatsapp: negocio.whatsapp, whatsappTexto: negocio.whatsappTexto, correo: negocio.correo, sitio: negocio.sitio } },
      200, { 'cache-control': 'public, max-age=60' },
    );
  });

  r.get('/disponibilidad', async ({ ctx, q }) => {
    const espacio = q('espacio') ?? '';
    const desde = q('desde');
    const hasta = q('hasta');
    if (!esFecha(desde) || !esFecha(hasta) || diasEntre(desde, hasta) < 0 || diasEntre(desde, hasta) > 120) throw falla(422, 'RANGO', 'Rango de fechas inválido.');
    const [esp] = await ctx.sql`select zona_horaria from espacios where id = ${espacio} and reservable and activo`;
    if (!esp) throw noEncontrado('Espacio');
    let excluirPedido: string | undefined;
    let excluirVisita: string | undefined;
    if (q('t') && q('pedido')) excluirPedido = (await pedidoDelCliente(ctx, q('t'), q('pedido')!)).pedido.id;
    if (q('t') && q('visita')) {
      const a = await acceso(ctx.sql, q('t'), ctx.ahora());
      if (a.visitaId === q('visita')) excluirVisita = a.visitaId!;
    }
    const tz = esp.zonaHoraria;
    const occ = await ocupacionDe(ctx.sql, espacio, inicioDelDia(sumarDias(desde, -12), tz), inicioDelDia(sumarDias(hasta, 3), tz), ctx.ahora(), { excluirPedido, excluirVisita });
    return { ahora: ctx.ahora().toISOString(), ocupacion: occ.map((o) => ({ inicio: o.inicio, fin: o.fin })) };
  });

  r.post('/cotizar', async ({ ctx, cuerpo }) => {
    const b = await cuerpo();
    const correo = typeof b.correo === 'string' && b.correo.includes('@') ? b.correo : null;
    const { q } = await cotizarEnServidor(ctx, b.carrito, correo);
    return q;
  });

  r.post('/pedidos', async ({ ctx, cuerpo }) => {
    const b = await cuerpo();
    const res = await crearPedido(ctx, b as never, { origen: 'web' });
    return { pedido: res.pedidoId, numero: res.numero, url: res.url, estado: res.estado, token: res.token, total: res.total };
  });

  r.get('/pedidos/:id', async ({ ctx, params, q }) => vistaPedido(ctx, await pedidoDelCliente(ctx, q('t'), params.id)));

  r.post('/pagar', async ({ ctx, cuerpo }) => {
    const b = await cuerpo();
    await pedidoDelCliente(ctx, String(b.t ?? ''), String(b.pedido ?? ''));
    return iniciarPago(ctx, String(b.pedido), String(b.t));
  });

  // El cliente volvió de Stripe sin pagar: se libera su apartado para que
  // pueda reintentar con el mismo horario. Devuelve el carrito para retomarlo.
  r.post('/liberar', async ({ ctx, cuerpo }) => {
    const b = await cuerpo();
    const i = await pedidoDelCliente(ctx, String(b.t ?? ''), String(b.pedido ?? ''));
    if (i.pedido.estado === 'apartado' && i.pedido.origen === 'web') await vencerPedido(ctx, i.pedido.id, { avisar: false });
    return { carrito: i.pedido.carrito, estado: i.pedido.estado === 'apartado' && i.pedido.origen === 'web' ? 'vencido' : i.pedido.estado };
  });

  // ---------- Cotizaciones compartidas ----------
  r.post('/cotizaciones', async ({ ctx, cuerpo }) => {
    const b = await cuerpo();
    const { carrito, q } = await cotizarEnServidor(ctx, b.carrito);
    if (q.errores.some((e) => !['FALTA_FECHA', 'EXTRA_ANTICIPACION', 'PRODUCTO_DATOS'].includes(e.codigo))) throw falla(422, q.errores[0].codigo, q.errores[0].mensaje);
    const codigo = codigoCorto(8);
    await ctx.sql`insert into cotizaciones (codigo, espacio_id, carrito, total) values (${codigo}, ${carrito.espacioId}, ${ctx.sql.json(carrito as never)}, ${q.total})`;
    const ruta = carrito.espacioId === 'foro' ? 'foro' : 'estudio';
    return { codigo, url: `${ctx.env.sitioUrl}/${ruta}/?cotizacion=${codigo}`, total: q.total };
  });

  r.get('/cotizaciones/:codigo', async ({ ctx, params }) => {
    const [c] = await ctx.sql`update cotizaciones set vistas = vistas + 1 where codigo = ${params.codigo.toUpperCase()} returning carrito, espacio_id, creado`;
    if (!c) throw noEncontrado('Cotización');
    return { carrito: c.carrito, espacio: c.espacioId, creado: c.creado };
  });

  // ---------- Solicitudes de cotización ----------
  r.post('/solicitudes', async ({ ctx, cuerpo }) => {
    const b = await cuerpo();
    const nombre = texto(b.nombre, 'tu nombre', { max: 120 });
    const correo = correoValido(b.correo);
    const telefono = texto(b.telefono, 'tu teléfono', { requerido: false, max: 40 });
    const descripcion = texto(b.descripcion, 'la descripción de tu proyecto', { max: 4000 });
    const carrito = b.carrito ? limpiarCarrito(b.carrito) : null;
    const espacio = carrito?.espacioId || texto(b.espacio, 'el espacio', { requerido: false, max: 40 }) || null;
    let resumen = '';
    if (carrito) {
      const { q } = await cotizarEnServidor(ctx, carrito);
      resumen = q.lineas.map((l) => `• ${l.concepto}${l.importe ? ': ' + dinero(l.importe) : ''}`).join('\n');
    }
    const [s] = await ctx.sql`insert into solicitudes (espacio_id, nombre, correo, telefono, descripcion, carrito) values (${espacio}, ${nombre}, ${correo}, ${telefono || null}, ${descripcion}, ${carrito ? ctx.sql.json(carrito as never) : null}) returning id`;
    await avisar(ctx, 'nueva_solicitud', {
      para: 'equipo', vars: { nombre, correo, telefono: telefono || 'sin teléfono', descripcion: resumen ? `${descripcion}\n\nLo que armó en el cotizador:\n${resumen}` : descripcion },
      bloques: { botones: [{ texto: 'Abrir en el panel', url: `${ctx.env.sitioUrl}/admin/#/solicitudes/${s.id}` }] },
    });
    await avisar(ctx, 'solicitud_recibida', { para: correo, vars: { nombre: nombre.split(' ')[0] } });
    return { ok: true };
  });

  // ---------- Visitas ----------
  r.post('/visitas', async ({ ctx, cuerpo }) => {
    const b = await cuerpo();
    const ahora = ctx.ahora();
    const cat = await cargarCatalogo(ctx.sql, true);
    const esp = cat.espacios.find((e) => e.id === b.espacio && e.reservable);
    if (!esp || !esp.visitas.activas) throw falla(422, 'SIN_VISITAS', 'Este espacio no tiene visitas en línea.');
    const nombre = texto(b.nombre, 'tu nombre', { max: 120 });
    const correo = correoValido(b.correo);
    const telefono = texto(b.telefono, 'tu WhatsApp o teléfono', { max: 40 });
    const notas = texto(b.notas, 'las notas', { requerido: false, max: 1000 });
    const inicio = new Date(String(b.inicio));
    if (Number.isNaN(inicio.getTime())) throw falla(422, 'FECHA_INVALIDA', 'Elige fecha y hora.');
    const fin = new Date(inicio.getTime() + esp.visitas.duracionMin * 60000);
    const fecha = fechaLocal(inicio, esp.zonaHoraria);
    const occ = await ocupacionDe(ctx.sql, esp.id, inicioDelDia(fecha, esp.zonaHoraria), inicioDelDia(sumarDias(fecha, 2), esp.zonaHoraria), ahora);
    const dia = horariosDelDia(opcionesVisita(cat, esp, occ, ahora), fecha);
    if (!dia.horarios.some((h) => h.inicio === inicio.toISOString())) throw falla(409, 'HORARIO_OCUPADO', 'Ese horario ya no está disponible. Elige otro.');
    let visitaId = '';
    try {
      await ctx.sql.begin(async (t: Sql) => {
        const [v] = await t`insert into visitas (espacio_id, inicio, fin, nombre, correo, telefono, notas) values (${esp.id}, ${inicio}, ${fin}, ${nombre}, ${correo}, ${telefono}, ${notas || null}) returning id`;
        visitaId = v.id;
        await t`insert into ocupacion (espacio_id, rango, tipo, visita_id) values (${esp.id}, tstzrange(${inicio}, ${fin}), 'visita', ${v.id})`;
      });
    } catch (err) {
      if (esEmpalme(err)) throw falla(409, 'HORARIO_OCUPADO', 'Ese horario ya no está disponible. Elige otro.');
      throw err;
    }
    const token = await crearAcceso(ctx.sql, { visitaId, dias: 120, ahora });
    const enlace = `${ctx.env.sitioUrl}/reservas/?visita=${visitaId}&t=${encodeURIComponent(token)}`;
    const texto_ = rangoTexto(inicio, fin, esp.zonaHoraria);
    const negocio = await ajuste<Negocio>(ctx.sql, 'negocio');
    await avisar(ctx, 'visita_agendada', {
      para: correo, clave: `visita:${visitaId}`, vars: { nombre: nombre.split(' ')[0], espacio: esp.nombreCorto.toLowerCase(), fecha: texto_, enlace },
      bloques: { botones: [{ texto: 'Cambiar o cancelar', url: enlace, secundario: true }, ...(negocio.mapa ? [{ texto: 'Cómo llegar', url: negocio.mapa }] : [])], nota: negocio.llegada },
      adjuntos: [{ nombre: 'visita-undying.ics', tipo: 'text/calendar', contenido: calendarioIcs('Undying Studios', [{ uid: `visita-${visitaId}`, inicio, fin, titulo: `Visita a Undying Studios · ${esp.nombreCorto}`, lugar: negocio.direccion }], ahora) }],
    });
    await avisar(ctx, 'nueva_visita', { para: 'equipo', espacioId: esp.id, vars: { nombre, correo, telefono, espacio: esp.nombreCorto, fecha: texto_ }, bloques: notas ? { nota: notas } : {} });
    return { visita: visitaId, token, texto: texto_ };
  });

  r.get('/visitas/:id', async ({ ctx, params, q }) => {
    const a = await acceso(ctx.sql, q('t'), ctx.ahora());
    if (a.visitaId !== params.id) throw noEncontrado('Visita');
    const [v] = await ctx.sql`select v.*, e.nombre_corto, e.zona_horaria from visitas v join espacios e on e.id = v.espacio_id where v.id = ${params.id}`;
    return { id: v.id, espacio: v.espacioId, espacioNombre: v.nombreCorto, inicio: v.inicio, fin: v.fin, estado: v.estado, nombre: v.nombre, texto: rangoTexto(new Date(v.inicio), new Date(v.fin), v.zonaHoraria) };
  });

  r.post('/visitas/:id/cancelar', async ({ ctx, params, cuerpo }) => {
    const b = await cuerpo();
    const a = await acceso(ctx.sql, String(b.t ?? ''), ctx.ahora());
    if (a.visitaId !== params.id) throw noEncontrado('Visita');
    await cancelarVisita(ctx, params.id, true);
    return { ok: true };
  });

  // ---------- Mis reservas ----------
  r.post('/acceso', async ({ ctx, cuerpo }) => {
    const b = await cuerpo();
    const correo = correoValido(b.correo);
    const [c] = await ctx.sql`select id, nombre from clientes where correo = ${correo}`;
    if (c) {
      const ahora = ctx.ahora();
      const token = await crearAcceso(ctx.sql, { clienteId: c.id, dias: 7, ahora });
      const bucket = Math.floor(ahora.getTime() / 600000);
      await avisar(ctx, 'acceso', { para: correo, clave: `acceso:${correo}:${bucket}`, vars: { nombre: c.nombre.split(' ')[0], enlace: urlMisReservas(ctx, token) }, bloques: { botones: [{ texto: 'Ver mis reservas', url: urlMisReservas(ctx, token) }] } });
    }
    // Misma respuesta exista o no el correo.
    return { ok: true };
  });

  r.get('/cliente', async ({ ctx, q }) => {
    const clienteId = await clienteDeToken(ctx, q('t'));
    const ahora = ctx.ahora();
    const [cliente] = await ctx.sql`select id, nombre, correo, telefono, empresa from clientes where id = ${clienteId}`;
    const pedidos = await ctx.sql`select id from pedidos where cliente_id = ${clienteId} and estado <> 'vencido' order by creado desc limit 50`;
    const vistas = [];
    for (const p of pedidos) vistas.push(vistaPedido(ctx, await infoPedido(ctx.sql, p.id)));
    const creditos = await ctx.sql`select monto, saldo, vence from creditos where cliente_id = ${clienteId} and saldo > 0 and vence > ${ahora} order by vence`;
    const visitas = await ctx.sql`select v.id, v.inicio, v.fin, v.estado, e.nombre_corto, e.zona_horaria from visitas v join espacios e on e.id = v.espacio_id where lower(v.correo) = ${cliente.correo} and v.inicio > ${ahora} and v.estado = 'agendada' order by v.inicio`;
    return {
      cliente,
      pedidos: vistas,
      creditos,
      visitas: visitas.map((v: Fila) => ({ id: v.id, espacio: v.nombreCorto, texto: rangoTexto(new Date(v.inicio), new Date(v.fin), v.zonaHoraria) })),
    };
  });

  r.post('/cliente/cambiar-fecha', async ({ ctx, cuerpo }) => {
    const b = await cuerpo();
    const i = await pedidoDelCliente(ctx, String(b.t ?? ''), String(b.pedido ?? ''));
    await cambiarFecha(ctx, i.pedido.id, String(b.sesion ?? ''), String(b.inicio ?? ''), { porCliente: true });
    return vistaPedido(ctx, await infoPedido(ctx.sql, i.pedido.id));
  });

  r.post('/cliente/cancelar', async ({ ctx, cuerpo }) => {
    const b = await cuerpo();
    const i = await pedidoDelCliente(ctx, String(b.t ?? ''), String(b.pedido ?? ''));
    const r = await cancelarPedido(ctx, i.pedido.id, { por: 'cliente', motivo: texto(b.motivo, 'el motivo', { requerido: false, max: 500 }) || undefined });
    return { ...r, pedido: vistaPedido(ctx, await infoPedido(ctx.sql, i.pedido.id)) };
  });

  r.post('/cliente/invitados', async ({ ctx, cuerpo }) => {
    const b = await cuerpo();
    const i = await pedidoDelCliente(ctx, String(b.t ?? ''), String(b.pedido ?? ''));
    const s = sesionesActivas(i).find((x) => x.id === b.sesion);
    if (!s) throw noEncontrado('Sesión');
    if (new Date(s.fin).getTime() < ctx.ahora().getTime()) throw falla(409, 'SESION_PASADA', 'La sesión ya terminó.');
    const nombres = (Array.isArray(b.nombres) ? b.nombres : []).map((n: unknown) => String(n ?? '').trim().slice(0, 120)).filter(Boolean);
    const aforo = i.espacio.aforo ?? 999;
    if (nombres.length > aforo) throw falla(422, 'AFORO', `El aforo es de ${aforo} personas.`);
    await ctx.sql.begin(async (t: Sql) => {
      await t`delete from invitados where sesion_id = ${s.id}`;
      for (const n of nombres) await t`insert into invitados (sesion_id, nombre) values (${s.id}, ${n})`;
    });
    return vistaPedido(ctx, await infoPedido(ctx.sql, i.pedido.id));
  });

  r.post('/cliente/trabajo', async ({ ctx, cuerpo }) => {
    const b = await cuerpo();
    const clienteId = await clienteDeToken(ctx, String(b.t ?? ''));
    await accionCliente(ctx, clienteId, String(b.trabajo ?? ''), String(b.accion ?? ''), b);
    const [t] = await ctx.sql`select pedido_id from trabajos where id = ${String(b.trabajo)}`;
    return vistaPedido(ctx, await infoPedido(ctx.sql, t.pedidoId));
  });

  r.post('/cliente/material-sesion', async ({ ctx, cuerpo }) => {
    const b = await cuerpo();
    const clienteId = await clienteDeToken(ctx, String(b.t ?? ''));
    await materialSesion(ctx, clienteId, String(b.linea ?? ''), b);
    const [l] = await ctx.sql`select pedido_id from lineas where id = ${String(b.linea)}`;
    return vistaPedido(ctx, await infoPedido(ctx.sql, l.pedidoId));
  });

  // ---------- Calendarios ----------
  r.get('/ics/pedido/:id', async ({ ctx, params, q }) => {
    const i = await pedidoDelCliente(ctx, q('t'), params.id);
    const negocio = await ajuste<Negocio>(ctx.sql, 'negocio');
    return new Response(calendarioIcs('Undying Studios', eventosIcs(i, negocio), ctx.ahora()), { headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': `attachment; filename="undying-${i.pedido.numero}.ics"` } });
  });

  r.get('/ics/persona', async ({ ctx, q }) => feedPersona(ctx, q('c') ?? '', q('k')));
  r.get('/ics/espacio/:id', async ({ ctx, params, q }) => feedEquipo(ctx, params.id, q('k')));
}

export async function cancelarVisita(ctx: Ctx, visitaId: string, avisarCliente: boolean) {
  const [v] = await ctx.sql`select v.*, e.nombre_corto, e.zona_horaria from visitas v join espacios e on e.id = v.espacio_id where v.id = ${visitaId}`;
  if (!v) throw noEncontrado('Visita');
  if (v.estado !== 'agendada') return;
  await ctx.sql.begin(async (t: Sql) => {
    await t`update visitas set estado = 'cancelada' where id = ${visitaId}`;
    await t`delete from ocupacion where visita_id = ${visitaId}`;
  });
  const fecha = rangoTexto(new Date(v.inicio), new Date(v.fin), v.zonaHoraria);
  if (avisarCliente) await avisar(ctx, 'visita_cancelada', { para: v.correo, vars: { nombre: v.nombre.split(' ')[0], espacio: v.nombreCorto.toLowerCase(), fecha } });
  await avisar(ctx, 'cambio_equipo', { para: 'equipo', vars: { accion: 'Visita cancelada', numero: v.nombre, nombre: v.nombre, detalle: fecha } });
}

async function feedEquipo(ctx: Ctx, espacioId: string, clave: string | null) {
  const ics = await ajuste<{ clave: string }>(ctx.sql, 'ics');
  if (!clave || clave !== ics.clave) throw falla(403, 'SIN_PERMISO', 'Clave inválida.');
  const ahora = ctx.ahora();
  const desde = new Date(ahora.getTime() - 60 * 86400000);
  const hasta = new Date(ahora.getTime() + 365 * 86400000);
  const [esp] = await ctx.sql`select * from espacios where id = ${espacioId}`;
  if (!esp) throw noEncontrado('Espacio');
  const sesiones = await ctx.sql`
    select s.id, s.inicio, s.fin, s.ingeniero_asignado, p.numero, p.estado as pedido_estado, c.nombre, c.telefono, m.nombre as modalidad
    from sesiones s join pedidos p on p.id = s.pedido_id join clientes c on c.id = p.cliente_id left join modalidades m on m.id = s.modalidad_id
    where s.espacio_id = ${espacioId} and s.estado = 'activa' and p.estado in ('pagado', 'completado', 'pendiente_pago') and s.inicio between ${desde} and ${hasta}`;
  const otros = await ctx.sql`
    select o.id, lower(o.rango) as inicio, upper(o.rango) as fin, o.tipo, o.nota, v.nombre as visita_nombre, p.numero
    from ocupacion o left join visitas v on v.id = o.visita_id left join pedidos p on p.id = o.pedido_id
    where o.espacio_id = ${espacioId} and o.tipo in ('bloqueo', 'pintura', 'visita') and o.vence is null and o.rango && tstzrange(${desde}, ${hasta})`;
  const ev: EventoIcs[] = [
    ...sesiones.map((s: Fila) => ({
      uid: `sesion-${s.id}`, inicio: new Date(s.inicio), fin: new Date(s.fin),
      titulo: `${s.pedidoEstado === 'pendiente_pago' ? '(OXXO pendiente) ' : ''}${s.nombre} · ${s.modalidad ?? ''} · ${s.numero}`,
      descripcion: `Tel. ${s.telefono ?? ''}${s.ingenieroAsignado ? `\nIngeniero: ${s.ingenieroAsignado}` : ''}`,
      url: `${ctx.env.sitioUrl}/admin/#/pedidos`,
    })),
    ...otros.map((o: Fila) => ({
      uid: `ocupacion-${o.id}`, inicio: new Date(o.inicio), fin: new Date(o.fin),
      titulo: o.tipo === 'visita' ? `Visita: ${o.visitaNombre}` : o.tipo === 'pintura' ? `Pintura de ciclorama · ${o.numero ?? ''}` : `Bloqueado${o.nota ? ': ' + o.nota : ''}`,
    })),
  ];
  return new Response(calendarioIcs(`Undying · ${esp.nombreCorto}`, ev, ahora), { headers: { 'content-type': 'text/calendar; charset=utf-8' } });
}

