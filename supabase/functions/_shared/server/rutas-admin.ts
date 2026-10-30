// Rutas del panel de administración. Todas exigen sesión de Supabase Auth
// y un usuario activo en la tabla `usuarios` (o en ADMIN_CORREOS).

import { calendario as _cal, ventanasDelDia } from '../core/disponibilidad.ts';
import { diasEntre, fechaLocal, inicioDelDia, rangoTexto, sumarDias } from '../core/tiempo.ts';
import { redondear } from '../core/util.ts';
import type { Ctx, Sql } from './ctx.ts';
import { ajuste, bitacora, cargarCatalogo, camelProfundo, esEmpalme, ocupacionDe, snakeProfundo, type Avisos } from './db.ts';
import { correoValido, Enrutador, esFecha, falla, json, noEncontrado, numero, texto, type Solicitud } from './http.ts';
import { exigir, usuarioDe, type Usuario } from './seguridad.ts';
import { avisar, logoCorreo } from './correo.ts';
import { PLANTILLAS, plantillaDef, renderizar } from './plantillas.ts';
import {
  agregarCargo, cambiarFecha, cancelarPedido, crearPedido, horaExtra, pagoManual, reembolsar, type Cobro,
} from './pedidos.ts';
import { actualizarTrabajo, asignarPersonal } from './trabajos.ts';
import { agendaDe, avisarSesionAsignada, personaDe, personas, urlCalendarioPersona } from './equipo.ts';
import { bloqueResumen, bloqueSesiones, etiquetaTarea, icsDePedido, infoPedido, tokenCliente, urlMisReservas, urlPagar, varsPedido } from './info.ts';
import { cancelarVisita } from './rutas-publicas.ts';

// deno-lint-ignore no-explicit-any
type Fila = Record<string, any>;
type ManejadorAdmin = (s: Solicitud, u: Usuario) => Promise<unknown>;

void _cal;

function conUsuario(fn: ManejadorAdmin, ...roles: ('operacion' | 'postproduccion')[]) {
  return async (s: Solicitud) => {
    const u = await usuarioDe(s.req, s.ctx);
    exigir(u, ...(roles.length ? roles : []));
    if (!roles.length && u.rol !== 'admin') throw falla(403, 'SIN_PERMISO', 'Solo administradores.');
    return fn(s, u);
  };
}
const op = (fn: ManejadorAdmin) => conUsuario(fn, 'operacion');
const todos = (fn: ManejadorAdmin) => conUsuario(fn, 'operacion', 'postproduccion');
const admin = (fn: ManejadorAdmin) => conUsuario(fn);
/** Cualquier usuario activo del panel, incluido el rol ingeniero. */
const cualquiera = (fn: ManejadorAdmin) => async (s: Solicitud) => fn(s, await usuarioDe(s.req, s.ctx));

function cobroDe(b: Fila): Cobro {
  const c = (b.cobro ?? {}) as Fila;
  if (c.modo === 'manual') return { modo: 'manual', metodo: ['efectivo', 'tarjeta'].includes(c.metodo) ? c.metodo : 'transferencia', referencia: c.referencia ? String(c.referencia) : undefined };
  if (c.modo === 'enlace') return { modo: 'enlace' };
  return { modo: 'pendiente' };
}

// ---------- Catálogo editable ----------

type Tipo = 'text' | 'int' | 'num' | 'bool' | 'json' | 'arr' | 'ts';
const T = (o: Record<string, Tipo>) => o;
const CATALOGO: Record<string, { clave: string[]; columnas: Record<string, Tipo>; rol?: 'operacion' }> = {
  espacios: { clave: ['id'], columnas: T({ id: 'text', nombre: 'text', nombre_corto: 'text', zona_horaria: 'text', reservable: 'bool', margen_min: 'int', paso_min: 'int', anticipacion_h: 'int', horizonte_dias: 'int', aforo: 'int', varias_sesiones: 'bool', visitas: 'json', politica: 'json', pago: 'json', documentos: 'json', orden: 'int', activo: 'bool' }) },
  modalidades: { clave: ['id'], columnas: T({ id: 'text', espacio_id: 'text', nombre: 'text', nota: 'text', descripcion_corta: 'text', ventajas: 'json', tarea: 'text', pide_ingeniero_cliente: 'bool', hora_extra: 'num', hora_extra_nuevo: 'num', hora_extra_desde: 'ts', orden: 'int', activo: 'bool' }) },
  bloques: { clave: ['id'], columnas: T({ id: 'text', espacio_id: 'text', horas: 'num', etiqueta: 'text', frase: 'text', destacado: 'bool', orden: 'int', activo: 'bool' }) },
  precios_bloque: { clave: ['bloque_id', 'modalidad_id'], columnas: T({ bloque_id: 'text', modalidad_id: 'text', precio: 'num', precio_nuevo: 'num', precio_nuevo_desde: 'ts' }) },
  extras: { clave: ['id'], columnas: T({ id: 'text', espacio_id: 'text', nombre: 'text', descripcion: 'text', precio: 'num', precio_nuevo: 'num', precio_nuevo_desde: 'ts', anticipacion_dias: 'int', bloqueo_antes_dias: 'int', bloqueo_despues_dias: 'int', bloques: 'arr', opciones: 'json', una_vez_por_racha: 'bool', tarea: 'text', orden: 'int', activo: 'bool' }) },
  productos: { clave: ['id'], columnas: T({ id: 'text', espacio_id: 'text', nombre: 'text', descripcion: 'text', precio: 'num', precio_nuevo: 'num', precio_nuevo_desde: 'ts', precio_con_reserva: 'num', unidad: 'text', requiere_sesion: 'bool', max_por_sesion: 'int', max_cantidad: 'int', revisiones: 'int', precio_revision: 'num', entrega_dias: 'int', genera_trabajo: 'bool', tarea: 'text', campos: 'json', orden: 'int', activo: 'bool' }) },
  paquetes: { clave: ['id'], columnas: T({ id: 'text', espacio_id: 'text', nombre: 'text', descripcion: 'text', bloque_id: 'text', modalidad_id: 'text', productos: 'json', orden: 'int', activo: 'bool' }) },
  tipos_cargo: { clave: ['id'], columnas: T({ id: 'text', espacio_id: 'text', nombre: 'text', precio: 'num', orden: 'int', activo: 'bool' }) },
  cupones: { clave: ['codigo'], columnas: T({ codigo: 'text', descripcion: 'text', tipo: 'text', valor: 'num', espacio_id: 'text', desde: 'ts', hasta: 'ts', usos_max: 'int', activo: 'bool' }), rol: 'operacion' },
};

const aSnake = (s: string) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());

function valor(tipo: Tipo, v: unknown, ctx: Ctx) {
  if (v === undefined) return undefined;
  if (v === null || v === '') return tipo === 'json' ? ctx.sql.json([] as never) : null;
  switch (tipo) {
    case 'int': return Math.round(Number(v));
    case 'num': return Number(v);
    case 'bool': return v === true || v === 'true';
    case 'json': return ctx.sql.json(snakeProfundo(v) as never);
    case 'arr': return Array.isArray(v) && v.length ? v.map(String) : null;
    case 'ts': return new Date(String(v));
    default: return String(v).trim();
  }
}

async function guardarCatalogo(ctx: Ctx, tabla: string, cuerpo: Fila, u: Usuario) {
  const def = CATALOGO[tabla];
  if (!def) throw noEncontrado('Tabla');
  if (u.rol !== 'admin' && !(def.rol === 'operacion' && u.rol === 'operacion')) throw falla(403, 'SIN_PERMISO', 'Solo administradores cambian el catálogo.');
  const fila: Fila = {};
  for (const [k, v] of Object.entries(cuerpo)) {
    const col = aSnake(k);
    if (def.columnas[col]) {
      const x = valor(def.columnas[col], v, ctx);
      if (x !== undefined) fila[col] = x;
    }
  }
  for (const k of def.clave) if (fila[k] == null || fila[k] === '') throw falla(422, 'CLAVE', `Falta ${k}.`);
  if (tabla === 'cupones') fila.codigo = String(fila.codigo).toUpperCase();
  const cols = Object.keys(fila);
  const actualizables = cols.filter((c) => !def.clave.includes(c));
  try {
    const [r] = actualizables.length
      ? await ctx.sql`insert into ${ctx.sql(tabla)} ${ctx.sql(fila, cols)} on conflict (${ctx.sql(def.clave)}) do update set ${ctx.sql(fila, actualizables)} returning *`
      : await ctx.sql`insert into ${ctx.sql(tabla)} ${ctx.sql(fila, cols)} on conflict do nothing returning *`;
    await bitacora(ctx.sql, u.correo, 'guardar', tabla, def.clave.map((k) => fila[k]).join('|'), cuerpo);
    return camelProfundo(r ?? fila);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === '23503') throw falla(422, 'REFERENCIA', 'Hace referencia a algo que no existe (revisa espacio, bloque o modalidad).');
    if (code === '23514' || code === '22P02') throw falla(422, 'VALOR', 'Algún valor no es válido.');
    throw e;
  }
}

async function borrarCatalogo(ctx: Ctx, tabla: string, id: string, u: Usuario) {
  const def = CATALOGO[tabla];
  if (!def) throw noEncontrado('Tabla');
  if (u.rol !== 'admin' && !(def.rol === 'operacion' && u.rol === 'operacion')) throw falla(403, 'SIN_PERMISO', 'Solo administradores cambian el catálogo.');
  const partes = id.split('|');
  const where = def.clave.map((k, i) => ctx.sql`${ctx.sql(k)} = ${partes[i]}`).reduce((a, b) => ctx.sql`${a} and ${b}`);
  try {
    await ctx.sql`delete from ${ctx.sql(tabla)} where ${where}`;
    await bitacora(ctx.sql, u.correo, 'borrar', tabla, id);
    return { borrado: true };
  } catch (e) {
    if ((e as { code?: string }).code !== '23503' || !def.columnas.activo) throw falla(409, 'EN_USO', 'No se puede borrar porque hay pedidos que lo usan.');
    await ctx.sql`update ${ctx.sql(tabla)} set activo = false where ${where}`;
    await bitacora(ctx.sql, u.correo, 'desactivar', tabla, id);
    return { borrado: false, desactivado: true };
  }
}

// ---------- Resumen y agenda ----------

async function resumen(ctx: Ctx) {
  const ahora = ctx.ahora();
  const tz = 'America/Mexico_City';
  const hoy = fechaLocal(ahora, tz);
  const iniHoy = inicioDelDia(hoy, tz);
  const finManana = inicioDelDia(sumarDias(hoy, 2), tz);
  const iniMes = inicioDelDia(hoy.slice(0, 8) + '01', tz);
  const [sesiones, visitas, tareas, oxxo, apartados, trabajos, [solicitudes], saldos, [mes], bloqueos] = await Promise.all([
    ctx.sql`select s.id, s.inicio, s.fin, s.espacio_id, s.ingeniero_asignado, s.conflicto, p.id as pedido_id, p.numero, p.estado as pedido_estado, c.nombre, c.telefono,
              m.nombre as modalidad, m.tarea as modalidad_tarea, (select count(*)::int from invitados i where i.sesion_id = s.id) as invitados, s.extras
            from sesiones s join pedidos p on p.id = s.pedido_id join clientes c on c.id = p.cliente_id left join modalidades m on m.id = s.modalidad_id
            where s.estado = 'activa' and p.estado in ('pagado', 'completado', 'pendiente_pago') and s.inicio >= ${iniHoy} and s.inicio < ${finManana} order by s.inicio`,
    ctx.sql`select id, espacio_id, inicio, fin, nombre, telefono, estado from visitas where estado = 'agendada' and inicio >= ${iniHoy} and inicio < ${finManana} order by inicio`,
    ctx.sql`select t.*, p.numero, c.nombre from tareas t left join pedidos p on p.id = t.pedido_id left join clientes c on c.id = p.cliente_id where t.hecha_en is null order by t.vence nulls last, t.creado limit 100`,
    ctx.sql`select p.id, p.numero, p.total, p.apartado_vence, c.nombre from pedidos p join clientes c on c.id = p.cliente_id where p.estado = 'pendiente_pago' order by p.apartado_vence`,
    ctx.sql`select p.id, p.numero, p.total, p.apartado_vence, c.nombre from pedidos p join clientes c on c.id = p.cliente_id where p.estado = 'apartado' and p.origen = 'panel' order by p.apartado_vence`,
    ctx.sql`select t.id, t.estado, t.titulo, t.fecha_entrega, t.encargado, pr.nombre as producto, p.numero, p.id as pedido_id, c.nombre
            from trabajos t join pedidos p on p.id = t.pedido_id join clientes c on c.id = p.cliente_id left join productos pr on pr.id = t.producto_id
            where t.estado in ('en_cola', 'en_proceso', 'en_revision') and t.fecha_entrega is not null and t.fecha_entrega <= ${sumarDias(hoy, 3)} order by t.fecha_entrega`,
    ctx.sql`select count(*)::int as n from solicitudes where estado = 'nueva'`,
    ctx.sql`select p.id, p.numero, c.nombre, p.total - coalesce((select sum(case when g.tipo = 'cobro' then g.monto else -g.monto end) from pagos g where g.pedido_id = p.id and g.estado = 'pagado'), 0) as saldo
            from pedidos p join clientes c on c.id = p.cliente_id where p.estado in ('pagado', 'completado')
              and p.total - coalesce((select sum(case when g.tipo = 'cobro' then g.monto else -g.monto end) from pagos g where g.pedido_id = p.id and g.estado = 'pagado'), 0) > 0.009`,
    ctx.sql`select coalesce(sum(case when tipo = 'cobro' then monto else -monto end), 0) as ingresos, count(distinct pedido_id)::int as pedidos from pagos where estado = 'pagado' and confirmado >= ${iniMes}`,
    ctx.sql`select o.id, o.espacio_id, lower(o.rango) as inicio, upper(o.rango) as fin, o.tipo, o.nota from ocupacion o where o.tipo in ('bloqueo', 'pintura') and o.vence is null and o.rango && tstzrange(${iniHoy}, ${finManana})`,
  ]);
  return {
    hoy, ahora: ahora.toISOString(),
    sesiones, visitas, bloqueos, oxxo, apartados, trabajos, saldos,
    tareas: tareas.map((t: Fila) => ({ ...t, etiqueta: etiquetaTarea[t.tipo] ?? t.tipo })),
    solicitudesNuevas: solicitudes.n,
    mes: { ingresos: Number(mes.ingresos), pedidos: mes.pedidos },
  };
}

async function agenda(ctx: Ctx, desde: string, hasta: string) {
  if (!esFecha(desde) || !esFecha(hasta) || diasEntre(desde, hasta) > 62 || diasEntre(desde, hasta) < 0) throw falla(422, 'RANGO', 'Rango inválido.');
  const tz = 'America/Mexico_City';
  const a = inicioDelDia(desde, tz);
  const b = inicioDelDia(sumarDias(hasta, 1), tz);
  const cat = await cargarCatalogo(ctx.sql);
  const [sesiones, otros] = await Promise.all([
    ctx.sql`select s.id, s.inicio, s.fin, s.espacio_id, s.ingeniero_asignado, s.conflicto, s.extras, p.id as pedido_id, p.numero, p.estado as pedido_estado, p.apartado_vence,
              c.nombre, m.nombre as modalidad, b.horas
            from sesiones s join pedidos p on p.id = s.pedido_id join clientes c on c.id = p.cliente_id left join modalidades m on m.id = s.modalidad_id left join bloques b on b.id = s.bloque_id
            where s.estado = 'activa' and p.estado in ('pagado', 'completado', 'pendiente_pago', 'apartado') and s.inicio < ${b} and s.fin > ${a}`,
    ctx.sql`select o.id, o.espacio_id, lower(o.rango) as inicio, upper(o.rango) as fin, o.tipo, o.nota, o.vence, o.pedido_id, o.visita_id, v.nombre as visita_nombre, v.telefono as visita_telefono, p.numero
            from ocupacion o left join visitas v on v.id = o.visita_id left join pedidos p on p.id = o.pedido_id
            where o.tipo in ('bloqueo', 'pintura', 'visita') and o.rango && tstzrange(${a}, ${b}) and (o.vence is null or o.vence > ${ctx.ahora()})`,
  ]);
  const dias: { fecha: string; espacios: Record<string, { abre: number; cierra: number }[]> }[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    dias.push({ fecha: f, espacios: Object.fromEntries(cat.espacios.map((e) => [e.id, ventanasDelDia(cat, e.id, f)])) });
  }
  const margen = Object.fromEntries(cat.espacios.map((e) => [e.id, e.margenMin]));
  return {
    espacios: cat.espacios.map((e) => ({ id: e.id, nombre: e.nombreCorto, reservable: e.reservable, margenMin: e.margenMin })),
    dias,
    elementos: [
      ...sesiones.map((s: Fila) => ({
        id: s.id, tipo: 'sesion', espacioId: s.espacioId, inicio: s.inicio, fin: s.fin, margenFin: new Date(new Date(s.fin).getTime() + (margen[s.espacioId] ?? 0) * 60000),
        titulo: s.nombre, detalle: `${s.modalidad ?? ''} · ${s.numero}`, estado: s.pedidoEstado, pedidoId: s.pedidoId, ingeniero: s.ingenieroAsignado, conflicto: s.conflicto,
        extras: s.extras,
      })),
      ...otros.map((o: Fila) => ({
        id: o.id, tipo: o.tipo, espacioId: o.espacioId, inicio: o.inicio, fin: o.fin,
        titulo: o.tipo === 'visita' ? `Visita: ${o.visitaNombre}` : o.tipo === 'pintura' ? 'Pintura del ciclorama' : (o.nota || 'Bloqueado'),
        detalle: o.tipo === 'visita' ? o.visitaTelefono : o.numero ?? '', pedidoId: o.pedidoId, visitaId: o.visitaId, apartado: !!o.vence,
      })),
    ],
  };
}

// ---------- Reportes ----------

async function reportes(ctx: Ctx, desde: string, hasta: string) {
  if (!esFecha(desde) || !esFecha(hasta)) throw falla(422, 'RANGO', 'Rango inválido.');
  const tz = 'America/Mexico_City';
  const a = inicioDelDia(desde, tz);
  const b = inicioDelDia(sumarDias(hasta, 1), tz);
  const cat = await cargarCatalogo(ctx.sql);
  const [porMes, porConcepto, pedidos, cancelados, horas, porOrigen] = await Promise.all([
    ctx.sql`select to_char(g.confirmado at time zone ${tz}, 'YYYY-MM') as mes, p.espacio_id, sum(case when g.tipo = 'cobro' then g.monto else -g.monto end) as monto
            from pagos g join pedidos p on p.id = g.pedido_id where g.estado = 'pagado' and g.confirmado >= ${a} and g.confirmado < ${b} group by 1, 2 order by 1, 2`,
    ctx.sql`select l.tipo, coalesce(l.ref, l.tipo) as ref, p.espacio_id, sum(l.importe) as monto, sum(l.cantidad) as cantidad, count(*)::int as lineas
            from lineas l join pedidos p on p.id = l.pedido_id where p.estado in ('pagado', 'completado') and p.pagado_en >= ${a} and p.pagado_en < ${b}
            group by 1, 2, 3 order by monto desc`,
    ctx.sql`select count(*)::int as n, coalesce(avg(total), 0) as promedio, coalesce(sum(total), 0) as total from pedidos where estado in ('pagado', 'completado') and pagado_en >= ${a} and pagado_en < ${b}`,
    ctx.sql`select coalesce(cancelacion->>'por', 'cliente') as por, count(*)::int as n from pedidos where estado = 'cancelado' and cancelado_en >= ${a} and cancelado_en < ${b} group by 1`,
    ctx.sql`select s.espacio_id, sum(extract(epoch from (least(s.fin, ${b}) - greatest(s.inicio, ${a}))) / 3600) as horas
            from sesiones s join pedidos p on p.id = s.pedido_id where s.estado = 'activa' and p.estado in ('pagado', 'completado') and s.inicio < ${b} and s.fin > ${a} group by 1`,
    ctx.sql`select origen, count(*)::int as n from pedidos where estado in ('pagado', 'completado') and pagado_en >= ${a} and pagado_en < ${b} group by 1`,
  ]);
  const abiertas: Record<string, number> = {};
  for (const e of cat.espacios.filter((x) => x.reservable)) {
    let min = 0;
    for (let f = desde; f <= hasta; f = sumarDias(f, 1)) min += ventanasDelDia(cat, e.id, f).reduce((s, v) => s + (v.cierra - v.abre), 0);
    abiertas[e.id] = min / 60;
  }
  const nombres: Record<string, string> = {};
  for (const x of [...cat.bloques.map((b) => [b.id, `Bloque ${b.horas} h`]), ...cat.productos.map((p) => [p.id, p.nombre]), ...cat.extras.map((e) => [e.id, e.nombre]), ...cat.modalidades.map((m) => [m.id, `Hora extra · ${m.nombre}`])]) nombres[x[0]] = x[1];
  return {
    porMes: porMes.map((r: Fila) => ({ ...r, monto: Number(r.monto) })),
    porConcepto: porConcepto.map((r: Fila) => ({ ...r, nombre: nombres[r.ref] ?? r.ref, monto: Number(r.monto), cantidad: Number(r.cantidad) })),
    pedidos: { n: pedidos[0].n, promedio: redondear(Number(pedidos[0].promedio)), total: Number(pedidos[0].total) },
    cancelados,
    porOrigen,
    ocupacion: cat.espacios.filter((x) => x.reservable).map((e) => {
      const vendidas = Number(horas.find((h: Fila) => h.espacioId === e.id)?.horas ?? 0);
      return { espacioId: e.id, nombre: e.nombreCorto, vendidas: redondear(vendidas), abiertas: redondear(abiertas[e.id]), porcentaje: abiertas[e.id] ? Math.round((vendidas / abiertas[e.id]) * 100) : 0 };
    }),
  };
}

// ---------- Rutas ----------

export function rutasAdmin(r: Enrutador) {
  r.get('/admin/yo', cualquiera(async ({ ctx }, u) => {
    const ics = await ajuste<{ clave: string }>(ctx.sql, 'ics');
    return {
      ...u,
      feeds: ['admin', 'operacion'].includes(u.rol) ? ['estudio', 'foro', 'estudio-b'].map((e) => ({ espacio: e, url: `${ctx.env.apiUrl}/ics/espacio/${e}?k=${ics.clave}` })) : [],
      miCalendario: await urlCalendarioPersona(ctx, u.correo),
      publicar: !!(ctx.env.githubToken && ctx.env.githubRepo),
    };
  }));
  // Mi agenda: lo que tiene asignado quien entra (ingenieros, productores, postproducción)
  r.get('/admin/mio', cualquiera(async ({ ctx }, u) => agendaDe(ctx.sql, u.correo)));
  r.post('/admin/mio/trabajos/:id', cualquiera(async ({ ctx, params, cuerpo }, u) => {
    const [t] = await ctx.sql`select encargado_correo from trabajos where id = ${params.id}`;
    if (!t || (t.encargadoCorreo !== u.correo && u.rol === 'ingeniero')) throw falla(403, 'SIN_PERMISO', 'Esta pieza no está asignada a ti.');
    const b = await cuerpo();
    await actualizarTrabajo(ctx, params.id, { estado: b.estado, entregaUrl: b.entregaUrl, notas: b.notas, reenviar: b.reenviar }, u.correo);
    return { ok: true };
  }));
  r.get('/admin/personas', todos(async ({ ctx }) => personas(ctx.sql)));
  r.get('/admin/resumen', todos(async ({ ctx }) => resumen(ctx)));
  r.get('/admin/agenda', op(async ({ ctx, q }) => agenda(ctx, q('desde') ?? '', q('hasta') ?? '')));
  r.get('/admin/catalogo', todos(async ({ ctx }) => {
    const c = await cargarCatalogo(ctx.sql);
    const cupones = await ctx.sql`select * from cupones order by codigo`;
    return { ...c, cupones };
  }));
  r.get('/admin/ocupacion', op(async ({ ctx, q }) => {
    const espacio = q('espacio') ?? '';
    const desde = q('desde') ?? '';
    const hasta = q('hasta') ?? '';
    if (!esFecha(desde) || !esFecha(hasta)) throw falla(422, 'RANGO', 'Rango inválido.');
    const occ = await ocupacionDe(ctx.sql, espacio, inicioDelDia(sumarDias(desde, -12), 'America/Mexico_City'), inicioDelDia(sumarDias(hasta, 3), 'America/Mexico_City'), ctx.ahora(), { excluirPedido: q('excluir') ?? undefined });
    return { ahora: ctx.ahora().toISOString(), ocupacion: occ };
  }));

  // Bloqueos y visitas
  r.post('/admin/bloqueos', op(async ({ ctx, cuerpo }, u) => {
    const b = await cuerpo();
    const inicio = new Date(String(b.inicio));
    const fin = new Date(String(b.fin));
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio) throw falla(422, 'RANGO', 'Revisa el inicio y el fin.');
    try {
      const [o] = await ctx.sql`insert into ocupacion (espacio_id, rango, tipo, nota, creado_por) values (${texto(b.espacio, 'el espacio')}, tstzrange(${inicio}, ${fin}), 'bloqueo', ${texto(b.nota, 'la nota', { requerido: false, max: 200 }) || null}, ${u.correo}) returning id`;
      await bitacora(ctx.sql, u.correo, 'bloquear', 'ocupacion', o.id, b);
      return { id: o.id };
    } catch (e) {
      if (esEmpalme(e)) throw falla(409, 'HORARIO_OCUPADO', 'Ese rango choca con una sesión, visita u otro bloqueo.');
      throw e;
    }
  }));
  r.delete('/admin/bloqueos/:id', op(async ({ ctx, params }, u) => {
    await ctx.sql`delete from ocupacion where id = ${params.id} and tipo = 'bloqueo'`;
    await bitacora(ctx.sql, u.correo, 'desbloquear', 'ocupacion', params.id);
    return { ok: true };
  }));
  r.get('/admin/visitas', op(async ({ ctx }) => ctx.sql`select v.*, e.nombre_corto from visitas v join espacios e on e.id = v.espacio_id where v.inicio > now() - interval '30 days' order by v.inicio desc limit 200`));
  r.post('/admin/visitas/:id', op(async ({ ctx, params, cuerpo }, u) => {
    const b = await cuerpo();
    if (b.estado === 'cancelada') await cancelarVisita(ctx, params.id, b.avisar !== false);
    else if (['realizada', 'no_asistio', 'agendada'].includes(String(b.estado))) await ctx.sql`update visitas set estado = ${String(b.estado)} where id = ${params.id}`;
    await bitacora(ctx.sql, u.correo, 'visita', 'visita', params.id, b);
    return { ok: true };
  }));

  // Pedidos
  r.get('/admin/pedidos', todos(async ({ ctx, q }) => {
    const estado = q('estado');
    const espacio = q('espacio');
    const buscar = q('q');
    const pagina = Math.max(0, Number(q('pagina') ?? 0));
    const filas = await ctx.sql`
      select p.id, p.numero, p.estado, p.origen, p.total, p.creado, p.pagado_en, p.espacio_id, p.apartado_vence, c.nombre, c.correo, c.telefono,
        (select min(s.inicio) from sesiones s where s.pedido_id = p.id and s.estado = 'activa') as primera_sesion,
        (select count(*)::int from sesiones s where s.pedido_id = p.id and s.estado = 'activa') as sesiones,
        (select count(*)::int from tareas t where t.pedido_id = p.id and t.hecha_en is null) as pendientes,
        p.total - coalesce((select sum(case when g.tipo = 'cobro' then g.monto else -g.monto end) from pagos g where g.pedido_id = p.id and g.estado = 'pagado'), 0) as saldo
      from pedidos p join clientes c on c.id = p.cliente_id
      where (${estado}::text is null or p.estado = ${estado})
        and (${espacio}::text is null or p.espacio_id = ${espacio})
        and (${buscar}::text is null or p.numero ilike ${'%' + (buscar ?? '') + '%'} or c.nombre ilike ${'%' + (buscar ?? '') + '%'} or c.correo ilike ${'%' + (buscar ?? '') + '%'} or c.telefono ilike ${'%' + (buscar ?? '') + '%'})
      order by p.creado desc limit 50 offset ${pagina * 50}`;
    return filas.map((f: Fila) => ({ ...f, saldo: ['pagado', 'completado'].includes(f.estado) ? redondear(Number(f.saldo)) : 0 }));
  }));
  r.get('/admin/pedidos/:id', todos(async ({ ctx, params }) => {
    const i = await infoPedido(ctx.sql, params.id);
    const [bit, correos, creditos] = await Promise.all([
      ctx.sql`select * from bitacora where entidad = 'pedido' and entidad_id = ${params.id} order by creado desc limit 100`,
      ctx.sql`select id, plantilla, para, asunto, estado, error, creado from correos where pedido_id = ${params.id} order by creado desc limit 100`,
      ctx.sql`select * from creditos where cliente_id = ${i.cliente.id} order by creado desc`,
    ]);
    return { ...i, bitacora: bit, correos, creditos, tareas: i.tareas.map((t) => ({ ...t, etiqueta: etiquetaTarea[t.tipo] ?? t.tipo })) };
  }));
  r.post('/admin/pedidos', op(async ({ ctx, cuerpo }, u) => {
    const b = await cuerpo();
    const accion = ['enlace', 'pago_manual', 'checkout'].includes(String(b.accion)) ? b.accion as 'enlace' | 'pago_manual' : 'enlace';
    const res = await crearPedido(ctx, { carrito: b.carrito, cliente: b.cliente as Fila, datos: b.datos }, {
      origen: 'panel', usuario: u.correo, libre: !!b.libre, accion,
      lineasLibres: (Array.isArray(b.lineasLibres) ? b.lineasLibres : []).map((l: Fila) => ({ concepto: String(l.concepto ?? ''), importe: numero(l.importe, 'el importe', { min: 0 }), cantidad: l.cantidad ? numero(l.cantidad, 'la cantidad', { min: 1, entero: true }) : 1 })),
      descuento: b.descuento && Number((b.descuento as Fila).importe) > 0 ? { concepto: String((b.descuento as Fila).concepto || 'Descuento'), importe: Number((b.descuento as Fila).importe) } : null,
      apartadoMin: Math.round(numero(b.apartadoHoras ?? 24, 'las horas de apartado', { min: 1, max: 24 * 14 }) * 60),
      pagoManual: b.pagoManual ? { metodo: (b.pagoManual as Fila).metodo === 'efectivo' ? 'efectivo' : 'transferencia', referencia: (b.pagoManual as Fila).referencia } : undefined,
    });
    return res;
  }));
  r.post('/admin/pedidos/:id/cambiar-fecha', op(async ({ ctx, params, cuerpo }, u) => {
    const b = await cuerpo();
    await cambiarFecha(ctx, params.id, String(b.sesion), String(b.inicio), { porCliente: false, usuario: u.correo, libre: !!b.libre, avisar: b.avisar !== false });
    return { ok: true };
  }));
  r.post('/admin/pedidos/:id/cancelar', op(async ({ ctx, params, cuerpo }, u) => {
    const b = await cuerpo();
    const tipo = ['credito', 'reembolso', 'nada'].includes(String(b.tipo)) ? b.tipo as 'credito' : undefined;
    return cancelarPedido(ctx, params.id, { por: 'equipo', tipo, monto: b.monto != null && b.monto !== '' ? numero(b.monto, 'el monto', { min: 0 }) : undefined, motivo: String(b.motivo ?? ''), usuario: u.correo, avisar: b.avisar !== false });
  }));
  r.post('/admin/pedidos/:id/reembolso', admin(async ({ ctx, params, cuerpo }, u) => {
    const b = await cuerpo();
    return reembolsar(ctx, params.id, numero(b.monto, 'el monto', { min: 1 }), { usuario: u.correo, motivo: String(b.motivo ?? ''), ajustarLineas: true });
  }));
  r.post('/admin/pedidos/:id/cargo', op(async ({ ctx, params, cuerpo }, u) => {
    const b = await cuerpo();
    await agregarCargo(ctx, params.id, {
      concepto: texto(b.concepto, 'el concepto', { max: 200 }), precioUnitario: numero(b.precioUnitario, 'el precio', { min: 0 }), cantidad: numero(b.cantidad ?? 1, 'la cantidad', { min: 1, entero: true }),
      tipoCargo: b.tipoCargo ? String(b.tipoCargo) : null, sesionId: b.sesion ? String(b.sesion) : null,
    }, cobroDe(b), u.correo);
    return { ok: true };
  }));
  r.post('/admin/pedidos/:id/hora-extra', op(async ({ ctx, params, cuerpo }, u) => {
    const b = await cuerpo();
    await horaExtra(ctx, params.id, String(b.sesion), numero(b.horas ?? 1, 'las horas', { min: 0.5, max: 12 }), cobroDe(b), u.correo);
    return { ok: true };
  }));
  r.post('/admin/pedidos/:id/pago', op(async ({ ctx, params, cuerpo }, u) => {
    const b = await cuerpo();
    const metodo = ['efectivo', 'tarjeta'].includes(String(b.metodo)) ? b.metodo as 'efectivo' : 'transferencia';
    await pagoManual(ctx, params.id, { monto: numero(b.monto, 'el monto', { min: 0.01 }), metodo, referencia: b.referencia ? String(b.referencia) : undefined }, u.correo);
    return { ok: true };
  }));
  r.post('/admin/pedidos/:id/enlace-pago', op(async ({ ctx, params, cuerpo }, u) => {
    const b = await cuerpo();
    const i = await infoPedido(ctx.sql, params.id);
    const token = await tokenCliente(ctx, i.cliente.id);
    if (i.pedido.estado === 'apartado') {
      if (b.horas) {
        const vence = new Date(ctx.ahora().getTime() + numero(b.horas, 'las horas', { min: 1, max: 336 }) * 3600000);
        await ctx.sql`update pedidos set apartado_vence = ${vence} where id = ${params.id}`;
        await ctx.sql`update ocupacion set vence = ${vence} where pedido_id = ${params.id}`;
      }
      const [p] = await ctx.sql`select apartado_vence from pedidos where id = ${params.id}`;
      await avisar(ctx, 'enlace_pago', { para: i.cliente.correo, pedidoId: i.pedido.id, vars: { ...varsPedido(i, urlPagar(ctx, i.pedido.id, token)), vence: rangoTexto(new Date(p.apartadoVence), new Date(p.apartadoVence), i.espacio.zonaHoraria).replace(/, de .*/, '') }, bloques: { lista: bloqueSesiones(i), resumen: bloqueResumen(i), botones: [{ texto: 'Pagar', url: urlPagar(ctx, i.pedido.id, token) }] } });
    } else if (i.saldo > 0) {
      await avisar(ctx, 'cargo_pendiente', { para: i.cliente.correo, pedidoId: i.pedido.id, vars: { ...varsPedido(i, urlMisReservas(ctx, token)), monto: `$${i.saldo.toLocaleString('es-MX')}`, concepto: 'saldo pendiente' }, bloques: { resumen: bloqueResumen(i), botones: [{ texto: 'Pagar saldo', url: urlPagar(ctx, i.pedido.id, token) }] } });
    } else throw falla(409, 'SIN_SALDO', 'Este pedido no tiene nada por pagar.');
    await bitacora(ctx.sql, u.correo, 'enlace_pago', 'pedido', params.id);
    return { url: urlPagar(ctx, i.pedido.id, token) };
  }));
  r.post('/admin/pedidos/:id/linea', op(async ({ ctx, params, cuerpo }, u) => {
    const b = await cuerpo();
    await asignarPersonal(ctx, u.correo, params.id, String(b.linea ?? ''), String(b.asignado ?? ''), !!b.avisarCliente);
    return { ok: true };
  }));
  r.post('/admin/pedidos/:id/sesion', op(async ({ ctx, params, cuerpo }, u) => {
    const b = await cuerpo();
    const [s] = await ctx.sql`select * from sesiones where id = ${String(b.sesion)} and pedido_id = ${params.id}`;
    if (!s) throw noEncontrado('Sesión');
    const ing = b.ingenieroAsignado !== undefined ? (String(b.ingenieroAsignado).trim() || null) : s.ingenieroAsignado;
    const estado = b.estado === 'no_presentado' ? 'no_presentado' : b.estado === 'activa' ? 'activa' : s.estado;
    const persona = b.ingenieroAsignado !== undefined ? await personaDe(ctx.sql, ing) : null;
    const ingCorreo = b.ingenieroAsignado !== undefined ? persona?.correo ?? null : s.ingenieroCorreo;
    await ctx.sql`update sesiones set ingeniero_asignado = ${ing}, ingeniero_correo = ${ingCorreo}, notas = ${b.notas !== undefined ? String(b.notas) || null : s.notas}, estado = ${estado} where id = ${s.id}`;
    if (persona && persona.correo !== s.ingenieroCorreo && estado === 'activa') await avisarSesionAsignada(ctx, params.id, s.id, persona, 'ingeniero');
    if (ing && ing !== s.ingenieroAsignado) await ctx.sql`update tareas set hecha_en = now(), hecha_por = ${u.correo}, nota = ${ing} where sesion_id = ${s.id} and tipo = 'asignar_ingeniero' and hecha_en is null`;
    await bitacora(ctx.sql, u.correo, 'sesion', 'pedido', params.id, b);
    if (b.avisarCliente && ing) {
      const i = await infoPedido(ctx.sql, params.id);
      const token = await tokenCliente(ctx, i.cliente.id);
      const ses = i.sesiones.find((x) => x.id === s.id)!;
      await avisar(ctx, 'ingeniero_asignado', { para: i.cliente.correo, pedidoId: params.id, vars: { ...varsPedido(i, urlMisReservas(ctx, token)), fecha: ses.texto, ingeniero: ing } });
    }
    return { ok: true };
  }));
  r.post('/admin/pedidos/:id/notas', op(async ({ ctx, params, cuerpo }, u) => {
    const b = await cuerpo();
    await ctx.sql`update pedidos set notas_internas = ${String(b.notas ?? '') || null} where id = ${params.id}`;
    await bitacora(ctx.sql, u.correo, 'notas', 'pedido', params.id);
    return { ok: true };
  }));
  r.post('/admin/pedidos/:id/reenviar', op(async ({ ctx, params }, u) => {
    const i = await infoPedido(ctx.sql, params.id);
    const token = await tokenCliente(ctx, i.cliente.id);
    await avisar(ctx, 'pedido_confirmado', { para: i.cliente.correo, pedidoId: params.id, vars: varsPedido(i, urlMisReservas(ctx, token)), bloques: { lista: bloqueSesiones(i), resumen: bloqueResumen(i), botones: [{ texto: 'Ver mis reservas', url: urlMisReservas(ctx, token) }] }, adjuntos: await icsDePedido(ctx, i) });
    await bitacora(ctx.sql, u.correo, 'reenviar', 'pedido', params.id);
    return { ok: true };
  }));
  r.post('/admin/tareas/:id', todos(async ({ ctx, params, cuerpo }, u) => {
    const b = await cuerpo();
    await ctx.sql`update tareas set hecha_en = ${b.hecha === false ? null : ctx.ahora()}, hecha_por = ${b.hecha === false ? null : u.correo}, nota = ${b.nota != null ? String(b.nota) : null} where id = ${params.id}`;
    const [t] = await ctx.sql`select * from tareas where id = ${params.id}`;
    if (t?.tipo === 'reembolso_manual' && b.hecha !== false) await ctx.sql`update pagos set estado = 'pagado', confirmado = now(), registrado_por = ${u.correo} where pedido_id = ${t.pedidoId} and tipo = 'reembolso' and estado = 'pendiente'`;
    return { ok: true };
  }));

  // Postproducción
  r.get('/admin/trabajos', todos(async ({ ctx, q }) => ctx.sql`
    select t.*, pr.nombre as producto, p.numero, p.estado as pedido_estado, p.datos->>'proyecto' as proyecto, c.nombre, c.correo
    from trabajos t join pedidos p on p.id = t.pedido_id join clientes c on c.id = p.cliente_id left join productos pr on pr.id = t.producto_id
    where p.estado in ('pagado', 'completado') and (${q('estado')}::text is null or t.estado = ${q('estado')})
      and (t.estado not in ('aprobado', 'cancelado') or t.actualizado > now() - interval '30 days')
    order by t.fecha_entrega nulls last, t.creado`));
  r.post('/admin/trabajos/:id', todos(async ({ ctx, params, cuerpo }, u) => { await actualizarTrabajo(ctx, params.id, await cuerpo(), u.correo); return { ok: true }; }));

  // Solicitudes y cotizaciones
  r.get('/admin/solicitudes', op(async ({ ctx }) => ctx.sql`select * from solicitudes order by (estado = 'nueva') desc, creado desc limit 200`));
  r.post('/admin/solicitudes/:id', op(async ({ ctx, params, cuerpo }, u) => {
    const b = await cuerpo();
    if (!['nueva', 'en_proceso', 'convertida', 'descartada'].includes(String(b.estado))) throw falla(422, 'ESTADO', 'Estado inválido.');
    await ctx.sql`update solicitudes set estado = ${String(b.estado)}, notas = ${b.notas != null ? String(b.notas) : null}, pedido_id = ${b.pedido ? String(b.pedido) : null} where id = ${params.id}`;
    await bitacora(ctx.sql, u.correo, 'solicitud', 'solicitud', params.id, b);
    return { ok: true };
  }));
  r.get('/admin/cotizaciones', op(async ({ ctx }) => ctx.sql`select * from cotizaciones order by creado desc limit 200`));

  // Clientes
  r.get('/admin/clientes', todos(async ({ ctx, q }) => {
    const s = q('q');
    return ctx.sql`
      select c.*, (select count(*)::int from pedidos p where p.cliente_id = c.id and p.estado in ('pagado', 'completado')) as pedidos,
        (select coalesce(sum(p.total), 0) from pedidos p where p.cliente_id = c.id and p.estado in ('pagado', 'completado')) as gastado,
        (select coalesce(sum(cr.saldo), 0) from creditos cr where cr.cliente_id = c.id and cr.vence > now()) as credito
      from clientes c
      where (${s}::text is null or c.nombre ilike ${'%' + (s ?? '') + '%'} or c.correo ilike ${'%' + (s ?? '') + '%'} or c.telefono ilike ${'%' + (s ?? '') + '%'} or c.empresa ilike ${'%' + (s ?? '') + '%'})
      order by c.creado desc limit 100`;
  }));
  r.get('/admin/clientes/:id', todos(async ({ ctx, params }) => {
    const [c] = await ctx.sql`select * from clientes where id = ${params.id}`;
    if (!c) throw noEncontrado('Cliente');
    const [pedidos, creditos] = await Promise.all([
      ctx.sql`select id, numero, estado, total, creado, espacio_id from pedidos where cliente_id = ${params.id} order by creado desc`,
      ctx.sql`select * from creditos where cliente_id = ${params.id} order by creado desc`,
    ]);
    return { ...c, pedidos, creditos };
  }));
  r.post('/admin/clientes/:id', op(async ({ ctx, params, cuerpo }, u) => {
    const b = await cuerpo();
    await ctx.sql`update clientes set nombre = ${texto(b.nombre, 'el nombre', { max: 120 })}, telefono = ${String(b.telefono ?? '') || null}, empresa = ${String(b.empresa ?? '') || null},
      notas = ${String(b.notas ?? '') || null}, datos_fiscales = ${b.datosFiscales ? ctx.sql.json(b.datosFiscales as never) : null},
      acepta_promociones = ${b.aceptaPromociones === true}, promociones_fecha = case when ${b.aceptaPromociones === true} then coalesce(promociones_fecha, now()) else null end
      where id = ${params.id}`;
    if (b.correo) {
      const correo = correoValido(b.correo);
      try { await ctx.sql`update clientes set correo = ${correo} where id = ${params.id}`; } catch { throw falla(409, 'CORREO_EN_USO', 'Ya hay otro cliente con ese correo.'); }
    }
    await bitacora(ctx.sql, u.correo, 'editar', 'cliente', params.id, b);
    return { ok: true };
  }));
  r.post('/admin/clientes/:id/credito', admin(async ({ ctx, params, cuerpo }, u) => {
    const b = await cuerpo();
    const monto = numero(b.monto, 'el monto', { min: 1 });
    const vence = new Date(ctx.ahora().getTime() + numero(b.dias ?? 90, 'los días', { min: 1, max: 730, entero: true }) * 86400000);
    await ctx.sql`insert into creditos (cliente_id, monto, saldo, vence, nota, creado_por) values (${params.id}, ${monto}, ${monto}, ${vence}, ${String(b.nota ?? '') || null}, ${u.correo})`;
    await bitacora(ctx.sql, u.correo, 'credito', 'cliente', params.id, b);
    return { ok: true };
  }));

  // Catálogo
  r.put('/admin/catalogo/:tabla', todos(async ({ ctx, params, cuerpo }, u) => guardarCatalogo(ctx, params.tabla, await cuerpo(), u)));
  r.delete('/admin/catalogo/:tabla/:id', todos(async ({ ctx, params }, u) => borrarCatalogo(ctx, params.tabla, params.id, u)));

  // Horarios
  r.put('/admin/horarios/:espacio', admin(async ({ ctx, params, cuerpo }, u) => {
    const b = await cuerpo();
    const semana = (Array.isArray(b.semana) ? b.semana : []).map((h: Fila) => ({
      dia: numero(h.dia, 'el día', { min: 0, max: 6, entero: true }), abre: numero(h.abre, 'la hora de apertura', { min: 0, max: 1439, entero: true }), cierra: numero(h.cierra, 'la hora de cierre', { min: 1, max: 2880, entero: true }),
    }));
    if (semana.some((h: { abre: number; cierra: number }) => h.cierra <= h.abre)) throw falla(422, 'HORARIO', 'La hora de cierre debe ser después de la apertura.');
    await ctx.sql.begin(async (t: Sql) => {
      await t`delete from horarios where espacio_id = ${params.espacio}`;
      for (const h of semana) await t`insert into horarios (espacio_id, dia, abre_min, cierra_min) values (${params.espacio}, ${h.dia}, ${h.abre}, ${h.cierra})`;
    });
    await bitacora(ctx.sql, u.correo, 'horario', 'espacio', params.espacio, semana);
    return { ok: true };
  }));
  r.post('/admin/excepciones', op(async ({ ctx, cuerpo }, u) => {
    const b = await cuerpo();
    if (!esFecha(b.fecha)) throw falla(422, 'FECHA', 'Fecha inválida.');
    const ventanas = (Array.isArray(b.ventanas) ? b.ventanas : []).map((v: Fila) => ({ abre: Number(v.abre), cierra: Number(v.cierra) })).filter((v: { abre: number; cierra: number }) => v.cierra > v.abre);
    await ctx.sql`insert into excepciones (espacio_id, fecha, cerrado, ventanas, nota) values (${String(b.espacio)}, ${b.fecha}, ${!!b.cerrado || !ventanas.length}, ${ctx.sql.json(ventanas)}, ${String(b.nota ?? '') || null})
      on conflict (espacio_id, fecha) do update set cerrado = excluded.cerrado, ventanas = excluded.ventanas, nota = excluded.nota`;
    await bitacora(ctx.sql, u.correo, 'excepcion', 'espacio', String(b.espacio), b);
    return { ok: true };
  }));
  r.delete('/admin/excepciones/:espacio/:fecha', op(async ({ ctx, params }, u) => {
    await ctx.sql`delete from excepciones where espacio_id = ${params.espacio} and fecha = ${params.fecha}`;
    await bitacora(ctx.sql, u.correo, 'quitar_excepcion', 'espacio', params.espacio, params);
    return { ok: true };
  }));

  // Ajustes
  r.get('/admin/ajustes', admin(async ({ ctx }) => {
    const filas = await ctx.sql`select clave, valor from ajustes where clave in ('negocio', 'avisos')`;
    return Object.fromEntries(filas.map((f: Fila) => [f.clave, camelProfundo(f.valor)]));
  }));
  r.put('/admin/ajustes/:clave', admin(async ({ ctx, params, cuerpo }, u) => {
    if (!['negocio', 'avisos'].includes(params.clave)) throw noEncontrado('Ajuste');
    const b = await cuerpo();
    await ctx.sql`insert into ajustes (clave, valor) values (${params.clave}, ${ctx.sql.json(snakeProfundo(b) as never)}) on conflict (clave) do update set valor = excluded.valor, actualizado = now()`;
    await bitacora(ctx.sql, u.correo, 'ajustes', 'ajustes', params.clave, b);
    return { ok: true };
  }));

  // Correos
  r.get('/admin/plantillas', admin(async ({ ctx }) => {
    const ov = await ctx.sql`select * from plantillas_correo`;
    return PLANTILLAS.map((p) => {
      const o = ov.find((x: Fila) => x.id === p.id);
      return { ...p, asuntoBase: p.asunto, cuerpoBase: p.cuerpo, asunto: o?.asunto ?? p.asunto, cuerpo: o?.cuerpo ?? p.cuerpo, activo: o ? o.activo : true, editado: !!o };
    });
  }));
  r.put('/admin/plantillas/:id', admin(async ({ ctx, params, cuerpo }, u) => {
    if (!plantillaDef(params.id)) throw noEncontrado('Plantilla');
    const b = await cuerpo();
    await ctx.sql`insert into plantillas_correo (id, asunto, cuerpo, activo) values (${params.id}, ${texto(b.asunto, 'el asunto', { max: 300 })}, ${texto(b.cuerpo, 'el texto', { max: 5000 })}, ${b.activo !== false})
      on conflict (id) do update set asunto = excluded.asunto, cuerpo = excluded.cuerpo, activo = excluded.activo, actualizado = now()`;
    await bitacora(ctx.sql, u.correo, 'plantilla', 'plantilla', params.id, b);
    return { ok: true };
  }));
  r.delete('/admin/plantillas/:id', admin(async ({ ctx, params }) => { await ctx.sql`delete from plantillas_correo where id = ${params.id}`; return { ok: true }; }));
  r.post('/admin/plantillas/:id/vista', admin(async ({ ctx, params, cuerpo }) => {
    const def = plantillaDef(params.id);
    if (!def) throw noEncontrado('Plantilla');
    const b = await cuerpo();
    const negocio = await ajuste(ctx.sql, 'negocio') as never;
    const ejemplo: Record<string, string> = { nombre: 'Ana', numero: 'UND-1042', espacio: 'Estudio', total: '$4,500', fecha: 'sábado 17 de octubre de 2026, de 10:00 a 16:00', enlace: `${ctx.env.sitioUrl}/reservas/`, vence: 'jueves 15 de octubre de 2026 a las 23:59', monto: '$1,000', concepto: '2 horas extra', resultado: '$4,500 quedan como saldo a favor.', cuando: 'mañana', servicio: 'mezcla multitrack', titulo: 'Mi canción', revisiones: 'Te quedan 2 revisiones.', ingeniero: 'Carlos', color: 'Verde croma', desde: '13 de octubre', accion: 'Cambio de fecha', detalle: 'Detalle del cambio', pendientes: '• Asignar ingeniero', correo: 'ana@correo.com', telefono: '55 1234 5678', descripcion: 'Descripción del proyecto', notas: 'Más voz en el coro', servicios: 'tu mezcla', resena: '' };
    const r = renderizar(String(b.asunto ?? def.asunto), String(b.cuerpo ?? def.cuerpo), ejemplo, { resumen: { lineas: [{ concepto: 'Estudio · 6 horas con ingeniero', importe: '$4,500' }], total: '$4,500 MXN', nota: 'IVA incluido: $620.69.' }, botones: [{ texto: 'Ver mis reservas', url: '#' }] }, negocio, logoCorreo(ctx));
    return r;
  }));
  r.get('/admin/correos', op(async ({ ctx }) => ctx.sql`select c.*, p.numero from correos c left join pedidos p on p.id = c.pedido_id where c.estado <> 'omitido' order by c.creado desc limit 200`));

  // Reportes
  r.get('/admin/reportes', admin(async ({ ctx, q }) => reportes(ctx, q('desde') ?? '', q('hasta') ?? '')));

  // Usuarios
  r.get('/admin/usuarios', admin(async ({ ctx }) => ctx.sql`select * from usuarios order by creado`));
  r.put('/admin/usuarios', admin(async ({ ctx, cuerpo }, u) => {
    const b = await cuerpo();
    const correo = correoValido(b.correo);
    const rol = ['admin', 'operacion', 'postproduccion', 'ingeniero'].includes(String(b.rol)) ? String(b.rol) : 'operacion';
    const [ya] = await ctx.sql`select correo from usuarios where correo = ${correo}`;
    await ctx.sql`insert into usuarios (correo, nombre, rol, activo) values (${correo}, ${String(b.nombre ?? '') || null}, ${rol}, ${b.activo !== false})
      on conflict (correo) do update set nombre = excluded.nombre, rol = excluded.rol, activo = excluded.activo`;
    if (!ya && ctx.env.supabaseServiceKey && ctx.env.supabaseUrl) {
      const r = await fetch(`${ctx.env.supabaseUrl}/auth/v1/invite`, { method: 'POST', headers: { apikey: ctx.env.supabaseServiceKey, authorization: `Bearer ${ctx.env.supabaseServiceKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ email: correo }) });
      if (!r.ok && r.status !== 422) console.error('Invitación fallida', await r.text());
    }
    await bitacora(ctx.sql, u.correo, 'usuario', 'usuario', correo, { rol, activo: b.activo });
    return { ok: true };
  }));

  r.post('/admin/publicar', admin(async ({ ctx }, u) => {
    if (!ctx.env.githubToken || !ctx.env.githubRepo) throw falla(501, 'SIN_GITHUB', 'Falta configurar GITHUB_TOKEN y GITHUB_REPO.');
    const r = await fetch(`https://api.github.com/repos/${ctx.env.githubRepo}/actions/workflows/${ctx.env.githubWorkflow}/dispatches`, {
      method: 'POST', headers: { authorization: `Bearer ${ctx.env.githubToken}`, accept: 'application/vnd.github+json', 'user-agent': 'undying-reservas' }, body: JSON.stringify({ ref: 'main' }),
    });
    if (!r.ok) throw falla(502, 'GITHUB', `GitHub respondió ${r.status}.`);
    await bitacora(ctx.sql, u.correo, 'publicar', 'sitio', null);
    return { ok: true };
  }));

  r.get('/admin/avisos-config', admin(async ({ ctx }) => ajuste<Avisos>(ctx.sql, 'avisos')));
  void json;
}
