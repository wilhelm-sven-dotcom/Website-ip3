// Lichteinfall in der Makroansicht: feine Lichtstrahlen fallen schräg auf die Zelle,
// am Auftreffpunkt glimmt ein roter Punkt auf (Licht wird zu Energie).
// Koordinaten im lokalen Modulsystem (Meter), Vorderseite +Z.
import * as THREE from 'three';
import { GLASS_Z } from './module.js';

export function createPhotons({ center, count = 90, spread = new THREE.Vector2(0.03, 0.05) }) {
  const dir = new THREE.Vector3(-0.22, 0.38, -1).normalize();
  const seeds = new Float32Array(count * 2 * 4);
  const ends = new Float32Array(count * 2);
  const positions = new Float32Array(count * 2 * 3);
  const hitSeeds = new Float32Array(count * 4);
  const hitPos = new Float32Array(count * 3);

  let s = 7;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    const hx = center.x + (rnd() - 0.5) * 2 * spread.x;
    const hy = center.y + (rnd() - 0.4) * 2 * spread.y;
    const travel = 0.012 + rnd() * 0.05;
    const speed = 0.35 + rnd() * 0.5;
    const phase = rnd();
    for (let e = 0; e < 2; e++) {
      const k = i * 2 + e;
      seeds.set([hx, hy, travel, speed + phase * 100], k * 4);
      ends[k] = e;
    }
    hitSeeds.set([hx, hy, travel, speed + phase * 100], i * 4);
    hitPos.set([hx, hy, GLASS_Z], i * 3);
  }

  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uDir: { value: dir },
    uSurface: { value: GLASS_Z },
    uLen: { value: 0.009 },
    uColor: { value: new THREE.Color('#ffffff') },
    uHitColor: { value: new THREE.Color('#c83c30') },
    uPixelRatio: { value: 1 },
    uScale: { value: 1 },
  };

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  lineGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  lineGeo.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));

  const lineMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      attribute float aEnd;
      uniform float uTime;
      uniform vec3 uDir;
      uniform float uSurface;
      uniform float uLen;
      varying float vA;
      void main() {
        float ph = fract(uTime * fract(aSeed.w) * 0.9 + floor(aSeed.w) * 0.0137);
        vec3 hit = vec3(aSeed.xy, uSurface);
        float d = (1.0 - ph) * aSeed.z;
        vec3 head = hit - uDir * d;
        vec3 p = head - uDir * uLen * (1.0 - aEnd);
        vA = aEnd * smoothstep(0.0, 0.15, ph);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying float vA;
      void main() {
        gl_FragColor = vec4(uColor * vA * uOpacity, vA * uOpacity);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  lines.frustumCulled = false;

  const hitGeo = new THREE.BufferGeometry();
  hitGeo.setAttribute('position', new THREE.BufferAttribute(hitPos, 3));
  hitGeo.setAttribute('aSeed', new THREE.BufferAttribute(hitSeeds, 4));
  const hitMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uScale;
      varying float vA;
      void main() {
        float ph = fract(uTime * fract(aSeed.w) * 0.9 + floor(aSeed.w) * 0.0137);
        // Aufglimmen direkt nach dem Auftreffen
        vA = exp(-ph * 9.0);
        vec4 mv = modelViewMatrix * vec4(position + vec3(0.0, 0.0, 0.00005), 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((1.5 + 5.0 * vA) * uPixelRatio * uScale / max(-mv.z * 30.0, 0.6), 0.0, 9.0 * uPixelRatio);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uHitColor;
      varying float vA;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = length(c);
        float core = 1.0 - smoothstep(0.18, 0.5, r);
        float a = core * vA * uOpacity;
        gl_FragColor = vec4(uHitColor * a * 1.4, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const hits = new THREE.Points(hitGeo, hitMat);
  hits.frustumCulled = false;

  const group = new THREE.Group();
  group.add(lines, hits);
  group.visible = false;

  return {
    group,
    uniforms,
    update(time, opacity) {
      uniforms.uTime.value = time;
      uniforms.uOpacity.value = opacity;
      group.visible = opacity > 0.002;
    },
  };
}
