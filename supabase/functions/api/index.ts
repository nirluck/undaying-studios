// Edge Function de Supabase: API de reservas de Undying Studios.
// Toda la lógica vive en ../_shared; aquí solo se arma el contexto.

import { conectar, entornoDesde, type Ctx } from '../_shared/server/ctx.ts';
import { manejar } from '../_shared/server/app.ts';
import { pasarelaSimulada, pasarelaStripe } from '../_shared/server/stripe.ts';
import { correoResend, correoSimulado } from '../_shared/server/correo.ts';
import { verificadorSupabase } from '../_shared/server/seguridad.ts';

const env = entornoDesde((k) => Deno.env.get(k));
const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';

const ctx: Ctx = {
  sql: conectar(Deno.env.get('SUPABASE_DB_URL')!, { max: 3 }),
  env,
  pasarela: stripeKey ? pasarelaStripe(stripeKey) : pasarelaSimulada(env.apiUrl),
  correo: resendKey ? correoResend(resendKey, env.remitente) : correoSimulado(),
  ahora: () => new Date(),
  verificarToken: verificadorSupabase(env.supabaseUrl, env.supabaseAnonKey),
};

if (!stripeKey && !env.modoDev) console.warn('STRIPE_SECRET_KEY no configurada: los pagos no funcionarán.');

Deno.serve((req) => manejar(req, ctx));
