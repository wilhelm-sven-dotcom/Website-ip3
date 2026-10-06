// Rundgang durch die mobile Fassung als Video: Startseite mit Inszenierung und Energiesystem, Menü,
// Referenzen mit Filter, weiteren Projekten und Projektseite, Monitoring mit Beispielauswertung,
// Über uns mit dem Verbund, Kontaktformular mit Versand. Bild für Bild mit angehaltener Seitenuhr
// aufgenommen, dadurch flüssig auch auf langsamen Rechnern. Entwicklungswerkzeug.
// Voraussetzung: Vorschau mit PHP läuft (npm run vorschau), für den Formularversand mit
// umgeleitetem sendmail (siehe README). Aufruf: node scripts/video-rundgang.mjs [basisUrl] [ausgabe.mp4]
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [basis = 'http://127.0.0.1:8080', out = 'rundgang.mp4'] = process.argv.slice(2);
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const fps = 30;
const dir = path.join(path.dirname(out), 'frames-' + path.basename(out, '.mp4'));
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const start = Date.now();
await page.clock.install({ time: start });
await page.clock.pauseAt(start + 1000);

let nr = 0;
async function bild(anzahl = 1) {
  for (let i = 0; i < anzahl; i++) {
    await page.clock.runFor(1000 / fps);
    await page.screenshot({ path: path.join(dir, `f${String(nr++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 86 });
    if (nr % 150 === 0) console.log(`${nr} Bilder`);
  }
}
const halten = (sek) => bild(Math.round(sek * fps));
const sanft = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const warten = async (bedingung, arg) => {
  for (let i = 0; i < 600; i++) {
    if (await page.evaluate(bedingung, arg)) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Zeitüberschreitung beim Warten');
};

// Scrollen ohne scroll-behavior: smooth, sonst liefe die Bewegung in Echtzeit statt im Bildtakt
async function scrollen(ziel, sek) {
  const von = await page.evaluate(() => scrollY);
  const n = Math.max(1, Math.round(sek * fps));
  for (let i = 1; i <= n; i++) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(von + (ziel - von) * sanft(i / n)));
    await bild();
  }
}
async function insBild(selektor, sek = 1.2, anteil = 0.55) {
  const y = await page.evaluate(([s, a]) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return scrollY + r.top + r.height / 2 - innerHeight * a;
  }, [selektor, anteil]);
  await scrollen(Math.max(0, Math.round(y)), sek);
}

// Fingerpunkt: zeigt im Video, wo getippt wird
async function punkt(x, y, phase) {
  await page.evaluate(([x, y, p]) => {
    let d = document.getElementById('__finger');
    if (!d) {
      d = document.createElement('div');
      d.id = '__finger';
      d.style.cssText = 'position:fixed;z-index:2147483647;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(255,255,255,.5);box-shadow:0 0 0 2px rgba(12,26,61,.45);pointer-events:none';
      document.documentElement.append(d);
    }
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    d.style.opacity = String(Math.max(0, 1 - p));
    d.style.transform = 'scale(' + (0.75 + 0.45 * p) + ')';
  }, [x, y, phase]);
}
async function tippen(selektor, { seitenwechsel = false } = {}) {
  const box = await page.locator(selektor).first().boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  for (let i = 0; i < 7; i++) {
    await punkt(x, y, 0);
    await bild();
  }
  if (seitenwechsel) {
    await Promise.all([page.waitForEvent('load'), page.touchscreen.tap(x, y)]);
  } else {
    await page.touchscreen.tap(x, y);
  }
  for (let i = 1; i <= 9; i++) {
    await punkt(x, y, i / 9);
    await bild();
  }
}
// Seitlich wischen in einem Bildstreifen, mit Fingerpunkt
async function wischenQuer(selektor, sek, anteil = 0.6) {
  const box = await page.locator(selektor).first().boundingBox();
  const y = box.y + box.height * 0.4;
  const x0 = box.x + box.width * 0.82;
  const weg = box.width * anteil;
  const von = await page.$eval(selektor, (el) => {
    el.style.scrollSnapType = 'none';
    return el.scrollLeft;
  });
  const n = Math.max(1, Math.round(sek * fps));
  for (let i = 0; i <= n; i++) {
    const t = sanft(i / n);
    await page.$eval(selektor, (el, l) => el.scrollTo({ left: l, behavior: 'instant' }), von + weg * t);
    await punkt(x0 - weg * t, y, i === n ? 1 : 0);
    await bild();
  }
  await page.$eval(selektor, (el) => (el.style.scrollSnapType = ''));
}
async function tippen2(selektor, text) {
  await tippen(selektor);
  for (let i = 0; i < text.length; i += 2) {
    await page.keyboard.type(text.slice(i, i + 2));
    await bild();
  }
  await halten(0.3);
}

// 1. Startseite mit Inszenierung Modul, Zelle, System
await page.goto(basis + '/', { waitUntil: 'load' });
await warten(() => /is-live|is-static/.test(document.querySelector('[data-story]').className));
await halten(1.6);
const vh = 844;
for (const [ziel, sek, pause] of [
  [1.2 * vh, 5, 1.2],
  [2.4 * vh, 5, 1.2],
  [3.5 * vh, 5, 1.6],
]) {
  await scrollen(ziel, sek);
  await halten(pause);
}
const storyEnde = await page.evaluate(() => {
  const s = document.querySelector('[data-story]');
  return s.offsetTop + s.offsetHeight - innerHeight * 0.15;
});
await scrollen(storyEnde, 2.5);
await halten(0.6);

// Rest der Startseite: Leistungen, Energiesystem, Projekte, Ablauf
await insBild('.svc', 2.2, 0.42);
await halten(1.1);
if (await page.evaluate(() => !!document.querySelector('[data-es-ebene]'))) {
  // Grafik einzeichnen lassen, Flüsse zeigen, Grünstromspeicher antippen, auf Abend springen
  await insBild('[data-es-ebene]', 2.2, 0.4);
  for (let i = 0; i < 240 && !(await page.evaluate(() => document.querySelector('[data-es-ebene]').classList.contains('is-gezeichnet'))); i++) await bild();
  await halten(2.6);
  await tippen('.es-marker[data-element="gruenspeicher"]');
  await halten(1.2);
  await insBild('[data-es-karte]', 1.4, 0.55);
  await halten(2.4);
  await insBild('.es__phasen', 1.2, 0.62);
  await tippen('.es__phase-taste[data-phase="abend"]');
  await halten(0.6);
  await insBild('[data-es-ebene]', 1.2, 0.42);
  await halten(3);
}
for (const selektor of ['.sheet', '#ablauf', '.partner__liste']) {
  await insBild(selektor, 2.2, 0.42);
  await halten(1.1);
}

// 2. Menü, Referenzen: Filter, weitere Projekte, Projektseite
await tippen('[data-menu-toggle]');
await halten(1.2);
await tippen('#mobile-menu a[href="/referenzen"]', { seitenwechsel: true });
await halten(1.4);
await insBild('[data-filter="frei"]', 1.8, 0.3);
await halten(0.5);
await tippen('[data-filter="frei"]');
await halten(1.2);
await scrollen((await page.evaluate(() => scrollY)) + 1.3 * vh, 2.4);
await halten(0.8);
await insBild('[data-filter="alle"]', 1.6, 0.3);
await tippen('[data-filter="alle"]');
await halten(0.6);
await insBild('[data-mehr]', 3.2, 0.6);
await halten(0.6);
await tippen('[data-mehr]');
await halten(1);
await scrollen((await page.evaluate(() => scrollY)) + 0.9 * vh, 1.8);
await halten(0.6);
await insBild('[data-tags]:nth-child(2) .kachel__link', 2.4, 0.5);
await tippen('[data-tags]:nth-child(2) .kachel__link', { seitenwechsel: true });
await halten(1.6);
await insBild('.projekt__daten', 1.8, 0.45);
await halten(2);

// 3. Monitoring: Messkette und Beispielauswertung
await tippen('[data-menu-toggle]');
await halten(1);
await tippen('#mobile-menu a[href="/unsere-leistungen/monitoring"]', { seitenwechsel: true });
await halten(1.8);
await insBild('.messkette', 2.4, 0.45);
await halten(1.4);
for (const selektor of ['#ea-begrenzung .ea-grafik', '#ea-potenzial .ea-grafik', '#ea-technik .ea-grafik', '#ea-entscheidung .ea-grafik']) {
  await insBild(selektor, 2.4, 0.45);
  await halten(1.6);
}

// 4. Über uns: Herkunft und Verbund mit ENMAG
await tippen('[data-menu-toggle]');
await halten(1);
await tippen('#mobile-menu a[href="/ueber-uns"]', { seitenwechsel: true });
await halten(1.2);
await insBild('.kette', 2.4, 0.45);
await halten(1.4);
for (const selektor of ['.verbund__title', '.partnerspalte--enmag', '.verbund__blatt']) {
  await insBild(selektor, 2.2, 0.45);
  await halten(1.4);
}

// 5. Kontakt: Formular ausfüllen und absenden
await tippen('[data-menu-toggle]');
await halten(1);
await tippen('#mobile-menu a[href="/kontakt"]', { seitenwechsel: true });
await halten(1.4);
await insBild('#cf-name', 2, 0.3);
await tippen2('#cf-name', 'Max Mustermann');
await tippen2('#cf-email', 'max@example.org');
await insBild('#cf-msg', 1.2, 0.4);
await tippen2('#cf-msg', 'Wir möchten Einspeisung und Abregelungen unseres Solarparks auswerten.');
await insBild('label.chip:has(input[value="Solarpark-Monitoring"])', 1, 0.45);
await tippen('label.chip:has(input[value="Solarpark-Monitoring"])');
await insBild('[data-submit]', 1.2, 0.62);
await tippen('input[name="datenschutz"]');
await halten(0.4);
await tippen('[data-submit]');
await warten(() => document.querySelector('[data-status]').textContent.length > 0);
await halten(0.5);
await insBild('[data-status]', 1, 0.5);
await halten(3);

await browser.close();
execFileSync(ffmpeg, ['-y', '-framerate', String(fps), '-i', path.join(dir, 'f%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-movflags', '+faststart', out], { stdio: 'ignore' });
console.log(`Video ${out}: ${nr} Bilder, ${(nr / fps).toFixed(1)} s`);
