import { defineConfig } from 'vite';

// Versión 01 archivada: landing con material de stock. base './' mantiene
// rutas relativas para poder servirla desde cualquier carpeta.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    host: true,
    port: Number(process.env.PORT) || 5174,
    strictPort: false,
  },
});
