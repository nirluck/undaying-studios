// Reserva en línea: arma el pedido (sesiones, extras y postproducción),
// muestra los horarios disponibles, pide los datos y manda a Stripe.
// Se monta en las landings del estudio y del foro.

import type { Carrito, Catalogo, Cotizacion, Dia, Espacio, Extra, Horario, Producto, Rango, SesionCarrito } from '../../supabase/functions/_shared/core/mod.ts';
import {
  ahorroBloque, bloquesDe, calendario, cotizar, dinero, extrasDe, fechaLocal, horasTexto, modalidadesDe, ocupacionDeCarrito,
  opcionesVisita, precioVigente, productosDe, rangoTexto, horariosDelDia, claveExtra,
} from '../../supabase/functions/_shared/core/mod.ts';
import { catalogo, disponibilidad, ErrorApi, llamar, type RespuestaCatalogo } from './api.ts';
import { montarCalendario } from './calendario.ts';
import './reservas.css';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)!;

export interface OpcionesAbrir {
  carrito?: Partial<Carrito>;
  bloqueId?: string;
  modalidadId?: string;
  /** Código de una cotización compartida. */
  cotizacion?: string;
}

interface Datos {
  nombre: string; correo: string; telefono: string; empresa: string; proyecto: string; notas: string;
  ingNombre: string; ingTelefono: string;
  factura: boolean; rfc: string; razonSocial: string; regimen: string; cp: string; usoCfdi: string;
  privacidad: boolean; terminos: boolean; reglamento: boolean; promociones: boolean; descripcion: string;
}

const REGIMENES = ['601 General de Ley Personas Morales', '603 Personas Morales con Fines no Lucrativos', '605 Sueldos y Salarios', '606 Arrendamiento', '612 Personas Físicas con Actividades Empresariales y Profesionales', '616 Sin obligaciones fiscales', '621 Incorporación Fiscal', '626 Régimen Simplificado de Confianza'];
const USOS = ['G03 Gastos en general', 'G01 Adquisición de mercancías', 'S01 Sin efectos fiscales'];

const guardar = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
const leer = <T>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } };

export function crearReservas(espacioId: string) {
  let dlg: HTMLDialogElement | null = null;
  let r: RespuestaCatalogo;
  let cat: Catalogo;
  let esp: Espacio;
  let desfase = 0;
  const ahora = () => new Date(Date.now() + desfase);
  let carrito: Carrito = { espacioId, sesiones: [], productos: [] };
  let paso: 1 | 2 | 3 = 1;
  let qServidor: Cotizacion | null = null;
  let cuponAplicado: string | null = null;
  let error = '';
  let enviando = false;
  let compartido: { url: string } | null = null;
  const errorSesion = new Map<number, string>();
  const ocupacionMes = new Map<string, Promise<Rango[]>>();
  const datosKey = 'rv-datos';
  const carritoKey = `rv-carrito-${espacioId}`;
  const datos: Datos = {
    nombre: '', correo: '', telefono: '', empresa: '', proyecto: '', notas: '', ingNombre: '', ingTelefono: '',
    factura: false, rfc: '', razonSocial: '', regimen: '', cp: '', usoCfdi: USOS[0], privacidad: false, terminos: false, reglamento: false, promociones: false, descripcion: '',
    ...(leer<Partial<Datos>>(datosKey) ?? {}),
  };
  datos.privacidad = datos.terminos = datos.reglamento = datos.promociones = false;

  // ---------- Datos ----------

  async function preparar() {
    r = await catalogo(espacioId);
    cat = r.catalogo;
    esp = cat.espacios[0];
    desfase = new Date(r.ahora).getTime() - Date.now();
  }

  const ocupacion = (desde: string): Promise<Rango[]> => {
    const k = desde.slice(0, 7);
    if (!ocupacionMes.has(k)) {
      const [a, m] = desde.split('-').map(Number);
      const fin = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
      const p = disponibilidad(espacioId, `${k}-01`, fin).then((x) => x.ocupacion);
      p.catch(() => ocupacionMes.delete(k));
      ocupacionMes.set(k, p);
    }
    return ocupacionMes.get(k)!;
  };

  const sesionNueva = (bloqueId?: string, modalidadId?: string): SesionCarrito => {
    const bloques = bloquesDe(cat, espacioId);
    const mods = modalidadesDe(cat, espacioId);
    return {
      bloqueId: bloques.find((b) => b.id === bloqueId)?.id ?? bloques.find((b) => b.destacado)?.id ?? bloques[0]?.id,
      modalidadId: mods.find((m) => m.id === modalidadId)?.id ?? carrito.sesiones[0]?.modalidadId ?? mods[0]?.id,
      inicio: null, extras: [],
    };
  };

  const local = (): Cotizacion => cotizar(carrito, cat, { ahora: ahora() });
  const cotizacion = () => qServidor ?? local();

  let tCot = 0;
  function refrescarServidor() {
    qServidor = null;
    if (!cuponAplicado && !(paso === 2 && /@/.test(datos.correo))) return;
    clearTimeout(tCot);
    tCot = window.setTimeout(async () => {
      try {
        qServidor = await llamar<Cotizacion>('POST', '/cotizar', { carrito: { ...carrito, cupon: cuponAplicado }, correo: paso === 2 ? datos.correo : undefined });
      } catch (e) {
        if ((e as ErrorApi).codigo === 'CUPON_INVALIDO') { cuponAplicado = null; error = (e as Error).message; }
      }
      pintarResumen();
    }, 350);
  }

  function cambio(repintar: 'todo' | 'resumen' = 'todo') {
    carrito.cupon = cuponAplicado;
    guardar(carritoKey, { carrito, fecha: Date.now() });
    compartido = null;
    error = '';
    refrescarServidor();
    if (repintar === 'todo') pintar(); else pintarResumen();
  }

  // ---------- Disponibilidad por sesión ----------

  function opcionesSesion(i: number, ocup: Rango[]) {
    const s = carrito.sesiones[i];
    const bloque = cat.bloques.find((b) => b.id === s.bloqueId)!;
    const sinEsta = { ...carrito, sesiones: carrito.sesiones.map((x, k) => (k === i ? { ...x, inicio: null } : x)) };
    const propias = ocupacionDeCarrito(sinEsta, cat);
    const extras = (s.extras ?? []).map((x) => cat.extras.find((e) => e.id === x.id)).filter((x): x is Extra => !!x);
    // Para la pintura no cuentan las sesiones del mismo pedido con el mismo color (se pinta una vez).
    const mismasClaves = new Set((s.extras ?? []).map(claveExtra));
    const pinturaPropia = propias.filter((p) => {
      const otra = carrito.sesiones[p.sesion!];
      return !(otra.extras ?? []).some((x) => mismasClaves.has(claveExtra(x)));
    });
    return {
      catalogo: cat, espacio: esp, duracionMin: bloque.horas * 60, ahora: ahora(), extras,
      ocupacion: [...ocup, ...propias], ocupacionExtras: [...ocup, ...pinturaPropia],
    };
  }

  async function diasSesion(i: number, desde: string, hasta: string): Promise<Dia[]> {
    const ocup = await ocupacion(desde);
    return calendario(opcionesSesion(i, ocup), desde, hasta);
  }

  /** Si cambió el bloque o un extra, revisa que la hora elegida siga disponible. */
  async function revalidar(i: number) {
    const s = carrito.sesiones[i];
    if (!s?.inicio) return;
    const fecha = fechaLocal(new Date(s.inicio), esp.zonaHoraria);
    const ocup = await ocupacion(fecha);
    const dia = horariosDelDia(opcionesSesion(i, ocup), fecha);
    if (!dia.horarios.some((h) => h.inicio === s.inicio)) {
      s.inicio = null;
      errorSesion.set(i, dia.motivo && !dia.horarios.length ? `${dia.motivo} Elige otra fecha.` : 'Con este cambio, la hora que elegiste ya no está disponible. Elige otra.');
      cambio();
    }
  }

  // ---------- Pintura ----------

  function abrirDialogo(titulo: string) {
    dlg?.remove();
    dlg = document.createElement('dialog');
    dlg.className = 'rv';
    dlg.setAttribute('data-lenis-prevent', '');
    dlg.setAttribute('aria-labelledby', 'rv-titulo');
    dlg.innerHTML = `
      <div class="rv__panel">
        <header class="rv__cab">
          <div><p class="eyebrow">Reserva en línea</p><h2 id="rv-titulo">${esc(titulo)}</h2></div>
          <ol class="rv__pasos" aria-label="Pasos"></ol>
          <button class="rv__cerrar" type="button" aria-label="Cerrar">×</button>
        </header>
        <div class="rv__cuerpo">
          <div class="rv__principal"></div>
          <aside class="rv__resumen" aria-live="polite"></aside>
        </div>
        <div class="rv__barra"><span></span><button type="button" class="btn btn--primary btn--sm" data-ir-resumen>Ver resumen</button></div>
      </div>`;
    document.body.appendChild(dlg);
    document.documentElement.classList.add('rv-abierto');
    dlg.addEventListener('close', () => { document.documentElement.classList.remove('rv-abierto'); dlg?.remove(); dlg = null; });
    dlg.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t === dlg || t.closest('.rv__cerrar')) dlg!.close();
      else if (t.closest('[data-ir-resumen]')) $('.rv__resumen', dlg!).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    dlg.showModal();
    return dlg;
  }

  function pintar() {
    if (!dlg) return;
    const pasos = $('.rv__pasos', dlg);
    pasos.innerHTML = ['Tu pedido', 'Tus datos'].map((t, k) => `<li class="${paso === k + 1 ? 'is-on' : paso > k + 1 ? 'is-ok' : ''}">${t}</li>`).join('');
    const p = $('.rv__principal', dlg);
    if (paso === 1) pintarPedido(p);
    else if (paso === 2) pintarDatos(p);
    pintarResumen();
  }

  function pintarPedido(p: HTMLElement) {
    const mods = modalidadesDe(cat, espacioId);
    const bloques = bloquesDe(cat, espacioId);
    const productos = productosDe(cat, espacioId);
    const sesiones = carrito.sesiones.map((s, i) => {
      const bloque = cat.bloques.find((b) => b.id === s.bloqueId);
      const extras = extrasDe(cat, espacioId);
      const elegido = s.inicio && bloque ? rangoTexto(new Date(s.inicio), new Date(new Date(s.inicio).getTime() + bloque.horas * 3600000), esp.zonaHoraria) : '';
      return `
      <section class="rv-ses" data-sesion="${i}">
        <div class="rv-ses__cab">
          <h3>${carrito.sesiones.length > 1 ? `Sesión ${i + 1}` : 'Tu sesión'}</h3>
          ${carrito.sesiones.length > 1 || carrito.productos.length ? `<button type="button" class="rv-link" data-quitar-sesion="${i}">Quitar</button>` : ''}
        </div>
        ${mods.length > 1 ? `
        <div class="rv-opciones" role="radiogroup" aria-label="Modalidad">
          ${mods.map((m) => `<button type="button" role="radio" class="rv-op" data-modalidad="${m.id}" aria-checked="${m.id === s.modalidadId}"><b>${esc(m.nombre)}</b><span>${esc(m.nota ?? '')}</span></button>`).join('')}
        </div>` : ''}
        <div class="rv-bloques" role="radiogroup" aria-label="Horas">
          ${bloques.map((b) => {
            const precio = precioVigente(b.precios[s.modalidadId], ahora());
            const ahorro = ahorroBloque(cat, b, s.modalidadId, ahora());
            return `<button type="button" role="radio" class="rv-bloque" data-bloque="${b.id}" aria-checked="${b.id === s.bloqueId}" ${precio == null ? 'disabled' : ''}>
              <b>${horasTexto(b.horas)}</b><span>${precio == null ? 'No disponible' : dinero(precio)}</span>${ahorro ? `<em>${ahorro}% menos</em>` : ''}</button>`;
          }).join('')}
        </div>
        ${extras.length ? `<div class="rv-extras">${extras.map((x) => pintarExtra(i, s, x)).join('')}</div>` : ''}
        <div class="rv-fecha">
          <p class="rv-etq">Fecha y hora${elegido ? `: <b>${esc(elegido)}</b>` : ''}</p>
          ${errorSesion.get(i) ? `<p class="rv-error">${esc(errorSesion.get(i))}</p>` : ''}
          <div class="rv-cal" id="rv-cal-${i}"></div>
        </div>
      </section>`;
    }).join('');

    const prods = productos.length ? `
      <section class="rv-prods">
        <h3>${espacioId === 'estudio' ? 'Postproducción y servicios' : 'Servicios'}</h3>
        <p class="rv-ayuda">Se pagan por pieza. ${espacioId === 'estudio' ? 'Puedes pedirlos con o sin horas de estudio.' : ''}</p>
        ${productos.map((pr) => pintarProducto(pr)).join('')}
      </section>` : '';

    p.innerHTML = `
      ${sesiones}
      ${esp.variasSesiones || !carrito.sesiones.length ? `<button type="button" class="rv-agregar" data-agregar-sesion>${carrito.sesiones.length ? '+ Agregar otra sesión' : '+ Agregar horas de ' + esc(esp.nombreCorto.toLowerCase())}</button>` : ''}
      ${prods}`;

    carrito.sesiones.forEach((s, i) => {
      const cont = document.getElementById(`rv-cal-${i}`);
      if (!cont) return;
      const fecha = s.inicio ? fechaLocal(new Date(s.inicio), esp.zonaHoraria) : null;
      montarCalendario(cont, {
        hoy: fechaLocal(ahora(), esp.zonaHoraria), zona: esp.zonaHoraria, fecha, inicio: s.inicio,
        dias: (d, h) => diasSesion(i, d, h),
        alElegir: (h: Horario) => {
          carrito.sesiones[i].inicio = h.inicio;
          errorSesion.delete(i);
          cambio('resumen');
          const etq = $(`[data-sesion="${i}"] .rv-etq`, dlg!);
          const b = cat.bloques.find((x) => x.id === carrito.sesiones[i].bloqueId)!;
          etq.innerHTML = `Fecha y hora: <b>${esc(rangoTexto(new Date(h.inicio), new Date(new Date(h.inicio).getTime() + b.horas * 3600000), esp.zonaHoraria))}</b>`;
        },
      });
    });
  }

  function pintarExtra(i: number, s: SesionCarrito, x: Extra) {
    const sel = (s.extras ?? []).find((e) => e.id === x.id);
    const aplica = !x.bloques || x.bloques.includes(s.bloqueId);
    const precio = precioVigente(x.precio, ahora());
    const permitidos = (x.bloques ?? []).map((id) => cat.bloques.find((b) => b.id === id)).filter(Boolean).map((b) => horasTexto(b!.horas));
    return `
      <div class="rv-extra${sel ? ' is-on' : ''}${aplica ? '' : ' is-off'}">
        <label class="rv-check">
          <input type="checkbox" data-extra="${x.id}" ${sel ? 'checked' : ''} ${aplica ? '' : 'disabled'} />
          <span><b>${esc(x.nombre)}</b> <i>${precio == null ? 'se cotiza' : '+ ' + dinero(precio)}</i></span>
        </label>
        <p class="rv-ayuda">${aplica ? esc(x.descripcion ?? '') : `Disponible en el bloque de ${permitidos.join(' o ')}.`}</p>
        ${sel && x.opciones.length ? `
        <div class="rv-colores" role="radiogroup" aria-label="${esc(x.nombre)}">
          ${x.opciones.map((o) => `<button type="button" role="radio" class="rv-color" data-extra-op="${x.id}" data-op="${o.id}" aria-checked="${sel.opcion === o.id}">${o.muestra ? `<i style="background:${esc(o.muestra)}"></i>` : '<i class="is-otro"></i>'}${esc(o.nombre)}</button>`).join('')}
        </div>
        ${x.opciones.find((o) => o.id === sel.opcion)?.pideTexto ? `<input class="rv-input" data-extra-texto="${x.id}" value="${esc(sel.texto ?? '')}" placeholder="${esc(x.opciones.find((o) => o.id === sel.opcion)?.ayuda ?? '')}" maxlength="120" />` : ''}` : ''}
      </div>`;
    void i;
  }

  function pintarProducto(pr: Producto) {
    const precio = precioVigente(pr.precio, ahora());
    const porSesion = pr.unidad === 'sesion' && carrito.sesiones.length > 1;
    const filas = porSesion ? carrito.sesiones.map((_, k) => k) : [null];
    const unidad = pr.unidad === 'cancion' ? 'por canción' : pr.unidad === 'sesion' ? 'por sesión' : 'por pieza';
    const bloqueado = pr.requiereSesion && !carrito.sesiones.length;
    return `
      <div class="rv-prod${bloqueado ? ' is-off' : ''}" data-producto="${pr.id}">
        <div class="rv-prod__info">
          <b>${esc(pr.nombre)}</b>
          <span>${precio == null ? 'Se cotiza' : `${dinero(precio)} ${unidad}`}</span>
          <details><summary>Qué incluye</summary><p>${esc(pr.descripcion ?? '')}${pr.entregaDias ? ` Entrega en ${pr.entregaDias} días hábiles desde que recibimos tu material.` : ''}</p></details>
          ${bloqueado ? '<p class="rv-ayuda">Se contrata junto con horas de estudio.</p>' : ''}
        </div>
        <div class="rv-prod__cant">
          ${filas.map((k) => {
            const item = carrito.productos.find((x) => x.id === pr.id && (k == null || x.sesion === k));
            const n = item?.cantidad ?? 0;
            const campos = pr.campos.filter((c) => c.alReservar);
            return `
            <div class="rv-paso">
              ${k != null ? `<span class="rv-paso__ses">Sesión ${k + 1}</span>` : ''}
              <div class="rv-stepper" role="group" aria-label="Cantidad de ${esc(pr.nombre)}">
                <button type="button" data-cant="-1" data-prod="${pr.id}" data-ses="${k ?? ''}" ${n ? '' : 'disabled'} aria-label="Quitar uno">−</button>
                <output>${n}</output>
                <button type="button" data-cant="1" data-prod="${pr.id}" data-ses="${k ?? ''}" ${bloqueado || n >= (pr.maxPorSesion ?? pr.maxCantidad) ? 'disabled' : ''} aria-label="Agregar uno">+</button>
              </div>
            </div>
            ${campos.length && n ? Array.from({ length: n }, (_, u) => campos.map((c) => `<input class="rv-input rv-input--sm" data-prod-campo="${pr.id}" data-ses="${k ?? ''}" data-unidad="${u}" data-campo="${c.id}" value="${esc(item?.datos?.[u]?.[c.id] ?? '')}" placeholder="${esc(c.etiqueta)} ${n > 1 ? u + 1 : ''}" maxlength="80" />`).join('')).join('') : ''}`;
          }).join('')}
        </div>
      </div>`;
  }

  function pintarDatos(p: HTMLElement) {
    const q = cotizacion();
    const docs = esp.documentos ?? {};
    const pideIng = carrito.sesiones.some((s) => cat.modalidades.find((m) => m.id === s.modalidadId)?.pideIngenieroCliente);
    const campo = (k: keyof Datos, etiqueta: string, tipo = 'text', extra = '') => `
      <label class="rv-campo"><span>${etiqueta}</span><input class="rv-input" name="${k}" type="${tipo}" value="${esc(datos[k] as string)}" ${extra} /></label>`;
    p.innerHTML = `
      <form class="rv-form" novalidate>
        <h3>Tus datos</h3>
        <div class="rv-grid">
          ${campo('nombre', 'Nombre completo', 'text', 'autocomplete="name" required maxlength="120"')}
          ${campo('correo', 'Correo electrónico', 'email', 'autocomplete="email" required maxlength="200"')}
          ${campo('telefono', 'WhatsApp o teléfono', 'tel', 'autocomplete="tel" required maxlength="40"')}
          ${campo('empresa', 'Empresa o productora (opcional)', 'text', 'autocomplete="organization" maxlength="120"')}
        </div>
        ${campo('proyecto', espacioId === 'foro' ? 'Producción o proyecto (opcional)' : 'Artista o proyecto (opcional)', 'text', 'maxlength="160"')}
        ${pideIng ? `
        <fieldset class="rv-grupo"><legend>Tu ingeniero (Dry Hire)</legend>
          <p class="rv-ayuda">Para darle la inducción del setup. Puedes dejarlo vacío y avisarnos después.</p>
          <div class="rv-grid">${campo('ingNombre', 'Nombre', 'text', 'maxlength="120"')}${campo('ingTelefono', 'Teléfono', 'tel', 'maxlength="40"')}</div>
        </fieldset>` : ''}
        ${q.seCotiza ? `
        <label class="rv-campo"><span>Cuéntanos de tu proyecto</span><textarea class="rv-input" name="descripcion" rows="4" maxlength="4000" required>${esc(datos.descripcion)}</textarea></label>` : `
        <label class="rv-campo"><span>Notas para el equipo (opcional)</span><textarea class="rv-input" name="notas" rows="2" maxlength="1000">${esc(datos.notas)}</textarea></label>
        <label class="rv-check"><input type="checkbox" name="factura" ${datos.factura ? 'checked' : ''} /><span>Necesito factura</span></label>
        ${datos.factura ? `
        <fieldset class="rv-grupo"><legend>Datos de facturación</legend>
          <div class="rv-grid">
            ${campo('rfc', 'RFC', 'text', 'maxlength="13" autocapitalize="characters"')}
            ${campo('razonSocial', 'Razón social', 'text', 'maxlength="200"')}
            <label class="rv-campo"><span>Régimen fiscal</span><select class="rv-input" name="regimen"><option value="">Elige</option>${REGIMENES.map((x) => `<option ${datos.regimen === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
            ${campo('cp', 'Código postal fiscal', 'text', 'maxlength="5" inputmode="numeric"')}
            <label class="rv-campo"><span>Uso del CFDI</span><select class="rv-input" name="usoCfdi">${USOS.map((x) => `<option ${datos.usoCfdi === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          </div>
        </fieldset>` : ''}`}
        <div class="rv-legal">
          <label class="rv-check"><input type="checkbox" name="privacidad" ${datos.privacidad ? 'checked' : ''} /><span>Acepto el <a href="${esc(docs.privacidad ?? '/aviso-de-privacidad/')}" target="_blank" rel="noopener">aviso de privacidad</a>.</span></label>
          <label class="rv-check"><input type="checkbox" name="terminos" ${datos.terminos ? 'checked' : ''} /><span>Acepto los <a href="${esc(docs.terminos ?? '#')}" target="_blank" rel="noopener">términos y condiciones</a>, incluida la política de cancelación.</span></label>
          ${docs.reglamento ? `<label class="rv-check"><input type="checkbox" name="reglamento" ${datos.reglamento ? 'checked' : ''} /><span>Leí el <a href="${esc(docs.reglamento)}" target="_blank" rel="noopener">reglamento de uso del foro</a>.</span></label>` : ''}
          <label class="rv-check rv-check--opcional"><input type="checkbox" name="promociones" ${datos.promociones ? 'checked' : ''} /><span>Quiero recibir promociones y novedades de Undying Studios (opcional).</span></label>
        </div>
      </form>`;
  }

  function pintarResumen() {
    if (!dlg) return;
    const q = cotizacion();
    const a = $('.rv__resumen', dlg);
    const barra = $('.rv__barra span', dlg);
    barra.innerHTML = q.lineas.length ? `Total <b>${dinero(q.total)}</b>` : '';
    const errores = q.errores.filter((e) => !(paso === 1 && e.codigo === 'FALTA_FECHA'));
    const faltaFecha = q.errores.some((e) => e.codigo === 'FALTA_FECHA');
    const pol = esp.politica;
    const metodos = ['tarjeta de crédito o débito', ...(q.msi ? ['meses sin intereses'] : []), ...(q.oxxo.disponible ? ['efectivo en OXXO'] : [])];
    let accion = '';
    if (paso === 1) {
      accion = `<button type="button" class="btn btn--primary btn--block" data-continuar ${q.lineas.length && !errores.length && !faltaFecha ? '' : 'disabled'}>Continuar</button>
        ${faltaFecha ? `<p class="rv-ayuda">${esc(q.errores.find((e) => e.codigo === 'FALTA_FECHA')!.mensaje)}</p>` : ''}`;
    } else if (paso === 2) {
      accion = q.seCotiza
        ? `<button type="button" class="btn btn--primary btn--block" data-solicitud ${enviando ? 'disabled' : ''}>${enviando ? 'Enviando…' : 'Enviar solicitud'}</button>`
        : `<button type="button" class="btn btn--primary btn--block" data-pagar ${enviando || !q.pagable ? 'disabled' : ''}>${enviando ? 'Abriendo el pago…' : q.total > 0 ? `Pagar ${dinero(q.total)}` : 'Confirmar con mi saldo a favor'}</button>
          <button type="button" class="rv-link" data-volver>Volver a mi pedido</button>`;
    }
    a.innerHTML = `
      <h3>Resumen</h3>
      ${q.lineas.length ? `<ul class="rv-lineas">${q.lineas.map((l) => `<li><span>${esc(l.concepto)}</span><b>${l.seCotiza ? 'por cotizar' : dinero(l.importe)}</b></li>`).join('')}</ul>
        <p class="rv-total"><span>Total</span><b>${dinero(q.total)} <small>MXN</small></b></p>
        <p class="rv-iva">IVA incluido${q.total ? ` (${dinero(q.iva)})` : ''}.</p>` : '<p class="rv-ayuda">Todavía no hay nada en tu pedido.</p>'}
      ${paso === 1 && q.lineas.length ? `
        <details class="rv-cupon" ${cuponAplicado ? 'open' : ''}><summary>¿Tienes un cupón?</summary>
          <div class="rv-cupon__fila"><input class="rv-input rv-input--sm" data-cupon value="${esc(cuponAplicado ?? '')}" placeholder="Código" maxlength="40" /><button type="button" class="btn btn--ghost btn--sm" data-aplicar-cupon>${cuponAplicado ? 'Quitar' : 'Aplicar'}</button></div>
        </details>` : ''}
      ${errores.map((e) => `<p class="rv-error">${esc(e.mensaje)}</p>`).join('')}
      ${q.avisos.map((e) => `<p class="rv-aviso">${esc(e.mensaje)}</p>`).join('')}
      ${error ? `<p class="rv-error" role="alert">${esc(error)}</p>` : ''}
      ${accion}
      ${paso === 2 && !q.seCotiza ? `
        <p class="rv-nota">Pagas en la página segura de Stripe con ${metodos.join(', ').replace(/, ([^,]*)$/, ' o $1')}. Tu horario queda apartado ${esp.pago.apartadoMin} minutos mientras pagas.</p>
        ${!q.oxxo.disponible && q.oxxo.motivo && esp.pago.oxxo.activo ? `<p class="rv-nota">${esc(q.oxxo.motivo)}</p>` : ''}` : ''}
      <p class="rv-nota">${pol.antes === 'credito' ? `Cambios de fecha con ${pol.cambioH} horas de anticipación. Si cancelas con más de ${pol.cancelacionH} horas, el pago queda como saldo a favor por ${pol.creditoDias} días.` : `Cambios de fecha con ${pol.cambioH} horas de anticipación. Las cancelaciones no son reembolsables.`}</p>
      ${paso === 1 && q.lineas.length ? `<div class="rv-compartir">
        ${compartido ? `<label class="rv-campo"><span>Enlace de tu cotización</span><input class="rv-input rv-input--sm" readonly value="${esc(compartido.url)}" data-copiar /></label>
          <a class="rv-link" target="_blank" rel="noopener" href="https://wa.me/${r.negocio.whatsapp}?text=${encodeURIComponent(`Hola, armé esta cotización en la página: ${compartido.url}`)}">Mandarla por WhatsApp</a>`
        : '<button type="button" class="rv-link" data-compartir>Guardar y compartir esta cotización</button>'}
      </div>` : ''}`;
  }

  // ---------- Eventos ----------

  function enlazar() {
    const d = dlg!;
    d.addEventListener('click', async (ev) => {
      const t = ev.target as HTMLElement;
      const ses = t.closest<HTMLElement>('[data-sesion]');
      const i = ses ? Number(ses.dataset.sesion) : -1;
      const btn = (sel: string) => t.closest<HTMLElement>(sel);

      if (btn('[data-modalidad]') && i >= 0) {
        carrito.sesiones[i].modalidadId = btn('[data-modalidad]')!.dataset.modalidad!;
        cambio();
      } else if (btn('[data-bloque]') && i >= 0) {
        const nuevo = btn('[data-bloque]')!.dataset.bloque!;
        if (nuevo !== carrito.sesiones[i].bloqueId) {
          carrito.sesiones[i].bloqueId = nuevo;
          carrito.sesiones[i].extras = (carrito.sesiones[i].extras ?? []).filter((x) => { const e = cat.extras.find((y) => y.id === x.id); return !e?.bloques || e.bloques.includes(nuevo); });
          cambio();
          revalidar(i);
        }
      } else if (btn('[data-extra-op]') && i >= 0) {
        const b = btn('[data-extra-op]')!;
        const x = carrito.sesiones[i].extras!.find((e) => e.id === b.dataset.extraOp)!;
        x.opcion = b.dataset.op!;
        if (!cat.extras.find((e) => e.id === x.id)?.opciones.find((o) => o.id === x.opcion)?.pideTexto) x.texto = null;
        cambio();
      } else if (btn('[data-quitar-sesion]')) {
        const k = Number(btn('[data-quitar-sesion]')!.dataset.quitarSesion);
        carrito.sesiones.splice(k, 1);
        carrito.productos = carrito.productos.filter((p) => p.sesion == null || p.sesion !== k).map((p) => ({ ...p, sesion: p.sesion != null && p.sesion > k ? p.sesion - 1 : p.sesion }));
        errorSesion.clear();
        cambio();
      } else if (btn('[data-agregar-sesion]')) {
        const prev = carrito.sesiones.at(-1);
        carrito.sesiones.push(sesionNueva(prev?.bloqueId, prev?.modalidadId));
        cambio();
        requestAnimationFrame(() => $(`[data-sesion="${carrito.sesiones.length - 1}"]`, d)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      } else if (btn('[data-cant]')) {
        const b = btn('[data-cant]')!;
        const id = b.dataset.prod!;
        const sesion = b.dataset.ses === '' ? null : Number(b.dataset.ses);
        const pr = cat.productos.find((p) => p.id === id)!;
        let item = carrito.productos.find((p) => p.id === id && (sesion == null || p.sesion === sesion));
        if (!item) { item = { id, cantidad: 0, sesion: sesion ?? (pr.unidad === 'sesion' ? 0 : null), datos: [] }; carrito.productos.push(item); }
        item.cantidad = Math.max(0, Math.min(pr.maxPorSesion ?? pr.maxCantidad, item.cantidad + Number(b.dataset.cant)));
        item.datos = (item.datos ?? []).slice(0, item.cantidad);
        carrito.productos = carrito.productos.filter((p) => p.cantidad > 0);
        cambio();
      } else if (btn('[data-continuar]')) {
        paso = 2;
        refrescarServidor();
        pintar();
        $('.rv__principal', d).scrollTop = 0;
        ($('input[name="nombre"]', d) as HTMLInputElement)?.focus();
      } else if (btn('[data-volver]')) {
        paso = 1;
        qServidor = null;
        pintar();
      } else if (btn('[data-aplicar-cupon]')) {
        if (cuponAplicado) { cuponAplicado = null; cambio('resumen'); return; }
        const v = ($('[data-cupon]', d) as HTMLInputElement).value.trim().toUpperCase();
        if (!v) return;
        cuponAplicado = v;
        cambio('resumen');
      } else if (btn('[data-compartir]')) {
        try {
          compartido = await llamar<{ url: string }>('POST', '/cotizaciones', { carrito });
          pintarResumen();
        } catch (e) { error = (e as Error).message; pintarResumen(); }
      } else if (btn('[data-copiar]')) {
        (btn('[data-copiar]') as HTMLInputElement).select();
        navigator.clipboard?.writeText(compartido!.url).catch(() => {});
      } else if (btn('[data-pagar]')) {
        await pagar();
      } else if (btn('[data-solicitud]')) {
        await solicitar();
      }
    });

    d.addEventListener('change', (ev) => {
      const t = ev.target as HTMLInputElement;
      const ses = t.closest<HTMLElement>('[data-sesion]');
      if (t.dataset.extra && ses) {
        const i = Number(ses.dataset.sesion);
        const s = carrito.sesiones[i];
        const ex = cat.extras.find((e) => e.id === t.dataset.extra)!;
        s.extras = (s.extras ?? []).filter((x) => x.id !== ex.id);
        if (t.checked) s.extras.push({ id: ex.id, opcion: ex.opciones[0]?.id ?? null, texto: null });
        cambio();
        revalidar(i);
        return;
      }
      if (t.form && paso === 2) leerFormulario(t);
    });

    d.addEventListener('input', (ev) => {
      const t = ev.target as HTMLInputElement;
      const ses = t.closest<HTMLElement>('[data-sesion]');
      if (t.dataset.extraTexto && ses) {
        const x = carrito.sesiones[Number(ses.dataset.sesion)].extras!.find((e) => e.id === t.dataset.extraTexto)!;
        x.texto = t.value;
        cambio('resumen');
      } else if (t.dataset.prodCampo) {
        const sesion = t.dataset.ses === '' ? null : Number(t.dataset.ses);
        const item = carrito.productos.find((p) => p.id === t.dataset.prodCampo && (sesion == null || p.sesion === sesion));
        if (!item) return;
        item.datos = item.datos ?? [];
        const u = Number(t.dataset.unidad);
        item.datos[u] = { ...(item.datos[u] ?? {}), [t.dataset.campo!]: t.value };
        cambio('resumen');
      } else if (t.form && paso === 2) {
        leerFormulario(t, false);
      }
    });
  }

  function leerFormulario(t: HTMLInputElement, repintar = true) {
    const k = t.name as keyof Datos;
    if (!(k in datos)) return;
    const antes = datos.factura;
    (datos as unknown as Record<string, unknown>)[k] = t.type === 'checkbox' ? t.checked : t.value;
    const { privacidad: _p, terminos: _t, reglamento: _r, promociones: _m, ...persistir } = datos;
    guardar(datosKey, persistir);
    if (k === 'correo' && repintar) refrescarServidor();
    if (k === 'factura' && antes !== datos.factura) pintar();
    else if (repintar) pintarResumen();
  }

  function validarDatos(): string | null {
    if (!datos.nombre.trim()) return 'Escribe tu nombre.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(datos.correo.trim())) return 'Revisa tu correo electrónico.';
    if (!datos.telefono.trim()) return 'Escribe tu WhatsApp o teléfono.';
    if (datos.factura && (!datos.rfc.trim() || !datos.razonSocial.trim() || !/^\d{5}$/.test(datos.cp.trim()))) return 'Completa el RFC, la razón social y el código postal fiscal.';
    if (!datos.privacidad || !datos.terminos || (esp.documentos.reglamento && !datos.reglamento)) return esp.documentos.reglamento ? 'Acepta el aviso de privacidad, los términos y el reglamento.' : 'Acepta el aviso de privacidad y los términos.';
    return null;
  }

  async function pagar() {
    const falta = validarDatos();
    if (falta) { error = falta; pintarResumen(); return; }
    enviando = true;
    error = '';
    pintarResumen();
    try {
      const res = await llamar<{ url: string }>('POST', '/pedidos', {
        carrito: { ...carrito, cupon: cuponAplicado },
        cliente: { nombre: datos.nombre, correo: datos.correo, telefono: datos.telefono, empresa: datos.empresa },
        datos: {
          proyecto: datos.proyecto, notas: datos.notas,
          ingenieroCliente: datos.ingNombre || datos.ingTelefono ? { nombre: datos.ingNombre, telefono: datos.ingTelefono } : null,
          factura: datos.factura ? { rfc: datos.rfc, razonSocial: datos.razonSocial, regimen: datos.regimen, cp: datos.cp, usoCfdi: datos.usoCfdi } : null,
        },
        consentimiento: { privacidad: datos.privacidad, terminos: datos.terminos, reglamento: datos.reglamento, promociones: datos.promociones },
      });
      try { localStorage.removeItem(carritoKey); } catch { /* */ }
      window.location.href = res.url;
    } catch (e) {
      enviando = false;
      const err = e as ErrorApi;
      error = err.message;
      if (['HORARIO_OCUPADO', 'HORARIO_INVALIDO', 'SESIONES_ENCIMADAS', 'EXTRA_ANTICIPACION', 'FALTA_FECHA'].includes(err.codigo)) {
        const problemas = ((err.datos as { problemas?: { sesion?: number; mensaje: string }[] })?.problemas ?? []);
        ocupacionMes.clear();
        for (const p of problemas) if (p.sesion != null) { carrito.sesiones[p.sesion].inicio = null; errorSesion.set(p.sesion, p.mensaje); }
        if (!problemas.length && carrito.sesiones.length === 1) { carrito.sesiones[0].inicio = null; errorSesion.set(0, err.message); }
        paso = 1;
        pintar();
        return;
      }
      pintarResumen();
    }
  }

  async function solicitar() {
    if (!datos.nombre.trim() || !/@/.test(datos.correo) || !datos.descripcion.trim()) { error = 'Escribe tu nombre, correo y una descripción del proyecto.'; pintarResumen(); return; }
    if (!datos.privacidad) { error = 'Acepta el aviso de privacidad.'; pintarResumen(); return; }
    enviando = true;
    pintarResumen();
    try {
      await llamar('POST', '/solicitudes', { carrito, nombre: datos.nombre, correo: datos.correo, telefono: datos.telefono, descripcion: datos.descripcion });
      paso = 3;
      $('.rv__principal', dlg!).innerHTML = `<div class="rv-listo"><h3>Recibimos tu solicitud</h3><p>Te escribimos a ${esc(datos.correo)} con la cotización en menos de un día hábil.</p></div>`;
      $('.rv__resumen', dlg!).innerHTML = '';
    } catch (e) { error = (e as Error).message; }
    enviando = false;
    if (paso !== 3) pintarResumen();
  }

  // ---------- API pública ----------

  async function abrir(op: OpcionesAbrir = {}) {
    abrirDialogo(espacioId === 'foro' ? 'Reserva el foro' : 'Reserva el estudio');
    $('.rv__principal', dlg!).innerHTML = '<p class="rv-cargando">Cargando disponibilidad…</p>';
    try { await preparar(); } catch (e) { $('.rv__principal', dlg!).innerHTML = `<p class="rv-error">${esc((e as Error).message)}</p>`; return; }
    paso = 1;
    errorSesion.clear();
    qServidor = null;
    compartido = null;
    cuponAplicado = null;
    if (op.cotizacion) {
      try {
        const c = await llamar<{ carrito: Carrito }>('GET', `/cotizaciones/${encodeURIComponent(op.cotizacion)}`);
        carrito = { ...c.carrito, espacioId };
      } catch { carrito = { espacioId, sesiones: [sesionNueva()], productos: [] }; error = 'No encontramos esa cotización. Puedes armar una nueva.'; }
    } else if (op.carrito) {
      carrito = { espacioId, sesiones: op.carrito.sesiones ?? [], productos: op.carrito.productos ?? [] };
    } else if (op.bloqueId || op.modalidadId) {
      carrito = { espacioId, sesiones: [sesionNueva(op.bloqueId, op.modalidadId)], productos: [] };
    } else {
      const guardado = leer<{ carrito: Carrito; fecha: number }>(carritoKey);
      carrito = guardado && Date.now() - guardado.fecha < 3 * 86400000 ? guardado.carrito : { espacioId, sesiones: [sesionNueva()], productos: [] };
    }
    // Fechas que ya pasaron o datos de un catálogo viejo se descartan.
    carrito.sesiones = carrito.sesiones
      .filter((s) => cat.bloques.some((b) => b.id === s.bloqueId))
      .map((s) => ({ ...s, modalidadId: cat.modalidades.some((m) => m.id === s.modalidadId) ? s.modalidadId : modalidadesDe(cat, espacioId)[0].id, inicio: s.inicio && new Date(s.inicio).getTime() > ahora().getTime() ? s.inicio : null }));
    carrito.productos = carrito.productos.filter((p) => cat.productos.some((x) => x.id === p.id));
    if (!carrito.sesiones.length && !carrito.productos.length) carrito.sesiones.push(sesionNueva());
    enlazar();
    pintar();
    carrito.sesiones.forEach((_, i) => revalidar(i));
  }

  async function abrirVisita() {
    abrirDialogo(espacioId === 'foro' ? 'Agenda tu visita al foro' : 'Agenda tu visita al estudio');
    const d = dlg!;
    $('.rv__pasos', d).remove();
    const p = $('.rv__principal', d);
    const a = $('.rv__resumen', d);
    p.innerHTML = '<p class="rv-cargando">Cargando disponibilidad…</p>';
    try { await preparar(); } catch (e) { p.innerHTML = `<p class="rv-error">${esc((e as Error).message)}</p>`; return; }
    let inicio: string | null = null;
    const v = { nombre: datos.nombre, correo: datos.correo, telefono: datos.telefono, notas: '', privacidad: false };
    p.innerHTML = `<h3>Elige día y hora</h3><p class="rv-ayuda">La visita dura ${esp.visitas.duracionMin} minutos y no tiene costo.</p><div class="rv-cal" id="rv-cal-visita"></div>`;
    montarCalendario($('#rv-cal-visita', d), {
      hoy: fechaLocal(ahora(), esp.zonaHoraria), zona: esp.zonaHoraria,
      dias: async (desde, hasta) => calendario(opcionesVisita(cat, esp, await ocupacion(desde), ahora()), desde, hasta),
      etiqueta: (h) => rangoTexto(new Date(h.inicio), new Date(h.fin), esp.zonaHoraria).split(', de ')[1]?.split(' a ')[0] ?? '',
      alElegir: (h) => { inicio = h.inicio; pintarForm(); },
    });
    const pintarForm = (msg = '') => {
      a.innerHTML = `
        <h3>Tu visita</h3>
        <p>${inicio ? esc(rangoTexto(new Date(inicio), new Date(new Date(inicio).getTime() + esp.visitas.duracionMin * 60000), esp.zonaHoraria)) : 'Elige día y hora.'}</p>
        <form class="rv-form" novalidate>
          <label class="rv-campo"><span>Nombre</span><input class="rv-input" name="nombre" value="${esc(v.nombre)}" autocomplete="name" /></label>
          <label class="rv-campo"><span>Correo</span><input class="rv-input" name="correo" type="email" value="${esc(v.correo)}" autocomplete="email" /></label>
          <label class="rv-campo"><span>WhatsApp</span><input class="rv-input" name="telefono" type="tel" value="${esc(v.telefono)}" autocomplete="tel" /></label>
          <label class="rv-campo"><span>¿Qué proyecto tienes? (opcional)</span><textarea class="rv-input" name="notas" rows="2">${esc(v.notas)}</textarea></label>
          <label class="rv-check"><input type="checkbox" name="privacidad" ${v.privacidad ? 'checked' : ''} /><span>Acepto el <a href="${esc(esp.documentos.privacidad ?? '/aviso-de-privacidad/')}" target="_blank" rel="noopener">aviso de privacidad</a>.</span></label>
        </form>
        ${msg ? `<p class="rv-error" role="alert">${esc(msg)}</p>` : ''}
        <button type="button" class="btn btn--primary btn--block" data-agendar ${inicio ? '' : 'disabled'}>Agendar visita</button>`;
    };
    pintarForm();
    a.addEventListener('input', (e) => { const t = e.target as HTMLInputElement; if (t.name in v) (v as Record<string, unknown>)[t.name] = t.type === 'checkbox' ? t.checked : t.value; });
    a.addEventListener('change', (e) => { const t = e.target as HTMLInputElement; if (t.name === 'privacidad') v.privacidad = t.checked; });
    a.addEventListener('click', async (e) => {
      if (!(e.target as HTMLElement).closest('[data-agendar]') || !inicio) return;
      if (!v.nombre.trim() || !/@/.test(v.correo) || !v.telefono.trim()) return pintarForm('Escribe tu nombre, correo y WhatsApp.');
      if (!v.privacidad) return pintarForm('Acepta el aviso de privacidad.');
      try {
        const res = await llamar<{ texto: string }>('POST', '/visitas', { espacio: espacioId, inicio, nombre: v.nombre, correo: v.correo, telefono: v.telefono, notas: v.notas });
        p.innerHTML = `<div class="rv-listo"><h3>Visita agendada</h3><p>Te esperamos el ${esc(res.texto)}. Te mandamos la confirmación a ${esc(v.correo)}.</p></div>`;
        a.innerHTML = '';
      } catch (err) {
        ocupacionMes.clear();
        pintarForm((err as Error).message);
      }
    });
  }

  return { abrir, abrirVisita, cerrar: () => dlg?.close() };
}
