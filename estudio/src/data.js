/* =====================================================================
   CONTENIDO EDITABLE · Undying Studios · Estudio de Grabación
   Todo el contenido del estudio vive aquí. Lo marcado con
   "POR CONFIRMAR" es una suposición razonable que el cliente debe validar,
   y lo marcado con "PENDIENTE" espera material del cliente.
   ===================================================================== */

export const LINKS = {
  // Guía de actualización del cliente (octubre 2026)
  whatsappNumber: '5215517432034',
  whatsappDisplay: '+52 55 1743 2034',
  email: 'music@undyingstudios.mx',
  legalName: 'Undying Music Entertainment S.A.S. de C.V.',
  // Calendarios Prospex por bloque y modalidad: `${horas}h-ing` (con ingeniero)
  // y `${horas}h-dry` (Dry Hire). PENDIENTE: el cliente debe crear los
  // calendarios de 3, 6 y 9 horas. Mientras un bloque no tenga calendario, el
  // botón abre WhatsApp con la reserva ya escrita. Los calendarios anteriores
  // (2, 4 y 8 horas) ya no corresponden a las tarifas nuevas.
  booking: {
    '3h-ing': '',
    '6h-ing': '',
    '9h-ing': '',
    '3h-dry': '',
    '6h-dry': '',
    '9h-dry': '',
    scouting: 'https://link.prospex.mx/widget/booking/kL9e9x2EvzkBFHmMRHax',
  },
  bookingScript: 'https://link.prospex.mx/js/form_embed.js',
  // Enlace de pago en línea para el cotizador (formulario de pedido de Prospex
  // o Mercado Pago). Vacío: el pedido se manda por WhatsApp.
  checkout: '',
  maps: 'https://maps.app.goo.gl/FoNYv6muSefCaJnA8',
  directions:
    'https://maps.google.com/maps/dir//UndyingStudios+Arrayanes+13+Lomas+de+San+Mateo+53200+Naucalpan+de+Ju%C3%A1rez,+M%C3%A9x./@19.4954628,-99.2705957,18z',
  // Landing del foro: el estudio vive en /estudio/ y el foro en /foro/.
  foro: '../foro/',
  youtubePlaylist: 'https://youtube.com/playlist?list=PL8bIl-NaTJFhAYKCqkHzfI9zW5719ob63',
  spotifyPlaylist: 'https://open.spotify.com/playlist/7djg5ZqXKPkNJ2h3LNx4IL',
  social: {
    instagram: 'https://www.instagram.com/undyingstudios',
    tiktok: 'https://www.tiktok.com/@undyingstudios',
    youtube: 'https://www.youtube.com/@undyingstudios',
    facebook: 'https://www.facebook.com/UndyingStudios',
  },
  legal: {
    privacidad: '../aviso-de-privacidad/',
    terminos: 'terminos/',
  },
};

/* ---------- Hero ----------
   PENDIENTE: la guía pide un video nuevo para el hero que no llegó con el
   material. Para cambiarlo: guárdalo en estudio/public/video/hero.mp4 (y la
   versión ligera hero-mobile.mp4) con su portada hero-poster.jpg. */
export const HERO = {
  // El <video> está en index.html (con hero-mobile.mp4 para celular). Vacío:
  // se usa el slideshow de fotos.
  video: 'video/hero.mp4',
  image: 'live-12',
  // Slideshow de respaldo si no hay video
  slides: ['live-12', 'live-04', 'control-02', 'live-09', 'control-03', 'live-01', 'live-05'],
  slideSeconds: 6,
};

/* ---------- Para quién ----------
   PENDIENTE: la guía trae una foto nueva por tarjeta. Mientras tanto se usan
   fotos reales del estudio. `preset` arma la cotización correspondiente. */
export const AUDIENCES = [
  { id: 'banda', name: 'Bandas', desc: 'Grabación en simultáneo de banda completa. Espacio amplio para capturar la energía de tus Live Sessions.', img: 'live-12', preset: 'banda' },
  { id: 'voz', name: 'Voces y solistas', desc: 'Captura de voz impecable para solistas y ensambles vocales de cualquier género.', img: 'live-13', preset: 'voz' },
  { id: 'productores', name: 'Productores e ingenieros', desc: 'Modalidad Dry Hire: conéctate a la interfaz y opera la sesión desde tu computadora con total autonomía.', img: 'control-02', preset: 'dry' },
  { id: 'podcast', name: 'Podcast y locución', desc: 'Optimizado para locución profesional y podcasts, con opción de equipo de audio, video e iluminación.', img: 'engineer', preset: 'podcast' },
];

// PENDIENTE: logotipos de artistas (la guía los menciona como adjuntos).
// Formato: ['archivo-en-public/artists sin extensión', 'Nombre', altura óptica en px].
// Mientras esté vacío, la sección no se muestra.
export const ARTISTS = [];

/* ---------- Salas (medidas y fichas de la guía del cliente) ---------- */
export const ROOMS = [
  {
    id: 'live',
    name: 'Live Room',
    tag: 'Estudio A',
    area: '34.40 m²',
    desc: 'Con una acústica viva de decaimiento corto, el Live Room está optimizado para la captura limpia de voces, instrumentos, coros y Live Sessions, ofreciendo visibilidad directa e integración total con el Control Room.',
    facts: [
      ['Superficie', '34.40 m²'],
      ['Altura', '2.95 m'],
      ['Capacidad', 'Hasta 8 músicos'],
      ['Acústica', 'Viva y controlada'],
    ],
    bullets: ['18 canales de grabación simultáneos y 10 retornos', 'Equipada con monitores de campo cercano', 'Equipada con PA para ensayos', 'Iluminación regulable y clima independiente'],
    gallery: ['live-12', 'live-04', 'live-01', 'live-05', 'live-11', 'live-13', 'live-14', 'live-03'],
  },
  {
    id: 'control',
    name: 'Control Room',
    tag: 'Estudio A',
    area: '19.35 m²',
    desc: 'Diseñado para jornadas largas y sin fatiga, con la estación de trabajo al centro, acceso rápido a periféricos y vista directa al Live Room. Cuenta con monitores Yamaha y KRK y un cómodo sofá posterior para artistas e invitados.',
    facts: [
      ['Superficie', '19.35 m²'],
      ['Altura', '2.90 m'],
      ['Capacidad', 'Hasta 6 personas'],
      ['Acústica', 'Sweet spot calibrado'],
    ],
    bullets: ['18 canales de preamplificación analógica (High-End Audiophile, BLA Mod & Clean)', 'Monitoreo principal full-range de 3 vías y campo cercano A/B', 'Outboard en rack a la mano', 'Clima independiente y luz cálida'],
    gallery: ['control-02', 'control-03', 'control-01', 'engineer', 'control-05', 'control-06', 'control-04', 'control-07'],
  },
  {
    id: 'estudio-b',
    name: 'Estudio B',
    tag: 'Mezcla y máster',
    area: '12.60 m²',
    desc: 'Nuestra sala dedicada a mezcla, máster y postproducción analógica. Optimizada para el trabajo a distancia y sesiones de escucha crítica con la máxima fidelidad sonora.',
    facts: [
      ['Superficie', '12.60 m²'],
      ['Altura', '2.50 m'],
      ['Capacidad', 'Hasta 4 personas'],
      ['Acústica', 'Sweet spot calibrado'],
    ],
    bullets: ['Sumado y masterización analógica high-end (SSL X-Desk, G-Comp, Fusion y Bettermaker)', 'Conversión y reloj de referencia (BURL Bomber ADC y Antelope Orion 32+)', 'Monitoreo de campo cercano con gran extensión de graves (Dynaudio BM15A)', 'Entorno acústico quirúrgico con clima independiente'],
    // PENDIENTE: fotos del Estudio B. Sin fotos, la sala muestra su ficha.
    gallery: [],
  },
  {
    id: 'amenidades',
    name: 'Amenidades',
    tag: 'Compartidas con el foro',
    area: 'Total 52.46 m²',
    desc: 'Espacios integrados para hacer más cómoda tu sesión: sala de espera con camerino y arcade retro con clásicos como Street Fighter, cocina, regadera y terraza con asador y vista panorámica a las montañas para relajarte o comer entre tomas.',
    facts: [
      ['Superficie total', '52.46 m²'],
      ['Capacidad', 'Hasta 15 personas'],
    ],
    amenities: ['Sala de espera', 'Camerino', 'Maquinita arcade', 'Cocina', 'Asador', 'Terraza con vista', '2 baños', 'Regadera'],
    gallery: ['lounge-02', 'lounge-03', 'lounge-01'],
  },
];

/* ---------- Equipo por sala ----------
   Cada estudio tiene sus categorías. En el Estudio A van primero las que
   definen el sonido grabado (micrófonos, preamps y conversión), luego el
   backline, el monitoreo y lo demás. Las piezas sin foto se muestran con
   tarjeta tipográfica. PENDIENTE: fotos del equipo del Estudio B, de la
   guitarra Jay Turser y de las congas. */
export const GEAR = [
  {
    id: 'a',
    name: 'Estudio A',
    note: 'Live Room y Control Room',
    cats: [
      {
        id: 'microfonos',
        name: 'Micrófonos',
        intro: 'Condensadores y dinámicos para voz, batería, amplificadores e instrumentos.',
        items: [
          { name: 'AKG C414', kind: 'Condensador multipatrón', img: 'akg-c414', qty: 1 },
          { name: 'Slate ML-2', kind: 'Condensador de lápiz', img: 'slate-ml2', qty: 2 },
          { name: 'Audio-Technica ATM450', kind: 'Condensador de lápiz', img: 'at-atm450', qty: 2 },
          { name: 'Shure Beta 52A', kind: 'Dinámico para bombo', img: 'shure-beta-52', qty: 1 },
          { name: 'Shure Beta 91A', kind: 'Condensador de frontera', img: 'shure-beta-91', qty: 1 },
          { name: 'Shure Beta 57A', kind: 'Dinámico', img: 'shure-beta-57a', qty: 3 },
          { name: 'Shure SM57', kind: 'Dinámico', img: 'shure-sm57', qty: 1 },
          { name: 'Shure SM58', kind: 'Dinámico vocal', img: 'shure-sm58', qty: 2 },
          { name: 'Shure PG48', kind: 'Dinámico vocal', img: 'shure-pg48', qty: 1 },
        ],
      },
      {
        id: 'preamps',
        name: 'Preamps y conversión',
        intro: 'La cadena por la que pasa la señal del micrófono a la computadora.',
        items: [
          { name: 'Focusrite OctoPre MkII', kind: 'Preamplificador de 8 canales', img: 'focusrite-octopre' },
          { name: 'Broadhurst Gardens No. 1', kind: 'Preamplificador de micrófono', img: 'broadhurst-gardens' },
          { name: 'Apogee Rosetta 800', kind: 'Convertidor AD/DA', img: 'apogee-rosetta-800' },
          { name: 'M-Audio ProFire 2626', kind: 'Interfaz · modificación Black Lion', img: 'm-audio-profire-2626' },
        ],
      },
      {
        id: 'backline',
        name: 'Backline',
        intro: 'Instrumentos y amplificación disponibles durante tu sesión.',
        items: [
          { name: 'RMV Special Edition X5', kind: 'Batería', img: 'rmv-x5' },
          { name: 'Peavey TNT 115', kind: 'Amplificador de bajo', img: 'peavey-tnt115' },
          { name: 'Piano Wurlitzer', kind: 'Piano vertical · DeKalb, Illinois', img: 'wurlitzer' },
          { name: 'Yamaha P-105', kind: 'Piano digital', img: 'yamaha-p105' },
          { name: 'Yamaha DX21', kind: 'Sintetizador FM', img: 'yamaha-dx21' },
          { name: 'Yamaha PortaSound PSS-780', kind: 'Teclado', img: 'yamaha-pss780' },
          { name: 'Yamaha PortaSound PSS-470', kind: 'Teclado', img: 'yamaha-pss470' },
          { name: 'Casio MT-750', kind: 'Teclado', img: 'casio-mt750' },
          { name: 'Guitarra SG Standard TV Yellow', kind: 'Guitarra eléctrica', img: 'epiphone-sg' },
          { name: 'Jay Turser', kind: 'Guitarra electroacústica', img: null },
          { name: 'Par de congas', kind: 'Percusión', img: null },
        ],
      },
      {
        id: 'monitoreo',
        name: 'Monitoreo',
        intro: 'Monitores del Control Room y del Live Room.',
        items: [
          { name: 'KRK Rokit 8', kind: 'Monitores de estudio', img: 'krk-rokit-8' },
          { name: 'KRK 10s', kind: 'Subwoofer', img: 'krk-sub-10s' },
          { name: 'Yamaha HS50', kind: 'Monitores de referencia', img: 'yamaha-hs50' },
          { name: 'Yorkville YSM1p', kind: 'Monitores de campo cercano', img: 'yorkville-ysm1p' },
        ],
      },
      {
        id: 'envivo',
        name: 'Sonido en vivo',
        intro: 'Consolas y bocinas del Live Room para ensayos y live sessions.',
        items: [
          { name: 'Alto L-20', kind: 'Consola de 24 canales', img: 'alto-l20' },
          { name: 'Crate PA8FX', kind: 'Consola amplificada', img: 'crate-pa8fx' },
          { name: 'Cerwin-Vega! V-15B', kind: 'Par de bocinas', img: 'cerwin-vega-v15b' },
        ],
      },
      {
        id: 'varios',
        name: 'Controladores y más',
        intro: 'Control MIDI, grabación en cassette y tornamesa para texturas y samples.',
        items: [
          { name: 'Novation LaunchControl XL', kind: 'Controlador MIDI', img: 'novation-lcxl' },
          { name: 'Tascam Ministudio Porta Two', kind: 'Grabadora de cassette', img: 'tascam-porta-two' },
          { name: 'Sony PS-T25', kind: 'Tornamesa', img: 'sony-ps-t25' },
        ],
      },
    ],
  },
  {
    id: 'b',
    name: 'Estudio B',
    note: 'Mezcla, máster y postproducción',
    cats: [
      {
        id: 'b-microfonos',
        name: 'Micrófonos',
        intro: 'Condensadores de diafragma grande para voces e instrumentos.',
        items: [
          { name: 'Lauten Audio Atlantis FC-387', kind: 'Condensador de diafragma grande', img: null },
          { name: 'Wunder Audio CM7-GT', kind: 'Condensador de diafragma grande', img: null },
        ],
      },
      {
        id: 'b-preamps',
        name: 'Preamps y conversión',
        intro: 'Sumado analógico, canal de bulbos y conversión de referencia.',
        items: [
          { name: 'Antelope Orion 32+', kind: 'Interfaz, conversión y reloj', img: null },
          { name: 'SSL X-Desk', kind: 'Mezcladora de sumado analógico', img: null },
          { name: 'Avalon VT-737SP', kind: 'Channel strip de bulbos', img: null },
          { name: 'BURL Bomber ADC', kind: 'Convertidor analógico a digital', img: null },
        ],
      },
      {
        id: 'b-monitoreo',
        name: 'Monitoreo',
        intro: 'Campo cercano con gran extensión de graves para escucha crítica.',
        items: [
          { name: 'Dynaudio BM15A', kind: 'Monitores de campo cercano', img: null },
        ],
      },
      {
        id: 'b-outboard',
        name: 'Outboard',
        intro: 'Procesadores analógicos para mezcla y masterización.',
        items: [
          { name: 'SSL G-Series Stereo Compressor', kind: 'Compresor de bus estéreo', img: null },
          { name: 'SSL Fusion', kind: 'Procesador analógico de master', img: null },
          { name: 'Bettermaker Mastering Limiter V2', kind: 'Limitador de masterización', img: null },
          { name: 'Bettermaker Valve Stereo Passive EQ', kind: 'Ecualizador pasivo de bulbos', img: null },
          { name: 'Darkglass Anagram', kind: 'Multiefectos', img: null },
        ],
      },
    ],
  },
];

/* ---------- Escucha: producciones destacadas ---------- */
export const FEATURED = [
  {
    yt: '5VoHfpRIwtM',
    category: 'Producción musical',
    title: 'Camino a un Sueño',
    client: 'Captain Tsubasa: La Leyenda Regresa',
    desc: 'Composición y producción del opening en español latino de la serie.',
  },
  {
    yt: 'GelEJmHYRhs',
    category: 'Jingle',
    title: 'Sin impacto no hay NFL en México',
    client: 'FOX Sports México',
    desc: 'Producción del jingle de la campaña de la NFL.',
  },
  {
    yt: 'Fi3fnLuwUw4',
    category: 'Doblaje y adaptación',
    title: 'Aventuras en el Sistema Molar',
    client: 'Colgate',
    desc: 'Traducción, adaptación y doblaje de una cápsula animada.',
    start: 109,
  },
  {
    yt: 'TLj5tRVr9ZY',
    category: 'Locución',
    title: 'Ruta México',
    client: 'Samsung México',
    desc: 'Locución de la serie con Vadhir Derbez.',
  },
  {
    // POR CONFIRMAR: video encontrado en YouTube con el título de la guía.
    yt: 'q585D-E6Ekg',
    category: 'Sound Design, Mix, Master',
    title: 'Aspirina Sound Off',
    client: 'Kinky',
    desc: 'Diseño de audio, mezcla 8D y máster.',
    headphones: true,
  },
];

/* ---------- Videoclips ----------
   El carrusel se arma con la playlist de YouTube: src/clips.json es la copia
   local (se refresca con `npm run sync:clips`) y, si hay API key, la página
   consulta la playlist en vivo cada vez que alguien entra. */
export const YOUTUBE = {
  playlist: 'PL8bIl-NaTJFhAYKCqkHzfI9zW5719ob63',
  // API key de YouTube Data v3, restringida al dominio del sitio.
  // Con la key el carrusel se actualiza solo; sin ella usa src/clips.json.
  apiKey: '',
  // Cuántos videos mostrar y por cuántas horas se guarda la respuesta.
  max: 12,
  cacheHours: 6,
  // Etiqueta "Nuevo" en los primeros videos de la playlist.
  newTags: 2,
};

/* ---------- El sonido de Undying ----------
   Tracks y desglose técnico de la guía del cliente. Los audios salen de los
   WAV de material-de-origen/tracks con `node tools/build-tracks.mjs`. Si un
   track no tiene `src`, la tarjeta muestra el desglose sin botón de play. */
export const TRACKS = [
  {
    title: 'Illuminate', artist: 'Astral King', genre: 'Rock progresivo',
    src: 'audio/illuminate.m4a', cover: 'live-04',
    note: 'Tracking y edición de batería RMV en Live Room. Captura con micrófonos Shure, Audio-Technica y Slate, preamps Focusrite/ProFire y conversión A/D Apogee Rosetta 800.',
    chain: ['Live Room', 'Batería RMV', 'Beta 52A', 'ATM450', 'ProFire 2626', 'OctoPre MkII', 'Apogee Rosetta 800'],
  },
  {
    title: 'Dile', artist: 'Eva Davis', genre: 'Urbano pop',
    src: 'audio/dile.m4a', cover: 'control-06',
    note: 'Mezcla y masterización estéreo en Estudio B con sumado analógico SSL X-Desk, procesamiento dinámico SSL G-Comp y Fusion, ecualización Bettermaker y conversión A/D BURL Bomber.',
    chain: ['Estudio B', 'SSL X-Desk', 'SSL Fusion', 'SSL G-Series', 'Bettermaker Passive EQ', 'BURL Bomber ADC'],
  },
  {
    title: 'Flashlight', artist: 'Keren', genre: 'Pop',
    src: 'audio/flashlight.m4a', cover: 'live-13',
    note: 'Producción vocal grabada en Live Room. Captura con AKG C414, preamp Broadhurst Gardens No. 1 y conversión A/D Apogee Rosetta 800.',
    chain: ['Live Room', 'AKG C414', 'Broadhurst Gardens No. 1', 'Apogee Rosetta 800'],
  },
  {
    title: 'Oveja Negra', artist: 'Gael Morante', genre: 'Corrido tumbado',
    src: 'audio/oveja-negra.m4a', cover: 'control-05',
    // POR CONFIRMAR: la guía repite la descripción de "Dile", que menciona el
    // BURL Bomber aunque las etiquetas de este track dicen Antelope Orion 32+.
    note: 'Mezcla y masterización estéreo en Estudio B con sumado analógico SSL X-Desk, procesamiento dinámico SSL G-Comp y Fusion, ecualización Bettermaker y conversión A/D BURL Bomber.',
    chain: ['Estudio B', 'Antelope Orion 32+', 'SSL X-Desk', 'Bettermaker Limiter', 'SSL Fusion'],
  },
  {
    title: 'Camino a un Sueño (Extended Version)', artist: 'Enrique Barragán y Keren', genre: 'J-Rock',
    src: 'audio/camino-a-un-sueno.m4a', cover: 'control-02',
    note: 'Producción musical, arreglos e instrumentación. Tracking de guitarras y bajos eléctricos capturados con interfaz ProFire 2626 y conversión A/D Apogee Rosetta 800.',
    chain: ['Control Room', 'ProFire 2626', 'Apogee Rosetta 800'],
  },
];

/* ---------- Tarifas y cotizador (MXN, IVA incluido) ---------- */
export const PRICING = {
  policy: 'Precios en MXN con IVA incluido. Pago al 100% con 48 horas de anticipación.',
  modes: {
    ing: { label: 'Con ingeniero', note: 'Tarifa estándar' },
    dry: { label: 'Sin ingeniero', note: 'Modalidad Dry Hire' },
  },
  blocks: [
    { id: '3h', hours: 3, price: { ing: 2700, dry: 2100 }, badge: 'Tarifa base', tagline: 'Voces, overdubs o un episodio de podcast.' },
    { id: '6h', hours: 6, price: { ing: 4500, dry: 3500 }, badge: '17% off · Más popular', tagline: 'Varias canciones o una banda completa.', hot: true },
    { id: '9h', hours: 9, price: { ing: 5500, dry: 4300 }, badge: '32% off · Mejor tarifa', tagline: 'Un EP, una producción o una jornada larga.' },
  ],
  perks: {
    ing: ['Ingeniero de grabación incluido', 'Live Room y Control Room', 'Microfonía, preamps y backline del Estudio A', 'Acceso a amenidades'],
    dry: ['Tu ingeniero opera la sesión', 'Inducción del setup y plantillas de Pro Tools y Ableton Live', 'Asistencia de sala durante tu reserva', 'Acceso a amenidades'],
  },
  podcast: {
    name: 'Podcast y locución',
    desc: 'Hasta 4 micrófonos, equipo de video opcional, archivos el mismo día.',
    block: '3h',
  },
  // Postproducción: se cotiza por pieza, con o sin horas de estudio.
  products: [
    { id: 'mezcla', name: 'Mezcla multitrack', desc: 'Balance de niveles, limpieza de frecuencias, procesamiento y diseño espacial de pistas en formato estéreo. Incluye 2 revisiones.', price: 5500, unit: 'por canción' },
    { id: 'master', name: 'Máster por track', desc: 'Optimización y nivelación comercial de tu mezcla estéreo para plataformas de streaming y medios físicos. Incluye 2 revisiones.', price: 2000, unit: 'por canción' },
    { id: 'edicion', name: 'Edición multitrack', desc: 'Alineación y cuantización rítmica para sesiones de hasta 24 tracks.', price: 3500, unit: 'por canción' },
    { id: 'vocal', name: 'Edición y afinación vocal', desc: 'Comping, alineación rítmica y afinación detallada de hasta 6 pistas de voz por canción.', price: 2500, unit: 'por canción' },
    { id: 'productor', name: 'Productor musical', desc: 'Dirección artística, arreglos y producción musical durante la sesión de grabación.', price: 7000, unit: 'por sesión' },
    { id: 'musico', name: 'Músico de sesión', desc: 'Músico profesional de nuestra red.', price: 2500, unit: 'por sesión' },
  ],
  // Combinaciones sugeridas de la guía
  presets: [
    { id: 'banda', name: 'Banda', desc: 'Grabación en vivo, edición, mezcla y máster.', block: '6h', products: { edicion: 1, mezcla: 1, master: 1 } },
    { id: 'voz', name: 'Solista o voces', desc: 'Voz sobre tu pista, afinación, mezcla y máster.', block: '3h', products: { vocal: 1, mezcla: 1, master: 1 } },
    { id: 'produccion', name: 'Producción de un tema', desc: 'Del demo a la canción terminada con nuestro productor.', block: '9h', products: { productor: 1, vocal: 1, mezcla: 1, master: 1 } },
    { id: 'podcast', name: 'Podcast o locución', desc: 'Hasta 4 micrófonos y archivos el mismo día.', block: '3h', products: {} },
  ],
};

/* ---------- Clientes (PNG blancos en public/clients, generados con tools/logos-mono.py) ----------
   [archivo, nombre, altura óptica en px, proporción ancho/alto del PNG] */
export const CLIENTS = [
  ['samsung', 'Samsung', 22, 6.525], ['fox', 'FOX', 38, 2.317], ['colgate', 'Colgate', 36, 2.5], ['coca-cola', 'Coca-Cola', 33, 3.017],
  ['nickelodeon', 'Nickelodeon', 44, 1.3], ['mtv', 'MTV', 44, 1.533], ['tv-azteca', 'TV Azteca', 44, 1.417], ['huawei', 'Huawei', 44, 0.983],
  ['claro', 'Claro Música', 44, 1.7], ['burger-king', 'Burger King', 44, 0.917], ['starz', 'STARZ', 28, 4.35], ['paper-mate', 'Paper Mate', 26, 4.967], ['gemini', 'Gemini', 27, 4.433],
];

// Las reseñas son del negocio completo y se comparten con el foro.
export { REVIEWS } from '../../shared/data/reviews.js';

/* ---------- Preguntas frecuentes (guía del cliente) ---------- */
export const FAQS = [
  {
    q: '¿Cómo reservo una sesión?',
    a: 'Elige tu bloque de horas y si trabajas con nuestro ingeniero o con el tuyo, escoge fecha y hora y confirma tu reserva. El pago se cubre al 100% con 48 horas de anticipación.',
  },
  {
    q: '¿Puedo traer mi propio ingeniero?',
    a: 'Sí. Todos nuestros bloques cuentan con tarifa Dry Hire. Incluye inducción del setup, plantillas de sesión en Pro Tools y Ableton Live, y asistencia de sala para cualquier duda técnica durante tu reserva.',
  },
  {
    q: '¿Qué incluye una sesión de tracking?',
    a: 'El uso del Live Room y el Control Room durante las horas que reservaste, con la microfonía, los preamps y el backline del Estudio A.',
  },
  {
    q: '¿Qué pasa si necesito más horas el mismo día?',
    a: 'Puedes extender tu sesión en el momento sujetándote a la disponibilidad de agenda, aplicando nuestra tarifa estándar de hora extra. Si hay una sesión posterior, te avisaremos con 1 hora de anticipación.',
  },
  {
    q: '¿Cuál es la política de cancelación?',
    a: 'Cancelaciones con más de 72 horas de anticipación conservan el anticipo como crédito para otra fecha dentro de 90 días. Con menos de 72 horas el anticipo no es reembolsable.',
  },
  {
    q: '¿Me entregan los archivos el mismo día?',
    a: 'Aplica únicamente para sesiones de grabación. Al finalizar tu bloque te llevas tu sesión o archivos consolidados vía disco o enlace de descarga (activo 30 días). Los servicios de postproducción manejan sus propios tiempos de entrega.',
  },
  {
    q: '¿Puedo llevar mis instrumentos?',
    a: 'Claro. Y si prefieres no cargar, en el estudio hay batería RMV, amplificador de bajo Peavey, piano Wurlitzer, teclados y sintetizadores.',
  },
  {
    q: '¿Hay estacionamiento para descargar equipo?',
    a: 'No hay estacionamiento privado, pero la descarga es directamente en la puerta. Hay espacio seguro para estacionarse en la calle al estar en circuito con acceso controlado.',
  },
  {
    q: '¿Puedo llevar invitados a la sesión?',
    a: 'Sí. Pero para un mejor aprovechamiento del tiempo y el espacio, recomendamos limitar la asistencia al equipo de trabajo del proyecto.',
  },
  {
    q: '¿Qué pasa si se me acaba el tiempo?',
    a: 'Ofrecemos 15 minutos de tolerancia para respaldar y desalojar la sala. Puedes terminar de empacar o platicar cómodamente en las zonas de amenidades. Si requieres más tiempo de sala, puedes extender tu sesión sujeto a disponibilidad.',
  },
  {
    q: '¿Puedo conocer el estudio antes de reservar?',
    a: 'Sí. Agenda una visita gratuita, recorre las salas y resuelve tus dudas técnicas antes de decidir.',
  },
];

// POR CONFIRMAR: el cliente no ha definido el horario del estudio.
export const HOURS = 'Con cita previa';
export const ADDRESS = 'Arrayanes 13, Lomas de San Mateo, 53200 Naucalpan de Juárez, Estado de México';
