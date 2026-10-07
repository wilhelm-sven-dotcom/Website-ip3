// Vorschläge für Schritt 03 der Inszenierung, nur mit ?schritt3=a|b|c|d (vorübergehend).
// Haus und Halle entfallen in allen Vorschlägen, weil die Grafik „Ein Tag im Energiesystem“
// weiter unten dieselben Anwendungen zeigt. Nach der Entscheidung von ip³ wird die gewählte
// Variante regulär eingebaut und diese Datei entfernt.
//   a  Nur die Anlage (Stand vor Haus und Halle)
//   b  Vom Plan zur Anlage: Lageplan in der Draufsicht, die Anlage wächst aus dem Plan
//   c  Der Weg des Stroms: roter Pfad vom Modul bis in die 20-kV-Leitung, die Kamera folgt
//   d  Aus dem Modell wird eine Anlage: Überblendung in das Luftbild der Referenz an der A6
//
// Ohne eigene Importe von three.js und den Szenenmodulen: THREE und die Bausteine kommen über
// szene(ctx) aus scene.js. So bleibt die Aufteilung der Skripte wie ohne Vorschläge, und die
// Einzeldatei-Exporte funktionieren unverändert.
import fotoA6 from '../../assets/fotos/referenzen/freiflaeche-a6.jpg?url';

let THREE = null;
let createFlowMaterial = null;
let ribbonGeometry = null;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const range = (x, a, b) => clamp01((x - a) / (b - a));
const smooth = (x) => x * x * (3 - 2 * x);
const win = (x, a, b, c, d) => smooth(range(x, a, b)) * (1 - smooth(range(x, c, d)));
const bausteine = (ctx) => {
  ({ THREE, createFlowMaterial, ribbonGeometry } = ctx);
};

/* ---------- Kamera: Schlüssel 0 bis 6 (Einstieg bis Zelle) bleiben, der Schluss ist neu ---------- */
const FELDER = ['p', 'dist', 'az', 'el', 'fov', 'toFocus', 'toPlant', 'shiftX', 'shiftY', 'offX', 'offZ'];
const BASIS = 7;

function schluss(keys, tail) {
  const out = { ...keys };
  const n = tail.p.length;
  for (const f of FELDER) {
    const anfang = (keys[f] ?? keys.p.map(() => 0)).slice(0, BASIS);
    out[f] = anfang.concat(tail[f] ?? new Array(n).fill(0));
  }
  return out;
}

/* ---------- Seite: Labels und Text des Schritts ---------- */
function label(section, key, o) {
  const root = section.querySelector('[data-story-labels]');
  let el = root.querySelector(`[data-label="${key}"]`);
  if (!el) {
    el = root.querySelector('[data-label="generator"]').cloneNode(true);
    el.dataset.label = key;
    root.appendChild(el);
  }
  const t = el.querySelector('.story-label__text');
  t.textContent = o.text;
  if (o.extra) {
    const s = document.createElement('span');
    s.className = 'story-label__extra';
    for (const a of t.attributes) if (a.name.startsWith('data-astro-cid')) s.setAttribute(a.name, a.value);
    s.textContent = o.extra;
    t.appendChild(s);
  }
  el.dataset.range = o.range;
  if (o.rangeM) el.dataset.rangeM = o.rangeM;
  else delete el.dataset.rangeM;
  const side = o.side ?? 'right';
  el.dataset.side = side;
  el.classList.toggle('story-label--left', side === 'left');
  el.classList.toggle('story-label--right', side !== 'left');
  if (o.mass) {
    // Maßzahl mittig auf der Maßlinie wie im Einstieg, aber auch auf schmalen Bildschirmen
    el.dataset.side = 'none';
    el.classList.remove('story-label--left', 'story-label--right');
    el.querySelector('.story-label__dot').style.display = 'none';
    el.querySelector('.story-label__leader').style.display = 'none';
    Object.assign(t.style, {
      left: '0',
      right: 'auto',
      top: '0',
      transform: 'translate(-50%, -50%)',
      padding: '0.15rem 0.4rem',
      border: '0',
      color: 'var(--hell)',
      fontSize: '0.68rem',
    });
  }
  return el;
}

function ohne(section, keys) {
  keys.forEach((k) => section.querySelector(`[data-label="${k}"]`)?.remove());
}

function schritt3(section, { titel, text, link }) {
  const h = section.querySelector('#step-3');
  const dot = h.querySelector('.dot');
  h.textContent = titel;
  h.appendChild(dot);
  const panel = h.closest('.story__panel');
  panel.querySelector('p:not(.kicker)').textContent = text;
  const a = panel.querySelector('.arrow-link');
  if (link && a) {
    a.href = link.href;
    a.firstChild.nodeValue = `${link.text} `;
  }
}

const OHNE_ORT = { ort: null, ortRoute: null, flowOrt: null };
const fmtM = (v) => `${v.toFixed(2).replace('.', ',')} m`;

/* ---------- A · Nur die Anlage ---------- */
const varianteA = () => ({
  keys: (k, mobile) =>
    schluss(
      k,
      mobile
        ? { p: [0.745, 0.87, 1.0], dist: [9, 100, 210], az: [2, 40, 50], el: [58, 40, 52], fov: [40, 38, 38], toPlant: [0.04, 0.8, 1], shiftY: [0.08, 0.12, -0.26] }
        : {
            p: [0.745, 0.87, 1.0],
            dist: [6.5, 70, 128],
            az: [2, -14, -18],
            el: [58, 34, 27],
            fov: [36, 31, 30],
            toPlant: [0.04, 0.8, 1],
            shiftX: [0.02, 0.06, 0.04],
            shiftY: [0, 0.03, 0.04],
          }
    ),
  stufen: OHNE_ORT,
  dom(section) {
    ohne(section, ['haus', 'gewerbe']);
    schritt3(section, {
      titel: 'Erzeugen. Speichern. Einspeisen',
      text: 'PV-Generator, Batteriespeicher und Netzanschluss bilden ein System. Wir planen es als Ganzes: von der Auslegung über Netzanschlussverfahren und Anlagenzertifikat bis zur Inbetriebnahme.',
    });
  },
});

/* ---------- B · Vom Plan zur Anlage ---------- */
const planVertex = /* glsl */ `
attribute float aOrd;
attribute float aA;
attribute float aRot;
varying float vOrd;
varying float vA;
varying float vRot;
#include <common>
#include <fog_pars_vertex>
void main() {
  vOrd = aOrd;
  vA = aA;
  vRot = aRot;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const planFragment = /* glsl */ `
uniform float uDraw;
uniform float uOpacity;
uniform vec3 uColor;
uniform vec3 uRot;
varying float vOrd;
varying float vA;
varying float vRot;
#include <common>
#include <fog_pars_fragment>
void main() {
  // Linien zeichnen sich vom Hauptmodul nach außen
  float d = uDraw * 1.15;
  float vis = 1.0 - smoothstep(d - 0.15, d, vOrd);
  if (vis <= 0.001) discard;
  gl_FragColor = vec4(mix(uColor, uRot, vRot), vA * vis * uOpacity);
  #include <fog_fragment>
}`;

function lageplan({ layout: L, plant, heroSlot }) {
  const T = plant.teile;
  const site = plant.site;
  const Y = 0.035;
  const pos = [];
  const alpha = [];
  const rot = [];
  const xz = [];
  let rotAn = 0;
  const add = (x1, z1, x2, z2, a) => {
    pos.push(x1, Y, z1, x2, Y, z2);
    alpha.push(a, a);
    rot.push(rotAn, rotAn);
    xz.push([x1, z1], [x2, z2]);
  };
  const rect = (x0, z0, x1, z1, a) => {
    add(x0, z0, x1, z0, a);
    add(x1, z0, x1, z1, a);
    add(x1, z1, x0, z1, a);
    add(x0, z1, x0, z0, a);
  };
  const box = (b, a) => rect(b.min.x, b.min.z, b.max.x, b.max.z, a);
  const kreis = (cx, cz, r, n, a) => {
    for (let i = 0; i < n; i++) {
      const w0 = (i / n) * Math.PI * 2;
      const w1 = ((i + 1) / n) * Math.PI * 2;
      add(cx + Math.cos(w0) * r, cz + Math.sin(w0) * r, cx + Math.cos(w1) * r, cz + Math.sin(w1) * r, a);
    }
  };
  // Linienzug mit Strichmuster [an, aus, an, aus …] in Metern
  const muster = (punkte, m, a) => {
    let mi = 0;
    let rest = m[0];
    for (let i = 0; i < punkte.length - 1; i++) {
      const [ax, az] = punkte[i];
      const [bx, bz] = punkte[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      let t = 0;
      while (t < len - 1e-6) {
        const s = Math.min(rest, len - t);
        if (mi % 2 === 0) add(ax + ((bx - ax) * t) / len, az + ((bz - az) * t) / len, ax + ((bx - ax) * (t + s)) / len, az + ((bz - az) * (t + s)) / len, a);
        t += s;
        rest -= s;
        if (rest <= 1e-6) {
          mi = (mi + 1) % m.length;
          rest = m[mi];
        }
      }
    }
  };
  const masslinie = (ax, az, bx, bz, a = 0.9) => {
    add(ax, az, bx, bz, a);
    const s = 0.55;
    add(ax - s, az + s, ax + s, az - s, a);
    add(bx - s, bz + s, bx + s, bz - s, a);
  };

  plant.group.updateMatrixWorld(true);

  // Modultische mit Modulteilung
  const fuge = 0.02;
  for (const t of L.tables) {
    const x0 = t.center.x - L.tableW / 2;
    const x1 = t.center.x + L.tableW / 2;
    const z0 = t.center.z - L.depth / 2;
    const z1 = t.center.z + L.depth / 2;
    rect(x0, z0, x1, z1, 0.85);
    add(x0, t.center.z, x1, t.center.z, 0.28);
    for (let c = 1; c < L.modulesPerTable; c++) {
      const x = x0 + c * (L.modW + fuge) - fuge / 2;
      add(x, z0, x, z1, 0.28);
    }
  }
  // Hauptmodul aus dem Einstieg: rot umrandet
  rotAn = 1;
  const hw = L.modW / 2 + 0.35;
  const hd = (L.modH * Math.cos(THREE.MathUtils.degToRad(20))) / 2 + 0.35;
  rect(heroSlot.x - hw, heroSlot.z - hd, heroSlot.x + hw, heroSlot.z + hd, 1);
  rect(heroSlot.x - hw - 0.25, heroSlot.z - hd - 0.25, heroSlot.x + hw + 0.25, heroSlot.z + hd + 0.25, 1);
  rotAn = 0;
  // Wechselrichter, Stationen, Speicher
  const b3 = new THREE.Box3();
  T.inverters.forEach((inv) => box(b3.setFromObject(inv), 0.8));
  box(b3.setFromObject(T.trafo), 0.9);
  box(b3.setFromObject(T.nvp), 0.9);
  T.bess.children.forEach((c) => box(b3.setFromObject(c), 0.85));
  // Kabeltrassen gestrichelt
  T.routes.filter((r) => r.key !== 'ort').forEach((r) => muster(r.pts.map((v) => [v.x, v.z]), [1.4, 0.7], 0.7));
  // Zaun innerhalb der Grundstücksgrenze
  rect(site.x0 + 1.5, site.z0 + 1.5, site.x1 - 1.5, site.z1 - 1.5, 0.5);
  // Freileitung: Maste als Kreise, Trasse strichpunktiert
  const maste = T.poles.children.map((pl) => [pl.position.x, pl.position.z]);
  maste.forEach(([x, z]) => kreis(x, z, 0.7, 10, 0.85));
  const ende = maste[maste.length - 1];
  muster([maste[0], [ende[0] + T.lineDir.x * 60, ende[1] + T.lineDir.z * 60]], [4, 1, 0.6, 1], 0.55);

  // Maßketten am Hauptmodul: Reihenabstand (Reihe 0 zu 1) und Tischlänge (Reihe 0, erster Tisch)
  const west = L.bounds.west;
  const xd = west - 6;
  const za = L.depth / 2;
  const zb = -L.pitch + L.depth / 2;
  add(west - 0.6, za, xd - 1.2, za, 0.6);
  add(west - 0.6, zb, xd - 1.2, zb, 0.6);
  masslinie(xd, za, xd, zb);
  const xa = west;
  const xb = west + L.tableW;
  const zs = L.depth / 2;
  const zd = zs + 2.8;
  add(xa, zs + 0.5, xa, zd + 1.2, 0.6);
  add(xb, zs + 0.5, xb, zd + 1.2, 0.6);
  masslinie(xa, zd, xb, zd);
  // Nordpfeil westlich des Grundstücks
  const nx = west - 11;
  const nz = -14;
  kreis(nx, nz, 3, 24, 0.8);
  add(nx, nz + 2.2, nx, nz - 3.8, 0.9);
  add(nx, nz - 3.8, nx - 0.9, nz - 2.4, 0.9);
  add(nx, nz - 3.8, nx + 0.9, nz - 2.4, 0.9);

  let maxD = 0;
  xz.forEach(([x, z]) => (maxD = Math.max(maxD, Math.hypot(x - heroSlot.x, z - heroSlot.z))));
  const ord = xz.map(([x, z]) => Math.pow(Math.hypot(x - heroSlot.x, z - heroSlot.z) / maxD, 0.85));

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aOrd', new THREE.Float32BufferAttribute(ord, 1));
  g.setAttribute('aA', new THREE.Float32BufferAttribute(alpha, 1));
  g.setAttribute('aRot', new THREE.Float32BufferAttribute(rot, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uDraw: { value: 0 }, uOpacity: { value: 1 }, uColor: { value: new THREE.Color('#e8e7ef') }, uRot: { value: new THREE.Color('#e0503f') } },
    ]),
    vertexShader: planVertex,
    fragmentShader: planFragment,
    transparent: true,
    depthWrite: false,
    fog: true,
    toneMapped: false,
  });
  const mesh = new THREE.LineSegments(g, mat);
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  mesh.visible = false;

  const anchors = {
    massReihe: new THREE.Vector3(xd, Y, (za + zb) / 2),
    massTisch: new THREE.Vector3((xa + xb) / 2, Y, zd),
    nord: new THREE.Vector3(nx, Y, nz - 5.4),
  };
  return { mesh, mat, anchors };
}

const varianteB = () => {
  let schriftfeld = null;
  return {
    keys: (k, mobile) =>
      schluss(
        k,
        mobile
          ? {
              p: [0.72, 0.8, 0.88, 1.0],
              dist: [14, 95, 175, 210],
              az: [20, 90, 80, 50],
              el: [68, 84, 58, 52],
              fov: [40, 38, 38, 38],
              toPlant: [0.02, 0.2, 0.7, 1],
              shiftY: [0.08, 0.06, 0.1, -0.26],
              offZ: [0, -2, -4, 0],
            }
          : {
              p: [0.72, 0.8, 0.88, 1.0],
              dist: [10, 70, 140, 128],
              az: [0, 0, -6, -18],
              el: [70, 84, 58, 27],
              fov: [34, 30, 30, 30],
              toPlant: [0.02, 0.2, 0.7, 1],
              shiftX: [0.02, 0.08, 0.06, 0.04],
              shiftY: [0, 0.02, 0.03, 0.04],
              offZ: [0, -2, -4, 0],
            }
      ),
    stufen: {
      ...OHNE_ORT,
      build: [0.8, 0.93],
      grid: [0.69, 0.78],
      inverters: [0.84, 0.9],
      trafo: [0.86, 0.9],
      pvRoute: [0.86, 0.92],
      bess: [0.87, 0.93],
      bessRoute: [0.9, 0.94],
      nvp: [0.89, 0.93],
      gridRoute: [0.91, 0.95],
      line: [0.92, 0.98],
      flowPv: [0.9, 0.95],
      flowBess: [0.93, 0.96],
      flowGrid: [0.95, 0.99],
    },
    dom(section, mobile) {
      ohne(section, ['haus', 'gewerbe']);
      const spaet = {
        generator: '0.88,0.92,2,3',
        inverter: '0.9,0.93,2,3',
        trafo: '0.9,0.935,2,3',
        bess: '0.91,0.94,2,3',
        nvp: '0.92,0.95,2,3',
        grid: '0.95,0.975,2,3',
      };
      for (const [key, r] of Object.entries(spaet)) {
        const el = section.querySelector(`[data-label="${key}"]`);
        el.dataset.range = r;
        // am Handy liegt das Textfeld zum Schluss über der Bildmitte
        el.dataset.rangeM = r.split(',').slice(0, 2).concat(['0.95', '0.97']).join(',');
      }
      label(section, 'massReihe', { text: '', range: '0.745,0.775,0.86,0.9', mass: true });
      label(section, 'massTisch', { text: '', range: '0.75,0.78,0.86,0.9', mass: true });
      label(section, 'nord', { text: 'N', range: '0.75,0.785,0.86,0.9', mass: true });
      schritt3(section, {
        titel: 'Erst geplant, dann gebaut',
        text: 'Lageplan, Verschaltung, Speicher und Netzanschluss entstehen bei uns zuerst als Plan. Danach bauen wir die Anlage und führen sie durch Netzanschlussverfahren und Anlagenzertifikat bis zur Inbetriebnahme.',
      });
      if (!mobile) {
        // Schriftfeld wie auf einer Planzeichnung, nur in der Draufsicht
        const stage = section.querySelector('[data-story-stage]');
        schriftfeld = document.createElement('div');
        schriftfeld.setAttribute('aria-hidden', 'true');
        schriftfeld.innerHTML =
          '<span style="grid-column:1/3;font-weight:700;color:var(--weiss)">Lageplan</span>' +
          '<span style="grid-column:1/3">PV-Freifläche mit Speicher und Netzanschluss</span>' +
          '<span>Maßstab schematisch</span><span>Blatt 03</span>';
        Object.assign(schriftfeld.style, {
          position: 'absolute',
          right: '2.5vw',
          bottom: '5vh',
          display: 'grid',
          gridTemplateColumns: 'auto auto',
          gap: '1px',
          background: 'rgb(232 231 239 / 0.45)',
          border: '1px solid rgb(232 231 239 / 0.45)',
          fontFamily: 'var(--font-tech)',
          fontSize: '0.66rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--on-navy-sec)',
          opacity: '0',
          pointerEvents: 'none',
        });
        schriftfeld.querySelectorAll('span').forEach((s) => Object.assign(s.style, { background: 'var(--navy)', padding: '0.45rem 0.7rem' }));
        stage.insertBefore(schriftfeld, stage.querySelector('[data-story-labels]'));
      }
    },
    szene(ctx) {
      bausteine(ctx);
      const plan = lageplan(ctx);
      ctx.scene.add(plan.mesh);
      // Maßzahlen aus dem Modell
      const root = document.querySelector('[data-story-labels]');
      root.querySelector('[data-label="massReihe"] .story-label__text').textContent = fmtM(ctx.layout.pitch);
      root.querySelector('[data-label="massTisch"] .story-label__text').textContent = fmtM(ctx.layout.tableW);
      return {
        anchors: plan.anchors,
        update(p) {
          const draw = range(p, 0.69, 0.82);
          plan.mat.uniforms.uDraw.value = draw;
          plan.mat.uniforms.uOpacity.value = 1 - 0.65 * range(p, 0.88, 0.98);
          plan.mesh.visible = draw > 0.001;
          if (schriftfeld) schriftfeld.style.opacity = String(win(p, 0.74, 0.78, 0.85, 0.89));
        },
      };
    },
  };
};

/* ---------- C · Der Weg des Stroms ---------- */
function strompfad({ layout: L, plant, heroSlot, quality }) {
  const T = plant.teile;
  const r = quality.hero.r;
  const east = L.bounds.east;
  const zr = -r * L.pitch + 1.4;
  const zf = -r * L.pitch + L.depth / 2 + 0.45;
  const tr = T.trafo.position;
  const nv = T.nvp.position;
  const ls = T.lineStart;
  const V = (x, z) => new THREE.Vector3(x, 0, z);
  const pfad = [
    V(heroSlot.x, zf),
    V(east + 0.9, zf),
    V(east + 0.9, zr), // Wechselrichter der Reihe
    V(T.collectorX, zr),
    V(T.collectorX, tr.z),
    V(tr.x - 1.9, tr.z), // Trafostation
    V(tr.x, tr.z + 1.4),
    V(tr.x, nv.z),
    V(nv.x - 2.7, nv.z), // Übergabestation
    V(nv.x + 2.7, nv.z),
    V(ls.x - 0.4, nv.z), // Kabelendmast
  ];
  const cum = [0];
  for (let i = 1; i < pfad.length; i++) cum.push(cum[i - 1] + pfad[i].distanceTo(pfad[i - 1]));
  const total = cum[cum.length - 1];
  // Ankunft des Stromkopfs an den Stationen; dazwischen weich, an den Stationen kurzes Verweilen
  const marken = [
    [0, 0.69],
    [2, 0.755],
    [5, 0.815],
    [8, 0.875],
    [10, 0.925],
  ];
  const kopf = (p) => {
    if (p <= marken[0][1]) return 0;
    for (let k = 1; k < marken.length; k++) {
      const [i0, p0] = marken[k - 1];
      const [i1, p1] = marken[k];
      if (p <= p1) {
        const t = (p - p0) / (p1 - p0);
        return cum[i0] + (cum[i1] - cum[i0]) * t * t * (3 - 2 * t);
      }
    }
    return total;
  };
  const punktBei = (s, out) => {
    for (let i = 1; i < pfad.length; i++) {
      if (s <= cum[i] || i === pfad.length - 1) {
        const t = Math.min(1, Math.max(0, (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1])));
        return out.lerpVectors(pfad[i - 1], pfad[i], t);
      }
    }
    return out;
  };

  const geo = ribbonGeometry(pfad, 0.6, 0.075);
  const mat = createFlowMaterial({ speed: 7, spacing: 8, base: 1.0 });
  mat.uniforms.uBaseColor.value.set('#c83c30');
  mat.uniforms.uPulseColor.value.set('#ffe3de');
  mat.uniforms.uLength.value = geo.userData.length;
  mat.polygonOffsetFactor = -4;
  mat.polygonOffsetUnits = -4;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 3;
  mesh.visible = false;

  const stringAnker = new THREE.Vector3().lerpVectors(pfad[0], pfad[1], 0.32).setY(0.5);
  const anchors = {
    cString: stringAnker,
    cWr: new THREE.Vector3(east + 0.9, 1.35, zr),
    cTrafo: new THREE.Vector3(tr.x, 2.8, tr.z),
    cNvp: new THREE.Vector3(nv.x, 3.1, nv.z),
    cBess: plant.anchors.bess.clone(),
  };
  return { mesh, mat, anchors, kopf, punktBei, total };
}

const varianteC = () => ({
  keys: (k, mobile) =>
    schluss(
      k,
      mobile
        ? {
            p: [0.72, 0.76, 0.82, 0.88, 0.93, 1.0],
            dist: [40, 30, 27, 30, 46, 210],
            az: [-40, -32, -22, -10, 8, 50],
            el: [52, 48, 44, 40, 34, 52],
            fov: [42, 42, 40, 40, 38, 38],
            toPlant: [0.05, 0.2, 0.4, 0.6, 0.8, 1],
            shiftY: [0.1, 0.1, 0.14, 0.14, 0.14, -0.26],
          }
        : {
            p: [0.72, 0.76, 0.82, 0.88, 0.93, 1.0],
            dist: [32, 25, 22, 25, 38, 128],
            az: [-40, -32, -22, -10, 8, -18],
            el: [50, 46, 42, 38, 32, 27],
            fov: [34, 34, 33, 33, 32, 30],
            toPlant: [0.05, 0.2, 0.4, 0.6, 0.8, 1],
            shiftX: [0.1, 0.1, 0.1, 0.1, 0.08, 0.04],
            shiftY: [0, 0, 0.02, 0.02, 0.03, 0.04],
          }
    ),
  stufen: {
    ...OHNE_ORT,
    build: [0.655, 0.79],
    inverters: [0.69, 0.75],
    trafo: [0.76, 0.8],
    pvRoute: [0.74, 0.8],
    bess: [0.8, 0.88],
    bessRoute: [0.86, 0.9],
    nvp: [0.82, 0.86],
    gridRoute: [0.84, 0.92],
    line: [0.88, 0.95],
    flowPv: [0.8, 0.86],
    flowBess: [0.9, 0.95],
    flowGrid: [0.92, 0.97],
  },
  dom(section, mobile) {
    ohne(section, ['haus', 'gewerbe']);
    const ende = {
      generator: '0.95,0.975,2,3',
      inverter: '0.955,0.98,2,3',
      trafo: '0.955,0.98,2,3',
      bess: '0.96,0.985,2,3',
      nvp: '0.96,0.985,2,3',
      grid: '0.93,0.955,2,3',
    };
    for (const [key, r] of Object.entries(ende)) {
      const el = section.querySelector(`[data-label="${key}"]`);
      el.dataset.range = r;
      // am Handy liegt das Textfeld zum Schluss über der Bildmitte: dort keine Schlusslabels
      el.dataset.rangeM = '-1,-0.9,-0.8,-0.7';
    }
    // im Hochformat entfällt der Zusatz nach dem Punkt, dort steht die Erklärung im Text selbst
    const stufe = (key, kurz, lang, extra, r, side) =>
      label(section, key, mobile ? { text: kurz, range: r, side } : { text: lang, extra, range: r, side });
    stufe('cString', 'String: Gleichstrom', 'String', ' · Gleichstrom aus den Modulen', '0.695,0.71,0.74,0.755');
    stufe('cWr', 'Wechselrichter', 'Wechselrichter', ' · aus Gleich- wird Wechselstrom', '0.745,0.76,0.8,0.815');
    stufe('cTrafo', 'Trafo: 20 kV', 'Trafostation', ' · Spannung auf 20 kV', '0.805,0.82,0.86,0.875', 'left');
    stufe('cNvp', 'Übergabestation', 'Übergabestation', ' · Messung und Schutz am NVP', '0.865,0.88,0.915,0.93');
    stufe('cBess', 'Batteriespeicher', 'Batteriespeicher', ' · am selben Netzanschluss', '0.875,0.895,0.92,0.935', 'left');
    schritt3(section, {
      titel: 'Vom Modul bis ins Netz',
      text: 'Im String fließt Gleichstrom zum Wechselrichter. Die Trafostation hebt die Spannung auf 20 kV, die Übergabestation misst und schützt am Netzverknüpfungspunkt. Wir planen jede Verbindung dazwischen und nehmen die Anlage in Betrieb.',
    });
  },
  szene(ctx) {
    bausteine(ctx);
    const pf = strompfad(ctx);
    ctx.scene.add(pf.mesh);
    const kopfPunkt = new THREE.Vector3();
    return {
      anchors: pf.anchors,
      ziel(p, target) {
        const w = win(p, 0.68, 0.72, 0.925, 0.985);
        if (w <= 0) return;
        pf.punktBei(pf.kopf(p), kopfPunkt).setY(0.8);
        target.lerp(kopfPunkt, w);
      },
      update(p, time) {
        const s = pf.kopf(p);
        // Label des Strings fährt kurz vor dem Stromkopf mit
        pf.punktBei(Math.min(s + 6, pf.total), pf.anchors.cString).setY(0.6);
        pf.mat.uniforms.uDraw.value = s / pf.total;
        pf.mat.uniforms.uFlow.value = range(p, 0.7, 0.75);
        pf.mat.uniforms.uTime.value = time;
        pf.mesh.visible = s > 0.01;
      },
    };
  },
});

/* ---------- D · Aus dem Modell wird eine Anlage ---------- */
const varianteD = () => {
  let foto = null;
  let bild = null;
  let zeile = null;
  return {
    keys: (k, mobile) =>
      schluss(
        k,
        mobile
          ? {
              p: [0.745, 0.87, 0.935, 1.0],
              dist: [9, 100, 140, 128],
              az: [2, 40, 40, 41],
              el: [58, 40, 50, 52],
              fov: [40, 38, 40, 40],
              toPlant: [0.04, 0.8, 0.48, 0.48],
              shiftY: [0.08, 0.12, 0.08, 0.08],
              offZ: [0, 0, -17, -17],
            }
          : {
              p: [0.745, 0.87, 0.935, 1.0],
              dist: [6.5, 70, 105, 96],
              az: [2, -14, 40, 41],
              el: [58, 34, 48, 50],
              fov: [36, 31, 32, 32],
              toPlant: [0.04, 0.8, 0.48, 0.48],
              shiftX: [0.02, 0.06, 0, 0],
              shiftY: [0, 0.03, 0, 0],
              offZ: [0, 0, -17, -17],
            }
      ),
    stufen: {
      ...OHNE_ORT,
      bess: [0.83, 0.89],
      bessRoute: [0.86, 0.9],
      nvp: [0.85, 0.89],
      gridRoute: [0.87, 0.91],
      line: [0.87, 0.93],
      flowBess: [0.88, 0.92],
      flowGrid: [0.9, 0.94],
    },
    dom(section, mobile) {
      ohne(section, ['haus', 'gewerbe', 'grid']);
      const aus = {
        generator: '0.79,0.84,0.9,0.925',
        inverter: '0.815,0.86,0.9,0.925',
        trafo: '0.835,0.875,0.9,0.925',
        bess: '0.85,0.88,0.905,0.93',
        nvp: '0.86,0.89,0.905,0.93',
      };
      for (const [key, r] of Object.entries(aus)) {
        const el = section.querySelector(`[data-label="${key}"]`);
        el.dataset.range = r;
        el.removeAttribute('data-range-m');
      }
      schritt3(section, {
        titel: 'Aus dem Modell wird eine Anlage',
        text: 'Was wir planen, bauen wir: Generator, Speicher und Netzanschluss bis zur Inbetriebnahme. Im Bild eine unserer Referenzen, die Freiflächenanlage an der A6.',
        link: { href: '/referenzen/freiflaeche-a6', text: 'Zur Referenz' },
      });
      const stage = section.querySelector('[data-story-stage]');
      foto = document.createElement('div');
      Object.assign(foto.style, { position: 'absolute', inset: '0', overflow: 'hidden', opacity: '0', pointerEvents: 'none' });
      bild = new Image();
      bild.src = fotoA6;
      bild.alt = '';
      bild.decoding = 'async';
      Object.assign(bild.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: mobile ? '62% 50%' : '50% 50%',
        transform: 'scale(1.08)',
        transformOrigin: '55% 50%',
      });
      foto.appendChild(bild);
      zeile = document.createElement('p');
      zeile.textContent = 'Freiflächenanlage an der A6 · Referenz';
      Object.assign(zeile.style, {
        position: 'absolute',
        right: mobile ? '1rem' : '2.5vw',
        bottom: mobile ? '1rem' : '5vh',
        margin: '0',
        padding: '0.45rem 0.7rem',
        fontFamily: 'var(--font-tech)',
        fontWeight: '500',
        fontSize: mobile ? '0.64rem' : '0.74rem',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--weiss)',
        background: 'var(--navy)',
        border: '1px solid var(--on-navy-line-strong)',
        opacity: '0',
      });
      foto.appendChild(zeile);
      stage.insertBefore(foto, stage.querySelector('[data-story-labels]'));
    },
    szene() {
      return {
        update(p) {
          if (!foto) return;
          const o = range(p, 0.93, 0.985);
          foto.style.opacity = o.toFixed(3);
          bild.style.transform = `scale(${(1.08 - 0.08 * o).toFixed(4)})`;
          zeile.style.opacity = range(p, 0.965, 0.99).toFixed(3);
        },
      };
    },
  };
};

const VARIANTEN = { a: varianteA, b: varianteB, c: varianteC, d: varianteD };

export function waehleVariante(name) {
  return { name, ...VARIANTEN[name]() };
}
