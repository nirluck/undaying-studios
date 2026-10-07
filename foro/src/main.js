import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
// Tokens, tipografías, modal, visor y casilla de aceptación compartidos con
// el estudio; foro.css reproduce el diseño de la página actual del foro.
import '../../shared/styles/base.css';
import '../../shared/styles/components.css';
import './styles/foro.css';
import { LINKS, PRICING, REVIEWS, FAQS, YOUTUBE } from './data.js';
import CLIPS from './clips.json';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Prefijo de rutas: '/' en dev, './' en build.
const BASE = import.meta.env.BASE_URL;
const money = (n) => '$' + Math.round(n).toLocaleString('es-MX');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const src = (name, w) => `${BASE}img/${name}-${w}.webp`;
const srcset = (name) => `${src(name, 400)} 400w, ${src(name, 800)} 800w, ${src(name, 1600)} 1600w`;
const playIco = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9-5.5z" fill="currentColor"/></svg>';

/* =====================================================================
   Desplazamiento suave
   ===================================================================== */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.getAttribute('href') === '#') return;
  const el = $(a.getAttribute('href'));
  if (!el) return;
  e.preventDefault();
  closeDrawer();
  if (lenis) lenis.scrollTo(el, { offset: -($('#nav').offsetHeight + 16), duration: 1.4 });
  else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
const lockScroll = (on) => { on ? lenis?.stop() : lenis?.start(); document.body.style.overflow = on ? 'hidden' : ''; };

/* =====================================================================
   Enlaces
   ===================================================================== */
// En local el estudio corre en su propio servidor (`npm run dev`).
if (import.meta.env.DEV) $$('[data-space="estudio"]').forEach((a) => (a.href = 'http://localhost:5173/'));
const waHello = `https://wa.me/${LINKS.whatsappNumber}?text=${encodeURIComponent('Hola, quiero información para rentar el foro.')}`;
['waFloat', 'drawerWa'].forEach((id) => ($('#' + id).href = waHello));
$('#riderLink').href = BASE + LINKS.docs.manual;
['termsLink', 'termsLink2'].forEach((id) => ($('#' + id).href = BASE + LINKS.docs.terminos));
['rulesLink', 'rulesLink2'].forEach((id) => ($('#' + id).href = BASE + LINKS.docs.reglamento));
$('#privacyLink').href = LINKS.docs.privacidad;
$$('.js-privacy').forEach((a) => (a.href = LINKS.docs.privacidad));
$$('.js-terms').forEach((a) => (a.href = BASE + LINKS.docs.terminos));
$$('.js-rules').forEach((a) => (a.href = BASE + LINKS.docs.reglamento));
$('#dirLink').href = LINKS.directions;
$('#addrLink').href = LINKS.maps;
$('#mailLink').href = 'mailto:' + LINKS.email; $('#mailLink').textContent = LINKS.email;
$('#ytPlaylist').href = YOUTUBE.playlist;
$('#year').textContent = new Date().getFullYear();
$('#revCount').textContent = REVIEWS.count;

/* =====================================================================
   Menú (mismo diseño y comportamiento que el del estudio)
   ===================================================================== */
const nav = $('#nav');
const drawer = $('#drawer');
const burger = $('#burger');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
function closeDrawer() { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); burger.setAttribute('aria-expanded', 'false'); lenis?.start(); }
burger.addEventListener('click', () => {
  const open = !drawer.classList.contains('is-open');
  drawer.classList.toggle('is-open', open); drawer.setAttribute('aria-hidden', String(!open)); burger.setAttribute('aria-expanded', String(open));
  open ? lenis?.stop() : lenis?.start();
});
const navLinks = $$('.nav__links a');
$$('#caracteristicas, #amenidades, #tarifas, #ubicacion, #contacto').forEach((sec) => {
  ScrollTrigger.create({
    trigger: sec, start: 'top 40%', end: 'bottom 40%',
    onToggle: (st) => { if (st.isActive) navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + sec.id)); },
  });
});

/* =====================================================================
   Hero: video de fondo y brillo naranja que sigue al cursor
   ===================================================================== */
const heroVideo = $('#heroVideo');
if (reduced || navigator.connection?.saveData) {
  heroVideo.removeAttribute('autoplay'); heroVideo.pause();
  $$('source', heroVideo).forEach((s) => s.remove()); heroVideo.load();
}
if (!reduced && window.matchMedia('(hover: hover)').matches) {
  const glow = $('#heroGlow');
  const gx = gsap.quickTo(glow, 'x', { duration: 1.2, ease: 'power3.out' });
  const gy = gsap.quickTo(glow, 'y', { duration: 1.2, ease: 'power3.out' });
  // Se mueve en sentido contrario al cursor, como en la página actual
  window.addEventListener('mousemove', (e) => {
    gx(-(e.clientX / innerWidth - 0.5) * 60);
    gy(-(e.clientY / innerHeight - 0.5) * 40);
  }, { passive: true });
}

/* =====================================================================
   Usos: carrusel que avanza una tarjeta a la vez
   ===================================================================== */
(() => {
  const track = $('#uses');
  if (reduced) return;
  // Copia de las tarjetas para que el ciclo no se quede vacío
  track.innerHTML += track.innerHTML;
  $$('li', track).forEach((li, i) => i >= track.children.length / 2 && li.setAttribute('aria-hidden', 'true'));
  let busy = false; let paused = false;
  const step = () => {
    if (busy || paused || document.hidden) return;
    busy = true;
    const first = track.firstElementChild;
    const w = first.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 12);
    gsap.to(track, {
      x: -w, duration: 1.5, ease: 'power2.inOut',
      onComplete: () => { track.appendChild(first); gsap.set(track, { x: 0 }); busy = false; },
    });
  };
  track.addEventListener('mouseenter', () => (paused = true));
  track.addEventListener('mouseleave', () => (paused = false));
  let timer = null;
  ScrollTrigger.create({
    trigger: track, start: 'top bottom', end: 'bottom top',
    onToggle: (st) => { clearInterval(timer); if (st.isActive) timer = setInterval(step, 2500); },
  });
})();

/* =====================================================================
   Carruseles de fotos (características y amenidades)
   ===================================================================== */
$$('[data-slider]').forEach((root) => {
  const slides = $$('[data-slide]', root);
  slides.forEach((im, i) => {
    im.sizes = '(min-width: 1000px) 584px, 100vw';
    im.width = 800; im.height = 533; im.decoding = 'async';
    if (i === 0) { im.srcset = srcset(im.dataset.slide); im.src = src(im.dataset.slide, 800); im.loading = 'lazy'; im.classList.add('is-on'); }
  });
  let cur = 0; let timer = null; let hover = false;
  const load = (im) => { if (!im.src) { im.srcset = srcset(im.dataset.slide); im.src = src(im.dataset.slide, 800); } };
  const go = (d) => {
    const n = (cur + d + slides.length) % slides.length;
    load(slides[n]); load(slides[(n + 1) % slides.length]);
    const show = () => { slides[cur].classList.remove('is-on'); slides[n].classList.add('is-on'); cur = n; };
    slides[n].complete ? show() : slides[n].addEventListener('load', show, { once: true });
  };
  $('.fslider__nav--prev', root)?.addEventListener('click', () => go(-1));
  $('.fslider__nav--next', root)?.addEventListener('click', () => go(1));
  root.addEventListener('mouseenter', () => (hover = true));
  root.addEventListener('mouseleave', () => (hover = false));
  if (reduced) return;
  ScrollTrigger.create({
    trigger: root, start: 'top bottom', end: 'bottom top',
    onEnter: () => load(slides[1]),
    onToggle: (st) => { clearInterval(timer); if (st.isActive) timer = setInterval(() => !hover && go(1), 5000); },
  });
});

/* =====================================================================
   Tarifas (tarjetas de la página actual)
   ===================================================================== */
const INCLUDES = ['Foro de 72 m²', 'Ciclorama <b>Blanco</b> de 6 x 6.5 x 3.5', 'Equipo de iluminación y audio esencial', 'Zona de tramoya con altura de 3.5', 'Camerinos, sala de estar, terraza'];
$('#pricingGrid').innerHTML = PRICING.blocks.map((b) => `
  <article class="fplan" data-reveal>
    ${b.save ? `<span class="fplan__ribbon">Ahorras ${b.save}%</span>` : ''}
    <h3 class="fplan__head">${b.hours} Horas <span class="fplan__price"><span data-price>/ ${money(b.price)}</span><small>mxn</small></span></h3>
    <p class="fplan__inc">Incluye:</p>
    <ul class="fplan__list">${INCLUDES.map((x) => `<li>${x}</li>`).join('')}</ul>
    ${b.color ? `
    <label class="fcheck">
      <input type="checkbox" data-color />
      <span class="fcheck__box" aria-hidden="true"></span>
      Personalizar Color de Ciclorama + ${money(b.color.extra)} M.N.
    </label>` : ''}
    <button class="fbtn fbtn--lg fplan__btn" type="button" data-book="${b.id}">Seleccionar</button>
  </article>`).join('');
// La casilla de color cambia el precio y el calendario, como en el sitio actual
$$('[data-color]').forEach((box) => {
  const card = box.closest('.fplan');
  const b = PRICING.blocks.find((x) => x.color);
  box.addEventListener('change', () => {
    $('[data-price]', card).textContent = `/ ${money(b.price + (box.checked ? b.color.extra : 0))}`;
    $('[data-book]', card).dataset.book = box.checked ? b.color.id : b.id;
  });
});

/* =====================================================================
   Visor de fotos y videos
   ===================================================================== */
const lightbox = (() => {
  const root = $('#lightbox'); const stage = $('#lbStage'); const cap = $('#lbCaption');
  let items = []; let i = 0; let lastFocus = null;
  const render = () => {
    const it = items[i];
    stage.innerHTML = it.type === 'yt'
      ? `<div class="lightbox__video"><iframe src="https://www.youtube-nocookie.com/embed/${it.id}?autoplay=1&rel=0" title="${esc(it.caption)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`
      : `<img src="${src(it.id, 1600)}" alt="${esc(it.caption)}" />`;
    cap.textContent = items.length > 1 ? `${it.caption} · ${i + 1} / ${items.length}` : it.caption;
    root.classList.toggle('is-single', items.length < 2);
  };
  const open = (list, index = 0) => {
    items = list; i = index; lastFocus = document.activeElement;
    root.hidden = false; lockScroll(true); render();
    if (!reduced) gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    $('.lightbox__close', root).focus();
  };
  const close = () => { root.hidden = true; stage.innerHTML = ''; lockScroll(false); lastFocus?.focus?.(); };
  const go = (d) => { if (items.length < 2) return; i = (i + d + items.length) % items.length; render(); };
  $('#lbPrev').addEventListener('click', () => go(-1));
  $('#lbNext').addEventListener('click', () => go(1));
  root.addEventListener('click', (e) => { if (e.target.closest('[data-lb-close]')) close(); });
  document.addEventListener('keydown', (e) => {
    if (root.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  });
  return { open, isOpen: () => !root.hidden };
})();

/* =====================================================================
   Galería "Conoce nuestro foro" (las 9 fotos de la página actual)
   ===================================================================== */
const GALLERY = [
  ['croma-portatil', 'Fondo verde portátil con iluminación en el foro'],
  ['ciclorama-02', 'Ciclorama blanco del foro'],
  ['fondo-negro', 'Zona de fondo negro del foro'],
  ['croma-verde', 'Ciclorama pintado de verde croma'],
  ['ciclorama-03', 'Ciclorama blanco con iluminación del foro'],
  ['montaje', 'Montaje de cámara y audio en el ciclorama'],
  ['podcast', 'Sesión de podcast realizada en el foro'],
  ['entrevista', 'Entrevista grabada en el foro'],
  ['croma-azul', 'Ciclorama pintado de azul croma'],
];
$('#gallery').innerHTML = GALLERY.map(([id, alt], i) => `
  <button class="fgallery__item" type="button" data-g="${i}" data-reveal aria-label="Ver foto: ${esc(alt)}">
    <img src="${src(id, 800)}" srcset="${srcset(id)}" sizes="(min-width: 1000px) 376px, (min-width: 600px) 50vw, 100vw" alt="${esc(alt)}" width="800" height="600" loading="lazy" decoding="async" />
  </button>`).join('');
$('#gallery').addEventListener('click', (e) => {
  const b = e.target.closest('.fgallery__item'); if (!b) return;
  lightbox.open(GALLERY.map(([id, caption]) => ({ id, caption })), +b.dataset.g);
});

/* =====================================================================
   Producciones: videoclips grabados en el foro (copia local de la playlist)
   ===================================================================== */
(() => {
  const el = $('#clips');
  const list = CLIPS.items.slice(0, YOUTUBE.max);
  el.innerHTML = list.map((c, i) => `
    <button class="fclip" type="button" data-clip="${i}" aria-label="Ver ${esc(c.title)}">
      <span class="fclip__media">
        <img src="https://i.ytimg.com/vi/${c.yt}/hqdefault.jpg" alt="" loading="lazy" decoding="async" width="480" height="360" />
        <span class="fclip__play" aria-hidden="true">${playIco}</span>
      </span>
      <span class="fclip__title">${esc(c.title)}</span>
      ${c.artist ? `<span class="fclip__artist">${esc(c.artist)}</span>` : ''}
    </button>`).join('');
  const step = () => { const c = $('.fclip', el); return c ? c.getBoundingClientRect().width + 20 : 300; };
  const upd = () => { $('#clipsPrev').disabled = el.scrollLeft < 8; $('#clipsNext').disabled = el.scrollLeft + el.clientWidth > el.scrollWidth - 8; };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.fclip'); if (!b) return;
    lightbox.open(list.map((c) => ({ type: 'yt', id: c.yt, caption: [c.title, c.artist].filter(Boolean).join(' · ') })), +b.dataset.clip);
  });
  $('#clipsPrev').addEventListener('click', () => el.scrollBy({ left: -step() * 2, behavior: 'smooth' }));
  $('#clipsNext').addEventListener('click', () => el.scrollBy({ left: step() * 2, behavior: 'smooth' }));
  el.addEventListener('scroll', upd, { passive: true });
  window.addEventListener('resize', upd); upd();
})();

/* =====================================================================
   Reseñas de Google
   ===================================================================== */
(() => {
  const el = $('#reviews');
  const g = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z"/></svg>';
  el.innerHTML = REVIEWS.items.map((t) => `
    <article class="frev">
      <header class="frev__who">
        <span class="frev__avatar" aria-hidden="true">${esc(t.name.trim()[0])}</span>
        <b>${esc(t.name)}</b>${g}
      </header>
      <p class="frev__stars" aria-label="5 estrellas">★★★★★</p>
      <p class="frev__text">${esc(t.text)}</p>
      <button class="frev__more" type="button">Leer más</button>
    </article>`).join('');
  // "Leer más" solo aparece si el texto no cabe
  const fit = () => $$('.frev', el).forEach((c) => { const p = $('.frev__text', c); c.classList.toggle('is-long', c.classList.contains('is-open') || p.scrollHeight > p.clientHeight + 2); });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.frev__more'); if (!b) return;
    const c = b.closest('.frev'); const open = c.classList.toggle('is-open');
    b.textContent = open ? 'Leer menos' : 'Leer más';
  });
  const card = () => { const c = $('.frev', el); return c ? c.getBoundingClientRect().width + 16 : 300; };
  const atEnd = () => el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
  const upd = () => { $('#revPrev').disabled = el.scrollLeft < 8; $('#revNext').disabled = atEnd(); };
  $('#revPrev').addEventListener('click', () => el.scrollBy({ left: -card(), behavior: 'smooth' }));
  $('#revNext').addEventListener('click', () => el.scrollBy({ left: card(), behavior: 'smooth' }));
  el.addEventListener('scroll', upd, { passive: true });
  window.addEventListener('resize', () => { upd(); fit(); });
  document.fonts?.ready.then(fit); fit(); upd();
})();

/* =====================================================================
   Preguntas frecuentes
   ===================================================================== */
$('#faqList').innerHTML = FAQS.map((f, i) => `
  <div class="ffaq__item" data-reveal>
    <button class="ffaq__q" type="button" aria-expanded="false" aria-controls="faq-${i}">${f.q}<span class="ffaq__ico" aria-hidden="true"></span></button>
    <div class="ffaq__a" id="faq-${i}"><p>${f.a}</p></div>
  </div>`).join('');
$('#faqList').addEventListener('click', (e) => {
  const q = e.target.closest('.ffaq__q'); if (!q) return;
  const item = q.parentElement; const a = $('.ffaq__a', item); const open = !item.classList.contains('is-open');
  item.classList.toggle('is-open', open); q.setAttribute('aria-expanded', String(open));
  a.style.height = a.scrollHeight + 'px';
  if (open) a.addEventListener('transitionend', () => { if (item.classList.contains('is-open')) a.style.height = 'auto'; }, { once: true });
  else requestAnimationFrame(() => (a.style.height = '0px'));
  ScrollTrigger.refresh();
});

/* =====================================================================
   Reservas (calendarios de Prospex del sitio actual)
   ===================================================================== */
const modal = $('#modal');
let scriptLoaded = false; let accepted = false; let pending = null;
const TITLES = { '3h': 'Reserva el foro por 3 horas', '6h': 'Reserva el foro por 6 horas', '12h': 'Reserva el foro por 12 horas', '12h-color': 'Reserva el foro por 12 horas con color de ciclorama', scouting: 'Agenda tu visita al foro' };
function loadCalendar(id) {
  // allow="payment" deja que el widget de Prospex cobre dentro del iframe.
  $('#modalBody').innerHTML = `<iframe src="${LINKS.booking[id]}" title="Calendario de reservas del foro" allow="payment" scrolling="no" id="prospex-foro-${id}-${Date.now()}"></iframe>`;
  if (!scriptLoaded) { const s = document.createElement('script'); s.src = LINKS.bookingScript; s.async = true; document.body.appendChild(s); scriptLoaded = true; }
  $('#modalConsent').hidden = true;
}
// Antes de pagar se aceptan el aviso de privacidad, los términos y el reglamento
function openBooking(id) {
  pending = id;
  $('#modalTitle').textContent = TITLES[id];
  $('#modalBody').innerHTML = '';
  $('#modalAccept').checked = accepted;
  $('#modalGo').disabled = !accepted;
  if (accepted) loadCalendar(id); else $('#modalConsent').hidden = false;
  modal.hidden = false; lockScroll(true);
  if (!reduced) gsap.fromTo('.modal__panel', { y: 30, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
  $('.modal__close').focus();
}
$('#modalAccept').addEventListener('change', (e) => ($('#modalGo').disabled = !e.target.checked));
$('#modalGo').addEventListener('click', () => { accepted = true; loadCalendar(pending); });
function closeBooking() { modal.hidden = true; $('#modalBody').innerHTML = ''; lockScroll(false); }
document.addEventListener('click', (e) => { const b = e.target.closest('[data-book]'); if (b) openBooking(b.dataset.book); if (e.target.closest('[data-close]')) closeBooking(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lightbox.isOpen()) { if (!modal.hidden) closeBooking(); closeDrawer(); } });

/* =====================================================================
   Animaciones de entrada (equivalentes a los fadeInUp de la página actual)
   ===================================================================== */
if (reduced) $$('[data-reveal]').forEach((el) => el.removeAttribute('data-reveal'));
else {
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.nav', { y: -16, opacity: 0, duration: 0.9 }, 0)
    .from('.fhero__frame', { scale: 0.97, opacity: 0, duration: 1.2 }, 0.1)
    .from('.fhero__content > *', { y: 28, opacity: 0, duration: 1, stagger: 0.12 }, 0.45)
    .from('.fuses', { opacity: 0, y: 20, duration: 1 }, 0.9);
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%', once: true,
    onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: 'power3.out', overwrite: true }),
  });
}
window.addEventListener('load', () => ScrollTrigger.refresh());
