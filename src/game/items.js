// Đồ ăn uống: mì tôm trứng (bốc khói) và lon Sting.
import * as THREE from 'three';
import { makeProp } from '../scene/assets.js';

const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
const steamGeo = new THREE.SphereGeometry(0.03, 8, 6);

export async function makeItem(kind) {
  const g = new THREE.Group();
  g.userData.kind = kind;
  if (kind === 'noodle') {
    const bowl = await makeProp('food', 'bowl-broth', { scale: 0.32 });
    const egg = await makeProp('food', 'egg-cooked', { scale: 0.26 });
    egg.position.set(0.01, 0.07, 0.0);
    const sticks = await makeProp('food', 'chopstick', { scale: 0.32 });
    sticks.position.set(0.0, 0.075, 0.03);
    sticks.rotation.set(0, 0.5, 0.25);
    g.add(bowl, egg, sticks);
    g.userData.steam = [0, 1, 2].map((i) => {
      const m = new THREE.Mesh(steamGeo, steamMat.clone());
      m.userData.o = i / 3;
      g.add(m);
      return m;
    });
  } else {
    const can = await makeProp('food', 'soda-can', { scale: 0.36 });
    g.add(can);
  }
  return g;
}

/** Làn khói bay lên từ bát mì. */
export function animateItem(item, time) {
  for (const m of item.userData.steam ?? []) {
    const u = (time * 0.55 + m.userData.o) % 1;
    m.position.set(Math.sin(u * 6 + m.userData.o * 9) * 0.025, 0.09 + u * 0.22, 0);
    m.material.opacity = 0.45 * (1 - u);
    m.scale.setScalar(0.6 + u * 1.2);
  }
}
