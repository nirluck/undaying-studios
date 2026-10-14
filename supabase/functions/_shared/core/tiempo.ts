// Fechas y horas en la zona horaria de cada espacio.
// Las fechas locales se manejan como texto 'AAAA-MM-DD' y las horas como
// minutos desde las 00:00 de ese día (pueden pasar de 1440).

const formatos = new Map<string, Intl.DateTimeFormat>();

function formato(tz: string): Intl.DateTimeFormat {
  let f = formatos.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    formatos.set(tz, f);
  }
  return f;
}

export interface Partes { anio: number; mes: number; dia: number; hora: number; minuto: number; segundo: number }

export function partes(d: Date, tz: string): Partes {
  const p: Record<string, number> = {};
  for (const x of formato(tz).formatToParts(d)) if (x.type !== 'literal') p[x.type] = Number(x.value);
  return { anio: p.year, mes: p.month, dia: p.day, hora: p.hour === 24 ? 0 : p.hour, minuto: p.minute, segundo: p.second };
}

/** Minutos que la hora local va adelante de UTC (México: -360). */
export function desfase(d: Date, tz: string): number {
  const p = partes(d, tz);
  const comoUtc = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  return Math.round((comoUtc - Math.floor(d.getTime() / 1000) * 1000) / 60000);
}

/** Instante que corresponde a `minutos` después de las 00:00 locales de `fecha`. */
export function utcDesdeLocal(fecha: string, minutos: number, tz: string): Date {
  const [a, m, d] = fecha.split('-').map(Number);
  const supuesto = Date.UTC(a, m - 1, d, 0, minutos);
  const d1 = desfase(new Date(supuesto), tz);
  let t = supuesto - d1 * 60000;
  const d2 = desfase(new Date(t), tz);
  if (d2 !== d1) t = supuesto - d2 * 60000;
  return new Date(t);
}

const dos = (n: number) => String(n).padStart(2, '0');

export function fechaLocal(d: Date, tz: string): string {
  const p = partes(d, tz);
  return `${p.anio}-${dos(p.mes)}-${dos(p.dia)}`;
}

export function minutosLocales(d: Date, tz: string): number {
  const p = partes(d, tz);
  return p.hora * 60 + p.minuto;
}

export function sumarDias(fecha: string, n: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const x = new Date(Date.UTC(a, m - 1, d + n));
  return `${x.getUTCFullYear()}-${dos(x.getUTCMonth() + 1)}-${dos(x.getUTCDate())}`;
}

/** 0 = domingo … 6 = sábado */
export function diaSemana(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

export function diasEntre(desde: string, hasta: string): number {
  const f = (s: string) => { const [a, m, d] = s.split('-').map(Number); return Date.UTC(a, m - 1, d); };
  return Math.round((f(hasta) - f(desde)) / 86400000);
}

/** Suma días hábiles (lunes a viernes). */
export function sumarDiasHabiles(fecha: string, n: number): string {
  let f = fecha;
  let faltan = n;
  while (faltan > 0) {
    f = sumarDias(f, 1);
    const d = diaSemana(f);
    if (d !== 0 && d !== 6) faltan--;
  }
  return f;
}

export function inicioDelDia(fecha: string, tz: string): Date {
  return utcDesdeLocal(fecha, 0, tz);
}

export function horaTexto(minutos: number): string {
  const m = ((minutos % 1440) + 1440) % 1440;
  return `${dos(Math.floor(m / 60))}:${dos(m % 60)}`;
}

export function primerDiaDelMes(fecha: string): string {
  return fecha.slice(0, 8) + '01';
}

export function diasDelMes(fecha: string): number {
  const [a, m] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

// ---------- Textos en español ----------

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const nombreDia = (fecha: string) => DIAS[diaSemana(fecha)];
export const nombreMes = (mes: number) => MESES[mes - 1];

/** "sábado 10 de octubre de 2026" */
export function fechaLarga(fecha: string, conAnio = true): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return `${DIAS[diaSemana(fecha)]} ${d} de ${MESES[m - 1]}${conAnio ? ` de ${a}` : ''}`;
}

/** "sáb 10 oct" */
export function fechaCorta(fecha: string): string {
  const [, m, d] = fecha.split('-').map(Number);
  return `${DIAS[diaSemana(fecha)].slice(0, 3)} ${d} ${MESES[m - 1].slice(0, 3)}`;
}

/** "10:00" en la zona del espacio */
export function horaLocal(d: Date, tz: string): string {
  return horaTexto(minutosLocales(d, tz));
}

/** "sábado 10 de octubre de 2026, de 10:00 a 16:00" */
export function rangoTexto(inicio: Date, fin: Date, tz: string): string {
  const fi = fechaLocal(inicio, tz);
  const ff = fechaLocal(fin, tz);
  const base = `${fechaLarga(fi)}, de ${horaLocal(inicio, tz)} a ${horaLocal(fin, tz)}`;
  return ff === fi ? base : `${base} del ${fechaLarga(ff, false)}`;
}
