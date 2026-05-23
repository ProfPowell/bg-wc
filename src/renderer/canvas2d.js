// Thin Canvas2D wrapper.

export function createC2DContext(canvas) {
  return canvas.getContext('2d', { alpha: true });
}

export function resizeCanvas(canvas, w, h, dpr) {
  const W = Math.max(1, Math.floor(w * dpr));
  const H = Math.max(1, Math.floor(h * dpr));
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  return [W, H];
}

// Wipe the canvas and optionally paint the bg color. Required because fillRect
// with alpha 0 is a no-op and would leave prior frames behind.
export function clearAndFill(c2d, w, h, bg) {
  c2d.clearRect(0, 0, w, h);
  if (bg && bg[3] > 0.01) {
    const r = (bg[0] * 255) | 0;
    const g = (bg[1] * 255) | 0;
    const b = (bg[2] * 255) | 0;
    c2d.fillStyle = `rgba(${r},${g},${b},${bg[3]})`;
    c2d.fillRect(0, 0, w, h);
  }
}
