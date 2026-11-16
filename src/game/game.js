// Luật chơi: khách vào/ra, giờ chơi, khóa máy, tim, bình luận, quà, VIP, bao quán,
// nhân viên giao đồ, mục tiêu chung, mất điện, mẹ đến.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Character } from '../characters/character.js';
import { CHARACTER_SKINS } from '../scene/assets.js';
import { AISLE_X, DOOR, STAFF_HOME } from '../scene/shop.js';
import { createLabel } from '../ui/labels.js';
import { confetti, bigAnnounce } from '../ui/effects.js';
import { makeItem, animateItem } from './items.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (s) => {
  s = Math.max(0, Math.ceil(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Đường nhân viên ra khỏi quầy
const COUNTER_EXIT = [[-1.6, STAFF_HOME.z], [-1.6, -2.3], [AISLE_X, -2.3]];
const MOM_SKINS = ['female-c', 'female-e'];
const BG_DAY = new THREE.Color(0xf3ead9), BG_DARK = new THREE.Color(0x2e2925);

export async function createGame({ stage, shop, hud, sound, leaderboard }) {
  const { scene } = stage;
  const stations = shop.stations;
  const players = new Map();   // name -> player (đang trong quán)
  const visible = new Set();   // mọi khách còn trên màn hình, kể cả đang đi ra
  const actors = [];           // mọi Character cần update
  let coins = 0, goalIdx = 0, time = 0, lastFullNotice = -99;

  // ---------- Nhân viên ----------
  const staffChar = await Character.create('worker');
  staffChar.position.set(STAFF_HOME.x, 0, STAFF_HOME.z);
  staffChar.faceTo(0);
  scene.add(staffChar.group);
  actors.push(staffChar);
  const staff = { label: createLabel('Nhân viên', 'npc'), queue: [], busy: false, carry: null };
  staff.label.setTimer('', 'hidden');

  // ---------- Trạng thái sự kiện ----------
  const dark = { on: false, k: 0, got: 0, t: 0 };
  const mom = { on: false, char: null, label: null, victim: null, state: '', t: 0 };

  // ---------- Tiện ích ----------
  const seated = () => [...players.values()].filter((p) => p.state === 'sit' || p.state === 'locked');
  function refreshCount() { hud.setCount(stations.filter((s) => s.player).length, stations.length); }

  function addCoins(n) {
    coins += n;
    const g = CONFIG.goals[goalIdx];
    if (g && coins >= g.coins) {
      coins -= g.coins;
      if (g.unlock === 'aircon') shop.aircon.visible = true;
      bigAnnounce(`Đạt mục tiêu: ${g.name}!`, `Cả live cùng góp ${g.coins} xu 🎉`, 5);
      confetti(3);
      sound.fanfare();
      goalIdx = Math.min(goalIdx + 1, CONFIG.goals.length - 1);
    }
    const cur = CONFIG.goals[goalIdx];
    hud.setGoal(cur.name, coins, cur.coins);
  }

  function drawScreen(st) {
    const p = st.player;
    if (dark.on) st.screen.draw({ mode: 'off' });
    else if (!p || p.state === 'walk') st.screen.draw({ mode: 'idle' });
    else if (p.state === 'locked') st.screen.draw({ mode: 'locked' });
    else st.screen.draw({ mode: 'play', name: p.name, vip: p.vip });
  }

  function addTime(p, s) {
    p.time += s;
    if (p.state === 'locked') {
      p.state = 'sit';
      p.label.el.classList.remove('is-locked');
      drawScreen(p.st);
      p.label.say('Mở máy rồi! 🎮', 2.5);
      p.char.hop();
    }
  }

  function react(p) {
    if (p.char && (p.state === 'sit' || p.state === 'locked')) p.char.gesture('emote-yes', 'sit');
  }

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
      name, st, state: 'walk', time: CONFIG.startSeconds, vip: false, lockT: 0,
      momHold: false, eat: 0, look: 0, char: null, label: createLabel(name, 'player'),
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
    p.momHold = false;
    st.player = null;
    if (p.vip) st.setVip(false);
    players.delete(p.name);
    drawScreen(st);
    refreshCount();
    p.label.setTimer('', 'hidden');
    p.label.el.classList.remove('is-locked', 'is-mom-target');
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
      if (!isSeated(job.p)) continue;
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
      await wait(450);
      staffChar.group.remove(item);
      staff.carry = null;
      if (isSeated(job.p) && st.player === job.p) deliver(job.p, job.kind, item);
      await wait(350);
      await staffChar.walk([[AISLE_X, st.lineZ], ...COUNTER_EXIT.slice().reverse(), [STAFF_HOME.x, STAFF_HOME.z]], CONFIG.staffSpeed);
      staffChar.faceTo(0);
    }
    staff.busy = false;
  }

  const isSeated = (p) => p.state === 'sit' || p.state === 'locked';

  function putOnDesk(p, kind, item) {
    const st = p.st;
    const slot = kind === 'noodle' ? 'food' : 'drink';
    if (st[slot]) st.group.remove(st[slot].mesh);
    item.position.copy(kind === 'noodle' ? st.foodSpot : st.drinkSpot);
    st.group.add(item);
    st[slot] = { mesh: item, t: CONFIG.itemOnDeskSeconds };
  }

  function deliver(p, kind, item) {
    putOnDesk(p, kind, item);
    p.label.say(kind === 'noodle' ? 'Mì tới rồi! 🍜' : 'Sting mát lạnh! 🥤', 3);
    if (kind === 'noodle') p.eat = 6;
    react(p);
  }

  // ---------- Quà đặc biệt ----------
  function makeVip(p, user, gift) {
    p.vip = true;
    p.st.setVip(true);
    p.label.setVip(true);
    drawScreen(p.st);
    hud.feed(user, `tặng ${gift.label}, lên ghế VIP 👑`);
    hud.banner(`${user} lên ghế VIP 👑`, `Ghế vàng, thêm ${Math.round(gift.seconds / 60)} phút chơi`, 4);
    p.label.say('Ghế VIP êm quá!', 3);
    react(p);
    stage.focusOn(p.char.position, 3);
  }

  async function treatEveryone(p, user, gift) {
    hud.feed(user, 'BAO CẢ QUÁN 🎉');
    bigAnnounce(`${user} BAO CẢ QUÁN!`, `Mỗi người một lon Sting và +${Math.round(gift.seconds / 60)} phút`, 5);
    confetti(4);
    sound.fanfare();
    stage.focusOn(p.char.position, CONFIG.focusSeconds);
    const all = seated();
    for (const q of all) if (q !== p) addTime(q, gift.seconds);
    // Lon Sting xuất hiện lần lượt trên từng bàn
    for (const q of all) {
      if (!isSeated(q)) continue;
      putOnDesk(q, 'sting', await makeItem('sting'));
      react(q);
      q.label.popHeart(1);
      await wait(90);
    }
  }

  // ---------- Mất điện ----------
  function blackout() {
    if (dark.on || mom.on) return;
    dark.on = true; dark.got = 0; dark.t = CONFIG.blackout.autoRecoverSeconds;
    document.body.classList.add('is-blackout');
    stations.forEach(drawScreen);
    showDarkBanner();
    hud.feed('Quán', 'mất điện rồi! 😱');
    sound.powerDown();
    for (const p of seated()) if (Math.random() < 0.5) p.label.say(pick(['Ơ mất điện!', 'Đang thắng mà!!', 'Thả tim cứu quán!', 'Huhu']), 3);
  }
  function showDarkBanner() {
    hud.banner('Mất điện cả quán! 🔌', `Thả ${Math.min(dark.got, CONFIG.blackout.likesNeeded)}/${CONFIG.blackout.likesNeeded} tim để bật máy phát`, 0);
  }
  function endBlackout(byHearts) {
    dark.on = false;
    document.body.classList.remove('is-blackout');
    stations.forEach(drawScreen);
    hud.banner('Có điện lại rồi! 💡', byHearts ? 'Cảm ơn mọi người đã thả tim' : 'Máy phát tự chạy', 3);
    sound.powerUp();
  }

  // ---------- Mẹ đến bắt về ----------
  async function momEvent() {
    if (mom.on || dark.on) return;
    const cands = [...players.values()].filter((p) => p.state === 'sit');
    if (!cands.length) return;
    const v = pick(cands);
    mom.on = true; mom.victim = v; mom.state = 'in';
    mom.char = await Character.create(pick(MOM_SKINS), { scale: 1.12 });
    mom.char.position.set(DOOR.x, 0, DOOR.z);
    scene.add(mom.char.group);
    actors.push(mom.char);
    mom.label = createLabel(`Mẹ của ${v.name}`, 'mom');
    mom.label.setTimer('', 'hidden');
    hud.feed(`Mẹ của ${v.name}`, 'vừa bước vào quán 😨');
    const st = v.st;
    mom.spot = [st.seat.x - 0.42, st.lineZ];
    await mom.char.walk([[AISLE_X, DOOR.z], [AISLE_X, st.lineZ], mom.spot], 1.5);
    if (mom.state !== 'in') return;
    if (!isSeated(v) || v.st !== st) { momLeave(); return; }
    // Bắt đầu mắng
    mom.state = 'scold';
    mom.t = CONFIG.mom.scoldSeconds;
    v.momHold = true;
    v.label.el.classList.add('is-mom-target');
    mom.char.faceTo(Math.atan2(st.seat.x - mom.spot[0], st.seat.z - mom.spot[1]));
    mom.char.setLoop('emote-no');
    mom.label.say('Về nhà ngay! Học hành gì chưa?!', CONFIG.mom.scoldSeconds - 1);
    v.label.say('Cứu em! Thả tim đi 🙏', CONFIG.mom.scoldSeconds - 1);
    v.look = CONFIG.mom.scoldSeconds;
    hud.banner(`Mẹ ${v.name} đến bắt về! 😱`, 'Thả tim hoặc tặng quà để cứu bạn ấy', CONFIG.mom.scoldSeconds);
    stage.focusOn(st.seat, CONFIG.mom.scoldSeconds);
    sound.scold();
  }

  function momSaved(by) {
    if (!mom.on || mom.state !== 'scold') return;
    const v = mom.victim;
    v.momHold = false;
    v.label.el.classList.remove('is-mom-target');
    mom.label.setTimer('', 'hidden');
    mom.label.say('Thôi được, chơi thêm chút nữa!', 3);
    v.label.say('Thoát rồi! Cảm ơn mọi người 😭', 3);
    hud.hideBanner();
    hud.feed(v.name, by && by !== v.name ? `được ${by} cứu, mẹ cho chơi tiếp` : 'được cứu, mẹ cho chơi tiếp');
    react(v);
    mom.state = 'out';
    setTimeout(momLeave, 1200);
  }

  function momTakes() {
    const v = mom.victim;
    mom.state = 'out';
    mom.label.setTimer('', 'hidden');
    mom.label.say('Đi về!', 2);
    leave(v, 'bị mẹ bắt về 😢');
    setTimeout(momLeave, 500);
  }

  async function momLeave() {
    if (!mom.char) return;
    mom.state = 'out';
    const c = mom.char;
    const z = c.position.z;
    await c.walk([[AISLE_X, z], [AISLE_X, DOOR.z], [DOOR.x, DOOR.z]], 1.5);
    c.dispose();
    actors.splice(actors.indexOf(c), 1);
    mom.label.remove();
    Object.assign(mom, { on: false, char: null, label: null, victim: null, state: '' });
  }

  // ---------- Hàm công khai (giả lập / TikTok gọi) ----------
  const handlers = {
    onJoin(user, instant) { return join(user, instant); },

    async onLike(user, n = 1) {
      if (dark.on) {
        dark.got += n;
        if (dark.got >= CONFIG.blackout.likesNeeded) endBlackout(true);
        else showDarkBanner();
      }
      if (mom.on && mom.state === 'scold') momSaved(user);
      const p = players.get(user) ?? await join(user);
      if (!p) return;
      addTime(p, CONFIG.secondsPerLike * n);
      p.label.popHeart(n);
      sound.heart();
      p.look = Math.max(p.look, 1.2);
    },

    async onComment(user, text) {
      hud.feed(user, text);
      const p = players.get(user) ?? await join(user);
      p?.label.say(text, 3.5);
    },

    async onGift(user, key) {
      const gift = CONFIG.gifts[key];
      if (!gift) return;
      if (mom.on && mom.state === 'scold') momSaved(user);
      const p = players.get(user) ?? await join(user);
      if (!p) return;
      addCoins(gift.coins);
      leaderboard.add(user, gift.coins);
      addTime(p, gift.seconds);
      sound.ting();
      if (gift.item === 'noodle') {
        hud.feed(user, `tặng ${gift.label}, gọi mì tôm trứng 🍜`);
        p.label.say('Anh ơi cho bát mì!', 3);
        order(p, 'noodle');
      } else if (gift.item === 'sting') {
        hud.feed(user, `tặng ${gift.label}, gọi Sting 🥤`);
        p.label.say('Cho em lon Sting!', 3);
        order(p, 'sting');
      } else if (gift.item === 'vip') {
        if (p.state === 'walk') await waitSeated(p);
        if (isSeated(p)) makeVip(p, user, gift);
      } else if (gift.item === 'all') {
        if (p.state === 'walk') await waitSeated(p);
        if (isSeated(p)) treatEveryone(p, user, gift);
      }
    },

    blackout,
    momEvent,
    getPlayers() {
      return [...players.values()].filter((p) => p.state !== 'leave').map((p) => p.name);
    },
  };

  async function waitSeated(p) {
    while (p.state === 'walk') await wait(200);
  }

  // ---------- Vòng lặp ----------
  const tmp = new THREE.Vector3();
  const scr = {};
  function placeLabel(label, char, height) {
    tmp.copy(char.position); tmp.y += height;
    stage.toScreen(tmp, scr);
    label.setPosition(scr.x, scr.y, scr.visible);
    label.setScale(stage.labelScale);
  }

  function updateLights(dt) {
    dark.k += ((dark.on ? 1 : 0) - dark.k) * Math.min(1, dt * 4);
    const k = dark.k, L = stage.lights;
    L.hemi.intensity = L.base.hemi * (1 - 0.78 * k);
    L.sun.intensity = L.base.sun * (1 - 0.93 * k);
    L.fill.intensity = L.base.fill * (1 - 0.6 * k);
    stage.scene.background.copy(BG_DAY).lerp(BG_DARK, k * 0.85);
    if (dark.on) {
      dark.t -= dt;
      if (dark.t <= 0) endBlackout(false);
    }
  }

  function update(dt) {
    time += dt;
    for (const a of actors) a.update(dt);
    updateLights(dt);

    const frozen = dark.on;   // mất điện: đồng hồ dừng
    for (const p of [...players.values()]) {
      if (p.state === 'sit') {
        if (!frozen && !p.momHold) p.time -= dt;
        if (p.time <= 0) {
          p.time = 0;
          p.state = 'locked';
          p.lockT = CONFIG.lockGraceSeconds;
          p.label.el.classList.add('is-locked');
          drawScreen(p.st);
          p.label.say('Hết giờ rồi! Thả tim cứu em 🥺', 3);
          hud.feed(p.name, 'hết giờ, máy bị khóa');
          sound.alarm();
        }
      } else if (p.state === 'locked') {
        if (!frozen && !p.momHold) p.lockT -= dt;
        if (p.lockT <= 0) { leave(p, 'hết giờ nên rời quán'); continue; }
      }
      if (p.state === 'sit') {
        p.label.setTimer(p.momHold ? 'mẹ tới! cần tim' : fmt(p.time),
          p.momHold ? 'locked' : p.time < CONFIG.lowTimeSeconds ? 'low' : 'normal');
      } else if (p.state === 'locked') {
        p.label.setTimer(`khóa · ${Math.ceil(p.lockT)}s`, 'locked');
      }
      // Tư thế phụ: gục đầu khi bị khóa, gật gù khi ăn mì, ngó sang khi có chuyện
      if (isSeated(p) && p.char) {
        p.eat = Math.max(0, p.eat - dt);
        p.look -= dt;
        if (p.look < -rnd(8, 40)) p.look = 1.5;
        const locked = p.state === 'locked';
        const torso = locked ? 0.42 : 0;
        const head = locked ? 0.5 : p.eat > 0 ? 0.25 + Math.sin(time * 9) * 0.12 : dark.on ? -0.15 : 0;
        const turn = p.look > 0 && !locked ? (p.st.faceRot === 0 ? 0.7 : -0.7) : 0;
        p.char.setLean(torso, head, turn, dt);
      }
    }

    // Mẹ đang mắng
    if (mom.on && mom.state === 'scold') {
      mom.t -= dt;
      mom.label.setTimer(`${Math.ceil(mom.t)}s`, 'locked');
      if (mom.t <= 0) momTakes();
    }

    // Nhãn
    for (const p of visible) if (p.char) placeLabel(p.label, p.char, p.state === 'sit' || p.state === 'locked' ? 0.82 : 0.95);
    placeLabel(staff.label, staffChar, 0.95);
    if (mom.char && mom.label) placeLabel(mom.label, mom.char, 1.05);

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

    // Tiếng gõ phím nền theo số người đang chơi
    sound.setTyping(dark.on ? 0 : seated().filter((p) => p.state === 'sit').length / stations.length);
  }

  addCoins(CONFIG.startCoins);
  refreshCount();

  return { handlers, update, players };
}
