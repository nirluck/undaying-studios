// La API completa: un solo manejador (Request → Response) que corre igual
// en Supabase Edge Functions (Deno), en el servidor local y en las pruebas.

import type { Ctx } from './ctx.ts';
import { cors, Enrutador, ErrorApi, html, json, type Solicitud } from './http.ts';
import { rutasPublicas } from './rutas-publicas.ts';
import { rutasAdmin } from './rutas-admin.ts';
import { ejecutarTareas } from './tareas.ts';
import { confirmarPago, marcarOxxo, vencerPedido } from './pedidos.ts';
import { eventoSimulado, type CheckoutSimulado, type EventoStripe } from './stripe.ts';
import { avisar } from './correo.ts';
import { dinero } from '../core/util.ts';

// deno-lint-ignore no-explicit-any
type Fila = Record<string, any>;

/** Procesa un evento de Stripe. Idempotente. */
export async function procesarEventoStripe(ctx: Ctx, ev: EventoStripe): Promise<string> {
  const [ya] = await ctx.sql`select 1 from stripe_eventos where id = ${ev.id}`;
  if (ya) return 'duplicado';
  const o = ev.data.object as Fila;
  const pedidoId: string | undefined = o?.metadata?.pedido_id;
  const pedido = pedidoId ? (await ctx.sql`select * from pedidos where id = ${pedidoId}`)[0] : null;
  switch (ev.type) {
    case 'checkout.session.completed':
      if (!pedido) break;
      if (o.payment_status === 'paid') {
        const metodo = await ctx.pasarela.metodoDePago(o.payment_intent);
        await confirmarPago(ctx, pedido.id, { metodo, monto: o.amount_total / 100, stripeSesion: o.id, stripePago: o.payment_intent });
      } else {
        await marcarOxxo(ctx, pedido.id, { stripeSesion: o.id, stripePago: o.payment_intent });
      }
      break;
    case 'checkout.session.async_payment_succeeded':
      if (pedido) await confirmarPago(ctx, pedido.id, { metodo: 'oxxo', monto: o.amount_total / 100, stripeSesion: o.id, stripePago: o.payment_intent });
      break;
    case 'checkout.session.async_payment_failed':
      await ctx.sql`update pagos set estado = 'fallido' where stripe_sesion = ${o.id} and estado = 'pendiente'`;
      if (pedido?.estado === 'pendiente_pago' && pedido.stripeSesion === o.id) await vencerPedido(ctx, pedido.id, { avisar: true });
      break;
    case 'checkout.session.expired':
      await ctx.sql`update pagos set estado = 'fallido' where stripe_sesion = ${o.id} and estado = 'pendiente'`;
      // Los pedidos de la web se liberan al cerrar el checkout. Los del panel
      // conservan su apartado hasta la fecha que eligió el equipo.
      if (pedido?.estado === 'apartado' && pedido.stripeSesion === o.id && pedido.origen === 'web') await vencerPedido(ctx, pedido.id, { avisar: false });
      break;
    case 'charge.dispute.created':
    case 'payment_intent.payment_failed': {
      const pi = o.payment_intent ?? o.id;
      const [pg] = await ctx.sql`select p.id, p.numero from pagos g join pedidos p on p.id = g.pedido_id where g.stripe_pago = ${pi} limit 1`;
      if (pg && ev.type === 'charge.dispute.created') {
        await avisar(ctx, 'pago_problema', { para: 'equipo', pedidoId: pg.id, clave: `disputa:${o.id}`, vars: { numero: pg.numero, detalle: `El cliente abrió una disputa por ${dinero((o.amount ?? 0) / 100)} en el pedido ${pg.numero}. Revísala en Stripe.` } });
      }
      break;
    }
  }
  await ctx.sql`insert into stripe_eventos (id, tipo) values (${ev.id}, ${ev.type}) on conflict do nothing`;
  return 'ok';
}

function crearEnrutador() {
  const r = new Enrutador();
  rutasPublicas(r);
  rutasAdmin(r);

  r.post('/stripe/webhook', async ({ ctx, req, texto }) => {
    const cuerpo = await texto();
    let ev: EventoStripe;
    try {
      ev = await ctx.pasarela.verificarEvento(cuerpo, req.headers.get('stripe-signature'), ctx.env.stripeWebhookSecret, ctx.ahora());
    } catch (e) {
      return json({ error: (e as Error).message }, 400);
    }
    return { recibido: await procesarEventoStripe(ctx, ev) };
  });

  r.post('/tareas', async ({ ctx, req }) => {
    if (!ctx.env.tareasSecreto || req.headers.get('x-tareas-secreto') !== ctx.env.tareasSecreto) return json({ error: 'No autorizado' }, 401);
    return ejecutarTareas(ctx);
  });

  // ---------- Solo en local: checkout simulado ----------
  r.get('/dev/checkout/:id', async ({ ctx, params }) => {
    if (!ctx.env.modoDev) return json({ error: 'No disponible' }, 404);
    const s = (ctx.pasarela as unknown as { sesiones?: Map<string, CheckoutSimulado> }).sesiones?.get(params.id);
    if (!s) return html('<p>Sesión no encontrada</p>', 404);
    const total = s.lineas.reduce((t, l) => t + l.centavos * l.cantidad, 0) - s.descuentoCentavos;
    const boton = (accion: string, txt: string, extra = '') => `<form method="post" action="${params.id}/${accion}"><button ${extra}>${txt}</button></form>`;
    return html(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Pago de prueba</title>
<style>body{font:16px system-ui;background:#f6f6f6;margin:0;padding:24px}main{max-width:460px;margin:auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 12px #0001}
li{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}ul{list-style:none;padding:0}button{width:100%;padding:12px;margin-top:10px;border-radius:8px;border:1px solid #ccc;background:#fff;font:inherit;cursor:pointer}
button.p{background:#635bff;color:#fff;border:0}small{color:#777}</style>
<main><small>Stripe simulado · solo en local</small><h2>${s.descripcion}</h2><p>${s.correo}</p>
<ul>${s.lineas.map((l) => `<li><span>${l.concepto}</span><b>${dinero(l.centavos / 100)}</b></li>`).join('')}${s.descuentoCentavos ? `<li><span>Descuento</span><b>-${dinero(s.descuentoCentavos / 100)}</b></li>` : ''}<li><b>Total</b><b>${dinero(total / 100)}</b></li></ul>
<p>Estado: ${s.estado}</p>
${s.estado === 'abierta' ? boton('tarjeta', 'Pagar con tarjeta', 'class="p"') + (s.oxxo ? boton('oxxo', 'Generar ficha OXXO') : '<p><small>OXXO no disponible para este pedido</small></p>') + boton('expirar', 'Dejar vencer el checkout') : ''}
${s.estado === 'oxxo' ? boton('oxxo-pagado', 'Simular pago en OXXO', 'class="p"') + boton('oxxo-vencido', 'Simular ficha vencida') : ''}
<p><a href="${s.cancelar}">Volver al sitio</a></p></main>`);
  });

  r.post('/dev/checkout/:id/:accion', async ({ ctx, params }) => {
    if (!ctx.env.modoDev) return json({ error: 'No disponible' }, 404);
    const s = (ctx.pasarela as unknown as { sesiones?: Map<string, CheckoutSimulado> }).sesiones?.get(params.id);
    if (!s) return html('<p>Sesión no encontrada</p>', 404);
    const ir = (url: string) => new Response(null, { status: 303, headers: { location: url } });
    switch (params.accion) {
      case 'tarjeta': s.estado = 'pagada'; await procesarEventoStripe(ctx, eventoSimulado('checkout.session.completed', s, true)); return ir(s.exito);
      case 'oxxo': s.estado = 'oxxo'; await procesarEventoStripe(ctx, eventoSimulado('checkout.session.completed', s, false)); return ir(s.exito);
      case 'oxxo-pagado': s.estado = 'pagada'; await procesarEventoStripe(ctx, eventoSimulado('checkout.session.async_payment_succeeded', s, true)); return ir(`${ctx.env.apiUrl}/dev/checkout/${s.id}`);
      case 'oxxo-vencido': s.estado = 'vencida'; await procesarEventoStripe(ctx, eventoSimulado('checkout.session.async_payment_failed', s, false)); return ir(`${ctx.env.apiUrl}/dev/checkout/${s.id}`);
      case 'expirar': s.estado = 'vencida'; await procesarEventoStripe(ctx, eventoSimulado('checkout.session.expired', s, false)); return ir(s.cancelar);
    }
    return html('Acción desconocida', 400);
  });

  r.get('/dev/correos', async ({ ctx }) => {
    if (!ctx.env.modoDev) return json({ error: 'No disponible' }, 404);
    const bandeja = (ctx.correo as unknown as { bandeja?: { para: string[]; asunto: string; html: string; fecha: Date }[] }).bandeja ?? [];
    return html(`<!doctype html><meta charset="utf-8"><title>Correos de prueba</title><style>body{font:14px system-ui;margin:0;display:grid;grid-template-columns:380px 1fr;height:100vh}
nav{overflow:auto;border-right:1px solid #ddd}a{display:block;padding:10px 14px;border-bottom:1px solid #eee;color:#222;text-decoration:none}a:hover{background:#f4f4f4}small{color:#777;display:block}iframe{width:100%;height:100%;border:0}</style>
<nav>${bandeja.map((m, i) => `<a href="#" onclick="document.querySelector('iframe').srcdoc=document.getElementById('m${i}').textContent;return false"><b>${m.asunto}</b><small>${m.para.join(', ')} · ${m.fecha.toLocaleTimeString('es-MX')}</small></a>`).join('') || '<p style="padding:14px">Sin correos todavía.</p>'}</nav>
<iframe></iframe>${bandeja.map((m, i) => `<script type="text/plain" id="m${i}">${m.html.replace(/<\/script/gi, '<\\/script')}</script>`).join('')}`);
  });

  r.post('/dev/tareas', async ({ ctx }) => (ctx.env.modoDev ? ejecutarTareas(ctx) : json({ error: 'No disponible' }, 404)));
  return r;
}

const enrutador = crearEnrutador();

export async function manejar(req: Request, ctx: Ctx): Promise<Response> {
  const encabezados = cors(req, ctx);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: encabezados });
  const url = new URL(req.url);
  const ruta = url.pathname.replace(/^\/functions\/v1/, '').replace(/^\/api(?=\/|$)/, '') || '/';
  const hallado = enrutador.buscar(req.method, ruta);
  let res: Response;
  try {
    if (!hallado) throw new ErrorApi(404, 'RUTA', 'Ruta no encontrada.');
    let cache: string | null = null;
    const texto = async () => (cache ??= await req.text());
    const s: Solicitud = {
      req, url, ctx, params: hallado.params,
      q: (k) => url.searchParams.get(k),
      texto,
      cuerpo: async () => {
        const t = await texto();
        if (!t) return {};
        try { const v = JSON.parse(t); return v && typeof v === 'object' ? v : {}; } catch { throw new ErrorApi(400, 'JSON', 'Cuerpo inválido.'); }
      },
    };
    const r = await hallado.fn(s);
    res = r instanceof Response ? r : json(r ?? { ok: true });
  } catch (e) {
    if (e instanceof ErrorApi) res = json({ error: e.message, codigo: e.codigo, datos: e.datos }, e.estado);
    else {
      console.error(req.method, ruta, e);
      res = json({ error: 'Algo salió mal. Intenta de nuevo o escríbenos por WhatsApp.', codigo: 'INTERNO' }, 500);
    }
  }
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(encabezados)) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}
