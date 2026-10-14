// Archivos de calendario (.ics) para clientes y feed para el equipo.

export interface EventoIcs {
  uid: string;
  inicio: Date;
  fin: Date;
  titulo: string;
  descripcion?: string;
  lugar?: string;
  url?: string;
  cancelado?: boolean;
}

const fechaIcs = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escapar = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

function plegar(linea: string): string {
  const out: string[] = [];
  let resto = linea;
  while (new TextEncoder().encode(resto).length > 74) {
    let corte = 74;
    while (new TextEncoder().encode(resto.slice(0, corte)).length > 74) corte--;
    out.push(resto.slice(0, corte));
    resto = ' ' + resto.slice(corte);
  }
  out.push(resto);
  return out.join('\r\n');
}

export function calendarioIcs(nombre: string, eventos: EventoIcs[], ahora = new Date()): string {
  const lineas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Undying Studios//Reservas//ES', 'CALSCALE:GREGORIAN',
    `METHOD:PUBLISH`, `X-WR-CALNAME:${escapar(nombre)}`, 'X-WR-TIMEZONE:America/Mexico_City',
  ];
  for (const e of eventos) {
    lineas.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@undyingstudios.mx`,
      `DTSTAMP:${fechaIcs(ahora)}`,
      `DTSTART:${fechaIcs(e.inicio)}`,
      `DTEND:${fechaIcs(e.fin)}`,
      `SUMMARY:${escapar(e.titulo)}`,
    );
    if (e.descripcion) lineas.push(`DESCRIPTION:${escapar(e.descripcion)}`);
    if (e.lugar) lineas.push(`LOCATION:${escapar(e.lugar)}`);
    if (e.url) lineas.push(`URL:${e.url}`);
    lineas.push(`STATUS:${e.cancelado ? 'CANCELLED' : 'CONFIRMED'}`, 'END:VEVENT');
  }
  lineas.push('END:VCALENDAR');
  return lineas.map(plegar).join('\r\n') + '\r\n';
}
