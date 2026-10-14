// Conecta las landings con la reserva en línea. Si VITE_RESERVAS_API está
// vacía, no hace nada y las landings siguen como antes (WhatsApp, Prospex).
//
// - Los botones [data-book] abren el widget en vez del calendario de Prospex.
// - #qBook y #qPay (cotizador del estudio) abren el widget con lo que el
//   cliente armó.
// - ?cotizacion=CODIGO abre una cotización compartida.
// - ?pago=cancelado libera el apartado y retoma el pedido.
// - Los precios de las tarjetas se actualizan con los del panel.

import type { Carrito } from '../../supabase/functions/_shared/core/mod.ts';
import { catalogo, llamar, reservasActivas } from './api.ts';
import type { OpcionesAbrir } from './widget.ts';

export { reservasActivas };
export { preciosEstudio, preciosForo } from './precios-landing.ts';

export type Accion = { tipo: 'visita' } | { tipo: 'reserva'; abrir: OpcionesAbrir } | null;

export interface OpcionesLanding {
  /** Traduce la llave de un botón [data-book] a una acción. */
  boton: (llave: string) => Accion;
  /** Carrito armado en el cotizador de la landing (estudio). */
  carrito?: () => Partial<Carrito> | null;
  aviso?: (texto: string) => void;
}

export function iniciarReservas(espacioId: string, op: OpcionesLanding) {
  if (!reservasActivas()) return null;
  // El widget se descarga solo cuando alguien abre una reserva.
  let widget: Promise<ReturnType<typeof import('./widget.ts').crearReservas>> | null = null;
  const cargar = () => (widget ??= import('./widget.ts').then((m) => m.crearReservas(espacioId)));
  const rv = {
    abrir: (o?: OpcionesAbrir) => cargar().then((w) => w.abrir(o)),
    abrirVisita: () => cargar().then((w) => w.abrirVisita()),
    cerrar: () => widget?.then((w) => w.cerrar()),
  };

  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const libro = t.closest<HTMLElement>('[data-book]');
    if (libro) {
      const a = op.boton(libro.dataset.book ?? '');
      if (!a) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (a.tipo === 'visita') rv.abrirVisita();
      else rv.abrir(a.abrir);
      return;
    }
    const cot = t.closest<HTMLElement>('#qBook, #qPay');
    if (cot && op.carrito) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if ((cot as HTMLButtonElement).disabled || cot.classList.contains('is-disabled')) return;
      rv.abrir({ carrito: op.carrito() ?? undefined });
    }
  }, true);

  const p = new URLSearchParams(location.search);
  const limpiar = () => {
    ['cotizacion', 'pago', 'pedido', 't'].forEach((k) => p.delete(k));
    history.replaceState(null, '', location.pathname + (p.toString() ? `?${p}` : '') + location.hash);
  };
  if (p.get('cotizacion')) {
    const codigo = p.get('cotizacion')!;
    limpiar();
    rv.abrir({ cotizacion: codigo });
  } else if (p.get('pago') === 'cancelado' && p.get('pedido') && p.get('t')) {
    const pedido = p.get('pedido')!;
    const token = p.get('t')!;
    limpiar();
    op.aviso?.('No se completó el pago. Tu pedido sigue aquí para intentarlo de nuevo.');
    llamar<{ carrito: Carrito }>('POST', '/liberar', { pedido, t: token })
      .then((r) => rv.abrir({ carrito: r.carrito }))
      .catch(() => rv.abrir());
  }

  return {
    ...rv,
    /** Catálogo del panel, para actualizar los precios que muestra la landing. */
    catalogo: () => catalogo(espacioId).then((r) => r.catalogo),
  };
}
