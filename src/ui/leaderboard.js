export function createLeaderboard(root) {
  const panel = document.createElement('section');
  panel.className = 'leaderboard';
  panel.setAttribute('aria-label', 'Top người tặng quà trong phiên');
  panel.hidden = true;
  const title = document.createElement('div');
  title.className = 'leaderboard-title';
  title.textContent = 'Top đại gia 💰';
  const list = document.createElement('ol');
  list.className = 'leaderboard-list';
  panel.append(title, list);
  // Share the HUD's centered top anchor on both landscape and portrait screens.
  (root.querySelector('.hud-top') || root).append(panel);
  const donors = new Map();
  let previous = [];
  const top = (n = 3) => [...donors.values()]
    .sort((a, b) => b.coins - a.coins || a.order - b.order)
    .slice(0, Math.max(0, Math.floor(Number(n) || 0)))
    .map(({ name, coins }) => ({ name, coins }));
  const render = () => {
    const leaders = top(3);
    list.replaceChildren();
    leaders.forEach((entry, index) => {
      const row = document.createElement('li');
      row.className = 'leaderboard-row';
      if (previous[index] !== entry.name) row.classList.add('is-highlighted');
      const rank = document.createElement('span');
      rank.className = 'leaderboard-rank';
      rank.textContent = ['🥇', '🥈', '🥉'][index];
      const name = document.createElement('span');
      name.className = 'leaderboard-name';
      name.textContent = entry.name;
      name.title = entry.name;
      const coins = document.createElement('span');
      coins.className = 'leaderboard-coins';
      coins.textContent = `${Math.round(entry.coins).toLocaleString('vi-VN')} xu`;
      row.append(rank, name, coins);
      list.append(row);
    });
    previous = leaders.map(entry => entry.name);
    panel.hidden = leaders.length === 0;
  };
  return {
    add(name, coins) {
      const amount = Number(coins);
      if (!Number.isFinite(amount) || amount <= 0) return;
      const key = String(name ?? '').trim() || 'Ẩn danh';
      const entry = donors.get(key) || { name: key, coins: 0, order: donors.size };
      if (!Number.isFinite(entry.coins + amount)) return;
      entry.coins += amount;
      donors.set(key, entry);
      render();
    },
    reset() { donors.clear(); previous = []; render(); },
    /** Toàn bộ danh sách (để lưu lại khi tải lại trang) */
    entries() { return [...donors.values()].map(({ name, coins, order }) => ({ name, coins, order })); },
    restore(list) {
      donors.clear();
      for (const e of list ?? []) if (e?.name && Number.isFinite(e.coins)) donors.set(e.name, { name: e.name, coins: e.coins, order: e.order ?? donors.size });
      previous = top(3).map((e) => e.name);
      render();
    },
    top,
  };
}
