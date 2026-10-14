// Calendario: qué horarios se pueden reservar y qué rangos ocupa una sesión.
// Lo usan el navegador (para mostrar horarios al momento) y la API (para
// validar antes de cobrar). La base de datos tiene la última palabra con su
// restricción de exclusión.

import type { Carrito, Catalogo, Espacio, Extra, Problema, Rango, RangoOcupacion, Ventana } from './tipos.ts';
import { diaSemana, diasEntre, fechaLocal, inicioDelDia, sumarDias, utcDesdeLocal } from './tiempo.ts';
import { finDeSesion, rachas } from './precios.ts';

export function ventanasDelDia(c: Catalogo, espacioId: string, fecha: string): Ventana[] {
  const exc = c.excepciones.find((e) => e.espacioId === espacioId && e.fecha === fecha);
  if (exc) return exc.cerrado ? [] : [...exc.ventanas].sort((a, b) => a.abre - b.abre);
  const dia = diaSemana(fecha);
  return c.horarios.filter((h) => h.espacioId === espacioId && h.dia === dia).map((h) => ({ abre: h.abre, cierra: h.cierra })).sort((a, b) => a.abre - b.abre);
}

export const seEnciman = (a: Rango, b: Rango) => a.inicio < b.fin && b.inicio < a.fin;
export const empalme = (r: Rango, lista: Rango[]) => lista.find((o) => seEnciman(r, o));

/** Rangos que aparta un extra con días de bloqueo (pintura del ciclorama). */
export function rangosDeExtra(esp: Espacio, ex: Extra, inicio: Date, fin: Date, racha?: { previa: boolean; siguiente: boolean }): Rango[] {
  const tz = esp.zonaHoraria;
  const out: Rango[] = [];
  if (ex.bloqueoAntesDias > 0 && !racha?.previa) {
    const dia = fechaLocal(inicio, tz);
    out.push({ inicio: inicioDelDia(sumarDias(dia, -ex.bloqueoAntesDias), tz).getTime(), fin: inicioDelDia(dia, tz).getTime() });
  }
  if (ex.bloqueoDespuesDias > 0 && !racha?.siguiente) {
    const diaFin = fechaLocal(new Date(fin.getTime() - 1), tz);
    out.push({ inicio: inicioDelDia(sumarDias(diaFin, 1), tz).getTime(), fin: inicioDelDia(sumarDias(diaFin, 1 + ex.bloqueoDespuesDias), tz).getTime() });
  }
  return out;
}

/** Todo lo que ocupa un carrito en el calendario: sesiones con su margen y días de pintura. */
export function ocupacionDeCarrito(carrito: Carrito, c: Catalogo, margenMin?: number): RangoOcupacion[] {
  const esp = c.espacios.find((e) => e.id === carrito.espacioId);
  if (!esp) return [];
  const margen = (margenMin ?? esp.margenMin) * 60000;
  const r = rachas(carrito, c);
  const out: RangoOcupacion[] = [];
  carrito.sesiones.forEach((s, i) => {
    const b = c.bloques.find((x) => x.id === s.bloqueId);
    if (!s.inicio || !b) return;
    const ini = new Date(s.inicio);
    const fin = s.fin ? new Date(s.fin) : finDeSesion(ini, b.horas);
    out.push({ tipo: 'sesion', inicio: ini.getTime(), fin: fin.getTime() + margen, sesion: i });
    for (const x of s.extras ?? []) {
      const ex = c.extras.find((e) => e.id === x.id);
      if (!ex) continue;
      for (const rg of rangosDeExtra(esp, ex, ini, fin, r.get(`${i}:${ex.id}`))) out.push({ tipo: 'pintura', ...rg, sesion: i });
    }
  });
  return out;
}

export interface OpcionesHorarios {
  catalogo: Catalogo;
  espacio: Espacio;
  /** Duración de la sesión en minutos. */
  duracionMin: number;
  /** Lo que ya está ocupado (con su margen incluido). */
  ocupacion: Rango[];
  ahora: Date;
  /** Extras elegidos: se revisan anticipación y días de bloqueo. */
  extras?: Extra[];
  margenMin?: number;
  pasoMin?: number;
  anticipacionH?: number;
  /** Panel: permite cualquier hora y sin anticipación mínima. */
  libre?: boolean;
  /**
   * Ocupación contra la que se revisan los días de bloqueo de los extras.
   * Por defecto la misma `ocupacion`; el cotizador quita aquí las sesiones
   * del mismo pedido que comparten racha de color.
   */
  ocupacionExtras?: Rango[];
}

export interface Horario { inicio: string; fin: string; minuto: number }

export interface Dia { fecha: string; horarios: Horario[]; motivo?: string }

/** Horarios de inicio disponibles en una fecha local. */
export function horariosDelDia(op: OpcionesHorarios, fecha: string): Dia {
  const { espacio: esp, catalogo: c } = op;
  const tz = esp.zonaHoraria;
  const hoy = fechaLocal(op.ahora, tz);
  const margen = (op.margenMin ?? esp.margenMin) * 60000;
  const paso = op.pasoMin ?? esp.pasoMin;
  const minimo = op.libre ? op.ahora.getTime() : op.ahora.getTime() + (op.anticipacionH ?? esp.anticipacionH) * 3600000;
  const dur = op.duracionMin * 60000;

  if (!op.libre && diasEntre(hoy, fecha) > esp.horizonteDias) return { fecha, horarios: [], motivo: 'Todavía no abrimos reservas para esta fecha.' };
  if (diasEntre(hoy, fecha) < 0) return { fecha, horarios: [], motivo: 'Fecha pasada.' };

  for (const ex of op.extras ?? []) {
    if (ex.anticipacionDias > 0 && diasEntre(hoy, fecha) < ex.anticipacionDias) {
      return { fecha, horarios: [], motivo: `${ex.nombre} se pide con al menos ${ex.anticipacionDias} días de anticipación.` };
    }
  }

  const ventanas = ventanasDelDia(c, esp.id, fecha);
  if (!ventanas.length) return { fecha, horarios: [], motivo: 'Cerrado.' };
  if (!ventanas.some((v) => v.cierra - v.abre >= op.duracionMin)) return { fecha, horarios: [], motivo: 'Este bloque no cabe en el horario de este día.' };

  const horarios: Horario[] = [];
  let bloqueadoPorExtra = false;
  for (const v of ventanas) {
    for (let m = v.abre; m + op.duracionMin <= v.cierra; m += paso) {
      const ini = utcDesdeLocal(fecha, m, tz);
      if (ini.getTime() < minimo) continue;
      const fin = new Date(ini.getTime() + dur);
      if (empalme({ inicio: ini.getTime(), fin: fin.getTime() + margen }, op.ocupacion)) continue;
      const extraOcupado = (op.extras ?? []).some((ex) => rangosDeExtra(esp, ex, ini, fin).some((r) => empalme(r, op.ocupacionExtras ?? op.ocupacion)));
      if (extraOcupado) { bloqueadoPorExtra = true; continue; }
      horarios.push({ inicio: ini.toISOString(), fin: fin.toISOString(), minuto: m });
    }
  }
  if (!horarios.length) {
    if (bloqueadoPorExtra) return { fecha, horarios, motivo: 'Para esta fecha no hay tiempo de preparar el espacio (el foro ya está ocupado los días anteriores).' };
    const pasado = ventanas.every((v) => utcDesdeLocal(fecha, v.cierra - op.duracionMin, tz).getTime() < minimo);
    return { fecha, horarios, motivo: pasado ? `Se reserva con al menos ${op.anticipacionH ?? esp.anticipacionH} horas de anticipación.` : 'Lleno.' };
  }
  return { fecha, horarios };
}

/** Días de un rango de fechas con sus horarios. */
export function calendario(op: OpcionesHorarios, desde: string, hasta: string): Dia[] {
  const out: Dia[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) out.push(horariosDelDia(op, f));
  return out;
}

/**
 * Valida que cada sesión de un carrito empiece en un horario ofrecido y que
 * las sesiones del mismo carrito no se encimen entre sí.
 */
export function validarCarrito(carrito: Carrito, c: Catalogo, ocupacion: Rango[], ahora: Date, libre = false): Problema[] {
  const esp = c.espacios.find((e) => e.id === carrito.espacioId);
  if (!esp) return [{ codigo: 'ESPACIO', mensaje: 'Espacio no encontrado.' }];
  const problemas: Problema[] = [];
  const propios = ocupacionDeCarrito(carrito, c);
  carrito.sesiones.forEach((s, i) => {
    const b = c.bloques.find((x) => x.id === s.bloqueId);
    if (!s.inicio || !b) return;
    const ini = new Date(s.inicio);
    if (Number.isNaN(ini.getTime())) { problemas.push({ codigo: 'FECHA_INVALIDA', mensaje: 'Fecha inválida.', sesion: i }); return; }
    const otros = propios.filter((r) => r.sesion !== i);
    const mios = propios.filter((r) => r.sesion === i);
    const choque = mios.find((r) => empalme(r, otros));
    if (choque) { problemas.push({ codigo: 'SESIONES_ENCIMADAS', mensaje: `La sesión ${i + 1} se empalma con otra sesión de tu pedido (recuerda la hora de margen entre sesiones).`, sesion: i }); return; }
    if (mios.some((r) => empalme(r, ocupacion))) {
      problemas.push({ codigo: 'HORARIO_OCUPADO', mensaje: carrito.sesiones.length > 1 ? `El horario de la sesión ${i + 1} ya no está disponible.` : 'Ese horario ya no está disponible.', sesion: i });
      return;
    }
    if (libre) return;
    const extras = (s.extras ?? []).map((x) => c.extras.find((e) => e.id === x.id)).filter((x): x is Extra => !!x);
    const fecha = fechaLocal(ini, esp.zonaHoraria);
    const dia = horariosDelDia({ catalogo: c, espacio: esp, duracionMin: b.horas * 60, ocupacion: [], ahora, extras: extras.map((e) => ({ ...e, bloqueoAntesDias: 0, bloqueoDespuesDias: 0 })) }, fecha);
    if (!dia.horarios.some((h) => h.inicio === ini.toISOString())) {
      problemas.push({ codigo: 'HORARIO_INVALIDO', mensaje: dia.motivo && dia.horarios.length === 0 ? `Sesión ${i + 1}: ${dia.motivo}` : `La hora de inicio de la sesión ${i + 1} no está disponible.`, sesion: i });
    }
  });
  return problemas;
}

/** Horarios para visitas: sin margen entre citas. */
export function opcionesVisita(c: Catalogo, esp: Espacio, ocupacion: Rango[], ahora: Date): OpcionesHorarios {
  return {
    catalogo: c, espacio: esp, ocupacion, ahora,
    duracionMin: esp.visitas.duracionMin, pasoMin: esp.visitas.pasoMin,
    anticipacionH: esp.visitas.anticipacionH, margenMin: 0,
  };
}
