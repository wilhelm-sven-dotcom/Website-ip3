# Herkunft der Inhalte

Die bisherige Website www.ip3-energie.de ist aus der Arbeitsumgebung nicht direkt abrufbar (Netzwerkrichtlinie der Cloud-Umgebung). Grundlage sind deshalb eine vollständige Text-Extraktion aller Seiten vom 05.10.2026 (`ip3-Website-Extraktion-2026-10-05.md`) und das Bildarchiv der bisherigen Website vom selben Tag (`ip3-Bilder-Claude-unter-30MB.zip`), beides von ip³ bereitgestellt, dazu der Corporate-Design-Leitfaden und die Angaben im Auftrag. Vor der Veröffentlichung bitte gegenlesen.

## Übernommen von der bisherigen Website

| Inhalt | bisherige Seite | neue Seite |
|---|---|---|
| Seitenstruktur und URLs, einschließlich `/karriere` | Sitemap | alle Seiten unter denselben Adressen, Karriere als eigener Menüpunkt |
| Kennzahlen 111.208 kWp+ realisierte PV-Leistung, 35.990 kWh+ verbaute Speicherkapazität (Stand 05.10.2026) | Startseite | Startseite, `src/data/site.js` |
| Unternehmensbeschreibung, Start 2009 als Ingenieurbüro, Energieeffizienzexperten, eingetragener Partner beim Bayernwerk, Projektzyklus bis zur Schulung des Personals, Arbeit am Detail, klare und ehrliche Kommunikation, „Aktiv planen heißt Zukunft gestalten.“ | Über uns | Über uns |
| Ansprechpartner mit Namen, Funktion, E-Mail und Porträt (12 Personen, 11 Porträts) | Über uns | Über uns, `src/data/site.js` |
| Leistungstexte Privat, Industrie & Gewerbe, Freiflächen, Überblick; Betriebsführung, Schulungen, Gutachten und Analysen | Leistungsseiten, Startseite | Leistungsseiten, ergänzt um Versorgungssicherheit, planbare Energiekosten, CO₂, Anbindung an vorhandene Anlagentechnik, „alles aus einer Hand“ |
| Stellenanzeige Elektriker / Elektroniker (m/w/d) | Karriere | Karriere |
| Referenzen laut Galerietiteln, u. a. Stall 300 kWp mit 3 × SMA Core 2 in Kohlberg, Freiflächen Vohenstrauß, A6, Weiden und „Breite Wiesn“, Speicher und Carports | Startseite, Leistungsseiten, Referenzen | Referenzen, `src/data/referenzen.js` |
| Projektfotos aus den Galerien | Startseite, Leistungsseiten, Referenzen | 17 Referenzen mit Foto, Bildstrecken auf den vier Leistungsseiten und auf Referenzen (48 Fotos), `src/assets/fotos/` |
| Partnerlogos (15) | Startseite „Unsere Partner“ | Startseite, getrennt in „Partner und Mitgliedschaften“ und „Hersteller, mit denen wir bauen“ |
| Kontaktdaten, Formularfelder einschließlich Firma | Kontakt | Kontakt |
| Impressumsangaben, IHK Regensburg für Oberpfalz/Kelheim, Haftungsausschluss | Impressum | Impressum |
| Datenschutzbeauftragter Michael Schwenke, info@team-netz.net | Datenschutz | Datenschutz |

## Entscheidungen von ip³ (05.10.2026)

- **EFRE-Förderhinweis:** entfällt mit Seite, Emblem und Fußzeilenlink. Die bisherige Adresse `/efre-foerderhinweis` liefert die Fehlerseite (404).
- **Erfahrung:** 17 Jahre statt „20+ Jahre“, gezählt ab der Gründung 2009, ohne Plus. Die Zahl wird bei jedem Build aus `gruendung` neu berechnet.
- **Team:** alle zwölf Ansprechpartner mit Porträt, Karriere mit eigenem Menüpunkt.
- **Kundennamen:** werden nicht genannt, weder in Titeln noch in Dateinamen, Alternativtexten oder auf Fotos. Zwei Referenzen sind deshalb neutral benannt: „Photovoltaik auf landwirtschaftlichem Betrieb“ (Vohenstrauß) und „Photovoltaik im Einzelhandel“ (Weiden). Für die zweite gibt es kein Foto ohne erkennbare Firmenschilder, sie bleibt als Zeichnung. Ein Galeriefoto mit Firmenschild ist nicht übernommen.
- **Partnerlogos:** in zwei Gruppen, Originalfarben, unverzerrt, ohne Verlinkung.
- **Impressum:** Sitz der Gesellschaft Theisseil. Der Haftungsausschluss nennt nur noch die ip³ | Energietechnik GmbH.
- **Datenschutz:** neue Fassung ohne Analyse- und Drittanbieterdienste, Datenschutzbeauftragter übernommen.

## Bewusst geändert

- **Schreibweise:** In der Stellenanzeige stand „IP3 Energie“, übernommen als „ip³“ (Corporate Design). Emojis entfernt. Tippfehler aus Galerietiteln („Powewall“, „Photvovoltaik“) korrigiert.
- **Impressum:** Rechtsgrundlage „§ 10 MDStV“ ersetzt durch „§ 18 Abs. 2 MStV“, „§ 5 TMG“ durch „§ 5 DDG“. Der Hinweis auf die C3 marketing agentur (Screendesign, Realisierung mit TYPO3) ist entfallen, weil die neue Website nicht von ihr stammt. Ergänzt: Hinweis zur Verbraucherstreitbeilegung nach § 36 VSBG (siehe offene Punkte) und ein Bildnachweis.
- **Datenschutzerklärung:** Die bisherige Fassung (Stand 01.07.2023) beschreibt Google Analytics, Remarketing, Google Maps, YouTube, Instagram, LinkedIn, jQuery und das nicht mehr gültige Privacy-Shield-Abkommen. Die neue Website nutzt nichts davon, lädt alle Schriften und Bilder vom eigenen Server und setzt keine Cookies. Die Erklärung ist deshalb neu geschrieben.
- **Formular:** Wie bisher Firma (optional), Name, E-Mail, Telefon, Anschrift, Interesse und Nachricht. Anders als bisher sind Straße sowie PLZ und Ort freiwillig, „Interesse an“ ist eine Einfachauswahl mit zusätzlich Batteriespeicher und Sonstiges.
- **Cookie-Banner:** entfällt, weil keine Cookies gesetzt werden.
- **Fotos:** Archivkopien der bisherigen Website (höchstens 1.600 px, ohne Metadaten), beim Build als WebP in 640, 1.024 und 1.600 px Breite ausgeliefert. Kennzeichen auf Fahrzeugen sind in den Originalen bereits unkenntlich. Nicht übernommen sind die Banner- und Kategoriebilder (Bildagentur-Anmutung), das Platzhalterbild ohne Porträt und das Luftbild des Büros (nur 600 px breit).

## Bitte prüfen und ergänzen

1. **Anschrift:** Die bisherige Website nennt durchgehend Dr.-Pfleger-Str. 34, 92637 Weiden. Im Impressum stehen diese Anschrift und „Sitz der Gesellschaft: Theisseil“. Soll eine Anschrift in Theisseil ergänzt oder die Weidener Anschrift ersetzt werden, fehlt die vollständige Straßenangabe.
2. **Verbraucherstreitbeilegung:** Auf der bisherigen Website nicht vorhanden. Bei mehr als zehn Beschäftigten ist der Hinweis nach § 36 VSBG Pflicht. Eingesetzt ist die übliche Erklärung, nicht an Verfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. Soll ip³ teilnehmen, den Text im Impressum ändern.
3. **Porträts:** Das Archiv ordnet drei Porträts keinem Namen zu (Dateien „233“, „1234“ und ein Platzhalter). Zugeordnet ist nach der Reihenfolge auf der bisherigen Seite Über uns: Stefan Pregler, Benjamin Völkl, Sascha Kriegler ohne Foto. Bitte bestätigen. Für die Veröffentlichung der Porträts sollte die Einwilligung der Mitarbeitenden vorliegen.
4. **Bildrechte:** Die Fotos stammen von der bisherigen Website, Fotografen sind dort nicht genannt. Bei Fotos von Privathäusern sollten die Einverständnisse vorliegen. Nennt ein Fotograf eine Urhebernennung als Bedingung, im Impressum unter Bildnachweis ergänzen.
5. **Hoster:** Auf der bisherigen Website nicht benannt. Für die neue Website Hoster und Auftragsverarbeitungsvertrag ergänzen, Datenschutzerklärung rechtlich prüfen lassen.
6. **Referenzen:** Ob „Breite Wiesn“ und die Freifläche Weiden dieselbe Anlage sind, ist aus den Galerietiteln nicht erkennbar; sie stehen getrennt. Im Marktstammdatenregister ist eine Einheit „PV-FF-VOH-D“ mit 1.364,4 kWp (Betreiber ip³ | PV-VOH GmbH & Co. KG) verzeichnet; ob das die Freifläche Vohenstrauß ist, bitte bestätigen. Die Alternativtexte beschreiben nur, was auf den Fotos zu sehen ist.
7. **Partnerlogos:** Die Logos liegen nur in der Auflösung der bisherigen Website vor (rund 300 px breit). Für gestochen scharfe Darstellung auf hochauflösenden Bildschirmen die Originaldateien der Partner einsetzen, gleicher Dateiname in `public/img/partner/`.
8. **Kennzahlen:** Stand 05.10.2026, bei Änderungen in `src/data/site.js` anpassen.
9. **Neue Seite** `/unsere-leistungen/batteriespeicher` auf Basis der Angaben zu Heim-, Gewerbe- und Großspeichern.
