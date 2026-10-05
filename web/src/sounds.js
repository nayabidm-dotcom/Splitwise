export function useAppSounds() {
  const play = (freq, dur, type = 'sine', vol = 0.08) => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + dur);
      setTimeout(() => ctx.close(), dur * 1000 + 100);
    } catch {}
  };
  return {
    success: () => { play(523.25, 0.1, 'sine', 0.09); setTimeout(() => play(659.25, 0.14, 'sine', 0.09), 80); },
    error: () => play(180, 0.28, 'square', 0.06),
    coin: () => { play(880, 0.08, 'sine', 0.09); setTimeout(() => play(1174.66, 0.12, 'sine', 0.09), 60); setTimeout(() => play(1318.51, 0.18, 'sine', 0.08), 130); },
  };
}