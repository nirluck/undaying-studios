/* Datos estructurados (JSON-LD) generados al compilar a partir de data.js.
   Así el teléfono, los precios, las reseñas y las preguntas frecuentes viven
   en un solo lugar y el marcado para Google nunca queda desactualizado. */

export const SITE = 'https://undyingstudios.mx';

export const ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: 'Arrayanes 13, Lomas de San Mateo',
  addressLocality: 'Naucalpan de Juárez',
  addressRegion: 'Estado de México',
  postalCode: '53200',
  addressCountry: 'MX',
};
export const GEO = { '@type': 'GeoCoordinates', latitude: 19.4954628, longitude: -99.2705957 };

export const phone = (n) => '+' + n.replace(/^521/, '52');

export const faqPage = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});

export const breadcrumb = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })),
});

/** Plugin de Vite: agrega los bloques JSON-LD al index.html principal. */
export function jsonLd(build) {
  return {
    name: 'undying-json-ld',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (ctx.path !== '/index.html') return html;
        const blocks = build().map((d) => `  <script type="application/ld+json">${JSON.stringify(d)}</script>`).join('\n');
        return html.replace('</head>', `${blocks}\n</head>`);
      },
    },
  };
}
