import { drawHaus, drawHalle, drawFreiflaeche, drawSpeicher, drawStall, drawCarport, drawHeimspeicher } from './iso.js';
import { drawMonitoring } from './monitoring-szene.js';

const cache = new Map();

// Große Zeichnungen zeichnen beim Einblenden nur ihre Umrisse; Detaillinien (Modulraster,
// Fugen) blenden mit den Flächen ein (data-detail, siehe main.js). Weniger animierte Pfade,
// weniger Arbeit pro Bild. iso.js bleibt unverändert.
const GROSS = 60;
const nurUmrisse = (svg) =>
  (svg.match(/ data-stroke/g) || []).length > GROSS ? svg.replace(/(<path class="iso-detail[^"]*"[^>]*?) data-stroke/g, '$1 data-detail') : svg;
const makers = {
  haus: drawHaus,
  halle: drawHalle,
  freiflaeche: drawFreiflaeche,
  speicher: drawSpeicher,
  stall: drawStall,
  carport: drawCarport,
  heimspeicher: drawHeimspeicher,
  monitoring: drawMonitoring,
};

/** SVG-Markup einer Zeichnung (beim Build erzeugt, zwischengespeichert). */
export function drawing(key, title, { animate = true } = {}) {
  const id = key + '|' + (title || '') + '|' + animate;
  if (!cache.has(id)) {
    const opts = { animate };
    if (title) opts.title = title;
    cache.set(id, animate ? nurUmrisse(makers[key](opts)) : makers[key](opts));
  }
  return cache.get(id);
}
