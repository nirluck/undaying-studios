import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Versión 01 archivada: landing con material de stock.
// Se compila dentro del build principal, en dist/version01, para poder
// abrirla en el sitio publicado (ej. undyingstudios.mx/estudio/version01/).
// base './' mantiene rutas relativas, así funciona en cualquier carpeta.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  build: {
    outDir: fileURLToPath(new URL('../dist/version01', import.meta.url)),
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
