// Prueba del flujo unificado: tarifas, cotizador y calendario en una sola
// página. Usa el mismo motor de precios y de horarios que la reserva en línea
// (supabase/functions/_shared/core). Con VITE_RESERVAS_API toma el catálogo y
// la ocupación reales; sin ella arma un catálogo de demostración con los
// precios de src/data.js y un calendario sin ocupación.

import '../../shared/styles/base.css';
import '../../shared/styles/components.css';
import '../../shared/styles/legal.css';
import '../../shared/reservas/reservas.css';
import '../src/estudio.css';
import './prueba.css';

import type { Bloque, Carrito, Catalogo, Cotizacion, Dia, Espacio, Extra, Producto, Rango } from '../../supabase/functions/_shared/core/mod.ts';
import {
  ahorroBloque, bloquesDe, calendario, cotizar, dinero, extrasDe, fechaLocal, modalidadesDe, ocupacionDeCarrito, precioVigente, productosDe, rangoTexto,
} from '../../supabase/functions/_shared/core/mod.ts';
import { catalogo as catalogoApi, disponibilidad, llamar, reservasActivas, ErrorApi } from '../../shared/reservas/api.ts';
import { montarCalendario } from '../../shared/reservas/calendario.ts';
import { LINKS, PRICING } from '../src/data.js';
import { LEGALES, RECOMENDACIONES } from './legales.js';

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)!;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const check = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ESPACIO = 'estudio';

// En local el estudio corre en el puerto 5173 y la página está en /prueba-reserva/
if (import.meta.env.DEV) $('#volver').setAttribute('href', '/'), $('.nav__brand').setAttribute('href', '/');

/* ---------- Grupos del catálogo ----------
   El back no tiene categoría de producto: la página las agrupa por id.
   PROPUESTA: agregar `categoria` a la tabla productos. */
const DURANTE = ['productor', 'musico'];
const LEGAL = new Set(LEGALES.map((l) => l.id));
const grupo = (id: string) => (LEGAL.has(id) ? 'legal' : DURANTE.includes(id) ? 'sesion' : 'post');

/* ---------- Catálogo de demostración (sin API) ---------- */
function catalogoDemo(): Catalogo {
  const esp: Espacio = {
    id: ESPACIO, nombre: 'Estudio de grabación (Estudio A)', nombreCorto: 'Estudio', zonaHoraria: 'America/Mexico_City', reservable: true,
    margenMin: 60, pasoMin: 60, anticipacionH: 24, horizonteDias: 180, aforo: 8, variasSesiones: true,
    visitas: { activas: true, duracionMin: 60, pasoMin: 60, anticipacionH: 24 },
    politica: { cambioH: 48, cancelacionH: 24, antes: 'nada', despues: 'nada', creditoDias: 90 },
    pago: { apartadoMin: 35, oxxo: { activo: true, diasMin: 3, vigenciaDias: 1, montoMax: 10000 }, msi: { activo: false, montoMin: 3000 } },
    documentos: { terminos: '../terminos/', privacidad: '../../aviso-de-privacidad/' }, orden: 1, activo: true,
  };
  const p = (precio: number | null) => ({ precio });
  const ENTREGA: Record<string, number> = { edicion: 5, mezcla: 7, master: 3, vocal: 5 };
  return {
    espacios: [esp],
    // Como supabase/seed.sql: lunes a domingo de 10:00 a 22:00 (por confirmar con el cliente)
    horarios: [0, 1, 2, 3, 4, 5, 6].map((dia) => ({ espacioId: ESPACIO, dia, abre: 600, cierra: 1320 })),
    excepciones: [],
    modalidades: Object.entries(PRICING.modes).map(([id, m]: [string, { label: string; note: string }], i) => ({
      id: `estudio-${id}`, espacioId: ESPACIO, nombre: m.label, nota: m.note, descripcionCorta: id === 'dry' ? 'sin ingeniero (Dry Hire)' : 'con ingeniero',
      ventajas: PRICING.perks[id], tarea: null, pideIngenieroCliente: id === 'dry', horaExtra: p(500), orden: i + 1, activo: true,
    })),
    bloques: PRICING.blocks.map((b: { id: string; hours: number; hot?: boolean; price: Record<string, number> }, i: number) => ({
      id: `estudio-${b.id}`, espacioId: ESPACIO, horas: b.hours, etiqueta: null, frase: null, destacado: !!b.hot, orden: i + 1, activo: true,
      precios: { 'estudio-ing': p(b.price.ing), 'estudio-dry': p(b.price.dry) },
    })),
    extras: [{
      id: 'estudio-video', espacioId: ESPACIO, nombre: 'Equipo de video para podcast', descripcion: 'Cámaras e iluminación para grabar tu podcast en video. Se cotiza según el número de cámaras.',
      precio: p(null), anticipacionDias: 0, bloqueoAntesDias: 0, bloqueoDespuesDias: 0, bloques: null, opciones: [], unaVezPorRacha: false, tarea: null, orden: 1, activo: true,
    }],
    productos: PRICING.products.map((x: { id: string; name: string; desc: string; price: number; unit: string }, i: number) => {
      const sesion = x.unit === 'por sesión';
      return {
        id: x.id, espacioId: ESPACIO, nombre: x.name, descripcion: x.desc, precio: p(x.price), unidad: sesion ? 'sesion' : 'cancion', requiereSesion: sesion,
        maxPorSesion: x.id === 'productor' ? 1 : x.id === 'musico' ? 6 : null, maxCantidad: 20, revisiones: ['mezcla', 'master'].includes(x.id) ? 2 : 0, precioRevision: null,
        entregaDias: ENTREGA[x.id] ?? null, generaTrabajo: !sesion, tarea: null,
        campos: x.id === 'musico' ? [{ id: 'instrumento', etiqueta: 'Instrumento', alReservar: true }] : [], orden: PRICING.quoterOrder.indexOf(x.id) + 1 || i + 1, activo: true,
      } as Producto;
    }),
    paquetes: [], tiposCargo: [],
  };
}

/** Agrega los servicios legales al catálogo como productos por pieza. */
function conLegales(c: Catalogo): Catalogo {
  const ya = new Set(c.productos.map((p) => p.id));
  const legales: Producto[] = LEGALES.filter((l) => !ya.has(l.id)).map((l, i) => ({
    id: l.id, espacioId: ESPACIO, nombre: l.nombre, descripcion: l.descripcion, precio: { precio: l.precio }, precioConReserva: l.conReserva,
    unidad: 'pieza', requiereSesion: false, maxPorSesion: null, maxCantidad: 5, revisiones: 0, precioRevision: null, entregaDias: null,
    generaTrabajo: true, tarea: null, campos: [], orden: 100 + i, activo: true,
  }));
  return { ...c, productos: [...c.productos, ...legales] };
}

/* ---------- Estado ---------- */
let cat: Catalogo;
let esp: Espacio;
let fuente: 'api' | 'demo' = 'demo';
let desfase = 0;
const ahora = () => new Date(Date.now() + desfase);
let modo = 'estudio-ing';
let preset: string | null = null;
let sinHoras = false;
let verTodos = false;
let enDatos = false;
let mensaje = '';
let enviando = false;
const carrito: Carrito = { espacioId: ESPACIO, sesiones: [], productos: [] };
const datos = { nombre: '', correo: '', telefono: '', privacidad: false, terminos: false, promociones: false, descripcion: '' };
const ocupacionMes = new Map<string, Promise<Rango[]>>();

const sesion = () => carrito.sesiones[0];
const bloque = () => cat.bloques.find((b) => b.id === sesion()?.bloqueId);
const cantidad = (id: string) => carrito.productos.find((p) => p.id === id)?.cantidad ?? 0;
const q = (): Cotizacion => cotizar(carrito, cat, { ahora: ahora() });
const pr = (id: string) => cat.productos.find((p) => p.id === id)!;
const unidadTxt = (p: Producto) => (p.unidad === 'cancion' ? 'por canción' : p.unidad === 'sesion' ? 'por sesión' : 'por documento');

/** Datos de la tarjeta (badge, frase) de src/data.js, por número de horas. */
const tarjeta = (b: Bloque) => PRICING.blocks.find((x: { hours: number }) => x.hours === b.horas) ?? {};
const perks = () => PRICING.perks[modo.replace('estudio-', '')] ?? cat.modalidades.find((m) => m.id === modo)?.ventajas ?? [];

/* ---------- Horas ---------- */
function elegirBloque(id: string | null) {
  if (!id) { carrito.sesiones = []; }
  else if (sesion()) { if (sesion().bloqueId !== id) { sesion().bloqueId = id; sesion().inicio = null; } }
  else carrito.sesiones = [{ bloqueId: id, modalidadId: modo, inicio: null, extras: [] }];
  // Lo que se contrata con horas no puede quedarse sin ellas
  if (!carrito.sesiones.length) carrito.productos = carrito.productos.filter((p) => !pr(p.id)?.requiereSesion);
  sinHoras = !id;
  todo();
}

function pintarHoras() {
  $('#prModo').innerHTML = modalidadesDe(cat, ESPACIO).map((m) => `
    <button type="button" role="radio" aria-checked="${m.id === modo}" data-modo="${m.id}"><b>${esc(m.nombre)}</b><span>${esc(m.nota ?? '')}</span></button>`).join('');
  const bloques = bloquesDe(cat, ESPACIO);
  const base = bloques[0];
  $('#prPlanes').innerHTML = bloques.map((b, i) => {
    const t = tarjeta(b);
    const precio = precioVigente(b.precios[modo], ahora()) ?? 0;
    const porHora = base ? (precioVigente(base.precios[modo], ahora()) ?? 0) / base.horas : 0;
    const regular = porHora * b.horas;
    const ahorro = ahorroBloque(cat, b, modo, ahora());
    const sel = sesion()?.bloqueId === b.id;
    const badge = t.badge ?? (ahorro ? `${ahorro}% off` : 'Tarifa base');
    return `
    <article class="plan ${b.destacado ? 'plan--hot' : ''} ${sel ? 'is-sel' : ''}" data-plan="${b.id}">
      <span class="plan__badge ${b.destacado ? '' : 'plan__badge--alt'} ${i === 0 ? 'plan__badge--base' : ''}">${esc(badge)}</span>
      <div class="plan__head"><b>${b.horas}<small>horas</small></b><span>${esc(t.tagline ?? '')}</span></div>
      <p class="plan__price"><span>${dinero(precio)}</span><small>MXN</small></p>
      <p class="plan__per">${precio < regular ? `<s>${dinero(regular)}</s> · ` : ''}${dinero(precio / b.horas)} por hora</p>
      <ul class="plan__perks">${perks().map((p: string) => `<li>${check}${esc(p)}</li>`).join('')}</ul>
      <button type="button" role="radio" aria-checked="${sel}" class="btn ${sel ? 'btn--primary' : 'btn--ghost'} btn--block" data-bloque="${b.id}">${sel ? `${check} ${b.horas} horas elegidas` : `Elegir ${b.horas} horas`}</button>
    </article>`;
  }).join('');
  const s = $('#prSinHoras');
  s.setAttribute('aria-pressed', String(sinHoras));
  s.textContent = sinHoras ? 'Solo postproducción: puedes agregar horas de estudio cuando quieras' : 'No necesito horas de estudio, solo postproducción';
}

/* ---------- Fecha ---------- */
const ocupacion = (desde: string): Promise<Rango[]> => {
  if (fuente === 'demo') return Promise.resolve([]);
  const k = desde.slice(0, 7);
  if (!ocupacionMes.has(k)) {
    const [a, m] = desde.split('-').map(Number);
    const fin = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
    const p = disponibilidad(ESPACIO, `${k}-01`, fin).then((x) => x.ocupacion);
    p.catch(() => ocupacionMes.delete(k));
    ocupacionMes.set(k, p);
  }
  return ocupacionMes.get(k)!;
};

async function dias(desde: string, hasta: string): Promise<Dia[]> {
  const s = sesion();
  const b = bloque()!;
  const extras = (s.extras ?? []).map((x) => cat.extras.find((e) => e.id === x.id)).filter((x): x is Extra => !!x);
  const propias = ocupacionDeCarrito({ ...carrito, sesiones: [{ ...s, inicio: null }] }, cat);
  const ocup = [...(await ocupacion(desde)), ...propias];
  return calendario({ catalogo: cat, espacio: esp, duracionMin: b.horas * 60, ahora: ahora(), extras, ocupacion: ocup }, desde, hasta);
}

let calClave = '';
function pintarFecha() {
  const cont = $('#prFecha');
  const paso = $('#pr-fecha');
  const s = sesion();
  paso.classList.toggle('is-off', !s);
  if (!s) {
    calClave = '';
    $('#prFechaAyuda').textContent = sinHoras ? 'Sin horas de estudio no hace falta fecha: trabajamos con el material que nos mandes.' : 'Primero elige cuántas horas necesitas.';
    cont.innerHTML = '';
    return;
  }
  const b = bloque()!;
  const elegido = s.inicio ? rangoTexto(new Date(s.inicio), new Date(new Date(s.inicio).getTime() + b.horas * 3600000), esp.zonaHoraria) : '';
  $('#prFechaAyuda').innerHTML = elegido ? `Tu sesión: <b>${esc(elegido)}</b>` : `Horarios de inicio para tu bloque de ${b.horas} horas. Los días con punto tienen lugar.`;
  const clave = `${b.id}`;
  if (clave === calClave) return;
  calClave = clave;
  cont.innerHTML = '<div class="rv-cal" id="prCal"></div>';
  montarCalendario($('#prCal'), {
    hoy: fechaLocal(ahora(), esp.zonaHoraria), zona: esp.zonaHoraria,
    fecha: s.inicio ? fechaLocal(new Date(s.inicio), esp.zonaHoraria) : null, inicio: s.inicio,
    dias,
    alElegir: (h) => { sesion().inicio = h.inicio; todo(); },
  });
}

/* ---------- Productos ---------- */
function stepper(p: Producto, n: number, bloqueado: boolean) {
  const max = p.maxPorSesion ?? p.maxCantidad;
  return `
    <div class="rv-stepper" role="group" aria-label="Cantidad de ${esc(p.nombre)}">
      <button type="button" data-cant="-1" data-prod="${p.id}" ${n ? '' : 'disabled'} aria-label="Quitar uno">−</button>
      <output>${n}</output>
      <button type="button" data-cant="1" data-prod="${p.id}" ${bloqueado || n >= max ? 'disabled' : ''} aria-label="Agregar uno">+</button>
    </div>`;
}

function item(p: Producto, extra = '') {
  const n = cantidad(p.id);
  const precio = precioVigente(p.precio, ahora());
  const bloqueado = p.requiereSesion && !carrito.sesiones.length;
  const datosCampos = p.campos.filter((c) => c.alReservar);
  const unidades = carrito.productos.find((x) => x.id === p.id)?.datos ?? [];
  return `
    <div class="pr-item${n ? ' is-on' : ''}${bloqueado ? ' is-off' : ''}">
      <div class="pr-item__info">
        <b>${esc(p.nombre)}</b>
        <p>${esc(p.descripcion ?? '')}${p.entregaDias ? ` Entrega en ${p.entregaDias} días hábiles.` : ''}</p>
        ${bloqueado ? '<p class="pr-item__nota">Se contrata junto con horas de estudio.</p>' : ''}
        ${extra}
        ${n && datosCampos.length ? `<div class="pr-item__campos">${Array.from({ length: n }, (_, u) => datosCampos.map((c) => `<input class="rv-input rv-input--sm" data-campo="${c.id}" data-prod-campo="${p.id}" data-unidad="${u}" value="${esc(unidades[u]?.[c.id] ?? '')}" placeholder="${esc(c.etiqueta)}${n > 1 ? ' ' + (u + 1) : ''}" maxlength="80" />`).join('')).join('')}</div>` : ''}
      </div>
      <div class="pr-item__lado">
        <p class="pr-item__precio">${precio == null ? 'Se cotiza' : dinero(precio)}<span>${unidadTxt(p)}</span></p>
        ${stepper(p, n, bloqueado)}
      </div>
    </div>`;
}

function pintarSesion() {
  const prods = productosDe(cat, ESPACIO).filter((p) => grupo(p.id) === 'sesion');
  const extras = extrasDe(cat, ESPACIO);
  const s = sesion();
  const ex = extras.map((x) => {
    const on = !!s?.extras?.some((e) => e.id === x.id);
    const precio = precioVigente(x.precio, ahora());
    return `
    <div class="pr-item${on ? ' is-on' : ''}${s ? '' : ' is-off'}">
      <div class="pr-item__info"><b>${esc(x.nombre)}</b><p>${esc(x.descripcion ?? '')}</p>${s ? '' : '<p class="pr-item__nota">Se contrata junto con horas de estudio.</p>'}</div>
      <div class="pr-item__lado">
        <p class="pr-item__precio">${precio == null ? 'Se cotiza' : dinero(precio)}<span>${precio == null ? 'te mandamos el precio' : 'por sesión'}</span></p>
        <label class="pr-toggle"><input type="checkbox" data-extra="${x.id}" ${on ? 'checked' : ''} ${s ? '' : 'disabled'} /><span>${on ? 'Agregado' : 'Agregar'}</span></label>
      </div>
    </div>`;
  }).join('');
  $('#prSesion').innerHTML = prods.map((p) => item(p)).join('') + ex;
}

function pintarPost() {
  $('#prPost').innerHTML = productosDe(cat, ESPACIO).filter((p) => grupo(p.id) === 'post').map((p) => item(p)).join('');
}

/* ---------- Servicios legales: recomendados según el pedido ---------- */
function recomendados() {
  const contexto = {
    preset, horas: !!carrito.sesiones.length, video: !!sesion()?.extras?.some((e) => e.id === 'estudio-video'),
    productos: Object.fromEntries(carrito.productos.map((p) => [p.id, p.cantidad])),
  };
  const out: { id: string; motivo: string }[] = [];
  for (const r of RECOMENDACIONES) {
    if (out.length >= 3) break;
    if (r.si(contexto) && !out.some((x) => x.id === r.id)) out.push({ id: r.id, motivo: r.motivo });
  }
  return out;
}

function tarjetaLegal(p: Producto, motivo?: string) {
  const n = cantidad(p.id);
  const suelto = precioVigente(p.precio, ahora()) ?? 0;
  const paquete = p.precioConReserva ?? suelto;
  const conHoras = !!carrito.sesiones.length;
  return `
    <article class="pr-lcard${n ? ' is-on' : ''}">
      ${motivo ? `<p class="pr-lcard__motivo">${esc(motivo)}</p>` : ''}
      <b class="pr-lcard__nombre">${esc(p.nombre)}</b>
      <p class="pr-lcard__desc">${esc(p.descripcion ?? '')}</p>
      <div class="pr-lcard__pie">
        <p class="pr-lcard__precio">
          ${conHoras && paquete < suelto ? `<span>${dinero(paquete)}</span><s>${dinero(suelto)}</s>` : `<span>${dinero(suelto)}</span>`}
          <small>${conHoras && paquete < suelto ? `Ahorras ${dinero(suelto - paquete)} con tu reserva` : paquete < suelto ? `${dinero(paquete)} si reservas horas` : ''}</small>
        </p>
        ${n ? stepper(p, n, false) : `<button type="button" class="btn btn--ghost btn--sm" data-cant="1" data-prod="${p.id}">Agregar</button>`}
      </div>
    </article>`;
}

function pintarLegal() {
  const todos = productosDe(cat, ESPACIO).filter((p) => grupo(p.id) === 'legal');
  const recs = recomendados();
  // Los que ya están en el pedido se quedan a la vista aunque no sean recomendados
  const agregados = todos.filter((p) => cantidad(p.id) && !recs.some((r) => r.id === p.id));
  const visibles = [...recs.map((r) => ({ p: pr(r.id), motivo: r.motivo })), ...agregados.map((p) => ({ p, motivo: 'En tu pedido' }))];
  const resto = todos.filter((p) => !visibles.some((v) => v.p.id === p.id));
  $('#prLegalAyuda').textContent = carrito.sesiones.length
    ? 'Contratos y registros a precio de paquete por reservar horas con nosotros.'
    : 'Contratos y registros para tu proyecto. Con horas de estudio cuestan menos.';
  $('#prLegal').innerHTML = `
    <div class="pr-lgrid">${visibles.map((v) => tarjetaLegal(v.p, v.motivo)).join('')}</div>
    ${resto.length ? `
      <button type="button" class="pr-mas" data-ver-todos aria-expanded="${verTodos}">${verTodos ? 'Ver menos' : `Ver los ${todos.length} servicios legales`}</button>
      ${verTodos ? `<div class="pr-lgrid">${resto.map((p) => tarjetaLegal(p)).join('')}</div>` : ''}` : ''}`;
}

/* ---------- Resumen ---------- */
const TITULOS: Record<string, string> = { sesion: 'Horas de estudio', durante: 'Durante tu sesión', post: 'Después de grabar', legal: 'Servicios legales' };

function ahorros() {
  let total = 0;
  const b = bloque();
  if (b) {
    const base = bloquesDe(cat, ESPACIO)[0];
    const pb = precioVigente(base.precios[modo], ahora()) ?? 0;
    const p = precioVigente(b.precios[modo], ahora()) ?? 0;
    total += Math.max(0, (pb / base.horas) * b.horas - p);
  }
  if (carrito.sesiones.length) {
    for (const x of carrito.productos) {
      const p = pr(x.id);
      const suelto = precioVigente(p.precio, ahora());
      if (suelto != null && p.precioConReserva != null) total += (suelto - p.precioConReserva) * x.cantidad;
    }
  }
  return Math.round(total);
}

function pintarResumen() {
  const c = q();
  const grupos: Record<string, typeof c.lineas> = { sesion: [], durante: [], post: [], legal: [] };
  for (const l of c.lineas) {
    if (l.tipo === 'sesion') grupos.sesion.push(l);
    else if (l.tipo === 'extra') grupos.durante.push(l);
    else if (l.tipo === 'producto') grupos[grupo(l.ref ?? '') === 'sesion' ? 'durante' : grupo(l.ref ?? '')].push(l);
  }
  const s = sesion();
  const b = bloque();
  const fecha = s?.inicio && b ? rangoTexto(new Date(s.inicio), new Date(new Date(s.inicio).getTime() + b.horas * 3600000), esp.zonaHoraria) : '';
  // La fecha que falta ya se avisa junto a las horas
  const falta = c.errores.filter((e) => !['VACIO', 'FALTA_FECHA'].includes(e.codigo));
  const ahorro = ahorros();
  const listo = c.lineas.length > 0 && !c.errores.length;
  const lineas = Object.entries(grupos).filter(([, ls]) => ls.length).map(([k, ls]) => `
    <div class="pr-res__grupo">
      <p class="pr-res__titulo">${TITULOS[k]}</p>
      <ul>${ls.map((l) => `<li><span>${esc(l.concepto)}</span><b>${l.seCotiza ? 'por cotizar' : dinero(l.importe)}</b></li>`).join('')}</ul>
      ${k === 'sesion' ? `<p class="pr-res__fecha">${fecha ? esc(fecha) : '<a href="#pr-fecha" data-ir="pr-fecha">Falta elegir día y hora</a>'}</p>` : ''}
    </div>`).join('');

  let accion = '';
  if (!enDatos) {
    accion = `<button type="button" class="btn btn--primary btn--block" data-continuar ${listo ? '' : 'disabled'}>Continuar con mis datos</button>`;
  } else if (c.seCotiza) {
    accion = `<button type="button" class="btn btn--primary btn--block" data-enviar ${enviando ? 'disabled' : ''}>${enviando ? 'Enviando…' : 'Enviar solicitud'}</button>`;
  } else {
    accion = `<button type="button" class="btn btn--primary btn--block" data-pagar ${enviando || !listo ? 'disabled' : ''}>${enviando ? 'Abriendo el pago…' : `Pagar ${dinero(c.total)}`}</button>`;
  }

  $('#prResumen').innerHTML = `
    <div class="pr-res">
      <p class="eyebrow">Tu pedido</p>
      ${c.lineas.length ? lineas : '<p class="pr-res__vacio">Elige tus horas o agrega algún servicio para empezar.</p>'}
      ${c.lineas.length ? `
        <div class="pr-res__total"><span>Total</span><b>${dinero(c.total)}<small>MXN</small></b></div>
        <p class="pr-res__iva">IVA incluido${c.total ? ` (${dinero(c.iva)})` : ''}.</p>
        ${ahorro ? `<p class="pr-res__ahorro">${check} Ahorras ${dinero(ahorro)} con este pedido</p>` : ''}` : ''}
      ${falta.map((e) => `<p class="pr-res__falta">${esc(e.mensaje)}</p>`).join('')}
      ${c.avisos.map((e) => `<p class="rv-aviso">${esc(e.mensaje)}</p>`).join('')}
      ${mensaje ? `<div class="rv-aviso" role="status">${mensaje}</div>` : ''}
      ${accion}
      ${c.lineas.length ? `<a class="pr-res__wa" href="${waPedido(c)}" target="_blank" rel="noopener">O mándanos el pedido por WhatsApp</a>` : ''}
      <p class="rv-nota">${esc(PRICING.policy)} ${esp.politica.antes === 'credito' ? '' : `Cambios de fecha con ${esp.politica.cambioH} horas de anticipación; las cancelaciones no son reembolsables.`}</p>
    </div>`;
  $('#prBarraTotal').textContent = dinero(c.total);
  $('#prBarra').classList.toggle('is-vacia', !c.lineas.length);
}

function waPedido(c: Cotizacion) {
  const s = sesion();
  const b = bloque();
  const fecha = s?.inicio && b ? `\nFecha: ${rangoTexto(new Date(s.inicio), new Date(new Date(s.inicio).getTime() + b.horas * 3600000), esp.zonaHoraria)}` : '';
  const texto = `Hola, armé este pedido en la página:\n\n${c.lineas.map((l) => `• ${l.concepto}: ${l.seCotiza ? 'por cotizar' : dinero(l.importe)}`).join('\n')}${fecha}\n\nTotal: ${dinero(c.total)} MXN`;
  return `https://wa.me/${LINKS.whatsappNumber}?text=${encodeURIComponent(texto)}`;
}

/* ---------- Datos ---------- */
function pintarDatos() {
  const paso = $('#pr-datos');
  paso.hidden = !enDatos;
  if (!enDatos) return;
  const c = q();
  const docs = esp.documentos ?? {};
  const campo = (k: 'nombre' | 'correo' | 'telefono', etq: string, tipo: string, ac: string) =>
    `<label class="rv-campo"><span>${etq}</span><input class="rv-input" name="${k}" type="${tipo}" value="${esc(datos[k])}" autocomplete="${ac}" required /></label>`;
  $('#prForm').innerHTML = `
    <div class="rv-grid">
      ${campo('nombre', 'Nombre completo', 'text', 'name')}
      ${campo('correo', 'Correo electrónico', 'email', 'email')}
      ${campo('telefono', 'WhatsApp o teléfono', 'tel', 'tel')}
    </div>
    ${c.seCotiza ? `<label class="rv-campo"><span>Cuéntanos de tu proyecto</span><textarea class="rv-input" name="descripcion" rows="3">${esc(datos.descripcion)}</textarea></label>` : ''}
    <div class="rv-legal">
      <label class="rv-check"><input type="checkbox" name="privacidad" ${datos.privacidad ? 'checked' : ''} /><span>Acepto el <a href="${esc(docs.privacidad ?? '../../aviso-de-privacidad/')}" target="_blank" rel="noopener">aviso de privacidad</a>.</span></label>
      <label class="rv-check"><input type="checkbox" name="terminos" ${datos.terminos ? 'checked' : ''} /><span>Acepto los <a href="${esc(docs.terminos ?? '../terminos/')}" target="_blank" rel="noopener">términos y condiciones</a>, incluida la política de cancelación.</span></label>
      <label class="rv-check rv-check--opcional"><input type="checkbox" name="promociones" ${datos.promociones ? 'checked' : ''} /><span>Quiero recibir promociones y novedades de Undying Studios (opcional).</span></label>
    </div>`;
}

function validar(): string | null {
  if (!datos.nombre.trim()) return 'Escribe tu nombre.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(datos.correo.trim())) return 'Revisa tu correo electrónico.';
  if (!datos.telefono.trim()) return 'Escribe tu WhatsApp o teléfono.';
  if (!datos.privacidad || !datos.terminos) return 'Acepta el aviso de privacidad y los términos.';
  return null;
}

async function pagar() {
  const falta = validar();
  if (falta) { mensaje = esc(falta); pintarResumen(); return; }
  const c = q();
  const conLegales = carrito.productos.some((p) => grupo(p.id) === 'legal');
  // En la prueba el pago real solo se hace contra la API y sin servicios legales,
  // que todavía no existen en el catálogo del back.
  if (fuente === 'demo' || conLegales) {
    mensaje = `<b>Página de prueba.</b> Aquí se abriría el pago seguro de Stripe por ${dinero(c.total)}.${conLegales && fuente === 'api' ? ' Los servicios legales todavía no están en el catálogo del back, por eso no se manda el pedido.' : ''}`;
    pintarResumen();
    return;
  }
  enviando = true; mensaje = ''; pintarResumen();
  try {
    const res = await llamar<{ url: string }>('POST', '/pedidos', {
      carrito,
      cliente: { nombre: datos.nombre, correo: datos.correo, telefono: datos.telefono, empresa: '' },
      datos: { proyecto: '', notas: 'Pedido desde la página de prueba', ingenieroCliente: null, factura: null },
      consentimiento: { privacidad: datos.privacidad, terminos: datos.terminos, reglamento: false, promociones: datos.promociones },
    });
    window.location.href = res.url;
  } catch (e) {
    enviando = false;
    mensaje = esc((e as ErrorApi).message);
    if (['HORARIO_OCUPADO', 'HORARIO_INVALIDO', 'FALTA_FECHA'].includes((e as ErrorApi).codigo) && sesion()) {
      sesion().inicio = null; ocupacionMes.clear(); calClave = '';
    }
    todo();
  }
}

async function enviarSolicitud() {
  if (!datos.nombre.trim() || !/@/.test(datos.correo) || !datos.descripcion.trim()) { mensaje = 'Escribe tu nombre, correo y una descripción del proyecto.'; pintarResumen(); return; }
  if (!datos.privacidad) { mensaje = 'Acepta el aviso de privacidad.'; pintarResumen(); return; }
  if (fuente === 'demo') { mensaje = '<b>Página de prueba.</b> Aquí se mandaría la solicitud y el equipo responde con el precio.'; pintarResumen(); return; }
  enviando = true; pintarResumen();
  try {
    await llamar('POST', '/solicitudes', { carrito, nombre: datos.nombre, correo: datos.correo, telefono: datos.telefono, descripcion: datos.descripcion });
    mensaje = `Recibimos tu solicitud. Te escribimos a ${esc(datos.correo)} con la cotización.`;
  } catch (e) { mensaje = esc((e as Error).message); }
  enviando = false; pintarResumen();
}

/* ---------- Paquetes de inicio ---------- */
function pintarPresets() {
  const chips = [...PRICING.presets.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })), { id: 'post', name: 'Solo postproducción' }];
  $('#prPresets').innerHTML = chips.map((p) => `<button type="button" class="pr-chip" data-preset="${p.id}" aria-pressed="${preset === p.id}">${esc(p.name)}</button>`).join('');
}

function aplicarPreset(id: string) {
  preset = preset === id ? null : id;
  mensaje = '';
  if (!preset) { carrito.sesiones = []; carrito.productos = []; sinHoras = false; return todo(); }
  if (id === 'post') {
    carrito.sesiones = [];
    carrito.productos = [{ id: 'mezcla', cantidad: 1 }, { id: 'master', cantidad: 1 }];
    sinHoras = true;
    return todo();
  }
  const p = PRICING.presets.find((x: { id: string }) => x.id === id);
  const b = cat.bloques.find((x) => x.id === `estudio-${p.block}`) ?? bloquesDe(cat, ESPACIO)[0];
  const inicio = sesion()?.bloqueId === b.id ? sesion().inicio : null;
  carrito.sesiones = [{ bloqueId: b.id, modalidadId: modo, inicio, extras: [] }];
  carrito.productos = Object.entries(p.products as Record<string, number>).filter(([pid]) => cat.productos.some((x) => x.id === pid)).map(([pid, cantidad]) => ({ id: pid, cantidad, sesion: pr(pid).unidad === 'sesion' ? 0 : null }));
  sinHoras = false;
  todo();
}

/* ---------- Pintar todo ---------- */
// pintarFecha solo vuelve a montar el calendario si cambió el bloque.
function todo() {
  pintarPresets();
  pintarHoras();
  pintarFecha();
  pintarSesion();
  pintarPost();
  pintarLegal();
  pintarDatos();
  pintarResumen();
}

/* ---------- Eventos ---------- */
document.addEventListener('click', (ev) => {
  const t = ev.target as HTMLElement;
  const el = <T extends HTMLElement = HTMLElement>(s: string) => t.closest<T>(s);
  if (el('[data-modo]')) {
    modo = el('[data-modo]')!.dataset.modo!;
    if (sesion()) sesion().modalidadId = modo;
    todo();
  } else if (el('[data-bloque]')) {
    const id = el('[data-bloque]')!.dataset.bloque!;
    elegirBloque(id);
    if (!sesion()?.inicio) requestAnimationFrame(() => $('#pr-fecha').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  } else if (el('[data-plan]') && !el('a, button, input')) {
    elegirBloque(el('[data-plan]')!.dataset.plan!);
  } else if (el('#prSinHoras')) {
    elegirBloque(null);
    if (sinHoras) requestAnimationFrame(() => $('#pr-post').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  } else if (el('[data-cant]')) {
    const b = el('[data-cant]')!;
    const p = pr(b.dataset.prod!);
    let it = carrito.productos.find((x) => x.id === p.id);
    if (!it) { it = { id: p.id, cantidad: 0, sesion: p.unidad === 'sesion' ? 0 : null, datos: [] }; carrito.productos.push(it); }
    it.cantidad = Math.max(0, Math.min(p.maxPorSesion ?? p.maxCantidad, it.cantidad + Number(b.dataset.cant)));
    it.datos = (it.datos ?? []).slice(0, it.cantidad);
    carrito.productos = carrito.productos.filter((x) => x.cantidad > 0);
    todo();
  } else if (el('[data-ver-todos]')) {
    verTodos = !verTodos;
    pintarLegal();
  } else if (el('[data-preset]')) {
    aplicarPreset(el('[data-preset]')!.dataset.preset!);
  } else if (el('[data-continuar]')) {
    enDatos = true; mensaje = '';
    todo();
    requestAnimationFrame(() => { $('#pr-datos').scrollIntoView({ behavior: 'smooth', block: 'start' }); $<HTMLInputElement>('#prForm input[name="nombre"]')?.focus({ preventScroll: true }); });
  } else if (el('[data-pagar]')) {
    pagar();
  } else if (el('[data-enviar]')) {
    enviarSolicitud();
  } else if (el('[data-ir]')) {
    ev.preventDefault();
    $('#' + el('[data-ir]')!.dataset.ir).scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (el('#prBarraBtn')) {
    $('#prResumen').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

document.addEventListener('change', (ev) => {
  const t = ev.target as HTMLInputElement;
  if (t.dataset.extra && sesion()) {
    const s = sesion();
    s.extras = (s.extras ?? []).filter((x) => x.id !== t.dataset.extra);
    if (t.checked) s.extras.push({ id: t.dataset.extra, opcion: null, texto: null });
    todo();
  } else if (t.form?.id === 'prForm' && t.type === 'checkbox') {
    (datos as Record<string, unknown>)[t.name] = t.checked;
    mensaje = '';
    pintarResumen();
  }
});

document.addEventListener('input', (ev) => {
  const t = ev.target as HTMLInputElement;
  if (t.dataset.prodCampo) {
    const it = carrito.productos.find((p) => p.id === t.dataset.prodCampo);
    if (!it) return;
    it.datos = it.datos ?? [];
    const u = Number(t.dataset.unidad);
    it.datos[u] = { ...(it.datos[u] ?? {}), [t.dataset.campo!]: t.value };
    pintarResumen();
  } else if (t.form?.id === 'prForm' && t.type !== 'checkbox') {
    (datos as Record<string, unknown>)[t.name] = t.value;
  }
});

/* ---------- Arranque ---------- */
async function iniciar() {
  let base: Catalogo | null = null;
  if (reservasActivas()) {
    try {
      const r = await catalogoApi(ESPACIO);
      base = r.catalogo;
      desfase = new Date(r.ahora).getTime() - Date.now();
      fuente = 'api';
    } catch { /* sin API: demostración */ }
  }
  cat = conLegales(base ?? catalogoDemo());
  esp = cat.espacios.find((e) => e.id === ESPACIO)!;
  modo = modalidadesDe(cat, ESPACIO)[0]?.id ?? modo;
  const demo = $('#prDemo');
  demo.hidden = false;
  demo.innerHTML = fuente === 'api'
    ? '<b>Página de prueba</b> con el catálogo y la agenda reales del sistema de reservas. Los servicios legales se agregan aquí mientras llegan al catálogo.'
    : '<b>Página de prueba en modo demostración:</b> precios del sitio y horarios de ejemplo, sin ocupación real. No se cobra nada.';
  todo();
}
iniciar();
