// Sitemap für Suchmaschinen, beim Build als statische Datei erzeugt
const seiten = [
  { path: '/', prio: '1.0' },
  { path: '/unsere-leistungen', prio: '0.9' },
  { path: '/unsere-leistungen/privat', prio: '0.8' },
  { path: '/unsere-leistungen/industrie-gewerbe', prio: '0.8' },
  { path: '/unsere-leistungen/freiflaechen', prio: '0.8' },
  { path: '/unsere-leistungen/batteriespeicher', prio: '0.8' },
  { path: '/referenzen', prio: '0.8' },
  { path: '/karriere', prio: '0.6' },
  { path: '/ueber-uns', prio: '0.7' },
  { path: '/kontakt', prio: '0.7' },
  { path: '/impressum', prio: '0.2' },
  { path: '/datenschutz', prio: '0.2' },
  { path: '/efre-foerderhinweis', prio: '0.2' },
];

export function GET({ site }) {
  const heute = new Date().toISOString().slice(0, 10);
  const urls = seiten
    .map((s) => `  <url><loc>${new URL(s.path, site).href.replace(/\/$/, s.path === '/' ? '/' : '')}</loc><lastmod>${heute}</lastmod><priority>${s.prio}</priority></url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
