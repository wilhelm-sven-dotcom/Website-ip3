// Interaktionsprüfung: Tastatur, Menüs, Formular, Filter, Fallbacks der Inszenierung.
// Voraussetzung: Vorschau mit PHP läuft auf http://127.0.0.1:8080 (npm run vorschau),
// für den Formularversand mit umgeleitetem sendmail (siehe README).
import { chromium } from 'playwright';
import { seiten } from '../src/data/seiten.js';
import { partnerGruppen } from '../src/data/partner.js';

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

/* 3. Referenzen: erst neun Kacheln, Filter, weitere anzeigen */
{
  const page = await browser.newPage({ ...zugang, viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/referenzen', { waitUntil: 'load' });
  const stand = () =>
    page.evaluate(() => ({
      sichtbar: [...document.querySelectorAll('[data-tags]')].filter((e) => !e.hidden && e.getBoundingClientRect().height > 0).length,
      zahl: document.querySelector('[data-count]').textContent,
      mehr: !document.querySelector('[data-mehr-zeile]').hidden,
      mehrText: document.querySelector('[data-mehr-text]').textContent,
    }));
  let z = await stand();
  note(z.sichtbar === 9 && z.zahl === '18' && z.mehr && z.mehrText.startsWith('9 weitere'), `Referenzen: zunächst 9 von 18, Knopf „${z.mehrText}“ (${z.sichtbar}, Zähler ${z.zahl})`);
  const links = await page.$$eval('[data-tags] .kachel__link', (as) => as.map((a) => a.getAttribute('href')));
  note(links.length === 18 && links.every((h) => /^\/referenzen\/[a-z0-9-]+$/.test(h)), `Referenzen: jede Kachel verlinkt ihre Projektseite (${links.length})`);
  await page.click('[data-filter="frei"]');
  z = await stand();
  note(z.sichtbar === 4 && z.zahl === '4' && !z.mehr, `Filter Freifläche zeigt 4 Projekte ohne Knopf (${z.sichtbar}, Zähler ${z.zahl})`);
  await page.click('[data-filter="alle"]');
  z = await stand();
  note(z.sichtbar === 9 && z.mehr, `Filter Alle zeigt wieder die ersten 9 (${z.sichtbar})`);
  await page.click('[data-mehr]');
  z = await stand();
  const fokus = await page.evaluate(() => {
    const li = document.activeElement.closest('[data-tags]');
    return li ? [...document.querySelectorAll('[data-tags]')].indexOf(li) : -1;
  });
  note(z.sichtbar === 18 && !z.mehr && fokus === 9, `Weitere anzeigen: alle 18, Fokus auf dem zehnten Projekt (${z.sichtbar}, Fokus ${fokus + 1})`);

  /* 3c. Zurück von einer Projektseite: Ansicht bleibt erhalten */
  const ziel = await page.$eval('[data-tags]:nth-child(12) .kachel__link', (a) => ({ href: a.getAttribute('href'), titel: a.textContent.trim() }));
  await page.click('[data-tags]:nth-child(12) .kachel__link');
  await page.waitForURL('**' + ziel.href);
  const h1 = (await page.textContent('h1')).replace(/\.\s*$/, '').trim();
  note(h1 === ziel.titel, `Projektseite öffnet mit Titel „${h1}“`);
  await page.goBack({ waitUntil: 'load' });
  z = await stand();
  note(z.sichtbar === 18, `Zurück zur Übersicht: weiterhin alle 18 sichtbar (${z.sichtbar})`);
  await page.click('[data-filter="privat"]');
  await page.click('[data-tags]:not([hidden]) .kachel__link');
  await page.waitForLoadState('load');
  await page.goBack({ waitUntil: 'load' });
  const filter = await page.$eval('[data-filter][aria-pressed="true"]', (b) => b.dataset.filter);
  z = await stand();
  note(filter === 'privat' && z.zahl === '9', `Zurück zur Übersicht: Filter bleibt gewählt (${filter}, ${z.zahl})`);
  await page.close();
}

/* 3b. Referenzen am Touchgerät: Kacheln und Fotos sichtbar, ohne Enthüllungseffekte */
{
  const ctx = await browser.newContext({ ...zugang, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(base + '/referenzen', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.tap('[data-filter="frei"]');
  await page.waitForTimeout(300);
  const kacheln = await page.$$('[data-tags]:not([hidden]) .kachel');
  let gut = 0;
  for (const k of kacheln) {
    await k.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction((el) => { const i = el.querySelector('img'); return !i || (i.complete && i.naturalWidth > 0); }, k, { timeout: 10000 }).catch(() => {});
    const ok = await k.evaluate((el) => {
      const i = el.querySelector('img');
      return getComputedStyle(el).opacity === '1' && (!i || (i.complete && i.naturalWidth > 0)) && !el.querySelector('[data-clip], [data-reveal]');
    });
    if (ok) gut++;
  }
  note(kacheln.length === 4 && gut === 4, `Filter am Touchgerät: Kacheln mit Foto sichtbar (${gut} von ${kacheln.length})`);
  await ctx.close();
}

/* 3d. Referenzen ohne JavaScript: alle Projekte, keine toten Bedienelemente */
{
  const ctx = await browser.newContext({ ...zugang, viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/referenzen', { waitUntil: 'load' });
  const ohne = await page.evaluate(() => ({
    sichtbar: [...document.querySelectorAll('[data-tags]')].filter((e) => e.getBoundingClientRect().height > 0).length,
    filter: document.querySelector('[data-filterleiste]').getBoundingClientRect().height,
    mehr: document.querySelector('[data-mehr-zeile]').getBoundingClientRect().height,
  }));
  note(ohne.sichtbar === 18 && ohne.filter === 0 && ohne.mehr === 0, `Ohne JavaScript: alle 18 Projekte, Filter und Knopf ausgeblendet (${ohne.sichtbar})`);
  await page.goto(base + '/referenzen/einzelhandel-weiden', { waitUntil: 'load' });
  const projekt = await page.evaluate(() => ({ h1: document.querySelector('h1').textContent.trim(), felder: document.querySelectorAll('.projekt__feld').length, robots: document.querySelector('meta[name="robots"]')?.content || '' }));
  note(projekt.h1.startsWith('Photovoltaik im Einzelhandel') && projekt.felder >= 2 && projekt.robots === 'noindex', `Projektseite ohne JavaScript lesbar, ohne Text auf noindex (${projekt.felder} Felder, ${projekt.robots})`);
  await ctx.close();
}

/* 4. Energiesystem: Autoplay nur im Bild, Karte bei Marker und Begriff, Tastatur, Pause, Phasen */
{
  const page = await browser.newPage({ ...zugang, viewport: { width: 1440, height: 900 } });
  const fehlerKonsole = [];
  page.on('pageerror', (e) => fehlerKonsole.push(e.message));
  await page.goto(base + '/?debug', { waitUntil: 'load' });
  const es = () => page.evaluate(() => window.__energiesystem.zustand());
  note((await es()).schleife === false, 'Energiesystem: außerhalb des Bildes läuft keine Schleife');
  await page.evaluate(() => document.querySelector('.es__buehne').scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.evaluate(() => window.scrollBy(0, -90));
  // Software-Grafik der Testumgebung: Einzeichnen kann dauern
  await page.waitForFunction(() => window.__energiesystem.zustand().gezeichnet, null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(800);
  const t1 = (await es()).t;
  await page.waitForTimeout(1000);
  const z1 = await es();
  note(z1.schleife && z1.laeuft && Math.abs(z1.t - t1) > 0.05, `Energiesystem: läuft im Bild von selbst (${t1.toFixed(2)} → ${z1.t.toFixed(2)} h)`);
  const teilchen = await page.$$eval('.es-t', (ps) => ps.reduce((n, p) => n + (p.getAttribute('d') || '').split('M').length - 1, 0));
  note(teilchen > 10, `Energiesystem: Teilchen auf den Leitungen (${teilchen})`);

  const rahmen = await page.$eval('[data-es-rahmen]', (el) => el.getBoundingClientRect().toJSON());
  const imRahmen = (r) => r.left >= rahmen.left - 1 && r.right <= rahmen.right + 1 && r.top >= rahmen.top - 1 && r.bottom <= rahmen.bottom + 40;
  await page.hover('.es-marker[data-element="gruenspeicher"]');
  await page.waitForFunction(() => !document.querySelector('[data-es-karte]').hidden, null, { timeout: 6000 }).catch(() => {});
  let karte = await page.evaluate(() => ({ offen: !document.querySelector('[data-es-karte]').hidden, titel: document.querySelector('[data-es-karte-titel]').textContent, r: document.querySelector('[data-es-karte]').getBoundingClientRect().toJSON(), expanded: document.querySelector('.es-marker[data-element="gruenspeicher"]').getAttribute('aria-expanded'), wahl: document.querySelectorAll('.es-kabel.is-wahl').length }));
  note(karte.offen && karte.titel === 'Grünstromspeicher' && karte.expanded === 'true' && imRahmen(karte.r), 'Energiesystem: Überfahren des Markers öffnet die Karte an der Grafik');
  note(karte.wahl >= 2, `Energiesystem: Leitungen des Elements hervorgehoben (${karte.wahl})`);
  // Zeitabhängiges in der langsamen Testgrafik per Warten auf den Zustand prüfen
  const warte = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 6000 }).then(() => true, () => false);
  await page.mouse.move(karte.r.left + karte.r.width / 2, karte.r.top + 30);
  await page.waitForTimeout(700);
  note((await page.isVisible('[data-es-karte]')) && (await page.textContent('[data-es-karte-titel]')) === 'Grünstromspeicher', 'Energiesystem: Karte bleibt beim Überfahren offen');
  await page.mouse.move(200, 880);
  note(await warte(() => document.querySelector('[data-es-karte]').hidden), 'Energiesystem: Karte schließt beim Verlassen');
  await page.hover('.es-begriff[data-element="mfh"]');
  await warte(() => !document.querySelector('[data-es-karte]').hidden);
  karte = await page.evaluate(() => ({ offen: !document.querySelector('[data-es-karte]').hidden, titel: document.querySelector('[data-es-karte-titel]').textContent, r: document.querySelector('[data-es-karte]').getBoundingClientRect().toJSON(), lage: document.querySelector('[data-es-karte-lage]').textContent }));
  note(karte.offen && karte.titel.includes('Mieterstrom') && imRahmen(karte.r) && karte.lage.length > 10, 'Energiesystem: Überfahren des Begriffs im Text öffnet die Karte an der Grafik');
  await page.mouse.move(200, 880);
  await warte(() => document.querySelector('[data-es-karte]').hidden);

  // Tastatur: Fokus zeigt die Vorschau, Pfeiltaste wechselt, Enter heftet an, Escape führt zurück
  await page.focus('[data-es-play]');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);
  let fokus = await page.evaluate(() => ({ el: document.activeElement.dataset.element, titel: document.querySelector('[data-es-karte-titel]').textContent, offen: !document.querySelector('[data-es-karte]').hidden }));
  note(fokus.el === 'wind' && fokus.offen && fokus.titel === 'Windpark', 'Energiesystem: Tab erreicht die Marker, Fokus zeigt die Karte');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  fokus = await page.evaluate(() => ({ el: document.activeElement.dataset.element, titel: document.querySelector('[data-es-karte-titel]').textContent }));
  note(fokus.el === 'pvfrei' && fokus.titel === 'PV-Freifläche', 'Energiesystem: Pfeiltaste wechselt zum nächsten Element');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  note(await page.evaluate(() => document.activeElement.matches('[data-es-karte]') && window.__energiesystem.zustand().fest === 'pvfrei'), 'Energiesystem: Enter heftet die Karte an und setzt den Fokus hinein');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  note(await page.evaluate(() => document.querySelector('[data-es-karte]').hidden && document.activeElement.dataset.element === 'pvfrei'), 'Energiesystem: Escape schließt und führt zum Marker zurück');

  // Pause, Phasen, Regler
  await page.click('[data-es-play]');
  const tp = (await es()).t;
  await page.waitForTimeout(900);
  const zp = await es();
  const pfeile = await page.$$eval('.es-pf', (ps) => ps.some((p) => (p.getAttribute('d') || '').length > 10));
  note(!zp.laeuft && !zp.schleife && Math.abs(zp.t - tp) < 1e-6 && pfeile && !(await page.evaluate(() => document.querySelector('[data-energiesystem]').hasAttribute('data-bewegt'))), 'Energiesystem: Anhalten stoppt Uhr und Teilchen, Pfeile zeigen die Richtung');
  note((await page.getAttribute('[data-es-play]', 'aria-pressed')) === 'false', 'Energiesystem: Abspielknopf meldet aria-pressed');
  await page.click('.es__phase-taste[data-phase="abend"]');
  await page.waitForTimeout(200);
  let z = await es();
  note(z.phase === 'abend' && z.m.fluss['gruen-nvp'] > 0 && z.m.fluss['grau-uw'] > 0, `Energiesystem: Abend, Grün- und Graustromspeicher speisen ein (${await page.textContent('[data-es-uhr]')} Uhr)`);
  note((await page.textContent('[data-es-satz]')).includes('Preisspitze'), 'Energiesystem: Lagesatz zur Phase im Schriftfeld');
  await page.click('.es__phase-taste[data-phase="nacht"]');
  await page.waitForTimeout(200);
  z = await es();
  note(z.phase === 'nacht' && z.m.fluss['grau-uw'] < 0 && z.m.fluss['haus-auto'] > 0, 'Energiesystem: Nacht, Graustromspeicher und E-Auto laden');
  await page.focus('[data-es-regler]');
  await page.keyboard.press('Home');
  await page.waitForTimeout(200);
  const regler = await page.evaluate(() => ({ uhr: document.querySelector('[data-es-uhr]').textContent, text: document.querySelector('[data-es-regler]').getAttribute('aria-valuetext') }));
  note(regler.uhr === '00:00' && regler.text === '00:00 Uhr, Nacht', `Energiesystem: Regler per Tastatur auf 0 (${regler.text})`);
  await page.click('[data-es-play]');
  const weiter = await warte(() => window.__energiesystem.zustand().schleife);
  // ans Seitenende statt nach oben: dort rendert keine 3D-Szene, die die Testgrafik ausbremst
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  const angehalten = await warte(() => !window.__energiesystem.zustand().schleife);
  const zEnde = await es();
  note(weiter && angehalten && zEnde.laeuft, `Energiesystem: außer Sicht hält die Schleife an, Abspielen bleibt gewählt (${weiter}/${angehalten}/${zEnde.laeuft})`);
  note(fehlerKonsole.length === 0, `Energiesystem: keine Skriptfehler ${fehlerKonsole.join(' | ')}`);
  await page.close();
}

/* 4b. Energiesystem am Handy: Antippen dockt die Karte unter der Grafik an, Seite bleibt scrollbar */
{
  const ctx = await browser.newContext({ ...zugang, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(base + '/?debug', { waitUntil: 'load' });
  await page.evaluate(() => document.querySelector('[data-es-ebene]').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForFunction(() => window.__energiesystem.zustand().gezeichnet, null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(800);
  const ziele = await page.$$eval('.es-marker', (ms) => ms.map((m) => Math.min(m.getBoundingClientRect().width, m.getBoundingClientRect().height)));
  note(ziele.every((h) => h >= 32), `Energiesystem Handy: Marker mindestens 32 px (${Math.min(...ziele).toFixed(0)} px)`);
  await page.tap('.es-marker[data-element="gruenspeicher"]');
  await page.waitForTimeout(1200);
  const lage = await page.evaluate(() => {
    const k = document.querySelector('[data-es-karte]');
    const e = document.querySelector('[data-es-ebene]').getBoundingClientRect();
    return { offen: !k.hidden, pos: getComputedStyle(k).position, oben: k.getBoundingClientRect().top - e.bottom, titel: document.querySelector('[data-es-karte-titel]').textContent };
  });
  note(lage.offen && lage.pos !== 'absolute' && lage.oben >= -1 && lage.titel === 'Grünstromspeicher', 'Energiesystem Handy: Antippen dockt die Karte unter der Grafik an');
  const y0 = await page.evaluate(() => scrollY);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'instant' }));
  await page.waitForTimeout(300);
  note((await page.evaluate(() => scrollY)) > y0 + 200, 'Energiesystem Handy: Seite bleibt frei scrollbar');
  note((await page.evaluate(() => document.documentElement.scrollWidth)) <= 390, 'Energiesystem Handy: kein waagerechter Überlauf');
  await ctx.close();
}

/* 4c. Energiesystem auf der Leistungsseite, mit reduzierter Bewegung und ohne JavaScript */
{
  const page = await browser.newPage({ ...zugang, viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/unsere-leistungen', { waitUntil: 'load' });
  const nr = await page.$eval('[data-energiesystem] .dim__num', (el) => el.textContent.trim());
  note(nr === '02', `Energiesystem auf der Leistungsübersicht als Abschnitt ${nr}`);
  await page.close();

  const ctx = await browser.newContext({ ...zugang, viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p2 = await ctx.newPage();
  await p2.goto(base + '/?debug', { waitUntil: 'load' });
  await p2.evaluate(() => document.querySelector('[data-es-ebene]').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await p2.waitForTimeout(800);
  const rm = await p2.evaluate(() => ({
    bewegt: document.querySelector('[data-energiesystem]').hasAttribute('data-bewegt'),
    pfeile: [...document.querySelectorAll('.es-pf')].some((p) => (p.getAttribute('d') || '').length > 10),
    pfeileSichtbar: getComputedStyle(document.querySelector('.es-pfeile')).display !== 'none',
    laeuft: window.__energiesystem.zustand().laeuft,
  }));
  note(!rm.bewegt && rm.pfeile && rm.pfeileSichtbar && !rm.laeuft, 'Energiesystem bei reduzierter Bewegung: kein Autoplay, statische Pfeile');
  await ctx.close();

  const ctx2 = await browser.newContext({ ...zugang, viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const p3 = await ctx2.newPage();
  await p3.goto(base + '/', { waitUntil: 'load' });
  const ohne = await p3.evaluate(() => ({
    liste: document.querySelector('[data-es-liste]').open,
    eintraege: [...document.querySelectorAll('.es__eintrag')].filter((e) => e.getClientRects().length && e.querySelector('.es__eintrag-text').textContent.length > 40).length,
    pfeile: (document.querySelector('.es-pf--gruen').getAttribute('d') || '').length > 10,
    hinweis: getComputedStyle(document.querySelector('.es__ohne-js')).display !== 'none',
    marker: document.querySelectorAll('.es-marker').length,
  }));
  note(ohne.liste && ohne.eintraege === 9 && ohne.pfeile && ohne.hinweis, `Energiesystem ohne JavaScript: alle ${ohne.eintraege} Texte offen, Pfeile für 13:00 Uhr`);
  await ctx2.close();
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

/* 5b. Kontaktformular: Anfrage zum Solarpark-Monitoring wird echt versendet */
{
  const page = await browser.newPage({ ...zugang, viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/kontakt', { waitUntil: 'load' });
  await page.fill('#cf-name', 'Test Monitoring');
  await page.fill('#cf-email', 'monitoring@example.org');
  await page.fill('#cf-msg', 'Automatische Prüfung: Anfrage zum Solarpark-Monitoring.');
  await page.check('input[name="datenschutz"]');
  await page.check('input[value="Solarpark-Monitoring"]', { force: true });
  await page.waitForTimeout(3200);
  await page.click('[data-submit]');
  await page.waitForFunction(() => document.querySelector('[data-status]').textContent.length > 0, null, { timeout: 15000 });
  const status = await page.textContent('[data-status]');
  note(status.includes('Vielen Dank'), `Versand mit Interesse „Solarpark-Monitoring“ bestätigt`);
  await page.close();
}

/* 12. Monitoring: klebende Auswertung, Kapitel, Sprungmarken, Zeitlineal */
{
  const page = await browser.newPage({ ...zugang, viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/unsere-leistungen/monitoring', { waitUntil: 'load' });
  const zustand = () => page.$eval('[data-ea-panel]', (p) => p.dataset.zustand);
  const aufbau = await page.evaluate(() => {
    const panel = document.querySelector('[data-ea-panel]');
    return { sichtbar: !panel.hidden, sticky: getComputedStyle(panel).position, grafiken: panel.querySelectorAll('.ea-grafik').length };
  });
  note(aufbau.sichtbar && aufbau.sticky === 'sticky' && aufbau.grafiken === 5, `Monitoring Desktop: Auswertung klebt rechts mit allen fünf Diagrammen (${aufbau.sticky}, ${aufbau.grafiken})`);
  const ergebnis = [];
  for (const [k, n] of [['potenzial', '2'], ['technik', '4'], ['begrenzung', '1']]) {
    await page.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'center', behavior: 'instant' }), `ea-${k}`);
    await page.waitForFunction((x) => document.querySelector('[data-ea-panel]').dataset.zustand === x, n, { timeout: 5000 }).catch(() => {});
    ergebnis.push((await zustand()) === n);
  }
  note(ergebnis.every(Boolean), `Monitoring: Kapitel in der Bildmitte bestimmt das Diagramm (${ergebnis.join('/')})`);
  const sichtbarImPanel = await page.$$eval('[data-ea-panel] .ea-grafik', (gs) => gs.filter((g) => getComputedStyle(g).display !== 'none').map((g) => g.dataset.in));
  note(sichtbarImPanel.length === 1 && sichtbarImPanel[0] === '1', `Monitoring: genau ein Diagramm sichtbar (${sichtbarImPanel.join(',')})`);
  await page.evaluate(() => scrollTo({ top: document.querySelector('.ea__sprung').getBoundingClientRect().top + scrollY - 200, behavior: 'instant' }));
  await page.click('[data-ea-sprung="3"]');
  await page.waitForFunction(() => document.querySelector('[data-ea-panel]').dataset.zustand === '3', null, { timeout: 6000 }).catch(() => {});
  note(page.url().endsWith('#ea-wirtschaft') && (await zustand()) === '3', `Monitoring: Sprungmarke 03 führt zum Kapitel Wirtschaft (${await zustand()})`);
  await page.focus('[data-ea-regler]');
  await page.keyboard.press('End');
  const ende = await page.evaluate(() => ({ text: document.querySelector('[data-ea-ablesen]').textContent, aria: document.querySelector('[data-ea-regler]').getAttribute('aria-valuetext') }));
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  const anfang = await page.textContent('[data-ea-ablesen]');
  note(ende.text.startsWith('23:45 Uhr') && ende.aria === ende.text && anfang.startsWith('00:15 Uhr'), `Monitoring: Zeitlineal per Tastatur, Ablesefeld in Worten („${anfang.slice(0, 36)}…“)`);
  const zeiger = await page.$eval('[data-ea-panel] .ea-grafik[data-in="3"] .ea-diagramm', (d) => getComputedStyle(d, '::after').opacity);
  note(zeiger === '1', 'Monitoring: Zeiger im Diagramm sichtbar');
  const box = await page.$eval('[data-ea-panel]', (p) => p.getBoundingClientRect().toJSON());
  await page.mouse.move(box.left + box.width / 2, box.top + 120);
  const y0 = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(700);
  note((await page.evaluate(() => scrollY)) > y0 + 150, 'Monitoring: Mausrad über der Auswertung scrollt die Seite');
  await page.close();

  // niedriges Fenster: Auswertung samt Lineal passt in jedes Kapitel
  const p2 = await browser.newPage({ ...zugang, viewport: { width: 1366, height: 650 } });
  await p2.goto(base + '/unsere-leistungen/monitoring', { waitUntil: 'load' });
  const passt = [];
  for (const k of ['begrenzung', 'potenzial', 'wirtschaft', 'technik', 'entscheidung']) {
    await p2.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'center', behavior: 'instant' }), `ea-${k}`);
    // am Anfang des Abschnitts liegt die Auswertung noch im Fluss; gemessen wird, sobald sie klebt
    await p2.evaluate(() => {
      const p = document.querySelector('[data-ea-panel]');
      const oben = parseFloat(getComputedStyle(p).top);
      const d = p.getBoundingClientRect().top - oben;
      if (d > 1) scrollBy({ top: d, behavior: 'instant' });
    });
    await p2.waitForTimeout(500);
    passt.push(await p2.$eval('[data-ea-panel]', (p) => Math.round(p.getBoundingClientRect().bottom) <= innerHeight + 1));
  }
  note(passt.every(Boolean), `Monitoring 1366 × 650: Auswertung in allen Kapiteln vollständig im Bild (${passt.join('/')})`);
  await p2.close();

  // Handy: kein Kleben, jedes Kapitel mit eigenem Diagramm
  const ctx = await browser.newContext({ ...zugang, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p3 = await ctx.newPage();
  await p3.goto(base + '/unsere-leistungen/monitoring', { waitUntil: 'load' });
  const mobil = await p3.evaluate(() => ({
    panel: document.querySelector('[data-ea-panel]').hidden,
    imKapitel: [...document.querySelectorAll('[data-kapitel]')].every((k) => k.querySelector('.ea-grafik')),
    breit: document.documentElement.scrollWidth <= innerWidth,
  }));
  note(mobil.panel && mobil.imKapitel && mobil.breit, 'Monitoring Handy: kein klebendes Panel, jedes Kapitel mit eigenem Diagramm, kein Überlauf');
  await ctx.close();

  // ohne JavaScript: Diagramme in den Kapiteln, Tabelle in Worten vorhanden
  const ctx2 = await browser.newContext({ ...zugang, viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const p4 = await ctx2.newPage();
  await p4.goto(base + '/unsere-leistungen/monitoring', { waitUntil: 'load' });
  const ohne = await p4.evaluate(() => ({
    grafiken: [...document.querySelectorAll('[data-kapitel] .ea-grafik')].filter((g) => g.getBoundingClientRect().height > 50).length,
    zeilen: document.querySelectorAll('.ea__tabelle tbody tr').length,
  }));
  note(ohne.grafiken === 5 && ohne.zeilen >= 8, `Monitoring ohne JavaScript: fünf Diagramme in den Kapiteln, Verlauf in Worten (${ohne.zeilen} Zeilen)`);
  await ctx2.close();
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
  const sollLogos = partnerGruppen.reduce((n, g) => n + g.logos.length, 0);
  note(logos.length === sollLogos && logos.every(Boolean), `Partnerlogos: ${logos.filter(Boolean).length} von ${sollLogos} geladen, mit Namen`);
  note((await page.$$eval('.partner__gruppe', (g) => g.length)) === 2, 'Partnerlogos in zwei Gruppen');
  note((await page.$$eval('.refs .sheet--photo', (s) => s.length)) === 6, 'Startseite: sechs Referenzen mit Foto');
  const blattLinks = await page.$$eval('.refs .sheet__link', (as) => as.map((a) => a.getAttribute('href')));
  note(blattLinks.length === 6 && blattLinks.every((h) => h.startsWith('/referenzen/')), `Startseite: Referenzen verlinken ihre Projektseiten (${blattLinks.length})`);
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
  const vb = await page.evaluate(() => {
    const logos = [...document.querySelectorAll('.partnerspalte__name img')];
    const link = document.querySelector('.partnerspalte--enmag a[href^="https://www.enmag-naturstrom.de"]');
    const gruen = [...document.querySelectorAll('body *')].filter((el) => getComputedStyle(el).color === 'rgb(76, 155, 59)' && !el.closest('.partnerspalte--enmag'));
    return {
      kette: document.querySelectorAll('.kette__teil').length,
      jahre: /\b(19|20)\d\d\b/.test(document.querySelector('.herkunft').textContent),
      anker: !!document.querySelector('.kette a[href="#verbund"]') && !!document.getElementById('verbund'),
      logos: logos.map((i) => (i.complete && i.naturalWidth > 0 ? i.alt : '')).join(' / '),
      breiten: logos.map((i) => Math.round(i.getBoundingClientRect().width)).join(' / '),
      link: link ? link.target === '_blank' && link.relList.contains('noopener') : false,
      gruenAusserhalb: gruen.length,
      spalten: document.querySelectorAll('.partnerspalte').length,
    };
  });
  note(vb.kette === 3 && !vb.jahre && vb.anker, `Über uns: Herkunft in drei Abschnitten ohne Jahreszahlen, Anker zum Verbund (${vb.kette})`);
  note(vb.spalten === 2 && vb.logos === 'ip³ Energietechnik / ENMAG' && vb.link && vb.gruenAusserhalb === 0, `Über uns: Verbund mit zwei gleichwertigen Spalten, Wortmarken geladen (${vb.logos}, ${vb.breiten} px), ENMAG-Grün nur bei ENMAG, Link in neuem Fenster`);
  await page.close();
}

/* 10b. Überschriften: Unterlängen und Satzzeichen nach der Einblendung nicht beschnitten */
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844, mobil: true }]) {
  const ctx = await browser.newContext({ ...zugang, viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.mobil, hasTouch: !!vp.mobil });
  const page = await ctx.newPage();
  await page.goto(base + '/ueber-uns', { waitUntil: 'load' });
  const offen = [];
  for (const sel of ['#herkunft-title', '#verbund-title', '#karriere-title']) {
    await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center', behavior: 'instant' }), sel);
    await page.waitForFunction((s) => [...document.querySelectorAll(s + ' .split-line-mask')].some((m) => m.style.overflow === 'visible'), sel, { timeout: 8000 }).catch(() => {});
    offen.push(await page.$$eval(sel + ' .split-line-mask', (ms) => ms.length > 0 && ms.every((m) => getComputedStyle(m).overflow === 'visible')));
  }
  note(offen.every(Boolean), `Überschriften ${vp.width} px: nach der Einblendung ohne Beschnitt (g, y, Komma vollständig)`);
  const ohneVde = await page.goto(base + '/', { waitUntil: 'load' }).then(() => page.$$eval('.fact', (fs) => fs.length));
  note(ohneVde === 3, `Kennzahlen: drei Kacheln, ohne VDE-Normen (${ohneVde})`);
  await ctx.close();
}

/* 11. Keine Kundennamen, kein EFRE-Hinweis */
{
  const namen = /beierl|netto|fristo|forster/i;
  let treffer = [];
  for (const pfad of seiten.map((x) => x.pfad)) {
    const r = await fetch(base + pfad, { headers: nutzer ? { Authorization: 'Basic ' + Buffer.from(process.env.PRUEF_LOGIN).toString('base64') } : {} });
    if (namen.test(await r.text())) treffer.push(pfad);
  }
  note(treffer.length === 0, `Keine Kundennamen im Quelltext (${seiten.length} Seiten) ${treffer.join(', ')}`);
  const efre = await fetch(base + '/efre-foerderhinweis', { redirect: 'manual', headers: nutzer ? { Authorization: 'Basic ' + Buffer.from(process.env.PRUEF_LOGIN).toString('base64') } : {} });
  note(efre.status === 404, `EFRE-Förderhinweis entfernt (Status ${efre.status})`);
}

console.log(ergebnisse.join('\n'));
const fehler = ergebnisse.filter((e) => e.startsWith('FEHL')).length;
console.log(`${ergebnisse.length} Prüfungen, ${fehler} Fehler`);
await browser.close();
process.exit(fehler ? 1 : 0);
