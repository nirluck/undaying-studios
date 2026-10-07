// Captura la página del foro en WordPress (referencia para la migración).
// Uso: node tools/shoot-original.mjs [url] [carpeta]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.argv[2] || 'https://undyingstudios.mx/';
const OUT = process.argv[3] || 'tools/.shots/original';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const [tag, width, height] of [['d1440', 1440, 900], ['mobile', 390, 844]]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
  // Recorre la página para disparar las animaciones de entrada y la carga diferida
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += height / 2) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0, i = 0; y < h; y += height, i++) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${tag}-${String(i).padStart(2, '0')}.png` });
  }
  console.log(tag, 'alto', h);
  await page.close();
}
await browser.close();
