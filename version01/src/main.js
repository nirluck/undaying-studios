import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { LINKS, PRICING, ROOMS, GEAR, TRACKS, TESTIMONIALS, FAQS, AUDIENCES, HOURS, ADDRESS } from './data.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Prefijo de rutas: '/' en dev, './' en build (permite subcarpeta o subdominio).
const BASE = import.meta.env.BASE_URL;
const money = (n) => '$' + Math.round(n).toLocaleString('es-MX');
const img = (name, alt = '', sizes = '(min-width: 900px) 50vw, 100vw', eager = false) =>
  `<img src="${BASE}img/${name}-800.webp" srcset="${BASE}img/${name}-800.webp 800w, ${BASE}img/${name}-1600.webp 1600w" sizes="${sizes}" alt="${alt}" ${eager ? '' : 'loading="lazy"'} decoding="async" />`;
const check = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

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

/* =====================================================================
   Links y contenido estático
   ===================================================================== */
const waUrl = (text = '') => {
  if (LINKS.whatsappNumber) return `https://wa.me/${LINKS.whatsappNumber}${text ? '?text=' + encodeURIComponent(text) : ''}`;
  return LINKS.whatsappShort;
};
['waFloat', 'drawerWa', 'scoutWa', 'faqWa'].forEach((id) => { const el = $('#' + id); if (el) el.href = waUrl('Hola, quiero información del estudio de grabación.'); });
$('#addr').textContent = ADDRESS;
$('#hours').textContent = HOURS;
$('#dirLink').href = LINKS.directions;
$('#mailLink').href = 'mailto:' + LINKS.email; $('#mailLink').textContent = LINKS.email;
$('#foroLink').href = LINKS.foro;
$('#privacyLink').href = LINKS.legal.privacidad;
['termsLink', 'termsLink2'].forEach((id) => ($('#' + id).href = LINKS.legal.terminos));
['rulesLink', 'rulesLink2'].forEach((id) => ($('#' + id).href = LINKS.legal.reglamento));
$('#riderLink').href = LINKS.legal.reglamento;
$('#year').textContent = new Date().getFullYear();
document.documentElement.style.setProperty('--reviews-bg', `url(${new URL(BASE + 'img/mix-2-800.webp', document.baseURI).href})`);
$('#extraHour').textContent = money(PRICING.extraHour) + ' / h';

const socialIcons = {
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3h3c.2 2.2 1.6 3.8 4 4v3c-1.5 0-2.9-.5-4-1.3V15a5.5 5.5 0 1 1-5.5-5.5h.5v3h-.5a2.5 2.5 0 1 0 2.5 2.5z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 8.2s-.2-1.6-.9-2.3c-.8-.9-1.8-.9-2.2-1C15.8 4.7 12 4.7 12 4.7s-3.8 0-6.9.2c-.4.1-1.4.1-2.2 1C2.2 6.6 2 8.2 2 8.2S1.8 10 1.8 11.9v1.7c0 1.8.2 3.7.2 3.7s.2 1.6.9 2.3c.8.9 1.9.8 2.4.9 1.8.2 6.7.2 6.7.2s3.8 0 6.9-.2c.4-.1 1.4-.1 2.2-1 .7-.7.9-2.3.9-2.3s.2-1.8.2-3.7v-1.7C22.2 10 22 8.2 22 8.2zM10 15V9l5.5 3z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.7-4.5 4.5V11H7v4h2.5v7h4v-7h3l.5-4h-3.5V9c0-.6.4-1 1-1z"/></svg>',
};
$('#social').innerHTML = Object.entries(LINKS.social).map(([k, v]) => `<a href="${v}" target="_blank" rel="noopener" aria-label="${k}">${socialIcons[k]}</a>`).join('');

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
// Active link
const navLinks = $$('.nav__links a');
$$('main section[id]').forEach((sec) => {
  ScrollTrigger.create({
    trigger: sec, start: 'top 40%', end: 'bottom 40%',
    onToggle: (st) => { if (st.isActive) navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + sec.id)); },
  });
});

/* =====================================================================
   Audiences
   ===================================================================== */
$('#audiences').innerHTML = AUDIENCES.map((a, i) => `
  <button class="aud" type="button" data-profile="${a.id}" data-reveal>
    ${img(a.img, a.name + ' en el estudio de grabación', '(min-width: 900px) 25vw, 50vw')}
    <span class="aud__num">0${i + 1}</span>
    <h3>${a.name}</h3>
    <p>${a.desc}</p>
    <span class="cta">Cotizar esta sesión →</span>
  </button>`).join('');
$('#audiences').addEventListener('click', (e) => {
  const b = e.target.closest('.aud'); if (!b) return;
  const map = { bandas: 'banda', solistas: 'voz', productores: 'banda', podcast: 'podcast' };
  quoter.setProfile(map[b.dataset.profile]);
  if (b.dataset.profile === 'productores') quoter.setEngineer(false);
  scrollTo('#cotizador');
});

/* =====================================================================
   Rooms
   ===================================================================== */
$('#roomTabs').innerHTML = ROOMS.map((r, i) => `
  <button class="rtab" role="tab" id="rtab-${r.id}" aria-selected="${i === 0}" aria-controls="room-${r.id}" type="button">
    <span class="rtab__n">0${i + 1}</span>
    <span class="rtab__name">${r.name}<span class="rtab__tag">${r.tag}</span></span>
    <span class="rtab__area">${r.area}</span>
  </button>`).join('');
$('#roomStage').innerHTML = ROOMS.map((r, i) => `
  <article class="room ${i === 0 ? 'is-on' : ''}" id="room-${r.id}" role="tabpanel" aria-labelledby="rtab-${r.id}">
    <div class="room__media ${r.video ? 'has-video' : ''}">
      ${img(r.img, r.name, '(min-width: 960px) 60vw, 100vw', i === 0)}
      ${r.video ? `<video muted loop playsinline preload="none" src="${BASE}video/${r.video}.mp4"></video>` : ''}
      <span class="room__badge">${r.tag}</span>
    </div>
    <div class="room__specs">
      <div><b>${r.area}</b><span>Superficie</span></div>
      <div><b>${r.height}</b><span>Altura</span></div>
      <div><b>${r.capacity}</b><span>Capacidad</span></div>
      <div><b>${r.acoustics}</b><span>Acústica</span></div>
    </div>
    <div class="room__body">
      <p>${r.desc}</p>
      <ul class="room__bullets">${r.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>
    </div>
  </article>`).join('');
$('#roomTabs').addEventListener('click', (e) => {
  const t = e.target.closest('.rtab'); if (!t) return;
  $$('.rtab').forEach((b) => b.setAttribute('aria-selected', String(b === t)));
  const panel = $('#' + t.getAttribute('aria-controls'));
  $$('.room').forEach((r) => { r.classList.remove('is-on'); r.querySelector('video')?.pause(); });
  panel.classList.add('is-on');
  if (!reduced) gsap.fromTo(panel.children, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out', clearProps: 'all' });
  ScrollTrigger.refresh();
});
$$('.room__media.has-video').forEach((m) => {
  const v = m.querySelector('video');
  m.addEventListener('mouseenter', () => { v.play().catch(() => {}); m.classList.add('is-playing'); });
  m.addEventListener('mouseleave', () => { v.pause(); m.classList.remove('is-playing'); });
});

/* =====================================================================
   Gear
   ===================================================================== */
$('#gearTabs').innerHTML = GEAR.map((g, i) => `<button class="gtab" role="tab" aria-selected="${i === 0}" data-gear="${g.id}" type="button"><i>0${i + 1}</i>${g.name}</button>`).join('');
function renderGear(id, animate = true) {
  const g = GEAR.find((x) => x.id === id);
  const count = g.groups.reduce((n, gr) => n + gr.items.length, 0);
  $('#gearPanel').innerHTML = `
    <figure class="gear__media">${img(g.img, g.name, '(min-width: 960px) 40vw, 100vw')}<figcaption>${g.intro}</figcaption></figure>
    <div class="gear__groups">
      ${g.groups.map((gr, i) => `
        <details class="acc" ${i === 0 ? 'open' : ''}>
          <summary class="acc__btn"><h4>${gr.title}<small>${gr.items.length} piezas</small></h4><span class="acc__ico"></span></summary>
          <div class="acc__body"><ul>${gr.items.map((it) => `<li>${it}</li>`).join('')}</ul></div>
        </details>`).join('')}
      <p class="muted" style="font-size:13px;margin-top:6px">${count} piezas en esta categoría.</p>
    </div>`;
  if (animate && !reduced) gsap.fromTo('#gearPanel > *', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.1, ease: 'power3.out', clearProps: 'all' });
  ScrollTrigger.refresh();
}
renderGear(GEAR[0].id, false);
$('#gearTabs').addEventListener('click', (e) => {
  const t = e.target.closest('.gtab'); if (!t) return;
  $$('.gtab').forEach((b) => b.setAttribute('aria-selected', String(b === t)));
  renderGear(t.dataset.gear);
});
// <details> smooth open/close
document.addEventListener('click', (e) => {
  const sum = e.target.closest('summary.acc__btn'); if (!sum || reduced) return;
  const det = sum.parentElement; const body = det.querySelector('.acc__body');
  if (det.open) {
    e.preventDefault();
    gsap.to(body, { height: 0, opacity: 0, duration: 0.35, ease: 'power2.inOut', onComplete: () => { det.open = false; gsap.set(body, { clearProps: 'all' }); } });
  } else {
    requestAnimationFrame(() => { gsap.from(body, { height: 0, opacity: 0, duration: 0.45, ease: 'power3.out', clearProps: 'all' }); });
  }
});

/* =====================================================================
   Player
   ===================================================================== */
const player = (() => {
  const root = $('#player'); const audio = $('#audio'); const wave = $('#pWave'); const ctx2d = wave.getContext('2d');
  let index = -1; let actx = null; let analyser = null; let data = null; let raf = null;
  const fmt = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

  $('#tracks').innerHTML = TRACKS.map((t, i) => `
    <li class="track" data-i="${i}" data-reveal>
      <button class="track__play" type="button" aria-label="Reproducir ${t.title}">
        <svg class="ico-play" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9-5.5z" fill="currentColor"/></svg>
        <svg class="ico-pause" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 2h3v10H3zM8 2h3v10H8z" fill="currentColor"/></svg>
      </button>
      <div class="track__cover">${img(t.cover, '', '72px')}</div>
      <div class="track__meta"><b>${t.title}</b><span>${t.artist}</span><span><i>${t.genre}</i></span></div>
      <p class="track__note">${t.note}</p>
      <div class="track__chain">${t.chain.map((c) => `<span>${c}</span>`).join('')}</div>
      <div class="track__eq" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    </li>`).join('');

  const setupAnalyser = () => {
    if (actx || reduced) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      const src = actx.createMediaElementSource(audio);
      analyser = actx.createAnalyser(); analyser.fftSize = 128; analyser.smoothingTimeConstant = 0.82;
      src.connect(analyser); analyser.connect(actx.destination);
      data = new Uint8Array(analyser.frequencyBinCount);
    } catch { actx = null; }
  };
  const draw = () => {
    const w = wave.width, h = wave.height; ctx2d.clearRect(0, 0, w, h);
    const bars = 48; const gap = 3; const bw = (w - gap * (bars - 1)) / bars;
    for (let i = 0; i < bars; i++) {
      let v;
      if (analyser && data) { analyser.getByteFrequencyData(data); v = data[Math.floor((i / bars) * data.length * 0.7)] / 255; }
      else v = 0.25 + 0.2 * Math.abs(Math.sin(i * 0.6 + performance.now() / 400));
      const bh = Math.max(3, v * h);
      ctx2d.fillStyle = i / bars < audio.currentTime / (audio.duration || 1) ? '#eb9050' : 'rgba(228,210,208,0.28)';
      const x = i * (bw + gap); const y = (h - bh) / 2;
      ctx2d.beginPath(); ctx2d.roundRect(x, y, bw, bh, 2); ctx2d.fill();
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
  $('#pClose').addEventListener('click', () => { audio.pause(); root.classList.remove('is-visible'); document.body.classList.remove('has-player'); setTimeout(() => (root.hidden = true), 600); sync(); });
  $('#pBar').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); audio.currentTime = ((e.clientX - r.left) / r.width) * (audio.duration || 0); });
  $('#tracks').addEventListener('click', (e) => { const li = e.target.closest('.track'); if (!li) return; const i = +li.dataset.i; i === index ? toggle() : play(i); });
  $('#heroListen').addEventListener('click', () => { play(0); scrollTo('#escucha'); });
  document.addEventListener('keydown', (e) => { if (e.code === 'Space' && !root.hidden && !['INPUT', 'BUTTON', 'TEXTAREA', 'A'].includes(document.activeElement.tagName)) { e.preventDefault(); toggle(); } });
  return { play, toggle };
})();

/* =====================================================================
   Pricing
   ===================================================================== */
let mode = 'withEngineer';
function renderPricing() {
  $('#pricingGrid').innerHTML = PRICING.blocks.map((b) => `
    <article class="plan ${b.badge === 'Más popular' ? 'plan--hot' : ''}" data-reveal>
      ${b.badge ? `<span class="plan__badge ${b.badge !== 'Más popular' ? 'plan__badge--alt' : ''}">${b.badge}</span>` : ''}
      <div class="plan__head"><b>${b.hours}<small>horas</small></b><span>${b.name} · ${b.tagline}</span></div>
      <p class="plan__price"><span class="plan__num" data-target="${b[mode]}">${money(b[mode])}</span><small>MXN</small></p>
      <p class="plan__per">${money(b[mode] / b.hours)} por hora · ${mode === 'withEngineer' ? 'ingeniero incluido' : 'sin ingeniero de casa'}</p>
      <ul class="plan__perks">${b.perks.filter((p) => mode === 'withEngineer' || p !== 'Ingeniero de casa').map((p) => `<li>${check}${p}</li>`).join('')}${mode === 'dryHire' ? `<li>${check}Sala parcheada y sesión plantilla</li>` : ''}</ul>
      <button class="btn btn--primary btn--block" type="button" data-book="${b.id}">Reservar ${b.hours} horas</button>
    </article>`).join('');
}
renderPricing();
$$('.toggle__opt').forEach((btn) => btn.addEventListener('click', () => {
  if (btn.dataset.mode === mode) return;
  mode = btn.dataset.mode; $('.toggle').dataset.mode = mode;
  $$('.toggle__opt').forEach((b) => b.classList.toggle('is-on', b === btn));
  const prev = $$('.plan__num').map((n) => +n.dataset.target);
  renderPricing(); $$('.plan').forEach((p) => p.removeAttribute('data-reveal'));
  if (!reduced) $$('.plan__num').forEach((n, i) => { const o = { v: prev[i] }; gsap.to(o, { v: +n.dataset.target, duration: 0.7, ease: 'power2.out', onUpdate: () => (n.textContent = money(o.v)) }); });
  quoter.setEngineer(mode === 'withEngineer');
}));

/* =====================================================================
   Cotizador
   ===================================================================== */
const quoter = (() => {
  const state = { profile: null, block: '8h', engineer: true, extraHours: 0, extras: new Set() };
  const profiles = $('#qProfiles'); const blocks = $('#qBlocks'); const extras = $('#qExtras');
  profiles.innerHTML = PRICING.profiles.map((p) => `<button class="qopt" type="button" data-id="${p.id}" aria-pressed="false"><b>${p.name}</b><span>${p.desc}</span></button>`).join('');
  blocks.innerHTML = PRICING.blocks.map((b) => `<button class="qblock" type="button" data-id="${b.id}" aria-pressed="${b.id === state.block}"><b>${b.hours}h</b><span>${b.name}</span></button>`).join('');
  const renderExtras = () => {
    const sug = PRICING.profiles.find((p) => p.id === state.profile)?.suggest || [];
    extras.innerHTML = PRICING.extras.map((x) => `<button class="qextra" type="button" data-id="${x.id}" aria-pressed="${state.extras.has(x.id)}">${sug.includes(x.id) ? '<span class="sug">Sugerido</span>' : ''}<b>${x.name}</b><em>${money(x.price)} / ${x.unit}</em><span>${x.desc}</span></button>`).join('');
  };
  renderExtras();
  const calc = () => {
    const b = PRICING.blocks.find((x) => x.id === state.block);
    const lines = [];
    if (b) lines.push({ label: `${b.name} · ${b.hours} h ${state.engineer ? 'con ingeniero' : 'dry hire'}`, amount: state.engineer ? b.withEngineer : b.dryHire });
    if (state.extraHours) lines.push({ label: `${state.extraHours} h extra`, amount: state.extraHours * PRICING.extraHour });
    state.extras.forEach((id) => { const x = PRICING.extras.find((e) => e.id === id); lines.push({ label: x.name, amount: x.price }); });
    return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
  };
  let shown = 0;
  const render = () => {
    const { lines, total } = calc();
    $$('.qopt', profiles).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === state.profile)));
    $$('.qblock', blocks).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === state.block)));
    $('#qEngineer').checked = state.engineer; $('#qExtraHours').value = state.extraHours;
    $$('.qextra', extras).forEach((b) => b.setAttribute('aria-pressed', String(state.extras.has(b.dataset.id))));
    $('#qLines').innerHTML = lines.length ? lines.map((l) => `<li><span>${l.label}</span><b>${money(l.amount)}</b></li>`).join('') : '<li class="is-empty">Sin conceptos todavía</li>';
    const p = PRICING.profiles.find((x) => x.id === state.profile);
    $('#qHint').textContent = p ? `Para ${p.name.toLowerCase()} normalmente alcanza con el bloque de ${PRICING.blocks.find((b) => b.id === p.block).hours} horas.` : 'Elige qué vas a grabar para empezar.';
    const num = $('#qTotal');
    if (reduced) num.textContent = money(total);
    else { const o = { v: shown }; gsap.to(o, { v: total, duration: 0.6, ease: 'power2.out', onUpdate: () => (num.textContent = money(o.v)) }); }
    shown = total;
    const b = PRICING.blocks.find((x) => x.id === state.block);
    const summary = `Hola, hice una cotización en la página del estudio:\n${lines.map((l) => `• ${l.label}: ${money(l.amount)}`).join('\n')}\nTotal estimado: ${money(total)} MXN + IVA${p ? `\nPerfil: ${p.name}` : ''}\n¿Qué fechas tienen disponibles?`;
    $('#qWa').href = waUrl(summary); $('#qWa').dataset.summary = summary;
    $('#qBook').textContent = b ? `Reservar ${b.hours + state.extraHours} horas` : 'Reservar';
  };
  profiles.addEventListener('click', (e) => { const b = e.target.closest('.qopt'); if (b) api.setProfile(b.dataset.id); });
  blocks.addEventListener('click', (e) => { const b = e.target.closest('.qblock'); if (b) { state.block = b.dataset.id; render(); } });
  extras.addEventListener('click', (e) => { const b = e.target.closest('.qextra'); if (!b) return; state.extras.has(b.dataset.id) ? state.extras.delete(b.dataset.id) : state.extras.add(b.dataset.id); render(); });
  $('#qEngineer').addEventListener('change', (e) => { state.engineer = e.target.checked; render(); });
  $$('[data-extra]').forEach((b) => b.addEventListener('click', () => { state.extraHours = Math.min(12, Math.max(0, state.extraHours + +b.dataset.extra)); render(); }));
  $('#qBook').addEventListener('click', () => openBooking(state.block));
  $('#qWa').addEventListener('click', (e) => { if (!LINKS.whatsappNumber) { navigator.clipboard?.writeText(e.currentTarget.dataset.summary); toast('Resumen copiado. Pégalo en el chat de WhatsApp.'); } });
  const api = {
    setProfile(id) {
      state.profile = id; const p = PRICING.profiles.find((x) => x.id === id);
      if (p) { state.block = p.block; state.extras = new Set(p.suggest); }
      renderExtras(); render();
    },
    setEngineer(v) { state.engineer = v; render(); },
  };
  render();
  return api;
})();

/* =====================================================================
   Reviews + FAQ
   ===================================================================== */
$('#reviews').innerHTML = TESTIMONIALS.map((t) => `
  <article class="review" data-reveal>
    <div class="review__who"><span class="review__avatar">${t.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</span><div><b>${t.name}</b><span>${t.role}</span></div></div>
    <p class="stars" aria-label="${t.stars} estrellas">${'★'.repeat(t.stars)}</p>
    <p>${t.text}</p>
  </article>`).join('');
$('#faqList').innerHTML = FAQS.map((f, i) => `
  <div class="faq__item" data-reveal>
    <button class="faq__q" type="button" aria-expanded="false" aria-controls="faq-${i}">${f.q}<span class="acc__ico"></span></button>
    <div class="faq__a" id="faq-${i}"><p>${f.a}</p></div>
  </div>`).join('');
$('#faqList').addEventListener('click', (e) => {
  const q = e.target.closest('.faq__q'); if (!q) return;
  const item = q.parentElement; const a = item.querySelector('.faq__a'); const open = !item.classList.contains('is-open');
  item.classList.toggle('is-open', open); q.setAttribute('aria-expanded', String(open));
  a.style.height = open ? a.scrollHeight + 'px' : '0px';
  if (open) a.addEventListener('transitionend', () => { if (item.classList.contains('is-open')) a.style.height = 'auto'; }, { once: true });
  else { a.style.height = a.scrollHeight + 'px'; requestAnimationFrame(() => (a.style.height = '0px')); }
});

/* =====================================================================
   Booking modal (Prospex)
   ===================================================================== */
const modal = $('#modal');
let scriptLoaded = false;
function openBooking(id) {
  const url = LINKS.booking[id] || LINKS.booking['8h'];
  const b = PRICING.blocks.find((x) => x.id === id);
  $('#modalTitle').textContent = id === 'scouting' ? 'Agenda tu visita al estudio' : `Reserva tu bloque de ${b ? b.hours + ' horas' : 'estudio'}`;
  $('#modalBody').innerHTML = `<iframe src="${url}" title="Calendario de reservas" scrolling="no" id="prospex-${id}-${Date.now()}"></iframe>`;
  if (!scriptLoaded) { const s = document.createElement('script'); s.src = LINKS.bookingScript; s.async = true; document.body.appendChild(s); scriptLoaded = true; }
  modal.hidden = false; lenis?.stop(); document.body.style.overflow = 'hidden';
  if (!reduced) gsap.fromTo('.modal__panel', { y: 30, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
  $('.modal__close').focus();
}
function closeBooking() { modal.hidden = true; $('#modalBody').innerHTML = ''; lenis?.start(); document.body.style.overflow = ''; }
document.addEventListener('click', (e) => { const b = e.target.closest('[data-book]'); if (b) openBooking(b.dataset.book); if (e.target.closest('[data-close]')) closeBooking(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!modal.hidden) closeBooking(); closeDrawer(); } });

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
      .from('.hero__actions', { y: 20, opacity: 0, duration: 0.9 }, 1.05);
  });
  gsap.to('.hero__video', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // Reveals: elementos sueltos y encabezados de sección
  $$('.sec-head').forEach((h) => gsap.from(h.children, { y: 28, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 82%' } }));
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%', once: true,
    onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: 'power3.out', overwrite: true }),
  });
  ['.rooms__layout', '.gear__tabs', '.gear__panel', '.toggle', '.quoter__layout', '.scout__card', '.where__layout', '.reviews__score'].forEach((s) => {
    const el = $(s); if (el) gsap.from(el, { y: 32, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  // Parallax suave en medios grandes
  $$('.scout__media img, .gear__media img').forEach((im) => gsap.fromTo(im, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: im, start: 'top bottom', end: 'bottom top', scrub: true } }));
}
window.addEventListener('load', () => ScrollTrigger.refresh());
