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

Zusätzlich entsteht `vorschau-offline/ip3-website.html`: die gesamte Website in einer einzigen Datei, mit Navigation zwischen allen Seiten. Sie lässt sich auch dort öffnen, wo nur eine einzelne Datei geht, etwa auf Android-Smartphones oder als E-Mail-Anhang. Das Formular verschickt in beiden Offline-Fassungen nichts und bietet stattdessen die vorbereitete E-Mail an.

Ohne PHP genügt `npm run build && npm run preview`. Das Formular meldet dann ehrlich, dass der direkte Versand nicht möglich ist, und bietet die vorbereitete Nachricht für das E-Mail-Programm an.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `src/pages/` | Seiten, URLs wie auf der bisherigen Website (`/ueber-uns`, `/unsere-leistungen/privat` …) |
| `src/components/Story.astro` | Scroll-Inszenierung der Startseite (HTML-Inhalte, Beschriftungen, Fallback) |
| `src/scripts/story/` | Three.js-Szene: Modul, prozeduraler Zellshader, Lichteinfall, Gesamtanlage, Kamerafahrt |
| `src/lib/iso.js` | Generator für die isometrischen Linienzeichnungen |
| `src/data/` | Unternehmensdaten, Leistungen, Referenzen |
| `src/styles/` | Designsystem: Farben, Schriften, Raster, Bausteine |
| `public/kontakt-senden.php` | Versand des Kontaktformulars per PHP `mail()` |
| `public/.htaccess` | Saubere URLs und Caching für Apache |
| `scripts/` | Prüf- und Renderwerkzeuge (Standbilder, Icons, Browserprüfung, Video) |
| `docs/INHALTE.md` | Herkunft der Inhalte und offene Punkte |

## Inhalte pflegen

- **Kontaktdaten, Impressum:** `src/data/site.js`
- **Referenzen:** `src/data/referenzen.js`. Für ein Projektfoto die Datei nach `public/img/referenzen/` legen und bei der Referenz `bild: '/img/referenzen/dateiname.jpg'` eintragen (Querformat, mindestens 1.600 px breit). Kennwerte über `leistung` und `komponenten`.
- **Leistungstexte:** `src/data/leistungen.js` und die Seiten in `src/pages/unsere-leistungen/`

## Inszenierung auf der Startseite

Die Szene wird erst geladen, wenn WebGL verfügbar ist, und rendert nur, solange sie im Bild ist. Bei `prefers-reduced-motion`, fehlendem WebGL, schwacher Hardware oder zu langsamer Darstellung zeigt die Seite automatisch eine statische Bildfolge mit denselben Texten. Zum Testen: `/?static`.

Die Standbilder für Poster und statische Variante werden aus der Szene gerendert:

```bash
npm run dev          # in einem zweiten Terminal
npm run bilder       # Standbilder, Favicons, Social-Media-Bild (benötigt Playwright-Chromium)
```

## Prüfen

```bash
npm run vorschau                 # in einem Terminal
node scripts/pruefen.mjs         # Browserprüfung aller Seiten in drei Gerätegrößen
```

Geprüft werden Statuscodes, Konsole, fehlerhafte Ressourcen, horizontaler Überlauf, Überschriftenstruktur, Alternativtexte, Meta-Angaben und alle internen Links.

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
