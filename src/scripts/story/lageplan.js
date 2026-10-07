// Lageplan der Anlage für Schritt 03: Die Kamera steigt aus dem Modul auf, in der Draufsicht
// zeichnet sich der Plan als feine Linien auf den Boden (vom Hauptmodul nach außen), danach
// wächst die Anlage aus dem Plan. Zum Schluss bleibt der Plan leise am Boden.
// Inhalt: Modultische mit Modulteilung, Hauptmodul rot umrandet, Wechselrichter, Stationen,
// Speicher, Kabeltrassen gestrichelt, Zaun, Maste und Trasse der Freileitung strichpunktiert,
// Maßketten (Reihenabstand, Tischlänge, aus dem Modell berechnet) und Nordpfeil.
import * as THREE from 'three';

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

/** Maß in Metern, deutsch formatiert, z. B. „8,00 m“ */
const meter = (v) => `${v.toFixed(2).replace('.', ',')} m`;

export function createLageplan({ layout: L, plant, heroSlot }) {
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
  // Maßlinie mit Schrägstrichen an den Enden wie im CAD
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
  T.routes.forEach((r) => muster(r.pts.map((v) => [v.x, v.z]), [1.4, 0.7], 0.7));
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

  // Reihenfolge des Zeichnens: Abstand zum Hauptmodul
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
  mesh.name = 'lageplan';
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  mesh.visible = false;

  return {
    mesh,
    anchors: {
      massReihe: new THREE.Vector3(xd, Y, (za + zb) / 2),
      massTisch: new THREE.Vector3((xa + xb) / 2, Y, zd),
      nord: new THREE.Vector3(nx, Y, nz - 5.4),
    },
    texte: { massReihe: meter(L.pitch), massTisch: meter(L.tableW) },
    /** draw: Fortschritt des Zeichnens 0…1, deckkraft: 0…1 */
    update(draw, deckkraft) {
      mat.uniforms.uDraw.value = draw;
      mat.uniforms.uOpacity.value = deckkraft;
      mesh.visible = draw > 0.001 && deckkraft > 0.001;
    },
  };
}
