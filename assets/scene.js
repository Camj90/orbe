// Escena 3D de Orbe: dron de 7" dentro de una jaula rodante. Escala: 1 unidad = 10 cm.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const R = 2.3;            // radio exterior de la jaula (Ø 46 cm)
export const HALF = 2.2;         // medio largo de la jaula (44 cm)
export const ROOM = { WALL_Z: -8, CEIL_Y: 24 };
export const TARGETS = [
  { key: 'wall', pos: [4.4, 14, -7.55], temp: 78, name: 'Tablero en altura' },
  { key: 'ceil', pos: [4.0, 23.3, 0.5], temp: 64, name: 'Empalme en bandeja de techo' }
];

export const INFO = {
  cage: { tag: 'JA-01', short: 'Jaula', name: 'Jaula rodante', desc: 'Cilindro de 46 cm de diámetro y 44 cm de largo. Gira libre alrededor del eje, así que el dron puede rodar, trepar y chocar sin que las hélices toquen nada.', print: 'Anillos en PAHT-CF, impresos en 6 segmentos de 60°. Banda de rodado en TPU 95A con relleno giroide. Largueros de tubo de carbono comprado.', func: 'Rodar, absorber golpes y proteger las hélices' },
  drone: { tag: 'DR-07', short: 'Dron 7"', name: 'Dron de 7 pulgadas', desc: 'El mismo dron del BOM anterior: frame GEPRC Mark4, motores 2807 de 1300 KV, controladora SpeedyBee F405 con ArduPilot y batería 6S de Li-ion.', print: 'Soportes de cámara y abrazaderas del eje en PETG-HF.', func: 'Empuje para rodar, trepar y volar' },
  pi: { tag: 'CC-01', short: 'Raspberry + cámaras', name: 'Raspberry Pi 4 y cámaras', desc: 'Computadora a bordo con Camera Module 3 y cámara térmica MLX90640. Arma el informe de inspección con fotos y temperaturas.', print: 'Caja ventilada en PETG-HF.', func: 'Inspección térmica y misiones autónomas' },
  hub: { tag: 'AM-01', short: 'Amortiguadores', name: 'Eje y amortiguadores', desc: 'Eje de carbono de 10 mm sobre rodamientos 6800. Entre el eje y los rayos de cada anillo va un anillo de TPU que se deforma en un golpe.', print: 'Amortiguadores en TPU 95A. Rayos en PAHT-CF.', func: 'Aislar la electrónica del impacto' },
  flow: { tag: 'OF-01', short: 'Flujo óptico', name: 'Flujo óptico y distancia', desc: 'Matek 3901-L0X bajo el dron y dos VL53L1X (frontal y superior). Permiten mantener la posición sin GPS y detectar muro y techo.', print: 'Soportes en PETG-HF.', func: 'Navegar dentro de una planta' },
  wall: { tag: 'TB-07', short: 'Tablero 78 °C', name: 'Tablero eléctrico en altura', desc: 'Objetivo de la demo: un tablero a 1,4 m sobre el piso, con una conexión recalentada que el dron detecta al subir el muro.', print: '—', func: 'Punto de inspección' },
  ceil: { tag: 'BT-03', short: 'Empalme 64 °C', name: 'Empalme en bandeja de techo', desc: 'Objetivo de la demo: un empalme caliente en la bandeja portacables del techo, a 2,4 m.', print: '—', func: 'Punto de inspección' }
};

const VIEWS = {
  iso:   { pos: [31, 9, 30], target: [1, 11, -2] },
  side:  { pos: [36, 11, 2], target: [0, 11, -1] },
  front: { pos: [2, 10, 34], target: [0, 10, -2] },
  scale: { pos: [12.5, 8.5, 19.5], target: [0.8, 3.2, 5.6] },
  cage:  { pos: [7.5, 5.5, 12.5], target: [0, 2.3, 6] }
};

function layerTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 4) { g.fillStyle = '#a8a8a8'; g.fillRect(0, y, 64, 2); g.fillStyle = '#6a6a6a'; g.fillRect(0, y + 2, 64, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8);
  return t;
}
function gyroidTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1e21'; g.fillRect(0, 0, 128, 32);
  g.strokeStyle = '#2c3136'; g.lineWidth = 3;
  for (let x = -16; x < 144; x += 16) { g.beginPath(); for (let y = 0; y <= 32; y += 2) g.lineTo(x + 5 * Math.sin(y / 32 * Math.PI * 2), y); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 1);
  return t;
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
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
  camera.position.set(...VIEWS.iso.pos);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...VIEWS.iso.target);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 4; controls.maxDistance = 70; controls.maxPolarAngle = Math.PI * 0.495;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xe6eeff, 0x1a2026, 0.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.position.set(18, 30, 22); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const fill = new THREE.PointLight(0xfff1dd, 120, 40, 2); fill.position.set(2, 20, 4); scene.add(fill);

  // ---------- materiales ----------
  const layers = layerTexture();
  const printed = (color, rough = 0.5) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, bumpMap: layers, bumpScale: 0.5 });
  const gyro = gyroidTexture();
  const M = {
    pacf: printed(0x2e3338, 0.62),
    petgY: printed(0xf2b705),
    petgG: printed(0x4b5661),
    tpu: new THREE.MeshStandardMaterial({ map: gyro, roughness: 0.85 }),
    tpuDamp: new THREE.MeshStandardMaterial({ color: 0xff7a2f, roughness: 0.7 }),
    carbon: new THREE.MeshStandardMaterial({ color: 0x15181b, metalness: 0.35, roughness: 0.32 }),
    motor: new THREE.MeshStandardMaterial({ color: 0x7d8790, metalness: 0.85, roughness: 0.3 }),
    bell: new THREE.MeshStandardMaterial({ color: 0xd14b2a, metalness: 0.6, roughness: 0.35 }),
    prop: new THREE.MeshStandardMaterial({ color: 0x1d2a3a, roughness: 0.5, transparent: true, opacity: 0.95 }),
    blur: new THREE.MeshBasicMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    batt: new THREE.MeshStandardMaterial({ color: 0x1f4f8f, roughness: 0.45 }),
    pcbG: new THREE.MeshStandardMaterial({ color: 0x1f7a4a, roughness: 0.45 }),
    pcbB: new THREE.MeshStandardMaterial({ color: 0x1d3f7a, roughness: 0.45 }),
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
    crate: new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.85 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xd9a383, roughness: 0.62 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x24415f, roughness: 0.85 })
  };
  const CAT = new Map([[M.pacf, 'pacf'], [M.petgY, 'petg'], [M.petgG, 'petg'], [M.tpu, 'tpu'], [M.tpuDamp, 'tpu'],
    [M.carbon, 'carbon'], [M.motor, 'buy'], [M.bell, 'buy'], [M.prop, 'buy'], [M.batt, 'buy'], [M.pcbG, 'buy'], [M.pcbB, 'buy'], [M.chip, 'buy'], [M.lens, 'buy']]);
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
  const cyl = (r, h, mat, x, y, z, p, seg = 28) => mesh(new THREE.CylinderGeometry(r, r, h, seg), mat, x, y, z, p);
  const cylX = (r, h, mat, x, y, z, p, seg) => { const m = cyl(r, h, mat, x, y, z, p, seg); m.rotation.z = Math.PI / 2; return m; };

  const pickables = [];
  const labels = {};
  function tag(key, parent, pos) {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'tag3d';
    el.innerHTML = `<b>${INFO[key].tag}</b><span>${INFO[key].short}</span>`;
    el.addEventListener('click', e => { e.stopPropagation(); select(key); });
    const o = new CSS2DObject(el); o.position.set(...pos); parent.add(o); labels[key] = o; return o;
  }
  function keyed(key, parent) { const g = new THREE.Group(); g.userData.key = key; parent.add(g); pickables.push(g); return g; }

  // ---------- sala ----------
  const floorBig = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x0e1418, roughness: 0.95 }));
  floorBig.rotation.x = -Math.PI / 2; floorBig.position.y = -0.02; floorBig.receiveShadow = true; scene.add(floorBig);
  const grid = new THREE.GridHelper(200, 100, 0x26323b, 0x1a232a); grid.position.y = -0.01; scene.add(grid);
  box(24, 0.2, 22, M.floor, 0, -0.1, 3);
  const { WALL_Z, CEIL_Y } = ROOM;
  box(24, CEIL_Y + 1, 0.6, M.wall, 0, (CEIL_Y + 1) / 2, WALL_Z - 0.3);
  for (let x = -10; x <= 10; x += 5) box(0.12, CEIL_Y, 0.06, M.seam, x, CEIL_Y / 2, WALL_Z + 0.02);
  for (let y = 6; y < CEIL_Y; y += 6) box(24, 0.08, 0.06, M.seam, 0, y, WALL_Z + 0.02);
  box(24, 1, 16.6, M.ceil, 0, CEIL_Y + 0.5, WALL_Z + 8);
  [-11.6, 11.6].forEach(x => box(0.8, 1.6, 16.6, M.ceil, x, CEIL_Y - 0.8, WALL_Z + 8));

  // objetivos de inspección
  const wallT = keyed('wall', scene);
  rbox(2.6, 3.2, 0.7, 0.05, M.cab, 4.4, 14, WALL_Z + 0.35, wallT);
  box(2.2, 0.2, 0.2, M.cable, 4.4, 15.8, WALL_Z + 0.3, wallT);
  box(0.2, 7, 0.2, M.cable, 5.2, 19.4, WALL_Z + 0.25, wallT);
  const hot1 = mesh(new THREE.CircleGeometry(0.35, 20), M.hot, 4.0, 13.6, WALL_Z + 0.72, wallT);
  tag('wall', scene, [4.4, 16.2, WALL_Z + 0.6]);
  const ceilT = keyed('ceil', scene);
  box(1.6, 0.12, 15, M.tray, 4.0, CEIL_Y - 1.2, WALL_Z + 8, ceilT);
  [-0.8, 0.8].forEach(dx => box(0.06, 0.5, 15, M.tray, 4.0 + dx, CEIL_Y - 0.95, WALL_Z + 8, ceilT));
  for (let z = WALL_Z + 1.5; z < WALL_Z + 15; z += 3) box(0.06, 1.0, 0.06, M.tray, 4.0, CEIL_Y - 0.5, z, ceilT);
  [-0.4, 0, 0.4].forEach(dx => box(0.16, 0.16, 15, M.cable, 4.0 + dx, CEIL_Y - 1.05, WALL_Z + 8, ceilT));
  const hot2 = rbox(0.5, 0.3, 0.7, 0.05, M.hot, 4.0, CEIL_Y - 1.0, 0.5, ceilT);
  tag('ceil', scene, [4.0, CEIL_Y - 2.2, 0.5]);
  // obstáculo para el vuelo
  rbox(5, 4.5, 5, 0.08, M.crate, 6.5, 2.25, 0.5);
  box(5.2, 0.4, 5.2, M.crate, 6.5, 0.2, 0.5);

  // ---------- vehículo ----------
  const veh = new THREE.Group(); scene.add(veh);
  const cageWrap = new THREE.Group(); veh.add(cageWrap);       // escala para el aplastamiento
  const cageRot = keyed('cage', cageWrap);                    // gira al rodar
  const ringGeo = new THREE.TorusGeometry(R - 0.16, 0.07, 10, 72);
  const treadGeo = new THREE.TorusGeometry(R - 0.1, 0.11, 12, 72);
  [-HALF, HALF].forEach(x => {
    const ring = mesh(ringGeo, M.pacf, x, 0, 0, cageRot); ring.rotation.y = Math.PI / 2;
    const tread = mesh(treadGeo, M.tpu, x, 0, 0, cageRot); tread.rotation.y = Math.PI / 2;
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      const s = box(0.06, R - 0.45, 0.1, M.pacf, x, 0, 0, cageRot);
      s.position.set(x, Math.cos(a) * (R - 0.2) / 2 + 0.0, Math.sin(a) * (R - 0.2) / 2);
      s.rotation.x = a;
    }
  });
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    cylX(0.05, HALF * 2, M.carbon, 0, Math.cos(a) * (R - 0.16), Math.sin(a) * (R - 0.16), cageRot, 10);
  }
  // amortiguadores (no giran con la jaula visualmente, quedan en el eje)
  const hubs = keyed('hub', veh);
  [-HALF, HALF].forEach(x => {
    const d = mesh(new THREE.TorusGeometry(0.28, 0.1, 10, 24), M.tpuDamp, x, 0, 0, hubs); d.rotation.y = Math.PI / 2;
    cylX(0.17, 0.22, M.pacf, x, 0, 0, hubs);
  });

  // dron (gira alrededor del eje para orientar el empuje)
  const droneG = keyed('drone', veh);
  cylX(0.05, HALF * 2 + 0.3, M.carbon, 0, 0, 0, droneG, 12);
  [-0.55, 0.55].forEach(x => rbox(0.18, 0.3, 0.26, 0.04, M.petgY, x, 0.05, 0, droneG));
  const armL = Math.hypot(1.04, 1.04) * 2;
  [Math.PI / 4, -Math.PI / 4].forEach(a => { const arm = box(armL, 0.06, 0.16, M.carbon, 0, 0.2, 0, droneG); arm.rotation.y = a; });
  box(0.95, 0.04, 0.95, M.carbon, 0, 0.2, 0, droneG);
  box(0.95, 0.04, 0.95, M.carbon, 0, 0.62, 0, droneG);
  [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].forEach(([x, z]) => cyl(0.025, 0.4, M.chip, x, 0.41, z, droneG, 8));
  box(0.36, 0.08, 0.36, M.pcbB, 0, 0.3, 0, droneG);
  box(0.36, 0.06, 0.36, M.pcbK || M.pcbB, 0, 0.4, 0, droneG);
  const props = [];
  [[1.04, 1.04, 1], [-1.04, -1.04, 1], [1.04, -1.04, -1], [-1.04, 1.04, -1]].forEach(([x, z, dir]) => {
    cyl(0.17, 0.14, M.motor, x, 0.3, z, droneG);
    cyl(0.175, 0.1, M.bell, x, 0.42, z, droneG);
    const p = new THREE.Group(); p.position.set(x, 0.5, z); droneG.add(p);
    const blade = rbox(0.89, 0.02, 0.16, 0.01, M.prop, 0, 0, 0, p); blade.rotation.y = 0.2;
    const blade2 = rbox(0.89, 0.02, 0.16, 0.01, M.prop, 0, 0, 0, p); blade2.rotation.y = 0.2 + Math.PI * 2 / 3;
    const blade3 = rbox(0.89, 0.02, 0.16, 0.01, M.prop, 0, 0, 0, p); blade3.rotation.y = 0.2 + Math.PI * 4 / 3;
    [blade, blade2, blade3].forEach(b => { b.geometry.translate(0.445, 0, 0); });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.89, 40), M.blur); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.01; p.add(disc);
    props.push({ p, dir });
  });
  // batería bajo el frame
  rbox(0.75, 0.42, 1.26, 0.05, M.batt, 0, -0.18, 0, droneG);
  // computadora y cámaras
  const piG = keyed('pi', droneG);
  rbox(0.95, 0.34, 0.66, 0.05, M.petgY, 0, 0.82, 0.05, piG);
  for (let i = 0; i < 5; i++) box(0.7, 0.02, 0.04, M.petgG, 0, 0.995, -0.18 + i * 0.1, piG);
  rbox(0.32, 0.3, 0.2, 0.03, M.petgG, -0.25, 0.5, -0.62, piG);
  const l1 = cyl(0.08, 0.06, M.lens, -0.25, 0.5, -0.74, piG); l1.rotation.x = Math.PI / 2;
  rbox(0.32, 0.3, 0.2, 0.03, M.petgG, 0.25, 0.5, -0.62, piG);
  const l2 = cyl(0.05, 0.06, M.lens, 0.25, 0.5, -0.74, piG); l2.rotation.x = Math.PI / 2;
  cyl(0.02, 0.5, M.carbon, 0.35, 1.2, 0.3, droneG, 8);
  cyl(0.24, 0.07, M.petgG, 0.35, 1.47, 0.3, droneG);
  // flujo óptico y distancia
  const flowG = keyed('flow', droneG);
  box(0.3, 0.04, 0.25, M.pcbB, 0, -0.42, 0.25, flowG);
  box(0.08, 0.03, 0.08, M.lens, 0, -0.45, 0.25, flowG);
  box(0.16, 0.12, 0.04, M.pcbG, 0, 0.25, -0.58, flowG);
  box(0.16, 0.04, 0.16, M.pcbG, -0.3, 1.0, 0.3, flowG);

  tag('cage', veh, [0, R + 0.5, 0]);
  tag('drone', droneG, [1.35, 0.9, 1.0]);
  tag('pi', droneG, [-0.9, 1.25, -0.2]);
  tag('hub', veh, [HALF + 0.4, -0.7, 0]);
  tag('flow', droneG, [0.2, -0.9, 0.7]);

  // vectores de fuerza
  const forces = new THREE.Group(); forces.visible = false; scene.add(forces);
  const thrustArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 4, 0xf2b705, 0.8, 0.45);
  const weightArrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 3.2, 0xb8c2cc, 0.7, 0.4);
  const normalArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 2.6, 0x4ea8ff, 0.6, 0.35);
  forces.add(thrustArrow, weightArrow, normalArrow);
  const fLabels = {};
  [['thrust', 'Empuje', '#f2b705'], ['weight', 'Peso', '#b8c2cc'], ['normal', 'Contacto', '#4ea8ff']].forEach(([k, t, c]) => {
    const el = document.createElement('div'); el.className = 'flabel'; el.textContent = t; el.style.setProperty('--c', c);
    const o = new CSS2DObject(el); forces.add(o); fLabels[k] = o;
  });

  // mano de referencia
  const handG = new THREE.Group(); scene.add(handG); handG.visible = false;
  const hand = new THREE.Group(); handG.add(hand);
  rbox(1.0, 0.3, 0.88, 0.13, M.skin, 0, 0, 0, hand);
  [-0.33, -0.11, 0.11, 0.32].forEach((z, i) => {
    const len = [0.42, 0.48, 0.46, 0.36][i];
    const f = new THREE.Group(); f.position.set(-0.48, -0.02, z); f.rotation.z = 0.8; hand.add(f);
    const p1 = mesh(new THREE.CapsuleGeometry(0.085, len, 6, 12), M.skin, -len / 2, 0, 0, f); p1.rotation.z = Math.PI / 2;
    const j = new THREE.Group(); j.position.set(-len, 0, 0); j.rotation.z = 0.9; f.add(j);
    const p2 = mesh(new THREE.CapsuleGeometry(0.078, len * 0.75, 6, 12), M.skin, -len * 0.37, 0, 0, j); p2.rotation.z = Math.PI / 2;
  });
  const th = new THREE.Group(); th.position.set(-0.15, -0.1, 0.42); th.rotation.set(0.4, 0.7, 0.9); hand.add(th);
  const t1 = mesh(new THREE.CapsuleGeometry(0.1, 0.42, 6, 12), M.skin, -0.22, 0, 0, th); t1.rotation.z = Math.PI / 2;
  const arm = mesh(new THREE.CylinderGeometry(0.31, 0.36, 2.4, 24), M.skin, 1.65, 0.05, 0, hand); arm.rotation.z = Math.PI / 2;
  const cuff = mesh(new THREE.CylinderGeometry(0.42, 0.44, 1.6, 24), M.sleeve, 3.05, 0.05, 0, hand); cuff.rotation.z = Math.PI / 2;
  hand.position.set(HALF + 0.55, 2 * R + 0.12, 6); hand.rotation.set(0, 0, 0.55);
  const hEl = document.createElement('div'); hEl.className = 'dim3d'; hEl.textContent = 'Mano adulta ≈ 19 cm';
  const hLab = new CSS2DObject(hEl); hLab.position.set(HALF + 1.6, 2 * R + 1.6, 6); handG.add(hLab);

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
  dimLine([-HALF - 0.6, 0, 6], [-HALF - 0.6, 2 * R, 6], 'Ø 46 cm', [0, 0, 0.2]);
  dimLine([-HALF, 0.05, 6 + R + 0.6], [HALF, 0.05, 6 + R + 0.6], '44 cm', [0, 0, 0.2]);
  dimLine([-13, 0, WALL_Z + 0.4], [-13, CEIL_Y, WALL_Z + 0.4], 'Techo a 2,4 m', [0.3, 0, 0]);
  const vol = new THREE.Group(); dims.add(vol); vol.position.set(9.5, 1.625, 9.5);
  const vg = new THREE.BoxGeometry(3.25, 3.25, 3.2);
  vol.add(new THREE.Mesh(vg, new THREE.MeshBasicMaterial({ color: 0xf2b705, transparent: true, opacity: 0.06, depthWrite: false })));
  const ve = new THREE.LineSegments(new THREE.EdgesGeometry(vg), new THREE.LineDashedMaterial({ color: 0xf2b705, dashSize: 0.15, gapSize: 0.1 }));
  ve.computeLineDistances(); vol.add(ve);
  const seg = mesh(new THREE.TorusGeometry(R - 0.16, 0.07, 10, 24, Math.PI / 3), M.pacf, -0.3, -1.6 + 0.07, -1.1, vol);
  seg.rotation.x = -Math.PI / 2;
  const segT = mesh(new THREE.TorusGeometry(R - 0.1, 0.11, 10, 24, Math.PI / 3), M.tpu, -0.3, -1.6 + 0.4, -1.1, vol);
  segT.rotation.x = -Math.PI / 2;
  const vEl = document.createElement('div'); vEl.className = 'dim3d vol'; vEl.textContent = 'H2D 32 × 32 × 32 cm · 1 segmento de anillo';
  const vLab = new CSS2DObject(vEl); vLab.position.set(0, 1.9, 0); vol.add(vLab);
  dims.traverse(o => { o.visible = false; });

  // ---------- selección y cámara ----------
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let down = null, selected = null, follow = false;
  function pickAt(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(pickables, true)[0];
    if (!hit) return null;
    let o = hit.object; while (o && !o.userData.key) o = o.parent;
    return o ? o.userData.key : null;
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
    if (follow) { const p = veh.position; flyTo([p.x + 12, p.y + 6, p.z + 14], [p.x, p.y, p.z]); return; }
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
  function setDims(on) { dims.traverse(o => { o.visible = on; }); }
  function setHand(on) { handG.traverse(o => { o.visible = on; }); }
  setHand(false);
  function setForcesVisible(on) { forces.traverse(o => { o.visible = on; }); }
  setForcesVisible(false);
  function setTheme(dark) {
    floorBig.material.color.set(dark ? 0x0e1418 : 0xd9dee2);
    grid.material.color && grid.material.color.set(dark ? 0x1d2830 : 0xbcc5cc);
  }

  // ---------- estado ----------
  const up = new THREE.Vector3();
  function setPose(s) {
    veh.position.set(...s.pos);
    droneG.rotation.x = s.tilt;
    cageRot.rotation.x = s.cageRot;
    const q = s.squash || 0;
    cageWrap.scale.set(1 + q * 0.35, 1 - q, 1 + q * 0.35);
    cageWrap.position.y = -q * R;
    // fuerzas
    up.set(0, Math.cos(s.tilt), Math.sin(s.tilt));
    const c = veh.position;
    thrustArrow.position.copy(c); thrustArrow.setDirection(up); thrustArrow.setLength(Math.max(0.6, 4 * s.thrust), 0.8, 0.45);
    thrustArrow.visible = forces.visible && s.thrust > 0.02;
    weightArrow.position.copy(c);
    let n = null, cp = null;
    if (s.contact === 'Suelo') { n = [0, 1, 0]; cp = [c.x, 0, c.z]; }
    else if (s.contact === 'Muro') { n = [0, 0, 1]; cp = [c.x, c.y, ROOM.WALL_Z]; }
    else if (s.contact === 'Techo') { n = [0, -1, 0]; cp = [c.x, ROOM.CEIL_Y, c.z]; }
    normalArrow.visible = forces.visible && !!n;
    if (n) { normalArrow.setDirection(new THREE.Vector3(...n)); normalArrow.position.set(...cp); }
    fLabels.thrust.position.copy(c).addScaledVector(up, Math.max(0.6, 4 * s.thrust) + 0.4);
    fLabels.weight.position.copy(c).add(new THREE.Vector3(0, -3.6, 0));
    if (n) fLabels.normal.position.set(cp[0] + n[0] * 2.9, cp[1] + n[1] * 2.9, cp[2] + n[2] * 2.9);
    fLabels.thrust.visible = thrustArrow.visible; fLabels.normal.visible = normalArrow.visible; fLabels.weight.visible = forces.visible;
  }
  let propSpeed = 0;
  function setProps(v) { propSpeed = v; M.blur.opacity = Math.min(0.35, v * 0.35); M.prop.opacity = 1 - Math.min(0.75, v * 0.75); }
  function setForces(on) { forces.visible = on; setForcesVisible(on); }
  function setHot(level) { M.hot.emissiveIntensity = 0.4 + level; }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h); labelRenderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container); resize();

  const lastVeh = new THREE.Vector3();
  function frame(dt) {
    props.forEach(({ p, dir }) => { p.rotation.y += dir * propSpeed * dt * 60; });
    if (tween) {
      tween.k = Math.min(1, tween.k + dt / 0.9); const e = ease(tween.k);
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e);
      if (tween.k >= 1) tween = null;
    } else if (follow) {
      const d = veh.position.clone().sub(lastVeh);
      camera.position.add(d); controls.target.add(d);
    }
    lastVeh.copy(veh.position);
    controls.update();
    renderer.render(scene, camera); labelRenderer.render(scene, camera);
  }

  return { frame, setPose, setProps, setForces, setView, setLabels, setDims, setHand, setMaterialMode, setTheme, setHot, select };
}
