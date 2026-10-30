// Flujo de un pedido: crear y apartar, cobrar, confirmar, vencer, cancelar,
// cambiar de fecha, hora extra, cargos y reembolsos.

import type { Carrito, Cotizacion, Cupon, Linea, ResultadoPolitica } from '../core/tipos.ts';
import { cotizar, espacioDe, precioVigente } from '../core/precios.ts';
import { ocupacionDeCarrito, validarCarrito } from '../core/disponibilidad.ts';
import { puedeCambiarFecha, resultadoCancelacion } from '../core/politicas.ts';
import { fechaLarga, fechaLocal, sumarDias } from '../core/tiempo.ts';
import { dinero, ivaIncluido, redondear } from '../core/util.ts';
import type { Ctx, Sql } from './ctx.ts';
import { ajuste, bitacora, cargarCatalogo, esEmpalme, ocupacionDe, type Negocio } from './db.ts';
import { correoValido, falla, texto } from './http.ts';
import { avisar, omitirAviso } from './correo.ts';
import {
  bloqueResumen, bloqueSesiones, carritoDeSesiones, etiquetaTarea, eventosEquipo, icsDePedido, icsEquipo, infoPedido, sesionesActivas, textoSesionCorta,
  tokenCliente, urlGoogleCalendar, urlLanding, urlMisReservas, urlPagar, urlPanelPedido, urlPedido, varsPedido, type InfoPedido,
} from './info.ts';

// deno-lint-ignore no-explicit-any
type Fila = Record<string, any>;

// ---------- Entradas ----------

const str = (v: unknown, max = 200) => (v == null ? '' : String(v).trim().slice(0, max));

export function limpiarCarrito(x: unknown): Carrito {
  const c = (x ?? {}) as Fila;
  const fecha = (v: unknown) => {
    if (!v) return null;
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };
  return {
    espacioId: str(c.espacioId, 40),
    paquete: c.paquete ? str(c.paquete, 40) : null,
    cupon: c.cupon ? str(c.cupon, 40).toUpperCase() : null,
    sesiones: (Array.isArray(c.sesiones) ? c.sesiones : []).slice(0, 20).map((s: Fila) => ({
      bloqueId: str(s?.bloqueId, 40),
      modalidadId: str(s?.modalidadId, 40),
      inicio: fecha(s?.inicio),
      extras: (Array.isArray(s?.extras) ? s.extras : []).slice(0, 10).map((e: Fila) => ({ id: str(e?.id, 40), opcion: e?.opcion ? str(e.opcion, 40) : null, texto: e?.texto ? str(e.texto, 120) : null })),
    })),
    productos: (Array.isArray(c.productos) ? c.productos : []).slice(0, 40).map((p: Fila) => ({
      id: str(p?.id, 40),
      cantidad: Math.max(0, Math.floor(Number(p?.cantidad) || 0)),
      sesion: p?.sesion == null || p?.sesion === '' ? null : Math.floor(Number(p.sesion)),
      datos: (Array.isArray(p?.datos) ? p.datos : []).slice(0, 20).map((d: Fila) => Object.fromEntries(Object.entries(d ?? {}).slice(0, 6).map(([k, v]) => [str(k, 30), str(v, 200)]))),
    })).filter((p: { cantidad: number }) => p.cantidad > 0),
  };
}

export interface DatosPedido {
  proyecto?: string;
  notas?: string;
  ingenieroCliente?: { nombre?: string; telefono?: string } | null;
  factura?: { rfc: string; razonSocial: string; regimen?: string; cp: string; usoCfdi?: string; correo?: string } | null;
}

export function limpiarDatos(x: unknown): DatosPedido {
  const d = (x ?? {}) as Fila;
  const f = d.factura as Fila | undefined;
  const ing = d.ingenieroCliente as Fila | undefined;
  return {
    proyecto: str(d.proyecto, 160) || undefined,
    notas: str(d.notas, 1000) || undefined,
    ingenieroCliente: ing && (ing.nombre || ing.telefono) ? { nombre: str(ing.nombre, 120), telefono: str(ing.telefono, 40) } : null,
    factura: f && f.rfc ? {
      rfc: texto(f.rfc, 'el RFC', { max: 13 }).toUpperCase(),
      razonSocial: texto(f.razonSocial, 'la razón social', { max: 200 }),
      regimen: str(f.regimen, 80), cp: texto(f.cp, 'el código postal fiscal', { max: 5 }), usoCfdi: str(f.usoCfdi, 80), correo: str(f.correo, 200),
    } : null,
  };
}

async function cuponValido(sql: Sql, codigo: string, espacioId: string, ahora: Date): Promise<Cupon> {
  const [c] = await sql`select * from cupones where codigo = ${codigo.toUpperCase()} and activo`;
  const t = ahora.getTime();
  if (!c || (c.espacioId && c.espacioId !== espacioId) || (c.desde && new Date(c.desde).getTime() > t) || (c.hasta && new Date(c.hasta).getTime() < t) || (c.usosMax != null && c.usos >= c.usosMax)) {
    throw falla(422, 'CUPON_INVALIDO', 'El cupón no es válido o ya venció.');
  }
  return { codigo: c.codigo, tipo: c.tipo, valor: c.valor };
}

export async function creditoDisponible(sql: Sql, correo: string, ahora: Date): Promise<number> {
  const [r] = await sql`select coalesce(sum(cr.saldo), 0) as total from creditos cr join clientes c on c.id = cr.cliente_id where c.correo = ${correo.toLowerCase()} and cr.vence > ${ahora} and cr.saldo > 0`;
  return Number(r.total);
}

/** Cotización del servidor (la misma que verá el cliente al pagar). */
export async function cotizarEnServidor(ctx: Ctx, carritoCrudo: unknown, correo?: string | null) {
  const ahora = ctx.ahora();
  const cat = await cargarCatalogo(ctx.sql, true);
  const carrito = limpiarCarrito(carritoCrudo);
  const cupon = carrito.cupon ? await cuponValido(ctx.sql, carrito.cupon, carrito.espacioId, ahora) : null;
  const credito = correo ? await creditoDisponible(ctx.sql, correo, ahora) : 0;
  return { carrito, cat, q: cotizar(carrito, cat, { ahora, cupon, creditoDisponible: credito }) };
}

// ---------- Crear ----------

export interface EntradaPedido {
  carrito: unknown;
  cliente: { nombre?: unknown; correo?: unknown; telefono?: unknown; empresa?: unknown };
  datos?: unknown;
  consentimiento?: { privacidad?: boolean; terminos?: boolean; reglamento?: boolean; promociones?: boolean };
}

export interface OpcionesPedido {
  origen: 'web' | 'panel';
  usuario?: string;
  /** Panel: cualquier hora y sin anticipación mínima. */
  libre?: boolean;
  lineasLibres?: { concepto: string; importe: number; cantidad?: number }[];
  descuento?: { concepto: string; importe: number } | null;
  apartadoMin?: number;
  accion?: 'checkout' | 'enlace' | 'pago_manual';
  pagoManual?: { metodo: 'transferencia' | 'efectivo'; referencia?: string };
}

export interface ResultadoPedido { pedidoId: string; numero: string; token: string; url: string | null; estado: string; total: number }

function totalizar(q: Cotizacion) {
  q.total = redondear(q.lineas.reduce((s, l) => s + l.importe, 0));
  q.iva = ivaIncluido(q.total);
}

export async function crearPedido(ctx: Ctx, e: EntradaPedido, op: OpcionesPedido): Promise<ResultadoPedido> {
  const { sql } = ctx;
  const ahora = ctx.ahora();
  const cliente = {
    nombre: texto(e.cliente?.nombre, 'tu nombre', { max: 120 }),
    correo: correoValido(e.cliente?.correo),
    telefono: texto(e.cliente?.telefono, 'tu WhatsApp o teléfono', { requerido: op.origen === 'web', max: 40 }) || null,
    empresa: texto(e.cliente?.empresa, 'la empresa', { requerido: false, max: 120 }) || null,
  };
  const datos = limpiarDatos(e.datos);
  const { carrito, cat, q } = await cotizarEnServidor(ctx, e.carrito, cliente.correo);
  const esp = espacioDe(cat, carrito.espacioId)!;

  if (op.origen === 'web') {
    const c = e.consentimiento ?? {};
    if (!c.privacidad || !c.terminos || (esp.documentos.reglamento && !c.reglamento)) {
      throw falla(422, 'CONSENTIMIENTO', esp.documentos.reglamento ? 'Acepta el aviso de privacidad, los términos y el reglamento para continuar.' : 'Acepta el aviso de privacidad y los términos para continuar.');
    }
  }

  // Panel: conceptos con precio libre y descuentos
  if (op.lineasLibres?.length || op.descuento) {
    const credito = q.lineas.find((l) => l.tipo === 'credito');
    q.lineas = q.lineas.filter((l) => l.tipo !== 'credito');
    for (const l of op.lineasLibres ?? []) {
      const cant = l.cantidad ?? 1;
      q.lineas.push({ tipo: 'personalizado', ref: null, concepto: texto(l.concepto, 'el concepto', { max: 200 }), cantidad: cant, precioUnitario: redondear(l.importe), importe: redondear(l.importe * cant) });
    }
    if (op.descuento && op.descuento.importe > 0) {
      q.lineas.push({ tipo: 'descuento', ref: null, concepto: op.descuento.concepto || 'Descuento', cantidad: 1, precioUnitario: -op.descuento.importe, importe: -redondear(op.descuento.importe) });
    }
    totalizar(q);
    if (credito) {
      const c = Math.min(-credito.importe, Math.max(0, q.total));
      if (c > 0) q.lineas.push({ ...credito, precioUnitario: -c, importe: -c });
      totalizar(q);
    }
    if (q.total < 0) throw falla(422, 'TOTAL_NEGATIVO', 'El descuento es mayor que el total.');
  }

  // En el panel se puede pedir el color con menos anticipación y armar pedidos solo con conceptos libres.
  const errores = q.errores.filter((x) => !(op.origen === 'panel' && ((x.codigo === 'EXTRA_ANTICIPACION' && op.libre) || (x.codigo === 'VACIO' && op.lineasLibres?.length))));
  if (errores.length) throw falla(422, errores[0].codigo, errores[0].mensaje, { errores });
  if (q.seCotiza) throw falla(422, 'SE_COTIZA', 'Tu pedido incluye algo que se cotiza aparte. Envíanos una solicitud.');

  const rangos = ocupacionDeCarrito(carrito, cat);
  if (rangos.length) {
    const desde = new Date(Math.min(...rangos.map((r) => r.inicio)) - 86400000);
    const hasta = new Date(Math.max(...rangos.map((r) => r.fin)) + 86400000);
    const existentes = await ocupacionDe(sql, esp.id, desde, hasta, ahora);
    const problemas = validarCarrito(carrito, cat, existentes, ahora, !!op.libre);
    if (problemas.length) throw falla(409, problemas[0].codigo, problemas[0].mensaje, { problemas });
  }

  const vence = new Date(ahora.getTime() + (op.apartadoMin ?? esp.pago.apartadoMin) * 60000);
  let pedidoId = '';
  let numero = '';
  let clienteId = '';
  try {
    await sql.begin(async (t: Sql) => {
      await t`delete from ocupacion where vence is not null and vence < ${ahora}`;
      const [cli] = await t`
        insert into clientes (correo, nombre, telefono, empresa, datos_fiscales)
        values (${cliente.correo}, ${cliente.nombre}, ${cliente.telefono}, ${cliente.empresa}, ${datos.factura ? t.json(datos.factura as never) : null})
        on conflict (correo) do update set
          nombre = excluded.nombre,
          telefono = coalesce(excluded.telefono, clientes.telefono),
          empresa = coalesce(excluded.empresa, clientes.empresa),
          datos_fiscales = coalesce(excluded.datos_fiscales, clientes.datos_fiscales)
        returning id`;
      clienteId = cli.id;
      // Solo se registra cuando el cliente marca la casilla; desmarcarla en
      // otra reserva no borra un permiso previo (se retira por correo o en el panel).
      if (e.consentimiento?.promociones === true) {
        await t`update clientes set acepta_promociones = true, promociones_fecha = ${ahora} where id = ${cli.id}`;
      }
      const [p] = await t`
        insert into pedidos (espacio_id, cliente_id, estado, origen, total, iva, datos, consentimiento, carrito, apartado_vence, cupon, creado_por)
        values (${esp.id}, ${cli.id}, 'apartado', ${op.origen}, ${q.total}, ${q.iva}, ${t.json(datos as never)},
          ${e.consentimiento ? t.json({ ...e.consentimiento, version: esp.documentos.version ?? null, fecha: ahora.toISOString() } as never) : null},
          ${t.json(carrito as never)}, ${vence}, ${carrito.cupon ?? null}, ${op.usuario ?? null})
        returning id, numero`;
      pedidoId = p.id;
      numero = p.numero;

      const sesionIds: string[] = [];
      for (const [i, s] of carrito.sesiones.entries()) {
        const b = cat.bloques.find((x) => x.id === s.bloqueId)!;
        const ini = new Date(s.inicio!);
        const fin = new Date(ini.getTime() + b.horas * 3600000);
        const [fila] = await t`
          insert into sesiones (pedido_id, espacio_id, bloque_id, modalidad_id, indice, inicio, fin, extras, ingeniero_cliente)
          values (${pedidoId}, ${esp.id}, ${b.id}, ${s.modalidadId}, ${i}, ${ini}, ${fin}, ${t.json((s.extras ?? []) as never)},
            ${datos.ingenieroCliente ? t.json(datos.ingenieroCliente as never) : null})
          returning id`;
        sesionIds.push(fila.id);
      }
      await insertarLineas(t, pedidoId, q.lineas, sesionIds, op.usuario);
      for (const r of rangos) {
        await t`insert into ocupacion (espacio_id, rango, tipo, pedido_id, sesion_id, vence, creado_por)
                values (${esp.id}, tstzrange(${new Date(r.inicio)}, ${new Date(r.fin)}), ${r.tipo}, ${pedidoId}, ${sesionIds[r.sesion!] ?? null}, ${vence}, ${op.usuario ?? null})`;
      }
      if (q.credito > 0) await reservarCredito(t, cli.id, pedidoId, q.credito, ahora);
    });
  } catch (err) {
    if (esEmpalme(err)) throw falla(409, 'HORARIO_OCUPADO', 'Alguien acaba de apartar ese horario. Elige otro.');
    throw err;
  }

  if (op.usuario) await bitacora(sql, op.usuario, 'crear', 'pedido', pedidoId, { total: q.total, accion: op.accion });
  const token = await tokenCliente(ctx, clienteId);
  const base = { pedidoId, numero, token, total: q.total };

  if (q.total <= 0) {
    await confirmarPago(ctx, pedidoId, { metodo: 'credito', monto: 0, usuario: op.usuario });
    return { ...base, url: urlPedido(ctx, pedidoId, token), estado: 'pagado' };
  }
  if (op.accion === 'pago_manual') {
    await confirmarPago(ctx, pedidoId, { metodo: op.pagoManual?.metodo ?? 'transferencia', monto: q.total, referencia: op.pagoManual?.referencia, usuario: op.usuario });
    return { ...base, url: urlPedido(ctx, pedidoId, token), estado: 'pagado' };
  }
  if (op.accion === 'enlace') {
    const i = await infoPedido(sql, pedidoId);
    const esp2 = i.espacio;
    await avisar(ctx, 'enlace_pago', {
      para: i.cliente.correo, pedidoId,
      vars: { ...varsPedido(i, urlPagar(ctx, pedidoId, token)), vence: `${fechaLarga(fechaLocal(vence, esp2.zonaHoraria))} a las ${vence.toLocaleTimeString('es-MX', { timeZone: esp2.zonaHoraria, hour: '2-digit', minute: '2-digit' })}` },
      bloques: { lista: bloqueSesiones(i), resumen: bloqueResumen(i), botones: [{ texto: `Pagar ${dinero(i.pedido.total)}`, url: urlPagar(ctx, pedidoId, token) }] },
    });
    return { ...base, url: urlPagar(ctx, pedidoId, token), estado: 'apartado' };
  }
  try {
    const { url } = await iniciarPago(ctx, pedidoId, token);
    return { ...base, url, estado: 'apartado' };
  } catch (err) {
    await vencerPedido(ctx, pedidoId, { avisar: false });
    throw err;
  }
}

async function insertarLineas(t: Sql, pedidoId: string, lineas: Linea[], sesionIds: string[], usuario?: string) {
  for (const [k, l] of lineas.entries()) {
    await t`insert into lineas (pedido_id, sesion_id, tipo, ref, concepto, cantidad, precio_unitario, importe, datos, orden, creado_por)
            values (${pedidoId}, ${l.sesion != null ? sesionIds[l.sesion] ?? null : null}, ${l.tipo}, ${l.ref}, ${l.concepto}, ${l.cantidad}, ${l.precioUnitario}, ${l.importe},
              ${t.json((l.datos ?? {}) as never)}, ${k}, ${usuario ?? null})`;
  }
}

async function reservarCredito(t: Sql, clienteId: string, pedidoId: string, monto: number, ahora: Date) {
  let falta = monto;
  const creditos = await t`select id, saldo from creditos where cliente_id = ${clienteId} and vence > ${ahora} and saldo > 0 order by vence for update`;
  for (const c of creditos) {
    if (falta <= 0) break;
    const usar = redondear(Math.min(c.saldo, falta));
    await t`update creditos set saldo = saldo - ${usar} where id = ${c.id}`;
    await t`insert into credito_usos (credito_id, pedido_id, monto) values (${c.id}, ${pedidoId}, ${usar})`;
    falta = redondear(falta - usar);
  }
  if (falta > 0.009) throw falla(409, 'CREDITO_CAMBIO', 'Tu saldo a favor cambió. Vuelve a intentarlo.');
}

async function actualizarTotal(t: Sql, pedidoId: string) {
  const [r] = await t`select coalesce(sum(importe), 0) as total from lineas where pedido_id = ${pedidoId}`;
  const total = redondear(Number(r.total));
  await t`update pedidos set total = ${total}, iva = ${ivaIncluido(total)}, actualizado = now() where id = ${pedidoId}`;
  return total;
}

/** Vuelve a calcular lo que ocupa el pedido en el calendario (sesiones activas + días de pintura). */
async function rehacerOcupacion(t: Sql, ctx: Ctx, pedidoId: string, vence: Date | null) {
  const cat = await cargarCatalogo(t);
  const [p] = await t`select espacio_id from pedidos where id = ${pedidoId}`;
  const sesiones = await t`select * from sesiones where pedido_id = ${pedidoId} and estado = 'activa' order by inicio`;
  await t`delete from ocupacion where pedido_id = ${pedidoId}`;
  const rangos = ocupacionDeCarrito(carritoDeSesiones(p.espacioId, sesiones), cat);
  for (const r of rangos) {
    await t`insert into ocupacion (espacio_id, rango, tipo, pedido_id, sesion_id, vence)
            values (${p.espacioId}, tstzrange(${new Date(r.inicio)}, ${new Date(r.fin)}), ${r.tipo}, ${pedidoId}, ${sesiones[r.sesion!]?.id ?? null}, ${vence})`;
  }
  void ctx;
}

// ---------- Cobro ----------

/** Abre un checkout de Stripe para el pedido (apartado) o para su saldo pendiente. */
export async function iniciarPago(ctx: Ctx, pedidoId: string, token: string): Promise<{ url: string }> {
  const { sql } = ctx;
  const ahora = ctx.ahora();
  const i = await infoPedido(sql, pedidoId);
  const { pedido: p, espacio: esp } = i;
  const deSaldo = ['pagado', 'completado'].includes(p.estado);
  if (deSaldo && i.saldo <= 0) throw falla(409, 'SIN_SALDO', 'Este pedido ya está pagado.');
  if (!deSaldo && p.estado !== 'apartado') {
    throw falla(410, p.estado === 'pendiente_pago' ? 'PAGO_EN_CURSO' : 'APARTADO_VENCIDO', p.estado === 'pendiente_pago' ? 'Ya generaste una ficha de pago en OXXO para este pedido. Revisa tu correo.' : 'El apartado de este pedido venció. Vuelve a reservar.');
  }
  if (!deSaldo && new Date(p.apartadoVence).getTime() <= ahora.getTime()) {
    await vencerPedido(ctx, pedidoId, { avisar: false });
    throw falla(410, 'APARTADO_VENCIDO', 'El apartado de este pedido venció. Vuelve a reservar.');
  }

  // Stripe pide al menos 30 minutos de vigencia; si el apartado vence antes, se extiende.
  const minimo = new Date(ahora.getTime() + 31 * 60000);
  let expira = deSaldo ? new Date(ahora.getTime() + 23 * 3600000) : new Date(Math.min(new Date(p.apartadoVence).getTime(), ahora.getTime() + 23 * 3600000));
  if (expira < minimo) {
    expira = minimo;
    if (!deSaldo) {
      await sql`update pedidos set apartado_vence = ${new Date(minimo.getTime() + 60000)} where id = ${pedidoId}`;
      await sql`update ocupacion set vence = ${new Date(minimo.getTime() + 60000)} where pedido_id = ${pedidoId} and vence is not null`;
    }
  }

  const monto = deSaldo ? i.saldo : p.total;
  const cfg = esp.pago.oxxo;
  const primera = sesionesActivas(i)[0];
  const oxxo = cfg.activo && monto <= cfg.montoMax && (deSaldo || !primera || new Date(primera.inicio).getTime() >= ahora.getTime() + cfg.diasMin * 86400000);
  const positivas = i.lineas.filter((l) => l.importe > 0);
  const negativas = redondear(-i.lineas.filter((l) => l.importe < 0).reduce((s, l) => s + l.importe, 0));

  // Cierra checkouts anteriores para que no se pague dos veces.
  const abiertos = await sql`select stripe_sesion from pagos where pedido_id = ${pedidoId} and estado = 'pendiente' and stripe_sesion is not null`;
  for (const a of abiertos) await ctx.pasarela.expirarCheckout(a.stripeSesion);
  await sql`update pagos set estado = 'fallido' where pedido_id = ${pedidoId} and estado = 'pendiente' and stripe_sesion is not null`;

  const s = await ctx.pasarela.crearCheckout({
    referencia: p.numero,
    correo: i.cliente.correo,
    descripcion: `Undying Studios · ${p.numero}`,
    lineas: deSaldo
      ? [{ concepto: `Saldo pendiente · ${p.numero}`, centavos: Math.round(monto * 100), cantidad: 1 }]
      : positivas.map((l) => ({ concepto: l.concepto, centavos: Math.round(l.importe * 100), cantidad: 1 })),
    descuentoCentavos: deSaldo ? 0 : Math.round(negativas * 100),
    oxxo,
    oxxoDias: cfg.vigenciaDias,
    msi: esp.pago.msi.activo && monto >= esp.pago.msi.montoMin,
    expira,
    exito: urlPedido(ctx, pedidoId, token),
    cancelar: deSaldo ? urlMisReservas(ctx, token) : `${urlLanding(ctx, esp.id)}?pago=cancelado&pedido=${pedidoId}&t=${encodeURIComponent(token)}`,
    metadata: { pedido_id: pedidoId, tipo: deSaldo ? 'saldo' : 'pedido' },
  });
  await sql`insert into pagos (pedido_id, metodo, monto, estado, stripe_sesion) values (${pedidoId}, 'stripe', ${monto}, 'pendiente', ${s.id})`;
  if (!deSaldo) await sql`update pedidos set stripe_sesion = ${s.id}, actualizado = now() where id = ${pedidoId}`;
  return { url: s.url };
}

export interface DatosPago {
  metodo: 'tarjeta' | 'oxxo' | 'transferencia' | 'efectivo' | 'credito';
  monto?: number;
  stripeSesion?: string;
  stripePago?: string;
  referencia?: string;
  usuario?: string;
}

/** Registra un pago y, si el pedido estaba apartado, lo confirma. Idempotente. */
export async function confirmarPago(ctx: Ctx, pedidoId: string, d: DatosPago): Promise<{ confirmado: boolean; sinHorario: boolean }> {
  const { sql } = ctx;
  const ahora = ctx.ahora();
  const cat = await cargarCatalogo(sql);
  let confirmado = false;
  let sinHorario = false;
  await sql.begin(async (t: Sql) => {
    const [p] = await t`select * from pedidos where id = ${pedidoId} for update`;
    if (!p) throw falla(404, 'NO_ENCONTRADO', 'Pedido no encontrado.');

    if (d.stripeSesion) {
      const [pg] = await t`select * from pagos where stripe_sesion = ${d.stripeSesion}`;
      if (pg?.estado === 'pagado') return;
      if (pg) await t`update pagos set estado = 'pagado', metodo = ${d.metodo}, stripe_pago = ${d.stripePago ?? null}, confirmado = ${ahora}, monto = ${d.monto ?? pg.monto} where id = ${pg.id}`;
      else await t`insert into pagos (pedido_id, metodo, monto, estado, stripe_sesion, stripe_pago, confirmado) values (${pedidoId}, ${d.metodo}, ${d.monto ?? p.total}, 'pagado', ${d.stripeSesion}, ${d.stripePago ?? null}, ${ahora})`;
    } else if (d.metodo !== 'credito') {
      await t`insert into pagos (pedido_id, metodo, monto, estado, referencia, registrado_por, confirmado) values (${pedidoId}, ${d.metodo}, ${d.monto ?? p.total}, 'pagado', ${d.referencia ?? null}, ${d.usuario ?? null}, ${ahora})`;
    }

    if (!['apartado', 'pendiente_pago', 'vencido'].includes(p.estado)) return;

    const sesiones = await t`select * from sesiones where pedido_id = ${pedidoId} and estado = 'activa' order by inicio`;
    const [{ n }] = await t`select count(*)::int as n from ocupacion where pedido_id = ${pedidoId}`;
    if (n > 0) {
      await t`update ocupacion set vence = null where pedido_id = ${pedidoId}`;
    } else if (sesiones.length) {
      try {
        await (t as unknown as { savepoint: (f: (sp: Sql) => Promise<void>) => Promise<void> }).savepoint(async (sp: Sql) => { await rehacerOcupacion(sp, ctx, pedidoId, null); });
      } catch (err) {
        if (!esEmpalme(err)) throw err;
        sinHorario = true;
        await t`update sesiones set conflicto = true where pedido_id = ${pedidoId}`;
        await t`insert into tareas (pedido_id, tipo, detalle) values (${pedidoId}, 'pago_sin_horario', 'Llegó el pago pero el horario ya estaba ocupado. Ofrece otra fecha o deja el pago como saldo a favor.')`;
      }
    }
    await t`update pedidos set estado = 'pagado', pagado_en = ${ahora}, apartado_vence = null, actualizado = ${ahora} where id = ${pedidoId}`;
    if (p.estado === 'vencido') {
      const [{ c }] = await t`select count(*)::int as c from credito_usos where pedido_id = ${pedidoId} and estado = 'liberado'`;
      if (c > 0) await t`insert into tareas (pedido_id, tipo, detalle) values (${pedidoId}, 'revisar_credito', 'El pedido se pagó después de vencer y había usado saldo a favor. Revisa el saldo del cliente.')`;
    } else {
      await t`update credito_usos set estado = 'aplicado' where pedido_id = ${pedidoId} and estado = 'reservado'`;
    }
    if (p.cupon) await t`update cupones set usos = usos + 1 where codigo = ${p.cupon}`;
    await crearTrabajosYTareas(t, ctx, p, sesiones, cat);
    confirmado = true;
  });
  if (confirmado) await avisosConfirmacion(ctx, pedidoId, sinHorario);
  return { confirmado, sinHorario };
}

// deno-lint-ignore no-explicit-any
async function crearTrabajosYTareas(t: Sql, ctx: Ctx, p: Fila, sesiones: Fila[], cat: any) {
  const lineas = await t`select * from lineas where pedido_id = ${p.id} order by orden`;
  const esp = espacioDe(cat, p.espacioId)!;
  const tz = esp.zonaHoraria;
  const porId = new Map(sesiones.map((s) => [s.id, s]));
  for (const s of sesiones) {
    const mod = cat.modalidades.find((m: Fila) => m.id === s.modalidadId);
    if (mod?.tarea) {
      await t`insert into tareas (pedido_id, sesion_id, tipo, detalle, vence) values (${p.id}, ${s.id}, ${mod.tarea},
        ${`${etiquetaTarea[mod.tarea] ?? mod.tarea} · ${textoSesionCorta(s as { inicio: Date }, tz)}`}, ${new Date(new Date(s.inicio).getTime() - 48 * 3600000)})`;
    }
  }
  for (const l of lineas) {
    const s = l.sesionId ? porId.get(l.sesionId) : null;
    if (l.tipo === 'producto') {
      const prod = cat.productos.find((x: Fila) => x.id === l.ref);
      if (!prod) continue;
      if (prod.generaTrabajo) {
        for (let k = 0; k < l.cantidad; k++) {
          const titulo = l.datos?.unidades?.[k]?.titulo ?? null;
          await t`insert into trabajos (pedido_id, linea_id, producto_id, unidad, titulo, revisiones_incluidas) values (${p.id}, ${l.id}, ${prod.id}, ${k + 1}, ${titulo}, ${prod.revisiones})`;
        }
      }
      if (prod.tarea) {
        const detalles = (l.datos?.unidades ?? []).map((u: Fila) => Object.values(u).filter(Boolean).join(' ')).filter(Boolean);
        await t`insert into tareas (pedido_id, sesion_id, tipo, detalle, vence) values (${p.id}, ${s?.id ?? null}, ${prod.tarea},
          ${`${l.concepto}${s ? ' · ' + textoSesionCorta(s as { inicio: Date }, tz) : ''}${detalles.length ? ' · ' + detalles.join(', ') : ''}`},
          ${s ? new Date(new Date(s.inicio).getTime() - 72 * 3600000) : null})`;
      }
    }
    if (l.tipo === 'extra' && l.importe > 0) {
      const ex = cat.extras.find((x: Fila) => x.id === l.ref);
      if (ex?.tarea && s) {
        const desde = ex.bloqueoAntesDias > 0 ? sumarDias(fechaLocal(new Date(s.inicio), tz), -ex.bloqueoAntesDias) : fechaLocal(new Date(s.inicio), tz);
        await t`insert into tareas (pedido_id, sesion_id, tipo, detalle, vence) values (${p.id}, ${s.id}, ${ex.tarea},
          ${`${l.concepto.replace(/ · Sesión \d+$/, '')} · listo para el ${textoSesionCorta(s as { inicio: Date }, tz)} (pintar desde el ${fechaLarga(desde, false)})`},
          ${new Date(`${desde}T12:00:00Z`)})`;
      }
    }
  }
  if (p.datos?.factura?.rfc) {
    await t`insert into tareas (pedido_id, tipo, detalle) values (${p.id}, 'emitir_factura', ${`Emitir factura a ${p.datos.factura.rfc} · ${p.datos.factura.razonSocial}`})`;
  }
  void ctx;
}

async function avisosConfirmacion(ctx: Ctx, pedidoId: string, sinHorario: boolean) {
  const i = await infoPedido(ctx.sql, pedidoId);
  const negocio = await ajuste<Negocio>(ctx.sql, 'negocio');
  const token = await tokenCliente(ctx, i.cliente.id);
  const enlace = urlMisReservas(ctx, token);
  const vars = varsPedido(i, enlace);
  const ahora = ctx.ahora();
  const pendientesCliente: string[] = [];
  if (i.trabajos.length) pendientesCliente.push('Mándanos el material de tu postproducción desde "Mis reservas" (enlace de Drive, WeTransfer o Dropbox).');
  if (i.espacio.id === 'foro' && sesionesActivas(i).length) pendientesCliente.push(`Registra a tu equipo e invitados antes de la sesión (aforo de ${i.espacio.aforo ?? 25} personas).`);
  const enSesion = i.lineas.filter((l) => l.enSesion && l.importe >= 0);
  if (enSesion.length) pendientesCliente.push(`Mándanos tus demos, tracks y referencias para ${[...new Set(enSesion.map((l) => String(l.productoNombre).toLowerCase()))].join(' y ')} desde "Mis reservas", así preparamos tu sesión.`);
  if (sesionesActivas(i).length && negocio.llegada) pendientesCliente.push(negocio.llegada);

  await avisar(ctx, 'pedido_confirmado', {
    para: i.cliente.correo, pedidoId, clave: `confirmado:${pedidoId}`,
    vars,
    bloques: {
      lista: bloqueSesiones(i),
      resumen: bloqueResumen(i),
      botones: [{ texto: 'Ver mis reservas', url: enlace }, ...(sesionesActivas(i).length && negocio.mapa ? [{ texto: 'Cómo llegar', url: negocio.mapa, secundario: true }] : [])],
      tabla: pendientesCliente.length ? { titulo: 'Antes de tu sesión', columnas: [''], filas: pendientesCliente.map((x) => [x]) } : undefined,
    },
    adjuntos: await icsDePedido(ctx, i),
  });

  const pendientes = i.tareas.filter((x) => !x.hechaEn).map((x) => `• ${x.detalle}`);
  const d = i.pedido.datos ?? {};
  await avisar(ctx, 'nuevo_pedido', {
    para: 'equipo', pedidoId, clave: `equipo-nuevo:${pedidoId}`,
    vars: { ...vars, nombre: i.cliente.nombre, enlace: urlPanelPedido(ctx, pedidoId), pendientes: pendientes.length ? `Pendientes:\n${pendientes.join('\n')}` : '' },
    bloques: {
      datos: [
        ['Cliente', i.cliente.nombre], ['Correo', i.cliente.correo], ['Teléfono', i.cliente.telefono ?? ''],
        ...(d.proyecto ? [['Proyecto', d.proyecto] as [string, string]] : []),
        ...(d.ingenieroCliente?.nombre ? [['Ingeniero del cliente', `${d.ingenieroCliente.nombre} ${d.ingenieroCliente.telefono ?? ''}`] as [string, string]] : []),
        ...(d.factura?.rfc ? [['Factura', `${d.factura.rfc} · ${d.factura.razonSocial}`] as [string, string]] : []),
        ...(d.notas ? [['Notas', d.notas] as [string, string]] : []),
      ],
      lista: bloqueSesiones(i),
      resumen: bloqueResumen(i),
      botones: [
        { texto: 'Abrir en el panel', url: urlPanelPedido(ctx, pedidoId) },
        ...eventosEquipo(ctx, i, negocio).map((e, k, xs) => ({ texto: `Agregar a Google Calendar${xs.length > 1 ? ` (sesión ${k + 1})` : ''}`, url: urlGoogleCalendar(e), secundario: true })),
      ],
    },
    adjuntos: await icsEquipo(ctx, i),
  });

  for (const tarea of i.tareas.filter((x) => x.tipo === 'programar_pintura')) {
    const s = i.sesiones.find((x) => x.id === tarea.sesionId);
    const color = tarea.detalle.split(' · ')[1] ?? '';
    await avisar(ctx, 'pintura_ciclorama', {
      para: 'equipo', pedidoId, clave: `pintura:${tarea.id}`,
      vars: { ...vars, color, fecha: s?.texto ?? '', desde: tarea.vence ? fechaLarga(new Date(tarea.vence).toISOString().slice(0, 10), false) : '' },
      bloques: { botones: [{ texto: 'Abrir en el panel', url: urlPanelPedido(ctx, pedidoId) }] },
    });
  }
  if (sinHorario) {
    await avisar(ctx, 'pago_tardio', { para: 'equipo', pedidoId, clave: `tardio:${pedidoId}`, vars: { ...vars, nombre: i.cliente.nombre }, bloques: { botones: [{ texto: 'Abrir en el panel', url: urlPanelPedido(ctx, pedidoId) }] } });
  }
  // Si la sesión es pronto, no se mandan los recordatorios que ya pasaron.
  for (const s of sesionesActivas(i)) {
    const h = (new Date(s.inicio).getTime() - ahora.getTime()) / 3600000;
    if (h < 48) await omitirAviso(ctx, `rec:48:${s.id}:${new Date(s.inicio).toISOString()}`, 'recordatorio_sesion', pedidoId);
    if (h < 24) await omitirAviso(ctx, `rec:24:${s.id}:${new Date(s.inicio).toISOString()}`, 'recordatorio_sesion', pedidoId);
  }
}

// ---------- OXXO y vencimientos ----------

export async function marcarOxxo(ctx: Ctx, pedidoId: string, d: { stripeSesion: string; stripePago: string }) {
  const { sql } = ctx;
  const ahora = ctx.ahora();
  const i = await infoPedido(sql, pedidoId);
  const ficha = await ctx.pasarela.fichaOxxo(d.stripePago);
  const vence = ficha.vence ?? new Date(ahora.getTime() + i.espacio.pago.oxxo.vigenciaDias * 86400000);
  // OXXO puede tardar hasta un día hábil en confirmar un pago hecho a tiempo.
  const apartado = new Date(vence.getTime() + 36 * 3600000);
  await sql.begin(async (t: Sql) => {
    await t`update pagos set metodo = 'oxxo', stripe_pago = ${d.stripePago}, oxxo = ${t.json({ vence: vence.toISOString(), url: ficha.url } as never)} where stripe_sesion = ${d.stripeSesion}`;
    if (i.pedido.estado === 'apartado') {
      await t`update pedidos set estado = 'pendiente_pago', apartado_vence = ${apartado}, actualizado = now() where id = ${pedidoId}`;
      await t`update ocupacion set vence = ${apartado} where pedido_id = ${pedidoId}`;
    }
  });
  const token = await tokenCliente(ctx, i.cliente.id);
  const venceTxt = `${fechaLarga(fechaLocal(vence, i.espacio.zonaHoraria))} a las ${vence.toLocaleTimeString('es-MX', { timeZone: i.espacio.zonaHoraria, hour: '2-digit', minute: '2-digit' })}`;
  const vars = { ...varsPedido(i, urlMisReservas(ctx, token)), vence: venceTxt };
  await avisar(ctx, 'ficha_oxxo', {
    para: i.cliente.correo, pedidoId, clave: `oxxo:${d.stripeSesion}`, vars,
    bloques: { lista: bloqueSesiones(i), resumen: bloqueResumen(i), botones: ficha.url ? [{ texto: 'Ver ficha de pago', url: ficha.url }] : [] },
  });
  await avisar(ctx, 'oxxo_pendiente', { para: 'equipo', pedidoId, clave: `equipo-oxxo:${d.stripeSesion}`, vars: { ...vars, nombre: i.cliente.nombre }, bloques: { botones: [{ texto: 'Abrir en el panel', url: urlPanelPedido(ctx, pedidoId) }] } });
}

export async function vencerPedido(ctx: Ctx, pedidoId: string, op: { avisar: boolean }) {
  const { sql } = ctx;
  let estadoPrevio = '';
  let stripeSesion: string | null = null;
  await sql.begin(async (t: Sql) => {
    const [p] = await t`select * from pedidos where id = ${pedidoId} for update`;
    if (!p || !['apartado', 'pendiente_pago'].includes(p.estado)) return;
    estadoPrevio = p.estado;
    stripeSesion = p.stripeSesion;
    await t`delete from ocupacion where pedido_id = ${pedidoId}`;
    await t`update pedidos set estado = 'vencido', apartado_vence = null, actualizado = now() where id = ${pedidoId}`;
    const usos = await t`update credito_usos set estado = 'liberado' where pedido_id = ${pedidoId} and estado = 'reservado' returning credito_id, monto`;
    for (const u of usos) await t`update creditos set saldo = saldo + ${u.monto} where id = ${u.creditoId}`;
    await t`update pagos set estado = 'fallido' where pedido_id = ${pedidoId} and estado = 'pendiente'`;
  });
  if (!estadoPrevio) return false;
  if (stripeSesion && estadoPrevio === 'apartado') await ctx.pasarela.expirarCheckout(stripeSesion);
  if (op.avisar) {
    const i = await infoPedido(sql, pedidoId);
    const vars = varsPedido(i, urlLanding(ctx, i.espacio.id));
    if (estadoPrevio === 'pendiente_pago' || i.pedido.origen === 'panel') {
      await avisar(ctx, 'apartado_vencido', { para: i.cliente.correo, pedidoId, clave: `vencido:${pedidoId}`, vars, bloques: { botones: [{ texto: 'Volver a reservar', url: urlLanding(ctx, i.espacio.id) }] } });
    }
    if (estadoPrevio === 'pendiente_pago') {
      await avisar(ctx, 'oxxo_vencido', { para: 'equipo', pedidoId, clave: `equipo-vencido:${pedidoId}`, vars: { ...vars, nombre: i.cliente.nombre } });
    }
  }
  return true;
}

// ---------- Cancelar ----------

/** Lo que se puede devolver o acreditar: lo pagado menos la postproducción que ya empezó. */
export function baseCancelacion(i: InfoPedido): number {
  const neto = i.cobrado - i.reembolsado;
  const iniciados = i.trabajos.filter((t) => ['en_proceso', 'entregado', 'en_revision', 'aprobado'].includes(t.estado));
  const noDevolver = iniciados.reduce((s, t) => s + (i.lineas.find((l) => l.id === t.lineaId)?.precioUnitario ?? 0), 0);
  return redondear(Math.max(0, neto - noDevolver));
}

export interface VistaCancelacion { permitido: boolean; motivo?: string; tipo?: ResultadoPolitica; monto?: number; creditoDias?: number; explicacion?: string }

export function vistaPreviaCancelacion(ctx: Ctx, i: InfoPedido): VistaCancelacion {
  const ahora = ctx.ahora();
  if (!['pagado'].includes(i.pedido.estado)) return { permitido: false, motivo: 'Este pedido no se puede cancelar en línea.' };
  const act = sesionesActivas(i);
  if (act.some((s) => new Date(s.inicio).getTime() <= ahora.getTime())) return { permitido: false, motivo: 'La sesión ya empezó o ya pasó. Escríbenos si necesitas algo.' };
  const primer = act[0] ? new Date(act[0].inicio) : null;
  const r = resultadoCancelacion(i.espacio, primer, baseCancelacion(i), ahora);
  return { permitido: true, ...r };
}

export interface OpcionesCancelar {
  por: 'cliente' | 'equipo';
  tipo?: ResultadoPolitica;
  monto?: number;
  motivo?: string;
  usuario?: string;
  avisar?: boolean;
}

export async function cancelarPedido(ctx: Ctx, pedidoId: string, op: OpcionesCancelar) {
  const { sql } = ctx;
  const ahora = ctx.ahora();
  let i = await infoPedido(sql, pedidoId);
  if (['apartado', 'pendiente_pago'].includes(i.pedido.estado)) {
    await vencerPedido(ctx, pedidoId, { avisar: false });
    return { tipo: 'nada' as ResultadoPolitica, monto: 0 };
  }
  if (i.pedido.estado !== 'pagado') throw falla(409, 'NO_CANCELABLE', 'Este pedido ya no se puede cancelar.');
  let tipo: ResultadoPolitica;
  let monto: number;
  const base = baseCancelacion(i);
  if (op.por === 'cliente') {
    const v = vistaPreviaCancelacion(ctx, i);
    if (!v.permitido) throw falla(409, 'NO_CANCELABLE', v.motivo!);
    tipo = v.tipo!;
    monto = v.monto!;
  } else {
    const act = sesionesActivas(i);
    const r = resultadoCancelacion(i.espacio, act[0] ? new Date(act[0].inicio) : null, base, ahora);
    tipo = op.tipo ?? r.tipo;
    monto = tipo === 'nada' ? 0 : redondear(Math.min(op.monto ?? base, i.cobrado - i.reembolsado));
  }
  const venceCredito = new Date(ahora.getTime() + i.espacio.politica.creditoDias * 86400000);
  await sql.begin(async (t: Sql) => {
    await t`update sesiones set estado = 'cancelada' where pedido_id = ${pedidoId} and estado = 'activa'`;
    await t`delete from ocupacion where pedido_id = ${pedidoId}`;
    await t`update trabajos set estado = 'cancelado', actualizado = now() where pedido_id = ${pedidoId} and estado in ('esperando_material', 'en_cola')`;
    await t`update tareas set hecha_en = ${ahora}, hecha_por = 'sistema', nota = 'Pedido cancelado' where pedido_id = ${pedidoId} and hecha_en is null`;
    await t`update pedidos set estado = 'cancelado', cancelado_en = ${ahora}, actualizado = ${ahora},
            cancelacion = ${t.json({ por: op.por, tipo, monto, motivo: op.motivo ?? null, usuario: op.usuario ?? null } as never)} where id = ${pedidoId}`;
    if (tipo === 'credito' && monto > 0) {
      await t`insert into creditos (cliente_id, monto, saldo, vence, pedido_origen, nota, creado_por) values (${i.cliente.id}, ${monto}, ${monto}, ${venceCredito}, ${pedidoId}, ${`Cancelación de ${i.pedido.numero}`}, ${op.usuario ?? null})`;
    }
  });
  if (op.usuario) await bitacora(sql, op.usuario, 'cancelar', 'pedido', pedidoId, { tipo, monto, motivo: op.motivo });
  if (tipo === 'reembolso' && monto > 0) await reembolsar(ctx, pedidoId, monto, { usuario: op.usuario ?? 'cliente', ajustarLineas: false, avisar: op.avisar !== false });

  if (op.avisar !== false) {
    i = await infoPedido(sql, pedidoId);
    const token = await tokenCliente(ctx, i.cliente.id);
    const resultado = tipo === 'credito' && monto > 0
      ? `${dinero(monto)} quedan como saldo a favor hasta el ${fechaLarga(fechaLocal(venceCredito, i.espacio.zonaHoraria))}. Se aplica solo cuando reserves con este correo.`
      : tipo === 'reembolso' && monto > 0 ? `Te reembolsamos ${dinero(monto)}.` : 'De acuerdo con la política de cancelación, el pago no es reembolsable.';
    const vars = { ...varsPedido(i, urlMisReservas(ctx, token)), resultado };
    await avisar(ctx, 'cancelacion', { para: i.cliente.correo, pedidoId, clave: `cancelado:${pedidoId}`, vars, bloques: { lista: { titulo: 'Sesiones canceladas', elementos: i.sesiones.map((s) => s.texto) } } });
    await avisar(ctx, 'cambio_equipo', {
      para: 'equipo', pedidoId, clave: `equipo-cancelado:${pedidoId}`,
      vars: { ...vars, nombre: i.cliente.nombre, accion: op.por === 'cliente' ? 'Cancelación del cliente' : 'Cancelación', detalle: `${resultado}${op.motivo ? `\n\nMotivo: ${op.motivo}` : ''}` },
      bloques: { lista: { elementos: i.sesiones.map((s) => s.texto) }, botones: [{ texto: 'Abrir en el panel', url: urlPanelPedido(ctx, pedidoId) }] },
    });
  }
  return { tipo, monto };
}

// ---------- Reembolsos ----------

export async function reembolsar(ctx: Ctx, pedidoId: string, monto: number, op: { usuario: string; motivo?: string; ajustarLineas: boolean; avisar?: boolean }) {
  const { sql } = ctx;
  const i = await infoPedido(sql, pedidoId);
  monto = redondear(monto);
  if (!(monto > 0) || monto > i.cobrado - i.reembolsado + 0.001) throw falla(422, 'MONTO_INVALIDO', 'El reembolso no puede ser mayor que lo pagado.');
  let falta = monto;
  const tarjetas = i.pagos.filter((p) => p.tipo === 'cobro' && p.estado === 'pagado' && p.metodo === 'tarjeta' && p.stripePago).sort((a, b) => b.monto - a.monto);
  for (const p of tarjetas) {
    if (falta <= 0) break;
    const ya = i.pagos.filter((r) => r.tipo === 'reembolso' && r.referencia === p.id).reduce((s, r) => s + r.monto, 0);
    const usar = redondear(Math.min(falta, p.monto - ya));
    if (usar <= 0) continue;
    const r = await ctx.pasarela.reembolsar(p.stripePago, Math.round(usar * 100));
    await sql`insert into pagos (pedido_id, tipo, metodo, monto, estado, stripe_pago, referencia, registrado_por, confirmado)
              values (${pedidoId}, 'reembolso', 'tarjeta', ${usar}, 'pagado', ${r.id}, ${p.id}, ${op.usuario}, now())`;
    falta = redondear(falta - usar);
  }
  if (falta > 0) {
    await sql`insert into pagos (pedido_id, tipo, metodo, monto, estado, referencia, registrado_por) values (${pedidoId}, 'reembolso', 'transferencia', ${falta}, 'pendiente', 'manual', ${op.usuario})`;
    await sql`insert into tareas (pedido_id, tipo, detalle) values (${pedidoId}, 'reembolso_manual', ${`Reembolsar ${dinero(falta)} por transferencia (el pago fue en OXXO, efectivo o transferencia). Márcalo como hecho en el pedido.`})`;
  }
  if (op.ajustarLineas) {
    await sql.begin(async (t: Sql) => {
      await t`insert into lineas (pedido_id, tipo, concepto, cantidad, precio_unitario, importe, creado_por) values (${pedidoId}, 'descuento', ${op.motivo ? `Reembolso · ${op.motivo}` : 'Reembolso'}, 1, ${-monto}, ${-monto}, ${op.usuario})`;
      await actualizarTotal(t, pedidoId);
    });
  }
  await bitacora(sql, op.usuario, 'reembolso', 'pedido', pedidoId, { monto, stripe: redondear(monto - falta), manual: falta, motivo: op.motivo });
  if (op.avisar !== false && monto - falta > 0) {
    const token = await tokenCliente(ctx, i.cliente.id);
    await avisar(ctx, 'reembolso', { para: i.cliente.correo, pedidoId, vars: { ...varsPedido(i, urlMisReservas(ctx, token)), monto: dinero(monto - falta) } });
  }
  return { stripe: redondear(monto - falta), manual: falta };
}

// ---------- Cambio de fecha ----------

export async function cambiarFecha(ctx: Ctx, pedidoId: string, sesionId: string, inicioIso: string, op: { porCliente: boolean; usuario?: string; libre?: boolean; avisar?: boolean }) {
  const { sql } = ctx;
  const ahora = ctx.ahora();
  const cat = await cargarCatalogo(sql);
  const i = await infoPedido(sql, pedidoId);
  if (i.pedido.estado !== 'pagado') throw falla(409, 'NO_MODIFICABLE', 'Solo se cambian de fecha pedidos pagados.');
  const act = sesionesActivas(i);
  const idx = act.findIndex((s) => s.id === sesionId);
  if (idx < 0) throw falla(404, 'NO_ENCONTRADO', 'Sesión no encontrada.');
  const s = act[idx];
  if (op.porCliente) {
    const v = puedeCambiarFecha(i.espacio, new Date(s.inicio), ahora);
    if (!v.permitido) throw falla(409, 'FUERA_DE_POLITICA', v.motivo!);
  }
  const nuevoInicio = new Date(inicioIso);
  if (Number.isNaN(nuevoInicio.getTime())) throw falla(422, 'FECHA_INVALIDA', 'Fecha inválida.');
  const nuevoFin = new Date(nuevoInicio.getTime() + (new Date(s.fin).getTime() - new Date(s.inicio).getTime()));
  const carrito = carritoDeSesiones(i.espacio.id, act);
  carrito.sesiones[idx] = { ...carrito.sesiones[idx], inicio: nuevoInicio.toISOString(), fin: nuevoFin.toISOString() };

  const existentes = await ocupacionDe(sql, i.espacio.id, new Date(nuevoInicio.getTime() - 10 * 86400000), new Date(nuevoFin.getTime() + 10 * 86400000), ahora, { excluirPedido: pedidoId });
  const libreSinFin = { ...carrito, sesiones: carrito.sesiones.map((x) => ({ ...x, fin: null })) };
  const problemas = validarCarrito(op.libre ? carrito : libreSinFin, cat, existentes, ahora, !!op.libre).filter((p) => p.sesion === idx);
  if (problemas.length) throw falla(409, problemas[0].codigo, problemas[0].mensaje);
  if (!op.libre) {
    const q = cotizar(carrito, cat, { ahora });
    const e = q.errores.find((x) => x.codigo === 'EXTRA_ANTICIPACION' && x.sesion === idx);
    if (e) throw falla(409, e.codigo, `${e.mensaje} Para esa fecha escríbenos y vemos opciones.`);
  }
  const anterior = s.texto;
  try {
    await sql.begin(async (t: Sql) => {
      await t`update sesiones set inicio = ${nuevoInicio}, fin = ${nuevoFin}, conflicto = false where id = ${sesionId}`;
      await rehacerOcupacion(t, ctx, pedidoId, null);
      await t`update tareas set vence = ${new Date(nuevoInicio.getTime() - 48 * 3600000)} where sesion_id = ${sesionId} and hecha_en is null and tipo <> 'programar_pintura'`;
    });
  } catch (err) {
    if (esEmpalme(err)) throw falla(409, 'HORARIO_OCUPADO', 'Ese horario ya no está disponible.');
    throw err;
  }
  await bitacora(sql, op.usuario ?? 'cliente', 'cambiar_fecha', 'pedido', pedidoId, { sesionId, de: s.inicio, a: nuevoInicio });
  if (op.avisar !== false) {
    const j = await infoPedido(sql, pedidoId);
    const token = await tokenCliente(ctx, j.cliente.id);
    const nueva = j.sesiones.find((x) => x.id === sesionId)!;
    const vars: Record<string, string> = { ...varsPedido(j, urlMisReservas(ctx, token)), fecha: nueva.texto };
    await avisar(ctx, 'cambio_fecha', { para: j.cliente.correo, pedidoId, vars, bloques: { datos: [['Antes', anterior], ['Ahora', nueva.texto]], botones: [{ texto: 'Ver mis reservas', url: vars.enlace }] }, adjuntos: await icsDePedido(ctx, j) });
    await avisar(ctx, 'cambio_equipo', {
      para: 'equipo', pedidoId, vars: { ...vars, nombre: j.cliente.nombre, accion: op.porCliente ? 'Cambio de fecha del cliente' : 'Cambio de fecha', detalle: `Antes: ${anterior}\nAhora: ${nueva.texto}` },
      bloques: { botones: [{ texto: 'Abrir en el panel', url: urlPanelPedido(ctx, pedidoId) }, ...eventosEquipo(ctx, j, await ajuste<Negocio>(sql, 'negocio')).filter((e) => e.uid === `sesion-${sesionId}`).map((e) => ({ texto: 'Agregar a Google Calendar', url: urlGoogleCalendar(e), secundario: true }))] },
      adjuntos: await icsEquipo(ctx, j),
    });
    const pintura = j.tareas.find((x) => x.sesionId === sesionId && x.tipo === 'programar_pintura' && !x.hechaEn);
    if (pintura) await avisar(ctx, 'pintura_ciclorama', { para: 'equipo', pedidoId, vars: { ...vars, color: pintura.detalle.split(' · ')[1] ?? '', desde: 'los 2 días anteriores' } });
  }
}

// ---------- Hora extra, cargos y pagos manuales ----------

export type Cobro = { modo: 'pendiente' } | { modo: 'enlace' } | { modo: 'manual'; metodo: 'transferencia' | 'efectivo' | 'tarjeta'; referencia?: string };

/** Cobra un cargo recién agregado: lo registra como pagado o manda el enlace por el saldo. */
async function cobrar(ctx: Ctx, pedidoId: string, cobro: Cobro, concepto: string, usuario: string, monto: number) {
  const i = await infoPedido(ctx.sql, pedidoId);
  if (i.saldo <= 0) return;
  if (cobro.modo === 'manual') {
    await ctx.sql`insert into pagos (pedido_id, metodo, monto, estado, referencia, registrado_por, confirmado) values (${pedidoId}, ${cobro.metodo}, ${redondear(Math.min(monto, i.saldo))}, 'pagado', ${cobro.referencia ?? null}, ${usuario}, now())`;
  } else if (cobro.modo === 'enlace') {
    const token = await tokenCliente(ctx, i.cliente.id);
    await avisar(ctx, 'cargo_pendiente', {
      para: i.cliente.correo, pedidoId,
      vars: { ...varsPedido(i, urlMisReservas(ctx, token)), monto: dinero(i.saldo), concepto },
      bloques: { resumen: bloqueResumen(i), botones: [{ texto: `Pagar ${dinero(i.saldo)}`, url: urlPagar(ctx, pedidoId, token) }] },
    });
  }
}

export async function horaExtra(ctx: Ctx, pedidoId: string, sesionId: string, horas: number, cobro: Cobro, usuario: string) {
  const { sql } = ctx;
  const ahora = ctx.ahora();
  const cat = await cargarCatalogo(sql);
  const i = await infoPedido(sql, pedidoId);
  if (i.pedido.estado !== 'pagado') throw falla(409, 'NO_MODIFICABLE', 'Solo se agregan horas a pedidos pagados.');
  const s = sesionesActivas(i).find((x) => x.id === sesionId);
  if (!s) throw falla(404, 'NO_ENCONTRADO', 'Sesión no encontrada.');
  const mod = cat.modalidades.find((m) => m.id === s.modalidadId);
  const precio = precioVigente(mod?.horaExtra, ahora);
  if (precio == null) throw falla(422, 'SIN_PRECIO', 'Esta modalidad no tiene precio de hora extra. Configúralo en el catálogo.');
  const nuevoFin = new Date(new Date(s.fin).getTime() + horas * 3600000);
  try {
    await sql.begin(async (t: Sql) => {
      await t`update sesiones set fin = ${nuevoFin} where id = ${sesionId}`;
      await rehacerOcupacion(t, ctx, pedidoId, null);
      await t`insert into lineas (pedido_id, sesion_id, tipo, ref, concepto, cantidad, precio_unitario, importe, creado_por, orden)
              values (${pedidoId}, ${sesionId}, 'hora_extra', ${mod!.id}, ${`Hora extra · ${textoSesionCorta(s, i.espacio.zonaHoraria)}`}, ${horas}, ${precio}, ${redondear(precio * horas)}, ${usuario}, 100)`;
      await actualizarTotal(t, pedidoId);
    });
  } catch (err) {
    if (esEmpalme(err)) throw falla(409, 'HORARIO_OCUPADO', 'No se puede extender: la siguiente hora está ocupada (se cuenta la hora de margen con la siguiente sesión o bloqueo).');
    throw err;
  }
  await bitacora(sql, usuario, 'hora_extra', 'pedido', pedidoId, { sesionId, horas, precio });
  await cobrar(ctx, pedidoId, cobro, `${horas} ${horas === 1 ? 'hora extra' : 'horas extra'}`, usuario, redondear(precio * horas));
}

export async function agregarCargo(ctx: Ctx, pedidoId: string, c: { concepto: string; precioUnitario: number; cantidad: number; tipoCargo?: string | null; sesionId?: string | null }, cobro: Cobro, usuario: string) {
  const { sql } = ctx;
  const [p] = await sql`select estado from pedidos where id = ${pedidoId}`;
  if (!p) throw falla(404, 'NO_ENCONTRADO', 'Pedido no encontrado.');
  if (!['pagado', 'completado'].includes(p.estado)) throw falla(409, 'NO_MODIFICABLE', 'Solo se agregan cargos a pedidos pagados.');
  await sql.begin(async (t: Sql) => {
    await t`insert into lineas (pedido_id, sesion_id, tipo, ref, concepto, cantidad, precio_unitario, importe, creado_por, orden)
            values (${pedidoId}, ${c.sesionId ?? null}, 'cargo', ${c.tipoCargo ?? null}, ${c.concepto}, ${c.cantidad}, ${c.precioUnitario}, ${redondear(c.precioUnitario * c.cantidad)}, ${usuario}, 100)`;
    await actualizarTotal(t, pedidoId);
  });
  await bitacora(sql, usuario, 'cargo', 'pedido', pedidoId, c);
  await cobrar(ctx, pedidoId, cobro, c.cantidad > 1 ? `${c.concepto} × ${c.cantidad}` : c.concepto, usuario, redondear(c.precioUnitario * c.cantidad));
}

export async function pagoManual(ctx: Ctx, pedidoId: string, d: { monto: number; metodo: 'transferencia' | 'efectivo' | 'tarjeta'; referencia?: string }, usuario: string) {
  const i = await infoPedido(ctx.sql, pedidoId);
  if (['apartado', 'pendiente_pago', 'vencido'].includes(i.pedido.estado)) {
    await confirmarPago(ctx, pedidoId, { metodo: d.metodo, monto: d.monto, referencia: d.referencia, usuario });
  } else if (['pagado', 'completado'].includes(i.pedido.estado)) {
    await ctx.sql`insert into pagos (pedido_id, metodo, monto, estado, referencia, registrado_por, confirmado) values (${pedidoId}, ${d.metodo}, ${d.monto}, 'pagado', ${d.referencia ?? null}, ${usuario}, now())`;
  } else throw falla(409, 'NO_MODIFICABLE', 'Este pedido no acepta pagos.');
  await bitacora(ctx.sql, usuario, 'pago_manual', 'pedido', pedidoId, d);
}
