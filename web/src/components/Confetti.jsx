import confetti from 'canvas-confetti';
export function celebrate() {
  const end = Date.now() + 1200;
  (function frame() {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#1cc29f', '#14a184', '#4fd1b3'] });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#1cc29f', '#14a184', '#4fd1b3'] });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}