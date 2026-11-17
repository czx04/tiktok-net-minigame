// Lưu tiến độ phiên live (bảng xếp hạng Top đại gia) vào localStorage,
// để lỡ tải lại trang / OBS làm mới nguồn thì không mất.
import { CONFIG } from '../config.js';

const KEY = 'quannet.session.v2';   // v2: bỏ mục tiêu + bỏ khách giả → bỏ dữ liệu cũ (Top đại gia toàn tên giả)

export function loadSession() {
  if (!CONFIG.persist.enabled) return null;
  try {
    const url = new URL(location.href);
    if (url.searchParams.has('reset')) {
      localStorage.removeItem(KEY);
      // Bỏ ?reset khỏi địa chỉ để lần tải lại sau không xóa nữa
      url.searchParams.delete('reset');
      history.replaceState(null, '', url);
      return null;
    }
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!s || typeof s !== 'object') return null;
    // Phiên quá cũ (vd hôm qua) thì bắt đầu lại từ đầu
    if (Date.now() - (s.savedAt || 0) > CONFIG.persist.maxAgeHours * 3600 * 1000) return null;
    return s;
  } catch { return null; }
}

export function saveSession(data) {
  if (!CONFIG.persist.enabled) return;
  try { localStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: Date.now() })); } catch { /* chế độ ẩn danh / bị chặn */ }
}
