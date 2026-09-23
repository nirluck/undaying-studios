import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
await p.screenshot({ path: 'C:/Users/Abisa/AppData/Local/Temp/claude/C--Users-Abisa-Desktop-undaying/900b0dd5-f653-42b7-9afc-893a42647ffd/scratchpad/shots/hero-mobile.png' });
console.log(await p.evaluate(() => document.querySelector('.hero__title').innerText)); await b.close();
