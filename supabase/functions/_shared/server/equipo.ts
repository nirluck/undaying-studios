// Ingenieros, productores y encargados de postproducción: a quién se le
// asigna cada cosa, su aviso por correo, su agenda y su calendario personal.

import { fechaLarga, utcDesdeLocal } from '../core/tiempo.ts';
import type { Ctx, Sql } from './ctx.ts';
import { ajuste, type Negocio } from './db.ts';
import { sha256 } from './seguridad.ts';
import { avisar } from './correo.ts';
import { calendarioIcs, type EventoIcs } from './ics.ts';
import { eventosEquipo, infoPedido, urlGoogleCalendar, urlPanelPedido } from './info.ts';

// deno-lint-ignore no-explicit-any
type Fila = Record<string, any>;

const TZ = 'America/Mexico_City';

/**
 * Usuario del panel que corresponde a lo que se escribió en "Ingeniero" o
 * "Encargado": por correo o por nombre. Si no es usuario (alguien externo),
 * se guarda solo el texto y no se le avisa.
 */
export async function personaDe(sql: Sql, texto: string | null | undefined): Promise<{ correo: string; nombre: string } | null> {
  const t = String(texto ?? '').trim().toLowerCase();
  if (!t) return null;
  const [u] = await sql`select correo, coalesce(nombre, correo) as nombre from usuarios where activo and (correo = ${t} or lower(nombre) = ${t}) limit 1`;
  return u ? { correo: u.correo, nombre: u.nombre } : null;
}

/** Usuarios a los que se les puede asignar trabajo (para las listas del panel). */
export async function personas(sql: Sql) {
  return sql`select correo, nombre, rol from usuarios where activo order by coalesce(nombre, correo)`;
}

// ---------- Calendario personal ----------

async function clave(ctx: Ctx, correo: string) {
  const ics = await ajuste<{ clave: string }>(ctx.sql, 'ics');
  return (await sha256(`${ics.clave}:persona:${correo}`)).slice(0, 32);
}

export async function urlCalendarioPersona(ctx: Ctx, correo: string) {
  return `${ctx.env.apiUrl}/ics/persona?c=${encodeURIComponent(correo)}&k=${await clave(ctx, correo)}`;
}

/** Feed .ics con las sesiones y entregas de una persona del equipo. */
export async function feedPersona(ctx: Ctx, correo: string, k: string | null): Promise<Response> {
  const c = correo.trim().toLowerCase();
  if (!c || !k || k !== (await clave(ctx, c))) return new Response('No autorizado', { status: 401 });
  const { sesiones, trabajos } = await agendaDe(ctx.sql, c, 60);
  const ev: EventoIcs[] = [
    ...sesiones.map((s: Fila) => ({
      uid: `sesion-${s.id}`, inicio: new Date(s.inicio), fin: new Date(s.fin),
      titulo: `${s.nombre} · ${s.espacio} ${s.horas ?? ''} h · ${s.numero}`,
      descripcion: [s.modalidad, `Tel. ${s.telefono ?? ''}`, s.proyecto ? `Proyecto: ${s.proyecto}` : '', s.notas ?? '',
        ...(s.servicios ?? []).map((x: Fila) => `${x.concepto}${x.asignado ? ': ' + x.asignado : ''}`)].filter(Boolean).join('\n'),
      url: urlPanelPedido(ctx, s.pedidoId),
    })),
    ...trabajos.filter((t: Fila) => t.fechaEntrega).map((t: Fila) => {
      const inicio = utcDesdeLocal(String(t.fechaEntrega).slice(0, 10), 10 * 60, TZ);
      return {
        uid: `entrega-${t.id}`, inicio, fin: new Date(inicio.getTime() + 3600000),
        titulo: `Entrega · ${t.producto} · ${t.titulo ?? 'pieza ' + t.unidad} · ${t.numero}`,
        descripcion: [`Cliente: ${t.nombre}`, t.proyecto ? `Proyecto: ${t.proyecto}` : '', t.materialUrl ? `Material: ${t.materialUrl}` : ''].filter(Boolean).join('\n'),
      };
    }),
  ];
  return new Response(calendarioIcs('Undying · Mi agenda', ev, ctx.ahora()), { headers: { 'content-type': 'text/calendar; charset=utf-8' } });
}

// ---------- Agenda de una persona ----------

/** Sesiones (como ingeniero, productor o músico) y piezas de postproducción asignadas. */
export async function agendaDe(sql: Sql, correo: string, diasAtras = 7) {
  const desde = new Date(Date.now() - diasAtras * 86400000);
  const [sesiones, trabajos] = await Promise.all([
    sql`
      select s.id, s.inicio, s.fin, s.notas, s.ingeniero_asignado, s.ingeniero_correo, e.nombre_corto as espacio, b.horas,
        p.id as pedido_id, p.numero, p.datos->>'proyecto' as proyecto, c.nombre, c.telefono, c.correo, m.nombre as modalidad,
        (select coalesce(json_agg(json_build_object('concepto', l.concepto, 'asignado', l.datos->>'asignado', 'material', l.datos->'material', 'unidades', l.datos->'unidades')), '[]'::json)
           from lineas l join productos pr on pr.id = l.ref
           where l.sesion_id = s.id and l.tipo = 'producto' and pr.requiere_sesion and not pr.genera_trabajo) as servicios
      from sesiones s join pedidos p on p.id = s.pedido_id join clientes c on c.id = p.cliente_id join espacios e on e.id = s.espacio_id
        left join modalidades m on m.id = s.modalidad_id left join bloques b on b.id = s.bloque_id
      where s.estado = 'activa' and p.estado in ('pagado', 'completado', 'pendiente_pago') and s.fin > ${desde}
        and (s.ingeniero_correo = ${correo} or exists (select 1 from lineas l where l.sesion_id = s.id and l.datos->>'asignado_correo' = ${correo}))
      order by s.inicio`,
    sql`
      select t.*, pr.nombre as producto, p.numero, p.datos->>'proyecto' as proyecto, c.nombre, c.correo
      from trabajos t join pedidos p on p.id = t.pedido_id join clientes c on c.id = p.cliente_id left join productos pr on pr.id = t.producto_id
      where p.estado in ('pagado', 'completado') and t.encargado_correo = ${correo}
        and (t.estado not in ('aprobado', 'cancelado') or t.actualizado > ${desde})
      order by t.fecha_entrega nulls last, t.creado`,
  ]);
  return { sesiones, trabajos };
}

// ---------- Avisos a quien se asigna ----------

const primer = (n: string) => n.split(/[\s@]/)[0];

/** "Te asignaron una sesión": con el archivo de calendario y el botón de Google Calendar. */
export async function avisarSesionAsignada(ctx: Ctx, pedidoId: string, sesionId: string, persona: { correo: string; nombre: string }, rol: string) {
  const i = await infoPedido(ctx.sql, pedidoId);
  const s = i.sesiones.find((x) => x.id === sesionId);
  if (!s) return;
  const negocio = await ajuste<Negocio>(ctx.sql, 'negocio');
  const ev = eventosEquipo(ctx, i, negocio).filter((e) => e.uid === `sesion-${sesionId}`);
  const d = i.pedido.datos ?? {};
  await avisar(ctx, 'sesion_asignada', {
    para: persona.correo, pedidoId,
    vars: { persona: primer(persona.nombre), rol, nombre: i.cliente.nombre, numero: i.pedido.numero, espacio: i.espacio.nombreCorto, fecha: s.texto },
    bloques: {
      datos: [
        ['Cliente', i.cliente.nombre], ['Teléfono', i.cliente.telefono ?? ''], ['Sesión', `${s.texto} · ${s.modalidadNombre ?? ''}`],
        ...(d.proyecto ? [['Proyecto', String(d.proyecto)] as [string, string]] : []),
        ...(s.notas ? [['Notas', String(s.notas)] as [string, string]] : []),
      ],
      botones: [{ texto: 'Ver mi agenda', url: `${ctx.env.sitioUrl}/admin/#/mi-agenda` }, ...ev.map((e) => ({ texto: 'Agregar a Google Calendar', url: urlGoogleCalendar(e), secundario: true }))],
    },
    adjuntos: ev.length ? [{ nombre: `${i.pedido.numero}.ics`, contenido: calendarioIcs('Undying Studios', ev, ctx.ahora()), tipo: 'text/calendar' }] : [],
  });
}

/** "Te asignaron una pieza de postproducción". */
export async function avisarTrabajoAsignado(ctx: Ctx, trabajoId: string, persona: { correo: string; nombre: string }) {
  const [t] = await ctx.sql`
    select t.*, pr.nombre as producto, p.numero, p.datos->>'proyecto' as proyecto, c.nombre as cliente
    from trabajos t join pedidos p on p.id = t.pedido_id join clientes c on c.id = p.cliente_id left join productos pr on pr.id = t.producto_id
    where t.id = ${trabajoId}`;
  if (!t) return;
  const entrega = t.fechaEntrega ? fechaLarga(String(t.fechaEntrega).slice(0, 10)) : 'por definir';
  await avisar(ctx, 'trabajo_asignado', {
    para: persona.correo, pedidoId: t.pedidoId,
    vars: { persona: primer(persona.nombre), servicio: String(t.producto ?? '').toLowerCase(), titulo: t.titulo ?? `pieza ${t.unidad}`, nombre: t.cliente, numero: t.numero, entrega },
    bloques: {
      datos: [
        ['Cliente', t.cliente], ...(t.proyecto ? [['Proyecto', String(t.proyecto)] as [string, string]] : []), ['Entrega', entrega],
        ...(t.materialUrl ? [['Material', String(t.materialUrl)] as [string, string]] : []),
        ...(t.referencias ? [['Referencias', String(t.referencias)] as [string, string]] : []),
      ],
      botones: [{ texto: 'Ver mi agenda', url: `${ctx.env.sitioUrl}/admin/#/mi-agenda` }],
    },
  });
}
