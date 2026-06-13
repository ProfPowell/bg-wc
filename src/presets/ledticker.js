import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// ledticker — a single-colour dot-matrix LED sign. A fixed grid of round LEDs
// over a dark board; `text` (lines split on '|' cycle) is rasterized to a small
// bitmap and scrolled marquee-style under the grid with a short phosphor trail.
// Without text the dots run a scrolling oscilloscope-style waveform instead.
// Amber period palette from theme (accent/warning). `density` = dot pitch,
// `intensity` = lit brightness. Deterministic from `t` (scroll offset), so a
// frozen frame is stable. Distinct from pegboard (static pictures) and matrix
// (glyph rain) — this is a hardware marquee board.

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors, host }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function readText(params) {
    const txt = (host?.getAttribute('text') || params.text || '').trim();
    if (!txt) return null;
    return txt
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .join('   •   ');
  }

  function build(params) {
    const text = readText(params);
    const rows = 9 + 2 * Math.round((params.density ?? 0.5) * 3); // 9..15 dot rows
    const pitch = h / (rows + 2);
    const cols = Math.ceil(w / pitch);
    const key = `${rows}|${text || 'scope'}|${w}x${h}`;
    if (cache && cache.key === key) return cache;

    let bmp = null;
    let srcW = 0;
    if (text) {
      // Rasterize the message to a `rows`-tall bitmap; sample its alpha as LEDs.
      const off = document.createElement('canvas');
      const o = off.getContext('2d');
      o.font = `700 ${rows}px 'Arial Black', Arial, sans-serif`;
      srcW = Math.ceil(o.measureText(text).width) + cols; // trailing gap = one screen
      off.width = srcW;
      off.height = rows;
      const o2 = off.getContext('2d');
      o2.font = `700 ${rows}px 'Arial Black', Arial, sans-serif`;
      o2.textBaseline = 'middle';
      o2.fillStyle = '#fff';
      o2.fillText(text, 0, rows / 2 + 1);
      bmp = o2.getImageData(0, 0, srcW, rows).data;
    }
    cache = { key, rows, cols, pitch, text, bmp, srcW };
    return cache;
  }

  function frame(t, params) {
    const { rows, cols, pitch, text, bmp, srcW } = build(params);
    const c = getColors();
    const bg = c.bg && c.bg[3] > 0.01 ? c.bg : [0.05, 0.05, 0.06];
    clearAndFill(c2d, w, h, [bg[0] * 0.5, bg[1] * 0.5, bg[2] * 0.55, 1]);
    const intensity = params.intensity ?? 0.5;
    const on = c.accent || c.warning || [1, 0.65, 0.15];
    const off = mix(on, [0, 0, 0], 0.86);
    const r = pitch * 0.36;
    const oy = (h - rows * pitch) / 2 + pitch / 2;

    const scroll = t * 9; // dots per second

    for (let cx = 0; cx < cols; cx++) {
      const px = (cx + 0.5) * pitch;
      for (let ry = 0; ry < rows; ry++) {
        const py = oy + ry * pitch;
        let lit = 0;
        if (text) {
          // Marquee: sample source alpha at the scrolled column, with a trail.
          const sx = Math.floor(cx + scroll);
          for (let tr = 0; tr < 3; tr++) {
            const xx = (((sx - tr) % srcW) + srcW) % srcW;
            const a = bmp[(ry * srcW + xx) * 4 + 3];
            if (a > 128) {
              lit = Math.max(lit, 1 - tr * 0.35);
              break;
            }
          }
        } else {
          // Scope: a scrolling waveform; light dots near the trace.
          const phase = cx * 0.4 - t * 6;
          const trace = (rows - 1) * (0.5 + 0.42 * Math.sin(phase) * Math.sin(phase * 0.37 + 1));
          const d = Math.abs(ry - trace);
          lit = Math.max(0, 1 - d * 0.8);
        }
        if (lit > 0.04) {
          c2d.fillStyle = rgb(mix(off, mix(on, [1, 1, 1], 0.2 * lit), lit), 0.4 + 0.6 * intensity);
        } else {
          c2d.fillStyle = rgb(off, 0.5);
        }
        c2d.beginPath();
        c2d.arc(px, py, r, 0, Math.PI * 2);
        c2d.fill();
      }
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      frame(0.6, params);
    },
    dispose() {
      cache = null;
    },
  };
}
