import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// Home de Undying Studios → raíz del dominio (undyingstudios.mx/).
// Se compila primero y limpia dist/; después el estudio y el foro se
// compilan dentro de dist/estudio y dist/foro. home/public lleva los
// archivos de la raíz del servidor: .htaccess, robots.txt, sitemap.xml,
// 404.html, íconos y manifest. El aviso de privacidad vive en la raíz.
export default defineConfig({
  root: here('.'),
  base: './',
  build: {
    outDir: here('../dist'),
    emptyOutDir: true,
    assetsInlineLimit: 4096,
    rollupOptions: { input: { main: here('index.html'), privacidad: here('aviso-de-privacidad/index.html') } },
  },
  server: { host: true, port: Number(process.env.PORT) || 5175, strictPort: false },
  // `npm run preview` sirve dist/ completo, con las tres páginas.
  preview: { port: 4173 },
});
