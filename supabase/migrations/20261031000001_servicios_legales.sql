-- =====================================================================
-- Servicios legales del estudio (hoja "Redacción Comercial de Productos
-- Legales para la Web" del cliente).
--
-- Se venden por pieza, con o sin horas de estudio. `precio` es el precio
-- suelto y `precio_con_reserva` el de paquete, que aplica cuando el pedido
-- trae horas. Generan un trabajo para darle seguimiento a la entrega.
-- =====================================================================

-- En una instalación nueva el catálogo todavía no existe aquí (lo carga
-- seed.sql, que ya trae estos servicios); solo se agregan a bases en uso.
insert into productos (id, espacio_id, nombre, descripcion, precio, precio_con_reserva, unidad, requiere_sesion, max_por_sesion, max_cantidad, revisiones, entrega_dias, genera_trabajo, tarea, campos, orden)
select v.id, 'estudio', v.nombre, v.descripcion, v.precio, v.con_reserva, 'pieza', false, null, 10, 0, null, true, null, '[]', v.orden
from (values
  ('legal-split', 'Split Sheet (Acuerdo de Coautoría)', 'Identificación de participantes, porcentajes de autoría y titularidad de regalías.', 1100, 800, 21),
  ('legal-registro-obra', 'Registro de Obra Musical & Fonograma', 'Protección jurídica ante INDAUTOR para determinar la propiedad de la canción y el máster audio/podcast.', 2000, 1700, 22),
  ('legal-produccion', 'Contrato de Producción Musical', 'Estipulación formal de derechos, obligaciones, regalías y créditos del productor.', 4200, 3800, 23),
  ('legal-musico', 'Contrato para Músico de Sesión', 'Cesión formal de derechos de ejecución para instrumentistas contratados en la grabación.', 4200, 3800, 24),
  ('legal-locucion', 'Contrato de Locución', 'Regulación de la prestación de servicio vocal y cesión de derechos de uso comercial de la voz.', 4200, 3800, 25),
  ('legal-encargo', 'Contrato de Obra por Encargo', 'Encomienda formal para creación de jingles o música por encargo con transferencia total de titularidad.', 4200, 3800, 26),
  ('legal-agrupacion', 'Acuerdo Interno de Agrupación Musical', 'Reglas claras entre integrantes de la banda: titularidad del nombre, ingresos, salidas y obligaciones.', 6800, 6200, 27),
  ('legal-marca', 'Registro de Marca (IMPI)', 'Registro de marca artística o comercial para proteger el nombre del proyecto o solista (incluye derechos).', 6800, 6200, 28),
  ('legal-samples', 'Acuerdo de Liquidación de Samples', 'Licenciamiento y autorización legal para el uso de fragmentos de obras preexistentes.', 7900, 7200, 29),
  ('legal-imagen', 'Release de Imagen', 'Autorización formal para captar, utilizar y difundir el rostro/figura en fotos y videoclips.', 1100, 800, 30)
) as v(id, nombre, descripcion, precio, con_reserva, orden)
where exists (select 1 from espacios where id = 'estudio')
on conflict (id) do nothing;
