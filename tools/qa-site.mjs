// Revisión del sitio compilado tal como quedará en el servidor.
// Sirve dist/ en la raíz y, por cada página: errores de consola, peticiones
// fallidas, enlaces internos rotos, etiquetas SEO, JSON-LD válido, imágenes
// sin alt y desbordes en móvil.
//   npm run build && node tools/qa-site.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve('dist');
const PORT = 4998;
const ORIGIN = `http://localhost:${PORT}`;
const PAGES = ['/', '/estudio/', '/foro/', '/aviso-de-privacidad/', '/estudio/terminos/'];
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (u.endsWith('/')) u += 'index.html';
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/html' });
    return res.end(fs.readFileSync(path.join(ROOT, '404.html')));
  }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT);

const browser = await chromium.launch();
const problems = [];
const report = (page, msg) => problems.push(`${page}: ${msg}`);
const links = new Set();

for (const route of PAGES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => report(route, 'error JS ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') report(route, 'consola ' + m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(ORIGIN)) report(route, `${r.status()} ${r.url().replace(ORIGIN, '')}`); });
  await page.goto(ORIGIN + route, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  // Recorre la página para que carguen las imágenes diferidas
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 700) { await page.mouse.wheel(0, 700); await page.waitForTimeout(40); }
  await page.waitForTimeout(800);

  const seo = await page.evaluate(() => {
    const meta = (n) => document.querySelector(`meta[name="${n}"], meta[property="${n}"]`)?.content || '';
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent)['@type']; } catch { return 'JSON INVÁLIDO'; } });
    return {
      title: document.title,
      description: meta('description'),
      canonical: document.querySelector('link[rel="canonical"]')?.href || '',
      robots: meta('robots'),
      ogImage: meta('og:image'),
      h1: document.querySelectorAll('h1').length,
      lang: document.documentElement.lang,
      ld,
      noAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).map((i) => i.src.split('/').pop()).slice(0, 5),
      broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc).map((i) => i.currentSrc.split('/').pop()).slice(0, 5),
      links: [...document.querySelectorAll('a[href]')].map((a) => a.href).filter((u) => u.startsWith(location.origin)),
    };
  });
  seo.links.forEach((l) => links.add(l.split('#')[0]));
  console.log(`\n${route}`);
  console.log(`  title (${seo.title.length}): ${seo.title}`);
  console.log(`  description (${seo.description.length})`);
  console.log(`  canonical: ${seo.canonical || '—'} · robots: ${seo.robots || 'index'} · h1: ${seo.h1} · lang: ${seo.lang}`);
  console.log(`  JSON-LD: ${seo.ld.join(', ') || '—'} · og:image: ${seo.ogImage ? 'sí' : '—'}`);
  if (seo.h1 !== 1) report(route, `${seo.h1} h1`);
  if (seo.title.length > 65) report(route, 'título largo');
  if (seo.description.length < 70 || seo.description.length > 165) report(route, `descripción de ${seo.description.length} caracteres`);
  if (!seo.canonical) report(route, 'sin canonical');
  if (seo.robots.includes('noindex')) report(route, 'noindex');
  if (seo.ld.includes('JSON INVÁLIDO')) report(route, 'JSON-LD inválido');
  if (seo.noAlt.length) report(route, 'imágenes sin alt: ' + seo.noAlt.join(', '));
  if (seo.broken.length) report(route, 'imágenes rotas: ' + seo.broken.join(', '));
  await page.close();

  // Móvil: desborde horizontal
  const m = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  await m.goto(ORIGIN + route, { waitUntil: 'load' });
  await m.waitForTimeout(800);
  const over = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (over > 1) report(route, `desborde horizontal en móvil de ${over}px`);
  await m.close();
}

// Enlaces internos encontrados en las páginas
for (const l of links) {
  const res = await fetch(l);
  if (res.status !== 200) report('enlaces', `${res.status} ${l.replace(ORIGIN, '')}`);
}
console.log(`\n${links.size} enlaces internos revisados`);

await browser.close();
server.close();
console.log(problems.length ? `\n${problems.length} problemas:\n- ` + problems.join('\n- ') : '\nSin problemas.');
process.exit(problems.length ? 1 : 0);
