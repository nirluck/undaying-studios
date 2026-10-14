// Servidor local de la API de reservas: node tools/reservas/servidor.ts
//
//   API:      http://localhost:54321/api
//   Correos:  http://localhost:54321/api/dev/correos
//   Panel:    entra con cualquier correo de ADMIN_CORREOS (admin@undying.test)
//
// Los datos se guardan en tools/reservas/.datos (bórrala para empezar de cero).
// --sitio (o SITIO_URL) apunta al sitio que abren los enlaces de los correos y
// de Stripe; por defecto `npm run preview` (http://localhost:4173).

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { crearEntorno } from './entorno.ts';
import { manejar } from '../../supabase/functions/_shared/server/app.ts';

const PUERTO = Number(process.env.PUERTO_API ?? 54321);
const carpeta = fileURLToPath(new URL('./.datos', import.meta.url));
const apiUrl = `http://localhost:${PUERTO}/api`;
const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const sitioUrl = arg('--sitio') ?? process.env.SITIO_URL ?? 'http://localhost:4173';

const e = await crearEntorno({ puertoDb: PUERTO + 1, carpeta, apiUrl, sitioUrl });

const servidor = createServer(async (req, res) => {
  try {
    const trozos: Buffer[] = [];
    for await (const t of req) trozos.push(t as Buffer);
    const cuerpo = trozos.length ? Buffer.concat(trozos) : undefined;
    const encabezados = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') encabezados.set(k, v);
    let cuerpoFinal: BodyInit | undefined = cuerpo;
    // Los formularios del checkout simulado llegan como urlencoded; la API no los necesita.
    if (cuerpo && req.headers['content-type']?.includes('application/x-www-form-urlencoded')) cuerpoFinal = undefined;
    const r = await manejar(new Request(`http://localhost:${PUERTO}${req.url}`, { method: req.method, headers: encabezados, body: cuerpoFinal }), e.ctx);
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end('Error');
  }
});

servidor.listen(PUERTO, () => {
  console.log(`API de reservas en ${apiUrl}`);
  console.log(`Correos de prueba en ${apiUrl}/dev/correos`);
  console.log(`Sitio de los enlaces: ${sitioUrl}`);
});

// Tareas programadas cada minuto, como pg_cron en Supabase.
setInterval(() => {
  manejar(new Request(`${apiUrl}/tareas`, { method: 'POST', headers: { 'x-tareas-secreto': 'secreto-local' } }), e.ctx).catch(console.error);
}, 60000);

const salir = async () => { servidor.close(); await e.cerrar(); process.exit(0); };
process.on('SIGINT', salir);
process.on('SIGTERM', salir);
