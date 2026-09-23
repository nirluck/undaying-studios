# Undying Studios · Landing del Estudio de Grabación

Landing page estática (HTML + CSS + JS) construida con Vite, GSAP y Lenis para
el estudio de grabación de Undying Studios. Convive con el WordPress del foro
audiovisual: se publica en una subcarpeta (`undyingstudios.mx/estudio/`) o en
un subdominio (`estudio.undyingstudios.mx`) sin tocar el sitio existente.

## Comandos

```bash
npm install        # una sola vez
npm run dev        # servidor local en http://localhost:5173
npm run build      # genera dist/ listo para subir
npm run preview    # sirve dist/ para revisarlo
npm run dev:v1     # versión 01 archivada, en http://localhost:5174
```

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html` | Estructura de la página y textos fijos |
| `src/data.js` | Todo el contenido editable |
| `src/main.js` | Interacciones y animaciones |
| `src/styles/main.css` | Sistema de diseño: tokens, tipografía y componentes base |
| `src/styles/v2.css` | Componentes con material real: galerías, catálogo, portafolio, visor, carruseles |
| `public/` | Fotos, equipo, logotipos, miniaturas, audio y marca ya optimizados |
| `tools/` | Procesamiento de material y pruebas automáticas |
| `version01/` | Primera versión, con material de stock. Se conserva solo como referencia para comparar. Ver su propio README |

## Dónde se edita cada cosa

Todo está en `src/data.js`.

| Qué | Bloque |
|---|---|
| Tarifas y servicios por cotizar | `PRICING` |
| Salas y amenidades con su galería | `ROOMS` |
| Catálogo de equipo | `GEAR` |
| Portafolio destacado y videoclips | `FEATURED` y `CLIPS` |
| Pistas del reproductor de audio | `TRACKS` |
| Cinta de clientes | `CLIENTS` |
| Reseñas de Google | `REVIEWS` |
| Preguntas frecuentes | `FAQS` |
| WhatsApp, calendarios Prospex, playlists, redes y legales | `LINKS` |
| Slideshow o video del hero | `HERO` |

Lo marcado con `POR CONFIRMAR` es una suposición razonable que el cliente debe
validar antes de publicar.

## Material del cliente

El material original vive en `material-de-origen/`, que no se versiona porque
pesa unos 12 GB. El script `tools/build-assets.py` lo convierte a lo que usa la
página y lo guarda en `public/`:

- Fotos del estudio a WebP de 800 y 1600 px, con la orientación corregida.
- Fotos de equipo a WebP cuadrado sobre fondo blanco, recortadas al producto.
- Miniaturas de YouTube del portafolio.
- Logotipos originales a `tools/.logo-src`.

```bash
python tools/build-assets.py
```

Para regenerar los logotipos blancos de la cinta de clientes:

```bash
node tools/logos-render.mjs
```

```bash
python tools/logos-mono.py
```

Paramount y Fiat quedaron fuera de la cinta porque no se leen en monocromo.

### Video del hero

Mientras llega el video editado, el hero muestra un slideshow con disolución de
las fotos listadas en `HERO.slides`. Cuando esté listo, guárdalo como
`public/video/hero.mp4` y escribe `video: 'video/hero.mp4'` en `HERO`.
Recomendado: 1280×720, sin audio, 15 a 20 segundos, alrededor de 1 MB.

### Audios del reproductor

Los cinco audios de `public/audio` todavía son de stock (Mixkit) con nombres de
ejemplo. Se reemplazan en `TRACKS`.

### Cotizador

Está oculto con el atributo `hidden` en `index.html` mientras se itera. El
código sigue completo; para mostrarlo basta con quitar ese atributo.

### Reseñas de Google

Hoy son las 10 reseñas del foro copiadas textualmente del widget de
Trustindex. Para que se actualicen solas:

1. **Trustindex (recomendado).** El foro ya lo usa. Desde su panel se copia el
   código del widget (`<script src="https://cdn.trustindex.io/loader.js?ID">`) y
   se pega en la sección de reseñas.
2. **API de Google Places.** Requiere el Place ID del negocio y una API key de
   Google Cloud con facturación activa. Solo entrega 5 reseñas por consulta.

## Datos por confirmar con el cliente

- Calendarios del estudio en Prospex. Hoy apuntan a los del foro.
- Medidas de cada sala.
- Si la sesión de tracking incluye ingeniero de grabación.
- Precio de la hora extra. Hoy usa $900, el precio por hora del bloque de 2 horas.
- Horario de atención.
- Que las políticas de pago, reprogramación, invitados y tolerancia del foro
  apliquen también al estudio.
- Aviso de privacidad y términos propios del estudio.
- URL absoluta para `og:image` una vez publicada.
- Píxeles de Meta, TikTok y Google Ads si se van a correr campañas.

## Publicar

1. `npm run build`.
2. Sube el contenido de `dist/` a la carpeta `estudio/` del hosting o a la raíz
   del subdominio. Las rutas son relativas.
3. Si vive en subcarpeta dentro del WordPress, agrega `RewriteEngine Off` en el
   `.htaccess` de esa carpeta para que WordPress no intercepte la ruta.

## Pruebas automáticas

Scripts de Playwright en `tools/`. Requieren `npm run dev` corriendo. Las
capturas se guardan en `tools/.shots/`.

```bash
npx playwright install chromium
```

- `node tools/shoot.mjs` toma capturas completas en desktop y móvil.
- `node tools/interact.mjs` prueba galerías, visor, catálogo, portafolio,
  reproductor, reseñas, modal, FAQ y desbordes en móvil.
- `node tools/subpath-test.mjs dist` verifica el build servido desde `/estudio/`.
