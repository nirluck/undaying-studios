// Prueba del cotizador por etapas. Muestra las tarifas por bloque, los
// servicios de postproducción y los legales como en la landing, y cada botón
// abre el cotizador en un pop-up (shared/reservas/widget.ts con `etapas`)
// que empieza por lo que se eligió y termina en el pago. Necesita la API de
// reservas (VITE_RESERVAS_API); sin ella, los botones van a WhatsApp.

import '../../shared/styles/base.css';
import '../../shared/styles/components.css';
import '../../shared/styles/legal.css';
import '../../shared/reservas/reservas.css';
import '../src/estudio.css';
import './prueba.css';

import type { Carrito } from '../../supabase/functions/_shared/core/mod.ts';
import { iniciarReservas, preciosEstudio, reservasActivas } from '../../shared/reservas/landing.ts';
import { LINKS, PRICING } from '../src/data.js';

type Bloque = { id: string; hours: number; badge: string; hot?: boolean; price: Record<string, number> };
type Servicio = { id: string; name: string; desc: string; price: number; unit?: string; bundle?: number };
type Paquete = { id: string; name: string; desc: string; block: string; products: Record<string, number> };

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)!;
const $$ = (s: string, r: ParentNode = document) => [...r.querySelectorAll<HTMLElement>(s)];
const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX');
const check = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const waUrl = (text = '') => `https://wa.me/${LINKS.whatsappNumber}${text ? '?text=' + encodeURIComponent(text) : ''}`;

// En local el estudio corre en el puerto 5173 y la página está en /prueba-reserva/
if (import.meta.env.DEV) { $('#volver').setAttribute('href', '/'); $('.nav__brand').setAttribute('href', '/'); }

const activa = reservasActivas();
const demo = $('#prDemo');
demo.hidden = false;
demo.innerHTML = activa
  ? '<b>Página de prueba</b> con el catálogo y la agenda del sistema de reservas. Los pagos van a Stripe en modo de prueba.'
  : '<b>Sin sistema de reservas:</b> esta página necesita VITE_RESERVAS_API para abrir el cotizador. Mientras, los botones van a WhatsApp.';

/* ---------- Tarifas por bloque ---------- */
let mode = 'ing';
const blocks = PRICING.blocks as Bloque[];
const hourRate = (m: string) => blocks[0].price[m] / blocks[0].hours;
const blockLabel = (b: Bloque, m: string) => `${b.hours} horas ${m === 'dry' ? 'sin ingeniero (Dry Hire)' : 'con ingeniero'}`;

function renderPricing() {
  $('#modeSwitch').innerHTML = Object.entries(PRICING.modes as Record<string, { label: string; note: string }>).map(([id, m]) =>
    `<button type="button" role="radio" aria-checked="${id === mode}" data-mode="${id}"><b>${m.label}</b><span>${m.note}</span></button>`).join('');
  $('#pricingGrid').innerHTML = blocks.map((b, i) => {
    const price = b.price[mode];
    const regular = hourRate(mode) * b.hours;
    const accion = activa
      ? `<button class="btn btn--primary btn--block" type="button" data-book="${b.id}-${mode}">Reservar ${b.hours} horas</button>`
      : `<a class="btn btn--primary btn--block" href="${waUrl(`Hola, quiero reservar ${blockLabel(b, mode)}. ¿Qué fechas tienen disponibles?`)}" target="_blank" rel="noopener">Reservar ${b.hours} horas</a>`;
    return `
    <article class="plan ${b.hot ? 'plan--hot' : ''}">
      <span class="plan__badge ${b.hot ? '' : 'plan__badge--alt'} ${i === 0 ? 'plan__badge--base' : ''}">${b.badge}</span>
      <div class="plan__head"><b>${b.hours}<small>horas</small></b></div>
      <p class="plan__price"><span>${money(price)}</span><small>MXN</small></p>
      <p class="plan__per">${price < regular ? `<s>${money(regular)}</s> · ` : ''}${money(price / b.hours)} por hora</p>
      <ul class="plan__perks">${(PRICING.perks[mode] as string[]).map((p) => `<li>${check}${p}</li>`).join('')}</ul>
      ${accion}
    </article>`;
  }).join('');
  $('#podcastStrip').innerHTML = `
    <div class="podcast-strip__body">
      <p class="eyebrow">${PRICING.podcast.name}</p>
      <p>${PRICING.podcast.desc}</p>
    </div>
    <a class="btn btn--ghost" href="${waUrl(PRICING.podcast.whatsapp)}" target="_blank" rel="noopener">Cotizar por WhatsApp</a>`;
}
$('#pricingPolicy').textContent = PRICING.policy;
$('#modeSwitch').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-mode]');
  if (b) { mode = b.dataset.mode!; renderPricing(); }
});

/* ---------- Servicios: postproducción y legales ---------- */
// Foto del estudio para cada servicio de postproducción (propuesta).
const FOTOS: Record<string, [string, string]> = {
  edicion: ['cr-06', 'Sesión abierta en Pro Tools en el Control Room'],
  mezcla: ['eb-02', 'Consola y equipo analógico del Estudio B'],
  master: ['eb-03', 'Estudio B de mezcla y máster'],
  vocal: ['engineer', 'Micrófono de voz en el estudio'],
  productor: ['cr-07', 'Productor trabajando con un músico en el Control Room'],
  musico: ['live-01', 'Baterista preparando su set en el Live Room'],
};
// La página vive en /estudio/prueba-reserva/: las fotos están un nivel arriba.
const foto = (id: string) => {
  const f = FOTOS[id];
  return f ? `<figure class="prod__img"><img src="../img/${f[0]}-800.webp" srcset="../img/${f[0]}-400.webp 400w, ../img/${f[0]}-800.webp 800w" sizes="(min-width: 1000px) 30vw, (min-width: 640px) 45vw, 100vw" alt="${f[1]}" loading="lazy" decoding="async" /></figure>` : '';
};
const solicitar = (id: string) => `<button class="btn btn--ghost btn--sm" type="button" data-add="${id}">Solicitar</button>`;
const contador = '<p class="prod__count" aria-live="polite"></p>';

function renderServicios() {
  $('#postGrid').innerHTML = (PRICING.products as Servicio[]).map((p) => `
  <article class="prod prod--foto" data-id="${p.id}">
    ${foto(p.id)}
    <div class="prod__head"><b>${p.name}</b><p class="prod__price">${money(p.price)}<span>${p.unit}</span></p></div>
    <p class="prod__desc">${p.desc}</p>
    <div class="prod__foot">${solicitar(p.id)}${contador}</div>
  </article>`).join('');
  // Legales: lista a dos columnas, más técnica que las tarjetas
  $('#legalList').innerHTML = (PRICING.legal as Servicio[]).map((p) => `
  <li class="litem" data-id="${p.id}">
    <div class="litem__info">
      <b>${p.name}</b>
      <p>${p.desc}</p>
    </div>
    <div class="litem__lado">
      <p class="litem__precio">${money(p.price)}${p.bundle != null && p.bundle < p.price ? `<span>${money(p.bundle)} con horas de estudio</span>` : ''}</p>
      ${solicitar(p.id)}
    </div>
    ${contador}
  </li>`).join('');
  marcar(enPedido);
}

// Las tarjetas muestran cuántos van en la cotización
let enPedido: Carrito | null = null;
function marcar(c: Carrito | null) {
  enPedido = c;
  $$('#postGrid [data-id], #legalList [data-id]').forEach((card) => {
    const q = (c?.productos ?? []).filter((x) => x.id === card.dataset.id).reduce((n, x) => n + x.cantidad, 0);
    card.classList.toggle('is-added', q > 0);
    $('.prod__count', card).innerHTML = q ? `${q} en tu cotización · <a href="#cotizador" data-ver-cotizacion>Ver cotización</a>` : '';
  });
}

/* ---------- Cotizador: paquetes y botones ---------- */
$('#qPresets').innerHTML = (PRICING.presets as Paquete[]).map((p) => `<button class="qopt" type="button" data-preset="${p.id}"><b>${p.name}</b><span>${p.desc}</span></button>`).join('');
$('#qWa').setAttribute('href', waUrl('Hola, quiero cotizar una sesión en Undying Studios.'));
$('#qFoot').textContent = `${PRICING.policy} Reprogramación sin costo con 48 horas de anticipación. No hay reembolsos por cancelación.`;

let toastT = 0;
function toast(msg: string) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastT);
  toastT = window.setTimeout(() => t.classList.remove('is-on'), 2800);
}

const reservas = iniciarReservas('estudio', {
  etapas: true,
  boton: (k) => ({ tipo: 'reserva', abrir: { bloqueId: `estudio-${k.split('-')[0]}`, modalidadId: `estudio-${k.split('-')[1]}` } }),
  alCambiar: (c) => marcar(c),
  aviso: (t) => toast(t),
});

renderPricing();
renderServicios();
// Los precios del panel mandan: si cambiaron, se vuelven a pintar las tarjetas.
reservas?.catalogo().then((cat) => { if (preciosEstudio(PRICING, cat)) { renderPricing(); renderServicios(); } }).catch(() => {});

const nombreServicio = (id: string) => [...PRICING.products, ...PRICING.legal].find((p: Servicio) => p.id === id)?.name ?? '';
const porSesion = (id: string) => (PRICING.products as Servicio[]).find((x) => x.id === id)?.unit === 'por sesión';

function abrirPaquete(id: string) {
  const p = (PRICING.presets as Paquete[]).find((x) => x.id === id);
  if (!p) return;
  if (!reservas) { window.open(waUrl(`Hola, quiero cotizar: ${p.name}. ${p.desc}`), '_blank', 'noopener'); return; }
  reservas.abrir({
    etapa: 'estudio',
    carrito: {
      sesiones: [{ bloqueId: `estudio-${p.block}`, modalidadId: `estudio-${mode}`, inicio: null, extras: [] }],
      productos: Object.entries(p.products).map(([pid, cantidad]) => ({ id: pid, cantidad, sesion: porSesion(pid) ? 0 : null })),
    },
  });
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const pre = t.closest<HTMLElement>('[data-preset]');
  if (pre) { abrirPaquete(pre.dataset.preset!); return; }
  const add = t.closest<HTMLElement>('[data-add]');
  if (add) {
    if (reservas) reservas.abrir({ producto: add.dataset.add });
    else window.open(waUrl(`Hola, quiero cotizar este servicio: ${nombreServicio(add.dataset.add!)}.`), '_blank', 'noopener');
    return;
  }
  if (t.closest('[data-ver-cotizacion], #qStart')) {
    e.preventDefault();
    if (reservas) reservas.abrir({ etapa: t.closest('#legalList') ? 'legal' : t.closest('#postGrid') ? 'post' : undefined });
    else window.open($('#qWa').getAttribute('href')!, '_blank', 'noopener');
  }
});
