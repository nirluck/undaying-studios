/* =====================================================================
   Servicios legales (hoja "Servicios Legales" del Excel del cliente).
   Precio suelto (compra individual) y precio en paquete (con reserva).
   Todavía no están en el catálogo del back: aquí se agregan al catálogo
   solo para la página de prueba. Al pasarlos a supabase/seed.sql van como
   productos con `precio` = suelto y `precio_con_reserva` = paquete.
   ===================================================================== */
export const LEGALES = [
  { id: 'legal-split', nombre: 'Split Sheet (Acuerdo de Coautoría)', descripcion: 'Identificación de participantes, porcentajes de autoría y titularidad de regalías.', precio: 1100, conReserva: 800 },
  { id: 'legal-registro-obra', nombre: 'Registro de Obra Musical & Fonograma', descripcion: 'Protección jurídica ante INDAUTOR para determinar la propiedad de la canción y el máster audio/podcast.', precio: 2000, conReserva: 1700 },
  { id: 'legal-produccion', nombre: 'Contrato de Producción Musical', descripcion: 'Estipulación formal de derechos, obligaciones, regalías y créditos del productor.', precio: 4200, conReserva: 3800 },
  { id: 'legal-musico', nombre: 'Contrato para Músico de Sesión', descripcion: 'Cesión formal de derechos de ejecución para instrumentistas contratados en la grabación.', precio: 4200, conReserva: 3800 },
  { id: 'legal-locucion', nombre: 'Contrato de Locución', descripcion: 'Regulación de la prestación de servicio vocal y cesión de derechos de uso comercial de la voz.', precio: 4200, conReserva: 3800 },
  { id: 'legal-encargo', nombre: 'Contrato de Obra por Encargo', descripcion: 'Encomienda formal para creación de jingles o música por encargo con transferencia total de titularidad.', precio: 4200, conReserva: 3800 },
  { id: 'legal-agrupacion', nombre: 'Acuerdo Interno de Agrupación Musical', descripcion: 'Reglas claras entre integrantes de la banda: titularidad del nombre, ingresos, salidas y obligaciones.', precio: 6800, conReserva: 6200 },
  { id: 'legal-marca', nombre: 'Registro de Marca (IMPI)', descripcion: 'Registro de marca artística o comercial para proteger el nombre del proyecto o solista (incluye derechos).', precio: 6800, conReserva: 6200 },
  { id: 'legal-samples', nombre: 'Acuerdo de Liquidación de Samples', descripcion: 'Licenciamiento y autorización legal para el uso de fragmentos de obras preexistentes.', precio: 7900, conReserva: 7200 },
  { id: 'legal-imagen', nombre: 'Release de Imagen', descripcion: 'Autorización formal para captar, utilizar y difundir el rostro/figura en fotos y videoclips.', precio: 1100, conReserva: 800 },
];

/* POR CONFIRMAR: el cliente tiene un "Mapeo de Add-Ons Legales por Tipo de
   Proyecto" en un Google Doc al que no hay acceso. Mientras, esta es una
   propuesta: cada regla mira el pedido y sugiere servicios con un motivo.
   Se muestran los 3 primeros que no estén ya en el pedido. */
export const RECOMENDACIONES = [
  { si: (p) => p.productos.musico, id: 'legal-musico', motivo: 'Agregaste músicos de sesión' },
  { si: (p) => p.productos.productor, id: 'legal-produccion', motivo: 'Trabajas con nuestro productor' },
  { si: (p) => p.preset === 'banda', id: 'legal-agrupacion', motivo: 'Para bandas' },
  { si: (p) => p.preset === 'podcast', id: 'legal-locucion', motivo: 'Para podcast y locución' },
  { si: (p) => p.preset === 'podcast' || p.video, id: 'legal-imagen', motivo: 'Si vas a grabar video' },
  { si: (p) => p.productos.productor || p.preset === 'banda', id: 'legal-split', motivo: 'Si la canción tiene varios autores' },
  { si: (p) => p.horas || p.productos.mezcla || p.productos.master, id: 'legal-registro-obra', motivo: 'Protege la canción y el máster' },
  { si: () => true, id: 'legal-split', motivo: 'Si la canción tiene varios autores' },
  { si: () => true, id: 'legal-marca', motivo: 'Protege el nombre de tu proyecto' },
];
