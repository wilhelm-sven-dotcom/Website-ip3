// Szene der Startseiten-Inszenierung: vom einzelnen PV-Modul über die Zelle
// zum Energiesystem aus PV-Generator, Batteriespeicher und Netzanschluss.
import * as THREE from 'three';
import { createCellMaterial, cellCenterMM, MODULE } from './cellMaterial.js';
import { createModuleGeometry, createModuleMaterials, GLASS_Z } from './module.js';
import { createLayout, createPlant } from './plant.js';
import { createPhotons } from './photons.js';
import { monotone, range, win, clamp01 } from './spline.js';

const DEG = Math.PI / 180;
// Entwicklungswerkzeug: Kamera- und Posenwerte per window.__storyTune überschreiben
const TUNING = new URLSearchParams(location.search).has('capture');
const NAVY = new THREE.Color('#0c1a3d');

/** Farbe so vorverzerren, dass sie nach Neutral-Tonemapping exakt erscheint (dunkle Töne). */
function compensateNeutral(srgbColor) {
  const c = srgbColor.clone(); // three.js hält Farben linear
  const x = Math.min(c.r, c.g, c.b);
  // gesucht: x' mit 6,25·x'² = x  (gilt für x' < 0,08)
  const xi = Math.sqrt(x / 6.25);
  const off = xi - x;
  return new THREE.Color(c.r + off, c.g + off, c.b + off);
}

function buildEnvironment(renderer, heroStrip) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(60, 48, 24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#13244f'), side: THREE.BackSide })
  );
  env.add(room);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#060d22' }));
  floor.position.y = -5;
  env.add(floor);
  // heller Horizontring: Kanten des Rahmens und streifende Glasreflexe
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(56, 56, 2.6, 64, 1, true),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#e8e7ef').multiplyScalar(1.25), side: THREE.BackSide })
  );
  ring.position.y = 1.2;
  env.add(ring);
  const panel = (w, h, pos, intensity, color = '#ffffff', roll = 0) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
    );
    m.position.copy(pos);
    m.lookAt(0, 0, 0);
    m.rotateZ(roll);
    env.add(m);
  };
  panel(3.0, 70, new THREE.Vector3(-46, 12, -4), 2.4);
  panel(14, 8, new THREE.Vector3(40, 14, 28), 0.6, '#e8e7ef');
  if (heroStrip) panel(heroStrip.w, heroStrip.h, heroStrip.pos, heroStrip.intensity, '#ffffff', heroStrip.roll);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.012).texture;
  pmrem.dispose();
  env.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
  return tex;
}

export function createStoryScene(canvas, quality) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality.antialias,
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: quality.preserveDrawingBuffer || false,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  // Streiflicht, das in der Präsentationslage diagonal über das Glas läuft
  const strip = (TUNING && window.__storyTune && window.__storyTune.strip) || {
    w: 80,
    h: 1.8,
    pos: new THREE.Vector3(18.2, 37.2, 28.1),
    intensity: 6,
    roll: -0.45,
  };
  if (Array.isArray(strip.pos)) strip.pos = new THREE.Vector3(...strip.pos);
  scene.environment = buildEnvironment(renderer, strip);
  scene.environmentIntensity = 1.0;
  const fogColor = compensateNeutral(NAVY);
  scene.fog = new THREE.Fog(fogColor, 200, 900);

  // Licht
  const sun = new THREE.DirectionalLight('#ffffff', 2.6);
  const sunDir = new THREE.Vector3(-0.62, 0.62, 0.48).normalize();
  scene.add(sun);
  scene.add(sun.target);
  const hemi = new THREE.HemisphereLight('#c9d2ea', '#0c1a3d', 0.55);
  scene.add(hemi);

  // Anlage und Hauptmodul
  const layout = createLayout(quality.layout);
  const heroIndex = layout.modules.findIndex(
    (m) => m.r === quality.hero.r && m.t === quality.hero.t && m.c === quality.hero.c && m.mr === 1
  );
  const cellMat = createCellMaterial();
  const materials = createModuleMaterials(cellMat);
  const heroGeo = createModuleGeometry({ detail: true });
  const liteGeo = createModuleGeometry({ detail: false });

  const plant = createPlant({ layout, moduleGeometry: liteGeo, moduleMaterials: materials, heroIndex, quality });
  scene.add(plant.group);

  const heroSlot = layout.modules[heroIndex].position.clone();
  const hero = new THREE.Group();
  hero.position.copy(heroSlot);
  const heroMesh = new THREE.Mesh(heroGeo, materials);
  heroMesh.castShadow = quality.shadows;
  heroMesh.receiveShadow = quality.shadows;
  hero.add(heroMesh);
  scene.add(hero);

  if (quality.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    const sc = sun.shadow.camera;
    sc.left = -78;
    sc.right = 78;
    sc.top = 70;
    sc.bottom = -70;
    sc.near = 10;
    sc.far = 420;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
  }

  // Fokuszelle für die Makroaufnahme (Spalte 2, Zeile 17, nahe einem Busbar)
  const focusMM = cellCenterMM(2, 17).add(new THREE.Vector2(3.2, -6));
  const focusLocal = new THREE.Vector3((focusMM.x - MODULE.w / 2) / 1000, (focusMM.y - MODULE.h / 2) / 1000, GLASS_Z);

  const photons = createPhotons({ center: new THREE.Vector2(focusLocal.x, focusLocal.y), count: quality.photons });
  hero.add(photons.group);

  // Bemaßung des Moduls in der Präsentationslage (Maßlinien mit Hilfslinien wie im CAD)
  const MW = MODULE.w / 1000;
  const MH = MODULE.h / 1000;
  const DZ = 0.0175;
  const OFF = 0.15;
  const T = 0.025;
  const dimSegs = [
    // Länge, rechts neben dem Modul
    [MW / 2 + OFF, -MH / 2, MW / 2 + OFF, MH / 2],
    [MW / 2 + 0.035, -MH / 2, MW / 2 + OFF + 0.05, -MH / 2],
    [MW / 2 + 0.035, MH / 2, MW / 2 + OFF + 0.05, MH / 2],
    [MW / 2 + OFF - T, -MH / 2 - T, MW / 2 + OFF + T, -MH / 2 + T],
    [MW / 2 + OFF - T, MH / 2 - T, MW / 2 + OFF + T, MH / 2 + T],
    // Breite, unter dem Modul
    [-MW / 2, -MH / 2 - OFF, MW / 2, -MH / 2 - OFF],
    [-MW / 2, -MH / 2 - 0.035, -MW / 2, -MH / 2 - OFF - 0.05],
    [MW / 2, -MH / 2 - 0.035, MW / 2, -MH / 2 - OFF - 0.05],
    [-MW / 2 - T, -MH / 2 - OFF - T, -MW / 2 + T, -MH / 2 - OFF + T],
    [MW / 2 - T, -MH / 2 - OFF - T, MW / 2 + T, -MH / 2 - OFF + T],
  ];
  const dimPos = [];
  dimSegs.forEach(([x1, y1, x2, y2]) => dimPos.push(x1, y1, DZ, x2, y2, DZ));
  const dimGeo = new THREE.BufferGeometry();
  dimGeo.setAttribute('position', new THREE.Float32BufferAttribute(dimPos, 3));
  const dimMat = new THREE.LineBasicMaterial({ color: '#e8e7ef', transparent: true, opacity: 0, toneMapped: false });
  const dimLines = new THREE.LineSegments(dimGeo, dimMat);
  hero.add(dimLines);

  // Kamera
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 1200);
  scene.add(camera);

  /* ---------- Keyframes ---------- */
  // p: Scrollfortschritt der Inszenierung. dist logarithmisch interpoliert.
  const K = quality.keys;
  const P = K.p;
  const fDist = monotone(P, K.dist.map(Math.log));
  const fAz = monotone(P, K.az);
  const fEl = monotone(P, K.el);
  const fFov = monotone(P, K.fov);
  const fA = monotone(P, K.toFocus);
  const fB = monotone(P, K.toPlant);
  const fSX = monotone(P, K.shiftX);
  const fSY = monotone(P, K.shiftY);
  // Verschiebung des Zielpunkts im Anlagenmodell (Meter), damit der Ortsrand ins Schlussbild passt
  const fOX = monotone(P, K.offX ?? P.map(() => 0));
  const fOZ = monotone(P, K.offZ ?? P.map(() => 0));

  const HP = [0, 0.1, 0.27, 0.4];
  const fRx = monotone(HP, [0.45, 0.42, 0.1, 0]);
  const fRy = monotone(HP, [-0.15, -0.14, -0.03, 0]);
  const fRz = monotone(HP, [0.1, 0.09, 0.02, 0]);

  const slotQuat = layout.moduleQuat.clone();
  const slotNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(slotQuat);
  const offsetQuat = new THREE.Quaternion();
  const offsetEuler = new THREE.Euler();
  const tmpV = new THREE.Vector3();
  const target = new THREE.Vector3();
  const moduleCenter = new THREE.Vector3();
  const focusWorld = new THREE.Vector3();
  const plantCenter = plant.focus.clone();

  let width = 1;
  let height = 1;

  const labelAnchors = {
    licht: new THREE.Vector3(),
    finger: new THREE.Vector3(),
    busbar: new THREE.Vector3(),
    massB: new THREE.Vector3(),
    massL: new THREE.Vector3(),
    ...plant.anchors,
  };

  // lokale Ankerpunkte der Makrobeschriftungen
  const bbPitch = MODULE.cellW / MODULE.busbars;
  const cc = cellCenterMM(2, 17);
  const toLocal = (xmm, ymm, z = GLASS_Z) => new THREE.Vector3((xmm - MODULE.w / 2) / 1000, (ymm - MODULE.h / 2) / 1000, z);
  const macroLocal = {
    busbar: toLocal(cc.x + bbPitch * 0.5 + 0.0, focusMM.y + 9),
    finger: toLocal(focusMM.x - 3.5, focusMM.y - 4.62),
    licht: toLocal(focusMM.x - 8, focusMM.y + 4, GLASS_Z + 0.016),
    // Maßzahlen mittig auf den Maßlinien
    massB: new THREE.Vector3(0, -MODULE.h / 2000 - 0.15, 0.0175),
    massL: new THREE.Vector3(MODULE.w / 2000 + 0.15, 0, 0.0175),
  };

  function update(p, time, pointer = { x: 0, y: 0 }) {
    // Hauptmodul: von der Präsentationslage in die Einbaulage
    const settle = range(p, 0.1, 0.32);
    const idle = 1 - settle;
    const tune = (TUNING && window.__storyTune) || {};
    offsetEuler.set(
      (tune.rx ?? fRx(p)) + Math.sin(time * 0.45) * 0.035 * idle + pointer.y * 0.06 * idle,
      (tune.ry ?? fRy(p)) + Math.sin(time * 0.31) * 0.06 * idle + pointer.x * 0.12 * idle,
      tune.rz ?? fRz(p),
      'YXZ'
    );
    offsetQuat.setFromEuler(offsetEuler);
    hero.quaternion.copy(offsetQuat).multiply(slotQuat);
    // im Einstieg über seinem Platz in der Reihe, damit die Präsentationslage die Nachbarn nicht schneidet
    const lift = 0.7 * (1 - THREE.MathUtils.smoothstep(p, 0.1, 0.27));
    hero.position.copy(heroSlot).addScaledVector(slotNormal, lift);
    hero.updateMatrixWorld(true);

    moduleCenter.copy(hero.position);
    focusWorld.copy(focusLocal).applyMatrix4(hero.matrixWorld);

    // Kameraziel
    const a = clamp01(fA(p));
    const b = clamp01(fB(p));
    target.copy(moduleCenter).lerp(focusWorld, a).lerp(plantCenter, b);
    target.x += fOX(p);
    target.z += fOZ(p);

    const dist = tune.dist ?? Math.exp(fDist(p));
    const az = (tune.az ?? fAz(p)) * DEG + (b > 0.98 ? Math.sin(time * 0.05) * 0.03 : 0);
    const el = (tune.el ?? fEl(p)) * DEG;
    if (tune.tx !== undefined) target.set(tune.tx, tune.ty, tune.tz);
    tmpV.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist);
    camera.position.copy(target).add(tmpV);
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    camera.fov = tune.fov ?? fFov(p);
    camera.near = Math.max(0.0004, dist * 0.012);
    camera.far = Math.max(60, dist * 30 + 700);
    const sx = tune.sx ?? fSX(p);
    const sy = tune.sy ?? fSY(p);
    camera.setViewOffset(width, height, -sx * width, sy * height, width, height);
    camera.updateProjectionMatrix();

    // Umgebungsreflexe: im Studio kräftig, im Anlagenmodell zurückgenommen. Im Einstieg dreht
    // die Umgebung langsam hin und her, der helle Streifen wandert als Sonnenreflex über die Reihe.
    scene.environmentIntensity = 1 - 0.58 * range(p, 0.7, 0.86);
    scene.environmentRotation.y = Math.sin(time * 0.32) * 0.26 * (1 - range(p, 0.04, 0.12));

    // Nebel skaliert mit dem Kameraabstand: Tiefe ohne Verlauf im Bild. Im Einstieg kurz,
    // die Reihe verläuft hinter dem Hauptmodul ins Navy.
    const nah = 1 - range(p, 0.27, 0.42);
    scene.fog.near = THREE.MathUtils.lerp(dist * 1.6 + 40, dist, nah);
    scene.fog.far = THREE.MathUtils.lerp(dist * 5.5 + 260, dist + 24, nah);

    // Sonne folgt dem Bildausschnitt, damit Schatten scharf bleiben
    const sunTarget = b > 0.01 ? plantCenter : moduleCenter;
    sun.target.position.copy(sunTarget);
    sun.position.copy(sunTarget).addScaledVector(sunDir, 160);

    // Zellmaterial: Energiefluss in der Makroansicht
    const u = cellMat.userData.uniforms;
    u.uTime.value = time;
    u.uFlow.value = win(p, 0.44, 0.52, 0.66, 0.72);
    u.uFingerFlow.value = win(p, 0.49, 0.55, 0.63, 0.68);
    photons.update(time, win(p, 0.47, 0.53, 0.635, 0.68));
    photons.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    photons.uniforms.uScale.value = height / 900;

    // Aufbau der Anlage; die Reihe des Hauptmoduls steht von Anfang an. Schatten erst mit dem
    // Aufbau (im Einstieg gibt es noch keinen Boden, der sie aufnimmt)
    const build = range(p, 0.655, 0.865);
    plant.setBuild(build, { value: true, changed: false }, 1);
    plant.modules.castShadow = plant.tables.castShadow = quality.shadows && build > 0;
    plant.setStage({
      grid: range(p, 0.69, 0.8),
      inverters: range(p, 0.775, 0.85),
      trafo: range(p, 0.81, 0.86),
      pvRoute: range(p, 0.8, 0.87),
      bess: range(p, 0.845, 0.92),
      bessRoute: range(p, 0.88, 0.93),
      nvp: range(p, 0.875, 0.915),
      gridRoute: range(p, 0.895, 0.94),
      line: range(p, 0.9, 0.975),
      ort: range(p, 0.915, 0.975),
      ortRoute: range(p, 0.95, 0.995),
      flowPv: range(p, 0.84, 0.9),
      flowBess: range(p, 0.915, 0.955),
      flowGrid: range(p, 0.935, 0.985),
      flowOrt: range(p, 0.96, 1),
      time,
    });
    heroMesh.castShadow = quality.shadows && build > 0;

    // Beschriftungen
    labelAnchors.busbar.copy(macroLocal.busbar).applyMatrix4(hero.matrixWorld);
    labelAnchors.finger.copy(macroLocal.finger).applyMatrix4(hero.matrixWorld);
    labelAnchors.licht.copy(macroLocal.licht).applyMatrix4(hero.matrixWorld);
    labelAnchors.massB.copy(macroLocal.massB).applyMatrix4(hero.matrixWorld);
    labelAnchors.massL.copy(macroLocal.massL).applyMatrix4(hero.matrixWorld);
    dimMat.opacity = 0.55 * win(p, -1, -0.5, 0.04, 0.1) * (quality.mobile ? 0 : 1);
    dimLines.visible = dimMat.opacity > 0.005;
  }

  function render() {
    renderer.render(scene, camera);
  }

  function resize(w, h, dpr) {
    width = w;
    height = h;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const projV = new THREE.Vector3();
  function project(v) {
    projV.copy(v).project(camera);
    return {
      x: (projV.x * 0.5 + 0.5) * width,
      y: (-projV.y * 0.5 + 0.5) * height,
      visible: projV.z < 1 && projV.z > -1,
    };
  }

  // Shader vorab kompilieren, damit der erste Scroll nicht ruckelt
  function warmup() {
    plant.group.visible = true;
    photons.group.visible = true;
    renderer.compile(scene, camera);
  }

  function dispose() {
    renderer.dispose();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
  }

  function setStrip(st) {
    const old = scene.environment;
    const strip = { ...st, pos: Array.isArray(st.pos) ? new THREE.Vector3(...st.pos) : st.pos };
    scene.environment = buildEnvironment(renderer, strip);
    old && old.dispose();
  }

  return { renderer, scene, camera, update, render, resize, project, warmup, dispose, labelAnchors, setStrip };
}
