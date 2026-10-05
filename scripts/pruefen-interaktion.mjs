// Interaktionsprüfung: Tastatur, Menüs, Formular, Filter, Fallbacks der Inszenierung.
// Voraussetzung: Vorschau mit PHP läuft auf http://127.0.0.1:8080 (npm run vorschau),
// für den Formularversand mit umgeleitetem sendmail (siehe README).
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8080';
// Geschützte Testumgebung: PRUEF_LOGIN=benutzer:passwort
const [nutzer, ...pw] = (process.env.PRUEF_LOGIN || '').split(':');
const zugang = nutzer ? { httpCredentials: { username: nutzer, password: pw.join(':') } } : {};
const gl = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const ergebnisse = [];
const note = (ok, text) => ergebnisse.push(`${ok ? 'OK  ' : 'FEHL'} ${text}`);

const browser = await chromium.launch({ args: gl });

/* 1. Tastatur: Skip-Link und Mega-Menü (Desktop) */
{
  const page = await browser.newPage({ ...zugang, viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/ueber-uns', { waitUntil: 'load' });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(400);
  const skip = await page.evaluate(() => ({ cls: document.activeElement.className, top: document.activeElement.getBoundingClientRect().top }));
  note(skip.cls.includes('skip-link') && skip.top >= 0, 'Erster Tab-Stopp ist der sichtbare Skip-Link');
  await page.keyboard.press('Enter');
  note(await page.evaluate(() => document.activeElement.id === 'inhalt'), 'Skip-Link setzt den Fokus auf den Inhalt');

  await page.goto(base + '/', { waitUntil: 'load' });
  await page.focus('[data-sub-toggle]');
  await page.keyboard.press('Enter');
  note((await page.getAttribute('[data-sub-toggle]', 'aria-expanded')) === 'true', 'Untermenü Leistungen öffnet per Tastatur');
  await page.keyboard.press('Tab');
  const imPanel = await page.evaluate(() => !!document.activeElement.closest('[data-sub-panel]'));
  note(imPanel, 'Tab führt in das geöffnete Untermenü');
  await page.keyboard.press('Escape');
  note((await page.getAttribute('[data-sub-toggle]', 'aria-expanded')) === 'false', 'Escape schließt das Untermenü');
  const fokusSichtbar = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
  });
  note(fokusSichtbar, 'Fokusrahmen ist sichtbar');
  await page.close();
}

/* 2. Mobile-Menü */
{
  const ctx = await browser.newContext({ ...zugang, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(base + '/referenzen', { waitUntil: 'load' });
  await page.click('[data-menu-toggle]');
  await page.waitForTimeout(700);
  note(await page.isVisible('#mobile-menu'), 'Mobile-Menü öffnet');
  note((await page.getAttribute('[data-menu-toggle]', 'aria-expanded')) === 'true', 'Menü-Button meldet aria-expanded');
  const ziele = await page.$$eval('#mobile-menu a', (as) => as.map((a) => a.getBoundingClientRect().height));
  note(ziele.every((h) => h >= 44), `Touch-Ziele im Menü mindestens 44 px (${Math.min(...ziele).toFixed(0)} px)`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  note(!(await page.isVisible('#mobile-menu')), 'Escape schließt das Mobile-Menü');
  await ctx.close();
}

/* 3. Referenzfilter */
{
  const page = await browser.newPage({ ...zugang, viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/referenzen', { waitUntil: 'load' });
  await page.click('[data-filter="frei"]');
  const sichtbar = await page.$$eval('[data-tags]', (els) => els.filter((e) => !e.hidden).length);
  const zahl = await page.textContent('[data-count]');
  note(sichtbar === 4 && zahl === '4', `Filter Freifläche zeigt 4 Projekte (${sichtbar}, Zähler ${zahl})`);
  await page.click('[data-filter="alle"]');
  note((await page.$$eval('[data-tags]', (els) => els.filter((e) => !e.hidden).length)) === 18, 'Filter Alle zeigt 18 Projekte');
  await page.close();
}

/* 3b. Referenzfilter am Touchgerät: nachgerückte Planblätter werden beim Scrollen enthüllt */
{
  const ctx = await browser.newContext({ ...zugang, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(base + '/referenzen', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.tap('[data-filter="frei"]');
  await page.waitForTimeout(500);
  const platten = await page.$$('[data-tags]:not([hidden]) [data-clip]');
  let offen = 0;
  for (const platte of platten) {
    await platte.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForTimeout(1800);
    if (!(await platte.evaluate((el) => getComputedStyle(el).clipPath)).includes('100%')) offen++;
  }
  note(platten.length === 4 && offen === platten.length, `Filter am Touchgerät: Planblätter enthüllt (${offen} von ${platten.length})`);
  await ctx.close();
}

/* 4. Schaltbild: Legende hebt Positionen hervor */
{
  const page = await browser.newPage({ ...zugang, viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/unsere-leistungen', { waitUntil: 'load' });
  await page.hover('.legend__item[data-pos="4"]');
  const aktiv = await page.$$eval('.sld__svg--wide [data-pos="4"].is-active', (els) => els.length);
  note(aktiv >= 1, 'Legende hebt Position 4 im Schaltbild hervor');
  await page.close();
}

/* 5. Kontaktformular */
{
  const page = await browser.newPage({ ...zugang, viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/kontakt', { waitUntil: 'load' });
  await page.click('[data-submit]');
  const fehlerAnzahl = await page.$$eval('[aria-invalid="true"]', (els) => els.length);
  note(fehlerAnzahl === 4, `Leeres Absenden markiert 4 Pflichtfelder (${fehlerAnzahl})`);
  note(await page.evaluate(() => document.activeElement.id === 'cf-name'), 'Fokus springt auf das erste fehlerhafte Feld');

  // echter Versand über PHP (mindestens 3 s nach Seitenaufruf)
  await page.fill('#cf-name', 'Test Prüfung');
  await page.fill('#cf-email', 'pruefung@example.org');
  await page.fill('#cf-msg', 'Automatische Prüfung des Kontaktformulars.');
  await page.check('input[name="datenschutz"]');
  await page.check('input[value="Batteriespeicher"]', { force: true });
  await page.waitForTimeout(3200);
  await page.click('[data-submit]');
  await page.waitForFunction(() => document.querySelector('[data-status]').textContent.length > 0, null, { timeout: 15000 });
  const status = await page.textContent('[data-status]');
  note(status.includes('Vielen Dank'), `Versand über kontakt-senden.php bestätigt: "${status.trim().slice(0, 60)}"`);

  // Versand nicht möglich: kein simulierter Erfolg, sondern Hinweis mit E-Mail-Alternative
  await page.route('**/kontakt-senden.php', (route) => route.fulfill({ status: 404, body: 'not found' }));
  await page.fill('#cf-name', 'Test Fallback');
  await page.fill('#cf-email', 'fallback@example.org');
  await page.fill('#cf-msg', 'Server ohne PHP.');
  await page.check('input[name="datenschutz"]');
  await page.click('[data-submit]');
  await page.waitForSelector('[data-fallback]:not([hidden])', { timeout: 10000 });
  const mailto = await page.getAttribute('[data-mailto]', 'href');
  const statusFehler = await page.textContent('[data-status]');
  note(!statusFehler.includes('Vielen Dank') && mailto.startsWith('mailto:info@ip3-energie.de') && mailto.includes('Fallback'), 'Ohne Versand: Hinweis und vorbereitete E-Mail, keine Erfolgsmeldung');
  await page.close();
}

/* 6. Inszenierung: reduzierte Bewegung und fehlendes WebGL */
{
  const ctx = await browser.newContext({ ...zugang, viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const st = await page.evaluate(() => ({ cls: document.querySelector('.story').className, reason: document.querySelector('.story').dataset.staticReason }));
  note(st.cls.includes('is-static') && st.reason === 'reduced-motion', 'Reduzierte Bewegung: statische Bildfolge');
  const sichtbar = await page.evaluate(() => [...document.querySelectorAll('[data-reveal]')].every((el) => parseFloat(getComputedStyle(el).opacity) > 0.9 || !el.getClientRects().length));
  note(sichtbar, 'Reduzierte Bewegung: alle Inhalte sofort sichtbar');
  await ctx.close();
}
{
  const b2 = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  const page = await b2.newPage({ ...zugang, viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const st = await page.evaluate(() => ({ cls: document.querySelector('.story').className, reason: document.querySelector('.story').dataset.staticReason }));
  note(st.cls.includes('is-static') && st.reason === 'no-webgl', 'Ohne WebGL: statische Bildfolge');
  const bilder = await page.$$eval('.story__still img', (imgs) => imgs.filter((i) => i.complete && i.naturalWidth > 0).length);
  note(bilder >= 3, `Ohne WebGL: Standbilder geladen (${bilder})`);
  await b2.close();
}

/* 7. Inszenierung live: Leinwand aktiv, Text als HTML vorhanden */
{
  const page = await browser.newPage({ ...zugang, viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('.story.is-live'), null, { timeout: 60000 });
  const h = await page.evaluate(() => [...document.querySelectorAll('.story h1, .story h2')].map((e) => e.textContent.trim()));
  note(h.length === 4, `Inszenierung: Überschriften als HTML (${h.join(' | ')})`);
  note(await page.evaluate(() => document.querySelector('[data-story-canvas]').getAttribute('aria-hidden') === null && document.querySelector('[data-story-stage]').getAttribute('aria-hidden') === 'true'), 'Leinwand für Screenreader ausgeblendet');
  await page.close();
}

/* 8. Bildstrecke: Tasten, Stand, Tastatur, natürliches Scrollen der Seite */
{
  const page = await browser.newPage({ ...zugang, viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/unsere-leistungen/freiflaechen', { waitUntil: 'load' });
  await page.evaluate(() => document.querySelector('[data-galerie]').scrollIntoView());
  await page.waitForTimeout(600);
  const spur = '[data-galerie] [data-spur]';
  note(await page.isVisible('[data-galerie] [data-steuerung]'), 'Bildstrecke: Tasten mit JavaScript sichtbar');
  note((await page.getAttribute('[data-schritt="-1"]', 'aria-disabled')) === 'true', 'Bildstrecke: Zurück am Anfang gesperrt');
  await page.click('[data-schritt="1"]');
  await page.waitForTimeout(1200);
  const links = await page.$eval(spur, (el) => el.scrollLeft);
  const stand = await page.textContent('[data-stand]');
  note(links > 300 && stand !== '01', `Bildstrecke: Weiter blättert (${Math.round(links)} px, Stand ${stand})`);
  note((await page.getAttribute('[data-schritt="-1"]', 'aria-disabled')) === 'false', 'Bildstrecke: Zurück danach frei');
  await page.$eval(spur, (el) => el.scrollTo({ left: 0, behavior: 'instant' }));
  await page.focus(spur);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(600);
  note((await page.$eval(spur, (el) => el.scrollLeft)) > 0, 'Bildstrecke: Pfeiltasten scrollen den fokussierten Streifen');
  const y0 = await page.evaluate(() => scrollY);
  await page.mouse.move(700, 600);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(800);
  note((await page.evaluate(() => scrollY)) > y0 + 200, 'Bildstrecke: Mausrad scrollt weiter die Seite');
  const alts = await page.$$eval('[data-galerie] img', (imgs) => imgs.every((i) => i.alt.length > 10));
  note(alts, 'Bildstrecke: alle Fotos mit beschreibendem Alternativtext');
  await page.close();
}

/* 9. Startseite: Partnerlogos, Referenzfotos */
{
  const page = await browser.newPage({ ...zugang, viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.evaluate(() => document.querySelector('.partner').scrollIntoView());
  await page.waitForTimeout(1500);
  const logos = await page.$$eval('.partner img', (imgs) => imgs.map((i) => i.complete && i.naturalWidth > 0 && i.alt.length > 1));
  note(logos.length === 15 && logos.every(Boolean), `Partnerlogos: ${logos.filter(Boolean).length} von 15 geladen, mit Namen`);
  note((await page.$$eval('.partner__gruppe', (g) => g.length)) === 2, 'Partnerlogos in zwei Gruppen');
  note((await page.$$eval('.refs .sheet--photo', (s) => s.length)) === 6, 'Startseite: sechs Referenzen mit Foto');
  await page.close();
}

/* 10. Über uns: Team mit Porträts */
{
  const page = await browser.newPage({ ...zugang, viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/ueber-uns', { waitUntil: 'load' });
  const team = await page.evaluate(() => ({
    n: document.querySelectorAll('.kontakt').length,
    fotos: document.querySelectorAll('.kontakt img').length,
    monogramm: document.querySelectorAll('.kontakt__monogramm').length,
  }));
  note(team.n === 12 && team.fotos === 11 && team.monogramm === 1, `Team: ${team.n} Ansprechpartner, ${team.fotos} Porträts, ${team.monogramm} Monogramm`);
  await page.close();
}

/* 11. Keine Kundennamen, kein EFRE-Hinweis */
{
  const namen = /beierl|netto|fristo|forster/i;
  let treffer = [];
  for (const pfad of ['/', '/referenzen', '/unsere-leistungen/industrie-gewerbe', '/unsere-leistungen/privat']) {
    const r = await fetch(base + pfad, { headers: nutzer ? { Authorization: 'Basic ' + Buffer.from(process.env.PRUEF_LOGIN).toString('base64') } : {} });
    if (namen.test(await r.text())) treffer.push(pfad);
  }
  note(treffer.length === 0, `Keine Kundennamen im Quelltext ${treffer.join(', ')}`);
  const efre = await fetch(base + '/efre-foerderhinweis', { redirect: 'manual', headers: nutzer ? { Authorization: 'Basic ' + Buffer.from(process.env.PRUEF_LOGIN).toString('base64') } : {} });
  note(efre.status === 404, `EFRE-Förderhinweis entfernt (Status ${efre.status})`);
}

console.log(ergebnisse.join('\n'));
const fehler = ergebnisse.filter((e) => e.startsWith('FEHL')).length;
console.log(`${ergebnisse.length} Prüfungen, ${fehler} Fehler`);
await browser.close();
process.exit(fehler ? 1 : 0);
