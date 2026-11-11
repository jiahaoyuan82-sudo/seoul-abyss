// 主菜单备用背景（未放入 menu.jpg 时）：实时渲染的首尔雨夜街道，镜头缓慢推进，远处丧尸游荡
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { Zombie } from './zombie.js';

export function startMenu3D(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c10);
  scene.fog = new THREE.FogExp2(0x0b0d11, 0.034);
  scene.add(new THREE.HemisphereLight(0x34405a, 0x0a0806, 0.6));
  const moon = new THREE.DirectionalLight(0x8094b8, 0.4); moon.position.set(-20, 40, 10); scene.add(moon);

  const camera = new THREE.PerspectiveCamera(50, host.clientWidth / host.clientHeight, 0.1, 160);
  const world = buildWorld(scene);

  // 远处游荡的感染者
  const zombies = [];
  [[2, 36], [-3, 30], [1, 24], [-1.5, 18], [3.5, 14], [-4, 6], [0.5, -4], [6, 40]].forEach(([x, z], i) => {
    zombies.push(new Zombie(scene, new THREE.Vector3(x, 0, z), 'walker', { feeding: i === 7 }));
  });
  const ctx = {
    player: new THREE.Vector3(9999, 0, 9999), playerNoise: 0, flashOn: false, crouch: false,
    colliders: world.colliders, zombies, los: () => false, flashDot: () => 0,
    onSpot() {}, onAttack() {}, onGrowl() {},
  };

  const onResize = () => {
    renderer.setSize(host.clientWidth, host.clientHeight);
    camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', onResize);

  const clock = new THREE.Clock();
  let t = 0, raf = 0, running = true;
  const look = new THREE.Vector3();
  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta());
    t += dt;
    // 90 秒一个来回的缓慢推镜（手持感的轻微晃动）
    const k = (1 - Math.cos((t / 90) * Math.PI * 2)) / 2;
    camera.position.set(2.2 - k * 3 + Math.sin(t * 0.31) * 0.08, 4.2 - k * 1.6 + Math.sin(t * 0.47) * 0.05, 62 - k * 30);
    look.set(-0.5 + Math.sin(t * 0.07) * 1.5, 2.0, camera.position.z - 30);
    camera.lookAt(look);
    world.update(dt, camera.position);
    zombies.forEach((z) => z.update(dt, ctx));
    renderer.render(scene, camera);
  }
  loop();

  return function stop() {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    renderer.dispose();
    if (renderer.forceContextLoss) renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}
