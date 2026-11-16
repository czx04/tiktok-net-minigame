export function createHints(root, { items = [], everySeconds = 5 } = {}) {
  const pill = document.createElement('div');
  pill.className = 'hud-hints';
  pill.hidden = true;
  root.append(pill);

  const normalize = values => Array.isArray(values)
    ? values.filter(value => typeof value === 'string' && value.trim())
    : [];
  const interval = Number.isFinite(everySeconds) && everySeconds > 0 ? everySeconds : 5;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let messages = normalize(items);
  let index = 0;
  let visible = true;
  let urgent = null;
  let timer, swapTimer;

  function display(text, isUrgent) {
    clearTimeout(swapTimer);
    const commit = () => {
      pill.textContent = text;
      pill.classList.toggle('is-urgent', isUrgent);
      pill.classList.remove('is-leaving', 'is-entering');
      if (!reducedMotion.matches) {
        void pill.offsetWidth;
        pill.classList.add('is-entering');
      }
    };
    const wasHidden = pill.hidden;
    pill.hidden = !visible || !text;
    if (pill.hidden || wasHidden || reducedMotion.matches) {
      commit();
    } else if (pill.textContent !== text || pill.classList.contains('is-urgent') !== isUrgent) {
      pill.classList.remove('is-entering');
      pill.classList.add('is-leaving');
      swapTimer = setTimeout(commit, 160);
    } else {
      pill.classList.remove('is-leaving');
    }
  }

  function refresh() {
    clearTimeout(timer);
    const remaining = urgent ? urgent.until - Date.now() : 0;
    if (remaining <= 0) urgent = null;
    display(urgent ? urgent.text : messages[index] || '', Boolean(urgent));
    if (urgent) {
      timer = setTimeout(refresh, remaining);
    } else if (messages.length > 1) {
      timer = setTimeout(() => {
        index = (index + 1) % messages.length;
        refresh();
      }, interval * 1000);
    }
  }

  refresh();
  return {
    setItems(items) {
      messages = normalize(items);
      index = 0;
      if (!messages.length) urgent = null;
      refresh();
    },
    // A newer priority message replaces the previous one; rotation resumes at the same item.
    show(text, seconds = 5) {
      const duration = Number.isFinite(seconds) ? Math.max(0, seconds) : 5;
      urgent = typeof text === 'string' && text.trim() && duration > 0
        ? { text, until: Date.now() + duration * 1000 }
        : null;
      refresh();
    },
    setVisible(value) {
      visible = Boolean(value);
      refresh();
    },
  };
}
