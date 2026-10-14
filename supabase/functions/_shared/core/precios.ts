// Motor de precios. Función pura: el navegador la usa para mostrar el total
// al momento y la API la vuelve a correr para cobrar. Nunca se cobra el
// total que manda el navegador.

import type { Bloque, Carrito, Catalogo, Cotizacion, Cupon, Espacio, Extra, Linea, Modalidad, PrecioProgramado, Problema, SesionCarrito } from './tipos.ts';
import { diasEntre, fechaLocal } from './tiempo.ts';
import { dinero, horasTexto, ivaIncluido, redondear } from './util.ts';

export function precioVigente(p: PrecioProgramado | undefined | null, ahora: Date): number | null {
  if (!p) return null;
  if (p.nuevo != null && p.desde && new Date(p.desde).getTime() <= ahora.getTime()) return Number(p.nuevo);
  return p.precio == null ? null : Number(p.precio);
}

export const espacioDe = (c: Catalogo, id: string) => c.espacios.find((e) => e.id === id);
export const bloquesDe = (c: Catalogo, espacioId: string) => c.bloques.filter((b) => b.espacioId === espacioId && b.activo).sort((a, b) => a.orden - b.orden);
export const modalidadesDe = (c: Catalogo, espacioId: string) => c.modalidades.filter((m) => m.espacioId === espacioId && m.activo).sort((a, b) => a.orden - b.orden);
export const extrasDe = (c: Catalogo, espacioId: string) => c.extras.filter((x) => x.espacioId === espacioId && x.activo).sort((a, b) => a.orden - b.orden);
export const productosDe = (c: Catalogo, espacioId: string) => c.productos.filter((p) => p.espacioId === espacioId && p.activo).sort((a, b) => a.orden - b.orden);

/** Extras que se pueden agregar a un bloque. */
export const extrasDeBloque = (c: Catalogo, bloque: Bloque) => extrasDe(c, bloque.espacioId).filter((x) => !x.bloques || x.bloques.includes(bloque.id));

/** Porcentaje de ahorro contra la tarifa por hora del bloque más corto. */
export function ahorroBloque(c: Catalogo, bloque: Bloque, modalidadId: string, ahora: Date): number {
  const base = bloquesDe(c, bloque.espacioId)[0];
  if (!base || base.id === bloque.id) return 0;
  const pBase = precioVigente(base.precios[modalidadId], ahora);
  const p = precioVigente(bloque.precios[modalidadId], ahora);
  if (pBase == null || p == null) return 0;
  const regular = (pBase / base.horas) * bloque.horas;
  return regular > p ? Math.round((1 - p / regular) * 100) : 0;
}

export function conceptoSesion(e: Espacio, b: Bloque, m: Modalidad): string {
  return `${e.nombreCorto} · ${horasTexto(b.horas)}${m.descripcionCorta ? ' ' + m.descripcionCorta : ''}`;
}

export function finDeSesion(inicio: string | Date, horas: number): Date {
  return new Date(new Date(inicio).getTime() + horas * 3600000);
}

export function claveExtra(x: { id: string; opcion?: string | null; texto?: string | null }) {
  return `${x.id}|${x.opcion ?? ''}|${(x.texto ?? '').trim().toLowerCase()}`;
}

/**
 * Para extras que se hacen una vez por racha (pintar el ciclorama), indica si
 * una sesión continúa la racha de la anterior o la siguiente: mismo extra y
 * misma opción en días seguidos dentro del mismo pedido.
 */
export function rachas(carrito: Carrito, catalogo: Catalogo): Map<string, { previa: boolean; siguiente: boolean }> {
  const res = new Map<string, { previa: boolean; siguiente: boolean }>();
  const esp = espacioDe(catalogo, carrito.espacioId);
  if (!esp) return res;
  const tz = esp.zonaHoraria;
  const conFecha = carrito.sesiones
    .map((s, i) => ({ s, i, b: catalogo.bloques.find((b) => b.id === s.bloqueId) }))
    .filter((x) => x.s.inicio && x.b)
    .sort((a, b) => new Date(a.s.inicio!).getTime() - new Date(b.s.inicio!).getTime());
  const ultima = new Map<string, { i: number; diaFin: string }>();
  for (const { s, i, b } of conFecha) {
    const ini = new Date(s.inicio!);
    const fin = s.fin ? new Date(s.fin) : finDeSesion(ini, b!.horas);
    const dia = fechaLocal(ini, tz);
    for (const x of s.extras ?? []) {
      const ex = catalogo.extras.find((e) => e.id === x.id);
      if (!ex?.unaVezPorRacha) continue;
      const k = claveExtra(x);
      const prev = ultima.get(k);
      const clave = `${i}:${x.id}`;
      const actual = res.get(clave) ?? { previa: false, siguiente: false };
      if (prev && diasEntre(prev.diaFin, dia) <= 1) {
        actual.previa = true;
        const p = res.get(`${prev.i}:${x.id}`);
        if (p) p.siguiente = true;
      }
      res.set(clave, actual);
      ultima.set(k, { i, diaFin: fechaLocal(new Date(fin.getTime() - 1), tz) });
    }
  }
  return res;
}

export interface OpcionesCotizar {
  ahora: Date;
  cupon?: Cupon | null;
  creditoDisponible?: number;
}

export function cotizar(carrito: Carrito, catalogo: Catalogo, op: OpcionesCotizar): Cotizacion {
  const errores: Problema[] = [];
  const avisos: Problema[] = [];
  const lineas: Linea[] = [];
  let seCotiza = false;
  const vacia = (): Cotizacion => ({ lineas, subtotal: 0, descuento: 0, credito: 0, total: 0, iva: 0, seCotiza, pagable: false, errores, avisos, oxxo: { disponible: false }, msi: false });

  const esp = espacioDe(catalogo, carrito.espacioId);
  if (!esp || !esp.activo || !esp.reservable) {
    errores.push({ codigo: 'ESPACIO', mensaje: 'Este espacio no se puede reservar en línea.' });
    return vacia();
  }
  const sesiones: SesionCarrito[] = carrito.sesiones ?? [];
  const productos = carrito.productos ?? [];
  if (!sesiones.length && !productos.length) {
    errores.push({ codigo: 'VACIO', mensaje: 'Agrega horas o algún servicio a tu pedido.' });
    return vacia();
  }
  if (sesiones.length > 1 && !esp.variasSesiones) errores.push({ codigo: 'VARIAS_SESIONES', mensaje: 'Este espacio se reserva una sesión a la vez.' });
  if (sesiones.length > 20) errores.push({ codigo: 'DEMASIADAS', mensaje: 'Un pedido puede tener hasta 20 sesiones.' });

  const tz = esp.zonaHoraria;
  const hoy = fechaLocal(op.ahora, tz);
  const racha = rachas(carrito, catalogo);
  const nSes = (i: number) => (sesiones.length > 1 ? ` · Sesión ${i + 1}` : '');

  sesiones.forEach((s, i) => {
    const bloque = catalogo.bloques.find((b) => b.id === s.bloqueId && b.espacioId === esp.id && b.activo);
    const mod = catalogo.modalidades.find((m) => m.id === s.modalidadId && m.espacioId === esp.id && m.activo);
    const precio = bloque && mod ? precioVigente(bloque.precios[mod.id], op.ahora) : null;
    if (!bloque || !mod || precio == null) {
      errores.push({ codigo: 'SESION_INVALIDA', mensaje: `La sesión ${i + 1} tiene un bloque o modalidad que ya no está disponible.`, sesion: i });
      return;
    }
    lineas.push({ tipo: 'sesion', ref: bloque.id, concepto: conceptoSesion(esp, bloque, mod) + nSes(i), cantidad: 1, precioUnitario: precio, importe: precio, sesion: i, datos: { modalidad: mod.id } });
    if (!s.inicio) errores.push({ codigo: 'FALTA_FECHA', mensaje: sesiones.length > 1 ? `Elige fecha y hora de la sesión ${i + 1}.` : 'Elige fecha y hora de tu sesión.', sesion: i });

    const vistos = new Set<string>();
    for (const x of s.extras ?? []) {
      if (vistos.has(x.id)) continue;
      vistos.add(x.id);
      const ex: Extra | undefined = catalogo.extras.find((e) => e.id === x.id && e.espacioId === esp.id && e.activo);
      if (!ex) { errores.push({ codigo: 'EXTRA_INVALIDO', mensaje: 'Uno de los extras ya no está disponible.', sesion: i, extra: x.id }); continue; }
      if (ex.bloques && !ex.bloques.includes(bloque.id)) {
        const permitidos = ex.bloques.map((id) => catalogo.bloques.find((b) => b.id === id)).filter(Boolean).map((b) => horasTexto(b!.horas));
        errores.push({ codigo: 'EXTRA_BLOQUE', mensaje: `${ex.nombre} solo está disponible en ${permitidos.length === 1 ? 'el bloque de ' + permitidos[0] : 'los bloques de ' + permitidos.join(', ')}.`, sesion: i, extra: ex.id });
        continue;
      }
      let detalle = '';
      if (ex.opciones.length) {
        const opc = ex.opciones.find((o) => o.id === x.opcion);
        if (!opc) { errores.push({ codigo: 'EXTRA_OPCION', mensaje: `Elige una opción de ${ex.nombre.toLowerCase()}.`, sesion: i, extra: ex.id }); continue; }
        if (opc.pideTexto && !(x.texto ?? '').trim()) { errores.push({ codigo: 'EXTRA_TEXTO', mensaje: opc.ayuda ?? 'Escribe el detalle de la opción.', sesion: i, extra: ex.id }); continue; }
        detalle = opc.pideTexto ? (x.texto ?? '').trim() : opc.nombre;
      }
      if (s.inicio && ex.anticipacionDias > 0 && diasEntre(hoy, fechaLocal(new Date(s.inicio), tz)) < ex.anticipacionDias) {
        errores.push({ codigo: 'EXTRA_ANTICIPACION', mensaje: `${ex.nombre} se pide con al menos ${ex.anticipacionDias} días de anticipación.`, sesion: i, extra: ex.id });
      }
      const concepto = `${ex.nombre}${detalle ? ' · ' + detalle : ''}${nSes(i)}`;
      if (ex.unaVezPorRacha && racha.get(`${i}:${ex.id}`)?.previa) {
        lineas.push({ tipo: 'extra', ref: ex.id, concepto: `${concepto} (incluido en la sesión anterior)`, cantidad: 1, precioUnitario: 0, importe: 0, sesion: i, datos: { opcion: x.opcion ?? null, texto: x.texto ?? null } });
        continue;
      }
      const p = precioVigente(ex.precio, op.ahora);
      if (p == null) {
        seCotiza = true;
        lineas.push({ tipo: 'extra', ref: ex.id, concepto: `${concepto} (se cotiza)`, cantidad: 1, precioUnitario: 0, importe: 0, sesion: i, seCotiza: true, datos: { opcion: x.opcion ?? null, texto: x.texto ?? null } });
      } else {
        lineas.push({ tipo: 'extra', ref: ex.id, concepto, cantidad: 1, precioUnitario: p, importe: p, sesion: i, datos: { opcion: x.opcion ?? null, texto: x.texto ?? null } });
      }
    }
  });

  const porSesion = new Map<string, number>();
  for (const pc of productos) {
    const prod = catalogo.productos.find((p) => p.id === pc.id && p.espacioId === esp.id && p.activo);
    if (!prod) { errores.push({ codigo: 'PRODUCTO_INVALIDO', mensaje: 'Uno de los servicios ya no está disponible.', producto: pc.id }); continue; }
    const cant = Math.floor(Number(pc.cantidad));
    if (!(cant >= 1)) continue;
    if (cant > prod.maxCantidad) { errores.push({ codigo: 'PRODUCTO_CANTIDAD', mensaje: `Puedes pedir hasta ${prod.maxCantidad} de ${prod.nombre.toLowerCase()} en línea.`, producto: prod.id }); continue; }
    if (prod.requiereSesion && !sesiones.length) { errores.push({ codigo: 'PRODUCTO_SESION', mensaje: `${prod.nombre} se contrata junto con horas de estudio.`, producto: prod.id }); continue; }
    let idx: number | undefined;
    if (prod.unidad === 'sesion' && sesiones.length) {
      if (pc.sesion == null && sesiones.length > 1) { errores.push({ codigo: 'PRODUCTO_ELIGE_SESION', mensaje: `Indica en qué sesión necesitas ${prod.nombre.toLowerCase()}.`, producto: prod.id }); continue; }
      idx = pc.sesion ?? 0;
      if (idx < 0 || idx >= sesiones.length) { errores.push({ codigo: 'PRODUCTO_ELIGE_SESION', mensaje: `Indica en qué sesión necesitas ${prod.nombre.toLowerCase()}.`, producto: prod.id }); continue; }
      if (prod.maxPorSesion != null) {
        const k = `${prod.id}:${idx}`;
        const suma = (porSesion.get(k) ?? 0) + cant;
        porSesion.set(k, suma);
        if (suma > prod.maxPorSesion) { errores.push({ codigo: 'PRODUCTO_MAX_SESION', mensaje: `${prod.nombre}: máximo ${prod.maxPorSesion} por sesión.`, producto: prod.id, sesion: idx }); continue; }
      }
    }
    const requeridos = prod.campos.filter((c) => c.alReservar);
    if (requeridos.length) {
      const datos = pc.datos ?? [];
      const completos = Array.from({ length: cant }, (_, k) => requeridos.every((c) => (datos[k]?.[c.id] ?? '').trim()));
      if (!completos.every(Boolean)) errores.push({ codigo: 'PRODUCTO_DATOS', mensaje: `${prod.nombre}: indica ${requeridos.map((c) => c.etiqueta.toLowerCase()).join(' y ')} de cada uno.`, producto: prod.id });
    }
    const base = precioVigente(prod.precio, op.ahora);
    // Precio de paquete: aplica cuando el pedido trae horas de estudio.
    const p = base != null && prod.precioConReserva != null && sesiones.length ? Number(prod.precioConReserva) : base;
    const concepto = `${prod.nombre}${cant > 1 ? ` × ${cant}` : ''}${idx != null && sesiones.length > 1 ? ` · Sesión ${idx + 1}` : ''}`;
    const datos = { unidades: (pc.datos ?? []).slice(0, cant) };
    if (p == null) {
      seCotiza = true;
      lineas.push({ tipo: 'producto', ref: prod.id, concepto: `${concepto} (se cotiza)`, cantidad: cant, precioUnitario: 0, importe: 0, sesion: idx, seCotiza: true, datos });
    } else {
      lineas.push({ tipo: 'producto', ref: prod.id, concepto, cantidad: cant, precioUnitario: p, importe: redondear(p * cant), sesion: idx, datos });
    }
  }

  const subtotal = redondear(lineas.reduce((s, l) => s + l.importe, 0));
  let descuento = 0;
  if (op.cupon && subtotal > 0) {
    descuento = op.cupon.tipo === 'porcentaje' ? redondear((subtotal * Math.min(100, op.cupon.valor)) / 100) : Math.min(op.cupon.valor, subtotal);
    lineas.push({ tipo: 'descuento', ref: op.cupon.codigo, concepto: `Cupón ${op.cupon.codigo}`, cantidad: 1, precioUnitario: -descuento, importe: -descuento });
  }
  let credito = 0;
  if (op.creditoDisponible && op.creditoDisponible > 0 && subtotal - descuento > 0) {
    credito = redondear(Math.min(op.creditoDisponible, subtotal - descuento));
    lineas.push({ tipo: 'credito', ref: null, concepto: 'Saldo a favor', cantidad: 1, precioUnitario: -credito, importe: -credito });
  }
  const total = redondear(subtotal - descuento - credito);

  // OXXO: solo con tiempo suficiente para que se confirme el pago y dentro
  // del límite por operación.
  let oxxo: Cotizacion['oxxo'] = { disponible: false };
  const cfg = esp.pago.oxxo;
  if (!cfg.activo) oxxo = { disponible: false, motivo: 'Este espacio no acepta pagos en OXXO.' };
  else if (total <= 0) oxxo = { disponible: false };
  else if (total > cfg.montoMax) oxxo = { disponible: false, motivo: `OXXO acepta pagos de hasta ${dinero(cfg.montoMax)}.` };
  else if (sesiones.some((s) => s.inicio && new Date(s.inicio).getTime() < op.ahora.getTime() + cfg.diasMin * 86400000)) {
    oxxo = { disponible: false, motivo: `El pago en OXXO se ofrece cuando la sesión está a ${cfg.diasMin} días o más.` };
  } else oxxo = { disponible: true };

  if (seCotiza) avisos.push({ codigo: 'SE_COTIZA', mensaje: 'Tu pedido incluye algo que se cotiza aparte. Envíanos la solicitud y te mandamos el precio.' });

  return {
    lineas, subtotal, descuento, credito, total, iva: ivaIncluido(total), seCotiza,
    pagable: errores.length === 0 && !seCotiza,
    errores, avisos, oxxo,
    msi: esp.pago.msi.activo && total >= esp.pago.msi.montoMin,
  };
}

/** Carrito inicial a partir de un paquete sugerido. */
export function carritoDePaquete(c: Catalogo, paqueteId: string): Carrito | null {
  const p = c.paquetes.find((x) => x.id === paqueteId && x.activo);
  if (!p) return null;
  return {
    espacioId: p.espacioId,
    paquete: p.id,
    sesiones: p.bloqueId && p.modalidadId ? [{ bloqueId: p.bloqueId, modalidadId: p.modalidadId, inicio: null, extras: [] }] : [],
    productos: Object.entries(p.productos).map(([id, cantidad]) => ({ id, cantidad, sesion: 0 })),
  };
}
