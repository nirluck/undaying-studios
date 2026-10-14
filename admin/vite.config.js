import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { envDir } from '../shared/vite/reservas.js';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// Panel de administración de reservas → undyingstudios.mx/admin/
// Se compila después del home, dentro de dist/admin.
export default defineConfig({
  root: here('.'),
  base: './',
  envDir,
  plugins: [svelte()],
  build: {
    outDir: here('../dist/admin'),
    emptyOutDir: true,
  },
  server: { host: true, port: Number(process.env.PORT) || 5177, strictPort: false },
});
