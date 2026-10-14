// Sesión del panel y llamadas a la API.
// En producción la sesión es de Supabase Auth (enlace mágico por correo).
// En local, sin VITE_SUPABASE_URL, se entra con cualquier correo de
// ADMIN_CORREOS (token "dev:correo", que la API acepta solo con MODO_DEV=1).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = import.meta.env as Record<string, string | undefined>;
export const API = (env.VITE_RESERVAS_API ?? '').replace(/\/$/, '');
const URL_SB = env.VITE_SUPABASE_URL ?? '';
const LLAVE_SB = env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase: SupabaseClient | null = URL_SB && LLAVE_SB
  ? createClient(URL_SB, LLAVE_SB, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } })
  : null;
export const modoLocal = !supabase;

let tokenLocal: string | null = (() => { try { return sessionStorage.getItem('panel-dev'); } catch { return null; } })();

export async function token(): Promise<string | null> {
  if (supabase) return (await supabase.auth.getSession()).data.session?.access_token ?? null;
  return tokenLocal;
}

export async function entrar(correo: string): Promise<'enlace' | 'listo'> {
  if (supabase) {
    const { error } = await supabase.auth.signInWithOtp({ email: correo, options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname } });
    if (error) throw new Error(error.message.includes('Signups not allowed') ? 'Ese correo no tiene acceso al panel.' : error.message);
    return 'enlace';
  }
  tokenLocal = `dev:${correo.trim().toLowerCase()}`;
  try { sessionStorage.setItem('panel-dev', tokenLocal); } catch { /* */ }
  return 'listo';
}

export async function salir() {
  if (supabase) await supabase.auth.signOut();
  tokenLocal = null;
  try { sessionStorage.removeItem('panel-dev'); } catch { /* */ }
  location.hash = '';
  location.reload();
}

export class ErrorApi extends Error {
  estado: number;
  codigo: string;
  constructor(estado: number, codigo: string, mensaje: string) { super(mensaje); this.estado = estado; this.codigo = codigo; }
}

export async function api<T = any>(metodo: 'GET' | 'POST' | 'PUT' | 'DELETE', ruta: string, cuerpo?: unknown): Promise<T> {
  const t = await token();
  let r: Response;
  try {
    r = await fetch(API + ruta, {
      method: metodo,
      headers: { ...(cuerpo !== undefined ? { 'content-type': 'application/json' } : {}), ...(t ? { authorization: `Bearer ${t}` } : {}) },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(0, 'RED', 'No hay conexión con el servidor.');
  }
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErrorApi(r.status, datos.codigo ?? 'ERROR', datos.error ?? `Error ${r.status}`);
  return datos as T;
}

export const get = <T = any>(ruta: string) => api<T>('GET', ruta);
export const post = <T = any>(ruta: string, cuerpo: unknown = {}) => api<T>('POST', ruta, cuerpo);
export const put = <T = any>(ruta: string, cuerpo: unknown) => api<T>('PUT', ruta, cuerpo);
export const borrar = <T = any>(ruta: string) => api<T>('DELETE', ruta);
