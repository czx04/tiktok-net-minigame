# Quán Net Live — ghi chú cho các phiên sau

Đặc tả gốc: `PROMPT.md` (đọc trước). Trả lời người dùng bằng tiếng Việt, ngắn gọn. Làm từng giai đoạn, xong giai đoạn nào thì chạy thử, chụp màn hình, báo rồi mới sang giai đoạn sau.

**Bắt buộc:** việc code/công cụ đơn giản phải giao cho Codex CLI, xem mục "QUY TẮC: giao việc đơn giản cho Codex CLI" ở cuối file.

## Trạng thái
- Giai đoạn 1–4 đã xong. Chưa thử với một buổi TikTok LIVE thật vì chưa có username. Đường truyền đã thử bằng `cd server && npm run fake`.
- Ghế/nhân vật: animation `sit` của Kenney ngồi bệt sàn → `Character.update` nâng `SEAT_HEIGHT` khi đang `sit`; ghế `chairDesk` phóng ×1.4/1.25 trong `makeStation` để không bị nhân vật chibi che. Nhân viên dùng skin `STAFF_SKIN` (male-f), skin này bị bỏ khỏi danh sách khách.
- Giai đoạn 2: luật chơi nằm ở `src/game/game.js`, gồm khóa máy, VIP, bao quán, mất điện và mẹ đến. Gục đầu / ăn mì làm bằng cách xoay xương `head`/`torso` (`Character.setLean`), vì animation `sit` không điều khiển 2 xương này.
- Giai đoạn 3:
  - `server/index.js` dùng tiktok-live-connector 2.5.0. Dữ liệu thô là proto v3: tên đăng nhập có thể nằm ở `displayId` thay cho `uniqueId`, quà nằm ở `data.gift.{name,diamondCount,type}`. Server đọc phòng thủ cả hai kiểu.
  - Phía client có `src/live/tiktok.js` (WebSocket) và `src/live/gifts.js` (ánh xạ quà theo tên, nếu không khớp thì theo kim cương).
  - Mặc định KHÔNG có khách giả (`sim.fakeGuests: false`) và KHÔNG tự bắn sự kiện (`sim.randomEvents: false`): quán chỉ chạy bằng người xem thật. Thanh giả lập vẫn bấm tay được. `sim.update(dt, {guests, events})`. Lưu ý kiểm thử: `seat()` chạy qua Promise nên `__step` dài 1 lần sẽ không cho khách ngồi — chia nhiều lần `__step` có `await`.
- Giai đoạn 4: `README.md` và `docs/len-song.md`. URL `?clean` ẩn sẵn thanh giả lập để dùng với OBS / LIVE Studio.

## Chạy
- `npm run dev` → http://localhost:5173. Lúc dev có `window.__step(giây, kèmGiảLập)` để tua nhanh thời gian khi kiểm thử, cùng `window.__game` và `window.__stage`.
- `window.QuanNet` = các hàm `onJoin/onLike/onComment/onGift/blackout/momEvent`. Giai đoạn 3 (TikTok) gọi vào đây.
- Chụp màn hình không cần mở trình duyệt: dùng Chrome headless `--virtual-time-budget=15000 --screenshot=...`. Lưu ảnh vào `screenshots/`.

## Tối ưu cho người xem điện thoại
- OBS / LIVE Studio render trang ở 1080×1920 px CSS với DPR 1, sau đó TikTok thu nhỏ khoảng 2,8 lần. Vì vậy cỡ chữ phải tính theo `vw` (khung dọc) hoặc `vh` (khung ngang), KHÔNG được chặn trần bằng px. Muốn kiểm tra thì chụp headless với `--window-size=1080,1920 --force-device-scale-factor=1`.
- Khung dọc: `fit()` đặt quán vào `CONFIG.camera.portraitSafe` để né thanh trên, khu bình luận và nút quà của TikTok. JS gắn class `body.portrait`. Thêm `?safe` vào URL để vẽ lớp mô phỏng các vùng bị TikTok che.
- Camera dùng `stage.shot(target, {priority, seconds})`, có hàng đợi ưu tiên, `target` có thể là Object3D để đi theo nhân vật đang di chuyển. Bảng ưu tiên nằm ở `CONFIG.camera.priority`.
- Khung dọc: vùng an toàn là hình chữ nhật nằm ngang (`portraitSafe` top 0.215 → bottom 0.665, trên mép khung bình luận). `VIEWS.portrait.box` chỉ ôm 20 máy + hàng chờ (cắt bớt quầy/tường sau), tâm camera = tâm box. Lúc rảnh camera tự đi vòng theo `CONFIG.camera.portraitTour` (toàn cảnh → dãy trong → dãy ngoài → quầy); sự kiện vẫn chen ngang qua `shot()`. Chrome headless (virtual time) KHÔNG chạy tour — kiểm bằng khung trình duyệt + `__step`.
- Chống chồng nhãn (`declutter` trong `game.js`, chạy 4 lần/giây): nhãn bị che thì làm mờ, ở khung dọc thì ẩn hẳn. Điểm ưu tiên có thêm thành phần xoay vòng theo thời gian để mọi nhãn đều có lúc hiện. Vùng va chạm gồm cả bong bóng lời thoại + khe 0.4vw. Khung dọc: chữ nhãn 2.6vw (≈10px trên điện thoại), `labelScale` chỉ tới 1.12 khi zoom.

## Hàng chờ và hướng dẫn
- Khi kín máy, khách có trạng thái `wait`: `p.st = null`, đứng trong mảng `queue` (trong `game.js`), vị trí lấy từ `CONFIG.queue`. Mỗi lần có máy trống, `leave()` gọi `seatNext()`.
- Thả tim / tặng quà làm tăng `p.boost`, rồi `arrangeQueue()` sắp lại hàng (sort ổn định).
- Gọi món hoặc lên VIP khi chưa ngồi thì lưu vào `p.pending` / `p.pendingVip`, `seat()` sẽ xử lý sau.
- Dải hướng dẫn: `src/ui/hints.js` (Codex viết), có `hints.show(text, s)` để chen ngang. Khung ngang đặt ở khoảng trống bên trái; khung dọc đặt ở góc trên-trái (13.5vh), `portraitSafe.top` = 0.215.

## Sự kiện, lưu tiến độ, hiệu năng
- Sự kiện: `randomEvent()` chọn theo `CONFIG.events.weights` trong số blackout / mom / happyHour / shipper / duel. Mỗi lúc chỉ chạy 1 sự kiện (`eventBusy()`). Solo nhận phiếu qua bình luận "1"/"2", mỗi người 1 phiếu. Giả lập tự bình chọn thông qua `handlers.voteOptions()`.
- Lưu tiến độ: `src/game/persist.js` lưu vào localStorage (`quannet.session.v1`) chỉ còn `{leaders}` (Top đại gia). Đã bỏ hẳn mục tiêu chung / điều hòa / mở tầng 2. `?reset` xóa dữ liệu rồi tự bỏ `?reset` khỏi URL.
- Rò rỉ bộ nhớ: texture xương (bone texture) của SkinnedMesh không tự giải phóng, nên `Character.dispose()` phải gọi `skeleton.dispose()`. KHÔNG dispose geometry / material / texture màu vì các bản clone dùng chung. Đã thử 20 phút giả lập với cường độ cao: texture đứng yên khoảng 100, heap dao động 41–49MB.
- Hiệu năng (Mac, khung 1024×768, DPR 2): luật chơi khoảng 3,6ms và vẽ khoảng 3,4ms mỗi khung hình, khoảng 870 lệnh vẽ. Nếu máy phát live yếu thì gộp mesh tĩnh (sàn, bàn).

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

## QUY TẮC: giao việc đơn giản cho Codex CLI
Người dùng yêu cầu: việc code hoặc dùng công cụ đơn giản thì **giao cho Codex CLI làm**, Codex không tự làm. Codex giữ vai trò lên kế hoạch, viết brief, kiểm tra kết quả.

**Giao cho Codex** (việc rõ ràng, ít phải suy nghĩ):
- Viết hàm/module nhỏ khi đã biết rõ đầu vào, đầu ra, API.
- Sửa lỗi nhỏ đã biết nguyên nhân và chỗ sửa.
- Thêm nút, thêm mục UI, chỉnh CSS, đổi chữ, đổi số trong `config.js`.
- Đổi tên, di chuyển, sắp xếp file; chép model từ `assets/` sang `public/`.
- Code lặp lại theo mẫu có sẵn (thêm sự kiện mới giống sự kiện cũ, thêm món ăn mới…).
- Viết/cập nhật README, tài liệu, comment.
- Chạy lệnh công cụ: cài package, build, chạy thử, chụp màn hình headless.

**Codex tự làm** (cần hiểu toàn bộ dự án hoặc phải phán đoán):
- Thiết kế, chia module, quyết định kiến trúc.
- Cảnh 3D, camera, ánh sáng, bố cục, chỉnh cho đẹp và dễ nhìn.
- Luật chơi và cân bằng, logic sự kiện nhiều bước.
- Kết nối TikTok (`server/`), lỗi khó chưa rõ nguyên nhân, sửa nhiều file cùng lúc.
- Việc mà viết brief còn tốn công hơn tự làm (sửa 1–2 dòng).

**Cách giao:**
1. Viết brief vào `/tmp/codex-brief.md`: mục tiêu, file ĐƯỢC sửa (và file KHÔNG được động vào), API/hàm phải dùng, tiêu chí xong, lệnh để tự kiểm tra.
2. Chạy: `codex exec --skip-git-repo-check -s workspace-write -o /tmp/codex-out.md - < /tmp/codex-brief.md`
   (lệnh không chạy được thì xem `codex exec --help`; máy chưa có `codex` thì báo người dùng và tự làm).
3. Kiểm tra kết quả: đọc `git diff`, chạy `npm run dev`/build, thử chức năng. Sai thì giao lại một lần kèm lỗi cụ thể; vẫn sai thì Codex tự sửa.
4. Mỗi lần chỉ một Codex sửa một nhóm file, không để Codex và Codex sửa cùng file một lúc.
5. Khi báo cáo cho người dùng, ghi rõ việc nào Codex làm, việc nào Codex làm.

Đã giao Codex trước đây: `src/ui/*` (gồm `src/ui/hints.js`), `src/live/simulator.js`.
