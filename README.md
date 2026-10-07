# Undying Studios · sitio web

Sitio de [undyingstudios.mx](https://undyingstudios.mx): un home que reparte a
dos landings, la del estudio de grabación y la del foro audiovisual. HTML, CSS
y JS estáticos construidos con Vite, GSAP y Lenis. Reemplaza al WordPress
anterior y se publica en Hostinger.

| URL | Página | Carpeta |
|---|---|---|
| `/` | Home: elige entre foro y estudio | `home/` |
| `/estudio/` | Landing del estudio de grabación | `estudio/` |
| `/estudio/terminos/` | Términos y condiciones del estudio | `estudio/terminos/` |
| `/foro/` | Landing del foro audiovisual | `foro/` |
| `/aviso-de-privacidad/` | Aviso de privacidad (todo el sitio) | `home/aviso-de-privacidad/` |

## Comandos

```bash
npm install          # una sola vez
npm run dev          # estudio en http://localhost:5173
npm run dev:foro     # foro en http://localhost:5176
npm run dev:home     # home en http://localhost:5175
npm run build        # genera dist/ con el sitio completo
npm run preview      # sirve dist/ en http://localhost:4173
npm run sync:clips   # refresca el showreel del estudio desde YouTube
```

En local cada página corre en su propio puerto; los enlaces entre ellas se
ajustan solos para apuntar al servidor de desarrollo correspondiente.

El menú del estudio tiene la opción "Foro audiovisual" y el del foro
"Estudio de grabación", para pasar de una landing a la otra sin volver al home.

## Estructura

```
home/        Home, aviso de privacidad y archivos de la raíz del servidor
  public/    .htaccess, robots.txt, sitemap.xml, 404.html, íconos, manifest
estudio/     Landing del estudio y sus términos
  src/       data.js (todo el contenido), main.js, estudio.css, clips.json
  public/    Fotos, equipo, logotipos, miniaturas, video del hero
foro/        Landing del foro
  src/       data.js, main.js, styles/foro.css, clips.json
  public/    Fotos y PDF del foro
shared/      Sistema de diseño común
  styles/    base.css (tokens y componentes base), components.css, legal.css
  fonts/     Wix Madefor Display, Montserrat y Norwester (autoalojadas)
  data/      reviews.js (reseñas de Google del negocio)
  vite/      seo.js (datos estructurados JSON-LD generados al compilar)
tools/       Procesamiento de material y pruebas automáticas
version01/   Primera versión del estudio, archivada. No se publica
```

`npm run build` compila el home en `dist/`, el estudio en `dist/estudio/` y el
foro en `dist/foro/`. El resultado es exactamente lo que va en `public_html`.

## Dónde se edita cada cosa

Todo el contenido está en el `data.js` de cada página. Lo marcado con
`POR CONFIRMAR` es una suposición que el cliente debe validar y lo marcado con
`PENDIENTE` espera material del cliente.

**Estudio (`estudio/src/data.js`)**

| Qué | Bloque |
|---|---|
| WhatsApp, correo, razón social, calendarios, enlace de pago | `LINKS` |
| Tarjetas de "para quién" | `AUDIENCES` |
| Logotipos de artistas | `ARTISTS` |
| Salas, medidas y fichas | `ROOMS` |
| Equipo del Estudio A y del Estudio B | `GEAR` |
| Producciones destacadas | `FEATURED` |
| Showreel (playlist de YouTube) | `YOUTUBE` |
| Tracks de "El sonido de Undying" | `TRACKS` |
| Tarifas, postproducción y combinaciones del cotizador | `PRICING` |
| Cinta de marcas | `CLIENTS` |
| Preguntas frecuentes | `FAQS` |

**Foro**: la landing reproduce la página del foro que estaba en WordPress, con
el mismo orden, los mismos textos y las mismas fotos. Los textos fijos están en
`foro/index.html`; en `foro/src/data.js` quedan los calendarios, las tarifas,
la playlist de videoclips y las preguntas frecuentes. Encima de la página
original se aplicaron las correcciones del cliente: sección de videoclips
grabados en el foro, preguntas frecuentes, aforo de 25 personas y equipo
incluido en 3 y 3.

Las reseñas de Google están en `shared/data/reviews.js` y las usan ambas
landings.

## Reservas y cotizador

Las reservas usan calendarios de Prospex en un modal. Antes de cargar el
calendario se pide aceptar el aviso de privacidad y los términos.

- **Estudio**: cada bloque tiene una llave `3h-ing`, `6h-dry`, etc. en
  `LINKS.booking`. Si la llave está vacía, el botón abre WhatsApp con la reserva
  ya escrita. Cuando el cliente cree los calendarios, solo se pega la URL.
- **Cotizador del estudio**: combina horas (con ingeniero o Dry Hire) y piezas
  de postproducción con cantidad. Con la casilla de aceptación marcada permite
  reservar las horas o mandar el pedido por WhatsApp. Si se configura
  `LINKS.checkout` (formulario de pedido de Prospex o liga de Mercado Pago)
  aparece también el botón de pago en línea.
- **Foro**: calendarios de 3, 6 y 12 horas, 12 horas con cambio de color del
  ciclorama y scouting, los mismos que usaba el sitio anterior. La casilla
  "Personalizar color de ciclorama" de la tarjeta de 12 horas sube el precio a
  $10,000 y cambia al calendario con cambio de color, como en WordPress.

## SEO

- Cada página tiene título, descripción, `canonical`, Open Graph con imagen de
  1200×630 y Twitter card. Las imágenes para compartir se regeneran con
  `node tools/build-meta-images.mjs`.
- Los datos estructurados se generan al compilar desde `data.js`
  (`shared/vite/seo.js`): `RecordingStudio` y `LocalBusiness` con tarifas y
  calificación, `BreadcrumbList` y `FAQPage`. El home lleva `Organization` y
  `WebSite`.
- `home/public/sitemap.xml` y `robots.txt` van en la raíz. Al cambiar algo
  importante, actualiza la fecha `lastmod` del sitemap.
- El `.htaccess` redirige con 301 las URLs del WordPress anterior (reservas,
  agendar recorrido, aviso de privacidad, PDF y sitemaps de Yoast) y responde
  410 a las rutas de WordPress que ya no existen.
- La landing del foro conserva el título que tenía la página de WordPress.

## Rendimiento

Lighthouse móvil sobre el build (octubre 2026):

| Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
|---|---|---|---|---|
| Home | 99 | 95 | 100 | 100 |
| Estudio | 98 | 100 | 100 | 100 |
| Foro | 98 | 100 | 100 | 100 |

- Tipografías autoalojadas y precargadas; sin Google Fonts.
- El video del hero está en el HTML con dos versiones: `hero.mp4` (720p) y
  `hero-mobile.mp4` (540p, para pantallas de hasta 720 px). Con movimiento
  reducido o ahorro de datos se queda solo la portada (`hero-poster.webp`).
- Fotos en WebP de 400, 800 y 1600 px con `srcset`; carga diferida fuera de
  la primera pantalla.
- El `.htaccess` guarda un año los archivos con hash, un mes las imágenes y
  revisa el HTML en cada visita.
- La accesibilidad del home queda en 95 por el contraste del texto blanco
  sobre el naranja de marca en los botones. Se dejó así para respetar la
  identidad; para llegar a 100 basta con oscurecer el naranja de los botones a
  `#a55a27`.

## Publicar en Hostinger

El hosting es el mismo plan de WordPress: el sitio nuevo son archivos
estáticos y Hostinger los sirve sin cambiar de plan ni de DNS. El correo
(`@undyingstudios.mx`) no se ve afectado.

### Primera vez: migración desde WordPress

1. **Respaldo completo** del WordPress (hPanel → Respaldos), archivos y base
   de datos.
2. En hPanel → Administrador de archivos, mueve el contenido actual de
   `public_html` a una carpeta fuera de ella (por ejemplo `wp-respaldo/`).
   No lo borres hasta que el sitio nuevo esté estable.
3. Conserva la carpeta `documentos/` si hay PDF que no estén en el proyecto.
4. Publica `dist/` (ver abajo). Debe incluir `.htaccess`.
5. Purga la caché del CDN de Hostinger (hPanel → Rendimiento → CDN).
6. Revisa `https://undyingstudios.mx/`, `/estudio/`, `/foro/` y una URL vieja,
   por ejemplo `/reservacion-6-horas/`, que debe redirigir al foro.
7. En Google Search Console envía `https://undyingstudios.mx/sitemap.xml`.

### Publicación con GitHub Actions (recomendado)

`.github/workflows/deploy.yml` compila el sitio y sube `dist/` por FTP. Solo
sube lo que cambió y nunca borra archivos del servidor.

1. En hPanel → Archivos → Cuentas FTP, crea o copia el usuario FTP.
2. En GitHub → Settings → Secrets and variables → Actions, agrega los secretos
   `FTP_SERVER`, `FTP_USERNAME` y `FTP_PASSWORD`. Si la carpeta del sitio no es
   `public_html/` desde la raíz del FTP, agrega la variable `FTP_DIR`.
3. GitHub → Actions → **Publicar en Hostinger** → Run workflow.

El flujo se ejecuta solo a mano. Cuando la migración esté hecha, puedes
activar la publicación automática en cada push a `main` quitando el
comentario de `push` en el archivo.

### Publicación manual

`npm run build`, comprime el contenido de `dist/` (incluido `.htaccess`) y
extráelo en `public_html` desde el Administrador de archivos.

## Material del cliente

El material original vive en `material-de-origen/` (unos 12 GB, no se
versiona). Scripts en `tools/`:

| Script | Qué hace |
|---|---|
| `build-assets.py` | Fotos del estudio a WebP, fotos de equipo en cuadro blanco, miniaturas de YouTube |
| `fix-gear.py` | Limpia el fondo de fotos de equipo sobre gris (Apogee Rosetta 800, PSS-780) |
| `logos-render.mjs` + `logos-mono.py` | Logotipos de clientes en blanco para la cinta |
| `build-foro-assets.py` | Fotos y PDF del foro (descargados del WordPress anterior); acepta nombres para bajar solo esas fotos |
| `shoot-original.mjs` | Capturas por pantalla de una página (por omisión, el foro en WordPress) para compararla |
| `build-meta-images.mjs` | Íconos e imágenes para compartir |
| `build-font.py` | Norwester con acentos, eñe y signos de apertura |
| `sync-clips.mjs` | Copia local de una playlist de YouTube |
| `build-tracks.mjs` | WAV de "El sonido de Undying" a AAC de 256 kbps en `estudio/public/audio/` |

`build-foro-assets.py` descarga del WordPress: ya no funcionará cuando se
reemplace el sitio, pero las fotos y los PDF ya están en `foro/public/`.

Showreel del estudio: `npm run sync:clips`. Videoclips del foro:

```bash
node tools/sync-clips.mjs PL8bIl-NaTJFi3g4-jjmeeWq3_YIqViB25 foro/src/clips.json
```

## Pendientes del cliente

**Material que menciona la guía de actualización y no llegó**

- Logotipos de artistas (`ARTISTS`; la sección aparece sola cuando hay logos).
- Video nuevo del hero del estudio.
- Fotos de las cuatro tarjetas de "para quién".
- Fotos del Estudio B y de su equipo; fotos de la guitarra Jay Turser y de las
  congas.

**Configuración**

- Calendarios de Prospex del estudio para 3, 6 y 9 horas, con y sin ingeniero.
- Enlace de pago en línea para el cotizador, si se quiere cobrar ahí.
- API key de YouTube si se quiere que el showreel se actualice sin publicar.

**Correcciones del foro que esperan material**

- "Eliminar foto C19 y reemplazar por" una foto de Drive: el archivo no es
  público y no se sabe cuál es la foto C19.
- Recorrido horizontal y vertical del foro (Drive, sin acceso público).

**Por confirmar**

- Revisión legal del aviso de privacidad y de los términos del estudio.
- Video de Kinky "Aspirina Sound Off": se usó el que aparece en YouTube con
  ese título.
- Descripción del track "Oveja Negra" (la guía repite la de "Dile").
- Horario de atención del estudio.
- Correo del foro: la página anterior decía foro@undyingstudio.mx (sin la "s");
  se usa music@undyingstudios.mx de la guía del cliente.
- Cancelaciones del foro: el reglamento dice 24 h / 12 h y los términos dicen
  sin reembolso y reprogramación con 48 h. Las preguntas frecuentes usan los
  términos.
- Los PDF del foro (reglamento y términos) traen el contacto viejo:
  undyingstudios@gmail.com y +52 1 55 4469 8604.

## Pruebas automáticas

Scripts de Playwright (`npx playwright install chromium` la primera vez).
Capturas en `tools/.shots/`.

- `node tools/font-audit.mjs` lista los textos visibles del estudio y del foro
  con letra menor a 16 px (el mínimo del sitio; el menú va en 18 px).
- `node tools/qa-site.mjs` revisa el build completo: errores, enlaces rotos,
  etiquetas SEO, JSON-LD, imágenes sin alt y desbordes en móvil.
- `node tools/interact.mjs` prueba el estudio en local (`npm run dev`).
- `node tools/foro-shoot.mjs` y `node tools/home-shoot.mjs` prueban el foro y
  el home en local.

## Tipografía

`shared/fonts/` tiene las tres familias en WOFF2 (licencia SIL Open Font).
Wix Madefor Display y Montserrat son variables y solo incluyen el subconjunto
latino. Norwester se genera con `python tools/build-font.py`, que le agrega
las vocales acentuadas, la eñe, la diéresis, el punto medio y los signos de
apertura.
