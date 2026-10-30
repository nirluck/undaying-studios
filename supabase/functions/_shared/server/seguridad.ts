// Enlaces de acceso sin contraseña para clientes y autenticación del panel.

import type { Ctx, Sql } from './ctx.ts';
import { falla } from './http.ts';

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function tokenAleatorio(bytes = 24): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return b64url(b);
}

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function codigoCorto(n = 8): string {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => ALFABETO[x % ALFABETO.length]).join('');
}

export async function sha256(s: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h), (x) => x.toString(16).padStart(2, '0')).join('');
}

export async function crearAcceso(sql: Sql, op: { clienteId?: string; visitaId?: string; dias: number; ahora: Date }): Promise<string> {
  const token = tokenAleatorio();
  const vence = new Date(op.ahora.getTime() + op.dias * 86400000);
  await sql`insert into accesos (token_hash, cliente_id, visita_id, vence) values (${await sha256(token)}, ${op.clienteId ?? null}, ${op.visitaId ?? null}, ${vence})`;
  return token;
}

export async function acceso(sql: Sql, token: string | null | undefined, ahora: Date): Promise<{ clienteId: string | null; visitaId: string | null }> {
  if (!token || token.length < 16) throw falla(401, 'ENLACE_INVALIDO', 'El enlace no es válido. Pide uno nuevo con tu correo.');
  const [a] = await sql`select cliente_id, visita_id, vence from accesos where token_hash = ${await sha256(token)}`;
  if (!a) throw falla(401, 'ENLACE_INVALIDO', 'El enlace no es válido. Pide uno nuevo con tu correo.');
  if (new Date(a.vence).getTime() < ahora.getTime()) throw falla(401, 'ENLACE_VENCIDO', 'El enlace venció. Pide uno nuevo con tu correo.');
  return { clienteId: a.clienteId, visitaId: a.visitaId };
}

export async function clienteDeToken(ctx: Ctx, token: string | null | undefined): Promise<string> {
  const a = await acceso(ctx.sql, token, ctx.ahora());
  if (!a.clienteId) throw falla(401, 'ENLACE_INVALIDO', 'El enlace no es válido.');
  return a.clienteId;
}

// ---------- Panel ----------

export type Rol = 'admin' | 'operacion' | 'postproduccion' | 'ingeniero';
export interface Usuario { correo: string; nombre: string | null; rol: Rol }

/** Verifica el token de Supabase Auth con el servidor de Auth del proyecto. */
export function verificadorSupabase(url: string, anonKey: string) {
  const cache = new Map<string, { correo: string | null; hasta: number }>();
  return async (token: string): Promise<string | null> => {
    const c = cache.get(token);
    if (c && c.hasta > Date.now()) return c.correo;
    const r = await fetch(`${url}/auth/v1/user`, { headers: { authorization: `Bearer ${token}`, apikey: anonKey } });
    const correo = r.ok ? ((await r.json()).email ?? null)?.toLowerCase() ?? null : null;
    cache.set(token, { correo, hasta: Date.now() + 60000 });
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    return correo;
  };
}

export async function usuarioDe(req: Request, ctx: Ctx): Promise<Usuario> {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) throw falla(401, 'SIN_SESION', 'Inicia sesión.');
  let correo: string | null = null;
  if (ctx.env.modoDev && token.startsWith('dev:')) correo = token.slice(4).toLowerCase();
  else correo = await ctx.verificarToken(token);
  if (!correo) throw falla(401, 'SIN_SESION', 'Tu sesión venció. Vuelve a entrar.');
  const [u] = await ctx.sql`select correo, nombre, rol from usuarios where correo = ${correo} and activo`;
  if (u) return u as Usuario;
  if (ctx.env.adminCorreos.includes(correo)) return { correo, nombre: null, rol: 'admin' };
  throw falla(403, 'SIN_PERMISO', 'Tu correo no tiene acceso al panel.');
}

export function exigir(u: Usuario, ...roles: Rol[]) {
  if (u.rol === 'admin' || roles.includes(u.rol)) return;
  throw falla(403, 'SIN_PERMISO', 'Tu rol no tiene permiso para esto.');
}
