// Stripe sin SDK: llamadas REST con fetch y verificación de firmas con
// WebCrypto. Funciona igual en Deno (Supabase) y en Node (pruebas).
// La pasarela simulada se usa en local y en pruebas.

export interface LineaCheckout { concepto: string; centavos: number; cantidad: number }

export interface ParamsCheckout {
  referencia: string;
  correo: string;
  descripcion: string;
  lineas: LineaCheckout[];
  /** Descuento total en centavos (cupones y saldo a favor). */
  descuentoCentavos: number;
  oxxo: boolean;
  oxxoDias: number;
  msi: boolean;
  expira: Date;
  exito: string;
  cancelar: string;
  metadata: Record<string, string>;
}

export interface EventoStripe {
  id: string;
  type: string;
  // deno-lint-ignore no-explicit-any
  data: { object: any };
}

export interface Pasarela {
  nombre: 'stripe' | 'simulada';
  crearCheckout(p: ParamsCheckout): Promise<{ id: string; url: string }>;
  expirarCheckout(id: string): Promise<void>;
  /** Vencimiento y enlace de la ficha OXXO de un PaymentIntent. */
  fichaOxxo(paymentIntent: string): Promise<{ vence: Date | null; url: string | null }>;
  /** Método con el que se pagó un PaymentIntent: 'tarjeta' | 'oxxo'. */
  metodoDePago(paymentIntent: string): Promise<'tarjeta' | 'oxxo'>;
  reembolsar(paymentIntent: string, centavos: number): Promise<{ id: string }>;
  verificarEvento(cuerpo: string, firma: string | null, secreto: string, ahora: Date): Promise<EventoStripe>;
}

/** Codifica objetos anidados como los espera la API de Stripe (a[b][0][c]=x). */
export function formulario(obj: Record<string, unknown>, prefijo = '', out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const clave = prefijo ? `${prefijo}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'object' ? formulario(x as Record<string, unknown>, `${clave}[${i}]`, out) : out.append(`${clave}[${i}]`, String(x))));
    else if (typeof v === 'object') formulario(v as Record<string, unknown>, clave, out);
    else out.append(clave, String(v));
  }
  return out;
}

async function hmacHex(secreto: string, datos: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const f = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(datos));
  return Array.from(new Uint8Array(f), (x) => x.toString(16).padStart(2, '0')).join('');
}

export async function verificarFirma(cuerpo: string, firma: string | null, secreto: string, ahora: Date, tolerancia = 300): Promise<void> {
  if (!firma || !secreto) throw new Error('Falta la firma de Stripe');
  const partes = Object.fromEntries(firma.split(',').map((p) => p.split('=') as [string, string]));
  const t = Number(partes.t);
  const v1 = firma.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!t || !v1.length) throw new Error('Firma de Stripe incompleta');
  if (Math.abs(ahora.getTime() / 1000 - t) > tolerancia) throw new Error('Firma de Stripe fuera de tiempo');
  const esperada = await hmacHex(secreto, `${t}.${cuerpo}`);
  if (!v1.includes(esperada)) throw new Error('Firma de Stripe inválida');
}

export async function firmarParaPruebas(cuerpo: string, secreto: string, ahora: Date): Promise<string> {
  const t = Math.floor(ahora.getTime() / 1000);
  return `t=${t},v1=${await hmacHex(secreto, `${t}.${cuerpo}`)}`;
}

export function pasarelaStripe(llave: string): Pasarela {
  const llamar = async (metodo: string, ruta: string, datos?: Record<string, unknown>) => {
    const r = await fetch(`https://api.stripe.com/v1/${ruta}`, {
      method: metodo,
      headers: { authorization: `Bearer ${llave}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: datos ? formulario(datos).toString() : undefined,
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`Stripe: ${j?.error?.message ?? r.status}`);
    return j;
  };
  return {
    nombre: 'stripe',
    async crearCheckout(p) {
      let cupon: string | undefined;
      if (p.descuentoCentavos > 0) {
        const c = await llamar('POST', 'coupons', { amount_off: p.descuentoCentavos, currency: 'mxn', duration: 'once', max_redemptions: 1, name: 'Descuento y saldo a favor' });
        cupon = c.id;
      }
      const s = await llamar('POST', 'checkout/sessions', {
        mode: 'payment',
        locale: 'es-419',
        customer_email: p.correo,
        client_reference_id: p.referencia,
        expires_at: Math.floor(p.expira.getTime() / 1000),
        success_url: p.exito,
        cancel_url: p.cancelar,
        payment_method_types: p.oxxo ? ['card', 'oxxo'] : ['card'],
        payment_method_options: {
          ...(p.oxxo ? { oxxo: { expires_after_days: p.oxxoDias } } : {}),
          ...(p.msi ? { card: { installments: { enabled: true } } } : {}),
        },
        line_items: p.lineas.map((l) => ({ quantity: l.cantidad, price_data: { currency: 'mxn', unit_amount: l.centavos, product_data: { name: l.concepto.slice(0, 250) } } })),
        discounts: cupon ? [{ coupon: cupon }] : undefined,
        metadata: p.metadata,
        payment_intent_data: { description: p.descripcion, metadata: p.metadata },
      });
      return { id: s.id, url: s.url };
    },
    async expirarCheckout(id) {
      try { await llamar('POST', `checkout/sessions/${id}/expire`); } catch { /* ya vencida o pagada */ }
    },
    async fichaOxxo(pi) {
      const x = await llamar('GET', `payment_intents/${pi}`);
      const d = x?.next_action?.oxxo_display_details;
      return { vence: d?.expires_after ? new Date(d.expires_after * 1000) : null, url: d?.hosted_voucher_url ?? null };
    },
    async metodoDePago(pi) {
      const x = await llamar('GET', `payment_intents/${pi}?expand[]=payment_method`);
      return x?.payment_method?.type === 'oxxo' ? 'oxxo' : 'tarjeta';
    },
    async reembolsar(pi, centavos) {
      const r = await llamar('POST', 'refunds', { payment_intent: pi, amount: centavos });
      return { id: r.id };
    },
    async verificarEvento(cuerpo, firma, secreto, ahora) {
      await verificarFirma(cuerpo, firma, secreto, ahora);
      return JSON.parse(cuerpo);
    },
  };
}

// ---------- Simulada ----------

export interface CheckoutSimulado extends ParamsCheckout { id: string; estado: 'abierta' | 'pagada' | 'oxxo' | 'vencida' }

export function pasarelaSimulada(apiUrl: string): Pasarela & { sesiones: Map<string, CheckoutSimulado>; reembolsos: { pi: string; centavos: number }[] } {
  const sesiones = new Map<string, CheckoutSimulado>();
  const reembolsos: { pi: string; centavos: number }[] = [];
  let n = 0;
  return {
    nombre: 'simulada',
    sesiones,
    reembolsos,
    async crearCheckout(p) {
      const id = `cs_sim_${++n}_${Math.random().toString(36).slice(2, 8)}`;
      sesiones.set(id, { ...p, id, estado: 'abierta' });
      return { id, url: `${apiUrl}/dev/checkout/${id}` };
    },
    async expirarCheckout(id) {
      const s = sesiones.get(id);
      if (s && s.estado === 'abierta') s.estado = 'vencida';
    },
    async fichaOxxo(pi) {
      const s = [...sesiones.values()].find((x) => `pi_${x.id}` === pi);
      const vence = new Date((s?.expira ?? new Date()).getTime() + (s?.oxxoDias ?? 1) * 86400000);
      return { vence, url: `${apiUrl}/dev/oxxo/${pi}` };
    },
    async metodoDePago(pi) {
      const s = [...sesiones.values()].find((x) => `pi_${x.id}` === pi);
      return s?.estado === 'oxxo' ? 'oxxo' : 'tarjeta';
    },
    async reembolsar(pi, centavos) {
      reembolsos.push({ pi, centavos });
      return { id: `re_sim_${reembolsos.length}` };
    },
    async verificarEvento(cuerpo) {
      return JSON.parse(cuerpo);
    },
  };
}

/** Eventos como los manda Stripe, para la pasarela simulada. */
export function eventoSimulado(tipo: string, s: CheckoutSimulado, pagado: boolean): EventoStripe {
  return {
    id: `evt_sim_${Math.random().toString(36).slice(2)}`,
    type: tipo,
    data: {
      object: {
        id: s.id, object: 'checkout.session', payment_status: pagado ? 'paid' : 'unpaid', status: tipo === 'checkout.session.expired' ? 'expired' : 'complete',
        payment_intent: `pi_${s.id}`, metadata: s.metadata, amount_total: s.lineas.reduce((t, l) => t + l.centavos * l.cantidad, 0) - s.descuentoCentavos,
      },
    },
  };
}
