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
  // Correo de la guía del cliente. La página actual dice foro@undyingstudio.mx
  // (sin la "s" de undyingstudios). POR CONFIRMAR cuál mostrar.
  email: 'music@undyingstudios.mx',
  social: {
    facebook: 'https://www.facebook.com/UndyingStudios',
    instagram: 'https://www.instagram.com/undyingstudios',
    tiktok: 'https://www.tiktok.com/@undyingstudios',
    youtube: 'https://www.youtube.com/@undyingstudios',
  },
  // Copias locales de los PDF del sitio actual (tools/build-foro-assets.py)
  docs: {
    manual: 'documentos/manual-tecnico-foro.pdf',
    reglamento: 'documentos/reglamento-foro.pdf',
    terminos: 'documentos/terminos-y-condiciones-foro.pdf',
    privacidad: '../aviso-de-privacidad/',
  },
};

/* ---------- Tarifas (MXN) · las tres tarjetas de la página actual ---------- */
export const PRICING = {
  blocks: [
    { id: '3h', hours: 3, price: 2000 },
    { id: '6h', hours: 6, price: 3000, save: 25 },
    // La casilla "Personalizar color de ciclorama" suma $4,800 y cambia al
    // calendario de 12 horas con cambio de color.
    { id: '12h', hours: 12, price: 5200, save: 35, color: { id: '12h-color', extra: 4800 } },
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
   actual, de los términos y condiciones o del reglamento del foro.
   OJO: el reglamento (2.3) dice que se cancela con 24 h y que con menos de
   12 h no hay reembolso; los términos (5) dicen que no hay reembolso y que se
   reprograma con 48 h. Aquí se usan los términos. POR CONFIRMAR. */
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
    a: 'Sí. En la renta de 12 horas puedes personalizar el color del ciclorama por $4,800 MXN adicionales. Marca la casilla en la tarjeta de 12 horas antes de seleccionar.',
  },
  {
    q: '¿Puedo cancelar o cambiar la fecha de mi reservación?',
    a: 'No se hacen reembolsos cuando el cliente cancela, pero puedes reprogramar con al menos 48 horas de anticipación, sujeto a disponibilidad. Si el foro cancela, te ofrecemos una nueva fecha o el reembolso total del pago.',
  },
  {
    q: '¿Cuántas personas pueden estar en el foro?',
    a: 'El aforo es de 25 personas. Las visitas a tu sesión deben registrarse antes; si no, tendrán que esperar fuera de las instalaciones o se cobra un cargo de $100 MXN por persona.',
  },
  {
    q: '¿Qué pasa al terminar mi tiempo?',
    a: 'El tiempo de renta inicia y termina según tu reservación. Hay 15 minutos de tolerancia para desalojar el foro; pasado ese tiempo puede haber cargos adicionales.',
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
