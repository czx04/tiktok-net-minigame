/** Call from the entry point when new URLSearchParams(location.search).has('safe'). */
export function showSafeZones() {
  const existing = document.getElementById('tiktok-safe-zones');
  if (existing) return existing;

  const overlay = document.createElement('div');
  overlay.id = 'tiktok-safe-zones';
  overlay.className = 'safe-zones';
  overlay.setAttribute('aria-hidden', 'true');
  // Static preview content only; no user data or live TikTok controls.
  overlay.innerHTML = `
    <div class="safe-zones__zone safe-zones__top">
      <strong>Thanh trên TikTok</strong>
      <div class="safe-zones__profile">
        <span class="safe-zones__avatar">Q</span>
        <span>Quán Net Live · + Follow · 1.2K đang xem · ×</span>
      </div>
    </div>
    <div class="safe-zones__zone safe-zones__comments">
      <strong>Bình luận</strong>
      <div class="safe-zones__comment"><span class="safe-zones__avatar">A</span><span>An: Cho mình một máy nhé!</span></div>
      <div class="safe-zones__comment"><span class="safe-zones__avatar">L</span><span>Linh: Thả tim cứu quán ❤️</span></div>
      <div class="safe-zones__comment"><span class="safe-zones__avatar">M</span><span>Minh đã tặng 🌹 Hoa hồng</span></div>
      <div class="safe-zones__fake-button">Thêm bình luận…</div>
    </div>
    <div class="safe-zones__zone safe-zones__gifts">
      <strong>Nút quà</strong>
      <div class="safe-zones__fake-button">🎁</div>
      <div class="safe-zones__fake-button">↗</div>
      <div class="safe-zones__fake-button">❤️</div>
    </div>
    <small class="safe-zones__caption">Xem trước vùng bị TikTok che (?safe)</small>
  `;
  document.body.append(overlay);
  return overlay;
}
