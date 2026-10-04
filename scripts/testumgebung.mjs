// Testpaket für eine geschützte Testadresse auf dem eigenen Webserver (Apache mit PHP),
// zum Beispiel test.ip3-energie.de. Kopiert den Build, sperrt ihn mit Benutzername und
// Passwort und hält ihn aus Suchmaschinen heraus. Das Formular verschickt dort echte
// E-Mails, der Betreff beginnt dann mit [Test] (siehe kontakt-senden.php).
// Voraussetzung: npm run build. Aufruf: node scripts/testumgebung.mjs [zielordner]
// Zugang über TEST_BENUTZER und TEST_PASSWORT, ohne Angabe wird ein Passwort erzeugt.
import fs from 'node:fs';
import path from 'node:path';
import { randomInt } from 'node:crypto';

const dist = 'dist';
const ziel = path.resolve(process.argv[2] || 'testumgebung');
const kennung = '# Testumgebung der Website ip3-energie.de';

const zeichen = 'abcdefghjkmnpqrstuvwxyz23456789';
const block = () => Array.from({ length: 4 }, () => zeichen[randomInt(zeichen.length)]).join('');
const benutzer = process.env.TEST_BENUTZER || 'ip3';
const passwort = process.env.TEST_PASSWORT || `${block()}-${block()}-${block()}`;
if (benutzer.includes(':') || !/^[\x21-\x7e]+$/.test(benutzer + passwort)) {
  console.error('Benutzername und Passwort nur aus ASCII-Zeichen ohne Leerzeichen, Benutzername ohne Doppelpunkt.');
  process.exit(1);
}
const token = Buffer.from(`${benutzer}:${passwort}`).toString('base64');

// Nur einen leeren Ordner oder ein früheres Testpaket überschreiben
if (fs.existsSync(ziel) && fs.readdirSync(ziel).length) {
  const alt = path.join(ziel, '.htaccess');
  if (!fs.existsSync(alt) || !fs.readFileSync(alt, 'utf8').startsWith(kennung)) {
    console.error(`${ziel} ist nicht leer und kein früheres Testpaket. Bitte einen anderen Zielordner angeben.`);
    process.exit(1);
  }
  fs.rmSync(ziel, { recursive: true });
}
fs.cpSync(dist, ziel, { recursive: true });

const htaccess = fs.readFileSync(path.join(dist, '.htaccess'), 'utf8');
fs.writeFileSync(
  path.join(ziel, '.htaccess'),
  [
    kennung,
    '# Zugang nur mit Benutzername und Passwort. Bewusst ohne IfModule: Fehlt ein Modul,',
    '# antwortet der Server mit Fehler 500, die Seite bleibt also gesperrt statt offen.',
    'RewriteEngine On',
    `RewriteCond %{HTTP:Authorization} "!=Basic ${token}"`,
    'RewriteRule ^ - [R=401,L]',
    'Header always set WWW-Authenticate "Basic realm=\\"ip3 Testumgebung\\", charset=\\"UTF-8\\"" "expr=%{REQUEST_STATUS} == 401"',
    'ErrorDocument 401 "Testumgebung: Zugang nur mit Benutzername und Passwort."',
    '',
    '# Nicht in Suchmaschinen aufnehmen',
    'Header always set X-Robots-Tag "noindex, nofollow"',
    '',
    htaccess,
  ].join('\n')
);
fs.writeFileSync(path.join(ziel, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

console.log(`Testpaket: ${path.relative(process.cwd(), ziel) || ziel}/`);
console.log(`Zugang:    Benutzer ${benutzer}, Passwort ${passwort}`);
console.log('Den Inhalt des Ordners einschließlich .htaccess direkt in das Verzeichnis der Testadresse hochladen.');
console.log('Beim ersten Aufruf muss die Passwortabfrage erscheinen, sonst wertet der Server die .htaccess nicht aus.');
