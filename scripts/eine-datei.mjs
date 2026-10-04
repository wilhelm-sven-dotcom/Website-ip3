// Die gesamte Website als eine einzige HTML-Datei: alle Seiten der Offline-Fassung in einem
// Rahmen, Navigation und Zurück-Taste innerhalb der Datei. Läuft ohne Server, auch dort, wo
// sich nur eine einzelne Datei öffnen lässt. Gleiche Schriften, Bilder und Skripte stehen nur
// einmal in der Datei und werden beim Seitenwechsel wieder eingesetzt.
// Voraussetzung: node scripts/einzeldateien.mjs. Aufruf: node scripts/eine-datei.mjs [quellordner] [zieldatei]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const quelle = process.argv[2] || 'vorschau-offline';
const ziel = path.resolve(process.argv[3] || path.join(quelle, 'ip3-website.html'));
const dateien = fs
  .readdirSync(quelle)
  .filter((f) => f.endsWith('.html') && path.resolve(quelle, f) !== ziel)
  .sort();

// Gleiche Inhalte nur einmal ablegen, in den Seiten steht ein Platzhalter
const daten = [];
const nummer = new Map();
const ablegen = (inhalt) => {
  const h = createHash('sha256').update(inhalt).digest('hex');
  if (!nummer.has(h)) {
    nummer.set(h, daten.length);
    daten.push(inhalt);
  }
  return `@@ip3:${nummer.get(h)}@@`;
};

// Läuft in jeder Seite: Links auf andere Seiten meldet sie dem Rahmen. Anker innerhalb der
// Seite springt sie selbst an, weil srcdoc-Dokumente #… sonst gegen die Rahmendatei auflösen.
const kind = `<script>(function(){
var seiten=${JSON.stringify(dateien)};
function springen(id){
  if(!id){window.scrollTo(0,0);return}
  try{id=decodeURIComponent(id)}catch(_){}
  var el=document.getElementById(id);
  if(!el)return;
  el.scrollIntoView();
  el.focus({preventScroll:true});
}
document.addEventListener('click',function(e){
  var a=e.target.closest?e.target.closest('a[href]'):null;
  if(!a)return;
  var href=a.getAttribute('href')||'';
  if(href.charAt(0)==='#'){e.preventDefault();if(href.length>1)springen(href.slice(1));return}
  var teile=href.split('#');
  if(seiten.indexOf(teile[0])===-1)return;
  e.preventDefault();
  parent.postMessage({ip3:'seite',datei:teile[0],anker:teile[1]||''},'*');
},true);
window.addEventListener('message',function(e){
  if(e.source===parent&&e.data&&e.data.ip3==='anker')springen(e.data.anker);
});
window.addEventListener('load',function(){parent.postMessage({ip3:'geladen',titel:document.title},'*')});
})();<\/script>`.replace(/\n\s*/g, '');

const seiten = {};
let icons = '';
for (const datei of dateien) {
  let html = fs.readFileSync(path.join(quelle, datei), 'utf8');
  if (datei === 'index.html') icons = (html.match(/<link rel="icon"[^>]*>/g) || []).join('');
  // große Skripte zuerst (sie können selbst Data-URLs enthalten), danach eingebettete Dateien
  html = html.replace(/(<script>)([\s\S]*?)(<\/script>)/g, (m, a, code, b) => (code.length > 2000 ? a + ablegen(code) + b : m));
  html = html.replace(/data:[a-z0-9.+/-]+;base64,[a-z0-9+/=]+/gi, (m) => (m.length > 1000 ? ablegen(m) : m));
  const ende = html.lastIndexOf('</body>');
  seiten[datei] = html.slice(0, ende) + kind + html.slice(ende);
}
if (!seiten['index.html']) throw new Error(`Keine index.html in ${quelle}`);

// Als JSON in ein Skript: jedes < maskieren, damit kein </script> oder <!-- den Block beendet
const json = (wert) => JSON.stringify(wert).replace(/</g, '\\u003c');

const rahmen = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>ip³ Energietechnik GmbH</title>
${icons}
<style>html,body{margin:0;height:100%;background:#0c1a3d}iframe{position:fixed;inset:0;width:100%;height:100%;border:0;display:block}</style>
</head>
<body>
<script>
const DATEN = ${json(daten)};
const SEITEN = ${json(seiten)};
let rahmen = null;
let aktuell = '';
let anker = '';

function lesen() {
  let h = location.hash.slice(1);
  try {
    h = decodeURIComponent(h);
  } catch {}
  const [seite = '', a = ''] = h.split('/');
  const datei = (seite || 'index') + '.html';
  return SEITEN[datei] ? { datei, anker: a } : { datei: 'index.html', anker: '' };
}

function springen() {
  if (anker && rahmen) rahmen.contentWindow.postMessage({ ip3: 'anker', anker }, '*');
}

// Für jede Seite ein neuer Rahmen: frischer Seitenaufbau, kein Eintrag im Verlauf des Rahmens
function zeigen(neu) {
  const z = lesen();
  anker = z.anker;
  if (z.datei === aktuell && !neu) return springen();
  aktuell = z.datei;
  const f = document.createElement('iframe');
  f.title = 'Website ip³ Energietechnik GmbH';
  f.srcdoc = SEITEN[z.datei].replace(/@@ip3:(\\d+)@@/g, (_, i) => DATEN[+i]);
  f.addEventListener('load', () => {
    springen();
    f.contentWindow.focus();
  });
  if (rahmen) rahmen.replaceWith(f);
  else document.body.append(f);
  rahmen = f;
}

window.addEventListener('message', (e) => {
  if (!rahmen || e.source !== rahmen.contentWindow || !e.data) return;
  if (e.data.ip3 === 'geladen') document.title = e.data.titel;
  if (e.data.ip3 === 'seite') {
    const hash = '#' + e.data.datei.replace(/\\.html$/, '') + (e.data.anker ? '/' + e.data.anker : '');
    if (location.hash === hash) zeigen(true);
    else location.hash = hash;
  }
});
window.addEventListener('hashchange', () => zeigen(false));
zeigen(true);
</script>
</body>
</html>
`;

fs.writeFileSync(ziel, rahmen);
const kb = (n) => Math.round(n / 1024).toLocaleString('de-DE');
const einzeln = dateien.reduce((s, d) => s + fs.statSync(path.join(quelle, d)).size, 0);
console.log(`${path.relative(process.cwd(), ziel)}  ${kb(Buffer.byteLength(rahmen))} KB (${dateien.length} Seiten, einzeln zusammen ${kb(einzeln)} KB)`);
