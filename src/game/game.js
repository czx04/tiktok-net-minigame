// Luật chơi: khách vào/ra, giờ chơi, khóa máy, tim, bình luận, quà, VIP, bao quán,
// nhân viên giao đồ, mất điện, mẹ đến.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Character } from '../characters/character.js';
import { CHARACTER_SKINS, STAFF_SKIN } from '../scene/assets.js';
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

export async function createGame({ stage, shop, hud, sound, leaderboard, hints, saved }) {
  const { scene } = stage;
  const stations = shop.stations;
  const players = new Map();   // name -> player (đang trong quán)
  const queue = [];            // khách đang xếp hàng chờ máy (đầu hàng ở vị trí 0)
  const visible = new Set();   // mọi khách còn trên màn hình, kể cả đang đi ra
  const actors = [];           // mọi Character cần update
  let time = 0, lastFullNotice = -99, lastJoinShot = -99, lastQueueHint = -99;
  const cam = (target, kind, seconds) => {
    const pr = CONFIG.camera.priority[kind] ?? 0;
    if (pr > 0) stage.shot(target, { seconds: seconds ?? CONFIG.camera.seconds[kind] ?? CONFIG.focusSeconds, priority: pr, kind });
  };

  // ---------- Nhân viên ----------
  const staffChar = await Character.create(STAFF_SKIN);
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
  function refreshCount() { hud.setCount(stations.filter((s) => s.player).length, stations.length, queue.length); }

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
    const mustWait = !free.length || queue.length > 0;   // đã có người xếp hàng thì không chen ngang
    if (mustWait && queue.length >= CONFIG.queue.max) {
      // Kín cả máy lẫn hàng chờ: báo tối đa 1 lần / 10 giây để feed không bị spam
      if (time - lastFullNotice > 10) { hud.feed(name, 'tới nhưng quán kín chỗ, lát quay lại nhé'); lastFullNotice = time; }
      return null;
    }
    const st = mustWait ? null : pick(free);
    const p = {
      name, st, state: mustWait ? 'wait' : 'walk', time: CONFIG.startSeconds, vip: false, lockT: 0,
      momHold: false, eat: 0, look: 0, active: 0, char: null, label: createLabel(name, 'player'),
      pending: [], pendingVip: null, waitT: 0, boost: 0, spotIdx: -1,
    };
    if (st) st.player = p; else queue.push(p);
    players.set(name, p);
    visible.add(p);
    refreshCount();
    p.label.setTimer(fmt(p.time), 'normal');

    p.char = await Character.create(pick(CHARACTER_SKINS));
    if (p.state === 'gone') { p.char.dispose(); return null; }
    scene.add(p.char.group);
    actors.push(p.char);

    if (instant && p.st) {
      p.time = rnd(25, 120);
      seat(p);
    } else if (p.state === 'wait') {
      // Kín máy: đi vào xếp hàng dọc tường trái
      p.char.position.set(DOOR.x, 0, DOOR.z);
      hud.feed(name, 'vào xếp hàng chờ máy');
      if (time - lastQueueHint > 30) { lastQueueHint = time; hints?.show('🚶 Hết máy! Thả tim hoặc tặng quà để lên đầu hàng', 6); }
      p.label.say(pick(['Hết máy rồi à?', 'Cho em xếp hàng với', 'Chờ tí vậy', 'Thả tim cho em lên trước!']), 3);
      arrangeQueue();
    } else {
      p.char.position.set(DOOR.x, 0, DOOR.z);
      hud.feed(name, 'vừa vào quán');
      // Lia cam theo khách mới đi từ cửa vào (có giãn cách để live đông không bị giật liên tục)
      if (time - lastJoinShot > CONFIG.camera.joinCooldown && stage.busyPriority < CONFIG.camera.priority.join) {
        lastJoinShot = time;
        cam(p.char.group, 'join');
      }
      await p.char.walk([
        [AISLE_X, DOOR.z], [AISLE_X, st.lineZ], [st.seat.x, st.lineZ], [st.seat.x, st.seat.z],
      ], CONFIG.walkSpeed);
      if (p.state === 'walk') seat(p);
    }
    return p;
  }

  // ---------- Ảnh đại diện TikTok trên màn hình máy ----------
  const avatars = new Map();   // tên -> HTMLImageElement đã tải xong
  function applyAvatar(p) {
    const img = avatars.get(p.name);
    if (img && p.st && p.st.player === p) { p.st.screen.setAvatar(img); drawScreen(p.st); }
  }
  function setAvatar(user, src) {
    if (!src || avatars.has(user)) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      avatars.set(user, img);
      if (avatars.size > 400) avatars.delete(avatars.keys().next().value);
      const p = players.get(user);
      if (p) applyAvatar(p);
    };
    img.src = src;
  }

  function seat(p) {
    const { st, char } = p;
    p.state = 'sit';
    applyAvatar(p);
    char.path = [];
    char.position.set(st.seat.x, 0, st.seat.z);
    char.group.rotation.y = st.faceRot;
    char.faceTo(st.faceRot);
    char.setLoop('sit');
    drawScreen(st);
    // Món đã gọi / ghế VIP được tặng lúc còn đang đi hoặc đang xếp hàng
    for (const kind of p.pending.splice(0)) order(p, kind);
    if (p.pendingVip) { const g = p.pendingVip; p.pendingVip = null; makeVip(p, p.name, g); }
  }

  // ---------- Hàng chờ khi quán kín máy ----------
  const queueSpot = (i) => [CONFIG.queue.x, CONFIG.queue.headZ + i * CONFIG.queue.gap];

  /** Xếp lại hàng: ai được tim/quà nhiều hơn đứng trước; mỗi người đi tới ô của mình. */
  function arrangeQueue() {
    queue.sort((a, b) => b.boost - a.boost);   // sort ổn định: bằng điểm thì ai tới trước đứng trước
    queue.forEach((p, i) => {
      p.label.setTimer(`chờ #${i + 1}`, 'normal');
      if (p.spotIdx === i || !p.char) return;
      const first = p.spotIdx === -1;
      p.spotIdx = i;
      const [x, z] = queueSpot(i);
      const path = first ? [[AISLE_X, DOOR.z], [AISLE_X, z], [x, z]] : [[x, z]];
      p.char.walk(path, CONFIG.walkSpeed).then(() => { if (p.state === 'wait') p.char.faceTo(Math.PI / 2); });
    });
    refreshCount();
  }

  /** Có máy trống → người đầu hàng vào ngồi. */
  function seatNext() {
    while (queue.length) {
      const free = stations.filter((st) => !st.player);
      if (!free.length) break;
      const p = queue.shift();
      if (!p.char) { queue.unshift(p); break; }   // model chưa tải xong, thử lại ở khung sau
      const st = pick(free);
      p.st = st; st.player = p; p.state = 'walk'; p.spotIdx = -1;
      p.label.setTimer(fmt(p.time), 'normal');
      p.label.say('Tới lượt mình rồi! 🎉', 2.5);
      p.active = time + 2;
      hud.feed(p.name, 'hết phải chờ, vào máy');
      const pos = p.char.position;
      p.char.walk([[AISLE_X, pos.z], [AISLE_X, st.lineZ], [st.seat.x, st.lineZ], [st.seat.x, st.seat.z]], CONFIG.walkSpeed)
        .then(() => { if (p.state === 'walk' && st.player === p) seat(p); });
    }
    arrangeQueue();
  }

  async function leave(p, why) {
    if (p.state === 'leave' || p.state === 'gone') return;
    const { st } = p;
    const wasWalking = p.state === 'walk' || p.state === 'wait';
    const qi = queue.indexOf(p);
    if (qi >= 0) queue.splice(qi, 1);
    p.state = 'leave';
    p.momHold = false;
    players.delete(p.name);
    if (st) {
      st.player = null;
      st.screen.setAvatar(null);
      if (p.vip) st.setVip(false);
      drawScreen(st);
    }
    seatNext();   // máy vừa trống → người đầu hàng vào thay (đồng thời dồn hàng)
    p.label.setTimer('', 'hidden');
    p.label.el.classList.remove('is-locked', 'is-mom-target');
    if (why) hud.feed(p.name, why);
    if (!p.char) { p.state = 'gone'; visible.delete(p); p.label.remove(); return; }
    const pos = p.char.position;
    const route = wasWalking || !st ? [] : [[st.seat.x, st.lineZ]];
    await p.char.walk([...route, [AISLE_X, wasWalking || !st ? pos.z : st.lineZ], [AISLE_X, DOOR.z], [DOOR.x, DOOR.z]], CONFIG.walkSpeed);
    p.state = 'gone';
    visible.delete(p);
    p.char.dispose();
    actors.splice(actors.indexOf(p.char), 1);
    p.label.remove();
  }

  // ---------- Nhân viên giao đồ (hàng đợi) ----------
  function order(p, kind) {
    // Chưa ngồi vào máy (đang đi / đang xếp hàng) → ghi nợ, ngồi xuống mới gọi
    if (!isSeated(p)) { p.pending.push(kind); return; }
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
    cam(p.char.group, 'vip', 3);
  }

  async function treatEveryone(p, user, gift) {
    hud.feed(user, 'BAO CẢ QUÁN 🎉');
    bigAnnounce(`${user} BAO CẢ QUÁN!`, `Mỗi người một lon Sting và +${Math.round(gift.seconds / 60)} phút`, 5);
    confetti(4);
    sound.fanfare();
    cam(p.char.group, 'big', CONFIG.focusSeconds);
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
    if (eventBusy()) return;
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
    if (eventBusy()) return;
    const cands = [...players.values()].filter((p) => p.state === 'sit');
    if (!cands.length) return;
    const v = pick(cands);
    mom.on = true; mom.victim = v; mom.state = 'in';
    mom.char = await Character.create(pick(MOM_SKINS), { scale: 1.12 });
    mom.char.position.set(DOOR.x, 0, DOOR.z);
    cam(mom.char.group, 'mom', 12);   // đi theo mẹ từ cửa vào
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
    cam({ x: st.seat.x, z: st.seat.z }, 'mom', CONFIG.mom.scoldSeconds);
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

  // ---------- Sự kiện ngẫu nhiên mới ----------
  const happy = { on: false, t: 0 };
  const ship = { on: false };
  const duel = { on: false, a: null, b: null, votes: [0, 0], voters: new Set(), t: 0 };
  const eventBusy = () => dark.on || mom.on || happy.on || ship.on || duel.on;

  /** Giờ vàng: trong N giây, mỗi tim được nhân thời gian */
  function happyHour() {
    if (eventBusy()) return;
    const ev = CONFIG.events.happyHour;
    happy.on = true; happy.t = ev.seconds;
    hud.banner('⭐ GIỜ VÀNG! ⭐', `Mỗi tim = ${CONFIG.secondsPerLike * ev.multiplier} giây trong ${ev.seconds} giây`, 4);
    hints?.show(`⭐ Giờ vàng: tim x${ev.multiplier} thời gian!`, ev.seconds);
    hud.feed('Quán', 'bật giờ vàng ⭐');
    sound.ting();
    shop.sign.material.emissive?.set(0x553300);
  }
  function endHappyHour() {
    happy.on = false;
    shop.sign.material.emissive?.set(0x000000);
    hud.feed('Quán', 'hết giờ vàng');
  }

  /** Shipper mang trà đá tới, mời ngẫu nhiên vài khách */
  async function shipper() {
    if (eventBusy()) return;
    const ev = CONFIG.events.shipper;
    ship.on = true;
    const c = await Character.create(ev.skin);
    c.position.set(DOOR.x, 0, DOOR.z);
    scene.add(c.group); actors.push(c);
    const label = createLabel('Shipper 🛵', 'npc');
    label.setTimer('', 'hidden');
    ship.char = c; ship.label = label;
    const box = await makeItem('tea'); box.position.set(0, 0.42, 0.22); c.group.add(box);
    hud.feed('Shipper', 'mang trà đá tới quán 🧋');
    cam(c.group, 'shipper', 5);
    label.say('Trà đá đây! Quán mình ai đặt nè?', 3);
    await c.walk([[AISLE_X, DOOR.z], [AISLE_X, -1.7], [-2.2, -2.15]], 1.6);
    c.faceTo(Math.PI); c.gesture('interact-right', 'idle');
    await wait(700);
    c.group.remove(box);
    const lucky = seated().sort(() => Math.random() - 0.5).slice(0, ev.count);
    hud.banner('🧋 Trà đá miễn phí!', lucky.length ? `Mời ${lucky.slice(0, 2).map((p) => p.name).join(', ')}${lucky.length > 2 ? ` và ${lucky.length - 2} người nữa` : ''}` : 'Quán mời cả nhà', 4);
    sound.ting();
    for (const p of lucky) {
      if (!isSeated(p)) continue;
      putOnDesk(p, 'tea', await makeItem('tea'));
      p.label.say('Trà đá free, ngon! 🧋', 2.5);
      p.active = time + 3;
      react(p);
      await wait(250);
    }
    label.say('Chúc cả nhà chơi vui!', 2);
    await c.walk([[AISLE_X, -1.7], [AISLE_X, DOOR.z], [DOOR.x, DOOR.z]], 1.8);
    c.dispose(); actors.splice(actors.indexOf(c), 1); label.remove();
    ship.on = false; ship.char = null; ship.label = null;
  }

  /** Solo: 2 người, người xem bình luận 1 hoặc 2 để cổ vũ */
  function duelEvent() {
    if (eventBusy()) return;
    const cands = seated().filter((p) => p.state === 'sit').sort(() => Math.random() - 0.5);
    if (cands.length < 2) return;
    const [a, b] = cands;
    Object.assign(duel, { on: true, a, b, votes: [0, 0], voters: new Set(), t: CONFIG.events.duel.seconds });
    for (const [p, n] of [[a, 1], [b, 2]]) {
      p.label.el.classList.add('is-focus');
      p.label.say(`Số ${n}! Cổ vũ mình nha 💪`, 3);
      p.active = time + CONFIG.events.duel.seconds;
    }
    showDuel();
    hints?.show('⚔️ Bình luận 1 hoặc 2 để cổ vũ!', CONFIG.events.duel.seconds);
    hud.feed('Quán', `mở solo: ${a.name} vs ${b.name} ⚔️`);
    sound.ting();
    cam({ x: (a.st.seat.x + b.st.seat.x) / 2, z: (a.st.seat.z + b.st.seat.z) / 2 }, 'duel', 5);
  }
  function showDuel() {
    hud.banner(`⚔️ SOLO: ${duel.a.name} (1) vs ${duel.b.name} (2)`,
      `Bình luận 1 hoặc 2 · ${duel.votes[0]} - ${duel.votes[1]} · còn ${Math.ceil(duel.t)}s`, 0);
  }
  function castVote(user, text) {
    const t = String(text ?? '').trim().toLowerCase();
    let pick = t === '1' ? 0 : t === '2' ? 1 : -1;
    if (pick < 0 && t === duel.a.name.toLowerCase()) pick = 0;
    if (pick < 0 && t === duel.b.name.toLowerCase()) pick = 1;
    if (pick < 0 || duel.voters.has(user)) return;   // mỗi người 1 phiếu
    duel.voters.add(user);
    duel.votes[pick]++;
    (pick === 0 ? duel.a : duel.b).label.popHeart(1);
    showDuel();
  }
  function endDuel() {
    const { a, b, votes } = duel;
    duel.on = false;
    a.label.el.classList.remove('is-focus'); b.label.el.classList.remove('is-focus');
    if (votes[0] === votes[1]) {
      hud.banner('⚔️ Hòa!', 'Cả hai cùng được +1 phút', 3.5);
      for (const p of [a, b]) if (isSeated(p)) { addTime(p, 60); react(p); }
      return;
    }
    const [win, lose] = votes[0] > votes[1] ? [a, b] : [b, a];
    if (!isSeated(win)) { hud.hideBanner(); return; }
    addTime(win, CONFIG.events.duel.prizeSeconds);
    hud.banner(`🏆 ${win.name} thắng solo!`, `${Math.max(...votes)} - ${Math.min(...votes)} · thưởng +${Math.round(CONFIG.events.duel.prizeSeconds / 60)} phút`, 4);
    win.label.say('Thắng rồi!! 🏆', 3);
    if (isSeated(lose)) lose.label.say('Thua rồi 😭', 3);
    react(win);
    confetti(2);
    sound.fanfare();
    cam(win.char.group, 'duel', 3);
  }

  /** Chọn ngẫu nhiên một sự kiện theo trọng số trong config */
  function randomEvent() {
    if (eventBusy()) return;
    const table = { blackout, mom: momEvent, happyHour, shipper, duel: duelEvent };
    const w = Object.entries(CONFIG.events.weights).filter(([k, v]) => table[k] && v > 0);
    let r = Math.random() * w.reduce((s, [, v]) => s + v, 0);
    for (const [k, v] of w) { if ((r -= v) <= 0) return table[k](); }
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
      addTime(p, CONFIG.secondsPerLike * n * (happy.on ? CONFIG.events.happyHour.multiplier : 1));
      p.label.popHeart(n);
      // Đang xếp hàng: được thả tim thì lên trước
      if (p.state === 'wait') { p.boost += n; arrangeQueue(); }
      sound.heart();
      p.look = Math.max(p.look, 1.2);
      p.active = time;
    },

    async onComment(user, text) {
      if (duel.on) castVote(user, text);
      hud.feed(user, text);
      const p = players.get(user) ?? await join(user);
      p?.label.say(text, 3.5);
      if (p) { p.active = time + 2; cam(p.char?.group ?? p.st.seat, 'comment'); }
    },

    /** coins: số xu thật (kim cương TikTok); bỏ trống thì dùng xu cấu hình của loại quà */
    async onGift(user, key, coinsValue) {
      const gift = CONFIG.gifts[key];
      if (!gift) return;
      if (mom.on && mom.state === 'scold') momSaved(user);
      const p = players.get(user) ?? await join(user);
      if (!p) return;
      const value = Number.isFinite(coinsValue) && coinsValue > 0 ? coinsValue : gift.coins;
      leaderboard.add(user, value);
      addTime(p, gift.seconds);
      if (p.state === 'wait') { p.boost += 1000 + value; arrangeQueue(); p.label.say('Tặng quà nên được lên đầu hàng 😎', 3); }
      p.active = time + 4;
      sound.ting();
      if (gift.item === 'noodle') {
        hud.feed(user, `tặng ${gift.label}, gọi mì tôm trứng 🍜`);
        p.label.say('Anh ơi cho bát mì!', 3);
        order(p, 'noodle');
        cam(p.char.group, 'gift');
      } else if (gift.item === 'sting') {
        hud.feed(user, `tặng ${gift.label}, gọi Sting 🥤`);
        p.label.say('Cho em lon Sting!', 3);
        order(p, 'sting');
        cam(p.char.group, 'gift');
      } else if (gift.item === 'vip') {
        // Chưa ngồi vào máy thì ghi nhận, ngồi xuống sẽ lên ghế VIP
        if (isSeated(p)) makeVip(p, user, gift);
        else { p.pendingVip = gift; hud.feed(user, `tặng ${gift.label}, sẽ lên ghế VIP khi có máy 👑`); }
      } else if (gift.item === 'all') {
        treatEveryone(p, user, gift);
      }
    },

    blackout,
    momEvent,
    happyHour,
    shipper,
    duelEvent,
    randomEvent,
    /** Đang có bình chọn (solo) → các lựa chọn để giả lập bình luận theo */
    voteOptions: () => (duel.on ? ['1', '2'] : null),
    setAvatar,
    getPlayers() {
      return [...players.values()].filter((p) => p.state !== 'leave').map((p) => p.name);
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

  // ---------- Chống chồng nhãn: nhãn quan trọng hơn hiện rõ, nhãn bị che thì mờ đi ----------
  let declutterT = 0;
  function declutter(dt) {
    declutterT -= dt;
    if (declutterT > 0) return;
    declutterT = 0.15;   // camera lia liên tục → kiểm thường hơn
    const items = [];
    for (const p of visible) {
      if (!p.char || p.label.el.hidden) continue;
      let score = Math.max(0, 8 - (time - p.active)) * 10;
      if (p.vip) score += 40;
      if (p.state === 'locked' || p.momHold) score += 60;
      if (p.state === 'walk') score += 30;
      // Xoay vòng: mỗi vài giây một nhóm nhãn khác được ưu tiên, để ai cũng có lúc hiện tên
      score += ((time / 4 + (p.seed ??= Math.random())) % 1) * 25;
      items.push({ label: p.label, score });
    }
    items.push({ label: staff.label, score: 25 });
    if (mom.label) items.push({ label: mom.label, score: 200 });
    items.sort((a, b) => b.score - a.score);
    const kept = [];
    const gap = innerWidth * 0.004;
    for (const it of items) {
      const plate = it.label.el.querySelector('.label-plate');
      if (!plate) continue;
      // Tính cả bong bóng lời thoại (đang hiện) + chừa khe nhỏ giữa các nhãn
      const pr = plate.getBoundingClientRect();
      const r = { left: pr.left - gap, right: pr.right + gap, top: pr.top - gap, bottom: pr.bottom + gap };
      const bubble = it.label.el.querySelector('.label-bubble');
      if (bubble && !bubble.hidden) {
        const br = bubble.getBoundingClientRect();
        r.left = Math.min(r.left, br.left); r.right = Math.max(r.right, br.right); r.top = Math.min(r.top, br.top);
      }
      const hit = kept.some((k) => r.left < k.right && r.right > k.left && r.top < k.bottom && r.bottom > k.top);
      it.label.el.classList.toggle('is-dim', hit);
      it.label.el.classList.toggle('is-hidden-overlap', hit && stage.portrait);
      if (!hit) kept.push(r);
    }
  }

  function update(dt) {
    time += dt;
    for (const a of actors) a.update(dt);
    updateLights(dt);

    // Hàng chờ: chờ quá lâu thì bỏ về; có máy trống thì gọi người đầu hàng
    for (const p of [...queue]) {
      p.waitT += dt;
      if (p.waitT > CONFIG.queue.maxWaitSeconds) leave(p, 'chờ lâu quá nên về');
    }
    if (queue.length && stations.some((st) => !st.player)) seatNext();

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
          p.active = time + 3;
          cam(p.char.group, 'locked');
          hints?.show(`⏰ ${p.name} hết giờ — thả tim cứu bạn ấy!`, 5);
        }
      } else if (p.state === 'locked') {
        if (!frozen && !p.momHold) p.lockT -= dt;
        if (p.lockT <= 0) { leave(p, 'hết giờ nên rời quán'); continue; }
      }
      if (p.state === 'sit') {
        const low = p.time < CONFIG.lowTimeSeconds;
        const compact = stage.portrait && CONFIG.ui.portraitTimerOnlyWhenLow && !p.momHold && !low;
        p.label.setTimer(p.momHold ? 'mẹ tới! cần tim' : compact ? '' : fmt(p.time),
          p.momHold ? 'locked' : compact ? 'hidden' : low ? 'low' : 'normal');
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

    // Sự kiện mới đang chạy
    if (happy.on && (happy.t -= dt) <= 0) endHappyHour();
    if (duel.on) {
      duel.t -= dt;
      if (!isSeated(duel.a) || !isSeated(duel.b)) { duel.on = false; duel.a.label.el.classList.remove('is-focus'); duel.b.label.el.classList.remove('is-focus'); hud.hideBanner(); }
      else if (duel.t <= 0) endDuel();
      else if (Math.ceil(duel.t) !== Math.ceil(duel.t + dt)) showDuel();
    }
    if (ship.char && ship.label) placeLabel(ship.label, ship.char, 0.95);

    // Mẹ đang mắng
    if (mom.on && mom.state === 'scold') {
      mom.t -= dt;
      mom.label.setTimer(`${Math.ceil(mom.t)}s`, 'locked');
      if (mom.t <= 0) momTakes();
    }

    // Nhãn
    for (const p of visible) if (p.char) placeLabel(p.label, p.char, p.state === 'sit' || p.state === 'locked' ? 0.82 : 0.95);
    placeLabel(staff.label, staffChar, 0.95);
    if (CONFIG.ui.declutterLabels) declutter(dt);
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

  refreshCount();

  return { handlers, update, players };
}
