// Steuerung der Scroll-Inszenierung auf der Startseite.
// Lädt Three.js erst bei Bedarf, koppelt die Szene an den nativen Scrollfortschritt
// und fällt bei fehlendem WebGL, schwacher Hardware oder reduzierter Bewegung
// auf eine statische Bildfolge zurück. Inhalte liegen immer als HTML vor.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { win } from './spline.js';

gsap.registerPlugin(ScrollTrigger);

const params = new URLSearchParams(location.search);

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

function pickQuality() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const mobile = w < 760 || (w < 1024 && h > w);
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  const dprRaw = window.devicePixelRatio || 1;
  const strong = cores >= 6 && mem >= 8 && !mobile;

  const desktopKeys = {
    p: [0.0, 0.1, 0.27, 0.42, 0.52, 0.6, 0.66, 0.745, 0.87, 1.0],
    dist: [6.2, 5.8, 2.4, 0.34, 0.06, 0.042, 0.05, 6.5, 70, 160],
    az: [-50, -46, -16, -4, 6, 13, 10, 2, -14, -16],
    el: [22, 24, 50, 54, 33, 27, 30, 58, 34, 32],
    fov: [28, 28, 30, 34, 40, 42, 42, 36, 31, 30],
    toFocus: [0, 0, 0.25, 1, 1, 1, 1, 0, 0, 0],
    toPlant: [0, 0, 0, 0, 0, 0, 0, 0.04, 0.8, 1],
    shiftX: [0.21, 0.21, 0.13, 0.05, 0, 0, 0, 0.02, 0.06, 0.06],
    shiftY: [0, 0, 0, 0, 0, 0, 0, 0, 0.03, 0.02],
    // Zielpunkt zum Schluss nach Süden: Ortsrand mit Haus und Gewerbehalle im Bild
    offX: [0, 0, 0, 0, 0, 0, 0, 0, 0, -4],
    offZ: [0, 0, 0, 0, 0, 0, 0, 0, 4, 20],
  };
  // Hochformat: Modul im oberen Bilddrittel, Anlage im Aufbau von Osten, zum Schluss aus Süd-Südost gesehen
  const mobileKeys = {
    ...desktopKeys,
    dist: [13, 12.2, 3.4, 0.42, 0.07, 0.05, 0.06, 9, 100, 200],
    az: [-46, -42, -14, -4, 6, 13, 10, 2, 40, 15],
    el: [24, 26, 50, 54, 33, 27, 30, 58, 40, 54],
    fov: [28, 28, 34, 38, 44, 46, 46, 40, 38, 38],
    shiftX: [0.03, 0.03, 0, 0, 0, 0, 0, 0, 0, 0],
    shiftY: [0.33, 0.33, 0.16, 0.08, 0.06, 0.06, 0.06, 0.08, 0.12, -0.24],
    // zum Schluss steil aus Süd-Südost: Ortsrand im unteren Bilddrittel, unter dem Textfeld frei
    offX: [0, 0, 0, 0, 0, 0, 0, 0, 0, 13],
    offZ: [0, 0, 0, 0, 0, 0, 0, 0, 6, 29],
  };

  return {
    mobile,
    maxDpr: mobile ? Math.min(dprRaw, 1.75) : Math.min(dprRaw, strong ? 2 : 1.6),
    antialias: dprRaw < 1.9,
    shadows: !mobile,
    shadowSize: strong ? 4096 : 2048,
    photons: mobile ? 50 : 90,
    layout: mobile ? { rows: 6, tablesPerRow: 3, modulesPerTable: 12 } : { rows: 8, tablesPerRow: 3, modulesPerTable: 14 },
    // Hauptmodul am Westende seiner Reihe: im Einstieg verläuft die Reihe nach hinten ins Navy
    hero: { r: 1, t: 0, c: 0 },
    keys: mobile ? mobileKeys : desktopKeys,
    preserveDrawingBuffer: params.has('capture'),
  };
}

function setupLabels(root, mobile) {
  const items = [...root.querySelectorAll('[data-label]')].map((el) => ({
    el,
    key: el.dataset.label,
    // im Hochformat eigener Bereich, wenn angegeben (Textfeld verdeckt dort die Bildmitte)
    range: ((mobile && el.dataset.rangeM) || el.dataset.range).split(',').map(Number),
    side: el.dataset.side || 'right',
    text: el.querySelector('.story-label__text'),
    textW: 0,
  }));
  return items;
}

export async function initStory() {
  const section = document.querySelector('[data-story]');
  if (!section) return;
  const canvas = section.querySelector('[data-story-canvas]');
  const stage = section.querySelector('[data-story-stage]');
  const labelsRoot = section.querySelector('[data-story-labels]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory && navigator.deviceMemory <= 2) || navigator.connection?.saveData;
  const forceStatic = params.has('static');

  // Der Wechsel auf die statische Fassung verkürzt den Abschnitt um mehrere Bildschirmhöhen.
  // Damit die Leseposition erhalten bleibt, steht nach dem Umbau derselbe Inhalt an derselben
  // Stelle: im Abschnitt Einstieg, Schritt oder folgender Abschnitt, darunter das Element in
  // der Bildmitte. Bei zu langsamer Darstellung geschieht der Wechsel erst außer Sicht.
  let statisch = false;
  const anker = () => {
    const r0 = section.getBoundingClientRect();
    const mitte = window.innerHeight / 2;
    if (r0.top >= window.innerHeight) return null; // darunter: oberhalb ändert sich nichts
    if (r0.bottom <= 0) {
      const el = document.elementFromPoint(window.innerWidth / 2, mitte);
      return el && !section.contains(el) ? { el, oben: el.getBoundingClientRect().top, frei: true } : null;
    }
    let bester = null;
    let abstand = Infinity;
    for (const el of [...section.querySelectorAll('.story__intro, .story__step'), section.nextElementSibling]) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const d = r.top > mitte ? r.top - mitte : r.bottom < mitte ? mitte - r.bottom : 0;
      if (d < abstand) {
        abstand = d;
        bester = { el, oben: r.top, frei: el === section.nextElementSibling };
      }
    }
    return bester;
  };
  const halten = (a) => {
    if (!a) return;
    const r = a.el.getBoundingClientRect();
    // Schritte der Inszenierung im Bild halten: höchstens zur Hälfte oberhalb, Oberkante
    // höchstens in der Bildmitte. Inhalte außerhalb des Abschnitts bleiben exakt stehen.
    const ziel = a.frei ? a.oben : Math.min(Math.max(a.oben, -r.height / 2), window.innerHeight / 2);
    const d = r.top - ziel;
    if (Math.abs(d) > 1) window.scrollBy({ top: d, behavior: 'instant' });
    a.oben = ziel;
  };
  const goStatic = (reason) => {
    if (statisch) return;
    const a = anker();
    statisch = true;
    section.classList.add('is-static');
    section.classList.remove('is-live');
    section.dataset.staticReason = reason;
    halten(a);
    document.dispatchEvent(new Event('header:update'));
    ScrollTrigger.refresh();
    halten(a);
  };

  if (forceStatic || reduce || lowPower || !webglAvailable()) {
    goStatic(forceStatic ? 'param' : reduce ? 'reduced-motion' : lowPower ? 'low-power' : 'no-webgl');
    return;
  }

  const quality = pickQuality();
  let story;
  try {
    const mod = await import('./scene.js');
    story = mod.createStoryScene(canvas, quality);
  } catch (err) {
    console.warn('Inszenierung nicht verfügbar, statische Darstellung aktiv.', err);
    goStatic('error');
    return;
  }

  const labels = setupLabels(labelsRoot, quality.mobile);
  let target = 0;
  let current = 0;
  let pointer = { x: 0, y: 0 };
  const pointerTarget = { x: 0, y: 0 };
  let running = false;
  let visible = true;
  let raf = 0;
  let last = performance.now();
  let time = 0;
  let slowFrames = 0;
  let frames = 0;
  let width = 0;
  let height = 0;
  let capturing = false;
  // zu langsam: letztes Bild bleibt stehen, Wechsel auf die statische Fassung außer Sicht
  let langsam = false;

  const resize = () => {
    const r = stage.getBoundingClientRect();
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    // Mobile Adressleiste: kleine Höhenänderungen ignorieren
    if (Math.abs(w - width) < 1 && Math.abs(h - height) < 120 && width) return;
    width = w;
    height = h;
    story.resize(w, h, quality.maxDpr);
  };
  resize();
  window.addEventListener('resize', () => {
    resize();
    labels.forEach((l) => (l.textW = 0));
  });

  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      target = self.progress;
      // nach dem Wechsel auf die statische Fassung oder bei zu langsamer Darstellung nichts mehr rendern
      if (!running && !capturing && !statisch && !langsam) frame(performance.now());
    },
  });
  target = st.progress;
  current = target;

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener(
      'pointermove',
      (e) => {
        pointerTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointerTarget.y = (e.clientY / window.innerHeight) * 2 - 1;
      },
      { passive: true }
    );
  }

  function placeLabels(p) {
    for (const l of labels) {
      const [a, b, c, d] = l.range;
      const o = win(p, a, b, c, d);
      const anchor = story.labelAnchors[l.key];
      if (o < 0.01 || !anchor) {
        l.el.style.opacity = '0';
        l.el.style.visibility = 'hidden';
        continue;
      }
      const s = story.project(anchor);
      if (!s.visible || s.x < -40 || s.y < -40 || s.x > width + 40 || s.y > height + 40) {
        l.el.style.opacity = '0';
        l.el.style.visibility = 'hidden';
        continue;
      }
      l.el.style.visibility = 'visible';
      l.el.style.opacity = String(o);
      l.el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
      // Text bleibt im Bild: bei Bedarf auf die andere Seite klappen
      if (!l.textW) l.textW = l.text.offsetWidth + (quality.mobile ? 48 : 70);
      if (l.side !== 'none') {
        let side = l.side;
        if (side === 'right' && s.x + l.textW > width - 8) side = 'left';
        else if (side === 'left' && s.x - l.textW < 8) side = 'right';
        l.el.classList.toggle('story-label--left', side === 'left');
        l.el.classList.toggle('story-label--right', side !== 'left');
      }
    }
  }

  function frame(now) {
    if (statisch || langsam) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    time += dt;
    // Glättung des Scrollfortschritts, das Scrollen selbst bleibt nativ
    const k = params.has('capture') ? 1 : 1 - Math.exp(-dt * 7.5);
    current += (target - current) * k;
    if (Math.abs(target - current) < 0.00005) current = target;
    pointer.x += (pointerTarget.x - pointer.x) * (1 - Math.exp(-dt * 3));
    pointer.y += (pointerTarget.y - pointer.y) * (1 - Math.exp(-dt * 3));

    story.update(current, time, pointer);
    story.render();
    placeLabels(current);
    section.style.setProperty('--story-p', current.toFixed(4));

    // Laufzeitprüfung: bei dauerhaft zu langsamer Darstellung statisch weiter
    frames++;
    if (frames > 20 && frames < 140) {
      if (dt > 0.075) slowFrames++;
      if (slowFrames > 45 && !params.has('capture')) {
        stop();
        langsam = true;
        if (!visible) goStatic('slow');
        return;
      }
    }
  }

  function loop(now) {
    if (!running) return;
    frame(now);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running || statisch || langsam || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  // Nur rendern, solange die Inszenierung sichtbar ist
  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (langsam && !visible) goStatic('slow');
      else visible ? start() : stop();
    },
    { rootMargin: '80px 0px' }
  );
  io.observe(section);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
    goStatic('context-lost');
  });

  // Erstes Bild, dann einblenden
  story.update(current, 0, pointer);
  try {
    story.warmup();
  } catch {
    /* Vorkompilieren ist optional */
  }
  story.update(current, 0, pointer);
  story.render();
  placeLabels(current);
  section.classList.add('is-live');
  document.dispatchEvent(new Event('header:update'));
  start();

  // Schnittstelle für Bildschirmaufnahmen und Tests, nur mit ?capture oder ?debug
  if (!params.has('capture') && !params.has('debug')) {
    document.dispatchEvent(new CustomEvent('story:ready'));
    return;
  }
  window.__story = {
    setProgress(p, t = 2) {
      stop();
      target = current = p;
      time = t;
      story.update(p, t, { x: 0, y: 0 });
      story.render();
      placeLabels(p);
      section.style.setProperty('--story-p', p.toFixed(4));
    },
    resume: start,
    // rendert genau ein Bild passend zur aktuellen Scrollposition (für Aufnahmen)
    renderAtScroll(dt = 1 / 30) {
      capturing = true;
      stop();
      ScrollTrigger.update();
      target = current = st.progress;
      time += dt;
      story.update(current, time, { x: 0, y: 0 });
      story.render();
      placeLabels(current);
      section.style.setProperty('--story-p', current.toFixed(4));
      return current;
    },
    setStrip: (st) => story.setStrip(st),
    quality,
  };
  document.dispatchEvent(new CustomEvent('story:ready'));
}
