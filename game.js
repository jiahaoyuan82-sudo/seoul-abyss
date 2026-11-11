// 游戏主循环：第一人称控制、手电筒、物资、丧尸、HUD
import * as THREE from 'three';
import { buildWorld, resolveCircle, segmentHitsBox } from './world.js';
import { Zombie } from './zombie.js';
import * as A from './audio.js';

const $ = (id) => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);

const GOAL = 6; // 至少需要带回的物资数量
const ITEM_TYPES = {
  water:   { cn: '矿泉水', kr: '생수',     icon: '💧' },
  can:     { cn: '罐头',   kr: '통조림',   icon: '🥫' },
  ramen:   { cn: '泡面',   kr: '컵라면',   icon: '🍜' },
  medkit:  { cn: '急救包', kr: '구급상자', icon: '✚' },
  battery: { cn: '电池',   kr: '건전지',   icon: '🔋' },
};

let renderer, scene, camera, world, flashlight, clock, raf = 0;
let zombies = [], items = [];
let running = false, paused = true, ended = false, onQuit = null;
let stopAmb = null;
const keys = {};
const S = {}; // 玩家状态

function resetState() {
  Object.assign(S, {
    yaw: 0, pitch: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
    hp: 100, sta: 100, bat: 100, flash: true, crouch: false, crouchK: 0,
    bob: 0, lastStep: 0, noise: 0, shake: 0, hurtT: 0, dead: false, deadT: 0,
    inv: { water: 0, can: 0, ramen: 0, medkit: 0, battery: 0 }, supplies: 0,
    time: 0, heartT: 0, spotted: 0, exposure: 1.0,
  });
}

/* ---------------- 物资模型 ---------------- */
let glowTex = null;
function makeGlowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,230,160,1)'); gr.addColorStop(0.4, 'rgba(255,200,100,.35)'); gr.addColorStop(1, 'rgba(255,200,100,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function crossTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = '#e8e8e2'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#c01010'; g.fillRect(26, 12, 12, 40); g.fillRect(12, 26, 40, 12);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function makeItem(type, pos) {
  const grp = new THREE.Group();
  let mesh;
  switch (type) {
    case 'water': {
      mesh = new THREE.Group();
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.24, 14), new THREE.MeshPhysicalMaterial({ color: 0x9fc8e8, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.75 }));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 10), new THREE.MeshStandardMaterial({ color: 0x1a50c0 }));
      cap.position.y = 0.135; mesh.add(b, cap);
      const b2 = b.clone(); b2.position.set(0.11, 0, 0.02); const c2 = cap.clone(); c2.position.set(0.11, 0.135, 0.02); mesh.add(b2, c2);
      mesh.position.y = 0.12; break;
    }
    case 'can': {
      mesh = new THREE.Group();
      const m = new THREE.MeshStandardMaterial({ color: 0xb0b4b8, metalness: 0.9, roughness: 0.3 });
      const lab = new THREE.MeshStandardMaterial({ color: 0xa02818, roughness: 0.6 });
      for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 16), [lab, m, m]); c.position.set(i * 0.1 - 0.1, 0.05, (i % 2) * 0.05); mesh.add(c); }
      break;
    }
    case 'ramen': {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.11, 16), new THREE.MeshStandardMaterial({ color: 0xc82020, roughness: 0.5 }));
      mesh.position.y = 0.055; break;
    }
    case 'medkit': {
      const t = crossTex();
      const w = new THREE.MeshStandardMaterial({ color: 0xe0e0da, roughness: 0.5 });
      const f = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 });
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.22), [w, w, f, w, f, w]);
      mesh.position.y = 0.06; break;
    }
    case 'battery': {
      mesh = new THREE.Group();
      for (let i = 0; i < 2; i++) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.07, 10), new THREE.MeshStandardMaterial({ color: 0xd8a018, metalness: 0.5, roughness: 0.4 }));
        b.rotation.z = Math.PI / 2; b.position.set(0, 0.02, i * 0.045); mesh.add(b);
      }
      break;
    }
  }
  mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  grp.add(mesh);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.35, fog: true }));
  glow.scale.set(0.9, 0.9, 1); glow.position.y = 0.12; grp.add(glow);
  grp.position.copy(pos); grp.position.y = 0.16; grp.rotation.y = Math.random() * 6;
  scene.add(grp);
  return { type, group: grp, glow, taken: false, t: Math.random() * 6 };
}

const ITEM_SPOTS = [
  [6.5, 58], [-6.8, 48], [6.9, 34], [-6.2, 20], [6.6, 2.5], [-6.8, -3], [6.4, -12], [-6.6, -26], [6.8, -38], [-6.4, -54], [6.2, -66],
  [-14, 4.8], [-26, -4.6], [-38, 4.5], [-52, -3], [-50, 3.5], [16, -4.6], [28, 4.6], [40, -4.4], [52, 3], [53, -3.5],
  [-1.4, 27], [3.6, -40.5],
];

/* ---------------- 丧尸生成 ---------------- */
const SPAWNS = [
  ['walker', 3, 42], ['walker', -4, 24], ['walker', 1.5, 4], ['walker', -3, -8], ['walker', 4, -19],
  ['walker', -5, -36], ['walker', 2, -51], ['walker', -20, 1.5], ['walker', -33, -2], ['walker', 21, -2],
  ['walker', 37, 2.5], ['walker', 50, 0], ['walker', -50, 1.5], ['walker', 0, -66],
  ['runner', -1, -30], ['runner', -46, -2.5], ['runner', 45, -2], ['runner', 3, 13], ['runner', -2, -60],
  ['feeding', -6.2, 36], ['feeding', 6.2, -44], ['feeding', -26, 3.8],
];

/* ---------------- 初始化 ---------------- */
function init() {
  const host = $('game-canvas');
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06070a);
  scene.fog = new THREE.FogExp2(0x06070a, 0.048);

  camera = new THREE.PerspectiveCamera(72, host.clientWidth / host.clientHeight, 0.05, 140);
  scene.add(camera);

  // 环境光：极暗的冷色月光
  scene.add(new THREE.HemisphereLight(0x2a3448, 0x0a0806, 0.45));
  const moon = new THREE.DirectionalLight(0x7088b0, 0.35);
  moon.position.set(-20, 40, 10); scene.add(moon);

  // 手电筒：带阴影的聚光灯，挂在相机上
  flashlight = new THREE.SpotLight(0xfff1dc, 55, 30, 0.42, 0.5, 1.4);
  flashlight.position.set(0.22, -0.18, 0.1);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.set(1024, 1024);
  flashlight.shadow.camera.near = 0.1; flashlight.shadow.camera.far = 30;
  flashlight.shadow.bias = -0.0004;
  camera.add(flashlight);
  const ft = new THREE.Object3D(); ft.position.set(0.05, -0.12, -6); camera.add(ft); flashlight.target = ft;
  // 手电外圈的微弱溢光
  const spill = new THREE.PointLight(0xfff1dc, 0.8, 4, 2); spill.position.set(0.2, -0.2, -0.6); camera.add(spill);
  flashlight.userData.spill = spill;

  world = buildWorld(scene);
  glowTex = makeGlowTex();

  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousemove', onMouse);
  document.addEventListener('pointerlockchange', onLockChange);
  $('click-to-play').addEventListener('click', lock);
  $('btn-resume').addEventListener('click', (e) => { e.stopPropagation(); lock(); });
  $('btn-quit').addEventListener('click', (e) => { e.stopPropagation(); quit(); });
  $('btn-retry').addEventListener('click', (e) => { e.stopPropagation(); restart(); });
  $('btn-menu').addEventListener('click', (e) => { e.stopPropagation(); quit(); });
}

function populate() {
  zombies.forEach((z) => z.dispose(scene)); zombies = [];
  items.forEach((i) => scene.remove(i.group)); items = [];
  for (const [t, x, z] of SPAWNS) {
    const type = t === 'feeding' ? 'walker' : t;
    zombies.push(new Zombie(scene, new THREE.Vector3(x + rnd(-1, 1), 0, z + rnd(-1, 1)), type, { feeding: t === 'feeding' }));
  }
  // 随机 13 个物资点
  const spots = ITEM_SPOTS.slice().sort(() => Math.random() - 0.5).slice(0, 13);
  const bag = ['water', 'water', 'water', 'can', 'can', 'can', 'ramen', 'ramen', 'ramen', 'medkit', 'medkit', 'battery', 'battery'];
  spots.forEach(([x, z], i) => items.push(makeItem(bag[i], new THREE.Vector3(x, 0, z))));
}

function restart() {
  resetState();
  S.pos.copy(world.playerStart); S.yaw = 0; S.pitch = 0;
  populate();
  ended = false;
  $('end').classList.add('hidden');
  $('end').classList.remove('win');
  $('damage').style.opacity = 0;
  $('objective').textContent = `搜集物资（0 / ${GOAL}），返回你的出租屋（원룸）`;
  renderInventory();
  lock();
}

export function start(opts) {
  onQuit = opts.onQuit;
  if (!renderer) init();
  resetState();
  S.pos.copy(world.playerStart);
  populate();
  renderInventory();
  $('objective').textContent = `搜集物资（0 / ${GOAL}），返回你的出租屋（원룸）`;
  running = true; paused = true; ended = false;
  $('click-to-play').classList.remove('hidden');
  $('pause').classList.add('hidden');
  $('end').classList.add('hidden');
  clock = new THREE.Clock();
  A.initAudio();
  stopAmb = A.startAmbience(1);
  onResize();
  loop();
  setTimeout(() => toast('凌晨2点47分。宿舍附近的便利店……我得找点吃的。', '새벽 2시 47분. 먹을 걸 찾아야 해.'), 600);
}

export function stop() {
  running = false;
  cancelAnimationFrame(raf);
  if (stopAmb) { stopAmb(); stopAmb = null; }
  if (document.pointerLockElement) document.exitPointerLock();
}

function quit() { stop(); onQuit && onQuit(); }

/* ---------------- 输入 ---------------- */
function lock() {
  A.initAudio();
  const el = renderer.domElement;
  try { const p = el.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
}
function onLockChange() {
  const locked = document.pointerLockElement === renderer.domElement;
  if (!running) return;
  if (locked) { paused = false; $('click-to-play').classList.add('hidden'); $('pause').classList.add('hidden'); clock.getDelta(); }
  else if (!ended && !S.dead) { paused = true; $('pause').classList.remove('hidden'); }
}
function onMouse(e) {
  if (paused || !running || S.dead) return;
  S.yaw -= e.movementX * 0.0022;
  S.pitch -= e.movementY * 0.0022;
  S.pitch = Math.max(-1.45, Math.min(1.45, S.pitch));
}
function onKeyDown(e) {
  if (!running) return;
  keys[e.code] = true;
  if (paused || S.dead) return;
  if (e.code === 'KeyF') { S.flash = !S.flash; A.click(); }
  if (e.code === 'KeyC' || e.code === 'ControlLeft') S.crouch = !S.crouch;
  if (e.code === 'KeyE') interact();
  if (e.code === 'BracketRight') { S.exposure = Math.min(2.2, S.exposure + 0.1); toast(`亮度 ${Math.round(S.exposure * 100)}%`); }
  if (e.code === 'BracketLeft') { S.exposure = Math.max(0.4, S.exposure - 0.1); toast(`亮度 ${Math.round(S.exposure * 100)}%`); }
}
function onKeyUp(e) { keys[e.code] = false; }
function onResize() {
  if (!renderer) return;
  const host = $('game-canvas');
  renderer.setSize(host.clientWidth, host.clientHeight);
  camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix();
}

/* ---------------- HUD ---------------- */
let toastTimer = 0;
function toast(cn, kr = '') {
  const t = $('toast');
  t.innerHTML = cn + (kr ? `<small>${kr}</small>` : '');
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}
function renderInventory(bump) {
  $('inventory').innerHTML = Object.entries(ITEM_TYPES).map(([k, v]) =>
    `<div class="inv-item${bump === k ? ' bump' : ''}"><div class="ic">${v.icon}</div><div class="n">${S.inv[k]}</div><div class="l">${v.cn}</div></div>`).join('');
}
function setPrompt(html) {
  const p = $('prompt');
  if (html) { p.innerHTML = html; p.classList.add('show'); } else p.classList.remove('show');
}

/* ---------------- 交互 ---------------- */
let focusItem = null, nearDoor = false;
function findFocus() {
  focusItem = null;
  const fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw);
  let best = 2.2;
  for (const it of items) {
    if (it.taken) continue;
    const dx = it.group.position.x - S.pos.x, dz = it.group.position.z - S.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < best && (dx * fx + dz * fz) / (d || 1) > 0.45) { best = d; focusItem = it; }
  }
  nearDoor = S.pos.distanceTo(world.homeDoor) < 2.6;
  if (focusItem) { const t = ITEM_TYPES[focusItem.type]; setPrompt(`<kbd>E</kbd>拾取 ${t.icon} ${t.cn} · ${t.kr}`); }
  else if (nearDoor) setPrompt(S.supplies >= GOAL ? '<kbd>E</kbd>进入出租屋 · 집에 들어가기' : `<kbd>E</kbd>出租屋 — 物资不足（${S.supplies} / ${GOAL}）`);
  else setPrompt('');
}
function interact() {
  if (focusItem) {
    const it = focusItem; it.taken = true; scene.remove(it.group);
    S.inv[it.type]++; S.supplies++;
    A.pickup();
    const t = ITEM_TYPES[it.type];
    if (it.type === 'medkit') { const h = Math.min(100, S.hp + 35); toast(`${t.icon} ${t.cn} +1　生命 +${Math.round(h - S.hp)}`, t.kr); S.hp = h; }
    else if (it.type === 'battery') { S.bat = Math.min(100, S.bat + 60); toast(`${t.icon} ${t.cn} +1　手电电量已补充`, t.kr); }
    else toast(`${t.icon} ${t.cn} +1`, t.kr);
    // 拾取会发出轻微声响
    S.noise = Math.max(S.noise, 0.8);
    renderInventory(it.type);
    $('objective').textContent = S.supplies >= GOAL
      ? `物资足够了（${S.supplies}）。回到北边的出租屋（원룸）！`
      : `搜集物资（${S.supplies} / ${GOAL}），返回你的出租屋（원룸）`;
    if (S.supplies === GOAL) toast('够撑几天了……回家。', '이 정도면 며칠은 버틸 수 있어. 집으로 가자.');
    return;
  }
  if (nearDoor) {
    if (S.supplies >= GOAL) win();
    else toast(`还不够……至少需要 ${GOAL} 件物资`, '아직 부족해…');
  }
}

/* ---------------- 结局 ---------------- */
function fmtTime(t) { return `${Math.floor(t / 60)}分${String(Math.floor(t % 60)).padStart(2, '0')}秒`; }
function win() {
  ended = true;
  $('end-title').textContent = '你活过了今晚';
  $('end-sub').textContent = '오늘 밤은 살아남았다 · 第一章完 — 后续章节敬请期待';
  $('end-stats').textContent = `用时 ${fmtTime(S.time)}　·　带回物资 ${S.supplies} 件　·　剩余生命 ${Math.round(S.hp)}`;
  $('end').classList.add('win'); $('end').classList.remove('hidden');
  document.exitPointerLock();
}
function die() {
  S.dead = true; S.deadT = 0;
  setTimeout(() => {
    ended = true;
    $('end-title').textContent = '你被感染了';
    $('end-sub').textContent = '당신은 감염되었습니다';
    $('end-stats').textContent = `存活 ${fmtTime(S.time)}　·　搜集物资 ${S.supplies} 件`;
    $('end').classList.remove('win'); $('end').classList.remove('hidden');
    document.exitPointerLock();
  }, 2200);
}

/* ---------------- 视线 ---------------- */
function los(a, b) {
  for (const c of world.colliders) {
    if (c.kind === 'tiny') continue;
    if (c.kind === 'low' && !S.crouch) continue;
    if (segmentHitsBox(a.x, a.z, b.x, b.z, c)) return false;
  }
  return true;
}
const _v = new THREE.Vector3(), _f = new THREE.Vector3();
function flashDot(p) {
  if (!S.flash || S.bat <= 0) return 0;
  camera.getWorldDirection(_f);
  _v.set(p.x, 1.4, p.z).sub(camera.position).normalize();
  return _f.dot(_v);
}

/* ---------------- 主循环 ---------------- */
function loop() {
  if (!running) return;
  raf = requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  if (!paused && !ended) update(dt);
  else if (S.dead && !ended) update(dt);
  world.update(dt, camera.position);
  renderer.render(scene, camera);
}

function update(dt) {
  S.time += dt;

  if (S.dead) {
    // 倒地
    S.deadT += dt;
    const k = Math.min(1, S.deadT / 1.2);
    camera.position.set(S.pos.x, 1.65 - k * 1.4, S.pos.z);
    camera.rotation.set(S.pitch * (1 - k) + k * 0.5, S.yaw, k * 1.2, 'YXZ');
    $('damage').style.opacity = 1;
    zombies.forEach((z) => z.animate(dt, 0));
    return;
  }

  /* ---- 移动 ---- */
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const r = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const moving = f !== 0 || r !== 0;
  const wantSprint = (keys.ShiftLeft || keys.ShiftRight) && moving && f >= 0;
  if (wantSprint && S.crouch) S.crouch = false;
  const sprint = wantSprint && S.sta > 1;
  let speed = S.crouch ? 1.4 : sprint ? 5.9 : 2.8;
  if (S.hp < 30) speed *= 0.85;
  if (sprint) S.sta = Math.max(0, S.sta - 20 * dt);
  else S.sta = Math.min(100, S.sta + (moving ? 9 : 16) * dt);

  const sin = Math.sin(S.yaw), cos = Math.cos(S.yaw);
  let mx = -sin * f + cos * r, mz = -cos * f - sin * r;
  const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
  const tvx = moving ? mx * speed : 0, tvz = moving ? mz * speed : 0;
  S.vel.x += (tvx - S.vel.x) * Math.min(1, dt * 10);
  S.vel.z += (tvz - S.vel.z) * Math.min(1, dt * 10);
  S.pos.x += S.vel.x * dt; S.pos.z += S.vel.z * dt;
  resolveCircle(S.pos, 0.35, world.colliders);
  const B = world.bounds;
  S.pos.x = Math.max(B.x1, Math.min(B.x2, S.pos.x)); S.pos.z = Math.max(B.z1, Math.min(B.z2, S.pos.z));

  const hv = Math.hypot(S.vel.x, S.vel.z);
  // 声响：静止 0 / 蹲行 0.3 / 走路 1 / 奔跑 2.6
  const targetNoise = hv < 0.3 ? 0 : S.crouch ? 0.3 : sprint ? 2.6 : 1;
  S.noise += (targetNoise - S.noise) * Math.min(1, dt * 4);

  /* ---- 相机 ---- */
  S.crouchK += ((S.crouch ? 1 : 0) - S.crouchK) * Math.min(1, dt * 8);
  const eye = 1.65 - S.crouchK * 0.6;
  S.bob += hv * dt * (sprint ? 1.9 : 2.3);
  const bobY = Math.sin(S.bob * 2) * 0.035 * Math.min(1, hv / 3);
  const bobX = Math.cos(S.bob) * 0.025 * Math.min(1, hv / 3);
  // 脚步声
  const stepPhase = Math.floor(S.bob / Math.PI);
  if (stepPhase !== S.lastStep && hv > 0.5) { S.lastStep = stepPhase; A.footstep(S.crouch ? 0.03 : sprint ? 0.2 : 0.1); }
  S.shake = Math.max(0, S.shake - dt * 2.5);
  const sh = S.shake * 0.06;
  camera.position.set(S.pos.x + bobX * cos + rnd(-sh, sh), eye + bobY + rnd(-sh, sh), S.pos.z - bobX * sin);
  camera.rotation.set(S.pitch + rnd(-sh, sh) * 0.5, S.yaw, bobX * 0.3 + rnd(-sh, sh) * 0.5, 'YXZ');
  renderer.toneMappingExposure = S.exposure;

  /* ---- 手电筒 ---- */
  if (S.flash && S.bat > 0) {
    S.bat = Math.max(0, S.bat - dt * 0.55);
    let inten = 55;
    if (S.bat < 20) inten *= Math.random() < 0.06 ? 0.15 : 0.6 + S.bat / 50; // 低电量闪烁
    flashlight.intensity = inten;
    flashlight.userData.spill.intensity = 0.8;
    if (S.bat === 0) toast('手电筒没电了……', '손전등 배터리가 다 됐다…');
  } else { flashlight.intensity = 0; flashlight.userData.spill.intensity = 0; }
  // 手电随步伐轻微摆动
  flashlight.target.position.set(0.05 + Math.cos(S.bob) * 0.08, -0.12 + Math.sin(S.bob * 2) * 0.06, -6);

  /* ---- 丧尸 ---- */
  let nearestChase = Infinity, anyChase = false;
  const ctx = {
    player: S.pos, playerNoise: S.noise, flashOn: S.flash && S.bat > 0, crouch: S.crouch,
    colliders: world.colliders, zombies, los, flashDot,
    onSpot: (z, first) => {
      if (first) { A.stinger(); S.spotted++; }
      // 嘶吼惊动附近同伴
      for (const o of zombies) if (o !== z && o.pos.distanceTo(z.pos) < 11) o.alert(S.pos);
    },
    onAttack: (z) => {
      const dmg = z.type === 'runner' ? 14 : 18;
      S.hp -= dmg; S.shake = 1; A.hurt();
      $('damage').style.opacity = 0.9; S.hurtT = 0.6;
      if (S.hp <= 0) { S.hp = 0; die(); }
    },
    onGrowl: (z, int) => {
      const dx = z.pos.x - S.pos.x, dz = z.pos.z - S.pos.z, d = Math.hypot(dx, dz);
      const pan = (dx * Math.cos(S.yaw) - dz * Math.sin(S.yaw)) / (d || 1);
      A.growl(pan, d, int);
    },
  };
  for (const z of zombies) {
    const d = z.pos.distanceTo(S.pos);
    if (d > 45 && z.state !== 'chase') { z.root.visible = false; continue; } // 远处休眠（性能）
    z.root.visible = true;
    z.update(dt, ctx);
    if (z.state === 'chase') { anyChase = true; nearestChase = Math.min(nearestChase, d); }
  }

  /* ---- 心跳 / 受伤 ---- */
  if (nearestChase < 16) {
    S.heartT -= dt;
    if (S.heartT <= 0) { S.heartT = 0.35 + (nearestChase / 16) * 0.7; A.heartbeat(0.35 - nearestChase / 60); }
  }
  $('danger').classList.toggle('show', anyChase);
  if (S.hurtT > 0) { S.hurtT -= dt; if (S.hurtT <= 0) $('damage').style.opacity = S.hp < 30 ? 0.45 : 0; }
  else if (S.hp < 30) $('damage').style.opacity = 0.3 + Math.sin(S.time * 4) * 0.12;
  $('vignette').style.background = `radial-gradient(ellipse at center, transparent ${45 - S.crouchK * 10 - (anyChase ? 8 : 0)}%, rgba(0,0,0,${0.75 + S.crouchK * 0.1}) 100%)`;

  /* ---- 物资闪光 ---- */
  for (const it of items) {
    if (it.taken) continue;
    it.t += dt;
    it.glow.material.opacity = 0.18 + Math.sin(it.t * 2.5) * 0.12;
  }

  findFocus();

  /* ---- HUD ---- */
  $('hp').style.width = S.hp + '%';
  $('sta').style.width = S.sta + '%';
  $('bat').style.width = S.bat + '%';
  const dots = $('noise').querySelectorAll('i');
  const lvl = Math.round((S.noise / 2.6) * 5);
  dots.forEach((d, i) => { d.classList.toggle('on', i < lvl); d.classList.toggle('hot', i < lvl && lvl >= 4); });
}
