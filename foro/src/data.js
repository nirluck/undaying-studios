/* =====================================================================
   CONTENIDO EDITABLE · Undying Studios · Foro audiovisual
   Todo sale de la página actual del foro (undyingstudios.mx, WordPress).
   Los textos de la página están en index.html, tal como en el sitio
   actual; aquí quedan los datos que usa main.js y vite.config.js.
   ===================================================================== */

// Las reseñas de Google son del negocio completo; se comparten con el estudio.
export { REVIEWS } from '../../shared/data/reviews.js';

export const LINKS = {
  // Contacto general de la guía del cliente (octubre 2026)
  whatsappNumber: '5215517432034',
  legalName: 'Undying Music Entertainment S.A.S. de C.V.',
  // Calendarios Prospex de las páginas de reservación actuales
  // (/reservacion-3-horas, -6-horas, -12-horas, -12-horas-recolor y /agendar-recorrido)
  booking: {
    '3h': 'https://link.prospex.mx/widget/booking/HmYuE7Ptlsatvpue0Ztz',
    '6h': 'https://link.prospex.mx/widget/booking/yzklmzWvDPcxGLJjNv8D',
    '12h': 'https://link.prospex.mx/widget/booking/gptKTYwGyZiOwCzQ2VbD',
    '12h-color': 'https://link.prospex.mx/widget/booking/y5rpqqQHgFIWtfsenMaC',
    scouting: 'https://link.prospex.mx/widget/booking/YdxMvtSMaaPszyPPOpwR',
  },
  bookingScript: 'https://link.prospex.mx/js/form_embed.js',
  // Enlaces de la página actual: dirección del pie y botón "¿Cómo llegar?"
  maps: 'https://maps.app.goo.gl/FoNYv6muSefCaJnA8',
  directions:
    'https://maps.google.com/maps/dir//UndyingStudios+Arrayanes+13+Lomas+de+San+Mateo+53200+Naucalpan+de+Ju%C3%A1rez,+M%C3%A9x./@19.4954628,-99.2705957,18z/data=!4m5!4m4!1m0!1m2!1m1!1s0x85d203bae4f3f96d:0xec47b9f5110bf978',
  // Correo de contacto de los términos y condiciones del foro (octubre 2026)
  email: 'foro@undyingstudios.mx',
  social: {
    facebook: 'https://www.facebook.com/UndyingStudios',
    instagram: 'https://www.instagram.com/undyingstudios',
    tiktok: 'https://www.tiktok.com/@undyingstudios',
    youtube: 'https://www.youtube.com/@undyingstudios',
  },
  // PDF del cliente (tools/build-feedback2.py). Al reemplazar uno, sube su ?v=
  // para que el navegador no muestre la copia anterior.
  docs: {
    manual: 'documentos/manual-tecnico-foro.pdf?v=2',
    reglamento: 'documentos/reglamento-foro.pdf?v=2',
    terminos: 'documentos/terminos-y-condiciones-foro.pdf',
    privacidad: '../aviso-de-privacidad/',
  },
};

/* ---------- Tarifas (MXN) · las tres tarjetas de la página actual ---------- */
export const PRICING = {
  blocks: [
    { id: '3h', hours: 3, price: 2400 },
    { id: '6h', hours: 6, price: 3600, save: 25 },
    // La casilla "Personalizar color de ciclorama" suma $5,800 y cambia al
    // calendario de 12 horas con cambio de color.
    { id: '12h', hours: 12, price: 6200, save: 35, color: { id: '12h-color', extra: 5800 } },
  ],
};

/* ---------- Videoclips grabados en el foro ----------
   Sección que pidió el cliente en "Correcciones foro". src/clips.json es la
   copia local de la playlist; se refresca con:
   node tools/sync-clips.mjs PL8bIl-NaTJFi3g4-jjmeeWq3_YIqViB25 foro/src/clips.json */
export const YOUTUBE = {
  playlist: 'https://youtube.com/playlist?list=PL8bIl-NaTJFi3g4-jjmeeWq3_YIqViB25',
  max: 12,
};

/* ---------- Preguntas frecuentes ----------
   Nota del cliente en "Correcciones foro". Cada respuesta sale de la página
   actual, de los términos y condiciones del foro (versión de octubre 2026)
   o de su reglamento. Donde no coinciden, mandan los términos. */
export const FAQS = [
  {
    q: '¿Cómo reservo el foro?',
    a: 'En Tarifas elige 3, 6 o 12 horas, da clic en Seleccionar y escoge fecha y hora en el calendario. El 100% del pago se realiza al confirmar la reserva.',
  },
  {
    q: '¿Qué incluye la renta?',
    a: 'Foro de 72 m², ciclorama blanco de 6 x 6.5 x 3.5 m, equipo de iluminación y audio esencial, zona de tramoya con altura de 3.5 m, y acceso a camerinos, sala de estar y terraza.',
  },
  {
    q: '¿Puedo cambiar el color del ciclorama?',
    a: 'Sí. En la renta de 12 horas puedes personalizar el color del ciclorama por $5,800 MXN adicionales. Marca la casilla en la tarjeta de 12 horas antes de seleccionar; el cambio se confirma con al menos 72 horas de anticipación.',
  },
  {
    q: '¿Puedo cancelar o cambiar la fecha de mi reservación?',
    a: 'No se hacen reembolsos cuando el cliente cancela, pero puedes reprogramar sin penalización con al menos 48 horas de anticipación, sujeto a disponibilidad. Si cancelas o no te presentas con menos de 24 horas, se pierde el pago completo. Si el foro cancela, te ofrecemos una nueva fecha con prioridad o el reembolso total del pago.',
  },
  {
    q: '¿Cuántas personas pueden estar en el foro?',
    a: 'El aforo es de 25 personas. Envía la lista completa del crew, talentos y acompañantes con al menos 24 horas de anticipación; las personas no registradas pueden quedarse fuera o generar un cargo de $100 MXN por persona.',
  },
  {
    q: '¿Qué pasa al terminar mi tiempo?',
    a: 'El tiempo de renta inicia puntualmente a la hora reservada, y el montaje, maquillaje y desmontaje forman parte de tu bloque. Al terminar hay 30 minutos de tolerancia para desalojar el foro; pasado ese tiempo se cobra la hora extra vigente, sujeto a disponibilidad.',
  },
  {
    q: '¿Se puede comer, fumar o beber alcohol?',
    a: 'No se permite ingresar ni consumir alimentos en el foro de grabación, ni consumir bebidas alcohólicas en las instalaciones. Solo se puede fumar en las áreas designadas al aire libre.',
  },
  {
    q: '¿Qué cargos puede haber al final de la sesión?',
    a: 'La basura de tu producción se retira al terminar; si no, el cargo por limpieza es de $200 MXN. Si el ciclorama necesita pintura, el cargo es de $2,500 MXN. Cualquier daño a las instalaciones o al equipo corre por cuenta del cliente.',
  },
  {
    q: '¿Puedo conocer el foro antes de reservar?',
    a: 'Sí. Agenda un scouting: es un recorrido gratuito para verificar que las instalaciones son adecuadas para tu proyecto.',
  },
];

// Datos para el SEO (vite.config.js); se muestran igual en la página.
export const AREA = '72 m²';
export const HOURS = 'Lunes a Domingo de 9 a.m. a 6 p.m.';
export const ADDRESS = 'Arrayanes 13, Lomas de San Mateo, 53200 Naucalpan de Juárez, México';
