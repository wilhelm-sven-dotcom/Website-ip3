// Sitemap für Suchmaschinen, beim Build als statische Datei erzeugt. Seitenliste aus
// src/data/seiten.js; Projektseiten ohne Text bleiben draußen (noindex).
import { seiten } from '../data/seiten.js';

export function GET({ site }) {
  const heute = new Date().toISOString().slice(0, 10);
  const urls = seiten
    .filter((s) => s.index !== false)
    .map((s) => `  <url><loc>${new URL(s.pfad, site).href.replace(/\/$/, s.pfad === '/' ? '/' : '')}</loc><lastmod>${heute}</lastmod><priority>${s.prio}</priority></url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
