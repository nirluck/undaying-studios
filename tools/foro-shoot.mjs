// Capturas y pruebas de la landing del foro.
//   node tools/foro-shoot.mjs [url]      (por omisión, `npm run dev:foro`)
//   node tools/foro-shoot.mjs http://localhost:4173/foro/   (build)
import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = process.argv[2] || 'http://localhost:5176/';
const OUT = 'tools/.shots/foro';
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const browser = await chromium.launch();
const showAll = (page) => page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => { e.style.opacity = 1; e.style.transform = 'none'; }));

// ---------- Escritorio ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (m) => m.type() === 'error' && errors.push('desktop: ' + m.text()));
  page.on('pageerror', (e) => errors.push('desktop: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('localhost')) errors.push(`desktop ${r.status()} ${r.url()}`); });
  await page.goto(URL, { waitUntil: 'load' });
  await wait(2400);
  await page.screenshot({ path: `${OUT}/d-hero.png` });
  await showAll(page);
  await page.screenshot({ path: `${OUT}/d-full.png`, fullPage: true });

  // Casilla de color del ciclorama en la tarjeta de 12 horas
  await page.click('.fcheck');
  console.log('12 h con color:', await page.textContent('.fplan:last-child [data-price]'), await page.getAttribute('.fplan:last-child [data-book]', 'data-book'));
  await page.click('.fcheck');

  await page.click('[data-book="6h"]');
  await page.check('#modalAccept'); await page.click('#modalGo');
  console.log('modal:', await page.textContent('#modalTitle'), '|', await page.getAttribute('#modalBody iframe', 'src'));
  await page.keyboard.press('Escape');

  await page.click('.fgallery__item >> nth=0');
  console.log('visor:', await page.textContent('#lbCaption'));
  await page.keyboard.press('Escape');

  console.log('video del hero:', await page.evaluate(() => document.querySelector('#heroVideo').currentSrc.split('/').pop()));
  console.log('desborde horizontal:', await page.evaluate(() => {
    const W = innerWidth;
    if (document.documentElement.scrollWidth <= W) return false;
    return [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > W + 1 && !el.closest('.fuses, .fwork__clips, .freviews__list')).slice(0, 4).map((el) => String(el.className) || el.tagName);
  }));
  await page.close();
}

// ---------- Móvil ----------
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => errors.push('mobile: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await wait(2000);
  await showAll(page);
  await page.screenshot({ path: `${OUT}/m-full.png`, fullPage: true });
  const over = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > w + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed' && !el.closest('.fuses, .freviews__list, .fwork__clips, .fplan__ribbon'); }).slice(0, 6).map((el) => el.className || el.tagName);
  });
  console.log('móvil, elementos que desbordan:', over);
  await page.close();
}

console.log('errores:', errors.length ? errors : 'ninguno');
await browser.close();
