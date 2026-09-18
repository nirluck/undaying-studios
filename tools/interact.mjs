import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT = process.env.SHOTS_DIR || 'tools/.shots';
mkdirSync(OUT, { recursive: true });
const URL = process.argv[2] || 'http://localhost:5173/';
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('localhost')) errors.push(`[${r.status()}] ${r.url()}`); });
await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/i-hero.png` });
const nav = (h) => page.click(`.nav__links a[href="${h}"]`).then(() => page.waitForTimeout(1700));

// 1. Salas: cambiar a Control Room, miniatura 3, abrir lightbox, flecha siguiente
await nav('#salas');
await page.click('#rtab-control'); await page.waitForTimeout(1000);
await page.click('#room-control .room__thumb[data-index="3"]'); await page.waitForTimeout(900);
const mainSrc = await page.$eval('#room-control .room__main img', (i) => i.getAttribute('src'));
await page.screenshot({ path: `${OUT}/i-room.png` });
await page.click('#room-control .room__main'); await page.waitForTimeout(700);
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(700);
const lb1 = await page.$eval('#lbCaption', (e) => e.textContent);
await page.screenshot({ path: `${OUT}/i-lightbox-photo.png` });
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
console.log('room', { mainSrc, lb1 });

// 2. Equipo: micrófonos
await nav('#equipo');
await page.click('.gtab[data-gear="microfonos"]'); await page.waitForTimeout(900);
const gear = await page.$$eval('#gearGrid .gcard', (c) => c.length);
await page.screenshot({ path: `${OUT}/i-gear.png` });
console.log('gear mics', gear);

// 3. Portafolio: video destacado, carrusel de clips, reproductor de audio
await nav('#portafolio');
await page.click('.wcard[data-work="0"]'); await page.waitForTimeout(2500);
const yt = await page.$eval('#lbStage iframe', (f) => f.src);
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
const before = await page.$eval('#clips', (e) => e.scrollLeft);
await page.click('#clipsNext'); await page.waitForTimeout(900);
const after = await page.$eval('#clips', (e) => e.scrollLeft);
const links = await page.evaluate(() => ({ yt: document.querySelector('#ytPlaylist').href, sp: document.querySelector('#spotifyLink').href }));
await page.click('.track[data-i="2"] .track__play'); await page.waitForTimeout(1800);
const pl = await page.evaluate(() => ({ visible: document.querySelector('#player').classList.contains('is-visible'), title: document.querySelector('#pTitle').textContent, playing: !document.querySelector('#audio').paused }));
await page.screenshot({ path: `${OUT}/i-work.png` });
console.log('portfolio', { yt, scrolled: after > before, links, pl });

// 4. Amenidades, reseñas y hero
await nav('#salas');
await page.click('#rtab-amenidades'); await page.waitForTimeout(1200);
const amen = await page.$$eval('#room-amenidades .room__amen li', (l) => l.map((x) => x.textContent));
await page.screenshot({ path: `${OUT}/i-amen.png` });
console.log('amenidades', amen);
await page.evaluate(() => document.querySelector('#opiniones').scrollIntoView()); await page.waitForTimeout(1200);
const r0 = await page.$eval('#reviews', (e) => e.scrollLeft);
await page.click('#revNext'); await page.waitForTimeout(900);
const r1 = await page.$eval('#reviews', (e) => e.scrollLeft);
const rc = await page.$$eval('#reviews .review', (c) => c.length);
console.log('reviews', { cards: rc, moved: r1 > r0 });
const hero = await page.evaluate(() => ({ slides: document.querySelectorAll('.hero__slide').length, on: [...document.querySelectorAll('.hero__slide')].findIndex((s) => s.classList.contains('is-on')), quoterHidden: document.querySelector('#cotizador').hidden, visibleNums: document.body.innerText.match(/0[1-9]/g) }));
console.log('hero', hero);

// 5. Tarifas -> modal Prospex
await nav('#tarifas');
await page.click('[data-book="8h"]'); await page.waitForTimeout(2500);
const modal = await page.evaluate(() => ({ hidden: document.querySelector('#modal').hidden, title: document.querySelector('#modalTitle').textContent }));
console.log('modal', modal);
await page.keyboard.press('Escape'); await page.waitForTimeout(400);

// 6. FAQ
await nav('#faq');
await page.click('.faq__item:nth-child(6) .faq__q'); await page.waitForTimeout(800);
const faq = await page.$eval('.faq__item:nth-child(6) .faq__a', (a) => a.getBoundingClientRect().height);
console.log('faq height', Math.round(faq));
await page.close();

// 7. Móvil: overflow horizontal y menú
for (const w of [360, 390, 768]) {
  const m = await browser.newPage({ viewport: { width: w, height: 800 }, isMobile: w < 700, hasTouch: w < 700 });
  m.on('pageerror', (e) => errors.push(`[m${w}] ` + e.message));
  await m.goto(URL, { waitUntil: 'networkidle' }); await m.waitForTimeout(1500);
  const r = await m.evaluate(() => {
    const vw = document.documentElement.clientWidth; const bad = [];
    document.querySelectorAll('main *, footer *').forEach((el) => {
      if (el.closest('.clients__track, .work__clips, .room__thumbs, .gear__tabs, .rooms__list')) return;
      const b = el.getBoundingClientRect(); if (b.width && b.right > vw + 1) bad.push(el.className || el.tagName);
    });
    return { sw: document.documentElement.scrollWidth, vw, bad: [...new Set(bad)].slice(0, 6) };
  });
  console.log('mobile', w, r);
  await m.close();
}
await browser.close();
console.log('errors', errors.length); errors.forEach((e) => console.log('  ', e));
