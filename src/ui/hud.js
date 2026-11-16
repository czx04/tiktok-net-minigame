export function createHud(root) {
  const make = (tag, className, parent) => {
    const el = document.createElement(tag);
    el.className = className;
    parent.append(el);
    return el;
  };
  const top = make('div', 'hud-top', root);
  const goal = make('div', 'hud-goal', top);
  const goalText = make('div', 'goal-text', goal);
  const track = make('div', 'goal-track', goal);
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', '100');
  const fill = make('div', 'goal-fill', track);
  const count = make('div', 'hud-count', top);
  const notice = make('div', 'hud-banner', root);
  notice.setAttribute('role', 'status');
  const heading = make('div', 'banner-title', notice);
  const subtitle = make('div', 'banner-sub', notice);
  const feed = make('div', 'hud-feed', root);
  feed.setAttribute('aria-live', 'polite');
  const flash = make('div', 'hud-flash', root);
  const rows = [];
  let bannerTimeout, flashTimeout;
  const drop = entry => {
    clearTimeout(entry.fade);
    clearTimeout(entry.remove);
    entry.el.remove();
    const index = rows.indexOf(entry);
    if (index >= 0) rows.splice(index, 1);
  };
  return {
    feed(name, text) {
      const row = make('div', 'feed-row', feed);
      const who = make('strong', 'feed-name', row);
      who.textContent = String(name ?? '');
      const message = make('span', 'feed-message', row);
      message.textContent = `${name ? ' ' : ''}${String(text ?? '')}`;
      const entry = { el: row };
      rows.push(entry);
      while (rows.length > 5) drop(rows[0]);
      entry.fade = setTimeout(() => row.classList.add('is-fading'), 7500);
      entry.remove = setTimeout(() => drop(entry), 8000);
    },
    banner(title, sub, seconds = 4) {
      clearTimeout(bannerTimeout);
      heading.textContent = String(title ?? '');
      subtitle.textContent = String(sub ?? '');
      subtitle.hidden = !subtitle.textContent;
      notice.classList.add('is-visible');
      if (seconds > 0) bannerTimeout = setTimeout(() => notice.classList.remove('is-visible'), seconds * 1000);
    },
    hideBanner() { clearTimeout(bannerTimeout); notice.classList.remove('is-visible'); },
    setGoal(name, coins, need) {
      const current = Math.max(0, Number(coins) || 0);
      const target = Math.max(0, Number(need) || 0);
      const percent = target > 0 ? Math.min(100, current / target * 100) : 0;
      goalText.textContent = `Mục tiêu: ${name ?? ''} · ${current.toLocaleString('vi-VN')}/${target.toLocaleString('vi-VN')} xu`;
      fill.style.width = `${percent}%`;
      track.setAttribute('aria-label', goalText.textContent);
      track.setAttribute('aria-valuenow', String(Math.round(percent)));
    },
    setCount(used, total) { count.textContent = `${used}/${total} máy`; },
    flash(color) {
      clearTimeout(flashTimeout);
      flash.style.backgroundColor = color || 'var(--accent)';
      flash.classList.remove('is-flashing');
      void flash.offsetWidth;
      flash.classList.add('is-flashing');
      flashTimeout = setTimeout(() => flash.classList.remove('is-flashing'), 650);
    },
  };
}
