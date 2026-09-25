// Capturas y pruebas del home. Requiere `npm run dev:home` corriendo.
//   node tools/home-shoot.mjs [url]
import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = process.argv[2] || 'http://localhost:5175/';
const OUT = 'tools/.shots/home';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const split = (page) => page.evaluate(() => Number(getComputedStyle(document.getElementById('stage')).getPropertyValue('--split')));

async function desktop(w, h, tag) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  await page.goto(URL, { waitUntil: 'load' });
  await wait(5200); // entrada + pista de la perilla
  await page.screenshot({ path: `${OUT}/${tag}-rest.png` });
  console.log(tag, 'reposo', await split(page));

  await page.mouse.move(w * 0.2, h * 0.55);
  await wait(1400);
  await page.screenshot({ path: `${OUT}/${tag}-foro.png` });
  console.log(tag, 'cursor foro', await split(page));

  await page.mouse.move(w * 0.85, h * 0.55);
  await wait(1400);
  await page.screenshot({ path: `${OUT}/${tag}-estudio.png` });
  console.log(tag, 'cursor estudio', await split(page));

  const k = await page.locator('#knob').boundingBox();
  await page.mouse.move(k.x + k.width / 2, k.y + k.height / 2);
  await page.mouse.down();
  await page.mouse.move(w * 0.8, k.y + 10, { steps: 12 });
  await page.mouse.up();
  await wait(900);
  await page.screenshot({ path: `${OUT}/${tag}-drag.png` });
  console.log(tag, 'arrastre a 80%', await split(page), 'aria', await page.locator('#knob').getAttribute('aria-valuetext'));

  const hrefs = await page.$$eval('.panel', (els) => els.map((e) => e.href));
  console.log(tag, 'enlaces', hrefs.join(' | '));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log(tag, 'desborde horizontal', overflow);
  await page.close();
}

async function mobile() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => errors.push(`mobile: ${e.message}`));
  await page.goto(URL, { waitUntil: 'load' });
  await wait(2800);
  await page.screenshot({ path: `${OUT}/mobile.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log('mobile desborde horizontal', overflow);
  await page.close();
}

await desktop(1440, 900, 'd1440');
await desktop(1920, 1080, 'd1920');
await desktop(1280, 680, 'd1280');
await mobile();
await browser.close();
console.log('errores', errors.length, errors);
