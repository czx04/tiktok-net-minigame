// Đổi quà TikTok (tên + kim cương) thành loại quà trong game: rose | small | medium | big.
import { CONFIG } from '../config.js';

const norm = (s) => String(s ?? '').trim().toLowerCase();

/**
 * @param giftName tên quà TikTok (vd "Rose")
 * @param diamonds tổng kim cương của cả chuỗi (đã nhân số lượng)
 * @param count số lượng trong chuỗi combo
 * @returns {{ key: string, times: number } | null}
 */
export function mapGift(giftName, diamonds, count = 1) {
  const gifts = Object.entries(CONFIG.gifts);
  const name = norm(giftName);

  // 1) Khớp theo tên cấu hình trong config.js → lặp theo số lượng (có giới hạn)
  for (const [key, g] of gifts) {
    if ((g.tiktokNames ?? []).some((n) => norm(n) === name)) {
      return { key, times: Math.max(1, Math.min(count, CONFIG.live.maxRepeatPerGift)) };
    }
  }
  // 2) Không khớp tên → xét tổng kim cương, chọn mức cao nhất đạt được
  const byValue = gifts
    .filter(([, g]) => Number.isFinite(g.minDiamonds))
    .sort((a, b) => b[1].minDiamonds - a[1].minDiamonds);
  for (const [key, g] of byValue) {
    if (diamonds >= g.minDiamonds) return { key, times: 1 };
  }
  return null;
}
