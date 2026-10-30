-- =====================================================================
-- Datos iniciales del sistema de reservas
-- Tomados de estudio/src/data.js, foro/src/data.js, los términos y
-- condiciones del estudio y del foro, y el aviso de privacidad (versión de
-- octubre de 2026). Todo se edita después desde el panel.
-- Las decisiones sobre lo que faltaba están en docs/sistema-de-reservas.md.
-- =====================================================================

insert into ajustes (clave, valor) values
('negocio', '{
  "nombre": "Undying Studios",
  "razon_social": "Undying Music Entertainment S.A.S. de C.V.",
  "correo": "music@undyingstudios.mx",
  "whatsapp": "5215517432034",
  "whatsapp_texto": "+52 55 1743 2034",
  "direccion": "Arrayanes 13, Lomas de San Mateo, 53200 Naucalpan de Juárez, Estado de México",
  "mapa": "https://maps.app.goo.gl/FoNYv6muSefCaJnA8",
  "sitio": "https://undyingstudios.mx",
  "llegada": "No hay estacionamiento privado. La descarga de equipo es directamente en la puerta y puedes estacionarte en la calle, dentro del circuito con acceso controlado."
}'),
('avisos', '{
  "correos_equipo": ["undyingstudios@gmail.com"],
  "hora_resumen": 20,
  "dia_resumen_semanal": 1,
  "recordatorios_h": [48, 24],
  "hora_gracias": 10,
  "material_recordatorios_dias": [3, 7],
  "auto_aprobar_dias": 14,
  "credito_aviso_dias": 15,
  "pintura_aviso_dias": 3,
  "resena_url": ""
}'),
('ics', jsonb_build_object('clave', replace(gen_random_uuid()::text, '-', '')));

-- ---------- Espacios ----------
-- Política de los términos de ambos espacios: no hay reembolsos por
-- cancelación del cliente; se reprograma sin penalización con 48 horas; con
-- menos de 24 horas se pierde el pago.
insert into espacios (id, nombre, nombre_corto, reservable, margen_min, paso_min, anticipacion_h, horizonte_dias, aforo, politica, documentos, orden) values
('estudio', 'Estudio de grabación (Estudio A)', 'Estudio', true, 60, 60, 24, 180, 8,
  '{"cambio_h": 48, "cancelacion_h": 24, "antes": "nada", "despues": "nada", "credito_dias": 90}',
  '{"terminos": "/estudio/terminos/", "privacidad": "/aviso-de-privacidad/", "version": "2026-10-13"}', 1),
('foro', 'Foro audiovisual', 'Foro', true, 60, 60, 24, 180, 25,
  '{"cambio_h": 48, "cancelacion_h": 24, "antes": "nada", "despues": "nada", "credito_dias": 90}',
  '{"terminos": "/foro/documentos/terminos-y-condiciones-foro.pdf", "reglamento": "/foro/documentos/reglamento-foro.pdf", "privacidad": "/aviso-de-privacidad/", "version": "2026-10-20"}', 2),
('estudio-b', 'Estudio Post (mezcla y máster)', 'Estudio Post', false, 0, 60, 0, 365, 4,
  '{"cambio_h": 48, "cancelacion_h": 24, "antes": "nada", "despues": "nada", "credito_dias": 90}', '{}', 3);

-- ---------- Horarios ----------
-- POR CONFIRMAR con el cliente. Estudio: lunes a domingo de 10:00 a 22:00
-- (el cliente dijo "por definir"). Foro: de 8:00 a 20:00, como el manual
-- técnico; la página dice 9 a.m. a 6 p.m., pero así el bloque de 12 horas no
-- cabría. Se ajusta en el panel (Horarios).
insert into horarios (espacio_id, dia, abre_min, cierra_min)
select 'estudio', d, 600, 1320 from generate_series(0, 6) d
union all
select 'foro', d, 480, 1200 from generate_series(0, 6) d
union all
select 'estudio-b', d, 600, 1320 from generate_series(0, 6) d;

-- ---------- Modalidades ----------
-- Hora extra: $500 por indicación del estudio (la guía del cliente decía
-- $900 con ingeniero y $700 Dry Hire). POR CONFIRMAR; se cambia en el panel.
insert into modalidades (id, espacio_id, nombre, nota, descripcion_corta, ventajas, tarea, pide_ingeniero_cliente, hora_extra, orden) values
('estudio-ing', 'estudio', 'Con ingeniero', 'Tarifa estándar', 'con ingeniero',
  '["Ingeniero de grabación incluido", "Live Room y Control Room", "Microfonía, preamps y backline del Estudio A", "Acceso a amenidades"]',
  'asignar_ingeniero', false, 500, 1),
('estudio-dry', 'estudio', 'Sin ingeniero', 'Modalidad Dry Hire', 'sin ingeniero (Dry Hire)',
  '["Tu ingeniero opera la sesión", "Inducción del setup y plantillas de Pro Tools y Ableton Live", "Asistencia de sala durante tu reserva", "Acceso a amenidades"]',
  null, true, 500, 2),
('foro-renta', 'foro', 'Renta del foro', null, '',
  '["Foro de 72 m²", "Ciclorama blanco de 6 × 6.5 × 3.5 m", "Equipo de iluminación y audio esencial", "Zona de tramoya con altura de 3.5 m", "Camerinos, sala de estar y terraza"]',
  null, false, 500, 1);

-- ---------- Bloques y precios ----------
insert into bloques (id, espacio_id, horas, etiqueta, frase, destacado, orden) values
('estudio-3h', 'estudio', 3, 'Tarifa base', 'Voces, overdubs o un episodio de podcast.', false, 1),
('estudio-6h', 'estudio', 6, 'Más popular', 'Varias canciones o una banda completa.', true, 2),
('estudio-9h', 'estudio', 9, 'Mejor tarifa', 'Un EP, una producción o una jornada larga.', false, 3),
('foro-3h', 'foro', 3, null, 'Una sesión de fotos o un episodio de podcast.', false, 1),
('foro-6h', 'foro', 6, null, 'Un videoclip corto o varias entrevistas.', true, 2),
('foro-12h', 'foro', 12, null, 'Jornada completa de rodaje.', false, 3);

insert into precios_bloque (bloque_id, modalidad_id, precio) values
('estudio-3h', 'estudio-ing', 2700), ('estudio-6h', 'estudio-ing', 4500), ('estudio-9h', 'estudio-ing', 5500),
('estudio-3h', 'estudio-dry', 2100), ('estudio-6h', 'estudio-dry', 3500), ('estudio-9h', 'estudio-dry', 4300),
('foro-3h', 'foro-renta', 2400), ('foro-6h', 'foro-renta', 3600), ('foro-12h', 'foro-renta', 6200);

-- ---------- Extras ----------
insert into extras (id, espacio_id, nombre, descripcion, precio, anticipacion_dias, bloqueo_antes_dias, bloqueo_despues_dias, bloques, opciones, una_vez_por_racha, tarea, orden) values
('foro-color', 'foro', 'Cambio de color del ciclorama',
  'Pintamos el ciclorama del color de tu producción. Solo en la jornada de 12 horas; se confirma con al menos 72 horas de anticipación y el foro se aparta los 2 días anteriores para pintar y secar.',
  5800, 3, 2, 0, '{foro-12h}',
  '[{"id": "verde", "nombre": "Verde croma", "muestra": "#2fd14a"}, {"id": "azul", "nombre": "Azul croma", "muestra": "#1f4fe0"}, {"id": "otro", "nombre": "Otro color", "muestra": null, "pide_texto": true, "ayuda": "Escribe el color: nombre, HEX o Pantone"}]',
  true, 'programar_pintura', 1),
('estudio-video', 'estudio', 'Equipo de video para podcast',
  'Cámaras e iluminación para grabar tu podcast en video. Se cotiza según el número de cámaras.',
  null, 0, 0, 0, null, '[]', false, null, 1);

-- ---------- Productos ----------
insert into productos (id, espacio_id, nombre, descripcion, precio, unidad, requiere_sesion, max_por_sesion, max_cantidad, revisiones, entrega_dias, genera_trabajo, tarea, campos, orden) values
('mezcla', 'estudio', 'Mezcla multitrack', 'Balance de niveles, limpieza de frecuencias, procesamiento y diseño espacial de pistas en formato estéreo. Incluye 2 revisiones.', 6900, 'cancion', false, null, 20, 2, 7, true, null, '[{"id": "titulo", "etiqueta": "Título de la canción"}]', 2),
('master', 'estudio', 'Máster por track', 'Optimización y nivelación comercial de tu mezcla estéreo para plataformas de streaming y medios físicos. Incluye 2 revisiones.', 3000, 'cancion', false, null, 20, 2, 3, true, null, '[{"id": "titulo", "etiqueta": "Título de la canción"}]', 3),
('edicion', 'estudio', 'Edición multitrack', 'Limpieza, alineación y cuantización rítmica para sesiones de hasta 24 tracks.', 4400, 'cancion', false, null, 20, 0, 5, true, null, '[{"id": "titulo", "etiqueta": "Título de la canción"}]', 1),
('vocal', 'estudio', 'Edición y afinación vocal', 'Comping, limpieza, alineación rítmica y afinación detallada de hasta 6 pistas de voz por canción.', 3800, 'cancion', false, null, 20, 0, 5, true, null, '[{"id": "titulo", "etiqueta": "Título de la canción"}]', 4),
('productor', 'estudio', 'Productor musical', 'Dirección artística, arreglos y producción musical durante la sesión de grabación.', 7000, 'sesion', true, 1, 20, 0, null, false, 'confirmar_productor', '[]', 5),
('musico', 'estudio', 'Músico de sesión', 'Músico profesional de nuestra red.', 2500, 'sesion', true, 6, 20, 0, null, false, 'confirmar_musico', '[{"id": "instrumento", "etiqueta": "Instrumento", "al_reservar": true}]', 6),
('musico-linea', 'estudio', 'Músico de sesión en línea', 'Un músico de nuestra red graba tu instrumento a distancia. Nos mandas tu canción y referencias, y te entregamos las pistas listas para mezclar. Incluye 1 revisión.', 2500, 'cancion', false, null, 20, 1, 7, true, 'confirmar_musico', '[{"id": "instrumento", "etiqueta": "Instrumento", "al_reservar": true}, {"id": "titulo", "etiqueta": "Título de la canción"}]', 7);

-- ---------- Paquetes sugeridos ----------
insert into paquetes (id, espacio_id, nombre, descripcion, bloque_id, modalidad_id, productos, orden) values
('banda', 'estudio', 'Banda', 'Grabación en vivo, edición, mezcla y máster.', 'estudio-6h', 'estudio-ing', '{"edicion": 1, "mezcla": 1, "master": 1}', 1),
('voz', 'estudio', 'Solista o voces', 'Voz sobre tu pista, afinación, mezcla y máster.', 'estudio-3h', 'estudio-ing', '{"vocal": 1, "mezcla": 1, "master": 1}', 2),
('produccion', 'estudio', 'Producción de un tema', 'Del demo a la canción terminada con nuestro productor.', 'estudio-9h', 'estudio-ing', '{"productor": 1, "edicion": 1, "vocal": 1, "mezcla": 1, "master": 1}', 3),
('podcast', 'estudio', 'Podcast o locución', 'Hasta 4 micrófonos, equipo de video e iluminación opcional, archivos el mismo día.', 'estudio-3h', 'estudio-ing', '{}', 4),
('dry', 'estudio', 'Productores e ingenieros', 'Modalidad Dry Hire: tu ingeniero opera la sesión.', 'estudio-6h', 'estudio-dry', '{}', 5);

-- ---------- Cargos posteriores ----------
insert into tipos_cargo (id, espacio_id, nombre, precio, orden) values
('foro-invitado', 'foro', 'Invitado sin registro', 100, 1),
('foro-limpieza', 'foro', 'Limpieza por basura no retirada', 200, 2),
('foro-pintura', 'foro', 'Pintura del ciclorama por daños', 2500, 3),
('danos', null, 'Daños a equipo o instalaciones', null, 4),
('otro', null, 'Otro cargo', null, 5);
