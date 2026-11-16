// Điểm khởi động: dựng cảnh, luật chơi, giao diện, giả lập.
import { CONFIG } from './config.js';
import { createStage } from './scene/stage.js';
import { buildShop } from './scene/shop.js';
import { preloadAll } from './scene/assets.js';
import { createGame } from './game/game.js';
import { createHud } from './ui/hud.js';
import { createSimBar } from './ui/simBar.js';
import { createSimulator } from './live/simulator.js';
import { createSound } from './ui/sound.js';
import { createMuteButton } from './ui/muteButton.js';
import { createLeaderboard } from './ui/leaderboard.js';
import { connectLive } from './live/tiktok.js';
import { mapGift } from './live/gifts.js';
import { showSafeZones } from './ui/safeZones.js';

const loadingEl = document.getElementById('loading');

async function main() {
  const stage = createStage(document.getElementById('scene'));

  // Chờ font để chữ vẽ trên màn hình máy/biển hiệu đúng font
  await Promise.race([
    Promise.all([
      document.fonts.load('800 30px "Be Vietnam Pro"'),
      document.fonts.load('600 20px "Be Vietnam Pro"'),
    ]),
    new Promise((r) => setTimeout(r, 2000)),
  ]).catch(() => {});

  await preloadAll((k) => { loadingEl.textContent = `Đang mở quán… ${Math.round(k * 100)}%`; });
  const shop = await buildShop(stage.scene);
  const hud = createHud(document.getElementById('hud'));
  const leaderboard = createLeaderboard(document.getElementById('hud'));
  const sound = createSound();
  createMuteButton(document.body, sound);
  const game = await createGame({ stage, shop, hud, sound, leaderboard });

  const sim = createSimulator(game.handlers, CONFIG);
  createSimBar(document.getElementById('simbar'), {
    autoRun: CONFIG.autoRun,
    onAction(type, value) {
      if (type === 'auto') sim.setAuto(value);
      else sim.trigger(type);
    },
  });
  sim.seedInitial();

  // ?safe: xem trước vùng bị giao diện TikTok che trên điện thoại
  if (new URLSearchParams(location.search).has('safe')) showSafeZones();

  // ?clean trên URL (dùng cho OBS / LIVE Studio): ẩn sẵn thanh giả lập, vẫn tự chạy
  if (new URLSearchParams(location.search).has('clean')) {
    const bar = document.getElementById('simbar');
    bar.hidden = true;
    document.body.classList.add('sim-hidden');
  }

  // Cho bảng điều khiển / công cụ khác gọi vào
  window.QuanNet = game.handlers;

  // ----- TikTok Live: nhận sự kiện thật từ server (server/index.js) -----
  const live = { connected: false };
  if (CONFIG.live.enabled) {
    const chip = document.createElement('div');
    chip.id = 'live-chip';
    document.body.append(chip);
    const proxy = (url) => url ? `http://${location.hostname}:${CONFIG.live.port}/avatar?url=${encodeURIComponent(url)}` : null;
    connectLive({
      url: `ws://${location.hostname}:${CONFIG.live.port}/ws`,
      onStatus(s) {
        live.connected = !!(s.online && s.connected);
        chip.className = live.connected ? 'on' : s.online ? 'wait' : 'off';
        chip.textContent = live.connected ? `● LIVE @${s.username}`
          : s.online ? (s.username ? `Đang chờ @${s.username} lên live…` : 'Server chưa có username (.env)')
          : 'Chỉ giả lập';
      },
      onEvent(m) {
        const user = m.name || m.user;
        if (!user) return;
        const h = game.handlers;
        if (m.avatar) h.setAvatar(user, proxy(m.avatar));
        if (m.type === 'join') h.onJoin(user);
        else if (m.type === 'like') h.onLike(user, Math.max(1, Math.min(m.count || 1, 50)));
        else if (m.type === 'comment') h.onComment(user, String(m.text ?? '').slice(0, 120));
        else if (m.type === 'gift') {
          const g = mapGift(m.giftName, m.diamonds || 0, m.count || 1);
          if (!g) return;
          // Xu góp mục tiêu = kim cương thật, chia đều cho số lần gọi món
          const each = (m.diamonds || 0) / g.times;
          (async () => { for (let i = 0; i < g.times; i++) { await h.onGift(user, g.key, each); await new Promise((r) => setTimeout(r, 400)); } })();
        }
      },
    });
  }

  document.body.classList.add('ready');

  // Chỉ khi chạy dev: tua nhanh thời gian để kiểm thử (window.__step(5) = chạy 5 giây)
  if (import.meta.env.DEV) {
    window.__step = (sec, withSim = false) => {
      for (let t = 0; t < sec; t += 1 / 30) {
        if (withSim) sim.update(1 / 30);
        game.update(1 / 30);
        stage.update(1 / 30);
      }
      stage.render();
    };
    window.__game = game;
    window.__stage = stage;
  }

  let last = performance.now();
  stage.renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!live.connected) sim.update(dt);
    else if (CONFIG.live.simWhileLive) sim.update(dt / CONFIG.live.simSlowdownWhenLive);
    game.update(dt);
    stage.update(dt);
    stage.render();
  });
}

main().catch((err) => {
  console.error(err);
  loadingEl.textContent = 'Lỗi khi mở quán: ' + err.message;
});
