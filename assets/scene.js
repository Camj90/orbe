// Escena 3D de Orbe Mini: dron de 3" con ESP32 dentro de una jaula barril con domos. Escala: 1 unidad = 10 cm.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const R = 1.0;            // radio del anillo central (Ø 20 cm)
export const R_END = 0.8;        // radio de los anillos de extremo (Ø 16 cm)
export const HALF = 0.9;         // distancia del centro a cada anillo de extremo
export const DOME = 0.35;        // cuánto sobresale cada domo (3,5 cm)
export const APEX = HALF + DOME; // 1,25: altura del centro si queda parado sobre un domo
export const ROOM = { WALL_Z: -4, CEIL_Y: 12 };
export const TARGETS = [
  { key: 'wall', pos: [2.2, 7, -3.65], temp: 78, name: 'Tablero en altura' },
  { key: 'ceil', pos: [2.0, 11.45, 0.3], temp: 64, name: 'Empalme en bandeja de techo' }
];

export const INFO = {
  cage: { tag: 'JA-01', short: 'Jaula barril', name: 'Jaula barril', desc: 'Anillo central de 20 cm y anillos de extremo de 16 cm unidos por 8 largueros de carbono. Gira libre alrededor del eje: el dron rueda, trepa y choca sin que las hélices toquen nada.', print: 'Cada anillo sale entero en la H2D (cabe en 32 cm). PAHT-CF para los anillos, TPU 95A para la banda de rodado.', func: 'Rodar, absorber golpes y proteger las hélices' },
  dome: { tag: 'DM-01', short: 'Domos', name: 'Domos de autoadrizado', desc: 'Cuatro costillas curvas por lado con una punta de TPU. Sobresalen 3,5 cm con radio de 11 cm, menor al límite de 12 cm: si cae de punta no puede quedarse parado y vuelve solo a quedar de costado.', print: 'Costillas en PAHT-CF, puntas en TPU 95A.', func: 'Que nunca quede atrapado sobre un extremo' },
  drone: { tag: 'DR-03', short: 'Dron 3"', name: 'Dron de 3 pulgadas', desc: 'Frame de carbono de 125 mm, motores 1404 de 3800 KV, ESC 4 en 1 de 20 A y batería 4S de 850 mAh. Pesa unos 230 g sin la jaula.', print: 'Abrazaderas del eje y soporte de batería en PETG-HF.', func: 'Empuje para rodar, trepar y volar' },
  esp: { tag: 'FC-01', short: 'ESP32 de vuelo', name: 'ESP32 como controladora', desc: 'Tu ESP32 con el firmware ESP-FC (compatible con Betaflight) y un giroscopio MPU6500 por SPI. Hasta 4 kHz de lazo de control. Los modos rodar, trepar y techo son código propio.', print: 'Bandeja antivibración con gomas de TPU.', func: 'Estabilidad, motores y modos de movimiento' },
  cam: { tag: 'PL-01', short: 'ESP32-S3 + térmica', name: 'XIAO ESP32-S3 Sense y MLX90640', desc: 'Segundo microcontrolador para la carga útil: cámara OV2640, cámara térmica de 32 × 24 y WiFi hacia la estación en tierra. Así el video no le quita tiempo al control de vuelo.', print: 'Carcasa frontal en PETG-HF con protector de lentes.', func: 'Inspección térmica, alarmas y video' },
  hub: { tag: 'AM-01', short: 'Amortiguadores', name: 'Eje y amortiguadores', desc: 'Eje de carbono de 4 mm sobre rodamientos 684ZZ. Un anillo de TPU entre el eje y los rayos se comprime en un golpe.', print: 'Amortiguadores en TPU 95A, rayos en PAHT-CF.', func: 'Aislar la electrónica del impacto' },
  flow: { tag: 'OF-01', short: 'Flujo óptico', name: 'Flujo óptico y distancia', desc: 'Matek 3901-L0X abajo y dos VL53L1X (frontal y superior). Le dicen al dron cuánto se movió y a qué distancia están el muro y el techo.', print: 'Soportes en PETG-HF.', func: 'Mantener posición sin GPS' },
  wall: { tag: 'TB-07', short: 'Tablero', name: 'Tablero eléctrico en altura', desc: 'Objetivo de la demo: un tablero a 70 cm del piso. Con "Simular alza de temperatura" su conexión se calienta y Orbe va a revisarlo.', print: '—', func: 'Punto de inspección' },
  ceil: { tag: 'BT-03', short: 'Empalme 64 °C', name: 'Empalme en bandeja de techo', desc: 'Objetivo de la demo: un empalme caliente en una bandeja portacables a 1,2 m.', print: '—', func: 'Punto de inspección' }
};

const VIEWS = {
  iso:   { pos: [15, 6.5, 16], target: [0.3, 5, -0.5] },
  side:  { pos: [-17, 5.5, 2.5], target: [0, 4.5, -1] },
  front: { pos: [0.6, 5, 18], target: [0, 5, 0] },
  scale: { pos: [4.6, 3.2, 7.8], target: [0.4, 1.1, 3] },
  cage:  { pos: [3.4, 2.4, 6.4], target: [0, 1, 3] }
};

function layerTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 4) { g.fillStyle = '#a8a8a8'; g.fillRect(0, y, 64, 2); g.fillStyle = '#6a6a6a'; g.fillRect(0, y + 2, 64, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); return t;
}
function gyroidTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32;
  const g = c.getContext('2d'); g.fillStyle = '#1b1e21'; g.fillRect(0, 0, 128, 32);
  g.strokeStyle = '#2f353a'; g.lineWidth = 3;
  for (let x = -16; x < 144; x += 16) { g.beginPath(); for (let y = 0; y <= 32; y += 2) g.lineTo(x + 5 * Math.sin(y / 32 * Math.PI * 2), y); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 1); return t;
}

export function createOrbe(container, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  const labelRenderer = new CSS2DRenderer(); labelRenderer.domElement.className = 'labels-layer';
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 200);
  camera.position.set(...VIEWS.iso.pos);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...VIEWS.iso.target);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 1.5; controls.maxDistance = 40; controls.maxPolarAngle = Math.PI * 0.495;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xe6eeff, 0x1a2026, 0.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.position.set(9, 16, 11); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new THREE.PointLight(0xfff1dd, 40, 20, 2); fill.position.set(1, 10, 2); scene.add(fill);

  // ---------- materiales ----------
  const layers = layerTexture();
  const printed = (color, rough = 0.5) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, bumpMap: layers, bumpScale: 0.5 });
  const M = {
    pacf: printed(0x2e3338, 0.62), petgY: printed(0xf2b705), petgG: printed(0x4b5661),
    tpu: new THREE.MeshStandardMaterial({ map: gyroidTexture(), roughness: 0.85 }),
    tpuDamp: new THREE.MeshStandardMaterial({ color: 0xff7a2f, roughness: 0.7 }),
    carbon: new THREE.MeshStandardMaterial({ color: 0x15181b, metalness: 0.35, roughness: 0.32 }),
    motor: new THREE.MeshStandardMaterial({ color: 0x7d8790, metalness: 0.85, roughness: 0.3 }),
    bell: new THREE.MeshStandardMaterial({ color: 0x2f6fd1, metalness: 0.6, roughness: 0.35 }),
    prop: new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.4, transparent: true, opacity: 0.9 }),
    blur: new THREE.MeshBasicMaterial({ color: 0xc9d6e2, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    batt: new THREE.MeshStandardMaterial({ color: 0x8a1f1f, roughness: 0.45 }),
    pcbB: new THREE.MeshStandardMaterial({ color: 0x1d3f7a, roughness: 0.45 }),
    pcbK: new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.45 }),
    pcbG: new THREE.MeshStandardMaterial({ color: 0x1f7a4a, roughness: 0.45 }),
    chip: new THREE.MeshStandardMaterial({ color: 0xc0c6cc, metalness: 0.9, roughness: 0.25 }),
    lens: new THREE.MeshStandardMaterial({ color: 0x0b0d10, metalness: 0.2, roughness: 0.05 }),
    floor: new THREE.MeshStandardMaterial({ color: 0x4a5057, roughness: 0.95 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x6b7680, metalness: 0.55, roughness: 0.5 }),
    seam: new THREE.MeshStandardMaterial({ color: 0x59636c, metalness: 0.6, roughness: 0.45 }),
    ceil: new THREE.MeshStandardMaterial({ color: 0x575f67, roughness: 0.85 }),
    cab: new THREE.MeshStandardMaterial({ color: 0xd6dadd, metalness: 0.15, roughness: 0.55 }),
    tray: new THREE.MeshStandardMaterial({ color: 0x9aa4ad, metalness: 0.8, roughness: 0.35 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x22272b, roughness: 0.7 }),
    hot: new THREE.MeshStandardMaterial({ color: 0x552200, emissive: 0xff5a1f, emissiveIntensity: 0.6 }),
    hotWall: new THREE.MeshStandardMaterial({ color: 0x552200, emissive: 0xff5a1f, emissiveIntensity: 0.3 }),
    crate: new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.85 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xd9a383, roughness: 0.62 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x24415f, roughness: 0.85 })
  };
  const CAT = new Map([[M.pacf, 'pacf'], [M.petgY, 'petg'], [M.petgG, 'petg'], [M.tpu, 'tpu'], [M.tpuDamp, 'tpu'], [M.carbon, 'carbon'],
    [M.motor, 'buy'], [M.bell, 'buy'], [M.prop, 'buy'], [M.batt, 'buy'], [M.pcbB, 'buy'], [M.pcbK, 'buy'], [M.pcbG, 'buy'], [M.chip, 'buy'], [M.lens, 'buy']]);
  const CAT_MAT = {
    pacf: new THREE.MeshStandardMaterial({ color: 0x2fb3a6, roughness: 0.55, bumpMap: layers, bumpScale: 0.5 }),
    petg: new THREE.MeshStandardMaterial({ color: 0xf2b705, roughness: 0.5, bumpMap: layers, bumpScale: 0.5 }),
    tpu: new THREE.MeshStandardMaterial({ color: 0xff6b35, roughness: 0.7 }),
    carbon: new THREE.MeshStandardMaterial({ color: 0x8792a0, metalness: 0.5, roughness: 0.35 }),
    buy: new THREE.MeshStandardMaterial({ color: 0x3f8fe0, roughness: 0.6, transparent: true, opacity: 0.55 })
  };

  function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const box = (w, h, d, mat, x, y, z, p) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, p);
  const rbox = (w, h, d, r, mat, x, y, z, p) => mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y, z, p);
  const cyl = (r, h, mat, x, y, z, p, seg = 24) => mesh(new THREE.CylinderGeometry(r, r, h, seg), mat, x, y, z, p);
  const cylX = (r, h, mat, x, y, z, p, seg) => { const m = cyl(r, h, mat, x, y, z, p, seg); m.rotation.z = Math.PI / 2; return m; };
  function rod(a, b, r, mat, parent) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
    const m = mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), mat, 0, 0, 0, parent);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return m;
  }

  const pickables = [], labels = {};
  function tag(key, parent, pos) {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'tag3d';
    el.innerHTML = `<b>${INFO[key].tag}</b><span>${INFO[key].short}</span>`;
    el.addEventListener('click', e => { e.stopPropagation(); select(key); });
    const o = new CSS2DObject(el); o.position.set(...pos); parent.add(o); labels[key] = o; return o;
  }
  function keyed(key, parent) { const g = new THREE.Group(); g.userData.key = key; parent.add(g); pickables.push(g); return g; }

  // ---------- sala de pruebas ----------
  const floorBig = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x0e1418, roughness: 0.95 }));
  floorBig.rotation.x = -Math.PI / 2; floorBig.position.y = -0.02; floorBig.receiveShadow = true; scene.add(floorBig);
  const grid = new THREE.GridHelper(120, 120, 0x26323b, 0x1a232a); grid.position.y = -0.01; scene.add(grid);
  const { WALL_Z, CEIL_Y } = ROOM;
  box(14, 0.1, 12, M.floor, 0, -0.05, 2);
  box(12, CEIL_Y + 0.5, 0.3, M.wall, 0, (CEIL_Y + 0.5) / 2, WALL_Z - 0.15);
  for (let x = -5; x <= 5; x += 2.5) box(0.06, CEIL_Y, 0.03, M.seam, x, CEIL_Y / 2, WALL_Z + 0.01);
  for (let y = 3; y < CEIL_Y; y += 3) box(12, 0.04, 0.03, M.seam, 0, y, WALL_Z + 0.01);
  box(12, 0.5, 8, M.ceil, 0, CEIL_Y + 0.25, WALL_Z + 4);
  [-5.8, 5.8].forEach(x => box(0.4, 0.8, 8, M.ceil, x, CEIL_Y - 0.4, WALL_Z + 4));

  const wallT = keyed('wall', scene);
  rbox(1.3, 1.6, 0.35, 0.03, M.cab, 2.2, 7, WALL_Z + 0.18, wallT);
  box(0.12, 4.4, 0.1, M.cable, 2.6, 9.9, WALL_Z + 0.12, wallT);
  mesh(new THREE.CircleGeometry(0.18, 20), M.hotWall, 2.0, 6.8, WALL_Z + 0.36, wallT);
  const wallLamp = new THREE.PointLight(0xff4d2a, 0, 3, 2); wallLamp.position.set(2.0, 6.8, WALL_Z + 0.8); scene.add(wallLamp);
  tag('wall', scene, [2.2, 8.1, WALL_Z + 0.3]);
  const ceilT = keyed('ceil', scene);
  box(0.8, 0.06, 7.6, M.tray, 2.0, CEIL_Y - 0.6, WALL_Z + 4, ceilT);
  [-0.4, 0.4].forEach(dx => box(0.03, 0.25, 7.6, M.tray, 2.0 + dx, CEIL_Y - 0.48, WALL_Z + 4, ceilT));
  for (let z = WALL_Z + 0.8; z < WALL_Z + 8; z += 1.6) box(0.03, 0.5, 0.03, M.tray, 2.0, CEIL_Y - 0.25, z, ceilT);
  [-0.2, 0, 0.2].forEach(dx => box(0.08, 0.08, 7.6, M.cable, 2.0 + dx, CEIL_Y - 0.53, WALL_Z + 4, ceilT));
  rbox(0.26, 0.16, 0.36, 0.03, M.hot, 2.0, CEIL_Y - 0.5, 0.3, ceilT);
  tag('ceil', scene, [2.0, CEIL_Y - 1.1, 0.3]);
  rbox(2, 2, 2, 0.05, M.crate, 3.2, 1.0, 0.5);

  // ---------- vehículo ----------
  const veh = new THREE.Group(); scene.add(veh);            // posición + vuelco (rotation.z)
  const cageWrap = new THREE.Group(); veh.add(cageWrap);    // aplastamiento en impacto
  const cageRot = keyed('cage', cageWrap);                  // giro al rodar
  const ring = (rad, x, tube, mat) => { const m = mesh(new THREE.TorusGeometry(rad, tube, 10, 64), mat, x, 0, 0, cageRot); m.rotation.y = Math.PI / 2; return m; };
  ring(R - 0.06, 0, 0.035, M.pacf); ring(R - 0.03, 0, 0.05, M.tpu);
  [-HALF, HALF].forEach(x => { ring(R_END - 0.05, x, 0.03, M.pacf); ring(R_END - 0.02, x, 0.04, M.tpu); });
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
    [-1, 1].forEach(sg => rod([sg * HALF, c * (R_END - 0.05), s * (R_END - 0.05)], [0, c * (R - 0.06), s * (R - 0.06)], 0.018, M.carbon, cageRot));
  }
  [-HALF, HALF].forEach(x => { for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; rod([x, 0, 0], [x, Math.cos(a) * (R_END - 0.06), Math.sin(a) * (R_END - 0.06)], 0.014, M.pacf, cageRot); } });
  // domos de autoadrizado: arcos de radio 1,1 (11 cm) centrados en el eje
  const domes = keyed('dome', cageRot);
  const RHO = 1.1, XC = APEX - RHO, PHI = Math.asin(R_END / RHO);
  [-1, 1].forEach(sg => {
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
      const pts = []; for (let i = 0; i <= 16; i++) { const f = PHI * i / 16; const rr = RHO * Math.sin(f); pts.push(new THREE.Vector3(sg * (XC + RHO * Math.cos(f)), c * rr, s * rr)); }
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025, 6), M.pacf, 0, 0, 0, domes);
    }
    mesh(new THREE.SphereGeometry(0.07, 16, 12), M.tpuDamp, sg * (APEX - 0.04), 0, 0, domes);
  });
  const hubs = keyed('hub', veh);
  [-HALF, HALF].forEach(x => { const d = mesh(new THREE.TorusGeometry(0.11, 0.04, 10, 20), M.tpuDamp, x, 0, 0, hubs); d.rotation.y = Math.PI / 2; cylX(0.07, 0.09, M.pacf, x, 0, 0, hubs); });

  const droneG = keyed('drone', veh);
  cylX(0.02, HALF * 2 + 0.1, M.carbon, 0, 0, 0, droneG, 10);
  [-0.22, 0.22].forEach(x => rbox(0.08, 0.12, 0.12, 0.02, M.petgY, x, 0.03, 0, droneG));
  const armL = Math.hypot(0.44, 0.44) * 2;
  [Math.PI / 4, -Math.PI / 4].forEach(a => { const arm = box(armL, 0.03, 0.07, M.carbon, 0, 0.08, 0, droneG); arm.rotation.y = a; });
  box(0.36, 0.025, 0.36, M.carbon, 0, 0.08, 0, droneG);
  const props = [];
  [[0.44, 0.44, 1], [-0.44, -0.44, 1], [0.44, -0.44, -1], [-0.44, 0.44, -1]].forEach(([x, z, dir]) => {
    cyl(0.08, 0.06, M.motor, x, 0.12, z, droneG); cyl(0.085, 0.04, M.bell, x, 0.17, z, droneG);
    const p = new THREE.Group(); p.position.set(x, 0.2, z); droneG.add(p);
    for (let b = 0; b < 3; b++) { const bl = rbox(0.38, 0.01, 0.07, 0.004, M.prop, 0, 0, 0, p); bl.geometry.translate(0.19, 0, 0); bl.rotation.y = 0.2 + b * Math.PI * 2 / 3; }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.38, 32), M.blur); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.005; p.add(disc);
    props.push({ p, dir });
  });
  rbox(0.35, 0.14, 0.7, 0.03, M.batt, 0, -0.06, 0, droneG);
  const espG = keyed('esp', droneG);
  rbox(0.32, 0.03, 0.3, 0.01, M.petgY, 0, 0.14, 0, espG);
  box(0.28, 0.02, 0.26, M.pcbK, 0, 0.165, 0, espG);
  box(0.13, 0.02, 0.17, M.chip, -0.04, 0.18, 0.02, espG);
  box(0.12, 0.012, 0.12, M.pcbB, 0.09, 0.18, -0.08, espG);
  const camG = keyed('cam', droneG);
  rbox(0.26, 0.2, 0.12, 0.02, M.petgG, 0, 0.12, -0.38, camG);
  const lv = cyl(0.04, 0.03, M.lens, -0.06, 0.13, -0.45, camG); lv.rotation.x = Math.PI / 2;
  const lt = cyl(0.03, 0.03, M.lens, 0.07, 0.13, -0.45, camG); lt.rotation.x = Math.PI / 2;
  const flowG = keyed('flow', droneG);
  box(0.14, 0.02, 0.12, M.pcbB, 0, -0.15, 0.2, flowG); box(0.04, 0.015, 0.04, M.lens, 0, -0.165, 0.2, flowG);
  box(0.08, 0.06, 0.02, M.pcbG, 0.12, 0.1, -0.4, flowG); box(0.08, 0.02, 0.08, M.pcbG, -0.12, 0.2, 0.18, flowG);

  tag('cage', veh, [0, R + 0.25, 0]);
  tag('dome', cageWrap, [APEX + 0.15, 0.35, 0]);
  tag('drone', droneG, [0.6, 0.35, 0.45]);
  tag('esp', droneG, [-0.45, 0.42, 0.1]);
  tag('cam', droneG, [0.2, 0.35, -0.65]);
  tag('hub', veh, [-HALF - 0.1, -0.4, 0.2]);
  tag('flow', droneG, [0.1, -0.4, 0.35]);

  // fuerzas
  const forces = new THREE.Group(); scene.add(forces);
  const thrustArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 2, 0xf2b705, 0.35, 0.2);
  const weightArrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 1.4, 0xb8c2cc, 0.3, 0.18);
  const normalArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1.2, 0x4ea8ff, 0.3, 0.18);
  forces.add(thrustArrow, weightArrow, normalArrow);
  const fLabels = {};
  [['thrust', 'Empuje', '#f2b705'], ['weight', 'Peso', '#b8c2cc'], ['normal', 'Contacto', '#4ea8ff']].forEach(([k, t, c]) => {
    const el = document.createElement('div'); el.className = 'flabel'; el.textContent = t; el.style.setProperty('--c', c);
    const o = new CSS2DObject(el); forces.add(o); fLabels[k] = o;
  });
  let forcesOn = false;

  // mano de referencia (tamaño real, ~19 cm)
  const handG = new THREE.Group(); scene.add(handG);
  const hand = new THREE.Group(); handG.add(hand);
  rbox(1.0, 0.3, 0.88, 0.13, M.skin, 0, 0, 0, hand);
  [-0.33, -0.11, 0.11, 0.32].forEach((z, i) => {
    const len = [0.42, 0.48, 0.46, 0.36][i];
    const f = new THREE.Group(); f.position.set(-0.48, -0.02, z); f.rotation.z = 0.85; hand.add(f);
    const p1 = mesh(new THREE.CapsuleGeometry(0.085, len, 6, 12), M.skin, -len / 2, 0, 0, f); p1.rotation.z = Math.PI / 2;
    const j = new THREE.Group(); j.position.set(-len, 0, 0); j.rotation.z = 0.9; f.add(j);
    const p2 = mesh(new THREE.CapsuleGeometry(0.078, len * 0.75, 6, 12), M.skin, -len * 0.37, 0, 0, j); p2.rotation.z = Math.PI / 2;
  });
  const th = new THREE.Group(); th.position.set(-0.15, -0.1, 0.42); th.rotation.set(0.4, 0.7, 0.9); hand.add(th);
  const t1 = mesh(new THREE.CapsuleGeometry(0.1, 0.42, 6, 12), M.skin, -0.22, 0, 0, th); t1.rotation.z = Math.PI / 2;
  const arm = mesh(new THREE.CylinderGeometry(0.31, 0.36, 2.4, 24), M.skin, 1.65, 0.05, 0, hand); arm.rotation.z = Math.PI / 2;
  const cuff = mesh(new THREE.CylinderGeometry(0.42, 0.44, 1.6, 24), M.sleeve, 3.05, 0.05, 0, hand); cuff.rotation.z = Math.PI / 2;
  hand.position.set(0.55, 2 * R + 0.2, 3); hand.rotation.set(0, 0, 0.5);
  const hEl = document.createElement('div'); hEl.className = 'dim3d'; hEl.textContent = 'Mano adulta ≈ 19 cm';
  const hLab = new CSS2DObject(hEl); hLab.position.set(1.8, 2 * R + 1.3, 3); handG.add(hLab);

  // cotas y volumen H2D
  const dims = new THREE.Group(); scene.add(dims);
  const dimMat = new THREE.LineBasicMaterial({ color: 0xf2b705 });
  function dimLine(a, b, text, off) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), O = new THREE.Vector3(...off);
    dims.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([A, B]), dimMat));
    [A, B].forEach(P => dims.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([P.clone().sub(O), P.clone().add(O)]), dimMat)));
    const el = document.createElement('div'); el.className = 'dim3d'; el.textContent = text;
    const o = new CSS2DObject(el); o.position.copy(A).add(B).multiplyScalar(0.5); dims.add(o);
  }
  dimLine([-APEX - 0.3, 0, 3], [-APEX - 0.3, 2 * R, 3], 'Ø 20 cm', [0, 0, 0.1]);
  dimLine([-APEX, 0.02, 3 + R + 0.35], [APEX, 0.02, 3 + R + 0.35], '25 cm con domos', [0, 0, 0.1]);
  dimLine([-6.4, 0, WALL_Z + 0.2], [-6.4, CEIL_Y, WALL_Z + 0.2], 'Techo de prueba a 1,2 m', [0.15, 0, 0]);
  const vol = new THREE.Group(); dims.add(vol); vol.position.set(4.6, 1.625, 5.2);
  const vg = new THREE.BoxGeometry(3.25, 3.25, 3.2);
  vol.add(new THREE.Mesh(vg, new THREE.MeshBasicMaterial({ color: 0xf2b705, transparent: true, opacity: 0.06, depthWrite: false })));
  const ve = new THREE.LineSegments(new THREE.EdgesGeometry(vg), new THREE.LineDashedMaterial({ color: 0xf2b705, dashSize: 0.15, gapSize: 0.1 }));
  ve.computeLineDistances(); vol.add(ve);
  const r1 = mesh(new THREE.TorusGeometry(R - 0.06, 0.035, 10, 64), M.pacf, 0, -1.58, 0, vol); r1.rotation.x = -Math.PI / 2;
  const r2 = mesh(new THREE.TorusGeometry(R - 0.03, 0.05, 10, 64), M.tpu, 0, -1.45, 0, vol); r2.rotation.x = -Math.PI / 2;
  const vEl = document.createElement('div'); vEl.className = 'dim3d vol'; vEl.textContent = 'H2D 32 × 32 × 32 cm · el anillo de 20 cm sale entero';
  const vLab = new CSS2DObject(vEl); vLab.position.set(0, 1.9, 0); vol.add(vLab);

  const setVis = (g, on) => g.traverse(o => { o.visible = on; });
  setVis(dims, false); setVis(handG, false); setVis(forces, false);

  // ---------- selección y cámara ----------
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let down = null, selected = null, follow = false;
  function pickAt(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(pickables, true).find(h => h.object.visible);
    if (!hit) return null;
    let o = hit.object; while (o && !o.userData.key) o = o.parent; return o ? o.userData.key : null;
  }
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const k = pickAt(e); if (k) select(k); else { selected = null; mark(); opts.onPick && opts.onPick(null); }
  });
  renderer.domElement.addEventListener('pointermove', e => { if (!e.buttons) renderer.domElement.style.cursor = pickAt(e) ? 'pointer' : 'grab'; });
  function mark() { for (const k in labels) labels[k].element.classList.toggle('on', k === selected); }
  function select(key) { selected = key; mark(); opts.onPick && opts.onPick(key); }

  let tween = null;
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function flyTo(pos, target) { tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(...pos), t1: new THREE.Vector3(...target), k: 0 }; }
  function setView(name) {
    follow = name === 'follow';
    if (follow) { const p = veh.position; flyTo([p.x + 4.5, p.y + 2.5, p.z + 5.5], [p.x, p.y, p.z]); return; }
    const v = VIEWS[name]; if (v) flyTo(v.pos, v.target);
  }

  // ---------- modos ----------
  const originals = new Map();
  function setMaterialMode(on) {
    scene.traverse(o => {
      if (!o.isMesh) return;
      if (on) { const c = CAT.get(o.material); if (c) { originals.set(o, o.material); o.material = CAT_MAT[c]; } }
      else if (originals.has(o)) o.material = originals.get(o);
    });
    if (!on) originals.clear();
  }
  function setLabels(on) { container.classList.toggle('no-labels', !on); }
  function setDims(on) { setVis(dims, on); }
  function setHand(on) { setVis(handG, on); }
  function setForces(on) { forcesOn = on; setVis(forces, on); }
  function setDomes(on) { setVis(domes, on); labels.dome.visible = on; }
  function setTheme(dark) { floorBig.material.color.set(dark ? 0x0e1418 : 0xd9dee2); grid.material.color && grid.material.color.set(dark ? 0x1d2830 : 0xbcc5cc); }
  function setHot(level) { M.hot.emissiveIntensity = 0.4 + level; }
  // temperatura del tablero: 25 °C apagado, 110 °C al rojo
  function setWallTemp(t, alarmOn) {
    const k = Math.max(0, Math.min(1, (t - 30) / 80));
    M.hotWall.emissiveIntensity = 0.05 + k * 3.2;
    wallLamp.intensity = k * 6;
    labels.wall.element.querySelector('span').textContent = `Tablero ${Math.round(t)} °C`;
    labels.wall.element.classList.toggle('alarm', !!alarmOn);
  }

  // ---------- pose ----------
  const up = new THREE.Vector3(), q = new THREE.Quaternion();
  function setPose(s) {
    veh.position.set(...s.pos);
    veh.rotation.z = s.tip || 0;
    droneG.rotation.x = s.tilt;
    cageRot.rotation.x = s.cageRot;
    const sq = s.squash || 0;
    cageWrap.scale.set(1 + sq * 0.35, 1 - sq, 1 + sq * 0.35);
    veh.updateMatrixWorld(true);
    droneG.getWorldQuaternion(q); up.set(0, 1, 0).applyQuaternion(q);
    const c = veh.position, len = Math.max(0.3, 2 * s.thrust);
    thrustArrow.position.copy(c); thrustArrow.setDirection(up); thrustArrow.setLength(len, 0.35, 0.2);
    weightArrow.position.copy(c);
    let n = null, cp = null;
    if (s.contact === 'Suelo') { n = [0, 1, 0]; cp = [c.x, 0, c.z]; }
    else if (s.contact === 'Muro') { n = [0, 0, 1]; cp = [c.x, c.y, ROOM.WALL_Z]; }
    else if (s.contact === 'Techo') { n = [0, -1, 0]; cp = [c.x, ROOM.CEIL_Y, c.z]; }
    if (n) { normalArrow.setDirection(new THREE.Vector3(...n)); normalArrow.position.set(...cp); }
    fLabels.thrust.position.copy(c).addScaledVector(up, len + 0.2);
    fLabels.weight.position.copy(c).add(new THREE.Vector3(0, -1.6, 0));
    if (n) fLabels.normal.position.set(cp[0] + n[0] * 1.35, cp[1] + n[1] * 1.35, cp[2] + n[2] * 1.35);
    const tv = forcesOn && s.thrust > 0.02, nv = forcesOn && !!n;
    thrustArrow.visible = tv; fLabels.thrust.visible = tv; normalArrow.visible = nv; fLabels.normal.visible = nv;
    weightArrow.visible = forcesOn; fLabels.weight.visible = forcesOn;
  }
  let propSpeed = 0;
  function setProps(v) { propSpeed = v; M.blur.opacity = Math.min(0.35, v * 0.35); M.prop.opacity = 0.9 - Math.min(0.7, v * 0.7); }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h); labelRenderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container); resize();

  const lastVeh = new THREE.Vector3();
  function frame(dt) {
    props.forEach(({ p, dir }) => { p.rotation.y += dir * propSpeed * dt * 70; });
    if (tween) {
      tween.k = Math.min(1, tween.k + dt / 0.9); const e = ease(tween.k);
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e);
      if (tween.k >= 1) tween = null;
    } else if (follow) { const d = veh.position.clone().sub(lastVeh); camera.position.add(d); controls.target.add(d); }
    lastVeh.copy(veh.position);
    controls.update();
    renderer.render(scene, camera); labelRenderer.render(scene, camera);
  }

  return { frame, setPose, setProps, setForces, setView, setLabels, setDims, setHand, setDomes, setMaterialMode, setTheme, setHot, setWallTemp, select };
}
