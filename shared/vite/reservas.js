// Reserva en línea al compilar: lee VITE_RESERVAS_API del .env de la raíz y,
// si está configurada, trae el catálogo del panel para que el JSON-LD de SEO
// salga con los precios vigentes. Sin API, se usan los de data.js.

import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

/** Todas las páginas leen el .env de la raíz del proyecto. */
export const envDir = fileURLToPath(new URL('../..', import.meta.url));

export async function catalogoDelPanel(espacio, mode) {
  const api = (loadEnv(mode, envDir, 'VITE_').VITE_RESERVAS_API || '').replace(/\/$/, '');
  if (!api || mode === 'development') return null;
  try {
    const r = await fetch(`${api}/catalogo?espacio=${espacio}`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()).catalogo;
  } catch (e) {
    console.warn(`[reservas] No se pudieron leer los precios del panel (${e.message}); el JSON-LD usa los de data.js.`);
    return null;
  }
}
