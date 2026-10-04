// Prozedurales Material für die Vorderseite eines PV-Moduls (144 Halbzellen, M10).
// Das Zellbild wird analytisch im Fragment-Shader berechnet und pro Pixel
// box-gefiltert. Dadurch bleibt es von der Gesamtansicht bis zur Makroaufnahme
// einer einzelnen Zelle scharf und flimmerfrei.
import * as THREE from 'three';

// Abmessungen in Millimetern
export const MODULE = {
  w: 1134,
  h: 2278,
  d: 35,
  cols: 6,
  rowsPerHalf: 12,
  cellW: 182.2,
  cellH: 91.1,
  gapX: 2.4, // Abstand zwischen den Strings
  gapY: 1.8, // Abstand zwischen Zellen im String
  midGap: 14, // Mittelsteg zwischen den Modulhälften
  busbars: 16,
  fingerPitch: 1.42,
};

const M = MODULE;
const cellsW = M.cols * M.cellW + (M.cols - 1) * M.gapX;
const halfH = M.rowsPerHalf * M.cellH + (M.rowsPerHalf - 1) * M.gapY;
const marginX = (M.w - cellsW) / 2;
const marginY = (M.h - 2 * halfH - M.midGap) / 2;

export const LAYOUT = { cellsW, halfH, marginX, marginY };

/** Mittelpunkt einer Zelle in Modul-Millimetern (Ursprung unten links). */
export function cellCenterMM(col, row) {
  const half = row >= M.rowsPerHalf ? 1 : 0;
  const r = row - half * M.rowsPerHalf;
  const x = marginX + col * (M.cellW + M.gapX) + M.cellW / 2;
  const yBase = half ? marginY + halfH + M.midGap : marginY;
  const y = yBase + r * (M.cellH + M.gapY) + M.cellH / 2;
  return new THREE.Vector2(x, y);
}

const glslPattern = /* glsl */ `
uniform vec2 uModuleSize;
uniform float uTime;
uniform float uFlow;
uniform float uFingerFlow;
uniform vec3 uCellColor;
uniform vec3 uBackColor;
uniform vec3 uMetalColor;
uniform vec3 uPulseColor;
varying vec2 vMM;

float ip3PulseInt(float x, float w) {
  return floor(x) * w + min(fract(x), w);
}

// Box-gefilterte Abdeckung periodischer Linien: Periode p, Breite w, Linienbeginn o, Pixelbreite f (alles in mm)
float ip3Lines(float x, float p, float w, float o, float f) {
  float xs = (x - o) / p;
  float ws = w / p;
  float fs = max(f / p, 1e-4);
  return clamp((ip3PulseInt(xs + 0.5 * fs, ws) - ip3PulseInt(xs - 0.5 * fs, ws)) / fs, 0.0, 1.0);
}

// Gefilterte Kante: 0 links von e, 1 rechts von e
float ip3Step(float e, float x, float f) {
  return clamp((x - e) / max(f, 1e-4) + 0.5, 0.0, 1.0);
}

float ip3Box(float a, float b, float x, float f) {
  return ip3Step(a, x, f) * (1.0 - ip3Step(b, x, f));
}

float ip3Hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

struct Ip3Cell {
  float cell;     // Zellfläche
  float metal;    // Finger, Busbars, Querverbinder
  float bus;      // nur Busbars
  float finger;   // nur Finger
  float shade;    // Helligkeitsvariation je Zelle
  float pulse;    // Energiefluss (emissiv)
  float glint;    // Mikrostruktur
  float busTilt;  // Neigung der Normalen quer über den Runddraht
};

Ip3Cell ip3Pattern(vec2 mm) {
  Ip3Cell r;
  vec2 fw = max(fwidth(mm), vec2(1e-4));

  float pitchX = ${(M.cellW + M.gapX).toFixed(4)};
  float pitchY = ${(M.cellH + M.gapY).toFixed(4)};
  float x0 = ${marginX.toFixed(4)};
  float cellsW = ${cellsW.toFixed(4)};
  float halfH = ${halfH.toFixed(4)};
  float midY = ${(marginY + halfH + M.midGap / 2).toFixed(4)};

  // X: Spalten und Stringzwischenräume
  float lx = mm.x - x0;
  float insideX = ip3Box(0.0, cellsW, lx, fw.x);
  float gapX = ip3Lines(lx, pitchX, ${M.gapX.toFixed(3)}, ${M.cellW.toFixed(3)}, fw.x);

  // Y: zwei Modulhälften
  float upper = step(midY, mm.y);
  float yBase = mix(${marginY.toFixed(4)}, ${(marginY + halfH + M.midGap).toFixed(4)}, upper);
  float ly = mm.y - yBase;
  float insideY = ip3Box(0.0, halfH, ly, fw.y);
  float gapY = ip3Lines(ly, pitchY, ${M.gapY.toFixed(3)}, ${M.cellH.toFixed(3)}, fw.y);

  float cell = insideX * insideY * (1.0 - gapX) * (1.0 - gapY);
  // Aus der Ferne treten die hellen Zellzwischenräume zurück (wie im Foto bei Gegenlicht)
  float far = smoothstep(5.0, 40.0, max(fw.x, fw.y));
  cell = mix(cell, 1.0, far * 0.55 * insideX * insideY);

  // Kontaktfinger: quer, sehr fein
  float lyCell = mod(ly, pitchY);
  float finger = ip3Lines(lyCell, ${M.fingerPitch.toFixed(3)}, 0.07, 0.62, fw.y) * cell;
  finger *= ip3Box(0.9, ${(M.cellW - 0.9).toFixed(3)}, mod(lx, pitchX), fw.x);

  // Busbars: 16 Drähte je Zelle, laufen über die Zellzwischenräume bis zum Querverbinder
  float bbPitch = ${(M.cellW / M.busbars).toFixed(4)};
  float lxCol = mod(lx, pitchX);
  float bus = ip3Lines(lxCol, bbPitch, 0.42, bbPitch * 0.5 - 0.21, fw.x);
  bus *= insideX * (1.0 - gapX) * ip3Box(-7.0, halfH + 7.0, ly, fw.y);
  // Runddraht: Normale kippt quer zur Drahtachse, nur wenn der Draht aufgelöst wird
  float bbOff = clamp((mod(lxCol, bbPitch) - bbPitch * 0.5) / 0.21, -1.0, 1.0);
  float busRes = 1.0 - smoothstep(0.04, 0.12, fw.x);

  // Querverbinder am oberen, unteren Rand und im Mittelsteg
  float ribbon = ip3Box(${(marginY - 7.4).toFixed(3)}, ${(marginY - 2.6).toFixed(3)}, mm.y, fw.y);
  ribbon += ip3Box(midY - 2.6, midY + 2.6, mm.y, fw.y);
  ribbon += ip3Box(${(M.h - marginY + 2.6).toFixed(3)}, ${(M.h - marginY + 7.4).toFixed(3)}, mm.y, fw.y);
  ribbon *= ip3Box(-2.0, cellsW + 2.0, lx, fw.x);

  r.cell = cell;
  r.bus = bus;
  r.busTilt = bbOff * bus * busRes;
  r.finger = finger;
  r.metal = clamp(max(max(finger, bus), ribbon), 0.0, 1.0);

  // leichte Streuung zwischen den Zellen (Fertigungstoleranz), ruhig gehalten
  vec2 cid = vec2(floor(lx / pitchX), floor(ly / pitchY) + upper * 20.0);
  r.shade = (ip3Hash(cid) - 0.5) * 0.12;

  // Mikrostruktur der texturierten Siliziumoberfläche, nur sichtbar, wenn auflösbar
  // weiche Glanzvariation der texturierten Oberfläche (wenige Millimeter Wellenlänge)
  vec2 q = mm / 3.7;
  vec2 qi = floor(q);
  vec2 qf = fract(q);
  qf = qf * qf * (3.0 - 2.0 * qf);
  float n00 = ip3Hash(qi);
  float n10 = ip3Hash(qi + vec2(1.0, 0.0));
  float n01 = ip3Hash(qi + vec2(0.0, 1.0));
  float n11 = ip3Hash(qi + vec2(1.0, 1.0));
  float g = mix(mix(n00, n10, qf.x), mix(n01, n11, qf.x), qf.y);
  float glintVis = 1.0 - smoothstep(0.08, 0.6, max(fw.x, fw.y));
  r.glint = (g - 0.5) * glintVis * cell * (1.0 - r.metal);

  // Energiefluss: Impulse entlang der Busbars in Stringrichtung,
  // entlang der Finger zum nächsten Busbar hin. Nur sichtbar, wenn auflösbar.
  float bbIndex = floor(lxCol / bbPitch);
  float h = ip3Hash(vec2(bbIndex, cid.x + cid.y * 7.0));
  float phase = fract(mm.y / 52.0 - uTime * 0.5 + h);
  float comet = smoothstep(0.0, 0.02, phase) * (1.0 - smoothstep(0.02, 0.16, phase));
  float busVis = 1.0 - smoothstep(0.12, 0.45, fw.x);
  float pulse = comet * bus * busVis * uFlow;

  float distBB = abs(mod(lxCol, bbPitch) - bbPitch * 0.5);
  float fIndex = floor(lyCell / ${M.fingerPitch.toFixed(3)});
  float hf = ip3Hash(vec2(fIndex, cid.x * 3.0 + bbIndex));
  float fphase = fract(distBB / 5.69 + uTime * 0.7 + hf);
  float fcomet = smoothstep(0.0, 0.05, fphase) * (1.0 - smoothstep(0.05, 0.3, fphase));
  float fingerVis = 1.0 - smoothstep(0.02, 0.06, fw.y);
  pulse += fcomet * finger * fingerVis * uFingerFlow * step(0.8, hf);

  r.pulse = pulse;
  return r;
}
`;

/**
 * Erzeugt das Vorderseiten-Material. Basis ist MeshPhysicalMaterial,
 * Clearcoat übernimmt die Glasreflexion.
 */
export function createCellMaterial({ envMapIntensity = 1 } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.012,
    envMapIntensity,
    specularIntensity: 0.35,
  });

  const uniforms = {
    uModuleSize: { value: new THREE.Vector2(M.w, M.h) },
    uTime: { value: 0 },
    uFlow: { value: 0 },
    uFingerFlow: { value: 0 },
    uCellColor: { value: new THREE.Color('#0d1730') },
    uBackColor: { value: new THREE.Color('#d6d7de') },
    uMetalColor: { value: new THREE.Color('#c9ccd2') },
    uPulseColor: { value: new THREE.Color('#c83c30') },
  };
  mat.userData.uniforms = uniforms;

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uModuleSize;\nvarying vec2 vMM;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMM = uv * uModuleSize;');

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + glslPattern)
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        Ip3Cell ip3 = ip3Pattern(vMM);
        vec3 ip3Cell = uCellColor * (1.0 + ip3.shade);
        vec3 ip3Base = mix(uBackColor, ip3Cell, ip3.cell);
        diffuseColor.rgb = mix(ip3Base, uMetalColor, ip3.metal);`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `#include <roughnessmap_fragment>
        roughnessFactor = mix(mix(0.62, 0.34 + ip3.glint * 0.22, ip3.cell), 0.2, ip3.metal);`
      )
      .replace(
        '#include <metalnessmap_fragment>',
        /* glsl */ `#include <metalnessmap_fragment>
        metalnessFactor = mix(0.0, 0.92, ip3.metal);`
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
        {
          // Mikroneigung der Pyramidentextur aus Bildschirmableitungen
          vec3 q0 = dFdx(-vViewPosition);
          vec3 q1 = dFdy(-vViewPosition);
          vec2 st0 = dFdx(vMM);
          vec2 st1 = dFdy(vMM);
          vec3 q1p = cross(q1, normal);
          vec3 q0p = cross(normal, q0);
          vec3 T = q1p * st0.x + q0p * st1.x;
          vec3 B = q1p * st0.y + q0p * st1.y;
          float det = max(dot(T, T), dot(B, B));
          float sc = det == 0.0 ? 0.0 : inversesqrt(det);
          vec2 tilt = vec2(ip3.glint, ip3.glint * 0.6) * 0.18;
          tilt.x += ip3.busTilt * 1.6;
          normal = normalize(normal + (T * sc) * tilt.x + (B * sc) * tilt.y);
        }`
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        totalEmissiveRadiance += uPulseColor * ip3.pulse * 2.6;`
      );
  };

  // eigener Cache-Key, damit three.js das modifizierte Programm getrennt hält
  mat.customProgramCacheKey = () => 'ip3-cell-v1';
  return mat;
}
