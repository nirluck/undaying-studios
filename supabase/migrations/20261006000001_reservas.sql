-- =====================================================================
-- Sistema de reservas de Undying Studios
-- Catálogo, calendario, pedidos, pagos, postproducción y correos.
--
-- Todo el acceso pasa por la Edge Function `api`, que se conecta directo
-- a Postgres. Por eso las tablas tienen RLS activo y ninguna política:
-- las llaves anon y authenticated de Supabase no pueden leer ni escribir.
-- =====================================================================

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- Configuración
-- ---------------------------------------------------------------------

-- Ajustes generales: datos del negocio, avisos al equipo, calendario ICS.
create table ajustes (
  clave text primary key,
  valor jsonb not null,
  actualizado timestamptz not null default now()
);

-- Espacios que se rentan por tiempo (Estudio A, Foro) y los que solo se
-- bloquean (Estudio B). Las reglas de calendario, pago y cancelación son
-- por espacio y se editan desde el panel.
create table espacios (
  id text primary key,
  nombre text not null,
  nombre_corto text not null,
  zona_horaria text not null default 'America/Mexico_City',
  reservable boolean not null default true,
  margen_min int not null default 60 check (margen_min >= 0),
  paso_min int not null default 60 check (paso_min between 5 and 240),
  anticipacion_h int not null default 24 check (anticipacion_h >= 0),
  horizonte_dias int not null default 180 check (horizonte_dias > 0),
  aforo int,
  varias_sesiones boolean not null default true,
  visitas jsonb not null default '{"activas": true, "duracion_min": 30, "paso_min": 30, "anticipacion_h": 24}',
  politica jsonb not null default '{"cambio_h": 72, "cancelacion_h": 72, "antes": "credito", "despues": "nada", "credito_dias": 90}',
  pago jsonb not null default '{"apartado_min": 35, "oxxo": {"activo": true, "dias_min": 3, "vigencia_dias": 1, "monto_max": 10000}, "msi": {"activo": false, "monto_min": 3000}}',
  documentos jsonb not null default '{}',
  orden int not null default 0,
  activo boolean not null default true
);

-- Horario semanal. Los minutos cuentan desde las 00:00 del día; cierra_min
-- puede pasar de 1440 para sesiones que terminan después de medianoche.
create table horarios (
  id bigint generated always as identity primary key,
  espacio_id text not null references espacios on delete cascade,
  dia smallint not null check (dia between 0 and 6), -- 0 = domingo
  abre_min int not null check (abre_min between 0 and 1439),
  cierra_min int not null check (cierra_min <= 2880),
  check (cierra_min > abre_min)
);
create index on horarios (espacio_id, dia);

-- Días con horario distinto: festivos, cierres, horarios especiales.
create table excepciones (
  id bigint generated always as identity primary key,
  espacio_id text not null references espacios on delete cascade,
  fecha date not null,
  cerrado boolean not null default true,
  ventanas jsonb not null default '[]', -- [{"abre": 600, "cierra": 1080}]
  nota text,
  unique (espacio_id, fecha)
);

-- Modalidades de precio: con ingeniero, Dry Hire, única (foro).
create table modalidades (
  id text primary key,
  espacio_id text not null references espacios on delete cascade,
  nombre text not null,
  nota text,
  descripcion_corta text,
  ventajas jsonb not null default '[]',
  tarea text, -- tarea que genera al venderse, p. ej. asignar_ingeniero
  pide_ingeniero_cliente boolean not null default false,
  hora_extra numeric(10,2),
  hora_extra_nuevo numeric(10,2),
  hora_extra_desde timestamptz,
  orden int not null default 0,
  activo boolean not null default true
);

create table bloques (
  id text primary key,
  espacio_id text not null references espacios on delete cascade,
  horas numeric(4,1) not null check (horas > 0),
  etiqueta text,
  frase text,
  destacado boolean not null default false,
  orden int not null default 0,
  activo boolean not null default true
);

-- Precio de cada bloque por modalidad. precio_nuevo entra en vigor en
-- precio_nuevo_desde; así se programan cambios de tarifa.
create table precios_bloque (
  bloque_id text not null references bloques on delete cascade,
  modalidad_id text not null references modalidades on delete cascade,
  precio numeric(10,2) not null check (precio >= 0),
  precio_nuevo numeric(10,2),
  precio_nuevo_desde timestamptz,
  primary key (bloque_id, modalidad_id)
);

-- Extras de una sesión. precio null = se cotiza (el pedido no se paga en
-- línea). Los días de bloqueo apartan el espacio antes o después de la
-- sesión (pintura del ciclorama).
create table extras (
  id text primary key,
  espacio_id text not null references espacios on delete cascade,
  nombre text not null,
  descripcion text,
  precio numeric(10,2),
  precio_nuevo numeric(10,2),
  precio_nuevo_desde timestamptz,
  anticipacion_dias int not null default 0,
  bloqueo_antes_dias int not null default 0,
  bloqueo_despues_dias int not null default 0,
  bloques text[], -- null = todos los bloques del espacio
  opciones jsonb not null default '[]', -- [{"id","nombre","muestra","pide_texto"}]
  una_vez_por_racha boolean not null default false,
  tarea text,
  orden int not null default 0,
  activo boolean not null default true
);

-- Productos con precio fijo que no ocupan calendario (postproducción,
-- productor, músico de sesión).
create table productos (
  id text primary key,
  espacio_id text not null references espacios on delete cascade,
  nombre text not null,
  descripcion text,
  precio numeric(10,2),
  precio_nuevo numeric(10,2),
  precio_nuevo_desde timestamptz,
  -- Precio cuando el pedido incluye horas de estudio (paquete con reserva).
  -- Vacío = el mismo precio.
  precio_con_reserva numeric(10,2) check (precio_con_reserva >= 0),
  unidad text not null default 'cancion' check (unidad in ('cancion', 'sesion', 'pieza')),
  requiere_sesion boolean not null default false,
  max_por_sesion int,
  max_cantidad int not null default 20,
  revisiones int not null default 0,
  precio_revision numeric(10,2),
  entrega_dias int, -- días hábiles desde que llega el material
  genera_trabajo boolean not null default true,
  tarea text,
  campos jsonb not null default '[]', -- datos por unidad: [{"id","etiqueta","al_reservar"}]
  orden int not null default 0,
  activo boolean not null default true
);

-- Combinaciones sugeridas del cotizador.
create table paquetes (
  id text primary key,
  espacio_id text not null references espacios on delete cascade,
  nombre text not null,
  descripcion text,
  bloque_id text references bloques on delete set null,
  modalidad_id text references modalidades on delete set null,
  productos jsonb not null default '{}', -- {"mezcla": 1}
  orden int not null default 0,
  activo boolean not null default true
);

-- Cargos que se agregan después de la sesión. precio null = monto libre.
create table tipos_cargo (
  id text primary key,
  espacio_id text references espacios on delete cascade,
  nombre text not null,
  precio numeric(10,2),
  orden int not null default 0,
  activo boolean not null default true
);

create table cupones (
  codigo text primary key check (codigo = upper(codigo)),
  descripcion text,
  tipo text not null check (tipo in ('porcentaje', 'monto')),
  valor numeric(10,2) not null check (valor > 0),
  espacio_id text references espacios on delete cascade,
  desde timestamptz,
  hasta timestamptz,
  usos_max int,
  usos int not null default 0,
  activo boolean not null default true
);

-- ---------------------------------------------------------------------
-- Clientes, pedidos y calendario
-- ---------------------------------------------------------------------

create table clientes (
  id uuid primary key default gen_random_uuid(),
  correo text not null unique check (correo = lower(correo)),
  nombre text not null,
  telefono text,
  empresa text,
  datos_fiscales jsonb,
  -- Finalidades secundarias del aviso de privacidad (promociones y
  -- boletines): opcional y aparte de la aceptación de los términos.
  acepta_promociones boolean not null default false,
  promociones_fecha timestamptz,
  notas text,
  creado timestamptz not null default now()
);

create sequence pedido_numero start 1001;

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique default ('UND-' || nextval('pedido_numero')),
  espacio_id text not null references espacios,
  cliente_id uuid not null references clientes,
  estado text not null check (estado in ('apartado', 'pendiente_pago', 'pagado', 'completado', 'vencido', 'cancelado')),
  origen text not null default 'web' check (origen in ('web', 'panel')),
  total numeric(10,2) not null,
  iva numeric(10,2) not null,
  datos jsonb not null default '{}',          -- proyecto, ingeniero del cliente, factura
  consentimiento jsonb,                        -- documentos aceptados, versión y fecha
  carrito jsonb not null,                      -- lo que pidió el cliente, tal cual
  apartado_vence timestamptz,
  cupon text,
  notas_internas text,
  stripe_sesion text,
  pagado_en timestamptz,
  cancelado_en timestamptz,
  cancelacion jsonb,
  creado_por text,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index on pedidos (cliente_id);
create index on pedidos (estado);

create table sesiones (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos on delete cascade,
  espacio_id text not null references espacios,
  bloque_id text references bloques,
  modalidad_id text references modalidades,
  indice int not null default 0,
  inicio timestamptz not null,
  fin timestamptz not null,
  estado text not null default 'activa' check (estado in ('activa', 'cancelada', 'no_presentado')),
  extras jsonb not null default '[]',          -- [{"id","opcion","texto"}]
  ingeniero_asignado text,
  ingeniero_cliente jsonb,
  conflicto boolean not null default false,    -- pago tardío sin horario
  notas text,
  check (fin > inicio)
);
create index on sesiones (pedido_id);
create index on sesiones (inicio);

-- Todo lo que ocupa un espacio vive aquí. La restricción de exclusión
-- impide que dos rangos del mismo espacio se encimen, aunque dos personas
-- paguen al mismo tiempo. `vence` no nulo = apartado temporal.
create table ocupacion (
  id uuid primary key default gen_random_uuid(),
  espacio_id text not null references espacios,
  rango tstzrange not null,
  tipo text not null check (tipo in ('sesion', 'pintura', 'bloqueo', 'visita')),
  pedido_id uuid references pedidos on delete cascade,
  sesion_id uuid references sesiones on delete cascade,
  visita_id uuid,
  vence timestamptz,
  nota text,
  creado_por text,
  creado timestamptz not null default now(),
  constraint ocupacion_sin_empalmes exclude using gist (espacio_id with =, rango with &&)
);
create index on ocupacion (pedido_id);
create index on ocupacion (vence) where vence is not null;

create table lineas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos on delete cascade,
  sesion_id uuid references sesiones on delete set null,
  tipo text not null check (tipo in ('sesion', 'extra', 'producto', 'hora_extra', 'cargo', 'personalizado', 'descuento', 'credito')),
  ref text,
  concepto text not null,
  cantidad numeric(10,2) not null default 1,
  precio_unitario numeric(10,2) not null,
  importe numeric(10,2) not null,
  datos jsonb not null default '{}',
  orden int not null default 0,
  creado_por text,
  creado timestamptz not null default now()
);
create index on lineas (pedido_id);

create table pagos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos on delete cascade,
  tipo text not null default 'cobro' check (tipo in ('cobro', 'reembolso')),
  metodo text not null check (metodo in ('tarjeta', 'oxxo', 'stripe', 'transferencia', 'efectivo', 'credito')),
  monto numeric(10,2) not null check (monto >= 0),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado', 'fallido')),
  stripe_sesion text,
  stripe_pago text,
  oxxo jsonb,                                  -- vence, enlace de la ficha
  referencia text,
  registrado_por text,
  creado timestamptz not null default now(),
  confirmado timestamptz
);
create index on pagos (pedido_id);
create unique index pagos_stripe_sesion on pagos (stripe_sesion) where stripe_sesion is not null;

create table creditos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes,
  monto numeric(10,2) not null check (monto > 0),
  saldo numeric(10,2) not null check (saldo >= 0),
  vence timestamptz not null,
  pedido_origen uuid references pedidos on delete set null,
  nota text,
  creado_por text,
  creado timestamptz not null default now()
);
create index on creditos (cliente_id);

create table credito_usos (
  id uuid primary key default gen_random_uuid(),
  credito_id uuid not null references creditos on delete cascade,
  pedido_id uuid not null references pedidos on delete cascade,
  monto numeric(10,2) not null,
  estado text not null default 'reservado' check (estado in ('reservado', 'aplicado', 'liberado')),
  creado timestamptz not null default now()
);

-- Postproducción: una fila por unidad vendida (una mezcla de una canción).
create table trabajos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos on delete cascade,
  linea_id uuid references lineas on delete set null,
  producto_id text references productos,
  unidad int not null default 1,
  titulo text,
  estado text not null default 'esperando_material' check (estado in ('esperando_material', 'en_cola', 'en_proceso', 'entregado', 'en_revision', 'aprobado', 'cancelado')),
  encargado text,
  material_url text,
  referencias text,
  notas_cliente text,
  entrega_url text,
  revisiones_incluidas int not null default 0,
  revisiones_usadas int not null default 0,
  fecha_entrega date,
  material_en timestamptz,
  entregado_en timestamptz,
  aprobado_en timestamptz,
  notas text,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index on trabajos (estado);
create index on trabajos (pedido_id);

-- Pendientes del equipo: asignar ingeniero, confirmar productor, pintar.
create table tareas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos on delete cascade,
  sesion_id uuid references sesiones on delete cascade,
  tipo text not null,
  detalle text not null,
  vence timestamptz,
  hecha_en timestamptz,
  hecha_por text,
  nota text,
  creado timestamptz not null default now()
);
create index on tareas (hecha_en);

create table invitados (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references sesiones on delete cascade,
  nombre text not null,
  creado timestamptz not null default now()
);

create table visitas (
  id uuid primary key default gen_random_uuid(),
  espacio_id text not null references espacios,
  inicio timestamptz not null,
  fin timestamptz not null,
  nombre text not null,
  correo text not null,
  telefono text,
  notas text,
  estado text not null default 'agendada' check (estado in ('agendada', 'cancelada', 'realizada', 'no_asistio')),
  creado timestamptz not null default now()
);
alter table ocupacion add foreign key (visita_id) references visitas on delete cascade;

-- Proyectos a la medida y pedidos con algo "se cotiza".
create table solicitudes (
  id uuid primary key default gen_random_uuid(),
  espacio_id text references espacios,
  nombre text not null,
  correo text not null,
  telefono text,
  descripcion text not null,
  carrito jsonb,
  estado text not null default 'nueva' check (estado in ('nueva', 'en_proceso', 'convertida', 'descartada')),
  pedido_id uuid references pedidos on delete set null,
  notas text,
  creado timestamptz not null default now()
);

-- Cotizaciones guardadas desde el cotizador para compartir.
create table cotizaciones (
  codigo text primary key,
  espacio_id text not null references espacios,
  carrito jsonb not null,
  total numeric(10,2),
  vistas int not null default 0,
  creado timestamptz not null default now()
);

-- Enlaces de acceso sin contraseña (Mis reservas, visitas). Se guarda solo
-- el hash del token.
create table accesos (
  token_hash text primary key,
  cliente_id uuid references clientes on delete cascade,
  visita_id uuid references visitas on delete cascade,
  vence timestamptz not null,
  creado timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Panel, correos y bitácora
-- ---------------------------------------------------------------------

create table usuarios (
  correo text primary key check (correo = lower(correo)),
  nombre text,
  rol text not null check (rol in ('admin', 'operacion', 'postproduccion')),
  activo boolean not null default true,
  creado timestamptz not null default now()
);

-- Textos editables de cada correo. El diseño y los bloques de datos
-- (resumen del pedido, botones) los arma el código.
create table plantillas_correo (
  id text primary key,
  asunto text not null,
  cuerpo text not null,
  activo boolean not null default true,
  actualizado timestamptz not null default now()
);

-- Registro de correos. `clave` evita mandar dos veces el mismo aviso.
create table correos (
  id uuid primary key default gen_random_uuid(),
  clave text unique,
  plantilla text not null,
  para text not null,
  asunto text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviado', 'simulado', 'error', 'omitido')),
  error text,
  pedido_id uuid references pedidos on delete set null,
  creado timestamptz not null default now()
);
create index on correos (pedido_id);

create table stripe_eventos (
  id text primary key,
  tipo text not null,
  recibido timestamptz not null default now()
);

create table bitacora (
  id bigint generated always as identity primary key,
  usuario text,
  accion text not null,
  entidad text not null,
  entidad_id text,
  detalle jsonb,
  creado timestamptz not null default now()
);
create index on bitacora (entidad, entidad_id);

-- ---------------------------------------------------------------------
-- Seguridad: nadie entra por PostgREST
-- ---------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon, authenticated;
    revoke all on all sequences in schema public from anon, authenticated;
  end if;
end $$;
