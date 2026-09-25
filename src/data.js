/* =====================================================================
   CONTENIDO EDITABLE · Undying Studios · Estudio de Grabación
   Todo el contenido real del estudio vive aquí. Lo marcado con
   "POR CONFIRMAR" viene de una suposición razonable y el cliente
   debe validarlo antes de publicar.
   ===================================================================== */

export const LINKS = {
  // WhatsApp tomado de los términos y condiciones del foro.
  whatsappNumber: '5215544698604',
  whatsappDisplay: '+52 55 4469 8604',
  whatsappShort: 'https://wa.link/fl03s4',
  // Calendarios Prospex del estudio. Cada bloque tiene el suyo y acepta pago
  // dentro del widget. Si el cliente crea otros, aquí se pega el ID nuevo.
  booking: {
    '2h': 'https://link.prospex.mx/widget/booking/rWvK8UKsfxIQcHnye8be',
    '4h': 'https://link.prospex.mx/widget/booking/qp5rHAwL2U4hLQoX8pEL',
    '8h': 'https://link.prospex.mx/widget/booking/zZQ4fQp4Pah3D0cKjkZB',
    scouting: 'https://link.prospex.mx/widget/booking/kL9e9x2EvzkBFHmMRHax',
  },
  bookingScript: 'https://link.prospex.mx/js/form_embed.js',
  maps: 'https://maps.app.goo.gl/FoNYv6muSefCaJnA8',
  directions:
    'https://maps.google.com/maps/dir//UndyingStudios+Arrayanes+13+Lomas+de+San+Mateo+53200+Naucalpan+de+Ju%C3%A1rez,+M%C3%A9x./@19.4954628,-99.2705957,18z',
  foro: 'https://undyingstudios.mx/',
  email: 'undyingstudios@gmail.com',
  youtubePlaylist: 'https://youtube.com/playlist?list=PL8bIl-NaTJFhAYKCqkHzfI9zW5719ob63',
  spotifyPlaylist: 'https://open.spotify.com/playlist/7djg5ZqXKPkNJ2h3LNx4IL',
  spotifyEmbed: 'https://open.spotify.com/embed/playlist/7djg5ZqXKPkNJ2h3LNx4IL?utm_source=generator&theme=0',
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

/* ---------- Hero ----------
   Cuando esté listo el video editado, colócalo en public/video/hero.mp4
   y escribe aquí 'video/hero.mp4'. Mientras esté vacío se usa la foto. */
export const HERO = {
  // Video editado del estudio. Se procesa con ffmpeg a 720p sin audio y se
  // guarda en public/video/hero.mp4 junto con su portada hero-poster.jpg.
  video: 'video/hero.mp4',
  image: 'live-12',
  // Slideshow con disolución mientras llega el video. Solo fotos horizontales
  // del Live Room y el Control Room, de preferencia con gente grabando.
  slides: ['live-12', 'live-04', 'control-02', 'live-09', 'control-03', 'live-01', 'live-05'],
  slideSeconds: 6,
};

/* ---------- Tarifas (MXN) ---------- */
export const PRICING = {
  currency: 'MXN',
  baseHour: 900, // 2 h = $1,800. También se usa como precio de la hora extra (POR CONFIRMAR).
  blocks: [
    {
      id: '2h',
      hours: 2,
      price: 1800,
      save: 0,
      tagline: 'Voces, overdubs o un sencillo.',
      perks: ['Live Room y Control Room', 'Microfonía y preamps del estudio', 'Backline disponible', 'Acceso a amenidades'],
    },
    {
      id: '4h',
      hours: 4,
      price: 2700,
      save: 25,
      tagline: 'Varias canciones o una banda pequeña.',
      perks: ['Live Room y Control Room', 'Microfonía y preamps del estudio', 'Backline disponible', 'Acceso a amenidades'],
      hot: true,
    },
    {
      id: '8h',
      hours: 8,
      price: 4680,
      save: 35,
      tagline: 'Banda completa, EP o live session.',
      perks: ['Live Room y Control Room', 'Microfonía y preamps del estudio', 'Backline disponible', 'Acceso a amenidades'],
    },
  ],
  // Servicios sin precio fijo: se cotizan por proyecto.
  services: [
    { id: 'produccion', name: 'Producción musical', desc: 'Del demo a la canción terminada, con arreglos y dirección en la sesión.' },
    { id: 'mezcla', name: 'Mezcla', desc: 'Mezcla de tus canciones grabadas aquí o en otro estudio.' },
    { id: 'master', name: 'Master', desc: 'Master listo para plataformas de streaming.' },
    { id: 'composicion', name: 'Composición y jingles', desc: 'Música original para series, marcas y campañas.' },
    { id: 'locucion', name: 'Locución y doblaje', desc: 'Grabación, adaptación y doblaje de voces para video.' },
  ],
  profiles: [
    { id: 'voz', name: 'Voz o solista', desc: 'Voces e instrumentos sobre pistas que ya tienes.', block: '2h', suggest: ['mezcla', 'master'] },
    { id: 'banda', name: 'Banda completa', desc: 'Batería, bajo, guitarras y voz grabados en el Live Room.', block: '8h', suggest: ['mezcla'] },
    { id: 'produccion', name: 'Producción de un tema', desc: 'Del demo a la canción terminada con nuestro equipo.', block: '4h', suggest: ['produccion', 'mezcla', 'master'] },
    { id: 'locucion', name: 'Locución o doblaje', desc: 'Spots, cápsulas, jingles o doblaje para video.', block: '2h', suggest: ['locucion'] },
  ],
};

/* ---------- Salas ----------
   POR CONFIRMAR: medidas de cada sala. Los datos de "facts" salen de la
   lista de equipo y de las fotos. */
export const ROOMS = [
  {
    id: 'live',
    name: 'Live Room',
    tag: 'Sala principal',
    desc: 'Es la sala grande del estudio. Aquí se graba la banda completa al mismo tiempo, con la batería, los amplificadores y el piano ya instalados. Tiene piso de madera, paneles acústicos y luz ambiental para grabar sesiones en vivo con video.',
    facts: [
      ['Batería', 'RMV Special Edition X5'],
      ['Amplificación', 'Orange y Peavey TNT 115'],
      ['Piano', 'Wurlitzer vertical'],
      ['PA', 'Cerwin-Vega! y Alto L-20'],
    ],
    bullets: ['Espacio para grabar a toda la banda en vivo', 'Monitores Yorkville para ensayar o hacer live session', 'Par de congas y teclados disponibles', 'Luz regulable para sesiones con cámara'],
    gallery: ['live-12', 'live-04', 'live-01', 'live-05', 'live-11', 'live-13', 'live-14', 'live-03'],
  },
  {
    id: 'control',
    name: 'Control Room',
    tag: 'Grabación y mezcla',
    desc: 'Aquí se graba, se edita y se mezcla. El escritorio está frente a los monitores KRK con subwoofer y, alrededor, hay teclados y sintetizadores listos para usarse durante la sesión. Es también donde se graban locuciones y doblaje.',
    facts: [
      ['Monitores', 'KRK Rokit 8 + Sub 10s'],
      ['Referencia', 'Yamaha HS50'],
      ['Preamps', 'Focusrite OctoPre y Broadhurst No. 1'],
      ['Conversión', 'Apogee Rosetta 800'],
    ],
    bullets: ['Interfaz M-Audio ProFire 2626 con modificación Black Lion', 'Sintetizadores Yamaha DX21 y PortaSound a la mano', 'Controlador Novation LaunchControl XL', 'Cómodo para jornadas largas de edición'],
    gallery: ['control-02', 'control-03', 'control-01', 'engineer', 'control-05', 'control-06', 'control-04', 'control-07'],
  },
  {
    id: 'amenidades',
    name: 'Amenidades',
    tag: 'Compartidas con el foro',
    desc: 'Undying Studios y el foro audiovisual comparten la casa y sus amenidades. Entre toma y toma hay dónde esperar, arreglarse, comer algo o salir a la terraza a ver la ciudad.',
    // Lista del sitio del foro, más el comedor que aparece en las fotos.
    amenities: ['Sala de espera', 'Terraza con vista', 'Camerino', '2 vestidores', '2 baños', 'Regaderas', 'Cocina', 'Comedor'],
    gallery: ['lounge-02', 'lounge-03', 'lounge-01'],
  },
];

/* ---------- Equipo (lista real del estudio) ----------
   Organizado por función y ordenado por lo que más pesa al decidir
   dónde grabar: primero la cadena que define el sonido grabado
   (micrófonos, preamps y conversión), luego el backline que ahorra
   cargar instrumentos, después el monitoreo, el sonido en vivo y lo demás. */
export const GEAR = [
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
    intro: 'Monitores del Control Room para grabar, editar y mezclar.',
    items: [
      { name: 'KRK Rokit 8', kind: 'Monitores de estudio', img: 'krk-rokit-8' },
      { name: 'KRK 10s', kind: 'Subwoofer', img: 'krk-sub-10s' },
      { name: 'Yamaha HS50', kind: 'Monitores de referencia', img: 'yamaha-hs50' },
    ],
  },
  {
    id: 'envivo',
    name: 'Sonido en vivo',
    intro: 'Consolas, bocinas y monitores del Live Room para ensayos y live sessions.',
    items: [
      { name: 'Alto L-20', kind: 'Consola de 24 canales', img: 'alto-l20' },
      { name: 'Crate PA8FX', kind: 'Consola amplificada', img: 'crate-pa8fx' },
      { name: 'Cerwin-Vega! V-15B', kind: 'Par de bocinas', img: 'cerwin-vega-v15b' },
      { name: 'Yorkville YSM1p', kind: 'Monitores de piso', img: 'yorkville-ysm1p' },
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
];

/* ---------- Portafolio ---------- */
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
    yt: 'sMu77iWg7CM',
    category: 'Proyecto de casa',
    title: 'Viva Estoy',
    client: 'Los VDA ft. Keren y AKA-SHIK',
    desc: 'No todo lo bueno es famoso. Este es uno de nuestros proyectos favoritos.',
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

/* ---------- Reproductor de audio ----------
   PLACEHOLDER: audios de stock (Mixkit) con nombres de ejemplo, igual que en
   la v1. Reemplazar por producciones reales del estudio: MP3 en
   public/audio/, con título, artista, género y cómo se grabó. */
export const TRACKS = [
  {
    title: 'Neón en la Colonia', artist: 'Los Ferrales', genre: 'Rock alternativo',
    src: 'audio/rock-1091.mp3', cover: 'live-04',
    note: 'Banda completa en el Live Room. Batería RMV con Beta 52A en el bombo y par de Slate ML-2 en overheads.',
    chain: ['Live Room', 'Batería RMV', 'Beta 52A', 'OctoPre MkII'],
  },
  {
    title: 'Contarlo Todo', artist: 'Maia Velarde', genre: 'Pop',
    src: 'audio/pop-1131.mp3', cover: 'live-13',
    note: 'Voz principal con AKG C414 por el preamp Broadhurst Gardens No. 1. Coros con la misma cadena.',
    chain: ['AKG C414', 'Broadhurst No. 1', 'Rosetta 800'],
  },
  {
    title: 'Bajo Cero', artist: 'Kael', genre: 'Trap · Urbano',
    src: 'audio/hiphop-262.mp3', cover: 'control-03',
    note: 'Producción de casa en el Control Room. Voz con Beta 57A y mezcla en monitores KRK con subwoofer.',
    chain: ['Producción de casa', 'Beta 57A', 'KRK Rokit 8'],
  },
  {
    title: 'Madrugada', artist: 'Trío Ámbar', genre: 'Jazz',
    src: 'audio/jazz-1033.mp3', cover: 'live-11',
    note: 'Toma en vivo en el Live Room con el piano Wurlitzer. Par de ATM450 en el piano.',
    chain: ['Toma en vivo', 'Piano Wurlitzer', 'ATM450'],
  },
  {
    title: 'Casa Vacía', artist: 'Ana Reyes', genre: 'Folk acústico',
    src: 'audio/acoustic-1076.mp3', cover: 'live-09',
    note: 'Guitarra y voz grabadas al mismo tiempo. C414 en la voz y Slate ML-2 en la guitarra.',
    chain: ['Voz y guitarra', 'AKG C414', 'Slate ML-2'],
  },
];

/* ---------- Clientes (PNG blancos en public/clients, generados con tools/logos-mono.py) ---------- */
export const CLIENTS = [
  ['samsung', 'Samsung', 22], ['fox', 'FOX', 38], ['colgate', 'Colgate', 36], ['coca-cola', 'Coca-Cola', 33],
  ['nickelodeon', 'Nickelodeon', 44], ['mtv', 'MTV', 44], ['tv-azteca', 'TV Azteca', 44], ['huawei', 'Huawei', 44],
  ['claro', 'Claro Música', 44], ['burger-king', 'Burger King', 44], ['starz', 'STARZ', 28], ['paper-mate', 'Paper Mate', 26], ['gemini', 'Gemini', 27],
];

/* ---------- Reseñas reales de Google (las mismas del sitio del foro) ---------- */
export const REVIEWS = {
  score: '5.0',
  count: 25,
  // Copiadas del widget de Trustindex del sitio del foro. Para que se
  // actualicen solas hace falta el ID del widget de Trustindex o un
  // Place ID de Google con API key (ver README).
  // Texto textual de cada reseña, sin editar.
  items: [
    { name: 'Sebastian Ortega', text: "Literal lo tiene todo!! Puedes grabar lo que sea, audio, video, tomarte fotazas, ensayar, live (or smoke) sessions. Todo queda padrisimo! Lo que hace diferente a este estudio (a demás de la buena vibra) son la creatividad y oído maestro del buen Art. Manrique así como toda su chamba. Neta si quieres un resultado de primer nivel; aquí es! 👌" },
    { name: 'Diego Garay', text: "Undying studios simplemente los mejores, grandes profesionales que entienden los proyectos y a los músicos. Siempre un placer grabar con ustedes" },
    { name: 'Ivan Pr', text: "Me recomendaron un estudio cuando llegué a México y fue UNDIYING STUDIOS ,la verdad increíble experiencia y el lugar espectacular, cada vez que regrese a México ya sé cuál es el lugar ❤️" },
    { name: 'Cultis', text: "Excellent facilities with the most complete and latest equipment on the market. This means that the sound quality is of a very high level, competing with the world's major studios. Its CEO and producer, is deeply involved with the musical projects to achieve a first class musical production. Highly recommended for all types of musical and audiovisual projects." },
    { name: 'Emiliano Tovar', text: "Espacio profesional e increíble para desarrollar la parte visual y auditiva de tu proyecto musical, artistas no dejen pasar esta oportunidad de ir a este increíble lugar de mucha calidad" },
    { name: 'MiTracK Distribución Musical', text: "UndyingStudios es un estudio de grabación de alta calidad, equipado con tecnología de vanguardia y un ambiente creativo que impulsa la inspiración. Su equipo de ingenieros y productores expertos asegura resultados excepcionales en cualquier género musical. Con atención personalizada y un espacio diseñado para la comodidad, es el lugar perfecto para llevar tu música al siguiente nivel." },
    { name: 'R S', text: "Manejan estándares de la industria, ubicados en las afueras de la ciudad, si buscas crear tus proyectos con la mejor calidad este estudio es tu mejor elección" },
    { name: 'Marco Pereza', text: "La mejor opción en tierras satelucas para realizar tu producción de un modo súper profesional !!" },
    { name: 'Hugo Mondragon', text: "Excelente Servicio! El lugar súper profesional y muy cómodo para explotar tus talentos!" },
    { name: 'Sayuri Castro', text: "Buen espacio y la atención de Arturo 10/10" },
  ],
};

/* ---------- Preguntas frecuentes ----------
   Las políticas vienen de los términos y condiciones del foro. POR CONFIRMAR
   que apliquen igual al estudio. */
export const FAQS = [
  {
    q: '¿Cómo reservo una sesión?',
    a: 'Elige tu bloque de horas, escoge fecha y hora en el calendario y paga para confirmar. El pago completo se hace al momento de reservar.',
  },
  {
    q: '¿Puedo cambiar la fecha de mi sesión?',
    a: 'Sí. Puedes reprogramar con al menos 48 horas de anticipación, sujeto a disponibilidad. Las cancelaciones por parte del cliente no son reembolsables.',
  },
  {
    q: '¿Qué incluye una sesión de tracking?',
    a: 'El uso del Live Room y el Control Room durante las horas que reservaste, con la microfonía, los preamps y el backline del estudio.',
  },
  {
    q: '¿También hacen producción, mezcla y master?',
    a: 'Sí. Como cada proyecto es distinto, estos servicios se cotizan aparte. Escríbenos con lo que tienes, aunque sea una nota de voz, y armamos un plan a tu medida.',
  },
  {
    q: '¿Puedo llevar mis instrumentos?',
    a: 'Claro. Y si prefieres no cargar, en el estudio hay batería RMV, amplificador de bajo Peavey, piano Wurlitzer, teclados y sintetizadores.',
  },
  {
    q: '¿Puedo llevar invitados a la sesión?',
    a: 'Sí, solo regístralos antes de la sesión. Las visitas que no se registren tienen un cargo de $100 por persona.',
  },
  {
    q: '¿Qué pasa si se me acaba el tiempo?',
    a: 'Hay 15 minutos de tolerancia para desalojar. Si necesitas más tiempo, pregunta en el momento y, si la agenda lo permite, extiendes tu sesión.',
  },
  {
    q: '¿Puedo conocer el estudio antes de reservar?',
    a: 'Sí. Agenda una visita gratuita, recorre las salas y resuelve tus dudas técnicas antes de decidir.',
  },
];

/* ---------- Para quién ---------- */
export const AUDIENCES = [
  { id: 'banda', name: 'Bandas', desc: 'Toda la banda en el Live Room, con batería, amplificadores y piano listos.', img: 'live-12' },
  { id: 'voz', name: 'Solistas y voces', desc: 'Voces e instrumentos sobre tus pistas, con AKG C414 y preamps Focusrite.', img: 'live-13' },
  { id: 'produccion', name: 'Producción y composición', desc: 'Del demo a la canción terminada: producción, arreglos, mezcla y master.', img: 'control-02' },
  { id: 'locucion', name: 'Locución, doblaje y jingles', desc: 'Voces y música para marcas como Colgate, FOX Sports y Samsung.', img: 'engineer' },
];

// POR CONFIRMAR: el cliente marcó el horario como "por definir".
export const HOURS = 'Con cita previa · horario por confirmar';
export const ADDRESS = 'Arrayanes 13, Lomas de San Mateo, 53200 Naucalpan de Juárez, Estado de México';
