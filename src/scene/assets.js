// Tải và nhân bản model Kenney (.glb). Mọi model chỉ tải một lần rồi clone.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const BASE = import.meta.env.BASE_URL + 'models/';
const loader = new GLTFLoader();
const cache = new Map();

export const CHARACTER_SKINS = [
  'male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f', 'male-g',
  'female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f',
];

const FURNITURE = [
  'desk', 'chairDesk', 'computerScreen', 'computerKeyboard', 'computerMouse',
  'floorFull', 'wall', 'wallCorner', 'wallDoorway', 'kitchenBar', 'kitchenBarEnd',
  'kitchenFridge', 'kitchenCoffeeMachine', 'kitchenMicrowave', 'pottedPlant', 'plantSmall1',
  'trashcan', 'speaker', 'speakerSmall', 'rugRectangle', 'rugDoormat', 'stoolBar',
  'lampRoundFloor', 'ceilingFan', 'televisionModern', 'loungeSofa', 'coatRackStanding',
];
const FOOD = ['bowl-broth', 'egg-cooked', 'soda-can', 'chopstick', 'cup-tea'];

function load(path) {
  if (!cache.has(path)) cache.set(path, loader.loadAsync(BASE + path));
  return cache.get(path);
}

/** Tải trước toàn bộ model cần dùng. onProgress(0..1) */
export async function preloadAll(onProgress) {
  const paths = [
    ...CHARACTER_SKINS.map((s) => `characters/character-${s}.glb`),
    'characters/character-worker.glb',
    ...FURNITURE.map((f) => `furniture/${f}.glb`),
    ...FOOD.map((f) => `food/${f}.glb`),
  ];
  let done = 0;
  await Promise.all(paths.map((p) => load(p).then(() => onProgress?.(++done / paths.length))));
}

function prepShadows(obj) {
  obj.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return obj;
}

/**
 * Clone một món nội thất/đồ ăn, bọc trong Group sao cho gốc nằm ở
 * TÂM đáy (Kenney đặt gốc ở góc → căn lại bằng Box3).
 */
export async function makeProp(kind, name, { scale = 1, cast = true } = {}) {
  const gltf = await load(`${kind}/${name}.glb`);
  const inner = gltf.scene.clone(true);
  inner.scale.setScalar(scale);
  inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner);
  const c = box.getCenter(new THREE.Vector3());
  inner.position.set(-c.x, -box.min.y, -c.z);
  const g = new THREE.Group();
  g.name = name;
  g.add(inner);
  g.userData.size = box.getSize(new THREE.Vector3());
  prepShadows(g);
  if (!cast) g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return g;
}

/** Clone nhân vật có skin + mixer + toàn bộ animation. */
export async function makeCharacterModel(skin) {
  const gltf = await load(`characters/character-${skin}.glb`);
  const root = SkeletonUtils.clone(gltf.scene);
  prepShadows(root);
  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  return { root, mixer, actions };
}
