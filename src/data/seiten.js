// Alle Seiten der Website. Grundlage für Sitemap, Prüfungen und Offline-Fassung; Leistungs-
// und Projektseiten kommen aus den Daten, neue Einträge dort erscheinen hier von selbst.
// index: false hält eine Seite aus der Sitemap (Projektseiten ohne Text).
import { leistungen } from './leistungen.js';
import { veroeffentlicht } from './referenzen.js';

export const seiten = [
  { pfad: '/', prio: '1.0' },
  { pfad: '/unsere-leistungen', prio: '0.9' },
  ...leistungen.map((l) => ({ pfad: l.href, prio: '0.8' })),
  { pfad: '/referenzen', prio: '0.8' },
  ...veroeffentlicht.map((r) => ({ pfad: `/referenzen/${r.slug}`, prio: '0.5', index: Boolean(r.text?.length) })),
  { pfad: '/karriere', prio: '0.6' },
  { pfad: '/ueber-uns', prio: '0.7' },
  { pfad: '/kontakt', prio: '0.7' },
  { pfad: '/impressum', prio: '0.2' },
  { pfad: '/datenschutz', prio: '0.2' },
];
