# Đưa Quán Net Live lên sóng

Chạy game và phần mềm phát trên cùng một máy. Cài đặt theo [README](../README.md), tạo `.env` và điền `TIKTOK_USERNAME` trước.
Giữ hai terminal mở: `cd server && npm start` và `npm run dev` (đều bắt đầu từ thư mục gốc).

## A. TikTok LIVE Studio (Windows/Mac tùy phiên bản hỗ trợ)

Tên menu có thể khác tùy phiên bản. Nếu máy Mac không có LIVE Studio tương thích, dùng OBS ở phần B.

1. Mở LIVE Studio, tạo **Scene/cảnh dọc**, khung **1080×1920**.
2. Chọn thêm nguồn, tìm **“Link Source” / “Web source” (Nguồn trình duyệt)**. Nhập URL `http://localhost:5173`, đặt kích thước nguồn **1080×1920**, căn vừa khung dọc.
3. Đổi URL thành **`http://localhost:5173/?clean`** để thanh giả lập ẩn sẵn.
4. Nếu phiên bản không có nguồn web: mở game trong Chrome, chọn **“Window capture/Ghi cửa sổ”**, chọn đúng cửa sổ Chrome rồi căn vừa khung. Bấm vào trang Chrome và nhấn **H** nếu thanh giả lập còn hiện.
5. Với nguồn web, bật **“Control audio via app/Âm thanh trình duyệt”** hoặc tùy chọn tương đương (tên có thể khác tùy phiên bản). Với ghi cửa sổ, thêm/chọn nguồn âm thanh Chrome hoặc âm thanh máy tính trong bộ trộn.
6. Bấm vào game qua chế độ tương tác nguồn (nếu có), hoặc trong Chrome khi ghi cửa sổ, để cho phép phát âm thanh. Kiểm tra mức tiếng trong bộ trộn rồi bắt đầu LIVE. Server chỉ nối TikTok khi tài khoản đã LIVE; chờ chip đỏ **“● LIVE @tên”** xuất hiện.

## B. OBS Studio

1. Mở **Settings → Video**: đặt **Base (Canvas)** và **Output (Scaled)** đều **1080×1920**, **FPS 30**.
2. Trong **Sources**, bấm **+ → Browser (Browser Source)**. Nhập URL **`http://localhost:5173/?clean`**, **Width 1080**, **Height 1920**.
3. Tick **“Control audio via OBS”**; bỏ tick **“Shutdown source when not visible”** để game tiếp tục chạy khi đổi cảnh. Căn nguồn vừa khung.
4. Chuột phải vào nguồn → **Interact**. Bấm vào game để kích hoạt tiếng; dùng **H** ẩn/hiện thanh giả lập, **M** tắt/bật tiếng, hoặc bấm các nút giả lập trong cửa sổ này.
5. Kiểm tra âm lượng nguồn trong **Audio Mixer**. Nếu cần chỉnh nút giả lập, nhấn H để hiện thanh, chỉnh xong nhấn H để ẩn lại.
6. Phát lên TikTok bằng một trong hai cách:
   - Dùng **TikTok LIVE Studio**: bật **Start Virtual Camera** trong OBS, thêm camera ảo OBS làm nguồn camera ở LIVE Studio; chọn thêm nguồn âm thanh phù hợp tại LIVE Studio và nghe thử (camera ảo chỉ chuyển hình).
   - Dùng **stream key**, nếu tài khoản được TikTok cấp: nhập địa chỉ server và key vào **Settings → Stream** theo thông tin TikTok cung cấp, rồi **Start Streaming**. **Không phải tài khoản nào cũng có stream key.**

## C. Checklist trước khi phát cho người xem

1. Game đã tải xong, server đang chạy. Sau khi bắt đầu LIVE, kiểm tra chip đỏ **“● LIVE @tên”**. Muốn thử trước khi LIVE, dừng server thật rồi chạy `cd server && npm run fake`; chip đỏ ở chế độ này chỉ là thử nghiệm. Dừng `fake`, chạy lại `npm start` trong `server/` để nhận TikTok thật.
2. Thanh giả lập đã ẩn bằng `?clean` hoặc H; khung hình dọc vừa nguồn.
3. Đã bấm vào game, bật tiếng và kiểm tra âm lượng trong phần mềm phát; tránh thu cùng âm thanh hai lần.
4. Dùng điện thoại khác vào LIVE và thử thả tim, kiểm tra game nhận tương tác.
5. Mặc định quán chỉ có người xem thật: không khách giả, không sự kiện tự chạy. Muốn quán luôn đông thì bật `sim.fakeGuests` (và `live.simWhileLive`) trong `src/config.js`; muốn có mất điện / mẹ đến… tự xảy ra thì bật `sim.randomEvents`.
6. Giữ nguyên hai terminal trong suốt buổi phát. Nếu đổi `PORT` trong `.env`, sửa cả `live.port` trong `src/config.js` cho khớp, rồi khởi động lại server và tải lại game.

## D. Xử lý sự cố

1. **Chip “Chỉ giả lập”:** thường là server chưa chạy hoặc game không tới được server. Chạy `cd server && npm start` từ thư mục gốc; kiểm tra `PORT` và `live.port` cùng giá trị (mặc định `8787`).
2. **“Đang chờ @… lên live…”:** tài khoản chưa LIVE, sai username hoặc TikTok từ chối kết nối. Kiểm tra `.env`, trạng thái LIVE và thông báo trong terminal server; server tự thử lại. Nếu lỗi giới hạn/ký (sign), lấy key miễn phí ở [eulerstream.com](https://eulerstream.com), điền `SIGN_API_KEY` trong `.env` rồi khởi động lại server.
3. **“Server chưa có username (.env)”:** điền `TIKTOK_USERNAME` trong `.env` ở gốc rồi khởi động lại server.
4. **Ảnh đại diện không hiện:** kiểm tra server và cổng kết nối; game tải ảnh TikTok qua server. Khách giả lập không có ảnh TikTok.
5. **Không nghe tiếng:** dùng Interact/bấm vào trang để kích hoạt âm thanh, kiểm tra nút loa hoặc M, nguồn âm thanh và bộ trộn của phần mềm phát.
6. **Giật, lag:** giảm độ phân giải nguồn/đầu ra hoặc FPS, đóng các tab và ứng dụng khác; tránh mở nhiều bản game cùng lúc.
