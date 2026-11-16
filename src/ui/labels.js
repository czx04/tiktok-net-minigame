export function createLabel(name, kind = 'player') {
  const el = document.createElement('div');
  el.className = `character-label kind-${['player', 'npc', 'mom'].includes(kind) ? kind : 'player'}`;
  const anchor = document.createElement('div');
  anchor.className = 'label-anchor';
  const bubble = document.createElement('div');
  bubble.className = 'label-bubble';
  bubble.hidden = true;
  const plate = document.createElement('div');
  plate.className = 'label-plate';
  const crown = document.createElement('span');
  crown.className = 'label-crown';
  crown.textContent = '♛';
  crown.hidden = true;
  const title = document.createElement('span');
  title.className = 'label-name';
  const timer = document.createElement('span');
  timer.className = 'label-timer';
  timer.hidden = true;
  plate.append(crown, title, timer);
  anchor.append(bubble, plate);
  el.append(anchor);
  document.getElementById('labels').append(el);
  let x = 0, y = 0, scale = 1, removed = false, speechTimeout;
  const timeouts = new Set();
  const hearts = new Set();
  const position = () => {
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    anchor.style.transform = `translate(-50%, -100%) scale(${scale})`;
  };
  title.textContent = String(name ?? '');
  position();

  return {
    el,
    setName(text) { title.textContent = String(text ?? ''); },
    setTimer(text, state = 'normal') {
      timer.textContent = String(text ?? '');
      timer.dataset.state = state;
      timer.hidden = state === 'hidden';
    },
    say(text, seconds = 3.5) {
      if (removed) return;
      clearTimeout(speechTimeout);
      const chars = Array.from(String(text ?? ''));
      bubble.textContent = chars.length > 60 ? `${chars.slice(0, 59).join('')}…` : chars.join('');
      bubble.hidden = !bubble.textContent;
      speechTimeout = setTimeout(() => { bubble.hidden = true; }, Math.max(0, seconds) * 1000);
    },
    setVip(value) {
      el.classList.toggle('is-vip', Boolean(value));
      crown.hidden = !value;
    },
    popHeart(count = 1) {
      if (removed) return;
      const amount = Math.min(4, Math.max(0, Math.floor(Number(count) || 0)));
      for (let i = 0; i < amount; i++) {
        const timeout = setTimeout(() => {
          timeouts.delete(timeout);
          if (removed) return;
          const heart = document.createElement('span');
          heart.className = 'label-heart';
          heart.textContent = '❤';
          heart.setAttribute('aria-hidden', 'true');
          heart.style.setProperty('--heart-x', `${Math.round(Math.random() * 30 - 15)}px`);
          anchor.append(heart);
          // Dọn cả khi animation bị tắt bởi thiết lập giảm chuyển động.
          const cleanup = setTimeout(() => {
            heart.remove(); hearts.delete(heart); timeouts.delete(cleanup);
          }, 1500);
          timeouts.add(cleanup);
          hearts.add(heart);
        }, i * 120);
        timeouts.add(timeout);
      }
    },
    setPosition(xPx, yPx, visible = true) {
      x = Number.isFinite(xPx) ? xPx : 0;
      y = Number.isFinite(yPx) ? yPx : 0;
      el.hidden = !visible;
      position();
    },
    setScale(s) { scale = Number.isFinite(s) ? Math.max(0, s) : 1; position(); },
    remove() {
      removed = true;
      clearTimeout(speechTimeout);
      timeouts.forEach(clearTimeout);
      timeouts.clear();
      hearts.forEach(heart => heart.remove());
      hearts.clear();
      el.remove();
    },
  };
}
