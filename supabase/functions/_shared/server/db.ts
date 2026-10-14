// Lectura del catálogo y utilidades de base de datos.
// Las columnas llegan en camelCase (transformación de postgres.js); el
// contenido de las columnas jsonb se guarda en snake_case y se convierte aquí.

import type { Catalogo, Espacio, Rango } from '../core/tipos.ts';
import type { Sql } from './ctx.ts';

const aCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const aSnake = (s: string) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());

export function camelProfundo<T = unknown>(v: unknown): T {
  if (Array.isArray(v)) return v.map((x) => camelProfundo(x)) as T;
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [aCamel(k), camelProfundo(x)])) as T;
  }
  return v as T;
}

export function snakeProfundo<T = unknown>(v: unknown): T {
  if (Array.isArray(v)) return v.map((x) => snakeProfundo(x)) as T;
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [aSnake(k), snakeProfundo(x)])) as T;
  }
  return v as T;
}

const precio = (r: Record<string, unknown>, campo = 'precio') => ({
  precio: r[campo] as number | null,
  nuevo: (r[`${campo}Nuevo`] ?? null) as number | null,
  desde: r[`${campo}NuevoDesde`] ? new Date(r[`${campo}NuevoDesde`] as string).toISOString() : null,
});

// deno-lint-ignore no-explicit-any
type Fila = Record<string, any>;

export function espacioDeFila(e: Fila): Espacio {
  return {
    id: e.id, nombre: e.nombre, nombreCorto: e.nombreCorto, zonaHoraria: e.zonaHoraria, reservable: e.reservable,
    margenMin: e.margenMin, pasoMin: e.pasoMin, anticipacionH: e.anticipacionH, horizonteDias: e.horizonteDias,
    aforo: e.aforo, variasSesiones: e.variasSesiones,
    visitas: camelProfundo(e.visitas), politica: camelProfundo(e.politica), pago: camelProfundo(e.pago),
    documentos: e.documentos ?? {}, orden: e.orden, activo: e.activo,
  };
}

/** Catálogo completo. `soloActivos` filtra lo inactivo (para el sitio). */
export async function cargarCatalogo(sql: Sql, soloActivos = false): Promise<Catalogo> {
  const [espacios, horarios, excepciones, modalidades, bloques, precios, extras, productos, paquetes, cargos] = await Promise.all([
    sql`select * from espacios order by orden`,
    sql`select * from horarios order by espacio_id, dia, abre_min`,
    sql`select espacio_id, to_char(fecha, 'YYYY-MM-DD') as fecha, cerrado, ventanas, nota from excepciones`,
    sql`select * from modalidades order by orden`,
    sql`select * from bloques order by orden`,
    sql`select * from precios_bloque`,
    sql`select * from extras order by orden`,
    sql`select * from productos order by orden`,
    sql`select * from paquetes order by orden`,
    sql`select * from tipos_cargo order by orden`,
  ]);
  const activo = (x: Fila) => !soloActivos || x.activo;
  return {
    espacios: espacios.map(espacioDeFila).filter(activo),
    horarios: horarios.map((h: Fila) => ({ espacioId: h.espacioId, dia: h.dia, abre: h.abreMin, cierra: h.cierraMin })),
    excepciones: excepciones.map((x: Fila) => ({ espacioId: x.espacioId, fecha: x.fecha, cerrado: x.cerrado, ventanas: x.ventanas ?? [], nota: x.nota })),
    modalidades: modalidades.filter(activo).map((m: Fila) => ({
      id: m.id, espacioId: m.espacioId, nombre: m.nombre, nota: m.nota, descripcionCorta: m.descripcionCorta, ventajas: m.ventajas ?? [],
      tarea: m.tarea, pideIngenieroCliente: m.pideIngenieroCliente, horaExtra: precio(m, 'horaExtra'), orden: m.orden, activo: m.activo,
    })),
    bloques: bloques.filter(activo).map((b: Fila) => ({
      id: b.id, espacioId: b.espacioId, horas: b.horas, etiqueta: b.etiqueta, frase: b.frase, destacado: b.destacado, orden: b.orden, activo: b.activo,
      precios: Object.fromEntries(precios.filter((p: Fila) => p.bloqueId === b.id).map((p: Fila) => [p.modalidadId, precio(p)])),
    })),
    extras: extras.filter(activo).map((x: Fila) => ({
      id: x.id, espacioId: x.espacioId, nombre: x.nombre, descripcion: x.descripcion, precio: precio(x),
      anticipacionDias: x.anticipacionDias, bloqueoAntesDias: x.bloqueoAntesDias, bloqueoDespuesDias: x.bloqueoDespuesDias,
      bloques: x.bloques, opciones: camelProfundo(x.opciones ?? []), unaVezPorRacha: x.unaVezPorRacha, tarea: x.tarea, orden: x.orden, activo: x.activo,
    })),
    productos: productos.filter(activo).map((p: Fila) => ({
      id: p.id, espacioId: p.espacioId, nombre: p.nombre, descripcion: p.descripcion, precio: precio(p), precioConReserva: p.precioConReserva ?? null, unidad: p.unidad,
      requiereSesion: p.requiereSesion, maxPorSesion: p.maxPorSesion, maxCantidad: p.maxCantidad, revisiones: p.revisiones,
      precioRevision: p.precioRevision, entregaDias: p.entregaDias, generaTrabajo: p.generaTrabajo, tarea: p.tarea,
      campos: camelProfundo(p.campos ?? []), orden: p.orden, activo: p.activo,
    })),
    paquetes: paquetes.filter(activo).map((p: Fila) => ({
      id: p.id, espacioId: p.espacioId, nombre: p.nombre, descripcion: p.descripcion, bloqueId: p.bloqueId, modalidadId: p.modalidadId,
      productos: p.productos ?? {}, orden: p.orden, activo: p.activo,
    })),
    tiposCargo: cargos.filter(activo).map((t: Fila) => ({ id: t.id, espacioId: t.espacioId, nombre: t.nombre, precio: t.precio, orden: t.orden, activo: t.activo })),
  };
}

/** Rangos ocupados de un espacio (sin datos personales). */
export async function ocupacionDe(sql: Sql, espacioId: string, desde: Date, hasta: Date, ahora: Date, op: { excluirPedido?: string; excluirVisita?: string } = {}): Promise<(Rango & { tipo: string; pedidoId: string | null })[]> {
  const filas = await sql`
    select lower(rango) as inicio, upper(rango) as fin, tipo, pedido_id
    from ocupacion
    where espacio_id = ${espacioId}
      and rango && tstzrange(${desde}, ${hasta})
      and (vence is null or vence > ${ahora})
      and (${op.excluirPedido ?? null}::uuid is null or pedido_id is distinct from ${op.excluirPedido ?? null}::uuid)
      and (${op.excluirVisita ?? null}::uuid is null or visita_id is distinct from ${op.excluirVisita ?? null}::uuid)
    order by lower(rango)`;
  return filas.map((f: Fila) => ({ inicio: new Date(f.inicio).getTime(), fin: new Date(f.fin).getTime(), tipo: f.tipo, pedidoId: f.pedidoId }));
}

export async function ajuste<T = Record<string, unknown>>(sql: Sql, clave: string): Promise<T> {
  const [f] = await sql`select valor from ajustes where clave = ${clave}`;
  return camelProfundo<T>(f?.valor ?? {});
}

export interface Negocio { nombre: string; razonSocial: string; correo: string; whatsapp: string; whatsappTexto: string; direccion: string; mapa: string; sitio: string; llegada: string }
export interface Avisos {
  correosEquipo: string[]; horaResumen: number; diaResumenSemanal: number; recordatoriosH: number[]; horaGracias: number;
  materialRecordatoriosDias: number[]; autoAprobarDias: number; creditoAvisoDias: number; pinturaAvisoDias: number; resenaUrl: string;
}

export async function bitacora(sql: Sql, usuario: string | null, accion: string, entidad: string, entidadId: string | null, detalle?: unknown) {
  await sql`insert into bitacora (usuario, accion, entidad, entidad_id, detalle) values (${usuario}, ${accion}, ${entidad}, ${entidadId}, ${detalle == null ? null : sql.json(detalle as never)})`;
}

export const esEmpalme = (e: unknown) => (e as { code?: string })?.code === '23P01';
