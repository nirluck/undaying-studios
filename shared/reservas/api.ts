// Cliente de la API de reservas para el sitio.
// La URL sale de VITE_RESERVAS_API (archivo .env en la raíz del proyecto).
// Si está vacía, las landings siguen usando WhatsApp y Prospex.

import type { Carrito, Catalogo, Cotizacion, Rango } from '../../supabase/functions/_shared/core/mod.ts';

export const API = ((import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_RESERVAS_API ?? '').replace(/\/$/, '');
export const reservasActivas = () => !!API;

export class ErrorApi extends Error {
  codigo: string;
  estado: number;
  datos: unknown;
  constructor(estado: number, codigo: string, mensaje: string, datos?: unknown) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
    this.datos = datos;
  }
}

export async function llamar<T = unknown>(metodo: 'GET' | 'POST', ruta: string, cuerpo?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(API + ruta, {
      method: metodo,
      headers: cuerpo ? { 'content-type': 'application/json' } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(0, 'RED', 'No pudimos conectarnos. Revisa tu internet e intenta de nuevo.');
  }
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErrorApi(r.status, datos.codigo ?? 'ERROR', datos.error ?? 'Algo salió mal. Intenta de nuevo.', datos.datos);
  return datos as T;
}

export interface RespuestaCatalogo {
  catalogo: Catalogo;
  ahora: string;
  negocio: { whatsapp: string; whatsappTexto: string; correo: string; sitio: string };
}

const catalogos = new Map<string, Promise<RespuestaCatalogo>>();
export function catalogo(espacio: string) {
  if (!catalogos.has(espacio)) {
    const p = llamar<RespuestaCatalogo>('GET', `/catalogo?espacio=${espacio}`);
    p.catch(() => catalogos.delete(espacio));
    catalogos.set(espacio, p);
  }
  return catalogos.get(espacio)!;
}

export interface Ocupacion { ahora: string; ocupacion: Rango[] }

export function disponibilidad(espacio: string, desde: string, hasta: string, extra = '') {
  return llamar<Ocupacion>('GET', `/disponibilidad?espacio=${espacio}&desde=${desde}&hasta=${hasta}${extra}`);
}

export const cotizar = (carrito: Carrito, correo?: string) => llamar<Cotizacion>('POST', '/cotizar', { carrito, correo });
