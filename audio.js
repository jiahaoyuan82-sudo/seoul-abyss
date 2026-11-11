// 程序化音效：无需任何音频文件，全部用 Web Audio API 实时合成
let ctx = null;
let master = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  } catch (e) { ctx = null; }
  return ctx;
}

function noiseBuffer(seconds = 2, brown = false) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return buf;
}

// 雨声 + 低频压迫感环境音
export function startAmbience(level = 1) {
  if (!ctx) return () => {};
  const out = ctx.createGain();
  out.gain.value = 0;
  out.connect(master);
  out.gain.linearRampToValueAtTime(0.55 * level, ctx.currentTime + 3);

  const rain = ctx.createBufferSource();
  rain.buffer = noiseBuffer(3);
  rain.loop = true;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
  const rg = ctx.createGain(); rg.gain.value = 0.16;
  rain.connect(hp).connect(lp).connect(rg).connect(out);
  rain.start();

  const rumble = ctx.createBufferSource();
  rumble.buffer = noiseBuffer(4, true);
  rumble.loop = true;
  const rlp = ctx.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 140;
  const rmg = ctx.createGain(); rmg.gain.value = 0.5;
  rumble.connect(rlp).connect(rmg).connect(out);
  rumble.start();

  const oscs = [];
  [43.6, 58.3, 87.1].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = i === 2 ? 'triangle' : 'sawtooth';
    o.frequency.value = f;
    const g = ctx.createGain(); g.gain.value = 0.025;
    const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 220;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.03;
    const lg = ctx.createGain(); lg.gain.value = 0.018;
    lfo.connect(lg).connect(g.gain);
    o.connect(f2).connect(g).connect(out);
    o.start(); lfo.start();
    oscs.push(o, lfo);
  });

  return () => {
    const t = ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.linearRampToValueAtTime(0, t + 1.5);
    setTimeout(() => { try { rain.stop(); rumble.stop(); oscs.forEach(o => o.stop()); out.disconnect(); } catch (e) {} }, 1700);
  };
}

// 警报（开场剧情用）
export function siren(duration = 6, vol = 0.05) {
  if (!ctx) return;
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  const g = ctx.createGain(); g.gain.value = 0;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2;
  const t = ctx.currentTime;
  for (let i = 0; i < duration; i += 1.6) {
    o.frequency.setValueAtTime(520, t + i);
    o.frequency.linearRampToValueAtTime(880, t + i + 0.8);
    o.frequency.linearRampToValueAtTime(520, t + i + 1.6);
  }
  g.gain.linearRampToValueAtTime(vol, t + 1);
  g.gain.setValueAtTime(vol, t + duration - 1);
  g.gain.linearRampToValueAtTime(0, t + duration);
  o.connect(f).connect(g).connect(master);
  o.start(t); o.stop(t + duration + 0.1);
}

// 低沉的冲击音（剧情转场）
export function boom(vol = 0.6) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(28, t + 2.2);
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
  o.connect(g).connect(master); o.start(t); o.stop(t + 2.7);
  const n = ctx.createBufferSource(); n.buffer = noiseBuffer(1, true);
  const ng = ctx.createGain(); ng.gain.setValueAtTime(vol * 0.8, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 1);
  n.connect(ng).connect(master); n.start(t);
}

// 丧尸嘶吼：带空间定位（pan: -1~1, dist: 距离）
export function growl(pan = 0, dist = 5, intensity = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const vol = Math.min(0.5, (0.9 * intensity) / (1 + dist * 0.35));
  if (vol < 0.01) return;
  const dur = 0.6 + Math.random() * 0.9;
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  const base = 70 + Math.random() * 60;
  o.frequency.setValueAtTime(base * 1.4, t);
  o.frequency.linearRampToValueAtTime(base, t + dur);
  const lfo = ctx.createOscillator(); lfo.frequency.value = 18 + Math.random() * 20;
  const lg = ctx.createGain(); lg.gain.value = base * 0.3;
  lfo.connect(lg).connect(o.frequency);
  const n = ctx.createBufferSource(); n.buffer = noiseBuffer(dur + 0.2);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600 + Math.random() * 500; bp.Q.value = 3;
  const ng = ctx.createGain(); ng.gain.value = 0.7;
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 4); }
  shaper.curve = curve;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.08);
  g.gain.linearRampToValueAtTime(vol * 0.6, t + dur * 0.7);
  g.gain.linearRampToValueAtTime(0, t + dur);
  const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 2400 / (1 + dist * 0.08);
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  o.connect(shaper); n.connect(bp).connect(ng).connect(shaper);
  shaper.connect(lpf).connect(g);
  if (p) { p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p).connect(master); } else g.connect(master);
  o.start(t); lfo.start(t); n.start(t);
  o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05); n.stop(t + dur + 0.05);
}

// 脚步声
export function footstep(vol = 0.12, wet = true) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.2);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = wet ? 1400 + Math.random() * 600 : 300; f.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  n.connect(f).connect(g).connect(master); n.start(t);
  const o = ctx.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.08);
  const og = ctx.createGain(); og.gain.setValueAtTime(vol * 1.2, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  o.connect(og).connect(master); o.start(t); o.stop(t + 0.12);
}

// 心跳
export function heartbeat(vol = 0.3) {
  if (!ctx) return;
  [0, 0.18].forEach((d, i) => {
    const t = ctx.currentTime + d;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.15);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol * (i ? 0.7 : 1), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.22);
  });
}

// 拾取物品
export function pickup() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.3);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 0.8;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  n.connect(f).connect(g).connect(master); n.start(t);
}

// 手电筒开关
export function click() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 2400;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.04);
}

// 被攻击
export function hurt() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.5, true);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  n.connect(g).connect(master); n.start(t);
  growl(0, 0.5, 1.4);
}

// 惊吓音（发现玩家时）
export function stinger() {
  if (!ctx) return;
  const t = ctx.currentTime;
  [233, 247, 311, 466].forEach((fq) => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fq;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(300, t + 1.2);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + 1.5);
  });
}

export function getCtx() { return ctx; }
