// Lee la playlist de YouTube y guarda el listado en src/clips.json.
// Se usa como respaldo del carrusel y como contenido inicial mientras
// la página consulta la playlist en vivo.
//
//   node tools/sync-clips.mjs [PLAYLIST_ID]
import fs from 'node:fs';
import path from 'node:path';

const PLAYLIST = process.argv[2] || 'PL8bIl-NaTJFhAYKCqkHzfI9zW5719ob63';
const OUT = path.resolve('src/clips.json');

const html = await fetch(`https://www.youtube.com/playlist?list=${PLAYLIST}&hl=es`, {
  headers: {
    'accept-language': 'es-MX,es;q=0.9',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  },
}).then((r) => r.text());

// El JSON viene incrustado en la página; se corta contando llaves porque
// termina de formas distintas según la versión del sitio.
const start = html.indexOf('ytInitialData');
const open = html.indexOf('{', start);
let depth = 0, end = open, inStr = false, esc = false;
for (let i = open; i < html.length; i++) {
  const c = html[i];
  if (inStr) {
    if (esc) esc = false;
    else if (c === '\\') esc = true;
    else if (c === '"') inStr = false;
  } else if (c === '"') inStr = true;
  else if (c === '{') depth++;
  else if (c === '}') { depth--; if (!depth) { end = i + 1; break; } }
}
const data = JSON.parse(html.slice(open, end));

const items = [];
const seen = new Set();
(function walk(node) {
  if (!node || typeof node !== 'object') return;
  // Diseño anterior
  if (node.playlistVideoRenderer) {
    const v = node.playlistVideoRenderer;
    push(v.videoId, v.title?.runs?.[0]?.text, v.shortBylineText?.runs?.[0]?.text);
  }
  // Diseño actual (lockupViewModel)
  if (node.lockupViewModel && node.lockupViewModel.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
    const v = node.lockupViewModel;
    const meta = v.metadata?.lockupMetadataViewModel;
    push(
      v.contentId,
      meta?.title?.content,
      meta?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content,
    );
  }
  for (const k in node) walk(node[k]);
})(data);

function push(id, title, artist) {
  if (!id || !title || seen.has(id)) return;
  seen.add(id);
  items.push({ yt: id, title: title.trim(), artist: (artist || '').trim() });
}

if (!items.length) {
  console.error('No se encontraron videos. ¿Cambió el formato de YouTube o la playlist es privada?');
  process.exit(1);
}

const payload = { playlist: PLAYLIST, updated: new Date().toISOString().slice(0, 10), items };
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`${items.length} videos -> ${OUT}`);
items.slice(0, 5).forEach((i) => console.log(' -', i.title, '·', i.artist));
