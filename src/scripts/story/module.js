// Geometrie eines PV-Moduls: Glas-/Zellfläche, Aluminiumrahmen mit Gehrung,
// Rückseitenfolie und drei Anschlussdosen. Einheit: Meter. Lokales System:
// X = Breite, Y = Länge, Z = Flächennormale (Vorderseite +Z).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MODULE } from './cellMaterial.js';

const mm = (v) => v / 1000;

// Rahmenprofil (u = Abstand nach innen ab Außenkante, v = Höhe), in mm.
// Oben die Glasabdecklippe, außen die Wand, unten der Montageflansch.
const PROFILE = [
  [0.6, -17.5],
  [26, -17.5],
  [26, -15.7],
  [2.0, -15.7],
  [2.0, 9.6],
  [11, 9.6],
  [11, 17.5],
  [0.7, 17.5],
  [0, 16.8],
  [0, -16.9],
];

export const GLASS_Z = mm(15.4);
export const BACK_Z = mm(11.4);

/** Rahmen als ein Mesh mit 45°-Gehrungen an den Ecken. */
function frameGeometry(W, H) {
  const corners = [
    new THREE.Vector2(-W / 2, -H / 2),
    new THREE.Vector2(W / 2, -H / 2),
    new THREE.Vector2(W / 2, H / 2),
    new THREE.Vector2(-W / 2, H / 2),
  ];
  const pos = [];
  const nrm = [];
  const uvs = [];

  for (let s = 0; s < 4; s++) {
    const A = corners[s];
    const B = corners[(s + 1) % 4];
    const d = new THREE.Vector2().subVectors(B, A).normalize();
    const n = new THREE.Vector2(-d.y, d.x); // nach innen (gegen den Uhrzeigersinn)
    const len = A.distanceTo(B);

    for (let i = 0; i < PROFILE.length; i++) {
      const [u0, v0] = PROFILE[i];
      const [u1, v1] = PROFILE[(i + 1) % PROFILE.length];
      const p = (u, v, end) => {
        const uu = mm(u);
        const base = end ? B.clone().addScaledVector(d, -uu) : A.clone().addScaledVector(d, uu);
        base.addScaledVector(n, uu);
        return new THREE.Vector3(base.x, base.y, mm(v));
      };
      const a0 = p(u0, v0, false);
      const a1 = p(u1, v1, false);
      const b0 = p(u0, v0, true);
      const b1 = p(u1, v1, true);

      // Flächennormale des Profilsegments, nach außen gerichtet
      const e1 = new THREE.Vector3().subVectors(a1, a0);
      const e2 = new THREE.Vector3().subVectors(b0, a0);
      const fn = new THREE.Vector3().crossVectors(e1, e2).normalize();
      // Wicklung so wählen, dass die Dreiecksnormale zur Flächennormale passt
      let tri = [a0, b0, b1, a0, b1, a1];
      const g0 = new THREE.Vector3().crossVectors(
        new THREE.Vector3().subVectors(tri[1], tri[0]),
        new THREE.Vector3().subVectors(tri[2], tri[0])
      );
      if (g0.dot(fn) < 0) tri = [a0, b1, b0, a0, a1, b1];
      for (const v of tri) {
        pos.push(v.x, v.y, v.z);
        nrm.push(fn.x, fn.y, fn.z);
        const t = new THREE.Vector2(v.x, v.y).sub(A).dot(d) / len;
        uvs.push(t, (v.z + mm(17.5)) / mm(35));
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return g;
}

function junctionBoxes() {
  const parts = [];
  const xs = [-0.33, 0, 0.33];
  for (const x of xs) {
    const box = new THREE.BoxGeometry(0.072, 0.052, 0.016, 1, 1, 1);
    box.translate(x, 0, BACK_Z - 0.008);
    parts.push(box);
    const lid = new THREE.BoxGeometry(0.06, 0.04, 0.004);
    lid.translate(x, 0, BACK_Z - 0.018);
    parts.push(lid);
  }
  // Kabel der äußeren Dosen mit Steckverbindern
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.33, 0.02, BACK_Z - 0.01),
      new THREE.Vector3(side * 0.34, 0.12, BACK_Z - 0.012),
      new THREE.Vector3(side * 0.3, 0.26, BACK_Z - 0.014),
      new THREE.Vector3(side * 0.24, 0.33, BACK_Z - 0.014),
    ]);
    parts.push(new THREE.TubeGeometry(curve, 24, 0.003, 6, false));
    const plug = new THREE.CylinderGeometry(0.008, 0.008, 0.06, 10);
    plug.rotateZ(Math.PI / 2 + side * 0.9);
    plug.translate(side * 0.215, 0.35, BACK_Z - 0.014);
    parts.push(plug);
  }
  return mergeGeometries(parts.map((p) => p.index ? p.toNonIndexed() : p), false);
}

/**
 * Liefert eine zusammengeführte Geometrie mit Gruppen:
 * 0 = Vorderseite (Zellmaterial), 1 = Rahmen, 2 = Rückseite, 3 = Anschlussdosen.
 */
export function createModuleGeometry({ detail = true } = {}) {
  const W = mm(MODULE.w);
  const H = mm(MODULE.h);

  const front = new THREE.PlaneGeometry(W, H, 1, 1);
  front.translate(0, 0, GLASS_Z);

  const frame = frameGeometry(W, H);

  const back = new THREE.PlaneGeometry(W - mm(4), H - mm(4), 1, 1);
  back.rotateY(Math.PI);
  back.translate(0, 0, BACK_Z);

  const parts = [front.toNonIndexed(), frame, back.toNonIndexed()];
  if (detail) parts.push(junctionBoxes());
  const merged = mergeGeometries(parts, true);
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}

export function createModuleMaterials(cellMaterial) {
  const frame = new THREE.MeshPhysicalMaterial({
    color: '#c3c8d0',
    metalness: 1.0,
    roughness: 0.3,
    clearcoat: 0.25,
    clearcoatRoughness: 0.25,
  });
  const back = new THREE.MeshStandardMaterial({ color: '#dcdde3', roughness: 0.7, metalness: 0 });
  const jbox = new THREE.MeshStandardMaterial({ color: '#15171d', roughness: 0.55, metalness: 0.0 });
  return [cellMaterial, frame, back, jbox];
}
