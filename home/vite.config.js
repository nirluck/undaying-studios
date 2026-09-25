import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Home de Undying Studios: distribuidor entre el foro y el estudio.
// Mientras se prueba, se compila dentro del build principal en
// dist/home-test, así queda navegable en /home-test/ junto a la landing.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  build: {
    outDir: fileURLToPath(new URL('../dist/home-test', import.meta.url)),
    emptyOutDir: true,
    assetsInlineLimit: 4096,
    cssCodeSplit: false,
  },
  server: { host: true, port: Number(process.env.PORT) || 5175, strictPort: false },
});
