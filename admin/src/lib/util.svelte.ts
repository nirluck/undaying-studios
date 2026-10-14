// Formatos y estado compartido del panel.

export { dinero } from '../../../supabase/functions/_shared/core/util.ts';
import { horaTexto } from '../../../supabase/functions/_shared/core/tiempo.ts';

export const TZ = 'America/Mexico_City';

export const fecha = (iso: string | Date | null | undefined, op: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) =>
  iso ? new Date(iso).toLocaleString('es-MX', { timeZone: TZ, ...op }) : '';
export const fechaHora = (iso: string | Date | null | undefined) => fecha(iso, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const hora = (iso: string | Date | null | undefined) => fecha(iso, { hour: '2-digit', minute: '2-digit', hour12: false });
export const fechaSola = (iso: string | Date | null | undefined) => fecha(iso, { weekday: 'short', day: 'numeric', month: 'short' });
export const minutosAHora = (m: number) => horaTexto(m) + (m >= 1440 ? ' (+1 día)' : '');
export const horaAMinutos = (h: string) => { const [a, b] = h.split(':').map(Number); return a * 60 + (b || 0); };

export const ESTADO_PEDIDO: Record<string, string> = { apartado: 'Apartado', pendiente_pago: 'OXXO pendiente', pagado: 'Pagado', completado: 'Completado', vencido: 'Vencido', cancelado: 'Cancelado' };
export const ESTADO_TRABAJO: Record<string, string> = { esperando_material: 'Esperando material', en_cola: 'En cola', en_proceso: 'En proceso', entregado: 'Entregado', en_revision: 'En revisión', aprobado: 'Aprobado', cancelado: 'Cancelado' };
export const METODO: Record<string, string> = { tarjeta: 'Tarjeta', oxxo: 'OXXO', stripe: 'Stripe', transferencia: 'Transferencia', efectivo: 'Efectivo', credito: 'Saldo a favor' };
export const ESPACIO: Record<string, string> = { estudio: 'Estudio', foro: 'Foro', 'estudio-b': 'Estudio B' };
export const ROL: Record<string, string> = { admin: 'Administrador', operacion: 'Operación', postproduccion: 'Postproducción' };

export function csv(nombre: string, filas: (string | number | null | undefined)[][]) {
  const texto = filas.map((f) => f.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' }));
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Mensaje flotante breve. */
export const aviso = $state({ texto: '', error: false, n: 0 });
export function avisar(texto: string, error = false) {
  aviso.texto = texto;
  aviso.error = error;
  const n = ++aviso.n;
  setTimeout(() => { if (aviso.n === n) aviso.texto = ''; }, error ? 6000 : 3000);
}

/** Ejecuta una acción mostrando el error si falla. */
export async function intentar<T>(fn: () => Promise<T>, ok?: string): Promise<T | undefined> {
  try {
    const r = await fn();
    if (ok) avisar(ok);
    return r;
  } catch (e) {
    avisar((e as Error).message, true);
    return undefined;
  }
}

export const sesion = $state<{ correo: string; rol: string; nombre: string | null; feeds: { espacio: string; url: string }[]; publicar: boolean }>({ correo: '', rol: '', nombre: null, feeds: [], publicar: false });
export const puede = (...roles: string[]) => sesion.rol === 'admin' || roles.includes(sesion.rol);
