// Polylinien in SVG-Koordinaten: Länge, Punkt bei einer Strecke, Teilchen und Richtungspfeile.
// Wird beim Build (statische Pfeile ohne JavaScript) und im Browser verwendet.

/** Polylinie aus Punkten [[x, y], …] mit Teilstrecken und Gesamtlänge */
export function linienzug(punkte) {
  const seg = [];
  let laenge = 0;
  for (let i = 1; i < punkte.length; i++) {
    const a = punkte[i - 1];
    const b = punkte[i];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-9) continue;
    seg.push({ a, b, l, s0: laenge, dx: (b[0] - a[0]) / l, dy: (b[1] - a[1]) / l });
    laenge += l;
  }
  return { punkte, seg, laenge };
}

/** Punkt und Richtung bei Strecke s (wird auf die Länge begrenzt): [x, y, dx, dy] */
export function punktBei(lz, s) {
  const { seg, laenge } = lz;
  if (!seg.length) return [lz.punkte[0][0], lz.punkte[0][1], 1, 0];
  const t = Math.min(laenge, Math.max(0, s));
  let lo = 0;
  let hi = seg.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (seg[mid].s0 <= t) lo = mid;
    else hi = mid - 1;
  }
  const g = seg[lo];
  const u = t - g.s0;
  return [g.a[0] + g.dx * u, g.a[1] + g.dy * u, g.dx, g.dy];
}

const f = (n, stellen) => {
  const s = n.toFixed(stellen);
  return s === '-0' || /^-0\.0*$/.test(s) ? s.slice(1) : s;
};

/** Pfaddaten der Polylinie */
export function pfad(punkte, stellen = 1) {
  return punkte.map((p, i) => `${i ? 'L' : 'M'}${f(p[0], stellen)} ${f(p[1], stellen)}`).join('');
}

/** Achsparalleles Quadrat mit Mittelpunkt (x, y) und Kantenlänge a als Pfadstück */
export function quadrat(x, y, a, stellen = 1) {
  const h = a / 2;
  return `M${f(x - h, stellen)} ${f(y - h, stellen)}h${f(a, stellen)}v${f(a, stellen)}h${f(-a, stellen)}Z`;
}

/** Dreieck als Richtungspfeil bei Strecke s, Spitze in Flussrichtung (richtung ±1) */
export function pfeil(lz, s, groesse, richtung, stellen = 1) {
  const [x, y, dx0, dy0] = punktBei(lz, s);
  const dx = dx0 * richtung;
  const dy = dy0 * richtung;
  const l = groesse;
  const b = groesse * 0.36;
  const sx = x + dx * l * 0.5;
  const sy = y + dy * l * 0.5;
  const hx = x - dx * l * 0.5;
  const hy = y - dy * l * 0.5;
  return `M${f(sx, stellen)} ${f(sy, stellen)}L${f(hx - dy * b, stellen)} ${f(hy + dx * b, stellen)}L${f(hx + dy * b, stellen)} ${f(hy - dx * b, stellen)}Z`;
}

/**
 * Gleichmäßig verteilte Richtungspfeile auf einer Polylinie: etwa alle `abstand` Einheiten,
 * mindestens einer, mit Rand zu den Enden.
 */
export function pfeile(lz, { abstand, groesse, richtung, stellen = 1 }) {
  if (!richtung || lz.laenge < groesse * 2) return '';
  const n = Math.max(1, Math.round(lz.laenge / abstand));
  let d = '';
  for (let k = 0; k < n; k++) d += pfeil(lz, ((k + 0.5) / n) * lz.laenge, groesse, richtung, stellen);
  return d;
}
