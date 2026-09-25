// Sirve dist/ bajo /estudio/ y comprueba que la landing y la versión 01
// carguen sin peticiones fallidas, tal como quedarán en el hosting.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(process.argv[2] || 'dist');
const PREFIX = '/estudio';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (!u.startsWith(PREFIX)) { res.writeHead(404); return res.end('fuera del prefijo: ' + u); }
  u = u.slice(PREFIX.length) || '/';
  if (u.endsWith('/')) u += 'index.html';
  const f = path.join(root, u);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404 ' + u); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(4999);

const browser = await chromium.launch();
let failures = 0;
for (const [label, url] of [['landing', 'http://localhost:4999/estudio/'], ['version01', 'http://localhost:4999/estudio/version01/']]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const bad = [];
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('localhost')) bad.push(r.status() + ' ' + r.url()); });
  page.on('pageerror', (e) => bad.push('pageerror ' + e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 500) { await page.mouse.wheel(0, 500); await page.waitForTimeout(60); }
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => ({
    title: document.title,
    brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc).slice(0, 3),
  }));
  console.log(label, info, 'fallos:', bad.length);
  bad.slice(0, 5).forEach((b) => console.log('   ', b));
  failures += bad.length;
  await page.close();
}
await browser.close();
srv.close();
process.exit(failures ? 1 : 0);
