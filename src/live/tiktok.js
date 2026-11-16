export function connectLive({ url, onEvent, onStatus }) {
  let socket;
  let retryTimer;
  let closed = false;
  let delay = 3000;   // tăng dần tới 30s khi server chưa bật, để console đỡ bị spam lỗi

  function reconnect() {
    if (closed || retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      connect();
    }, delay);
    delay = Math.min(30000, delay * 2);
  }

  function connect() {
    if (closed) return;
    let ws;
    try {
      ws = new WebSocket(url);
      socket = ws;
    } catch {
      reconnect();
      onStatus?.({ online: false });
      return;
    }
    const active = () => !closed && socket === ws;
    let offlineReported = false;
    const offline = () => {
      if (!active()) return;
      reconnect();
      if (!offlineReported) {
        offlineReported = true;
        onStatus?.({ online: false });
      }
    };
    ws.onopen = () => {
      delay = 3000;
      if (active()) onStatus?.({ online: true });
    };
    ws.onmessage = event => {
      if (!active()) return;
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'status') {
        onStatus?.({ online: true, connected: Boolean(msg.connected), username: msg.username, error: msg.lastError });
      } else if (['join', 'like', 'comment', 'gift'].includes(msg.type)) {
        onEvent?.(msg);
      }
    };
    ws.onerror = () => {
      offline();
      ws.close();
    };
    ws.onclose = offline;
  }

  connect();
  return {
    close() {
      closed = true;
      clearTimeout(retryTimer);
      socket?.close();
    },
  };
}
