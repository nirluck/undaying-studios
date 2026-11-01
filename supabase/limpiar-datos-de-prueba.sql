-- =====================================================================
--  Limpieza de datos de PRUEBA antes de abrir las reservas al público
--  Proyecto Supabase: kydkgqchbjrdfjyltwoq · SQL Editor
--
--  Se corre UNA vez, a mano, en tres pasos. Cada paso es una consulta
--  aparte en el SQL Editor (copia solo ese bloque y presiona Run).
--
--  Se borra: pedidos, sesiones, ocupación ligada a pedidos o visitas,
--  líneas, pagos, créditos, trabajos, tareas, invitados, visitas,
--  solicitudes, cotizaciones, accesos, correos, clientes, eventos de
--  Stripe y la bitácora de pedidos/clientes/visitas.
--
--  Se conserva: ajustes, espacios, horarios, excepciones, modalidades,
--  bloques, precios, extras, productos, paquetes, cargos, cupones,
--  usuarios del panel, plantillas de correo, los bloqueos puestos a mano
--  en el panel y la bitácora de cambios al catálogo. No toca Supabase
--  Auth (las cuentas para entrar al panel).
-- =====================================================================


-- ---------------------------------------------------------------------
--  PASO 1 · Revisar qué hay (solo lectura, no cambia nada)
-- ---------------------------------------------------------------------
select 'pedidos' as tabla, count(*) from pedidos
union all select 'sesiones', count(*) from sesiones
union all select 'ocupacion (de pedidos o visitas)', count(*) from ocupacion where tipo <> 'bloqueo' or pedido_id is not null or sesion_id is not null or visita_id is not null
union all select 'ocupacion (bloqueos a mano, se quedan)', count(*) from ocupacion where tipo = 'bloqueo' and pedido_id is null and sesion_id is null and visita_id is null
union all select 'lineas', count(*) from lineas
union all select 'pagos', count(*) from pagos
union all select 'creditos', count(*) from creditos
union all select 'credito_usos', count(*) from credito_usos
union all select 'trabajos', count(*) from trabajos
union all select 'tareas', count(*) from tareas
union all select 'invitados', count(*) from invitados
union all select 'visitas', count(*) from visitas
union all select 'solicitudes', count(*) from solicitudes
union all select 'cotizaciones', count(*) from cotizaciones
union all select 'accesos', count(*) from accesos
union all select 'correos', count(*) from correos
union all select 'clientes', count(*) from clientes
union all select 'stripe_eventos', count(*) from stripe_eventos
union all select 'bitacora (pedidos, clientes, visitas)', count(*) from bitacora where entidad in ('pedido', 'cliente', 'visita', 'solicitud', 'ocupacion')
union all select 'siguiente número de pedido', (select last_value + case when is_called then 1 else 0 end from pedido_numero);

-- Revisa también, una por una, antes de seguir:
--   select numero, estado, total, creado, stripe_sesion from pedidos order by creado;
--   select correo, nombre, creado from clientes order by creado;
--   select espacio_id, lower(rango) as inicio, upper(rango) as fin, nota, creado_por from ocupacion where tipo = 'bloqueo' and pedido_id is null order by inicio;
-- Si algún pedido o cliente es real (no de prueba), DETENTE y avisa.
-- Todas las sesiones de Stripe de prueba empiezan con cs_test_; un pedido
-- con stripe_sesion cs_live_ sería un cobro real.
--   select numero, stripe_sesion from pedidos where stripe_sesion like 'cs_live_%';


-- ---------------------------------------------------------------------
--  PASO 2 · Copia de seguridad dentro de la misma base
--  Crea el esquema respaldo_prueba con una copia de cada tabla que se va
--  a vaciar. No lo ve el sitio ni la API. Bórralo en unas semanas con:
--    drop schema respaldo_prueba cascade;
-- ---------------------------------------------------------------------
create schema if not exists respaldo_prueba;
create table respaldo_prueba.pedidos        as select * from pedidos;
create table respaldo_prueba.sesiones       as select * from sesiones;
create table respaldo_prueba.ocupacion      as select * from ocupacion;
create table respaldo_prueba.lineas         as select * from lineas;
create table respaldo_prueba.pagos          as select * from pagos;
create table respaldo_prueba.creditos       as select * from creditos;
create table respaldo_prueba.credito_usos   as select * from credito_usos;
create table respaldo_prueba.trabajos       as select * from trabajos;
create table respaldo_prueba.tareas         as select * from tareas;
create table respaldo_prueba.invitados      as select * from invitados;
create table respaldo_prueba.visitas        as select * from visitas;
create table respaldo_prueba.solicitudes    as select * from solicitudes;
create table respaldo_prueba.cotizaciones   as select * from cotizaciones;
create table respaldo_prueba.accesos        as select * from accesos;
create table respaldo_prueba.correos        as select * from correos;
create table respaldo_prueba.clientes       as select * from clientes;
create table respaldo_prueba.stripe_eventos as select * from stripe_eventos;
create table respaldo_prueba.bitacora       as select * from bitacora;
revoke all on schema respaldo_prueba from public;


-- ---------------------------------------------------------------------
--  PASO 3 · Borrar (irreversible salvo por el respaldo del paso 2)
--  Todo va en una transacción: si algo falla, no se borra nada.
-- ---------------------------------------------------------------------
begin;

delete from credito_usos;
delete from creditos;
delete from trabajos;
delete from tareas;
delete from invitados;
delete from lineas;
delete from pagos;
-- Ocupación de pedidos, pintura de ciclorama y visitas. Los bloqueos que
-- se pusieron a mano en el panel (por ejemplo, reservas de Prospex) se
-- quedan. Si también hay bloqueos de prueba, bórralos desde el panel.
delete from ocupacion where tipo <> 'bloqueo' or pedido_id is not null or sesion_id is not null or visita_id is not null;
delete from sesiones;
delete from correos;
delete from solicitudes;
delete from cotizaciones;
delete from accesos;
delete from visitas;
delete from pedidos;
delete from clientes;
delete from stripe_eventos;
delete from bitacora where entidad in ('pedido', 'cliente', 'visita', 'solicitud', 'ocupacion');

-- El primer pedido real vuelve a ser UND-1001.
alter sequence pedido_numero restart with 1001;

-- Comprobación: todo debe salir en 0.
select
  (select count(*) from pedidos)  as pedidos,
  (select count(*) from sesiones) as sesiones,
  (select count(*) from pagos)    as pagos,
  (select count(*) from clientes) as clientes,
  (select count(*) from correos)  as correos,
  (select count(*) from ocupacion where tipo <> 'bloqueo') as ocupacion;

commit;
