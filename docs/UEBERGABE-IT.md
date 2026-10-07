# Neue Website www.ip3-energie.de: Übergabe an die IT

ip³ Energietechnik GmbH · Stand 07.10.2026 · Ansprechpartner bei ip³: Sven Wilhelm

Diese Anleitung beschreibt, wie die neue Website die bisherige TYPO3-Seite unter www.ip3-energie.de ablöst. Im Quellcode liegt sie unter `docs/UEBERGABE-IT.md`, die Serverdateien unter `docs/server/`.

## Auf einen Blick

Die neue Website ist ein statischer Export: HTML, CSS, JavaScript, Bilder und Schriften, zusammen rund 30 MB. Es gibt kein CMS, keine Datenbank, keine Cookies, kein Tracking und keine eingebundenen Fremddienste; Schriften und Bilder kommen vom eigenen Server. Einziges Serverskript ist `kontakt-senden.php` für das Kontaktformular.

Voraussetzungen auf dem Server:

- Apache 2.4 mit mod_rewrite, mod_headers und mod_deflate, die `.htaccess` muss ausgewertet werden (`AllowOverride All`). Alternativ nginx, die Konfiguration liegt bei.
- PHP 8 mit funktionierender `mail()`-Funktion (geprüft mit PHP 8.3).
- Gültiges Zertifikat für www.ip3-energie.de und ip3-energie.de.

Die bisherige Website liegt laut DNS auf einem Server bei Hetzner (dedi7975.your-server.de). Alle bisherigen Seiten bleiben unter denselben Adressen erreichbar, ohne `.html` und ohne Schrägstrich am Ende. Die Sitemap nennt 13 Seiten; dazu kommen 18 Projektseiten unter `/referenzen/…`, die vorerst nicht in Suchmaschinen sollen (noindex, nicht in der Sitemap). Die frühere Seite `/efre-foerderhinweis` entfällt bewusst und liefert die Fehlerseite (404).

## Vor dem Livegang von ip³ zu bestätigen

Inhaltliche Punkte, nicht Aufgabe der IT, aber Voraussetzung für die Veröffentlichung:

1. Anschrift im Impressum: Dr.-Pfleger-Str. 34, 92637 Weiden i.d.OPf., Sitz der Gesellschaft Theisseil.
2. Hinweis zur Verbraucherstreitbeilegung im Impressum.
3. Einwilligungen der Mitarbeitenden für die Porträts, Bildrechte und Einverständnisse für Fotos von Privathäusern.
4. Hoster und Auftragsverarbeitungsvertrag, rechtliche Prüfung der Datenschutzerklärung.
5. Freigabe der weißen Fassung des ENMAG-Logos durch ENMAG.

Weitere offene Punkte stehen in `docs/INHALTE.md` unter „Bitte prüfen und ergänzen“.

## Lieferumfang

| Datei oder Ordner | Inhalt |
|---|---|
| `ip3-website-livegang.zip` | Paket für den Livegang mit den folgenden Teilen |
| `00-ANLEITUNG.pdf`, `00-ANLEITUNG.md` | diese Anleitung |
| `01-website/` | die Website für www.ip3-energie.de, mit `.htaccess` (Weiterleitung auf https und www aktiv) |
| `02-server/apache/htaccess-ohne-https.txt` | dieselbe `.htaccess` ohne Weiterleitung auf https und www, nur als Übergang |
| `02-server/nginx/` | `ip3-energie.conf`, `ip3-regeln.conf` (Regeln wie in der `.htaccess`), `test-ip3-energie.conf` (Testumgebung mit Passwort) |
| `02-server/pruefen-livegang.sh` | Prüfskript für bash und curl |
| `ip3-website-testumgebung.zip` | Website mit Passwortschutz und Sperre für Suchmaschinen, für eine Testadresse |
| `ip3-website-quellcode.zip` | Quellcode (Astro), daraus lassen sich alle Pakete neu bauen |

## Livegang

### 1. Sichern

Die bisherige Website vollständig sichern: Dateien des Webverzeichnisses und die TYPO3-Datenbank. Die Sicherung ist der Rückweg.

### 2. Optional: Testumgebung

Eine Subdomain, zum Beispiel test.ip3-energie.de, mit eigenem, leerem Verzeichnis und Zertifikat anlegen und den Inhalt von `ip3-website-testumgebung.zip` einschließlich der versteckten Datei `.htaccess` direkt in dieses Verzeichnis legen. Beim ersten Aufruf muss sofort die Passwortabfrage erscheinen (Benutzer `ip3`, das Passwort wird separat übermittelt). Erscheint sie nicht, wertet der Server die `.htaccess` nicht aus: Dateien sofort wieder entfernen, sonst ist die Testseite offen. Unter nginx greift die `.htaccess` nie, dort `02-server/nginx/test-ip3-energie.conf` verwenden.

```
bash 02-server/pruefen-livegang.sh https://test.ip3-energie.de --zugang ip3:PASSWORT --formular
```

Das Formular verschickt auch dort echte E-Mails an info@ip3-energie.de, der Betreff beginnt dann mit `[Test]`.

### 3. Zertifikat

Die `.htaccess` aus `01-website` leitet alle Aufrufe auf `https://www.ip3-energie.de` um. Vor dem Hochladen deshalb prüfen, dass www.ip3-energie.de ein gültiges Zertifikat liefert; für Aufrufe ohne www muss es auch ip3-energie.de enthalten. Fehlt es, zuerst das Zertifikat einrichten (zum Beispiel Let's Encrypt) oder übergangsweise `02-server/apache/htaccess-ohne-https.txt` als `.htaccess` verwenden und nach dem Einrichten tauschen.

### 4. Hochladen

Den Inhalt von `01-website` einschließlich der versteckten Datei `.htaccess` in das Webverzeichnis von www.ip3-energie.de legen. Empfohlen: ein neues, leeres Verzeichnis anlegen, dort hochladen und dann das Dokumentenverzeichnis der Domain darauf umstellen; der Rückweg ist dann ein Umschalten. Dateien der alten TYPO3-Installation (`typo3/`, `typo3conf/`, `fileadmin/`, `index.php`, alte `.htaccess`) gehören nicht in das neue Webverzeichnis. Dateien und Verzeichnisse müssen für den Webserver lesbar sein (üblich 644 und 755).

### 5. Kontaktformular und E-Mail

Das Formular verschickt über PHP `mail()` an `info@ip3-energie.de`, Absender ist `noreply@ip3-energie.de`. Damit die Anfragen ankommen und nicht im Spam landen, muss der SPF-Eintrag von ip3-energie.de den Mailausgang des Webservers zulassen; gibt es DKIM und eine DMARC-Richtlinie für die Domain, gilt das entsprechend. Testversand:

```
bash 02-server/pruefen-livegang.sh --formular
```

Im Postfach info@ip3-energie.de muss eine Mail mit dem Betreff „Projektanfrage über ip3-energie.de: Sonstiges“ ankommen, ohne `[Test]`.

### 6. Prüfen

```
bash 02-server/pruefen-livegang.sh
```

Das Skript prüft von außen rund 50 Punkte: alle Seiten, saubere Adressen und Weiterleitungen, Fehlerseite, robots.txt und Sitemap, Caching, Sicherheits-Header, Komprimierung, gesperrte Dateien, das Formular-Skript, https und www sowie Reste der alten Installation. Erwartet wird „0 FEHLER“. Es braucht nur bash und curl und läuft unter Linux, macOS und unter Windows in Git Bash oder WSL. Einen neuen Server prüft es schon vor der DNS-Umstellung, wenn `CURL_OPTS` die Namen auf dessen IP-Adresse lenkt (Beispiel im Kopf des Skripts).

Danach im Browser: die Startseite am Rechner und am Handy einmal ganz durchscrollen (3D-Ablauf), Menü, eine Projektseite und das Kontaktformular mit einer echten Anfrage.

### 7. Suchmaschinen

In der Google Search Console die Sitemap `https://www.ip3-energie.de/sitemap.xml` einreichen. In den ersten Wochen den Bericht zu nicht gefundenen Seiten ansehen: Werden alte Adressen der TYPO3-Seite noch aufgerufen, zum Beispiel Dateien unter `/fileadmin/`, dafür eine Weiterleitung auf die passende neue Seite ergänzen. Für Apache in der `.htaccess` direkt nach den https-Regeln, zum Beispiel `RewriteRule ^alte-adresse$ /neue-adresse [R=301,L]`, für nginx ein `location` mit `return 301`. Dieselbe Änderung auch im Quellcode in `public/.htaccess` bzw. `docs/server/` nachziehen, sonst fehlt sie beim nächsten Paket.

### 8. Rückweg und Aufbewahrung

Bei Problemen das Dokumentenverzeichnis zurückstellen oder die Sicherung einspielen. Die Sicherung der alten Website einige Monate aufbewahren. Die alte TYPO3-Installation danach nicht weiter erreichbar betreiben.

## nginx statt Apache

1. `ip3-regeln.conf` nach `/etc/nginx/snippets/`, `ip3-energie.conf` nach `/etc/nginx/sites-available/` legen und in `sites-enabled` verlinken.
2. In `ip3-energie.conf` die Zertifikatspfade und `root` anpassen und den Inhalt von `01-website` dorthin legen. Die `.htaccess` ist unter nginx wirkungslos und von außen gesperrt.
3. In `ip3-regeln.conf` den PHP-FPM-Socket (`fastcgi_pass`) an die installierte PHP-Version anpassen. `snippets/fastcgi-php.conf` gibt es unter Debian und Ubuntu; auf anderen Systemen stattdessen `include fastcgi_params;` und `fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;`.
4. Ohne IPv6 die Zeilen `listen [::]:…` entfernen. Ab nginx 1.25.1 statt `listen 443 ssl http2;` besser `listen 443 ssl;` und `http2 on;`.
5. `nginx -t`, dann `systemctl reload nginx`.

Für die Testumgebung `test-ip3-energie.conf` verwenden; wie die Passwortdatei angelegt wird, steht im Kopf der Datei. Unter nginx meldet das Prüfskript dort einen Hinweis auf das fehlende `X-Robots-Tag`; das ist erwartet, Passwort und robots.txt halten Suchmaschinen fern.

## Kontaktformular im Detail

- Mit JavaScript sendet die Kontaktseite an `/kontakt-senden.php` und zeigt die Antwort direkt an. Ohne JavaScript läuft es klassisch mit Weiterleitung auf `/kontakt#anfrage-gesendet` bzw. `/kontakt#anfrage-fehler`.
- Empfänger `info@ip3-energie.de`, Absender `Website ip3-energie.de <noreply@ip3-energie.de>`, Antwortadresse ist die E-Mail aus dem Formular. Betreff „Projektanfrage über ip3-energie.de: …“ mit dem gewählten Interesse; auf jeder anderen Adresse als www.ip3-energie.de und ip3-energie.de beginnt er mit `[Test]`.
- Spamschutz ohne Fremddienst: ein verstecktes Lockfeld, eine Mindestzeit von 3 Sekunden zwischen Aufruf und Absenden, höchstens einen Tag alte Formulare.
- Empfänger und Absender stehen oben in `kontakt-senden.php`.
- Scheitert `mail()`, antwortet das Skript mit Fehler 502 und die Seite zeigt „Versand nicht möglich“ mit E-Mail-Adresse und Telefonnummer. Eine Erfolgsmeldung erscheint nur, wenn der Server die Mail angenommen hat.
- Erlaubt der Server `mail()` nicht, kann PHP über einen SMTP-Relay versenden (zum Beispiel msmtp als `sendmail_path`). Ein anderer Empfänger-Endpunkt lässt sich beim Build über `PUBLIC_FORM_ENDPOINT` setzen; dann muss die Datenschutzerklärung angepasst werden.

## Störungen

| Erscheinung | Ursache und Abhilfe |
|---|---|
| Fehler 500 auf allen Seiten | Der Server erlaubt eine Anweisung der `.htaccess` nicht oder ein Modul fehlt. Fehlerlog ansehen, `AllowOverride All` setzen, mod_rewrite und mod_headers aktivieren. |
| Startseite geht, Unterseiten liefern 404 | `.htaccess` fehlt (versteckte Datei nicht hochgeladen), wird nicht ausgewertet (`AllowOverride None`) oder mod_rewrite fehlt. |
| `kontakt-senden.php` wird angezeigt oder heruntergeladen | PHP ist für das Verzeichnis nicht aktiv. |
| Formular meldet „Versand nicht möglich“ | `mail()` scheitert (Antwort 502). PHP-Fehlerlog und Mailausgang des Servers prüfen. |
| Mail kommt nicht an oder landet im Spam | SPF, DKIM und DMARC von ip3-energie.de prüfen; der Webserver muss für `noreply@ip3-energie.de` senden dürfen. |
| Endlose Weiterleitung | TLS endet an einem vorgeschalteten Proxy, der kein `X-Forwarded-Proto: https` mitschickt. Den Header im Proxy setzen oder die Weiterleitung im Proxy einrichten und `htaccess-ohne-https.txt` verwenden. |
| Seiten nicht im Suchindex | Prüfskript meldet `robots.txt` oder `X-Robots-Tag`: Es ist das Testpaket statt `01-website` hochgeladen. |

## Datenschutz und Betrieb

- Die Datenschutzerklärung nennt den Hosting-Anbieter als Auftragsverarbeiter (Art. 28 DSGVO). Mit dem Hoster einen Auftragsverarbeitungsvertrag abschließen, falls noch keiner besteht.
- Server-Logdateien nur so lange aufbewahren, wie es für Betrieb und Sicherheit nötig ist. Die Erklärung nennt keine feste Frist; wird eine eingestellt, kann sie dort ergänzt werden.
- Laut Erklärung gibt es keine Cookies, kein Tracking, keine Fremddienste und die Auslieferung erfolgt per TLS. Analysewerkzeuge, Karten, Videos oder Schriften von fremden Servern nur nach Anpassung der Erklärung nachrüsten.
- Es gibt keine CMS-Updates. Server, PHP und Zertifikat wie gewohnt aktuell halten.

## Geprüft

- Apache 2.4.58 mit PHP 8.3.6 und nginx 1.24.0 mit PHP-FPM 8.3, jeweils mit TLS: Prüfskript ohne Fehler (48 Prüfungen), Testumgebung mit Passwort ohne Fehler (Apache 46, nginx 45 Prüfungen und der erwartete Hinweis), Testmails an info@ip3-energie.de mit und ohne `[Test]` im Mailprotokoll. Gegenproben: fehlende Weiterleitung, hochgeladenes Testpaket, gesperrte robots.txt, alte TYPO3-Dateien und ungültiges Zertifikat erkennt das Skript.
- Inhaltsdaten (28 Prüfungen) und im Browser mit Chromium an Rechner, Tablet und Handy: Seiten 607, Interaktion 89, Monitoring 27 und Energiesystem 29 Prüfungen, jeweils ohne Fehler. Die 607 Seitenprüfungen liefen zusätzlich gegen Apache mit der `.htaccess` und dem Formular-Skript dieser Lieferung.
- Nicht geprüft: der Zielserver und die Zustellung über den Mailausgang von ip3-energie.de. Beides zeigt das Prüfskript mit `--formular` auf dem Zielserver.

## Später ändern

Quellcode: `ip3-website-quellcode.zip` oder das GitHub-Repository `wilhelm-sven-dotcom/Website-ip3`, Branch `claude/focused-newton-m57ggy` (Zugang über ip³). Benötigt Node.js ab 22.12:

```
npm ci
npm run livegang       # Build und Paket für www.ip3-energie.de im Ordner livegang/
npm run testumgebung   # Build und Testpaket im Ordner testumgebung/
```

- Für eine Aktualisierung den Inhalt von `livegang/` hochladen und den alten Stand vollständig ersetzen; serverseitige Dateien wie `.well-known/` stehen lassen. Nicht `dist/` hochladen, dort ist die Weiterleitung auf https und www ausgeschaltet.
- Texte und Daten liegen in `src/data/` (Firma, Kennzahlen, Referenzen), die Seiten in `src/pages/`. Aufbau und Befehle beschreibt `README.md`, Herkunft der Inhalte und offene Punkte `docs/INHALTE.md`.
- Zugang der Testumgebung beim Bauen setzen: `TEST_BENUTZER=ip3 TEST_PASSWORT=… npm run testumgebung`. Ohne Neubau: in der `.htaccess` des Testpakets in der Zeile `RewriteCond %{HTTP:Authorization} "!=Basic …"` den Wert hinter `Basic` durch die Ausgabe von `printf 'ip3:NEUES-PASSWORT' | base64` ersetzen.
