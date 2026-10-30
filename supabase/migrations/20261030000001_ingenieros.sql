-- =====================================================================
-- Ingenieros en el panel y músico de sesión en línea
--
-- - Rol "ingeniero": entra al panel y ve solo sus sesiones y trabajos.
-- - A quién se asignó cada sesión y cada pieza de postproducción, por
--   correo de usuario (el nombre visible sigue en ingeniero_asignado y
--   encargado). Sirve para avisarle y para su calendario personal.
-- - Servicio "Músico de sesión en línea": graba a distancia y entrega las
--   pistas como una pieza de postproducción.
-- =====================================================================

alter table usuarios drop constraint if exists usuarios_rol_check;
alter table usuarios add constraint usuarios_rol_check check (rol in ('admin', 'operacion', 'postproduccion', 'ingeniero'));

alter table sesiones add column if not exists ingeniero_correo text;
alter table trabajos add column if not exists encargado_correo text;
create index if not exists sesiones_ingeniero_correo on sesiones (ingeniero_correo) where ingeniero_correo is not null;
create index if not exists trabajos_encargado_correo on trabajos (encargado_correo) where encargado_correo is not null;

-- En una instalación nueva el catálogo todavía no existe aquí (lo carga
-- seed.sql, que ya trae este servicio); solo se agrega a bases en uso.
insert into productos (id, espacio_id, nombre, descripcion, precio, unidad, requiere_sesion, max_por_sesion, max_cantidad, revisiones, entrega_dias, genera_trabajo, tarea, campos, orden)
select 'musico-linea', 'estudio', 'Músico de sesión en línea',
  'Un músico de nuestra red graba tu instrumento a distancia. Nos mandas tu canción y referencias, y te entregamos las pistas listas para mezclar. Incluye 1 revisión.',
  2500, 'cancion', false, null, 20, 1, 7, true, 'confirmar_musico',
  '[{"id": "instrumento", "etiqueta": "Instrumento", "al_reservar": true}, {"id": "titulo", "etiqueta": "Título de la canción"}]', 7
where exists (select 1 from espacios where id = 'estudio')
on conflict (id) do nothing;
