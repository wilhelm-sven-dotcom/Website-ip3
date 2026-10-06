// Energieflüsse im Overlay: Quadrate wandern auf den sichtbaren Abschnitten der Leitungen
// (gefüllt = Grünstrom, hohl = Netzstrom, rot = gewähltes Element). Ohne Bewegung zeigen
// Dreiecke die Flussrichtung.
import { linienzug, punktBei, quadrat, pfeil } from '../../lib/linienzug.js';

const ABSTAND = 30; // px zwischen zwei Teilchen
const GROESSE = 5; // px Kantenlänge
const PFEIL = 9; // px Pfeillänge
const PFEIL_ABSTAND = 110; // px zwischen Pfeilen

const ARTEN = ['gruen', 'netz', 'gruen-wahl', 'netz-wahl'];

export class Fluss {
  constructor(overlay, linien) {
    this.teilchen = Object.fromEntries(ARTEN.map((a) => [a, overlay.querySelector(`.es-t--${a}`)]));
    this.pfeilPfade = Object.fromEntries(ARTEN.map((a) => [a, overlay.querySelector(`.es-pf--${a}`)]));
    this.k = 1;
    this.zweige = [];
    for (const [id, zweige] of Object.entries(linien)) {
      zweige.forEach((z, i) => this.zweige.push({ id, lz: linienzug(z.p), sichtbar: z.s, phase: (i * 0.37) % 1 }));
    }
    this.letzteD = {};
  }

  /** Bildschirmpixel je SVG-Einheit */
  massstab(k) {
    this.k = k > 0 ? k : 1;
  }

  _setze(pfade, d) {
    for (const a of ARTEN) {
      const key = pfade === this.teilchen ? `t-${a}` : `p-${a}`;
      if (this.letzteD[key] !== d[a]) {
        pfade[a].setAttribute('d', d[a]);
        this.letzteD[key] = d[a];
      }
    }
  }

  /** Teilchen eines Bildes; dt in Sekunden, wahl = Menge der hervorgehobenen Leitungen */
  zeichne(m, dt, wahl) {
    const d = { gruen: '', netz: '', 'gruen-wahl': '', 'netz-wahl': '' };
    const a = GROESSE / this.k;
    const rand = a * 0.6;
    for (const z of this.zweige) {
      const ri = m.richtung[z.id];
      const L = z.lz.laenge;
      if (!ri || L <= 0) continue;
      const n = Math.max(1, Math.round((L * this.k) / ABSTAND));
      const A = L / n;
      const v = (16 + 74 * Math.min(1, m.staerke[z.id])) / this.k;
      // Phase als Anteil des Teilchenabstands, damit ein Wechsel des Maßstabs nichts springen lässt
      z.phase = (((z.phase + (ri * v * dt) / A) % 1) + 1) % 1;
      const art = m.art[z.id] + (wahl.has(z.id) ? '-wahl' : '');
      for (let k = 0; k < n; k++) {
        const s = (z.phase + k) * A;
        if (!z.sichtbar.some(([s0, s1]) => s >= s0 + rand && s <= s1 - rand)) continue;
        const [x, y] = punktBei(z.lz, s);
        d[art] += quadrat(x, y, a, 1);
      }
    }
    this._setze(this.teilchen, d);
  }

  /** Richtungspfeile für Pause, reduzierte Bewegung und Standbild */
  pfeile(m, wahl) {
    const d = { gruen: '', netz: '', 'gruen-wahl': '', 'netz-wahl': '' };
    const g = PFEIL / this.k;
    const abstand = PFEIL_ABSTAND / this.k;
    for (const z of this.zweige) {
      const ri = m.richtung[z.id];
      if (!ri) continue;
      const art = m.art[z.id] + (wahl.has(z.id) ? '-wahl' : '');
      for (const [s0, s1] of z.sichtbar) {
        const l = s1 - s0;
        if (l < g * 2.2) continue;
        const n = Math.max(1, Math.round(l / abstand));
        for (let k = 0; k < n; k++) d[art] += pfeil(z.lz, s0 + ((k + 0.5) / n) * l, g, ri);
      }
    }
    this._setze(this.pfeilPfade, d);
  }

  leeren() {
    this._setze(this.teilchen, { gruen: '', netz: '', 'gruen-wahl': '', 'netz-wahl': '' });
  }
}
