// Referenzen laut bisheriger Website (Galerien auf Startseite, Leistungsseiten und Referenzen,
// Extraktion vom 05.10.2026). Nur belegte Angaben. Kundennamen werden nicht genannt.
// Reihenfolge der Liste = Reihenfolge auf /referenzen; die ersten neun sind gemischt und haben
// alle ein Foto, weil zunächst nur sie erscheinen.
//
// Pflichtfelder
//   id          interner Schlüssel (Startseite, Leistungsseiten), nie ändern
//   slug        Adresse der Projektseite /referenzen/<slug>, nur Kleinbuchstaben, Ziffern, -
//   titel, kategorie, zeichnung (Schlüssel aus src/lib/drawings.js)
// Optional, erscheint nur wenn gesetzt
//   ort, leistung, komponenten, jahr, netzebene, speicher, module, wechselrichter
//   umfang      Leistungen von ip³ im Projekt, Begriffe aus umfangBegriffe
//   text        Projektbeschreibung (Absätze als Liste). Ohne Text bleibt die Projektseite
//               für Suchmaschinen ausgeblendet (noindex) und fehlt in der Sitemap.
//   bild        Schlüssel eines Fotos unter src/assets/fotos (ohne Endung), bildAlt beschreibt
//               das Foto, bildPos den Ausschnitt (object-position). Ohne Foto: Zeichnung.
//   fotos       weitere Fotos für die Projektseite: [{ src, alt }]
//   startseite  Position in der Auswahl auf der Startseite (1 bis 6)
//   freigabe    false blendet das Projekt überall aus (Standard: freigegeben)

export const referenzen = [
  {
    id: 'ff-vohenstrauss',
    slug: 'freiflaeche-vohenstrauss',
    titel: 'Freiflächenanlage',
    kategorie: 'Freifläche',
    ort: 'Vohenstrauß',
    leistung: null,
    komponenten: null,
    zeichnung: 'freiflaeche',
    bild: 'referenzen/freiflaeche-vohenstrauss',
    bildAlt: 'Modulreihen der Freiflächenanlage von oben, dazwischen Schafe auf der Weide',
    startseite: 3,
  },
  {
    id: 'stall-300',
    slug: 'stall-kohlberg',
    titel: 'Stall mit Photovoltaik',
    kategorie: 'Landwirtschaft',
    ort: 'Kohlberg',
    leistung: '300\u00a0kWp',
    komponenten: '3 × SMA Sunny Tripower CORE2',
    zeichnung: 'stall',
    bild: 'referenzen/stall-kohlberg',
    bildAlt: 'Luftaufnahme: Stall mit Photovoltaik auf der gesamten Dachfläche',
    startseite: 1,
  },
  {
    id: 'allblack-altenstadt',
    slug: 'allblack-altenstadt',
    titel: 'AllBlack-Module mit Tesla Powerwall 2.0',
    kategorie: 'Privat · Speicher',
    ort: 'Altenstadt/WN',
    leistung: null,
    komponenten: 'Tesla Powerwall 2.0',
    zeichnung: 'haus',
    bild: 'referenzen/allblack-altenstadt',
    bildAlt: 'Einfamilienhaus mit schwarzen Modulen auf dem Satteldach, Luftaufnahme',
    startseite: 5,
  },
  {
    id: 'industrie-muenchen',
    slug: 'industriespeicher-muenchen',
    titel: 'Photovoltaik mit Industriespeicher',
    kategorie: 'Industrie · Speicher',
    ort: 'München',
    leistung: '250\u00a0kWp',
    komponenten: 'PV-Anlage mit Industriespeicher',
    zeichnung: 'halle',
    bild: 'referenzen/industriespeicher-muenchen',
    bildAlt: 'Technikraum mit Batterieschränken und Wechselrichtern des Industriespeichers',
    startseite: 4,
  },
  {
    id: 'ff-breite-wiesn',
    slug: 'freiflaeche-breite-wiesn',
    titel: 'Freiflächenanlage „Breite Wiesn“',
    kategorie: 'Freifläche',
    ort: 'Weiden',
    leistung: null,
    komponenten: null,
    zeichnung: 'freiflaeche',
    bild: 'referenzen/freiflaeche-breite-wiesn',
    bildAlt: 'Luftaufnahme der Freiflächenanlage „Breite Wiesn“ vor Waldrand',
  },
  {
    id: 'carport-powerwall-weiden',
    slug: 'carport-speicher-weiden',
    titel: 'Photovoltaik auf Carport mit Tesla Powerwall',
    kategorie: 'Carport · Speicher',
    ort: 'Weiden',
    leistung: null,
    komponenten: 'Tesla Powerwall',
    zeichnung: 'carport',
    bild: 'referenzen/carport-speicher-weiden',
    bildAlt: 'Carport mit Photovoltaikdach, darunter ein Elektroauto',
    startseite: 6,
  },
  {
    id: 'powerwall-3',
    slug: 'heimspeicher-powerwall-3',
    titel: 'Heimspeicher Tesla Powerwall 3',
    kategorie: 'Privat · Speicher',
    ort: null,
    leistung: null,
    komponenten: 'Tesla Powerwall 3',
    zeichnung: 'heimspeicher',
    bild: 'referenzen/heimspeicher-powerwall-3',
    bildAlt: 'Tesla Powerwall 3 mit Gateway, daneben ein Wechselrichter an der Technikwand',
    bildPos: '50% 70%',
    startseite: 2,
  },
  {
    id: 'landwirtschaft-vohenstrauss',
    slug: 'landwirtschaft-vohenstrauss',
    titel: 'Photovoltaik auf landwirtschaftlichem Betrieb',
    kategorie: 'Landwirtschaft',
    ort: 'Vohenstrauß',
    leistung: null,
    komponenten: null,
    zeichnung: 'stall',
    bild: 'referenzen/landwirtschaft-vohenstrauss',
    bildAlt: 'Luftaufnahme eines Hofs zwischen Feldern, Photovoltaik auf mehreren Dächern',
  },
  {
    id: 'ff-a6',
    slug: 'freiflaeche-a6',
    titel: 'Freiflächenanlage an der A6',
    kategorie: 'Freifläche',
    ort: null,
    leistung: null,
    komponenten: null,
    zeichnung: 'freiflaeche',
    bild: 'referenzen/freiflaeche-a6',
    bildAlt: 'Luftaufnahme der Freiflächenanlage an der Autobahn A6',
  },
  {
    id: 'carport-mitterteich',
    slug: 'carport-mitterteich',
    titel: 'Photovoltaik auf Carport',
    kategorie: 'Carport',
    ort: 'Mitterteich',
    leistung: null,
    komponenten: null,
    zeichnung: 'carport',
    bild: 'referenzen/carport-mitterteich',
    bildAlt: 'Carport mit dunkler Holzverkleidung und Photovoltaikdach',
    bildPos: '50% 40%',
  },
  {
    id: 'allblack-letzau',
    slug: 'allblack-letzau',
    titel: 'AllBlack-Module',
    kategorie: 'Privat',
    ort: 'Letzau',
    leistung: null,
    komponenten: 'AllBlack-Module',
    zeichnung: 'haus',
    bild: 'referenzen/allblack-letzau',
    bildAlt: 'Wohnhaus mit schwarzen Modulen auf dem Satteldach, Luftaufnahme',
  },
  {
    id: 'sma-core2-weiden',
    slug: 'wechselrichter-weiden',
    titel: 'Wechselrichter SMA Core2',
    kategorie: 'Gewerbe',
    ort: 'Weiden',
    leistung: null,
    komponenten: 'SMA Core2',
    zeichnung: 'halle',
    bild: 'referenzen/wechselrichter-weiden',
    bildAlt: 'Wechselrichter SMA Core2 nebeneinander an der Wand',
  },
  {
    id: 'ff-weiden',
    slug: 'freiflaeche-weiden',
    titel: 'Freiflächenanlage',
    kategorie: 'Freifläche',
    ort: 'Weiden',
    leistung: null,
    komponenten: null,
    zeichnung: 'freiflaeche',
    bild: 'referenzen/freiflaeche-weiden',
    bildAlt: 'Modulreihen der Freiflächenanlage am Hang unter weitem Himmel',
  },
  {
    id: 'wallbox-altenstadt',
    slug: 'wallboxen-altenstadt',
    titel: 'Wallboxen',
    kategorie: 'Ladeinfrastruktur',
    ort: 'Altenstadt',
    leistung: null,
    komponenten: null,
    zeichnung: 'haus',
    bild: 'referenzen/wallboxen-altenstadt',
    bildAlt: 'Drei Wallboxen an der Holzwand eines Carports',
  },
  {
    id: 'byd-weiden',
    slug: 'byd-speicher-weiden',
    titel: 'BYD-Speicher',
    kategorie: 'Speicher',
    ort: 'Weiden',
    leistung: null,
    komponenten: null,
    zeichnung: 'heimspeicher',
    bild: 'referenzen/speicher-weiden',
    bildAlt: 'BYD-Batteriespeicher und zwei Wechselrichter im Technikraum',
  },
  {
    id: 'powerwall-tirschenreuth',
    slug: 'heimspeicher-tirschenreuth',
    titel: 'Heimspeicher Tesla Powerwall 2.0',
    kategorie: 'Speicher',
    ort: 'Tirschenreuth',
    leistung: null,
    komponenten: 'Tesla Powerwall 2.0',
    zeichnung: 'heimspeicher',
    bild: 'referenzen/heimspeicher-tirschenreuth',
    bildAlt: 'Tesla Powerwall 2.0 neben dem Wechselrichter',
    bildPos: '50% 60%',
  },
  {
    id: 'powerwall-2x',
    slug: 'heimspeicher-zwei-powerwall',
    titel: 'Zwei Tesla Powerwall 2.0',
    kategorie: 'Speicher',
    ort: null,
    leistung: null,
    komponenten: '2 × Tesla Powerwall 2.0',
    zeichnung: 'heimspeicher',
    bild: 'referenzen/heimspeicher-zwei-powerwall',
    bildAlt: 'Zwei Tesla Powerwall 2.0 nebeneinander',
    bildPos: '50% 60%',
  },
  {
    id: 'einzelhandel-weiden',
    slug: 'einzelhandel-weiden',
    titel: 'Photovoltaik im Einzelhandel',
    kategorie: 'Gewerbe',
    ort: 'Weiden',
    leistung: null,
    komponenten: null,
    zeichnung: 'halle',
    bild: null,
  },
];

/** Freigegebene Projekte in Listenreihenfolge */
export const veroeffentlicht = referenzen.filter((r) => r.freigabe !== false);

/** Referenz zu einer id (Startseite, Leistungsseiten); nicht freigegebene liefern undefined */
export const referenz = (id) => veroeffentlicht.find((r) => r.id === id);

/** Adresse der Projektseite */
export const projektHref = (r) => `/referenzen/${r.slug}`;

/** Auswahl für die Startseite, sortiert nach startseite */
export const startseitenAuswahl = veroeffentlicht.filter((r) => r.startseite).sort((a, b) => a.startseite - b.startseite);

/** Filter auf /referenzen: Gruppen nach Stichworten in der Kategorie */
export const filterGruppen = [
  { key: 'alle', label: 'Alle' },
  { key: 'frei', label: 'Freifläche', match: ['Freifläche'] },
  { key: 'gewerbe', label: 'Gewerbe, Industrie und Landwirtschaft', match: ['Industrie', 'Gewerbe', 'Landwirtschaft', 'Carport'] },
  { key: 'privat', label: 'Privat und Speicher', match: ['Privat', 'Speicher', 'Ladeinfrastruktur'] },
];
export const gruppenVon = (r) => filterGruppen.filter((f) => f.match && f.match.some((m) => r.kategorie.includes(m))).map((f) => f.key);

/** Leistungsbereiche, die zur Kategorie passen (für die Verlinkung auf Projektseiten) */
const bereichNachStichwort = [
  ['Freifläche', 'freiflaechen'],
  ['Industrie', 'industrie-gewerbe'],
  ['Gewerbe', 'industrie-gewerbe'],
  ['Landwirtschaft', 'industrie-gewerbe'],
  ['Privat', 'privat'],
  ['Speicher', 'batteriespeicher'],
];
export const bereicheVon = (r) => [...new Set(bereichNachStichwort.filter(([s]) => r.kategorie.includes(s)).map(([, slug]) => slug))];

/** Feste Begriffe für umfang (Auswahlliste in der Excel-Vorlage) */
export const umfangBegriffe = [
  'Planung',
  'Genehmigung',
  'Netzanschluss',
  'Montage',
  'Inbetriebnahme',
  'Speicherintegration',
  'Ladeinfrastruktur',
  'Betriebsführung',
  'Monitoring',
];

/** Kategorien, die in den Daten vorkommen dürfen (Prüfung pruefen-daten.mjs) */
export const kategorieStichworte = ['Freifläche', 'Industrie', 'Gewerbe', 'Landwirtschaft', 'Carport', 'Privat', 'Speicher', 'Ladeinfrastruktur'];
