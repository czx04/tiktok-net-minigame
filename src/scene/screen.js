// Mặt màn hình máy tính vẽ bằng CanvasTexture.
import * as THREE from 'three';

const W = 256, H = 168;
const AVATAR_COLORS = ['#f08a3c', '#5fa8d3', '#7cc47f', '#e57a9a', '#a98bd6', '#e8b04a', '#4fb7a6'];

function hashColor(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export class Screen {
  constructor(width, height, shopName) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), this.mat);
    this.shopName = shopName;
    this.avatar = null;   // HTMLImageElement (giai đoạn 3: ảnh TikTok)
    this.state = null;
    this.draw({ mode: 'idle' });
  }

  /** opts: { mode: 'idle'|'play'|'locked'|'off', name, vip } */
  draw(opts) {
    const key = JSON.stringify(opts);
    if (key === this.state) return;
    this.state = key;
    const c = this.ctx;
    const { mode, name = '', vip = false } = opts;
    c.save();
    if (mode === 'off') {
      c.fillStyle = '#1d1f24'; c.fillRect(0, 0, W, H);
    } else if (mode === 'idle') {
      const g = c.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#9fd3e6'); g.addColorStop(1, '#cfe9d6');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.font = '800 30px "Be Vietnam Pro", sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(this.shopName, W / 2, H / 2 - 8);
      c.font = '600 17px "Be Vietnam Pro", sans-serif';
      c.fillText('Máy trống', W / 2, H / 2 + 24);
    } else if (mode === 'locked') {
      c.fillStyle = '#d64545'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#fff';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '800 44px "Be Vietnam Pro", sans-serif';
      c.fillText('HẾT GIỜ', W / 2, H / 2 - 12);
      c.font = '600 18px "Be Vietnam Pro", sans-serif';
      c.fillText('Thả tim để mở máy', W / 2, H / 2 + 30);
    } else {
      // Đang chơi: nền "game" + avatar + tên
      const base = vip ? '#f6d778' : '#bfe3f2';
      c.fillStyle = base; c.fillRect(0, 0, W, H);
      c.fillStyle = vip ? '#f0c24b' : '#8ccbe4';
      for (let i = 0; i < 6; i++) c.fillRect(i * 46 - 10, H - 34 - (i % 3) * 12, 40, 60);
      c.fillStyle = '#7cc47f'; c.fillRect(0, H - 18, W, 18);
      const col = hashColor(name);
      const cx = W / 2, cy = 66, r = 40;
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(cx, cy, r + 5, 0, Math.PI * 2); c.fill();
      if (this.avatar?.complete && this.avatar.naturalWidth) {
        c.save(); c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
        c.drawImage(this.avatar, cx - r, cy - r, r * 2, r * 2); c.restore();
      } else {
        c.fillStyle = col;
        c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fff';
        c.font = '800 40px "Be Vietnam Pro", sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText([...name.trim()][0]?.toUpperCase() ?? '?', cx, cy + 2);
      }
      c.fillStyle = 'rgba(40,30,20,0.72)';
      roundRect(c, 16, 116, W - 32, 34, 12); c.fill();
      c.fillStyle = '#fff';
      c.font = '700 20px "Be Vietnam Pro", sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      let label = name;
      while (c.measureText(label).width > W - 52 && label.length > 2) label = label.slice(0, -2) + '…';
      c.fillText(label, W / 2, 134);
    }
    c.restore();
    this.tex.needsUpdate = true;
  }

  setAvatar(img) { this.avatar = img; this.state = null; }
}

/** Canvas texture tiện cho biển hiệu, menu. */
export function canvasPlane(w, h, px, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = px; canvas.height = Math.round(px * h / w);
  draw(canvas.getContext('2d'), canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, transparent: true }));
  mesh.userData.redraw = () => { draw(canvas.getContext('2d'), canvas.width, canvas.height); tex.needsUpdate = true; };
  return mesh;
}

export { roundRect };
