// Một nhân vật chibi: model + animation + đi theo đường.
import * as THREE from 'three';
import { makeCharacterModel } from '../scene/assets.js';

const SEAT_HEIGHT = 0.24;   // mặt đệm chairDesk (đã phóng ×1.15 trong shop.js) ≈ 0.3; animation `sit` ngồi bệt sàn

export class Character {
  static async create(skin, { scale = 1 } = {}) {
    const m = await makeCharacterModel(skin);
    return new Character(m, scale);
  }

  constructor({ root, mixer, actions }, scale) {
    this.group = new THREE.Group();
    this.model = root;
    this.model.scale.setScalar(scale);
    this.group.add(this.model);
    this.mixer = mixer;
    this.actions = actions;
    this.current = null;
    this.path = [];
    this.speed = 1.3;
    this.onArrive = null;
    this.bob = 0;          // nảy lên khi vui
    this.baseY = 0;        // độ cao nền (khi đi = 0)
    this.sitY = 0;         // nâng lên mặt đệm ghế khi đang chạy animation `sit`
    this.mixer.timeScale = 1;
    // Xương đầu/thân không bị animation `sit` điều khiển → dùng để gục đầu, ăn mì, ngó nghiêng
    this.head = root.getObjectByName('head');
    this.torso = root.getObjectByName('torso');
    this.lean = { torso: 0, head: 0, turn: 0 };
    this.play('idle', 0);
  }

  /** Đặt tư thế phụ khi đang ngồi (radian). Gọi mỗi khung sau update(). */
  setLean(torso, head, turn = 0, dt = 1) {
    const k = Math.min(1, dt * 8);
    this.lean.torso += (torso - this.lean.torso) * k;
    this.lean.head += (head - this.lean.head) * k;
    this.lean.turn += (turn - this.lean.turn) * k;
    if (this.torso) this.torso.rotation.x = this.lean.torso;
    if (this.head) { this.head.rotation.x = this.lean.head; this.head.rotation.y = this.lean.turn; }
  }

  resetLean() {
    this.lean.torso = this.lean.head = this.lean.turn = 0;
    if (this.torso) this.torso.rotation.set(0, 0, 0);
    if (this.head) this.head.rotation.set(0, 0, 0);
  }

  get position() { return this.group.position; }

  play(name, fade = 0.25, { once = false } = {}) {
    const next = this.actions[name];
    if (!next || next === this.current) return next;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = once;
    next.enabled = true;
    next.setEffectiveWeight(1);
    if (this.current && fade > 0) next.crossFadeFrom(this.current, fade, false);
    else if (this.current) this.current.stop();
    next.play();
    this.current = next;
    return next;
  }

  /** Phát một động tác ngắn rồi quay về animation nền. */
  gesture(name, back) {
    const a = this.play(name, 0.15, { once: true });
    if (!a) return;
    const dur = a.getClip().duration * 1000;
    clearTimeout(this._gT);
    this._gT = setTimeout(() => { this.play(back ?? this.loopName ?? 'idle', 0.25); }, Math.max(400, dur - 150));
  }

  setLoop(name) { this.loopName = name; this.play(name); }

  /** Đi theo danh sách điểm [x,z]; trả về Promise khi tới nơi. */
  walk(points, speed = this.speed) {
    this.path = points.map(([x, z]) => new THREE.Vector3(x, 0, z));
    this.speed = speed;
    this.baseY = 0;
    this.resetLean();
    this.setLoop('walk');
    return new Promise((res) => { this.onArrive = res; });
  }

  faceTo(rotY) { this.targetRot = rotY; }

  hop() { this.bob = 0.45; }

  update(dt) {
    this.mixer.update(dt);
    const p = this.group.position;
    if (this.path.length) {
      const t = this.path[0];
      const dx = t.x - p.x, dz = t.z - p.z;
      const d = Math.hypot(dx, dz);
      const step = this.speed * dt;
      if (d <= step) {
        p.x = t.x; p.z = t.z;
        this.path.shift();
        if (!this.path.length) {
          this.setLoop('idle');
          const cb = this.onArrive; this.onArrive = null; cb?.();
        }
      } else {
        p.x += (dx / d) * step; p.z += (dz / d) * step;
        this.targetRot = Math.atan2(dx, dz);
      }
    }
    if (this.targetRot !== undefined) {
      let diff = this.targetRot - this.group.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.group.rotation.y += diff * Math.min(1, dt * 12);
    }
    // Animation `sit` của Kenney ngồi bệt sát sàn → nâng lên mặt đệm ghế, không thì thân chùm mất cái ghế
    const sitTarget = this.current === this.actions.sit ? SEAT_HEIGHT : 0;
    this.sitY += (sitTarget - this.sitY) * Math.min(1, dt * 10);
    let y = this.baseY + this.sitY;
    if (this.bob > 0) {
      this.bob -= dt;
      y += Math.sin((1 - this.bob / 0.45) * Math.PI) * 0.12;
    }
    p.y = y;
  }

  dispose() {
    clearTimeout(this._gT);
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    // Mỗi bộ xương có texture xương riêng trên GPU → phải giải phóng, không thì live dài sẽ rò bộ nhớ.
    // (Geometry/material/texture màu dùng chung giữa các bản clone nên KHÔNG dispose.)
    this.model.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.dispose(); });
    this.group.removeFromParent();
  }
}
