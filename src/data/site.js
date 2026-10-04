// Unternehmensdaten. Quelle: bisherige Website (Impressum, Kontakt, Über uns),
// Handelsregister, Corporate-Design-Vorgaben. Details siehe docs/INHALTE.md.

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
};

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
  { href: '/ueber-uns', label: 'Über uns' },
  { href: '/kontakt', label: 'Kontakt' },
];

export const rechtliches = [
  { href: '/impressum', label: 'Impressum' },
  { href: '/datenschutz', label: 'Datenschutz' },
];
