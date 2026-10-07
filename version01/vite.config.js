import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Versión 01 archivada: landing con material de stock y precios de ejemplo.
// No forma parte del sitio de producción. `npm run build:v1` la compila
// aparte, en dist-archive/version01, por si se quiere revisar o publicar.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  build: {
    outDir: fileURLToPath(new URL('../dist-archive/version01', import.meta.url)),
    emptyOutDir: true,
    assetsInlineLimit: 4096,
    cssCodeSplit: false,
  },
  server: {
    host: true,
    port: Number(process.env.PORT) || 5174,
    strictPort: false,
  },
});
