// Laufzeit der Grafik „Ein Tag im Energiesystem“: Uhr und Zeitleiste, Zustände je
// Viertelstunde, Teilchen und Rotoren. Die Schleife läuft nur, solange abgespielt wird, die
// Grafik im Bild und eingezeichnet ist und der Tab aktiv ist. Kein Eingriff ins Scrollen.
import { simuliereTag, moment, uhrzeit, tempo, fuellstandStufe, PHASEN } from '../../lib/energiesystem-modell.js';
import { phasen, ui } from '../../data/energiesystem.js';
import { Fluss } from './fluss.js';
import { Auswahl } from './auswahl.js';

const STUNDEN_JE_S = 21 / 32; // ein Tag in rund 32 Sekunden, Nächte doppelt so schnell
const ZEITLUPE_S = 6; // nach einem Sprung läuft die Uhr so lange mit Viertel-Tempo

const sonnenStufe = (s) => (s <= 0.001 ? 0 : s < 0.3 ? 1 : s < 0.7 ? 2 : 3);

export function initEnergiesystem(root) {
  const $ = (s) => root.querySelector(s);
  const daten = JSON.parse($('[data-es-daten]').textContent);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const sim = simuliereTag();

  const ebene = $('[data-es-ebene]');
  const szene = $('[data-es-szene]');
  const overlay = $('[data-es-overlay]');
  const regler = $('[data-es-regler]');
  const marke = $('[data-es-marke]');
  const play = $('[data-es-play]');
  const playText = $('[data-es-play-text]');
  const uhr = $('[data-es-uhr]');
  const phaseName = $('[data-es-phase]');
  const satz = $('[data-es-satz]');
  const sonnePunkt = $('[data-es-sonne]');
  const ansage = $('[data-es-ansage]');
  const phasenTasten = [...root.querySelectorAll('[data-es-phasen] [data-phase]')];
  const kabel = [...root.querySelectorAll('.es-kabel[data-link]')].map((el) => ({ el, id: el.dataset.link, art: el.dataset.art, aktiv: el.dataset.aktiv }));
  const pegel = [...szene.querySelectorAll('.es-pegel')].map((p) => ({ el: p, def: daten.pegel[Number(p.dataset.pegelId)], wert: -1 }));
  const markerPegel = [...root.querySelectorAll('[data-es-pegel]')].map((el) => ({ el, name: el.dataset.esPegel, quadrate: [...el.children], n: -1 }));
  const rotoren = [...overlay.querySelectorAll('[data-rotor]')].map((el, i) => ({ el, winkel: [14, 52, 87][i] || 0 }));
  const liste = $('[data-es-liste]');

  // Bedienelemente gibt es erst mit JavaScript; ohne zeigt die Grafik 13:00 Uhr und die Textliste
  root.dataset.js = '';
  liste.open = false;
  play.hidden = false;
  regler.hidden = false;
  $('[data-es-phasen]').hidden = false;
  root.querySelectorAll('.es-marker').forEach((mk) => (mk.disabled = false));

  const fluss = new Fluss(overlay, daten.linien);
  let wahlLinks = new Set();

  let t = 13;
  let m = moment(sim, t);
  let schritt = -1;
  let phase = null;
  let laeuft = !reduce.matches;
  let sichtbar = false;
  let tabAktiv = !document.hidden;
  let gezeichnet = szene.classList.contains('is-drawn');
  let zeitlupe = 0;
  let ziehen = false;
  let raf = 0;
  let letzte = 0;

  const auswahl = new Auswahl(root, {
    daten,
    moment: () => m,
    beiWechsel: (id, links) => {
      wahlLinks = links;
      if (!bewegt()) fluss.pfeile(m, wahlLinks);
    },
  });

  const bewegt = () => laeuft && !reduce.matches;

  /* ---------- Darstellung ---------- */

  // Nur schreiben, was sich geändert hat: jede Attributänderung an der Sektion stößt eine
  // Stilberechnung für die ganze Szene an
  const setze = (el, name, wert) => {
    if (el.dataset[name] !== wert) el.dataset[name] = wert;
  };
  let markeX = '';

  function proSchritt() {
    setze(root, 'licht', String(m.licht));
    setze(root, 'sonne', String(sonnenStufe(m.sonne)));
    setze(root, 'auto', m.autoDa ? '1' : '0');
    uhr.textContent = uhrzeit(Math.floor(m.t * 4) / 4);
    if (m.phase !== phase) {
      phase = m.phase;
      root.dataset.phase = phase;
      phaseName.textContent = phasen[phase].name;
      satz.textContent = phasen[phase].satz;
      for (const b of phasenTasten) b.setAttribute('aria-pressed', String(b.dataset.phase === phase));
    }
    regler.setAttribute('aria-valuetext', `${uhrzeit(Math.floor(m.t * 4) / 4)} ${ui.uhr}, ${phasen[phase].name}`);
    for (const k of kabel) {
      const art = m.art[k.id];
      const aktiv = m.richtung[k.id] ? '1' : '0';
      if (art !== k.art) k.el.dataset.art = k.art = art;
      if (aktiv !== k.aktiv) k.el.dataset.aktiv = k.aktiv = aktiv;
    }
    for (const mp of markerPegel) {
      const n = Math.round((fuellstandStufe(m.soc[mp.name]) / 4) * 5);
      if (n === mp.n) continue;
      mp.n = n;
      mp.quadrate.forEach((q, i) => q.classList.toggle('is-voll', i < n));
    }
    auswahl.aktualisiere();
    if (!bewegt()) fluss.pfeile(m, wahlLinks);
  }

  function stetig(dt) {
    if (!ziehen) {
      const v = String(Math.min(1425, Math.round((m.t * 60) / 15) * 15));
      if (regler.value !== v) regler.value = v;
    }
    const x = ((m.t / 24) * 100).toFixed(2);
    if (x !== markeX) {
      markeX = x;
      marke.style.transform = `translateX(${x}%)`;
    }
    for (const p of pegel) {
      const soc = m.soc[p.def[0]];
      if (Math.abs(soc - p.wert) < 0.004) continue;
      p.wert = soc;
      const [, a, b, h] = p.def;
      const k = (h * Math.min(1, Math.max(0, soc))).toFixed(1);
      p.el.setAttribute('d', `M${a[0]} ${a[1]}L${b[0]} ${b[1]}l0 ${-k}L${a[0]} ${(a[1] - k).toFixed(1)}Z`);
    }
    // Sonne auf dem Bogen: Aufgang 6 Uhr links, Untergang 20 Uhr rechts
    const w = Math.PI * (1 - Math.min(1, Math.max(0, (m.t - 6) / 14)));
    sonnePunkt.setAttribute('x', (Math.cos(w) * 24 - 3.5).toFixed(2));
    sonnePunkt.setAttribute('y', (-Math.sin(w) * 24 - 3.5).toFixed(2));
    if (bewegt() && dt > 0) {
      fluss.zeichne(m, dt, wahlLinks);
      for (const r of rotoren) {
        r.winkel = (r.winkel + dt * (60 + 260 * m.wind)) % 360;
        r.el.setAttribute('transform', `rotate(${r.winkel.toFixed(1)})`);
      }
    }
  }

  function zeige(dt = 0) {
    m = moment(sim, t);
    if (m.schritt !== schritt) {
      schritt = m.schritt;
      proSchritt();
    }
    stetig(dt);
  }

  /* ---------- Schleife ---------- */

  function tick(jetzt) {
    const dt = Math.min(0.1, (jetzt - letzte) / 1000);
    letzte = jetzt;
    const faktor = zeitlupe > 0 ? 0.25 : 1;
    zeitlupe = Math.max(0, zeitlupe - dt);
    t = (t + dt * STUNDEN_JE_S * tempo(t) * faktor) % 24;
    zeige(dt);
    raf = requestAnimationFrame(tick);
  }

  function steuern() {
    root.toggleAttribute('data-bewegt', bewegt());
    const soll = laeuft && sichtbar && tabAktiv && gezeichnet;
    if (soll && !raf) {
      letzte = performance.now();
      raf = requestAnimationFrame(tick);
    } else if (!soll && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (!bewegt()) fluss.pfeile(m, wahlLinks);
    play.setAttribute('aria-pressed', String(laeuft));
    playText.textContent = laeuft ? ui.anhalten : ui.abspielen;
  }

  function springe(stunde, { langsam = false, sagen = false } = {}) {
    t = ((stunde % 24) + 24) % 24;
    zeitlupe = langsam && bewegt() ? ZEITLUPE_S : 0;
    zeige(0);
    if (sagen) ansage.textContent = `${uhrzeit(Math.floor(t * 4) / 4)} ${ui.uhr}, ${phasen[m.phase].name}. ${phasen[m.phase].satz}`;
  }

  /* ---------- Bedienung ---------- */

  play.addEventListener('click', () => {
    laeuft = !laeuft;
    steuern();
  });

  regler.addEventListener('pointerdown', () => (ziehen = true));
  window.addEventListener('pointerup', () => (ziehen = false));
  regler.addEventListener('input', () => springe(Number(regler.value) / 60));
  regler.addEventListener('change', () => {
    ziehen = false;
    springe(Number(regler.value) / 60, { sagen: true });
  });

  for (const b of phasenTasten) {
    b.addEventListener('click', () => {
      const p = PHASEN.find((x) => x.id === b.dataset.phase);
      springe(p.sprung, { langsam: true, sagen: true });
    });
  }

  new IntersectionObserver(
    ([e]) => {
      sichtbar = e.isIntersecting;
      steuern();
    },
    { rootMargin: '80px 0px' }
  ).observe(ebene);

  document.addEventListener('visibilitychange', () => {
    tabAktiv = !document.hidden;
    steuern();
  });

  reduce.addEventListener('change', () => {
    if (reduce.matches) laeuft = false;
    fluss.leeren();
    steuern();
  });

  const massstab = () => {
    const k = ebene.clientWidth / daten.viewBox[2];
    fluss.massstab(k);
    if (!bewegt()) fluss.pfeile(m, wahlLinks);
  };
  new ResizeObserver(massstab).observe(ebene);
  massstab();

  // Eingezeichnet: main.js setzt .is-drawn, danach erscheinen Overlay und Marker
  const fertig = () => {
    gezeichnet = true;
    ebene.classList.add('is-gezeichnet');
    steuern();
  };
  if (gezeichnet) fertig();
  else {
    const mo = new MutationObserver(() => {
      if (szene.classList.contains('is-drawn')) {
        mo.disconnect();
        fertig();
      }
    });
    mo.observe(szene, { attributes: true, attributeFilter: ['class'] });
  }

  zeige(0);
  steuern();

  if (/[?&]debug\b/.test(location.search)) {
    window.__energiesystem = {
      sim,
      zeit: (h) => springe(h),
      abspielen: (an = true) => {
        laeuft = an;
        steuern();
      },
      waehle: (id, fest = true) => (id ? auswahl.waehle(id, { fest }) : auswahl.schliessen()),
      zustand: () => ({ t, schritt, phase: m.phase, laeuft, bewegt: bewegt(), sichtbar, gezeichnet, schleife: !!raf, wahl: auswahl.gezeigt, fest: auswahl.fest, m }),
    };
  }
}
