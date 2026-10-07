# Website ip³ Energietechnik GmbH

Neuaufbau von www.ip3-energie.de. Statische Website auf Basis von Astro, Three.js und GSAP.

## Vorschau starten

Voraussetzung: Node.js 20 oder neuer. Für das Kontaktformular zusätzlich PHP 8.

```bash
npm install
npm run dev          # Entwicklungsserver mit Live-Reload: http://localhost:4321
```

Vorschau des fertigen Builds mit sauberen URLs und funktionsfähigem Formular-Skript:

```bash
npm run vorschau     # baut die Seite und startet http://127.0.0.1:8080
```

Ohne lokalen Mailserver verschickt PHP keine E-Mails. Zum Testen lässt sich der Versand in eine Datei umleiten:

```bash
npm run build
php -d sendmail_path="tee -a /tmp/ip3-mail.txt" -S 127.0.0.1:8080 -t dist scripts/vorschau-router.php
```

Offline-Fassung zum Weitergeben, ohne Server und ohne Installation:

```bash
npm run offline      # erzeugt vorschau-offline/: jede Seite als eigenständige HTML-Datei, index.html per Doppelklick öffnen
```

Zusätzlich entsteht `vorschau-offline/ip3-website.html`: die gesamte Website in einer einzigen Datei, mit Navigation zwischen allen Seiten. Sie lässt sich auch dort öffnen, wo nur eine einzelne Datei geht, etwa auf Android-Smartphones oder als E-Mail-Anhang. Daneben liegt `vorschau-offline/ip3-handy-simulation.html`: dieselbe Website im Handy- oder Tablet-Rahmen in echter Darstellungsgröße (360, 390, 430 und 820 px breit, hoch und quer), mit nachgebildetem Touchgerät ohne Hover-Zustände und mit Wischen per gedrückter Maustaste. Damit lässt sich die mobile Fassung am Rechner prüfen. Ohne JavaScript, etwa in der Dateivorschau am iPhone, zeigen beide Dateien einen Hinweis statt einer leeren Fläche; am Handy selbst öffnet die Simulation die Website im Vollbild.

Für das Handy ohne Server gibt es den Rundgang als Video: `node scripts/video-rundgang.mjs http://127.0.0.1:8080 rundgang.mp4` bei laufender Vorschau (benötigt ffmpeg, Pfad über `FFMPEG`). Das Formular verschickt in beiden Offline-Fassungen nichts und bietet stattdessen die vorbereitete E-Mail an.

Ohne PHP genügt `npm run build && npm run preview`. Das Formular meldet dann ehrlich, dass der direkte Versand nicht möglich ist, und bietet die vorbereitete Nachricht für das E-Mail-Programm an.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `src/pages/` | Seiten, URLs wie auf der bisherigen Website (`/ueber-uns`, `/unsere-leistungen/privat` …) |
| `src/components/Story.astro` | Scroll-Inszenierung der Startseite (HTML-Inhalte, Beschriftungen, Fallback) |
| `src/scripts/story/` | Three.js-Szene: Modul, prozeduraler Zellshader, Lichteinfall, Gesamtanlage, Kamerafahrt |
| `src/lib/iso.js` | Generator für die isometrischen Linienzeichnungen |
| `src/components/Energiesystem.astro` | Grafik „Ein Tag im Energiesystem“ (Startseite und Leistungsübersicht) |
| `src/lib/energiesystem-modell.js` | Tagesmodell: Profile, Speicherregeln, Flüsse auf allen Leitungen, deterministisch |
| `src/lib/energiesystem-szene.js` | Isometrische Landschaft, Leitungen mit sichtbaren Abschnitten, Marker, Zustand um 13:00 Uhr |
| `src/scripts/energiesystem/` | Laufzeit im Browser: Uhr und Zeitleiste, Teilchen, Auswahl und Infokarte |
| `src/components/Erloesanalyse.astro` | Beispielauswertung „Ein Tag am Netzanschluss“ auf der Seite Monitoring |
| `src/lib/monitoring-modell.js`, `monitoring-diagramm.js` | Beispieltag am Netzanschluss (deterministisch) und die Diagramme dazu, beim Build als SVG |
| `src/lib/monitoring-szene.js` | Isometrische Zeichnung der Leistung Monitoring (eigenes Modul, `iso.js` bleibt unverändert) |
| `src/pages/referenzen/[slug].astro` | Projektseite je Referenz unter `/referenzen/<slug>` |
| `src/data/seiten.js` | Liste aller Seiten für Sitemap, Prüfungen und Offline-Fassung, aus den Daten abgeleitet |
| `src/data/` | Unternehmensdaten, Team, Leistungen, Referenzen, Bildstrecken, Partnerlogos |
| `src/assets/fotos/` | Projektfotos und Porträts (JPEG), beim Build in WebP-Dateien mehrerer Breiten umgerechnet |
| `public/img/partner/` | Partnerlogos (WebP, weißer Rand entfernt) |
| `src/styles/` | Designsystem: Farben, Schriften, Raster, Bausteine |
| `public/kontakt-senden.php` | Versand des Kontaktformulars per PHP `mail()` |
| `public/.htaccess` | Saubere URLs und Caching für Apache |
| `scripts/` | Prüf- und Renderwerkzeuge (Standbilder, Icons, Browserprüfung, Video) |
| `docs/INHALTE.md` | Herkunft der Inhalte und offene Punkte |
| `docs/vorlagen/ip3-referenzen-erfassung.xlsx` | Excel-Vorlage, mit der ip³ Angaben zu den Referenzen liefert |

## Inhalte pflegen

- **Kontaktdaten, Impressum:** `src/data/site.js`
- **Referenzen:** `src/data/referenzen.js`, die Felder sind am Dateianfang beschrieben. Die Reihenfolge der Liste ist die Reihenfolge auf `/referenzen`; zunächst erscheinen neun Projekte, diese brauchen ein Foto. Jede Referenz hat eine Projektseite unter `/referenzen/<slug>`; erst mit `text` wird sie für Suchmaschinen freigegeben und in die Sitemap aufgenommen. `startseite: 1` bis `6` wählt die Auswahl auf der Startseite, `freigabe: false` blendet ein Projekt überall aus. Für ein Foto die JPEG-Datei nach `src/assets/fotos/referenzen/` legen und `bild: 'referenzen/dateiname'` (ohne Endung) mit `bildAlt` eintragen, mindestens 1.600 px breit; weitere Fotos über `fotos: [{ src, alt }]`. Keine Kundennamen in Titeln, Dateinamen und Fotos. Angaben von ip³ kommen über die Excel-Vorlage in `docs/vorlagen/`.
- **Bildstrecken:** `src/data/galerien.js`, Fotos in `src/assets/fotos/galerie/`. Astro erzeugt WebP in 640, 1.024 und 1.600 px Breite und lässt Metadaten weg.
- **Team:** `src/data/site.js`, Porträts quadratisch in `src/assets/fotos/team/`. Ohne Foto erscheint ein Monogramm.
- **Partnerlogos:** `src/data/partner.js`, Dateien in `public/img/partner/`.
- **Leistungstexte:** `src/data/leistungen.js` und die Seiten in `src/pages/unsere-leistungen/`. Ein neuer Leistungsbereich braucht einen Eintrag in `leistungen.js` und in `leistungenNav` (`src/data/site.js`), Menü, Fußzeile, Sitemap und Prüfungen ziehen nach.
- **Verbund mit ENMAG:** `verbund` in `src/data/site.js`. ENMAG-Grün nur für ENMAG-Elemente; das Logo erst einsetzen, wenn die Datei von ENMAG vorliegt, dann beide Logos gleich groß.
- **Kontaktformular:** Auswahl „Interesse an“ in `src/components/ContactForm.astro` und gleichlautend in der Positivliste von `public/kontakt-senden.php`; `scripts/pruefen-daten.mjs` vergleicht beide.
- **Energiesystem:** Texte, Begriffe der Einleitung, Lagesätze und Leistungen in `src/data/energiesystem.js`. Für jeden Zustandsschlüssel des Tagesmodells muss ein Lagesatz vorhanden sein, das prüft `node scripts/pruefen-energiesystem.mjs`.

## Energiesystem

Ein deterministisches Tagesmodell (96 Viertelstunden, schematischer Frühlingstag) berechnet Erzeugung, Speicher und die Flüsse auf 17 Leitungen. Beim Build entstehen daraus die Landschaft und der Zustand um 13:00 Uhr mit Richtungspfeilen, damit die Grafik auch ohne JavaScript verständlich ist. Im Browser läuft der Tag in rund 32 Sekunden: Quadrate wandern ruhig über die sichtbaren Abschnitte der Leitungen (gefüllt Grünstrom, hohl Netzstrom, rot das gewählte Element), Speicher füllen sich (Füllstand als Batteriesymbol am Namen), Fenster leuchten abends. Die Uhr läuft nur, solange die Grafik im Bild ist; bei reduzierter Bewegung, Pause oder ohne JavaScript zeigen Pfeile die Richtung. Marker, Elemente der Grafik und die Begriffe im Text öffnen eine Infokarte, beim Überfahren als Vorschau, per Klick, Antippen oder Enter angeheftet. Zum Testen stellt `/?debug` die Steuerung unter `window.__energiesystem` bereit.

## Monitoring

Die Seite `/unsere-leistungen/monitoring` folgt dem Text von ip³. Die Beispielauswertung „Ein Tag am Netzanschluss“ beruht auf einem deterministischen, schematischen Beispieltag ohne Zahlen und Einheiten: Ausfall von Wechselrichter 6 am Vormittag, Vorgabe des Netzbetreibers um die Mittagszeit (gegen Mittag durch eine Wolke zeitweise nicht wirksam), Abregelung durch den Direktvermarkter bei negativen Preisen. Im ersten Kapitel zeigt ein Zeitband über dem Diagramm, wer wann eine Vorgabe macht (Netzbetreiber: Obergrenze, Direktvermarkter: Abregelung); darunter Einspeisung und mögliche Erzeugung, die Obergrenze als helles Band und die dadurch nicht eingespeiste Energie als Fläche in der Farbe der Vorgabe. Am Desktop klebt die Auswertung rechts und zeigt das Diagramm des Kapitels in der Bildmitte; ein Zeitlineal (Tastatur, Maus) liest den Tag in Worten ab. Am Handy und ohne JavaScript steht jedes Diagramm im Kapitel, dazu der Verlauf in Worten als Tabelle. Farben nach CD-Diagrammfolge, zusätzlich Schraffur 45° für den Netzbetreiber und 135° für den Direktvermarkter.

## Inszenierung auf der Startseite

Ablauf: Im Einstieg steht das Hauptmodul angehoben am Westende seiner Reihe, die Reihe verläuft nach hinten ins Navy, ein Reflex wandert über das Glas, rechts oben liegt der rote Sonnenpunkt des Zeichens 3 (nur ab Tabletbreite, blendet beim ersten Scrollen aus). Das Modul setzt sich in die Reihe, die Kamera taucht in die Zelle, zoomt heraus, die Anlage baut sich um die Reihe auf. Im Schritt 03 kommen südlich des Zauns ein Einfamilienhaus (PV, Heimspeicher, Wallbox) und eine Gewerbehalle (PV-Dach, Speicherschränke, Ladesäulen) hinzu, versorgt über eine Ortsnetzstation am selben 20-kV-Netz. Am Handy zeigt das Schlussbild den Ortsrand unter dem Textfeld, die Labels der Anlage blenden dort zum Schluss aus. Kamerawerte stehen als Schlüsselbilder in `src/scripts/story/index.js`; `scripts/tune-story.mjs` und `scripts/shot-story.mjs` rendern Varianten und Einzelbilder. Leistung: Die Anlage bleibt bis zum Aufbau verborgen, die Reihe im Einstieg hat eigene Instanzen (nur der Tisch des Hauptmoduls) mit einem leichten, unbeleuchteten Zellmaterial und verschwindet, bevor die Kamera in die Zelle taucht.

Die Szene wird erst geladen, wenn WebGL verfügbar ist, und rendert nur, solange sie im Bild ist. Bei `prefers-reduced-motion`, fehlendem WebGL oder schwacher Hardware zeigt die Seite eine statische Bildfolge mit denselben Texten. Ist die Darstellung zu langsam, bleibt das letzte Bild stehen und der Wechsel auf die statische Fassung geschieht erst, wenn die Inszenierung aus dem Bild gescrollt ist; die Leseposition bleibt dabei erhalten. Zum Testen: `/?static`.

Vorübergehend: Vorschläge für Schritt 03 ohne Haus und Halle unter `/?schritt3=a` bis `/?schritt3=d` (`src/scripts/story/vorschlaege.js`, nur mit Parameter geladen). Nach der Entscheidung von ip³ wird die gewählte Variante regulär eingebaut und die Datei entfernt.

Die Standbilder für Poster und statische Variante werden aus der Szene gerendert:

```bash
npm run dev          # in einem zweiten Terminal
npm run bilder       # Standbilder, Favicons, Social-Media-Bild (benötigt Playwright-Chromium)
```

## Prüfen

```bash
node scripts/pruefen-daten.mjs           # Referenzen, Fotos, Navigation, Formularoptionen, ohne Browser
node scripts/pruefen-energiesystem.mjs   # Tagesmodell, Texte und Geometrie der Grafik, ohne Browser
node scripts/pruefen-monitoring.mjs      # Beispieltag Monitoring, Diagramme, gebaute Seite, ohne Browser
npm run vorschau                         # in einem Terminal
node scripts/pruefen.mjs                 # Browserprüfung aller Seiten in drei Gerätegrößen
node scripts/pruefen-interaktion.mjs     # Tastatur, Menüs, Formular, Referenzen, Energiesystem, Monitoring
node scripts/messen-scrollen.mjs         # Bildzeiten beim Scrollen mit gedrosselter CPU (Entwicklungswerkzeug)
```

Geprüft werden Statuscodes, Konsole, fehlerhafte Ressourcen, horizontaler Überlauf, Überschriftenstruktur, doppelte IDs, Alternativtexte, Meta-Angaben und alle internen Links, dazu dass Einblendungen ohne Restverschiebung enden, und die Bedienung per Maus, Tastatur und Touch. `pruefen.mjs` prüft von den Projektseiten eine Stichprobe, `PRUEF_ALLE=1` alle.

## Testumgebung

Geschützte Testadresse auf dem eigenen Webserver, zum Beispiel `test.ip3-energie.de`:

```bash
npm run testumgebung   # erzeugt testumgebung/ und gibt Benutzername und Passwort aus
```

Der Ordner enthält die komplette Website. Eine vorangestellte `.htaccess`-Sperre verlangt bei jedem Aufruf Benutzername und Passwort und schließt Suchmaschinen aus. Eigene Zugangsdaten über `TEST_BENUTZER` und `TEST_PASSWORT`. Den Inhalt einschließlich `.htaccess` direkt in das Verzeichnis der Testadresse hochladen. Beim ersten Aufruf muss die Passwortabfrage erscheinen, sonst wertet der Server die `.htaccess` nicht aus. Das Formular verschickt dort echte E-Mails, der Betreff beginnt mit `[Test]`. Browserprüfung gegen die Testadresse: `PRUEF_LOGIN=ip3:passwort node scripts/pruefen.mjs https://test.ip3-energie.de`.

## Veröffentlichung

Der Ordner `dist/` nach `npm run build` ist die vollständige Website. Für Apache liegt eine `.htaccess` bei. Die Weiterleitungen auf https und www sind darin auskommentiert und erst auf der produktiven Domain zu aktivieren. Für nginx entspricht das `try_files $uri $uri.html $uri/ =404;`. Das Formular-Skript benötigt PHP mit funktionierender `mail()`-Funktion, alternativ lässt sich über `PUBLIC_FORM_ENDPOINT` beim Build ein anderer Empfänger-Endpunkt setzen.

## Lizenzen

Schriften Libre Franklin und Space Grotesk: SIL Open Font License (`public/fonts/`). Three.js: MIT. GSAP: Standard-Lizenz von GreenSock (kostenfrei, auch kommerziell). Astro: MIT.
