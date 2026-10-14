// Calendario mensual con horarios de inicio. Lo usan el widget de reserva,
// las visitas y el cambio de fecha en Mis reservas.

import type { Dia, Horario } from '../../supabase/functions/_shared/core/mod.ts';
import { diasDelMes, diaSemana, fechaLarga, horaTexto, nombreMes, primerDiaDelMes, sumarDias } from '../../supabase/functions/_shared/core/mod.ts';

export interface OpcionesCalendario {
  /** Calcula los días de un mes (primer y último día, AAAA-MM-DD). */
  dias: (desde: string, hasta: string) => Promise<Dia[]>;
  hoy: string;
  /** Fecha y horario elegidos (ISO del inicio). */
  inicio?: string | null;
  fecha?: string | null;
  zona: string;
  alElegir: (h: Horario, fecha: string) => void;
  /** Texto del horario: "10:00 a 16:00" */
  etiqueta?: (h: Horario) => string;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function montarCalendario(raiz: HTMLElement, op: OpcionesCalendario) {
  let mes = primerDiaDelMes(op.fecha ?? op.hoy);
  let fecha = op.fecha ?? null;
  let dias: Dia[] = [];
  let pedido = 0;

  const etiqueta = op.etiqueta ?? ((h: Horario) => {
    const fin = new Date(h.fin);
    const min = h.minuto + Math.round((fin.getTime() - new Date(h.inicio).getTime()) / 60000);
    return `${horaTexto(h.minuto)} a ${horaTexto(min)}`;
  });

  const pintar = (cargando = false) => {
    const [a, m] = mes.split('-').map(Number);
    const total = diasDelMes(mes);
    const vacios = (diaSemana(mes) + 6) % 7; // semana empieza en lunes
    const porFecha = new Map(dias.map((d) => [d.fecha, d]));
    const elegido = fecha ? porFecha.get(fecha) : undefined;
    const puedeAtras = mes > primerDiaDelMes(op.hoy);
    let celdas = '';
    for (let i = 0; i < vacios; i++) celdas += '<span></span>';
    for (let d = 1; d <= total; d++) {
      const f = `${mes.slice(0, 8)}${String(d).padStart(2, '0')}`;
      const info = porFecha.get(f);
      const disponible = !!info?.horarios.length;
      const cls = ['cal__dia', disponible ? 'is-libre' : 'is-lleno', f === fecha ? 'is-sel' : '', f === op.hoy ? 'is-hoy' : ''].join(' ');
      celdas += `<button type="button" class="${cls}" data-fecha="${f}" ${cargando || !info ? 'disabled' : ''} aria-pressed="${f === fecha}" aria-label="${fechaLarga(f)}${disponible ? '' : ', sin horarios'}">${d}</button>`;
    }
    let horas = '';
    if (elegido) {
      horas = elegido.horarios.length
        ? `<p class="cal__titulo">${esc(fechaLarga(elegido.fecha))}</p><div class="cal__horas" role="group" aria-label="Horarios disponibles">${elegido.horarios.map((h) => `<button type="button" class="cal__hora" data-inicio="${h.inicio}" aria-pressed="${h.inicio === op.inicio}">${etiqueta(h)}</button>`).join('')}</div>`
        : `<p class="cal__motivo">${esc(elegido.motivo ?? 'Sin horarios disponibles.')}</p>`;
    } else if (!cargando) {
      horas = '<p class="cal__ayuda">Elige un día disponible.</p>';
    }
    raiz.innerHTML = `
      <div class="cal">
        <div class="cal__cab">
          <button type="button" class="cal__nav" data-mes="-1" ${puedeAtras ? '' : 'disabled'} aria-label="Mes anterior">‹</button>
          <b>${nombreMes(m)} ${a}</b>
          <button type="button" class="cal__nav" data-mes="1" aria-label="Mes siguiente">›</button>
        </div>
        <div class="cal__semana" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
        <div class="cal__dias${cargando ? ' is-cargando' : ''}">${celdas}</div>
        ${horas}
      </div>`;
  };

  const cargar = async () => {
    const n = ++pedido;
    pintar(true);
    try {
      const r = await op.dias(mes, sumarDias(mes, diasDelMes(mes) - 1));
      if (n !== pedido) return;
      dias = r;
      pintar();
    } catch (e) {
      if (n !== pedido) return;
      raiz.innerHTML = `<p class="cal__motivo">${esc((e as Error).message)}</p>`;
    }
  };

  raiz.addEventListener('click', (ev) => {
    const t = ev.target as HTMLElement;
    const nav = t.closest<HTMLButtonElement>('[data-mes]');
    if (nav) {
      const [a, m] = mes.split('-').map(Number);
      const d = new Date(Date.UTC(a, m - 1 + Number(nav.dataset.mes), 1));
      mes = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
      cargar();
      return;
    }
    const dia = t.closest<HTMLButtonElement>('[data-fecha]');
    if (dia) { fecha = dia.dataset.fecha!; pintar(); return; }
    const hora = t.closest<HTMLButtonElement>('[data-inicio]');
    if (hora) {
      const h = dias.find((d) => d.fecha === fecha)?.horarios.find((x) => x.inicio === hora.dataset.inicio);
      if (h) { op.inicio = h.inicio; pintar(); op.alElegir(h, fecha!); }
    }
  });

  cargar();
  return { recargar: cargar };
}
