// Envío de correos (Resend) con registro y sin duplicados.

import type { Ctx } from './ctx.ts';
import { ajuste, type Avisos, type Negocio } from './db.ts';
import { plantillaDef, renderizar, type Bloques } from './plantillas.ts';

export interface Adjunto { nombre: string; contenido: string; tipo: string }

export interface Mensaje {
  para: string[];
  asunto: string;
  html: string;
  texto: string;
  adjuntos?: Adjunto[];
  responderA?: string;
}

export interface Correo {
  nombre: 'resend' | 'simulado';
  enviar(m: Mensaje): Promise<void>;
}

function base64Utf8(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function correoResend(llave: string, remitente: string): Correo {
  return {
    nombre: 'resend',
    async enviar(m) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${llave}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: remitente, to: m.para, subject: m.asunto, html: m.html, text: m.texto, reply_to: m.responderA,
          attachments: m.adjuntos?.map((a) => ({ filename: a.nombre, content: base64Utf8(a.contenido), content_type: a.tipo })),
        }),
      });
      if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
    },
  };
}

export function correoSimulado(): Correo & { bandeja: (Mensaje & { fecha: Date })[] } {
  const bandeja: (Mensaje & { fecha: Date })[] = [];
  return { nombre: 'simulado', bandeja, async enviar(m) { bandeja.unshift({ ...m, fecha: new Date() }); if (bandeja.length > 200) bandeja.pop(); } };
}

export interface OpcionesAviso {
  para: string | string[] | 'equipo';
  vars: Record<string, unknown>;
  bloques?: Bloques;
  pedidoId?: string | null;
  /** Para los avisos al equipo sin pedido (visitas): a qué espacio van. */
  espacioId?: string | null;
  /** Evita mandar dos veces el mismo aviso. */
  clave?: string;
  adjuntos?: Adjunto[];
}

const unicos = (xs: string[]) => [...new Set(xs.map((x) => x.trim().toLowerCase()).filter(Boolean))];

/**
 * Destinatarios de un aviso al equipo: los del espacio del pedido (Ajustes →
 * "Avisos del estudio / del foro") y, si ese espacio no tiene, la lista general.
 * Así una reserva del estudio no le llega también a foro@ y viceversa.
 */
async function correosDelEquipo(sql: Ctx['sql'], avisos: Avisos, op: OpcionesAviso): Promise<string[]> {
  let espacio = op.espacioId ?? null;
  if (!espacio && op.pedidoId) [{ espacioId: espacio } = { espacioId: null }] = await sql`select espacio_id from pedidos where id = ${op.pedidoId}`;
  const propios = espacio ? avisos.correosEspacio?.[espacio] ?? [] : [];
  return propios.length ? propios : avisos.correosEquipo ?? [];
}

/** Manda un correo con plantilla. Nunca lanza: un correo fallido no rompe el flujo. */
export async function avisar(ctx: Ctx, plantillaId: string, op: OpcionesAviso): Promise<boolean> {
  const { sql } = ctx;
  const def = plantillaDef(plantillaId);
  if (!def) throw new Error(`Plantilla desconocida: ${plantillaId}`);
  try {
    const [negocio, avisos] = await Promise.all([ajuste<Negocio>(sql, 'negocio'), ajuste<Avisos>(sql, 'avisos')]);
    const para = unicos(op.para === 'equipo' ? await correosDelEquipo(sql, avisos, op) : (Array.isArray(op.para) ? op.para : [op.para]));
    if (!para.length) return false;
    const [ov] = await sql`select asunto, cuerpo, activo from plantillas_correo where id = ${plantillaId}`;
    const { asunto, html, texto } = renderizar(ov?.asunto ?? def.asunto, ov?.cuerpo ?? def.cuerpo, op.vars, op.bloques ?? {}, negocio);
    const omitir = ov && !ov.activo;
    const [fila] = await sql`
      insert into correos (clave, plantilla, para, asunto, estado, pedido_id)
      values (${op.clave ?? null}, ${plantillaId}, ${para.join(', ')}, ${asunto}, ${omitir ? 'omitido' : 'pendiente'}, ${op.pedidoId ?? null})
      on conflict (clave) do nothing returning id`;
    if (!fila || omitir) return false;
    try {
      await ctx.correo.enviar({ para, asunto, html, texto, adjuntos: op.adjuntos, responderA: def.para === 'cliente' ? negocio.correo : undefined });
      await sql`update correos set estado = ${ctx.correo.nombre === 'simulado' ? 'simulado' : 'enviado'} where id = ${fila.id}`;
      return true;
    } catch (e) {
      await sql`update correos set estado = 'error', error = ${String((e as Error).message).slice(0, 500)} where id = ${fila.id}`;
      console.error('Correo fallido', plantillaId, e);
      return false;
    }
  } catch (e) {
    console.error('No se pudo preparar el correo', plantillaId, e);
    return false;
  }
}

/** Marca un aviso como ya resuelto sin mandarlo (p. ej. recordatorio de 48 h en una reserva de mañana). */
export async function omitirAviso(ctx: Ctx, clave: string, plantilla: string, pedidoId?: string) {
  await ctx.sql`insert into correos (clave, plantilla, para, asunto, estado, pedido_id) values (${clave}, ${plantilla}, '', 'omitido', 'omitido', ${pedidoId ?? null}) on conflict (clave) do nothing`;
}
