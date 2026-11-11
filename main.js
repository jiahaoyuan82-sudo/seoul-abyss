import { initAudio, startAmbience, click } from './audio.js';
import { playIntro } from './intro.js';

const $ = (id) => document.getElementById(id);

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(id).classList.add('active');
}

/* ---------------- 主菜单背景：雨夜首尔天际线 ---------------- */
const cv = $('menu-bg');
const g = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
let skyline = [], rain = [], walkers = [], lightning = 0, menuRunning = true;

function rand(a, b) { return a + Math.random() * (b - a); }

function buildSkyline() {
  skyline = [];
  // 三层楼群，越远越暗
  for (let layer = 0; layer < 3; layer++) {
    const list = [];
    let x = -50;
    while (x < W + 50) {
      const w = rand(40, 130) * (1 - layer * 0.15);
      const h = rand(H * 0.12, H * (0.45 - layer * 0.08));
      const wins = [];
      const cols = Math.floor(w / 12), rows = Math.floor(h / 16);
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        if (Math.random() < 0.06) wins.push({ c, r, f: Math.random() < 0.25, warm: Math.random() < 0.7 });
      }
      list.push({ x, w, h, wins, sign: layer === 0 && x > W * 0.48 && w > 60 && Math.random() < 0.3 ? { t: ['약국', '병원', '편의점', 'PC방', '노래방', '치킨'][Math.floor(Math.random() * 6)], on: true } : null });
      x += w + rand(-6, 10);
    }
    skyline.push(list);
  }
  rain = Array.from({ length: Math.floor(W / 4) }, () => ({ x: rand(0, W), y: rand(-H, H), l: rand(10, 26), s: rand(14, 24) }));
  walkers = Array.from({ length: 5 }, (_, i) => newWalker(rand(0, W)));
}

function newWalker(x) {
  return { x: x ?? (Math.random() < 0.5 ? -40 : W + 40), dir: Math.random() < 0.5 ? 1 : -1, sp: rand(8, 22), ph: rand(0, 6), sc: rand(0.75, 1.1), lean: rand(-0.25, 0.25) };
}

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = cv.clientWidth; H = cv.clientHeight;
  cv.width = W * DPR; cv.height = H * DPR;
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  buildSkyline();
}
window.addEventListener('resize', resize);

function drawWalker(w, groundY, t) {
  // 蹒跚的感染者剪影
  const s = 34 * w.sc;
  const step = Math.sin(t * 3 + w.ph);
  const jerk = Math.sin(t * 17 + w.ph) > 0.93 ? 0.3 : 0;
  g.save();
  g.translate(w.x, groundY);
  g.scale(w.dir, 1);
  g.rotate(w.lean + jerk * 0.5);
  g.fillStyle = '#030303';
  g.strokeStyle = '#030303';
  g.lineCap = 'round';
  g.lineWidth = s * 0.16;
  // 腿
  g.beginPath(); g.moveTo(0, -s * 1.1); g.lineTo(step * s * 0.25, 0); g.stroke();
  g.beginPath(); g.moveTo(0, -s * 1.1); g.lineTo(-step * s * 0.25, 0); g.stroke();
  // 躯干
  g.lineWidth = s * 0.3;
  g.beginPath(); g.moveTo(0, -s * 1.1); g.lineTo(s * 0.15, -s * 2); g.stroke();
  // 手臂下垂/前伸
  g.lineWidth = s * 0.12;
  g.beginPath(); g.moveTo(s * 0.15, -s * 1.9); g.lineTo(s * 0.55, -s * (1.45 + step * 0.08)); g.stroke();
  g.beginPath(); g.moveTo(s * 0.1, -s * 1.9); g.lineTo(s * 0.2, -s * 1.2); g.stroke();
  // 歪斜的头
  g.beginPath(); g.arc(s * 0.28, -s * 2.18, s * 0.17, 0, Math.PI * 2); g.fill();
  g.restore();
}

function drawMenu(t) {
  if (!menuRunning) return;
  requestAnimationFrame(drawMenu);
  const time = t / 1000;

  // 天空
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#05070a');
  sky.addColorStop(0.55, '#121418');
  sky.addColorStop(0.8, '#2a0e0d');
  sky.addColorStop(1, '#090606');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);

  // 远处城市火光
  const glow = g.createRadialGradient(W * 0.72, H * 0.78, 10, W * 0.72, H * 0.78, W * 0.55);
  glow.addColorStop(0, `rgba(170, 40, 20, ${0.35 + Math.sin(time * 0.7) * 0.06})`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);

  if (lightning > 0) { g.fillStyle = `rgba(180, 195, 220, ${lightning * 0.25})`; g.fillRect(0, 0, W, H); lightning -= 0.04; }
  else if (Math.random() < 0.0015) lightning = 1;

  // 山与塔（南山剪影）
  const groundY = H * 0.86;
  g.fillStyle = '#07080a';
  g.beginPath(); g.moveTo(W * 0.45, groundY);
  g.quadraticCurveTo(W * 0.66, H * 0.42, W * 0.9, groundY); g.fill();
  const tx = W * 0.665, ty = H * 0.53;
  g.fillRect(tx - 3, ty - H * 0.2, 6, H * 0.2);
  g.fillRect(tx - 14, ty - H * 0.17, 28, 16);
  g.fillRect(tx - 1, ty - H * 0.27, 2, H * 0.08);
  g.fillStyle = Math.sin(time * 3) > 0 ? '#ff2a2a' : '#4a0a0a';
  g.beginPath(); g.arc(tx, ty - H * 0.27, 2.4, 0, Math.PI * 2); g.fill();

  // 楼群
  skyline.forEach((list, layer) => {
    const shade = [14, 9, 5][layer];
    list.slice().forEach((b) => {
      const by = groundY - b.h - (2 - layer) * 4;
      g.fillStyle = `rgb(${shade},${shade},${shade + 2})`;
      g.fillRect(b.x, by, b.w, b.h + 40);
      b.wins.forEach((wn) => {
        let a = layer === 2 ? 0.9 : 0.55;
        if (wn.f && Math.random() < 0.08) a *= 0.2;
        g.fillStyle = wn.warm ? `rgba(230,170,90,${a * 0.6})` : `rgba(150,180,210,${a * 0.45})`;
        g.fillRect(b.x + 4 + wn.c * 12, by + 6 + wn.r * 16, 6, 8);
      });
      if (b.sign) {
        const on = Math.sin(time * 9 + b.x) > -0.85;
        g.font = 'bold 13px "Noto Sans KR", sans-serif';
        g.fillStyle = on ? 'rgba(255,60,60,.85)' : 'rgba(80,20,20,.6)';
        g.shadowColor = '#ff2020'; g.shadowBlur = on ? 12 : 0;
        g.fillText(b.sign.t, b.x + 6, by + 18);
        g.shadowBlur = 0;
      }
    });
  });

  // 烟雾
  for (let i = 0; i < 3; i++) {
    const sx = ((time * (8 + i * 4) + i * 400) % (W + 600)) - 300;
    const sm = g.createRadialGradient(sx, H * (0.55 + i * 0.07), 0, sx, H * (0.55 + i * 0.07), 320);
    sm.addColorStop(0, 'rgba(40,36,34,.25)'); sm.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sm; g.fillRect(0, 0, W, H);
  }

  // 地面
  g.fillStyle = '#040404'; g.fillRect(0, groundY, W, H - groundY);
  // 地面湿润反光
  const refl = g.createLinearGradient(0, groundY, 0, H);
  refl.addColorStop(0, 'rgba(160,40,30,.12)'); refl.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = refl; g.fillRect(0, groundY, W, H - groundY);

  // 行走的感染者
  walkers.forEach((w, i) => {
    w.x += w.dir * w.sp * 0.016;
    if (w.x < -80 || w.x > W + 80) walkers[i] = newWalker();
    drawWalker(w, groundY + 4, time);
  });

  // 雨
  g.strokeStyle = 'rgba(170,180,195,.22)'; g.lineWidth = 1;
  g.beginPath();
  rain.forEach((r) => {
    r.y += r.s; r.x -= r.s * 0.18;
    if (r.y > H) { r.y = rand(-50, 0); r.x = rand(0, W + 100); }
    g.moveTo(r.x, r.y); g.lineTo(r.x + r.l * 0.18, r.y - r.l);
  });
  g.stroke();

  // 红色警报灯扫过
  const sweep = (Math.sin(time * 1.4) + 1) / 2;
  g.fillStyle = `rgba(200,10,10,${0.05 * sweep})`;
  g.fillRect(0, 0, W, H);
}

/* ---------------- 菜单 UI ---------------- */
const tickerLines = [
  '[긴급재난문자] 서울 전역 외출 자제 바랍니다. 감염 의심자와 접촉하지 마십시오.',
  '[행정안전부] 항만 검역소 인근 지역 봉쇄. 시민 여러분은 실내에 머물러 주십시오.',
  '【紧急灾难短信】首尔全境请勿外出，切勿接触疑似感染者。',
  '[질병관리청] 물린 상처가 있는 사람은 즉시 격리하십시오.',
  '【安全通报】港口检疫所周边已封锁，请市民留在室内。',
];
$('ticker').textContent = tickerLines.join('　　　◆　　　');

function tickClock() {
  const d = new Date();
  $('menu-clock').textContent = `SEOUL ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} · KST`;
}
tickClock(); setInterval(tickClock, 15000);

$('btn-controls').addEventListener('click', () => { initAudio(); click(); $('controls-modal').classList.remove('hidden'); });
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => $('controls-modal').classList.add('hidden')));
$('controls-modal').addEventListener('click', (e) => { if (e.target.id === 'controls-modal') e.currentTarget.classList.add('hidden'); });

let stopMenuAmb = null;
// 首次交互后开启菜单环境音（浏览器要求用户手势）
window.addEventListener('pointerdown', function first() {
  if (!$('menu').classList.contains('active')) return;
  initAudio();
  if (!stopMenuAmb) stopMenuAmb = startAmbience(0.6);
  window.removeEventListener('pointerdown', first);
});

$('btn-start').addEventListener('click', async () => {
  initAudio();
  click();
  if (stopMenuAmb) { stopMenuAmb(); stopMenuAmb = null; }
  document.body.style.transition = 'opacity 1.2s';
  document.body.style.opacity = '0';
  await new Promise((r) => setTimeout(r, 1300));
  menuRunning = false;
  show('intro');
  document.body.style.opacity = '1';
  await playIntro();
  startGame();
});

/* ---------------- 进入游戏 ---------------- */
let gameApi = null;
async function startGame() {
  show('game');
  $('loading').classList.remove('hidden');
  try {
    const mod = await import('./game.js');
    gameApi = mod;
    mod.start({ onQuit: backToMenu });
  } catch (e) {
    console.error(e);
    $('loading').textContent = '3D 引擎加载失败，请检查网络后刷新页面（需要访问 cdn.jsdelivr.net）';
    return;
  }
  $('loading').classList.add('hidden');
}

function backToMenu() {
  if (gameApi) gameApi.stop();
  show('menu');
  menuRunning = true;
  requestAnimationFrame(drawMenu);
  initAudio();
  stopMenuAmb = startAmbience(0.6);
}

resize();
requestAnimationFrame(drawMenu);
