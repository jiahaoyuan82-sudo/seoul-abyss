import { initAudio, startAmbience, click, boom } from './audio.js';
import { playIntro } from './intro.js';
import { findImage } from './assets.js';

const $ = (id) => document.getElementById(id);

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(id).classList.add('active');
}

/* ---------------- 主菜单背景 ---------------- */
let stopBg3D = null;
let menuRunning = true;

async function setupMenuBackground() {
  const photo = await findImage('menu');
  if (photo) {
    // 有真实照片：使用照片 + 推镜
    const el = $('menu-photo');
    el.style.backgroundImage = `url("${photo}")`;
    requestAnimationFrame(() => el.classList.add('on'));
  } else {
    // 没有照片：实时渲染的 3D 首尔街道
    try {
      const mod = await import('./menu3d.js');
      if (!menuRunning) return;
      stopBg3D = mod.startMenu3D($('menu-3d'));
      $('menu-3d').classList.add('on');
    } catch (e) { console.warn('3D 菜单背景加载失败', e); }
  }
}

/* ---- 写实雨丝（细、快、低透明度）+ 偶尔的闪电 ---- */
const rc = $('menu-rain');
const rg = rc.getContext('2d');
let RW = 0, RH = 0, drops = [];
function resizeRain() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  RW = rc.clientWidth; RH = rc.clientHeight;
  rc.width = RW * dpr; rc.height = RH * dpr; rg.setTransform(dpr, 0, 0, dpr, 0, 0);
  drops = Array.from({ length: Math.floor(RW / 3) }, () => newDrop(true));
}
function newDrop(any) {
  const z = Math.random(); // 景深：近处的雨更粗更快更模糊
  return { x: Math.random() * (RW + 200) - 100, y: any ? Math.random() * RH : -40, z, len: 18 + z * 46, sp: 900 + z * 1500, a: 0.04 + z * 0.12, w: 0.5 + z * 1.1 };
}
window.addEventListener('resize', resizeRain);
let lastT = performance.now(), flash = 0, nextFlash = 6 + Math.random() * 12;
function drawRain(now) {
  if (!menuRunning) return;
  requestAnimationFrame(drawRain);
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  rg.clearRect(0, 0, RW, RH);
  for (const d of drops) {
    d.y += d.sp * dt; d.x -= d.sp * dt * 0.12;
    if (d.y > RH + 40) Object.assign(d, newDrop(false));
    rg.strokeStyle = `rgba(200,210,225,${d.a})`;
    rg.lineWidth = d.w;
    rg.beginPath(); rg.moveTo(d.x, d.y); rg.lineTo(d.x + d.len * 0.12, d.y - d.len); rg.stroke();
  }
  // 远处闪电：画面整体轻微泛白两下
  nextFlash -= dt;
  if (nextFlash <= 0) { flash = 1; nextFlash = 10 + Math.random() * 18; setTimeout(() => boom(0.25), 900 + Math.random() * 1500); }
  if (flash > 0) {
    flash -= dt * 2.2;
    const f = flash > 0.6 ? flash : flash > 0.45 ? 0.1 : flash * 0.8;
    $('menu-flash').style.opacity = Math.max(0, f * 0.5);
  }
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
window.addEventListener('pointerdown', function first() {
  if (!$('menu').classList.contains('active')) return;
  initAudio();
  if (!stopMenuAmb) stopMenuAmb = startAmbience(0.6);
  window.removeEventListener('pointerdown', first);
});

// 让浏览器提前加载语音列表
if (window.speechSynthesis) speechSynthesis.getVoices();

function stopMenu() {
  menuRunning = false;
  if (stopBg3D) { stopBg3D(); stopBg3D = null; }
  $('menu-3d').classList.remove('on');
}

$('btn-start').addEventListener('click', async () => {
  initAudio();
  click();
  if (stopMenuAmb) { stopMenuAmb(); stopMenuAmb = null; }
  document.body.style.transition = 'opacity 1.4s';
  document.body.style.opacity = '0';
  await new Promise((r) => setTimeout(r, 1500));
  stopMenu();
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
  // 回到主菜单时重新载入页面，释放游戏占用的显存
  location.reload();
}

resizeRain();
requestAnimationFrame(drawRain);
setupMenuBackground();
