// 开场剧情：韩语配音（浏览器语音合成 ko-KR） + 中文字幕（上）+ 韩语字幕（下，小号）
import { startAmbience, siren, boom, heartbeat, growl } from './audio.js';
import { findImage, findAudio } from './assets.js';

// 素材（可选）：intro1.jpg ~ intro7.jpg 为每段剧情画面，voice1.mp3 ~ voice7.mp3 为每段韩语女声配音
// 没有图片时使用程序绘制的画面；没有配音文件时使用浏览器的韩语女声朗读

const LINES = [
  { scene: 'city',    cap: 'SEOUL · 2026',
    kr: '2026년 가을, 대한민국 서울.',
    cn: '2026年秋，大韩民国，首尔。' },
  { scene: 'port',    cap: 'PORT · 03:12 AM',
    kr: '어느 항구에, 정체를 알 수 없는 심해 생물들이 수입되었다.',
    cn: '某个港口，进口了一批来历不明的深海生物。' },
  { scene: 'lab',     cap: 'RESEARCH INSTITUTE',
    kr: '그 생물들의 몸속에는 미지의 바이러스가 있었고, 한 연구소가 연구를 위해 들여온 것이었다.',
    cn: '这些生物体内携带着未知的病毒，是某研究所为了研究而引进的。' },
  { scene: 'inspect', cap: 'QUARANTINE INSPECTION',
    kr: '그러나 방역 요원들이 검사를 하던 중, 바이러스는 자신도 모르는 사이에 유출되고 말았다.',
    cn: '然而，就在防疫人员进行检查时，病毒在不经意之间泄露了出去。' },
  { scene: 'blood',   cap: 'CONTAMINATION',
    kr: '많은 직원들이 실수로 그 생물의 피를 머리에 뒤집어썼고, 결국 감염되고 말았다.',
    cn: '许多工作人员不慎让生物的血液接触到了头部，最终被感染。' },
  { scene: 'spread',  cap: 'OUTBREAK · 48 HOURS LATER',
    kr: '감염은 순식간에 도시 전체로 퍼져 나갔다.',
    cn: '感染在转眼之间，蔓延到了整座城市。' },
  { scene: 'room',    cap: 'YUAN JIAHAO · 대학생',
    kr: '그리고 나, 서울의 평범한 대학생 위안자하오. 살아남아야 한다.',
    cn: '而我——首尔一名普通的大学生，Yuan Jiahao。我必须活下去。' },
];

const $ = (id) => document.getElementById(id);
let skip = false;

// 选择流畅自然的韩语女声：优先神经网络语音（Edge 的 SunHi Natural、Chrome 的 Google 한국의 等）
const FEMALE = /SunHi|Sun-Hi|Yuna|Heami|Jimin|Seoyeon|Yuri|Sora|Jieun|Google 한국의|Google Korean|female|여성|여자/i;
const MALE = /InJoon|Hyunsu|BongJin|GookMin|Minsu|male|남성|남자/i;
function pickKoreanVoice() {
  const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  const ko = vs.filter((v) => /^ko/i.test(v.lang) || /Korean|한국/.test(v.name));
  const score = (v) => {
    let s = 0;
    if (/Natural|Neural|Online/i.test(v.name)) s += 10;   // 神经网络语音最流畅
    if (/Google/i.test(v.name)) s += 6;
    if (FEMALE.test(v.name)) s += 8;
    if (MALE.test(v.name) && !/female/i.test(v.name)) s -= 20;
    return s;
  };
  return ko.sort((a, b) => score(b) - score(a))[0] || null;
}

function waitVoices() {
  return new Promise((res) => {
    if (!window.speechSynthesis) return res();
    if (speechSynthesis.getVoices().length) return res();
    const t = setTimeout(res, 2000);
    speechSynthesis.onvoiceschanged = () => { clearTimeout(t); res(); };
  });
}

function speakTTS(text) {
  return new Promise((res) => {
    if (!window.speechSynthesis) return res(false);
    speechSynthesis.cancel();
    const voice = pickKoreanVoice();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    if (voice) u.voice = voice;
    u.rate = 0.92;   // 接近自然语速，避免一字一顿
    u.pitch = 1.0;   // 不压低音调，保持女声自然音色
    u.volume = 1;
    let done = false;
    const finish = (ok) => { if (!done) { done = true; clearInterval(keep); res(ok); } };
    u.onend = () => finish(true);
    u.onerror = () => finish(false);
    // Chrome 长句朗读中途卡住的问题：定时 resume
    const keep = setInterval(() => { if (speechSynthesis.speaking) speechSynthesis.resume(); }, 5000);
    setTimeout(() => finish(false), 5000 + text.length * 250);
    speechSynthesis.speak(u);
  });
}

let currentAudio = null;
function playVoiceFile(src) {
  return new Promise((res) => {
    const a = new Audio(src);
    currentAudio = a;
    a.volume = 1;
    let done = false;
    const finish = (ok) => { if (!done) { done = true; currentAudio = null; res(ok); } };
    a.onended = () => finish(true);
    a.onerror = () => finish(false);
    a.play().catch(() => finish(false));
  });
}

async function speak(text, file) {
  if (file && await playVoiceFile(file)) return true;
  return speakTTS(text);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sleepSkippable = async (ms) => { const end = performance.now() + ms; while (!skip && performance.now() < end) await sleep(50); };

/* ---------------- 画面绘制 ---------------- */
let cv, g, W, H, scene = 'black', sceneStart = 0, running = false;
const bubbles = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 3 + 1, s: Math.random() * 0.3 + 0.1 }));
const dots = [];
const drips = Array.from({ length: 26 }, () => ({ x: Math.random(), l: 0, s: Math.random() * 0.5 + 0.2, w: Math.random() * 18 + 4, d: Math.random() * 1.5 }));

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  W = cv.clientWidth; H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function rain(alpha = 0.18, n = 220) {
  g.strokeStyle = `rgba(180,190,205,${alpha})`; g.lineWidth = 1; g.beginPath();
  const t = performance.now() / 1000;
  for (let i = 0; i < n; i++) {
    const x = ((i * 97.3 + t * 60) % (W + 100)) - 50;
    const y = ((i * 53.7 + t * 900 * (0.7 + (i % 5) * 0.08)) % (H + 60)) - 30;
    g.moveTo(x, y); g.lineTo(x + 3, y - 18);
  }
  g.stroke();
}

function draw() {
  if (!running) return;
  requestAnimationFrame(draw);
  const t = (performance.now() - sceneStart) / 1000;
  const T = performance.now() / 1000;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const fadeIn = Math.min(1, t / 1.6);
  g.globalAlpha = fadeIn;

  switch (scene) {
    case 'city': {
      // 俯瞰夜景，缓慢推镜
      const z = 1 + t * 0.02;
      g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2);
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#04060a'); sky.addColorStop(1, '#141820');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 900; i++) {
        const x = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * W;
        const y = H * 0.45 + ((Math.sin(i * 78.233) * 12345.678 % 1 + 1) % 1) * H * 0.55;
        const a = 0.3 + 0.5 * Math.abs(Math.sin(i + T * 0.5));
        g.fillStyle = i % 7 === 0 ? `rgba(255,120,80,${a})` : `rgba(255,210,150,${a * 0.6})`;
        g.fillRect(x, y, 1.6, 1.6);
      }
      // 汉江
      g.strokeStyle = 'rgba(30,40,60,.9)'; g.lineWidth = H * 0.05;
      g.beginPath(); g.moveTo(-50, H * 0.7); g.bezierCurveTo(W * 0.3, H * 0.6, W * 0.6, H * 0.85, W + 50, H * 0.72); g.stroke();
      g.restore();
      rain(0.1, 120);
      break;
    }
    case 'port': {
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#05080b'); sky.addColorStop(1, '#0e151b');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      const sea = H * 0.68;
      // 起重机
      g.fillStyle = '#020304';
      for (let k = 0; k < 3; k++) {
        const cx = W * (0.15 + k * 0.3);
        g.fillRect(cx, sea - H * 0.45, 10, H * 0.45);
        g.fillRect(cx - 60, sea - H * 0.45, 220, 10);
        g.fillRect(cx + 120, sea - H * 0.45, 2, H * 0.12 + Math.sin(T + k) * 6);
        g.fillStyle = Math.sin(T * 4 + k) > 0 ? '#ff2a1a' : '#300';
        g.beginPath(); g.arc(cx + 4, sea - H * 0.46, 3, 0, 7); g.fill();
        g.fillStyle = '#020304';
      }
      // 集装箱
      const cols = ['#2a0f0c', '#0c1a24', '#1d1d12', '#13110f'];
      for (let i = 0; i < 28; i++) {
        g.fillStyle = cols[i % 4];
        g.fillRect((i % 14) * 70 + W * 0.02, sea - 30 - Math.floor(i / 14) * 30, 66, 28);
      }
      // 货船
      g.fillStyle = '#030405';
      g.beginPath(); g.moveTo(W * 0.48, sea); g.lineTo(W * 1.05, sea); g.lineTo(W * 1.02, sea + 40); g.lineTo(W * 0.52, sea + 40); g.fill();
      g.fillRect(W * 0.88, sea - 80, 70, 80);
      // 海面
      g.fillStyle = '#04070a'; g.fillRect(0, sea + 40, W, H - sea);
      g.strokeStyle = 'rgba(120,150,170,.12)';
      for (let y = sea + 50; y < H; y += 9) {
        g.beginPath();
        for (let x = 0; x < W; x += 20) g.lineTo(x, y + Math.sin(x * 0.02 + T * 1.5 + y) * 2);
        g.stroke();
      }
      // 探照灯
      const ang = Math.sin(T * 0.4) * 0.5;
      g.save(); g.translate(W * 0.9, sea - 80); g.rotate(Math.PI + 0.5 + ang);
      const beam = g.createLinearGradient(0, 0, W * 0.8, 0); beam.addColorStop(0, 'rgba(220,230,255,.25)'); beam.addColorStop(1, 'rgba(220,230,255,0)');
      g.fillStyle = beam; g.beginPath(); g.moveTo(0, 0); g.lineTo(W * 0.8, -60); g.lineTo(W * 0.8, 60); g.fill();
      g.restore();
      rain(0.16);
      break;
    }
    case 'lab': {
      g.fillStyle = '#020608'; g.fillRect(0, 0, W, H);
      // 水槽
      const tw = Math.min(W * 0.36, 420), th = H * 0.62, tx = W / 2 - tw / 2, ty = H * 0.18;
      const water = g.createLinearGradient(0, ty, 0, ty + th);
      water.addColorStop(0, 'rgba(20,90,110,.55)'); water.addColorStop(1, 'rgba(5,25,35,.9)');
      g.fillStyle = water; g.fillRect(tx, ty, tw, th);
      // 深海生物剪影（触手）
      g.save(); g.translate(W / 2, ty + th * 0.45);
      const pulse = 1 + Math.sin(T * 1.2) * 0.05;
      g.scale(pulse, pulse);
      g.fillStyle = '#01080b';
      g.beginPath(); g.ellipse(0, 0, tw * 0.22, tw * 0.15, 0, 0, 7); g.fill();
      g.strokeStyle = '#01080b'; g.lineCap = 'round';
      for (let k = 0; k < 9; k++) {
        g.lineWidth = 9 - k * 0.5;
        g.beginPath(); g.moveTo((k - 4) * tw * 0.04, tw * 0.1);
        for (let s = 1; s < 12; s++) g.lineTo((k - 4) * tw * 0.04 + Math.sin(T * 1.4 + s * 0.6 + k) * s * 2.6, tw * 0.1 + s * th * 0.035);
        g.stroke();
      }
      // 生物发光点
      for (let k = 0; k < 14; k++) {
        const a = 0.4 + 0.6 * Math.abs(Math.sin(T * 2 + k));
        g.fillStyle = `rgba(80,255,220,${a})`;
        g.beginPath(); g.arc(Math.cos(k) * tw * 0.16, Math.sin(k * 1.7) * tw * 0.09, 2.2, 0, 7); g.fill();
      }
      g.restore();
      // 气泡
      bubbles.forEach((b) => {
        b.y -= b.s * 0.004; if (b.y < 0) b.y = 1;
        g.strokeStyle = 'rgba(160,240,255,.35)';
        g.beginPath(); g.arc(tx + b.x * tw, ty + b.y * th, b.r, 0, 7); g.stroke();
      });
      g.strokeStyle = 'rgba(160,220,230,.35)'; g.lineWidth = 3; g.strokeRect(tx, ty, tw, th);
      // 标签
      g.font = '12px "Oswald", sans-serif'; g.fillStyle = 'rgba(160,220,230,.6)';
      g.fillText('SPECIMEN DSV-07 · BIOHAZARD LV.4', tx, ty + th + 22);
      const glow = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
      glow.addColorStop(0, 'rgba(30,140,150,.15)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
      break;
    }
    case 'inspect': {
      const alarm = (Math.sin(T * 5) + 1) / 2;
      g.fillStyle = `rgb(${10 + alarm * 40},4,4)`; g.fillRect(0, 0, W, H);
      // 防护服人员剪影
      for (let k = 0; k < 4; k++) {
        const x = W * (0.2 + k * 0.2) + Math.sin(T * 0.5 + k) * 6;
        const y = H * 0.82;
        g.fillStyle = '#060202';
        g.beginPath(); g.ellipse(x, y - 150, 34, 40, 0, 0, 7); g.fill(); // 头盔
        g.fillRect(x - 46, y - 115, 92, 115);
        g.fillStyle = `rgba(120,200,230,${0.25 + alarm * 0.2})`;
        g.fillRect(x - 20, y - 160, 40, 16); // 面罩反光
      }
      // 裂开的玻璃
      g.strokeStyle = `rgba(255,220,220,${0.15 + Math.min(1, t / 3) * 0.4})`; g.lineWidth = 1.2;
      const cx = W * 0.55, cy = H * 0.4;
      for (let k = 0; k < 14; k++) {
        g.beginPath(); g.moveTo(cx, cy);
        let x = cx, y = cy; const a = k / 14 * Math.PI * 2;
        for (let s = 0; s < 5; s++) { x += Math.cos(a + Math.sin(s * k) * 0.3) * 40 * Math.min(1, t / 2); y += Math.sin(a + Math.cos(s + k) * 0.3) * 40 * Math.min(1, t / 2); g.lineTo(x, y); }
        g.stroke();
      }
      g.font = 'bold 15px "Noto Sans KR", sans-serif';
      g.fillStyle = `rgba(255,60,60,${alarm})`;
      g.fillText('⚠ 경고: 격리 구역 오염 · CONTAINMENT BREACH', W * 0.06, H * 0.2);
      break;
    }
    case 'blood': {
      g.fillStyle = '#070202'; g.fillRect(0, 0, W, H);
      // 抱头的人影
      const sway = Math.sin(T * 6) * (t > 2 ? 4 : 1);
      g.save(); g.translate(W / 2 + sway, H * 0.85);
      g.fillStyle = '#000';
      g.beginPath(); g.ellipse(0, -260, 50, 60, 0, 0, 7); g.fill();
      g.fillRect(-90, -200, 180, 200);
      g.lineWidth = 34; g.lineCap = 'round'; g.strokeStyle = '#000';
      g.beginPath(); g.moveTo(-80, -180); g.lineTo(-70, -300); g.stroke();
      g.beginPath(); g.moveTo(80, -180); g.lineTo(70, -300); g.stroke();
      g.restore();
      // 血滴流下
      drips.forEach((d) => {
        if (t > d.d) d.l = Math.min(H * 1.1, d.l + d.s * 6);
        const x = d.x * W;
        const grad = g.createLinearGradient(0, 0, 0, d.l);
        grad.addColorStop(0, 'rgba(120,0,0,.95)'); grad.addColorStop(1, 'rgba(70,0,0,.9)');
        g.fillStyle = grad;
        g.fillRect(x - d.w / 2, 0, d.w, d.l);
        g.beginPath(); g.arc(x, d.l, d.w / 2, 0, 7); g.fill();
      });
      g.fillStyle = `rgba(160,0,0,${0.1 + Math.abs(Math.sin(T * 1.5)) * 0.15})`; g.fillRect(0, 0, W, H);
      break;
    }
    case 'spread': {
      g.fillStyle = '#05070a'; g.fillRect(0, 0, W, H);
      // 简化首尔地图 + 汉江
      g.strokeStyle = 'rgba(80,110,140,.5)'; g.lineWidth = 14;
      g.beginPath(); g.moveTo(0, H * 0.55); g.bezierCurveTo(W * 0.25, H * 0.42, W * 0.5, H * 0.7, W * 0.75, H * 0.5); g.lineTo(W, H * 0.48); g.stroke();
      g.strokeStyle = 'rgba(80,100,120,.12)'; g.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      // 感染扩散
      if (dots.length < 1400) for (let k = 0; k < 14; k++) {
        const src = dots.length ? dots[Math.floor(Math.random() * dots.length)] : { x: W * 0.12, y: H * 0.62 };
        dots.push({ x: src.x + (Math.random() - 0.4) * 30, y: src.y + (Math.random() - 0.5) * 30, b: T });
      }
      dots.forEach((d) => {
        const age = T - d.b;
        g.fillStyle = `rgba(230,20,20,${Math.min(0.85, age)})`;
        g.fillRect(d.x, d.y, 3, 3);
      });
      g.font = '13px "Oswald", sans-serif'; g.fillStyle = 'rgba(255,90,90,.85)';
      g.fillText(`INFECTED: ${Math.floor(dots.length * 731).toLocaleString()}`, W * 0.06, H * 0.2);
      break;
    }
    case 'room': {
      // 出租屋窗边，窗外是燃烧的城市，手机亮着
      g.fillStyle = '#030303'; g.fillRect(0, 0, W, H);
      const wx = W * 0.25, wy = H * 0.18, ww = W * 0.5, wh = H * 0.5;
      const out = g.createLinearGradient(0, wy, 0, wy + wh);
      out.addColorStop(0, '#0a0b10'); out.addColorStop(1, `rgba(${140 + Math.sin(T * 3) * 20},40,20,1)`);
      g.fillStyle = out; g.fillRect(wx, wy, ww, wh);
      g.fillStyle = '#050505';
      for (let i = 0; i < 12; i++) { const bw = ww / 12; g.fillRect(wx + i * bw, wy + wh - ((i * 37) % 5 + 2) * wh * 0.1, bw - 3, wh); }
      g.fillStyle = '#000'; g.fillRect(wx + ww / 2 - 4, wy, 8, wh); g.fillRect(wx, wy + wh / 2 - 4, ww, 8);
      g.strokeStyle = '#000'; g.lineWidth = 16; g.strokeRect(wx, wy, ww, wh);
      // 窗上雨痕
      g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip(); rain(0.25, 160); g.restore();
      // 人物剪影
      g.fillStyle = '#000';
      g.beginPath(); g.ellipse(W * 0.52, H * 0.62, 46, 56, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(W * 0.52 - 130, H); g.quadraticCurveTo(W * 0.52, H * 0.62, W * 0.52 + 130, H); g.fill();
      // 手机光
      const ph = g.createRadialGradient(W * 0.6, H * 0.88, 0, W * 0.6, H * 0.88, 220);
      ph.addColorStop(0, 'rgba(160,190,255,.35)'); ph.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = ph; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(200,220,255,.9)'; g.fillRect(W * 0.585, H * 0.84, 34, 60);
      break;
    }
    case 'title': {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      g.textAlign = 'center';
      g.font = `900 ${Math.min(90, W * 0.08)}px "Noto Sans KR", sans-serif`;
      g.fillStyle = `rgba(233,228,216,${Math.min(1, t / 1.5)})`;
      g.fillText('살아남아라', W / 2, H / 2);
      g.font = '300 18px "Noto Sans SC", sans-serif';
      g.fillStyle = `rgba(196,22,28,${Math.min(1, t / 2)})`;
      g.fillText('活 下 去', W / 2, H / 2 + 48);
      g.textAlign = 'start';
      break;
    }
  }
  g.globalAlpha = 1;
}

function setScene(s) { scene = s; sceneStart = performance.now(); }

// 真实图片帧：两层交替淡入淡出 + 随机推镜方向
let frameFlip = false;
function showFrame(src) {
  const a = $('frame-a'), b = $('frame-b');
  const next = frameFlip ? a : b, prev = frameFlip ? b : a;
  frameFlip = !frameFlip;
  prev.className = prev.className.replace(/\bon\b/, '').trim();
  setTimeout(() => {
    next.style.backgroundImage = `url("${src}")`;
    next.className = `frame on kb${1 + Math.floor(Math.random() * 4)}`;
  }, 900); // 先暗下去，再亮起下一帧
}
function hideFrames() { ['frame-a', 'frame-b'].forEach((id) => { $(id).className = 'frame'; }); }

/* ---------------- 播放流程 ---------------- */
export async function playIntro() {
  skip = false;
  cv = $('intro-bg'); g = cv.getContext('2d');
  resize(); window.addEventListener('resize', resize);
  running = true; setScene('black'); draw();

  const subtitle = $('subtitle'), subCn = $('sub-cn'), subKr = $('sub-kr'), cap = $('intro-caption');
  const onSkip = () => { skip = true; if (window.speechSynthesis) speechSynthesis.cancel(); if (currentAudio) currentAudio.pause(); };
  $('btn-skip').onclick = onSkip;
  const keySkip = (e) => { if (e.key === 'Escape' || e.key === 'Enter') onSkip(); };
  window.addEventListener('keydown', keySkip);

  const stopAmb = startAmbience(0.8);
  // 预先检测所有剧情图片和配音文件
  const [frames, voices] = await Promise.all([
    Promise.all(LINES.map((_, i) => findImage(`intro${i + 1}`))),
    Promise.all(LINES.map((_, i) => findAudio(`voice${i + 1}`))),
    waitVoices(),
  ]);
  await sleepSkippable(800);

  for (let i = 0; i < LINES.length && !skip; i++) {
    const L = LINES[i];
    if (frames[i]) { setScene('black'); cv.style.opacity = 0; showFrame(frames[i]); }
    else { hideFrames(); cv.style.opacity = 1; setScene(L.scene); }
    cap.textContent = L.cap; cap.classList.add('show');
    if (L.scene === 'port') siren(10, 0.03);
    if (L.scene === 'inspect') { siren(8, 0.07); boom(0.4); }
    if (L.scene === 'blood') { growl(-0.3, 2, 1.3); setTimeout(() => growl(0.4, 3, 1.2), 1600); }
    if (L.scene === 'spread') boom(0.5);
    if (L.scene === 'room') { heartbeat(0.3); setTimeout(() => heartbeat(0.3), 900); }

    await sleepSkippable(700);
    subCn.textContent = L.cn; subKr.textContent = L.kr;
    subtitle.classList.add('show');

    const minTime = 2200 + L.kr.length * 120;
    const t0 = performance.now();
    await speak(L.kr, voices[i]);
    const rest = minTime - (performance.now() - t0);
    if (rest > 0) await sleepSkippable(rest);
    await sleepSkippable(900);
    subtitle.classList.remove('show');
    cap.classList.remove('show');
    await sleepSkippable(600);
  }

  if (!skip) {
    hideFrames(); cv.style.opacity = 1;
    setScene('title'); boom(0.7);
    await sleepSkippable(3200);
  }

  if (window.speechSynthesis) speechSynthesis.cancel();
  if (currentAudio) currentAudio.pause();
  hideFrames();
  stopAmb();
  window.removeEventListener('keydown', keySkip);
  window.removeEventListener('resize', resize);
  subtitle.classList.remove('show'); cap.classList.remove('show');
  running = false;
}
