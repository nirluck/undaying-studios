// Lectura completa de un pedido y los datos que usan correos y vistas.

import type { Carrito, Espacio } from '../core/tipos.ts';
import { dinero, redondear } from '../core/util.ts';
import { fechaCorta, fechaLocal, horaLocal, rangoTexto } from '../core/tiempo.ts';
import type { Ctx, Sql } from './ctx.ts';
import { ajuste, espacioDeFila, type Negocio } from './db.ts';
import { noEncontrado } from './http.ts';
import { crearAcceso } from './seguridad.ts';
import { calendarioIcs, type EventoIcs } from './ics.ts';
import type { Bloques } from './plantillas.ts';

// deno-lint-ignore no-explicit-any
type Fila = Record<string, any>;

export interface SesionInfo extends Fila {
  id: string; indice: number; inicio: Date; fin: Date; estado: string; extras: { id: string; opcion?: string; texto?: string }[];
  bloqueId: string; modalidadId: string; bloqueHoras: number; modalidadNombre: string; texto: string; fecha: string;
}

export interface InfoPedido {
  pedido: Fila;
  cliente: Fila;
  espacio: Espacio;
  sesiones: SesionInfo[];
  lineas: Fila[];
  pagos: Fila[];
  trabajos: Fila[];
  tareas: Fila[];
  invitados: Fila[];
  cobrado: number;
  reembolsado: number;
  saldo: number;
}

export async function infoPedido(sql: Sql, pedidoId: string): Promise<InfoPedido> {
  const [pedido] = await sql`select * from pedidos where id = ${pedidoId}`;
  if (!pedido) throw noEncontrado('Pedido');
  const [[cliente], [esp], sesiones, lineas, pagos, trabajos, tareas, invitados] = await Promise.all([
    sql`select * from clientes where id = ${pedido.clienteId}`,
    sql`select * from espacios where id = ${pedido.espacioId}`,
    sql`select s.*, b.horas as bloque_horas, m.nombre as modalidad_nombre, m.descripcion_corta as modalidad_corta
        from sesiones s left join bloques b on b.id = s.bloque_id left join modalidades m on m.id = s.modalidad_id
        where s.pedido_id = ${pedidoId} order by s.inicio`,
    sql`select * from lineas where pedido_id = ${pedidoId} order by orden, creado`,
    sql`select * from pagos where pedido_id = ${pedidoId} order by creado`,
    sql`select t.*, p.nombre as producto_nombre from trabajos t left join productos p on p.id = t.producto_id where t.pedido_id = ${pedidoId} order by t.creado, t.unidad`,
    sql`select * from tareas where pedido_id = ${pedidoId} order by creado`,
    sql`select i.* from invitados i join sesiones s on s.id = i.sesion_id where s.pedido_id = ${pedidoId} order by i.creado`,
  ]);
  const espacio = espacioDeFila(esp);
  const tz = espacio.zonaHoraria;
  const ses = sesiones.map((s: Fila) => ({
    ...s,
    extras: s.extras ?? [],
    texto: rangoTexto(new Date(s.inicio), new Date(s.fin), tz),
    fecha: fechaLocal(new Date(s.inicio), tz),
  })) as SesionInfo[];
  const cobrado = redondear(pagos.filter((p: Fila) => p.tipo === 'cobro' && p.estado === 'pagado').reduce((s: number, p: Fila) => s + p.monto, 0));
  const reembolsado = redondear(pagos.filter((p: Fila) => p.tipo === 'reembolso' && p.estado === 'pagado').reduce((s: number, p: Fila) => s + p.monto, 0));
  const saldo = ['pagado', 'completado'].includes(pedido.estado) ? redondear(pedido.total - cobrado + reembolsado) : 0;
  return { pedido, cliente, espacio, sesiones: ses, lineas, pagos, trabajos, tareas, invitados, cobrado, reembolsado, saldo };
}

export const sesionesActivas = (i: InfoPedido) => i.sesiones.filter((s) => s.estado === 'activa');

/** Carrito con las sesiones guardadas, para recalcular ocupación. */
export function carritoDeSesiones(espacioId: string, sesiones: Fila[]): Carrito {
  return {
    espacioId,
    sesiones: sesiones.map((s) => ({ bloqueId: s.bloqueId, modalidadId: s.modalidadId, inicio: new Date(s.inicio).toISOString(), fin: new Date(s.fin).toISOString(), extras: s.extras ?? [] })),
    productos: [],
  };
}

// ---------- URLs ----------

export const urlMisReservas = (ctx: Ctx, token: string) => `${ctx.env.sitioUrl}/reservas/?t=${encodeURIComponent(token)}`;
export const urlPedido = (ctx: Ctx, id: string, token: string) => `${ctx.env.sitioUrl}/reservas/?pedido=${id}&t=${encodeURIComponent(token)}`;
export const urlPagar = (ctx: Ctx, id: string, token: string) => `${ctx.env.sitioUrl}/reservas/?pagar=${id}&t=${encodeURIComponent(token)}`;
export const urlLanding = (ctx: Ctx, espacioId: string) => `${ctx.env.sitioUrl}/${espacioId === 'foro' ? 'foro' : 'estudio'}/`;
export const urlPanelPedido = (ctx: Ctx, id: string) => `${ctx.env.sitioUrl}/admin/#/pedidos/${id}`;

export async function tokenCliente(ctx: Ctx, clienteId: string, dias = 365) {
  return crearAcceso(ctx.sql, { clienteId, dias, ahora: ctx.ahora() });
}

// ---------- Contenido de correos ----------

export const primerNombre = (n: string) => (n ?? '').trim().split(/\s+/)[0] ?? '';

export function varsPedido(i: InfoPedido, enlace: string): Record<string, string> {
  const act = sesionesActivas(i);
  return {
    nombre: primerNombre(i.cliente.nombre),
    numero: i.pedido.numero,
    espacio: i.espacio.nombreCorto,
    total: dinero(i.pedido.total),
    fecha: act[0]?.texto ?? (i.sesiones[0]?.texto ?? ''),
    enlace,
  };
}

export function bloqueResumen(i: InfoPedido): Bloques['resumen'] {
  return {
    lineas: i.lineas.map((l) => ({ concepto: l.concepto, importe: dinero(l.importe) })),
    total: `${dinero(i.pedido.total)} MXN`,
    nota: `IVA incluido: ${dinero(i.pedido.iva)}.`,
  };
}

export function bloqueSesiones(i: InfoPedido): Bloques['lista'] {
  const act = sesionesActivas(i);
  if (!act.length) return undefined;
  return { titulo: act.length > 1 ? 'Tus sesiones' : 'Tu sesión', elementos: act.map((s) => `${s.texto} · ${s.bloqueHoras ? s.bloqueHoras + ' h' : ''} ${s.modalidadCorta ?? ''}`.replace(/\s+/g, ' ').trim()) };
}

export function eventosIcs(i: InfoPedido, negocio: Negocio): EventoIcs[] {
  return sesionesActivas(i).map((s) => ({
    uid: `sesion-${s.id}`,
    inicio: new Date(s.inicio),
    fin: new Date(s.fin),
    titulo: `Undying Studios · ${i.espacio.nombreCorto}`,
    descripcion: `Pedido ${i.pedido.numero}. ${negocio.llegada ?? ''}`,
    lugar: negocio.direccion,
  }));
}

export async function icsDePedido(ctx: Ctx, i: InfoPedido) {
  const negocio = await ajuste<Negocio>(ctx.sql, 'negocio');
  const ev = eventosIcs(i, negocio);
  return ev.length ? [{ nombre: `undying-${i.pedido.numero}.ics`, contenido: calendarioIcs('Undying Studios', ev, ctx.ahora()), tipo: 'text/calendar' }] : [];
}

export const etiquetaTarea: Record<string, string> = {
  asignar_ingeniero: 'Asignar ingeniero',
  confirmar_productor: 'Confirmar productor',
  confirmar_musico: 'Confirmar músico de sesión',
  programar_pintura: 'Pintar ciclorama',
  emitir_factura: 'Emitir factura',
  reembolso_manual: 'Reembolso por transferencia',
  pago_sin_horario: 'Pago sin horario',
  revisar_credito: 'Revisar saldo a favor',
};

export function textoSesionCorta(s: { inicio: Date | string }, tz: string) {
  const d = new Date(s.inicio);
  return `${fechaCorta(fechaLocal(d, tz))} ${horaLocal(d, tz)}`;
}
