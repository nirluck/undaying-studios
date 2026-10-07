import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { jsonLd, faqPage, breadcrumb, phone, SITE, ADDRESS, GEO } from '../shared/vite/seo.js';
import { LINKS, PRICING, FAQS, REVIEWS } from './src/data.js';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const URL_ESTUDIO = `${SITE}/estudio/`;
const prices = PRICING.blocks.flatMap((b) => [b.price.ing, b.price.dry]);

// Datos estructurados del estudio, generados desde src/data.js
const schema = () => [
  {
    '@context': 'https://schema.org',
    '@type': 'RecordingStudio',
    '@id': `${URL_ESTUDIO}#estudio`,
    name: 'Undying Studios · Estudio de grabación',
    legalName: LINKS.legalName,
    description: 'Estudio de grabación en Naucalpan, a 30 minutos del centro de la CDMX. Live Room de 34 m², bloques con ingeniero incluido o Dry Hire, y mezcla y máster con equipo analógico boutique en el Estudio B.',
    url: URL_ESTUDIO,
    image: `${SITE}/estudio/og-estudio.jpg`,
    logo: `${SITE}/estudio/brand/monograma-blanco.svg`,
    telephone: phone(LINKS.whatsappNumber),
    email: LINKS.email,
    address: ADDRESS,
    geo: GEO,
    priceRange: `$${Math.min(...prices).toLocaleString('es-MX')} - $${Math.max(...prices).toLocaleString('es-MX')} MXN`,
    currenciesAccepted: 'MXN',
    aggregateRating: { '@type': 'AggregateRating', ratingValue: REVIEWS.score, reviewCount: REVIEWS.count, bestRating: '5' },
    sameAs: Object.values(LINKS.social),
    parentOrganization: { '@type': 'Organization', name: 'Undying Studios', url: `${SITE}/` },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Tarifas del estudio',
      itemListElement: [
        ...PRICING.blocks.flatMap((b) => Object.entries(PRICING.modes).map(([m, mode]) => ({
          '@type': 'Offer',
          name: `Sesión de ${b.hours} horas ${mode.label.toLowerCase()}`,
          price: b.price[m],
          priceCurrency: 'MXN',
        }))),
        ...PRICING.products.map((p) => ({ '@type': 'Offer', name: p.name, description: p.desc, price: p.price, priceCurrency: 'MXN' })),
      ],
    },
  },
  breadcrumb([['Undying Studios', `${SITE}/`], ['Estudio de grabación', URL_ESTUDIO]]),
  faqPage(FAQS),
];

// Landing del estudio de grabación → undyingstudios.mx/estudio/
// base './' deja rutas relativas: el build funciona en cualquier carpeta.
export default defineConfig({
  root: here('.'),
  base: './',
  plugins: [jsonLd(schema)],
  build: {
    outDir: here('../dist/estudio'),
    emptyOutDir: true,
    assetsInlineLimit: 4096,
    rollupOptions: { input: { main: here('index.html'), terminos: here('terminos/index.html') } },
  },
  server: { host: true, port: Number(process.env.PORT) || 5173, strictPort: false },
});
