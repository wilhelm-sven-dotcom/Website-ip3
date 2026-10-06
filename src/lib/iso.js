// Isometrische Linienzeichnungen als SVG, erzeugt beim Build.
// Flächen werden nach Tiefe sortiert gezeichnet (Maleralgorithmus), dadurch
// verdecken vordere Bauteile die hinteren wie in einer technischen Zeichnung.

const C = Math.cos(Math.PI / 6);
const S = Math.sin(Math.PI / 6);

export const proj = ([x, y, z]) => [(x - z) * C, (x + z) * S - y];
const depthOf = (pts) => pts.reduce((a, [x, y, z]) => a + x + y + z, 0) / pts.length;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export class IsoScene {
  constructor() {
    this.items = [];
    this.grenzen = [];
    this.koerper = [];
    this.kontext = null;
  }

  // Versatz des aktuellen Kontexts (siehe mit) auf einen Punkt anwenden
  _v(p) {
    const k = this.kontext;
    return k && k.versatz ? add(p, k.versatz) : p;
  }

  _push(item) {
    const k = this.kontext;
    if (k) {
      if (k.gruppe != null) item.gruppe = k.gruppe;
      if (k.ebene) item.ebene = k.ebene;
      if (k.klasse) item.klasse = k.klasse;
      if (k.attrs) item.attrs = k.attrs;
    }
    this.items.push(item);
    return this;
  }

  /**
   * Zeichnet mit Versatz (Weltkoordinaten) in eine Gruppe, Ebene, Zusatzklasse oder mit
   * Zusatzattributen. Kontexte lassen sich schachteln, Versätze addieren sich.
   */
  mit({ versatz = null, gruppe, ebene, klasse, attrs } = {}, zeichnen) {
    const vorher = this.kontext;
    const v0 = vorher && vorher.versatz;
    this.kontext = {
      versatz: versatz ? (v0 ? add(v0, versatz) : versatz) : v0 || null,
      gruppe: gruppe !== undefined ? gruppe : vorher ? vorher.gruppe : null,
      ebene: ebene !== undefined ? ebene : vorher ? vorher.ebene : 0,
      klasse: klasse !== undefined ? klasse : vorher ? vorher.klasse : null,
      attrs: attrs !== undefined ? attrs : vorher ? vorher.attrs : null,
    };
    try {
      zeichnen(this);
    } finally {
      this.kontext = vorher;
    }
    return this;
  }

  /** Verdeckender Körper ohne eigene Zeichnung (z. B. Dach), für Sichtbarkeitsprüfungen */
  koerperHinzu(lo, hi) {
    this.koerper.push({ lo: this._v(lo), hi: this._v(hi), gruppe: this.kontext ? this.kontext.gruppe : null });
    return this;
  }

  /** Punkt, der in die Bildgrenzen eingeht, ohne gezeichnet zu werden (z. B. für Overlays) */
  grenze(p) {
    this.grenzen.push(this._v(p));
    return this;
  }

  /** Polygon mit optionalen Detaillinien. kind: 'face' | 'panel' | 'dark' | 'accent' | 'ground' */
  poly(pts, kind = 'face', details = [], bias = 0) {
    if (this.kontext && this.kontext.versatz) {
      pts = pts.map((p) => this._v(p));
      details = details.map((d) => (Array.isArray(d) ? d.map((p) => this._v(p)) : { ...d, seg: d.seg.map((p) => this._v(p)) }));
    }
    return this._push({ type: 'poly', pts, kind, details, depth: depthOf(pts) + bias });
  }

  line(a, b, kind = 'line', bias = 0) {
    const pts = [this._v(a), this._v(b)];
    return this._push({ type: 'line', pts, kind, depth: depthOf(pts) + bias });
  }

  dot(p, r = 6.5, bias = 50) {
    const pts = [this._v(p)];
    return this._push({ type: 'dot', pts, r, depth: depthOf(pts) + bias });
  }

  /** Quader: Ursprung (x, y, z) = Ecke unten hinten links, sichtbar sind Oberseite, +X- und +Z-Seite */
  box(x, y, z, w, h, d, opts = {}) {
    const { kind = 'face', top = kind, details = {} } = opts;
    const p = (dx, dy, dz) => [x + dx, y + dy, z + dz];
    this.koerper.push({ lo: this._v(p(0, 0, 0)), hi: this._v(p(w, h, d)), gruppe: this.kontext ? this.kontext.gruppe : null });
    this.poly([p(0, h, 0), p(w, h, 0), p(w, h, d), p(0, h, d)], top, details.top || []);
    this.poly([p(w, 0, 0), p(w, h, 0), p(w, h, d), p(w, 0, d)], kind, details.right || []);
    this.poly([p(0, 0, d), p(w, 0, d), p(w, h, d), p(0, h, d)], kind, details.front || []);
    return this;
  }

  /**
   * Modulfeld auf einer beliebigen Ebene: Ursprung o, Kantenvektoren u (quer) und v (hoch),
   * cols × rows Module. Zeichnet die Fläche als Paneel mit Modulfugen.
   */
  panels(o, u, v, cols, rows, opts = {}) {
    const { bias = 0.5, cells = false } = opts;
    const pts = [o, add(o, u), add(add(o, u), v), add(o, v)];
    const details = [];
    for (let i = 1; i < cols; i++) details.push([add(o, mul(u, i / cols)), add(add(o, mul(u, i / cols)), v)]);
    for (let j = 1; j < rows; j++) details.push([add(o, mul(v, j / rows)), add(add(o, mul(v, j / rows)), u)]);
    if (cells) {
      // halbierte Module: Mittellinie je Modulreihe
      for (let j = 0; j < rows; j++) {
        const a = add(o, mul(v, (j + 0.5) / rows));
        details.push({ fine: true, seg: [a, add(a, u)] });
      }
    }
    this.poly(pts, 'panel', details, bias);
    return this;
  }

  /**
   * SVG ausgeben. Ohne `gruppen` wird alles nach Tiefe sortiert (Maleralgorithmus). Mit
   * `gruppen` (Reihenfolge von hinten nach vorn, z. B. [{ id, attrs }]) zeichnet jede Ebene
   * zuerst die Teile ohne Gruppe, dann die Gruppen als <g data-node>, jeweils nach Tiefe sortiert.
   * `teile: true` liefert Inhalt und viewBox getrennt, `stellen` die Nachkommastellen.
   */
  render({ pad = 18, width = null, stroke = 1.25, title = '', scale = 22, animate = true, gruppen = null, teile = false, stellen = 2 } = {}) {
    let sorted;
    if (gruppen) {
      const rang = new Map(gruppen.map((g, i) => [g.id, i]));
      const schluessel = (it) => [it.ebene || 0, it.gruppe == null ? -1 : rang.has(it.gruppe) ? rang.get(it.gruppe) : gruppen.length];
      sorted = [...this.items].sort((a, b) => {
        const [ea, ga] = schluessel(a);
        const [eb, gb] = schluessel(b);
        return ea - eb || ga - gb || a.depth - b.depth;
      });
    } else {
      sorted = [...this.items].sort((a, b) => a.depth - b.depth);
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const P = (p) => {
      let [sx, sy] = proj(p);
      sx *= scale;
      sy *= scale;
      minX = Math.min(minX, sx);
      maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy);
      maxY = Math.max(maxY, sy);
      return [sx, sy];
    };
    const f = (n) => n.toFixed(stellen);
    const zusatz = (it) => [it.klasse ? ` ${it.klasse}` : '', it.attrs ? ` ${it.attrs}` : ''];
    const parts = [];
    const ebenen = {};
    const gruppeAttrs = new Map((gruppen || []).map((g) => [g.id, g.attrs || '']));
    let offen = undefined;
    let ebeneStart = 0;
    let ebeneJetzt = null;
    const ebeneAbschliessen = () => {
      if (ebeneJetzt !== null) ebenen[ebeneJetzt] = parts.slice(ebeneStart).join('');
    };
    for (const it of sorted) {
      if (gruppen) {
        const g = it.gruppe == null ? null : it.gruppe;
        const schl = `${it.ebene || 0}|${g}`;
        if (schl !== offen) {
          if (offen !== undefined && !offen.endsWith('|null')) parts.push('</g>');
          if ((it.ebene || 0) !== ebeneJetzt) {
            ebeneAbschliessen();
            ebeneStart = parts.length;
            ebeneJetzt = it.ebene || 0;
          }
          if (g != null) parts.push(`<g data-node="${g}"${gruppeAttrs.get(g) ? ` ${gruppeAttrs.get(g)}` : ''}>`);
          offen = schl;
        }
      }
      const [kl, at] = zusatz(it);
      if (it.type === 'poly') {
        const d = 'M' + it.pts.map((p) => P(p).map(f).join(' ')).join('L') + 'Z';
        parts.push(`<path class="iso-${it.kind}${kl}" d="${d}"${at} data-stroke data-fill />`);
        for (const det of it.details) {
          const seg = Array.isArray(det) ? det : det.seg;
          const fine = !Array.isArray(det) && det.fine;
          const [a, b] = seg.map(P);
          parts.push(`<path class="iso-detail${fine ? ' iso-fine' : ''}" d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}" data-stroke />`);
        }
      } else if (it.type === 'line') {
        const [a, b] = it.pts.map(P);
        parts.push(`<path class="iso-${it.kind}${kl}" d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}"${at} data-stroke />`);
      } else if (it.type === 'dot') {
        const [c] = it.pts.map(P);
        parts.push(`<circle class="iso-dot${kl}" cx="${f(c[0])}" cy="${f(c[1])}" r="${it.r}"${at} data-fill />`);
      }
    }
    if (gruppen && offen !== undefined && !offen.endsWith('|null')) parts.push('</g>');
    if (gruppen) ebeneAbschliessen();
    for (const p of this.grenzen) P(p);
    const vb = [minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2].map(f).join(' ');
    if (teile) return { inhalt: parts.join(''), ebenen, viewBox: vb, x: minX - pad, y: minY - pad, breite: maxX - minX + pad * 2, hoehe: maxY - minY + pad * 2 };
    const w = width ? ` width="${width}"` : '';
    const t = title ? `<title>${title}</title>` : '';
    const anim = animate ? ' data-draw-svg' : '';
    return `<svg class="iso" viewBox="${vb}"${w} style="--iso-stroke:${stroke}px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}"${anim}>${t}${parts.join('')}</svg>`;
  }
}

/** Weltpunkt in SVG-Koordinaten derselben Skala wie render() */
export const projiziere = (p, scale = 22) => {
  const [x, y] = proj(p);
  return [x * scale, y * scale];
};

/* ---------- Bausteine ---------- */

export function gableHouse(sc, x, z, w, d, wallH, roofH, opts = {}) {
  // Satteldach, First entlang X
  sc.box(x, 0, z, w, wallH, d);
  const ridgeZ = z + d / 2;
  const eave = 0.35;
  const A = [x - eave, wallH, z - eave];
  const B = [x + w + eave, wallH, z - eave];
  const Cc = [x + w + eave, wallH + roofH, ridgeZ];
  const D = [x - eave, wallH + roofH, ridgeZ];
  const E = [x - eave, wallH, z + d + eave];
  const F = [x + w + eave, wallH, z + d + eave];
  // hintere Dachfläche (wird von der vorderen teilweise verdeckt)
  sc.poly([A, B, Cc, D], 'face', [], -1);
  // Giebeldreieck rechts
  sc.poly([[x + w, wallH, z], [x + w, wallH + roofH * 0.97, ridgeZ], [x + w, wallH, z + d]], 'face', [], 0.4);
  // vordere Dachfläche (Süd)
  sc.poly([D, Cc, F, E], 'face', [], 1.2);
  if (opts.pv) {
    const { cols = 6, rows = 2, inset = 0.5 } = opts.pv;
    const o = lerp(lerp(E, D, 0.12), lerp(F, Cc, 0.12), 0);
    const oo = [o[0] + inset, o[1], o[2]];
    const len = w + 2 * eave - inset * 2;
    const up = lerp([0, 0, 0], [D[0] - E[0], D[1] - E[1], D[2] - E[2]], 0.78);
    sc.panels(oo, [len, 0, 0], up, cols, rows, { bias: 1.6 });
  }
  return { ridge: D, eave: E };
}

export function windowRow(sc, x0, y, z, n, gap, w, h) {
  for (let i = 0; i < n; i++) {
    const x = x0 + i * gap;
    sc.poly([[x, y, z], [x + w, y, z], [x + w, y + h, z], [x, y + h, z]], 'dark', [], 0.6);
  }
}

/* ---------- Motive ---------- */

export function drawHaus({ title = 'Einfamilienhaus mit Photovoltaik und Batteriespeicher', animate = true } = {}) {
  const sc = new IsoScene();
  sc.poly([[-2, 0, -2], [16, 0, -2], [16, 0, 13], [-2, 0, 13]], 'ground', [], -40);
  gableHouse(sc, 0, 0, 10, 8, 5.6, 3.6, { pv: { cols: 6, rows: 2, inset: 0.9 } });
  // Haustür und Fenster auf der Südseite
  sc.poly([[6.4, 0, 8], [7.6, 0, 8], [7.6, 2.3, 8], [6.4, 2.3, 8]], 'dark', [], 0.7);
  windowRow(sc, 1.2, 3.2, 8, 3, 2.2, 1.2, 1.3);
  windowRow(sc, 1.2, 0.9, 8, 2, 2.2, 1.2, 1.4);
  // Batteriespeicher an der Ostwand
  sc.box(10, 0, 4.4, 0.6, 1.9, 1.2, { kind: 'face' });
  sc.dot([10.6, 1.7, 5.0]);
  // Wallbox
  sc.box(10, 1.0, 1.6, 0.25, 0.6, 0.45);
  sc.line([10.25, 1.0, 1.82], [10.25, 0, 1.82], 'line', 0.5);
  return sc.render({ title, animate });
}

export function drawHalle({ title = 'Gewerbehalle mit Photovoltaik und Speicher', animate = true } = {}) {
  const sc = new IsoScene();
  sc.poly([[-3, 0, -3], [34, 0, -3], [34, 0, 19], [-3, 0, 19]], 'ground', [], -60);
  const W = 26;
  const D = 14;
  const H = 7;
  sc.box(0, 0, 0, W, H, D);
  // Attika
  sc.box(-0.2, H, -0.2, W + 0.4, 0.45, 0.35);
  sc.box(-0.2, H, D - 0.15, W + 0.4, 0.45, 0.35);
  sc.box(W - 0.15, H, -0.2, 0.35, 0.45, D + 0.4);
  // PV in Ost-West-Aufständerung als Reihen
  for (let r = 0; r < 5; r++) {
    const z = 1.2 + r * 2.4;
    sc.panels([1.2, H + 0.2, z], [W - 2.4, 0, 0], [0, 0.55, 1.4], 12, 1, { bias: 2 + r * 0.01 });
  }
  // Tore und Fensterband
  for (let i = 0; i < 3; i++) {
    const x = 3 + i * 6.5;
    sc.poly([[x, 0, D], [x + 4.2, 0, D], [x + 4.2, 4.6, D], [x, 4.6, D]], 'dark', [], 0.7);
  }
  sc.poly([[1.2, 5.4, D], [W - 1.2, 5.4, D], [W - 1.2, 6.2, D], [1.2, 6.2, D]], 'dark', [], 0.7);
  // Speichercontainer
  sc.box(W + 2.2, 0, 3, 2.6, 2.6, 6.2);
  sc.box(W + 2.2, 0, 10.2, 2.6, 2.2, 2.6);
  sc.dot([W + 4.8, 2.0, 6.0]);
  return sc.render({ title, animate });
}

export function drawFreiflaeche({ title = 'Freiflächenanlage mit Trafostation', animate = true } = {}) {
  const sc = new IsoScene();
  sc.poly([[-4, 0, -6], [44, 0, -6], [44, 0, 34], [-4, 0, 34]], 'ground', [], -80);
  const tilt = (20 * Math.PI) / 180;
  const slope = 4.6;
  const rows = 5;
  for (let r = 0; r < rows; r++) {
    const z0 = r * 6.2;
    for (let t = 0; t < 2; t++) {
      const x0 = t * 17.5;
      const o = [x0, 0.8, z0 + slope * Math.cos(tilt)];
      const u = [16, 0, 0];
      const v = [0, slope * Math.sin(tilt), -slope * Math.cos(tilt)];
      // Pfosten
      for (const fx of [0.15, 0.5, 0.85]) {
        sc.line([x0 + fx * 16, 0, z0 + slope * Math.cos(tilt) - 0.4], [x0 + fx * 16, 0.8, z0 + slope * Math.cos(tilt) - 0.4], 'line', -0.5);
        sc.line([x0 + fx * 16, 0, z0 + 0.5], [x0 + fx * 16, 0.8 + slope * Math.sin(tilt) - 0.2, z0 + 0.5], 'line', -0.5);
      }
      sc.panels(o, u, v, 14, 2, { bias: 0.2 });
    }
  }
  // Trafostation und Zaun
  sc.box(37.5, 0, 22, 3.2, 2.6, 2.4);
  sc.dot([39.1, 2.6, 23.2]);
  const fence = [[-2, 0, -4], [42, 0, -4], [42, 0, 32], [-2, 0, 32]];
  for (let i = 0; i < 4; i++) {
    const a = fence[i];
    const b = fence[(i + 1) % 4];
    sc.line(a, b, 'fence', -60);
  }
  return sc.render({ title, animate });
}

export function drawSpeicher({ title = 'Batteriespeicher mit Containern und Transformator', animate = true } = {}) {
  const sc = new IsoScene();
  sc.poly([[-3, 0, -3], [30, 0, -3], [30, 0, 22], [-3, 0, 22]], 'ground', [], -60);
  for (let c = 0; c < 2; c++) {
    for (let k = 0; k < 3; k++) {
      const x = c * 13;
      const z = k * 6;
      const doors = [];
      for (let i = 1; i < 5; i++) doors.push([[x + i * 2.0, 0.2, z + 2.6], [x + i * 2.0, 2.6, z + 2.6]]);
      sc.box(x, 0, z, 10, 2.9, 2.6, { details: { front: doors } });
      sc.box(x + 10, 0.4, z + 0.5, 0.5, 1.6, 1.6);
    }
  }
  // Wechselrichter und Transformator zwischen den Reihen
  sc.box(10.9, 0, 2.2, 1.6, 2.4, 3.2);
  sc.box(10.9, 0, 8.2, 1.6, 2.4, 3.2);
  sc.box(10.6, 0, 14.4, 2.2, 2.2, 2.2);
  sc.dot([11.7, 2.4, 3.8]);
  return sc.render({ title, animate });
}

export function drawStall({ title = 'Landwirtschaftliches Gebäude mit Photovoltaik', animate = true } = {}) {
  const sc = new IsoScene();
  sc.poly([[-3, 0, -3], [34, 0, -3], [34, 0, 20], [-3, 0, 20]], 'ground', [], -60);
  const W = 28;
  const D = 14;
  gableHouse(sc, 0, 0, W, D, 4.2, 4.0, { pv: { cols: 16, rows: 3, inset: 0.6 } });
  for (let i = 0; i < 4; i++) {
    const x = 2 + i * 6.8;
    sc.poly([[x, 0, D], [x + 3.4, 0, D], [x + 3.4, 3.2, D], [x, 3.2, D]], 'dark', [], 0.7);
  }
  // Wechselrichter an der Giebelwand
  for (let i = 0; i < 3; i++) sc.box(W, 1.2, 3 + i * 1.6, 0.35, 0.9, 1.1);
  sc.dot([W + 0.35, 2.1, 3.55]);
  return sc.render({ title, animate });
}

export function drawCarport({ title = 'Carport mit Photovoltaik', animate = true } = {}) {
  const sc = new IsoScene();
  sc.poly([[-3, 0, -3], [30, 0, -3], [30, 0, 14], [-3, 0, 14]], 'ground', [], -60);
  const W = 24;
  const D = 6;
  // Stützen
  for (let i = 0; i <= 4; i++) {
    const x = i * (W / 4);
    sc.line([x, 0, 0.6], [x, 3.0, 0.6], 'line', -0.5);
    sc.line([x, 0, D - 0.6], [x, 2.6, D - 0.6], 'line', 0.5);
  }
  // Fahrzeuge
  for (let i = 0; i < 4; i++) {
    const x = 1.2 + i * 6;
    sc.box(x, 0, 1.0, 1.9, 1.3, 4.2);
    sc.box(x + 0.25, 1.3, 1.9, 1.4, 0.55, 2.2);
  }
  // Dach mit Modulen, leicht nach Süden geneigt
  sc.panels([-0.4, 2.6, D + 0.4], [W + 0.8, 0, 0], [0, 0.5, -D - 0.8], 12, 3, { bias: 8 });
  // Ladepunkt
  sc.box(W + 0.8, 0, 2.4, 0.4, 1.4, 0.4);
  sc.dot([W + 1.0, 1.4, 2.6]);
  return sc.render({ title, animate });
}

export function drawHeimspeicher({ title = 'Batteriespeicher für das Eigenheim', animate = true } = {}) {
  const sc = new IsoScene();
  sc.poly([[-1, 0, -1], [7, 0, -1], [7, 0, 6], [-1, 0, 6]], 'ground', [], -20);
  // Wandscheibe
  sc.poly([[0, 0, 0], [6, 0, 0], [6, 4.2, 0], [0, 4.2, 0]], 'face', [], -6);
  sc.poly([[0, 0, 0], [0, 4.2, 0], [0, 4.2, 5], [0, 0, 5]], 'face', [], -6);
  // Speicher-Module gestapelt
  for (let i = 0; i < 4; i++) sc.box(1.2, i * 0.62, 0.05, 1.6, 0.58, 0.9);
  sc.box(1.2, 2.48, 0.05, 1.6, 0.5, 0.9);
  // Wechselrichter
  sc.box(3.6, 1.4, 0.05, 1.3, 1.6, 0.5);
  sc.line([2.8, 2.7, 0.5], [3.6, 2.7, 0.3], 'line', 3);
  sc.dot([4.25, 3.0, 0.55]);
  return sc.render({ title, animate });
}
