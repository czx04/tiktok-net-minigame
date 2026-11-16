import http from 'node:http';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { WebSocket, WebSocketServer } from 'ws';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)), quiet: true });

const username = (process.env.TIKTOK_USERNAME || '').trim().replace(/^@+/, '');
const port = Number(process.env.PORT || 8787);
const fake = process.argv.includes('--fake');
const state = { username, connected: false, roomId: null, lastError: null };
const avatarCache = new Map();
const avatarHosts = ['tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokcdn-eu.com', 'ibyteimg.com', 'byteimg.com', 'muscdn.com'];
const maxAvatarBytes = 2 * 1024 * 1024;
let connection;
let retryTimer;
let fakeTimer;
let stopping = false;

function broadcast(message) {
  const json = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(json);
  }
}

function updateStatus(patch) {
  const changed = Object.entries(patch).some(([key, value]) => state[key] !== value);
  Object.assign(state, patch);
  if (changed) broadcast({ type: 'status', ...state });
}

async function proxyAvatar(req, res, url) {
  let target;
  try {
    target = new URL(url.searchParams.get('url'));
    if (target.protocol !== 'https:' || target.username || target.password ||
        (target.port && target.port !== '443') ||
        !avatarHosts.some(host => target.hostname === host || target.hostname.endsWith(`.${host}`))) {
      throw new Error('URL không hợp lệ');
    }
  } catch {
    res.writeHead(400).end('URL ảnh không hợp lệ');
    return;
  }

  const key = target.href;
  let cached = avatarCache.get(key);
  if (cached && cached.expires <= Date.now()) {
    avatarCache.delete(key);
    cached = undefined;
  }
  try {
    if (!cached) {
      // Không theo redirect để tránh chuyển sang hostname ngoài danh sách cho phép.
      const response = await fetch(target, { signal: AbortSignal.timeout(8000), redirect: 'error' });
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !/^image\//i.test(contentType) || !response.body ||
          Number(response.headers.get('content-length')) > maxAvatarBytes) {
        await response.body?.cancel();
        throw new Error('Ảnh không hợp lệ');
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > maxAvatarBytes) throw new Error('Ảnh quá lớn');
        chunks.push(chunk);
      }
      cached = { body: Buffer.concat(chunks), contentType, expires: Date.now() + 3600000 };
      if (avatarCache.size >= 300) avatarCache.delete(avatarCache.keys().next().value);
      avatarCache.set(key, cached);
    }
    res.writeHead(200, {
      'Content-Type': cached.contentType,
      'Content-Length': cached.body.length,
      'Cache-Control': 'public, max-age=3600',
    }).end(cached.body);
  } catch {
    res.writeHead(502).end('Không tải được ảnh');
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ...state, clients: wss.clients.size }));
  } else if (req.method === 'GET' && url.pathname === '/avatar') {
    void proxyAvatar(req, res, url);
  } else {
    res.writeHead(404).end('Không tìm thấy');
  }
});
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', client => {
  client.on('error', () => {});
  client.send(JSON.stringify({ type: 'status', ...state }));
});

function person(data) {
  const source = data.user || {};
  const user = source.uniqueId ?? source.displayId ?? '';
  return {
    user,
    name: source.nickname || user,
    avatar: source.profilePicture?.url?.[0] ?? source.avatarThumb?.urlList?.[0] ??
      source.avatarMedium?.urlList?.[0] ?? source.avatarLarge?.urlList?.[0] ?? '',
  };
}

function retry(delay) {
  if (stopping || retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    void connectTikTok();
  }, delay);
}

async function connectTikTok() {
  const previous = connection;
  connection = undefined;
  if (previous) {
    try { await previous.disconnect(); } catch { /* Kết nối cũ đã đóng. */ }
  }
  if (stopping) return;
  const conn = new TikTokLiveConnection(username, {
    ...(process.env.SIGN_API_KEY ? { signApiKey: process.env.SIGN_API_KEY } : {}),
    enableExtendedGiftInfo: true,
    processInitialData: false,
  });
  connection = conn;
  const active = () => connection === conn && !stopping;
  conn.on(ControlEvent.CONNECTED, room => {
    if (!active()) return;
    clearTimeout(retryTimer);
    retryTimer = undefined;
    updateStatus({ connected: true, roomId: String(room.roomId ?? ''), lastError: null });
    console.log(`Đã kết nối phòng ${state.roomId}`);
  });
  conn.on(ControlEvent.DISCONNECTED, ({ code, reason } = {}) => {
    if (!active()) return;
    const wasConnected = state.connected;
    updateStatus({ connected: false, roomId: null, lastError: reason || `Đã ngắt kết nối (${code ?? '?'})` });
    console.log(`Đã ngắt TikTok, thử lại sau ${wasConnected ? 10 : 30}s…`);
    retry(wasConnected ? 10000 : 30000);
  });
  conn.on(ControlEvent.ERROR, ({ info, exception } = {}) => {
    if (!active()) return;
    updateStatus({ lastError: String(exception?.message || info || 'Lỗi TikTok') });
    if (!state.connected) retry(30000);
  });
  const emit = (type, data, extra = {}) => {
    if (active()) broadcast({ type, ...person(data), ...extra });
  };
  conn.on(WebcastEvent.MEMBER, data => emit('join', data));
  conn.on(WebcastEvent.LIKE, data => emit('like', data, { count: data.likeCount || 1 }));
  conn.on(WebcastEvent.CHAT, data => emit('comment', data, { text: data.comment ?? '' }));
  conn.on(WebcastEvent.GIFT, data => {
    const giftType = data.giftDetails?.giftType ?? data.gift?.type;
    if (Number(giftType) === 1 && !data.repeatEnd) return;
    const count = data.repeatCount || 1;
    const diamonds = data.giftDetails?.diamondCount ?? data.gift?.diamondCount ?? data.extendedGiftInfo?.diamond_count ?? 0;
    emit('gift', data, {
      giftName: data.giftDetails?.giftName ?? data.gift?.name ?? data.extendedGiftInfo?.name ?? '',
      diamonds: Number(diamonds) * count,
      count,
    });
  });
  try {
    await conn.connect();
  } catch (error) {
    if (!active()) return;
    updateStatus({ connected: false, roomId: null, lastError: String(error?.message || error) });
    console.log(`Đang chờ @${username} lên live…`);
    retry(30000);
  }
}

function fakeEvent() {
  if (stopping) return;
  const names = ['Minh', 'Linh', 'Nam', 'Mai', 'Huy', 'An'];
  const name = names[Math.floor(Math.random() * names.length)];
  const type = ['join', 'like', 'comment', 'gift'][Math.floor(Math.random() * 4)];
  const event = { type, user: `khach_${name.toLowerCase()}`, name, avatar: '' };
  if (type === 'like') event.count = 1 + Math.floor(Math.random() * 20);
  if (type === 'comment') event.text = ['Cho em máy nhé!', 'Quán vui quá!', 'Một mì trứng nha!'][Math.floor(Math.random() * 3)];
  if (type === 'gift') {
    const [giftName, value] = [['Rose', 1], ['TikTok', 1], ['Finger Heart', 5], ['Galaxy', 1000]][Math.floor(Math.random() * 4)];
    const count = 1 + Math.floor(Math.random() * 3);
    Object.assign(event, { giftName, count, diamonds: value * count });
  }
  broadcast(event);
  fakeTimer = setTimeout(fakeEvent, 1000 + Math.random() * 2000);
}

server.listen(port, () => {
  console.log(`Server Quán Net Live đang chạy tại cổng ${server.address().port}`);
  if (fake) {
    console.log('Đang phát sự kiện giả lập.');
    // Báo game là "đang live" để kiểm thử đúng luồng thật (chip đỏ, giả lập trong game chạy chậm lại)
    updateStatus({ username: username || 'thu_nghiem', connected: true, roomId: 'fake' });
    fakeTimer = setTimeout(fakeEvent, 1000 + Math.random() * 2000);
  } else if (username) {
    void connectTikTok();
  } else {
    console.warn('Chưa có TIKTOK_USERNAME; server vẫn chạy, chưa kết nối TikTok.');
  }
});

async function shutdown() {
  if (stopping) return;
  stopping = true;
  clearTimeout(retryTimer);
  clearTimeout(fakeTimer);
  const conn = connection;
  connection = undefined;
  for (const client of wss.clients) client.terminate();
  wss.close();
  server.close();
  server.closeAllConnections();
  try { await conn?.disconnect(); } catch { /* Bỏ qua lỗi lúc thoát. */ }
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
