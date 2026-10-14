// Cambios de fecha y cancelaciones según la política de cada espacio.

import type { Espacio, ResultadoPolitica } from './tipos.ts';
import { dinero, redondear } from './util.ts';

export const horasHasta = (inicio: Date, ahora: Date) => (inicio.getTime() - ahora.getTime()) / 3600000;

export function puedeCambiarFecha(esp: Espacio, inicio: Date, ahora: Date): { permitido: boolean; motivo?: string } {
  if (inicio.getTime() <= ahora.getTime()) return { permitido: false, motivo: 'La sesión ya empezó.' };
  if (horasHasta(inicio, ahora) < esp.politica.cambioH) {
    return { permitido: false, motivo: `Los cambios de fecha se hacen con al menos ${esp.politica.cambioH} horas de anticipación. Escríbenos y vemos qué se puede hacer.` };
  }
  return { permitido: true };
}

export interface ResultadoCancelacion {
  tipo: ResultadoPolitica;
  monto: number;
  creditoDias: number;
  explicacion: string;
}

/**
 * Qué pasa con el pago si el cliente cancela ahora.
 * `base` es lo pagado que todavía se puede devolver o acreditar (sin los
 * trabajos de postproducción que ya empezaron).
 */
export function resultadoCancelacion(esp: Espacio, primerInicio: Date | null, base: number, ahora: Date): ResultadoCancelacion {
  const p = esp.politica;
  const antes = !primerInicio || horasHasta(primerInicio, ahora) >= p.cancelacionH;
  const tipo = antes ? p.antes : p.despues;
  const monto = tipo === 'nada' ? 0 : redondear(Math.max(0, base));
  const cuando = primerInicio ? (antes ? `con más de ${p.cancelacionH} horas de anticipación` : `con menos de ${p.cancelacionH} horas de anticipación`) : '';
  let explicacion: string;
  if (tipo === 'credito') explicacion = `Al cancelar ${cuando}, ${dinero(monto)} quedan como saldo a favor para otra fecha dentro de los siguientes ${p.creditoDias} días.`;
  else if (tipo === 'reembolso') explicacion = `Al cancelar ${cuando}, te reembolsamos ${dinero(monto)}.`;
  else explicacion = `Al cancelar ${cuando}, el pago no es reembolsable.`;
  return { tipo, monto, creditoDias: p.creditoDias, explicacion: explicacion.replace(/\s+,/g, ',').replace('cancelar ,', 'cancelar,') };
}
