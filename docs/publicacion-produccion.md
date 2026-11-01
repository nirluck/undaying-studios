# Publicación en undyingstudios.mx

Plan para cambiar el WordPress de undyingstudios.mx por el sitio nuevo con
reservas propias. Revisado el 30 de octubre de 2026.

Quién hace cada paso: **Tú** (Nir, con acceso a hPanel, Supabase, Stripe y
GitHub), **Cliente** (Undying Studios) y **Claude** (cambios en el repo,
compilación y revisiones; nada se publica sin que lo pidas).

## Cómo está hoy

| Revisado | Resultado |
|---|---|
| `GET /api/salud` | `pasarela: stripe`, `correo: resend` |
| Webhook con firma falsa | "Firma de Stripe inválida": el `STRIPE_WEBHOOK_SECRET` está puesto. Desde fuera no se puede saber si es el del webhook de modo real o el de prueba (paso A2) |
| Pruebas `npm run test:reservas` | 39 de 39 pasan (rama `main`, commit `0b5b436`) |
| DNS de Resend | Existe `resend._domainkey` (DKIM) y `send.` (SPF/MX de rebote). El correo `music@` sigue en Hostinger (MX `mx1/mx2.hostinger.com`), no se toca |
| undyingstudios.mx | WordPress con Yoast. `www` y `http` ya mandan a `https://undyingstudios.mx/` |
| admin.undyingstudios.mx | Sitio de prueba con `X-Robots-Tag: noindex`; usa la misma base y las mismas llaves de Stripe que producción |

**El repo ya trae lo de producción.** `home/public/` tiene el `.htaccess`
(https, sin www, redirecciones del WordPress, 410 para `wp-*`, caché),
`robots.txt` con `Allow: /` y `sitemap.xml`. El bloqueo de buscadores solo
lo lleva el zip que se sube a admin.undyingstudios.mx; un `npm run build`
normal ya sale listo para producción. Las páginas `/admin/`, `/reservas/` y
`/estudio/prueba-reserva/` llevan `noindex` en su HTML, y así deben quedar.

**Páginas del WordPress actual** (de `page-sitemap.xml` y de los enlaces de
la portada) y a dónde van. Todas ya están en `home/public/.htaccess`:

| URL vieja | Destino |
|---|---|
| `/` | `/` (nueva portada) |
| `/reservacion-3-horas/`, `/reservacion-6-horas/`, `/reservacion-12-horas/` | `/foro/#tarifas` |
| `/reservacion-12-horas-recolor/` | `/foro/#ciclorama` |
| `/agendar-recorrido/` | `/foro/#scouting` |
| `/privacy-policy/` | `/aviso-de-privacidad/` |
| `/404-2/`, `/feed/` | `/` |
| `/sitemap_index.xml`, `/page-sitemap.xml`, `/wp-sitemap.xml` | `/sitemap.xml` |
| `/documentos/Reglamento-para-Uso-del-Foro-Undying-Studios.pdf` | `/foro/documentos/reglamento-foro.pdf` |
| `/documentos/terminos-y-condiciones.pdf` | `/foro/documentos/terminos-y-condiciones-foro.pdf` |
| `/wp-content/uploads/2025/09/Manual-Tecnico-US.pdf` | `/foro/documentos/manual-tecnico-foro.pdf` |
| Resto de `/wp-content/`, `/wp-admin/`, `/wp-json/`, `wp-login.php`… | 410 (ya no existe) |

`post-sitemap.xml` está vacío: el WordPress no tiene entradas de blog.

## Robots, SEO y rendimiento

Revisado el 31 de octubre con el build de `main` y el sitio de prueba en
Hostinger.

**Robots e indexación: bien.**
- `robots.txt` con `Allow: /` y la ruta del sitemap; el sitemap trae `/`,
  `/estudio/`, `/foro/`, `/estudio/terminos/` y `/aviso-de-privacidad/`.
- Las cinco páginas públicas tienen title (37–55 caracteres), description
  (125–156), canonical a `https://undyingstudios.mx/…`, un solo `h1` y
  `lang="es-MX"`. `/reservas/`, `/admin/`, `/estudio/prueba-reserva/` y la
  404 llevan `noindex` y no están en el sitemap. No hay enlaces rotos.
- La 404 responde con código 404 y `/estudio` sin diagonal da 301 a `/estudio/`.
- Open Graph y Twitter en las tres páginas principales, con imagen de
  1200×630 (90–110 KB).
- JSON-LD válido: Organization y WebSite en la portada; RecordingStudio y
  LocalBusiness con dirección, coordenadas, teléfono y precios del panel,
  más BreadcrumbList y FAQPage.
- El foro conserva el título que posicionaba en el WordPress ("Renta de Foro
  Audiovisual en CDMX | Undying Studios").

**Rendimiento: mucho mejor que el WordPress.** Medido en móvil (Pixel 7),
red 4G lenta (150 ms, 1.6 Mbps) y CPU 4 veces más lenta, sin caché:

| Página | LCP | CLS | Bloqueo JS | Primera carga |
|---|---|---|---|---|
| WordPress actual `/` | 5.8 s | 0 | ~1.7 s | 91 peticiones, 1.3 MB |
| Nueva `/` | 1.3 s | 0 | 0 | 11 peticiones, 121 KB |
| Nueva `/estudio/` | 1.1 s | 0.011 | ~0.4 s | 24 peticiones, 503 KB |
| Nueva `/foro/` | 1.2 s | 0 | ~0.2 s | 10 peticiones, 215 KB |

Hostinger ya comprime con Brotli. Los videos de portada se bajan después de
la carga (1.7 MB en el foro y 3.4 MB en el estudio en móvil) y no se cargan
con "ahorro de datos" ni con movimiento reducido.

**Lo que hay que atender:**

1. **El `.htaccess` de producción nunca se ha probado en Hostinger.** El
   sitio de prueba lleva uno mínimo; por eso ahí los archivos salen con la
   caché por defecto de Hostinger (7 días) y sin las cabeceras de
   seguridad. Un error en ese archivo tira todo el sitio con un 500.
   Se prueba antes en el sitio de prueba (paso E0).
2. **Horario del foro en los datos estructurados.** `foro/vite.config.js`
   dice `Mo-Su 09:00-18:00`, el panel 8:00–20:00 y los dos están "por
   confirmar". Debe coincidir con el horario confirmado y con el Perfil de
   Google. El estudio no publica horario (paso B4).
3. **Hoy la portada `/` del WordPress es la página del foro** y es la que
   posiciona para "renta de foro audiovisual CDMX". La portada nueva es un
   selector con ~100 palabras, y sus enlaces al foro y al estudio tienen
   como texto la animación ("Rec 00:00:27:15 12 × 6 m"). Google tardará unas
   semanas en pasar ese posicionamiento a `/foro/`, y puede bajar mientras
   tanto. **Hecho:** cada enlace lleva ahora un `aria-label` descriptivo
   ("Renta de foro audiovisual en CDMX", "Renta de estudio de grabación en
   CDMX") y `aria-describedby` hacia su descripción, sin cambio visible
   (`home/index.html`). Más contenido en la portada sería un cambio de copy
   que tendría que pedir el cliente (decisión 5).
4. **Buena parte del texto de las landings lo arma JavaScript** (estudio:
   577 palabras en el HTML y 2,334 ya cargado; foro: 411 y 1,344). Google sí
   ejecuta JavaScript, así que se indexa, pero tarda más. Mejora para
   después de abrir: generar esas secciones al compilar.
5. **Calificación 5.0 (25 reseñas) en los datos estructurados.** Google no
   muestra estrellas cuando el negocio califica su propia ficha, y pide que
   las reseñas se vean en la página. No penaliza, pero conviene que la
   calificación aparezca visible o quitarla.
6. **Detalles:** el `lastmod` del sitemap dice 2026-10-06 (se actualiza al
   compilar, paso E1); el logo del JSON-LD es el monograma blanco en SVG
   transparente, y en Google conviene un PNG cuadrado sobre fondo oscuro.

## Decisiones antes de empezar

1. **Qué versión se publica.** Hay dos sesiones abiertas: el cotizador del
   estudio (cambios sin commit en `estudio/`) y el acceso de clientes a Mis
   reservas. Propuesta: esperar a que las dos terminen, revisarlas, unirlas
   a `main` y publicar desde ese commit.
2. **Cómo se sube.** Propuesta: el día de la apertura, zip manual de `dist/`
   (como en el sitio de prueba), porque de todos modos hay que vaciar
   `public_html` a mano. Después, para las actualizaciones, el workflow
   **Publicar en Hostinger** (compila desde `main` con las variables del
   repo, así no depende de un `.env.local` y sirve para el botón "Publicar
   sitio" del panel). Se configura en la fase F.
3. **`/estudio/prueba-reserva/`.** Hoy se compila y se publicaría. Con
   llaves reales, quien la use paga de verdad. ¿Se publica, se quita del
   build o la sustituye el cotizador nuevo?
4. **admin.undyingstudios.mx después de abrir.** Propuesta: que redirija a
   `https://undyingstudios.mx/admin/` y quitarlo de `ORIGENES`, para que no
   quede una segunda copia del sitio cobrando con llaves reales.
5. **SEO de la portada.** Los `aria-label` ya están. Lo de más texto en la
   portada, quitar o mostrar la calificación y cambiar el logo del JSON-LD
   se le pregunta al cliente.

## Fase A · Stripe en modo real y prueba con dinero real

Se hace con el sitio de prueba (admin.undyingstudios.mx), que ya apunta a la
API. Nada público cambia.

- [ ] **A1 · Tú.** Stripe (modo real) → Settings → Payment methods: OXXO
  activado. Si se ofrecen meses sin intereses, activarlos ahí.
- [ ] **A2 · Tú.** Stripe (modo real) → Developers → Webhooks: el endpoint
  `https://kydkgqchbjrdfjyltwoq.supabase.co/functions/v1/api/stripe/webhook`
  existe **en modo real** con los 5 eventos
  (`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `checkout.session.expired`,
  `charge.dispute.created`). Su "Signing secret" es el que está en
  `STRIPE_WEBHOOK_SECRET` (si hay duda, cópialo otra vez a Supabase Secrets).
- [ ] **A3 · Tú.** Compra real chica: en el panel, un pedido a la medida de
  $10 con enlace de pago, pagado con tarjeta real.
  *Se verifica:* el pedido pasa a "pagado" solo (lo marca el webhook), llega
  el correo de confirmación con el logotipo, y en Stripe → Webhooks el
  evento sale con respuesta 200.
- [ ] **A4 · Tú.** Reembolsar ese pedido desde el panel.
  *Se verifica:* el reembolso aparece en Stripe y en el pedido.
- [ ] **A5 · Tú.** Generar una ficha OXXO (no hace falta pagarla).
  *Se verifica:* sale la ficha con referencia; la sesión vence sola y el
  apartado se libera.

## Fase B · Datos del negocio

- [ ] **B1 · Cliente.** Confirmar horarios reales (estudio 10:00–22:00 y foro
  8:00–20:00 están "por confirmar"), la hora extra de $500/h en los dos
  espacios y los precios.
- [ ] **B2 · Tú.** Capturarlos en el panel: Horarios, Precios y catálogo,
  Reglas y políticas, Ajustes (enlace de reseña de Google).
- [ ] **B3 · Tú.** Usuarios del panel: el equipo invitado con su rol
  (ingenieros con rol Ingeniero).
- [ ] **B4 · Claude.** Poner el horario confirmado en `openingHours` del foro
  (y en el estudio, si se quiere publicar) y aplicar lo que se decida en la
  decisión 5.

## Fase C · Limpiar la base (irreversible)

Archivo: [`supabase/limpiar-datos-de-prueba.sql`](../supabase/limpiar-datos-de-prueba.sql).
Se probó en una base local con datos de ejemplo: borra pedidos, sesiones,
pagos, clientes, correos, visitas, etc., deja catálogo, horarios, ajustes,
usuarios, plantillas y los bloqueos puestos a mano, y el siguiente pedido
vuelve a ser UND-1001.

- [ ] **C1 · Tú.** SQL Editor → correr el **paso 1** (solo lectura) y revisar
  las listas. Debe haber solo pedidos de prueba (`cs_test_…`) y el de $10
  de la fase A. Si aparece algo real, se detiene aquí.
- [ ] **C2 · Tú.** Correr el **paso 2** (copia en el esquema
  `respaldo_prueba`).
- [ ] **C3 · Tú.** Correr el **paso 3**. *Se verifica:* la comprobación sale
  toda en 0 y el panel muestra la agenda vacía.
- [ ] **C4 · Tú.** Revisar en Horarios y bloqueos si quedaron bloqueos de
  prueba y quitarlos ahí.

## Fase D · Pasar las reservas de Prospex

- [ ] **D1 · Cliente.** Lista de reservas futuras en Prospex (estudio y foro).
- [ ] **D2 · Tú.** Registrarlas en el panel como bloqueos (Horarios y
  bloqueos), con el nombre del cliente en la nota.
  *Se verifica:* esos horarios salen ocupados en el calendario del sitio.

Prospex se apaga hasta la fase F, cuando ya no entren reservas por ahí.

## Fase E · Día de la apertura

Todo seguido, en un horario con poco tráfico. El sitio de WordPress queda en
línea hasta el paso E5.

- [ ] **E0 · Claude y Tú (unos días antes).** Probar el `.htaccess` de
  producción en admin.undyingstudios.mx: Claude arma una copia sin el bloque
  de https/www (que mandaría todo a undyingstudios.mx) y con el
  `X-Robots-Tag: noindex`; tú la subes. *Se verifica:* el sitio carga, las
  URLs viejas dan 301, `/wp-admin/` da 410, los `.js` salen con caché de un
  año y aparecen `Strict-Transport-Security` y `X-Content-Type-Options`.
- [ ] **E1 · Claude.** Compilar desde el commit acordado con `.env.local`
  apuntando a Supabase y el `lastmod` del sitemap con la fecha de apertura.
  *Se verifica:* `npm run test:reservas`, `npm run check:reservas`,
  `node tools/qa-site.mjs`; `dist/robots.txt` con `Allow: /`,
  `dist/sitemap.xml` presente, `dist/.htaccess` sin `X-Robots-Tag`,
  canonical a `https://undyingstudios.mx/…`. Te entrego el zip.
- [ ] **E2 · Tú.** hPanel → Respaldos: respaldo de archivos y de la base del
  WordPress, y **descargar los dos** a tu computadora.
- [ ] **E3 · Tú.** Supabase → Edge Functions → Secrets:
  - `SITIO_URL` = `https://undyingstudios.mx`
  - `ORIGENES` = `https://undyingstudios.mx,https://www.undyingstudios.mx,https://admin.undyingstudios.mx`
    (admin se quita en F3; `undayingstudio.netlify.app` y `localhost` ya no)
  - `CORREO_REMITENTE` = `Undying Studios <reservas@undyingstudios.mx>` (o
    dejarlo vacío, es el valor por defecto)
  - Resend → Domains: `undyingstudios.mx` en "Verified".
- [ ] **E4 · Tú.** Supabase → Authentication → URL Configuration: Site URL y
  Redirect URLs = `https://undyingstudios.mx/admin/`. En Providers → Email,
  "Allow new users to sign up" apagado.
- [ ] **E5 · Tú.** hPanel → Administrador de archivos → `public_html` del
  dominio principal: borrar los archivos del WordPress (`wp-*`, `index.php`,
  `.htaccess`, `documentos/`…), **sin tocar `.well-known/`**. Subir el zip y
  descomprimirlo en `public_html`. Purgar la caché de hPanel (CDN).
- [ ] **E6 · Claude.** Revisión en vivo:
  - `/`, `/estudio/`, `/foro/`, `/aviso-de-privacidad/`, `/reservas/`,
    `/admin/` cargan;
  - `www.` y `http://` mandan con 301 a `https://undyingstudios.mx/`;
  - cada URL vieja de la tabla de arriba da 301 al destino y `/wp-admin/` 410;
  - sin `X-Robots-Tag` y `robots.txt` correcto;
  - el widget de reserva abre y lee disponibilidad (sin pagar);
  - repetir la medición de rendimiento en el dominio real (LCP menor a 2.5 s
    en móvil) y pasar `/estudio/` y `/foro/` por la prueba de resultados
    enriquecidos de Google.
- [ ] **E7 · Tú.** Entrar a `https://undyingstudios.mx/admin/` y armar una
  reserva hasta el checkout de Stripe, sin pagar (o pagar y reembolsar).
  *Se verifica:* el correo trae enlaces a undyingstudios.mx.

**Para volver atrás:** subir el respaldo de E2 a `public_html` y regresar
`SITIO_URL`. La base no se toca en esta fase.

## Fase F · Después de abrir

- [ ] **F1 · Tú.** Google Search Console (propiedad undyingstudios.mx):
  enviar `https://undyingstudios.mx/sitemap.xml`, quitar el
  `sitemap_index.xml` viejo y pedir indexación de `/`, `/estudio/` y `/foro/`.
- [ ] **F2 · Cliente.** Perfil de Google, Instagram y otros enlaces: apuntar a
  `/estudio/` o `/foro/`.
- [ ] **F3 · Tú.** admin.undyingstudios.mx: dejar en su `public_html` solo un
  `.htaccess` con
  `RewriteEngine On` + `RewriteRule ^ https://undyingstudios.mx/admin/ [R=301,L]`
  y quitar `https://admin.undyingstudios.mx` de `ORIGENES`.
- [ ] **F4 · Cliente.** Apagar los calendarios de Prospex cuando no queden
  reservas futuras hechas ahí.
- [ ] **F5 · Tú.** Para el workflow de GitHub: secretos `FTP_SERVER`,
  `FTP_USERNAME`, `FTP_PASSWORD` y variables `RESERVAS_API`, `SUPABASE_URL`,
  `SUPABASE_ANON_KEY` (y `FTP_DIR` si no es `public_html/`). Opcional:
  `GITHUB_TOKEN` y `GITHUB_REPO` en Supabase para el botón "Publicar sitio".
- [ ] **F6 · Tú.** En unas semanas, borrar la copia: `drop schema respaldo_prueba cascade;`
  y, si ya no hace falta, la base de datos del WordPress en hPanel.
- [ ] **F7 · Tú.** Primera semana: revisar en el panel los correos con error
  y en Stripe los webhooks fallidos.
- [ ] **F8 · Tú.** Search Console durante 4–6 semanas: "Páginas" (que
  `/estudio/` y `/foro/` estén indexadas y las URLs viejas salgan como
  redirección) y "Rendimiento" para la búsqueda "renta de foro audiovisual".
- [ ] **F9 · Claude (opcional).** Generar al compilar las secciones de las
  landings que hoy arma JavaScript, para que el texto venga en el HTML.
