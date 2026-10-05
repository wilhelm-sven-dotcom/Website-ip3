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

// Kennzahlen wie auf der Startseite der bisherigen Website (Stand 05.10.2026)
export const kennzahlen = [
  { wert: '111.208', einheit: 'kWp', text: 'realisierte PV-Leistung' },
  { wert: '35.990', einheit: 'kWh', text: 'verbaute Speicherkapazität' },
  { wert: '20', einheit: '', text: 'Jahre Erfahrung' },
];

// Ansprechpartner wie auf der bisherigen Seite „Über uns“
export const team = [
  { name: 'Sven Wilhelm, B. Eng.', rolle: 'Geschäftsführer', email: 's.wilhelm@ip3-energie.de' },
  { name: 'Michael Bäumler', rolle: 'Geschäftsführer', email: 'm.baeumler@ip3-energie.de' },
  { name: 'Alisa Geber', rolle: 'Assistentin der Geschäftsführung', email: 'a.geber@ip3-energie.de' },
  { name: 'Sabrina Früchtl', rolle: 'Assistentin der Geschäftsführung', email: 's.fruechtl@ip3-energie.de' },
  { name: 'Ida Schmid', rolle: 'Assistentin der Geschäftsführung', email: 'i.schmid@ip3-energie.de' },
  { name: 'Stefan Pregler', rolle: 'Projektleiter', email: 's.pregler@ip3-energie.de' },
  { name: 'Benjamin Janker', rolle: 'Meister im Elektrotechnikerhandwerk', email: 'b.janker@ip3-energie.de' },
  { name: 'Daniel Tretter', rolle: 'Meister im Elektrotechnikerhandwerk', email: 'd.tretter@ip3-energie.de' },
  { name: 'Markus Dietrich', rolle: 'Lagerverwaltung / Bestellwesen', email: 'm.dietrich@ip3-energie.de' },
  { name: 'Koran Shanak', rolle: 'Technische Zeichnung', email: 'k.shanak@ip3-energie.de' },
  { name: 'Sascha Kriegler', rolle: 'Planung / Technische Zeichnung', email: 's.kriegler@ip3-energie.de' },
  { name: 'Benjamin Völkl', rolle: 'Digital Services', email: 'b.voelkl@ip3-energie.de' },
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
  { href: '/efre-foerderhinweis', label: 'EFRE-Förderhinweis' },
];
