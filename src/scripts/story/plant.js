// Die Gesamtanlage als technisches Modell: PV-Generator auf Freiflächentischen,
// String-Wechselrichter, Trafostation, Batteriespeicher, Übergabestation (NVP)
// und Anschluss an eine 20-kV-Freileitung, dazu der Ortsrand mit Einfamilienhaus und
// Gewerbehalle. Einheit: Meter, Süden = +Z.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MODULE } from './cellMaterial.js';

const mm = (v) => v / 1000;
const TILT = THREE.MathUtils.degToRad(20);

export function createLayout({ rows = 9, tablesPerRow = 3, modulesPerTable = 14 } = {}) {
  const modW = mm(MODULE.w);
  const modH = mm(MODULE.h);
  const gap = 0.02;
  const tableW = modulesPerTable * modW + (modulesPerTable - 1) * gap;
  const slope = 2 * modH + gap;
  const frontHeight = 0.8;
  const pitch = 8.0;
  const tableGap = 1.2;
  const rowW = tablesPerRow * tableW + (tablesPerRow - 1) * tableGap;
  const centerH = frontHeight + (slope / 2) * Math.sin(TILT);
  const depth = slope * Math.cos(TILT);

  // Modulorientierung: liegt in XY mit Normale +Z, wird auf 20° Süd geneigt
  const moduleQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + TILT, 0, 0));
  const slopeDir = new THREE.Vector3(0, 1, 0).applyQuaternion(moduleQuat); // hangaufwärts (Norden, oben)

  const tables = [];
  const modules = [];
  for (let r = 0; r < rows; r++) {
    for (let t = 0; t < tablesPerRow; t++) {
      const cx = -rowW / 2 + tableW / 2 + t * (tableW + tableGap);
      const cz = -r * pitch;
      const center = new THREE.Vector3(cx, centerH, cz);
      tables.push({ r, t, center });
      for (let mr = 0; mr < 2; mr++) {
        for (let c = 0; c < modulesPerTable; c++) {
          const x = cx - tableW / 2 + modW / 2 + c * (modW + gap);
          const along = (mr - 0.5) * (modH + gap);
          const p = center.clone().addScaledVector(slopeDir, along);
          p.x = x;
          modules.push({ r, t, c, mr, position: p });
        }
      }
    }
  }

  const east = rowW / 2;
  const west = -rowW / 2;
  const south = depth / 2 + 0.6;
  const north = -(rows - 1) * pitch - depth / 2;

  return {
    rows,
    tablesPerRow,
    modulesPerTable,
    modW,
    modH,
    tableW,
    slope,
    pitch,
    rowW,
    centerH,
    depth,
    moduleQuat,
    slopeDir,
    tables,
    modules,
    bounds: { east, west, south, north },
  };
}

/* ---------- Materialien des Modells ---------- */
function modelMaterials() {
  return {
    steel: new THREE.MeshStandardMaterial({ color: '#9aa1ad', roughness: 0.55, metalness: 0.6 }),
    concrete: new THREE.MeshStandardMaterial({ color: '#d9dbe2', roughness: 0.85, metalness: 0 }),
    container: new THREE.MeshStandardMaterial({ color: '#e9eaef', roughness: 0.6, metalness: 0.1 }),
    dark: new THREE.MeshStandardMaterial({ color: '#2a3247', roughness: 0.6, metalness: 0.2 }),
    trafo: new THREE.MeshStandardMaterial({ color: '#8f97a6', roughness: 0.5, metalness: 0.5 }),
    inverter: new THREE.MeshStandardMaterial({ color: '#eceef3', roughness: 0.45, metalness: 0.05 }),
    accent: new THREE.MeshStandardMaterial({ color: '#c83c30', roughness: 0.5, metalness: 0 }),
    roof: new THREE.MeshStandardMaterial({ color: '#737b8c', roughness: 0.8, metalness: 0.05 }),
  };
}

/* ---------- Unterkonstruktion (instanziert je Tisch) ---------- */
function tableStructure(L, mats) {
  const parts = [];
  const rafterXs = [-0.42, -0.21, 0, 0.21, 0.42].map((f) => f * L.tableW);
  const tan = Math.tan(TILT);
  const beamY = (z) => L.centerH - 0.13 - z * tan; // Unterkante Modulebene, Süden (+Z) tiefer
  const zf = (L.depth / 2) * 0.82;
  for (const x of rafterXs) {
    // Sparren entlang der Neigung
    const beam = new THREE.BoxGeometry(0.06, 0.1, L.slope * 0.96);
    beam.rotateX(TILT);
    beam.translate(x, L.centerH - 0.13, 0);
    parts.push(beam);
    // vorderer und hinterer Rammpfosten
    const hf = beamY(zf) - 0.04;
    const hr = beamY(-zf) - 0.04;
    parts.push(new THREE.BoxGeometry(0.09, hf, 0.13).translate(x, hf / 2, zf));
    parts.push(new THREE.BoxGeometry(0.09, hr, 0.13).translate(x, hr / 2, -zf));
  }
  // Pfetten quer unter den Modulen
  for (const s of [-0.38, -0.12, 0.12, 0.38]) {
    const along = s * L.slope;
    const pur = new THREE.BoxGeometry(L.tableW * 0.99, 0.05, 0.08);
    pur.rotateX(TILT);
    pur.translate(0, L.centerH - 0.06 + along * Math.sin(TILT), -along * Math.cos(TILT));
    parts.push(pur);
  }
  return new THREE.Mesh(mergeGeometries(parts, false), mats.steel);
}

/* ---------- Box mit Ursprung am Boden (für das Hochwachsen) ---------- */
function groundBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  return g;
}

/** Kantenlinien wie im Planungsmodell */
const edgeMat = new THREE.LineBasicMaterial({ color: '#0c1a3d', transparent: true, opacity: 0.55 });
function withEdges(group) {
  group.traverse((o) => {
    if (o.isMesh && !o.userData.noEdges) {
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 25), edgeMat);
      o.add(e);
    }
  });
  return group;
}

function bessContainer(mats) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(groundBox(6.06, 2.9, 2.44), mats.container);
  g.add(body);
  // Türen und Lüftungsgitter als dunkle Felder auf der Längsseite
  for (let i = 0; i < 4; i++) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.2, 0.02), mats.dark);
    door.position.set(-2.25 + i * 1.5, 1.25, 1.23);
    door.userData.noEdges = true;
    g.add(door);
  }
  // Klimagerät an der Stirnseite
  const hvac = new THREE.Mesh(groundBox(0.5, 1.6, 1.4), mats.inverter);
  hvac.position.set(3.28, 0.55, 0);
  g.add(hvac);
  return withEdges(g);
}

function pcsSkid(mats) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(groundBox(6.2, 0.25, 2.6), mats.concrete);
  g.add(base);
  const inv = new THREE.Mesh(groundBox(2.6, 2.3, 1.4), mats.inverter);
  inv.position.set(-1.5, 0.25, 0);
  g.add(inv);
  const tr = new THREE.Mesh(groundBox(1.8, 1.9, 1.6), mats.trafo);
  tr.position.set(1.6, 0.25, 0);
  g.add(tr);
  // Kühlrippen
  for (let i = 0; i < 7; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.5), mats.trafo);
    fin.position.set(0.8 + i * 0.26, 1.2, 1.05);
    fin.userData.noEdges = true;
    g.add(fin);
  }
  return withEdges(g);
}

function station(mats, w, h, d) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(groundBox(w, h, d), mats.concrete);
  g.add(body);
  const roof = new THREE.Mesh(groundBox(w + 0.25, 0.14, d + 0.25), mats.concrete);
  roof.position.y = h;
  g.add(roof);
  for (let i = 0; i < 3; i++) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 0.02), mats.dark);
    door.position.set(-w / 2 + 0.8 + i * ((w - 1.6) / 2), 1.0, d / 2 + 0.01);
    door.userData.noEdges = true;
    g.add(door);
  }
  return withEdges(g);
}

function inverterUnit(mats) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(groundBox(0.08, 1.1, 0.08), mats.steel);
  g.add(post);
  const box = new THREE.Mesh(groundBox(0.62, 0.72, 0.3), mats.inverter);
  box.position.y = 0.55;
  g.add(box);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.01), mats.accent);
  stripe.position.set(0, 1.12, 0.155);
  stripe.userData.noEdges = true;
  g.add(stripe);
  return withEdges(g);
}

/* ---------- Ortsrand: Einfamilienhaus und Gewerbehalle mit PV, Speicher und Ladepunkten ---------- */
const flat = (g) => (g.index ? g.toNonIndexed() : g);

/** Teile gleichen Materials zu einem Mesh zusammenführen (wenige Draw-Calls) */
function mergedMesh(parts, mat, edges = true) {
  const mesh = new THREE.Mesh(mergeGeometries(parts.map(flat), false), mat);
  mesh.userData.noEdges = !edges;
  return mesh;
}

/** dünne Fläche auf einer Fassade (Fenster, Tor, Tür); Normale in ±x oder ±z */
function facadePanel(w, h, x, y, z, normal = 'z') {
  return normal === 'z' ? new THREE.BoxGeometry(w, h, 0.02).translate(x, y + h / 2, z) : new THREE.BoxGeometry(0.02, h, w).translate(x, y + h / 2, z);
}

/** Modulplätze auf einer nach Süden geneigten Ebene: Mitte der Modulreihe, Neigung, Spalten */
function moduleRow(slots, { x0, y, z, tilt, cols }) {
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + tilt, 0, 0));
  const step = mm(MODULE.w) + 0.02;
  for (let c = 0; c < cols; c++) slots.push({ position: new THREE.Vector3(x0 + c * step, y, z), quaternion: quat });
}

function einfamilienhaus(mats) {
  const W = 10;
  const D = 9;
  const HW = 5.4;
  const a = THREE.MathUtils.degToRad(35);
  const HF = HW + (D / 2) * Math.tan(a);
  const g = new THREE.Group();

  // Baukörper mit Giebeln: Hausquerschnitt in z/y, entlang x extrudiert (First Ost-West)
  const profil = new THREE.Shape();
  profil.moveTo(-D / 2, 0);
  profil.lineTo(D / 2, 0);
  profil.lineTo(D / 2, HW);
  profil.lineTo(0, HF);
  profil.lineTo(-D / 2, HW);
  profil.closePath();
  const body = new THREE.ExtrudeGeometry(profil, { depth: W, bevelEnabled: false, curveSegments: 1 });
  body.rotateY(-Math.PI / 2).translate(W / 2, 0, 0);

  // Carport an der Ostseite
  const cx = W / 2 + 1.8;
  const carport = [groundBox(3.6, 0.15, 5.9).translate(cx, 2.6, 1.6)];
  for (const z of [-1.1, 4.3]) carport.push(groundBox(0.14, 2.6, 0.14).translate(W / 2 + 3.4, 0, z));
  g.add(mergedMesh([body], mats.container));
  g.add(mergedMesh(carport, mats.steel));

  // Dachflächen mit Überstand
  const t = 0.25;
  const L = D / 2 / Math.cos(a) + 0.55;
  const ridge = new THREE.Vector3(0, HF, 0);
  const slabs = [1, -1].map((s) => {
    const dir = new THREE.Vector3(0, -Math.sin(a), s * Math.cos(a));
    const n = new THREE.Vector3(0, Math.cos(a), s * Math.sin(a));
    const c = ridge.clone().addScaledVector(dir, L / 2).addScaledVector(n, t / 2);
    return new THREE.BoxGeometry(W + 0.8, t, L).rotateX(s * a).translate(c.x, c.y, c.z);
  });
  g.add(mergedMesh(slabs, mats.roof));

  // Fenster und Haustür (Süd- und Westseite), dunkel ohne Kanten
  const zS = D / 2 + 0.01;
  const xW = -W / 2 - 0.01;
  const dunkel = [
    facadePanel(1.5, 1.35, -3, 0.9, zS),
    facadePanel(2.4, 2.25, 2.6, 0, zS),
    facadePanel(1.1, 2.2, -0.6, 0, zS),
    facadePanel(1.2, 1.2, -3, 3.4, zS),
    facadePanel(1.2, 1.2, 0, 3.4, zS),
    facadePanel(1.2, 1.2, 3, 3.4, zS),
    facadePanel(1.3, 1.3, xW, 0.9, -1.6, 'x'),
    facadePanel(1.3, 1.3, xW, 0.9, 1.9, 'x'),
    facadePanel(1.0, 1.0, xW, 3.5, 0, 'x'),
    facadePanel(0.8, 0.8, xW, 6.0, 0, 'x'),
  ];
  g.add(mergedMesh(dunkel, mats.dark, false));

  // Heimspeicher und Wallbox an der Hauswand unter dem Carport
  const xO = W / 2;
  g.add(mergedMesh([groundBox(0.3, 1.25, 0.75).translate(xO + 0.15, 0.15, 0.4), groundBox(0.16, 0.48, 0.34).translate(xO + 0.08, 1.05, 2.9)], mats.inverter));
  g.add(mergedMesh([new THREE.BoxGeometry(0.02, 0.05, 0.75).translate(xO + 0.31, 1.3, 0.4), new THREE.BoxGeometry(0.02, 0.05, 0.34).translate(xO + 0.17, 1.47, 2.9)], mats.accent, false));

  // PV auf der Südseite: 2 Reihen mit je 6 Modulen hochkant
  const slots = [];
  const lift = t + 0.09;
  const n = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
  const down = new THREE.Vector3(0, -Math.sin(a), Math.cos(a));
  const mH = mm(MODULE.h) + 0.02;
  for (const r of [0, 1]) {
    const c = ridge.clone().addScaledVector(down, 0.5 + mH / 2 + r * mH).addScaledVector(n, lift);
    moduleRow(slots, { x0: -2.5 * (mm(MODULE.w) + 0.02), y: c.y, z: c.z, tilt: a, cols: 6 });
  }

  return { group: withEdges(g), slots, anchor: new THREE.Vector3(-0.4, HF + 0.6, 0) };
}

function gewerbehalle(mats) {
  const W = 24;
  const D = 13;
  const H = 6.5;
  const g = new THREE.Group();

  // Halle mit Attika
  const at = 0.6;
  const th = 0.3;
  const halle = [
    groundBox(W, H, D),
    groundBox(W, at, th).translate(0, H, D / 2 - th / 2),
    groundBox(W, at, th).translate(0, H, -D / 2 + th / 2),
    groundBox(th, at, D - 2 * th).translate(W / 2 - th / 2, H, 0),
    groundBox(th, at, D - 2 * th).translate(-W / 2 + th / 2, H, 0),
  ];
  g.add(mergedMesh(halle, mats.container));

  // Tore, Fensterband und Eingang (Süd), Fensterband (West), Türen der Speicherschränke (Ost)
  const zS = D / 2 + 0.01;
  const xS = W / 2 + 1.4;
  const dunkel = [
    facadePanel(4, 4.2, 4.5, 0, zS),
    facadePanel(4, 4.2, 9.2, 0, zS),
    facadePanel(12.5, 1.1, -5, 4.1, zS),
    facadePanel(1.3, 2.4, -9, 0, zS),
    facadePanel(D - 4, 1.1, -W / 2 - 0.01, 4.1, 0, 'x'),
    facadePanel(1.15, 1.9, xS + 0.66, 0.2, -0.6, 'x'),
    facadePanel(1.15, 1.9, xS + 0.66, 0.2, 1.2, 'x'),
  ];
  g.add(mergedMesh(dunkel, mats.dark, false));

  // Gewerbespeicher: zwei Außenschränke an der Ostseite; drei Ladesäulen vor der Halle
  const lade = [-9, -5.5, -2];
  const zL = D / 2 + 4.2;
  const geraete = [groundBox(1.3, 2.3, 1.6).translate(xS, 0, -0.6), groundBox(1.3, 2.3, 1.6).translate(xS, 0, 1.2)];
  lade.forEach((x) => geraete.push(groundBox(0.45, 1.75, 0.3).translate(x, 0, zL)));
  g.add(mergedMesh(geraete, mats.inverter));
  const akzent = [new THREE.BoxGeometry(0.02, 0.06, 1.6).translate(xS + 0.66, 2.15, -0.6), new THREE.BoxGeometry(0.02, 0.06, 1.6).translate(xS + 0.66, 2.15, 1.2)];
  lade.forEach((x) => akzent.push(new THREE.BoxGeometry(0.46, 0.08, 0.31).translate(x, 1.5, zL)));
  g.add(mergedMesh(akzent, mats.accent, false));

  // Stellplätze vor den Ladesäulen
  const linien = [];
  for (const x of [-10.75, -7.25, -3.75, -0.25]) linien.push(x, 0.03, zL + 0.5, x, 0.03, zL + 5.5);
  linien.push(-10.75, 0.03, zL + 5.5, -0.25, 0.03, zL + 5.5);
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(linien, 3));
  g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#e8e7ef', transparent: true, opacity: 0.5 })));

  // PV auf dem Flachdach: 3 Reihen nach Süden, 15° aufgeständert, je 2 Felder mit 8 Modulen
  const slots = [];
  const tilt = THREE.MathUtils.degToRad(15);
  const yM = H + 0.25 + (mm(MODULE.h) / 2) * Math.sin(tilt);
  const feld = 8 * (mm(MODULE.w) + 0.02) - 0.02;
  for (const z of [-3.7, -0.1, 3.5]) {
    for (const s of [-1, 1]) moduleRow(slots, { x0: s * (feld / 2 + 0.6) - feld / 2 + mm(MODULE.w) / 2, y: yM, z, tilt, cols: 8 });
  }

  return { group: withEdges(g), slots, anchor: new THREE.Vector3(-2.5, H + 1.4, -1) };
}

/* ---------- Energiefluss-Bänder auf Kabeltrassen ---------- */
const flowVertex = /* glsl */ `
attribute float aDist;
varying float vDist;
varying vec2 vUv;
#include <common>
#include <fog_pars_vertex>
void main() {
  vDist = aDist;
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const flowFragment = /* glsl */ `
uniform float uTime;
uniform float uDraw;
uniform float uLength;
uniform float uFlow;
uniform float uSpeed;
uniform float uSpacing;
uniform float uDir;
uniform float uBase;
uniform vec3 uBaseColor;
uniform vec3 uPulseColor;
varying float vDist;
varying vec2 vUv;
#include <common>
#include <fog_pars_fragment>
void main() {
  float drawn = step(vDist, uDraw * uLength);
  if (drawn < 0.5) discard;
  float across = abs(vUv.y - 0.5) * 2.0;
  float core = 1.0 - smoothstep(0.35, 1.0, across);
  float phase = fract((vDist * uDir) / uSpacing - uTime * uSpeed / uSpacing);
  float comet = smoothstep(0.0, 0.05, phase) * (1.0 - smoothstep(0.05, 0.5, phase));
  // Kopf am Zeichnungsende
  float head = smoothstep(uDraw * uLength - 1.2, uDraw * uLength, vDist) * step(uDraw, 0.999);
  vec3 col = uBaseColor * uBase * core + uPulseColor * (comet * uFlow + head) * core * 1.6;
  float a = clamp(uBase * core * 0.9 + (comet * uFlow + head) * core, 0.0, 1.0);
  gl_FragColor = vec4(col, a);
  #include <fog_fragment>
}`;

export function createFlowMaterial({ speed = 9, spacing = 14, base = 0.42 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uDraw: { value: 0 },
        uLength: { value: 1 },
        uFlow: { value: 0 },
        uSpeed: { value: speed },
        uSpacing: { value: spacing },
        uDir: { value: 1 },
        uBase: { value: base },
        uBaseColor: { value: new THREE.Color('#e8e7ef') },
        uPulseColor: { value: new THREE.Color('#c83c30') },
      },
    ]),
    vertexShader: flowVertex,
    fragmentShader: flowFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}

/** Flaches Band entlang eines Linienzugs (auf dem Boden). */
export function ribbonGeometry(points, width = 0.35, y = 0.04) {
  const pos = [];
  const uv = [];
  const dist = [];
  const idx = [];
  let acc = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dir = new THREE.Vector3().subVectors(next, prev).setY(0).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2);
    if (i > 0) acc += p.distanceTo(points[i - 1]);
    pos.push(p.x + side.x, (p.y ?? 0) + y, p.z + side.z, p.x - side.x, (p.y ?? 0) + y, p.z - side.z);
    uv.push(acc, 0, acc, 1);
    dist.push(acc, acc);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aDist', new THREE.Float32BufferAttribute(dist, 1));
  g.setIndex(idx);
  g.userData.length = acc;
  return g;
}

/** Linie (z. B. Leiterseil) mit Distanz-Attribut. */
function lineGeometry(points) {
  const pos = [];
  const dist = [];
  const uv = [];
  let acc = 0;
  points.forEach((p, i) => {
    if (i > 0) acc += p.distanceTo(points[i - 1]);
    pos.push(p.x, p.y, p.z);
    dist.push(acc);
    uv.push(acc, 0.5);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aDist', new THREE.Float32BufferAttribute(dist, 1));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.userData.length = acc;
  return g;
}

function catenary(a, b, sag, n = 28) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= sag * 4 * t * (1 - t);
    pts.push(p);
  }
  return pts;
}

/* ---------- Bodenraster (Planungsmodell) ---------- */
function groundGrid() {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Color('#e8e7ef') },
        uSite: { value: new THREE.Vector4(-30, -70, 60, 26) },
      },
    ]),
    vertexShader: /* glsl */ `
      varying vec3 vW;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uColor;
      uniform vec4 uSite;
      varying vec3 vW;
      #include <common>
      #include <fog_pars_fragment>
      float gridLine(vec2 p, float spacing, float width) {
        vec2 g = abs(fract(p / spacing - 0.5) - 0.5) * spacing;
        vec2 fw = fwidth(p);
        vec2 l = 1.0 - smoothstep(vec2(width) * 0.5, vec2(width) * 0.5 + fw * 1.2, g);
        // bei zu feinem Raster ausblenden
        float fade = 1.0 - smoothstep(spacing * 0.08, spacing * 0.3, max(fw.x, fw.y));
        return max(l.x, l.y) * fade;
      }
      void main() {
        vec2 p = vW.xz;
        float minor = gridLine(p, 5.0, 0.03) * 0.045;
        float major = gridLine(p, 25.0, 0.06) * 0.11;
        // Grundstücksfläche
        vec2 lo = uSite.xy;
        vec2 hi = uSite.zw;
        vec2 fw = fwidth(p);
        vec2 inLo = smoothstep(lo - fw, lo + fw, p);
        vec2 inHi = 1.0 - smoothstep(hi - fw, hi + fw, p);
        float site = inLo.x * inLo.y * inHi.x * inHi.y;
        float a = max(minor, major) * (1.0 - site * 0.5) + site * 0.04;
        // Grundstücksgrenze gestrichelt
        vec2 dEdge = min(abs(p - lo), abs(p - hi));
        float edgeX = (1.0 - smoothstep(0.06, 0.06 + fw.x * 1.5, dEdge.x)) * step(lo.y, p.y) * step(p.y, hi.y);
        float edgeZ = (1.0 - smoothstep(0.06, 0.06 + fw.y * 1.5, dEdge.y)) * step(lo.x, p.x) * step(p.x, hi.x);
        float dash = step(0.45, fract((p.x + p.y) / 2.2));
        a += max(edgeX, edgeZ) * dash * 0.55;
        gl_FragColor = vec4(uColor, a * uOpacity);
        #include <fog_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    fog: true,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), mat);
  mesh.renderOrder = -2;
  return mesh;
}

/* ---------- Gesamtanlage ---------- */
export function createPlant({ layout, moduleGeometry, moduleMaterials, heroIndex, quality }) {
  const L = layout;
  const mats = modelMaterials();
  const group = new THREE.Group();
  group.name = 'plant';

  // Module (instanziert)
  const count = L.modules.length;
  const modules = new THREE.InstancedMesh(moduleGeometry, moduleMaterials, count);
  modules.castShadow = quality.shadows;
  modules.receiveShadow = quality.shadows;
  modules.frustumCulled = false;
  const heroPos = L.modules[heroIndex].position;
  const maxDist = L.modules.reduce((m, md) => Math.max(m, md.position.distanceTo(heroPos)), 0);
  const delays = new Float32Array(count);
  L.modules.forEach((md, i) => {
    // Wellenausbreitung vom Hauptmodul aus, leichte Zufallsstreuung
    const d = md.position.distanceTo(heroPos) / maxDist;
    delays[i] = Math.pow(d, 0.72) * 0.86 + ((i * 7919) % 97) / 97 * 0.04;
  });
  delays[heroIndex] = 0;
  group.add(modules);

  // Unterkonstruktion je Tisch (instanziert)
  const tableMesh = tableStructure(L, mats);
  const tables = new THREE.InstancedMesh(tableMesh.geometry, mats.steel, L.tables.length);
  tables.castShadow = quality.shadows;
  tables.receiveShadow = false;
  tables.frustumCulled = false;
  const tableDelays = L.tables.map((t) => {
    const c = new THREE.Vector3(t.center.x, L.centerH, t.center.z);
    return Math.pow(c.distanceTo(heroPos) / maxDist, 0.72) * 0.86;
  });
  group.add(tables);

  // Wechselrichter am Ostende jeder Reihe
  const { east, west, south, north } = L.bounds;
  const inverters = [];
  for (let r = 0; r < L.rows; r++) {
    const inv = inverterUnit(mats);
    inv.position.set(east + 0.9, 0, -r * L.pitch + 1.4);
    inv.rotation.y = -Math.PI / 2;
    inv.userData.delay = r / L.rows;
    inverters.push(inv);
    group.add(inv);
  }

  // Betriebsgebäude und Speicher südöstlich des Generators
  const trafo = station(mats, 3.4, 2.5, 2.6);
  trafo.position.set(east + 6.5, 0, 3.2);
  group.add(trafo);

  const bess = new THREE.Group();
  const bx0 = east + 14.5;
  const bessCols = 2;
  const bessRows = 3;
  for (let c = 0; c < bessCols; c++) {
    for (let k = 0; k < bessRows; k++) {
      const ct = bessContainer(mats);
      ct.position.set(bx0 + c * 10.5, 0, -10.4 + k * 5.2);
      ct.userData.delay = (c * bessRows + k) / (bessCols * bessRows);
      bess.add(ct);
    }
  }
  for (let k = 0; k < 2; k++) {
    const sk = pcsSkid(mats);
    sk.position.set(bx0 + 5.25, 0, -7.8 + k * 5.2);
    sk.rotation.y = Math.PI / 2;
    sk.scale.set(0.8, 1, 0.8);
    sk.userData.delay = 0.3 + k * 0.2;
    bess.add(sk);
  }
  group.add(bess);

  const nvp = station(mats, 5.2, 2.8, 3.0);
  nvp.position.set(bx0 + 5.25, 0, 11.5);
  group.add(nvp);

  // Grundstück
  const site = {
    x0: west - 4,
    z0: north - 4,
    x1: bx0 + 10.5 + 7,
    z1: nvp.position.z + 5.5,
  };

  // 20-kV-Freileitung: vom Kabelendmast an der Übergabestation nach Nordosten ins Netz
  const poles = new THREE.Group();
  const lineStart = new THREE.Vector3(site.x1 + 5, 0, nvp.position.z);
  const lineDir = new THREE.Vector3(0.5, 0, -0.87).normalize();
  const lineNormal = new THREE.Vector3(-lineDir.z, 0, lineDir.x);
  const span = 52;
  const poleCount = 7;
  const poleH = 11.5;
  const conductorPts = [[], [], []];
  const armOffsets = [-1.1, 0, 1.1];
  const poleXs = [];
  for (let i = 0; i < poleCount; i++) {
    const base = lineStart.clone().addScaledVector(lineDir, i * span);
    poleXs.push(base.x);
    const pole = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, poleH, 8).translate(0, poleH / 2, 0), mats.concrete);
    pole.add(shaft);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.6), mats.steel);
    arm.position.y = poleH - 0.6;
    pole.add(arm);
    armOffsets.forEach((o) => {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.42, 8), mats.dark);
      ins.position.set(0, poleH - 0.32, o);
      pole.add(ins);
    });
    pole.position.copy(base);
    pole.rotation.y = Math.atan2(lineDir.x, lineDir.z) + Math.PI / 2;
    pole.userData.delay = i / poleCount;
    poles.add(pole);
    armOffsets.forEach((o, k) => conductorPts[k].push(base.clone().addScaledVector(lineNormal, o).setY(poleH - 0.12)));
  }
  group.add(poles);

  const conductorMat = createFlowMaterial({ speed: 16, spacing: 30, base: 0.55 });
  const conductors = new THREE.Group();
  conductorPts.forEach((pts) => {
    let all = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const seg = catenary(pts[i], pts[i + 1], 1.3);
      all = all.concat(i ? seg.slice(1) : seg);
    }
    // Weiterführung in die Ferne (verschwindet im Nebel)
    const last = pts[pts.length - 1];
    const far = last.clone().addScaledVector(lineDir, 420);
    all = all.concat(catenary(last, far, 4, 40).slice(1));
    const g = lineGeometry(all);
    const line = new THREE.Line(g, conductorMat);
    line.userData.length = g.userData.length;
    conductors.add(line);
  });
  conductorMat.uniforms.uLength.value = Math.max(...conductors.children.map((c) => c.userData.length));
  group.add(conductors);

  // Ortsrand südlich des Zauns: Einfamilienhaus und Gewerbehalle, versorgt über eine
  // Ortsnetzstation am selben 20-kV-Netz
  const ortZ = site.z1 + 16;
  const haus = einfamilienhaus(mats);
  haus.group.position.set(site.x1 - 40, 0, ortZ - 1);
  haus.group.userData.delay = 0;
  const halle = gewerbehalle(mats);
  halle.group.position.set(site.x1 - 11, 0, ortZ - 1);
  halle.group.userData.delay = 0.3;
  const ons = station(mats, 3.3, 2.4, 2.4);
  ons.position.set(lineStart.x, 0, site.z1 + 5);
  ons.userData.delay = 0.15;
  const ort = [haus.group, ons, halle.group];
  ort.forEach((o) => group.add(o));

  // Dachmodule beider Gebäude als ein instanziertes Objekt
  const dachSlots = [];
  for (const b of [haus, halle]) {
    b.group.updateMatrix();
    b.slots.forEach((sl, k) =>
      dachSlots.push({ position: sl.position.clone().applyMatrix4(b.group.matrix), quaternion: sl.quaternion, delay: b.group.userData.delay, k })
    );
  }
  const dach = new THREE.InstancedMesh(moduleGeometry, moduleMaterials, dachSlots.length);
  dach.frustumCulled = false;
  dach.visible = false;
  group.add(dach);

  // Kabeltrassen
  const routes = [];
  const flow = (pts, opts) => {
    const g = ribbonGeometry(pts, opts.width ?? 0.32);
    const m = createFlowMaterial(opts);
    m.uniforms.uLength.value = g.userData.length;
    const mesh = new THREE.Mesh(g, m);
    mesh.renderOrder = 2;
    group.add(mesh);
    routes.push({ mesh, mat: m, ...opts });
    return mesh;
  };

  // PV: Reihen-Wechselrichter → Sammeltrasse → Trafostation
  const collectorX = east + 2.6;
  const pvPts = [new THREE.Vector3(collectorX, 0, -(L.rows - 1) * L.pitch + 1.4)];
  pvPts.push(new THREE.Vector3(collectorX, 0, trafo.position.z));
  pvPts.push(new THREE.Vector3(trafo.position.x - 1.9, 0, trafo.position.z));
  flow(pvPts, { key: 'pv', width: 1.0 });
  for (let r = 0; r < L.rows; r++) {
    const z = -r * L.pitch + 1.4;
    flow([new THREE.Vector3(east + 1.2, 0, z), new THREE.Vector3(collectorX, 0, z)], { key: 'pv', width: 0.55, base: 0.3, spacing: 6, speed: 4 });
  }

  // Trafostation → Übergabestation (NVP)
  flow(
    [
      new THREE.Vector3(trafo.position.x, 0, trafo.position.z + 1.4),
      new THREE.Vector3(trafo.position.x, 0, nvp.position.z),
      new THREE.Vector3(nvp.position.x - 2.7, 0, nvp.position.z),
    ],
    { key: 'grid', width: 1.0 }
  );

  // Speicher ↔ Übergabestation
  flow(
    [
      new THREE.Vector3(bx0 + 5.25, 0, -0.2),
      new THREE.Vector3(bx0 + 5.25, 0, nvp.position.z - 1.6),
    ],
    { key: 'bess', width: 1.0, speed: 6, spacing: 9 }
  );

  // Übergabestation → Kabelendmast
  flow(
    [new THREE.Vector3(nvp.position.x + 2.7, 0, nvp.position.z), new THREE.Vector3(lineStart.x - 0.4, 0, nvp.position.z)],
    { key: 'grid', width: 1.0 }
  );

  // 20-kV-Netz → Ortsnetzstation → Gewerbehalle und Einfamilienhaus
  const zO = ons.position.z;
  const xAbzweig = halle.group.position.x + 7;
  flow([new THREE.Vector3(lineStart.x, 0, nvp.position.z + 0.6), new THREE.Vector3(lineStart.x, 0, zO - 1.3)], { key: 'ort', width: 1.0 });
  const nsp = { key: 'ort', width: 0.6, base: 0.32, spacing: 8, speed: 5 };
  flow(
    [
      new THREE.Vector3(ons.position.x - 1.75, 0, zO),
      new THREE.Vector3(haus.group.position.x + 2, 0, zO),
      new THREE.Vector3(haus.group.position.x + 2, 0, haus.group.position.z - 4.6),
    ],
    nsp
  );
  flow([new THREE.Vector3(xAbzweig, 0, zO), new THREE.Vector3(xAbzweig, 0, halle.group.position.z - 6.6)], nsp);

  // Boden
  const grid = groundGrid();
  grid.material.uniforms.uSite.value.set(site.x0, site.z0, site.x1, site.z1);
  group.add(grid);

  let shadowGround = null;
  if (quality.shadows) {
    shadowGround = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.32, depthWrite: false })
    );
    shadowGround.receiveShadow = true;
    shadowGround.position.y = 0.002;
    shadowGround.renderOrder = -1;
    group.add(shadowGround);
  }

  // Ankerpunkte für Beschriftungen
  const anchors = {
    generator: new THREE.Vector3(-L.rowW * 0.12, L.centerH + 1.6, -L.pitch * 3.2),
    inverter: new THREE.Vector3(east + 0.9, 1.3, -L.pitch * 2 + 1.4),
    trafo: new THREE.Vector3(trafo.position.x, 2.8, trafo.position.z),
    bess: new THREE.Vector3(bx0 + 10.5, 3.1, -5.2),
    nvp: new THREE.Vector3(nvp.position.x, 3.1, nvp.position.z),
    grid: lineStart.clone().addScaledVector(lineDir, span * 0.62).setY(poleH - 1.6),
    haus: haus.anchor.clone().add(haus.group.position),
    gewerbe: halle.anchor.clone().add(halle.group.position),
  };

  const center = new THREE.Vector3((site.x0 + site.x1) / 2, 0, (site.z0 + site.z1) / 2);
  // Bildmitte der Systemansicht: zwischen Generator und Speicher
  const focus = quality.mobile
    ? new THREE.Vector3(east - 8, 0, -(L.rows - 1) * L.pitch * 0.35)
    : new THREE.Vector3(east + 2.6, 0, -(L.rows - 1) * L.pitch * 0.25);

  /* ---------- Aufbau-Animation, gesteuert über Fortschrittswerte ---------- */
  const m4 = new THREE.Matrix4();
  const q = L.moduleQuat;
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const tableQuat = new THREE.Quaternion();

  // Reihe des Hauptmoduls: steht schon im Einstieg, der Aufbau wächst später um sie herum
  const heroRow = L.modules[heroIndex].r;
  let lastBuild = -1;
  let lastRow = -1;
  function setBuild(build, hideHero, row = 0) {
    if (Math.abs(build - lastBuild) < 1e-5 && Math.abs(row - lastRow) < 1e-5 && !hideHero.changed) return;
    lastBuild = build;
    lastRow = row;
    for (let i = 0; i < count; i++) {
      const md = L.modules[i];
      let k = i === heroIndex ? 0 : easeOut(clamp01((build - delays[i]) / 0.14));
      if (md.r === heroRow && i !== heroIndex) k = Math.max(k, row);
      if (i === heroIndex && hideHero.value) k = 0;
      s.setScalar(Math.max(k, 1e-4));
      p.copy(md.position);
      p.y += (1 - k) * 0.9;
      m4.compose(p, q, s);
      modules.setMatrixAt(i, m4);
    }
    modules.instanceMatrix.needsUpdate = true;
    L.tables.forEach((t, i) => {
      let k = easeOut(clamp01((build - tableDelays[i] + 0.04) / 0.16));
      if (t.r === heroRow) k = Math.max(k, row);
      // noch nicht begonnene Tische ganz ausblenden (sonst liegen sie flach auf dem Boden)
      const xz = k > 0.001 ? 1 : 1e-4;
      s.set(xz, Math.max(k, 1e-4), xz);
      p.set(t.center.x, 0, t.center.z);
      m4.compose(p, tableQuat, s);
      tables.setMatrixAt(i, m4);
    });
    tables.instanceMatrix.needsUpdate = true;
  }

  // Dachmodule setzen sich nach dem Gebäude von oben auf das Dach
  let lastOrt = -1;
  function setOrt(k) {
    if (Math.abs(k - lastOrt) < 1e-5) return;
    lastOrt = k;
    dachSlots.forEach((d, i) => {
      const kk = easeOut(clamp01((k - d.delay * 0.5 - 0.45 - (d.k % 12) * 0.008) / 0.22));
      s.setScalar(Math.max(kk, 1e-4));
      p.copy(d.position);
      p.y += (1 - kk) * 0.9;
      m4.compose(p, d.quaternion, s);
      dach.setMatrixAt(i, m4);
    });
    dach.instanceMatrix.needsUpdate = true;
    dach.visible = k > 0.45;
  }

  const grow = (obj, k) => {
    obj.scale.y = Math.max(easeOut(clamp01(k)), 1e-4);
    obj.visible = k > 0.001;
  };

  function setStage(st) {
    // st: { grid, inverters, trafo, bess, nvp, ort, line, pvRoute, bessRoute, gridRoute, ortRoute, flow…, time }
    grid.material.uniforms.uOpacity.value = st.grid;
    grid.visible = st.grid > 0.001;
    inverters.forEach((inv) => grow(inv, (st.inverters - inv.userData.delay * 0.6) / 0.4));
    grow(trafo, st.trafo);
    bess.children.forEach((c) => grow(c, (st.bess - c.userData.delay * 0.55) / 0.45));
    grow(nvp, st.nvp);
    ort.forEach((o) => grow(o, (st.ort - o.userData.delay * 0.5) / 0.5));
    setOrt(st.ort);
    poles.children.forEach((pl) => grow(pl, (st.line - pl.userData.delay * 0.5) / 0.5));
    conductors.visible = st.line > 0.02;
    conductorMat.uniforms.uDraw.value = clamp01((st.line - 0.2) / 0.8);
    conductorMat.uniforms.uFlow.value = st.flowGrid;
    conductorMat.uniforms.uTime.value = st.time;
    for (const r of routes) {
      const d = r.key === 'pv' ? st.pvRoute : r.key === 'bess' ? st.bessRoute : r.key === 'ort' ? st.ortRoute : st.gridRoute;
      const f = r.key === 'pv' ? st.flowPv : r.key === 'bess' ? st.flowBess : r.key === 'ort' ? st.flowOrt : st.flowGrid;
      r.mat.uniforms.uDraw.value = d;
      r.mat.uniforms.uFlow.value = f;
      r.mat.uniforms.uTime.value = st.time;
      r.mesh.visible = d > 0.001;
    }
    if (shadowGround) shadowGround.visible = st.grid > 0.01;
  }

  return {
    group,
    modules,
    tables,
    anchors,
    center,
    focus,
    site,
    setBuild,
    setStage,
    heroPosition: heroPos.clone(),
  };
}
