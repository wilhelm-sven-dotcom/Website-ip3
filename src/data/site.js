// Unternehmensdaten. Quelle: bisherige Website (Impressum, Kontakt, Über uns, Datenschutz;
// Extraktion vom 05.10.2026), Handelsregister, Corporate-Design-Vorgaben. Details: docs/INHALTE.md.

export const firma = {
  name: 'ip³ Energietechnik GmbH',
  // Schreibweise wie im bisherigen Impressum
  nameRechtlich: 'ip³ | Energietechnik GmbH',
  claim: 'Energie hoch drei',
  dreiklang: ['Planung', 'Beratung', 'Umsetzung'],
  strasse: 'Dr.-Pfleger-Str. 34',
  plz: '92637',
  ort: 'Weiden i.d.OPf.',
  sitz: 'Theisseil',
  region: 'Oberpfalz',
  telefon: '0961 40191360',
  telefonHref: 'tel:+4996140191360',
  telefonIntl: '+49 961 40191360',
  fax: '0961 40191369',
  email: 'info@ip3-energie.de',
  web: 'www.ip3-energie.de',
  url: 'https://www.ip3-energie.de',
  geschaeftsfuehrer: ['Sven Wilhelm, B. Eng.', 'Michael Bäumler'],
  registergericht: 'Amtsgericht Weiden i.d.OPf.',
  registernummer: 'HRB 5725',
  ustId: 'DE346672260',
  gruendung: 2009,
  kammer: {
    name: 'Industrie- und Handelskammer Regensburg für Oberpfalz/Kelheim',
    strasse: 'Dr.-Martin-Luther-Str. 12',
    ort: '93047 Regensburg',
  },
  datenschutzbeauftragter: { name: 'Michael Schwenke', email: 'info@team-netz.net' },
};

// Verbund mit ENMAG (Co-Branding nach CD: beide Marken gleichwertig, ENMAG-Grün nur für
// ENMAG-Elemente, beide Domains). Quellen: Angaben ip³ (06.10.2026), Selbstdarstellung ENMAG auf
// enmag-naturstrom.de. Registerangaben der gemeinsamen Gesellschaft auf Wunsch von ip³ nicht auf der Website.
export const verbund = {
  claim: 'Energietechnik von ip³ · Naturstrom von ENMAG.',
  titel: 'Zwei Firmen. Eine Energie',
  gesellschaft: { name: 'ENMAG ip³ GmbH' },
  partner: [
    {
      name: 'ip³ Energietechnik',
      rolle: 'Energietechnik',
      aufgaben: [
        'Planung von Anlagen für erneuerbare Energien',
        'Mittel- und Niederspannung, Netzanschluss',
        'Bau und Inbetriebnahme als beim Bayernwerk eingetragener Installateurbetrieb',
        'Batteriespeicher vom Heimspeicher bis zum Großspeicher',
      ],
      web: 'www.ip3-energie.de',
      url: null,
    },
    {
      name: 'ENMAG',
      rolle: 'Naturstrom',
      aufgaben: [
        'Inhabergeführtes Familienunternehmen aus Weiden',
        'Projektentwicklung gemeinsam mit Flächeneigentümern',
        'Verträge, Bauleitplanung und Netzverknüpfungspunkt',
        'Betrieb von Solaranlagen',
      ],
      web: 'www.enmag-naturstrom.de',
      url: 'https://www.enmag-naturstrom.de',
    },
  ],
};

// Kennzahlen wie auf der Startseite der bisherigen Website (Stand 05.10.2026).
// Die Erfahrung zählt ab der Gründung und wird bei jedem Build neu berechnet (2026: 17 Jahre).
export const kennzahlen = [
  { wert: '111.208', einheit: 'kWp', plus: true, text: 'realisierte PV-Leistung' },
  { wert: '35.990', einheit: 'kWh', plus: true, text: 'verbaute Speicherkapazität' },
  { wert: String(new Date().getFullYear() - firma.gruendung), einheit: '', plus: false, text: 'Jahre Erfahrung' },
];

// Ansprechpartner wie auf der bisherigen Seite „Über uns“. Porträts in derselben Reihenfolge
// wie dort (src/assets/fotos/team), für Sascha Kriegler gibt es kein Foto. \u00ad ist ein
// weicher Trennstrich für schmale Spalten.
export const team = [
  { name: 'Sven Wilhelm, B. Eng.', rolle: 'Geschäftsführer', email: 's.wilhelm@ip3-energie.de', foto: 'team/sven-wilhelm' },
  { name: 'Michael Bäumler', rolle: 'Geschäftsführer', email: 'm.baeumler@ip3-energie.de', foto: 'team/michael-baeumler' },
  { name: 'Alisa Geber', rolle: 'Assistentin der Geschäftsführung', email: 'a.geber@ip3-energie.de', foto: 'team/alisa-geber' },
  { name: 'Sabrina Früchtl', rolle: 'Assistentin der Geschäftsführung', email: 's.fruechtl@ip3-energie.de', foto: 'team/sabrina-fruechtl' },
  { name: 'Ida Schmid', rolle: 'Assistentin der Geschäftsführung', email: 'i.schmid@ip3-energie.de', foto: 'team/ida-schmid' },
  { name: 'Stefan Pregler', rolle: 'Projektleiter', email: 's.pregler@ip3-energie.de', foto: 'team/stefan-pregler' },
  { name: 'Benjamin Janker', rolle: 'Meister im Elektrotechniker\u00adhandwerk', email: 'b.janker@ip3-energie.de', foto: 'team/benjamin-janker' },
  { name: 'Daniel Tretter', rolle: 'Meister im Elektrotechniker\u00adhandwerk', email: 'd.tretter@ip3-energie.de', foto: 'team/daniel-tretter' },
  { name: 'Markus Dietrich', rolle: 'Lagerverwaltung / Bestellwesen', email: 'm.dietrich@ip3-energie.de', foto: 'team/markus-dietrich' },
  { name: 'Koran Shanak', rolle: 'Technische Zeichnung', email: 'k.shanak@ip3-energie.de', foto: 'team/koran-shanak' },
  { name: 'Sascha Kriegler', rolle: 'Planung / Technische Zeichnung', email: 's.kriegler@ip3-energie.de', foto: null },
  { name: 'Benjamin Völkl', rolle: 'Digital Services', email: 'b.voelkl@ip3-energie.de', foto: 'team/benjamin-voelkl' },
];

export const leistungenNav = [
  { href: '/unsere-leistungen/privat', label: 'Privat', kurz: 'Photovoltaik und Speicher für Ihr Zuhause' },
  {
    href: '/unsere-leistungen/industrie-gewerbe',
    label: 'Industrie & Gewerbe',
    kurz: 'PV-Anlagen auf Hallen und Dächern, ausgelegt auf Ihren Lastgang',
  },
  {
    href: '/unsere-leistungen/freiflaechen',
    label: 'Freiflächen',
    kurz: 'Von der baurechtlichen Planung bis zur Übergabe',
  },
  {
    href: '/unsere-leistungen/batteriespeicher',
    label: 'Batteriespeicher',
    kurz: 'Vom Heimspeicher bis zum Großspeicher',
  },
  {
    href: '/unsere-leistungen/monitoring',
    label: 'Monitoring',
    kurz: 'Solarpark-Monitoring und Erlösanalyse',
  },
];

export const hauptnav = [
  { href: '/unsere-leistungen', label: 'Leistungen', kinder: leistungenNav },
  { href: '/referenzen', label: 'Referenzen' },
  { href: '/karriere', label: 'Karriere' },
  { href: '/ueber-uns', label: 'Über uns' },
  { href: '/kontakt', label: 'Kontakt' },
];

export const rechtliches = [
  { href: '/impressum', label: 'Impressum' },
  { href: '/datenschutz', label: 'Datenschutz' },
];
