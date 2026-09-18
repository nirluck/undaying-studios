import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT = process.env.SHOTS_DIR || 'tools/.shots';
mkdirSync(OUT, { recursive: true });
const url = process.argv[2] || 'http://localhost:5173/';
const tag = process.argv[3] || '';
const views = [{ name: 'desktop', w: 1440, h: 900 }, { name: 'mobile', w: 390, h: 844, mobile: true }];
const browser = await chromium.launch();
for (const v of views) {
  const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 1, isMobile: !!v.mobile, hasTouch: !!v.mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  // scroll gradually so ScrollTrigger reveals fire
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 300) { await page.mouse.wheel(0, 300); await page.waitForTimeout(90); }
  await page.waitForTimeout(1500);
  await page.mouse.wheel(0, -total); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${tag}${v.name}-full.png`, fullPage: true });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(v.name, 'height', h, 'errors:', errors.length); errors.slice(0, 10).forEach((e) => console.log('  ', e));
  await ctx.close();
}
await browser.close();
