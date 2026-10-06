// Prüfung der Grafik „Ein Tag im Energiesystem“ ohne Browser: Tagesmodell, Texte, Geometrie.
//   node scripts/pruefen-energiesystem.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as modell from '../src/lib/energiesystem-modell.js';
import * as texte from '../src/data/energiesystem.js';
import * as iso from '../src/lib/iso.js';
import { energiesystemDaten, LAYOUT } from '../src/lib/energiesystem-szene.js';

const { simuliereTag, moment, SCHRITTE, DT, TIEF, HOCH, VERBINDUNGEN, ELEMENTE, BEZUG, preis } = modell;
const ergebnisse = [];
const note = (ok, text) => ergebnisse.push(`${ok ? 'OK  ' : 'FEHL'} ${text}`);
const eps = 1e-9;

/* ---------- Modell ---------- */

const a = simuliereTag();
const b = simuliereTag();
note(JSON.stringify(a.fluss, (k, v) => (ArrayBuffer.isView(v) ? Array.from(v) : v)) === JSON.stringify(b.fluss, (k, v) => (ArrayBuffer.isView(v) ? Array.from(v) : v)), 'Modell: zwei Läufe liefern identische Flüsse');
const quelle = fs.readFileSync(new URL('../src/lib/energiesystem-modell.js', import.meta.url), 'utf8');
note(!/Math\.random|Date\.|new Date|performance\./.test(quelle), 'Modell: kein Zufall, keine Rechneruhr');

const periodisch = Object.entries(a.soc).every(([, s]) => Math.abs(s[0] - s[SCHRITTE]) < 1e-9);
note(periodisch, 'Modell: Füllstand um 0 Uhr = Füllstand um 24 Uhr (alle Speicher)');
note(Object.values(a.soc).every((s) => Array.from(s).every((v) => v >= -eps && v <= 1 + eps)), 'Modell: Füllstände zwischen leer und voll');

const f = (id, i) => a.fluss[id][i];
let bilanz = 0;
let gruenNetz = 0;
let grauPreis = 0;
let heimEinspeisung = 0;
for (let i = 0; i < SCHRITTE; i++) {
  bilanz = Math.max(bilanz, Math.abs(f('pv-nvp', i) + f('gruen-nvp', i) - f('nvp-uw', i)));
  bilanz = Math.max(bilanz, Math.abs(f('mfh-ons', i) + f('haus-ons', i) - f('ons-uw', i)));
  bilanz = Math.max(bilanz, Math.abs(f('wind-uw', i) + f('nvp-uw', i) + f('grau-uw', i) + f('gewerbe-uw', i) + f('ons-uw', i) - f('uw-hs', i)));
  if (-f('gruen-nvp', i) > f('pv-nvp', i) + eps) gruenNetz++;
  const p = preis((i + 0.5) * DT);
  if ((f('grau-uw', i) < -eps && p > TIEF) || (f('grau-uw', i) > eps && p < HOCH)) grauPreis++;
  if (f('haus-akku', i) > eps && f('haus-ons', i) > eps) heimEinspeisung++;
}
note(bilanz < 1e-9, `Modell: Knotenbilanz an Übergabestation, Ortsnetzstation und Umspannwerk ausgeglichen (${bilanz.toExponential(1)})`);
note(gruenNetz === 0, 'Modell: Grünstromspeicher lädt nie mehr als die eigene PV liefert');
note(grauPreis === 0, 'Modell: Graustromspeicher lädt nur bei tiefem und speist nur bei hohem Preis');
note(heimEinspeisung === 0, 'Modell: Heimspeicher speist nie ins Netz');

const bei = (h) => moment(a, h);
{
  const m = bei(3);
  note(m.fluss['grau-uw'] < 0 && m.art['grau-uw'] === 'netz' && m.fluss['haus-auto'] > 0 && m.fluss['uw-hs'] < 0, '03:00 Uhr: Graustromspeicher lädt Netzstrom, E-Auto lädt, Bezug aus der Hochspannung');
}
note(bei(7.5).fluss['grau-uw'] > 0, '07:30 Uhr: Graustromspeicher speist ein');
{
  const m = bei(13);
  const laden = m.fluss['gruen-nvp'] < 0 && m.fluss['grau-uw'] < 0 && m.fluss['haus-akku'] < 0 && m.fluss['gewerbe-akku'] < 0;
  note(laden && m.fluss['uw-hs'] > 0 && m.art['uw-hs'] === 'gruen', '13:00 Uhr: alle Speicher laden, Grünstrom geht ins Hochspannungsnetz');
}
{
  const m = bei(20.5);
  note(m.fluss['gruen-nvp'] > 0 && m.fluss['grau-uw'] > 0 && m.fluss['haus-akku'] > 0 && m.licht > 0, '20:30 Uhr: Grün-, Grau- und Heimspeicher entladen, Licht an');
}

/* ---------- Texte ---------- */

const { elemente, elementNach, lagesatz, einleitung, phasen } = texte;
note(elemente.length === 9 && ELEMENTE.every((e) => elementNach[e]), `Texte: alle ${ELEMENTE.length} Elemente beschrieben`);
let ohneSatz = [];
for (const e of ELEMENTE) {
  for (let i = 0; i < SCHRITTE; i++) {
    const codes = a.zustand[e][i];
    const [haupt, ...neben] = codes;
    if (!elementNach[e].lage[haupt] || neben.some((c) => !elementNach[e].zusatz?.[c]) || !lagesatz(e, codes)) ohneSatz.push(`${e}:${codes.join('+')}`);
  }
}
note(ohneSatz.length === 0, `Texte: Lagesatz für jeden Zustand jeder Viertelstunde ${[...new Set(ohneSatz)].join(', ')}`);
note(Object.keys(phasen).length === 4 && modell.PHASEN.every((p) => phasen[p.id]?.satz), 'Texte: Satz für jede Tagesphase');

const alleTexte = JSON.stringify(texte, (k, v) => (typeof v === 'function' ? undefined : v));
const einheiten = alleTexte.match(/\d[\d.,]*\s*(kWp|kWh|kW|MWh|MW|GW|%|€|Cent|ct\b|Euro)/g);
note(!einheiten, `Texte: keine Zahlen mit Einheit ${einheiten ? einheiten.join(', ') : ''}`);
note(!/\s[–—]\s/.test(alleTexte), 'Texte: keine Gedankenstriche');

const begriffe = einleitung.filter((t) => typeof t !== 'string');
note(begriffe.length === 5 && begriffe.every((t) => elementNach[t.element]), `Texte: ${begriffe.length} Begriffe in der Einleitung, alle mit Element`);
const seiten = new Set(['/', ...fs.readdirSync(new URL('../src/pages/', import.meta.url), { recursive: true }).filter((p) => p.endsWith('.astro')).map((p) => '/' + p.replace(/\\/g, '/').replace(/(index)?\.astro$/, '').replace(/\/$/, ''))]);
const process_ = fs.readFileSync(new URL('../src/components/Process.astro', import.meta.url), 'utf8');
const links = elemente.map((e) => e.link.href);
const kaputt = links.filter((h) => (h.startsWith('#') ? !process_.includes(`id="${h.slice(1)}"`) : !seiten.has(h)));
note(kaputt.length === 0, `Texte: Leistungslinks führen auf vorhandene Seiten ${kaputt.join(', ')}`);

/* ---------- Geometrie ---------- */

const { szene, pfeile } = energiesystemDaten();
const markup = (szene.ebenen[0] || '') + (szene.ebenen[2] || '');
for (const e of ELEMENTE) {
  if (!markup.includes(`data-node="${e}"`)) note(false, `Geometrie: Gruppe für ${e} fehlt`);
}
note(ELEMENTE.every((e) => markup.includes(`data-node="${e}"`) && szene.marker[e]), 'Geometrie: jedes Element mit Gruppe und Marker');
note(!/NaN|Infinity|undefined/.test(markup + JSON.stringify(szene.linien) + JSON.stringify(szene.marker) + pfeile.gruen + pfeile.netz), 'Geometrie: keine ungültigen Zahlen');

// Körper verschiedener Gruppen durchdringen sich nicht
const schnitt = (p, q) => [0, 1, 2].every((k) => p.lo[k] < q.hi[k] - 1e-6 && q.lo[k] < p.hi[k] - 1e-6);
const kollision = [];
for (let i = 0; i < szene.koerper.length; i++) {
  for (let j = i + 1; j < szene.koerper.length; j++) {
    const p = szene.koerper[i];
    const q = szene.koerper[j];
    if (p.gruppe !== q.gruppe && schnitt(p, q)) kollision.push(`${p.gruppe}/${q.gruppe}`);
  }
}
note(kollision.length === 0, `Geometrie: Bauteile verschiedener Elemente überschneiden sich nicht ${[...new Set(kollision)].join(', ')}`);
note(Object.keys(LAYOUT).every((id) => szene.reihenfolge.includes(id)), 'Geometrie: alle Gruppen in der Zeichenreihenfolge');

// Leitungen: ein ausreichender Teil ist sichtbar (nicht von Gebäuden verdeckt)
const verdeckt = [];
for (const v of VERBINDUNGEN) {
  const zw = szene.linien[v.id].zweige;
  const lang = zw.reduce((s, z) => s + z.laenge, 0);
  const frei = zw.reduce((s, z) => s + z.sichtbar.reduce((t, [x, y]) => t + y - x, 0), 0);
  if (frei < Math.min(30, lang * 0.6) || frei / lang < 0.2) verdeckt.push(`${v.id} ${Math.round((frei / lang) * 100)} %`);
}
note(verdeckt.length === 0, `Geometrie: jede Leitung überwiegend sichtbar ${verdeckt.join(', ')}`);

// Marker: Abstand der Mittelpunkte bei typischen Breiten der Grafik
const pts = ELEMENTE.map((e) => szene.marker[e].punkt);
for (const [breite, minimum] of [[390, 36], [744, 44]]) {
  const k = breite / szene.breite;
  let min = Infinity;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) min = Math.min(min, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) * k);
  note(min >= minimum, `Geometrie: Marker bei ${breite} px mindestens ${minimum} px auseinander (${min.toFixed(1)} px)`);
}
const kb = (markup.length + JSON.stringify(szene.linien).length) / 1024;
note(kb < 90, `Geometrie: Szene unter 90 KB (${kb.toFixed(1)} KB)`);
const striche = (markup.match(/data-stroke/g) || []).length;
note(striche <= 320, `Geometrie: Einzeichnen auf ${striche} Umrisse begrenzt`);

// Bestehende Zeichnungen bleiben bytegleich (Prüfsumme vor Erweiterung von iso.js)
const ref = {};
for (const k of Object.keys(iso)) if (k.startsWith('draw')) {
  ref[k + '_a'] = iso[k]();
  ref[k + '_b'] = iso[k]({ animate: false, title: 'X' });
}
const h = crypto.createHash('sha256');
for (const k of Object.keys(ref).sort()) h.update(k + '\n' + ref[k] + '\n');
note(h.digest('hex') === 'beb46b7f4e85fe753ef02d7bda27138692b1fe6d46c8c842d9d29c23aa902e46', 'Geometrie: bestehende Zeichnungen unverändert (Prüfsumme)');

console.log(ergebnisse.join('\n'));
const fehler = ergebnisse.filter((e) => e.startsWith('FEHL')).length;
console.log(`${ergebnisse.length} Prüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
