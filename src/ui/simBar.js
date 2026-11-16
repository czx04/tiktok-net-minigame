export function createSimBar(root, { onAction, autoRun = true }) {
  root.classList.add('sim-bar');
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Giả lập tương tác Live, nhấn H để ẩn hoặc hiện');
  let auto = Boolean(autoRun);
  const actions = [
    ['join', '🚪', 'Khách vào'], ['like', '❤', 'Thả tim'],
    ['comment', '💬', 'Bình luận'], ['rose', '🌹', 'Hoa hồng'],
    ['small', '🥤', 'Quà nhỏ'], ['medium', '👑', 'Quà vừa'],
    ['big', '🎁', 'Quà to'], ['blackout', '💡', 'Mất điện'],
    ['mom', '👩', 'Mẹ đến'], ['happyHour', '⭐', 'Giờ vàng'],
    ['shipper', '🛵', 'Shipper'], ['duel', '⚔️', 'Solo'], ['auto', '▶', 'Tự chạy'],
  ];
  let autoButton;
  const setAuto = value => {
    auto = Boolean(value);
    autoButton.classList.toggle('is-active', auto);
    autoButton.setAttribute('aria-pressed', String(auto));
  };
  for (const [type, emoji, label] of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sim-button';
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = emoji;
    const text = document.createElement('span');
    text.textContent = label;
    button.append(icon, text);
    if (type === 'auto') autoButton = button;
    button.addEventListener('click', () => {
      if (type === 'auto') { setAuto(!auto); onAction('auto', auto); }
      else onAction(type);
    });
    root.append(button);
  }
  setAuto(auto);
  // Feed tự né chiều cao thực tế của thanh, kể cả khi các nút xuống dòng.
  const measure = () => document.body.style.setProperty('--simbar-height', `${root.getBoundingClientRect().height}px`);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(measure).observe(root);
  else window.addEventListener('resize', measure);
  measure();
  document.addEventListener('keydown', event => {
    if (event.key.toLowerCase() !== 'h' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    const target = event.target;
    if (target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]') || target?.isContentEditable) return;
    root.hidden = !root.hidden;
    document.body.classList.toggle('sim-hidden', root.hidden);
    measure();
  });
  document.body.classList.toggle('sim-hidden', root.hidden);
  return { setAuto, isVisible: () => !root.hidden };
}
