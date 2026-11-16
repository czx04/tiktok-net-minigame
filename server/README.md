# Server Quán Net Live

Dùng Node.js 20 trở lên. Từ thư mục gốc, chép `.env.example` thành `.env`, điền `TIKTOK_USERNAME` (có hoặc không có `@`) và `PORT` (mặc định `8787`). `SIGN_API_KEY` là key Euler Stream tùy chọn nếu bị giới hạn. Server đọc `.env` ở gốc trước, rồi bổ sung biến còn thiếu từ `server/.env`; biến môi trường có sẵn được ưu tiên.

```sh
cd server
npm start
```

Nếu chưa có username, server vẫn phục vụ HTTP/WebSocket. Khi có username, server tự thử lại sau 30 giây nếu lỗi/chưa live, hoặc 10 giây nếu đang live bị ngắt.

Chạy giả lập (không kết nối TikTok, phát sự kiện mỗi 1–3 giây):

```sh
npm run fake
```

- `GET /status`: username, trạng thái TikTok, roomId, lỗi gần nhất, số client.
- `ws://localhost:8787/ws`: nhận trạng thái ngay khi nối, rồi các sự kiện `join`, `like`, `comment`, `gift` và cập nhật `status`.
- `GET /avatar?url=<URL đã encode>`: proxy ảnh HTTPS từ các CDN TikTok được phép; giới hạn 2 MB, timeout 8 giây, cache 1 giờ (tối đa 300 ảnh), không theo redirect. HTTP có CORS `*`.

Client dùng `connectLive({ url, onEvent, onStatus })` từ `src/live/tiktok.js`; tự nối lại (3 giây, tăng dần tới 30 giây nếu server chưa bật), gọi `close()` để dừng. `online` cho biết kết nối tới server, `connected` cho biết kết nối tới TikTok; chế độ `--fake` báo `connected: true` với username `thu_nghiem` để thử đúng luồng thật. Nếu đổi `PORT` thì sửa cả `live.port` trong `src/config.js`. Nhấn Ctrl+C để tắt server.
