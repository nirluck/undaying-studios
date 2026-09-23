import { chromium } from 'playwright';
const OUT = 'C:/Users/Abisa/AppData/Local/Temp/claude/C--Users-Abisa-Desktop-undaying/900b0dd5-f653-42b7-9afc-893a42647ffd/scratchpad/shots';
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
// 1. Player: click first track
await page.click('#salas a, .nav__links a[href="#escucha"]');
await page.waitForTimeout(1800);
await page.click('.track[data-i="1"] .track__play');
await page.waitForTimeout(1500);
const playerState = await page.evaluate(() => ({ hidden: document.querySelector('#player').hidden, visible: document.querySelector('#player').classList.contains('is-visible'), title: document.querySelector('#pTitle').textContent, paused: document.querySelector('#audio').paused, src: document.querySelector('#audio').currentSrc }));
console.log('player', playerState);
await page.screenshot({ path: `${OUT}/i-player.png` });
// 2. Gear tab: microphones + open second accordion
await page.click('.nav__links a[href="#equipo"]'); await page.waitForTimeout(1600);
await page.click('.gtab[data-gear="microfonos"]'); await page.waitForTimeout(900);
await page.click('#gearPanel details:nth-of-type(2) summary'); await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/i-gear.png` });
// 3. Quoter: click audience card -> profile set
await page.click('.nav__links a[href="#tarifas"]'); await page.waitForTimeout(1600);
await page.click('.toggle__opt[data-mode="dryHire"]'); await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/i-pricing-dry.png` });
await page.click('.nav__cta a[href="#cotizador"]'); await page.waitForTimeout(1600);
await page.click('.qopt[data-id="banda"]'); await page.waitForTimeout(500);
await page.click('[data-extra="1"]'); await page.click('[data-extra="1"]'); await page.waitForTimeout(400);
await page.click('.qextra[data-id="master"]'); await page.waitForTimeout(800);
const q = await page.evaluate(() => ({ total: document.querySelector('#qTotal').textContent, lines: [...document.querySelectorAll('#qLines li')].map((l) => l.textContent), wa: document.querySelector('#qWa').href.slice(0, 60), book: document.querySelector('#qBook').textContent }));
console.log('quoter', q);
await page.screenshot({ path: `${OUT}/i-quoter.png` });
// 4. Modal
await page.click('#qBook'); await page.waitForTimeout(3500);
const modal = await page.evaluate(() => ({ hidden: document.querySelector('#modal').hidden, iframe: document.querySelector('#modalBody iframe')?.src, h: document.querySelector('#modalBody iframe')?.getBoundingClientRect().height }));
console.log('modal', modal);
await page.screenshot({ path: `${OUT}/i-modal.png` });
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
// 5. FAQ
await page.click('.nav__links a[href="#faq"]'); await page.waitForTimeout(1600);
await page.click('.faq__item:nth-child(2) .faq__q'); await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/i-faq.png` });
// 6. Room tab
await page.click('.nav__links a[href="#salas"]'); await page.waitForTimeout(1600);
await page.click('#rtab-control'); await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/i-room.png` });
await page.close();
// 7. Mobile drawer
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
m.on('pageerror', (e) => errors.push('[m pageerror] ' + e.message));
await m.goto('http://localhost:5173/', { waitUntil: 'networkidle' }); await m.waitForTimeout(2000);
await m.click('#burger'); await m.waitForTimeout(900);
await m.screenshot({ path: `${OUT}/i-drawer.png` });
await m.click('.drawer__links a[href="#tarifas"]'); await m.waitForTimeout(1800);
await m.screenshot({ path: `${OUT}/i-mobile-tarifas.png` });
const sw = await m.evaluate(() => document.documentElement.scrollWidth); console.log('mobile scrollWidth', sw);
await browser.close();
console.log('errors', errors.length); errors.forEach((e) => console.log('  ', e));
