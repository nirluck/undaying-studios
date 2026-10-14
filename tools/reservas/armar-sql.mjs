// Junta las migraciones y los datos iniciales en un solo archivo para pegarlo
// en el SQL Editor de Supabase: node tools/reservas/armar-sql.mjs
//
// Al final registra las migraciones como aplicadas, para que después
// `supabase db push` no intente correrlas otra vez.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../supabase/', import.meta.url));
const migraciones = readdirSync(raiz + 'migrations').filter((f) => f.endsWith('.sql')).sort();
const partes = [
  `-- =====================================================================
-- Sistema de reservas de Undying Studios: instalación completa
-- Generado con node tools/reservas/armar-sql.mjs. No se edita a mano: los
-- cambios van en supabase/migrations y supabase/seed.sql.
--
-- Cómo usarlo:
--   1. Supabase → Database → Extensions: activa pg_cron y pg_net.
--   2. Supabase → SQL Editor → New query: pega todo este archivo y Run.
--   3. Córrelo UNA sola vez en un proyecto vacío.
-- =====================================================================
`,
];
for (const f of migraciones) {
  partes.push(`\n-- ---------------------------------------------------------------------\n-- ${f}\n-- ---------------------------------------------------------------------\n${readFileSync(raiz + 'migrations/' + f, 'utf8')}`);
}
partes.push(`\n-- ---------------------------------------------------------------------\n-- seed.sql (catálogo inicial)\n-- ---------------------------------------------------------------------\nset search_path = public, extensions;\n${readFileSync(raiz + 'seed.sql', 'utf8')}`);
partes.push(`
-- ---------------------------------------------------------------------
-- Registro de migraciones para Supabase CLI
-- ---------------------------------------------------------------------
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
insert into supabase_migrations.schema_migrations (version, name) values
${migraciones.map((f) => { const [v, ...n] = f.replace('.sql', '').split('_'); return `  ('${v}', '${n.join('_')}')`; }).join(',\n')}
on conflict (version) do nothing;

-- Listo. Revisa en Table Editor que existan las tablas espacios, bloques,
-- productos y pedidos.
select 'Instalación completa' as resultado, (select count(*) from bloques) as bloques, (select count(*) from productos) as servicios;
`);
const salida = raiz + 'instalar-en-supabase.sql';
writeFileSync(salida, partes.join('\n'));
console.log('Escrito', salida);
