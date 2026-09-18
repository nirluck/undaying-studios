import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const root = path.resolve(process.argv[2] || 'dist'); const PREFIX = '/estudio';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (!u.startsWith(PREFIX)) { res.writeHead(404); return res.end('outside prefix: ' + u); }
  u = u.slice(PREFIX.length) || '/'; if (u.endsWith('/')) u += 'index.html';
  const f = path.join(root, u);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404 ' + u); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(4999);
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const failed = []; page.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
page.on('pageerror', (e) => failed.push('pageerror ' + e.message));
await page.goto('http://localhost:4999/estudio/', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000);
const total = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 400) { await page.mouse.wheel(0, 400); await page.waitForTimeout(60); }
await page.waitForTimeout(1500);
await page.click('.gtab:nth-child(2)'); await page.waitForTimeout(600);
if (await page.$('.track')) { await page.click('.track[data-i="3"] .track__play'); await page.waitForTimeout(1500); }
const info = await page.evaluate(() => ({ imgs: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc).slice(0, 5), reviewsBg: getComputedStyle(document.querySelector('.reviews'), '::before').backgroundImage.slice(0, 80) }));
console.log(info); console.log('failed requests:', failed.length); failed.slice(0, 10).forEach((f) => console.log('  ', f));
await browser.close(); srv.close();
