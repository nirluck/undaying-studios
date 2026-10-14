// Respuestas, errores y un enrutador mínimo.

import type { Ctx } from './ctx.ts';

export class ErrorApi extends Error {
  estado: number;
  codigo: string;
  datos?: unknown;
  constructor(estado: number, codigo: string, mensaje: string, datos?: unknown) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
    this.datos = datos;
  }
}

export const falla = (estado: number, codigo: string, mensaje: string, datos?: unknown) => new ErrorApi(estado, codigo, mensaje, datos);
export const noEncontrado = (que = 'Registro') => falla(404, 'NO_ENCONTRADO', `${que} no encontrado.`);

export interface Solicitud {
  req: Request;
  url: URL;
  params: Record<string, string>;
  ctx: Ctx;
  cuerpo: () => Promise<Record<string, unknown>>;
  texto: () => Promise<string>;
  q: (k: string) => string | null;
}

export type Manejador = (s: Solicitud) => Promise<Response | unknown>;

interface Ruta { metodo: string; partes: string[]; fn: Manejador }

export class Enrutador {
  rutas: Ruta[] = [];
  agregar(metodo: string, ruta: string, fn: Manejador) {
    this.rutas.push({ metodo, partes: ruta.split('/').filter(Boolean), fn });
    return this;
  }
  get(r: string, fn: Manejador) { return this.agregar('GET', r, fn); }
  post(r: string, fn: Manejador) { return this.agregar('POST', r, fn); }
  put(r: string, fn: Manejador) { return this.agregar('PUT', r, fn); }
  delete(r: string, fn: Manejador) { return this.agregar('DELETE', r, fn); }
  buscar(metodo: string, ruta: string): { fn: Manejador; params: Record<string, string> } | null {
    const partes = ruta.split('/').filter(Boolean);
    for (const r of this.rutas) {
      if (r.metodo !== metodo || r.partes.length !== partes.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < partes.length; i++) {
        if (r.partes[i].startsWith(':')) params[r.partes[i].slice(1)] = decodeURIComponent(partes[i]);
        else if (r.partes[i] !== partes[i]) { ok = false; break; }
      }
      if (ok) return { fn: r.fn, params };
    }
    return null;
  }
}

export function json(datos: unknown, estado = 200, encabezados: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(datos), { status: estado, headers: { 'content-type': 'application/json; charset=utf-8', ...encabezados } });
}

export function html(cuerpo: string, estado = 200): Response {
  return new Response(cuerpo, { status: estado, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export function cors(req: Request, ctx: Ctx): Record<string, string> {
  const origen = req.headers.get('origin') ?? '';
  const permitido = ctx.env.origenes.includes(origen)
    || (ctx.env.modoDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origen));
  return {
    'access-control-allow-origin': permitido ? origen : ctx.env.origenes[0] ?? '',
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type, x-tareas-secreto, apikey, x-client-info',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

// ---------- Validación de entradas ----------

export function texto(v: unknown, campo: string, { requerido = true, max = 500 } = {}): string {
  const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
  if (requerido && !s) throw falla(422, 'CAMPO_REQUERIDO', `Falta ${campo}.`, { campo });
  if (s.length > max) throw falla(422, 'CAMPO_LARGO', `${campo} es demasiado largo.`, { campo });
  return s;
}

export function correoValido(v: unknown, campo = 'el correo'): string {
  const s = texto(v, campo, { max: 200 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) throw falla(422, 'CORREO_INVALIDO', 'Revisa el correo electrónico.', { campo: 'correo' });
  return s;
}

export function numero(v: unknown, campo: string, { min = -Infinity, max = Infinity, entero = false } = {}): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max || (entero && !Number.isInteger(n))) throw falla(422, 'NUMERO_INVALIDO', `Revisa ${campo}.`, { campo });
  return n;
}

export function fechaIso(v: unknown, campo = 'la fecha'): string {
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw falla(422, 'FECHA_INVALIDA', `Revisa ${campo}.`);
  return d.toISOString();
}

export const esFecha = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
