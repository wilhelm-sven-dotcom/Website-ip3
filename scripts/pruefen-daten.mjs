// Prüft die Inhaltsdaten ohne Browser: Referenzen (Adressen, Fotos, Alternativtexte, Kategorien,
// Startseitenauswahl), Verweise der Leistungsseiten, Navigation, Formularoptionen gegen die
// Positivliste des Versandskripts und Kundennamen. Läuft vor dem Build in wenigen Sekunden.
// Aufruf: node scripts/pruefen-daten.mjs
import fs from 'node:fs';
import path from 'node:path';
import { referenzen, veroeffentlicht, umfangBegriffe, kategorieStichworte, gruppenVon } from '../src/data/referenzen.js';
import { leistungen } from '../src/data/leistungen.js';
import { leistungenNav } from '../src/data/site.js';
import { seiten } from '../src/data/seiten.js';
import { drawing } from '../src/lib/drawings.js';

const ergebnisse = [];
const note = (ok, text) => ergebnisse.push(`${ok ? 'OK  ' : 'FEHL'} ${text}`);
const liste = (xs) => (xs.length ? ` ${xs.join(', ')}` : '');
const doppelt = (xs) => xs.filter((x, i) => xs.indexOf(x) !== i);
const fotoDa = (schluessel) => fs.existsSync(path.join('src/assets/fotos', `${schluessel}.jpg`));
const zeichnungDa = (k) => {
  try {
    return drawing(k, '', { animate: false }).startsWith('<svg');
  } catch {
    return false;
  }
};

/* Referenzen */
note(doppelt(referenzen.map((r) => r.id)).length === 0, `Referenzen: ids eindeutig${liste(doppelt(referenzen.map((r) => r.id)))}`);
note(doppelt(referenzen.map((r) => r.slug)).length === 0, `Referenzen: Adressen eindeutig${liste(doppelt(referenzen.map((r) => r.slug)))}`);
const schlechteSlugs = referenzen.filter((r) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug || '')).map((r) => r.id);
note(schlechteSlugs.length === 0, `Referenzen: Adressen nur aus Kleinbuchstaben, Ziffern und Bindestrich${liste(schlechteSlugs)}`);
const ohnePflicht = referenzen.filter((r) => !r.titel || !r.kategorie || !r.zeichnung).map((r) => r.id);
note(ohnePflicht.length === 0, `Referenzen: Titel, Kategorie und Zeichnung gesetzt${liste(ohnePflicht)}`);
const fremdeKategorie = referenzen.filter((r) => r.kategorie.split(' · ').some((k) => !kategorieStichworte.includes(k))).map((r) => `${r.id} (${r.kategorie})`);
note(fremdeKategorie.length === 0, `Referenzen: Kategorien aus der Positivliste${liste(fremdeKategorie)}`);
const ohneGruppe = referenzen.filter((r) => gruppenVon(r).length === 0).map((r) => r.id);
note(ohneGruppe.length === 0, `Referenzen: jede Referenz in mindestens einer Filtergruppe${liste(ohneGruppe)}`);
const ohneZeichnung = referenzen.filter((r) => !zeichnungDa(r.zeichnung)).map((r) => `${r.id} (${r.zeichnung})`);
note(ohneZeichnung.length === 0, `Referenzen: Zeichnungen vorhanden${liste(ohneZeichnung)}`);
const fehlendeFotos = referenzen.flatMap((r) => [r.bild, ...(r.fotos || []).map((f) => f.src)].filter(Boolean).filter((b) => !fotoDa(b)).map((b) => `${r.id}: ${b}`));
note(fehlendeFotos.length === 0, `Referenzen: alle Fotos vorhanden${liste(fehlendeFotos)}`);
const ohneAlt = referenzen.flatMap((r) => [...(r.bild ? [{ src: r.bild, alt: r.bildAlt }] : []), ...(r.fotos || [])].filter((f) => !f.alt || f.alt.length < 10).map((f) => `${r.id}: ${f.src}`));
note(ohneAlt.length === 0, `Referenzen: jedes Foto mit beschreibendem Alternativtext${liste(ohneAlt)}`);
const ersteOhneFoto = veroeffentlicht.slice(0, 9).filter((r) => !r.bild).map((r) => r.id);
note(ersteOhneFoto.length === 0, `Referenzen: die ersten neun haben ein Foto${liste(ersteOhneFoto)}`);
const start = veroeffentlicht.filter((r) => r.startseite).map((r) => r.startseite).sort((a, b) => a - b);
note(start.join(',') === '1,2,3,4,5,6', `Referenzen: Startseite zeigt genau sechs, Positionen 1 bis 6 (${start.join(', ') || 'keine'})`);
const startOhneFoto = veroeffentlicht.filter((r) => r.startseite && !r.bild).map((r) => r.id);
note(startOhneFoto.length === 0, `Referenzen: Startseitenauswahl nur mit Foto${liste(startOhneFoto)}`);
const fremderUmfang = referenzen.flatMap((r) => (r.umfang || []).filter((u) => !umfangBegriffe.includes(u)).map((u) => `${r.id}: ${u}`));
note(fremderUmfang.length === 0, `Referenzen: Leistungsumfang nur mit festen Begriffen${liste(fremderUmfang)}`);
const jahr = new Date().getFullYear();
const schlechtesJahr = referenzen.filter((r) => r.jahr != null && !(Number.isInteger(r.jahr) && r.jahr >= 2009 && r.jahr <= jahr)).map((r) => `${r.id} (${r.jahr})`);
note(schlechtesJahr.length === 0, `Referenzen: Baujahr ganzzahlig zwischen 2009 und ${jahr}${liste(schlechtesJahr)}`);
const schlechterText = referenzen.filter((r) => r.text != null && !(Array.isArray(r.text) && r.text.every((t) => typeof t === 'string' && t.trim().length > 20))).map((r) => r.id);
note(schlechterText.length === 0, `Referenzen: Projekttexte als Liste von Absätzen${liste(schlechterText)}`);
note(veroeffentlicht.length >= 9, `Referenzen: mindestens neun freigegeben (${veroeffentlicht.length})`);

/* Verweise der Leistungsseiten auf Referenzen */
const ids = new Set(veroeffentlicht.map((r) => r.id));
for (const datei of fs.readdirSync('src/pages/unsere-leistungen').filter((d) => d.endsWith('.astro'))) {
  const quelle = fs.readFileSync(path.join('src/pages/unsere-leistungen', datei), 'utf8');
  const m = quelle.match(/refIds=\{\[([^\]]*)\]\}/);
  if (!m) continue;
  const verweise = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  const fehlt = verweise.filter((id) => !ids.has(id));
  note(fehlt.length === 0 && verweise.length > 0, `Leistungsseite ${datei}: Referenzen vorhanden und freigegeben${liste(fehlt)}`);
}

/* Leistungen und Navigation */
note(
  leistungen.map((l) => l.href).join() === leistungenNav.map((n) => n.href).join(),
  `Navigation: Leistungsbereiche wie in leistungen.js (${leistungenNav.map((n) => n.label).join(', ')})`
);
const andereNamen = leistungen.filter((l) => leistungenNav.find((n) => n.href === l.href)?.label !== l.titel).map((l) => l.titel);
note(andereNamen.length === 0, `Navigation: gleiche Bezeichnungen wie die Leistungsseiten${liste(andereNamen)}`);
const nummern = leistungen.map((l) => l.nr);
note(nummern.every((n, i) => n === String(i + 1).padStart(2, '0')), `Leistungen: fortlaufend nummeriert (${nummern.join(', ')})`);
const ohneLeistungsZeichnung = leistungen.filter((l) => !zeichnungDa(l.zeichnung)).map((l) => l.zeichnung);
note(ohneLeistungsZeichnung.length === 0, `Leistungen: Zeichnungen vorhanden${liste(ohneLeistungsZeichnung)}`);
const ohneSeite = leistungen.filter((l) => !fs.existsSync(`src/pages${l.href}.astro`)).map((l) => l.href);
note(ohneSeite.length === 0, `Leistungen: jede hat eine Seite${liste(ohneSeite)}`);

/* Seitenliste */
note(doppelt(seiten.map((s) => s.pfad)).length === 0, `Seitenliste: keine doppelten Adressen (${seiten.length} Seiten)`);

/* Kontaktformular: Auswahl im Formular = Positivliste im Versandskript */
const form = fs.readFileSync('src/components/ContactForm.astro', 'utf8');
const php = fs.readFileSync('public/kontakt-senden.php', 'utf8');
const ausForm = [...(form.match(/const interessen = \[([\s\S]*?)\];/)?.[1] || '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
const ausPhp = [...(php.match(/const INTERESSEN = \[([\s\S]*?)\];/)?.[1] || '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
note(ausForm.length > 0 && ausForm.join('|') === ausPhp.join('|'), `Kontaktformular: Interessen wie im Versandskript (${ausForm.join(', ')})`);

/* Keine Kundennamen in den Daten */
const namen = /beierl|netto|fristo|forster/i;
const mitNamen = ['src/data/referenzen.js', 'src/data/galerien.js'].filter((d) => namen.test(fs.readFileSync(d, 'utf8')));
note(mitNamen.length === 0, `Keine Kundennamen in den Daten${liste(mitNamen)}`);

console.log(ergebnisse.join('\n'));
const fehler = ergebnisse.filter((e) => e.startsWith('FEHL')).length;
console.log(`${ergebnisse.length} Prüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
