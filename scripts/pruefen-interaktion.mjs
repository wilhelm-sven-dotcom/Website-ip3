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

/* 10b. Überschriften: Unterlängen und Satzzeichen nach der Einblendung nicht beschnitten */
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844, mobil: true }]) {
  const ctx = await browser.newContext({ ...zugang, viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.mobil, hasTouch: !!vp.mobil });
  const page = await ctx.newPage();
  await page.goto(base + '/ueber-uns', { waitUntil: 'load' });
  const offen = [];
  for (const sel of ['#weg-title', '#karriere-title']) {
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
