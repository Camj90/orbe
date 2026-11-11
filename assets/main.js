import { createOrbe, R, ROOM, TARGETS, INFO } from './scene.js';

const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat('es-CL');
const dec = (n, d = 1) => n.toFixed(d).replace('.', ',');

/* ---------------- tema ---------------- */
const root = document.documentElement;
const isDark = () => { const t = root.getAttribute('data-theme'); return t ? t === 'dark' : !window.matchMedia('(prefers-color-scheme: light)').matches; };
try { const s = localStorage.getItem('orbe-theme'); if (s) root.setAttribute('data-theme', s); } catch (e) { /* sin almacenamiento */ }
$('themeBtn').addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark'; root.setAttribute('data-theme', next);
  try { localStorage.setItem('orbe-theme', next); } catch (e) { /* sin almacenamiento */ }
  orbe && orbe.setTheme(isDark());
});

/* ---------------- escena ---------------- */
let orbe = null;
function showInfo(key) {
  const card = $('infoCard');
  if (!key) { card.hidden = true; return; }
  const i = INFO[key];
  $('infoTag').textContent = i.tag; $('infoName').textContent = i.name; $('infoDesc').textContent = i.desc;
  $('infoPrint').textContent = i.print; $('infoFunc').textContent = i.func; card.hidden = false;
}
$('infoClose').addEventListener('click', () => { $('infoCard').hidden = true; });
try { orbe = createOrbe($('viewport'), { onPick: showInfo }); orbe.setTheme(isDark()); }
catch (err) { $('viewport').insertAdjacentHTML('beforeend', '<p class="vp-error">Este navegador no pudo iniciar la vista 3D (WebGL). La simulación sigue funcionando en los paneles.</p>'); }

document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-view]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  const scale = b.dataset.view === 'scale';
  if (scale) startScenario('idle');
  orbe && orbe.setHand(scale);
  orbe && orbe.setView(b.dataset.view);
}));
function toggle(btn, fn) { btn.addEventListener('click', () => { const on = btn.getAttribute('aria-pressed') !== 'true'; btn.setAttribute('aria-pressed', String(on)); fn(on); }); }
toggle($('tLabels'), on => orbe && orbe.setLabels(on));
toggle($('tForces'), on => orbe && orbe.setForces(on));
toggle($('tDims'), on => orbe && orbe.setDims(on));
toggle($('tMat'), on => { orbe && orbe.setMaterialMode(on); $('matLegend').hidden = !on; });

/* ---------------- escenarios ---------------- */
const WZ = ROOM.WALL_Z, CY = ROOM.CEIL_Y;
const HOME = [0, R, 6];
const seg = (to, dur, tilt, mode, contact, power, extra = {}) => ({ to, dur, tilt, mode, contact, power, ...extra });
const SC = {
  idle: { title: 'En reposo', watch: 'Elige un escenario para ver cómo se mueve Orbe. Puedes activar Fuerzas para ver el empuje, el peso y el contacto.', segs: [seg(null, 1e9, 0, 'En reposo', 'Suelo', 0, { props: 0 })] },
  suelo: { title: 'Rodar por el suelo', watch: 'El dron se inclina dentro de la jaula y empuja apenas lo justo para rodar. Gasta unos 50 W, cerca de un sexto de lo que gasta volando.', segs: [
    seg([0, R, -3], 4.5, -0.28, 'Rodando', 'Suelo', 50), seg([0, R, 6], 5, 0.28, 'Rodando', 'Suelo', 50), seg(null, 1.5, 0, 'Detenido', 'Suelo', 6, { props: 0.1 })] },
  muro: { title: 'Subir el muro', watch: 'Al llegar al muro, el dron gira el empuje hacia la pared: una parte lo sostiene y otra lo aprieta contra el muro para que la jaula ruede hacia arriba. Arriba inspecciona el tablero con la cámara térmica.', segs: [
    seg([0, R, WZ + R], 4, -0.3, 'Rodando', 'Suelo', 50), seg([0, 14, WZ + R], 5, -1.05, 'Trepando', 'Muro', 300),
    seg(null, 3.5, -1.0, 'Inspeccionando', 'Muro', 290, { inspect: 'wall' }), seg([0, R, WZ + R], 4, -0.85, 'Bajando', 'Muro', 230),
    seg([0, R, 6], 4.5, 0.28, 'Rodando', 'Suelo', 50)] },
  techo: { title: 'Recorrer el techo', watch: 'Sube por el muro y pasa al techo. Ahí el empuje apunta hacia arriba y aprieta la jaula contra el techo mientras rueda. Al final se suelta y aterriza.', segs: [
    seg([0, R, WZ + R], 4, -0.3, 'Rodando', 'Suelo', 50), seg([0, CY - R, WZ + R], 6.5, -1.05, 'Trepando', 'Muro', 300),
    seg([0, CY - R, 0.5], 5, 0.22, 'Rodando en el techo', 'Techo', 350), seg(null, 3.5, 0.12, 'Inspeccionando', 'Techo', 340, { inspect: 'ceil' }),
    seg([0, 10, 3], 2.5, 0, 'Volando', 'Aire', 330), seg([0, R, 6], 3, 0, 'Aterrizando', 'Aire', 300)] },
  volar: { title: 'Volar sobre un obstáculo', watch: 'Cuando algo bloquea el paso, despega, pasa por encima y vuelve a rodar. Volando gasta unas seis veces más que rodando.', segs: [
    seg([0, 9, 4.5], 2.5, -0.05, 'Despegando', 'Aire', 340), seg([6.5, 10.5, 0.5], 3, -0.15, 'Volando', 'Aire', 330),
    seg([12, R, -3], 3, 0, 'Aterrizando', 'Aire', 300), seg(null, 1.2, 0, 'En tierra', 'Suelo', 6, { props: 0.1 }),
    seg([6.5, 10.5, 0.5], 3, 0.15, 'Volando', 'Aire', 330), seg([0, R, 6], 3, 0, 'Aterrizando', 'Aire', 300)] },
  caida: { title: 'Prueba de caída de 1,5 m', watch: 'Sube hasta que la parte baja de la jaula queda a 1,5 m, apaga los motores y cae. La banda de TPU, la jaula y los amortiguadores del eje frenan el golpe en unos 35 mm.', segs: [
    seg([0, 15 + R, 6], 3, 0, 'Subiendo a 1,5 m', 'Aire', 330), seg(null, 1.2, 0, 'Motores apagados', 'Aire', 0, { props: 0 }),
    seg([0, R, 6], 1.65, 0, 'Caída libre (cámara lenta ×3)', 'Aire', 0, { fall: true, props: 0 }),
    seg(null, 2.5, 0, 'Impacto absorbido', 'Suelo', 0, { impact: true, props: 0 }), seg(null, 1, 0, 'Listo', 'Suelo', 6, { props: 0.1 })] }
};

const S = {
  sc: 'idle', i: 0, t: 0, from: HOME.slice(), pos: HOME.slice(), tilt: 0, tilt0: 0, cageRot: 0, squash: 0,
  power: 0, battWh: 89, capWh: 89, speed: 0, simSec: 9 * 3600, paused: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  hist: Array(120).fill(0), log: [], maxTemp: 23, impact: null
};
const clock = () => { const s = Math.floor(S.simSec); return [Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':'); };
function log(text, kind = '') {
  S.log.unshift({ t: clock(), text, kind, mode: cur().mode });
  if (S.log.length > 10) S.log.pop();
  $('logBody').innerHTML = S.log.map(l => `<tr class="${l.kind}"><td class="mono">${l.t}</td><td>${l.text}</td><td>${l.mode}</td></tr>`).join('');
}
const cur = () => SC[S.sc].segs[Math.min(S.i, SC[S.sc].segs.length - 1)];

function startScenario(name) {
  S.sc = name; S.i = 0; S.t = 0; S.pos = HOME.slice(); S.from = HOME.slice(); S.tilt0 = S.tilt; S.squash = 0;
  document.querySelectorAll('[data-scen]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scen === name)));
  $('watchTitle').textContent = SC[name].title; $('watchText').textContent = SC[name].watch;
  if (name !== 'idle') {
    log(`Inicio: ${SC[name].title}`);
    document.querySelectorAll('[data-view="scale"]').forEach(b => { if (b.getAttribute('aria-pressed') === 'true') { b.setAttribute('aria-pressed', 'false'); document.querySelector('[data-view="iso"]').setAttribute('aria-pressed', 'true'); orbe && orbe.setView('iso'); } });
    orbe && orbe.setHand(false);
  }
  if (name === 'caida') { S.impact = null; renderImpact(); }
}
document.querySelectorAll('[data-scen]').forEach(b => b.addEventListener('click', () => startScenario(b.dataset.scen)));
$('pauseBtn').addEventListener('click', () => {
  S.paused = !S.paused; $('pauseBtn').setAttribute('aria-pressed', String(S.paused));
  $('pauseBtn').querySelector('span').textContent = S.paused ? 'Reanudar' : 'Pausar';
});

const smooth = k => k * k * (3 - 2 * k);
function step(dt) {
  S.simSec += dt;
  const segs = SC[S.sc].segs;
  let sg = segs[S.i];
  S.t += dt;
  const k = Math.min(1, S.t / sg.dur);
  const prev = S.pos.slice();
  if (sg.to) {
    if (sg.fall) {
      const y0 = S.from[1], y1 = sg.to[1], gg = 2 * (y0 - y1) / (sg.dur * sg.dur);
      S.pos = [sg.to[0], Math.max(y1, y0 - 0.5 * gg * S.t * S.t), sg.to[2]];
    } else {
      const e = smooth(k);
      S.pos = S.from.map((v, j) => v + (sg.to[j] - v) * e);
    }
  }
  S.tilt = S.tilt0 + (sg.tilt - S.tilt0) * smooth(Math.min(1, k / 0.35));
  const dist = Math.hypot(S.pos[0] - prev[0], S.pos[1] - prev[1], S.pos[2] - prev[2]);
  S.speed = dt > 0 ? dist / dt / 10 : 0;
  if (sg.contact !== 'Aire') S.cageRot -= dist / R;
  if (sg.impact) { const t = S.t; S.squash = Math.max(-0.02, 0.15 * Math.exp(-5 * t) * Math.cos(16 * t)); } else S.squash = 0;
  S.power = sg.power * (0.95 + Math.random() * 0.1);
  S.battWh = Math.max(0, S.battWh - S.power * dt / 3600);

  if (S.t >= sg.dur && S.i < segs.length - 1) {
    if (sg.inspect) { const tg = TARGETS.find(x => x.key === sg.inspect); log(`Punto caliente ${tg.temp} °C en ${INFO[tg.key].tag} (${tg.name}). Foto térmica guardada.`, 'hot'); }
    if (sg.fall) { S.impact = impactCalc(); renderImpact(); log(`Impacto a ${dec(S.impact.v)} m/s. Desaceleración media ≈ ${Math.round(S.impact.g)} g en la electrónica.`, 'warn'); }
    S.i++; S.t = 0; S.from = S.pos.slice(); S.tilt0 = S.tilt;
    sg = segs[S.i];
    if (sg.contact !== segs[S.i - 1].contact) log(`Contacto: ${segs[S.i - 1].contact} → ${sg.contact}`);
  } else if (S.t >= sg.dur && S.sc !== 'idle') {
    log('Escenario terminado', 'ok'); startScenario('idle');
  }

  const props = sg.props != null ? sg.props : Math.min(1, 0.25 + sg.power / 350 * 0.75);
  if (orbe) {
    orbe.setPose({ pos: S.pos, tilt: S.tilt, cageRot: S.cageRot, squash: S.squash, contact: sg.contact, thrust: sg.power / 350 });
    orbe.setProps(props);
  }
}

/* ---------------- caída ---------------- */
function impactCalc() {
  const g = 9.81, h = 1.5, d = 0.035, dRigid = 0.003;
  return { h, v: Math.sqrt(2 * g * h), d: d * 1000, g: h / d, gRigid: h / dRigid };
}
function renderImpact() {
  const im = S.impact;
  $('impH').textContent = im ? dec(im.h) + ' m' : '—';
  $('impV').textContent = im ? dec(im.v) + ' m/s' : '—';
  $('impD').textContent = im ? Math.round(im.d) + ' mm' : '—';
  $('impG').textContent = im ? '≈ ' + Math.round(im.g) + ' g' : '—';
  $('impR').textContent = im ? '≈ ' + Math.round(im.gRigid) + ' g' : '—';
  $('impCard').classList.toggle('done', !!im);
}

/* ---------------- cámara térmica ---------------- */
const tc = $('thermal'), tctx = tc.getContext('2d');
const IRON = [[0, 0, 10], [40, 0, 90], [120, 0, 140], [190, 30, 110], [235, 90, 30], [255, 170, 0], [255, 235, 120], [255, 255, 245]];
function iron(v) { v = Math.max(0, Math.min(0.9999, v)) * (IRON.length - 1); const i = Math.floor(v), f = v - i, a = IRON[i], b = IRON[i + 1]; return [0, 1, 2].map(j => Math.round(a[j] + (b[j] - a[j]) * f)); }
const noise = Array.from({ length: 32 * 24 }, () => Math.random());
function drawThermal() {
  let best = null, lvl = 0;
  TARGETS.forEach(tg => {
    const d = Math.hypot(tg.pos[0] - S.pos[0], tg.pos[1] - S.pos[1], tg.pos[2] - S.pos[2]);
    const l = Math.max(0, 1 - d / 9);
    if (l > lvl) { lvl = l; best = tg; }
  });
  const base = 22.5, amp = best ? (best.temp - base) * lvl : 0;
  const cx = best ? 16 + Math.max(-9, Math.min(9, (best.pos[0] - S.pos[0]) * 2.2)) : 16, cy = 12;
  const img = tctx.createImageData(32, 24);
  let max = 0;
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    const n = noise[y * 32 + x];
    const t = base + (y / 24) * 1.5 + (n - 0.5) * 0.8 + amp * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / 10);
    max = Math.max(max, t);
    const c = iron((t - 14) / 68), p = (y * 32 + x) * 4;
    img.data[p] = c[0]; img.data[p + 1] = c[1]; img.data[p + 2] = c[2]; img.data[p + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  S.maxTemp = max;
  $('tMax').textContent = dec(max) + ' °C';
  $('tTarget').textContent = best && lvl > 0.25 ? `${INFO[best.key].tag} · ${best.name}` : 'Sin punto caliente a la vista';
  $('tState').className = 'chip ' + (max > 60 ? 'crit' : max > 40 ? 'warn' : 'ok');
  $('tState').textContent = max > 60 ? 'Crítico' : max > 40 ? 'Revisar' : 'Normal';
  orbe && orbe.setHot(lvl * 2);
}

/* ---------------- paneles ---------------- */
function updatePanels() {
  const sg = cur();
  $('simClock').textContent = clock();
  $('modeChip').textContent = sg.mode;
  $('modeChip').className = 'chip ' + (sg.contact === 'Aire' ? 'warn' : 'ok');
  $('contactChip').textContent = sg.contact;
  $('kPower').textContent = Math.round(S.power) + ' W';
  const auton = S.power > 8 ? S.battWh / S.power * 60 : null;
  $('kAuton').textContent = auton == null ? '—' : auton >= 60 ? `${Math.floor(auton / 60)} h ${String(Math.round(auton % 60)).padStart(2, '0')}` : `${Math.round(auton)} min`;
  $('kBatt').textContent = Math.round(S.battWh / S.capWh * 100) + ' %';
  $('kAlt').textContent = dec(Math.max(0, (S.pos[1] - R) / 10), 2) + ' m';
  $('kSpeed').textContent = dec(S.speed, 2) + ' m/s';
  $('kContact').textContent = sg.contact;
  drawThermal();
  drawTrend();
}
const TR = { x0: 44, x1: 592, y0: 12, y1: 152, max: 400 };
function drawTrend() {
  const n = S.hist.length, sx = (TR.x1 - TR.x0) / (n - 1);
  const yv = v => TR.y1 - Math.min(TR.max, v) / TR.max * (TR.y1 - TR.y0);
  const pts = S.hist.map((v, i) => [TR.x0 + i * sx, yv(v)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  $('trendLine').setAttribute('d', line);
  $('trendArea').setAttribute('d', line + ` L${TR.x1} ${TR.y1} L${TR.x0} ${TR.y1} Z`);
  const l = pts[pts.length - 1]; $('trendDot').setAttribute('cx', l[0]); $('trendDot').setAttribute('cy', l[1]);
  $('trend').setAttribute('data-state', S.power > 200 ? 'warn' : 'ok');
}

let last = null, uiT = 0, hT = 0;
function loop(t) {
  if (last === null) last = t;
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (!S.paused) {
    step(dt);
    hT += dt; if (hT > 0.5) { hT = 0; S.hist.push(S.power); S.hist.shift(); }
    uiT += dt; if (uiT > 0.15) { uiT = 0; updatePanels(); }
  }
  orbe && orbe.frame(dt);
  requestAnimationFrame(loop);
}
if (S.paused) { $('pauseBtn').setAttribute('aria-pressed', 'true'); $('pauseBtn').querySelector('span').textContent = 'Reanudar'; }
startScenario('idle');
log('Orbe encendido. Autodiagnóstico correcto.', 'ok');
renderImpact(); updatePanels();
requestAnimationFrame(loop);
// arranque automático para que la vista no quede quieta
if (!S.paused) setTimeout(() => { if (S.sc === 'idle') startScenario('techo'); }, 1200);

/* ---------------- BOM ---------------- */
const BOM = [
  { cat: 'reuse', item: 'Frame 7"', prod: 'GEPRC Mark4 7", carbono, 295 mm', qty: 1, ref: '€59,89', clp: 66000, kind: 'imp', src: ['Rotorama', 'https://www.rotorama.com/product/geprc-mark4-7'] },
  { cat: 'reuse', item: 'Motores', prod: 'Neebrc 2807 1300 KV V3', qty: 4, ref: 'USD 19,36 c/u', clp: 73600, kind: 'imp', src: ['rcdrone.top', 'https://rcdrone.top/es/products/neebrc-2806-5-2807-1300kv-v3-brushless-motor'] },
  { cat: 'reuse', item: 'Controladora + ESC', prod: 'SpeedyBee F405 V4 + ESC 55A, con ArduPilot', qty: 1, ref: 'USD 69,99', clp: 66500, kind: 'imp', src: ['Pyrodrone', 'https://pyrodrone.com/products/speedybee-f405-v4-stack-w-55a-3-6s-bls-4in1-esc-30x30mm'] },
  { cat: 'reuse', item: 'Hélices 7"', prod: 'Tripala 7", 2 juegos', qty: 2, ref: 'Estimado', clp: 14000, kind: 'est' },
  { cat: 'reuse', item: 'Batería', prod: 'iFlight Fullsend LR 6S 5000 mAh Li-ion', qty: 1, ref: '$90.000 CLP', clp: 90000, kind: 'loc', src: ['Palta FPV Store', 'https://www.paltafpvstore.cl/'] },
  { cat: 'reuse', item: 'Cargador', prod: 'ToolkitRC M6D AC V2', qty: 1, ref: '$120.000 CLP', clp: 120000, kind: 'loc', src: ['Palta FPV Store', 'https://www.paltafpvstore.cl/'] },
  { cat: 'reuse', item: 'Radio', prod: 'Radiomaster Pocket ELRS', qty: 1, ref: 'Estimado', clp: 66500, kind: 'est' },
  { cat: 'reuse', item: 'Receptor', prod: 'BetaFPV ELRS 2,4 GHz Nano', qty: 1, ref: '$14.000 CLP', clp: 14000, kind: 'loc', src: ['Palta FPV Store', 'https://www.paltafpvstore.cl/'] },
  { cat: 'reuse', item: 'GPS + brújula', prod: 'HGLRC M100 Pro (solo exteriores)', qty: 1, ref: 'USD 18,49', clp: 17600, kind: 'imp', src: ['RaceDayQuads', 'https://www.racedayquads.com/products/hglrc-m100-pro-gps-module'] },
  { cat: 'reuse', item: 'Computadora a bordo', prod: 'Raspberry Pi 4', qty: 1, ref: 'Ya existe', clp: 0, kind: 'have' },
  { cat: 'reuse', item: 'Fuente de la Raspberry', prod: 'BEC 5 V 3 A', qty: 1, ref: 'Estimado', clp: 9500, kind: 'est' },
  { cat: 'reuse', item: 'Cámara visible', prod: 'Raspberry Pi Camera Module 3', qty: 1, ref: '€27,15', clp: 30000, kind: 'imp', src: ['Melopero', 'https://www.melopero.com/?p=120608'] },
  { cat: 'reuse', item: 'Cámara térmica', prod: 'Waveshare MLX90640 32 × 24, 110°', qty: 1, ref: 'USD 68,14', clp: 64700, kind: 'imp', src: ['RobotShop', 'https://www.robotshop.com/es/products/mlx90640-ir-array-thermal-imaging-camera-3224-pixels-110-fov'] },
  { cat: 'new', item: 'Flujo óptico + lidar', prod: 'Matek 3901-L0X, mantiene posición sin GPS', qty: 1, ref: 'USD 35,99', clp: 34200, kind: 'imp', src: ['RaceDayQuads', 'https://www.racedayquads.com/products/matek-3901-l0x-optical-flow-lidar-sensor'] },
  { cat: 'new', item: 'Sensores de distancia', prod: 'VL53L1X, frontal y superior (muro y techo)', qty: 2, ref: 'USD 14,99 c/u', clp: 28500, kind: 'imp', src: ['Waveshare', 'https://www.waveshare.com/vl53l1x-distance-sensor.htm'] },
  { cat: 'new', item: 'Tubos de carbono', prod: '8 largueros de 8 mm + eje de 10 mm, 500 mm', qty: 9, ref: 'desde USD 9,39 c/u', clp: 80300, kind: 'imp', src: ['eBay', 'https://www.ebay.com/itm/155572101913'] },
  { cat: 'new', item: 'Rodamientos del eje', prod: '6800ZZ (10 × 19 × 5 mm)', qty: 2, ref: 'Estimado', clp: 6000, kind: 'est' },
  { cat: 'new', item: 'Tornillería', prod: 'Insertos de bronce M3, tornillos, bridas', qty: 1, ref: 'Estimado', clp: 15000, kind: 'est' },
  { cat: 'print', item: 'Anillos y rayos', prod: 'Bambu Lab PAHT-CF 1 kg', qty: 1, ref: 'desde USD 38,18', clp: 36300, kind: 'imp', src: ['3D Printing USA', 'https://3dprintingusa.com/es/collections/bambu-lab-cf'] },
  { cat: 'print', item: 'Banda y amortiguadores', prod: 'Bambu Lab TPU 95A HF 1 kg', qty: 1, ref: '€34,99 (oferta)', clp: 38500, kind: 'imp', src: ['Bambu Lab EU', 'https://eu.store.bambulab.com/collections/price-drop'] },
  { cat: 'print', item: 'Soportes y caja', prod: 'Bambu Lab PETG-HF 1 kg', qty: 1, ref: 'desde USD 17,90', clp: 17000, kind: 'imp', src: ['3D Printing USA', 'https://3dprintingusa.com/es/products/black-bambu-lab-petg-hf-filament-1-75mm-1-kg?notify=1'] }
];
const CAT_NAME = { reuse: 'Del dron (ya cotizado)', new: 'Jaula y sensores nuevos', print: 'Impresión en la H2D' };
const KIND = { have: ['have', 'Ya existe'], imp: ['imp', 'Importado'], loc: ['loc', 'En Chile'], est: ['est', 'Estimado'] };
let bomFilter = 'all';
function renderBom() {
  const rows = BOM.filter(r => bomFilter === 'all' || r.cat === bomFilter);
  let html = '', c = null;
  rows.forEach(r => {
    if (r.cat !== c) { c = r.cat; html += `<tr class="grp"><td colspan="6">${CAT_NAME[c]}</td></tr>`; }
    const k = KIND[r.kind];
    const src = r.src ? `<a href="${r.src[1]}" target="_blank" rel="noopener">${r.src[0]}</a>` : '<span class="muted">—</span>';
    html += `<tr><td><b>${r.item}</b><small>${r.prod}</small></td><td class="num">${r.qty}</td><td>${r.ref}</td><td><span class="kind ${k[0]}">${k[1]}</span></td><td class="num">${r.clp ? '$' + fmt.format(r.clp) : '—'}</td><td>${src}</td></tr>`;
  });
  $('bomBody').innerHTML = html;
  const sum = rows.reduce((s, r) => s + r.clp, 0);
  const iva = Math.round(rows.filter(r => r.kind === 'imp').reduce((s, r) => s + r.clp, 0) * 0.19);
  $('bomSum').textContent = '$' + fmt.format(sum); $('bomIva').textContent = '$' + fmt.format(iva); $('bomTotal').textContent = '$' + fmt.format(sum + iva);
  $('bomCount').textContent = `${rows.length} ítems · ${rows.filter(r => r.kind === 'est').length} por cotizar`;
}
document.querySelectorAll('[data-bom]').forEach(b => b.addEventListener('click', () => {
  bomFilter = b.dataset.bom; document.querySelectorAll('[data-bom]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); renderBom();
}));
renderBom();
