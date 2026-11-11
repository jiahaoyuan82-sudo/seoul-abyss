// 素材检测：图片和配音文件都是可选的，放进仓库根目录就会自动使用

// 依次尝试 jpg / png / webp，返回能加载的图片地址
export function findImage(base) {
  const exts = ['jpg', 'png', 'webp', 'jpeg'];
  return new Promise((resolve) => {
    let i = 0;
    const next = () => {
      if (i >= exts.length) return resolve(null);
      const src = `${base}.${exts[i++]}`;
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = next;
      img.src = src;
    };
    next();
  });
}


// 检测配音文件是否存在（mp3 / m4a / wav / ogg）
export function findAudio(base) {
  const exts = ['mp3', 'm4a', 'wav', 'ogg'];
  return new Promise((resolve) => {
    let i = 0;
    const next = () => {
      if (i >= exts.length) return resolve(null);
      const src = `${base}.${exts[i++]}`;
      const a = new Audio();
      let done = false;
      const ok = () => { if (!done) { done = true; resolve(src); } };
      const bad = () => { if (!done) { done = true; next(); } };
      a.addEventListener('canplaythrough', ok, { once: true });
      a.addEventListener('loadedmetadata', ok, { once: true });
      a.addEventListener('error', bad, { once: true });
      setTimeout(bad, 2500);
      a.preload = 'auto';
      a.src = src;
    };
    next();
  });
}
