// =============================================================
//  CẤU HÌNH QUÁN NET LIVE — chỉnh số liệu ở đây, không cần sửa code khác
// =============================================================

export const CONFIG = {
  shopName: 'NET CỎ 24H',

  // ---------- Giờ chơi ----------
  startSeconds: 60,          // giờ chơi khi mới vào quán
  secondsPerLike: 5,         // 1 tim = bao nhiêu giây
  lockGraceSeconds: 20,      // hết giờ: bao lâu để thả tim mở lại trước khi bị đuổi
  lowTimeSeconds: 15,        // dưới mức này bảng giờ chuyển màu cảnh báo

  // ---------- Quà ----------
  // Mỗi loại quà: món gọi (item), giây cộng thêm, xu lên bảng Top đại gia.
  // Nhận diện quà TikTok: khớp theo tên (tiktokNames, tiếng Anh như TikTok gửi về) trước;
  // quà lạ thì xét tổng kim cương ≥ minDiamonds (chọn mức cao nhất đạt được).
  gifts: {
    rose:  { label: 'Hoa hồng', item: 'noodle', seconds: 30,  coins: 1,   tiktokNames: ['Rose'],              minDiamonds: 1 },
    small: { label: 'Quà nhỏ',  item: 'sting',  seconds: 60,  coins: 5,   tiktokNames: ['TikTok', 'Finger Heart', 'Ice Cream Cone', 'GG', 'Heart Me'], minDiamonds: 5 },
    medium:{ label: 'Quà vừa',  item: 'vip',    seconds: 300, coins: 99,  tiktokNames: ['Hand Hearts', 'Doughnut', 'Perfume'], minDiamonds: 99 },
    big:   { label: 'Quà to',   item: 'all',    seconds: 120, coins: 500, tiktokNames: ['Galaxy', 'Lion', 'Universe', 'Interstellar'], minDiamonds: 500 },
  },

  // ---------- Dải hướng dẫn cách chơi (hiện lần lượt cho người xem) ----------
  hints: {
    enabled: true,
    everySeconds: 5,
    // {tim} tự thay bằng số giây mỗi tim ở trên
    items: [
      '❤ Thả tim = +{tim} giây chơi',
      '💬 Bình luận = nhân vật của bạn nói',
      '🌹 Hoa hồng = mì tôm trứng',
      '🥤 Quà nhỏ = Sting mát lạnh',
      '👑 Quà vừa = lên ghế VIP',
      '🎉 Quà to = bao cả quán',
      '⏰ Hết giờ? Thả tim để mở máy',
      '🚶 Hết máy? Thả tim để lên đầu hàng',
    ],
  },

  // ---------- Hàng chờ khi quán kín 20 máy ----------
  queue: {
    max: 8,                  // tối đa bao nhiêu người đứng chờ (thêm nữa thì không vào được)
    maxWaitSeconds: 150,     // chờ quá lâu thì bỏ về
    x: -3.45, headZ: -1.9, gap: 0.4,   // vị trí hàng: dọc tường trái, đầu hàng gần quầy
  },

  // ---------- Đồ ăn uống trên bàn ----------
  itemOnDeskSeconds: 28,     // món ăn nằm trên bàn bao lâu thì dọn

  // ---------- Sự kiện ngẫu nhiên ----------
  autoRun: true,             // tự chạy giả lập — chỉ có tác dụng khi bật sim.fakeGuests / sim.randomEvents
  randomEventMin: 30,        // giây
  randomEventMax: 60,
  blackout: { likesNeeded: 30, autoRecoverSeconds: 14 },
  events: {
    // Tỉ lệ chọn mỗi sự kiện khi tới lượt (0 = tắt)
    weights: { blackout: 2, mom: 2, happyHour: 2, shipper: 1.5, duel: 2 },
    happyHour: { seconds: 25, multiplier: 2 },          // giờ vàng: tim x2 thời gian
    shipper: { count: 4, skin: 'male-e' },              // shipper mời trà đá ngẫu nhiên N khách
    duel: { seconds: 20, prizeSeconds: 120 },           // solo: bình luận 1/2 để cổ vũ, người thắng +2 phút
  },
  mom: { scoldSeconds: 9 },

  // ---------- Giả lập ----------
  sim: {
    // false = không có khách giả: quán chỉ có người xem thật (nút trên thanh giả lập vẫn bấm thử được).
    fakeGuests: false,
    // false = không tự bắn sự kiện (mất điện, mẹ đến, giờ vàng, shipper, solo). Vẫn gọi tay được qua thanh giả lập / window.QuanNet.
    randomEvents: false,
    initialPlayers: 9,        // số khách có sẵn khi mở trang (chỉ khi fakeGuests)
    joinEvery: [7, 15],        // giây giữa 2 lần có khách mới (khi tự chạy)
    likeEvery: [0.6, 2.2],
    commentEvery: [2.5, 6],
    giftEvery: [10, 22],
  },

  // ---------- Lưu tiến độ khi tải lại trang ----------
  // Lưu bảng xếp hạng Top đại gia. Mở trang với ?reset để xóa và bắt đầu phiên mới.
  persist: {
    enabled: true,
    everySeconds: 5,
    maxAgeHours: 8,          // phiên cũ hơn bấy nhiêu giờ thì tự bắt đầu lại (live hôm sau)
  },

  // ---------- Kết nối TikTok Live (giai đoạn 3) ----------
  // Chạy server: cd server && npm start (username để trong file .env)
  live: {
    enabled: true,           // tự kết nối server nếu có; không có server thì chỉ chạy giả lập
    port: 8787,
    simWhileLive: false,      // vẫn chạy giả lập song song để quán không bao giờ vắng
    simSlowdownWhenLive: 2.5,// khi đã nối TikTok: giả lập chậm lại bao nhiêu lần
    maxRepeatPerGift: 5,     // quà combo (vd 10 hoa hồng) tối đa gọi bao nhiêu món
  },

  // ---------- Di chuyển / camera ----------
  walkSpeed: 1.3,            // đơn vị/giây
  staffSpeed: 1.6,
  focusZoom: 1.8,            // camera zoom khi tập trung vào ai đó (khung ngang)
  focusSeconds: 4,
  camera: {
    portraitZoom: 2.1,
    portraitBaseZoom: 1,     // khung dọc khi không lia: box trong stage.js đã khít vùng an toàn, zoom thêm sẽ tràn xuống khung bình luận
    minShotSeconds: 1.5,     // cảnh cùng mức ưu tiên phải giữ ít nhất bấy nhiêu giây
    maxQueueWait: 6,         // cảnh chờ quá lâu thì bỏ
    // Ưu tiên lia cam (cao hơn được cắt ngang cảnh thấp hơn). 0 = không lia.
    priority: { mom: 100, big: 90, vip: 80, duel: 70, shipper: 60, locked: 55, join: 40, gift: 35, comment: 0 },
    seconds:  { join: 3.5, gift: 2.5, locked: 2.5 },
    joinCooldown: 6,         // tối thiểu bao nhiêu giây giữa 2 lần lia theo khách mới (live đông thì không bị giật liên tục)
    // Khung dọc: vùng đặt quán (tỉ lệ khung hình) — né thanh trên, bình luận và nút quà của TikTok
    portraitSafe: { left: 0.0, right: 0.86, top: 0.215, bottom: 0.665 },
    // Khung dọc, lúc không có sự kiện: camera tự đi vòng cho nhân vật to trên điện thoại.
    // Không có x/z = toàn cảnh. Toạ độ thế giới (xem bố cục ở đầu shop.js).
    portraitTour: [
      { zoom: 1, seconds: 6 },
      { x: 0.05, z: -0.95, zoom: 1.65, seconds: 8 },   // dãy máy phía trong
      { x: -0.15, z: 1.45, zoom: 1.65, seconds: 8 },   // dãy máy phía ngoài
      { x: -2.6, z: -1.6, zoom: 1.6, seconds: 5 },     // quầy + hàng chờ
    ],
  },
  ui: {
    declutterLabels: true,   // nhãn bị chồng lên nhau thì làm mờ nhãn ít quan trọng
    portraitTimerOnlyWhenLow: true, // khung dọc: chỉ hiện đồng hồ khi sắp hết giờ / bị khóa (đỡ rối)
  },
};
