// Diagramme für „Ein Tag am Netzanschluss“ als SVG, beim Build erzeugt. Feste Seitenverhältnisse,
// Texte als HTML darüber (Prozentlagen). Je Diagramm eine Achse. Farben nach CD-Diagrammfolge,
// zusätzlich unterschieden durch Schraffur (45°/135°), Strichart und direkte Beschriftung.
import { NB, AUSFALL, WR_ANZAHL, tagesbilanz } from './monitoring-modell.js';

export const FARBEN = { nb: '#2F2482', dv: '#C83C30', einspeisung: '#0C1A3D', moeglich: '#8D8AB8', technik: '#E8A49C', linie: '#E0E0E0' };
const B = 600;
const H = 240;
const OBEN = 26;
const UNTEN = 214;
// Preis und Erlös stehen untereinander, deshalb flacher
const H2 = 170;
const OBEN2 = 18;
const UNTEN2 = 156;
const yFlach = (p, min, max) => UNTEN2 - ((p - min) / (max - min)) * (UNTEN2 - OBEN2);
const f = (n) => (Math.round(n * 10) / 10).toString();
const xVon = (t) => (t / 24) * B;
const yVon = (p, min = 0, max = 1) => UNTEN - ((p - min) / (max - min)) * (UNTEN - OBEN);
const prozentX = (t) => `${((t / 24) * 100).toFixed(2)}%`;
const prozentY = (y) => `${((y / H) * 100).toFixed(2)}%`;
const prozentY2 = (y) => `${((y / H2) * 100).toFixed(2)}%`;

/** Musterdefinitionen, einmal je Seite (in einer unsichtbaren SVG) */
export const muster = `<defs>
<pattern id="ea-muster-nb" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="${FARBEN.nb}" fill-opacity=".14"/><path d="M0 0V7" stroke="${FARBEN.nb}" stroke-width="2"/></pattern>
<pattern id="ea-muster-dv" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="7" height="7" fill="${FARBEN.dv}" fill-opacity=".12"/><path d="M0 0V7" stroke="${FARBEN.dv}" stroke-width="2"/></pattern>
<pattern id="ea-muster-technik" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${FARBEN.technik}" fill-opacity=".55"/><circle cx="3" cy="3" r="1.1" fill="${FARBEN.dv}"/></pattern>
</defs>`;

const linie = (tag, wert, min, max) => 'M' + tag.map((x) => `${f(xVon(x.t))} ${f(yVon(wert(x), min, max))}`).join('L');

// Fläche zwischen zwei Verläufen, nur dort, wo bedingung gilt (zusammenhängende Abschnitte)
function flaechen(tag, oben, unten, bedingung) {
  const teile = [];
  let lauf = [];
  const schliessen = () => {
    if (!lauf.length) return;
    const a = lauf[0].t - 0.125;
    const b = lauf[lauf.length - 1].t + 0.125;
    const o = [[a, oben(lauf[0])], ...lauf.map((x) => [x.t, oben(x)]), [b, oben(lauf[lauf.length - 1])]];
    const u = [[b, unten(lauf[lauf.length - 1])], ...lauf.slice().reverse().map((x) => [x.t, unten(x)]), [a, unten(lauf[0])]];
    teile.push('M' + [...o, ...u].map(([t, p]) => `${f(xVon(t))} ${f(yVon(p))}`).join('L') + 'Z');
    lauf = [];
  };
  for (const x of tag) {
    if (bedingung(x)) lauf.push(x);
    else schliessen();
  }
  schliessen();
  return teile.join('');
}

// Zeitabschnitte, in denen bedingung gilt
function abschnitte(tag, bedingung) {
  const liste = [];
  for (const x of tag) {
    if (!bedingung(x)) continue;
    const von = x.i / 4;
    const letzter = liste[liste.length - 1];
    if (letzter && Math.abs(letzter.bis - von) < 1e-9) letzter.bis = von + 0.25;
    else liste.push({ von, bis: von + 0.25 });
  }
  return liste;
}

const gitter = (mitInstalliert = true) =>
  [
    `<path class="ea-gitter" d="${[6, 12, 18].map((h) => `M${f(xVon(h))} ${OBEN}V${UNTEN}`).join('')}"/>`,
    mitInstalliert ? `<path class="ea-bezug" d="M0 ${f(yVon(1))}H${B}"/>` : '',
    `<path class="ea-achse" d="M0 ${UNTEN}H${B}"/>`,
  ].join('');

const stunden = [6, 12, 18].map((h) => ({ text: `${h} Uhr`, x: prozentX(h), art: 'achse' }));

/** 1. Wer begrenzt: Einspeisung, Vorgaben als Stufenlinien, wirksame Vorgabe als Leiste */
export function diagrammBegrenzung(tag) {
  const dv = abschnitte(tag, (x) => x.dvAktiv)[0];
  const wirksamNb = abschnitte(tag, (x) => x.wirksam === 'nb');
  const wirksamDv = abschnitte(tag, (x) => x.wirksam === 'dv');
  const leiste = (liste, farbe) => liste.map((a) => `<rect x="${f(xVon(a.von))}" y="${UNTEN + 10}" width="${f(xVon(a.bis) - xVon(a.von))}" height="8" fill="${farbe}"/>`).join('');
  const svg = [
    gitter(),
    `<path d="M${f(xVon(NB.von))} ${f(yVon(NB.grenze) - 6)}v6H${f(xVon(NB.bis))}v-6" fill="none" stroke="${FARBEN.nb}" stroke-width="2.5"/>`,
    `<path d="M${f(xVon(dv.von))} ${f(UNTEN - 8)}v6H${f(xVon(dv.bis))}v-6" fill="none" stroke="${FARBEN.dv}" stroke-width="2.5"/>`,
    `<path d="${linie(tag, (x) => x.einspeisung)}" fill="none" stroke="${FARBEN.einspeisung}" stroke-width="2.25" stroke-linejoin="round"/>`,
    leiste(wirksamNb, 'url(#ea-muster-nb)'),
    leiste(wirksamDv, 'url(#ea-muster-dv)'),
  ].join('');
  const labels = [
    ...stunden,
    { text: 'installierte Leistung', x: '0%', y: prozentY(yVon(1) - 4), art: 'bezug' },
    { text: 'Einspeisung', x: prozentX(18.9), y: prozentY(yVon(0.34)), art: 'einspeisung' },
    { text: 'wirksam', x: '0%', y: prozentY(UNTEN + 14), art: 'leiste' },
  ];
  return { svg, labels, hoehe: H + 20 };
}

/** 2. Potenzial und entgangene Energie, getrennt nach Netzbetreiber, Direktvermarkter, Technik */
export function diagrammPotenzial(tag) {
  const svg = [
    gitter(),
    `<path d="${flaechen(tag, (x) => x.moeglich, (x) => x.verfuegbar, (x) => x.technik > 0)}" fill="url(#ea-muster-technik)"/>`,
    `<path d="${flaechen(tag, (x) => x.verfuegbar, (x) => x.einspeisung, (x) => x.wirksam === 'nb')}" fill="url(#ea-muster-nb)"/>`,
    `<path d="${flaechen(tag, (x) => x.verfuegbar, (x) => x.einspeisung, (x) => x.wirksam === 'dv')}" fill="url(#ea-muster-dv)"/>`,
    `<path d="${linie(tag, (x) => x.moeglich)}" fill="none" stroke="${FARBEN.moeglich}" stroke-width="2" stroke-dasharray="5 4"/>`,
    `<path d="${linie(tag, (x) => x.einspeisung)}" fill="none" stroke="${FARBEN.einspeisung}" stroke-width="2.25" stroke-linejoin="round"/>`,
  ].join('');
  const labels = [
    ...stunden,
    { text: 'installierte Leistung', x: '0%', y: prozentY(yVon(1) - 4), art: 'bezug' },
    { text: 'mögliche Erzeugung', x: prozentX(16.1), y: prozentY(yVon(0.8)), art: 'moeglich' },
    { text: 'Einspeisung', x: prozentX(18.9), y: prozentY(yVon(0.34)), art: 'einspeisung' },
  ];
  return { svg, labels, hoehe: H };
}

/** 3a. Preis: eine Achse mit Nulllinie, negative Stunden hervorgehoben */
export function diagrammPreis(tag) {
  const min = -0.6;
  const max = 1.2;
  const y0 = yFlach(0, min, max);
  const lauf = tag.filter((x) => x.preis < 0);
  const a = lauf[0].t - 0.125;
  const b = lauf[lauf.length - 1].t + 0.125;
  const negFlaeche = 'M' + [[a, 0], ...lauf.map((x) => [x.t, x.preis]), [b, 0]].map(([t, p]) => `${f(xVon(t))} ${f(yFlach(p, min, max))}`).join('L') + 'Z';
  const svg = [
    `<path class="ea-gitter" d="${[6, 12, 18].map((h) => `M${f(xVon(h))} ${OBEN2}V${UNTEN2}`).join('')}"/>`,
    `<path class="ea-null" d="M0 ${f(y0)}H${B}"/>`,
    `<path d="${negFlaeche}" fill="url(#ea-muster-dv)"/>`,
    `<path d="M${tag.map((x) => `${f(xVon(x.t))} ${f(yFlach(x.preis, min, max))}`).join('L')}" fill="none" stroke="${FARBEN.einspeisung}" stroke-width="2.25" stroke-linejoin="round"/>`,
  ].join('');
  const tief = tag.reduce((m, x) => (x.preis < m.preis ? x : m), tag[0]);
  const labels = [
    { text: 'null', x: '0%', y: prozentY2(y0 - 3), art: 'bezug' },
    { text: 'negative Preise', x: prozentX(b + 0.4), y: prozentY2(yFlach(tief.preis, min, max) + 4), art: 'dv' },
  ];
  return { svg, labels, hoehe: H2 };
}

/** 3b. Rechnerische Werte je Stunde: Einspeisung mal Preis, dazu der Wert der Ausfallenergie */
export function diagrammErloes(tag) {
  const stundenWerte = Array.from({ length: 24 }, (_, h) => {
    const s = tag.filter((x) => Math.floor(x.t) === h);
    return {
      h,
      erloes: s.reduce((a, x) => a + Math.max(0, x.erloes), 0),
      ausfall: s.reduce((a, x) => a + x.ausfallwertNb, 0),
      abgeregelt: s.some((x) => x.wirksam === 'dv'),
    };
  });
  const max = Math.max(...stundenWerte.map((s) => s.erloes + s.ausfall)) * 1.08;
  const y = (w) => yFlach(w, 0, max);
  const breite = B / 24;
  const teile = [];
  for (const s of stundenWerte) {
    const x = s.h * breite + 3;
    const w = breite - 6;
    const yE = y(s.erloes);
    if (s.erloes > 0.0005) teile.push(`<path d="M${f(x)} ${UNTEN2}V${f(Math.min(UNTEN2 - 1, yE + 3))}q0 -3 3 -3h${f(w - 6)}q3 0 3 3V${UNTEN2}Z" fill="${FARBEN.einspeisung}"/>`);
    if (s.ausfall > 0.0005) {
      const yA = y(s.erloes + s.ausfall);
      teile.push(`<rect x="${f(x)}" y="${f(yA)}" width="${f(w)}" height="${f(Math.max(1, yE - yA - 2))}" fill="url(#ea-muster-nb)"/>`);
    }
    if (s.abgeregelt && s.erloes < 0.0005) teile.push(`<path d="M${f(x + 2)} ${UNTEN2 - 4}h${f(w - 4)}" stroke="${FARBEN.dv}" stroke-width="2.5"/>`);
  }
  const dv = abschnitte(tag, (x) => x.wirksam === 'dv')[0];
  const svg = [`<path class="ea-gitter" d="${[6, 12, 18].map((h) => `M${f(xVon(h))} ${OBEN2}V${UNTEN2}`).join('')}"/>`, `<path class="ea-achse" d="M0 ${UNTEN2}H${B}"/>`, ...teile].join('');
  const labels = [{ text: 'abgeregelt', x: prozentX(dv.von + 0.2), y: prozentY2(UNTEN2 - 12), art: 'dv' }];
  return { svg, labels, hoehe: H2 };
}

/** 4. Wechselrichter einzeln: erwartet gestrichelt, tatsächlich durchgezogen */
export function diagrammeWechselrichter(tag) {
  const b = 160;
  const h = 64;
  const max = Math.max(...tag.map((x) => x.wr[0].erwartet)) * 1.1;
  const x = (t) => (t / 24) * b;
  const y = (p) => h - 4 - (p / max) * (h - 10);
  return Array.from({ length: WR_ANZAHL }, (_, k) => {
    const nr = k + 1;
    const erw = 'M' + tag.map((s) => `${f(x(s.t))} ${f(y(s.wr[k].erwartet))}`).join('L');
    const ist = 'M' + tag.map((s) => `${f(x(s.t))} ${f(y(s.wr[k].ist))}`).join('L');
    const luecke =
      nr === AUSFALL.wr
        ? (() => {
            const lauf = tag.filter((s) => s.ausfall);
            const pts = [...lauf.map((s) => [s.t, s.wr[k].erwartet]), ...lauf.slice().reverse().map((s) => [s.t, 0])];
            return `<path d="M${pts.map(([t, p]) => `${f(x(t))} ${f(y(p))}`).join('L')}Z" fill="url(#ea-muster-technik)"/>`;
          })()
        : '';
    const svg = [
      `<path class="ea-achse" d="M0 ${h - 4}H${b}"/>`,
      luecke,
      `<path d="${erw}" fill="none" stroke="${FARBEN.moeglich}" stroke-width="1.5" stroke-dasharray="4 3"/>`,
      `<path d="${ist}" fill="none" stroke="${FARBEN.einspeisung}" stroke-width="1.75" stroke-linejoin="round"/>`,
    ].join('');
    return { nr, svg, viewBox: `0 0 ${b} ${h}`, auffaellig: nr === AUSFALL.wr };
  });
}

/** 5. Tagesbilanz als ein Balken, Anteile ohne Zahlen */
export function diagrammBilanz(tag) {
  const s = tagesbilanz(tag);
  const teile = [
    { key: 'einspeisung', wert: s.einspeisung, fill: FARBEN.einspeisung, text: 'eingespeist' },
    { key: 'nb', wert: s.verlustNb, fill: 'url(#ea-muster-nb)', text: 'abgeregelt durch den Netzbetreiber' },
    { key: 'dv', wert: s.verlustDv, fill: 'url(#ea-muster-dv)', text: 'abgeregelt durch den Direktvermarkter' },
    { key: 'technik', wert: s.technik, fill: 'url(#ea-muster-technik)', text: 'technisch bedingt' },
  ];
  const summe = teile.reduce((a, t) => a + t.wert, 0);
  const b = B;
  const h = 44;
  let x = 0;
  const rects = teile.map((t, i) => {
    const w = Math.max(3, (t.wert / summe) * b - (i < teile.length - 1 ? 2 : 0));
    const r = `<rect x="${f(x)}" y="0" width="${f(w)}" height="${h}" fill="${t.fill}"/>`;
    t.mitte = `${(((x + w / 2) / b) * 100).toFixed(2)}%`;
    x += w + 2;
    return r;
  });
  return { svg: rects.join(''), viewBox: `0 0 ${b} ${h}`, teile };
}
