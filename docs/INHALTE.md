# Herkunft der Inhalte

Die bisherige Website www.ip3-energie.de ist aus der Arbeitsumgebung nicht direkt abrufbar (Netzwerkrichtlinie der Cloud-Umgebung). Grundlage ist deshalb eine vollständige Text-Extraktion aller Seiten vom 05.10.2026 (`ip3-Website-Extraktion-2026-10-05.md`, von ip³ bereitgestellt), dazu der Corporate-Design-Leitfaden und die Angaben im Auftrag. Vor der Veröffentlichung bitte gegenlesen.

## Übernommen von der bisherigen Website

| Inhalt | bisherige Seite | neue Seite |
|---|---|---|
| Seitenstruktur und URLs, einschließlich `/karriere` und `/efre-foerderhinweis` | Sitemap | alle Seiten unter denselben Adressen |
| Kennzahlen 111.208 kWp+ realisierte PV-Leistung, 35.990 kWh+ verbaute Speicherkapazität, 20+ Jahre Erfahrung (Stand 05.10.2026) | Startseite | Startseite, `src/data/site.js` |
| Unternehmensbeschreibung, Start 2009 als Ingenieurbüro, Energieeffizienzexperten, eingetragener Partner beim Bayernwerk, Projektzyklus bis zur Schulung des Personals, Arbeit am Detail, klare und ehrliche Kommunikation, „Aktiv planen heißt Zukunft gestalten.“ | Über uns | Über uns |
| Ansprechpartner mit Namen, Funktion und E-Mail (12 Personen) | Über uns | Über uns, `src/data/site.js` |
| Leistungstexte Privat, Industrie & Gewerbe, Freiflächen, Überblick; Betriebsführung, Schulungen, Gutachten und Analysen | Leistungsseiten, Startseite | Leistungsseiten, ergänzt um Versorgungssicherheit, planbare Energiekosten, CO₂, Anbindung an vorhandene Anlagentechnik, „alles aus einer Hand“ |
| Stellenanzeige Elektriker / Elektroniker (m/w/d) | Karriere | Karriere |
| Referenzen laut Galerietiteln, u. a. Stall 300 kWp mit 3 × SMA Core 2 in Kohlberg, Freiflächen Vohenstrauß, A6, Weiden und „Breite Wiesn“, Netto- und Fristo-Markt Weiden, PV-Anlage Beierl Vohenstrauß, Speicher und Carports | Startseite, Leistungsseiten, Referenzen | Referenzen, `src/data/referenzen.js` |
| Kontaktdaten, Formularfelder einschließlich Firma | Kontakt | Kontakt |
| Impressumsangaben, IHK Regensburg für Oberpfalz/Kelheim, Haftungsausschluss (Wortlaut) | Impressum | Impressum |
| Datenschutzbeauftragter Michael Schwenke, info@team-netz.net | Datenschutz | Datenschutz |
| EFRE-Förderhinweis mit Projektbeschreibung, Emblem „Kofinanziert von der Europäischen Union“ | EFRE Förderhinweis, Fußzeile | EFRE-Förderhinweis, Fußzeile |

## Bewusst geändert

- **Schreibweise:** In der Stellenanzeige stand „IP3 Energie“, übernommen als „ip³“ (Corporate Design). Emojis entfernt. Tippfehler aus Galerietiteln („Powewall“, „Photvovoltaik“) korrigiert.
- **Impressum:** Rechtsgrundlage „§ 10 MDStV“ ersetzt durch „§ 18 Abs. 2 MStV“, „§ 5 TMG“ durch „§ 5 DDG“. Der Hinweis auf die C3 marketing agentur (Screendesign, Realisierung mit TYPO3) ist entfallen, weil die neue Website nicht von ihr stammt.
- **Datenschutzerklärung:** Die bisherige Fassung (Stand 01.07.2023) beschreibt Google Analytics, Remarketing, Google Maps, YouTube, Instagram, LinkedIn, jQuery und das nicht mehr gültige Privacy-Shield-Abkommen. Die neue Website nutzt nichts davon und setzt keine Cookies. Die Erklärung ist deshalb neu geschrieben, der Datenschutzbeauftragte ist übernommen.
- **Formular:** Wie bisher Firma (optional), Name, E-Mail, Telefon, Anschrift, Interesse und Nachricht. Anders als bisher sind Straße sowie PLZ und Ort freiwillig, „Interesse an“ ist eine Einfachauswahl mit zusätzlich Batteriespeicher und Sonstiges.
- **Cookie-Banner:** entfällt, weil keine Cookies gesetzt werden.

## Bitte prüfen und ergänzen

1. **EFRE-Förderung:** Laut Förderhinweis wurde die bisherige Website aus dem EFRE und vom Freistaat Bayern kofinanziert, Projektbeschreibung „Programmierung einer neuen Webseite und Erstellung neuer Inhalte“. Vor dem Ersetzen der Website den Zuwendungsbescheid prüfen: Zweckbindungsfrist, Publizitätspflichten und ob ein Relaunch innerhalb der Frist zulässig ist. Die neue Website übernimmt Förderhinweis und Emblem unverändert, damit keine Pflicht entfällt. Das Emblem ist nach den grafischen Vorgaben der EU als SVG gesetzt; die Originaldatei der bisherigen Website (`DE_Co-fundedbytheEU_RGB_POS.svg`) kann es ersetzen.
2. **Anschrift:** Die bisherige Website nennt durchgehend Dr.-Pfleger-Str. 34, 92637 Weiden und „Sitz im oberpfälzischen Weiden“. Corporate Design und Handelsregister nennen Theisseil. Im Impressum stehen derzeit die Weidener Anschrift und „Sitz der Gesellschaft: Theisseil“.
3. **Verbraucherstreitbeilegung:** Auf der bisherigen Website nicht vorhanden. Bei mehr als zehn Beschäftigten ist der Hinweis nach § 36 VSBG Pflicht; auf „Über uns“ sind zwölf Personen genannt.
4. **Haftungsausschluss:** Wortgleich übernommen. Er nennt neben der ip³ | Energietechnik GmbH auch die ip³ | Ingenieure mit Partner GmbH. Ob das für die neue Website so bleiben soll, bitte entscheiden.
5. **Hoster:** Auf der bisherigen Website nicht benannt. Für die neue Website Hoster und Auftragsverarbeitungsvertrag ergänzen, Datenschutzerklärung rechtlich prüfen lassen.
6. **Fotos:** Die bisherige Website zeigt rund 110 Projektfotos und Porträts der Geschäftsführer. Ohne Zugriff auf die Bilddateien zeigt die neue Website schematische Zeichnungen. Fotos über das Feld `bild` in `src/data/referenzen.js` ergänzen.
7. **Partnerlogos:** Auf der bisherigen Startseite unter „Unsere Partner“: Bayernwerk, BE-ON eG, BYD, Energieeffizienz-Experte für Förderprogramme des Bundes, Handwerkskammer Niederbayern-Oberpfalz, installRES, Jinko Solar, Maschinenring, Sigenergy, Siemens, SMA, Tesla, Trina Solar, VDI, ZENO. Für die neue Website fehlen die Dateien und die Entscheidung, ob und welche gezeigt werden.
8. **Referenzen:** Kundennamen (Beierl, Netto und Fristo) wie auf der bisherigen Website. Ob „Breite Wiesn“ und die Freifläche Weiden dieselbe Anlage sind, ist aus den Galerietiteln nicht erkennbar; sie stehen getrennt. Im Marktstammdatenregister ist eine Einheit „PV-FF-VOH-D“ mit 1.364,4 kWp (Betreiber ip³ | PV-VOH GmbH & Co. KG) verzeichnet; ob das die Freifläche Vohenstrauß ist, bitte bestätigen.
9. **Kennzahlen:** Stand 05.10.2026, bei Änderungen in `src/data/site.js` anpassen.
10. **Neue Seite** `/unsere-leistungen/batteriespeicher` auf Basis der Angaben zu Heim-, Gewerbe- und Großspeichern.
