// Lista los textos visibles con tamaño de letra menor al mínimo.
//   node tools/font-audit.mjs [base] [mínimo]
//   node tools/font-audit.mjs http://localhost:4173 16
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:4173';
const MIN = Number(process.argv[3] || 16);
const browser = await chromium.launch();

for (const path of ['/estudio/', '/foro/']) {
  for (const [tag, width, height] of [['escritorio', 1440, 900], ['móvil', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(BASE + path, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const rows = await page.evaluate((min) => {
      const out = new Map();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const t = walker.currentNode.textContent.trim();
        if (!t) continue;
        const el = walker.currentNode.parentElement;
        if (!el || el.closest('script, style, [hidden], .sr-only, .lightbox, .modal, svg')) continue;
        const cs = getComputedStyle(el);
        const size = parseFloat(cs.fontSize);
        if (size >= min || cs.display === 'none' || cs.visibility === 'hidden') continue;
        const cls = (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') || el.tagName.toLowerCase();
        const parent = el.parentElement?.className && typeof el.parentElement.className === 'string' ? el.parentElement.className.split(' ')[0] : '';
        const key = `${size}px  ${parent ? parent + ' > ' : ''}${cls}`;
        if (!out.has(key)) out.set(key, t.slice(0, 40));
      }
      return [...out].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
    }, MIN);
    console.log(`\n== ${path} ${tag}: ${rows.length}`);
    rows.forEach(([k, v]) => console.log(`  ${k}  «${v}»`));
    await page.close();
  }
}
await browser.close();
