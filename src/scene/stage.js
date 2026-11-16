// Renderer, ánh sáng, camera isometric (Orthographic) tự khớp khung dọc/ngang.
import * as THREE from 'three';
import { CONFIG } from '../config.js';

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3ead9);

  // ----- Ánh sáng mềm, ấm -----
  const hemi = new THREE.HemisphereLight(0xfff8ee, 0xd8c3a0, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.9);
  sun.position.set(3.5, 8, 4.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 25;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 4;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xe6f0ff, 0.45);
  fill.position.set(-4, 5, 6);
  scene.add(fill);
  const lights = { hemi, sun, fill, base: { hemi: hemi.intensity, sun: sun.intensity, fill: fill.intensity } };

  // ----- Camera -----
  // Khung ngang: nhìn chéo isometric. Khung dọc: nhìn chính diện hơn để quán "cao" ra, nhân vật to hơn.
  const VIEWS = {
    landscape: { dir: new THREE.Vector3(1, 1.25, 1.35).normalize(), center: new THREE.Vector3(-0.55, 0.35, 0.05),
      box: [[-4.1, 3.0], [0, 1.35], [-3.6, 3.6]] },
    // Khung dọc (TikTok): phía trên/dưới vốn bị giao diện TikTok che, nên ưu tiên phóng to 20 máy,
    // chấp nhận cắt bớt tường hai bên.
    portrait: { dir: new THREE.Vector3(0.62, 1.55, 1.25).normalize(), center: new THREE.Vector3(-0.55, 0.3, -0.75),
      box: [[-2.95, 2.45], [0, 0.6], [-3.0, 2.85]] },
  };
  const camDir = new THREE.Vector3();
  const center = new THREE.Vector3();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const look = new THREE.Vector3();
  let W = 1, H = 1, portrait = false;

  function fit() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    const aspect = W / H;
    portrait = aspect < 0.85;
    document.body.classList.toggle('portrait', portrait);
    const view = portrait ? VIEWS.portrait : VIEWS.landscape;
    camDir.copy(view.dir);
    center.copy(view.center);
    look.copy(center);
    camera.zoom = portrait ? CONFIG.camera.portraitBaseZoom : 1;
    camera.position.copy(center).addScaledVector(camDir, 30);
    camera.lookAt(center);
    camera.updateMatrixWorld();
    const inv = camera.matrixWorldInverse;
    let mx = 0, my = 0;
    const v = new THREE.Vector3();
    const [xs, ys, zs] = view.box;
    for (const x of xs) for (const y of ys) for (const z of zs) {
      v.set(x, y, z).applyMatrix4(inv);
      mx = Math.max(mx, Math.abs(v.x)); my = Math.max(my, Math.abs(v.y));
    }
    mx += 0.1; my += 0.1;
    // Vùng đặt quán trên khung hình (tỉ lệ 0..1). Khung dọc: né thanh trên, bình luận và nút quà của TikTok.
    const r = portrait ? CONFIG.camera.portraitSafe : { left: 0, right: 1, top: 0, bottom: 1 };
    const rw = (r.right - r.left) * W, rh = (r.bottom - r.top) * H;
    const unitsPerPx = Math.max((2 * mx) / rw, (2 * my) / rh);
    const px = (r.left + r.right) / 2 * W, py = (r.top + r.bottom) / 2 * H;   // tâm vùng (pixel)
    camera.left = -px * unitsPerPx; camera.right = (W - px) * unitsPerPx;
    camera.top = py * unitsPerPx; camera.bottom = -(H - py) * unitsPerPx;
    camera.updateProjectionMatrix();
  }
  fit();
  addEventListener('resize', fit);

  // ---------- Đạo diễn camera: hàng đợi cảnh quay theo độ ưu tiên ----------
  // target: Vector3 hoặc Object3D (đi theo khi nhân vật đang di chuyển)
  const shotTarget = new THREE.Vector3();
  let current = null;          // { target, t, priority, age, kind }
  const queue = [];
  let clock = 0;

  function posOf(target, out) {
    const p = target.isObject3D ? target.position : target;
    return out.set(p.x, 0.5, p.z);
  }

  function shot(target, { seconds = CONFIG.focusSeconds, priority = 50, kind = '' } = {}) {
    const s = { target, t: seconds, priority, age: 0, kind, queuedAt: clock };
    if (!current || priority > current.priority ||
        (priority === current.priority && current.age > CONFIG.camera.minShotSeconds)) {
      current = s;
    } else {
      queue.push(s);
      queue.sort((a, b) => b.priority - a.priority);
      if (queue.length > 4) queue.length = 4;   // không dồn quá nhiều cảnh cũ
    }
  }

  function focusOn(pos, seconds = CONFIG.focusSeconds, priority = 60) {
    shot({ x: pos.x, z: pos.z }, { seconds, priority });
  }

  function update(dt) {
    clock += dt;
    let wantZoom = portrait ? CONFIG.camera.portraitBaseZoom : 1;
    if (current) {
      current.t -= dt; current.age += dt;
      if (current.t <= 0) {
        // Cảnh tiếp theo: ưu tiên cao nhất, bỏ những cảnh chờ quá lâu
        current = null;
        while (queue.length) {
          const n = queue.shift();
          if (clock - n.queuedAt < CONFIG.camera.maxQueueWait) { current = n; break; }
        }
      }
    }
    if (current) {
      posOf(current.target, shotTarget);
      look.lerp(shotTarget, Math.min(1, dt * 3));
      wantZoom = portrait ? CONFIG.camera.portraitZoom : CONFIG.focusZoom;
    } else {
      look.lerp(center, Math.min(1, dt * 2.2));
    }
    camera.zoom += (wantZoom - camera.zoom) * Math.min(1, dt * 2.6);
    camera.position.copy(look).addScaledVector(camDir, 30);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
  }

  const _v = new THREE.Vector3();
  /** Chiếu điểm thế giới ra pixel màn hình. */
  function toScreen(vec, out = {}) {
    _v.copy(vec).project(camera);
    out.x = (_v.x * 0.5 + 0.5) * W;
    out.y = (-_v.y * 0.5 + 0.5) * H;
    out.visible = _v.z < 1 && _v.x > -1.2 && _v.x < 1.2 && _v.y > -1.2 && _v.y < 1.2;
    return out;
  }

  return {
    renderer, scene, camera, lights, focusOn, shot, update, toScreen,
    get portrait() { return portrait; },
    get busyPriority() { return current ? current.priority : 0; },
    render: () => renderer.render(scene, camera),
    get zoom() { return camera.zoom; },
    /** Tỉ lệ nhãn HTML: to lên khi camera zoom (cỡ gốc do CSS tính theo khung hình). */
    get labelScale() { return Math.min(1.4, Math.sqrt(camera.zoom)); },
  };
}
