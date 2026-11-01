// Pasa los precios del panel (catálogo de la API) a los objetos PRICING de
// cada landing. Lo usan las landings en el navegador y vite.config.js al
// compilar, para que el JSON-LD de SEO tenga los precios vigentes.

import type { Catalogo } from '../../supabase/functions/_shared/core/tipos.ts';
import { precioVigente } from '../../supabase/functions/_shared/core/precios.ts';

type Num = number | null;

/** Pasa los precios del panel al objeto PRICING del estudio. Devuelve true si algo cambió. */
export function preciosEstudio(PRICING: { blocks: { id: string; price: Record<string, number> }[]; products: { id: string; price: number }[]; legal?: { id: string; price: number; bundle: number }[] }, cat: Catalogo, ahora = new Date()): boolean {
  let cambio = false;
  const fijar = <T extends object>(obj: T, k: keyof T, v: Num) => { if (v != null && obj[k] !== v) { (obj as Record<keyof T, unknown>)[k] = v; cambio = true; } };
  for (const b of PRICING.blocks) {
    const db = cat.bloques.find((x) => x.id === `estudio-${b.id}`);
    if (!db) continue;
    for (const modo of Object.keys(b.price)) fijar(b.price, modo, precioVigente(db.precios[`estudio-${modo}`], ahora));
  }
  for (const pr of PRICING.products) fijar(pr, 'price', precioVigente(cat.productos.find((x) => x.id === pr.id)?.precio, ahora));
  for (const l of PRICING.legal ?? []) {
    const db = cat.productos.find((x) => x.id === l.id);
    fijar(l, 'price', precioVigente(db?.precio, ahora));
    fijar(l, 'bundle', db?.precioConReserva ?? null);
  }
  return cambio;
}

/** Pasa los precios del panel al objeto PRICING del foro. */
export function preciosForo(PRICING: { blocks: { id: string; price: number; color?: { extra: number } }[] }, cat: Catalogo, ahora = new Date()): boolean {
  let cambio = false;
  const color = precioVigente(cat.extras.find((x) => x.id === 'foro-color')?.precio, ahora);
  for (const b of PRICING.blocks) {
    const p = precioVigente(cat.bloques.find((x) => x.id === `foro-${b.id}`)?.precios['foro-renta'], ahora);
    if (p != null && p !== b.price) { b.price = p; cambio = true; }
    if (b.color && color != null && b.color.extra !== color) { b.color.extra = color; cambio = true; }
  }
  return cambio;
}
