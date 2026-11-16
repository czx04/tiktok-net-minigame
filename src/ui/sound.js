export function createSound() {
  let context, master, compressor, noise;
  let muted = false, typing = 0, typingTimer, lastHeart = -Infinity;
  try { muted = localStorage.getItem('quannet.muted') === 'true'; } catch { /* Storage may be blocked. */ }

  const ready = () => context?.state === 'running' && !muted;
  const safely = action => {
    if (!ready()) return;
    try { action(); } catch { /* Audio is optional, including on unsupported browsers. */ }
  };
  function tone(frequency, duration, volume, delay = 0, type = 'sine', endFrequency = frequency) {
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + Math.min(.012, duration / 4));
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
  }
  function click() {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const start = context.currentTime;
    source.buffer = noise;
    filter.type = 'bandpass';
    filter.frequency.value = 900 + Math.random() * 1100;
    filter.Q.value = .8;
    envelope.gain.setValueAtTime(.018 + Math.random() * .015, start);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + .025);
    source.connect(filter); filter.connect(envelope); envelope.connect(master);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    source.start(start);
    source.stop(start + .035);
  }
  function scheduleTyping() {
    clearTimeout(typingTimer);
    if (!typing || !ready()) return;
    typingTimer = setTimeout(() => {
      safely(click);
      scheduleTyping();
    }, (100 + Math.random() * 450) / typing);
  }
  function unlock() {
    try {
      if (!context) {
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Audio) return;
        const next = new Audio();
        try {
          const nextMaster = next.createGain();
          const nextCompressor = next.createDynamicsCompressor();
          nextMaster.gain.value = muted ? 0 : .35;
          nextCompressor.threshold.value = -18;
          nextCompressor.knee.value = 18;
          nextCompressor.ratio.value = 3;
          nextCompressor.attack.value = .006;
          nextCompressor.release.value = .18;
          nextMaster.connect(nextCompressor); nextCompressor.connect(next.destination);
          const nextNoise = next.createBuffer(1, Math.ceil(next.sampleRate * .04), next.sampleRate);
          const samples = nextNoise.getChannelData(0);
          for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
          context = next; master = nextMaster; compressor = nextCompressor; noise = nextNoise;
          context.onstatechange = scheduleTyping;
        } catch {
          next.close()?.catch(() => {});
          return;
        }
      }
      if (context.state === 'suspended') {
        context.resume()?.then(scheduleTyping).catch(() => {});
      } else scheduleTyping();
    } catch { /* Autoplay restrictions must never interrupt the game. */ }
  }
  const firstInteraction = () => { unlock(); };
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', firstInteraction, { once: true, capture: true });
    document.addEventListener('keydown', firstInteraction, { once: true, capture: true });
  }

  return {
    unlock,
    setMuted(value) {
      muted = Boolean(value);
      try { localStorage.setItem('quannet.muted', String(muted)); } catch { /* Optional persistence. */ }
      try { master?.gain.setTargetAtTime(muted ? 0 : .35, context.currentTime, .015); } catch { /* Optional audio. */ }
      scheduleTyping();
    },
    isMuted: () => muted,
    setTyping(level) {
      typing = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0;
      scheduleTyping();
    },
    ting() { safely(() => { tone(1046.5, .55, .13); tone(1568, .4, .045, .035); }); },
    heart() {
      safely(() => {
        if (context.currentTime - lastHeart < 1 / 6) return;
        lastHeart = context.currentTime;
        tone(440, .075, .055, 0, 'sine', 760);
      });
    },
    fanfare() {
      safely(() => {
        [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((frequency, i) => {
          tone(frequency, i === 5 ? .65 : .22, .095, i * .17, 'triangle');
        });
      });
    },
    powerDown() { safely(() => { tone(330, .8, .12, 0, 'triangle', 65); }); },
    powerUp() { safely(() => { tone(196, .25, .09); tone(392, .3, .09, .18); tone(784, .5, .09, .36); }); },
    alarm() { safely(() => { tone(440, .18, .09); tone(349.23, .28, .08, .24); }); },
    scold() {
      safely(() => {
        [145, 120, 160, 130, 110].forEach((frequency, i) => {
          tone(frequency, .13, .07, i * .17, 'triangle', frequency * .8);
        });
      });
    },
  };
}
