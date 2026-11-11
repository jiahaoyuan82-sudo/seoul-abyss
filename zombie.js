// 丧尸：程序化人形模型 + 程序化动画（韩式“快速抽搐型”感染者）+ 感知 / 追击 AI
import * as THREE from 'three';
import { resolveCircle } from './world.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------- 贴图 ---------- */
function tex(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

function veins(g, w, h, n, col) {
  g.strokeStyle = col; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    let x = Math.random() * w, y = Math.random() * h;
    g.lineWidth = rnd(0.6, 2.2);
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += rnd(-14, 14); y += rnd(-14, 14); g.lineTo(x, y); }
    g.stroke();
  }
}

function blood(g, w, h, n, big = false) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w, y = Math.random() * h * (big ? 0.6 : 1);
    g.fillStyle = `rgba(${rnd(50, 95) | 0},${rnd(0, 8) | 0},${rnd(0, 6) | 0},${rnd(0.6, 0.95)})`;
    g.beginPath(); g.arc(x, y, rnd(2, big ? 28 : 12), 0, 7); g.fill();
    if (Math.random() < 0.6) g.fillRect(x - 2, y, rnd(2, 5), rnd(10, 70)); // 流下的血
  }
}

let SKINS = null, CLOTHES = null;
function buildTextures() {
  SKINS = [0, 1, 2].map((v) => tex(256, 256, (g, w, h) => {
    g.fillStyle = ['#8f948a', '#a09a8e', '#7f8680'][v]; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '40,50,40' : '200,190,180'},${rnd(0.03, 0.08)})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    veins(g, w, h, 40, 'rgba(40,30,60,.55)');   // 青紫色血管（釜山行式）
    veins(g, w, h, 20, 'rgba(70,20,20,.45)');
    blood(g, w, h, 12);
    // 眼窝、嘴部（球体 UV 中央附近大约是正面）
    g.fillStyle = 'rgba(20,10,10,.55)';
    g.beginPath(); g.ellipse(w * 0.22, h * 0.45, 14, 10, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(w * 0.28, h * 0.45, 14, 10, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(90,0,0,.9)'; g.fillRect(w * 0.2, h * 0.58, w * 0.1, h * 0.25);
  }));
  const shirt = (base, extra) => tex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(0,0,0,${rnd(0.02, 0.07)})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    if (extra) extra(g, w, h);
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 8; i++) g.fillRect(Math.random() * w, Math.random() * h, rnd(10, 40), rnd(2, 5)); // 撕裂
    blood(g, w, h, 18, true);
  });
  CLOTHES = {
    student: shirt('#d8d8d2'),
    office: shirt('#c9ccd2', (g, w, h) => { g.fillStyle = '#20253a'; g.fillRect(w * 0.47, 0, w * 0.06, h * 0.7); }),
    hazmat: shirt('#d9dcd8', (g, w, h) => { g.fillStyle = '#c8a010'; g.fillRect(0, h * 0.4, w, 10); }),
    worker: shirt('#c45a12', (g, w, h) => { g.fillStyle = '#d8e0d0'; g.fillRect(0, h * 0.35, w, 12); g.fillRect(0, h * 0.6, w, 12); }),
    hoodie: shirt('#2b2d33'),
    nurse: shirt('#8fb6c4'),
    red: shirt('#5a1a1c'),
  };
  CLOTHES.pants = [shirt('#1a1c22'), shirt('#2c3240'), shirt('#3b3a36'), shirt('#16181a')];
}

const OUTFITS = [
  { top: 'student', pants: 0 }, { top: 'office', pants: 0 }, { top: 'hazmat', pants: -1 },
  { top: 'worker', pants: 1 }, { top: 'hoodie', pants: 2 }, { top: 'nurse', pants: 3 }, { top: 'red', pants: 1 },
];

/* ---------- 模型 ---------- */
function buildBody() {
  if (!SKINS) buildTextures();
  const outfit = pick(OUTFITS);
  const skinMat = new THREE.MeshStandardMaterial({ map: pick(SKINS), roughness: 0.55, metalness: 0 });
  const topMat = new THREE.MeshStandardMaterial({ map: CLOTHES[outfit.top], roughness: 0.85 });
  const pantsMat = outfit.pants < 0 ? topMat : new THREE.MeshStandardMaterial({ map: CLOTHES.pants[outfit.pants], roughness: 0.9 });
  const hairMat = new THREE.MeshStandardMaterial({ color: pick([0x0a0806, 0x1a120c, 0x2a1e14]), roughness: 0.9 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xd8dccf, emissive: 0x9aa090, emissiveIntensity: 0.25, roughness: 0.2 }); // 浑浊的白眼

  const s = rnd(0.92, 1.06);
  const root = new THREE.Group();
  const body = new THREE.Group(); body.scale.setScalar(s); root.add(body);

  const hips = new THREE.Group(); hips.position.y = 0.95; body.add(hips);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.22), pantsMat); hips.add(pelvis);

  const spine = new THREE.Group(); spine.position.y = 0.08; hips.add(spine);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.3, 4, 10), topMat);
  torso.scale.set(1.2, 1, 0.75); torso.position.y = 0.3; spine.add(torso);

  const neck = new THREE.Group(); neck.position.y = 0.6; spine.add(neck);
  const neckM = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), skinMat); neckM.position.y = 0.03; neck.add(neckM);
  const head = new THREE.Group(); head.position.y = 0.17; neck.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 14), skinMat); skull.scale.set(0.95, 1.15, 1.05); head.add(skull);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.122, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat); hair.scale.set(0.98, 1.1, 1.08); hair.position.set(0, 0.02, -0.01); hair.rotation.x = -0.25; head.add(hair);
  [-0.04, 0.04].forEach((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), eyeMat); e.position.set(x, 0.02, 0.105); head.add(e); });
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.03), new THREE.MeshStandardMaterial({ color: 0x2a0303, roughness: 0.3 }));
  jaw.position.set(0, -0.06, 0.11); head.add(jaw);

  const mkArm = (side) => {
    const shoulder = new THREE.Group(); shoulder.position.set(side * 0.24, 0.52, 0); spine.add(shoulder);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.22, 4, 8), topMat); up.position.y = -0.15; shoulder.add(up);
    const elbow = new THREE.Group(); elbow.position.y = -0.3; shoulder.add(elbow);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 4, 8), skinMat); fore.position.y = -0.14; elbow.add(fore);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.035), skinMat); hand.position.y = -0.31; elbow.add(hand);
    return { shoulder, elbow };
  };
  const mkLeg = (side) => {
    const hip = new THREE.Group(); hip.position.set(side * 0.1, -0.06, 0); hips.add(hip);
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.3, 4, 8), pantsMat); th.position.y = -0.21; hip.add(th);
    const knee = new THREE.Group(); knee.position.y = -0.43; hip.add(knee);
    const sh = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.3, 4, 8), pantsMat); sh.position.y = -0.2; knee.add(sh);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.24), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 })); foot.position.set(0, -0.43, 0.05); knee.add(foot);
    return { hip, knee };
  };
  const armL = mkArm(-1), armR = mkArm(1), legL = mkLeg(-1), legR = mkLeg(1);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, body, hips, spine, neck, head, jaw, armL, armR, legL, legR };
}

/* ---------- AI + 动画 ---------- */
export class Zombie {
  constructor(scene, pos, type = 'walker', opts = {}) {
    this.rig = buildBody();
    this.type = type;            // walker: 蹒跚 / runner: 釜山行式狂奔
    this.root = this.rig.root;
    this.root.position.copy(pos);
    this.root.rotation.y = Math.random() * Math.PI * 2;
    scene.add(this.root);
    this.home = pos.clone();
    this.state = opts.feeding ? 'feeding' : 'idle';
    this.target = new THREE.Vector3();
    this.lastSeen = new THREE.Vector3();
    this.timer = rnd(1, 5);
    this.cycle = Math.random() * 10;
    this.twitchT = rnd(1, 4);
    this.twitch = 0;
    this.convulse = 0;
    this.attackCd = 0;
    this.lostT = 0;
    this.growlT = rnd(2, 8);
    this.stuckT = 0; this.sidestep = 0; this.sideDir = 1;
    this.speed = 0;
    this.awareness = 0;          // 0~1，累计到 1 才真正发现
    this.yaw = this.root.rotation.y;
    this.hasSpotted = false;
    if (opts.feeding) { this.rig.hips.position.y = 0.45; }
  }

  get pos() { return this.root.position; }

  // ctx: { player, playerNoise, flashOn, crouch, colliders, los(a,b), onSpot(z), onAttack(z), onGrowl(z,int) }
  update(dt, ctx) {
    const p = this.pos;
    const pl = ctx.player;
    const dx = pl.x - p.x, dz = pl.z - p.z;
    const dist = Math.hypot(dx, dz);
    const run = this.type === 'runner';

    /* ---- 感知 ---- */
    const fwdX = Math.sin(this.yaw), fwdZ = Math.cos(this.yaw);
    const facing = dist > 0.01 ? (dx * fwdX + dz * fwdZ) / dist : 1;
    let sightRange = ctx.flashOn ? 20 : 8;
    if (ctx.crouch) sightRange *= 0.55;
    if (this.state === 'feeding') sightRange *= 0.5;
    let sees = false;
    if (dist < sightRange && (facing > 0.2 || dist < 2.2)) sees = ctx.los(p, pl);
    // 手电直接照到丧尸脸上时必定被发现
    if (ctx.flashOn && dist < 22 && ctx.flashDot(p) > 0.94 && ctx.los(p, pl)) sees = true;
    const hearRange = ctx.playerNoise * 4.5;
    const hears = dist < hearRange;

    if (sees) this.awareness = Math.min(1, this.awareness + dt * (dist < 5 ? 3 : 1.4));
    else this.awareness = Math.max(0, this.awareness - dt * 0.25);

    if (this.state !== 'chase') {
      if (this.awareness >= 1) { this.setChase(pl, ctx); }
      else if (hears && this.state !== 'investigate') { this.state = 'investigate'; this.target.set(pl.x, 0, pl.z); this.timer = 6; ctx.onGrowl(this, 0.6); }
      else if (sees && this.awareness > 0.35 && this.state !== 'investigate') { this.state = 'investigate'; this.target.set(pl.x, 0, pl.z); this.timer = 5; }
    }

    /* ---- 状态机 ---- */
    let moveX = 0, moveZ = 0, desired = 0;
    switch (this.state) {
      case 'feeding':
        this.timer -= dt;
        break;
      case 'idle':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'wander';
          const a = Math.random() * Math.PI * 2, r = rnd(2, 8);
          this.target.set(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
          this.timer = rnd(6, 12);
        }
        break;
      case 'wander': case 'investigate': {
        const tx = this.target.x - p.x, tz = this.target.z - p.z, td = Math.hypot(tx, tz);
        this.timer -= dt;
        if (td < 0.8 || this.timer <= 0) { if (this.state === 'investigate') this.home.copy(p); this.state = 'idle'; this.timer = rnd(2, 6); }
        else { moveX = tx / td; moveZ = tz / td; desired = this.state === 'investigate' ? (run ? 1.6 : 0.9) : 0.45; }
        break;
      }
      case 'chase': {
        if (sees || dist < 2.5) { this.lastSeen.set(pl.x, 0, pl.z); this.lostT = 0; }
        else this.lostT += dt;
        const tx = this.lastSeen.x - p.x, tz = this.lastSeen.z - p.z, td = Math.hypot(tx, tz);
        if (this.lostT > 6 || (td < 0.6 && !sees)) { this.state = 'investigate'; this.target.copy(this.lastSeen); this.timer = 5; this.awareness = 0.5; break; }
        if (td > 0.01) { moveX = tx / td; moveZ = tz / td; }
        desired = run ? 5.4 : 1.35;
        if (dist < 1.15) {
          desired = 0;
          this.attackCd -= dt;
          if (this.attackCd <= 0) { this.attackCd = run ? 0.9 : 1.3; this.lunge = 0.35; ctx.onAttack(this); }
        }
        break;
      }
    }

    // 卡墙处理：侧移
    if (this.sidestep > 0) {
      this.sidestep -= dt;
      const sx = -moveZ * this.sideDir, sz = moveX * this.sideDir;
      moveX = moveX * 0.3 + sx; moveZ = moveZ * 0.3 + sz;
      const l = Math.hypot(moveX, moveZ) || 1; moveX /= l; moveZ /= l;
    }

    // 加速度
    this.speed += (desired - this.speed) * Math.min(1, dt * (run ? 3 : 2));
    if (this.twitch > 0) this.speed *= 0.6;
    const ox = p.x, oz = p.z;
    p.x += moveX * this.speed * dt;
    p.z += moveZ * this.speed * dt;
    resolveCircle(p, 0.32, ctx.colliders);
    // 与其他丧尸分离
    for (const o of ctx.zombies) {
      if (o === this) continue;
      const ex = p.x - o.pos.x, ez = p.z - o.pos.z, e2 = ex * ex + ez * ez;
      if (e2 < 0.5 && e2 > 1e-6) { const e = Math.sqrt(e2); p.x += (ex / e) * (0.71 - e) * 0.5; p.z += (ez / e) * (0.71 - e) * 0.5; }
    }
    const moved = Math.hypot(p.x - ox, p.z - oz);
    if (desired > 0.3 && moved < desired * dt * 0.25) { this.stuckT += dt; if (this.stuckT > 0.5) { this.sidestep = rnd(0.6, 1.2); this.sideDir = Math.random() < 0.5 ? 1 : -1; this.stuckT = 0; } }
    else this.stuckT = 0;

    // 朝向
    if (moveX || moveZ) {
      const want = Math.atan2(moveX, moveZ);
      let d = want - this.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      this.yaw += d * Math.min(1, dt * (run && this.state === 'chase' ? 8 : 3));
    } else if (this.state === 'chase') {
      const want = Math.atan2(dx, dz);
      let d = want - this.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      this.yaw += d * Math.min(1, dt * 6);
    }
    this.root.rotation.y = this.yaw;

    // 嘶吼
    this.growlT -= dt;
    if (this.growlT <= 0) {
      this.growlT = this.state === 'chase' ? rnd(1.2, 3) : rnd(5, 14);
      ctx.onGrowl(this, this.state === 'chase' ? 1.2 : 0.7);
    }

    this.animate(dt, dist);
  }

  setChase(pl, ctx) {
    const first = !this.hasSpotted;
    this.state = 'chase'; this.lastSeen.set(pl.x, 0, pl.z); this.lostT = 0; this.awareness = 1; this.hasSpotted = true;
    if (this.rig.hips.position.y < 0.9) this.rig.hips.position.y = 0.95;
    this.convulse = this.type === 'runner' ? 0.9 : 0.5; // 发现猎物时剧烈抽搐（釜山行式）
    ctx.onSpot(this, first);
  }

  // 被同伴的嘶吼/附近追击惊动
  alert(pos) {
    if (this.state === 'chase') return;
    this.state = 'investigate'; this.target.copy(pos); this.timer = 7; this.awareness = Math.max(this.awareness, 0.6);
    if (this.rig.hips.position.y < 0.9) this.rig.hips.position.y = 0.95;
  }

  animate(dt, dist) {
    const R = this.rig;
    const run = this.type === 'runner' && this.speed > 2;
    const sp = this.speed;
    this.cycle += dt * (run ? sp * 2.1 : 2 + sp * 3.2);
    const c = this.cycle;

    // 随机抽搐
    this.twitchT -= dt;
    if (this.twitchT <= 0) { this.twitch = rnd(0.12, 0.35); this.twitchT = rnd(0.8, this.state === 'chase' ? 2 : 5); this.twDir = new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)); }
    let tw = 0;
    if (this.twitch > 0) { this.twitch -= dt; tw = Math.sin(this.twitch * 60) * 0.35; }
    if (this.convulse > 0) this.convulse -= dt;
    const cv = this.convulse > 0 ? Math.min(1, this.convulse * 2) : 0;
    const shake = cv ? Math.sin(performance.now() * 0.06) * 0.25 * cv : 0;

    if (this.state === 'feeding') {
      // 跪在地上啃食
      R.hips.position.y = 0.45;
      R.spine.rotation.x = 0.9 + Math.sin(c * 4) * 0.1;
      R.neck.rotation.x = 0.4 + Math.sin(c * 7) * 0.15;
      R.legL.hip.rotation.x = -1.5; R.legL.knee.rotation.x = 2.2;
      R.legR.hip.rotation.x = -1.3; R.legR.knee.rotation.x = 2.3;
      R.armL.shoulder.rotation.x = -1.2 + Math.sin(c * 5) * 0.2; R.armR.shoulder.rotation.x = -1.0 + Math.cos(c * 5) * 0.2;
      R.armL.elbow.rotation.x = -0.8; R.armR.elbow.rotation.x = -0.9;
      R.jaw.position.y = -0.06 - Math.abs(Math.sin(c * 8)) * 0.02;
      this.cycle += dt * 0.5;
      return;
    }

    const legAmp = run ? 1.1 : 0.25 + sp * 0.35;
    const s1 = Math.sin(c), s2 = Math.sin(c + Math.PI);
    R.legL.hip.rotation.x = -s1 * legAmp;
    R.legR.hip.rotation.x = -s2 * legAmp;
    R.legL.knee.rotation.x = Math.max(0, Math.sin(c - 1.2)) * legAmp * 1.6 + 0.05;
    R.legR.knee.rotation.x = Math.max(0, Math.sin(c + Math.PI - 1.2)) * legAmp * 1.6 + 0.05;
    // 拖腿
    if (!run && this.type === 'walker') R.legR.hip.rotation.z = 0.08;

    R.hips.position.y = 0.95 - (run ? 0.08 : 0.02) + Math.abs(Math.sin(c)) * (run ? 0.07 : 0.025);
    R.hips.rotation.z = Math.sin(c) * (run ? 0.12 : 0.08);
    R.hips.rotation.y = Math.sin(c) * 0.15;

    // 躯干：狂奔时大幅前倾，蹒跚时佝偻
    const lean = run ? 0.55 : 0.25 + sp * 0.1;
    R.spine.rotation.x = lean - cv * 1.1 + tw * 0.4 + shake;  // 抽搐时向后弓背
    R.spine.rotation.z = Math.sin(c * 0.5) * 0.08 + tw * 0.3;
    R.spine.rotation.y = -Math.sin(c) * (run ? 0.25 : 0.1);

    // 头：歪斜、甩动、发现猎物时向后折
    R.neck.rotation.z = 0.35 * Math.sin(this.cycle * 0.13 + this.home.x) + tw * 0.8 + shake * 2;
    R.neck.rotation.x = (run ? -0.45 : 0.1) - cv * 0.9 + tw * 0.6;
    R.neck.rotation.y = Math.sin(c * 0.7) * 0.15 + tw;
    R.jaw.position.y = -0.06 - (this.state === 'chase' ? 0.02 + Math.abs(Math.sin(c * 3)) * 0.02 : 0.005);

    if (run) {
      // 双臂向后乱甩
      R.armL.shoulder.rotation.x = s1 * 1.3 + 0.3; R.armR.shoulder.rotation.x = s2 * 1.3 + 0.3;
      R.armL.shoulder.rotation.z = -0.4 + shake; R.armR.shoulder.rotation.z = 0.4 - shake;
      R.armL.elbow.rotation.x = -0.6 - Math.abs(s1) * 0.6; R.armR.elbow.rotation.x = -0.6 - Math.abs(s2) * 0.6;
    } else if (this.state === 'chase' || this.state === 'investigate') {
      // 前伸抓取
      R.armL.shoulder.rotation.x = -1.35 + Math.sin(c * 1.3) * 0.15; R.armR.shoulder.rotation.x = -1.2 + Math.cos(c * 1.1) * 0.2;
      R.armL.shoulder.rotation.z = 0.1; R.armR.shoulder.rotation.z = -0.1;
      R.armL.elbow.rotation.x = -0.2; R.armR.elbow.rotation.x = -0.35;
    } else {
      // 下垂晃动
      R.armL.shoulder.rotation.x = Math.sin(c) * 0.15 + 0.1; R.armR.shoulder.rotation.x = Math.sin(c + 1) * 0.12 - 0.3;
      R.armL.shoulder.rotation.z = -0.08 + tw * 0.5; R.armR.shoulder.rotation.z = 0.12;
      R.armL.elbow.rotation.x = -0.15; R.armR.elbow.rotation.x = -0.5;
    }
    // 攻击扑咬
    if (this.lunge > 0) { this.lunge -= dt; R.spine.rotation.x += 0.5; R.armL.shoulder.rotation.x = -1.7; R.armR.shoulder.rotation.x = -1.7; }
  }

  dispose(scene) { scene.remove(this.root); }
}
