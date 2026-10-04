import { defineConfig } from 'astro/config';

// Statischer Export. URLs ohne Schrägstrich am Ende wie auf der bisherigen Website
// (/ueber-uns, /unsere-leistungen/privat). Die Server-Regeln dafür liegen in public/.htaccess.
export default defineConfig({
  site: 'https://www.ip3-energie.de',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
  vite: {
    build: { assetsInlineLimit: 2048 },
  },
});
