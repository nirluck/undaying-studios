// En desarrollo Vite inyecta el CSS desde JavaScript, así que al recargar se
// ve un instante el HTML sin estilos (el menú móvil abierto y listas sueltas).
// Este plugin, solo en `vite` (no en el build), agrega el mismo CSS como
// <link> en el <head> para que el navegador lo cargue antes de pintar. En el
// build no hace falta: Vite ya pone el CSS en el <head>.
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../', import.meta.url)).replace(/\\/g, '/');

/**
 * @param {Record<string, string[]>} paginas  ruta de la página → CSS (rutas desde la raíz del repo).
 *   La clave '*' se usa para las páginas que no están en la lista.
 */
export function cssEnDesarrollo(paginas) {
  return {
    name: 'css-en-desarrollo',
    apply: 'serve',
    transformIndexHtml(html, ctx) {
      const archivos = paginas[ctx.path] || paginas['*'] || [];
      const links = archivos.map((f) => `<link rel="stylesheet" href="/@fs/${raiz}${f}" />`).join('\n    ');
      return html.replace('</head>', `    ${links}\n  </head>`);
    },
  };
}
