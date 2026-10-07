// Paket für die produktive Domain www.ip3-energie.de (Apache mit PHP). Kopiert den Build und
// schaltet in der .htaccess die Weiterleitungen http -> https und ohne www -> www ein, die im
// Build für Vorschau und Testadressen auskommentiert sind. Für jede Aktualisierung der Website
// dieses Paket hochladen, nicht dist/ direkt, sonst sind die Weiterleitungen wieder aus.
// Voraussetzung: npm run build. Aufruf: node scripts/livegang.mjs [zielordner]
import fs from 'node:fs';
import path from 'node:path';

const dist = 'dist';
const ziel = path.resolve(process.argv[2] || 'livegang');
const kennung = '# Livegang-Paket der Website ip3-energie.de';

const regeln = [
  'RewriteCond %{HTTPS} !=on',
  'RewriteCond %{HTTP:X-Forwarded-Proto} !=https',
  'RewriteRule ^ https://www.ip3-energie.de%{REQUEST_URI} [R=301,L]',
  'RewriteCond %{HTTP_HOST} ^ip3-energie\\.de$ [NC]',
  'RewriteRule ^ https://www.ip3-energie.de%{REQUEST_URI} [R=301,L]',
];
const hinweisBuild = '# Erst auf der produktiven Domain aktivieren: http -> https und ohne www -> www';
const hinweisPaket = '# Produktive Domain: http -> https und ohne www -> www';

// Auskommentierte Regeln aktivieren; nur wenn genau die erwarteten fünf Zeilen da sind
const htaccess = fs.readFileSync(path.join(dist, '.htaccess'), 'utf8');
let aktiviert = 0;
let hinweis = 0;
const zeilen = htaccess.split('\n').map((zeile) => {
  const m = zeile.match(/^(\s*)# (.+)$/);
  if (m && regeln.includes(m[2])) {
    aktiviert++;
    return m[1] + m[2];
  }
  if (zeile.trim() === hinweisBuild) {
    hinweis++;
    return zeile.replace(hinweisBuild, hinweisPaket);
  }
  return zeile;
});
if (aktiviert !== regeln.length || hinweis !== 1) {
  console.error(`${dist}/.htaccess enthält die Weiterleitungsregeln nicht wie erwartet (${aktiviert} von ${regeln.length} Zeilen). Kein Paket erstellt.`);
  process.exit(1);
}

// Nur einen leeren Ordner oder ein früheres Livegang-Paket überschreiben
if (fs.existsSync(ziel) && fs.readdirSync(ziel).length) {
  const alt = path.join(ziel, '.htaccess');
  if (!fs.existsSync(alt) || !fs.readFileSync(alt, 'utf8').startsWith(kennung)) {
    console.error(`${ziel} ist nicht leer und kein früheres Livegang-Paket. Bitte einen anderen Zielordner angeben.`);
    process.exit(1);
  }
  fs.rmSync(ziel, { recursive: true });
}
fs.cpSync(dist, ziel, { recursive: true });
fs.writeFileSync(path.join(ziel, '.htaccess'), [kennung, '', ...zeilen].join('\n'));

console.log(`Livegang-Paket: ${path.relative(process.cwd(), ziel) || ziel}/`);
console.log('Weiterleitungen auf https://www.ip3-energie.de sind in der .htaccess aktiv.');
console.log('Voraussetzung: gültiges Zertifikat für www.ip3-energie.de und ip3-energie.de.');
console.log('Den Inhalt des Ordners einschließlich .htaccess in das Webverzeichnis von www.ip3-energie.de hochladen.');
