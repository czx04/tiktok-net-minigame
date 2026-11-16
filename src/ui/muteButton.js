export function createMuteButton(root = document.body, sound) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mute-button';
  const update = () => {
    const muted = sound.isMuted();
    button.textContent = muted ? '🔇' : '🔊';
    button.setAttribute('aria-label', muted ? 'Bật âm thanh (M)' : 'Tắt âm thanh (M)');
    button.setAttribute('aria-pressed', String(muted));
    button.title = muted ? 'Bật âm thanh (M)' : 'Tắt âm thanh (M)';
  };
  const toggle = () => { sound.unlock(); sound.setMuted(!sound.isMuted()); update(); };
  button.addEventListener('click', toggle);
  const onKey = event => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if (event.composedPath().some(el => el instanceof Element &&
      (el.matches('input, textarea, select, [role="textbox"]') || el.isContentEditable))) return;
    if (event.key.toLowerCase() !== 'm') return;
    event.preventDefault();
    toggle();
  };
  document.addEventListener('keydown', onKey);
  root.append(button);
  update();
  return {
    el: button,
    update,
    remove() { document.removeEventListener('keydown', onKey); button.remove(); },
  };
}
