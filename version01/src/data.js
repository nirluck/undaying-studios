/* =====================================================================
   CONTENIDO EDITABLE — Undying Studios · Estudio de Grabación
   Todo lo que el cliente puede cambiar sin tocar diseño vive aquí:
   precios, equipo, pistas del portafolio, FAQs, testimonios, enlaces.
   ===================================================================== */

export const LINKS = {
  // Número de WhatsApp en formato internacional sin "+" (ej. 5215512345678).
  // Si se deja vacío se usa el short link del cliente.
  whatsappNumber: '',
  whatsappShort: 'https://wa.link/fl03s4',
  // Calendarios Prospex. Los IDs del foro se usan como placeholder hasta que
  // el cliente cree los calendarios del estudio.
  booking: {
    '4h': 'https://link.prospex.mx/widget/booking/HmYuE7Ptlsatvpue0Ztz',
    '8h': 'https://link.prospex.mx/widget/booking/HmYuE7Ptlsatvpue0Ztz',
    '12h': 'https://link.prospex.mx/widget/booking/HmYuE7Ptlsatvpue0Ztz',
    scouting: 'https://link.prospex.mx/widget/booking/YdxMvtSMaaPszyPPOpwR',
  },
  bookingScript: 'https://link.prospex.mx/js/form_embed.js',
  maps: 'https://maps.app.goo.gl/FoNYv6muSefCaJnA8',
  directions:
    'https://maps.google.com/maps/dir//UndyingStudios+Arrayanes+13+Lomas+de+San+Mateo+53200+Naucalpan+de+Ju%C3%A1rez,+M%C3%A9x./@19.4954628,-99.2705957,18z',
  foro: 'https://undyingstudios.mx/',
  email: 'estudio@undyingstudios.mx',
  social: {
    instagram: 'https://www.instagram.com/undyingstudios',
    tiktok: 'https://www.tiktok.com/@undyingstudios',
    youtube: 'https://www.youtube.com/@undyingstudios',
    facebook: 'https://www.facebook.com/UndyingStudios',
  },
  legal: {
    privacidad: '#',
    terminos: 'https://undyingstudios.mx/documentos/terminos-y-condiciones.pdf',
    reglamento: '#',
  },
};

/* ---------- Tarifas (MXN) ---------- */
export const PRICING = {
  currency: 'MXN',
  // Bloques con ingeniero de casa incluido.
  blocks: [
    {
      id: '4h',
      hours: 4,
      name: 'Sesión',
      withEngineer: 3200,
      dryHire: 2600,
      tagline: 'Para voces, overdubs y sencillos.',
      perks: ['Ingeniero de casa', 'Live Room + Control Room', 'Iso Booth de voz', 'Backline básico', 'Lounge y café'],
      badge: null,
    },
    {
      id: '8h',
      hours: 8,
      name: 'Jornada',
      withEngineer: 5800,
      dryHire: 4600,
      tagline: 'Banda completa o producción de un tema.',
      perks: ['Ingeniero de casa', 'Todas las salas', 'Backline completo', 'Sesión de escucha final', 'Lounge y café'],
      badge: 'Más popular',
    },
    {
      id: '12h',
      hours: 12,
      name: 'Día completo',
      withEngineer: 7900,
      dryHire: 6400,
      tagline: 'EP, sesión en vivo o día de tracking.',
      perks: ['Ingeniero de casa', 'Todas las salas', 'Backline completo', 'Asistente de estudio', 'Comida incluida'],
      badge: 'Mejor tarifa',
    },
  ],
  extraHour: 850,
  extras: [
    { id: 'mix', name: 'Mezcla por canción', price: 2500, unit: 'canción', desc: 'Mezcla híbrida en SSL con outboard analógico. Incluye 2 revisiones.' },
    { id: 'master', name: 'Master por canción', price: 900, unit: 'canción', desc: 'Master para streaming y vinilo. Entrega en 48 h.' },
    { id: 'session', name: 'Músico de sesión', price: 1500, unit: 'músico', desc: 'Baterista, bajista, guitarrista o tecladista de nuestra red.' },
    { id: 'backline', name: 'Backline premium', price: 600, unit: 'sesión', desc: 'Batería DW Collector\'s, Twin Reverb, AC30, SVT y Rhodes.' },
    { id: 'tuning', name: 'Edición y afinación vocal', price: 800, unit: 'canción', desc: 'Comping, edición de tiempo y afinación transparente.' },
    { id: 'producer', name: 'Productor musical', price: 2200, unit: 'sesión', desc: 'Dirección de arreglo y producción durante la sesión.' },
  ],
  // Perfiles del cotizador: recomiendan un bloque y sugieren extras.
  profiles: [
    { id: 'voz', name: 'Voz o solista', desc: 'Voces, guitarras o un sencillo sobre pistas que ya tienes.', block: '4h', suggest: ['tuning', 'mix'] },
    { id: 'banda', name: 'Banda completa', desc: 'Tracking de batería, bajo, guitarras y voz en simultáneo.', block: '8h', suggest: ['backline', 'mix'] },
    { id: 'produccion', name: 'Producción de un tema', desc: 'Del demo a la canción terminada, con productor e ingeniero de casa.', block: '8h', suggest: ['producer', 'mix', 'master'] },
    { id: 'podcast', name: 'Podcast o locución', desc: 'Hasta cuatro micrófonos, cámara opcional, archivos el mismo día.', block: '4h', suggest: [] },
  ],
};

/* ---------- Salas ---------- */
export const ROOMS = [
  {
    id: 'live',
    name: 'Live Room',
    tag: 'Sala principal',
    area: '45 m²',
    height: '4.2 m',
    capacity: 'Hasta 8 músicos',
    acoustics: 'Viva y controlada',
    desc: 'La sala tiene acústica viva con decaimiento corto. Funciona muy bien para batería y para bandas que quieren grabar todos al mismo tiempo. Tiene difusores de madera, trampas de bajos en las esquinas y ventana directa al Control Room.',
    bullets: ['Aislamiento flotante para tracking simultáneo', 'Paneles móviles para secar o abrir la sala', '24 líneas de micrófono a consola', 'Iluminación regulable en tres escenas'],
    img: 'live-room',
    video: 'band',
  },
  {
    id: 'control',
    name: 'Control Room',
    tag: 'Cerebro del estudio',
    area: '28 m²',
    height: '3.4 m',
    capacity: 'Hasta 6 personas',
    acoustics: 'Sweet spot calibrado',
    desc: 'Está pensado para sesiones largas. La consola SSL va al centro, los monitores Focal están calibrados al punto de escucha y hay un sofá atrás para que el artista escuche lo mismo que el ingeniero.',
    bullets: ['Consola SSL Origin de 32 canales', 'Monitoreo principal y de campo cercano', 'Outboard analógico en rack a la mano', 'Clima independiente y luz cálida'],
    img: 'control-room',
    video: 'console',
  },
  {
    id: 'booth',
    name: 'Iso Booths',
    tag: 'Dos cabinas aisladas',
    area: '6 m² + 5 m²',
    height: '2.8 m',
    capacity: '1 a 2 personas',
    acoustics: 'Seca, sin filtraciones',
    desc: 'La cabina A está tratada para voz y locución. La cabina B es para amplificadores a volumen real. Así puedes grabar guitarras y voz al mismo tiempo que la batería sin que se filtren entre micrófonos.',
    bullets: ['Ventana con visión al Live Room', 'Cue mix personal en cada cabina', 'Talkback de dos vías', 'Ventilación silenciosa'],
    img: 'vocal-booth',
    video: null,
  },
  {
    id: 'lounge',
    name: 'Lounge',
    tag: 'Área de descanso',
    area: '20 m²',
    height: '—',
    capacity: 'Toda la banda',
    acoustics: 'Aislado del Live Room',
    desc: 'Café de grano, sillones, una mesa grande para trabajar y wifi simétrico. Es donde la banda espera su turno o termina la letra que faltaba.',
    bullets: ['Café, agua y snacks incluidos', 'Baño privado', 'Casilleros para instrumentos', 'Estacionamiento con carga y descarga'],
    img: 'lounge',
    video: null,
  },
];

/* ---------- Equipo ---------- */
export const GEAR = [
  {
    id: 'consola',
    name: 'Consola y grabación',
    intro: 'Grabas en digital con preamplificación y suma analógica. El cue de los músicos no tiene latencia.',
    img: 'gear-console-hands',
    groups: [
      { title: 'Consola', items: ['SSL Origin · 32 canales', 'Automatización por DAW', 'Sumador de 16 stereo stems'] },
      { title: 'Conversión y DAW', items: ['Universal Audio Apollo x16 ×2 (32 in / 32 out)', 'Antelope 10MX clock', 'Pro Tools Ultimate 2025', 'Logic Pro y Ableton Live 12', 'Mac Studio M2 Ultra · 128 GB'] },
    ],
  },
  {
    id: 'monitoreo',
    name: 'Monitoreo',
    intro: 'Tres sistemas de monitoreo distintos para revisar que la mezcla suene bien en el coche, en el celular y en una bocina grande.',
    img: 'mix-1',
    groups: [
      { title: 'Principal', items: ['Focal Trio6 Be', 'Yamaha NS-10M con Bryston 4B', 'Avantone MixCube'] },
      { title: 'Cue y audífonos', items: ['Sistema Hear Back de 8 canales', 'Sennheiser HD 650 ×6', 'Audio-Technica ATH-M50x ×8', 'Beyerdynamic DT 770 ×4'] },
    ],
  },
  {
    id: 'microfonos',
    name: 'Micrófonos',
    intro: 'Condensadores, dinámicos y de cinta para cubrir voz, batería, cuerdas y amplificadores.',
    img: 'mics-locker',
    groups: [
      { title: 'Condensadores', items: ['Neumann U 87 Ai', 'Neumann TLM 103', 'AKG C414 XLS · par', 'Audio-Technica AT4050', 'Lauten Audio LA-320', 'Shure KSM137 · par'] },
      { title: 'Dinámicos', items: ['Shure SM7B ×2', 'Shure SM57 ×4', 'Sennheiser MD 421-II ×2', 'Electro-Voice RE20', 'AKG D112 MkII', 'Shure Beta 52A', 'Sennheiser e604 ×3'] },
      { title: 'Cinta', items: ['Royer R-121 · par', 'Coles 4038', 'AEA R84'] },
    ],
  },
  {
    id: 'outboard',
    name: 'Outboard',
    intro: 'Preamplificadores, compresores y ecualizadores de hardware. Se usan tanto en la grabación como en la mezcla.',
    img: 'gear-preamp',
    groups: [
      { title: 'Preamplificadores', items: ['Neve 1073 · par', 'API 512c ×4', 'Chandler TG2', 'Universal Audio 610'] },
      { title: 'Compresores', items: ['Universal Audio 1176LN ×2', 'Teletronix LA-2A', 'Empirical Labs Distressor · par', 'Tube-Tech CL 1B', 'dbx 160A ×2'] },
      { title: 'Ecualizadores', items: ['Pultec EQP-1A', 'API 550A · par', 'Maag EQ4'] },
    ],
  },
  {
    id: 'backline',
    name: 'Backline',
    intro: 'Batería, amplificadores y teclados con mantenimiento mensual. Llegan afinados a tu sesión.',
    img: 'drums',
    groups: [
      { title: 'Batería', items: ['DW Collector\'s Maple 22/10/12/16', 'Ludwig Supraphonic 14×6.5', 'Platillos Zildjian K y A Custom', 'Hardware DW 9000'] },
      { title: 'Amplificadores', items: ['Fender Twin Reverb \'65 RI', 'Vox AC30 C2', 'Marshall JCM800 + 4×12', 'Ampeg SVT-CL + 8×10', 'Fender Bassman \'59 RI'] },
      { title: 'Teclados y cuerdas', items: ['Piano vertical Yamaha U3', 'Fender Rhodes Mark I', 'Nord Stage 3', 'Fender Telecaster · Gibson Les Paul', 'Fender Precision Bass'] },
    ],
  },
];

/* ---------- Portafolio de audio ---------- */
export const TRACKS = [
  {
    id: 't1',
    title: 'Neón en la Colonia',
    artist: 'Los Ferrales',
    genre: 'Rock alternativo',
    src: 'audio/rock-1091.mp3',
    cover: 'live-room',
    note: 'Batería grabada en el Live Room con Royer R-121 en overheads. Consola SSL, mezcla híbrida con 1176 en el bus de batería.',
    chain: ['Live Room', 'SSL Origin', 'Royer R-121', 'UA 1176'],
  },
  {
    id: 't2',
    title: 'Contarlo Todo',
    artist: 'Maia Velarde',
    genre: 'Pop',
    src: 'audio/pop-1131.mp3',
    cover: 'vocal-booth',
    note: 'Voz principal en la cabina A con Neumann U 87, Neve 1073 y LA-2A. Los coros se grabaron con la misma cadena.',
    chain: ['Iso Booth A', 'Neumann U 87', 'Neve 1073', 'LA-2A'],
  },
  {
    id: 't3',
    title: 'Bajo Cero',
    artist: 'Kael',
    genre: 'Trap · Urbano',
    src: 'audio/hiphop-262.mp3',
    cover: 'producer-booth',
    note: 'Producción de casa. Voz con SM7B por Chandler TG2 y compresión paralela con Distressor. Master para plataformas de streaming.',
    chain: ['Producción in-house', 'Shure SM7B', 'Chandler TG2', 'Distressor'],
  },
  {
    id: 't4',
    title: 'Madrugada',
    artist: 'Trío Ámbar',
    genre: 'Jazz',
    src: 'audio/jazz-1033.mp3',
    cover: 'drums',
    note: 'Piano, contrabajo y batería grabados en vivo en el Live Room. Par de AKG C414 en el piano y Coles 4038 en la batería.',
    chain: ['Toma en vivo', 'Yamaha U3', 'AKG C414', 'Coles 4038'],
  },
  {
    id: 't5',
    title: 'Casa Vacía',
    artist: 'Ana Reyes',
    genre: 'Folk acústico',
    src: 'audio/acoustic-1076.mp3',
    cover: 'vocal-session',
    note: 'Guitarra y voz grabadas al mismo tiempo. Coles 4038 en la guitarra y AT4050 en la voz. Sin edición, es la cuarta toma.',
    chain: ['Simultáneo', 'Coles 4038', 'AT4050', 'API 512c'],
  },
];

/* ---------- Testimonios ---------- */
export const TESTIMONIALS = [
  {
    name: 'Rodrigo Salas',
    role: 'Baterista · Los Ferrales',
    text: 'La batería sonó grande desde la primera toma, sin tener que meterle reverb después. El ingeniero de casa entendió el disco rápido y nos ahorró medio día de pruebas.',
    stars: 5,
  },
  {
    name: 'Fernanda Ibarra',
    role: 'Productora independiente',
    text: 'Renté en dry hire con mi propio ingeniero. Todo estaba parcheado y etiquetado. Llegamos a las nueve y a las nueve y media ya estábamos grabando. En otros estudios eso me ha tomado toda la mañana.',
    stars: 5,
  },
  {
    name: 'Emiliano Torres',
    role: 'Cantautor',
    text: 'Grabé un EP de cinco canciones en un bloque de día completo. Las doce horas se pasan bien porque hay dónde descansar y el café es bueno. Regresé al mes siguiente a mezclar.',
    stars: 5,
  },
];

/* ---------- FAQ ---------- */
export const FAQS = [
  {
    q: '¿Puedo traer a mi propio ingeniero?',
    a: 'Sí. Todos los bloques tienen tarifa dry hire sin ingeniero de casa. Recibes la sala parcheada, una sesión plantilla en Pro Tools y un asistente disponible por si tienes dudas del equipo.',
  },
  {
    q: '¿Cómo funciona la reserva y el anticipo?',
    a: 'Eliges tu bloque, ves la disponibilidad en el calendario y apartas con el 50 % de anticipo. El resto se liquida el día de la sesión. Puedes pagar con tarjeta, transferencia o efectivo.',
  },
  {
    q: '¿Qué pasa si necesito más horas el mismo día?',
    a: 'Si la agenda lo permite, puedes extender en el momento a tarifa de hora extra. Si hay otra sesión después de la tuya te avisamos con una hora de anticipación.',
  },
  {
    q: '¿Cuál es la política de cancelación?',
    a: 'Cancelaciones con más de 72 horas de anticipación conservan el anticipo como crédito para otra fecha dentro de 90 días. Con menos de 72 horas el anticipo no es reembolsable.',
  },
  {
    q: '¿Me entregan los archivos el mismo día?',
    a: 'Sí. Al terminar te llevas la sesión completa de Pro Tools o los stems consolidados, en tu disco o por un enlace de descarga que dura 30 días.',
  },
  {
    q: '¿El backline tiene costo extra?',
    a: 'El backline básico está incluido en todos los bloques. La batería DW, los amplificadores vintage y el Rhodes forman parte del backline premium con un costo fijo por sesión.',
  },
  {
    q: '¿Hay estacionamiento para descargar equipo?',
    a: 'Sí. Zona de carga y descarga a diez metros de la puerta del Live Room y estacionamiento privado para cuatro autos sin costo.',
  },
  {
    q: '¿Puedo conocer el estudio antes de reservar?',
    a: 'Sí. Agenda una visita gratuita de 30 minutos. Recorres las salas, escuchas el monitoreo y resuelves tus dudas técnicas con el ingeniero de casa.',
  },
];

/* ---------- Para quién ---------- */
export const AUDIENCES = [
  { id: 'bandas', name: 'Bandas', desc: 'Batería, bajo, guitarras y voz al mismo tiempo, cada quien en su sala.', img: 'live-room', block: '8h' },
  { id: 'solistas', name: 'Solistas y voces', desc: 'Cabina tratada para voz, cadena Neumann, Neve y LA-2A e ingeniero de casa.', img: 'vocal-booth', block: '4h' },
  { id: 'productores', name: 'Productores e ingenieros', desc: 'Renta dry hire con consola SSL, outboard y monitoreo calibrado.', img: 'control-room-2', block: '8h' },
  { id: 'podcast', name: 'Podcast y locución', desc: 'Hasta cuatro micrófonos, cámara opcional y archivos el mismo día.', img: 'mic-bw', block: '4h' },
];

export const HOURS = 'Lunes a domingo · 9:00 a 22:00';
export const ADDRESS = 'Arrayanes 13, Lomas de San Mateo, 53200 Naucalpan de Juárez, Estado de México';
