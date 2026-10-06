// Prüft den Beispieltag der Seite Solarpark-Monitoring ohne Browser: Modell (deterministisch,
// Energiebilanz je Viertelstunde, Fenster der Vorgaben, Ausfall nur bei Wechselrichter 6),
// Texte und die erzeugten Diagramme (keine Zahlen mit Einheit, kein NaN, Größenbudget).
// Aufruf: node scripts/pruefen-monitoring.mjs [dist]
import fs from 'node:fs';
import { simuliereTag, lage, verlauf, tagesbilanz, AUSFALL, NB, SCHRITTE } from '../src/lib/monitoring-modell.js';
import { diagrammBegrenzung, diagrammPotenzial, diagrammPreis, diagrammErloes, diagrammeWechselrichter, diagrammBilanz } from '../src/lib/monitoring-diagramm.js';

const dist = process.argv[2] || 'dist';
const ergebnisse = [];
const note = (ok, text) => ergebnisse.push(`${ok ? 'OK  ' : 'FEHL'} ${text}`);
const nah = (a, b) => Math.abs(a - b) < 1e-3;

/* Modell */
const quelle = fs.readFileSync('src/lib/monitoring-modell.js', 'utf8') + fs.readFileSync('src/lib/monitoring-diagramm.js', 'utf8');
note(!/Math\.random|Date\.now|new Date|performance\.now/.test(quelle), 'Modell: kein Zufall, keine Rechneruhr');
const a = simuliereTag();
const b = simuliereTag();
note(JSON.stringify(a) === JSON.stringify(b), 'Modell: zwei Läufe ergeben denselben Tag');
note(a.length === SCHRITTE, `Modell: ${a.length} Viertelstunden`);
const bilanzFehler = a.filter((x) => !nah(x.moeglich, x.einspeisung + x.verlustNb + x.verlustDv + x.technik));
note(bilanzFehler.length === 0, `Modell: möglich = Einspeisung + Verluste in jedem Schritt (${bilanzFehler.length} Abweichungen)`);
const negativ = a.filter((x) => x.einspeisung < -1e-9 || x.verlustNb < -1e-9 || x.verlustDv < -1e-9 || x.technik < -1e-9);
note(negativ.length === 0, 'Modell: keine negativen Energiemengen');
const ueberlapp = a.filter((x) => x.nbAktiv && x.dvAktiv);
note(ueberlapp.length === 0, 'Modell: Vorgaben von Netzbetreiber und Direktvermarkter überlappen nicht');
const dvFalsch = a.filter((x) => (x.wirksam === 'dv') !== (x.preis < 0 && x.verfuegbar > 0));
note(dvFalsch.length === 0, `Modell: Direktvermarkter regelt genau bei negativen Preisen (${dvFalsch.length} Abweichungen)`);
note(a.some((x) => x.nbAktiv && !x.wirksam && x.moeglich > 0), 'Modell: Vorgabe des Netzbetreibers zeitweise nicht wirksam (Wolke)');
note(a.filter((x) => x.wirksam === 'nb').every((x) => x.t >= NB.von && x.t < NB.bis && nah(x.einspeisung, NB.grenze)), 'Modell: wirksame Vorgabe des Netzbetreibers begrenzt auf ihren Wert');
const abweichend = new Set();
for (const x of a) x.wr.forEach((w, k) => Math.abs(w.erwartet - w.ist) > 1e-3 && abweichend.add(k + 1));
note(abweichend.size === 1 && abweichend.has(AUSFALL.wr), `Technik: nur Wechselrichter ${AUSFALL.wr} weicht ab (${[...abweichend].join(', ')})`);
const wrSumme = a.filter((x) => !nah(x.wr.reduce((s, w) => s + w.ist, 0), x.einspeisung));
note(wrSumme.length === 0, 'Technik: Summe der Wechselrichter = Einspeisung');
note(a.filter((x) => x.ausfall).every((x) => x.t >= AUSFALL.von && x.t < AUSFALL.bis && x.technik > 0), 'Technik: Ausfall nur im Ausfallfenster');
const s = tagesbilanz(a);
note(s.verlustDv > s.verlustNb && s.verlustNb > s.technik && s.einspeisung > s.verlustDv, 'Bilanz: Einspeisung > Direktvermarkter > Netzbetreiber > Technik (Bildunterschrift stimmt)');

/* Texte */
const ohneText = a.filter((x) => !lage(x) || lage(x).length < 10);
note(ohneText.length === 0, 'Texte: jede Viertelstunde hat eine Lage in Worten');
const v = verlauf(a);
note(v[0].von === 0 && v[v.length - 1].bis === 24 && v.every((x, i) => i === 0 || nah(x.von, v[i - 1].bis)), `Texte: Verlauf in Worten deckt den Tag lückenlos ab (${v.length} Abschnitte)`);

/* Diagramme */
const svgs = [diagrammBegrenzung(a), diagrammPotenzial(a), diagrammPreis(a), diagrammErloes(a), ...diagrammeWechselrichter(a), diagrammBilanz(a)];
const alles = svgs.map((d) => d.svg).join('');
note(!/NaN|undefined|Infinity/.test(alles), 'Diagramme: keine ungültigen Werte');
const kb = alles.length / 1024;
note(kb < 60, `Diagramme: unter 60 KB (${kb.toFixed(1)} KB)`);
const labels = svgs.flatMap((d) => d.labels || []).map((l) => l.text);
const einheit = /\d[\d.,]*\s*(k?W|kWp|kWh|MWh?|€|ct|%|Euro)\b/;
note(!labels.some((t) => einheit.test(t)), 'Diagramme: Beschriftungen ohne Zahlen mit Einheit');

/* gebaute Seite */
const datei = `${dist}/unsere-leistungen/monitoring.html`;
if (fs.existsSync(datei)) {
  const html = fs.readFileSync(datei, 'utf8');
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, ' ');
  note(!einheit.test(text), 'Seite: keine Zahlen mit Einheit im Text');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const doppelt = ids.filter((x, i) => ids.indexOf(x) !== i);
  note(doppelt.length === 0, `Seite: keine doppelten IDs ${doppelt.join(', ')}`);
  for (const k of ['begrenzung', 'potenzial', 'wirtschaft', 'technik', 'entscheidung']) {
    note(html.includes(`id="ea-${k}"`) && html.includes(`href="#ea-${k}"`), `Seite: Kapitel ${k} mit Sprungmarke`);
  }
  note(/Mehr Klarheit über Ihren Solarpark/.test(html), 'Seite: eigener Abschluss „Mehr Klarheit über Ihren Solarpark.“');
  note((html.match(/class="mon-umfang__liste"[\s\S]*?<\/ol>/)?.[0].match(/<li/g) || []).length === 8, 'Seite: acht Punkte im Leistungsüberblick');
} else note(false, `Seite: ${datei} fehlt (vorher bauen)`);

console.log(ergebnisse.join('\n'));
const fehler = ergebnisse.filter((e) => e.startsWith('FEHL')).length;
console.log(`${ergebnisse.length} Prüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
