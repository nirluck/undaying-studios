-- =====================================================================
-- Tareas programadas: cada 5 minutos pg_cron llama a la ruta /tareas de
-- la API (libera apartados vencidos, manda recordatorios y resúmenes).
--
-- Antes de correr esto, activa pg_cron y pg_net en Supabase → Database →
-- Extensions. La URL y el secreto se guardan en Supabase Vault (ver
-- docs/reservas-puesta-en-marcha.md):
--   select vault.create_secret('https://<proyecto>.supabase.co/functions/v1/api', 'reservas_api_url');
--   select vault.create_secret('<mismo valor que TAREAS_SECRETO>', 'reservas_tareas_secreto');
--
-- Si las extensiones no están disponibles (entorno local de pruebas o aún
-- sin activar), avisa y no hace nada; se puede volver a correr después.
-- =====================================================================
do $outer$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then
    raise notice 'pg_cron o pg_net no disponibles: se omiten las tareas programadas';
    return;
  end if;

  begin
    create extension if not exists pg_cron;
    create extension if not exists pg_net;
  exception when others then
    raise notice 'Activa pg_cron y pg_net en Database → Extensions y vuelve a correr este archivo (%)', sqlerrm;
    return;
  end;

  perform cron.schedule(
    'reservas-tareas',
    '*/5 * * * *',
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'reservas_api_url') || '/tareas',
        headers := jsonb_build_object(
          'content-type', 'application/json',
          'x-tareas-secreto', (select decrypted_secret from vault.decrypted_secrets where name = 'reservas_tareas_secreto')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
      );
    $job$
  );
end
$outer$;
