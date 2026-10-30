import { get } from './api';
import type { Catalogo } from '../../../supabase/functions/_shared/core/tipos.ts';

let cache: Promise<Catalogo & { cupones: any[] }> | null = null;

/** Catálogo completo (incluye lo inactivo). `fresco` lo vuelve a pedir. */
export function catalogo(fresco = false) {
  if (!cache || fresco) {
    cache = get('/admin/catalogo');
    cache.catch(() => (cache = null));
  }
  return cache;
}

/** Solo lo activo, como lo ve el sitio. */
export async function catalogoActivo(): Promise<Catalogo> {
  const c = await catalogo();
  return {
    ...c,
    modalidades: c.modalidades.filter((x) => x.activo),
    bloques: c.bloques.filter((x) => x.activo),
    extras: c.extras.filter((x) => x.activo),
    productos: c.productos.filter((x) => x.activo),
    paquetes: c.paquetes.filter((x) => x.activo),
    tiposCargo: c.tiposCargo.filter((x) => x.activo),
  };
}

let cachePersonas: Promise<{ correo: string; nombre: string | null; rol: string }[]> | null = null;

/** Usuarios del panel para asignar sesiones y trabajos (ingenieros, productores, postproducción). */
export function personas() {
  if (!cachePersonas) {
    cachePersonas = get('/admin/personas');
    cachePersonas.catch(() => (cachePersonas = null));
  }
  return cachePersonas;
}
