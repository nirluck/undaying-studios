import { defineConfig } from 'vite';

// base './' genera rutas relativas para que el build funcione en una
// subcarpeta (undyingstudios.mx/estudio) o en un subdominio sin cambios.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 4096, cssCodeSplit: false },
  server: { host: true, port: Number(process.env.PORT) || 5173, strictPort: false },
});
