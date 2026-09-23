import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 2560, height: 1200 } });
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
console.log(await p.evaluate(() => { const r = document.querySelector('.hero__frame').getBoundingClientRect(); return { width: r.width, left: r.left, right: innerWidth - r.right }; }));
await p.screenshot({ path: 'C:/Users/Abisa/AppData/Local/Temp/claude/C--Users-Abisa-Desktop-undaying/900b0dd5-f653-42b7-9afc-893a42647ffd/scratchpad/shots/hero-wide.png', clip: { x: 0, y: 0, width: 2560, height: 1100 } });
await b.close();
