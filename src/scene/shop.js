// Dựng quán net: sàn, tường, 20 máy, quầy, đồ trang trí.
import * as THREE from 'three';
import { makeProp } from './assets.js';
import { Screen, canvasPlane, roundRect } from './screen.js';
import { CONFIG } from '../config.js';

// ---------- Bố cục (đơn vị thế giới, 1 = một ô sàn) ----------
export const ROOM = { minX: -4, maxX: 3, minZ: -3.5, maxZ: 3.5 };
export const AISLE_X = -2.65;               // lối đi dọc bên trái
export const DOOR = { x: -4.4, z: 2.0 };   // ngoài cửa (bên trái, phía trước)
export const STAFF_HOME = { x: -3.0, z: -3.05 };
const COLS = [-1.35, -0.55, 0.25, 1.05, 1.85];  // tâm bàn theo X
const ISLANDS = [-0.95, 1.45];                   // tâm mỗi đảo theo Z
const DESK_HALF = 0.19, SEAT_OFF = 0.5, LINE_OFF = 0.95;

const PALETTE = {
  wall: 0xf6ead4, wallTrim: 0xe7c9a0, floor: 0xead2ab, floorAlt: 0xe2c79c,
  chair: 0x6f9fc0, vip: 0xf2c341, accent: 0xf08a3c,
};

function tint(obj, map) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const out = mats.map((m) => {
      if (map[m.name] === undefined) return m;
      const c = m.clone(); c.color.set(map[m.name]); return c;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
  return obj;
}

async function addProp(parent, kind, name, x, z, rotY = 0, opts = {}) {
  const p = await makeProp(kind, name, opts);
  p.position.set(x, opts.y ?? 0, z);
  p.rotation.y = rotY;
  if (opts.tint) tint(p, opts.tint);
  parent.add(p);
  return p;
}

/** Một máy: bàn + ghế + màn hình + phím + chuột. Hướng người ngồi = +z cục bộ. */
async function makeStation(idx, x, z, facing) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = facing;   // 0: người ngồi phía +z nhìn về -z; PI: ngược lại

  await addProp(g, 'furniture', 'desk', 0, 0);
  const chair = await addProp(g, 'furniture', 'chairDesk', 0, SEAT_OFF - 0.05, Math.PI);
  // Ghế có vật liệu riêng để đổi màu VIP
  const chairMats = [];
  chair.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.material = mats.map((m) => {
      const c = m.clone();
      if (m.name === 'carpet') { c.color.set(PALETTE.chair); chairMats.push(c); }
      return c;
    });
    if (o.material.length === 1) o.material = o.material[0];
  });
  const monitor = await addProp(g, 'furniture', 'computerScreen', 0, -DESK_HALF + 0.09, 0, { y: 0.38 });
  await addProp(g, 'furniture', 'computerKeyboard', -0.02, 0.05, 0, { y: 0.38 });
  await addProp(g, 'furniture', 'computerMouse', 0.2, 0.06, 0, { y: 0.38 });

  const screen = new Screen(0.34, 0.21, CONFIG.shopName);
  screen.mesh.position.set(0, 0.38 + 0.188, -DESK_HALF + 0.09 + 0.028);
  g.add(screen.mesh);

  // Vị trí đặt đồ ăn/uống (cục bộ)
  const foodSpot = new THREE.Vector3(0.22, 0.38, 0.1);
  const drinkSpot = new THREE.Vector3(-0.26, 0.38, 0.08);

  const dir = facing === 0 ? 1 : -1;  // phía người ngồi theo trục z thế giới
  return {
    idx, group: g, screen, monitor, chairMats,
    x, z,
    seat: { x, z: z + dir * SEAT_OFF },       // chỗ nhân vật ngồi
    lineZ: z + dir * LINE_OFF,                // đường đi phía sau ghế
    faceRot: facing === 0 ? Math.PI : 0,      // hướng nhân vật khi ngồi (nhìn vào màn hình)
    foodSpot, drinkSpot,
    player: null, food: null, drink: null,
    setVip(on) { chairMats.forEach((m) => m.color.set(on ? PALETTE.vip : PALETTE.chair)); },
  };
}

function signTexture(c, w, h) {
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#f08a3c';
  roundRect(c, 4, 4, w - 8, h - 8, h * 0.22); c.fill();
  c.strokeStyle = '#fff3e0'; c.lineWidth = h * 0.06;
  roundRect(c, h * 0.1, h * 0.1, w - h * 0.2, h - h * 0.2, h * 0.16); c.stroke();
  c.fillStyle = '#fff';
  c.font = `800 ${h * 0.5}px "Be Vietnam Pro", sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(CONFIG.shopName, w / 2, h * 0.54);
}

function menuTexture(c, w, h) {
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#5b4636';
  roundRect(c, 4, 4, w - 8, h - 8, 26); c.fill();
  c.fillStyle = '#fff6e6';
  c.textAlign = 'left'; c.textBaseline = 'middle';
  c.font = `800 ${h * 0.13}px "Be Vietnam Pro", sans-serif`;
  c.fillText('MENU', w * 0.08, h * 0.15);
  const rows = [['🍜 Mì tôm trứng', 'Hoa hồng'], ['🥤 Sting', 'Quà nhỏ'], ['👑 Ghế VIP', 'Quà vừa'], ['🎉 Bao cả quán', 'Quà to']];
  rows.forEach(([a, b], i) => {
    const y = h * (0.36 + i * 0.17);
    c.font = `700 ${h * 0.085}px "Be Vietnam Pro", sans-serif`;
    c.fillStyle = '#fff6e6'; c.textAlign = 'left'; c.fillText(a, w * 0.08, y);
    c.font = `600 ${h * 0.075}px "Be Vietnam Pro", sans-serif`;
    c.fillStyle = '#ffc285'; c.textAlign = 'right'; c.fillText(b, w * 0.92, y);
  });
}

export async function buildShop(scene) {
  const root = new THREE.Group();
  scene.add(root);

  // ----- Sàn: ô gỗ sáng xen kẽ -----
  const floorJobs = [];
  for (let x = ROOM.minX + 0.5; x < ROOM.maxX; x++) {
    for (let z = ROOM.minZ + 0.5; z < ROOM.maxZ; z++) {
      const alt = (Math.floor(x) + Math.floor(z)) % 2 === 0;
      floorJobs.push(addProp(root, 'furniture', 'floorFull', x, z, 0, {
        tint: { wood: alt ? PALETTE.floor : PALETTE.floorAlt }, cast: false,
      }));
    }
  }
  await Promise.all(floorJobs);

  // ----- Tường sau (z = minZ) và tường trái (x = minX) -----
  const wallTint = { _defaultMat: PALETTE.wall, wood: PALETTE.wallTrim };
  const walls = [];
  for (let x = ROOM.minX + 0.5; x < ROOM.maxX; x++) {
    walls.push(addProp(root, 'furniture', 'wall', x, ROOM.minZ, 0, { tint: wallTint }));
  }
  for (let z = ROOM.minZ + 0.5; z < ROOM.maxZ; z++) {
    const isDoor = Math.abs(z - DOOR.z) < 0.01;
    walls.push(addProp(root, 'furniture', isDoor ? 'wallDoorway' : 'wall', ROOM.minX, z, Math.PI / 2, { tint: wallTint }));
  }
  await Promise.all(walls);
  await addProp(root, 'furniture', 'rugDoormat', ROOM.minX + 0.35, DOOR.z, Math.PI / 2, { cast: false });

  // ----- 20 máy: 2 đảo, mỗi đảo 2 hàng quay lưng vào nhau -----
  const stationJobs = [];
  let idx = 0;
  for (const zc of ISLANDS) {
    for (const facing of [Math.PI, 0]) {
      const dz = facing === 0 ? DESK_HALF : -DESK_HALF;
      for (const x of COLS) stationJobs.push(makeStation(idx++, x, zc + dz, facing));
    }
  }
  const stations = await Promise.all(stationJobs);
  stations.forEach((s) => root.add(s.group));

  // ----- Quầy thu ngân / quầy nước (góc trong cùng bên trái) -----
  const counterZ = -2.6;
  for (let i = 0; i < 4; i++) await addProp(root, 'furniture', 'kitchenBar', -3.75 + i * 0.43, counterZ, 0);
  await addProp(root, 'furniture', 'kitchenBarEnd', -3.75 + 4 * 0.43, counterZ, 0);
  await addProp(root, 'furniture', 'kitchenCoffeeMachine', -3.45, counterZ, 0, { y: 0.42 });
  await addProp(root, 'furniture', 'kitchenFridge', -3.7, -3.25, 0);
  await addProp(root, 'furniture', 'kitchenMicrowave', -2.7, -3.3, 0, { y: 0 });
  await addProp(root, 'furniture', 'stoolBar', -3.45, -2.25, 0);
  await addProp(root, 'furniture', 'stoolBar', -3.0, -2.25, 0);

  // ----- Trang trí -----
  await addProp(root, 'furniture', 'pottedPlant', 2.6, 3.1, 0);
  await addProp(root, 'furniture', 'pottedPlant', 2.6, -3.15, 0);
  await addProp(root, 'furniture', 'pottedPlant', -3.65, 1.25, 0);
  await addProp(root, 'furniture', 'plantSmall1', -0.55, -3.3, 0, { y: 0 });
  await addProp(root, 'furniture', 'trashcan', -1.55, -3.25, 0);
  await addProp(root, 'furniture', 'trashcan', 2.65, 0.3, 0);
  await addProp(root, 'furniture', 'speaker', -1.1, -3.3, 0);
  await addProp(root, 'furniture', 'speaker', 2.65, -2.3, -Math.PI / 2);
  await addProp(root, 'furniture', 'coatRackStanding', -3.65, 2.85, 0);
  await addProp(root, 'furniture', 'loungeSofa', 1.6, -3.1, 0);

  // ----- Biển hiệu + menu trên tường sau -----
  const sign = canvasPlane(2.1, 0.5, 840, signTexture);
  sign.position.set(0.05, 0.98, ROOM.minZ + 0.05);
  root.add(sign);
  const menu = canvasPlane(1.0, 0.8, 600, menuTexture);
  menu.position.set(-1.75, 0.8, ROOM.minZ + 0.05);
  root.add(menu);

  // ----- Điều hòa (mở khóa ở mục tiêu chung) -----
  const aircon = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.26, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xfbfbf8, roughness: 0.5 }));
  body.castShadow = true;
  const vent = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xb9c3c9 }));
  vent.position.set(0, -0.08, 0.1);
  aircon.add(body, vent);
  aircon.position.set(1.95, 1.0, ROOM.minZ + 0.12);
  aircon.visible = false;
  root.add(aircon);

  return { root, stations, aircon, sign, menu };
}
