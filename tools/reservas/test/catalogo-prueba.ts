// Catálogo de prueba con los mismos valores que supabase/seed.sql.
import type { Catalogo, Espacio } from '../../../supabase/functions/_shared/core/tipos.ts';

const base = (id: string, extra: Partial<Espacio>): Espacio => ({
  id, nombre: id, nombreCorto: id === 'foro' ? 'Foro' : 'Estudio', zonaHoraria: 'America/Mexico_City', reservable: true,
  margenMin: 60, pasoMin: 60, anticipacionH: 24, horizonteDias: 180, aforo: null, variasSesiones: true,
  visitas: { activas: true, duracionMin: 30, pasoMin: 30, anticipacionH: 24 },
  politica: { cambioH: 72, cancelacionH: 72, antes: 'credito', despues: 'nada', creditoDias: 90 },
  pago: { apartadoMin: 35, oxxo: { activo: true, diasMin: 3, vigenciaDias: 1, montoMax: 10000 }, msi: { activo: false, montoMin: 3000 } },
  documentos: {}, orden: 0, activo: true, ...extra,
});

const semana = (espacioId: string, abre: number, cierra: number) => [0, 1, 2, 3, 4, 5, 6].map((dia) => ({ espacioId, dia, abre, cierra }));
const p = (precio: number | null) => ({ precio });

export function catalogoPrueba(): Catalogo {
  return {
    espacios: [
      base('estudio', {}),
      base('foro', { politica: { cambioH: 48, cancelacionH: 48, antes: 'nada', despues: 'nada', creditoDias: 90 } }),
    ],
    horarios: [...semana('estudio', 600, 1320), ...semana('foro', 480, 1200)],
    excepciones: [],
    modalidades: [
      { id: 'estudio-ing', espacioId: 'estudio', nombre: 'Con ingeniero', nota: null, descripcionCorta: 'con ingeniero', ventajas: [], tarea: 'asignar_ingeniero', pideIngenieroCliente: false, horaExtra: p(500), orden: 1, activo: true },
      { id: 'estudio-dry', espacioId: 'estudio', nombre: 'Sin ingeniero', nota: null, descripcionCorta: 'sin ingeniero (Dry Hire)', ventajas: [], tarea: null, pideIngenieroCliente: true, horaExtra: p(500), orden: 2, activo: true },
      { id: 'foro-renta', espacioId: 'foro', nombre: 'Renta', nota: null, descripcionCorta: '', ventajas: [], tarea: null, pideIngenieroCliente: false, horaExtra: p(500), orden: 1, activo: true },
    ],
    bloques: [
      { id: 'estudio-3h', espacioId: 'estudio', horas: 3, etiqueta: null, frase: null, destacado: false, orden: 1, activo: true, precios: { 'estudio-ing': p(2700), 'estudio-dry': p(2100) } },
      { id: 'estudio-6h', espacioId: 'estudio', horas: 6, etiqueta: null, frase: null, destacado: true, orden: 2, activo: true, precios: { 'estudio-ing': p(4500), 'estudio-dry': p(3500) } },
      { id: 'estudio-9h', espacioId: 'estudio', horas: 9, etiqueta: null, frase: null, destacado: false, orden: 3, activo: true, precios: { 'estudio-ing': p(5500), 'estudio-dry': p(4300) } },
      { id: 'foro-3h', espacioId: 'foro', horas: 3, etiqueta: null, frase: null, destacado: false, orden: 1, activo: true, precios: { 'foro-renta': p(2000) } },
      { id: 'foro-6h', espacioId: 'foro', horas: 6, etiqueta: null, frase: null, destacado: true, orden: 2, activo: true, precios: { 'foro-renta': p(3000) } },
      { id: 'foro-12h', espacioId: 'foro', horas: 12, etiqueta: null, frase: null, destacado: false, orden: 3, activo: true, precios: { 'foro-renta': p(5200) } },
    ],
    extras: [
      { id: 'foro-color', espacioId: 'foro', nombre: 'Cambio de color del ciclorama', descripcion: null, precio: p(4800), anticipacionDias: 7, bloqueoAntesDias: 2, bloqueoDespuesDias: 0, bloques: ['foro-12h'],
        opciones: [{ id: 'verde', nombre: 'Verde croma' }, { id: 'azul', nombre: 'Azul croma' }, { id: 'otro', nombre: 'Otro color', pideTexto: true, ayuda: 'Escribe el color' }], unaVezPorRacha: true, tarea: 'programar_pintura', orden: 1, activo: true },
      { id: 'estudio-video', espacioId: 'estudio', nombre: 'Equipo de video para podcast', descripcion: null, precio: p(null), anticipacionDias: 0, bloqueoAntesDias: 0, bloqueoDespuesDias: 0, bloques: null, opciones: [], unaVezPorRacha: false, tarea: null, orden: 1, activo: true },
    ],
    productos: [
      { id: 'mezcla', espacioId: 'estudio', nombre: 'Mezcla multitrack', descripcion: null, precio: p(5500), unidad: 'cancion', requiereSesion: false, maxPorSesion: null, maxCantidad: 20, revisiones: 2, precioRevision: null, entregaDias: 7, generaTrabajo: true, tarea: null, campos: [{ id: 'titulo', etiqueta: 'Título' }], orden: 1, activo: true },
      { id: 'master', espacioId: 'estudio', nombre: 'Máster por track', descripcion: null, precio: p(2000), unidad: 'cancion', requiereSesion: false, maxPorSesion: null, maxCantidad: 20, revisiones: 2, precioRevision: null, entregaDias: 3, generaTrabajo: true, tarea: null, campos: [], orden: 2, activo: true },
      { id: 'edicion', espacioId: 'estudio', nombre: 'Edición multitrack', descripcion: null, precio: p(3500), unidad: 'cancion', requiereSesion: false, maxPorSesion: null, maxCantidad: 20, revisiones: 0, precioRevision: null, entregaDias: 5, generaTrabajo: true, tarea: null, campos: [], orden: 3, activo: true },
      { id: 'vocal', espacioId: 'estudio', nombre: 'Edición y afinación vocal', descripcion: null, precio: p(2500), unidad: 'cancion', requiereSesion: false, maxPorSesion: null, maxCantidad: 20, revisiones: 0, precioRevision: null, entregaDias: 5, generaTrabajo: true, tarea: null, campos: [], orden: 4, activo: true },
      { id: 'productor', espacioId: 'estudio', nombre: 'Productor musical', descripcion: null, precio: p(7000), unidad: 'sesion', requiereSesion: true, maxPorSesion: 1, maxCantidad: 20, revisiones: 0, precioRevision: null, entregaDias: null, generaTrabajo: false, tarea: 'confirmar_productor', campos: [], orden: 5, activo: true },
      { id: 'musico', espacioId: 'estudio', nombre: 'Músico de sesión', descripcion: null, precio: p(2500), unidad: 'sesion', requiereSesion: true, maxPorSesion: 6, maxCantidad: 20, revisiones: 0, precioRevision: null, entregaDias: null, generaTrabajo: false, tarea: 'confirmar_musico', campos: [{ id: 'instrumento', etiqueta: 'Instrumento', alReservar: true }], orden: 6, activo: true },
    ],
    paquetes: [
      { id: 'banda', espacioId: 'estudio', nombre: 'Banda', descripcion: null, bloqueId: 'estudio-6h', modalidadId: 'estudio-ing', productos: { edicion: 1, mezcla: 1, master: 1 }, orden: 1, activo: true },
    ],
    tiposCargo: [],
  };
}
