// Correos: textos editables desde el panel y diseño fijo.
// El asunto y el cuerpo aceptan variables {{asi}}. Los bloques de datos
// (resumen del pedido, botones, sesiones) los arma el código.

import type { Negocio } from './db.ts';

export interface DefPlantilla {
  id: string;
  nombre: string;
  para: 'cliente' | 'equipo';
  cuando: string;
  asunto: string;
  cuerpo: string;
  variables: string[];
}

const V_PEDIDO = ['nombre', 'numero', 'espacio', 'total', 'fecha', 'enlace'];

export const PLANTILLAS: DefPlantilla[] = [
  // ---------- Cliente ----------
  { id: 'pedido_confirmado', nombre: 'Pedido confirmado', para: 'cliente', cuando: 'Al recibir el pago', variables: V_PEDIDO,
    asunto: 'Tu pedido {{numero}} está confirmado',
    cuerpo: 'Hola {{nombre}}:\n\nRecibimos tu pago y tu pedido quedó confirmado. Abajo está el resumen. Agrega la sesión a tu calendario con el archivo adjunto.\n\nDesde "Mis reservas" puedes cambiar la fecha, registrar invitados y mandarnos tu material.' },
  { id: 'ficha_oxxo', nombre: 'Ficha de pago OXXO', para: 'cliente', cuando: 'Al elegir pagar en OXXO', variables: [...V_PEDIDO, 'vence'],
    asunto: 'Tu ficha de pago en OXXO para el pedido {{numero}}',
    cuerpo: 'Hola {{nombre}}:\n\nApartamos tu horario. Para confirmarlo, paga {{total}} en cualquier tienda OXXO antes del {{vence}}.\n\nSi el pago no llega a tiempo, el horario se libera.' },
  { id: 'oxxo_por_vencer', nombre: 'Ficha OXXO por vencer', para: 'cliente', cuando: '6 horas antes de que venza la ficha', variables: [...V_PEDIDO, 'vence'],
    asunto: 'Tu ficha de OXXO vence pronto',
    cuerpo: 'Hola {{nombre}}:\n\nTodavía no recibimos el pago de tu pedido {{numero}}. Tu ficha vence el {{vence}}; después de esa hora el horario se libera.' },
  { id: 'apartado_vencido', nombre: 'Apartado vencido', para: 'cliente', cuando: 'Cuando vence un apartado sin pago', variables: V_PEDIDO,
    asunto: 'Se liberó el horario de tu pedido {{numero}}',
    cuerpo: 'Hola {{nombre}}:\n\nNo recibimos el pago a tiempo y el horario que tenías apartado se liberó. Si todavía te interesa, puedes volver a reservar desde nuestra página.' },
  { id: 'enlace_pago', nombre: 'Enlace de pago (pedido del equipo)', para: 'cliente', cuando: 'Cuando el equipo arma un pedido', variables: [...V_PEDIDO, 'vence'],
    asunto: 'Tu cotización {{numero}} de Undying Studios',
    cuerpo: 'Hola {{nombre}}:\n\nTe preparamos este pedido. Apartamos el horario hasta el {{vence}}; para confirmarlo, paga desde el botón de abajo.' },
  { id: 'recordatorio_sesion', nombre: 'Recordatorio de sesión', para: 'cliente', cuando: '48 y 24 horas antes', variables: [...V_PEDIDO, 'cuando'],
    asunto: 'Tu sesión en Undying Studios es {{cuando}}',
    cuerpo: 'Hola {{nombre}}:\n\nTe recordamos tu sesión: {{fecha}}.\n\nLlega con tiempo para descargar tu equipo. Al terminar tienes 15 minutos de tolerancia para desalojar.' },
  { id: 'cambio_fecha', nombre: 'Cambio de fecha', para: 'cliente', cuando: 'Al cambiar la fecha', variables: V_PEDIDO,
    asunto: 'Cambiamos la fecha de tu pedido {{numero}}',
    cuerpo: 'Hola {{nombre}}:\n\nTu sesión quedó para el {{fecha}}. Te mandamos el archivo de calendario actualizado.' },
  { id: 'cancelacion', nombre: 'Cancelación', para: 'cliente', cuando: 'Al cancelar un pedido', variables: [...V_PEDIDO, 'resultado'],
    asunto: 'Tu pedido {{numero}} fue cancelado',
    cuerpo: 'Hola {{nombre}}:\n\nCancelamos tu pedido {{numero}}. {{resultado}}' },
  { id: 'reembolso', nombre: 'Reembolso', para: 'cliente', cuando: 'Al hacer un reembolso', variables: [...V_PEDIDO, 'monto'],
    asunto: 'Reembolso de tu pedido {{numero}}',
    cuerpo: 'Hola {{nombre}}:\n\nHicimos un reembolso de {{monto}} a tu método de pago. Puede tardar de 5 a 10 días hábiles en reflejarse, según tu banco.' },
  { id: 'cargo_pendiente', nombre: 'Saldo pendiente', para: 'cliente', cuando: 'Al agregar un cargo u hora extra', variables: [...V_PEDIDO, 'monto', 'concepto'],
    asunto: 'Saldo pendiente en tu pedido {{numero}}',
    cuerpo: 'Hola {{nombre}}:\n\nAgregamos a tu pedido: {{concepto}}. Tu saldo pendiente es de {{monto}}. Puedes pagarlo desde el botón de abajo.' },
  { id: 'recordatorio_material', nombre: 'Recordatorio de material', para: 'cliente', cuando: '3 y 7 días después del pedido si no ha llegado el material', variables: [...V_PEDIDO, 'servicios'],
    asunto: 'Mándanos tu material para empezar',
    cuerpo: 'Hola {{nombre}}:\n\nPara empezar con {{servicios}} necesitamos tu material. Súbelo a Drive, WeTransfer o Dropbox y pega el enlace en "Mis reservas".' },
  { id: 'trabajo_entregado', nombre: 'Trabajo entregado', para: 'cliente', cuando: 'Al entregar mezcla, máster o edición', variables: [...V_PEDIDO, 'servicio', 'titulo', 'revisiones'],
    asunto: 'Tu {{servicio}} de "{{titulo}}" está listo',
    cuerpo: 'Hola {{nombre}}:\n\nYa está lista tu entrega de {{servicio}} de "{{titulo}}". Escúchala y, desde "Mis reservas", apruébala o pide una revisión. {{revisiones}}' },
  { id: 'ingeniero_asignado', nombre: 'Ingeniero asignado', para: 'cliente', cuando: 'Cuando el equipo lo avisa desde el panel', variables: [...V_PEDIDO, 'ingeniero'],
    asunto: 'Tu ingeniero para la sesión del {{fecha}}',
    cuerpo: 'Hola {{nombre}}:\n\n{{ingeniero}} será tu ingeniero en la sesión del {{fecha}}.' },
  { id: 'visita_agendada', nombre: 'Visita agendada', para: 'cliente', cuando: 'Al agendar una visita', variables: ['nombre', 'espacio', 'fecha', 'enlace'],
    asunto: 'Tu visita a Undying Studios: {{fecha}}',
    cuerpo: 'Hola {{nombre}}:\n\nTe esperamos el {{fecha}} para conocer el {{espacio}}. Si no puedes venir, cancela o cambia tu visita desde el botón de abajo.' },
  { id: 'visita_recordatorio', nombre: 'Recordatorio de visita', para: 'cliente', cuando: '24 horas antes de la visita', variables: ['nombre', 'espacio', 'fecha', 'enlace'],
    asunto: 'Mañana es tu visita a Undying Studios',
    cuerpo: 'Hola {{nombre}}:\n\nTe esperamos mañana, {{fecha}}, para conocer el {{espacio}}.' },
  { id: 'visita_cancelada', nombre: 'Visita cancelada', para: 'cliente', cuando: 'Al cancelar una visita', variables: ['nombre', 'espacio', 'fecha'],
    asunto: 'Cancelamos tu visita del {{fecha}}',
    cuerpo: 'Hola {{nombre}}:\n\nTu visita del {{fecha}} quedó cancelada. Puedes agendar otra cuando quieras.' },
  { id: 'gracias', nombre: 'Gracias', para: 'cliente', cuando: 'Al día siguiente de la sesión', variables: [...V_PEDIDO, 'resena'],
    asunto: 'Gracias por venir a Undying Studios',
    cuerpo: 'Hola {{nombre}}:\n\nGracias por trabajar con nosotros. Si te gustó la experiencia, nos ayuda mucho que dejes una reseña en Google.' },
  { id: 'credito_por_vencer', nombre: 'Saldo a favor por vencer', para: 'cliente', cuando: '15 días antes de que venza', variables: ['nombre', 'monto', 'vence', 'enlace'],
    asunto: 'Tu saldo a favor vence el {{vence}}',
    cuerpo: 'Hola {{nombre}}:\n\nTienes {{monto}} de saldo a favor en Undying Studios. Úsalo antes del {{vence}}; se aplica solo al reservar con este correo.' },
  { id: 'acceso', nombre: 'Enlace de acceso', para: 'cliente', cuando: 'Cuando el cliente pide entrar a Mis reservas', variables: ['nombre', 'enlace'],
    asunto: 'Tu enlace para ver tus reservas',
    cuerpo: 'Hola {{nombre}}:\n\nEntra a "Mis reservas" con el botón de abajo. El enlace funciona durante 7 días.' },
  { id: 'solicitud_recibida', nombre: 'Solicitud recibida', para: 'cliente', cuando: 'Al recibir una solicitud de cotización', variables: ['nombre'],
    asunto: 'Recibimos tu solicitud',
    cuerpo: 'Hola {{nombre}}:\n\nRecibimos tu solicitud. Te escribimos con la cotización en menos de un día hábil.' },

  // ---------- Equipo ----------
  { id: 'nuevo_pedido', nombre: 'Nuevo pedido', para: 'equipo', cuando: 'Al recibir un pago', variables: [...V_PEDIDO, 'pendientes'],
    asunto: 'Nueva reserva {{numero}} · {{espacio}} · {{fecha}}',
    cuerpo: '{{nombre}} pagó {{total}}.\n\n{{pendientes}}' },
  { id: 'pintura_ciclorama', nombre: 'Pintura del ciclorama', para: 'equipo', cuando: 'Al confirmar un cambio de color y 3 días antes de pintar', variables: [...V_PEDIDO, 'color', 'desde'],
    asunto: 'Pintar ciclorama de {{color}} para el {{fecha}}',
    cuerpo: 'El pedido {{numero}} pidió el ciclorama en {{color}} para la sesión del {{fecha}}. El foro está apartado para pintar desde el {{desde}}.' },
  { id: 'oxxo_pendiente', nombre: 'Pago OXXO pendiente', para: 'equipo', cuando: 'Al generar una ficha OXXO', variables: [...V_PEDIDO, 'vence'],
    asunto: 'Pago en OXXO pendiente · {{numero}}',
    cuerpo: '{{nombre}} eligió pagar {{total}} en OXXO. El horario queda apartado hasta el {{vence}}.' },
  { id: 'oxxo_vencido', nombre: 'Pago OXXO vencido', para: 'equipo', cuando: 'Al vencer una ficha sin pago', variables: V_PEDIDO,
    asunto: 'Venció el pago OXXO · {{numero}}',
    cuerpo: 'La ficha de {{nombre}} venció sin pago. El horario del {{fecha}} se liberó.' },
  { id: 'cambio_equipo', nombre: 'Cambio o cancelación', para: 'equipo', cuando: 'Al cambiar de fecha o cancelar', variables: [...V_PEDIDO, 'accion', 'detalle'],
    asunto: '{{accion}} · {{numero}}',
    cuerpo: '{{accion}} del pedido {{numero}} de {{nombre}}.\n\n{{detalle}}' },
  { id: 'pago_tardio', nombre: 'Pago sin horario', para: 'equipo', cuando: 'Cuando llega un pago y el horario ya se ocupó', variables: V_PEDIDO,
    asunto: 'Pago recibido sin horario · {{numero}}',
    cuerpo: 'Llegó el pago de {{nombre}} ({{total}}), pero el horario ya se había ocupado. Contáctalo para ofrecer otra fecha o dejar el pago como saldo a favor.' },
  { id: 'nueva_solicitud', nombre: 'Nueva solicitud', para: 'equipo', cuando: 'Al recibir una solicitud de cotización', variables: ['nombre', 'correo', 'telefono', 'descripcion', 'enlace'],
    asunto: 'Nueva solicitud de cotización · {{nombre}}',
    cuerpo: '{{nombre}} ({{correo}}, {{telefono}}) pidió una cotización:\n\n{{descripcion}}' },
  { id: 'nueva_visita', nombre: 'Nueva visita', para: 'equipo', cuando: 'Al agendar una visita', variables: ['nombre', 'correo', 'telefono', 'espacio', 'fecha'],
    asunto: 'Visita agendada · {{espacio}} · {{fecha}}',
    cuerpo: '{{nombre}} ({{correo}}, {{telefono}}) agendó una visita al {{espacio}}: {{fecha}}.' },
  { id: 'material_recibido', nombre: 'Material recibido', para: 'equipo', cuando: 'Cuando el cliente manda material', variables: [...V_PEDIDO, 'servicio', 'titulo'],
    asunto: 'Material recibido · {{servicio}} · {{numero}}',
    cuerpo: '{{nombre}} mandó el material de {{servicio}} de "{{titulo}}".' },
  { id: 'revision_pedida', nombre: 'Revisión pedida', para: 'equipo', cuando: 'Cuando el cliente pide una revisión', variables: [...V_PEDIDO, 'servicio', 'titulo', 'notas'],
    asunto: 'Revisión pedida · {{servicio}} · {{numero}}',
    cuerpo: '{{nombre}} pidió una revisión de {{servicio}} de "{{titulo}}":\n\n{{notas}}' },
  { id: 'trabajo_por_vencer', nombre: 'Entrega por vencer', para: 'equipo', cuando: 'Un día antes y el día de la entrega', variables: [...V_PEDIDO, 'servicio', 'titulo', 'cuando'],
    asunto: 'Entrega {{cuando}}: {{servicio}} · {{numero}}',
    cuerpo: 'La entrega de {{servicio}} de "{{titulo}}" para {{nombre}} vence {{cuando}}.' },
  { id: 'resumen_manana', nombre: 'Agenda de mañana', para: 'equipo', cuando: 'Todos los días a la hora configurada', variables: ['fecha'],
    asunto: 'Agenda de mañana · {{fecha}}',
    cuerpo: 'Esto es lo que hay mañana, {{fecha}}.' },
  { id: 'resumen_semanal', nombre: 'Resumen semanal', para: 'equipo', cuando: 'Cada lunes', variables: ['desde', 'hasta'],
    asunto: 'Resumen semanal de Undying Studios',
    cuerpo: 'Resumen del {{desde}} al {{hasta}}.' },
  { id: 'pago_problema', nombre: 'Problema con un pago', para: 'equipo', cuando: 'Disputas o pagos fallidos en Stripe', variables: [...V_PEDIDO, 'detalle'],
    asunto: 'Problema con un pago · {{numero}}',
    cuerpo: '{{detalle}}' },
];

export const plantillaDef = (id: string) => PLANTILLAS.find((p) => p.id === id);

// ---------- Bloques ----------

export interface Bloques {
  resumen?: { lineas: { concepto: string; importe: string }[]; total: string; nota?: string };
  datos?: [string, string][];
  lista?: { titulo?: string; elementos: string[] };
  botones?: { texto: string; url: string; secundario?: boolean }[];
  tabla?: { titulo?: string; columnas: string[]; filas: string[][] };
  nota?: string;
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function sustituir(plantilla: string, vars: Record<string, unknown>): string {
  return plantilla.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));
}

const NARANJA = '#c97438';
const TINTA = '#252a2d';
const GRIS = '#6b6660';

function bloquesHtml(b: Bloques): string {
  let h = '';
  if (b.datos?.length) {
    h += `<table role="presentation" width="100%" style="margin:20px 0;border-collapse:collapse">${b.datos.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:${GRIS};font-size:13px;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;font-size:14px;color:${TINTA}">${esc(v)}</td></tr>`).join('')}</table>`;
  }
  if (b.resumen) {
    h += `<table role="presentation" width="100%" style="margin:20px 0;border-collapse:collapse;border-top:1px solid #e8e4df">${b.resumen.lineas.map((l) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e8e4df;font-size:14px">${esc(l.concepto)}</td><td align="right" style="padding:10px 0;border-bottom:1px solid #e8e4df;font-size:14px;white-space:nowrap">${esc(l.importe)}</td></tr>`).join('')}<tr><td style="padding:12px 0;font-weight:700">Total</td><td align="right" style="padding:12px 0;font-weight:700;font-size:16px">${esc(b.resumen.total)}</td></tr></table>`;
    if (b.resumen.nota) h += `<p style="margin:0 0 16px;font-size:12px;color:${GRIS}">${esc(b.resumen.nota)}</p>`;
  }
  if (b.lista?.elementos.length) {
    h += `${b.lista.titulo ? `<p style="margin:20px 0 8px;font-weight:700">${esc(b.lista.titulo)}</p>` : ''}<ul style="margin:0 0 16px;padding-left:20px">${b.lista.elementos.map((e) => `<li style="margin:4px 0">${esc(e)}</li>`).join('')}</ul>`;
  }
  if (b.tabla?.filas.length) {
    h += `${b.tabla.titulo ? `<p style="margin:20px 0 8px;font-weight:700">${esc(b.tabla.titulo)}</p>` : ''}<table role="presentation" width="100%" style="border-collapse:collapse;font-size:13px;margin-bottom:16px">${b.tabla.columnas.some(Boolean) ? `<tr>${b.tabla.columnas.map((c) => `<th align="left" style="padding:6px 8px;background:#f3f1ee;color:${GRIS};font-weight:600">${esc(c)}</th>`).join('')}</tr>` : ''}${b.tabla.filas.map((f) => `<tr>${f.map((c) => `<td style="padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top">${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
  }
  if (b.botones?.length) {
    h += `<p style="margin:24px 0">${b.botones.map((x) => `<a href="${esc(x.url)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 22px;border-radius:100px;text-decoration:none;font-weight:600;font-size:14px;${x.secundario ? `border:1px solid #d8d2cb;color:${TINTA}` : `background:${NARANJA};color:#fff`}">${esc(x.texto)}</a>`).join('')}</p>`;
  }
  if (b.nota) h += `<p style="margin:16px 0 0;font-size:13px;color:${GRIS}">${esc(b.nota)}</p>`;
  return h;
}

function bloquesTexto(b: Bloques): string {
  const out: string[] = [];
  if (b.datos?.length) out.push(b.datos.map(([k, v]) => `${k}: ${v}`).join('\n'));
  if (b.resumen) out.push([...b.resumen.lineas.map((l) => `${l.concepto}: ${l.importe}`), `Total: ${b.resumen.total}`, b.resumen.nota ?? ''].filter(Boolean).join('\n'));
  if (b.lista?.elementos.length) out.push([b.lista.titulo ?? '', ...b.lista.elementos.map((e) => `- ${e}`)].filter(Boolean).join('\n'));
  if (b.tabla?.filas.length) out.push([b.tabla.titulo ?? '', ...b.tabla.filas.map((f) => f.join(' | '))].filter(Boolean).join('\n'));
  if (b.botones?.length) out.push(b.botones.map((x) => `${x.texto}: ${x.url}`).join('\n'));
  if (b.nota) out.push(b.nota);
  return out.join('\n\n');
}

export function renderizar(asuntoT: string, cuerpoT: string, vars: Record<string, unknown>, bloques: Bloques, negocio: Negocio): { asunto: string; html: string; texto: string } {
  const asunto = sustituir(asuntoT, vars).replace(/\s+/g, ' ').trim();
  const cuerpo = sustituir(cuerpoT, vars).trim();
  const parrafos = cuerpo.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const pie = `${esc(negocio.nombre)} · ${esc(negocio.direccion)}<br>WhatsApp ${esc(negocio.whatsappTexto)} · <a href="mailto:${esc(negocio.correo)}" style="color:${GRIS}">${esc(negocio.correo)}</a>`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(asunto)}</title></head>
<body style="margin:0;padding:0;background:#f3f1ee;font-family:Montserrat,Helvetica,Arial,sans-serif;color:${TINTA}">
<table role="presentation" width="100%" style="border-collapse:collapse"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:600px;border-collapse:collapse;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#1b1f21;padding:22px 28px;color:#ffffff;font:700 17px/1 Helvetica,Arial,sans-serif;letter-spacing:.14em">UNDYING <span style="color:#eb9050">STUDIOS</span></td></tr>
<tr><td style="padding:28px 28px 20px">${parrafos}${bloquesHtml(bloques)}</td></tr>
<tr><td style="padding:18px 28px;background:#f7f5f2;font-size:12px;line-height:1.6;color:${GRIS}">${pie}</td></tr>
</table></td></tr></table></body></html>`;
  const texto = `${cuerpo}\n\n${bloquesTexto(bloques)}\n\n--\n${negocio.nombre} · ${negocio.direccion}\nWhatsApp ${negocio.whatsappTexto} · ${negocio.correo}`.replace(/\n{3,}/g, '\n\n');
  return { asunto, html, texto };
}
