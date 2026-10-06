// Beispieltag am Netzanschluss eines Solarparks für die Seite Solarpark-Monitoring.
// Schematisch und deterministisch: kein Zufall, keine Uhr des Rechners, keine Einheiten.
// Leistung ist auf die installierte Leistung normiert (1), der Preis ist normiert (Vorzeichen
// zählt). Ablauf: Sonnenaufgang, Ausfall von Wechselrichter 6 am Vormittag, Vorgabe des
// Netzbetreibers um die Mittagszeit (zeitweise durch eine Wolke nicht wirksam), Abregelung
// durch den Direktvermarkter bei negativen Preisen, Abend.

export const SCHRITTE = 96; // Viertelstunden
export const WR_ANZAHL = 8;
export const AUSFALL = { wr: 6, von: 8.5, bis: 10 };
export const NB = { von: 11, bis: 12.75, grenze: 0.6 };
const AUF = 5.5;
const UNTER = 21;
const SPITZE = 0.86; // höchste mögliche Erzeugung im Verhältnis zur installierten Leistung

const glocke = (t) => {
  if (t <= AUF || t >= UNTER) return 0;
  const x = (t - (AUF + UNTER) / 2) / ((UNTER - AUF) / 2);
  return Math.cos((x * Math.PI) / 2) ** 1.6;
};
const gauss = (t, mitte, breite) => Math.exp(-((t - mitte) ** 2) / (2 * breite * breite));
// Wolke gegen Mittag: mögliche Erzeugung fällt zeitweise unter die Vorgabe des Netzbetreibers
const wolke = (t) => 1 - 0.4 * gauss(t, 11.95, 0.3);
// Preis mit Morgen- und Abendspitze und negativen Stunden am frühen Nachmittag
const preisKurve = (t) => 0.62 + 0.3 * gauss(t, 8, 1.2) + 0.55 * gauss(t, 19.5, 1.4) - 1.05 * gauss(t, 14.3, 1.45);

const r4 = (x) => Math.round(x * 1e4) / 1e4;

/** Zustand je Viertelstunde */
export function simuliereTag() {
  const schritte = [];
  for (let i = 0; i < SCHRITTE; i++) {
    const t = i / 4 + 0.125; // Mitte der Viertelstunde
    const preis = r4(preisKurve(t));
    const moeglich = r4(SPITZE * glocke(t) * wolke(t));
    const ausfall = t >= AUSFALL.von && t < AUSFALL.bis;
    const technik = ausfall ? r4(moeglich / WR_ANZAHL) : 0;
    const verfuegbar = r4(moeglich - technik);
    const nbAktiv = t >= NB.von && t < NB.bis;
    const dvAktiv = preis < 0;
    const grenzeNb = nbAktiv ? NB.grenze : 1;
    const grenzeDv = dvAktiv ? 0 : 1;
    const grenze = Math.min(1, grenzeNb, grenzeDv);
    const einspeisung = r4(Math.min(verfuegbar, grenze));
    const begrenzt = verfuegbar > grenze + 1e-9;
    const wirksam = begrenzt ? (grenzeDv < grenzeNb ? 'dv' : 'nb') : null;
    const verlustNb = wirksam === 'nb' ? r4(verfuegbar - einspeisung) : 0;
    const verlustDv = wirksam === 'dv' ? r4(verfuegbar - einspeisung) : 0;
    // Wechselrichter: erwartet ist der Anteil an der möglichen Erzeugung unter Berücksichtigung
    // der wirksamen Vorgabe (eine Abregelung ist kein technischer Fehler); Nr. 6 bei Ausfall ohne Leistung
    const laufend = WR_ANZAHL - (ausfall ? 1 : 0);
    const wr = Array.from({ length: WR_ANZAHL }, (_, k) => {
      const aus = ausfall && k + 1 === AUSFALL.wr;
      return { erwartet: r4(Math.min(moeglich, grenze) / WR_ANZAHL), ist: aus ? 0 : r4(einspeisung / laufend) };
    });
    schritte.push({
      i,
      t,
      preis,
      moeglich,
      verfuegbar,
      einspeisung,
      technik,
      verlustNb,
      verlustDv,
      nbAktiv,
      dvAktiv,
      wirksam,
      ausfall,
      wr,
      erloes: r4(einspeisung * preis),
      ausfallwertNb: r4(verlustNb * Math.max(0, preis)),
    });
  }
  return schritte;
}

/** Summen des Tages, nur für Proportionen (Tagesbilanz ohne Zahlen) */
export function tagesbilanz(tag) {
  const s = (k) => tag.reduce((a, x) => a + x[k], 0);
  return { moeglich: s('moeglich'), einspeisung: s('einspeisung'), verlustNb: s('verlustNb'), verlustDv: s('verlustDv'), technik: s('technik') };
}

export const uhrzeit = (stunde) => {
  const h = Math.floor(stunde + 1e-9);
  const m = Math.round((stunde - h) * 60);
  return `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Lage in Worten zu einem Schritt (für Ablesefeld und Tabelle) */
export function lage(x) {
  if (x.moeglich <= 0) return 'Nacht, keine Erzeugung.';
  const teile = [];
  if (x.wirksam === 'nb') teile.push('Der Netzbetreiber begrenzt die Einspeisung, seine Vorgabe ist wirksam.');
  else if (x.nbAktiv) teile.push('Die Vorgabe des Netzbetreibers liegt an, eine Wolke hält die mögliche Erzeugung darunter: keine Begrenzung.');
  if (x.wirksam === 'dv') teile.push('Negative Preise, der Direktvermarkter regelt die Anlage ab.');
  if (x.ausfall) teile.push(`Wechselrichter ${AUSFALL.wr} ohne Leistung, die Einspeisung liegt um seinen Anteil unter der möglichen Erzeugung.`);
  if (!teile.length) teile.push(x.preis < 0 ? 'Negative Preise.' : 'Keine Begrenzung, die Anlage speist ein, was möglich ist.');
  return teile.join(' ');
}

/** Zusammenhängende Zeitabschnitte gleicher Lage */
export function verlauf(tag) {
  const abschnitte = [];
  for (const x of tag) {
    const text = lage(x);
    const letzter = abschnitte[abschnitte.length - 1];
    if (letzter && letzter.text === text) letzter.bis = x.i / 4 + 0.25;
    else abschnitte.push({ von: x.i / 4, bis: x.i / 4 + 0.25, text });
  }
  return abschnitte;
}
