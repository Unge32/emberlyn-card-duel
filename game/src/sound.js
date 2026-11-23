// Tiny WebAudio synth: no audio files, no network. A short blip per event.
export function createSound() {
  let ctx = null;
  let muted = false;
  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function tone(freq, dur, type = 'sine', gain = 0.08, when = 0) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
  return {
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    select() {
      tone(660, 0.07, 'sine', 0.05);
    },
    play() {
      tone(392, 0.1, 'triangle', 0.08);
      tone(523, 0.12, 'triangle', 0.08, 0.07);
    },
    surge() {
      tone(523, 0.1, 'sawtooth', 0.06);
      tone(659, 0.1, 'sawtooth', 0.06, 0.08);
      tone(784, 0.18, 'sawtooth', 0.07, 0.16);
    },
    hurt() {
      tone(180, 0.18, 'square', 0.05);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.08, i * 0.12));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', 0.07, i * 0.13));
    },
  };
}
