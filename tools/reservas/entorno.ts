// Entorno local del sistema de reservas sin Docker: Postgres en PGlite
// (WASM) expuesto por socket, Stripe y correo simulados. Lo usan el
// servidor de desarrollo y las pruebas.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { conectar, entornoDesde, type Ctx } from '../../supabase/functions/_shared/server/ctx.ts';
import { pasarelaSimulada } from '../../supabase/functions/_shared/server/stripe.ts';
import { correoSimulado } from '../../supabase/functions/_shared/server/correo.ts';

const raiz = fileURLToPath(new URL('../../supabase/', import.meta.url));

export interface OpcionesEntorno {
  puertoDb: number;
  /** Carpeta para conservar los datos entre ejecuciones. Sin ella, todo en memoria. */
  carpeta?: string;
  apiUrl: string;
  sitioUrl: string;
  ahora?: () => Date;
}

export async function crearEntorno(op: OpcionesEntorno) {
  const nueva = !op.carpeta || !existsSync(op.carpeta);
  const db = await PGlite.create({ dataDir: op.carpeta, extensions: { btree_gist } });
  if (nueva) {
    for (const f of readdirSync(raiz + 'migrations').filter((x) => x.endsWith('.sql')).sort()) {
      await db.exec(readFileSync(raiz + 'migrations/' + f, 'utf8'));
    }
    await db.exec(readFileSync(raiz + 'seed.sql', 'utf8'));
  }
  const servidor = new PGLiteSocketServer({ db, port: op.puertoDb, host: '127.0.0.1' });
  await servidor.start();
  const sql = conectar(`postgres://postgres:postgres@127.0.0.1:${op.puertoDb}/postgres`, { max: 1 });
  const pasarela = pasarelaSimulada(op.apiUrl);
  const correo = correoSimulado();
  const env = entornoDesde((k) => ({
    SITIO_URL: op.sitioUrl,
    API_URL: op.apiUrl,
    ORIGENES: op.sitioUrl,
    MODO_DEV: '1',
    TAREAS_SECRETO: 'secreto-local',
    ADMIN_CORREOS: 'admin@undying.test',
    STRIPE_WEBHOOK_SECRET: 'whsec_local',
  } as Record<string, string>)[k]);
  const ctx: Ctx = {
    sql, env, pasarela, correo,
    ahora: op.ahora ?? (() => new Date()),
    verificarToken: async () => null,
  };
  return {
    ctx, db, pasarela, correo,
    async cerrar() {
      await sql.end({ timeout: 1 });
      await servidor.stop();
      await db.close();
    },
  };
}
