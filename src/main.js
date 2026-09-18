import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {
  LINKS, HERO, PRICING, ROOMS, GEAR, FEATURED, CLIPS, TRACKS, CLIENTS, REVIEWS, FAQS, AUDIENCES, HOURS, ADDRESS,
} from './data.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Prefijo de rutas: '/' en dev, './' en build (permite subcarpeta o subdominio).
const BASE = import.meta.env.BASE_URL;
const money = (n) => '$' + Math.round(n).toLocaleString('es-MX');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const src = (name, w) => `${BASE}img/${name}-${w}.webp`;
const img = (name, alt = '', sizes = '(min-width: 900px) 50vw, 100vw', eager = false) =>
  `<img src="${src(name, 800)}" srcset="${src(name, 800)} 800w, ${src(name, 1600)} 1600w" sizes="${sizes}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
const ytThumb = (id) => `${BASE}portfolio/${id}.webp`;
const check = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const playIco = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9-5.5z" fill="currentColor"/></svg>';

/* =====================================================================
   Lenis + GSAP
   ===================================================================== */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollTo = (target, offset = -(72 + 16)) => {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.4 });
  else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.getAttribute('href') === '#') return;
  const id = a.getAttribute('href');
  if (!$(id)) return;
  e.preventDefault();
  closeDrawer();
  scrollTo(id);
  history.replaceState(null, '', id);
});
const lockScroll = (on) => { on ? lenis?.stop() : lenis?.start(); document.body.style.overflow = on ? 'hidden' : ''; };

/* =====================================================================
   Links y contenido estático
   ===================================================================== */
const waUrl = (text = '') => {
  if (LINKS.whatsappNumber) return `https://wa.me/${LINKS.whatsappNumber}${text ? '?text=' + encodeURIComponent(text) : ''}`;
  return LINKS.whatsappShort;
};
const waHello = waUrl('Hola, quiero información del estudio de grabación.');
['waFloat', 'drawerWa', 'scoutWa', 'faqWa'].forEach((id) => { const el = $('#' + id); if (el) el.href = waHello; });
$('#gearWa').href = waUrl('Hola, quiero saber si tienen este equipo para mi sesión: ');
$('#customWa').href = waUrl('Hola, quiero cotizar producción, mezcla o master para mi proyecto.');
$('#waLink').href = waHello; $('#waLink').textContent = LINKS.whatsappDisplay;
$('#addr').textContent = ADDRESS;
$('#hours').textContent = HOURS;
$('#dirLink').href = LINKS.directions;
$('#mailLink').href = 'mailto:' + LINKS.email; $('#mailLink').textContent = LINKS.email;
$('#foroLink').href = LINKS.foro;
$('#privacyLink').href = LINKS.legal.privacidad;
['termsLink', 'termsLink2'].forEach((id) => ($('#' + id).href = LINKS.legal.terminos));
$('#ytPlaylist').href = LINKS.youtubePlaylist;
$('#year').textContent = new Date().getFullYear();
$('#qBaseHour').textContent = money(PRICING.baseHour);
$('#revScore').textContent = REVIEWS.score;
$('#revCount').textContent = `${REVIEWS.count} reseñas en Google`;
document.documentElement.style.setProperty('--reviews-bg', `url(${new URL(src('live-10', 1600), document.baseURI).href})`);

const socialIcons = {
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3h3c.2 2.2 1.6 3.8 4 4v3c-1.5 0-2.9-.5-4-1.3V15a5.5 5.5 0 1 1-5.5-5.5h.5v3h-.5a2.5 2.5 0 1 0 2.5 2.5z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 8.2s-.2-1.6-.9-2.3c-.8-.9-1.8-.9-2.2-1C15.8 4.7 12 4.7 12 4.7s-3.8 0-6.9.2c-.4.1-1.4.1-2.2 1C2.2 6.6 2 8.2 2 8.2S1.8 10 1.8 11.9v1.7c0 1.8.2 3.7.2 3.7s.2 1.6.9 2.3c.8.9 1.9.8 2.4.9 1.8.2 6.7.2 6.7.2s3.8 0 6.9-.2c.4-.1 1.4-.1 2.2-1 .7-.7.9-2.3.9-2.3s.2-1.8.2-3.7v-1.7C22.2 10 22 8.2 22 8.2zM10 15V9l5.5 3z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.7-4.5 4.5V11H7v4h2.5v7h4v-7h3l.5-4h-3.5V9c0-.6.4-1 1-1z"/></svg>',
};
$('#social').innerHTML = Object.entries(LINKS.social).map(([k, v]) => `<a href="${v}" target="_blank" rel="noopener" aria-label="${k}">${socialIcons[k]}</a>`).join('');

/* =====================================================================
   Hero: video editado si existe, si no la foto real con zoom lento
   ===================================================================== */
const heroMedia = $('#heroMedia');
if (HERO.video) {
  heroMedia.innerHTML = `<video class="hero__video" autoplay muted loop playsinline poster="${src(HERO.image, 1600)}" preload="metadata"><source src="${BASE}${HERO.video}" type="video/mp4" /></video>`;
} else {
  // Slideshow con disolución: la primera foto carga de inmediato y las demás
  // se descargan hasta que la página terminó de cargar.
  const slides = HERO.slides?.length ? HERO.slides : [HERO.image];
  heroMedia.innerHTML = slides.map((name, i) => `<img class="hero__slide ${i === 0 ? 'is-on' : ''}" ${i === 0 ? `src="${src(name, 1600)}" fetchpriority="high"` : `data-src="${src(name, 1600)}"`} alt="" decoding="async" />`).join('');
  const imgs = $$('.hero__slide', heroMedia);
  if (imgs.length > 1 && !reduced) {
    let cur = 0;
    const load = () => imgs.forEach((im) => { if (im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; } });
    window.addEventListener('load', () => setTimeout(load, 600), { once: true });
    const next = () => {
      const n = (cur + 1) % imgs.length;
      if (!imgs[n].complete || !imgs[n].naturalWidth) { load(); return; } // espera a que exista la siguiente
      imgs[cur].classList.remove('is-on'); imgs[n].classList.add('is-on'); cur = n;
    };
    let timer = setInterval(next, (HERO.slideSeconds || 6) * 1000);
    document.addEventListener('visibilitychange', () => { clearInterval(timer); if (!document.hidden) timer = setInterval(next, (HERO.slideSeconds || 6) * 1000); });
  }
}

/* =====================================================================
   Nav
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
$$('main section[id]').forEach((sec) => {
  ScrollTrigger.create({
    trigger: sec, start: 'top 40%', end: 'bottom 40%',
    onToggle: (st) => { if (st.isActive) navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + sec.id)); },
  });
});

/* =====================================================================
   Clientes: cinta de logotipos en loop
   ===================================================================== */
// El tercer valor es la altura óptica en px para que todos los logos pesen parecido.
const logos = CLIENTS.map(([file, name, h]) => `<li><img src="${BASE}clients/${file}.png" alt="${esc(name)}" style="--h:${h}px" loading="lazy" decoding="async" /></li>`).join('');
$('#clients').innerHTML = `<ul class="clients__row">${logos}</ul><ul class="clients__row" aria-hidden="true">${logos}</ul>`;

/* =====================================================================
   Audiences
   ===================================================================== */
$('#audiences').innerHTML = AUDIENCES.map((a, i) => `
  <button class="aud" type="button" data-profile="${a.id}" data-reveal>
    ${img(a.img, a.name + ' en Undying Studios', '(min-width: 900px) 25vw, 50vw')}
    <h3>${a.name}</h3>
    <p>${a.desc}</p>
    <span class="cta">Ver tarifas →</span>
  </button>`).join('');
$('#audiences').addEventListener('click', (e) => {
  const b = e.target.closest('.aud'); if (!b) return;
  // El cotizador está oculto mientras se itera; cuando vuelva, esta línea
  // puede preseleccionar el perfil: quoter.setProfile(b.dataset.profile)
  scrollTo('#tarifas');
});

/* =====================================================================
   Lightbox (galerías de fotos y videos de YouTube)
   ===================================================================== */
const lightbox = (() => {
  const root = $('#lightbox'); const stage = $('#lbStage'); const cap = $('#lbCaption');
  let items = []; let i = 0; let lastFocus = null;
  const render = () => {
    const it = items[i];
    if (it.type === 'yt') {
      const start = it.start ? `&start=${it.start}` : '';
      stage.innerHTML = `<div class="lightbox__video"><iframe src="https://www.youtube-nocookie.com/embed/${it.id}?autoplay=1&rel=0${start}" title="${esc(it.caption)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
    } else {
      stage.innerHTML = `<img src="${src(it.id, 1600)}" alt="${esc(it.caption)}" />`;
      if (!reduced) gsap.fromTo(stage.firstElementChild, { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'power2.out' });
    }
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
  let x0 = null;
  stage.addEventListener('touchstart', (e) => (x0 = e.touches[0].clientX), { passive: true });
  stage.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); x0 = null; });
  return { open, isOpen: () => !root.hidden };
})();

/* =====================================================================
   Salas: pestañas + galería por sala
   ===================================================================== */
$('#roomTabs').innerHTML = ROOMS.map((r, i) => `
  <button class="rtab" role="tab" id="rtab-${r.id}" aria-selected="${i === 0}" aria-controls="room-${r.id}" type="button">
    <span class="rtab__name">${r.name}<span class="rtab__tag">${r.tag}</span></span>
    <span class="rtab__area">${r.gallery.length} fotos</span>
  </button>`).join('');
const amenIco = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const roomInfo = (r) => r.amenities
  ? `<ul class="room__amen">${r.amenities.map((a) => `<li>${amenIco}${a}</li>`).join('')}</ul>`
  : `<div class="room__specs">${r.facts.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>
      <ul class="room__bullets">${r.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`;
$('#roomStage').innerHTML = ROOMS.map((r, i) => `
  <article class="room ${i === 0 ? 'is-on' : ''}" id="room-${r.id}" role="tabpanel" aria-labelledby="rtab-${r.id}" data-room="${r.id}">
    <div class="room__media">
      <button class="room__main" type="button" aria-label="Ver fotos de ${esc(r.name)} en grande" data-index="0">
        ${img(r.gallery[0], r.name, '(min-width: 960px) 60vw, 100vw', i === 0)}
        <span class="room__zoom" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M6.5 11a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zM10 10l4 4M6.5 4.5v4M4.5 6.5h4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>
      </button>
      <span class="room__badge">${r.tag}</span>
    </div>
    <div class="room__thumbs" role="list">
      ${r.gallery.map((g, k) => `<button class="room__thumb ${k === 0 ? 'is-on' : ''}" type="button" data-index="${k}" aria-label="Foto ${k + 1} de ${esc(r.name)}" role="listitem"><img src="${src(g, 800)}" alt="" loading="lazy" decoding="async" /></button>`).join('')}
    </div>
    <div class="room__info">
      <h3 class="room__title">${r.name}</h3>
      <p class="room__desc">${r.desc}</p>
      ${roomInfo(r)}
    </div>
  </article>`).join('');

function setRoomPhoto(article, k) {
  const room = ROOMS.find((r) => r.id === article.dataset.room);
  const main = $('.room__main', article); const im = $('img', main);
  main.dataset.index = k;
  $$('.room__thumb', article).forEach((t, n) => t.classList.toggle('is-on', n === k));
  const swap = () => { im.src = src(room.gallery[k], 800); im.srcset = `${src(room.gallery[k], 800)} 800w, ${src(room.gallery[k], 1600)} 1600w`; };
  if (reduced) return swap();
  gsap.to(im, { opacity: 0, duration: 0.2, onComplete: () => { swap(); im.decode?.().catch(() => {}).finally(() => gsap.to(im, { opacity: 1, duration: 0.45 })); } });
}
$('#roomStage').addEventListener('click', (e) => {
  const article = e.target.closest('.room'); if (!article) return;
  const room = ROOMS.find((r) => r.id === article.dataset.room);
  const thumb = e.target.closest('.room__thumb');
  if (thumb) return setRoomPhoto(article, +thumb.dataset.index);
  const main = e.target.closest('.room__main');
  if (main) lightbox.open(room.gallery.map((g) => ({ type: 'img', id: g, caption: room.name })), +main.dataset.index);
});
$('#roomTabs').addEventListener('click', (e) => {
  const t = e.target.closest('.rtab'); if (!t) return;
  $$('.rtab').forEach((b) => b.setAttribute('aria-selected', String(b === t)));
  const panel = $('#' + t.getAttribute('aria-controls'));
  $$('.room').forEach((r) => r.classList.remove('is-on'));
  panel.classList.add('is-on');
  if (!reduced) gsap.fromTo(panel.children, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.07, ease: 'power3.out', clearProps: 'all' });
  ScrollTrigger.refresh();
});

/* =====================================================================
   Equipo: catálogo con fotos
   ===================================================================== */
const noImg = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M17 27c2 3 5 4.5 7 4.5s5-1.5 7-4.5M18 20h.01M30 20h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
$('#gearTabs').innerHTML = GEAR.map((g, i) => `<button class="gtab" role="tab" aria-selected="${i === 0}" data-gear="${g.id}" type="button">${g.name}</button>`).join('');
function renderGear(id, animate = true) {
  const g = GEAR.find((x) => x.id === id);
  $('#gearIntro').textContent = g.intro;
  $('#gearGrid').innerHTML = g.items.map((it) => `
    <article class="gcard">
      <div class="gcard__img ${it.img ? '' : 'is-empty'}">
        ${it.img ? `<img src="${BASE}gear/${it.img}.webp" alt="${esc(it.name)}" loading="lazy" decoding="async" width="520" height="520" />` : noImg}
        ${it.qty > 1 ? `<span class="gcard__qty">×${it.qty}</span>` : ''}
      </div>
      <div class="gcard__meta"><b>${it.name}</b><span>${it.kind}</span></div>
    </article>`).join('');
  if (animate && !reduced) gsap.fromTo('#gearGrid .gcard', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.04, ease: 'power3.out', clearProps: 'all' });
  ScrollTrigger.refresh();
}
renderGear(GEAR[0].id, false);
$('#gearTabs').addEventListener('click', (e) => {
  const t = e.target.closest('.gtab'); if (!t) return;
  $$('.gtab').forEach((b) => b.setAttribute('aria-selected', String(b === t)));
  renderGear(t.dataset.gear);
});

/* =====================================================================
   Portafolio
   ===================================================================== */
$('#featured').innerHTML = FEATURED.map((w, i) => `
  <button class="wcard ${i === 0 ? 'wcard--lead' : ''}" type="button" data-work="${i}" data-reveal aria-label="Ver ${esc(w.title)}, ${esc(w.client)}">
    <span class="wcard__media">
      <img src="${ytThumb(w.yt)}" alt="" loading="lazy" decoding="async" />
      <span class="wcard__play" aria-hidden="true">${playIco}</span>
    </span>
    <span class="wcard__body">
      <span class="wcard__cat">${w.category}</span>
      <span class="wcard__title">${w.title}</span>
      <span class="wcard__client">${w.client}</span>
      <span class="wcard__desc">${w.desc}</span>
    </span>
  </button>`).join('');
$('#featured').addEventListener('click', (e) => {
  const b = e.target.closest('.wcard'); if (!b) return;
  const w = FEATURED[+b.dataset.work];
  lightbox.open([{ type: 'yt', id: w.yt, start: w.start, caption: `${w.title} · ${w.client}` }]);
});

$('#clips').innerHTML = CLIPS.map((c, i) => `
  <button class="clip" type="button" data-clip="${i}" aria-label="Ver ${esc(c.title)} de ${esc(c.artist)}">
    <span class="clip__media">
      <img src="${ytThumb(c.yt)}" alt="" loading="lazy" decoding="async" />
      <span class="wcard__play" aria-hidden="true">${playIco}</span>
      ${c.tag ? `<span class="clip__tag">${c.tag}</span>` : ''}
    </span>
    <span class="clip__title">${c.title}</span>
    <span class="clip__artist">${c.artist}</span>
  </button>`).join('');
$('#clips').addEventListener('click', (e) => {
  const b = e.target.closest('.clip'); if (!b) return;
  lightbox.open(CLIPS.map((c) => ({ type: 'yt', id: c.yt, caption: `${c.title} · ${c.artist}` })), +b.dataset.clip);
});
const clipsEl = $('#clips');
const clipStep = () => { const c = $('.clip', clipsEl); return c ? c.getBoundingClientRect().width + 16 : 300; };
const updateArrows = () => {
  $('#clipsPrev').disabled = clipsEl.scrollLeft < 8;
  $('#clipsNext').disabled = clipsEl.scrollLeft + clipsEl.clientWidth > clipsEl.scrollWidth - 8;
};
$('#clipsPrev').addEventListener('click', () => clipsEl.scrollBy({ left: -clipStep() * 2, behavior: 'smooth' }));
$('#clipsNext').addEventListener('click', () => clipsEl.scrollBy({ left: clipStep() * 2, behavior: 'smooth' }));
clipsEl.addEventListener('scroll', updateArrows, { passive: true });
window.addEventListener('resize', updateArrows);
updateArrows();

$('#spotifyLink').href = LINKS.spotifyPlaylist;

/* =====================================================================
   Reproductor de audio (recuperado de la v1)
   Lista de pistas + barra fija que sigue sonando mientras navegas.
   ===================================================================== */
const player = (() => {
  const root = $('#player'); const audio = $('#audio'); const wave = $('#pWave'); const ctx2d = wave.getContext('2d');
  let index = -1; let actx = null; let analyser = null; let data = null; let raf = null;
  const fmt = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

  $('#tracks').innerHTML = TRACKS.map((t, i) => `
    <li class="track" data-i="${i}" data-reveal>
      <button class="track__play" type="button" aria-label="Reproducir ${esc(t.title)}">
        <svg class="ico-play" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9-5.5z" fill="currentColor"/></svg>
        <svg class="ico-pause" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 2h3v10H3zM8 2h3v10H8z" fill="currentColor"/></svg>
      </button>
      <div class="track__cover"><img src="${src(t.cover, 800)}" alt="" loading="lazy" decoding="async" /></div>
      <div class="track__meta"><b>${t.title}</b><span>${t.artist}</span><span><i>${t.genre}</i></span></div>
      <p class="track__note">${t.note}</p>
      <div class="track__chain">${t.chain.map((c) => `<span>${c}</span>`).join('')}</div>
      <div class="track__eq" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    </li>`).join('');

  const setupAnalyser = () => {
    if (actx || reduced) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      const node = actx.createMediaElementSource(audio);
      analyser = actx.createAnalyser(); analyser.fftSize = 128; analyser.smoothingTimeConstant = 0.82;
      node.connect(analyser); analyser.connect(actx.destination);
      data = new Uint8Array(analyser.frequencyBinCount);
    } catch { actx = null; }
  };
  const draw = () => {
    const w = wave.width, h = wave.height; ctx2d.clearRect(0, 0, w, h);
    const bars = 48; const gap = 3; const bw = (w - gap * (bars - 1)) / bars;
    if (analyser && data) analyser.getByteFrequencyData(data);
    for (let i = 0; i < bars; i++) {
      const v = analyser && data ? data[Math.floor((i / bars) * data.length * 0.7)] / 255 : 0.25 + 0.2 * Math.abs(Math.sin(i * 0.6 + performance.now() / 400));
      const bh = Math.max(3, v * h);
      ctx2d.fillStyle = i / bars < audio.currentTime / (audio.duration || 1) ? '#eb9050' : 'rgba(228,210,208,0.28)';
      ctx2d.beginPath(); ctx2d.roundRect(i * (bw + gap), (h - bh) / 2, bw, bh, 2); ctx2d.fill();
    }
    raf = requestAnimationFrame(draw);
  };
  const sync = () => {
    $$('.track').forEach((li, i) => { li.classList.toggle('is-current', i === index); li.classList.toggle('is-playing', i === index && !audio.paused); });
    root.classList.toggle('is-playing', !audio.paused);
  };
  const load = (i) => {
    index = (i + TRACKS.length) % TRACKS.length; const t = TRACKS[index];
    audio.src = BASE + t.src; $('#pTitle').textContent = t.title; $('#pArtist').textContent = `${t.artist} · ${t.genre}`;
    root.hidden = false; requestAnimationFrame(() => root.classList.add('is-visible')); document.body.classList.add('has-player');
  };
  const play = async (i) => {
    if (i !== undefined && i !== index) load(i);
    if (index < 0) load(0);
    setupAnalyser(); if (actx?.state === 'suspended') actx.resume();
    try { await audio.play(); } catch {}
    sync(); if (!raf) draw();
  };
  const toggle = () => (audio.paused ? play() : (audio.pause(), sync()));
  audio.addEventListener('timeupdate', () => { $('#pCur').textContent = fmt(audio.currentTime); $('#pProg').style.width = `${(audio.currentTime / (audio.duration || 1)) * 100}%`; });
  audio.addEventListener('loadedmetadata', () => ($('#pDur').textContent = fmt(audio.duration)));
  audio.addEventListener('ended', () => play(index + 1));
  audio.addEventListener('pause', sync); audio.addEventListener('play', sync);
  $('#pPlay').addEventListener('click', toggle);
  $('#pPrev').addEventListener('click', () => play(index - 1));
  $('#pNext').addEventListener('click', () => play(index + 1));
  $('#pClose').addEventListener('click', () => {
    audio.pause(); root.classList.remove('is-visible'); document.body.classList.remove('has-player');
    cancelAnimationFrame(raf); raf = null; setTimeout(() => (root.hidden = true), 600); sync();
  });
  $('#pBar').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); audio.currentTime = ((e.clientX - r.left) / r.width) * (audio.duration || 0); });
  $('#tracks').addEventListener('click', (e) => { const li = e.target.closest('.track'); if (!li) return; const i = +li.dataset.i; i === index ? toggle() : play(i); });
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || root.hidden || lightbox.isOpen()) return;
    if (['INPUT', 'BUTTON', 'TEXTAREA', 'A', 'SELECT'].includes(document.activeElement.tagName)) return;
    e.preventDefault(); toggle();
  });
  return { play, toggle };
})();

/* =====================================================================
   Tarifas
   ===================================================================== */
$('#pricingGrid').innerHTML = PRICING.blocks.map((b) => {
  const regular = PRICING.baseHour * b.hours;
  return `
  <article class="plan ${b.hot ? 'plan--hot' : ''}" data-reveal>
    ${b.save ? `<span class="plan__badge ${b.hot ? '' : 'plan__badge--alt'}">Ahorra ${b.save}%</span>` : ''}
    <div class="plan__head"><b>${b.hours}<small>horas</small></b><span>${b.tagline}</span></div>
    <p class="plan__price"><span>${money(b.price)}</span><small>MXN</small></p>
    <p class="plan__per">${b.save ? `<s>${money(regular)}</s> · ` : ''}${money(b.price / b.hours)} por hora</p>
    <ul class="plan__perks">${b.perks.map((p) => `<li>${check}${p}</li>`).join('')}</ul>
    <button class="btn btn--primary btn--block" type="button" data-book="${b.id}">Reservar ${b.hours} horas</button>
  </article>`;
}).join('');

/* =====================================================================
   Cotizador
   ===================================================================== */
const quoter = (() => {
  const state = { profile: null, block: '4h', extraHours: 0, services: new Set() };
  const profiles = $('#qProfiles'); const blocks = $('#qBlocks'); const extras = $('#qExtras');
  profiles.innerHTML = PRICING.profiles.map((p) => `<button class="qopt" type="button" data-id="${p.id}" aria-pressed="false"><b>${p.name}</b><span>${p.desc}</span></button>`).join('');
  blocks.innerHTML = PRICING.blocks.map((b) => `<button class="qblock" type="button" data-id="${b.id}" aria-pressed="${b.id === state.block}"><b>${b.hours}h</b><span>${money(b.price)}${b.save ? ` · −${b.save}%` : ''}</span></button>`).join('');
  const renderServices = () => {
    const sug = PRICING.profiles.find((p) => p.id === state.profile)?.suggest || [];
    extras.innerHTML = PRICING.services.map((x) => `<button class="qextra" type="button" data-id="${x.id}" aria-pressed="${state.services.has(x.id)}">${sug.includes(x.id) ? '<span class="sug">Sugerido</span>' : ''}<b>${x.name}</b><em>Por cotizar</em><span>${x.desc}</span></button>`).join('');
  };
  renderServices();
  const calc = () => {
    const b = PRICING.blocks.find((x) => x.id === state.block);
    const lines = [{ label: `Grabación · ${b.hours} horas`, amount: b.price }];
    if (state.extraHours) lines.push({ label: `${state.extraHours} h extra`, amount: state.extraHours * PRICING.baseHour });
    state.services.forEach((id) => lines.push({ label: PRICING.services.find((s) => s.id === id).name, amount: null }));
    return { lines, total: lines.reduce((s, l) => s + (l.amount || 0), 0), hours: b.hours + state.extraHours };
  };
  let shown = 0;
  const render = () => {
    const { lines, total, hours } = calc();
    $$('.qopt', profiles).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === state.profile)));
    $$('.qblock', blocks).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === state.block)));
    $('#qExtraHours').value = state.extraHours;
    $$('.qextra', extras).forEach((b) => b.setAttribute('aria-pressed', String(state.services.has(b.dataset.id))));
    $('#qLines').innerHTML = lines.map((l) => `<li><span>${l.label}</span><b class="${l.amount === null ? 'is-tbd' : ''}">${l.amount === null ? 'Por cotizar' : money(l.amount)}</b></li>`).join('');
    const p = PRICING.profiles.find((x) => x.id === state.profile);
    const rec = p && PRICING.blocks.find((b) => b.id === p.block);
    $('#qHint').textContent = p ? `Para ${p.name.toLowerCase()} normalmente alcanza con ${rec.hours} horas.` : 'Elige qué vas a grabar para empezar.';
    const num = $('#qTotal');
    if (reduced) num.textContent = money(total);
    else { const o = { v: shown }; gsap.to(o, { v: total, duration: 0.6, ease: 'power2.out', onUpdate: () => (num.textContent = money(o.v)) }); }
    shown = total;
    const summary = `Hola, hice una cotización en la página del estudio:\n${lines.map((l) => `• ${l.label}: ${l.amount === null ? 'por cotizar' : money(l.amount)}`).join('\n')}\nTotal de grabación: ${money(total)} MXN${p ? `\nProyecto: ${p.name}` : ''}\n¿Qué fechas tienen disponibles?`;
    $('#qWa').href = waUrl(summary); $('#qWa').dataset.summary = summary;
    $('#qBook').textContent = `Reservar ${hours} horas`;
  };
  profiles.addEventListener('click', (e) => { const b = e.target.closest('.qopt'); if (b) api.setProfile(b.dataset.id); });
  blocks.addEventListener('click', (e) => { const b = e.target.closest('.qblock'); if (b) { state.block = b.dataset.id; render(); } });
  extras.addEventListener('click', (e) => { const b = e.target.closest('.qextra'); if (!b) return; state.services.has(b.dataset.id) ? state.services.delete(b.dataset.id) : state.services.add(b.dataset.id); render(); });
  $$('[data-extra]').forEach((b) => b.addEventListener('click', () => { state.extraHours = Math.min(12, Math.max(0, state.extraHours + +b.dataset.extra)); render(); }));
  $('#qBook').addEventListener('click', () => openBooking(state.block));
  $('#qWa').addEventListener('click', (e) => { if (!LINKS.whatsappNumber) { navigator.clipboard?.writeText(e.currentTarget.dataset.summary); toast('Resumen copiado. Pégalo en el chat de WhatsApp.'); } });
  const api = {
    setProfile(id) {
      state.profile = id; const p = PRICING.profiles.find((x) => x.id === id);
      if (p) { state.block = p.block; state.services = new Set(p.suggest); }
      renderServices(); render();
    },
  };
  render();
  return api;
})();

/* =====================================================================
   Reseñas + FAQ
   ===================================================================== */
const revEl = $('#reviews');
revEl.innerHTML = REVIEWS.items.map((t) => `
  <article class="review">
    <div class="review__who"><span class="review__avatar">${esc(t.name.split(' ').map((n) => n[0]).slice(0, 2).join(''))}</span><div><b>${esc(t.name)}</b><span>Reseña de Google</span></div></div>
    <p class="stars" aria-label="5 estrellas">★★★★★</p>
    <p class="review__text">${esc(t.text)}</p>
  </article>`).join('');
// Carrusel: desplazamiento nativo con snap, flechas y avance automático suave.
(() => {
  const step = () => { const c = $('.review', revEl); return c ? c.getBoundingClientRect().width + 16 : 340; };
  const atEnd = () => revEl.scrollLeft + revEl.clientWidth >= revEl.scrollWidth - 8;
  const upd = () => { $('#revPrev').disabled = revEl.scrollLeft < 8; $('#revNext').disabled = atEnd(); };
  const go = (d) => revEl.scrollBy({ left: d * step(), behavior: 'smooth' });
  $('#revPrev').addEventListener('click', () => go(-1));
  $('#revNext').addEventListener('click', () => go(1));
  revEl.addEventListener('scroll', upd, { passive: true });
  window.addEventListener('resize', upd); upd();
  if (reduced) return;
  let paused = false; let timer = null;
  ['mouseenter', 'focusin', 'touchstart'].forEach((ev) => revEl.addEventListener(ev, () => (paused = true), { passive: true }));
  ['mouseleave', 'focusout'].forEach((ev) => revEl.addEventListener(ev, () => (paused = false)));
  ScrollTrigger.create({
    trigger: revEl, start: 'top 90%', end: 'bottom 10%',
    onToggle: (st) => {
      clearInterval(timer);
      if (st.isActive) timer = setInterval(() => { if (paused) return; atEnd() ? revEl.scrollTo({ left: 0, behavior: 'smooth' }) : go(1); }, 5500);
    },
  });
})();
$('#faqList').innerHTML = FAQS.map((f, i) => `
  <div class="faq__item" data-reveal>
    <button class="faq__q" type="button" aria-expanded="false" aria-controls="faq-${i}">${f.q}<span class="acc__ico"></span></button>
    <div class="faq__a" id="faq-${i}"><p>${f.a}</p></div>
  </div>`).join('');
$('#faqList').addEventListener('click', (e) => {
  const q = e.target.closest('.faq__q'); if (!q) return;
  const item = q.parentElement; const a = item.querySelector('.faq__a'); const open = !item.classList.contains('is-open');
  item.classList.toggle('is-open', open); q.setAttribute('aria-expanded', String(open));
  if (open) {
    a.style.height = a.scrollHeight + 'px';
    a.addEventListener('transitionend', () => { if (item.classList.contains('is-open')) a.style.height = 'auto'; }, { once: true });
  } else {
    a.style.height = a.scrollHeight + 'px';
    requestAnimationFrame(() => (a.style.height = '0px'));
  }
});

/* =====================================================================
   Booking modal (Prospex)
   ===================================================================== */
const modal = $('#modal');
let scriptLoaded = false;
function openBooking(id) {
  const url = LINKS.booking[id] || LINKS.booking['4h'];
  const b = PRICING.blocks.find((x) => x.id === id);
  $('#modalTitle').textContent = id === 'scouting' ? 'Agenda tu visita al estudio' : `Reserva tu bloque de ${b ? b.hours + ' horas' : 'estudio'}`;
  $('#modalBody').innerHTML = `<iframe src="${url}" title="Calendario de reservas" scrolling="no" id="prospex-${id}-${Date.now()}"></iframe>`;
  if (!scriptLoaded) { const s = document.createElement('script'); s.src = LINKS.bookingScript; s.async = true; document.body.appendChild(s); scriptLoaded = true; }
  modal.hidden = false; lockScroll(true);
  if (!reduced) gsap.fromTo('.modal__panel', { y: 30, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
  $('.modal__close').focus();
}
function closeBooking() { modal.hidden = true; $('#modalBody').innerHTML = ''; lockScroll(false); }
document.addEventListener('click', (e) => { const b = e.target.closest('[data-book]'); if (b) openBooking(b.dataset.book); if (e.target.closest('[data-close]')) closeBooking(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lightbox.isOpen()) { if (!modal.hidden) closeBooking(); closeDrawer(); } });

/* =====================================================================
   Toast
   ===================================================================== */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), 2800); }

/* =====================================================================
   Animaciones de entrada y scroll
   ===================================================================== */
const hero = $('#hero');
if (reduced) { hero.classList.add('is-ready'); $$('[data-reveal]').forEach((el) => el.removeAttribute('data-reveal')); }
else {
  document.fonts?.ready.then(() => {
    hero.classList.add('is-ready');
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero__frame', { scale: 0.96, opacity: 0, duration: 1.2, ease: 'power2.out' }, 0)
      .to('.hero__title .line > span', { y: 0, duration: 1.1, stagger: 0.12, ease: 'power4.out' }, 0.35)
      .from('.hero__eyebrow', { y: 16, opacity: 0, duration: 0.8 }, 0.5)
      .from('.hero__sub', { y: 20, opacity: 0, duration: 0.9 }, 0.9)
      .from('.hero__actions', { y: 20, opacity: 0, duration: 0.9 }, 1.05)
      .from('.clients', { opacity: 0, duration: 1 }, 1.2);
  });
  gsap.to('.hero__media', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  $$('.sec-head').forEach((h) => gsap.from(h.children, { y: 28, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 82%' } }));
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%', once: true,
    onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: 'power3.out', overwrite: true }),
  });
  ['.rooms__layout', '.gear__tabs', '.gear__grid', '.work__clips-head', '.work__clips', '.work__listen', '.custom', '.quoter__layout', '.scout__card', '.where__layout', '.reviews__score'].forEach((s) => {
    const el = $(s); if (el) gsap.from(el, { y: 32, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  $$('.scout__media img').forEach((im) => gsap.fromTo(im, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: im, start: 'top bottom', end: 'bottom top', scrub: true } }));
}
window.addEventListener('load', () => ScrollTrigger.refresh());
