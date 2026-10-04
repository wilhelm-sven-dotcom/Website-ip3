// Automatisierte Prüfung der gebauten Website im Browser.
// Voraussetzung: Vorschau läuft (npm run vorschau) auf http://127.0.0.1:8080
// Aufruf: node scripts/pruefen.mjs [baseUrl] [ausgabeordner]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] || 'http://127.0.0.1:8080';
const out = process.argv[3] || 'pruefung';
fs.mkdirSync(out, { recursive: true });

const seiten = [
  '/',
  '/unsere-leistungen',
  '/unsere-leistungen/privat',
  '/unsere-leistungen/industrie-gewerbe',
  '/unsere-leistungen/freiflaechen',
  '/unsere-leistungen/batteriespeicher',
  '/referenzen',
  '/ueber-uns',
  '/kontakt',
  '/impressum',
  '/datenschutz',
  '/gibt-es-nicht',
];
const viewports = [
  { name: 'mobil', width: 390, height: 844, mobile: true },
  { name: 'tablet', width: 820, height: 1180, mobile: true },
  { name: 'desktop', width: 1440, height: 900, mobile: false },
];
const gl = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

const ergebnisse = [];
const fehler = [];
const note = (ok, text) => {
  ergebnisse.push(`${ok ? 'OK  ' : 'FEHL'} ${text}`);
  if (!ok) fehler.push(text);
};

const browser = await chromium.launch({ args: gl });
const linkZiele = new Set();

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  });
  for (const pfad of seiten) {
    const page = await ctx.newPage();
    const logs = [];
    const kaputt = [];
    page.on('console', (m) => {
      const t = m.text();
      // die 404-Seite meldet ihren eigenen Status als Ressourcenfehler
      if (pfad === '/gibt-es-nicht' && t.includes('404')) return;
      if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${t}`);
    });
    page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
    page.on('response', (r) => {
      if (r.status() >= 400 && !r.url().includes('gibt-es-nicht')) kaputt.push(`${r.status()} ${r.url()}`);
    });
    const res = await page.goto(base + pfad, { waitUntil: 'load' });
    const erwartet = pfad === '/gibt-es-nicht' ? 404 : 200;
    note(res.status() === erwartet, `[${vp.name}] ${pfad} Status ${res.status()}`);
    await page.waitForTimeout(500);

    // einmal durchscrollen (Reveals, Lazy Loading)
    const hoehe = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < hoehe; y += Math.round(vp.height * 0.8)) {
      await page.evaluate((y) => window.scrollTo(0, y), y);
      await page.waitForTimeout(160);
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(2000);

    const pruef = await page.evaluate(() => {
      const de = document.documentElement;
      const overflow = de.scrollWidth - de.clientWidth;
      const breit = [...document.querySelectorAll('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 0 && r.right > de.clientWidth + 1 && cs.position !== 'fixed' && !el.closest('.zeichen, [aria-hidden="true"], .story__stage');
        })
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} → ${Math.round(el.getBoundingClientRect().right)}`);
      const h1 = document.querySelectorAll('h1').length;
      const ohneAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length;
      const links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
      const unsichtbar = [...document.querySelectorAll('[data-reveal]')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.height > 0 && parseFloat(getComputedStyle(el).opacity) < 0.05 && !el.closest('[hidden]');
      }).length;
      const titel = document.title;
      const desc = document.querySelector('meta[name="description"]')?.content || '';
      return { overflow, breit, h1, ohneAlt, links, unsichtbar, titel, desc };
    });
    note(pruef.overflow <= 1, `[${vp.name}] ${pfad} kein horizontaler Überlauf (${pruef.overflow}px) ${pruef.breit.join(' | ')}`);
    note(pruef.h1 === 1, `[${vp.name}] ${pfad} genau eine h1 (${pruef.h1})`);
    note(pruef.ohneAlt === 0, `[${vp.name}] ${pfad} alle Bilder mit alt (${pruef.ohneAlt} ohne)`);
    note(pruef.unsichtbar === 0, `[${vp.name}] ${pfad} keine hängenden Reveal-Elemente (${pruef.unsichtbar})`);
    note(!!pruef.titel && pruef.desc.length > 50, `[${vp.name}] ${pfad} Titel und Beschreibung`);
    note(kaputt.length === 0, `[${vp.name}] ${pfad} keine fehlerhaften Ressourcen ${kaputt.join(', ')}`);
    note(logs.length === 0, `[${vp.name}] ${pfad} Konsole sauber ${logs.join(' | ')}`);
    pruef.links.forEach((l) => {
      if (l.startsWith('/') && !l.startsWith('//')) linkZiele.add(l.split('#')[0] || '/');
    });

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    const datei = `${out}/${vp.name}${pfad === '/' ? '-start' : pfad.replaceAll('/', '-')}.png`;
    await page.screenshot({ path: datei });
    await page.close();
  }
  await ctx.close();
}

// Alle internen Linkziele erreichbar?
for (const ziel of linkZiele) {
  const r = await fetch(base + ziel, { redirect: 'manual' });
  note(r.status === 200, `Link ${ziel} → ${r.status}`);
}

fs.writeFileSync(`${out}/ergebnis.txt`, ergebnisse.join('\n') + '\n');
console.log(ergebnisse.filter((e) => e.startsWith('FEHL')).join('\n') || 'Keine Fehler.');
console.log(`${ergebnisse.length} Prüfungen, ${fehler.length} Fehler`);
await browser.close();
process.exit(fehler.length ? 1 : 0);
