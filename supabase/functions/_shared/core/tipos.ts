// Tipos compartidos por el cotizador (navegador), la API y el panel.

export interface PrecioProgramado {
  precio: number | null;
  nuevo?: number | null;
  desde?: string | null;
}

export type ResultadoPolitica = 'credito' | 'reembolso' | 'nada';

export interface Politica {
  cambioH: number;
  cancelacionH: number;
  antes: ResultadoPolitica;
  despues: ResultadoPolitica;
  creditoDias: number;
}

export interface ConfigPago {
  apartadoMin: number;
  oxxo: { activo: boolean; diasMin: number; vigenciaDias: number; montoMax: number };
  msi: { activo: boolean; montoMin: number };
}

export interface ConfigVisitas {
  activas: boolean;
  duracionMin: number;
  pasoMin: number;
  anticipacionH: number;
}

export interface Espacio {
  id: string;
  nombre: string;
  nombreCorto: string;
  zonaHoraria: string;
  reservable: boolean;
  margenMin: number;
  pasoMin: number;
  anticipacionH: number;
  horizonteDias: number;
  aforo: number | null;
  variasSesiones: boolean;
  visitas: ConfigVisitas;
  politica: Politica;
  pago: ConfigPago;
  documentos: Record<string, string>;
  orden: number;
  activo: boolean;
}

export interface Ventana { abre: number; cierra: number }

export interface Horario { espacioId: string; dia: number; abre: number; cierra: number }

export interface Excepcion { espacioId: string; fecha: string; cerrado: boolean; ventanas: Ventana[]; nota?: string | null }

export interface Modalidad {
  id: string;
  espacioId: string;
  nombre: string;
  nota: string | null;
  descripcionCorta: string | null;
  ventajas: string[];
  tarea: string | null;
  pideIngenieroCliente: boolean;
  horaExtra: PrecioProgramado;
  orden: number;
  activo: boolean;
}

export interface Bloque {
  id: string;
  espacioId: string;
  horas: number;
  etiqueta: string | null;
  frase: string | null;
  destacado: boolean;
  orden: number;
  activo: boolean;
  precios: Record<string, PrecioProgramado>;
}

export interface OpcionExtra {
  id: string;
  nombre: string;
  muestra?: string | null;
  pideTexto?: boolean;
  ayuda?: string;
}

export interface Extra {
  id: string;
  espacioId: string;
  nombre: string;
  descripcion: string | null;
  precio: PrecioProgramado;
  anticipacionDias: number;
  bloqueoAntesDias: number;
  bloqueoDespuesDias: number;
  bloques: string[] | null;
  opciones: OpcionExtra[];
  unaVezPorRacha: boolean;
  tarea: string | null;
  orden: number;
  activo: boolean;
}

export interface CampoProducto { id: string; etiqueta: string; alReservar?: boolean }

export type UnidadProducto = 'cancion' | 'sesion' | 'pieza';

export interface Producto {
  id: string;
  espacioId: string;
  nombre: string;
  descripcion: string | null;
  precio: PrecioProgramado;
  /** Precio cuando el pedido incluye horas de estudio. null = el mismo. */
  precioConReserva?: number | null;
  unidad: UnidadProducto;
  requiereSesion: boolean;
  maxPorSesion: number | null;
  maxCantidad: number;
  revisiones: number;
  precioRevision: number | null;
  entregaDias: number | null;
  generaTrabajo: boolean;
  tarea: string | null;
  campos: CampoProducto[];
  orden: number;
  activo: boolean;
}

export interface Paquete {
  id: string;
  espacioId: string;
  nombre: string;
  descripcion: string | null;
  bloqueId: string | null;
  modalidadId: string | null;
  productos: Record<string, number>;
  orden: number;
  activo: boolean;
}

export interface TipoCargo { id: string; espacioId: string | null; nombre: string; precio: number | null; orden: number; activo: boolean }

export interface Catalogo {
  espacios: Espacio[];
  horarios: Horario[];
  excepciones: Excepcion[];
  modalidades: Modalidad[];
  bloques: Bloque[];
  extras: Extra[];
  productos: Producto[];
  paquetes: Paquete[];
  tiposCargo: TipoCargo[];
}

// ---------- Carrito ----------

export interface ExtraElegido { id: string; opcion?: string | null; texto?: string | null }

export interface SesionCarrito {
  bloqueId: string;
  modalidadId: string;
  inicio?: string | null;
  /** Fin real si se extendió con hora extra (solo del lado del servidor). */
  fin?: string | null;
  extras?: ExtraElegido[];
}

export interface ProductoCarrito {
  id: string;
  cantidad: number;
  /** Índice de la sesión a la que va ligado (productos por sesión). */
  sesion?: number | null;
  /** Datos por unidad: [{ instrumento: 'Bajo' }, …] */
  datos?: Record<string, string>[];
}

export interface Carrito {
  espacioId: string;
  sesiones: SesionCarrito[];
  productos: ProductoCarrito[];
  cupon?: string | null;
  paquete?: string | null;
}

export interface Cupon { codigo: string; tipo: 'porcentaje' | 'monto'; valor: number }

export type TipoLinea = 'sesion' | 'extra' | 'producto' | 'hora_extra' | 'cargo' | 'personalizado' | 'descuento' | 'credito';

export interface Linea {
  tipo: TipoLinea;
  ref: string | null;
  concepto: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
  sesion?: number;
  datos?: Record<string, unknown>;
  seCotiza?: boolean;
}

export interface Problema { codigo: string; mensaje: string; sesion?: number; producto?: string; extra?: string }

export interface Cotizacion {
  lineas: Linea[];
  subtotal: number;
  descuento: number;
  credito: number;
  total: number;
  iva: number;
  seCotiza: boolean;
  pagable: boolean;
  errores: Problema[];
  avisos: Problema[];
  oxxo: { disponible: boolean; motivo?: string };
  msi: boolean;
}

/** Rango en milisegundos desde epoch, fin exclusivo. */
export interface Rango { inicio: number; fin: number }

export interface RangoOcupacion extends Rango { tipo: 'sesion' | 'pintura' | 'bloqueo' | 'visita'; sesion?: number }
