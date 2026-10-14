import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ahorroBloque, calendario, cotizar, fechaLocal, horariosDelDia, ocupacionDeCarrito, resultadoCancelacion,
  utcDesdeLocal, validarCarrito, sumarDiasHabiles, puedeCambiarFecha,
} from '../../../supabase/functions/_shared/core/mod.ts';
import type { Carrito } from '../../../supabase/functions/_shared/core/mod.ts';
import { catalogoPrueba } from './catalogo-prueba.ts';

const TZ = 'America/Mexico_City';
// Martes 6 de octubre de 2026, 12:00 en la CDMX
const AHORA = new Date('2026-10-06T18:00:00Z');
const c = catalogoPrueba();
const estudio = c.espacios[0];
const foro = c.espacios[1];
const local = (fecha: string, hora: number) => utcDesdeLocal(fecha, hora * 60, TZ).toISOString();

test('zona horaria de la CDMX', () => {
  assert.equal(utcDesdeLocal('2026-10-10', 600, TZ).toISOString(), '2026-10-10T16:00:00.000Z');
  assert.equal(fechaLocal(new Date('2026-10-11T05:00:00Z'), TZ), '2026-10-10');
  // Ventana que cruza medianoche: 26:00 = 02:00 del día siguiente
  assert.equal(utcDesdeLocal('2026-10-10', 26 * 60, TZ).toISOString(), '2026-10-11T08:00:00.000Z');
  assert.equal(sumarDiasHabiles('2026-10-09', 3), '2026-10-14'); // viernes + 3 hábiles = miércoles
});

test('ahorro de bloques igual al de la página', () => {
  const b = (id: string) => c.bloques.find((x) => x.id === id)!;
  assert.equal(ahorroBloque(c, b('estudio-6h'), 'estudio-ing', AHORA), 17);
  assert.equal(ahorroBloque(c, b('estudio-9h'), 'estudio-ing', AHORA), 32);
  assert.equal(ahorroBloque(c, b('foro-6h'), 'foro-renta', AHORA), 25);
  assert.equal(ahorroBloque(c, b('foro-12h'), 'foro-renta', AHORA), 35);
});

test('paquete Banda: total, IVA incluido y OXXO fuera de límite', () => {
  const carrito: Carrito = {
    espacioId: 'estudio',
    sesiones: [{ bloqueId: 'estudio-6h', modalidadId: 'estudio-ing', inicio: local('2026-10-20', 10) }],
    productos: [{ id: 'edicion', cantidad: 1 }, { id: 'mezcla', cantidad: 1 }, { id: 'master', cantidad: 1 }],
  };
  const q = cotizar(carrito, c, { ahora: AHORA });
  assert.deepEqual(q.errores, []);
  assert.equal(q.total, 15500);
  assert.equal(q.iva, 2137.93);
  assert.equal(q.pagable, true);
  assert.equal(q.oxxo.disponible, false);
  assert.match(q.oxxo.motivo!, /10,000/);
});

test('solo postproducción no necesita fecha', () => {
  const q = cotizar({ espacioId: 'estudio', sesiones: [], productos: [{ id: 'mezcla', cantidad: 3 }] }, c, { ahora: AHORA });
  assert.equal(q.total, 16500);
  assert.equal(q.pagable, true);
});

test('sin fecha no se puede pagar', () => {
  const q = cotizar({ espacioId: 'estudio', sesiones: [{ bloqueId: 'estudio-3h', modalidadId: 'estudio-dry' }], productos: [] }, c, { ahora: AHORA });
  assert.equal(q.total, 2100);
  assert.equal(q.pagable, false);
  assert.equal(q.errores[0].codigo, 'FALTA_FECHA');
});

test('cambio de color: solo 12 h, 7 días de anticipación, OXXO hasta $10,000', () => {
  const ok = cotizar({ espacioId: 'foro', sesiones: [{ bloqueId: 'foro-12h', modalidadId: 'foro-renta', inicio: local('2026-10-16', 8), extras: [{ id: 'foro-color', opcion: 'verde' }] }], productos: [] }, c, { ahora: AHORA });
  assert.deepEqual(ok.errores, []);
  assert.equal(ok.total, 10000);
  assert.equal(ok.oxxo.disponible, true);

  const bloque = cotizar({ espacioId: 'foro', sesiones: [{ bloqueId: 'foro-6h', modalidadId: 'foro-renta', inicio: local('2026-10-16', 8), extras: [{ id: 'foro-color', opcion: 'verde' }] }], productos: [] }, c, { ahora: AHORA });
  assert.equal(bloque.errores[0].codigo, 'EXTRA_BLOQUE');

  const pronto = cotizar({ espacioId: 'foro', sesiones: [{ bloqueId: 'foro-12h', modalidadId: 'foro-renta', inicio: local('2026-10-11', 8), extras: [{ id: 'foro-color', opcion: 'verde' }] }], productos: [] }, c, { ahora: AHORA });
  assert.equal(pronto.errores[0].codigo, 'EXTRA_ANTICIPACION');

  const sinTexto = cotizar({ espacioId: 'foro', sesiones: [{ bloqueId: 'foro-12h', modalidadId: 'foro-renta', inicio: local('2026-10-16', 8), extras: [{ id: 'foro-color', opcion: 'otro' }] }], productos: [] }, c, { ahora: AHORA });
  assert.equal(sinTexto.errores[0].codigo, 'EXTRA_TEXTO');
});

test('días seguidos con el mismo color: se pinta y se cobra una vez', () => {
  const carrito: Carrito = {
    espacioId: 'foro',
    sesiones: [
      { bloqueId: 'foro-12h', modalidadId: 'foro-renta', inicio: local('2026-10-17', 8), extras: [{ id: 'foro-color', opcion: 'verde' }] },
      { bloqueId: 'foro-12h', modalidadId: 'foro-renta', inicio: local('2026-10-16', 8), extras: [{ id: 'foro-color', opcion: 'verde' }] },
    ],
    productos: [],
  };
  const q = cotizar(carrito, c, { ahora: AHORA });
  assert.equal(q.total, 5200 * 2 + 4800);
  const occ = ocupacionDeCarrito(carrito, c);
  const pintura = occ.filter((r) => r.tipo === 'pintura');
  assert.equal(pintura.length, 1);
  // Pintura el 14 y 15 de octubre (antes de la sesión del 16)
  assert.equal(new Date(pintura[0].inicio).toISOString(), local('2026-10-14', 0));
  assert.equal(new Date(pintura[0].fin).toISOString(), local('2026-10-16', 0));
  assert.equal(pintura[0].sesion, 1);
});

test('productor y músico van ligados a una sesión', () => {
  const sinSesion = cotizar({ espacioId: 'estudio', sesiones: [], productos: [{ id: 'productor', cantidad: 1 }] }, c, { ahora: AHORA });
  assert.equal(sinSesion.errores[0].codigo, 'PRODUCTO_SESION');

  const dos = cotizar({
    espacioId: 'estudio',
    sesiones: [
      { bloqueId: 'estudio-9h', modalidadId: 'estudio-ing', inicio: local('2026-10-20', 10) },
      { bloqueId: 'estudio-9h', modalidadId: 'estudio-ing', inicio: local('2026-10-21', 10) },
    ],
    productos: [{ id: 'productor', cantidad: 1 }],
  }, c, { ahora: AHORA });
  assert.equal(dos.errores[0].codigo, 'PRODUCTO_ELIGE_SESION');

  const musicos = cotizar({
    espacioId: 'estudio',
    sesiones: [{ bloqueId: 'estudio-6h', modalidadId: 'estudio-ing', inicio: local('2026-10-20', 10) }],
    productos: [{ id: 'productor', cantidad: 2 }, { id: 'musico', cantidad: 2, datos: [{ instrumento: 'Bajo' }] }],
  }, c, { ahora: AHORA });
  assert.deepEqual(musicos.errores.map((e) => e.codigo).sort(), ['PRODUCTO_DATOS', 'PRODUCTO_MAX_SESION']);
});

test('algo sin precio convierte el pedido en solicitud', () => {
  const q = cotizar({ espacioId: 'estudio', sesiones: [{ bloqueId: 'estudio-3h', modalidadId: 'estudio-ing', inicio: local('2026-10-20', 10), extras: [{ id: 'estudio-video' }] }], productos: [] }, c, { ahora: AHORA });
  assert.equal(q.seCotiza, true);
  assert.equal(q.pagable, false);
  assert.equal(q.total, 2700);
});

test('cupón y saldo a favor', () => {
  const carrito: Carrito = { espacioId: 'estudio', sesiones: [], productos: [{ id: 'mezcla', cantidad: 2 }] };
  const q = cotizar(carrito, c, { ahora: AHORA, cupon: { codigo: 'BANDA10', tipo: 'porcentaje', valor: 10 }, creditoDisponible: 2000 });
  assert.equal(q.subtotal, 11000);
  assert.equal(q.descuento, 1100);
  assert.equal(q.credito, 2000);
  assert.equal(q.total, 7900);
  const todo = cotizar(carrito, c, { ahora: AHORA, creditoDisponible: 50000 });
  assert.equal(todo.total, 0);
  assert.equal(todo.credito, 11000);
});

test('horarios con margen de una hora entre sesiones', () => {
  const op = { catalogo: c, espacio: estudio, duracionMin: 360, ahora: AHORA, ocupacion: [] as { inicio: number; fin: number }[] };
  assert.equal(horariosDelDia(op, '2026-10-10').horarios.length, 7); // 10:00 a 16:00
  // Sesión de 12:00 a 15:00 (ocupa hasta las 16:00 con el margen)
  op.ocupacion = [{ inicio: Date.parse(local('2026-10-10', 12)), fin: Date.parse(local('2026-10-10', 16)) }];
  const d = horariosDelDia(op, '2026-10-10');
  assert.deepEqual(d.horarios.map((h) => h.minuto), [16 * 60]);
});

test('anticipación de 24 horas y horizonte', () => {
  const op = { catalogo: c, espacio: estudio, duracionMin: 180, ahora: AHORA, ocupacion: [] };
  const manana = horariosDelDia(op, '2026-10-07');
  assert.equal(manana.horarios[0].minuto, 12 * 60);
  assert.equal(horariosDelDia(op, '2026-10-06').horarios.length, 0);
  assert.equal(horariosDelDia(op, '2027-06-01').horarios.length, 0);
});

test('el bloque de 12 horas solo cabe si el horario lo permite', () => {
  const op = { catalogo: c, espacio: foro, duracionMin: 720, ahora: AHORA, ocupacion: [] };
  assert.deepEqual(horariosDelDia(op, '2026-10-16').horarios.map((h) => h.minuto), [480]);
  const corto = { ...c, horarios: c.horarios.map((h) => (h.espacioId === 'foro' ? { ...h, abre: 540, cierra: 1080 } : h)) };
  const d = horariosDelDia({ ...op, catalogo: corto }, '2026-10-16');
  assert.equal(d.horarios.length, 0);
  assert.match(d.motivo!, /no cabe/);
});

test('excepciones del calendario', () => {
  const cc = { ...c, excepciones: [{ espacioId: 'estudio', fecha: '2026-10-12', cerrado: true, ventanas: [] }, { espacioId: 'estudio', fecha: '2026-10-13', cerrado: false, ventanas: [{ abre: 1080, cierra: 1560 }] }] };
  const op = { catalogo: cc, espacio: estudio, duracionMin: 360, ahora: AHORA, ocupacion: [] };
  assert.equal(horariosDelDia(op, '2026-10-12').motivo, 'Cerrado.');
  // Noche: de 18:00 a 02:00 → inicios 18, 19 y 20
  assert.deepEqual(horariosDelDia(op, '2026-10-13').horarios.map((h) => h.minuto), [1080, 1140, 1200]);
});

test('el color no se ofrece si el foro está ocupado los días de pintura', () => {
  const color = c.extras.find((x) => x.id === 'foro-color')!;
  const ocupado = [{ inicio: Date.parse(local('2026-10-15', 9)), fin: Date.parse(local('2026-10-15', 13)) }];
  const d = horariosDelDia({ catalogo: c, espacio: foro, duracionMin: 720, ahora: AHORA, ocupacion: ocupado, extras: [color] }, '2026-10-16');
  assert.equal(d.horarios.length, 0);
  assert.match(d.motivo!, /preparar/);
  const pronto = horariosDelDia({ catalogo: c, espacio: foro, duracionMin: 720, ahora: AHORA, ocupacion: [], extras: [color] }, '2026-10-12');
  assert.match(pronto.motivo!, /7 días/);
  const dias = calendario({ catalogo: c, espacio: foro, duracionMin: 720, ahora: AHORA, ocupacion: [], extras: [color] }, '2026-10-12', '2026-10-14');
  assert.deepEqual(dias.map((x) => x.horarios.length), [0, 1, 1]);
});

test('validación del carrito', () => {
  const encimadas: Carrito = { espacioId: 'estudio', productos: [], sesiones: [
    { bloqueId: 'estudio-3h', modalidadId: 'estudio-ing', inicio: local('2026-10-20', 10) },
    { bloqueId: 'estudio-3h', modalidadId: 'estudio-ing', inicio: local('2026-10-20', 13) },
  ] };
  assert.equal(validarCarrito(encimadas, c, [], AHORA)[0].codigo, 'SESIONES_ENCIMADAS');
  const hora = validarCarrito({ espacioId: 'estudio', productos: [], sesiones: [{ bloqueId: 'estudio-3h', modalidadId: 'estudio-ing', inicio: local('2026-10-20', 10.5) }] }, c, [], AHORA);
  assert.equal(hora[0].codigo, 'HORARIO_INVALIDO');
  // El panel puede usar cualquier hora, pero nunca encimar
  assert.deepEqual(validarCarrito({ espacioId: 'estudio', productos: [], sesiones: [{ bloqueId: 'estudio-3h', modalidadId: 'estudio-ing', inicio: local('2026-10-20', 10.5) }] }, c, [], AHORA, true), []);
});

test('políticas de cancelación y cambio de fecha', () => {
  const inicio = new Date(local('2026-10-20', 10));
  assert.equal(resultadoCancelacion(estudio, inicio, 4500, AHORA).tipo, 'credito');
  assert.equal(resultadoCancelacion(estudio, inicio, 4500, AHORA).monto, 4500);
  assert.equal(resultadoCancelacion(estudio, new Date(local('2026-10-08', 10)), 4500, AHORA).tipo, 'nada');
  assert.equal(resultadoCancelacion(foro, inicio, 3000, AHORA).monto, 0);
  assert.equal(puedeCambiarFecha(foro, new Date(local('2026-10-08', 13)), AHORA).permitido, true);
  assert.equal(puedeCambiarFecha(foro, new Date(local('2026-10-08', 10)), AHORA).permitido, false);
  assert.equal(puedeCambiarFecha(foro, new Date(local('2026-10-07', 10)), AHORA).permitido, false);
});

test('precio con reserva de horas', () => {
  const cc = catalogoPrueba();
  cc.productos.find((p) => p.id === 'mezcla')!.precioConReserva = 5000;
  assert.equal(cotizar({ espacioId: 'estudio', sesiones: [], productos: [{ id: 'mezcla', cantidad: 1 }] }, cc, { ahora: AHORA }).total, 5500);
  assert.equal(cotizar({ espacioId: 'estudio', sesiones: [{ bloqueId: 'estudio-3h', modalidadId: 'estudio-ing' }], productos: [{ id: 'mezcla', cantidad: 1 }] }, cc, { ahora: AHORA }).total, 2700 + 5000);
});
