// Página /reservas/: confirmación de pago, Mis reservas, pago de saldos y
// visitas. Todo con el enlace que llega por correo (sin contraseña).

import '../styles/base.css';
import '../styles/legal.css';
import './reservas.css';
import type { Extra, Rango } from '../../supabase/functions/_shared/core/mod.ts';
import { calendario, dinero, fechaLocal } from '../../supabase/functions/_shared/core/mod.ts';
import { API, catalogo, disponibilidad, llamar, reservasActivas } from './api.ts';
import { montarCalendario } from './calendario.ts';

document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())));

const app = document.getElementById('app')!;
const q = new URLSearchParams(location.search);
const t = q.get('t') ?? '';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

interface Sesion { id: string; inicio: string; fin: string; texto: string; estado: string; bloqueId: string; modalidadId: string; horas: number; extras: { id: string; opcion?: string; texto?: string }[]; invitados: string[]; conflicto: boolean; cambio: { permitido: boolean; motivo?: string } }
interface Trabajo { id: string; producto: string; unidad: number; titulo: string | null; estado: string; materialUrl: string | null; referencias: string | null; entregaUrl: string | null; fechaEntrega: string | null; revisionesIncluidas: number; revisionesUsadas: number }
interface EnSesion { id: string; servicio: string; concepto: string; sesion: string | null; asignado: string | null; material: { enlace: string | null; referencias: string | null; notas: string | null; en: string } | null }
interface Pedido {
  id: string; numero: string; estado: string; creado: string; total: number; iva: number; saldo: number;
  espacio: { id: string; nombre: string; nombreCorto: string; zonaHoraria: string; aforo: number | null; politica: { cambioH: number } };
  lineas: { concepto: string; importe: number }[]; sesiones: Sesion[]; trabajos: Trabajo[]; enSesion?: EnSesion[];
  pagos: { fecha: string; tipo: string; metodo: string; monto: number; estado: string }[];
  oxxo: { vence: string; url: string } | null;
  cancelacion: { permitido: boolean; motivo?: string; tipo?: string; monto?: number; explicacion?: string } | null;
  cancelado: { tipo: string; monto: number } | null;
}

const ESTADOS: Record<string, string> = { apartado: 'Esperando pago', pendiente_pago: 'Pago en OXXO pendiente', pagado: 'Confirmado', completado: 'Completado', vencido: 'Vencido', cancelado: 'Cancelado' };
const TRABAJOS: Record<string, string> = { esperando_material: 'Esperando tu material', en_cola: 'En cola', en_proceso: 'En proceso', entregado: 'Entregado', en_revision: 'En revisión', aprobado: 'Aprobado' };
const METODOS: Record<string, string> = { tarjeta: 'Tarjeta', oxxo: 'OXXO', stripe: 'Stripe', transferencia: 'Transferencia', efectivo: 'Efectivo', credito: 'Saldo a favor' };
const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' });

function mensaje(titulo: string, texto: string, extra = '') {
  app.innerHTML = `<h1>${esc(titulo)}</h1><p>${texto}</p>${extra}`;
}

// ---------- Entrar con el correo ----------
function vistaEntrar(aviso = '') {
  app.innerHTML = `
    <h1>Mis reservas</h1>
    <p>Aquí ves tus reservas, cambias la fecha, registras invitados y nos mandas tu material. No necesitas contraseña: escribe el correo con el que reservaste y te mandamos un enlace para entrar.</p>
    ${aviso ? `<p class="rv-aviso">${esc(aviso)}</p>` : ''}
    <form class="mr-entrar" id="entrar">
      <label class="rv-campo"><span>Correo electrónico</span><input class="rv-input" type="email" name="correo" autocomplete="email" required /></label>
      <button class="btn btn--primary" type="submit">Mandarme el enlace</button>
    </form>
    <p class="rv-nota">El enlace funciona durante 7 días. Si no te llega en unos minutos, revisa la carpeta de spam o promociones. También puedes entrar con el botón «Ver mis reservas» del correo de confirmación de tu pedido.</p>`;
  document.getElementById('entrar')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const correo = (e.target as HTMLFormElement).correo.value;
    try {
      await llamar('POST', '/acceso', { correo });
      mensaje('Revisa tu correo', `Si tenemos reservas con <b>${esc(correo)}</b>, te llegará un enlace en unos minutos. Revisa también la carpeta de spam.`);
    } catch (err) { vistaEntrar((err as Error).message); }
  });
}

// ---------- Confirmación después de pagar ----------
async function vistaConfirmacion(id: string) {
  let intentos = 0;
  const revisar = async () => {
    let p: Pedido;
    try { p = await llamar<Pedido>('GET', `/pedidos/${id}?t=${encodeURIComponent(t)}`); } catch (e) { mensaje('No encontramos tu pedido', esc((e as Error).message)); return; }
    if (p.estado === 'apartado' && intentos++ < 40) {
      mensaje('Confirmando tu pago…', 'Esto toma unos segundos. No cierres esta página.');
      setTimeout(revisar, 3000);
      return;
    }
    const resumen = `<div class="mr-card">${cuerpoPedido(p, false)}</div>`;
    if (p.estado === 'pagado' || p.estado === 'completado') {
      const faltaMaterial = p.trabajos.some((w) => w.estado === 'esperando_material');
      const siguiente = faltaMaterial
        ? '<p class="rv-aviso">El siguiente paso es mandarnos tu material: súbelo a Drive, WeTransfer o Dropbox y pega el enlace en Mis reservas.</p>'
        : '';
      mensaje(`Tu pedido ${p.numero} está confirmado`, `Te mandamos la confirmación por correo${p.sesiones.length ? ' con el archivo para tu calendario' : ''}.`, `${siguiente}${resumen}
        <div class="mr-acciones">${faltaMaterial ? `<a class="btn btn--primary" href="?t=${encodeURIComponent(t)}#material">Mandar mi material</a>` : ''}<a class="btn ${faltaMaterial ? 'btn--ghost' : 'btn--primary'}" href="?t=${encodeURIComponent(t)}">Ver mis reservas</a>${p.sesiones.length ? `<a class="btn btn--ghost" href="${API}/ics/pedido/${p.id}?t=${encodeURIComponent(t)}">Agregar a mi calendario</a>` : ''}</div>`);
    } else if (p.estado === 'pendiente_pago') {
      mensaje('Tu horario está apartado', `Paga ${esc(dinero(p.total))} en cualquier OXXO antes del ${p.oxxo ? esc(new Date(p.oxxo.vence).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Mexico_City' })) : 'vencimiento de tu ficha'}. Cuando se acredite el pago te mandamos la confirmación.`,
        `${p.oxxo?.url ? `<p><a class="btn btn--primary" href="${esc(p.oxxo.url)}" target="_blank" rel="noopener">Ver ficha de pago</a></p>` : ''}${resumen}`);
    } else if (p.estado === 'apartado') {
      mensaje('Todavía no vemos tu pago', 'Si ya pagaste, en unos minutos te llega la confirmación por correo. Si cerraste la página de pago, vuelve a intentarlo desde el sitio.', resumen);
    } else {
      mensaje(`Pedido ${p.numero}: ${ESTADOS[p.estado] ?? p.estado}`, 'Este pedido ya no está activo. Si crees que es un error, escríbenos por WhatsApp.', resumen);
    }
  };
  await revisar();
}

// ---------- Pagar un pedido o su saldo ----------
async function vistaPagar(id: string) {
  mensaje('Abriendo el pago…', 'Te llevamos a la página segura de Stripe.');
  try {
    const r = await llamar<{ url: string }>('POST', '/pagar', { pedido: id, t });
    location.href = r.url;
  } catch (e) {
    mensaje('No se pudo abrir el pago', esc((e as Error).message), `<p><a class="btn btn--ghost" href="?t=${encodeURIComponent(t)}">Ver mis reservas</a></p>`);
  }
}

// ---------- Visita ----------
async function vistaVisita(id: string) {
  try {
    const v = await llamar<{ id: string; texto: string; estado: string; espacioNombre: string }>('GET', `/visitas/${id}?t=${encodeURIComponent(t)}`);
    const activa = v.estado === 'agendada';
    mensaje(activa ? 'Tu visita' : 'Visita cancelada', `${esc(v.espacioNombre)} · ${esc(v.texto)}`, activa ? '<p><button class="btn btn--ghost" id="cancelar-visita">Cancelar visita</button></p><p class="rv-nota">Para cambiar el horario, cancela y agenda otra desde la página.</p>' : '');
    document.getElementById('cancelar-visita')?.addEventListener('click', async () => {
      if (!confirm('¿Cancelar tu visita?')) return;
      await llamar('POST', `/visitas/${id}/cancelar`, { t });
      mensaje('Visita cancelada', 'Puedes agendar otra cuando quieras.');
    });
  } catch (e) { mensaje('No encontramos tu visita', esc((e as Error).message)); }
}

// ---------- Mis reservas ----------
function cuerpoPedido(p: Pedido, acciones: boolean) {
  const activas = p.sesiones.filter((s) => s.estado === 'activa');
  const sesiones = p.sesiones.map((s) => `
    <div class="mr-fila" data-ses="${s.id}">
      <span>${s.estado === 'activa' ? '' : '<s>'}${esc(s.texto)}${s.estado === 'activa' ? '' : '</s>'}${s.conflicto ? ' <b>· Te contactaremos para confirmar el horario</b>' : ''}</span>
      ${acciones && s.estado === 'activa' && p.estado === 'pagado' ? `<span class="mr-acciones">
        ${s.cambio.permitido ? `<button class="rv-link" data-cambiar="${s.id}">Cambiar fecha</button>` : ''}
        ${new Date(s.fin) > new Date() ? `<button class="rv-link" data-invitados="${s.id}">Invitados (${s.invitados.length})</button>` : ''}
      </span>` : ''}
    </div>
    <div data-panel="${s.id}"></div>`).join('');
  const trabajos = p.trabajos.map((w) => `
    <div class="mr-fila"><span><b>${esc(w.producto)}</b>${w.titulo ? ` · ${esc(w.titulo)}` : ` · pieza ${w.unidad}`}</span><span class="mr-estado">${TRABAJOS[w.estado] ?? w.estado}</span></div>
    ${w.fechaEntrega && !['entregado', 'aprobado'].includes(w.estado) ? `<p class="rv-nota">Entrega estimada: ${esc(new Date(w.fechaEntrega + 'T12:00:00').toLocaleDateString('es-MX', { dateStyle: 'long' }))}</p>` : ''}
    ${acciones && ['esperando_material', 'en_cola'].includes(w.estado) && p.estado !== 'cancelado' ? `
      <form class="mr-panel" data-material="${w.id}">
        <div class="rv-grid">
          <label class="rv-campo"><span>Título de la canción</span><input class="rv-input" name="titulo" value="${esc(w.titulo ?? '')}" required /></label>
          <label class="rv-campo"><span>Enlace al material (Drive, WeTransfer, Dropbox)</span><input class="rv-input" name="materialUrl" type="url" value="${esc(w.materialUrl ?? '')}" placeholder="https://" required /></label>
        </div>
        <label class="rv-campo"><span>Referencias (opcional)</span><input class="rv-input" name="referencias" value="${esc(w.referencias ?? '')}" placeholder="Canciones o enlaces de referencia" /></label>
        <label class="rv-campo"><span>Notas para el ingeniero (opcional)</span><textarea class="rv-input" name="notas" rows="2"></textarea></label>
        <button class="btn btn--primary btn--sm" type="submit">${w.materialUrl ? 'Actualizar material' : 'Mandar material'}</button>
      </form>` : ''}
    ${w.entregaUrl ? `<div class="mr-acciones"><a class="btn btn--ghost btn--sm" href="${esc(w.entregaUrl)}" target="_blank" rel="noopener">Escuchar la entrega</a>
      ${acciones && w.estado === 'entregado' ? `<button class="btn btn--primary btn--sm" data-aprobar="${w.id}">Aprobar</button>
        ${w.revisionesUsadas < w.revisionesIncluidas ? `<button class="btn btn--ghost btn--sm" data-revision="${w.id}">Pedir revisión (${w.revisionesIncluidas - w.revisionesUsadas} disponibles)</button>` : ''}` : ''}</div>
      <div data-panel-rev="${w.id}"></div>` : ''}`).join('');
  // Productor y músicos: demos, tracks y referencias antes de la sesión
  const enSesion = (p.enSesion ?? []).map((x) => {
    const m = x.material;
    const abierto = acciones && ['pagado', 'completado'].includes(p.estado);
    return `
    <div class="mr-fila"><span><b>${esc(x.concepto)}</b>${x.sesion ? ` · ${esc(x.sesion)}` : ''}</span><span class="mr-estado">${x.asignado ? esc(x.asignado) : m ? 'Material recibido' : 'Esperando tus demos'}</span></div>
    ${x.asignado ? `<p class="rv-nota">Te atiende: <b>${esc(x.asignado)}</b></p>` : ''}
    ${abierto ? `
      <form class="mr-panel" data-material-sesion="${x.id}">
        <p class="rv-nota">Comparte tus demos, tracks y referencias para que tu ${esc(x.servicio.toLowerCase())} llegue preparado a la sesión.</p>
        <label class="rv-campo"><span>Enlace a tus demos o tracks (Drive, WeTransfer, Dropbox)</span><input class="rv-input" name="enlace" type="url" value="${esc(m?.enlace ?? '')}" placeholder="https://" /></label>
        <label class="rv-campo"><span>Referencias: canciones, artistas o enlaces con el estilo que buscas</span><textarea class="rv-input" name="referencias" rows="2">${esc(m?.referencias ?? '')}</textarea></label>
        <label class="rv-campo"><span>Notas (opcional)</span><textarea class="rv-input" name="notas" rows="2">${esc(m?.notas ?? '')}</textarea></label>
        <button class="btn btn--primary btn--sm" type="submit">${m ? 'Actualizar' : 'Mandar demos y referencias'}</button>
      </form>` : ''}`;
  }).join('');
  return `
    <div class="mr-card__cab"><div><h2>${esc(p.espacio.nombreCorto)} · ${esc(p.numero)}</h2><p class="rv-nota">Pedido del ${fechaCorta(p.creado)}</p></div><span class="mr-estado mr-estado--${p.estado}">${ESTADOS[p.estado] ?? p.estado}</span></div>
    ${p.sesiones.length ? `<div class="mr-seccion"><h3>${activas.length > 1 ? 'Sesiones' : 'Sesión'}</h3>${sesiones}</div>` : ''}
    ${enSesion ? `<div class="mr-seccion"><h3>Para tu sesión</h3>${enSesion}</div>` : ''}
    ${p.trabajos.length ? `<div class="mr-seccion"><h3>Postproducción</h3>${trabajos}</div>` : ''}
    <div class="mr-seccion"><h3>Resumen</h3>
      <ul class="rv-lineas">${p.lineas.map((l) => `<li><span>${esc(l.concepto)}</span><b>${dinero(l.importe)}</b></li>`).join('')}</ul>
      <p class="rv-total"><span>Total</span><b>${dinero(p.total)}</b></p>
      ${p.pagos.length ? `<p class="rv-nota">${p.pagos.map((x) => `${x.tipo === 'reembolso' ? 'Reembolso' : 'Pago'} ${METODOS[x.metodo] ?? x.metodo} ${dinero(x.monto)} · ${fechaCorta(x.fecha)}${x.estado === 'pendiente' ? ' (pendiente)' : ''}`).join('<br>')}</p>` : ''}
      ${p.saldo > 0 ? `<p class="rv-aviso">Saldo pendiente: <b>${dinero(p.saldo)}</b></p>` : ''}
    </div>
    ${acciones ? `<div class="mr-acciones">
      ${p.saldo > 0 ? `<a class="btn btn--primary btn--sm" href="?pagar=${p.id}&t=${encodeURIComponent(t)}">Pagar saldo</a>` : ''}
      ${activas.length && ['pagado', 'pendiente_pago'].includes(p.estado) ? `<a class="btn btn--ghost btn--sm" href="${API}/ics/pedido/${p.id}?t=${encodeURIComponent(t)}">Agregar a mi calendario</a>` : ''}
      ${p.cancelacion?.permitido ? `<button class="rv-link" data-cancelar="${p.id}">Cancelar pedido</button>` : ''}
    </div><div data-panel-cancelar="${p.id}"></div>` : ''}`;
}

async function vistaMisReservas() {
  let datos: { cliente: { nombre: string; correo: string }; pedidos: Pedido[]; creditos: { saldo: number; vence: string }[]; visitas: { id: string; espacio: string; texto: string }[] };
  try { datos = await llamar('GET', `/cliente?t=${encodeURIComponent(t)}`); } catch (e) { vistaEntrar((e as Error).message); return; }
  const pintar = () => {
    app.innerHTML = `
      <h1>Hola, ${esc(datos.cliente.nombre.split(' ')[0])}</h1>
      <p>Estas son tus reservas con ${esc(datos.cliente.correo)}.</p>
      ${datos.creditos.length ? `<p class="rv-aviso">Tienes ${datos.creditos.map((c) => `<b>${dinero(c.saldo)}</b> de saldo a favor hasta el ${fechaCorta(c.vence)}`).join(' y ')}. Se aplica solo al reservar con este correo.</p>` : ''}
      ${datos.visitas.map((v) => `<div class="mr-card"><div class="mr-fila"><span><b>Visita al ${esc(v.espacio)}</b> · ${esc(v.texto)}</span></div></div>`).join('')}
      ${datos.pedidos.map((p) => `<article class="mr-card" data-pedido="${p.id}">${cuerpoPedido(p, true)}</article>`).join('') || '<p>Todavía no tienes reservas.</p>'}
      <p class="mr-acciones"><a class="btn btn--ghost" href="../estudio/">Reservar el estudio</a><a class="btn btn--ghost" href="../foro/">Reservar el foro</a></p>`;
  };
  const actualizar = (p: Pedido) => { datos.pedidos = datos.pedidos.map((x) => (x.id === p.id ? p : x)); pintar(); };
  pintar();
  // Desde la página de gracias o el correo: lleva directo al formulario del material.
  if (location.hash === '#material') {
    const f = app.querySelector<HTMLFormElement>('form[data-material]');
    if (f) { f.scrollIntoView({ block: 'center' }); f.querySelector<HTMLInputElement>('input:not([value]), input[value=""]')?.focus({ preventScroll: true }); }
  }

  app.addEventListener('click', async (e) => {
    const el = e.target as HTMLElement;
    const card = el.closest<HTMLElement>('[data-pedido]');
    if (!card) return;
    const p = datos.pedidos.find((x) => x.id === card.dataset.pedido)!;
    const b = (s: string) => el.closest<HTMLElement>(s);

    if (b('[data-cambiar]')) {
      const s = p.sesiones.find((x) => x.id === b('[data-cambiar]')!.dataset.cambiar)!;
      const panel = card.querySelector<HTMLElement>(`[data-panel="${s.id}"]`)!;
      panel.innerHTML = `<div class="mr-panel"><p>Elige la nueva fecha para tu sesión de ${s.horas} horas.</p><div id="cal-${s.id}"></div><div data-confirmar></div></div>`;
      const r = await catalogo(p.espacio.id);
      const cat = r.catalogo;
      const esp = cat.espacios[0];
      const desfase = new Date(r.ahora).getTime() - Date.now();
      const otras: Rango[] = p.sesiones.filter((x) => x.estado === 'activa' && x.id !== s.id).map((x) => ({ inicio: Date.parse(x.inicio), fin: Date.parse(x.fin) + esp.margenMin * 60000 }));
      const extras = s.extras.map((x) => cat.extras.find((y) => y.id === x.id)).filter((x): x is Extra => !!x);
      montarCalendario(panel.querySelector(`#cal-${s.id}`)!, {
        hoy: fechaLocal(new Date(), esp.zonaHoraria), zona: esp.zonaHoraria,
        dias: async (desde, hasta) => {
          const o = await disponibilidad(p.espacio.id, desde, hasta, `&pedido=${p.id}&t=${encodeURIComponent(t)}`);
          return calendario({ catalogo: cat, espacio: esp, duracionMin: s.horas * 60, ocupacion: [...o.ocupacion, ...otras], ahora: new Date(Date.now() + desfase), extras }, desde, hasta);
        },
        alElegir: (h) => {
          const c = panel.querySelector<HTMLElement>('[data-confirmar]')!;
          c.innerHTML = `<button class="btn btn--primary btn--sm" data-confirmar-cambio="${h.inicio}">Cambiar a esta fecha</button>`;
        },
      });
    } else if (b('[data-confirmar-cambio]')) {
      const panel = el.closest<HTMLElement>('[data-panel]')!;
      try {
        const nuevo = await llamar<Pedido>('POST', '/cliente/cambiar-fecha', { t, pedido: p.id, sesion: panel.dataset.panel, inicio: b('[data-confirmar-cambio]')!.dataset.confirmarCambio });
        actualizar(nuevo);
      } catch (err) { panel.querySelector('[data-confirmar]')!.innerHTML = `<p class="rv-error">${esc((err as Error).message)}</p>`; }
    } else if (b('[data-invitados]')) {
      const s = p.sesiones.find((x) => x.id === b('[data-invitados]')!.dataset.invitados)!;
      const panel = card.querySelector<HTMLElement>(`[data-panel="${s.id}"]`)!;
      panel.innerHTML = `<form class="mr-panel" data-guardar-invitados="${s.id}">
        <label class="rv-campo"><span>Nombres de tu equipo e invitados, uno por línea (aforo de ${p.espacio.aforo ?? 25} personas)</span><textarea class="rv-input" name="nombres" rows="6">${esc(s.invitados.join('\n'))}</textarea></label>
        <button class="btn btn--primary btn--sm" type="submit">Guardar lista</button></form>`;
    } else if (b('[data-aprobar]')) {
      actualizar(await llamar<Pedido>('POST', '/cliente/trabajo', { t, trabajo: b('[data-aprobar]')!.dataset.aprobar, accion: 'aprobar' }));
    } else if (b('[data-revision]')) {
      const id = b('[data-revision]')!.dataset.revision!;
      card.querySelector<HTMLElement>(`[data-panel-rev="${id}"]`)!.innerHTML = `<form class="mr-panel" data-enviar-revision="${id}">
        <label class="rv-campo"><span>¿Qué quieres cambiar?</span><textarea class="rv-input" name="notas" rows="3" required></textarea></label>
        <button class="btn btn--primary btn--sm" type="submit">Pedir revisión</button></form>`;
    } else if (b('[data-cancelar]')) {
      const c = p.cancelacion!;
      card.querySelector<HTMLElement>(`[data-panel-cancelar="${p.id}"]`)!.innerHTML = `<div class="mr-panel"><p>${esc(c.explicacion ?? '')}</p>
        <div class="mr-acciones"><button class="btn btn--primary btn--sm" data-confirmar-cancelar>Sí, cancelar</button><button class="rv-link" data-no-cancelar>No, conservar mi reserva</button></div></div>`;
    } else if (b('[data-no-cancelar]')) {
      pintar();
    } else if (b('[data-confirmar-cancelar]')) {
      try {
        const r = await llamar<{ pedido: Pedido }>('POST', '/cliente/cancelar', { t, pedido: p.id });
        actualizar(r.pedido);
        datos = await llamar('GET', `/cliente?t=${encodeURIComponent(t)}`);
        pintar();
      } catch (err) { alert((err as Error).message); }
    }
  });

  app.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target as HTMLFormElement;
    const card = f.closest<HTMLElement>('[data-pedido]')!;
    const fd = Object.fromEntries(new FormData(f)) as Record<string, string>;
    const boton = f.querySelector('button');
    if (boton) boton.disabled = true;
    try {
      if (f.dataset.material) actualizar(await llamar<Pedido>('POST', '/cliente/trabajo', { t, trabajo: f.dataset.material, accion: 'material', ...fd }));
      else if (f.dataset.materialSesion) actualizar(await llamar<Pedido>('POST', '/cliente/material-sesion', { t, linea: f.dataset.materialSesion, ...fd }));
      else if (f.dataset.enviarRevision) actualizar(await llamar<Pedido>('POST', '/cliente/trabajo', { t, trabajo: f.dataset.enviarRevision, accion: 'revision', notas: fd.notas }));
      else if (f.dataset.guardarInvitados) actualizar(await llamar<Pedido>('POST', '/cliente/invitados', { t, pedido: card.dataset.pedido, sesion: f.dataset.guardarInvitados, nombres: fd.nombres.split('\n') }));
    } catch (err) {
      if (boton) boton.disabled = false;
      f.insertAdjacentHTML('beforeend', `<p class="rv-error">${esc((err as Error).message)}</p>`);
    }
  });
}

if (!reservasActivas()) mensaje('Mis reservas', 'Las reservas en línea todavía no están activas. Escríbenos por WhatsApp.');
else if (q.get('pagar') && t) vistaPagar(q.get('pagar')!);
else if (q.get('pedido') && t) vistaConfirmacion(q.get('pedido')!);
else if (q.get('visita') && t) vistaVisita(q.get('visita')!);
else if (t) vistaMisReservas();
else vistaEntrar();
