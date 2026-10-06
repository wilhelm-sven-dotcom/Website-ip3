// Szene für „Ein Tag im Energiesystem“: isometrische Landschaft in der Linienoptik der übrigen
// Zeichnungen, beim Build erzeugt. Liefert das Szenen-SVG (Gruppen je Element), die Leitungen
// samt sichtbarer Abschnitte, Markerpositionen, Rotoren, Füllstandsflächen, die Kurven der
// Zeitleiste und den Zustand um 13:00 Uhr als statische Pfeile (funktioniert ohne JavaScript).

import { IsoScene, gableHouse, projiziere } from './iso.js';
import { linienzug, pfad, pfeil } from './linienzug.js';
import { VERBINDUNGEN, ELEMENTE, SCHRITTE, simuliereTag, moment, sonne, preis } from './energiesystem-modell.js';

const SKALA = 10;
const STELLEN = 1;
const P = (p) => projiziere(p, SKALA);
const r1 = (n) => Math.round(n * 10) / 10;

/* ---------- Layout (Weltkoordinaten: x nach rechts vorn, z nach links vorn, y nach oben) ---------- */

export const LAYOUT = {
  wind: { x: -9, z: 13 },
  pvfrei: { x: -25.5, z: 33.5 },
  gruenspeicher: { x: 3, z: 33 },
  nvp: { x: 17, z: 35.5 },
  umspannwerk: { x: 25, z: 27 },
  hochspannung: { x: 37.25, z: 13 },
  grauspeicher: { x: 52, z: 19.5 },
  gewerbe: { x: 10.75, z: 70.25 },
  ons: { x: 53.7, z: 43.9 },
  mfh: { x: 48, z: 59.5 },
  haus: { x: 76.5, z: 33.4 },
  heimspeicher: { x: 85.5, z: 35.2 },
  auto: { x: 87.2, z: 39.4 },
};

/* ---------- Motive (lokale Koordinaten) ---------- */

function boden(sc, x0, z0, x1, z1, bias = -40) {
  sc.mit({ ebene: 0 }, () => sc.poly([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]], 'ground', [], bias));
}

function zaun(sc, x0, z0, x1, z1) {
  const ecken = [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]];
  for (let i = 0; i < 4; i++) sc.line(ecken[i], ecken[(i + 1) % 4], 'fence', -30);
}

// Füllstand: je sichtbarer Seite eine Fläche, deren Höhe das Skript setzt
const PEGEL = [];
function pegelFlaechen(sc, x, z, w, h, d, name) {
  const v = sc.kontext && sc.kontext.versatz ? sc.kontext.versatz : [0, 0, 0];
  const welt = (p) => [p[0] + v[0], p[1] + v[1], p[2] + v[2]];
  const unten = h * 0.08;
  const seiten = [
    [[x + 0.1, unten, z + d], [x + w - 0.1, unten, z + d]],
    [[x + w, unten, z + d - 0.1], [x + w, unten, z + 0.1]],
  ];
  for (const [a, b] of seiten) {
    const id = PEGEL.length;
    PEGEL.push({ id, name, a: P(welt(a)).map(r1), b: P(welt(b)).map(r1), h: r1(h * 0.84 * SKALA) });
    // volle Fläche, damit die Tiefe der Seitenfläche entspricht; die Höhe setzt fuellePegel()
    sc.mit({ klasse: 'es-pegel', attrs: `data-pegel="${name}" data-pegel-id="${id}"` }, () => {
      sc.poly([a, b, [b[0], b[1] + h * 0.84, b[2]], [a[0], a[1] + h * 0.84, a[2]]], 'pegel', [], 0.05);
    });
  }
}

// Container mit Türteilung und optional Füllstandsflächen
function container(sc, x, z, w, h, d, { tueren = 4, pegel = null } = {}) {
  const det = [];
  for (let i = 1; i < tueren + 1; i++) det.push([[x + (i * w) / (tueren + 1), 0.15, z + d], [x + (i * w) / (tueren + 1), h - 0.15, z + d]]);
  sc.box(x, 0, z, w, h, d, { details: { front: det } });
  if (pegel) pegelFlaechen(sc, x, z, w, h, d, pegel);
}

// Windenergieanlage: Turm und Gondel; der Rotor liegt im Overlay und dreht sich
const NABE = 15;
const ROTOR = 6.2;
function windanlage(sc, x, z) {
  boden(sc, x - 1.6, z - 1.6, x + 1.6, z + 1.6, -20);
  const a0 = 0.375;
  const a1 = 0.21;
  sc.poly([[x + a0, 0, z - a0], [x + a1, NABE, z - a1], [x + a1, NABE, z + a1], [x + a0, 0, z + a0]], 'face', [], 0);
  sc.poly([[x - a0, 0, z + a0], [x + a0, 0, z + a0], [x + a1, NABE, z + a1], [x - a1, NABE, z + a1]], 'face', [], 0);
  sc.koerperHinzu([x - 0.3, 0, z - 0.3], [x + 0.3, NABE, z + 0.3]);
  sc.box(x - 0.55, NABE - 0.45, z - 1.6, 1.1, 1.0, 2.4);
  return [x, NABE + 0.05, z + 1.05];
}

function freiflaeche(sc) {
  boden(sc, -1.5, -1.5, 25.5, 17.5, -60);
  const tilt = (22 * Math.PI) / 180;
  const tiefe = 2.6;
  for (let r = 0; r < 4; r++) {
    const z0 = 0.4 + r * 4.1;
    for (let t = 0; t < 2; t++) {
      const x0 = 0.4 + t * 11.8;
      const o = [x0, 0.6, z0 + tiefe * Math.cos(tilt)];
      const u = [11, 0, 0];
      const v = [0, tiefe * Math.sin(tilt), -tiefe * Math.cos(tilt)];
      for (const fx of [0.12, 0.88]) sc.line([x0 + fx * 11, 0, z0 + tiefe * Math.cos(tilt) - 0.2], [x0 + fx * 11, 0.6, z0 + tiefe * Math.cos(tilt) - 0.2], 'line', -0.5);
      sc.panels(o, u, v, 8, 2, { bias: 0.2 });
    }
  }
  zaun(sc, -1, -1, 25, 17);
}

function station(sc, x, z, w = 2.4, h = 2.1, d = 1.8) {
  sc.box(x, 0, z, w, h, d, { details: { front: [[[x + w * 0.22, 0.1, z + d], [x + w * 0.22, h - 0.5, z + d]], [[x + w * 0.55, 0.1, z + d], [x + w * 0.55, h - 0.5, z + d]]] } });
  sc.box(x - 0.15, h, z - 0.15, w + 0.3, 0.18, d + 0.3);
}

function trafo(sc, x, z) {
  const rippen = [];
  for (let i = 1; i < 6; i++) rippen.push([[x + (i * 2.2) / 6, 0.3, z + 1.8], [x + (i * 2.2) / 6, 1.9, z + 1.8]]);
  sc.box(x, 0, z, 2.2, 2.2, 1.8, { details: { front: rippen } });
  for (let i = 0; i < 3; i++) sc.line([x + 0.45 + i * 0.65, 2.2, z + 0.9], [x + 0.45 + i * 0.65, 3.1, z + 0.9], 'line', 2);
}

function umspannwerk(sc) {
  boden(sc, -1, -1, 17, 13, -60);
  zaun(sc, -0.5, -0.5, 16.5, 12.5);
  // Portale und Sammelschiene hinten rechts, dort beginnt die Hochspannungsleitung
  for (const x of [9, 15.5]) {
    sc.line([x, 0, 0.8], [x, 6.2, 0.8], 'line', 1);
    sc.line([x, 0, 3.2], [x, 6.2, 3.2], 'line', 1);
    sc.line([x, 6.2, 0.8], [x, 6.2, 3.2], 'line', 1);
  }
  sc.line([9, 6.2, 0.8], [15.5, 6.2, 0.8], 'line', 1.2);
  sc.line([9, 5.4, 2], [15.5, 5.4, 2], 'line', 1.2);
  for (const x of [10.6, 12.25, 13.9]) {
    sc.line([x, 0, 2], [x, 3.4, 2], 'line', 0.5);
    sc.line([x, 3.4, 2], [x, 5.4, 2], 'fine', 0.5);
  }
  // Transformatoren in der Mitte, Schaltanlage für die Mittelspannung vorn links
  trafo(sc, 8.6, 4.4);
  trafo(sc, 12.6, 4.4);
  station(sc, 1, 7.5, 6, 3, 3.5);
}

function mast(sc, x, z, h = 13) {
  // Gittermast als Linien; die Leitung läuft entlang z, die Traversen entlang x
  const b = 1.1;
  const t = 0.35;
  const fuss = [[x - b, 0, z - b], [x + b, 0, z - b], [x + b, 0, z + b], [x - b, 0, z + b]];
  const kopf = [[x - t, h, z - t], [x + t, h, z - t], [x + t, h, z + t], [x - t, h, z + t]];
  for (let i = 0; i < 4; i++) sc.line(fuss[i], kopf[i], 'line', 0);
  const lerp = (a, c, k) => a.map((v, i) => v + (c[i] - v) * k);
  for (const [i, j] of [[1, 2], [2, 3]]) {
    for (let k = 0; k < 3; k++) sc.line(lerp(fuss[i], kopf[i], k / 3), lerp(fuss[j], kopf[j], (k + 1) / 3), 'fine', 0.2);
  }
  for (const [hy, w] of [[h - 2.4, 3], [h - 0.2, 2]]) sc.line([x - w, hy, z], [x + w, hy, z], 'line', 0.4);
}

function halle(sc) {
  const W = 17;
  const D = 9;
  const H = 5;
  boden(sc, -1.5, -1, 23.5, 15.5, -60);
  sc.box(0, 0, 0, W, H, D);
  sc.box(-0.15, H, -0.15, W + 0.3, 0.35, 0.3);
  sc.box(-0.15, H, D - 0.15, W + 0.3, 0.35, 0.3);
  sc.box(W - 0.15, H, -0.15, 0.3, 0.35, D + 0.3);
  for (let r = 0; r < 3; r++) {
    const z = 1.0 + r * 2.6;
    sc.panels([1, H + 0.15, z], [W - 2, 0, 0], [0, 0.45, 1.3], 10, 1, { bias: 2 + r * 0.01 });
  }
  for (let i = 0; i < 2; i++) {
    const x = 2 + i * 5;
    sc.poly([[x, 0, D], [x + 3.4, 0, D], [x + 3.4, 3.4, D], [x, 3.4, D]], 'dark', [], 0.7);
  }
  fenster(sc, [[12, 3.6, D], [W - 1, 3.6, D], [W - 1, 4.3, D], [12, 4.3, D]], 3);
  fenster(sc, [[W, 2.6, 4.4], [W, 2.6, 6.4], [W, 3.6, 6.4], [W, 3.6, 4.4]], 2);
}

function auto(sc, x, z, laengs = 'x') {
  if (laengs === 'x') {
    sc.box(x, 0.25, z, 3.4, 0.75, 1.6);
    sc.box(x + 0.75, 1.0, z + 0.12, 1.8, 0.6, 1.36);
  } else {
    sc.box(x, 0.25, z, 1.6, 0.75, 3.4);
    sc.box(x + 0.12, 1.0, z + 0.75, 1.36, 0.6, 1.8);
  }
}

function fenster(sc, pts, licht) {
  sc.mit({ klasse: 'es-fenster', attrs: `data-licht="${licht}"` }, () => sc.poly(pts, 'dark', [], 0.6));
}

// deterministische Lichtstufen 1..3 je Fenster
const lichtStufe = (a, b) => 1 + ((a * 7 + b * 5 + ((a * b) % 3)) % 3);

function fensterVorn(sc, x0, y, z, n, abstand, w, h, reihe) {
  for (let i = 0; i < n; i++) {
    const x = x0 + i * abstand;
    fenster(sc, [[x, y, z], [x + w, y, z], [x + w, y + h, z], [x, y + h, z]], lichtStufe(reihe, i));
  }
}

function fensterSeite(sc, x, y, z0, n, abstand, w, h, reihe) {
  for (let i = 0; i < n; i++) {
    const z = z0 + i * abstand;
    fenster(sc, [[x, y, z], [x, y, z + w], [x, y + h, z + w], [x, y + h, z]], lichtStufe(reihe, i + 3));
  }
}

// Satteldach als zwei verdeckende Körper (Sichtbarkeit der Leitungen)
function dachKoerper(sc, x, z, w, d, wandH, dachH) {
  sc.koerperHinzu([x - 0.35, wandH, z - 0.35], [x + w + 0.35, wandH + dachH / 2, z + d + 0.35]);
  sc.koerperHinzu([x - 0.35, wandH + dachH / 2, z + d / 4], [x + w + 0.35, wandH + dachH, z + (3 * d) / 4]);
}

function mehrfamilienhaus(sc) {
  const W = 11;
  const D = 7;
  const H = 8.4;
  boden(sc, -1, -1, 13, 10, -40);
  gableHouse(sc, 0, 0, W, D, H, 2.6, { pv: { cols: 8, rows: 2, inset: 0.6 } });
  dachKoerper(sc, 0, 0, W, D, H, 2.6);
  for (let s = 0; s < 3; s++) fensterVorn(sc, 0.9, 0.9 + s * 2.6, D, 5, 2.05, 1.1, 1.3, s + 1);
  for (let s = 0; s < 3; s++) fensterSeite(sc, W, 0.9 + s * 2.6, 1.1, 2, 3, 1.2, 1.3, s + 4);
}

function einfamilienhaus(sc) {
  const W = 7.4;
  const D = 5.6;
  boden(sc, -1, -1, 13, 10.4, -40);
  gableHouse(sc, 0, 0, W, D, 4, 2.6, { pv: { cols: 5, rows: 2, inset: 0.6 } });
  dachKoerper(sc, 0, 0, W, D, 4, 2.6);
  sc.poly([[4.9, 0, D], [5.9, 0, D], [5.9, 2.1, D], [4.9, 2.1, D]], 'dark', [], 0.7);
  fensterVorn(sc, 0.9, 2.4, D, 3, 2.1, 1.0, 1.1, 7);
  fensterVorn(sc, 0.9, 0.7, D, 2, 2.1, 1.0, 1.2, 8);
  fensterSeite(sc, W, 2.4, 1.2, 2, 2.2, 1.0, 1.1, 9);
  // Wärmepumpe an der Ostseite, Wallbox an der Wand
  sc.box(W + 0.9, 0, 0.2, 1.0, 1.1, 1.4, { details: { right: [[[W + 1.9, 0.25, 0.5], [W + 1.9, 0.85, 0.5]], [[W + 1.9, 0.25, 1.3], [W + 1.9, 0.85, 1.3]]] } });
  sc.box(W, 0.9, 4.9, 0.18, 0.6, 0.4);
}

/* ---------- Leitungen in Weltkoordinaten ---------- */

// boden: Kabel am Boden (unter den Gebäuden gezeichnet, also korrekt verdeckt), wand: an einer
// sichtbaren Fassade, luft: Leiterseile. Positiver Fluss läuft vom ersten zum letzten Punkt.
const LEITUNGEN = {
  'wind-uw': { art: 'boden', zweige: [[[-9, 0, 14.6], [22, 0, 14.6], [22, 0, 35], [26, 0, 35]]] },
  'pv-nvp': { art: 'boden', zweige: [[[-0.5, 0, 43], [18.2, 0, 43], [18.2, 0, 37.3]]] },
  'gruen-nvp': { art: 'boden', zweige: [[[11.8, 0, 36.4], [17, 0, 36.4]]] },
  'nvp-uw': { art: 'boden', zweige: [[[19.4, 0, 36.4], [26, 0, 36.4]]] },
  'grau-uw': { art: 'boden', zweige: [[[52.4, 0, 29.2], [44, 0, 29.2], [44, 0, 32.3], [39.8, 0, 32.3]]] },
  'gewerbe-uw': { art: 'boden', zweige: [[[27.75, 0, 77.75], [33, 0, 77.75], [33, 0, 40], [30.5, 0, 40], [30.5, 0, 38]]] },
  'ons-uw': { art: 'boden', zweige: [[[55, 0, 43.9], [55, 0, 36.6], [32, 0, 36.6]]] },
  'mfh-ons': { art: 'boden', zweige: [[[54, 0, 59.5], [54, 0, 46.1]]] },
  'haus-ons': { art: 'boden', zweige: [[[78.95, 0, 39], [78.95, 0, 45], [56.3, 0, 45]]] },
  'uw-hs': {
    art: 'luft',
    zweige: [34.25, 40.25].map((x) => [[x, 6.2, 27.8], [x, 10.6, 13], [x, 10.6, -9], [x, 10.6, -31], [x, 11.2, -45]]),
  },
  'gewerbe-pv': { art: 'wand', zweige: [[[27.77, 4.9, 72.25], [27.77, 0.2, 72.25]]] },
  'gewerbe-akku': { art: 'boden', zweige: [[[30.85, 0, 74.65], [30.85, 0, 75.85], [27.75, 0, 75.85]]] },
  'gewerbe-laden': { art: 'boden', zweige: [[[24.95, 0, 79.25], [24.95, 0, 81.65], [13.95, 0, 81.65]]] },
  'mfh-pv': { art: 'wand', zweige: [[[52.5, 8.3, 66.52], [52.5, 0.4, 66.52]]] },
  'haus-pv': { art: 'wand', zweige: [[[83.1, 3.9, 39.02], [83.1, 0.3, 39.02]]] },
  'haus-akku': { art: 'boden', zweige: [[[85.85, 0, 36.3], [85.85, 0, 37.6], [83.9, 0, 37.6]]] },
  'haus-auto': { art: 'boden', zweige: [[[83.9, 0, 38.7], [85.4, 0, 38.7], [85.4, 0, 43.5], [88, 0, 43.5], [88, 0, 42.8]]] },
};

/* ---------- Sichtbarkeit ---------- */

// Ein Punkt ist verdeckt, wenn der Strahl zum Betrachter (Richtung +x +y +z) einen Körper trifft
export function verdeckt(p, koerper) {
  for (const k of koerper) {
    let t0 = 1e-6;
    let t1 = Infinity;
    for (let a = 0; a < 3 && t0 <= t1; a++) {
      t0 = Math.max(t0, k.lo[a] - p[a]);
      t1 = Math.min(t1, k.hi[a] - p[a]);
    }
    if (t0 <= t1) return true;
  }
  return false;
}

// Sichtbare Abschnitte eines Zweigs als Intervalle der Bildschirmstrecke
function sichtbareAbschnitte(welt, koerper) {
  const schirm = welt.map(P);
  const intervalle = [];
  let s = 0;
  let start = null;
  for (let i = 1; i < welt.length; i++) {
    const a = welt[i - 1];
    const b = welt[i];
    const lw = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const ls = Math.hypot(schirm[i][0] - schirm[i - 1][0], schirm[i][1] - schirm[i - 1][1]);
    const n = Math.max(1, Math.ceil(lw / 0.15));
    for (let k = i > 1 ? 1 : 0; k <= n; k++) {
      const u = k / n;
      const p = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
      const frei = !verdeckt(p, koerper);
      if (frei && start === null) start = s + ls * u;
      if (!frei && start !== null) {
        intervalle.push([start, s + ls * u]);
        start = null;
      }
    }
    s += ls;
  }
  if (start !== null) intervalle.push([start, s]);
  return {
    punkte: schirm.map((q) => q.map(r1)),
    laenge: r1(s),
    sichtbar: intervalle.filter(([x, y]) => y - x > 6).map(([x, y]) => [r1(x), r1(y)]),
  };
}

/* ---------- Aufbau ---------- */

function aabb(items) {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const it of items) {
    for (const p of it.pts) {
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], p[k]);
        hi[k] = Math.max(hi[k], p[k]);
      }
    }
  }
  return { lo, hi };
}

// Gruppen von hinten nach vorn: A vor B, wenn A entlang x oder z vollständig hinter B liegt
function gruppenReihenfolge(sc, ids) {
  const box = Object.fromEntries(ids.map((id) => [id, aabb(sc.items.filter((it) => it.gruppe === id && it.kind !== 'ground' && it.kind !== 'fence'))]));
  const hinter = (a, b) => box[a].hi[0] <= box[b].lo[0] + 1e-6 || box[a].hi[2] <= box[b].lo[2] + 1e-6;
  const mitte = (id) => (box[id].lo[0] + box[id].hi[0] + box[id].lo[2] + box[id].hi[2]) / 2;
  const rest = [...ids].sort((a, b) => mitte(a) - mitte(b));
  const ergebnis = [];
  while (rest.length) {
    const i = rest.findIndex((a) => rest.every((b) => b === a || !hinter(b, a) || hinter(a, b)));
    ergebnis.push(...rest.splice(i < 0 ? 0 : i, 1));
  }
  return { reihenfolge: ergebnis, box };
}

// Ankerpunkte der Marker (Welt, relativ zum Layout), etwas über dem Element
// [Layout-Bezug, x, y, z, Versatz des Markers in SVG-Einheiten]; mit Versatz zeigt eine
// Führungslinie vom Marker auf den Ankerpunkt
const ANKER = {
  wind: ['wind', 11, 22.4, 1, [0, 0]],
  pvfrei: ['pvfrei', 12, 2.5, 8, [0, 0]],
  gruenspeicher: ['gruenspeicher', 3.5, 3.6, 3, [0, 0]],
  umspannwerk: ['umspannwerk', 9, 7.4, 6, [0, 0]],
  grauspeicher: ['grauspeicher', 5.6, 3.8, 4.4, [0, 0]],
  gewerbe: ['gewerbe', 8.5, 6.6, 4.5, [0, 0]],
  mfh: ['mfh', 3.6, 12.2, 3.5, [0, 0]],
  haus: ['haus', 3.2, 7.4, 2.8, [6, -26], 'links'],
  heimspeicher: ['heimspeicher', 0.7, 1.4, 0.55, [40, 12]],
};

function baueSzene() {
  PEGEL.length = 0;
  const sc = new IsoScene();
  const L = LAYOUT;
  const at = (id, fn) => sc.mit({ versatz: [L[id].x, 0, L[id].z], gruppe: id, ebene: 2 }, fn);

  const naben = [];
  at('wind', () => {
    for (let i = 0; i < 3; i++) naben.push(windanlage(sc, i * 11, 0).map((v, k) => v + [L.wind.x, 0, L.wind.z][k]));
  });
  at('pvfrei', () => freiflaeche(sc));
  at('gruenspeicher', () => {
    boden(sc, -1, -1, 10.5, 7.6, -40);
    container(sc, 0, 0, 7, 2.3, 2.3, { pegel: 'gruen' });
    container(sc, 0, 3.6, 7, 2.3, 2.3, { pegel: 'gruen' });
    sc.box(7.6, 0, 2.4, 1.2, 1.9, 2.0);
  });
  at('nvp', () => station(sc, 0, 0, 2.4, 2.1, 1.8));
  at('umspannwerk', () => umspannwerk(sc));
  at('hochspannung', () => {
    for (let i = 0; i < 3; i++) mast(sc, 0, -i * 22, 13);
  });
  at('grauspeicher', () => {
    boden(sc, -1, -1, 17, 12, -40);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) container(sc, c * 7.6, r * 4.4, 6.8, 2.5, 2.4, { pegel: 'grau' });
    trafo(sc, 0.4, 8.8);
    station(sc, 4, 9, 2.6, 2.2, 1.8);
  });
  at('gewerbe', () => {
    halle(sc);
    container(sc, 19, 1, 2.2, 2.3, 3.4, { tueren: 0, pegel: 'gewerbe' });
    for (let i = 0; i < 3; i++) sc.box(3 + i * 4.4, 0, 12.2, 0.45, 1.5, 0.45);
    sc.mit({ klasse: 'es-firmenauto' }, () => {
      auto(sc, 3.8, 12.9, 'x');
      auto(sc, 8.2, 12.9, 'x');
    });
  });
  at('ons', () => station(sc, 0, 0, 2.6, 2.2, 2.2));
  at('mfh', () => mehrfamilienhaus(sc));
  at('haus', () => einfamilienhaus(sc));
  at('heimspeicher', () => {
    sc.box(0, 0, 0, 0.7, 1.9, 1.1);
    pegelFlaechen(sc, 0, 0, 0.7, 1.9, 1.1, 'heim');
  });
  at('auto', () => sc.mit({ klasse: 'es-auto' }, () => auto(sc, 0, 0, 'z')));

  return { sc, naben };
}

/** Komplette Szene samt Overlay-Daten für die Komponente */
export function energiesystemSzene() {
  const { sc, naben } = baueSzene();
  const ids = Object.keys(LAYOUT);
  const { reihenfolge, box } = gruppenReihenfolge(sc, ids);
  for (const n of naben) for (let k = 0; k < 24; k++) sc.grenze([n[0] + Math.cos((k / 24) * 2 * Math.PI) * ROTOR, n[1] + Math.sin((k / 24) * 2 * Math.PI) * ROTOR, n[2]]);

  // Leitungen: Bildschirmpunkte und sichtbare Abschnitte je Zweig
  const linien = {};
  for (const v of VERBINDUNGEN) {
    const d = LEITUNGEN[v.id];
    linien[v.id] = { art: d.art, zweige: d.zweige.map((z) => sichtbareAbschnitte(z, sc.koerper)) };
    for (const z of d.zweige) for (const p of z) sc.grenze(p);
  }

  const r = sc.render({ teile: true, stellen: STELLEN, scale: SKALA, pad: 16, gruppen: reihenfolge.map((id) => ({ id })) });
  const prozent = ([x, y]) => [r1(((x - r.x) / r.breite) * 1000) / 10, r1(((y - r.y) / r.hoehe) * 1000) / 10];

  const marker = {};
  for (const e of ELEMENTE) {
    const [id, x, y, z, [ox, oy], seite = 'rechts'] = ANKER[e];
    const anker = P([LAYOUT[id].x + x, y, LAYOUT[id].z + z]);
    const p = [anker[0] + ox, anker[1] + oy];
    marker[e] = { punkt: p.map(r1), anker: anker.map(r1), fuehrung: ox !== 0 || oy !== 0, prozent: prozent(p), seite };
  }

  // Rotoren: Ebene x–y vor der Gondel; die Matrix bildet lokale Kreiskoordinaten ab
  const c = Math.cos(Math.PI / 6) * SKALA;
  const s = Math.sin(Math.PI / 6) * SKALA;
  const rotoren = naben.map((n) => {
    const [ex, ey] = P(n);
    return { matrix: [r1(c * 100) / 100, r1(s * 100) / 100, 0, -SKALA, r1(ex), r1(ey)], radius: ROTOR };
  });

  // Einzeichnen nur für Umrisse: Detail-, Fein-, Zaun- und Pegellinien erscheinen mit den Flächen
  const ohneStrich = (html) => html.replace(/<path class="(iso-detail|iso-fence|iso-pegel|iso-ground)([^"]*)"([^>]*?) data-stroke/g, '<path class="$1$2"$3');
  const ebenen = Object.fromEntries(Object.entries(r.ebenen).map(([k, v]) => [k, ohneStrich(v)]));
  return { ...r, ebenen, reihenfolge, box, linien, marker, rotoren, pegel: PEGEL.slice(), koerper: sc.koerper, leitungenWelt: LEITUNGEN };
}

/** Pfad einer Füllstandsfläche bei Füllstand soc (0..1) */
export function pegelPfad(pg, soc) {
  const k = r1(pg.h * Math.min(1, Math.max(0, soc)));
  return `M${pg.a[0]} ${pg.a[1]}L${pg.b[0]} ${pg.b[1]}L${pg.b[0]} ${r1(pg.b[1] - k)}L${pg.a[0]} ${r1(pg.a[1] - k)}Z`;
}

/** Setzt im Szenen-Markup die Füllstände eines Moments (Build: 13:00 Uhr) */
export function fuellePegel(html, pegel, soc) {
  return html.replace(/(<path class="iso-pegel es-pegel" d=")[^"]*(" data-pegel="(\w+)" data-pegel-id="(\d+)")/g, (_, a, b, name, id) => a + pegelPfad(pegel[Number(id)], soc[name]) + b);
}

/* ---------- Statische Pfeile und Kurven ---------- */

/** Richtungspfeile je Art für einen Moment (Build: 13:00 Uhr ohne JavaScript) */
export function pfeileFuer(linien, m, { abstand, groesse, wahl = [] }) {
  const d = { gruen: '', netz: '', 'gruen-wahl': '', 'netz-wahl': '' };
  for (const v of VERBINDUNGEN) {
    const ri = m.richtung[v.id];
    if (!ri) continue;
    const klasse = m.art[v.id] + (wahl.includes(v.id) ? '-wahl' : '');
    for (const z of linien[v.id].zweige) {
      const lz = linienzug(z.punkte);
      for (const [a, b] of z.sichtbar) {
        const l = b - a;
        if (l < groesse * 2.2) continue;
        const n = Math.max(1, Math.round(l / abstand));
        for (let k = 0; k < n; k++) d[klasse] += pfeil(lz, a + ((k + 0.5) / n) * l, groesse, ri);
      }
    }
  }
  return d;
}

/** Kurven der Zeitleiste (Sonne, Börsenstrompreis) in einer viewBox 0 0 960 100 */
export function zeitleistenKurven() {
  const B = 960;
  const H = 100;
  const punkte = (fn) => {
    const pts = [];
    for (let i = 0; i <= SCHRITTE; i++) {
      const t = (i / SCHRITTE) * 24;
      pts.push([(t / 24) * B, H - 10 - fn(t) * (H - 22)]);
    }
    return pfad(pts, 1);
  };
  return { breite: B, hoehe: H, sonne: punkte(sonne), preis: punkte(preis) };
}

/** Alles, was die Komponente zum Rendern braucht */
export function energiesystemDaten() {
  const szene = energiesystemSzene();
  const sim = simuliereTag();
  const m = moment(sim, 13);
  const pfeile = pfeileFuer(szene.linien, m, { abstand: szene.breite / 14, groesse: szene.breite / 120 });
  return { szene, sim, m, pfeile, kurven: zeitleistenKurven() };
}
