# Dự án: Quán Net Live (game tương tác TikTok Live)

Bạn đang ở trong thư mục dự án. Đọc hết file này trước khi làm. Làm từng giai đoạn, xong giai đoạn nào thì chạy thử và báo tôi rồi mới sang giai đoạn sau.

## Ý tưởng

Một quán net ảo 3D, phát lên TikTok Live. Mỗi người xem vào live sẽ có một nhân vật chibi đi vào quán và ngồi vào một máy. Người xem tương tác bằng tim, bình luận và quà:

- **Vào live** → nhân vật mới đi từ cửa vào, ngồi vào máy trống. Có tên TikTok trên đầu và đồng hồ giờ chơi.
- **Thả tim** → cộng giờ chơi (ví dụ 1 tim = 5 giây), tim bay lên trên đầu nhân vật.
- **Bình luận** → hiện bong bóng chat trên đầu nhân vật đó.
- **Hết giờ** → màn hình máy khóa đỏ "HẾT GIỜ", nhân vật gục xuống. Có khoảng 20 giây để thả tim mở lại, không thì đứng dậy đi ra cửa.
- **Quà** gọi đồ, nhân viên đi từ quầy bưng ra tận bàn:
  - Hoa hồng → mì tôm trứng (bát bốc khói)
  - Quà nhỏ → Sting
  - Quà vừa → lên ghế VIP (ghế đổi màu vàng, bảng tên vàng, +5 phút)
  - Quà to → "BAO CẢ QUÁN": mọi người được một lon Sting và +2 phút, pháo giấy, thông báo lớn
- **Mục tiêu chung**: thanh tiến độ góp xu của cả live (ví dụ 1000 xu → quán lắp điều hòa, điều hòa xuất hiện trên tường).
- **Sự kiện ngẫu nhiên** (mỗi 30–60 giây khi bật tự chạy):
  - Mất điện: cả quán tối, cả live phải thả đủ N tim để bật máy phát.
  - Mẹ đến bắt về: một nhân vật mẹ đi vào đứng cạnh một người, mắng khoảng 9 giây. Người đó (hoặc ai cũng được) thả tim/tặng quà thì mẹ bỏ về, không thì nhân vật bị lôi ra cửa.

## Phong cách hình ảnh (quan trọng)

- Chibi dễ thương, **sáng sủa, dễ nhìn**, nhìn trên điện thoại vẫn rõ từng nhân vật và đồ vật. Không dùng tông tối, không neon chói, không màu mè.
- Bảng màu dịu: sàn gỗ hoặc gạch sáng, tường kem, điểm nhấn cam ấm. Ánh sáng mềm, có bóng đổ nhẹ.
- Camera nhìn chéo từ trên xuống (kiểu isometric, nên dùng OrthographicCamera), thấy được cả 20 máy, đủ gần để nhân vật không bị bé tí. Khi có quà to hoặc sự kiện mẹ đến, camera zoom mượt vào người đó vài giây rồi quay lại.
- Giao diện (bảng tên, bong bóng chat, thông báo) dùng HTML đè lên canvas, font "Be Vietnam Pro", bo góc, nền bán trong suốt.
- Phải chạy tốt ở cả khung dọc 9:16 (TikTok) lẫn khung ngang.

## Bố cục quán

- 20 máy, chia 2 dãy đảo, mỗi đảo 2 hàng bàn quay lưng vào nhau (5 máy mỗi hàng).
- Quầy thu ngân/quầy nước ở góc trong cùng, có tủ lạnh, nhân viên đứng ở quầy.
- Cửa ra vào ở một góc phía trước.
- Bảng hiệu "NET CỎ 24H" và bảng menu trên tường (Mì tôm trứng · Hoa hồng, Sting · Quà nhỏ, Ghế VIP · Quà vừa).
- Thêm cây xanh, thùng rác, loa cho có không khí.

## Model có sẵn (KHÔNG cần tải thêm)

Tất cả là gói của Kenney, giấy phép CC0 (dùng thương mại thoải mái, không bắt buộc ghi nguồn).

- `public/models/characters/` — 20 nhân vật `character-*.glb` (male-a…g, female-a…f, worker, robot, alien…). Dùng `character-worker.glb` cho nhân viên quán. Texture: `Textures/colormap.png` (đường dẫn tương đối, phải giữ nguyên cấu trúc thư mục).
  Mỗi nhân vật có **32 animation** dùng được ngay: `idle`, `walk`, `sprint`, `sit`, `emote-yes`, `emote-no`, `pick-up`, `holding-both`, `interact-right`, `interact-left`, `die`, `jump`…
  → dùng `walk` khi đi, `sit` khi ngồi, `holding-both` cho nhân viên bưng đồ, `emote-yes` khi được nhận quà, `emote-no` cho mẹ đang mắng.
  Nhân vật có skin nên khi tạo nhiều bản phải dùng `SkeletonUtils.clone()`, không dùng `.clone()` thường.
- `public/models/furniture/` — bàn `desk`, ghế `chairDesk`, màn hình `computerScreen`, bàn phím `computerKeyboard`, chuột `computerMouse`, tủ lạnh `kitchenFridge`, quầy `kitchenBar`, `kitchenBarEnd`, tường `wall`, `wallDoorway`, `wallWindow`, sàn `floorFull`, thảm `rugRectangle`, cây `pottedPlant`, đèn, loa, thùng rác, TV, quạt trần…
- `public/models/food/` — `bowl-broth` (làm mì), `egg-cooked`, `chopstick`, `soda-can` (làm Sting), `cup-tea` (trà đá), `sandwich` (bánh mì), `plate`…
- Thư viện đầy đủ (nếu cần thêm món): `assets/kenney/` — chép thêm file sang `public/models/` khi dùng.

**Lưu ý về kích thước và gốc tọa độ** (đã đo sẵn):
- Nhân vật cao khoảng 0,67 đơn vị; bàn `desk` rộng 0,72 cao 0,38; ghế `chairDesk` cao 0,42; màn hình 0,39 × 0,29. Các tỉ lệ này khớp kiểu chibi, giữ nguyên tỉ lệ giữa chúng.
- Đồ ăn rất to so với bàn (bát rộng khoảng 0,57) → phải thu nhỏ khoảng 0,2–0,3.
- Gốc tọa độ của đồ nội thất nằm ở **góc** chứ không ở giữa → căn chỉnh bằng `Box3` trước khi đặt.
- Màn hình máy tính: thay mặt màn hình bằng một `CanvasTexture` để vẽ trạng thái (ảnh đại diện/chữ cái đầu của người chơi, màn hình khóa đỏ, màn hình tắt khi mất điện).

## Code mẫu tham khảo

`reference/prototype-blocks.html` là bản thử tôi đã làm bằng hình khối tự dựng (three.js r128, 1 file). **Phần đồ họa trong đó bỏ đi**, nhưng có thể tham khảo phần luật chơi: các hàm `onJoin/onLike/onComment/onGift`, nhân viên đi giao đồ theo hàng đợi, sự kiện mất điện và mẹ đến, đồng hồ giờ chơi, thanh mục tiêu, bảng giả lập. Viết lại cho gọn và tách module.

## Công nghệ

- **Vite + three.js** (bản mới nhất từ npm, dùng `GLTFLoader`, `SkeletonUtils`, `AnimationMixer`).
- Code tách module, ví dụ: `src/scene/` (dựng quán, camera, ánh sáng), `src/characters/` (tải và điều khiển nhân vật), `src/game/` (luật chơi, trạng thái người chơi, sự kiện), `src/ui/` (bảng tên, thông báo, feed), `src/live/` (nguồn sự kiện: giả lập hoặc TikTok).
- Tất cả số liệu cân bằng (giây mỗi tim, giá quà, mục tiêu xu, thời gian sự kiện, tên quà nào ra món gì) để trong **một file cấu hình** `src/config.js` cho tôi tự chỉnh.
- Đường dẫn file có dấu cách hoặc tiếng Việt thì phải xử lý cẩn thận.

## Các giai đoạn

### Giai đoạn 1 — Quán và nhân vật (chưa cần TikTok)
1. Khởi tạo dự án Vite, cài three.
2. Dựng quán 20 máy bằng model Kenney, ánh sáng, camera như mô tả.
3. Nhân vật đi từ cửa vào ghế (animation `walk` → `sit`), bảng tên + giờ chơi, nhân viên giao mì/Sting.
4. Thanh giả lập ở dưới màn hình: Khách vào, Thả tim, Bình luận, Hoa hồng, Quà nhỏ, Quà vừa, Quà to, Mất điện, Mẹ đến, Tự chạy (bật mặc định). Phím `H` ẩn/hiện thanh giả lập để quay live cho sạch.
5. `npm run dev` chạy được, mở trình duyệt thấy quán hoạt động. Chụp màn hình gửi tôi xem.

### Giai đoạn 2 — Hoàn thiện luật chơi
Hết giờ/khóa máy, ghế VIP, bao cả quán, mất điện, mẹ đến, mục tiêu chung, bảng xếp hạng nhỏ (top người tặng trong phiên), âm thanh đơn giản (gõ phím nền, tiếng "ting" khi có quà, có nút tắt tiếng).

### Giai đoạn 3 — Kết nối TikTok Live
- Làm một server Node nhỏ (`server/`) dùng thư viện `tiktok-live-connector` để nghe live theo username, rồi đẩy sự kiện sang trang game qua WebSocket.
- **Đọc README của phiên bản thư viện đã cài** để dùng đúng API (tên class và tên sự kiện đã đổi giữa các phiên bản, đừng đoán).
- Map sự kiện: member/join → `onJoin`, like → `onLike` (có số lượng), chat → `onComment`, gift → `onGift` (dựa theo tên hoặc giá trị kim cương của quà, cấu hình trong `config.js`; chú ý quà dạng combo/streak chỉ tính khi kết thúc chuỗi).
- Lấy ảnh đại diện TikTok của người xem để vẽ lên màn hình máy họ ngồi (nếu tải ảnh bị chặn CORS thì cho server làm proxy).
- Username TikTok để trong file `.env`, không ghi cứng trong code.
- Có chế độ chạy song song: vừa nhận sự kiện thật vừa bật giả lập để quán không bao giờ vắng.

### Giai đoạn 4 — Lên sóng
- Hướng dẫn tôi từng bước đưa trang vào **TikTok LIVE Studio** hoặc **OBS** (thêm nguồn trình duyệt/cửa sổ, khung 1080×1920).
- Viết `README.md` tiếng Việt: cách cài, cách chạy, cách đổi cấu hình, cách đổi tên quán.

## Quy tắc làm việc
- Trả lời tôi bằng tiếng Việt, ngắn gọn.
- Không xóa file gốc trong `assets/` và các file `.zip`.
- Xong mỗi giai đoạn: chạy thử, chụp màn hình nếu được, tóm tắt đã làm gì và tôi cần làm gì.
- Ghi những quyết định quan trọng vào `CLAUDE.md` để các phiên sau đọc lại.
