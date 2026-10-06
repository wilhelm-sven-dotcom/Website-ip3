// Tagesmodell für die Grafik „Ein Tag im Energiesystem“: qualitative Profile eines sonnigen
// Frühlingstags, einfache Regeln für die Speicher und daraus die Flüsse auf allen Leitungen.
// Rein und deterministisch (kein DOM, kein Zufall, keine Uhrzeit des Rechners), läuft beim
// Build und im Browser. Alle Größen sind relativ und werden nie als Zahl angezeigt.

export const SCHRITTE = 96; // 15 Minuten
export const DT = 24 / SCHRITTE; // Stunden je Schritt
export const TIEF = 0.3; // Börsenpreis gilt als niedrig
export const HOCH = 0.7; // Börsenpreis gilt als hoch
const ETA = 0.95; // Wirkungsgrad je Richtung
const RUHE = 0.04; // darunter gilt eine Leitung als ruhend

const begrenzt = (v, a, b) => Math.min(b, Math.max(a, v));
const fmod = (a, n) => ((a % n) + n) % n;

// Periodische Interpolation durch Stützpunkte [Stunde, Wert] mit weichem Kosinus-Übergang
function stuetz(punkte, t) {
  const h = fmod(t, 24);
  for (let i = 0; i < punkte.length; i++) {
    const [h0, v0] = punkte[i];
    const [h1raw, v1] = punkte[(i + 1) % punkte.length];
    const h1 = i + 1 < punkte.length ? h1raw : h1raw + 24;
    const hh = h < h0 ? h + 24 : h;
    if (hh >= h0 && hh <= h1) {
      const u = (hh - h0) / (h1 - h0);
      return v0 + (v1 - v0) * (1 - Math.cos(Math.PI * u)) / 2;
    }
  }
  return punkte[0][1];
}

/* ---------- Profile (0..1) ---------- */

export const sonne = (t) => {
  const h = fmod(t, 24);
  return h > 6 && h < 20 ? Math.pow(Math.sin((Math.PI * (h - 6)) / 14), 1.3) : 0;
};

export const wind = (t) =>
  begrenzt(0.55 + 0.25 * Math.cos((2 * Math.PI * (t - 2)) / 24) + 0.07 * Math.sin((2 * Math.PI * t) / 6.5), 0.15, 0.9);

const PREIS = [
  [0, 0.42], [2.5, 0.27], [4.5, 0.3], [7.5, 0.78], [9, 0.62], [12, 0.12],
  [14.5, 0.12], [16.5, 0.45], [19, 1], [21, 0.8], [23, 0.5],
];
export const preis = (t) => stuetz(PREIS, t);

const HAUSHALT = [[0, 0.35], [5, 0.3], [7, 0.8], [9, 0.5], [12, 0.55], [16, 0.5], [19, 1], [22, 0.6]];
const lastHaushalt = (t) => stuetz(HAUSHALT, t);
const GEWERBE = [[0, 0.2], [6, 0.2], [7.5, 0.95], [12, 1], [17, 1], [18.5, 0.9], [19.5, 0.25], [23, 0.2]];
const lastGewerbe = (t) => stuetz(GEWERBE, t);

/* ---------- Anlagen (relative Leistung P und Energie E, nie angezeigt) ---------- */

const ANLAGE = {
  pvFrei: 1,
  wind: 0.8,
  gruen: { p: 0.4, e: 1.6 },
  grau: { p: 0.6, e: 2.4 },
  gewerbe: { pv: 0.35, last: 0.22, laden: 0.06, akku: { p: 0.1, e: 0.4 } },
  mfh: { pv: 0.12, last: 0.15 },
  haus: { pv: 0.05, last: 0.03, auto: 0.02, wp: 0.015, akku: { p: 0.012, e: 0.06 } },
};

/* ---------- Topologie ---------- */

// Knoten der Grafik; wählbar sind die mit `element`
export const KNOTEN = [
  'hochspannung', 'umspannwerk', 'wind', 'pvfrei', 'nvp', 'gruenspeicher', 'grauspeicher',
  'gewerbe', 'gewerbe-dach', 'gewerbe-speicher', 'ladepunkte', 'ons', 'mfh', 'mfh-dach',
  'mfh-wohnungen', 'haus', 'haus-dach', 'heimspeicher', 'auto',
];

// Positiver Fluss heißt: von → nach. typ bestimmt, ob er als Grün- oder Netzstrom gilt.
export const VERBINDUNGEN = [
  { id: 'uw-hs', von: 'umspannwerk', nach: 'hochspannung', ebene: 'hs', typ: 'anschluss' },
  { id: 'wind-uw', von: 'wind', nach: 'umspannwerk', ebene: 'ms', typ: 'erzeugung' },
  { id: 'pv-nvp', von: 'pvfrei', nach: 'nvp', ebene: 'intern', typ: 'erzeugung' },
  { id: 'gruen-nvp', von: 'gruenspeicher', nach: 'nvp', ebene: 'intern', typ: 'speicher-gruen' },
  { id: 'nvp-uw', von: 'nvp', nach: 'umspannwerk', ebene: 'ms', typ: 'erzeugung' },
  { id: 'grau-uw', von: 'grauspeicher', nach: 'umspannwerk', ebene: 'ms', typ: 'speicher-grau' },
  { id: 'gewerbe-uw', von: 'gewerbe', nach: 'umspannwerk', ebene: 'ms', typ: 'anschluss' },
  { id: 'ons-uw', von: 'ons', nach: 'umspannwerk', ebene: 'ms', typ: 'anschluss' },
  { id: 'mfh-ons', von: 'mfh', nach: 'ons', ebene: 'ns', typ: 'anschluss' },
  { id: 'haus-ons', von: 'haus', nach: 'ons', ebene: 'ns', typ: 'anschluss' },
  { id: 'gewerbe-pv', von: 'gewerbe-dach', nach: 'gewerbe', ebene: 'intern', typ: 'erzeugung' },
  { id: 'gewerbe-akku', von: 'gewerbe-speicher', nach: 'gewerbe', ebene: 'intern', typ: 'speicher-eigen' },
  { id: 'gewerbe-laden', von: 'gewerbe', nach: 'ladepunkte', ebene: 'intern', typ: 'last' },
  { id: 'mfh-pv', von: 'mfh-dach', nach: 'mfh-wohnungen', ebene: 'intern', typ: 'erzeugung' },
  { id: 'haus-pv', von: 'haus-dach', nach: 'haus', ebene: 'intern', typ: 'erzeugung' },
  { id: 'haus-akku', von: 'heimspeicher', nach: 'haus', ebene: 'intern', typ: 'speicher-eigen' },
  { id: 'haus-auto', von: 'haus', nach: 'auto', ebene: 'intern', typ: 'last' },
];

// Wählbare Elemente und die Leitungen, die bei Auswahl hervorgehoben werden
export const BEZUG = {
  pvfrei: ['pv-nvp', 'nvp-uw'],
  wind: ['wind-uw'],
  gruenspeicher: ['gruen-nvp', 'nvp-uw'],
  umspannwerk: ['uw-hs', 'wind-uw', 'nvp-uw', 'grau-uw', 'gewerbe-uw', 'ons-uw'],
  grauspeicher: ['grau-uw', 'uw-hs'],
  gewerbe: ['gewerbe-uw', 'gewerbe-pv', 'gewerbe-akku', 'gewerbe-laden'],
  mfh: ['mfh-ons', 'mfh-pv', 'ons-uw'],
  haus: ['haus-ons', 'haus-pv', 'haus-auto', 'haus-akku', 'ons-uw'],
  heimspeicher: ['haus-akku', 'haus-pv'],
};
export const ELEMENTE = Object.keys(BEZUG);

/* ---------- Simulation ---------- */

function leererSpeicher(s, p, e) {
  return { soc: s, p, e };
}

// Laden um `leistung` (begrenzt), gibt die tatsächlich aufgenommene Leistung zurück
function laden(sp, leistung) {
  const raum = ((1 - sp.soc) * sp.e) / (ETA * DT);
  const l = Math.max(0, Math.min(leistung, sp.p, raum));
  sp.soc = Math.min(1, sp.soc + (l * ETA * DT) / sp.e);
  return l;
}

function entladen(sp, leistung) {
  const vorrat = (sp.soc * sp.e * ETA) / DT;
  const l = Math.max(0, Math.min(leistung, sp.p, vorrat));
  sp.soc = Math.max(0, sp.soc - (l * DT) / (ETA * sp.e));
  return l;
}

/** Ein Schritt der Simulation zur Stundenmitte t mit den Speicherzuständen sp (werden fortgeschrieben). */
function schritt(t, sp) {
  const so = sonne(t);
  const pr = preis(t);
  const f = {};
  const z = {};

  // Freifläche mit Grünstromspeicher: lädt nur aus der eigenen PV bei niedrigem Preis
  const pvFrei = ANLAGE.pvFrei * so;
  let gruenLaden = 0;
  let gruenEntladen = 0;
  if (pr <= TIEF && pvFrei > 0) gruenLaden = laden(sp.gruen, pvFrei);
  else if (pr >= HOCH) gruenEntladen = entladen(sp.gruen, ANLAGE.gruen.p);
  f['pv-nvp'] = pvFrei;
  f['gruen-nvp'] = gruenEntladen - gruenLaden;
  f['nvp-uw'] = pvFrei - gruenLaden + gruenEntladen;

  // Wind
  const wi = ANLAGE.wind * wind(t);
  f['wind-uw'] = wi;

  // Graustromspeicher: lädt aus dem Netz bei niedrigem Preis, speist bei hohem ein
  let grauLaden = 0;
  let grauEntladen = 0;
  if (pr <= TIEF) grauLaden = laden(sp.grau, ANLAGE.grau.p);
  else if (pr >= HOCH) grauEntladen = entladen(sp.grau, ANLAGE.grau.p);
  f['grau-uw'] = grauEntladen - grauLaden;

  // Gewerbe: Dach-PV, Ladepunkte bei Sonne, Speicher aus Überschuss, kappt 16 bis 19:30 Uhr
  const g = ANLAGE.gewerbe;
  const gPv = g.pv * so;
  const gLast = g.last * lastGewerbe(t);
  const gLaden = t >= 9 && t < 15 && so > 0.3 ? g.laden : 0;
  let gAkkuLaden = 0;
  let gAkkuEntladen = 0;
  const gUeber = gPv - gLast - gLaden;
  if (gUeber > 0) gAkkuLaden = laden(sp.gewerbe, gUeber);
  else if (t >= 16 && t < 19.5) gAkkuEntladen = entladen(sp.gewerbe, -gUeber);
  const gNetz = gPv - gLast - gLaden - gAkkuLaden + gAkkuEntladen;
  f['gewerbe-pv'] = gPv;
  f['gewerbe-akku'] = gAkkuEntladen - gAkkuLaden;
  f['gewerbe-laden'] = gLaden;
  f['gewerbe-uw'] = gNetz;

  // Mehrfamilienhaus mit Mieterstrom
  const m = ANLAGE.mfh;
  const mPv = m.pv * so;
  const mLast = m.last * lastHaushalt(t);
  f['mfh-pv'] = Math.min(mPv, mLast);
  f['mfh-ons'] = mPv - mLast;

  // Einfamilienhaus: PV, Heimspeicher (nur für das Haus), Wärmepumpe und E-Auto nach Tarif
  const h = ANLAGE.haus;
  const hPv = h.pv * so;
  const hLast = h.last * lastHaushalt(t);
  const autoDa = t >= 17.5 || t < 7.5;
  const autoLaedt = t >= 1 && t < 4.5;
  const auto = autoLaedt ? h.auto : 0;
  const wpLaeuft = (t >= 11 && t < 15) || (t >= 2 && t < 5);
  const wp = wpLaeuft ? h.wp : 0;
  const hBedarf = hLast + wp;
  let hAkkuLaden = 0;
  let hAkkuEntladen = 0;
  if (hPv > hBedarf) hAkkuLaden = laden(sp.heim, hPv - hBedarf);
  else hAkkuEntladen = entladen(sp.heim, hBedarf - hPv);
  const hNetz = hPv - hBedarf - auto - hAkkuLaden + hAkkuEntladen;
  f['haus-pv'] = hPv;
  f['haus-akku'] = hAkkuEntladen - hAkkuLaden;
  f['haus-auto'] = auto;
  f['haus-ons'] = hNetz;

  // Ortsnetzstation und Umspannwerk: Rest gleicht das Hochspannungsnetz aus
  f['ons-uw'] = f['mfh-ons'] + f['haus-ons'];
  const einspeisung = wi + f['nvp-uw'] + f['grau-uw'] + gNetz + f['ons-uw'];
  f['uw-hs'] = einspeisung;

  // Art je Leitung: true = Grünstrom (gefülltes Quadrat), false = Netzstrom (hohl)
  const gruenAnteil = wi + f['nvp-uw'] + Math.max(0, gNetz) + Math.max(0, f['ons-uw']);
  const art = {};
  for (const v of VERBINDUNGEN) {
    const x = f[v.id];
    if (v.typ === 'erzeugung' || v.typ === 'speicher-gruen' || v.typ === 'speicher-eigen') art[v.id] = true;
    else if (v.typ === 'speicher-grau') art[v.id] = false;
    else if (v.typ === 'anschluss') art[v.id] = v.id === 'uw-hs' ? x > 0 && gruenAnteil >= grauEntladen : x > 0;
    else art[v.id] = false;
  }
  art['gewerbe-laden'] = gNetz >= 0;
  art['haus-auto'] = hNetz >= 0;

  // Zustände je Element (Schlüssel für die Lagesätze)
  z.pvfrei = so > 0.6 ? ['viel'] : so > 0.02 ? ['wenig'] : ['ruht'];
  z.wind = [wi / ANLAGE.wind > 0.6 ? 'kraeftig' : wi / ANLAGE.wind > 0.35 ? 'maessig' : 'schwach'];
  z.gruenspeicher = [gruenLaden > 1e-6 ? 'laedt' : gruenEntladen > 1e-6 ? 'speist' : sp.gruen.soc > 0.95 ? 'voll' : sp.gruen.soc < 0.05 ? 'leer' : 'wartet'];
  z.grauspeicher = [grauLaden > 1e-6 ? 'laedt' : grauEntladen > 1e-6 ? 'speist' : sp.grau.soc > 0.95 ? 'voll' : sp.grau.soc < 0.05 ? 'leer' : 'wartet'];
  z.umspannwerk = [einspeisung > 0.05 ? 'export' : einspeisung < -0.05 ? 'import' : 'ausgeglichen'];
  z.gewerbe = [
    gAkkuEntladen > 1e-6 ? 'kappt' : gLast < 0.3 * g.last ? 'ruhe' : gNetz >= 0 ? 'solar' : 'netz',
    ...(gLaden > 0 ? ['laden'] : []),
  ];
  z.mfh = [mPv <= 1e-6 ? 'netz' : mPv >= mLast ? 'ueberschuss' : 'teil'];
  z.haus = [
    autoLaedt ? 'auto' : hAkkuEntladen > 1e-6 ? 'speicher' : hPv > hBedarf ? 'solar' : hPv > 1e-6 ? 'teil' : 'netz',
    ...(wpLaeuft ? ['wp'] : []),
  ];
  z.heimspeicher = [hAkkuLaden > 1e-6 ? 'laedt' : hAkkuEntladen > 1e-6 ? 'versorgt' : sp.heim.soc > 0.95 ? 'voll' : sp.heim.soc < 0.05 ? 'leer' : 'wartet'];

  return { f, art, z, autoDa };
}

/** Simuliert Tage, bis die Speicher periodisch laufen (Füllstand um 0 Uhr = um 24 Uhr), und gibt den nächsten Tag zurück. */
export function simuliereTag() {
  const sp = {
    gruen: leererSpeicher(0.5, ANLAGE.gruen.p, ANLAGE.gruen.e),
    grau: leererSpeicher(0.5, ANLAGE.grau.p, ANLAGE.grau.e),
    gewerbe: leererSpeicher(0.5, ANLAGE.gewerbe.akku.p, ANLAGE.gewerbe.akku.e),
    heim: leererSpeicher(0.5, ANLAGE.haus.akku.p, ANLAGE.haus.akku.e),
  };
  const ergebnis = {
    fluss: Object.fromEntries(VERBINDUNGEN.map((v) => [v.id, new Float64Array(SCHRITTE)])),
    art: Object.fromEntries(VERBINDUNGEN.map((v) => [v.id, new Uint8Array(SCHRITTE)])),
    soc: { gruen: new Float64Array(SCHRITTE + 1), grau: new Float64Array(SCHRITTE + 1), gewerbe: new Float64Array(SCHRITTE + 1), heim: new Float64Array(SCHRITTE + 1) },
    zustand: Object.fromEntries(ELEMENTE.map((e) => [e, []])),
    autoDa: new Uint8Array(SCHRITTE),
    max: {},
  };
  // Einschwingen: höchstens 40 Tage, meist genügen zwei
  for (let tag = 0; tag < 40; tag++) {
    const vorher = Object.values(sp).map((x) => x.soc);
    for (let i = 0; i < SCHRITTE; i++) schritt((i + 0.5) * DT, sp);
    if (Object.values(sp).every((x, k) => Math.abs(x.soc - vorher[k]) < 1e-12)) break;
  }
  for (let i = 0; i < SCHRITTE; i++) {
    for (const k of Object.keys(sp)) ergebnis.soc[k][i] = sp[k].soc;
    const s = schritt((i + 0.5) * DT, sp);
    for (const v of VERBINDUNGEN) {
      ergebnis.fluss[v.id][i] = s.f[v.id];
      ergebnis.art[v.id][i] = s.art[v.id] ? 1 : 0;
    }
    for (const e of ELEMENTE) ergebnis.zustand[e][i] = s.z[e];
    ergebnis.autoDa[i] = s.autoDa ? 1 : 0;
  }
  for (const k of Object.keys(sp)) ergebnis.soc[k][SCHRITTE] = sp[k].soc;
  for (const v of VERBINDUNGEN) {
    ergebnis.max[v.id] = Math.max(1e-9, ...Array.from(ergebnis.fluss[v.id], Math.abs));
  }
  return ergebnis;
}

/* ---------- Abfragen ---------- */

export const PHASEN = [
  { id: 'nacht', von: 22, bis: 5.5, sprung: 3 },
  { id: 'morgen', von: 5.5, bis: 10, sprung: 7.5 },
  { id: 'mittag', von: 10, bis: 16.5, sprung: 13 },
  { id: 'abend', von: 16.5, bis: 22, sprung: 19.5 },
];

export function phaseBei(t) {
  const h = fmod(t, 24);
  return (PHASEN.find((p) => (p.von < p.bis ? h >= p.von && h < p.bis : h >= p.von || h < p.bis)) || PHASEN[0]).id;
}

// Füllstand als Wort: 0 leer … 4 voll
export function fuellstandStufe(soc) {
  return soc < 0.05 ? 0 : soc < 0.3 ? 1 : soc < 0.7 ? 2 : soc < 0.95 ? 3 : 4;
}

// Licht in den Fenstern: 0 aus … 3 viele
export function lichtStufe(t) {
  const h = fmod(t, 24);
  if (sonne(h) > 0.2) return 0;
  if (h >= 17 && h < 22.5) return 3;
  if (h >= 5 && h < 9) return 2;
  return h >= 22.5 || h < 0.5 ? 1 : 0;
}

// Zeitraffer: Nächte laufen doppelt so schnell
export const tempo = (t) => {
  const h = fmod(t, 24);
  return h >= 23 || h < 5 ? 2 : 1;
};

export const uhrzeit = (t) => {
  const min = Math.round(fmod(t, 24) * 60) % 1440;
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
};

/** Zustand zur Uhrzeit t (Stunden): stetige Werte interpoliert, diskrete vom nächsten Schritt. */
export function moment(sim, t) {
  const h = fmod(t, 24);
  const x = h / DT - 0.5;
  const i0 = fmod(Math.floor(x), SCHRITTE);
  const i1 = (i0 + 1) % SCHRITTE;
  const u = x - Math.floor(x);
  const j = fmod(Math.round(h / DT - 0.5), SCHRITTE);
  const fluss = {};
  const staerke = {};
  const richtung = {};
  const art = {};
  for (const v of VERBINDUNGEN) {
    const a = sim.fluss[v.id][i0];
    const b = sim.fluss[v.id][i1];
    const wert = a + (b - a) * u;
    fluss[v.id] = wert;
    const s = Math.abs(wert) / sim.max[v.id];
    staerke[v.id] = s;
    richtung[v.id] = s < RUHE ? 0 : Math.sign(wert);
    art[v.id] = sim.art[v.id][j] ? 'gruen' : 'netz';
  }
  const k = h / DT;
  const k0 = Math.floor(k);
  const ku = k - k0;
  const soc = {};
  for (const name of Object.keys(sim.soc)) {
    const a = sim.soc[name][k0];
    const b = sim.soc[name][Math.min(SCHRITTE, k0 + 1)];
    soc[name] = a + (b - a) * ku;
  }
  const zustand = {};
  for (const e of ELEMENTE) zustand[e] = sim.zustand[e][j];
  return {
    t: h,
    schritt: j,
    phase: phaseBei(h),
    fluss,
    staerke,
    richtung,
    art,
    soc,
    zustand,
    sonne: sonne(h),
    wind: wind(h),
    preis: preis(h),
    licht: lichtStufe(h),
    autoDa: !!sim.autoDa[j],
  };
}
