// Offline-Fassung der Website: jede Seite als eigenständige HTML-Datei mit eingebetteten
// Skripten, Stylesheets, Schriften und Bildern. Läuft ohne Server per Doppelklick im Browser.
// Voraussetzung: npm run build. Aufruf: node scripts/einzeldateien.mjs [zielordner]
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const dist = 'dist';
const out = process.argv[2] || 'vorschau-offline';
fs.mkdirSync(out, { recursive: true });

// Quelle im Build → Dateiname der Offline-Fassung (alle in einem Ordner)
const seiten = {
  '/': 'index.html',
  '/unsere-leistungen': 'unsere-leistungen.html',
  '/unsere-leistungen/privat': 'unsere-leistungen-privat.html',
  '/unsere-leistungen/industrie-gewerbe': 'unsere-leistungen-industrie-gewerbe.html',
  '/unsere-leistungen/freiflaechen': 'unsere-leistungen-freiflaechen.html',
  '/unsere-leistungen/batteriespeicher': 'unsere-leistungen-batteriespeicher.html',
  '/referenzen': 'referenzen.html',
  '/karriere': 'karriere.html',
  '/ueber-uns': 'ueber-uns.html',
  '/kontakt': 'kontakt.html',
  '/impressum': 'impressum.html',
  '/datenschutz': 'datenschutz.html',
};
const quelle = (p) => (p === '/' ? 'index.html' : p.slice(1) + '.html');

const mime = {
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};
const cache = new Map();
const dataUrl = (p) => {
  if (!cache.has(p)) {
    const datei = path.join(dist, decodeURI(p));
    cache.set(p, `data:${mime[path.extname(p)]};base64,${fs.readFileSync(datei).toString('base64')}`);
  }
  return cache.get(p);
};
const assetPfad = /\/(?:fonts|brand|img)\/[^'")\s,]+|\/_astro\/[^'")\s,]+\.(?:webp|png|jpg|svg)|\/favicon-32\.png|\/apple-touch-icon\.png/;

// Fotos mit srcset: offline genügt eine Breite je Foto, sonst stünde jede Größe in der Datei.
// Gewählt wird die kleinste ab 1024 px, sonst die größte vorhandene.
const OFFLINE_BREITE = 1024;
const eineGroesse = (html) =>
  html.replace(/<img\b[^>]*\ssrcset="([^"]+)"[^>]*>/g, (tag, srcset) => {
    const kandidaten = srcset.split(',').map((t) => {
      const [url, w] = t.trim().split(/\s+/);
      return { url, w: parseInt(w, 10) };
    });
    const ab = kandidaten.filter((k) => k.w >= OFFLINE_BREITE).sort((a, b) => a.w - b.w);
    const wahl = ab[0] || kandidaten.sort((a, b) => b.w - a.w)[0];
    return tag
      .replace(/\ssrcset="[^"]*"/, '')
      .replace(/\ssizes="[^"]*"/, '')
      .replace(/\ssrc="[^"]*"/, ` src="${wahl.url}"`);
  });

// url(...) in CSS einbetten
const cssEinbetten = (css) =>
  css.replace(/url\((['"]?)(\/(?:fonts|brand|img)\/[^'")]+)\1\)/g, (_, q, p) => `url("${dataUrl(p)}")`);

// Prefetch-Skript von Astro ist offline ohne Nutzen und würde dort sogar tel:-Links vorladen
const istPrefetch = (code) => /prefetchAll|data-astro-prefetch/.test(code);

for (const [route, ziel] of Object.entries(seiten)) {
  let html = fs.readFileSync(path.join(dist, quelle(route)), 'utf8');

  // Stylesheets einbetten
  html = html.replace(/<link rel="stylesheet" href="(\/_astro\/[^"]+\.css)"[^>]*>/g, (_, href) => {
    const css = fs.readFileSync(path.join(dist, href), 'utf8');
    return `<style>${cssEinbetten(css)}</style>`;
  });
  html = html.replace(/<style([^>]*)>([\s\S]*?)<\/style>/g, (_, attr, css) => `<style${attr}>${cssEinbetten(css)}</style>`);

  // Schrift-Preloads entfallen, die Schriften stecken im CSS
  html = html.replace(/<link rel="preload"[^>]*as="font"[^>]*>/g, '');

  // Modul-Skripte einsammeln (extern und inline) und zu einem klassischen Bündel zusammenfassen
  const importe = [];
  let n = 0;
  const tmp = fs.mkdtempSync(path.join(out, '.tmp-'));
  html = html.replace(/<script type="module" src="(\/_astro\/[^"]+)"><\/script>/g, (_, src) => {
    const datei = path.resolve(dist + src);
    if (!istPrefetch(fs.readFileSync(datei, 'utf8'))) importe.push(datei);
    return '';
  });
  html = html.replace(/<script type="module">([\s\S]*?)<\/script>/g, (_, code) => {
    const datei = path.resolve(tmp, `inline-${n++}.js`);
    fs.writeFileSync(datei, code);
    importe.push(datei);
    return '';
  });

  if (importe.length) {
    const res = await build({
      stdin: { contents: importe.map((d) => `import ${JSON.stringify(d)};`).join('\n'), resolveDir: process.cwd(), loader: 'js' },
      bundle: true,
      format: 'iife',
      write: false,
      minify: true,
      target: 'es2020',
      logLevel: 'error',
    });
    const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
    html = html.replace('</body>', () => `<script>${js}</script></body>`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });

  // Bilder und Icons in Attributen einbetten
  html = eineGroesse(html);
  html = html.replace(/(src|srcset|href|content)="([^"]+)"/g, (m, attr, wert) => {
    if (attr === 'content' && !wert.startsWith('/')) return m;
    const treffer = wert.match(assetPfad);
    if (treffer && treffer[0] === wert) return `${attr}="${dataUrl(wert)}"`;
    return m;
  });

  // Interne Links auf die Offline-Dateien umstellen
  html = html.replace(/href="(\/[^"#?]*)(#[^"]*)?"/g, (m, p, hash = '') => {
    const key = p.replace(/\/$/, '') || '/';
    return seiten[key] ? `href="${seiten[key]}${hash}"` : m;
  });
  // ohne Server kein Sendeversuch: das Formular bietet gleich die vorbereitete E-Mail an
  html = html.replace('action="/kontakt-senden.php"', 'action="kontakt-senden.php" data-ohne-versand');

  fs.writeFileSync(path.join(out, ziel), html);
  console.log(`${ziel}  ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
}

fs.writeFileSync(
  path.join(out, 'LIES-MICH.txt'),
  [
    'ip³ Energietechnik GmbH: Offline-Vorschau der neuen Website',
    '',
    'index.html im Browser öffnen (Chrome, Edge, Safari oder Firefox).',
    'Alle Seiten liegen in diesem Ordner und sind untereinander verlinkt.',
    '',
    'Hinweis: Das Kontaktformular braucht einen Webserver mit PHP. In dieser Offline-Fassung',
    'zeigt es deshalb den Hinweis mit der vorbereiteten E-Mail statt eines Versands.',
    '',
  ].join('\n')
);
