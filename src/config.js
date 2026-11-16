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
  // Mỗi loại quà: món gọi (item), giây cộng thêm, xu góp vào mục tiêu chung.
  // Nhận diện quà TikTok: khớp theo tên (tiktokNames, tiếng Anh như TikTok gửi về) trước;
  // quà lạ thì xét tổng kim cương ≥ minDiamonds (chọn mức cao nhất đạt được).
  gifts: {
    rose:  { label: 'Hoa hồng', item: 'noodle', seconds: 30,  coins: 1,   tiktokNames: ['Rose'],              minDiamonds: 1 },
    small: { label: 'Quà nhỏ',  item: 'sting',  seconds: 60,  coins: 5,   tiktokNames: ['TikTok', 'Finger Heart', 'Ice Cream Cone', 'GG', 'Heart Me'], minDiamonds: 5 },
    medium:{ label: 'Quà vừa',  item: 'vip',    seconds: 300, coins: 99,  tiktokNames: ['Hand Hearts', 'Doughnut', 'Perfume'], minDiamonds: 99 },
    big:   { label: 'Quà to',   item: 'all',    seconds: 120, coins: 500, tiktokNames: ['Galaxy', 'Lion', 'Universe', 'Interstellar'], minDiamonds: 500 },
  },

  // ---------- Đồ ăn uống trên bàn ----------
  itemOnDeskSeconds: 28,     // món ăn nằm trên bàn bao lâu thì dọn

  // ---------- Mục tiêu chung ----------
  goals: [
    { name: 'lắp điều hòa', coins: 1000, unlock: 'aircon' },
    { name: 'mở tầng 2',    coins: 5000, unlock: null },
  ],
  startCoins: 380,           // xu có sẵn khi mở quán (để thanh không trống)

  // ---------- Sự kiện ngẫu nhiên ----------
  autoRun: true,             // bật tự chạy giả lập mặc định
  randomEventMin: 30,        // giây
  randomEventMax: 60,
  blackout: { likesNeeded: 30, autoRecoverSeconds: 14 },
  mom: { scoldSeconds: 9 },

  // ---------- Giả lập ----------
  sim: {
    initialPlayers: 9,        // số khách có sẵn khi mở trang
    joinEvery: [7, 15],        // giây giữa 2 lần có khách mới (khi tự chạy)
    likeEvery: [0.6, 2.2],
    commentEvery: [2.5, 6],
    giftEvery: [10, 22],
  },

  // ---------- Kết nối TikTok Live (giai đoạn 3) ----------
  // Chạy server: cd server && npm start (username để trong file .env)
  live: {
    enabled: true,           // tự kết nối server nếu có; không có server thì chỉ chạy giả lập
    port: 8787,
    simWhileLive: true,      // vẫn chạy giả lập song song để quán không bao giờ vắng
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
    portraitBaseZoom: 1.18, // khung dọc khi không lia: zoom nhẹ, cắt bớt tường hai bên cho nhân vật to hơn       // khung dọc: zoom sát hơn vì người xem dùng điện thoại
    minShotSeconds: 1.5,     // cảnh cùng mức ưu tiên phải giữ ít nhất bấy nhiêu giây
    maxQueueWait: 6,         // cảnh chờ quá lâu thì bỏ
    // Ưu tiên lia cam (cao hơn được cắt ngang cảnh thấp hơn). 0 = không lia.
    priority: { mom: 100, big: 90, vip: 80, locked: 55, join: 40, gift: 35, comment: 0 },
    seconds:  { join: 3.5, gift: 2.5, locked: 2.5 },
    joinCooldown: 6,         // tối thiểu bao nhiêu giây giữa 2 lần lia theo khách mới (live đông thì không bị giật liên tục)
    // Khung dọc: vùng đặt quán (tỉ lệ khung hình) — né thanh trên, bình luận và nút quà của TikTok
    portraitSafe: { left: 0.0, right: 0.9, top: 0.2, bottom: 0.7 },
  },
  ui: {
    declutterLabels: true,   // nhãn bị chồng lên nhau thì làm mờ nhãn ít quan trọng
    portraitTimerOnlyWhenLow: true, // khung dọc: chỉ hiện đồng hồ khi sắp hết giờ / bị khóa (đỡ rối)
  },
};
