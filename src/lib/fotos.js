// Fotos aus src/assets/fotos (Quelle: bisherige Website, ohne Kundennamen in Dateinamen).
// Astro rechnet sie beim Build in WebP-Dateien mehrerer Breiten um und lässt Metadaten weg.
// Schlüssel ist der Pfad ohne Endung, z. B. 'referenzen/stall-kohlberg'.
const dateien = import.meta.glob('../assets/fotos/**/*.jpg', { eager: true, import: 'default' });

const fotos = Object.fromEntries(
  Object.entries(dateien).map(([pfad, bild]) => [pfad.replace('../assets/fotos/', '').replace(/\.jpg$/, ''), bild])
);

export function foto(schluessel) {
  const bild = fotos[schluessel];
  if (!bild) throw new Error(`Foto nicht gefunden: src/assets/fotos/${schluessel}.jpg`);
  return bild;
}

// Breiten für srcset, nie größer als das Original. Die Maße stammen aus der Kopie (clone):
// Jeder direkte Zugriff auf das Bildobjekt ließe Astro sonst das Original-JPG mit ausliefern.
export function breiten(bild, stufen = [640, 1024, 1600]) {
  const { width } = bild.clone ?? bild;
  const kleiner = stufen.filter((s) => s < width);
  return [...kleiner, Math.min(width, stufen[stufen.length - 1])];
}
