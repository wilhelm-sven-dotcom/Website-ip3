// Die gesamte Website als eine einzige HTML-Datei, in zwei Fassungen:
//   ip3-website.html           bildschirmfüllend, zum Öffnen und Weitergeben
//   ip3-handy-simulation.html  im Handy- oder Tablet-Rahmen in echter Darstellungsgröße,
//                              zum Prüfen der mobilen Fassung am Rechner
// Alle Seiten der Offline-Fassung liegen in der Datei, Navigation und Zurück-Taste funktionieren
// darin. Jede Seite wird in einem frischen Rahmen aufgebaut. Gleiche Schriften, Bilder und
// Skripte stehen nur einmal in der Datei und werden beim Seitenwechsel wieder eingesetzt.
// Voraussetzung: node scripts/einzeldateien.mjs und der Build in dist/ (Logo, Schriften).
// Aufruf: node scripts/eine-datei.mjs [quellordner] [zielordner]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const dist = 'dist';
const quelle = process.argv[2] || 'vorschau-offline';
const zielordner = process.argv[3] || quelle;
fs.mkdirSync(zielordner, { recursive: true });
const ziele = {
  voll: path.resolve(zielordner, 'ip3-website.html'),
  handy: path.resolve(zielordner, 'ip3-handy-simulation.html'),
};
const dateien = fs
  .readdirSync(quelle)
  .filter((f) => f.endsWith('.html') && !Object.values(ziele).includes(path.resolve(quelle, f)))
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
  return nummer.get(h);
};
const platzhalter = (inhalt) => `@@ip3:${ablegen(inhalt)}@@`;

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
  html = html.replace(/(<script>)([\s\S]*?)(<\/script>)/g, (m, a, code, b) => (code.length > 2000 ? a + platzhalter(code) + b : m));
  html = html.replace(/data:[a-z0-9.+/-]+;base64,[a-z0-9+/=]+/gi, (m) => (m.length > 1000 ? platzhalter(m) : m));
  const ende = html.lastIndexOf('</body>');
  seiten[datei] = html.slice(0, ende) + kind + html.slice(ende);
}
if (!seiten['index.html']) throw new Error(`Keine index.html in ${quelle}`);

// Logo, Zeichen 3 und Schriften für die Bedienleiste der Simulation, meist schon in den Daten
const mime = { '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
const eintrag = (p) => ablegen(`data:${mime[path.extname(p)]};base64,${fs.readFileSync(path.join(dist, p)).toString('base64')}`);
const marke = eintrag('brand/ip3-energietechnik-weiss.svg');
const zeichen = eintrag('brand/zeichen-3-kontur-akzent.png');
const schriften = [
  ['Libre Franklin', 400, 'fonts/LibreFranklin-Regular.woff2'],
  ['Libre Franklin', 600, 'fonts/LibreFranklin-SemiBold.woff2'],
  ['Space Grotesk', 500, 'fonts/SpaceGrotesk-Medium.woff2'],
].map(([familie, gewicht, p]) => ({ familie, gewicht, i: eintrag(p) }));

// Touch-Nachbildung für die Simulation: Medienabfragen wie auf einem Touchgerät, keine
// Hover-Zustände, runder Fingerzeiger, Wischen mit gedrückter Maustaste samt Nachlauf,
// in waagerecht scrollbaren Streifen (Bildstrecke) auch seitwärts
const touchErsatz = [
  ['\\(\\s*(?:any-)?hover\\s*:\\s*hover\\s*\\)', '(min-width:99999px)'],
  ['\\(\\s*(?:any-)?hover\\s*\\)', '(min-width:99999px)'],
  ['\\(\\s*(?:any-)?pointer\\s*:\\s*fine\\s*\\)', '(min-width:99999px)'],
  ['\\(\\s*(?:any-)?hover\\s*:\\s*none\\s*\\)', '(min-width:0px)'],
  ['\\(\\s*(?:any-)?pointer\\s*:\\s*coarse\\s*\\)', '(min-width:0px)'],
];
const finger = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Ccircle cx='14' cy='14' r='11' fill='rgba(255,255,255,0.42)' stroke='rgba(12,26,61,0.6)' stroke-width='1.5'/%3E%3C/svg%3E`;
const touch = {
  ersatz: touchErsatz,
  stil: `<style>*{scrollbar-width:none}*::-webkit-scrollbar{display:none}html,html *{cursor:url("${finger}") 14 14,auto!important}</style>`,
  skript: `<script>(function(){
var e=${JSON.stringify(touchErsatz)},m=window.matchMedia.bind(window);
window.matchMedia=function(q){q=String(q);for(var i=0;i<e.length;i++)q=q.replace(new RegExp(e[i][0],'g'),e[i][1]);return m(q)};
var start=null,sx=0,letzt=0,zeit=0,v=0,zieht=false,achse='y',quer=null,sperre=false,raf=0;
function querScroller(el){for(;el&&el!==document.documentElement;el=el.parentElement){var o=getComputedStyle(el).overflowX;if((o==='auto'||o==='scroll')&&el.scrollWidth>el.clientWidth+1)return el}return null}
function rollen(d){if(achse==='x')quer.scrollBy({left:d,behavior:'instant'});else scrollBy({top:d,behavior:'instant'})}
function einrasten(){if(quer)quer.style.scrollSnapType=''}
addEventListener('pointerdown',function(ev){
  sperre=false;
  if(ev.pointerType!=='mouse'||ev.button!==0)return;
  if(ev.target.closest&&ev.target.closest('input,textarea,select,[contenteditable]'))return;
  cancelAnimationFrame(raf);einrasten();start=letzt=ev.clientY;sx=ev.clientX;zeit=ev.timeStamp;v=0;zieht=false;achse='y';quer=querScroller(ev.target);
},true);
addEventListener('pointermove',function(ev){
  if(start===null||!(ev.buttons&1))return;
  if(!zieht){
    var ax=Math.abs(ev.clientX-sx),ay=Math.abs(ev.clientY-start);
    if(Math.max(ax,ay)<=6)return;
    zieht=true;achse=quer&&ax>ay?'x':'y';letzt=achse==='x'?ev.clientX:ev.clientY;
    if(achse==='x')quer.style.scrollSnapType='none';
    document.documentElement.style.userSelect='none';
    try{getSelection().removeAllRanges();document.documentElement.setPointerCapture(ev.pointerId)}catch(_){}
  }
  var pos=achse==='x'?ev.clientX:ev.clientY,d=pos-letzt,dt=Math.max(8,ev.timeStamp-zeit);
  rollen(-d);v=.7*(-d/dt)+.3*v;letzt=pos;zeit=ev.timeStamp;ev.preventDefault();
},true);
addEventListener('pointerup',function(){
  if(start===null)return;start=null;
  if(!zieht)return;
  sperre=true;document.documentElement.style.userSelect='';
  (function lauf(){v*=.95;if(Math.abs(v)>.02){rollen(v*16);raf=requestAnimationFrame(lauf)}else einrasten()})();
},true);
addEventListener('click',function(ev){if(sperre){sperre=false;ev.preventDefault();ev.stopPropagation()}},true);
addEventListener('dragstart',function(ev){ev.preventDefault()},true);
addEventListener('pointercancel',function(){start=null;zieht=false;einrasten();document.documentElement.style.userSelect=''},true);
})();<\/script>`.replace(/\n\s*/g, ''),
};

// Als JSON in ein Skript: jedes < maskieren, damit kein </script> oder <!-- den Block beendet
const json = (wert) => JSON.stringify(wert).replace(/</g, '\\u003c');
const datenSkript = `const DATEN = ${json(daten)};\nconst SEITEN = ${json(seiten)};`;

// Seitenwechsel über den Verlauf des Hauptfensters: #seite oder #seite/anker
const router = `
let rahmen = null;
let aktuell = '';
let anker = '';
let position = (history.state && history.state.ip3) || 0;

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
  f.srcdoc = VORBEREITEN(SEITEN[z.datei]).replace(/@@ip3:(\\d+)@@/g, (_, i) => DATEN[+i]);
  f.addEventListener('load', () => {
    springen();
    f.contentWindow.focus();
  });
  if (rahmen) rahmen.replaceWith(f);
  else BEHAELTER.append(f);
  rahmen = f;
}

function gehe(hash) {
  if (location.hash === hash) return zeigen(true);
  try {
    history.pushState({ ip3: position + 1 }, '', hash);
    position += 1;
  } catch {
    location.hash = hash;
    return;
  }
  zeigen(false);
}

window.addEventListener('message', (e) => {
  if (!rahmen || e.source !== rahmen.contentWindow || !e.data) return;
  if (e.data.ip3 === 'geladen') TITEL(e.data.titel);
  if (e.data.ip3 === 'seite') gehe('#' + e.data.datei.replace(/\\.html$/, '') + (e.data.anker ? '/' + e.data.anker : ''));
});
window.addEventListener('popstate', (e) => {
  position = (e.state && e.state.ip3) || 0;
  zeigen(false);
});
window.addEventListener('hashchange', () => zeigen(false));
`;

// Hinweis, solange kein Skript läuft (Dateivorschau am iPhone, manche Apps); bei einem
// Startfehler steht dort die Fehlermeldung
const meldungStil = `.meldung{position:fixed;inset:0;z-index:5;display:grid;place-items:center;padding:24px;color:#fff;font:15px/1.5 'Libre Franklin',Arial,Helvetica,sans-serif}.meldung>div{max-width:540px;padding:28px 30px;border:1px solid rgb(232 231 239 / .34);border-radius:18px;background:#0c1a3d}.meldung strong{display:block;margin:0 0 12px;font-size:24px;line-height:1.2;font-weight:800;letter-spacing:-.01em}.meldung p{margin:0 0 10px;color:rgb(232 231 239 / .78)}.meldung p:last-child{margin-bottom:0}.bereit .meldung{display:none}`;
const meldungHtml = (...absaetze) => `<div class="meldung" data-meldung><div><strong>Diese Vorschau führt keine Skripte aus.</strong>${absaetze.map((a) => `<p>${a}</p>`).join('')}</div></div>`;
const meldungSkript = `const meldung = (titel, ...absaetze) => {
  const k = document.querySelector('[data-meldung] div');
  k.textContent = '';
  const s = document.createElement('strong');
  s.textContent = titel;
  k.append(s);
  for (const a of absaetze) {
    const p = document.createElement('p');
    p.textContent = a;
    k.append(p);
  }
  document.documentElement.classList.remove('bereit');
};
const startfehler = (e) => meldung('Die Vorschau konnte nicht starten.', String(e.message || e.error || 'Unbekannter Fehler'), 'Browser: ' + navigator.userAgent);
window.addEventListener('error', startfehler);
const gestartet = () => {
  document.documentElement.classList.add('bereit');
  window.removeEventListener('error', startfehler);
};`;

const voll = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>ip³ Energietechnik GmbH</title>
${icons}
<style>html,body{margin:0;height:100%;background:#0c1a3d}iframe{position:fixed;inset:0;width:100%;height:100%;border:0;display:block}${meldungStil}</style>
</head>
<body>
${meldungHtml('Die Website-Datei braucht JavaScript. Diese Vorschau führt keins aus, das ist zum Beispiel in der Dateivorschau am iPhone so.', 'Am Rechner: Datei herunterladen und per Doppelklick in Chrome, Edge, Firefox oder Safari öffnen.')}
<script>
${meldungSkript}
${datenSkript}
const BEHAELTER = document.body;
const VORBEREITEN = (html) => html;
const TITEL = (titel) => (document.title = titel);
${router}
zeigen(true);
gestartet();
</script>
</body>
</html>
`;

const handy = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Handy-Simulation | ip³ Energietechnik GmbH</title>
${icons}
<style>
:root{--navy:#0c1a3d;--hell:#e8e7ef;--weiss:#fff;--akzent:#c83c30;--linie:rgb(232 231 239 / .34);--strich:rgb(232 231 239 / .6);--sek:rgb(232 231 239 / .72);--tech:'Space Grotesk','Libre Franklin',Arial,sans-serif}
*{box-sizing:border-box}
html,body{margin:0;height:100%;min-height:520px}
body{display:flex;flex-direction:column;overflow:hidden;background:var(--navy);color:var(--weiss);font:400 15px/1.45 'Libre Franklin',Archivo,Arial,Helvetica,sans-serif}
img:not([src]){visibility:hidden}
.zeichen{position:fixed;right:-26vmin;bottom:-24vmin;width:82vmin;opacity:.16;pointer-events:none;user-select:none}
.leiste{position:relative;z-index:1;display:flex;flex-wrap:wrap;align-items:center;gap:12px 22px;padding:16px 28px;border-bottom:1px solid var(--linie)}
.marke{display:flex;align-items:center;gap:20px;margin-right:auto}
.marke img{display:block;width:168px;height:auto}
.titel{display:inline-flex;align-items:center;gap:10px;font:500 12px/1 var(--tech);letter-spacing:.16em;text-transform:uppercase}
.titel::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--akzent)}
.gruppe{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
button{display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:7px 13px;border:1px solid var(--linie);border-radius:999px;background:transparent;color:var(--weiss);font:inherit;font-size:13.5px;cursor:pointer;transition:background-color .2s,border-color .2s,color .2s}
button:hover{border-color:var(--hell)}
button[aria-pressed=true]{background:var(--hell);border-color:var(--hell);color:var(--navy)}
button:focus-visible{outline:2px solid var(--weiss);outline-offset:3px}
.zahl{font-family:var(--tech);font-variant-numeric:tabular-nums}
.buehne{position:relative;flex:1;min-height:0;display:grid;place-items:center}
.huelle{position:relative}
.geraet{position:absolute;left:0;top:0;padding:0 64px 64px;transform-origin:0 0}
.rahmen{position:relative;padding:var(--rand);border:1.5px solid var(--strich);border-radius:var(--radius);background:var(--navy)}
.bildschirm{position:relative;width:var(--b);height:var(--h);overflow:hidden;border-radius:calc(var(--radius) - var(--rand));background:var(--navy);box-shadow:0 0 0 1px rgb(232 231 239 / .2)}
.bildschirm iframe{display:block;width:100%;height:100%;border:0}
.kamera{position:absolute;left:50%;top:calc(var(--rand) / 2 + .75px);width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border:1px solid var(--strich);border-radius:50%}
.geraet[data-quer=true] .kamera{left:calc(var(--rand) / 2 + .75px);top:50%}
.taste{position:absolute;width:4px;border:1.5px solid var(--strich)}
.taste--a{left:-5.5px;top:140px;height:30px;border-right:0;border-radius:3px 0 0 3px}
.taste--b{left:-5.5px;top:186px;height:56px;border-right:0;border-radius:3px 0 0 3px}
.taste--c{right:-5.5px;top:176px;height:84px;border-left:0;border-radius:0 3px 3px 0}
.geraet[data-typ=tablet] .taste,.geraet[data-quer=true] .taste{display:none}
.mass{position:absolute;background:var(--strich);color:var(--sek);font:500 12px/1 var(--tech);letter-spacing:.06em}
.mass::before,.mass::after{content:'';position:absolute;background:var(--strich)}
.mass span{position:absolute;left:50%;top:50%;padding:0 10px;background:var(--navy);white-space:nowrap}
.mass--b{left:calc(64px + var(--rand) + 1.5px);bottom:22px;width:var(--b);height:1px}
.mass--b::before,.mass--b::after{top:-6px;width:1px;height:13px}
.mass--b::before{left:0}
.mass--b::after{right:0}
.mass--b span{transform:translate(-50%,-50%)}
.mass--h{top:calc(var(--rand) + 1.5px);right:22px;width:1px;height:var(--h)}
.mass--h::before,.mass--h::after{left:-6px;width:13px;height:1px}
.mass--h::before{top:0}
.mass--h::after{bottom:0}
.mass--h span{transform:translate(-50%,-50%) rotate(-90deg)}
.hinweis{position:absolute;left:28px;bottom:16px;margin:0;max-width:min(380px,calc(100% - 56px));color:var(--sek);font-size:13px}
.hinweis strong{color:var(--weiss);font-weight:600}
@media (max-width:900px){.leiste{padding:14px 18px}.hinweis{left:18px}}
${meldungStil}
html:not(.bereit) .huelle,html:not(.bereit) .leiste .gruppe,html:not(.bereit) .hinweis{display:none}
.direkt .leiste,.direkt .hinweis,.direkt .mass,.direkt .zeichen,.direkt .kamera,.direkt .taste{display:none}
.direkt .huelle,.direkt .geraet,.direkt .rahmen,.direkt .bildschirm{position:fixed;inset:0;width:auto;height:auto;padding:0;border:0;border-radius:0;transform:none;box-shadow:none}
</style>
</head>
<body>
<img class="zeichen" data-zeichen alt="">
<header class="leiste">
  <div class="marke">
    <img data-marke alt="ip³ Energietechnik GmbH" width="168" height="25">
    <span class="titel">Handy-Simulation</span>
  </div>
  <div class="gruppe" role="group" aria-label="Gerät">
    <button type="button" data-geraet="kompakt">Kompakt <span class="zahl">360</span></button>
    <button type="button" data-geraet="standard">Standard <span class="zahl">390</span></button>
    <button type="button" data-geraet="gross">Groß <span class="zahl">430</span></button>
    <button type="button" data-geraet="tablet">Tablet <span class="zahl">820</span></button>
  </div>
  <div class="gruppe">
    <button type="button" data-drehen aria-pressed="false">Querformat</button>
  </div>
  <div class="gruppe" role="group" aria-label="Navigation in der Website">
    <button type="button" data-zurueck>Zurück</button>
    <button type="button" data-start>Startseite</button>
    <button type="button" data-neu>Neu laden</button>
  </div>
</header>
<main class="buehne" data-buehne>
  ${meldungHtml('Die Handy-Simulation braucht JavaScript. In der Dateivorschau am iPhone und in manchen Apps läuft es nicht.', 'Am Rechner: Datei herunterladen und per Doppelklick in Chrome, Edge, Firefox oder Safari öffnen.', 'Am Handy: Das Video ip3-handy-rundgang.mp4 zeigt die mobile Fassung in Bewegung.')}
  <div class="huelle" data-huelle>
    <div class="geraet" data-box>
      <div class="rahmen">
        <span class="kamera" aria-hidden="true"></span>
        <span class="taste taste--a" aria-hidden="true"></span>
        <span class="taste taste--b" aria-hidden="true"></span>
        <span class="taste taste--c" aria-hidden="true"></span>
        <div class="bildschirm" data-bildschirm></div>
      </div>
      <div class="mass mass--b" aria-hidden="true"><span data-mass-b></span></div>
      <div class="mass mass--h" aria-hidden="true"><span data-mass-h></span></div>
    </div>
  </div>
  <p class="hinweis"><strong data-seite>Startseite</strong><br><span class="zahl" data-groesse></span>&nbsp;px · Maßstab <span class="zahl" data-massstab></span>&nbsp;%<br>Scrollen mit Mausrad oder Touchpad oder durch Wischen mit gedrückter Maustaste. Darstellung wie auf dem Gerät, Rechenleistung vom Rechner.</p>
</main>
<script>
${meldungSkript}
// Am Handy selbst: Website im Vollbild statt eines Geräts im Gerät
if (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600) document.documentElement.classList.add('direkt');
${datenSkript}
for (const s of ${JSON.stringify(schriften)}) {
  try {
    const f = new FontFace(s.familie, 'url(' + DATEN[s.i] + ')', { weight: String(s.gewicht) });
    document.fonts.add(f);
    f.load().catch(() => {});
  } catch {}
}
document.querySelector('[data-marke]').src = DATEN[${marke}];
document.querySelector('[data-zeichen]').src = DATEN[${zeichen}];

const BEHAELTER = document.querySelector('[data-bildschirm]');
// Die Seite verhält sich wie auf einem Touchgerät: Medienabfragen, kein Hover, Fingerzeiger,
// Wischen. Rollbalken blenden Mobilgeräte über dem Inhalt ein, am Rechner kosten sie sonst Breite.
const TOUCH = ${json(touch)};
const alsTouch = (css) => TOUCH.ersatz.reduce((s, [re, neu]) => s.replace(new RegExp(re, 'g'), neu), css).replace(/:hover\\b/g, ':not(*)');
const VORBEREITEN = (html) => {
  html = html.replace(/<style([^>]*)>([\\s\\S]*?)<\\/style>/g, (m, a, css) => '<style' + a + '>' + alsTouch(css) + '</style>');
  html = html.replace(/<head[^>]*>/, (kopf) => kopf + TOUCH.skript);
  const i = html.indexOf('</head>');
  return i < 0 ? html : html.slice(0, i) + TOUCH.stil + html.slice(i);
};
const TITEL = (titel) => {
  const name = aktuell === 'index.html' ? 'Startseite' : titel.split(' | ')[0];
  document.querySelector('[data-seite]').textContent = name;
  document.title = name + ' · Handy-Simulation | ip³ Energietechnik GmbH';
};
${router}

const GERAETE = {
  kompakt: { b: 360, h: 780, typ: 'handy' },
  standard: { b: 390, h: 844, typ: 'handy' },
  gross: { b: 430, h: 932, typ: 'handy' },
  tablet: { b: 820, h: 1180, typ: 'tablet' },
};
const FORM = { handy: { rand: 12, radius: 54 }, tablet: { rand: 20, radius: 34 } };
const box = document.querySelector('[data-box]');
const huelle = document.querySelector('[data-huelle]');
const buehne = document.querySelector('[data-buehne]');
const zahl = (n) => n.toLocaleString('de-DE');
let wahl = 'standard';
let quer = false;
try {
  const s = JSON.parse(localStorage.getItem('ip3-handy-simulation') || '{}');
  if (GERAETE[s.wahl]) wahl = s.wahl;
  quer = s.quer === true;
} catch {}

function masse() {
  const g = GERAETE[wahl];
  const { rand, radius } = FORM[g.typ];
  const [b, h] = quer ? [g.h, g.b] : [g.b, g.h];
  return { b, h, rand, radius, typ: g.typ, breite: 128 + 2 * rand + 3 + b, hoehe: 2 * rand + 3 + h + 64 };
}

// Gerät in echter Pixelgröße, bei kleinem Fenster als Ganzes verkleinert
function einpassen() {
  if (document.documentElement.classList.contains('direkt')) {
    box.style.transform = huelle.style.width = huelle.style.height = '';
    return;
  }
  const m = masse();
  const s = Math.max(0.2, Math.min(1, (buehne.clientWidth - 32) / m.breite, (buehne.clientHeight - (buehne.clientWidth >= 1100 ? 24 : 80)) / m.hoehe));
  box.style.transform = 'scale(' + s + ')';
  huelle.style.width = m.breite * s + 'px';
  huelle.style.height = m.hoehe * s + 'px';
  document.querySelector('[data-massstab]').textContent = Math.round(s * 100);
}

function anwenden() {
  const m = masse();
  box.style.setProperty('--b', m.b + 'px');
  box.style.setProperty('--h', m.h + 'px');
  box.style.setProperty('--rand', m.rand + 'px');
  box.style.setProperty('--radius', m.radius + 'px');
  box.dataset.typ = m.typ;
  box.dataset.quer = String(quer);
  document.querySelector('[data-mass-b]').textContent = zahl(m.b) + ' px';
  document.querySelector('[data-mass-h]').textContent = zahl(m.h) + ' px';
  document.querySelector('[data-groesse]').textContent = zahl(m.b) + ' × ' + zahl(m.h);
  for (const k of document.querySelectorAll('[data-geraet]')) k.setAttribute('aria-pressed', String(k.dataset.geraet === wahl));
  document.querySelector('[data-drehen]').setAttribute('aria-pressed', String(quer));
  try {
    localStorage.setItem('ip3-handy-simulation', JSON.stringify({ wahl, quer }));
  } catch {}
  einpassen();
}

for (const k of document.querySelectorAll('[data-geraet]')) {
  k.addEventListener('click', () => {
    if (wahl === k.dataset.geraet) return;
    wahl = k.dataset.geraet;
    anwenden();
    zeigen(true); // anderes Gerät: Seite neu aufbauen wie bei einem frischen Aufruf
  });
}
// Drehen ohne Neuaufbau, wie bei einem echten Gerät
document.querySelector('[data-drehen]').addEventListener('click', () => {
  quer = !quer;
  anwenden();
});
document.querySelector('[data-zurueck]').addEventListener('click', () => position > 0 && history.back());
document.querySelector('[data-start]').addEventListener('click', () => (lesen().datei === 'index.html' ? zeigen(true) : gehe('#index')));
document.querySelector('[data-neu]').addEventListener('click', () => zeigen(true));
window.addEventListener('resize', einpassen);
anwenden();
zeigen(true);
gestartet();
</script>
</body>
</html>
`;

const kb = (n) => Math.round(n / 1024).toLocaleString('de-DE');
const einzeln = dateien.reduce((s, d) => s + fs.statSync(path.join(quelle, d)).size, 0);
for (const [art, html] of [
  ['voll', voll],
  ['handy', handy],
]) {
  fs.writeFileSync(ziele[art], html);
  console.log(`${path.relative(process.cwd(), ziele[art])}  ${kb(Buffer.byteLength(html))} KB`);
}
console.log(`${dateien.length} Seiten, einzeln zusammen ${kb(einzeln)} KB`);
