// Logos wie auf der bisherigen Startseite unter „Unsere Partner“, aufgeteilt in Organisationen
// und Hersteller. Dateien in public/img/partner (weißer Rand entfernt), w und h in Pixeln.
// Die Logos werden in Originalfarben und unverzerrt gezeigt.

export const partnerGruppen = [
  {
    titel: 'Partner und Mitgliedschaften',
    logos: [
      { name: 'Bayernwerk', datei: 'bayernwerk', w: 287, h: 55 },
      { name: 'Handwerkskammer Niederbayern-Oberpfalz', datei: 'handwerkskammer', w: 295, h: 59, faktor: 1.12 },
      { name: 'VDI', datei: 'vdi', w: 167, h: 109 },
      { name: 'Energieeffizienz-Experte für Förderprogramme des Bundes', datei: 'energieeffizienz-experte', w: 275, h: 74, faktor: 1.12 },
      { name: 'ZENO ZukunftsEnergieNordoberpfalz', datei: 'zeno', w: 260, h: 81 },
      { name: 'Maschinenring', datei: 'maschinenring', w: 287, h: 90, faktor: 1.3 },
    ],
  },
  {
    titel: 'Hersteller, mit denen wir bauen',
    logos: [
      { name: 'BYD', datei: 'byd', w: 217, h: 133 },
      { name: 'Jinko Solar', datei: 'jinko-solar', w: 257, h: 93 },
      { name: 'Sigenergy', datei: 'sigenergy', w: 773, h: 154 },
      { name: 'SMA', datei: 'sma', w: 194, h: 123 },
      { name: 'Tesla', datei: 'tesla', w: 273, h: 39 },
      { name: 'Trina Solar', datei: 'trina-solar', w: 252, h: 66 },
    ],
  },
];

// Gleiche optische Fläche für alle Logos: breite Wortmarken flacher, kompakte Zeichen höher.
// faktor gleicht Logos mit viel Weißraum oder kleiner Schrift aus.
export const logoBreite = ({ w, h, faktor = 1 }, flaeche = 6400) => Math.round(Math.sqrt(flaeche * (w / h)) * faktor);
