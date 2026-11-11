// 首尔夜晚街区：程序化生成贴图、建筑、招牌、车辆与灯光
import * as THREE from 'three';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ================= 程序化贴图 ================= */
function canvasTex(w, h, fn, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); fn(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function noise(g, w, h, base, amp, n = 9000, size = 2) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const v = Math.floor(rnd(-amp, amp));
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v / 255})` : `rgba(0,0,0,${-v / 255})`;
    g.fillRect(Math.random() * w, Math.random() * h, size, size);
  }
}

// 湿沥青：颜色 + 粗糙度（积水处低粗糙度 → 反射灯光）
function asphaltTextures() {
  const puddles = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), rx: rnd(0.04, 0.14), ry: rnd(0.02, 0.07), r: Math.random() * 3 }));
  const map = canvasTex(1024, 1024, (g, w, h) => {
    noise(g, w, h, '#1b1c1e', 22, 60000, 2);
    for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = rnd(1, 3); g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rnd(-40, 40); y += rnd(-40, 40); g.lineTo(x, y); } g.stroke(); }
    puddles.forEach((p) => { g.fillStyle = 'rgba(5,6,8,.55)'; g.beginPath(); g.ellipse(p.x * w, p.y * h, p.rx * w, p.ry * h, p.r, 0, 7); g.fill(); });
  }, { repeat: [3, 18] });
  const rough = canvasTex(1024, 1024, (g, w, h) => {
    noise(g, w, h, '#b8b8b8', 40, 30000, 3);
    puddles.forEach((p) => {
      const gr = g.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, p.rx * w);
      gr.addColorStop(0, '#080808'); gr.addColorStop(0.8, '#202020'); gr.addColorStop(1, 'rgba(180,180,180,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(p.x * w, p.y * h, p.rx * w, p.ry * h, p.r, 0, 7); g.fill();
    });
  }, { repeat: [3, 18], srgb: false });
  return { map, rough };
}

function sidewalkTex() {
  return canvasTex(512, 512, (g, w, h) => {
    noise(g, w, h, '#3a3633', 18, 20000, 2);
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 3;
    for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
    for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '90,70,60' : '20,20,20'},.25)`; g.fillRect(Math.floor(Math.random() * 8) * 64, Math.floor(Math.random() * 8) * 64, 64, 64); }
  }, { repeat: [1, 20] });
}

const FACADE_STYLES = [
  { base: '#5a5550', tile: true },  // 米色瓷砖楼
  { base: '#3d3f42', tile: false }, // 灰色混凝土
  { base: '#6b5444', tile: true },  // 红砖
  { base: '#2d3238', tile: false }, // 深色玻璃楼
];

function facadeTextures(style) {
  const lit = [];
  const map = canvasTex(512, 512, (g, w, h) => {
    noise(g, w, h, style.base, 20, 14000, 2);
    if (style.tile) { g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; for (let y = 0; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }
    // 雨水污渍
    for (let i = 0; i < 30; i++) { const x = Math.random() * w; const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, rnd(0, h * 0.5), rnd(3, 12), h); }
    // 窗户 4x4
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const x = 28 + c * 122, y = 30 + r * 124, ww = 76, wh = 70;
      g.fillStyle = '#0b0d10'; g.fillRect(x, y, ww, wh);
      g.fillStyle = 'rgba(120,140,160,.08)'; g.fillRect(x + 4, y + 4, ww / 2 - 6, wh - 8);
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 5; g.strokeRect(x, y, ww, wh);
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - 4, y + wh + 3, ww + 8, 6);
      if (Math.random() < 0.12) lit.push([x, y, ww, wh]);
      if (Math.random() < 0.1) { g.fillStyle = 'rgba(0,0,0,.7)'; g.beginPath(); g.moveTo(x + rnd(5, 60), y); g.lineTo(x + rnd(5, 70), y + wh); g.lineTo(x + rnd(5, 70), y + rnd(10, wh)); g.fill(); } // 碎窗
    }
  });
  const emissive = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    lit.forEach(([x, y, ww, wh]) => { g.fillStyle = Math.random() < 0.7 ? '#6b4520' : '#2b3b52'; g.fillRect(x + 3, y + 3, ww - 6, wh - 6); });
  });
  return { map, emissive };
}

function shopTex(kind) {
  return canvasTex(512, 256, (g, w, h) => {
    noise(g, w, h, '#1d1c1b', 15, 6000, 2);
    if (kind === 'shutter') {
      g.fillStyle = '#4a4b4d'; g.fillRect(20, 30, w - 40, h - 30);
      for (let y = 30; y < h; y += 8) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(20, y, w - 40, 2); }
      g.fillStyle = 'rgba(140,10,10,.75)'; g.font = 'bold 34px "Noto Sans KR", sans-serif';
      g.save(); g.translate(w * 0.5, h * 0.62); g.rotate(-0.08); g.textAlign = 'center';
      g.fillText(pick(['살려주세요', '감염자 있음', '들어오지 마', '도와줘', '여기 없음']), 0, 0); g.restore();
    } else if (kind === 'glass-lit') {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#c9d6d8'); gr.addColorStop(1, '#6f7c80');
      g.fillStyle = gr; g.fillRect(20, 30, w - 40, h - 30);
      for (let i = 0; i < 4; i++) { g.fillStyle = '#2a2a2a'; g.fillRect(40 + i * 120, 80, 90, 120); for (let s = 0; s < 5; s++) { g.fillStyle = pick(['#a33', '#36a', '#da3', '#3a5', '#eee']); g.fillRect(44 + i * 120, 86 + s * 24, rnd(20, 80), 14); } }
      g.fillStyle = '#111'; g.fillRect(w / 2 - 4, 30, 8, h);
    } else {
      g.fillStyle = '#060708'; g.fillRect(20, 30, w - 40, h - 30);
      g.fillStyle = 'rgba(120,150,170,.12)'; g.fillRect(30, 40, 120, h - 50);
      g.strokeStyle = '#222'; g.lineWidth = 8; g.strokeRect(20, 30, w - 40, h - 30);
      g.strokeStyle = 'rgba(200,220,230,.35)'; g.lineWidth = 1.5; // 碎玻璃
      const cx = rnd(120, 380), cy = rnd(90, 180);
      for (let k = 0; k < 10; k++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(k) * rnd(40, 140), cy + Math.sin(k * 1.3) * rnd(30, 90)); g.stroke(); }
    }
  });
}

function signTex(text, color, bg = '#0a0a0a', vertical = false) {
  const w = vertical ? 128 : 512, h = vertical ? 512 : 128;
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = color; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 18;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (vertical) {
      g.font = '900 72px "Noto Sans KR", sans-serif';
      const chars = [...text]; chars.forEach((ch, i) => g.fillText(ch, w / 2, 70 + i * ((h - 120) / Math.max(1, chars.length - 1))));
    } else {
      g.font = `900 ${text.length > 6 ? 58 : 76}px "Noto Sans KR", sans-serif`;
      g.fillText(text, w / 2, h / 2 + 4);
    }
  });
}

function bloodTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const r = i === 0 ? 60 : rnd(3, 22), a = Math.random() * 7, d = i === 0 ? 0 : rnd(20, 110);
      g.fillStyle = `rgba(${rnd(55, 90) | 0},0,0,${rnd(0.7, 0.95)})`;
      g.beginPath(); g.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, r, 0, 7); g.fill();
    }
  }, {});
}

/* ================= 世界构建 ================= */
export function buildWorld(scene) {
  const colliders = [];   // {x1,z1,x2,z2}
  const animated = [];    // 每帧更新的灯光/物体
  // kind: tall（建筑，遮挡视线）/ low（车辆，蹲下时遮挡视线）/ tiny（灯杆等，不遮挡）
  const addCollider = (x1, z1, x2, z2, kind = 'tall') => colliders.push({ x1: Math.min(x1, x2), z1: Math.min(z1, z2), x2: Math.max(x1, x2), z2: Math.max(z1, z2), kind });

  const M = {
    asphalt: null, side: null, curb: new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 0.9 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 1 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x2a2b2d, roughness: 0.5, metalness: 0.8 }),
  };
  const at = asphaltTextures();
  M.asphalt = new THREE.MeshStandardMaterial({ map: at.map, roughnessMap: at.rough, roughness: 1, metalness: 0.15, bumpMap: at.rough, bumpScale: 0.02 });
  const stex = sidewalkTex();
  M.side = new THREE.MeshStandardMaterial({ map: stex, roughness: 0.75, bumpMap: stex, bumpScale: 0.03 });

  // ---- 地面：主街（南北）+ 横街（东西）----
  const road = (w, d, x, z, rot = 0) => {
    const mat = M.asphalt.clone(); mat.map = at.map.clone(); mat.roughnessMap = at.rough.clone();
    mat.map.repeat.set(w / 10, d / 10); mat.roughnessMap.repeat.set(w / 10, d / 10);
    mat.map.needsUpdate = mat.roughnessMap.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0, z); m.receiveShadow = true; scene.add(m);
  };
  road(10, 150, 0, 0);
  road(47, 8, -28.5, 0); road(47, 8, 28.5, 0);

  const walk = (w, d, x, z) => {
    const mat = M.side.clone(); mat.map = stex.clone(); mat.map.repeat.set(w / 4, d / 4); mat.map.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d), mat);
    m.position.set(x, 0.075, z); m.receiveShadow = true; scene.add(m);
  };
  // 主街人行道
  walk(3, 66, -6.5, -39); walk(3, 66, 6.5, -39); walk(3, 66, -6.5, 39); walk(3, 66, 6.5, 39);
  // 横街人行道
  walk(47, 2, -31.5, -5); walk(47, 2, -31.5, 5); walk(47, 2, 31.5, -5); walk(47, 2, 31.5, 5);

  // 车道线
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xb59a3a, roughness: 0.6 });
  for (let z = -70; z < 70; z += 6) { if (Math.abs(z) < 7) continue; const l = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 3), lineMat); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.01, z); scene.add(l); }
  // 斑马线
  const zebra = new THREE.MeshStandardMaterial({ color: 0x9a9890, roughness: 0.7 });
  for (let i = -4; i <= 4; i++) { [-8.5, 8.5].forEach((z) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 3), zebra); s.rotation.x = -Math.PI / 2; s.position.set(i * 1.1, 0.012, z); scene.add(s); }); }

  // ---- 建筑 ----
  const facadeSets = FACADE_STYLES.map((s) => facadeTextures(s));
  const SIGNS = [
    ['24시 편의점', '#30d0ff'], ['약국', '#40ff70'], ['치킨 · 호프', '#ffb030'], ['PC방', '#ff40c0'],
    ['노래방', '#ff3060'], ['분식', '#ffd040'], ['세탁소', '#60b0ff'], ['부동산', '#ffffff'],
    ['고시원', '#ffd040'], ['미용실', '#ff70d0'], ['휴대폰', '#40e0ff'], ['국밥', '#ff5030'],
  ];
  const VSIGNS = [['병원', '#40ff70'], ['학원', '#ffffff'], ['모텔', '#ff40a0'], ['당구장', '#40c0ff'], ['안경', '#ffd040']];
  let neonLights = 0;

  // 建筑：facing 为面向街道的方向（法线），x/z 为中心，len 为沿街长度，depth 为进深
  function building(cx, cz, len, depth, facing, h) {
    const set = pick(facadeSets);
    const alongX = facing === 'n' || facing === 's';
    const sx = alongX ? len : depth, sz = alongX ? depth : len;
    const upperMat = new THREE.MeshStandardMaterial({
      map: set.map.clone(), emissiveMap: set.emissive.clone(), emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.85,
    });
    upperMat.map.repeat.set(Math.max(1, Math.round(len / 7)), Math.max(1, Math.round((h - 4) / 7)));
    upperMat.emissiveMap.repeat.copy(upperMat.map.repeat);
    upperMat.map.needsUpdate = upperMat.emissiveMap.needsUpdate = true;
    const box = new THREE.Mesh(new THREE.BoxGeometry(sx, h - 4, sz), [upperMat, upperMat, M.dark, M.dark, upperMat, upperMat]);
    box.position.set(cx, 4 + (h - 4) / 2, cz); box.castShadow = false; box.receiveShadow = true; scene.add(box);

    // 一楼商铺
    const kind = pick(['shutter', 'shutter', 'dark', 'dark', 'glass-lit']);
    const shopMat = new THREE.MeshStandardMaterial({ map: shopTex(kind), roughness: 0.6, metalness: 0.1 });
    if (kind === 'glass-lit') { shopMat.emissive = new THREE.Color(0xffffff); shopMat.emissiveMap = shopMat.map; shopMat.emissiveIntensity = 0.35; }
    shopMat.map.repeat.set(Math.max(1, Math.round(len / 8)), 1); shopMat.map.needsUpdate = true;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1918, roughness: 0.9 });
    const faceIdx = { e: 0, w: 1, n: 5, s: 4 }[facing];
    const mats = [wallMat, wallMat, M.dark, M.dark, wallMat, wallMat]; mats[faceIdx] = shopMat;
    const ground = new THREE.Mesh(new THREE.BoxGeometry(sx, 4, sz), mats);
    ground.position.set(cx, 2, cz); ground.receiveShadow = true; scene.add(ground);
    addCollider(cx - sx / 2, cz - sz / 2, cx + sx / 2, cz + sz / 2);

    // 便利店亮灯 → 补一盏光
    const n = { e: [1, 0], w: [-1, 0], n: [0, -1], s: [0, 1] }[facing];
    const frontX = cx + n[0] * (sx / 2), frontZ = cz + n[1] * (sz / 2);
    if (kind === 'glass-lit' && neonLights < 7) {
      const pl = new THREE.PointLight(0xcfe6ff, 6, 9, 1.8); pl.position.set(frontX + n[0] * 1.2, 2.2, frontZ + n[1] * 1.2); scene.add(pl); neonLights++;
      animated.push({ type: 'flicker', light: pl, base: 6, rate: 0.02 });
    }

    // 招牌
    if (Math.random() < 0.85) {
      const [txt, col] = pick(SIGNS);
      const sMat = new THREE.MeshStandardMaterial({ map: signTex(txt, col), emissive: 0xffffff, emissiveIntensity: 1.6, roughness: 0.5 });
      sMat.emissiveMap = sMat.map;
      const sw = Math.min(len * 0.8, 6.5);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(sw, 1.1, 0.15), [M.dark, M.dark, M.dark, M.dark, sMat, M.dark]);
      sign.position.set(frontX + n[0] * 0.12, 4.7, frontZ + n[1] * 0.12);
      sign.rotation.y = Math.atan2(n[0], n[1]);
      scene.add(sign);
      const broken = Math.random() < 0.35;
      const lightOn = neonLights < 7 && Math.random() < 0.55;
      let pl = null;
      if (lightOn) { pl = new THREE.PointLight(new THREE.Color(col), 4, 7, 2); pl.position.set(frontX + n[0] * 1.3, 4.5, frontZ + n[1] * 1.3); scene.add(pl); neonLights++; }
      if (broken || pl) animated.push({ type: 'neon', mat: sMat, light: pl, broken, t: Math.random() * 10 });
    }
    // 竖招牌
    if (h > 12 && Math.random() < 0.5) {
      const [txt, col] = pick(VSIGNS);
      const vMat = new THREE.MeshStandardMaterial({ map: signTex(txt, col, '#0a0a0a', true), emissive: 0xffffff, emissiveIntensity: 1.3 });
      vMat.emissiveMap = vMat.map;
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4, 1), [vMat, vMat, M.dark, M.dark, M.dark, M.dark]);
      const off = rnd(-len / 3, len / 3);
      v.position.set(frontX + n[0] * 0.6 + (alongX ? off : 0), rnd(7, 10), frontZ + n[1] * 0.6 + (alongX ? 0 : off));
      v.rotation.y = Math.atan2(n[0], n[1]); // 垂直于墙面伸出的“刀片式”招牌
      scene.add(v);
      if (Math.random() < 0.4) animated.push({ type: 'neon', mat: vMat, light: null, broken: true, t: Math.random() * 10 });
    }
    // 雨棚
    if (Math.random() < 0.35) {
      const aw = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len * 0.7 : 1.4, 0.08, alongX ? 1.4 : len * 0.7), new THREE.MeshStandardMaterial({ color: pick([0x5a1010, 0x103a20, 0x1a2a50, 0x4a4a10]), roughness: 0.8 }));
      aw.position.set(frontX + n[0] * 0.7, 3.4, frontZ + n[1] * 0.7);
      aw.rotation[alongX ? 'x' : 'z'] = (alongX ? -n[1] : n[0]) * 0.18;
      aw.castShadow = true; scene.add(aw);
    }
    return { frontX, frontZ, n };
  }

  // 沿一条直线排列建筑
  function row(axis, fixed, from, to, facing, depth) {
    let p = from;
    while (p < to - 0.5) {
      const len = Math.min(rnd(7, 13), to - p);
      const h = rnd(9, 26);
      const c = p + len / 2;
      const off = { e: -depth / 2, w: depth / 2, n: depth / 2, s: -depth / 2 }[facing];
      if (axis === 'z') building(fixed + off, c, len, depth, facing, h);
      else building(c, fixed + off, len, depth, facing, h);
      p += len;
    }
  }
  // 主街两侧
  row('z', -8, -72, -6, 'e', 10); row('z', -8, 6, 72, 'e', 10);
  row('z', 8, -72, -6, 'w', 10); row('z', 8, 6, 72, 'w', 10);
  // 横街两侧
  row('x', -6, -55, -18, 's', 10); row('x', 6, -55, -18, 'n', 10);
  row('x', -6, 18, 55, 's', 10); row('x', 6, 18, 55, 'n', 10);

  // ---- 北端：你的出租屋（원룸）----
  const home = new THREE.Group();
  const homeWall = new THREE.MeshStandardMaterial({ map: facadeSets[0].map.clone(), emissiveMap: facadeSets[0].emissive.clone(), emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.85 });
  homeWall.map.repeat.set(2, 3); homeWall.emissiveMap.repeat.set(2, 3);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(16, 22, 10), homeWall); hb.position.set(0, 11, -77); hb.receiveShadow = true; home.add(hb);
  addCollider(-8, -82, 8, -72);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2, 2.6, 0.2), new THREE.MeshStandardMaterial({ color: 0x2a2f33, roughness: 0.4, metalness: 0.7 }));
  door.position.set(0, 1.3, -71.95); home.add(door);
  const hsMat = new THREE.MeshStandardMaterial({ map: signTex('원룸 · 내 집', '#50ff90'), emissive: 0xffffff, emissiveIntensity: 1.4 });
  hsMat.emissiveMap = hsMat.map;
  const hs = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), hsMat); hs.position.set(0, 3.4, -71.85); home.add(hs);
  const homeLight = new THREE.PointLight(0x50ff90, 8, 10, 1.8); homeLight.position.set(0, 3, -70.5); home.add(homeLight);
  animated.push({ type: 'pulse', light: homeLight, base: 8 });
  scene.add(home);

  // ---- 边界路障 ----
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0x8a6a10, roughness: 0.7 });
  const stripeTex = canvasTex(256, 64, (g, w, h) => { for (let i = -2; i < 10; i++) { g.fillStyle = i % 2 ? '#c8a010' : '#111'; g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 32, 0); g.lineTo(i * 32, h); g.lineTo(i * 32 - 32, h); g.fill(); } });
  const stripeMat = new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.6 });
  function barricade(x, z, w, rotY = 0) {
    const grp = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, 0.5), [barrierMat, barrierMat, barrierMat, barrierMat, stripeMat, stripeMat]);
    b.position.y = 0.55; b.castShadow = true; b.receiveShadow = true; grp.add(b);
    const fence = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, 0.05), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.4, transparent: true, opacity: 0.5 }));
    fence.position.y = 2.2; grp.add(fence);
    grp.position.set(x, 0, z); grp.rotation.y = rotY; scene.add(grp);
    if (Math.abs(rotY) < 0.1) addCollider(x - w / 2, z - 0.4, x + w / 2, z + 0.4); else addCollider(x - 0.4, z - w / 2, x + 0.4, z + w / 2);
  }
  barricade(0, 72.5, 16);           // 南端
  barricade(-55.5, 0, 12, Math.PI / 2); // 西端
  barricade(55.5, 0, 12, Math.PI / 2);  // 东端
  // 背景挡墙（防止看到虚空）
  [[0, 84, 40, 1], [-66, 0, 1, 40], [66, 0, 1, 40]].forEach(([x, z, w, d]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 30, d), M.dark); m.position.set(x, 15, z); scene.add(m);
  });

  // ---- 车辆 ----
  const carColors = [0x1c1c1e, 0xd8d8d8, 0x2a2e38, 0x5a0f12, 0x8a8a8a, 0x15202a];
  function car(x, z, rotY, opts = {}) {
    const grp = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color: opts.color ?? pick(carColors), roughness: 0.25, metalness: 0.7 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.05, metalness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.75, 4.4), paint); body.position.y = 0.65; grp.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.62, 2.3), [glass, glass, paint, paint, glass, glass]); cab.position.set(0, 1.33, -0.15); grp.add(cab);
    const wheelG = new THREE.CylinderGeometry(0.34, 0.34, 0.25, 16); wheelG.rotateZ(Math.PI / 2);
    [[-0.88, 1.4], [0.88, 1.4], [-0.88, -1.4], [0.88, -1.4]].forEach(([wx, wz]) => { const w = new THREE.Mesh(wheelG, M.dark); w.position.set(wx, 0.34, wz); grp.add(w); });
    const tail = new THREE.MeshStandardMaterial({ color: 0x300000, emissive: 0xff1010, emissiveIntensity: opts.hazard ? 1 : 0.05 });
    [-0.7, 0.7].forEach((tx) => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.05), tail); t.position.set(tx, 0.85, 2.21); grp.add(t); });
    const head = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff2d0, emissiveIntensity: opts.headlight ? 2 : 0 });
    [-0.65, 0.65].forEach((tx) => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.05), head); t.position.set(tx, 0.8, -2.21); grp.add(t); });
    if (opts.door) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 1.1), paint); d.position.set(1.3, 0.9, -0.4); d.rotation.y = -0.9; grp.add(d); }
    grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    grp.position.set(x, 0, z); grp.rotation.y = rotY; scene.add(grp);
    // 碰撞盒（近似旋转后的包围盒）
    const c = Math.abs(Math.cos(rotY)), s = Math.abs(Math.sin(rotY));
    const hx = (1.85 * c + 4.4 * s) / 2, hz = (1.85 * s + 4.4 * c) / 2;
    addCollider(x - hx, z - hz, x + hx, z + hz, 'low');
    if (opts.hazard) animated.push({ type: 'hazard', mat: tail, t: Math.random() });
    if (opts.headlight) {
      const sl = new THREE.SpotLight(0xfff0d0, 50, 22, 0.5, 0.5, 1.5);
      sl.position.set(x, 0.8, z); scene.add(sl);
      const tgt = new THREE.Object3D(); tgt.position.set(x - Math.sin(rotY) * 10, 0, z - Math.cos(rotY) * 10); scene.add(tgt); sl.target = tgt;
    }
    return grp;
  }
  car(-2.6, 30, 0.15, { hazard: true, door: true });
  car(2.4, 18, Math.PI + 0.4);
  car(-1.5, -22, 0.9, { headlight: true, door: true });
  car(2.8, -40, Math.PI - 0.1, { hazard: true });
  car(-2.8, 52, -0.05);
  car(-30, 1.5, Math.PI / 2 + 0.2, { door: true });
  car(24, -1.8, -Math.PI / 2 + 0.1, { hazard: true });
  car(42, 1.2, Math.PI / 2 - 0.3);
  car(2.5, -58, 0.3, { door: true });

  // 警车（红蓝闪灯）
  const police = car(-2.2, 8.5, 1.35, { color: 0xe8e8e8, door: true });
  const lbar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.3), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff0000, emissiveIntensity: 2 }));
  lbar.position.y = 1.72; police.add(lbar);
  const pr = new THREE.PointLight(0xff1020, 0, 14, 1.6); pr.position.set(-2.2, 2.2, 8.5); scene.add(pr);
  const pb = new THREE.PointLight(0x1040ff, 0, 14, 1.6); pb.position.set(-2.2, 2.2, 8.5); scene.add(pb);
  animated.push({ type: 'police', r: pr, b: pb, bar: lbar.material });

  // 公交车（侧翻挡路）
  {
    const bus = new THREE.Group();
    const bm = new THREE.MeshStandardMaterial({ color: 0x1f6a3a, roughness: 0.5, metalness: 0.4 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3, 11), bm); b.position.y = 1.5; b.castShadow = true; b.receiveShadow = true; bus.add(b);
    const win = new THREE.Mesh(new THREE.BoxGeometry(2.52, 1, 9.5), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.8 })); win.position.y = 2.1; bus.add(win);
    bus.position.set(-40, 0, -0.5); bus.rotation.y = Math.PI / 2 + 0.15; scene.add(bus);
    addCollider(-45.5, -2.5, -34.5, 1.5);
  }

  // ---- 路灯 ----
  const lamps = [];
  const poleG = new THREE.CylinderGeometry(0.07, 0.1, 7, 8);
  function lamp(x, z, side, state) {
    const pole = new THREE.Mesh(poleG, M.metal); pole.position.set(x, 3.5, z); pole.castShadow = true; scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.12), M.metal); arm.position.set(x - side * 0.8, 6.95, z); scene.add(arm);
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffb060, emissiveIntensity: state === 'off' ? 0 : 3 });
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.3), bulbMat); bulb.position.set(x - side * 1.5, 6.88, z); scene.add(bulb);
    addCollider(x - 0.15, z - 0.15, x + 0.15, z + 0.15, 'tiny');
    if (state === 'off') return;
    const sl = new THREE.SpotLight(0xffb070, 70, 22, 0.95, 0.7, 1.4);
    sl.position.set(x - side * 1.5, 6.8, z);
    const tgt = new THREE.Object3D(); tgt.position.set(x - side * 2.5, 0, z); scene.add(tgt); sl.target = tgt;
    scene.add(sl);
    lamps.push(sl);
    animated.push({ type: state === 'flicker' ? 'lampFlicker' : 'lamp', light: sl, mat: bulbMat, base: 70, t: Math.random() * 10 });
  }
  lamp(-5.4, 60, -1, 'on'); lamp(5.4, 44, 1, 'flicker'); lamp(-5.4, 26, -1, 'off');
  lamp(5.4, 12, 1, 'on'); lamp(-5.4, -14, -1, 'flicker'); lamp(5.4, -30, 1, 'off');
  lamp(-5.4, -48, -1, 'on'); lamp(5.4, -64, 1, 'flicker');
  lamp(-24, -4.4, 0, 'flicker'); lamp(30, 4.4, 0, 'on'); lamp(-46, 4.4, 0, 'off'); lamp(48, -4.4, 0, 'flicker');
  // 只有部分路灯投射阴影（性能）
  [0, 3].forEach((i) => { if (lamps[i]) { lamps[i].castShadow = true; lamps[i].shadow.mapSize.set(512, 512); lamps[i].shadow.bias = -0.0005; } });

  // ---- 燃烧的油桶 ----
  function fireBarrel(x, z) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.9, 14), new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.8, metalness: 0.5 }));
    b.position.set(x, 0.45, z); b.castShadow = true; scene.add(b);
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xff7020, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    fire.position.set(x, 1.15, z); scene.add(fire);
    const l = new THREE.PointLight(0xff6a20, 18, 12, 1.7); l.position.set(x, 1.5, z); scene.add(l);
    l.castShadow = false;
    addCollider(x - 0.35, z - 0.35, x + 0.35, z + 0.35, 'tiny');
    animated.push({ type: 'fire', light: l, mesh: fire, t: Math.random() * 10 });
  }
  fireBarrel(4.2, -9); fireBarrel(-36, -4.2); fireBarrel(-6.3, 46);

  // ---- 杂物：垃圾袋、纸箱、血迹 ----
  const bagMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.25, metalness: 0.1 });
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x6a5236, roughness: 0.9 });
  const bt = bloodTex();
  const bloodMat = new THREE.MeshStandardMaterial({ map: bt, transparent: true, roughness: 0.15, metalness: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  for (let i = 0; i < 70; i++) {
    const onMain = Math.random() < 0.6;
    const x = onMain ? pick([-1, 1]) * rnd(5.3, 7.6) : rnd(-54, 54);
    const z = onMain ? rnd(-70, 70) : pick([-1, 1]) * rnd(4.4, 5.6);
    if (!onMain && Math.abs(x) < 9) continue;
    if (Math.random() < 0.6) {
      const s = rnd(0.35, 0.6);
      const bag = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), bagMat); bag.scale.y = 0.7; bag.position.set(x, s * 0.6, z); bag.rotation.y = Math.random() * 6; bag.castShadow = true; scene.add(bag);
    } else {
      const bx = new THREE.Mesh(new THREE.BoxGeometry(rnd(0.4, 0.8), rnd(0.3, 0.6), rnd(0.4, 0.8)), boxMat); bx.position.set(x, 0.25, z); bx.rotation.y = Math.random() * 6; bx.castShadow = true; scene.add(bx);
    }
  }
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(rnd(1.2, 3), rnd(1.2, 3)), bloodMat);
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6;
    const main = Math.random() < 0.65;
    m.position.set(main ? rnd(-7, 7) : rnd(-50, 50), 0.16, main ? rnd(-68, 68) : rnd(-4, 4));
    m.receiveShadow = true; scene.add(m);
  }
  // 墙上的血手印 / 喷溅
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(rnd(1, 2), rnd(1, 2)), bloodMat);
    const side = pick([-1, 1]);
    m.position.set(side * 7.98, rnd(0.8, 2.5), rnd(-66, 66)); m.rotation.y = -side * Math.PI / 2; scene.add(m);
  }

  // ---- 雨 ----
  const RAIN = 4000;
  const rainGeo = new THREE.BufferGeometry();
  const rp = new Float32Array(RAIN * 6);
  for (let i = 0; i < RAIN; i++) {
    const x = rnd(-25, 25), y = rnd(0, 20), z = rnd(-25, 25);
    rp.set([x, y, z, x + 0.02, y - 0.45, z], i * 6);
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x8a96a8, transparent: true, opacity: 0.35 }));
  rain.frustumCulled = false;
  scene.add(rain);

  // ---- 每帧更新 ----
  let time = 0;
  function update(dt, camPos) {
    time += dt;
    // 雨跟随相机
    const p = rainGeo.attributes.position.array;
    for (let i = 0; i < RAIN; i++) {
      const o = i * 6;
      p[o + 1] -= 22 * dt; p[o + 4] -= 22 * dt;
      if (p[o + 1] < 0) { const x = camPos.x + rnd(-25, 25), z = camPos.z + rnd(-25, 25), y = rnd(14, 20); p[o] = x; p[o + 1] = y; p[o + 2] = z; p[o + 3] = x + 0.02; p[o + 4] = y - 0.45; p[o + 5] = z; }
    }
    rainGeo.attributes.position.needsUpdate = true;

    for (const a of animated) {
      switch (a.type) {
        case 'flicker': a.light.intensity = Math.random() < a.rate ? a.base * 0.2 : a.base; break;
        case 'lamp': break;
        case 'lampFlicker': {
          a.t += dt;
          const on = Math.sin(a.t * 0.7) > -0.3 ? (Math.random() > 0.08) : (Math.random() < 0.05);
          a.light.intensity = on ? a.base : 0; a.mat.emissiveIntensity = on ? 3 : 0.05; break;
        }
        case 'neon': {
          a.t += dt;
          let on = true;
          if (a.broken) on = Math.sin(a.t * 2.3) > 0.2 ? Math.random() > 0.15 : Math.random() < 0.03;
          a.mat.emissiveIntensity = on ? 1.6 : 0.05;
          if (a.light) a.light.intensity = on ? 4 : 0;
          break;
        }
        case 'pulse': a.light.intensity = a.base * (0.75 + Math.sin(time * 2) * 0.25); break;
        case 'hazard': a.mat.emissiveIntensity = (time + a.t) % 1 < 0.5 ? 1.8 : 0.05; break;
        case 'police': {
          const ph = (time * 2.5) % 1;
          a.r.intensity = ph < 0.5 ? 25 : 0; a.b.intensity = ph >= 0.5 ? 25 : 0;
          a.bar.emissive.setHex(ph < 0.5 ? 0xff0000 : 0x0030ff); break;
        }
        case 'fire': {
          a.t += dt;
          a.light.intensity = 14 + Math.sin(a.t * 13) * 3 + Math.random() * 5;
          a.mesh.scale.set(1 + Math.sin(a.t * 9) * 0.1, 1 + Math.random() * 0.3, 1 + Math.cos(a.t * 11) * 0.1);
          break;
        }
      }
    }
  }

  return {
    colliders, update,
    playerStart: new THREE.Vector3(0, 0, 66),
    homeDoor: new THREE.Vector3(0, 0, -71),
    bounds: { x1: -55, x2: 55, z1: -71.5, z2: 72 },
  };
}

// 2D 线段与 AABB 相交（用于视线检测）
export function segmentHitsBox(ax, az, bx, bz, b) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  const clip = (p, q) => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else { if (r < t0) return false; if (r < t1) t1 = r; }
    return true;
  };
  return clip(-dx, ax - b.x1) && clip(dx, b.x2 - ax) && clip(-dz, az - b.z1) && clip(dz, b.z2 - az);
}

// 圆形与 AABB 碰撞推出
export function resolveCircle(pos, r, colliders) {
  for (const b of colliders) {
    const cx = Math.max(b.x1, Math.min(pos.x, b.x2));
    const cz = Math.max(b.z1, Math.min(pos.z, b.z2));
    const dx = pos.x - cx, dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2); pos.x = cx + (dx / d) * r; pos.z = cz + (dz / d) * r; }
      else {
        // 中心在盒内：从最近的边推出
        const l = pos.x - b.x1, rr = b.x2 - pos.x, t = pos.z - b.z1, bt = b.z2 - pos.z;
        const m = Math.min(l, rr, t, bt);
        if (m === l) pos.x = b.x1 - r; else if (m === rr) pos.x = b.x2 + r; else if (m === t) pos.z = b.z1 - r; else pos.z = b.z2 + r;
      }
    }
  }
}
