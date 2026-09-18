// Renderiza cada logotipo de tools/.logo-src a PNG transparente de 120 px de alto.
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path';
const dir = path.resolve('tools/.logo-src'); const out = path.resolve('tools/.logo-raw'); fs.mkdirSync(out, { recursive: true });
const files = fs.readdirSync(dir).filter((f) => /\.(svg|webp|png)$/.test(f));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 200 } });
for (const f of files) {
  const data = fs.readFileSync(path.join(dir, f)).toString('base64');
  const mime = f.endsWith('.svg') ? 'image/svg+xml' : 'image/webp';
  await p.setContent(`<html><body style="margin:0;background:transparent"><img id="i" style="height:120px;width:auto;display:block" src="data:${mime};base64,${data}"></body></html>`);
  await p.waitForFunction(() => document.getElementById('i').complete);
  const el = await p.$('#i');
  await el.screenshot({ path: path.join(out, f.replace(/\.\w+$/, '.png')), omitBackground: true });
  console.log(f);
}
await b.close();
