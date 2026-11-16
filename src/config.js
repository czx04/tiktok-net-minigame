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
  // tiktokNames / minDiamonds dùng ở giai đoạn 3 để nhận diện quà TikTok.
  gifts: {
    rose:  { label: 'Hoa hồng', item: 'noodle', seconds: 30,  coins: 1,   tiktokNames: ['Rose'],              minDiamonds: 1 },
    small: { label: 'Quà nhỏ',  item: 'sting',  seconds: 60,  coins: 5,   tiktokNames: ['TikTok', 'Finger Heart'], minDiamonds: 5 },
    medium:{ label: 'Quà vừa',  item: 'vip',    seconds: 300, coins: 99,  tiktokNames: [],                    minDiamonds: 99 },
    big:   { label: 'Quà to',   item: 'all',    seconds: 120, coins: 500, tiktokNames: [],                    minDiamonds: 500 },
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

  // ---------- Di chuyển / camera ----------
  walkSpeed: 1.3,            // đơn vị/giây
  staffSpeed: 1.6,
  focusZoom: 1.8,            // camera zoom khi tập trung vào ai đó
  focusSeconds: 4,
};
