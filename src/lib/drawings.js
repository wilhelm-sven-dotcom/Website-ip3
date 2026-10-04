import { drawHaus, drawHalle, drawFreiflaeche, drawSpeicher, drawStall, drawCarport, drawHeimspeicher } from './iso.js';

const cache = new Map();
const makers = {
  haus: drawHaus,
  halle: drawHalle,
  freiflaeche: drawFreiflaeche,
  speicher: drawSpeicher,
  stall: drawStall,
  carport: drawCarport,
  heimspeicher: drawHeimspeicher,
};

/** SVG-Markup einer Zeichnung (beim Build erzeugt, zwischengespeichert). */
export function drawing(key, title, { animate = true } = {}) {
  const id = key + '|' + (title || '') + '|' + animate;
  if (!cache.has(id)) {
    const opts = { animate };
    if (title) opts.title = title;
    cache.set(id, makers[key](opts));
  }
  return cache.get(id);
}
