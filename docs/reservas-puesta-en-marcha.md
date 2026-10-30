# Reservas: puesta en marcha

Guía para activar el sistema de reservas propio (calendarios, cotizador,
pagos con Stripe, correos y panel). Mientras no se configure, el sitio sigue
funcionando como hoy, con WhatsApp y los calendarios de Prospex.

La propuesta funcional completa está en
[sistema-de-reservas.md](sistema-de-reservas.md).

## Qué hay en el repositorio

| Carpeta | Qué es |
|---|---|
| `supabase/migrations/` | Esquema de la base de datos (Postgres) y la tarea programada |
| `supabase/seed.sql` | Catálogo inicial: espacios, horarios, bloques, precios, extras, servicios, paquetes |
| `supabase/functions/api/` | Edge Function: toda la API (sitio, panel, Stripe, tareas) |
| `supabase/functions/_shared/core/` | Núcleo en TypeScript: precios, calendario y políticas. Lo usan la API, el sitio y el panel |
| `supabase/functions/_shared/server/` | Rutas, pedidos, pagos, correos, tareas programadas |
| `shared/reservas/` | Widget de reserva de las landings y página `/reservas/` (Mis reservas) |
| `admin/` | Panel de administración (Svelte), se publica en `/admin/` |
| `tools/reservas/` | Servidor local sin Docker y pruebas |

## Probar en local

No hace falta Docker ni cuenta de Supabase: la base de datos corre en
PGlite (Postgres en WebAssembly), Stripe y el correo están simulados.

```bash
npm install
```

1. Crea `.env.local` en la raíz con:

   ```
   VITE_RESERVAS_API=http://localhost:54321/api
   ```

2. Arranca la API local. Los datos quedan en `tools/reservas/.datos/`
   (bórrala para empezar de cero):

   ```bash
   npm run reservas:api
   ```

3. Compila y sirve el sitio:

   ```bash
   npm run build
   ```

   ```bash
   npm run preview
   ```

4. Abre `http://localhost:4173/estudio/`, reserva y paga en el checkout de
   prueba. Los correos se ven en `http://localhost:54321/api/dev/correos`.
5. El panel está en `http://localhost:4173/admin/`. En local se entra con
   `admin@undying.test`.

Antes de publicar, **borra `.env.local`** o déjalo vacío: si no, el build
apuntará a `localhost`.

Pruebas y revisión de tipos:

```bash
npm run test:reservas
```

```bash
npm run check:reservas
```

## Activar en producción

### 1. Supabase

**Opción sin terminal (SQL Editor).** Crea el proyecto (nombre
`undying-reservas`, región East US), activa `pg_cron` y `pg_net` en Database →
Extensions, y en SQL Editor → New query pega todo
`supabase/instalar-en-supabase.sql` y presiona Run, una sola vez. Ese archivo
se regenera con `npm run reservas:sql` cada vez que cambien las migraciones o
la semilla. Después sigue con el paso 2; la función se publica con
`npx supabase functions deploy api --use-api --no-verify-jwt`.

**Opción con GitHub Actions:**

1. Crea un proyecto en supabase.com (región: `us-east-1` o la más cercana
   disponible). Guarda la contraseña de la base de datos.
2. En GitHub → Settings → Secrets and variables → Actions:
   - secretos `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD`;
   - variable `SUPABASE_PROJECT_ID` (la referencia del proyecto).
3. GitHub → Actions → **Reservas: Supabase** → Run workflow, con "Cargar los
   datos iniciales" marcado **solo la primera vez**. Corre las pruebas, crea
   las tablas, carga el catálogo y publica la función `api`.
4. En Supabase → Authentication → URL Configuration:
   - Site URL: `https://undyingstudios.mx/admin/`
   - Redirect URLs: `https://undyingstudios.mx/admin/`
   - En Providers → Email, desactiva "Allow new users to sign up". Al panel
     solo entra quien se invita desde la sección Usuarios.

### 2. Secretos de la función

Supabase → Edge Functions → `api` → Secrets (o `supabase secrets set`):

| Secreto | Valor |
|---|---|
| `SITIO_URL` | `https://undyingstudios.mx` |
| `API_URL` | `https://<proyecto>.supabase.co/functions/v1/api` |
| `ORIGENES` | `https://undyingstudios.mx` |
| `ADMIN_CORREOS` | Correos que siempre entran como administradores, separados por coma |
| `STRIPE_SECRET_KEY` | Llave secreta de Stripe (`sk_live_…`; `sk_test_…` para probar) |
| `STRIPE_WEBHOOK_SECRET` | Del paso 3 (`whsec_…`) |
| `RESEND_API_KEY` | Del paso 4 |
| `CORREO_REMITENTE` | `Undying Studios <reservas@undyingstudios.mx>` |
| `TAREAS_SECRETO` | Una cadena larga al azar |
| `GITHUB_TOKEN` | Opcional: token con permiso `actions:write`, para el botón "Publicar sitio" del panel |
| `GITHUB_REPO` | Opcional: `nirluck/undaying-studios` |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y
`SUPABASE_DB_URL` los pone Supabase solo.

### 3. Stripe

1. En el panel de Stripe activa OXXO (Settings → Payment methods) y, si se
   quieren, los meses sin intereses.
2. Developers → Webhooks → Add endpoint:
   `https://<proyecto>.supabase.co/functions/v1/api/stripe/webhook`
   con los eventos:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `charge.dispute.created`
3. Copia el "Signing secret" a `STRIPE_WEBHOOK_SECRET`.

Conviene hacer primero todo el recorrido con las llaves de prueba
(`sk_test_…`, tarjeta `4242 4242 4242 4242`) y cambiarlas por las reales al
final.

### 4. Correo (Resend)

1. Crea la cuenta en resend.com y agrega el dominio `undyingstudios.mx`.
2. Copia los registros DNS (SPF, DKIM) en hPanel → Dominios → DNS. El correo
   que ya usan (`music@…`) no se afecta.
3. Crea una API key y ponla en `RESEND_API_KEY`.

Sin `RESEND_API_KEY` la función no manda correos (los registra como
"simulado" en el panel).

### 5. Tareas programadas

En Supabase → SQL Editor, una sola vez:

```sql
select vault.create_secret('https://<proyecto>.supabase.co/functions/v1/api', 'reservas_api_url');
select vault.create_secret('<el mismo valor de TAREAS_SECRETO>', 'reservas_tareas_secreto');
```

La migración ya programó la llamada cada 5 minutos (`pg_cron` y `pg_net`).
Si se aplicaron las migraciones antes de activar esas extensiones, vuelve a
correr el contenido de `supabase/migrations/20261006000002_tareas_programadas.sql`.

### 6. Sitio

En GitHub → Settings → Variables → Actions:

| Variable | Valor |
|---|---|
| `RESERVAS_API` | `https://<proyecto>.supabase.co/functions/v1/api` |
| `SUPABASE_URL` | `https://<proyecto>.supabase.co` |
| `SUPABASE_ANON_KEY` | La llave `anon` del proyecto |

Luego publica el sitio (Actions → **Publicar en Hostinger**). Desde ese
momento:

- los botones de reserva de las landings abren el widget propio;
- `/reservas/` es "Mis reservas";
- `/admin/` es el panel.

### 7. Panel

1. El primer administrador no existe todavía en Supabase Auth (el registro
   está cerrado): en Supabase → Authentication → Users → Add user → Create
   new user, con el correo de `ADMIN_CORREOS`, una contraseña y "Auto Confirm
   User". Después entra a `https://undyingstudios.mx/admin/` con ese correo y
   contraseña. A los demás se les invita desde la sección Usuarios del panel:
   entran la primera vez con el enlace del correo y ponen su contraseña en
   "Cambiar contraseña".
2. En **Usuarios**, invita al equipo con su rol.
3. Revisa **Reglas y políticas**, **Horarios** y **Precios y catálogo**. Los
   valores iniciales están en la sección "Decisiones tomadas" de la propuesta.
4. En **Ajustes**, pon el enlace para dejar reseña en Google y copia los
   calendarios ICS a Google Calendar del equipo.
5. Ingenieros y productores: dales el rol **Ingeniero** en Usuarios. Al
   escribir su nombre en "Ingeniero asignado", "Encargado" (postproducción) o
   "Quién lo atiende" (productor, músico), les llega el aviso con el archivo
   de calendario y lo ven en **Mi agenda**, que también trae su calendario
   personal para Google Calendar. El rol Ingeniero solo ve Mi agenda.

## Convivencia con Prospex

1. Antes de activar, registra en **Horarios y bloqueos** (o desde la agenda)
   las reservas futuras que ya existen en Prospex, para que nadie las empalme.
2. El foro sigue teniendo sus calendarios de Prospex en `foro/src/data.js`;
   con `RESERVAS_API` configurada, los botones abren el widget propio y esos
   enlaces dejan de usarse. Si hay que volver atrás, basta vaciar la variable
   y publicar.
3. Apaga los calendarios de Prospex cuando no queden reservas futuras hechas
   ahí.
