// Texte für die Grafik „Ein Tag im Energiesystem“ (Startseite und Leistungsübersicht).
// Leistungsangaben: belegt durch die bisherige Website bzw. von ip³ am 06.10.2026 bestätigt
// (Netzanschluss und Speicher am Windpark, Mieterstrom, Energiemanagement mit dynamischem
// Tarif, Vermarktung von Großspeichern). Keine Leistungs-, Prozent- oder Preisangaben.

export const titel = 'Ein Tag im Energiesystem';

// Einleitung: Zeichenketten und Begriffe, die das passende Element öffnen
export const einleitung = [
  'Sonne und Wind erzeugen, Speicher verschieben, das Netz verbindet. Wie das über einen Tag zusammenspielt, zeigt die Grafik: Wählen Sie ein Element oder einen Begriff wie ',
  { begriff: 'Grünstromspeicher', element: 'gruenspeicher' },
  ', ',
  { begriff: 'Graustromspeicher', element: 'grauspeicher' },
  ', ',
  { begriff: 'Mieterstrom', element: 'mfh' },
  ', ',
  { begriff: 'Eigenverbrauchsspeicher', element: 'heimspeicher' },
  ' oder ',
  { begriff: 'dynamischer Tarif', element: 'haus' },
  '.',
];

export const bildunterschrift =
  'Schematische Darstellung eines sonnigen Frühlingstags. Erzeugung, Verbrauch und Börsenstrompreis sind vereinfacht und zeigen keine Messwerte.';

export const fuellstand = ['leer', 'fast leer', 'halb voll', 'fast voll', 'voll'];

export const phasen = {
  nacht: {
    name: 'Nacht',
    satz: 'Nachts liefert vor allem der Wind. Wenn Strom am günstigsten ist, laden der Graustromspeicher und das E-Auto, und die Wärmepumpe läuft.',
  },
  morgen: {
    name: 'Morgen',
    satz: 'Der Verbrauch steigt, bevor die Sonne kräftig scheint. Zur Morgenspitze speist der Graustromspeicher ein.',
  },
  mittag: {
    name: 'Mittag',
    satz: 'Die Photovoltaik erzeugt mehr, als gebraucht wird. Die Speicher laden, die Ladepunkte laufen mit Solarstrom, der Überschuss fließt ins Hochspannungsnetz.',
  },
  abend: {
    name: 'Abend',
    satz: 'Strom ist jetzt knapp und teuer. Grün- und Graustromspeicher speisen zur Preisspitze ein, der Heimspeicher versorgt das Haus.',
  },
};

export const legende = [
  { art: 'gruen', titel: 'Grünstrom', text: 'aus Sonne und Wind, auch über Speicher, die nur damit laden' },
  { art: 'netz', titel: 'Netzstrom', text: 'Herkunft gemischt, auch aus dem Graustromspeicher' },
  { art: 'wahl', titel: 'Gewählt', text: 'Flüsse des gewählten Elements' },
];

export const ui = {
  abspielen: 'Abspielen',
  anhalten: 'Anhalten',
  uhrzeit: 'Uhrzeit',
  uhr: 'Uhr',
  jetzt: 'Jetzt',
  leistung: 'Unsere Leistung',
  speicher: 'Füllstand',
  schliessen: 'Schließen',
  vor: 'Nächstes Element',
  zurueck: 'Vorheriges Element',
  sonne: 'Sonnenstand',
  preis: 'Börsenstrompreis',
  elemente: 'Elemente der Grafik',
  alleTexte: 'Alle Elemente als Text',
  dargestellt: 'Dargestellt: Mittag, 13:00 Uhr',
  beschreibung:
    'Isometrische Landschaft mit Windpark, PV-Freifläche mit Grünstromspeicher, Umspannwerk mit Graustromspeicher, Gewerbehalle, Mehrfamilienhaus mit Mieterstrom und Einfamilienhaus mit Eigenverbrauchsspeicher. Leitungen zeigen, wohin der Strom zur gewählten Uhrzeit fließt.',
};

/*
 * Elemente in Lesereihenfolge. `lage` ordnet jedem Zustandsschlüssel des Tagesmodells einen
 * Satz zu, `zusatz` ergänzt Nebenzustände (Ladepunkte, Wärmepumpe). `speicher` verweist auf
 * den Füllstand im Modell.
 */
export const elemente = [
  {
    id: 'wind',
    name: 'Windpark',
    kurz: 'Windpark',
    text: 'Liefert auch nachts und bei bedecktem Himmel und ergänzt damit die Photovoltaik. Der Strom geht über das Mittelspannungsnetz zum Umspannwerk.',
    leistung: 'Netzanschluss und Speicher für Windparks.',
    link: { href: '/unsere-leistungen/batteriespeicher', text: 'Batteriespeicher' },
    lage: {
      kraeftig: 'Kräftiger Wind, die Anlagen speisen viel ein.',
      maessig: 'Mäßiger Wind, die Anlagen speisen gleichmäßig ein.',
      schwach: 'Schwacher Wind, die Anlagen liefern wenig.',
    },
  },
  {
    id: 'pvfrei',
    name: 'PV-Freifläche',
    kurz: 'PV-Freifläche',
    text: 'Erzeugt Solarstrom im großen Maßstab und speist über eine eigene Übergabestation ins Mittelspannungsnetz ein. Mittags am meisten, nachts nichts.',
    leistung: 'Baurechtliche Fachplanung, Genehmigungs- und Detailplanung, Netzanschluss und Bau bis zur schlüsselfertigen Übergabe.',
    link: { href: '/unsere-leistungen/freiflaechen', text: 'Freiflächen' },
    lage: {
      viel: 'Die Sonne steht hoch, die Module liefern viel Strom.',
      wenig: 'Die Sonne steht tief, die Module liefern wenig.',
      ruht: 'Ohne Sonne erzeugen die Module keinen Strom.',
    },
  },
  {
    id: 'gruenspeicher',
    name: 'Grünstromspeicher',
    kurz: 'Grünstromspeicher',
    text: 'Lädt ausschließlich mit Solarstrom der eigenen Freifläche, nie aus dem Netz. So bleibt die Herkunft eindeutig, und der Speicher verschiebt die Mittagsspitze in den Abend, wenn Strom knapp ist.',
    leistung: 'Auslegung, Netzanschluss und Bau des Speichers an der Freifläche, auf Wunsch mit Anbindung an die Direktvermarktung.',
    link: { href: '/unsere-leistungen/batteriespeicher', text: 'Batteriespeicher' },
    speicher: 'gruen',
    lage: {
      laedt: 'Lädt mit Solarstrom der eigenen Anlage, solange der Börsenpreis niedrig ist.',
      speist: 'Speist den gespeicherten Solarstrom zur Preisspitze ein.',
      voll: 'Voll geladen, hält den Solarstrom für die Preisspitze bereit.',
      leer: 'Leer, lädt erst wieder mit Solarstrom der eigenen Anlage.',
      wartet: 'Hält seinen Füllstand und wartet auf den nächsten Einsatz.',
    },
  },
  {
    id: 'umspannwerk',
    name: 'Umspannwerk',
    kurz: 'Umspannwerk',
    text: 'Verbindet Mittel- und Hochspannung. Erzeugt die Region mehr, als sie verbraucht, fließt der Überschuss ins übergeordnete Netz. Fehlt Strom, kommt er von dort.',
    leistung: 'Netzanschlussbegehren, Abstimmung mit dem Netzbetreiber und Anlagenzertifikat nach VDE-AR-N 4110 oder 4120, wo gefordert.',
    link: { href: '#ablauf', text: 'Ablauf' },
    lage: {
      export: 'Die Region erzeugt mehr, als sie verbraucht. Der Überschuss geht ins Hochspannungsnetz.',
      import: 'Die Region braucht mehr, als sie erzeugt. Strom kommt aus dem Hochspannungsnetz.',
      ausgeglichen: 'Erzeugung und Verbrauch der Region halten sich die Waage.',
    },
  },
  {
    id: 'grauspeicher',
    name: 'Graustromspeicher',
    kurz: 'Graustromspeicher',
    text: 'Lädt aus dem Netz, wenn Strom reichlich und günstig ist, und speist ein, wenn er knapp und teuer ist. Weil er Netzstrom gemischter Herkunft aufnimmt, heißt er Graustromspeicher. Er kann auch Regelleistung bereitstellen.',
    leistung: 'Großspeicher im zweistelligen Megawattbereich vom Netzanschluss bis zur Inbetriebnahme, dazu die Vermarktung über Stromhandel und Regelenergie.',
    link: { href: '/unsere-leistungen/batteriespeicher', text: 'Batteriespeicher' },
    speicher: 'grau',
    lage: {
      laedt: 'Lädt Netzstrom, solange er günstig ist.',
      speist: 'Speist zur Preisspitze ein und entlastet das Netz.',
      voll: 'Voll geladen, bereit für die nächste Preisspitze.',
      leer: 'Leer, lädt wieder, sobald Strom günstig ist.',
      wartet: 'Hält seinen Füllstand und wartet auf den nächsten Einsatz.',
    },
  },
  {
    id: 'gewerbe',
    name: 'Gewerbebetrieb',
    kurz: 'Gewerbe',
    text: 'Die Halle nutzt den Solarstrom vom eigenen Dach selbst. Die Ladepunkte laufen, wenn die Sonne scheint, und ein Speicher kappt die Lastspitze am späten Nachmittag.',
    leistung: 'Energiekonzept nach Lastgang, PV-Anlage und Speicher, Energiemanagement und Abstimmung mit dem Netzbetreiber.',
    link: { href: '/unsere-leistungen/industrie-gewerbe', text: 'Industrie & Gewerbe' },
    speicher: 'gewerbe',
    lage: {
      ruhe: 'Betriebsruhe, nur die Grundlast läuft.',
      kappt: 'Der Speicher deckt die Spitze am späten Nachmittag und senkt den Netzbezug.',
      solar: 'Die Halle läuft mit Solarstrom vom eigenen Dach.',
      netz: 'Die Halle bezieht ergänzend Strom aus dem Netz.',
    },
    zusatz: {
      laden: 'Die Ladepunkte laden, solange die Sonne scheint.',
    },
  },
  {
    id: 'mfh',
    name: 'Mehrfamilienhaus mit Mieterstrom',
    kurz: 'Mieterstrom',
    text: 'Die PV-Anlage auf dem Dach versorgt die Wohnungen im Haus direkt, ohne Umweg über das öffentliche Netz. Was das Dach nicht deckt, liefert das Netz, Überschuss wird eingespeist.',
    leistung: 'Planung und Bau von Mieterstromanlagen.',
    link: { href: '/kontakt', text: 'Kontakt' },
    lage: {
      netz: 'Ohne Sonne versorgt das Netz die Wohnungen.',
      ueberschuss: 'Der Solarstrom vom Dach deckt den Bedarf der Wohnungen, der Rest geht ins Netz.',
      teil: 'Der Solarstrom vom Dach deckt einen Teil des Bedarfs, den Rest liefert das Netz.',
    },
  },
  {
    id: 'haus',
    name: 'Einfamilienhaus mit dynamischem Tarif',
    kurz: 'Einfamilienhaus',
    text: 'Mit einem dynamischen Stromtarif folgt der Arbeitspreis dem Börsenstrompreis. Ein Energiemanagement startet Wärmepumpe und E-Auto, wenn Strom günstig ist. Voraussetzung ist ein intelligentes Messsystem.',
    leistung: 'PV-Anlage, Speicher und Wallbox, dazu das Energiemanagement für den dynamischen Tarif.',
    link: { href: '/unsere-leistungen/privat', text: 'Privat' },
    lage: {
      auto: 'Das E-Auto lädt, weil Strom gerade günstig ist.',
      speicher: 'Der Heimspeicher versorgt das Haus.',
      solar: 'Das Haus läuft mit eigenem Solarstrom.',
      teil: 'Solarstrom deckt einen Teil des Bedarfs, den Rest liefert das Netz.',
      netz: 'Das Haus bezieht Strom aus dem Netz.',
    },
    zusatz: {
      wp: 'Die Wärmepumpe läuft, solange Strom günstig ist.',
    },
  },
  {
    id: 'heimspeicher',
    name: 'Eigenverbrauchsspeicher',
    kurz: 'Heimspeicher',
    text: 'Nimmt mittags den Solarüberschuss vom Dach auf und versorgt das Haus am Abend und in der Nacht. Das erhöht den Eigenverbrauch und senkt den Netzbezug. Ins Netz speist er nicht.',
    leistung: 'Auslegung nach Verbrauch und Anlagengröße. Installiert haben wir unter anderem Speicher von Tesla und BYD.',
    link: { href: '/unsere-leistungen/batteriespeicher', text: 'Batteriespeicher' },
    speicher: 'heim',
    lage: {
      laedt: 'Lädt mit dem Solarüberschuss vom Dach.',
      versorgt: 'Versorgt das Haus mit gespeichertem Solarstrom.',
      voll: 'Voll geladen, weiterer Überschuss geht ins Netz.',
      leer: 'Leer, lädt wieder mit dem nächsten Solarüberschuss.',
      wartet: 'Hält seinen Füllstand.',
    },
  },
].map((e, i) => ({ ...e, nr: String(i + 1).padStart(2, '0') }));

export const elementNach = Object.fromEntries(elemente.map((e) => [e.id, e]));

/** Lagesatz eines Elements aus den Zustandsschlüsseln des Modells, z. B. ['solar', 'laden']. */
export function lagesatz(id, codes) {
  const e = elementNach[id];
  const [haupt, ...neben] = codes;
  return [e.lage[haupt], ...neben.map((c) => e.zusatz?.[c])].filter(Boolean).join(' ');
}
