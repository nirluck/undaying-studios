// Contexto de cada solicitud: base de datos, pasarela de pago, correo,
// configuración y reloj. Las pruebas y el servidor local inyectan versiones
// simuladas de la pasarela y el correo.

import postgres from 'postgres';
import type { Pasarela } from './stripe.ts';
import type { Correo } from './correo.ts';

// deno-lint-ignore no-explicit-any
export type Sql = postgres.Sql<any>;

export interface Entorno {
  /** https://undyingstudios.mx */
  sitioUrl: string;
  /** URL pública de la función: https://<proyecto>.supabase.co/functions/v1/api */
  apiUrl: string;
  origenes: string[];
  modoDev: boolean;
  stripeWebhookSecret: string;
  tareasSecreto: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  adminCorreos: string[];
  githubToken: string;
  githubRepo: string;
  githubWorkflow: string;
  remitente: string;
}

export interface Ctx {
  sql: Sql;
  env: Entorno;
  pasarela: Pasarela;
  correo: Correo;
  ahora: () => Date;
  /** Devuelve el correo del usuario de Supabase Auth dueño del token, o null. */
  verificarToken: (token: string) => Promise<string | null>;
}

export function conectar(url: string, extra: Record<string, unknown> = {}): Sql {
  return postgres(url, {
    prepare: false,
    max: 4,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
    transform: { column: { from: postgres.toCamel, to: postgres.fromCamel } },
    types: {
      numeric: { to: 1700, from: [1700], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
    },
    ...extra,
  });
}

const lista = (s: string | undefined) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

export function entornoDesde(leer: (k: string) => string | undefined): Entorno {
  return {
    sitioUrl: (leer('SITIO_URL') ?? 'https://undyingstudios.mx').replace(/\/$/, ''),
    apiUrl: (leer('API_URL') ?? `${leer('SUPABASE_URL') ?? ''}/functions/v1/api`).replace(/\/$/, ''),
    // El navegador manda el origen sin diagonal final; se quita por si viene así.
    origenes: lista(leer('ORIGENES') ?? 'https://undyingstudios.mx').map((o) => o.replace(/\/+$/, '')),
    modoDev: leer('MODO_DEV') === '1',
    stripeWebhookSecret: leer('STRIPE_WEBHOOK_SECRET') ?? '',
    tareasSecreto: leer('TAREAS_SECRETO') ?? '',
    supabaseUrl: leer('SUPABASE_URL') ?? '',
    supabaseAnonKey: leer('SUPABASE_ANON_KEY') ?? '',
    supabaseServiceKey: leer('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    adminCorreos: lista(leer('ADMIN_CORREOS')).map((c) => c.toLowerCase()),
    githubToken: leer('GITHUB_TOKEN') ?? '',
    githubRepo: leer('GITHUB_REPO') ?? '',
    githubWorkflow: leer('GITHUB_WORKFLOW') ?? 'deploy.yml',
    remitente: leer('CORREO_REMITENTE') ?? 'Undying Studios <reservas@undyingstudios.mx>',
  };
}
