// Logotipos de artistas en blanco con transparencia para la sección
// "Artistas" del estudio (estudio/public/artists/*.png).
//   node tools/build-artists.mjs
// Origen: material-de-origen/Artistas-logos/Artistas (no se versiona).
// Cada logo se dibuja en un canvas de Chromium (lee SVG, WebP, PNG y JPG) y
// se convierte según cómo viene:
//   silueta: logo sobre transparente; todo lo opaco queda blanco.
//   claro:   letras claras sobre caja oscura; solo lo claro queda blanco.
//   oscuro:  letras oscuras sobre fondo blanco; solo lo oscuro queda blanco.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'material-de-origen/Artistas-logos/Artistas';
const OUT = 'estudio/public/artists';
const LOGOS = [
  ['bomba-estereo', 'BombaEstereoLogo.png', 'silueta'],
  ['carlos-rivera', 'Carlos_Rivera.png', 'silueta'],
  ['cazzu', 'Cazzu.jpeg', 'claro'],
  ['la-bandera-pesadilla', 'LaBanderaPesadillaLogo.jpeg', 'oscuro'],
  ['gloria-trevi', 'logo-gloritatrevi-1-copy.webp', 'silueta'],
  ['kinky', 'logo-Kinky.webp', 'silueta'],
  ['los-angeles-azules', 'LosAngelesAzules.jpeg', 'oscuro'],
  ['moenia', 'Moenia_Logo.jpeg', 'claro'],
  ['ozuna', 'Ozuna_2017.webp', 'silueta'],
  ['santos-bravos', 'SantosBravos.svg', 'silueta'],
  ['yerimua', 'Yerimua_Logo.png', 'claro'],
];
const MIME = { '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg' };

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [id, file, modo] of LOGOS) {
  const data = fs.readFileSync(path.join(SRC, file)).toString('base64');
  const url = `data:${MIME[path.extname(file).toLowerCase()]};base64,${data}`;
  const png = await page.evaluate(async ({ url, modo }) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    // Los SVG se dibujan a 1200 px de ancho para tener resolución de sobra
    const w = img.naturalWidth || 1200; const h = img.naturalHeight || 400;
    const k = Math.min(1, 1600 / w);
    const c = document.createElement('canvas');
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height);
    const p = d.data;
    const suave = (v, a, b) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let i = 0; i < p.length; i += 4) {
      const lum = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255;
      let a = p[i + 3] / 255;
      if (modo === 'claro') a *= suave(lum, 0.45, 0.75);
      if (modo === 'oscuro') a *= 1 - suave(lum, 0.45, 0.8);
      p[i] = p[i + 1] = p[i + 2] = 255; p[i + 3] = Math.round(a * 255);
      if (p[i + 3] > 24) {
        const n = i / 4; const px = n % c.width; const py = (n / c.width) | 0;
        if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      }
    }
    x.putImageData(d, 0, 0);
    // Recorta al contenido y deja 240 px de alto como máximo (2x de 120)
    const cw = x1 - x0 + 1; const ch = y1 - y0 + 1;
    const s = Math.min(1, 240 / ch, 900 / cw);
    const o = document.createElement('canvas');
    o.width = Math.round(cw * s); o.height = Math.round(ch * s);
    const ox = o.getContext('2d');
    ox.imageSmoothingQuality = 'high';
    ox.drawImage(c, x0, y0, cw, ch, 0, 0, o.width, o.height);
    return { url: o.toDataURL('image/png'), w: o.width, h: o.height };
  }, { url, modo });
  fs.writeFileSync(path.join(OUT, `${id}.png`), Buffer.from(png.url.split(',')[1], 'base64'));
  console.log(id.padEnd(22), modo.padEnd(8), `${png.w}x${png.h}`, `proporción ${(png.w / png.h).toFixed(2)}`);
}
await browser.close();
