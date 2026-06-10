import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// meander — Greek-key fret. Each row is one continuous key path repeated across
// the width; rows scroll horizontally in alternating directions with a parallax
// speed that varies by row, and a faint dash offset shimmers along the stroke.
// Strokes alternate primary/accent on bg. `density` = key size / row count,
// `intensity` = stroke weight + dash contrast.

// One period of a continuous meander key, in unit coordinates. Starts at (0,0)
// on the baseline and ends at (4,0) so periods tile seamlessly with no retrace.
const KEY = [
  [0, 0],
  [0, 3],
  [3, 3],
  [3, 1],
  [1, 1],
  [1, 0],
  [4, 0],
];
const PERIOD_U = 4; // key width in units

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const density = params.density ?? 0.5;
    const unit = Math.max(8, Math.min(w, h) * (0.06 - 0.03 * density));
    const rowH = unit * 4; // 3 units of key + 1 unit gap
    const rows = Math.ceil(h / rowH) + 1;
    const rowMeta = [];
    for (let r = 0; r < rows; r++) {
      rowMeta.push({
        dir: r % 2 === 0 ? 1 : -1,
        speed: 0.4 + rng() * 0.8, // parallax: each row drifts at its own rate
        ci: r % 2, // alternate primary/accent
      });
    }
    cache = { key, unit, rowH, rows, rowMeta };
    return cache;
  }

  function frame(t, params) {
    const { unit, rowH, rows, rowMeta } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const cols = [c.primary || [0.3, 0.5, 1], c.accent || [0.9, 0.3, 0.6]];
    const intensity = params.intensity ?? 0.5;
    const periodPx = PERIOD_U * unit;

    c2d.lineJoin = 'miter';
    c2d.lineCap = 'butt';
    c2d.lineWidth = Math.max(2, unit * (0.5 + 0.5 * intensity));
    const dash = unit * 6;
    c2d.setLineDash([dash, dash * (0.04 + 0.12 * intensity)]);

    for (let r = 0; r < rows; r++) {
      const meta = rowMeta[r];
      c2d.strokeStyle = rgb(cols[meta.ci]);
      const scroll = ((t * meta.speed * unit * 6 * meta.dir) % periodPx) - periodPx;
      const y0 = r * rowH + unit * 0.5;
      c2d.lineDashOffset = -t * meta.speed * unit * 2 * meta.dir;

      c2d.beginPath();
      // Draw enough periods to cover the width plus one for the scroll wrap.
      const reps = Math.ceil(w / periodPx) + 2;
      for (let p = 0; p < reps; p++) {
        const ox = scroll + p * periodPx;
        for (let k = 0; k < KEY.length; k++) {
          const px = ox + KEY[k][0] * unit;
          const py = y0 + (3 - KEY[k][1]) * unit; // flip so the key opens upward
          if (k === 0) c2d.moveTo(px, py);
          else c2d.lineTo(px, py);
        }
      }
      c2d.stroke();
    }
    c2d.setLineDash([]);
    c2d.lineDashOffset = 0;
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      cache = null;
    },
  };
}
