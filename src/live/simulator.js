const NAMES = [
  'linh.xinh', 'tuananh_99', 'Bé Bơ', 'hoang.gamer', 'Minh mê mì',
  'thao.nguyen', 'Đạt không feed', 'Huy pro', 'ngoc.anh', 'Bánh Bao',
  'Cá Con', 'Nam đi net', 'quynh.chi', 'Bé Mít', 'Long 2k4',
  'Trang trà sữa', 'Đức bo', 'meo.luoi', 'Phúc đẹp trai', 'Vịt vàng',
  'khanh_linh', 'Hà My', 'Tí hon', 'Bao giờ hết lag thì về', 'son.tung_98',
  'Nhi mê game', 'Duy ngủ quên', 'Kem Dâu', 'anhkhoa.exe', 'Gấu Trúc',
  'Hải chưa về', 'Tiểu Màn Thầu', 'mimi_2003', 'Tuấn cá chép', 'Bắp rang',
  'Vy không quạu', 'Phong gió', 'Người chơi hệ mì tôm trứng', 'Trâm Anh', 'Bin bin',
];
const COMMENTS = [
  'ai solo không', 'mì ngon quá', 'mẹ đừng vào', 'gg', 'cho xin wifi',
  'máy này mượt ghê', 'cho em thêm trứng', 'anh chủ ơi hết giờ', 'team mình đâu rồi',
  'vào trận thôi', 'đừng gank em', 'xin một lon Sting', 'hôm nay thắng lớn',
  'lag là do mạng nha', 'em đang học online', 'mẹ gọi thì bảo con về rồi',
  'quán mát quá', 'ai ăn mì không', 'còn máy trống không anh', 'cứu tui với',
  'thêm tí giờ nữa thôi', 'bàn phím nghe đã ghê', 'đánh xong trận này về',
  'tim cho bạn bàn bên', 'VIP nhìn xịn quá', 'bao cả quán đi đại gia',
  'đừng tắt điện nha', 'mì chưa chín đã hết trận', 'chào cả nhà', 'nay đông vui ghê',
];
const pick = values => values[Math.floor(Math.random() * values.length)];

export function createSimulator(handlers, config) {
  let auto = config.autoRun !== false;
  let suffix = 0;
  const sim = config.sim;
  const ranges = {
    join: sim.joinEvery, like: sim.likeEvery,
    comment: sim.commentEvery, gift: sim.giftEvery,
    event: [config.randomEventMin, config.randomEventMax],
  };
  const interval = type => {
    const [min, max] = ranges[type];
    return Math.max(0.05, min + Math.random() * Math.max(0, max - min));
  };
  const timers = Object.fromEntries(Object.keys(ranges).map(type => [type, interval(type)]));
  const players = () => handlers.getPlayers() ?? [];
  function randomName(excluded = new Set(players())) {
    const available = NAMES.filter(name => !excluded.has(name));
    if (available.length) return pick(available);
    // Luôn có tên mới khi đã dùng hết danh sách mẫu.
    let name;
    do { name = `${pick(NAMES)}_${++suffix}`; } while (excluded.has(name));
    return name;
  }
  function trigger(type) {
    if (type === 'join') { handlers.onJoin(randomName()); return; }
    if (type === 'blackout') { handlers.blackout(); return; }
    if (type === 'mom') { handlers.momEvent(); return; }
    const present = players();
    if (type === 'like' && present.length) handlers.onLike(pick(present), 1 + Math.floor(Math.random() * 5));
    if (type === 'comment' && present.length) handlers.onComment(pick(present), pick(COMMENTS));
    if (['rose', 'small', 'medium', 'big'].includes(type)) handlers.onGift(present.length ? pick(present) : randomName(), type);
  }
  return {
    trigger,
    setAuto(value) { auto = Boolean(value); },
    update(dt) {
      if (!auto || !Number.isFinite(dt) || dt <= 0) return;
      for (const type of Object.keys(timers)) {
        timers[type] -= dt;
        if (timers[type] > 0) continue;
        // Mỗi khung chỉ phát một lần/loại, tránh dồn sự kiện sau khi đổi tab.
        timers[type] = interval(type);
        if (type === 'event') trigger(Math.random() < 0.5 ? 'blackout' : 'mom');
        else if (type === 'gift') {
          const roll = Math.random();
          trigger(roll < 1 / 8 ? 'big' : roll < 1 / 8 + 1 / 5 ? 'medium' : Math.random() < 0.5 ? 'rose' : 'small');
        } else trigger(type);
      }
    },
    randomName,
    seedInitial() {
      const used = new Set(players());
      for (let i = 0; i < sim.initialPlayers; i++) {
        const name = randomName(used);
        used.add(name);
        handlers.onJoin(name, true);
      }
    },
  };
}
