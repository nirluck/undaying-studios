export const redondear = (n: number) => Math.round(n * 100) / 100;

/** "$4,500" o "$4,500.50" */
export function dinero(n: number): string {
  const entero = Number.isInteger(redondear(n));
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: entero ? 0 : 2, maximumFractionDigits: 2 });
}

/** IVA incluido en un precio que ya lo trae (16%). */
export const ivaIncluido = (total: number) => redondear(total - total / 1.16);

export const horasTexto = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)} ${h === 1 ? 'hora' : 'horas'}`;
