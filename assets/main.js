import { createOrbe, R, APEX, HALF, ROOM, TARGETS, INFO } from './scene.js';

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
toggle($('tDomes'), on => { S.domes = on; orbe && orbe.setDomes(on); log(on ? 'Domos instalados' : 'Domos retirados (prueba comparativa)'); if (S.sc === 'lado') startScenario('lado'); });

/* ---------------- escenarios ---------------- */
const WZ = ROOM.WALL_Z, CY = ROOM.CEIL_Y;
const HOME = [0, R, 3];
const W = { roll: 10, wall: 60, ceil: 70, fly: 65 };   // consumo estimado en W
const seg = (to, dur, tilt, mode, contact, power, extra = {}) => ({ to, dur, tilt, mode, contact, power, ...extra });

function buildScenario(name) {
  switch (name) {
    case 'suelo': return { title: 'Rodar por el suelo', watch: 'El dron se inclina dentro de la jaula y empuja apenas lo justo para rodar. Gasta unos 10 W, cerca de un sexto de lo que gasta volando.', segs: [
      seg([0, R, -1.5], 4.5, -0.28, 'Rodando', 'Suelo', W.roll), seg([0, R, 3], 4.5, 0.28, 'Rodando', 'Suelo', W.roll), seg(null, 1.5, 0, 'Detenido', 'Suelo', 1, { props: 0.1 })] };
    case 'muro': return { title: 'Subir el muro', watch: 'Al llegar al muro, el dron gira el empuje hacia la pared: una parte lo sostiene y otra lo aprieta contra el muro para que la jaula ruede hacia arriba. Arriba revisa el tablero con la cámara térmica.', segs: [
      seg([0, R, WZ + R], 3.5, -0.3, 'Rodando', 'Suelo', W.roll), seg([0, 7, WZ + R], 4, -1.05, 'Trepando', 'Muro', W.wall),
      seg(null, 3.5, -1.0, 'Inspeccionando TB-07', 'Muro', W.wall - 3, { inspect: 'wall' }), seg([0, R, WZ + R], 3.5, -0.85, 'Bajando', 'Muro', 45),
      seg([0, R, 3], 3.5, 0.28, 'Rodando', 'Suelo', W.roll)] };
    case 'alza': return { title: 'Alza de temperatura en TB-07', watch: 'La conexión del tablero empieza a calentarse. Orbe sube a revisarlo y su cámara térmica envía una alerta al pasar 60 °C y una alarma crítica sobre 85 °C. Mira el aviso en la vista y el panel de alarmas.', heat: true, segs: [
      seg([0, R, WZ + R], 3.5, -0.3, 'Rodando hacia TB-07', 'Suelo', W.roll), seg([0, 7, WZ + R], 4, -1.05, 'Trepando', 'Muro', W.wall),
      seg(null, 11, -1.0, 'Vigilando TB-07', 'Muro', W.wall - 3, { inspect: 'wall' }), seg([0, R, WZ + R], 3.5, -0.85, 'Bajando', 'Muro', 45),
      seg([0, R, 3], 3.5, 0.28, 'Rodando', 'Suelo', W.roll)] };
    case 'techo': return { title: 'Recorrer el techo', watch: 'Sube por el muro y pasa al techo. Ahí el empuje apunta hacia arriba y aprieta la jaula contra el techo mientras rueda. Al final se suelta y aterriza.', segs: [
      seg([0, R, WZ + R], 3.5, -0.3, 'Rodando', 'Suelo', W.roll), seg([0, CY - R, WZ + R], 6, -1.05, 'Trepando', 'Muro', W.wall),
      seg([0, CY - R, 0.4], 4.5, 0.22, 'Rodando en el techo', 'Techo', W.ceil), seg(null, 3, 0.12, 'Inspeccionando BT-03', 'Techo', W.ceil - 3, { inspect: 'ceil' }),
      seg([0, 6, 2], 2.2, 0, 'Volando', 'Aire', W.fly), seg([0, R, 3], 2.5, 0, 'Aterrizando', 'Aire', 55)] };
    case 'volar': return { title: 'Volar sobre un obstáculo', watch: 'Cuando algo bloquea el paso, despega, pasa por encima y vuelve a rodar. Volando gasta unas seis veces más que rodando.', segs: [
      seg([0, 4.5, 2.5], 2, -0.05, 'Despegando', 'Aire', W.fly + 5), seg([3.2, 4.4, 0.5], 2.5, -0.15, 'Volando', 'Aire', W.fly),
      seg([5.5, R, -1.8], 2.5, 0, 'Aterrizando', 'Aire', 55), seg(null, 1.2, 0, 'En tierra', 'Suelo', 1, { props: 0.1 }),
      seg([3.2, 4.4, 0.5], 2.5, 0.15, 'Volando', 'Aire', W.fly), seg([0, R, 3], 2.5, 0, 'Aterrizando', 'Aire', 55)] };
    case 'caida': return { title: 'Prueba de caída de 1,5 m', watch: 'Sube hasta que la parte baja de la jaula queda a 1,5 m, apaga los motores y cae. La banda de TPU, el anillo y los amortiguadores del eje frenan el golpe en unos 20 mm.', segs: [
      seg([0, 15 + R, 6.5], 3, 0, 'Subiendo a 1,5 m', 'Aire', W.fly), seg(null, 1.2, 0, 'Motores apagados', 'Aire', 0, { props: 0 }),
      seg([0, R, 6.5], 1.65, 0, 'Caída libre (cámara lenta ×3)', 'Aire', 0, { fall: true, props: 0, drop: true }),
      seg(null, 2.5, 0, 'Impacto absorbido', 'Suelo', 0, { impact: true, props: 0 }), seg([0, R, 3], 3, 0.28, 'Rodando', 'Suelo', W.roll)] };
    case 'lado': {
      const head = [
        seg([0, R, WZ + R], 3, -0.3, 'Rodando', 'Suelo', W.roll), seg([0, 6, WZ + R], 3, -1.05, 'Trepando', 'Muro', W.wall),
        seg(null, 0.6, -1.05, 'Pierde agarre', 'Muro', 0, { props: 0 }),
        seg([0, S.domes ? APEX : HALF + 0.05, WZ + 2.6], 1.2, 0, 'Cae', 'Aire', 0, { fall: true, props: 0, tip: Math.PI / 2 })];
      if (S.domes) return { title: 'Cae de lado (con domos)', watch: 'Pierde el agarre y cae sobre un extremo. Como el domo es curvo, el centro de masa queda sobre un punto inestable y la gravedad lo vuelve a dejar de costado, sin gastar energía.', segs: [...head,
        seg(null, 0.8, 0, 'Sobre el domo: inestable', 'Suelo', 0, { props: 0, tip: Math.PI / 2 }),
        seg([0.95, R, WZ + 2.6], 1.4, 0, 'Se endereza solo', 'Suelo', 0, { props: 0, tip: 0, righting: true }),
        seg(null, 0.8, 0, 'De costado, listo para rodar', 'Suelo', 1, { props: 0.1, tip: 0 }),
        seg([0, R, 3], 3.5, 0.28, 'Rodando', 'Suelo', W.roll, { tip: 0 })] };
      return { title: 'Cae de lado (sin domos)', watch: 'Sin domos cae sobre el extremo plano y queda parado. El dron solo puede empujar en horizontal: no despega y, antes de volcarse, resbala. Necesita rescate manual.', segs: [...head,
        seg(null, 1, 0, 'Parado sobre un extremo', 'Suelo', 0, { props: 0, tip: Math.PI / 2 }),
        seg([0.6, HALF + 0.05, WZ + 2.6], 2.5, 0, 'Empuja de lado: resbala', 'Suelo', 40, { tip: Math.PI / 2, stuckTry: true }),
        seg(null, 2.5, 0, 'Atascado: rescate manual', 'Suelo', 0, { props: 0, tip: Math.PI / 2, stuck: true })] };
    }
    default: return { title: 'En reposo', watch: 'Elige un escenario. Prueba "Alza de temperatura" para ver la alarma, o "Cae de lado" con y sin domos.', segs: [seg(null, 1e9, 0, 'En reposo', 'Suelo', 0, { props: 0 })] };
  }
}

const S = {
  sc: 'idle', def: null, i: 0, t: 0, from: HOME.slice(), pos: HOME.slice(), tilt: 0, tilt0: 0, tip: 0, tip0: 0, cageRot: 0, squash: 0,
  power: 0, battWh: 10, capWh: 10, speed: 0, simSec: 9 * 3600, domes: true,
  paused: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  hist: Array(120).fill(0), log: [], impact: null,
  wallTemp: 38, heating: false, alarmLevel: 0, alarms: []
};
const clock = () => { const s = Math.floor(S.simSec); return [Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':'); };
const cur = () => S.def.segs[Math.min(S.i, S.def.segs.length - 1)];
function log(text, kind = '') {
  S.log.unshift({ t: clock(), text, kind, mode: S.def ? cur().mode : '—' });
  if (S.log.length > 12) S.log.pop();
  $('logBody').innerHTML = S.log.map(l => `<tr class="${l.kind}"><td class="mono">${l.t}</td><td>${l.text}</td><td>${l.mode}</td></tr>`).join('');
}

function startScenario(name, keep = false) {
  S.sc = name; S.def = buildScenario(name); S.i = 0; S.t = 0; S.squash = 0;
  if (!keep) { S.pos = HOME.slice(); S.tip = 0; }
  S.from = S.pos.slice(); S.tilt0 = S.tilt; S.tip0 = S.tip;
  document.querySelectorAll('[data-scen]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scen === name)));
  $('watchTitle').textContent = S.def.title; $('watchText').textContent = S.def.watch;
  if (name !== 'idle') {
    log(`Inicio: ${S.def.title}`);
    const sb = document.querySelector('[data-view="scale"]');
    if (sb.getAttribute('aria-pressed') === 'true') { sb.setAttribute('aria-pressed', 'false'); document.querySelector('[data-view="iso"]').setAttribute('aria-pressed', 'true'); orbe && orbe.setView('iso'); }
    orbe && orbe.setHand(false);
  }
  if (name === 'caida') { S.impact = null; renderImpact(); }
  if (S.def.heat) startHeating();
}
document.querySelectorAll('[data-scen]').forEach(b => b.addEventListener('click', () => startScenario(b.dataset.scen)));
$('pauseBtn').addEventListener('click', () => {
  S.paused = !S.paused; $('pauseBtn').setAttribute('aria-pressed', String(S.paused));
  $('pauseBtn').querySelector('span').textContent = S.paused ? 'Reanudar' : 'Pausar';
});

/* ---------------- temperatura y alarmas ---------------- */
const TH = { warn: 60, crit: 85 };
function startHeating() {
  if (S.heating) return;
  S.heating = true; S.wallTemp = Math.max(S.wallTemp, 38);
  log('TB-07: empieza a subir la temperatura de una conexión', 'warn');
  $('heatBtn').disabled = true;
}
function normalize() {
  S.heating = false; S.wallTemp = 38; S.alarmLevel = 0;
  S.alarms.forEach(a => { if (a.state !== 'Normalizada') a.state = 'Normalizada'; });
  renderAlarms(); hideToast();
  log('TB-07 normalizado: conexión reapretada, 38 °C', 'ok');
  $('heatBtn').disabled = false;
}
$('heatBtn').addEventListener('click', () => { startScenario('alza'); });
$('coolBtn').addEventListener('click', normalize);

function raiseAlarm(level, temp) {
  const crit = level === 2;
  const a = { t: clock(), tag: 'TB-07', level: crit ? 'Crítica' : 'Alerta', temp: dec(temp), state: 'Enviada', channel: 'MQTT · mantención' };
  S.alarms.unshift(a); if (S.alarms.length > 6) S.alarms.pop();
  renderAlarms();
  log(`${crit ? 'ALARMA CRÍTICA' : 'Alerta'} TB-07 ${a.temp} °C enviada a mantención`, crit ? 'hot' : 'warn');
  showToast(a);
}
function renderAlarms() {
  const tb = $('alarmBody');
  if (!S.alarms.length) { tb.innerHTML = '<tr class="empty"><td colspan="5">Sin alarmas. Usa "Simular alza de temperatura".</td></tr>'; $('alarmCount').textContent = '0 activas'; return; }
  tb.innerHTML = S.alarms.map(a => `<tr class="lv-${a.level === 'Crítica' ? 'crit' : 'warn'} st-${a.state.toLowerCase()}"><td class="mono">${a.t}</td><td><span class="prio">${a.level}</span></td><td class="mono">${a.tag} · ${a.temp} °C</td><td>${a.channel}</td><td>${a.state}</td></tr>`).join('');
  const act = S.alarms.filter(a => a.state === 'Enviada').length;
  $('alarmCount').textContent = `${act} sin reconocer`;
  $('ackBtn').disabled = act === 0;
}
$('ackBtn').addEventListener('click', () => { S.alarms.forEach(a => { if (a.state === 'Enviada') a.state = 'Reconocida'; }); renderAlarms(); hideToast(); log('Mantención reconoció la alarma', 'ok'); });
function showToast(a) {
  const el = $('alarmToast');
  el.className = 'toast ' + (a.level === 'Crítica' ? 'crit' : 'warn');
  $('toastTitle').textContent = a.level === 'Crítica' ? 'Alarma crítica · TB-07' : 'Alerta de temperatura · TB-07';
  $('toastText').textContent = `${a.temp} °C en una conexión del tablero. Aviso enviado a mantención con foto térmica y ubicación.`;
  el.hidden = false;
}
function hideToast() { $('alarmToast').hidden = true; }
$('toastAck').addEventListener('click', () => $('ackBtn').click());

/* ---------------- simulación ---------------- */
const smooth = k => k * k * (3 - 2 * k);
let vis = 0;
function step(dt) {
  S.simSec += dt;
  if (S.heating) S.wallTemp = Math.min(104, S.wallTemp + dt * 3.6);
  const segs = S.def.segs;
  let sg = segs[S.i];
  S.t += dt;
  const k = Math.min(1, S.t / sg.dur);
  const prev = S.pos.slice();
  if (sg.to) {
    if (sg.fall) {
      const y0 = S.from[1], y1 = sg.to[1], gg = 2 * (y0 - y1) / (sg.dur * sg.dur);
      S.pos = [S.from[0] + (sg.to[0] - S.from[0]) * k, Math.max(y1, y0 - 0.5 * gg * S.t * S.t), S.from[2] + (sg.to[2] - S.from[2]) * k];
    } else if (sg.righting) {
      const e = smooth(k);
      S.pos = [S.from[0] + (sg.to[0] - S.from[0]) * e, APEX + (R - APEX) * e + 0.04 * Math.sin(Math.PI * e), S.from[2]];
    } else {
      const e = smooth(k);
      S.pos = S.from.map((v, j) => v + (sg.to[j] - v) * e);
    }
  }
  S.tilt = S.tilt0 + (sg.tilt - S.tilt0) * smooth(Math.min(1, k / 0.35));
  if (sg.tip !== undefined) S.tip = S.tip0 + (sg.tip - S.tip0) * (sg.fall ? k : smooth(k));
  const dist = Math.hypot(S.pos[0] - prev[0], S.pos[1] - prev[1], S.pos[2] - prev[2]);
  S.speed = dt > 0 ? dist / dt / 10 : 0;
  if (sg.contact !== 'Aire' && !sg.righting && !sg.stuckTry && Math.abs(S.tip) < 0.1) S.cageRot -= dist / R;
  S.squash = sg.impact ? Math.max(-0.02, 0.15 * Math.exp(-5 * S.t) * Math.cos(16 * S.t)) : 0;
  S.power = sg.power * (0.95 + Math.random() * 0.1);
  S.battWh = Math.max(0, S.battWh - S.power * dt / 3600);

  if (S.t >= sg.dur && S.i < segs.length - 1) {
    if (sg.inspect && sg.inspect !== 'wall') { const tg = TARGETS.find(x => x.key === sg.inspect); log(`Punto caliente ${tg.temp} °C en ${INFO[tg.key].tag}. Foto térmica guardada.`, 'hot'); }
    if (sg.inspect === 'wall' && !S.heating) log(`TB-07 a ${Math.round(S.wallTemp)} °C: normal. Foto térmica guardada.`, 'ok');
    if (sg.drop) { S.impact = impactCalc(); renderImpact(); log(`Impacto a ${dec(S.impact.v)} m/s. Desaceleración media ≈ ${Math.round(S.impact.g)} g en la electrónica.`, 'warn'); }
    if (sg.fall && sg.tip) log(S.domes ? 'Cayó sobre un domo' : 'Cayó sobre el extremo plano', 'warn');
    S.i++; S.t = 0; S.from = S.pos.slice(); S.tilt0 = S.tilt; S.tip0 = S.tip;
    const nx = segs[S.i];
    if (nx.contact !== sg.contact) log(`Contacto: ${sg.contact} → ${nx.contact}`);
    if (nx.righting) log('El domo no lo deja quedarse parado: vuelve solo a quedar de costado', 'ok');
    if (nx.stuck) log('Atascado. Sin domos no puede recuperarse solo', 'hot');
    sg = nx;
  } else if (S.t >= sg.dur && S.sc !== 'idle') {
    log('Escenario terminado', 'ok'); startScenario('idle', true);
  }

  const props = sg.props != null ? sg.props : Math.min(1, 0.25 + sg.power / 70 * 0.75);
  if (orbe) {
    orbe.setPose({ pos: S.pos, tilt: S.tilt, tip: S.tip, cageRot: S.cageRot, squash: S.squash, contact: sg.contact, thrust: sg.power / 70 });
    orbe.setProps(props);
  }
}

/* ---------------- caída ---------------- */
function impactCalc() {
  const g = 9.81, h = 1.5, d = 0.020, dRigid = 0.003;
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
  let best = null; vis = 0;
  TARGETS.forEach(tg => {
    const d = Math.hypot(tg.pos[0] - S.pos[0], tg.pos[1] - S.pos[1], tg.pos[2] - S.pos[2]);
    const v = Math.max(0, Math.min(1, (1 - d / 4.5) * 2.2));
    if (v > vis) { vis = v; best = tg; }
  });
  const base = 22.5;
  const temp = best ? (best.key === 'wall' ? S.wallTemp : best.temp) : base;
  const amp = (temp - base) * vis;
  const cx = best ? 16 + Math.max(-9, Math.min(9, (best.pos[0] - S.pos[0]) * 3)) : 16, cy = 12;
  const img = tctx.createImageData(32, 24);
  let max = 0;
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    const t = base + (y / 24) * 1.5 + (noise[y * 32 + x] - 0.5) * 0.8 + amp * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / 10);
    max = Math.max(max, t);
    const c = iron((t - 14) / 92), p = (y * 32 + x) * 4;
    img.data[p] = c[0]; img.data[p + 1] = c[1]; img.data[p + 2] = c[2]; img.data[p + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  $('tMax').textContent = dec(max) + ' °C';
  $('tTarget').textContent = best && vis > 0.5 ? `${INFO[best.key].tag} · ${best.name}` : 'Sin punto caliente a la vista';
  $('tState').className = 'chip ' + (max > TH.crit ? 'crit' : max > TH.warn ? 'warn' : 'ok');
  $('tState').textContent = max > TH.crit ? 'Crítico' : max > TH.warn ? 'Alerta' : 'Normal';
  orbe && orbe.setHot(best && best.key === 'ceil' ? vis * 2 : 0);
  // alarmas: solo si la cámara ve bien el tablero
  if (best && best.key === 'wall' && vis > 0.9) {
    if (max > TH.crit && S.alarmLevel < 2) { S.alarmLevel = 2; raiseAlarm(2, max); }
    else if (max > TH.warn && S.alarmLevel < 1) { S.alarmLevel = 1; raiseAlarm(1, max); }
  }
}

/* ---------------- paneles ---------------- */
function updatePanels() {
  const sg = cur();
  $('simClock').textContent = clock();
  $('modeChip').textContent = sg.mode;
  $('modeChip').className = 'chip ' + (sg.stuck ? 'crit' : sg.contact === 'Aire' ? 'warn' : 'ok');
  $('contactChip').textContent = Math.abs(S.tip) > 0.3 && sg.contact === 'Suelo' ? 'Suelo (de punta)' : sg.contact;
  $('kPower').textContent = Math.round(S.power) + ' W';
  const auton = S.power > 3 ? S.battWh / S.power * 60 : null;
  $('kAuton').textContent = auton == null ? '—' : `${Math.round(auton)} min`;
  $('kBatt').textContent = Math.round(S.battWh / S.capWh * 100) + ' %';
  $('kAlt').textContent = dec(Math.max(0, S.pos[1] / 10), 2) + ' m';
  $('kSpeed').textContent = dec(S.speed, 2) + ' m/s';
  $('kWall').textContent = Math.round(S.wallTemp) + ' °C';
  $('kWallTile').classList.toggle('bad', S.wallTemp > TH.warn);
  orbe && orbe.setWallTemp(S.wallTemp, S.alarms.some(a => a.state === 'Enviada'));
  drawThermal();
  drawTrend();
}
const TR = { x0: 44, x1: 592, y0: 12, y1: 152, max: 80 };
function drawTrend() {
  const n = S.hist.length, sx = (TR.x1 - TR.x0) / (n - 1);
  const yv = v => TR.y1 - Math.min(TR.max, v) / TR.max * (TR.y1 - TR.y0);
  const pts = S.hist.map((v, i) => [TR.x0 + i * sx, yv(v)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  $('trendLine').setAttribute('d', line);
  $('trendArea').setAttribute('d', line + ` L${TR.x1} ${TR.y1} L${TR.x0} ${TR.y1} Z`);
  const l = pts[pts.length - 1]; $('trendDot').setAttribute('cx', l[0]); $('trendDot').setAttribute('cy', l[1]);
  $('trend').setAttribute('data-state', S.power > 40 ? 'warn' : 'ok');
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
renderImpact(); renderAlarms(); updatePanels();
requestAnimationFrame(loop);
if (!S.paused) setTimeout(() => { if (S.sc === 'idle') startScenario('techo'); }, 1200);

/* ---------------- BOM ---------------- */
const BOM = [
  { cat: 'fly', item: 'Controladora de vuelo', prod: 'Tu ESP32 con firmware ESP-FC', qty: 1, ref: 'Ya existe', clp: 0, kind: 'have' },
  { cat: 'fly', item: 'Giroscopio', prod: 'MPU6500 (GY-6500) por SPI, compatible con ESP-FC', qty: 1, ref: 'USD 3,00', clp: 2900, kind: 'imp', src: ['Sumozade', 'https://sumozade.com/mpu6500-6-axis-accelerometer-and-gyroscope-sensor-gy-6500'] },
  { cat: 'fly', item: 'ESC 4 en 1', prod: 'HAKRC 20 A, 2-4S, 20 × 20 mm', qty: 1, ref: 'USD 19,90', clp: 18900, kind: 'imp', src: ['reach.dog', 'https://reach.dog/shop/hobbycool/products/hakrc-4in1-20a-esc-speed-controller-blheli_s-bb2-dshot-for-fpv-drone'] },
  { cat: 'fly', item: 'Motores', prod: 'BetaFPV 1404 3800 KV, juego de 4', qty: 1, ref: 'USD 52,99', clp: 50300, kind: 'imp', src: ['BetaFPV', 'https://betafpv.com/products/1404-3800kv-brushless-motors'] },
  { cat: 'fly', item: 'Hélices 3"', prod: 'DALProp Cyclone T3018 tripala, juego de 8', qty: 2, ref: 'USD 3,99 c/u', clp: 7600, kind: 'imp', src: ['GetFPV', 'https://www.getfpv.com/dalprop-cyclone-t3018-3-blade-propeller-1-5mm-shaft-set-of-8.html'] },
  { cat: 'fly', item: 'Frame 3"', prod: 'Carbono de 125 mm, ~40 g (ref. LDARC ET125)', qty: 1, ref: 'Estimado', clp: 25000, kind: 'est' },
  { cat: 'fly', item: 'Batería', prod: 'Tattu 4S 850 mAh 75C, XT30', qty: 2, ref: 'USD 19,49 c/u', clp: 37000, kind: 'imp', src: ['RaceDayQuads', 'https://www.racedayquads.com/products/tattu-850mah-4s-75c-battery-for-3-and-4-quads-xt30'] },
  { cat: 'fly', item: 'Fuente 5 V', prod: 'Mini BEC 5 V para las ESP32', qty: 1, ref: 'Estimado', clp: 4000, kind: 'est' },
  { cat: 'fly', item: 'Receptor', prod: 'BetaFPV ELRS 2,4 GHz Nano', qty: 1, ref: '$14.000 CLP', clp: 14000, kind: 'loc', src: ['Palta FPV Store', 'https://www.paltafpvstore.cl/'] },
  { cat: 'fly', item: 'Radio', prod: 'Radiomaster Pocket ELRS', qty: 1, ref: 'Estimado', clp: 66500, kind: 'est' },
  { cat: 'fly', item: 'Cargador', prod: 'ToolkitRC M6D AC V2', qty: 1, ref: '$120.000 CLP', clp: 120000, kind: 'loc', src: ['Palta FPV Store', 'https://www.paltafpvstore.cl/'] },
  { cat: 'sense', item: 'Carga útil', prod: 'Seeed XIAO ESP32-S3 Sense: cámara, WiFi y alarmas', qty: 1, ref: 'USD 16,99', clp: 16100, kind: 'imp', src: ['RobotShop', 'https://ca.robotshop.com/products/seeedstudio-xiao-esp32s3-sense-wifi-ble-ov2640-mic-8mb-iot-embedded-ml'] },
  { cat: 'sense', item: 'Cámara térmica', prod: 'Waveshare MLX90640 32 × 24, 110°', qty: 1, ref: 'USD 68,14', clp: 64700, kind: 'imp', src: ['RobotShop', 'https://www.robotshop.com/es/products/mlx90640-ir-array-thermal-imaging-camera-3224-pixels-110-fov'] },
  { cat: 'sense', item: 'Flujo óptico + lidar', prod: 'Matek 3901-L0X', qty: 1, ref: 'USD 35,99', clp: 34200, kind: 'imp', src: ['RaceDayQuads', 'https://www.racedayquads.com/products/matek-3901-l0x-optical-flow-lidar-sensor'] },
  { cat: 'sense', item: 'Sensores de distancia', prod: 'VL53L1X, frontal y superior', qty: 2, ref: 'USD 14,99 c/u', clp: 28500, kind: 'imp', src: ['Waveshare', 'https://www.waveshare.com/vl53l1x-distance-sensor.htm'] },
  { cat: 'sense', item: 'Estación en tierra', prod: 'Raspberry Pi 4: recibe video, alarmas e informe', qty: 1, ref: 'Ya existe', clp: 0, kind: 'have' },
  { cat: 'cage', item: 'Largueros y eje', prod: 'Varilla de carbono de 3 y 4 mm', qty: 10, ref: 'Estimado', clp: 12000, kind: 'est' },
  { cat: 'cage', item: 'Rodamientos del eje', prod: '684ZZ (4 × 9 × 4 mm)', qty: 2, ref: 'Estimado', clp: 3000, kind: 'est' },
  { cat: 'cage', item: 'Tornillería', prod: 'Insertos M2, tornillos, bridas', qty: 1, ref: 'Estimado', clp: 8000, kind: 'est' },
  { cat: 'print', item: 'Anillos, rayos y domos', prod: 'Bambu Lab PAHT-CF 1 kg (se usan ~150 g)', qty: 1, ref: 'desde USD 38,18', clp: 36300, kind: 'imp', src: ['3D Printing USA', 'https://3dprintingusa.com/es/collections/bambu-lab-cf'] },
  { cat: 'print', item: 'Banda, puntas y amortiguadores', prod: 'Bambu Lab TPU 95A HF 1 kg', qty: 1, ref: '€34,99 (oferta)', clp: 38500, kind: 'imp', src: ['Bambu Lab EU', 'https://eu.store.bambulab.com/collections/price-drop'] },
  { cat: 'print', item: 'Soportes y carcasas', prod: 'Bambu Lab PETG-HF 1 kg', qty: 1, ref: 'desde USD 17,90', clp: 17000, kind: 'imp', src: ['3D Printing USA', 'https://3dprintingusa.com/es/products/black-bambu-lab-petg-hf-filament-1-75mm-1-kg?notify=1'] }
];
const CAT_NAME = { fly: 'Vuelo y control', sense: 'Sensores e inspección', cage: 'Jaula', print: 'Impresión en la H2D' };
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
