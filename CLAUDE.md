# Quán Net Live — ghi chú cho các phiên sau

Đặc tả gốc: `PROMPT.md` (đọc trước). Trả lời người dùng bằng tiếng Việt, ngắn gọn. Làm từng giai đoạn, xong giai đoạn nào thì chạy thử, chụp màn hình, báo rồi mới sang giai đoạn sau.

## Trạng thái
- Giai đoạn 1–4 đã xong. Chưa thử với một buổi TikTok LIVE thật vì chưa có username. Đường truyền đã thử bằng `cd server && npm run fake`.
- Giai đoạn 2: luật chơi nằm ở `src/game/game.js`, gồm khóa máy, VIP, bao quán, mất điện và mẹ đến. Gục đầu / ăn mì làm bằng cách xoay xương `head`/`torso` (`Character.setLean`), vì animation `sit` không điều khiển 2 xương này.
- Giai đoạn 3:
  - `server/index.js` dùng tiktok-live-connector 2.5.0. Dữ liệu thô là proto v3: tên đăng nhập có thể nằm ở `displayId` thay cho `uniqueId`, quà nằm ở `data.gift.{name,diamondCount,type}`. Server đọc phòng thủ cả hai kiểu.
  - Phía client có `src/live/tiktok.js` (WebSocket) và `src/live/gifts.js` (ánh xạ quà theo tên, nếu không khớp thì theo kim cương).
  - Khi đã nối TikTok, giả lập chạy chậm lại `simSlowdownWhenLive` lần.
- Giai đoạn 4: `README.md` và `docs/len-song.md`. URL `?clean` ẩn sẵn thanh giả lập để dùng với OBS / LIVE Studio.

## Chạy
- `npm run dev` → http://localhost:5173. Lúc dev có `window.__step(giây, kèmGiảLập)` để tua nhanh thời gian khi kiểm thử, cùng `window.__game` và `window.__stage`.
- `window.QuanNet` = các hàm `onJoin/onLike/onComment/onGift/blackout/momEvent`. Giai đoạn 3 (TikTok) gọi vào đây.
- Chụp màn hình không cần mở trình duyệt: dùng Chrome headless `--virtual-time-budget=15000 --screenshot=...`. Lưu ảnh vào `screenshots/`.

## Quyết định quan trọng
- Bố cục (đơn vị thế giới, 1 = một ô sàn) nằm ở đầu `src/scene/shop.js`. Phòng rộng x∈[-4,3], z∈[-3.5,3.5]. Tường chỉ dựng ở phía sau (z−) và bên trái (x−) để camera nhìn xuyên vào. Cửa ở tường trái tại z=2; lối đi dọc nằm ở `AISLE_X=-2.65`; quầy ở góc trong cùng bên trái.
- Mỗi máy (station) có các trường `seat` (chỗ ngồi), `lineZ` (đường đi phía sau ghế) và `faceRot`. Khách đi theo đường cửa → lối đi → lineZ → ghế.
- Model Kenney có gốc tọa độ ở góc. `makeProp()` bọc model lại và căn về tâm đáy bằng Box3, nên mọi tọa độ trong code đều là tâm.
- Nhân vật nhìn về +z. Ở mỗi máy, phía người ngồi là +z cục bộ, màn hình hướng +z cục bộ. Hàng phía bắc của mỗi đảo xoay π nên mặt người hướng về camera, hàng phía nam quay lưng về camera nên thấy được màn hình.
- Màn hình máy là một `PlaneGeometry` dùng `CanvasTexture` (`src/scene/screen.js`), đặt đè lên trước model `computerScreen`. Có các chế độ idle/play/locked/off. Đã có sẵn chỗ để gắn ảnh đại diện TikTok (`setAvatar`).
- Camera Orthographic, có 2 góc nhìn trong `src/scene/stage.js`:
  - Khung ngang: nhìn isometric toàn phòng.
  - Khung dọc (<0.85): nhìn chính diện hơn và cắt bớt tường hai bên để nhân vật to hơn. Lý do: phần trên và dưới khung dọc vốn bị giao diện TikTok che.
- Bảng tên dùng HTML (`src/ui/labels.js`), vị trí chiếu từ thế giới 3D ra bằng `stage.toScreen`, tỉ lệ lấy theo `stage.labelScale`.
- Mọi số liệu cân bằng đều nằm trong `src/config.js`.
- three.js r187 đã bỏ `PCFSoftShadowMap` nên dùng `PCFShadowMap`.

## Chia việc với Codex
Người dùng muốn giao các việc code "tay chân", không cần suy nghĩ nhiều, cho Codex CLI:
`codex exec --skip-git-repo-check -s workspace-write -o <file> - < brief.md`
Brief phải chỉ rõ những file được phép sửa và API cần tuân theo. Phần UI và giả lập (`src/ui/*`, `src/live/simulator.js`) do Codex viết theo cách này.
