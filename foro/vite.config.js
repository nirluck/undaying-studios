import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { cssEnDesarrollo } from '../shared/vite/css-dev.js';
import { jsonLd, faqPage, breadcrumb, phone, SITE, ADDRESS, GEO } from '../shared/vite/seo.js';
import { catalogoDelPanel, envDir } from '../shared/vite/reservas.js';
import { preciosForo } from '../shared/reservas/precios-landing.ts';
import { LINKS, PRICING, REVIEWS, AREA, FAQS } from './src/data.js';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const URL_FORO = `${SITE}/foro/`;
const prices = () => PRICING.blocks.map((b) => b.price);

// Datos estructurados del foro, generados desde src/data.js
const schema = () => [
  {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${URL_FORO}#foro`,
    name: 'Undying Studios · Foro audiovisual',
    legalName: LINKS.legalName,
    description: `Renta de foro de producción audiovisual de ${AREA} con ciclorama blanco en U, a 30 minutos del centro de la Ciudad de México.`,
    url: URL_FORO,
    image: `${SITE}/foro/og-foro.jpg`,
    telephone: phone(LINKS.whatsappNumber),
    email: LINKS.email,
    address: ADDRESS,
    geo: GEO,
    openingHours: 'Mo-Su 09:00-18:00',
    priceRange: `$${Math.min(...prices()).toLocaleString('es-MX')} - $${Math.max(...prices()).toLocaleString('es-MX')} MXN`,
    currenciesAccepted: 'MXN',
    aggregateRating: { '@type': 'AggregateRating', ratingValue: REVIEWS.score, reviewCount: REVIEWS.count, bestRating: '5' },
    sameAs: Object.values(LINKS.social),
    parentOrganization: { '@type': 'Organization', name: 'Undying Studios', url: `${SITE}/` },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Tarifas del foro',
      itemListElement: PRICING.blocks.map((b) => ({ '@type': 'Offer', name: `Renta del foro por ${b.hours} horas`, price: b.price, priceCurrency: 'MXN' })),
    },
  },
  breadcrumb([['Undying Studios', `${SITE}/`], ['Foro audiovisual', URL_FORO]]),
  faqPage(FAQS),
];

// Landing del foro audiovisual → undyingstudios.mx/foro/
// Con VITE_RESERVAS_API, el JSON-LD sale con los precios del panel.
export default defineConfig(async ({ mode }) => {
  const cat = await catalogoDelPanel('foro', mode);
  if (cat) preciosForo(PRICING, cat);
  return {
    envDir,
    root: here('.'),
    base: './',
    plugins: [jsonLd(schema), cssEnDesarrollo({
      '/index.html': ['shared/styles/base.css', 'shared/styles/components.css', 'foro/src/styles/foro.css'],
      '*': ['shared/styles/base.css', 'shared/styles/legal.css'],
    })],
    build: {
      outDir: here('../dist/foro'),
      emptyOutDir: true,
      assetsInlineLimit: 4096,
      rollupOptions: { input: { main: here('index.html') } },
    },
    server: { host: true, port: Number(process.env.PORT) || 5176, strictPort: false },
  };
});
