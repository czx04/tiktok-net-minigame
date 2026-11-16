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

  // Cho TikTok (giai đoạn 3) và bảng điều khiển gọi vào
  window.QuanNet = game.handlers;

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
    sim.update(dt);
    game.update(dt);
    stage.update(dt);
    stage.render();
  });
}

main().catch((err) => {
  console.error(err);
  loadingEl.textContent = 'Lỗi khi mở quán: ' + err.message;
});
