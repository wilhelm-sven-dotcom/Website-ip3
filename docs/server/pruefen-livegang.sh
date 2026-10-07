#!/usr/bin/env bash
# Prüft die Website ip3-energie.de von außen, nachdem sie hochgeladen ist: Seiten, saubere Adressen,
# Fehlerseite, Caching, Sicherheits-Header, Kontaktformular und die Weiterleitungen auf
# https://www.ip3-energie.de. Benötigt nur bash und curl und ändert nichts auf dem Server.
#
# Aufruf:
#   bash pruefen-livegang.sh                      Produktivdomain https://www.ip3-energie.de
#   bash pruefen-livegang.sh --formular           zusätzlich eine echte Testanfrage an info@ip3-energie.de
#   bash pruefen-livegang.sh https://test.ip3-energie.de --zugang ip3:PASSWORT [--formular]
#                                                 Testumgebung mit Passwortschutz
# Zusätzliche curl-Optionen über CURL_OPTS (durch Leerzeichen getrennt), z. B. um einen neuen Server
# vor der DNS-Umstellung zu prüfen (IP einsetzen):
#   CURL_OPTS="--resolve www.ip3-energie.de:443:IP --resolve ip3-energie.de:443:IP
#              --resolve www.ip3-energie.de:80:IP --resolve ip3-energie.de:80:IP" bash pruefen-livegang.sh
# Ergebnis: je Prüfung OK, FEHLER oder HINWEIS. Exit-Code 0 nur ohne FEHLER.

set -f   # CURL_OPTS wird an Leerzeichen getrennt, Platzhalter wie * bleiben unverändert

BASIS="https://www.ip3-energie.de"
ZUGANG=""
FORMULAR=""
ANTWORT="pruefung@example.org"
while [ $# -gt 0 ]; do
  case "$1" in
    --zugang)
      [ $# -ge 2 ] || { echo "--zugang braucht benutzer:passwort"; exit 2; }
      ZUGANG="$2"; shift 2 ;;
    --formular)
      FORMULAR=1; shift
      case "$1" in *@*) ANTWORT="$1"; shift ;; esac ;;
    -h|--help) awk 'NR > 1 && /^#/ { print; next } NR > 1 { exit }' "$0"; exit 0 ;;
    http://*|https://*) BASIS="${1%/}"; shift ;;
    *) echo "Unbekannte Angabe: $1 (Hilfe: bash $0 --help)"; exit 2 ;;
  esac
done

SCHEMA="${BASIS%%://*}"
HOST="${BASIS#*://}"; HOST="${HOST%%/*}"; HOST="${HOST%%:*}"
PRODUKTIV=""
[ "$HOST" = "www.ip3-energie.de" ] && [ -z "$ZUGANG" ] && PRODUKTIV=1
PRAEFIX="[Test] "
case "$HOST" in www.ip3-energie.de|ip3-energie.de) PRAEFIX="" ;; esac

AUTH=()
[ -n "$ZUGANG" ] && AUTH=(-u "$ZUGANG")
roh() { curl -s --max-time 30 $CURL_OPTS "$@"; }          # ohne Zugangsdaten
c() { roh "${AUTH[@]}" "$@"; }                             # mit Zugangsdaten, falls angegeben
code() { c -o /dev/null -w '%{http_code}' "$@"; }
ziel() { c -o /dev/null -w '%{http_code} %{redirect_url}' "$@"; }
kopf() { c -D - -o /dev/null "$@" | tr -d '\r'; }
wert() { grep -i "^$1:" | head -1 | cut -d' ' -f2-; }      # Header-Wert aus kopf
pfad() { echo "$1" | sed -E 's#^[a-zA-Z]+://[^/]+##'; }    # Adresse ohne Schema und Host
hat() { if grep -q "$@"; then echo ja; else echo nein; fi; }

OK=0; FEHLER=0; HINWEISE=0
ok() { OK=$((OK + 1)); echo "OK       $1"; }
fehler() { FEHLER=$((FEHLER + 1)); echo "FEHLER   $1"; }
hinweis() { HINWEISE=$((HINWEISE + 1)); echo "HINWEIS  $1"; }
pruef() { if [ "$2" = "$3" ]; then ok "$1"; else fehler "$1: erwartet [$2], erhalten [$3]"; fi; }
soll() { if [ "$2" = "$3" ]; then ok "$1"; else fehler "$4"; fi; }   # beschreibung erwartet ist fehlertext
ende() {
  echo
  echo "$OK OK, $FEHLER FEHLER, $HINWEISE HINWEIS"
  if [ "$FEHLER" -eq 0 ]; then echo "Keine Fehler."; exit 0; fi
  echo "Bitte die FEHLER-Zeilen beheben (Abschnitt Störungen in der Anleitung) und erneut prüfen."
  exit 1
}
# Weiterleitung mit 301 auf einen Pfad
umleitung() {
  local r st url
  r=$(ziel "$BASIS$2"); st="${r%% *}"; url="${r#* }"
  if [ "$st" = 301 ] && [ "$(pfad "$url")" = "$3" ]; then
    ok "$1"
    case "$url" in http://*) [ "$SCHEMA" = https ] && hinweis "$1 leitet auf http weiter ($url), danach folgt eine zweite Weiterleitung auf https" ;; esac
  else
    fehler "$1: erwartet [301 $3], erhalten [$st $(pfad "$url")]"
  fi
}
# Weiterleitung auf eine vollständige Adresse (https und www)
domain() {
  local r
  r=$(roh -o /dev/null -w '%{http_code} %{redirect_url}' "$1")
  case "$r" in
    "301 $2") ok "$1 leitet auf $2" ;;
    000*) fehler "$1: keine Verbindung oder Zertifikat ungültig ($(roh -S -o /dev/null "$1" 2>&1 | head -1))" ;;
    *) fehler "$1: erwartet [301 $2], erhalten [$r]" ;;
  esac
}

echo "Prüfe $BASIS"
[ -n "$ZUGANG" ] && echo "Testumgebung, Zugang ${ZUGANG%%:*}"
echo

# Erreichbarkeit
R=$(ziel "$BASIS/"); ST="${R%% *}"
case "$ST" in
  200) ok "Startseite erreichbar" ;;
  000) fehler "Keine Verbindung zu $BASIS oder Zertifikat ungültig: $(c -S -o /dev/null "$BASIS/" 2>&1 | head -1)"; ende ;;
  401)
    if [ -n "$ZUGANG" ]; then fehler "Zugangsdaten abgelehnt (401): Benutzer und Passwort prüfen"
    else fehler "Startseite verlangt ein Passwort (401). Testpaket statt 01-website hochgeladen? Für die Testumgebung --zugang angeben."; fi
    ende ;;
  301|302|307|308) fehler "Startseite leitet weiter auf ${R#* }. Die Prüfung mit dieser Adresse starten."; ende ;;
  *) fehler "Startseite antwortet mit $ST statt 200"; ende ;;
esac

# Seiten aus der Sitemap und eine Projektseite
SEITEN=$(c "$BASIS/sitemap.xml" | grep -o '<loc>[^<]*</loc>' | sed -E 's#</?loc>##g; s#^https?://[^/]+##')
[ -n "$SEITEN" ] || fehler "sitemap.xml enthält keine Seiten"
for s in $SEITEN; do pruef "Seite $s" 200 "$(code "$BASIS$s")"; done
PROJEKT=$(c "$BASIS/referenzen" | grep -o 'href="/referenzen/[^"#?]*"' | head -1 | cut -d'"' -f2)
if [ -n "$PROJEKT" ]; then pruef "Projektseite $PROJEKT" 200 "$(code "$BASIS$PROJEKT")"; else fehler "Keine Projektseite unter /referenzen gefunden"; fi

# Saubere Adressen
umleitung "Schrägstrich am Ende: /ueber-uns/" /ueber-uns/ /ueber-uns
umleitung ".html in der Adresse: /ueber-uns.html" /ueber-uns.html /ueber-uns
umleitung ".html in Unterseite: /unsere-leistungen/privat.html" /unsere-leistungen/privat.html /unsere-leistungen/privat
umleitung ".html mit Parameter: /kontakt.html?quelle=test" "/kontakt.html?quelle=test" "/kontakt?quelle=test"
umleitung "/index.html auf die Startseite" /index.html /

# Fehlerseite
pruef "Unbekannte Adresse liefert 404" 404 "$(code "$BASIS/gibt-es-nicht")"
soll "Eigene Fehlerseite" ja "$(c "$BASIS/gibt-es-nicht" | hat 'Seite nicht gefunden')" "Die Fehlerseite 404.html wird nicht ausgeliefert (ErrorDocument bzw. error_page)"
pruef "/efre-foerderhinweis entfällt (404)" 404 "$(code "$BASIS/efre-foerderhinweis")"

# robots.txt und Sitemap
pruef "robots.txt" 200 "$(code "$BASIS/robots.txt")"
pruef "sitemap.xml" 200 "$(code "$BASIS/sitemap.xml")"
soll "Sitemap mit https://www.ip3-energie.de" ja "$(c "$BASIS/sitemap.xml" | hat '<loc>https://www.ip3-energie.de/')" "sitemap.xml enthält keine Adressen unter https://www.ip3-energie.de"

# Caching und Dateitypen
pruef "HTML ohne Cache" "public, max-age=0, must-revalidate" "$(kopf "$BASIS/kontakt" | wert cache-control)"
START=$(c "$BASIS/")
JS=$(echo "$START" | grep -o '/_astro/[^"]*\.js"' | head -1 | tr -d '"')
BILD=$(echo "$START" | grep -o '/_astro/[^" ,]*\.webp' | head -1)
SCHRIFT=$(echo "$START" | grep -o '/fonts/[^"]*\.woff2' | head -1)
if [ -n "$JS" ]; then pruef "JavaScript dauerhaft gecacht" "public, max-age=31536000, immutable" "$(kopf "$BASIS$JS" | wert cache-control)"; else fehler "Kein JavaScript in der Startseite gefunden"; fi
if [ -n "$BILD" ]; then pruef "Bilder 30 Tage gecacht" "public, max-age=2592000" "$(kopf "$BASIS$BILD" | wert cache-control)"; else fehler "Kein WebP-Bild in der Startseite gefunden"; fi
if [ -n "$SCHRIFT" ]; then pruef "Schriften als font/woff2" "font/woff2" "$(kopf "$BASIS$SCHRIFT" | wert content-type)"; else fehler "Keine Schrift in der Startseite gefunden"; fi

# Sicherheits-Header und Komprimierung
H=$(kopf "$BASIS/")
pruef "X-Content-Type-Options" nosniff "$(echo "$H" | wert x-content-type-options)"
pruef "Referrer-Policy" strict-origin-when-cross-origin "$(echo "$H" | wert referrer-policy)"
pruef "X-Frame-Options" SAMEORIGIN "$(echo "$H" | wert x-frame-options)"
if [ "$(kopf -H 'Accept-Encoding: gzip' "$BASIS/" | wert content-encoding)" = gzip ]; then
  ok "HTML wird komprimiert (gzip)"
else
  hinweis "HTML wird nicht komprimiert: mod_deflate bzw. gzip aktivieren, die Seiten laden dann schneller"
fi

# Gesperrte Inhalte
V=$(code "$BASIS/_astro")
case "$V" in 403|404) ok "Keine Verzeichnisliste (/_astro: $V)" ;; *) fehler "/_astro antwortet mit $V, erwartet 403 oder 404 (keine Verzeichnisliste)" ;; esac
V=$(code "$BASIS/.htaccess")
case "$V" in 403|404) ok ".htaccess nicht abrufbar ($V)" ;; *) fehler ".htaccess ist abrufbar ($V)" ;; esac

# Kontaktformular
pruef "Formular-Skript antwortet (GET: 405)" 405 "$(code -H 'Accept: application/json' "$BASIS/kontakt-senden.php")"
soll "PHP wird ausgeführt, kein Quelltext sichtbar" nein "$(c "$BASIS/kontakt-senden.php" | hat '<?php')" "kontakt-senden.php wird als Quelltext ausgeliefert: PHP ist für das Verzeichnis nicht aktiv"
R=$(ziel "$BASIS/kontakt-senden.php")
pruef "Formular ohne JavaScript leitet zurück" "303 /kontakt#anfrage-fehler" "${R%% *} $(pfad "${R#* }")"
pruef "Unvollständige Anfrage abgelehnt (422, nichts versendet)" 422 "$(code -H 'Accept: application/json' --data-urlencode 'name=' --data-urlencode 'email=ungueltig' "$BASIS/kontakt-senden.php")"
if [ -n "$FORMULAR" ]; then
  TS=$(( $(date +%s) * 1000 - 10000 ))
  R=$(c -H 'Accept: application/json' \
    --data-urlencode "name=Prüfung Livegang" --data-urlencode "email=$ANTWORT" --data-urlencode "interesse=Sonstiges" \
    --data-urlencode "nachricht=Testanfrage von pruefen-livegang.sh, bitte ignorieren." \
    --data-urlencode "datenschutz=ja" --data-urlencode "ts=$TS" --data-urlencode "website=" "$BASIS/kontakt-senden.php")
  if [ "$R" = '{"ok":true}' ]; then
    ok "Testanfrage versendet. Im Postfach info@ip3-energie.de muss ankommen: „${PRAEFIX}Projektanfrage über ip3-energie.de: Sonstiges“"
  else
    fehler "Testanfrage nicht versendet, Antwort: $R (\"send\" heißt: mail() auf dem Server funktioniert nicht)"
  fi
fi

# Produktivdomain: https und www, für Suchmaschinen offen, alte Installation entfernt
if [ -n "$PRODUKTIV" ]; then
  domain "http://www.ip3-energie.de/kontakt" "https://www.ip3-energie.de/kontakt"
  domain "http://ip3-energie.de/kontakt" "https://www.ip3-energie.de/kontakt"
  domain "https://ip3-energie.de/kontakt" "https://www.ip3-energie.de/kontakt"
  soll "robots.txt erlaubt Suchmaschinen" nein "$(c "$BASIS/robots.txt" | tr -d '\r' | hat -x 'Disallow: /')" "robots.txt sperrt alle Suchmaschinen (Disallow: /): robots.txt aus 01-website verwenden"
  soll "Kein noindex im Header" "" "$(echo "$H" | wert x-robots-tag)" "Header X-Robots-Tag ist gesetzt ($(echo "$H" | wert x-robots-tag)): Suchmaschinen nehmen die Seiten dann nicht auf"
  for t in /index.php /typo3/index.php; do
    V=$(code "$BASIS$t")
    if [ "$V" = 404 ]; then ok "$t nicht vorhanden (404)"; else hinweis "$t antwortet mit $V: alte TYPO3-Dateien im Webverzeichnis? Nach der Sicherung entfernen."; fi
  done
fi

# Testumgebung: Passwortschutz und für Suchmaschinen gesperrt
if [ -n "$ZUGANG" ]; then
  pruef "Ohne Passwort gesperrt (401)" 401 "$(roh -o /dev/null -w '%{http_code}' "$BASIS/")"
  soll "Browser fragt nach dem Passwort" ja "$(roh -D - -o /dev/null "$BASIS/" | tr -d '\r' | hat -i '^www-authenticate: *basic')" "Ohne Passwort fehlt die Abfrage (Header WWW-Authenticate: Basic)"
  pruef "Falsches Passwort abgelehnt (401)" 401 "$(roh -u "${ZUGANG%%:*}:falsch" -o /dev/null -w '%{http_code}' "$BASIS/")"
  soll "robots.txt sperrt Suchmaschinen" ja "$(c "$BASIS/robots.txt" | tr -d '\r' | hat -x 'Disallow: /')" "robots.txt der Testumgebung sperrt Suchmaschinen nicht (Disallow: / fehlt)"
  if [ "$(echo "$H" | wert x-robots-tag)" = "noindex, nofollow" ]; then
    ok "X-Robots-Tag noindex"
  else
    hinweis "Kein X-Robots-Tag noindex (unter nginx normal, dort schützen Passwort und robots.txt)"
  fi
fi

ende
