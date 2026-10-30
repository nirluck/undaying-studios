// Pruebas de punta a punta de la API contra Postgres (PGlite), con Stripe
// y correo simulados y un reloj controlado.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from '../entorno.ts';
import { manejar, procesarEventoStripe } from '../../../supabase/functions/_shared/server/app.ts';
import { eventoSimulado, firmarParaPruebas, verificarFirma } from '../../../supabase/functions/_shared/server/stripe.ts';
import { utcDesdeLocal } from '../../../supabase/functions/_shared/core/tiempo.ts';

let reloj = new Date('2026-10-06T18:00:00Z'); // martes 6 de octubre, 12:00 en la CDMX
const local = (fecha: string, hora: number) => utcDesdeLocal(fecha, hora * 60, 'America/Mexico_City').toISOString();
type E = Awaited<ReturnType<typeof crearEntorno>>;
let e: E;

before(async () => {
  e = await crearEntorno({ puertoDb: 55432, apiUrl: 'http://api.test/api', sitioUrl: 'https://sitio.test', ahora: () => reloj });
});
after(async () => { await e.cerrar(); });

// deno-lint-ignore no-explicit-any
async function api(metodo: string, ruta: string, cuerpo?: unknown, token?: string): Promise<{ estado: number; datos: any }> {
  const r = await manejar(new Request(`http://api.test/api${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  }), e.ctx);
  const t = await r.text();
  return { estado: r.status, datos: t.startsWith('{') || t.startsWith('[') ? JSON.parse(t) : t };
}
const ADMIN = 'dev:admin@undying.test';
const cliente = (correo = 'ana@correo.com') => ({ nombre: 'Ana López', correo, telefono: '5512345678' });
const consentimiento = { privacidad: true, terminos: true, reglamento: true };
const pagarConTarjeta = async (pedidoId: string) => {
  const [p] = await e.ctx.sql`select stripe_sesion from pedidos where id = ${pedidoId}`;
  const s = e.pasarela.sesiones.get(p.stripeSesion)!;
  s.estado = 'pagada';
  return procesarEventoStripe(e.ctx, eventoSimulado('checkout.session.completed', s, true));
};
const bandeja = () => e.correo.bandeja.map((m) => m.asunto);

let pedidoEstudio = '';
let tokenAna = '';

test('catálogo público del estudio', async () => {
  const r = await api('GET', '/catalogo?espacio=estudio');
  assert.equal(r.estado, 200);
  assert.equal(r.datos.catalogo.bloques.length, 3);
  assert.equal(r.datos.catalogo.productos.length, 6);
  assert.equal(r.datos.catalogo.bloques[1].precios['estudio-ing'].precio, 4500);
  const no = await api('GET', '/catalogo?espacio=estudio-b');
  assert.equal(no.estado, 404);
});

test('pedido web: apartado, checkout, pago y confirmación', async () => {
  const carrito = { espacioId: 'estudio', sesiones: [{ bloqueId: 'estudio-6h', modalidadId: 'estudio-ing', inicio: local('2026-10-20', 10) }], productos: [{ id: 'master', cantidad: 1 }] };
  const sinAceptar = await api('POST', '/pedidos', { carrito, cliente: cliente() });
  assert.equal(sinAceptar.estado, 422);
  assert.equal(sinAceptar.datos.codigo, 'CONSENTIMIENTO');

  const r = await api('POST', '/pedidos', { carrito, cliente: cliente(), consentimiento, datos: { proyecto: 'Disco de Ana' } });
  assert.equal(r.estado, 200, JSON.stringify(r.datos));
  assert.match(r.datos.url, /dev\/checkout\/cs_sim_/);
  pedidoEstudio = r.datos.pedido;
  tokenAna = r.datos.token;
  const [p] = await e.ctx.sql`select estado, total from pedidos where id = ${pedidoEstudio}`;
  assert.equal(p.estado, 'apartado');
  assert.equal(p.total, 7500);
  const s = e.pasarela.sesiones.get([...e.pasarela.sesiones.keys()].at(-1)!)!;
  assert.equal(s.oxxo, true); // $7,500 y la sesión está a 14 días

  // Otro cliente no puede tomar el mismo horario (ni empalmarse con el margen)
  const otro = await api('POST', '/pedidos', { carrito: { ...carrito, sesiones: [{ bloqueId: 'estudio-3h', modalidadId: 'estudio-dry', inicio: local('2026-10-20', 16) }], productos: [] }, cliente: cliente('beto@correo.com'), consentimiento });
  assert.equal(otro.estado, 409);
  assert.equal(otro.datos.codigo, 'HORARIO_OCUPADO');

  assert.equal(await pagarConTarjeta(pedidoEstudio), 'ok');
  const [q] = await e.ctx.sql`select estado from pedidos where id = ${pedidoEstudio}`;
  assert.equal(q.estado, 'pagado');
  const [{ n }] = await e.ctx.sql`select count(*)::int as n from ocupacion where pedido_id = ${pedidoEstudio} and vence is null`;
  assert.equal(n, 1);
  const trabajos = await e.ctx.sql`select * from trabajos where pedido_id = ${pedidoEstudio}`;
  assert.equal(trabajos.length, 1);
  const tareas = await e.ctx.sql`select tipo from tareas where pedido_id = ${pedidoEstudio}`;
  assert.deepEqual(tareas.map((t) => t.tipo), ['asignar_ingeniero']);
  assert.ok(bandeja().some((a) => a.startsWith('Tu pedido UND-')));
  assert.ok(bandeja().some((a) => a.startsWith('Nueva reserva UND-')));
  const conf = e.correo.bandeja.find((m) => m.asunto.startsWith('Tu pedido'))!;
  assert.equal(conf.adjuntos?.[0].tipo, 'text/calendar');
  assert.match(conf.adjuntos![0].contenido, /DTSTART:20261020T160000Z/);

  // Mismo evento dos veces: no se procesa de nuevo
  const [p2] = await e.ctx.sql`select stripe_sesion from pedidos where id = ${pedidoEstudio}`;
  const ev = eventoSimulado('checkout.session.completed', e.pasarela.sesiones.get(p2.stripeSesion)!, true);
  assert.equal(await procesarEventoStripe(e.ctx, ev), 'ok');
  assert.equal(await procesarEventoStripe(e.ctx, ev), 'duplicado');

  const disp = await api('GET', '/disponibilidad?espacio=estudio&desde=2026-10-20&hasta=2026-10-20');
  assert.equal(disp.datos.ocupacion.length, 1);
  assert.equal(disp.datos.ocupacion[0].fin - disp.datos.ocupacion[0].inicio, 7 * 3600000); // 6 h + 1 h de margen
});

test('foro con cambio de color: OXXO, días de pintura y ficha vencida', async () => {
  const carrito = { espacioId: 'foro', sesiones: [{ bloqueId: 'foro-12h', modalidadId: 'foro-renta', inicio: local('2026-10-16', 8), extras: [{ id: 'foro-color', opcion: 'verde' }] }], productos: [] };
  const r = await api('POST', '/pedidos', { carrito, cliente: cliente('cine@productora.com'), consentimiento });
  assert.equal(r.estado, 200, JSON.stringify(r.datos));
  const id = r.datos.pedido;
  const [p] = await e.ctx.sql`select stripe_sesion from pedidos where id = ${id}`;
  const s = e.pasarela.sesiones.get(p.stripeSesion)!;
  s.estado = 'oxxo';
  await procesarEventoStripe(e.ctx, eventoSimulado('checkout.session.completed', s, false));
  const [q] = await e.ctx.sql`select estado, apartado_vence from pedidos where id = ${id}`;
  assert.equal(q.estado, 'pendiente_pago');
  assert.ok(bandeja().some((a) => a.includes('OXXO')));

  // Los dos días anteriores están apartados para pintar
  const choque = await api('POST', '/pedidos', { carrito: { espacioId: 'foro', sesiones: [{ bloqueId: 'foro-3h', modalidadId: 'foro-renta', inicio: local('2026-10-15', 10) }], productos: [] }, cliente: cliente('otro@correo.com'), consentimiento });
  assert.equal(choque.estado, 409);

  // La ficha vence sin pago: todo se libera
  s.estado = 'vencida';
  await procesarEventoStripe(e.ctx, eventoSimulado('checkout.session.async_payment_failed', s, false));
  const [v] = await e.ctx.sql`select estado from pedidos where id = ${id}`;
  assert.equal(v.estado, 'vencido');
  const libre = await api('POST', '/pedidos', { carrito: { espacioId: 'foro', sesiones: [{ bloqueId: 'foro-3h', modalidadId: 'foro-renta', inicio: local('2026-10-15', 10) }], productos: [] }, cliente: cliente('otro@correo.com'), consentimiento });
  assert.equal(libre.estado, 200);
});

test('el color no se acepta con menos de 72 horas ni en bloques cortos', async () => {
  const pronto = await api('POST', '/pedidos', { carrito: { espacioId: 'foro', sesiones: [{ bloqueId: 'foro-12h', modalidadId: 'foro-renta', inicio: local('2026-10-08', 8), extras: [{ id: 'foro-color', opcion: 'azul' }] }], productos: [] }, cliente: cliente('x@correo.com'), consentimiento });
  assert.equal(pronto.datos.codigo, 'EXTRA_ANTICIPACION');
  const corto = await api('POST', '/pedidos', { carrito: { espacioId: 'foro', sesiones: [{ bloqueId: 'foro-6h', modalidadId: 'foro-renta', inicio: local('2026-10-24', 8), extras: [{ id: 'foro-color', opcion: 'azul' }] }], productos: [] }, cliente: cliente('x@correo.com'), consentimiento });
  assert.equal(corto.datos.codigo, 'EXTRA_BLOQUE');
});

test('un apartado sin pagar vence y libera el horario', async () => {
  const carrito = { espacioId: 'estudio', sesiones: [{ bloqueId: 'estudio-3h', modalidadId: 'estudio-dry', inicio: local('2026-10-21', 10) }], productos: [] };
  const r = await api('POST', '/pedidos', { carrito, cliente: cliente('lento@correo.com'), consentimiento });
  assert.equal(r.estado, 200);
  reloj = new Date(reloj.getTime() + 40 * 60000);
  const t = await manejar(new Request('http://api.test/api/tareas', { method: 'POST', headers: { 'x-tareas-secreto': 'secreto-local' } }), e.ctx);
  const res = await t.json();
  assert.ok(res.apartados_vencidos >= 1, JSON.stringify(res));
  const [p] = await e.ctx.sql`select estado from pedidos where id = ${r.datos.pedido}`;
  assert.equal(p.estado, 'vencido');
  const sinSecreto = await manejar(new Request('http://api.test/api/tareas', { method: 'POST' }), e.ctx);
  assert.equal(sinSecreto.status, 401);
});

test('Mis reservas: cambio de fecha, invitados, material y política', async () => {
  const c = await api('GET', `/cliente?t=${tokenAna}`);
  assert.equal(c.estado, 200);
  const ped = c.datos.pedidos.find((p: { id: string }) => p.id === pedidoEstudio);
  assert.equal(ped.sesiones[0].cambio.permitido, true);
  const sesion = ped.sesiones[0].id;

  const mal = await api('POST', '/cliente/cambiar-fecha', { t: tokenAna, pedido: pedidoEstudio, sesion, inicio: local('2026-10-22', 10.5) });
  assert.equal(mal.estado, 409);
  const ok = await api('POST', '/cliente/cambiar-fecha', { t: tokenAna, pedido: pedidoEstudio, sesion, inicio: local('2026-10-22', 12) });
  assert.equal(ok.estado, 200, JSON.stringify(ok.datos));
  assert.ok(bandeja().some((a) => a.startsWith('Cambiamos la fecha')));

  const trabajo = ok.datos.trabajos[0].id;
  const mat = await api('POST', '/cliente/trabajo', { t: tokenAna, trabajo, accion: 'material', titulo: 'Canción uno', materialUrl: 'https://drive.google.com/x' });
  assert.equal(mat.estado, 200, JSON.stringify(mat.datos));
  assert.equal(mat.datos.trabajos[0].estado, 'en_cola');
  assert.ok(mat.datos.trabajos[0].fechaEntrega);

  const ajeno = await api('GET', `/pedidos/${pedidoEstudio}?t=token-falso-de-prueba-1234`);
  assert.equal(ajeno.estado, 401);

  // A menos de 48 horas ya no se puede cambiar
  const antes = reloj;
  reloj = new Date(local('2026-10-21', 12));
  const tarde = await api('POST', '/cliente/cambiar-fecha', { t: tokenAna, pedido: pedidoEstudio, sesion, inicio: local('2026-10-28', 12) });
  reloj = antes;
  assert.equal(tarde.datos.codigo, 'FUERA_DE_POLITICA');
});

test('postproducción: entrega, revisión y aprobación', async () => {
  const [t] = await e.ctx.sql`select id from trabajos where pedido_id = ${pedidoEstudio}`;
  const sinUrl = await api('POST', `/admin/trabajos/${t.id}`, { estado: 'entregado' }, ADMIN);
  assert.equal(sinUrl.datos.codigo, 'FALTA_ENTREGA');
  assert.equal((await api('POST', `/admin/trabajos/${t.id}`, { estado: 'entregado', entregaUrl: 'https://drive.google.com/entrega' }, ADMIN)).estado, 200);
  assert.ok(bandeja().some((a) => a.includes('está listo')));
  const rev = await api('POST', '/cliente/trabajo', { t: tokenAna, trabajo: t.id, accion: 'revision', notas: 'Más voz en el coro' });
  assert.equal(rev.datos.trabajos[0].estado, 'en_revision');
  assert.equal(rev.datos.trabajos[0].revisionesUsadas, 1);
  await api('POST', `/admin/trabajos/${t.id}`, { estado: 'entregado' }, ADMIN);
  const apr = await api('POST', '/cliente/trabajo', { t: tokenAna, trabajo: t.id, accion: 'aprobar' });
  assert.equal(apr.datos.trabajos[0].estado, 'aprobado');
});

test('cancelación del cliente: sin reembolso, como dicen los términos', async () => {
  const vista = await api('GET', `/pedidos/${pedidoEstudio}?t=${tokenAna}`);
  assert.equal(vista.datos.cancelacion.tipo, 'nada');
  assert.equal(vista.datos.cancelacion.monto, 0);
  const r = await api('POST', '/cliente/cancelar', { t: tokenAna, pedido: pedidoEstudio });
  assert.equal(r.estado, 200, JSON.stringify(r.datos));
  assert.equal(r.datos.tipo, 'nada');
  const [{ n }] = await e.ctx.sql`select count(*)::int as n from creditos`;
  assert.equal(n, 0);
});

test('saldo a favor que da el equipo se usa en el siguiente pedido', async () => {
  const [c] = await e.ctx.sql`select id from clientes where correo = 'ana@correo.com'`;
  assert.equal((await api('POST', `/admin/clientes/${c.id}/credito`, { monto: 4500, dias: 90, nota: 'Cortesía' }, ADMIN)).estado, 200);
  const nuevo = await api('POST', '/pedidos', { carrito: { espacioId: 'estudio', sesiones: [{ bloqueId: 'estudio-3h', modalidadId: 'estudio-ing', inicio: local('2026-10-23', 10) }], productos: [] }, cliente: cliente(), consentimiento });
  assert.equal(nuevo.estado, 200);
  // $2,700 cubiertos con el saldo: se confirma sin pasar por Stripe
  assert.equal(nuevo.datos.estado, 'pagado');
  assert.equal(nuevo.datos.total, 0);
  const [cr2] = await e.ctx.sql`select saldo from creditos`;
  assert.equal(cr2.saldo, 1800);
});

test('permiso de promociones aparte de los términos', async () => {
  const sin = await api('POST', '/pedidos', { carrito: { espacioId: 'estudio', sesiones: [], productos: [{ id: 'master', cantidad: 1 }] }, cliente: cliente('promo@correo.com'), consentimiento });
  assert.equal(sin.estado, 200);
  let [c] = await e.ctx.sql`select acepta_promociones from clientes where correo = 'promo@correo.com'`;
  assert.equal(c.aceptaPromociones, false);
  await api('POST', '/pedidos', { carrito: { espacioId: 'estudio', sesiones: [], productos: [{ id: 'master', cantidad: 1 }] }, cliente: cliente('promo@correo.com'), consentimiento: { ...consentimiento, promociones: true } });
  [c] = await e.ctx.sql`select acepta_promociones, promociones_fecha from clientes where correo = 'promo@correo.com'`;
  assert.equal(c.aceptaPromociones, true);
  assert.ok(c.promocionesFecha);
});

test('precio con reserva: aplica solo si el pedido trae horas', async () => {
  assert.equal((await api('PUT', '/admin/catalogo/productos', { id: 'mezcla', espacioId: 'estudio', nombre: 'Mezcla multitrack', precio: 5500, precioConReserva: 5000 }, ADMIN)).estado, 200);
  const suelto = await api('POST', '/cotizar', { carrito: { espacioId: 'estudio', sesiones: [], productos: [{ id: 'mezcla', cantidad: 2 }] } });
  assert.equal(suelto.datos.total, 11000);
  const conHoras = await api('POST', '/cotizar', { carrito: { espacioId: 'estudio', sesiones: [{ bloqueId: 'estudio-3h', modalidadId: 'estudio-ing' }], productos: [{ id: 'mezcla', cantidad: 2 }] } });
  assert.equal(conHoras.datos.total, 2700 + 10000);
  await api('PUT', '/admin/catalogo/productos', { id: 'mezcla', espacioId: 'estudio', nombre: 'Mezcla multitrack', precio: 5500, precioConReserva: null }, ADMIN);
});

test('panel: permisos, pedido con pago manual, hora extra, cargo y reembolso', async () => {
  assert.equal((await api('GET', '/admin/resumen')).estado, 401);
  assert.equal((await api('GET', '/admin/resumen', undefined, 'dev:nadie@correo.com')).estado, 403);
  const res = await api('GET', '/admin/resumen', undefined, ADMIN);
  assert.equal(res.estado, 200);

  const r = await api('POST', '/admin/pedidos', {
    carrito: { espacioId: 'estudio', sesiones: [{ bloqueId: 'estudio-6h', modalidadId: 'estudio-dry', inicio: local('2026-10-27', 10) }], productos: [] },
    cliente: { nombre: 'Banda Sur', correo: 'banda@sur.mx' }, accion: 'pago_manual', pagoManual: { metodo: 'transferencia', referencia: 'SPEI 123' },
    lineasLibres: [{ concepto: 'Renta de amplificador extra', importe: 500 }], descuento: { concepto: 'Cliente frecuente', importe: 300 },
  }, ADMIN);
  assert.equal(r.estado, 200, JSON.stringify(r.datos));
  assert.equal(r.datos.estado, 'pagado');
  assert.equal(r.datos.total, 3500 + 500 - 300);
  const id = r.datos.pedidoId;
  const [s] = await e.ctx.sql`select id from sesiones where pedido_id = ${id}`;

  // Otra sesión pegada después (16:00 + margen = 17:00): la hora extra ya no cabe
  const pegada = await api('POST', '/admin/pedidos', {
    carrito: { espacioId: 'estudio', sesiones: [{ bloqueId: 'estudio-3h', modalidadId: 'estudio-dry', inicio: local('2026-10-27', 17) }], productos: [] },
    cliente: { nombre: 'Otro', correo: 'otro2@correo.com' }, accion: 'pago_manual',
  }, ADMIN);
  assert.equal(pegada.estado, 200, JSON.stringify(pegada.datos));
  const extra = await api('POST', `/admin/pedidos/${id}/hora-extra`, { sesion: s.id, horas: 1 }, ADMIN);
  assert.equal(extra.datos.codigo, 'HORARIO_OCUPADO');
  await api('POST', `/admin/pedidos/${pegada.datos.pedidoId}/cancelar`, { tipo: 'nada', avisar: false }, ADMIN);
  const extra2 = await api('POST', `/admin/pedidos/${id}/hora-extra`, { sesion: s.id, horas: 1, cobro: { modo: 'enlace' } }, ADMIN);
  assert.equal(extra2.estado, 200, JSON.stringify(extra2.datos));
  const det = await api('GET', `/admin/pedidos/${id}`, undefined, ADMIN);
  assert.equal(det.datos.saldo, 500);
  assert.ok(bandeja().some((a) => a.startsWith('Saldo pendiente')));

  await api('POST', `/admin/pedidos/${id}/cargo`, { concepto: 'Cuerdas de guitarra', precioUnitario: 250, cantidad: 1, cobro: { modo: 'manual', metodo: 'efectivo' } }, ADMIN);
  const det2 = await api('GET', `/admin/pedidos/${id}`, undefined, ADMIN);
  assert.equal(det2.datos.saldo, 500); // el cargo se pagó en efectivo; la hora extra sigue pendiente

  // Reembolso: el pedido se pagó por transferencia → queda como tarea manual
  const re = await api('POST', `/admin/pedidos/${id}/reembolso`, { monto: 200, motivo: 'Ajuste' }, ADMIN);
  assert.equal(re.estado, 200, JSON.stringify(re.datos));
  assert.equal(re.datos.manual, 200);
  const [tarea] = await e.ctx.sql`select tipo from tareas where pedido_id = ${id} and tipo = 'reembolso_manual'`;
  assert.ok(tarea);
});

test('reembolso con tarjeta va a Stripe', async () => {
  const r = await api('POST', '/pedidos', { carrito: { espacioId: 'estudio', sesiones: [], productos: [{ id: 'master', cantidad: 2 }] }, cliente: cliente('master@correo.com'), consentimiento });
  await pagarConTarjeta(r.datos.pedido);
  const re = await api('POST', `/admin/pedidos/${r.datos.pedido}/reembolso`, { monto: 2000 }, ADMIN);
  assert.equal(re.datos.stripe, 2000);
  assert.equal(e.pasarela.reembolsos.at(-1)!.centavos, 200000);
});

test('visitas: agendar, choque y cancelar', async () => {
  const v = await api('POST', '/visitas', { espacio: 'foro', inicio: local('2026-10-19', 9), nombre: 'Luis', correo: 'luis@correo.com', telefono: '5500000000' });
  assert.equal(v.estado, 200, JSON.stringify(v.datos));
  const otra = await api('POST', '/visitas', { espacio: 'foro', inicio: local('2026-10-19', 9), nombre: 'Eva', correo: 'eva@correo.com', telefono: '5500000001' });
  assert.equal(otra.estado, 409);
  const c = await api('POST', `/visitas/${v.datos.visita}/cancelar`, { t: v.datos.token });
  assert.equal(c.estado, 200);
  const [o] = await e.ctx.sql`select count(*)::int as n from ocupacion where visita_id = ${v.datos.visita}`;
  assert.equal(o.n, 0);
});

test('recordatorios y resumen del equipo sin duplicados', async () => {
  const r = await api('POST', '/pedidos', { carrito: { espacioId: 'foro', sesiones: [{ bloqueId: 'foro-6h', modalidadId: 'foro-renta', inicio: local('2026-11-05', 9) }], productos: [] }, cliente: cliente('foto@correo.com'), consentimiento });
  await pagarConTarjeta(r.datos.pedido);
  reloj = new Date(local('2026-11-03', 20.5)); // 36.5 h antes, después de las 20:00
  const tarea = () => manejar(new Request('http://api.test/api/tareas', { method: 'POST', headers: { 'x-tareas-secreto': 'secreto-local' } }), e.ctx).then((x) => x.json());
  const a = await tarea();
  assert.equal(a.recordatorios, 1, JSON.stringify(a));
  assert.equal(a.resumen_manana, 1);
  const b = await tarea();
  assert.equal(b.recordatorios, 0);
  assert.ok(bandeja().some((x) => x.startsWith('Tu sesión en Undying Studios es pasado mañana')));
});

test('el panel cambia precios y el sitio los cobra al momento', async () => {
  const g = await api('PUT', '/admin/catalogo/precios_bloque', { bloqueId: 'foro-3h', modalidadId: 'foro-renta', precio: 2200 }, ADMIN);
  assert.equal(g.estado, 200, JSON.stringify(g.datos));
  const q = await api('POST', '/cotizar', { carrito: { espacioId: 'foro', sesiones: [{ bloqueId: 'foro-3h', modalidadId: 'foro-renta' }], productos: [] } });
  assert.equal(q.datos.total, 2200);
  const h = await api('PUT', '/admin/horarios/foro', { semana: [0, 1, 2, 3, 4, 5, 6].map((dia) => ({ dia, abre: 540, cierra: 1080 })) }, ADMIN);
  assert.equal(h.estado, 200);
  const cat = await api('GET', '/catalogo?espacio=foro');
  assert.equal(cat.datos.catalogo.horarios[0].abre, 540);
});

test('firma de webhooks de Stripe', async () => {
  const cuerpo = JSON.stringify({ id: 'evt_1', type: 'x' });
  const ahora = new Date();
  const firma = await firmarParaPruebas(cuerpo, 'whsec_x', ahora);
  await verificarFirma(cuerpo, firma, 'whsec_x', ahora);
  await assert.rejects(() => verificarFirma(cuerpo, firma, 'otro', ahora));
  await assert.rejects(() => verificarFirma(cuerpo + ' ', firma, 'whsec_x', ahora));
});

test('volver de Stripe sin pagar libera el horario y devuelve el pedido', async () => {
  const carrito = { espacioId: 'estudio', sesiones: [{ bloqueId: 'estudio-3h', modalidadId: 'estudio-ing', inicio: local('2026-11-10', 10) }], productos: [] };
  const r = await api('POST', '/pedidos', { carrito, cliente: cliente('vuelve@correo.com'), consentimiento });
  assert.equal(r.estado, 200);
  const otro = await api('POST', '/pedidos', { carrito, cliente: cliente('vuelve@correo.com'), consentimiento });
  assert.equal(otro.estado, 409); // su propio apartado bloquea el horario
  const l = await api('POST', '/liberar', { pedido: r.datos.pedido, t: r.datos.token });
  assert.equal(l.estado, 200);
  assert.equal(l.datos.carrito.sesiones[0].bloqueId, 'estudio-3h');
  const otraVez = await api('POST', '/pedidos', { carrito, cliente: cliente('vuelve@correo.com'), consentimiento });
  assert.equal(otraVez.estado, 200);
  const ajeno = await api('POST', '/liberar', { pedido: otraVez.datos.pedido, t: r.datos.token.slice(0, -2) + 'xx' });
  assert.equal(ajeno.estado, 401);
});

test('panel: pedido solo con conceptos libres', async () => {
  const r = await api('POST', '/admin/pedidos', {
    carrito: { espacioId: 'estudio', sesiones: [], productos: [] },
    cliente: { nombre: 'Marca', correo: 'marca@empresa.mx' }, accion: 'enlace', apartadoHoras: 48,
    lineasLibres: [{ concepto: 'Jingle de 30 segundos', importe: 18000 }],
  }, ADMIN);
  assert.equal(r.estado, 200, JSON.stringify(r.datos));
  assert.equal(r.datos.total, 18000);
  assert.equal(r.datos.estado, 'apartado');
  assert.ok(bandeja().some((a) => a.startsWith('Tu cotización UND-')));
});

test('productor: demos del cliente, asignación, avisos por espacio y calendario del equipo', async () => {
  await e.ctx.sql`update ajustes set valor = valor || '{"correos_espacio": {"estudio": ["Music@Estudio.test", "music@estudio.test"]}}'::jsonb where clave = 'avisos'`;
  try {
    const carrito = { espacioId: 'estudio', sesiones: [{ bloqueId: 'estudio-3h', modalidadId: 'estudio-ing', inicio: local('2026-11-12', 10) }], productos: [{ id: 'productor', cantidad: 1, sesion: 0 }] };
    const r = await api('POST', '/pedidos', { carrito, cliente: cliente('prod@correo.com'), consentimiento });
    assert.equal(r.estado, 200, JSON.stringify(r.datos));
    assert.equal(await pagarConTarjeta(r.datos.pedido), 'ok');

    // Aviso al equipo: solo a la lista del estudio (sin repetir), con calendario
    const equipo = e.correo.bandeja.find((m) => m.asunto.startsWith('Nueva reserva') && m.asunto.includes(r.datos.numero))!;
    assert.deepEqual(equipo.para, ['music@estudio.test']);
    assert.equal(equipo.adjuntos?.[0].tipo, 'text/calendar');
    assert.match(equipo.html, /calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
    const conf = e.correo.bandeja.find((m) => m.asunto.includes(r.datos.numero) && m.para.includes('prod@correo.com'))!;
    assert.match(conf.texto, /demos, tracks y referencias para productor musical/);

    const v = await api('GET', `/pedidos/${r.datos.pedido}?t=${r.datos.token}`);
    assert.equal(v.datos.enSesion.length, 1);
    const linea = v.datos.enSesion[0].id;
    const vacio = await api('POST', '/cliente/material-sesion', { t: r.datos.token, linea });
    assert.equal(vacio.estado, 422);
    const ok = await api('POST', '/cliente/material-sesion', { t: r.datos.token, linea, enlace: 'https://drive.test/demos', referencias: 'Bad Bunny, Natalia Lafourcade' });
    assert.equal(ok.estado, 200, JSON.stringify(ok.datos));
    assert.equal(ok.datos.enSesion[0].material.referencias, 'Bad Bunny, Natalia Lafourcade');
    assert.ok(bandeja().some((a) => a.startsWith('Material para productor musical')));
    const ajeno = await api('POST', '/cliente/material-sesion', { t: tokenAna, linea, referencias: 'x' });
    assert.equal(ajeno.estado, 404);

    const a = await api('POST', `/admin/pedidos/${r.datos.pedido}/linea`, { linea, asignado: 'Toño', avisarCliente: true }, ADMIN);
    assert.equal(a.estado, 200, JSON.stringify(a.datos));
    const [t] = await e.ctx.sql`select hecha_en, nota from tareas where pedido_id = ${r.datos.pedido} and tipo = 'confirmar_productor'`;
    assert.ok(t.hechaEn);
    assert.equal(t.nota, 'Toño');
    assert.ok(bandeja().some((x) => x.startsWith('Tu productor musical para la sesión')));
    const despues = await api('GET', `/pedidos/${r.datos.pedido}?t=${r.datos.token}`);
    assert.equal(despues.datos.enSesion[0].asignado, 'Toño');
  } finally {
    await e.ctx.sql`update ajustes set valor = valor - 'correos_espacio' where clave = 'avisos'`;
  }
});
