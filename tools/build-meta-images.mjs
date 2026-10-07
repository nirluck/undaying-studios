// Genera los íconos (favicon, apple-touch-icon) y las imágenes para compartir
// (Open Graph, 1200×630) de las tres páginas, con la tipografía de la marca.
//   node tools/build-meta-images.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve('.');
const file = (p) => pathToFileURL(path.join(root, p)).href;
const svg = fs.readFileSync('home/public/brand/monograma-blanco.svg', 'utf8')
  .replace(/<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/, '');

const fonts = `
  @font-face { font-family: Norwester; src: url(${file('shared/fonts/norwester.woff2')}); }
  @font-face { font-family: Wix; src: url(${file('shared/fonts/wix-madefor-display.woff2')}); font-weight: 400 800; }
  @font-face { font-family: Montserrat; src: url(${file('shared/fonts/montserrat.woff2')}); font-weight: 400 600; }`;

const browser = await chromium.launch();
const tmp = path.join(root, 'tools', '.meta-tmp.html');
async function render(page, html) {
  fs.writeFileSync(tmp, html);
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
}

// ---------- Íconos ----------
async function icon(size, out, { pad = 0.18, bg = '#1b1f21', radius = 0 } = {}) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await render(page, `<style>html,body{margin:0;background:transparent}
    .i{width:${size}px;height:${size}px;background:${bg};border-radius:${radius}px;display:grid;place-items:center}
    .i svg{width:${Math.round(size * (1 - pad * 2))}px;height:auto}</style><div class="i">${svg}</div>`);
  await page.screenshot({ path: out, omitBackground: true });
  await page.close();
}

// ---------- Imágenes para compartir ----------
async function og({ out, photos, eyebrow, title, sub }) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const media = photos.length === 1
    ? `<img class="full" src="${file(photos[0])}">`
    : `<div class="split"><img src="${file(photos[0])}"><img src="${file(photos[1])}"></div>`;
  await render(page, `<style>${fonts}
    *{box-sizing:border-box} html,body{margin:0}
    .card{position:relative;width:1200px;height:630px;overflow:hidden;background:#1b1f21;font-family:Montserrat}
    .full,.split{position:absolute;inset:0;width:100%;height:100%}
    .full{object-fit:cover}
    .split{display:grid;grid-template-columns:1fr 1fr}
    .split img{width:100%;height:100%;object-fit:cover}
    .split img:first-child{filter:brightness(.62) contrast(1.08)}
    .split::after{content:"";position:absolute;left:50%;top:0;bottom:0;width:2px;background:linear-gradient(#0000,#eb9050)}
    .shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(18,21,23,.92) 0%,rgba(18,21,23,.55) 48%,rgba(18,21,23,.1) 100%),linear-gradient(0deg,rgba(18,21,23,.7),transparent 50%)}
    .body{position:absolute;left:72px;bottom:64px;right:72px;color:#fff}
    .brand{display:flex;align-items:center;gap:16px;margin-bottom:40px}
    .brand svg{width:64px;height:auto}
    .brand span{font-family:Norwester;font-size:30px;letter-spacing:.06em}
    .brand span i{font-style:normal;color:#9d9892}
    .eyebrow{font-family:Norwester;font-size:22px;letter-spacing:.18em;color:#eb9050;margin-bottom:14px}
    h1{font-family:Wix;font-weight:800;font-size:64px;line-height:1.02;letter-spacing:-.02em;margin:0 0 18px;max-width:880px}
    p{font-size:24px;color:#d4d1cd;margin:0;max-width:820px;line-height:1.4}
  </style>
  <div class="card">${media}<div class="shade"></div>
    <div class="body">
      <div class="brand">${svg}<span>UNDYING <i>STUDIOS</i></span></div>
      <div class="eyebrow">${eyebrow}</div>
      <h1>${title}</h1>
      <p>${sub}</p>
    </div>
  </div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
  await page.close();
  console.log(out, Math.round(fs.statSync(out).size / 1024), 'KB');
}

for (const dir of ['home/public', 'estudio/public', 'foro/public']) {
  await icon(32, `${dir}/favicon-32.png`, { pad: 0.08, radius: 6 });
  await icon(180, `${dir}/apple-touch-icon.png`, { pad: 0.2 });
}
await icon(192, 'home/public/icon-192.png', { pad: 0.2 });
await icon(512, 'home/public/icon-512.png', { pad: 0.2 });

await og({
  out: 'home/public/og-home.jpg',
  photos: ['foro/public/img/podcast-1600.webp', 'estudio/public/img/live-12-1600.webp'],
  eyebrow: 'NAUCALPAN · A 30 MIN DE LA CDMX',
  title: 'Foro audiovisual y estudio de grabación',
  sub: 'Dos espacios de producción en la misma sede.',
});
await og({
  out: 'estudio/public/og-estudio.jpg',
  photos: ['estudio/public/img/live-12-1600.webp'],
  eyebrow: 'ESTUDIO DE GRABACIÓN',
  title: 'Graba, mezcla y masteriza a 30 minutos de la CDMX',
  sub: 'Live Room de 34 m², sesiones con ingeniero o Dry Hire y mezcla y máster analógico.',
});
await og({
  out: 'foro/public/og-foro.jpg',
  photos: ['foro/public/img/podcast-1600.webp'],
  eyebrow: 'FORO AUDIOVISUAL',
  title: 'Renta un foro con ciclorama a 30 minutos de la CDMX',
  sub: '72 m² con ciclorama blanco en U, zona de fondo negro, iluminación y planta de luz.',
});

await browser.close();
fs.rmSync(tmp, { force: true });
