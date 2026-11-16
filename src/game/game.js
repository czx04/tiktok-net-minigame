// Luật chơi: khách vào/ra, giờ chơi, tim, bình luận, quà, nhân viên giao đồ.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Character } from '../characters/character.js';
import { CHARACTER_SKINS } from '../scene/assets.js';
import { AISLE_X, DOOR, STAFF_HOME } from '../scene/shop.js';
import { createLabel } from '../ui/labels.js';
import { makeItem, animateItem } from './items.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const fmt = (s) => {
  s = Math.max(0, Math.ceil(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Đường nhân viên ra khỏi quầy
const COUNTER_EXIT = [[-1.6, STAFF_HOME.z], [-1.6, -2.3], [AISLE_X, -2.3]];

export async function createGame({ stage, shop, hud }) {
  const { scene } = stage;
  const stations = shop.stations;
  const players = new Map();   // name -> player (đang trong quán)
  const visible = new Set();   // mọi khách còn trên màn hình, kể cả đang đi ra
  const actors = [];           // mọi Character cần update
  let coins = 0, goalIdx = 0, time = 0, lastFullNotice = -99;

  // ---------- Nhân viên ----------
  const staffChar = await Character.create('worker');
  staffChar.position.set(STAFF_HOME.x, 0, STAFF_HOME.z);
  staffChar.group.rotation.y = 0;
  staffChar.faceTo(0);
  scene.add(staffChar.group);
  actors.push(staffChar);
  const staff = {
    char: staffChar, label: createLabel('Nhân viên', 'npc'),
    queue: [], busy: false, carry: null,
  };
  staff.label.setTimer('', 'hidden');

  // ---------- Tiện ích ----------
  function countUsed() { return stations.filter((s) => s.player).length; }
  function refreshCount() { hud.setCount(countUsed(), stations.length); }

  function addCoins(n) {
    coins += n;
    const g = CONFIG.goals[goalIdx];
    if (g && coins >= g.coins) {
      coins -= g.coins;
      if (g.unlock === 'aircon') shop.aircon.visible = true;
      hud.banner(`Đạt mục tiêu: ${g.name}!`, `Cả live cùng góp ${g.coins} xu`, 5);
      goalIdx = Math.min(goalIdx + 1, CONFIG.goals.length - 1);
    }
    const cur = CONFIG.goals[goalIdx];
    hud.setGoal(cur.name, coins, cur.coins);
  }

  function drawScreen(st) {
    const p = st.player;
    if (!p || p.state === 'walk') st.screen.draw({ mode: 'idle' });
    else st.screen.draw({ mode: 'play', name: p.name, vip: p.vip });
  }

  function addTime(p, s) { p.time += s; }

  // ---------- Khách vào ----------
  async function join(name, instant = false) {
    if (players.has(name)) return players.get(name);
    const free = stations.filter((s) => !s.player);
    if (!free.length) {
      // Quán kín máy: báo tối đa 1 lần / 10 giây để feed không bị spam
      if (time - lastFullNotice > 10) { hud.feed(name, 'đang chờ máy trống'); lastFullNotice = time; }
      return null;
    }
    const st = pick(free);
    const p = {
      name, st, state: 'walk', time: CONFIG.startSeconds, vip: false,
      char: null, label: createLabel(name, 'player'), pendingSay: null,
    };
    st.player = p;
    players.set(name, p);
    visible.add(p);
    refreshCount();
    p.label.setTimer(fmt(p.time), 'normal');

    p.char = await Character.create(pick(CHARACTER_SKINS));
    if (p.state === 'gone') { p.char.dispose(); return null; }
    scene.add(p.char.group);
    actors.push(p.char);

    if (instant) {
      p.time = rnd(25, 120);
      seat(p);
    } else {
      p.char.position.set(DOOR.x, 0, DOOR.z);
      hud.feed(name, 'vừa vào quán');
      await p.char.walk([
        [AISLE_X, DOOR.z], [AISLE_X, st.lineZ], [st.seat.x, st.lineZ], [st.seat.x, st.seat.z],
      ], CONFIG.walkSpeed);
      if (p.state === 'walk') seat(p);
    }
    return p;
  }

  function seat(p) {
    const { st, char } = p;
    p.state = 'sit';
    char.path = [];
    char.position.set(st.seat.x, 0, st.seat.z);
    char.group.rotation.y = st.faceRot;
    char.faceTo(st.faceRot);
    char.setLoop('sit');
    drawScreen(st);
  }

  async function leave(p, why) {
    if (p.state === 'leave' || p.state === 'gone') return;
    const { st } = p;
    const wasWalking = p.state === 'walk';
    p.state = 'leave';
    st.player = null;
    if (p.vip) st.setVip(false);
    players.delete(p.name);
    drawScreen(st);
    refreshCount();
    p.label.setTimer('', 'hidden');
    if (why) hud.feed(p.name, why);
    if (!p.char) { p.state = 'gone'; visible.delete(p); p.label.remove(); return; }
    const pos = p.char.position;
    const route = wasWalking ? [] : [[st.seat.x, st.lineZ]];
    await p.char.walk([...route, [AISLE_X, wasWalking ? pos.z : st.lineZ], [AISLE_X, DOOR.z], [DOOR.x, DOOR.z]], CONFIG.walkSpeed);
    p.state = 'gone';
    visible.delete(p);
    p.char.dispose();
    actors.splice(actors.indexOf(p.char), 1);
    p.label.remove();
  }

  // ---------- Nhân viên giao đồ (hàng đợi) ----------
  function order(p, kind) {
    staff.queue.push({ p, kind });
    if (!staff.busy) runStaff();
  }

  async function runStaff() {
    staff.busy = true;
    while (staff.queue.length) {
      const job = staff.queue.shift();
      if (job.p.state !== 'sit' || job.p.st.player !== job.p) continue;
      const st = job.p.st;
      const item = await makeItem(job.kind);
      item.position.set(0, 0.42, 0.22);
      staffChar.group.add(item);
      staff.carry = item;
      const side = st.seat.x + 0.42;
      await staffChar.walk([...COUNTER_EXIT, [AISLE_X, st.lineZ], [side, st.lineZ]], CONFIG.staffSpeed);
      // Quay về phía khách, đặt đồ lên bàn
      staffChar.faceTo(Math.atan2(st.seat.x - side, st.seat.z - st.lineZ));
      staffChar.gesture('interact-left', 'idle');
      await new Promise((r) => setTimeout(r, 450));
      staffChar.group.remove(item);
      staff.carry = null;
      if (job.p.state === 'sit' && st.player === job.p) deliver(job.p, job.kind, item);
      await new Promise((r) => setTimeout(r, 350));
      await staffChar.walk([[AISLE_X, st.lineZ], ...COUNTER_EXIT.slice().reverse(), [STAFF_HOME.x, STAFF_HOME.z]], CONFIG.staffSpeed);
      staffChar.faceTo(0);
    }
    staff.busy = false;
  }

  function deliver(p, kind, item) {
    const st = p.st;
    const slot = kind === 'noodle' ? 'food' : 'drink';
    if (st[slot]) st.group.remove(st[slot].mesh);
    const spot = kind === 'noodle' ? st.foodSpot : st.drinkSpot;
    item.position.copy(spot);
    st.group.add(item);
    st[slot] = { mesh: item, t: CONFIG.itemOnDeskSeconds };
    p.label.say(kind === 'noodle' ? 'Mì tới rồi! 🍜' : 'Sting mát lạnh! 🥤', 3);
    p.char.gesture('emote-yes', 'sit');
  }

  // ---------- Hàm công khai (giả lập / TikTok gọi) ----------
  const handlers = {
    onJoin(user, instant) { return join(user, instant); },

    async onLike(user, n = 1) {
      const p = players.get(user) ?? await join(user);
      if (!p) return;
      addTime(p, CONFIG.secondsPerLike * n);
      p.label.popHeart(n);
    },

    async onComment(user, text) {
      hud.feed(user, text);
      const p = players.get(user) ?? await join(user);
      p?.label.say(text, 3.5);
    },

    async onGift(user, key) {
      const gift = CONFIG.gifts[key];
      if (!gift) return;
      const p = players.get(user) ?? await join(user);
      if (!p) return;
      addCoins(gift.coins);
      addTime(p, gift.seconds);
      if (gift.item === 'noodle') {
        hud.feed(user, `tặng ${gift.label}, gọi mì tôm trứng`);
        p.label.say('Anh ơi cho bát mì!', 3);
        order(p, 'noodle');
      } else if (gift.item === 'sting') {
        hud.feed(user, `tặng ${gift.label}, gọi Sting`);
        p.label.say('Cho em lon Sting!', 3);
        order(p, 'sting');
      } else {
        // VIP và Bao cả quán: hoàn thiện ở giai đoạn 2
        hud.feed(user, `tặng ${gift.label} (+${Math.round(gift.seconds / 60)} phút)`);
        p.label.popHeart(3);
      }
    },

    blackout() { hud.feed('Quán', 'sự kiện mất điện (giai đoạn 2)'); },
    momEvent() { hud.feed('Quán', 'sự kiện mẹ đến (giai đoạn 2)'); },
    getPlayers() {
      return [...players.values()].filter((p) => p.state === 'sit' || p.state === 'walk').map((p) => p.name);
    },
  };

  // ---------- Vòng lặp ----------
  const tmp = new THREE.Vector3();
  const scr = {};
  function placeLabel(label, char, height) {
    tmp.copy(char.position); tmp.y += height;
    stage.toScreen(tmp, scr);
    label.setPosition(scr.x, scr.y, scr.visible);
    label.setScale(stage.labelScale);
  }

  function update(dt) {
    time += dt;
    for (const a of actors) a.update(dt);

    for (const p of [...players.values()]) {
      if (p.state === 'sit') {
        p.time -= dt;
        if (p.time <= 0) { leave(p, 'hết giờ nên rời quán'); continue; }
        p.label.setTimer(fmt(p.time), p.time < CONFIG.lowTimeSeconds ? 'low' : 'normal');
      }
    }
    // Nhãn của mọi khách đang hiển thị (kể cả người đang ra về)
    for (const p of visible) if (p.char) placeLabel(p.label, p.char, p.state === 'sit' ? 0.82 : 0.95);
    placeLabel(staff.label, staffChar, 0.95);

    // Đồ trên bàn: hết hạn thì dọn
    for (const st of stations) {
      for (const slot of ['food', 'drink']) {
        const it = st[slot];
        if (!it) continue;
        it.t -= dt;
        animateItem(it.mesh, time);
        if (it.t <= 0 || (!st.player && it.t < CONFIG.itemOnDeskSeconds - 3)) {
          st.group.remove(it.mesh); st[slot] = null;
        }
      }
    }
    if (staff.carry) animateItem(staff.carry, time);
  }

  addCoins(CONFIG.startCoins);
  refreshCount();

  return { handlers, update, players };
}
