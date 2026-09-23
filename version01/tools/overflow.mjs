import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const w of [390, 360, 768, 1024]) {
  const page = await browser.newPage({ viewport: { width: w, height: 800 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const res = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth; const out = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > vw + 1 || r.left < -1) && getComputedStyle(el).position !== 'fixed') out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} left=${Math.round(r.left)} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
    });
    return { vw, sw: document.documentElement.scrollWidth, out: out.slice(0, 12) };
  });
  console.log(w, res.vw, 'scrollWidth', res.sw); res.out.forEach((o) => console.log('   ', o));
  await page.close();
}
await browser.close();
