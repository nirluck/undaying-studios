// Postproducción: material, entregas, revisiones y aprobación.

import { fechaLocal, sumarDiasHabiles } from '../core/tiempo.ts';
import type { Ctx } from './ctx.ts';
import { bitacora } from './db.ts';
import { falla, texto } from './http.ts';
import { avisar } from './correo.ts';
import { infoPedido, tokenCliente, urlMisReservas, urlPanelPedido, varsPedido } from './info.ts';

// deno-lint-ignore no-explicit-any
type Fila = Record<string, any>;

const TZ = 'America/Mexico_City';

async function trabajo(ctx: Ctx, id: string): Promise<Fila> {
  const [t] = await ctx.sql`select t.*, p.nombre as producto_nombre, p.entrega_dias from trabajos t left join productos p on p.id = t.producto_id where t.id = ${id}`;
  if (!t) throw falla(404, 'NO_ENCONTRADO', 'Trabajo no encontrado.');
  return t;
}

const url = (v: unknown, campo: string) => {
  const s = texto(v, campo, { max: 1000 });
  if (!/^https?:\/\/\S+$/i.test(s)) throw falla(422, 'URL_INVALIDA', `Pega un enlace válido (https://…) en ${campo}.`);
  return s;
};

/** Acciones del cliente desde Mis reservas. */
export async function accionCliente(ctx: Ctx, clienteId: string, trabajoId: string, accion: string, d: Fila) {
  const t = await trabajo(ctx, trabajoId);
  const i = await infoPedido(ctx.sql, t.pedidoId);
  if (i.cliente.id !== clienteId) throw falla(404, 'NO_ENCONTRADO', 'Trabajo no encontrado.');
  if (!['pagado', 'completado'].includes(i.pedido.estado)) throw falla(409, 'NO_MODIFICABLE', 'Este pedido no está activo.');
  const ahora = ctx.ahora();
  const vars = { ...varsPedido(i, urlPanelPedido(ctx, i.pedido.id)), nombre: i.cliente.nombre, servicio: (t.productoNombre ?? '').toLowerCase() };

  if (accion === 'material') {
    if (!['esperando_material', 'en_cola'].includes(t.estado)) throw falla(409, 'YA_EN_PROCESO', 'Ya estamos trabajando en esta pieza. Si quieres cambiar el material, escríbenos.');
    const titulo = texto(d.titulo, 'el título de la canción', { max: 160 });
    const material = url(d.materialUrl, 'el enlace del material');
    const entrega = t.entregaDias ? sumarDiasHabiles(fechaLocal(ahora, TZ), t.entregaDias) : null;
    await ctx.sql`update trabajos set titulo = ${titulo}, material_url = ${material}, referencias = ${texto(d.referencias, 'las referencias', { requerido: false, max: 1000 }) || null},
      notas_cliente = ${texto(d.notas, 'las notas', { requerido: false, max: 2000 }) || null}, estado = 'en_cola', material_en = coalesce(material_en, ${ahora}),
      fecha_entrega = coalesce(fecha_entrega, ${entrega}), actualizado = now() where id = ${trabajoId}`;
    await avisar(ctx, 'material_recibido', { para: 'equipo', pedidoId: i.pedido.id, vars: { ...vars, titulo }, bloques: { datos: [['Material', material], ['Entrega estimada', entrega ?? 'por definir']], botones: [{ texto: 'Abrir en el panel', url: urlPanelPedido(ctx, i.pedido.id) }] } });
  } else if (accion === 'aprobar') {
    if (t.estado !== 'entregado') throw falla(409, 'NO_ENTREGADO', 'Solo se aprueban entregas.');
    await ctx.sql`update trabajos set estado = 'aprobado', aprobado_en = ${ahora}, actualizado = now() where id = ${trabajoId}`;
  } else if (accion === 'revision') {
    if (t.estado !== 'entregado') throw falla(409, 'NO_ENTREGADO', 'Puedes pedir una revisión cuando recibas la entrega.');
    if (t.revisionesUsadas >= t.revisionesIncluidas) {
      throw falla(409, 'SIN_REVISIONES', t.revisionesIncluidas ? 'Ya usaste las revisiones incluidas. Escríbenos para cotizar una revisión adicional.' : 'Este servicio no incluye revisiones. Escríbenos si necesitas un ajuste.');
    }
    const notas = texto(d.notas, 'qué quieres cambiar', { max: 2000 });
    await ctx.sql`update trabajos set estado = 'en_revision', revisiones_usadas = revisiones_usadas + 1,
      notas_cliente = coalesce(notas_cliente || E'\n\n', '') || ${`Revisión ${t.revisionesUsadas + 1}: ${notas}`}, actualizado = now() where id = ${trabajoId}`;
    await avisar(ctx, 'revision_pedida', { para: 'equipo', pedidoId: i.pedido.id, vars: { ...vars, titulo: t.titulo ?? '', notas }, bloques: { botones: [{ texto: 'Abrir en el panel', url: urlPanelPedido(ctx, i.pedido.id) }] } });
  } else throw falla(400, 'ACCION', 'Acción desconocida.');
}

/** Cambios desde el panel. Al entregar se avisa al cliente. */
export async function actualizarTrabajo(ctx: Ctx, trabajoId: string, d: Fila, usuario: string) {
  const t = await trabajo(ctx, trabajoId);
  const estados = ['esperando_material', 'en_cola', 'en_proceso', 'entregado', 'en_revision', 'aprobado', 'cancelado'];
  const estado = d.estado ?? t.estado;
  if (!estados.includes(estado)) throw falla(422, 'ESTADO', 'Estado inválido.');
  const entregaUrl = d.entregaUrl !== undefined ? (d.entregaUrl ? url(d.entregaUrl, 'el enlace de entrega') : null) : t.entregaUrl;
  if (estado === 'entregado' && !entregaUrl) throw falla(422, 'FALTA_ENTREGA', 'Pega el enlace de la entrega antes de marcarla como entregada.');
  const ahora = ctx.ahora();
  await ctx.sql`update trabajos set
    estado = ${estado},
    encargado = ${d.encargado !== undefined ? (d.encargado || null) : t.encargado},
    titulo = ${d.titulo !== undefined ? (d.titulo || null) : t.titulo},
    material_url = ${d.materialUrl !== undefined ? (d.materialUrl || null) : t.materialUrl},
    entrega_url = ${entregaUrl},
    fecha_entrega = ${d.fechaEntrega !== undefined ? (d.fechaEntrega || null) : t.fechaEntrega},
    notas = ${d.notas !== undefined ? (d.notas || null) : t.notas},
    entregado_en = ${estado === 'entregado' && t.estado !== 'entregado' ? ahora : t.entregadoEn},
    aprobado_en = ${estado === 'aprobado' && t.estado !== 'aprobado' ? ahora : t.aprobadoEn},
    actualizado = now()
    where id = ${trabajoId}`;
  await bitacora(ctx.sql, usuario, 'trabajo', 'pedido', t.pedidoId, { trabajoId, de: t.estado, a: estado });
  if (estado === 'entregado' && (t.estado !== 'entregado' || d.reenviar)) {
    const i = await infoPedido(ctx.sql, t.pedidoId);
    const token = await tokenCliente(ctx, i.cliente.id);
    const quedan = t.revisionesIncluidas - t.revisionesUsadas;
    await avisar(ctx, 'trabajo_entregado', {
      para: i.cliente.correo, pedidoId: i.pedido.id,
      vars: {
        ...varsPedido(i, urlMisReservas(ctx, token)), servicio: (t.productoNombre ?? '').toLowerCase(), titulo: d.titulo ?? t.titulo ?? '',
        revisiones: t.revisionesIncluidas ? (quedan > 0 ? `Te quedan ${quedan} ${quedan === 1 ? 'revisión' : 'revisiones'}.` : 'Ya usaste las revisiones incluidas.') : '',
      },
      bloques: { botones: [{ texto: 'Escuchar la entrega', url: entregaUrl! }, { texto: 'Aprobar o pedir revisión', url: urlMisReservas(ctx, token), secundario: true }] },
    });
  }
}
