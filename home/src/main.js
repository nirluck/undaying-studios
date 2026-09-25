/* =====================================================================
   UNDYING STUDIOS · HOME
   Crossfader entre el foro (A) y el estudio (B). Pasar el cursor por un
   lado lo abre; la perilla y la línea también se arrastran.
   ===================================================================== */

const stage = document.getElementById('stage');
const panelA = document.getElementById('panelA');
const panelB = document.getElementById('panelB');
const seam = document.getElementById('seam');
const knob = document.getElementById('knob');
const tc = document.getElementById('tc');
const meters = ['L', 'R'].map((ch) => ({
  bar: document.getElementById('m' + ch),
  peak: document.getElementById('p' + ch),
  level: 0,
  hold: 0,
}));

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wide = matchMedia('(min-width: 900px)');

// Con `npm run dev:home` el estudio abre su propio servidor de desarrollo,
// para poder revisar el recorrido completo antes de publicar.
if (import.meta.env.DEV) {
  for (const p of [panelA, panelB]) if (p.dataset.devHref) p.href = p.dataset.devHref;
}

/* ---------- Estado del crossfader ---------- */
const MIN = 16;
const MAX = 84;
const HOVER = 14; // cuánto se abre el lado que tiene el cursor
let cur = 50;
let target = 50;
let dragging = false;
let manual = false; // el usuario lo dejó en una posición a mano
let touched = false;
let lastAria = '';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function apply(v) {
  const da = clamp(0.5 + (v - 50) / (MAX - MIN), 0, 1);
  stage.style.setProperty('--split', v.toFixed(2));
  stage.style.setProperty('--da', da.toFixed(3));
  stage.style.setProperty('--db', (1 - da).toFixed(3));

  const text = v > 56 ? 'Foro al frente' : v < 44 ? 'Estudio al frente' : 'Foro y estudio a la mitad';
  const now = String(Math.round(v));
  if (now + text !== lastAria) {
    knob.setAttribute('aria-valuenow', now);
    knob.setAttribute('aria-valuetext', text);
    lastAria = now + text;
  }
}

function sideAt(clientX) {
  return (clientX / innerWidth) * 100 < cur ? 'a' : 'b';
}

/* ---------- Cursor ---------- */
stage.addEventListener('pointermove', (e) => {
  if (!wide.matches || e.pointerType !== 'mouse') return;
  stopHint();
  if (dragging || manual) return;
  // Cerca de la línea o sobre la regla no se cambia de lado: si no, la
  // perilla huye del cursor justo cuando alguien va a tomarla.
  const nearSeam = Math.abs(e.clientX - (cur / 100) * innerWidth) < 48;
  const onRule = e.clientY > innerHeight - 76;
  if (nearSeam || onRule) return;
  target = sideAt(e.clientX) === 'a' ? 50 + HOVER : 50 - HOVER;
});
stage.addEventListener('pointerleave', () => {
  if (dragging) return;
  manual = false;
  target = 50;
});

/* ---------- Arrastre (perilla y línea) ---------- */
function startDrag(e) {
  if (!wide.matches) return;
  e.preventDefault();
  stopHint();
  dragging = true;
  touched = true;
  stage.classList.add('is-dragging');
  e.currentTarget.setPointerCapture(e.pointerId);
  moveDrag(e);
}
function moveDrag(e) {
  if (!dragging) return;
  target = clamp((e.clientX / innerWidth) * 100, MIN, MAX);
}
function endDrag() {
  if (!dragging) return;
  dragging = false;
  manual = true;
  stage.classList.remove('is-dragging');
}
for (const el of [knob, seam]) {
  el.addEventListener('pointerdown', startDrag);
  el.addEventListener('pointermove', moveDrag);
  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);
}
knob.addEventListener('dblclick', () => { manual = false; target = 50; });

/* ---------- Teclado ---------- */
knob.addEventListener('keydown', (e) => {
  const steps = { ArrowRight: 4, ArrowUp: 4, ArrowLeft: -4, ArrowDown: -4, PageUp: 12, PageDown: -12 };
  let next = null;
  if (e.key in steps) next = target + steps[e.key];
  else if (e.key === 'Home') next = MIN;
  else if (e.key === 'End') next = MAX;
  if (next === null) return;
  e.preventDefault();
  stopHint();
  manual = true;
  touched = true;
  target = clamp(next, MIN, MAX);
});

// Al llegar con Tab a un lado, ese lado se abre
panelA.addEventListener('focus', () => { if (!manual) target = 50 + HOVER; });
panelB.addEventListener('focus', () => { if (!manual) target = 50 - HOVER; });
for (const p of [panelA, panelB]) p.addEventListener('blur', () => { if (!manual) target = 50; });

/* ---------- Pista inicial: la perilla se mece una vez ---------- */
let hintTimers = [];
function startHint() {
  if (reduce || touched || !wide.matches) return;
  const steps = [[1700, 50 + 8], [2500, 50 - 7], [3300, 50]];
  stage.classList.add('is-hinting');
  hintTimers = steps.map(([t, v]) => setTimeout(() => { target = v; }, t));
  hintTimers.push(setTimeout(() => stage.classList.remove('is-hinting'), 4200));
}
function stopHint() {
  if (!hintTimers.length) return;
  hintTimers.forEach(clearTimeout);
  hintTimers = [];
  stage.classList.remove('is-hinting');
  touched = true;
}

/* ---------- Timecode y medidores ---------- */
const t0 = performance.now();
let lastFrame = -1;

function timecode(now) {
  const f = Math.floor(((now - t0) / 1000) * 24);
  if (f === lastFrame) return;
  lastFrame = f;
  const pad = (n) => String(n).padStart(2, '0');
  const s = Math.floor(f / 24);
  tc.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f % 24)}`;
}

// Señal simulada a 96 BPM: bombo en cada tiempo, tarola en 2 y 4, y un
// poco de ruido para que no se vea mecánico. Sube cuando el estudio domina.
const BEAT = 60000 / 96;
function levels(now, dt, activity) {
  const beat = (now % BEAT) / BEAT;
  const n = Math.floor(now / BEAT) % 4;
  const kick = Math.exp(-beat * 5);
  const snare = n % 2 ? Math.exp(-Math.abs(beat - 0.02) * 7) * 0.6 : 0;
  meters.forEach((m, i) => {
    const noise = Math.sin(now / (170 + i * 37)) * 0.05 + (Math.random() - 0.5) * 0.08;
    const raw = (0.5 + kick * 0.32 + snare * (i ? 0.26 : 0.18) + noise) * activity;
    const want = clamp(raw, 0.04, 0.99) * 100;
    // Sube rápido y baja lento, como un medidor de verdad
    const k = want > m.level ? 0.55 : 1 - Math.exp(-dt / 180);
    m.level += (want - m.level) * k;
    m.hold = m.level > m.hold ? m.level : Math.max(m.level, m.hold - dt * 0.025);
    m.bar.style.clipPath = `inset(0 ${(100 - m.level).toFixed(1)}% 0 0)`;
    m.peak.style.left = `calc(${m.hold.toFixed(1)}% - 4px)`;
  });
}

/* ---------- Bucle ---------- */
let last = performance.now();
let first = true;

function frame(now) {
  const dt = Math.min(64, now - last);
  last = now;

  if (wide.matches) {
    const speed = dragging ? 0.028 : 0.0068;
    const next = reduce ? target : cur + (target - cur) * (1 - Math.exp(-dt * speed));
    if (first || Math.abs(next - cur) > 0.004) {
      cur = Math.abs(target - next) < 0.004 ? target : next;
      apply(cur);
      first = false;
    }
  }

  timecode(now);
  if (!reduce) {
    const db = wide.matches ? 1 - clamp(0.5 + (cur - 50) / (MAX - MIN), 0, 1) : 1;
    levels(now, dt, 0.6 + db * 0.4);
  }
  requestAnimationFrame(frame);
}

if (reduce) {
  meters.forEach((m, i) => {
    m.bar.style.clipPath = `inset(0 ${i ? 42 : 38}% 0 0)`;
    m.peak.style.left = `calc(${i ? 70 : 74}% - 4px)`;
  });
}

wide.addEventListener('change', () => {
  manual = false;
  target = cur = 50;
  first = true;
});

requestAnimationFrame(frame);

/* ---------- Entrada ---------- */
const imgs = [...document.querySelectorAll('.panel__media img')];
Promise.race([
  Promise.all(imgs.map((img) => img.decode().catch(() => {}))),
  new Promise((r) => setTimeout(r, 1500)),
]).then(() => {
  stage.classList.add('is-ready');
  startHint();
});
