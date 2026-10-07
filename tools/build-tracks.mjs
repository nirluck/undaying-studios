// Convierte los WAV de "El sonido de Undying" a AAC para la web.
//   node tools/build-tracks.mjs
// Origen: material-de-origen/tracks (masters del cliente, no se versionan).
// Destino: estudio/public/audio/*.m4a, que es lo que usa TRACKS en data.js.
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import ffmpeg from 'ffmpeg-static';

const SRC = 'material-de-origen/tracks';
const OUT = 'estudio/public/audio';
const TRACKS = {
  'illuminate.m4a': 'Astral King - Illuminate.wav',
  'dile.m4a': 'DILE PPG MIX R11.wav',
  'flashlight.m4a': 'Flashlight Master V1 48 24.wav',
  'oveja-negra.m4a': 'OVEJA NEGRA MSTR V3.wav',
  'camino-a-un-sueno.m4a': 'CaminoAUnSuenoExtendedVersionMix31_Masterchannel_20250811.wav',
};

mkdirSync(OUT, { recursive: true });
for (const [out, wav] of Object.entries(TRACKS)) {
  // AAC 256 kbps a 44.1 kHz: transparente para escuchar una mezcla y ligero
  // para la web. faststart pone el índice al inicio para que empiece a sonar
  // antes de terminar de descargar.
  execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', `${SRC}/${wav}`,
    '-vn', '-ac', '2', '-ar', '44100', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', `${OUT}/${out}`]);
  console.log(out.padEnd(24), (statSync(`${OUT}/${out}`).size / 1048576).toFixed(1), 'MB');
}
