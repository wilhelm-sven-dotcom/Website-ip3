// Fehlersuche auf Geräten, die hier nicht zum Testen bereitstehen (z. B. iPhone): Mit ?diagnose
// zeigt ein kleiner Kasten unten links Zeitpunkte des Ladens, Schriften, Zustand der
// Inszenierung, verborgene Elemente im Bild und Skriptfehler. Ein Bildschirmfoto genügt.
const fehler = [];
const merke = (text) => {
  fehler.push(String(text).slice(0, 90));
  if (fehler.length > 3) fehler.shift();
};
window.addEventListener('error', (e) => merke(e.message || e.type));
window.addEventListener('unhandledrejection', (e) => merke(e.reason?.message || e.reason));

const kasten = document.createElement('div');
kasten.setAttribute('aria-hidden', 'true');
Object.assign(kasten.style, {
  position: 'fixed',
  left: '8px',
  bottom: '8px',
  zIndex: '2147483647',
  maxWidth: 'min(92vw, 380px)',
  padding: '8px 10px',
  background: 'rgba(12, 26, 61, 0.92)',
  color: '#fff',
  font: '11px/1.4 ui-monospace, Menlo, monospace',
  whiteSpace: 'pre-wrap',
  pointerEvents: 'none',
  borderLeft: '3px solid #C83C30',
});
document.body.append(kasten);

const s = (ms) => (ms ? `${(ms / 1000).toFixed(1)} s` : 'noch nicht');
const geraet = (navigator.userAgent.match(/(iPhone OS [\d_]+|iPad|Android [\d.]+|Version\/[\d.]+|Chrome\/\d+|Firefox\/\d+)/g) || []).join(' ');

function verborgenImBild() {
  const vh = innerHeight;
  const oben = (el) => {
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.top >= 0 && r.top < vh * 0.85;
  };
  const inhalte = [...document.querySelectorAll('[data-reveal]')].filter((el) => oben(el) && parseFloat(getComputedStyle(el).opacity) < 0.5).length;
  const titel = [...document.querySelectorAll('[data-split-ready]')].filter((el) => {
    const z = el.querySelector('.split-line');
    if (!z || !oben(el)) return false;
    const t = getComputedStyle(z).transform;
    return t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)';
  }).length;
  return inhalte + titel;
}

function zeigen() {
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const schriften = [...document.fonts];
  const story = document.querySelector('[data-story]');
  const reveals = document.querySelectorAll('[data-reveal]');
  const zeilen = [
    `Diagnose ip3-energie.de · ${geraet}`,
    `seit Start ${s(performance.now())} · DOM ${s(nav.domContentLoadedEventStart)} · load ${s(nav.loadEventStart)}`,
    `Schriften ${schriften.filter((f) => f.status === 'loaded').length}/${schriften.length} geladen (${document.fonts.status})`,
    story ? `Inszenierung ${story.classList.contains('is-live') ? 'live' : story.classList.contains('is-static') ? 'statisch' : 'startet'}${story.dataset.staticReason ? ' · Grund ' + story.dataset.staticReason : ''}${story.dataset.zuLangsam ? ' · zu langsam' : ''}` : 'keine Inszenierung',
    `Einblendungen ${document.querySelectorAll('[data-reveal].is-sichtbar').length}/${reveals.length} · verborgen im Bild ${verborgenImBild()}`,
    `Ansicht ${innerWidth}×${innerHeight} · DPR ${devicePixelRatio} · Scroll ${Math.round(scrollY)}/${document.documentElement.scrollHeight}`,
    `Fehler: ${fehler.length ? fehler.join(' | ') : 'keine'}`,
  ];
  kasten.textContent = zeilen.join('\n');
}

zeigen();
setInterval(zeigen, 500);
