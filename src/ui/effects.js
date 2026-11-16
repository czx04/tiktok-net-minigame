const duration = (seconds, fallback) => Number.isFinite(seconds) ? Math.max(.1, seconds) : fallback;

export function confetti(seconds = 3) {
  const lifetime = duration(seconds, 3);
  const overlay = document.createElement('div');
  overlay.className = 'confetti-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  const colors = ['#f2ab73', '#fff0d6', '#baded3', '#edbecb', '#f4d77c'];
  for (let i = 0; i < 120; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[i % colors.length];
    piece.style.width = `${5 + Math.random() * 6}px`;
    piece.style.height = `${7 + Math.random() * 8}px`;
    piece.style.setProperty('--confetti-drift', `${Math.random() * 30 - 15}vw`);
    piece.style.setProperty('--confetti-spin', `${Math.random() * 1080 - 540}deg`);
    piece.style.animationDuration = `${lifetime * (.65 + Math.random() * .2)}s`;
    piece.style.animationDelay = `${Math.random() * lifetime * .15}s`;
    overlay.append(piece);
  }
  document.body.append(overlay);
  setTimeout(() => overlay.remove(), lifetime * 1000 + 50);
}

let currentAnnouncement, announcementTimeout;
export function bigAnnounce(title, sub, seconds = 4) {
  clearTimeout(announcementTimeout);
  currentAnnouncement?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'big-announce-overlay';
  const card = document.createElement('div');
  card.className = 'big-announce';
  card.setAttribute('role', 'status');
  card.style.setProperty('--announce-duration', `${duration(seconds, 4)}s`);
  const heading = document.createElement('div');
  heading.className = 'big-announce-title';
  heading.textContent = String(title ?? '');
  const subtitle = document.createElement('div');
  subtitle.className = 'big-announce-sub';
  subtitle.textContent = String(sub ?? '');
  subtitle.hidden = !subtitle.textContent;
  card.append(heading, subtitle);
  overlay.append(card);
  document.body.append(overlay);
  currentAnnouncement = overlay;
  announcementTimeout = setTimeout(() => {
    overlay.remove();
    if (currentAnnouncement === overlay) currentAnnouncement = null;
  }, duration(seconds, 4) * 1000 + 50);
}
