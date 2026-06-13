import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// barkcloth — 1950s tiki / Hawaiian barkcloth textile. A repeating print of
// stylized tropical motifs (monstera leaves, hibiscus blooms, abstract fronds
// and pods) scattered on a brick-offset tile grid in a muted period palette
// (theme roles softened toward bg). The whole cloth drifts very slowly and the
// blooms breathe, like fabric stirring in a breeze. Tiles seamlessly via wrap.
// The tropical answer to morris/quilt; distinct from seigaiha (waves) and
// damask (mirrored flourish). `density` = motif scale, `intensity` = print
// saturation. Layout seeded + cached.

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const MOTIFS = ['monstera', 'hibiscus', 'frond', 'pod'];

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const tile = Math.min(w, h) * (0.46 - 0.22 * (params.density ?? 0.5)); // motif scale
    // One motif per tile cell, brick-offset every other row, seeded kind/rot/ci.
    const cells = [];
    const cols = Math.ceil(w / tile) + 2;
    const rows = Math.ceil(h / tile) + 2;
    for (let r = -1; r < rows; r++) {
      for (let cN = -1; cN < cols; cN++) {
        cells.push({
          col: cN,
          row: r,
          kind: MOTIFS[(rng() * MOTIFS.length) | 0],
          rot: rng() * Math.PI * 2,
          scale: 0.7 + rng() * 0.4,
          ci: (rng() * 5) | 0,
          breathPh: rng() * Math.PI * 2,
        });
      }
    }
    cache = { key, tile, cells };
    return cache;
  }

  function palette(c, intensity) {
    // Muted avocado / mustard / burnt-orange / teal feel from theme roles.
    const base = [c.success, c.warning, c.accent, c.info, c.primary].filter(Boolean);
    while (base.length < 5) base.push(c.fg || [0.5, 0.5, 0.4]);
    const toward = c.bg && c.bg[3] > 0.01 ? c.bg : [0.86, 0.82, 0.7];
    return base.map((col) => mix(col, toward, 0.42 - 0.28 * intensity));
  }

  function drawMotif(kind, s, breath, col, ink) {
    c2d.fillStyle = rgb(col);
    c2d.strokeStyle = rgb(ink, 0.5);
    c2d.lineWidth = Math.max(1, s * 0.02);
    c2d.lineJoin = 'round';
    if (kind === 'monstera') {
      // Heart-ish leaf with split lobes (Swiss-cheese plant).
      c2d.beginPath();
      c2d.moveTo(0, -s * 0.5);
      c2d.quadraticCurveTo(s * 0.6, -s * 0.4, s * 0.5, s * 0.1);
      c2d.quadraticCurveTo(s * 0.4, s * 0.55, 0, s * 0.55);
      c2d.quadraticCurveTo(-s * 0.4, s * 0.55, -s * 0.5, s * 0.1);
      c2d.quadraticCurveTo(-s * 0.6, -s * 0.4, 0, -s * 0.5);
      c2d.closePath();
      c2d.fill();
      // Fenestration slits (cut toward the midrib) drawn in ink.
      c2d.strokeStyle = rgb(ink, 0.4);
      c2d.lineWidth = Math.max(1.5, s * 0.04);
      c2d.beginPath();
      for (const sgn of [-1, 1]) {
        for (let i = 1; i <= 3; i++) {
          const y = -s * 0.3 + i * s * 0.22;
          c2d.moveTo(0, y);
          c2d.lineTo(sgn * s * (0.18 + i * 0.07), y + s * 0.04);
        }
      }
      c2d.moveTo(0, -s * 0.45);
      c2d.lineTo(0, s * 0.5); // midrib
      c2d.stroke();
    } else if (kind === 'hibiscus') {
      const pr = s * (0.42 + 0.05 * breath);
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        c2d.save();
        c2d.rotate(a);
        c2d.beginPath();
        c2d.moveTo(0, 0);
        c2d.quadraticCurveTo(pr * 0.5, -pr * 0.5, 0, -pr);
        c2d.quadraticCurveTo(-pr * 0.5, -pr * 0.5, 0, 0);
        c2d.fill();
        c2d.restore();
      }
      // Stamen + centre.
      c2d.strokeStyle = rgb(ink, 0.6);
      c2d.beginPath();
      c2d.moveTo(0, 0);
      c2d.lineTo(0, -s * 0.55);
      c2d.stroke();
      c2d.fillStyle = rgb(ink, 0.7);
      c2d.beginPath();
      c2d.arc(0, 0, s * 0.1, 0, Math.PI * 2);
      c2d.fill();
    } else if (kind === 'frond') {
      // A simple feather frond.
      c2d.strokeStyle = rgb(col);
      c2d.lineWidth = Math.max(1.5, s * 0.05);
      c2d.beginPath();
      c2d.moveTo(0, s * 0.5);
      c2d.quadraticCurveTo(s * 0.1, 0, 0, -s * 0.55);
      c2d.stroke();
      c2d.lineWidth = Math.max(1, s * 0.03);
      c2d.beginPath();
      for (let i = -4; i <= 4; i++) {
        const y = i * s * 0.11;
        const ll = s * 0.3 * (1 - Math.abs(i) / 6);
        c2d.moveTo(0, y);
        c2d.lineTo(ll, y - s * 0.06);
        c2d.moveTo(0, y);
        c2d.lineTo(-ll, y - s * 0.06);
      }
      c2d.stroke();
    } else {
      // pod / abstract seed cluster: a few stacked lozenges.
      for (let i = 0; i < 3; i++) {
        c2d.save();
        c2d.rotate((i - 1) * 0.4);
        c2d.beginPath();
        c2d.ellipse(0, -s * 0.1 - i * s * 0.12, s * 0.12, s * 0.3, 0, 0, Math.PI * 2);
        c2d.fill();
        c2d.restore();
      }
      c2d.strokeStyle = rgb(ink, 0.5);
      c2d.beginPath();
      c2d.moveTo(0, s * 0.45);
      c2d.lineTo(0, -s * 0.1);
      c2d.stroke();
    }
  }

  function frame(t, params) {
    const { tile, cells } = build(params);
    const c = getColors();
    const intensity = params.intensity ?? 0.5;
    const groundCol = mix(
      c.bg && c.bg[3] > 0.01 ? c.bg : [0.85, 0.8, 0.68],
      c.warning || [0.8, 0.7, 0.4],
      0.12
    );
    clearAndFill(c2d, w, h, groundCol);
    const pal = palette(c, intensity);
    const ink = mix(c.fg || [0.2, 0.18, 0.12], groundCol, 0.2);

    // Slow whole-cloth drift (wraps with the tile).
    const driftX = (t * 4) % tile;
    const driftY = (t * 2.5) % tile;

    for (const cell of cells) {
      const breath = 0.5 + 0.5 * Math.sin(t * 0.5 + cell.breathPh);
      // Brick offset on odd rows; apply drift.
      const ox = cell.col * tile + (cell.row & 1 ? tile * 0.5 : 0) + driftX;
      const oy = cell.row * tile + driftY;
      const cx = ox + tile * 0.5;
      const cy = oy + tile * 0.5;
      if (cx < -tile || cx > w + tile || cy < -tile || cy > h + tile) continue;
      c2d.save();
      c2d.translate(cx, cy);
      c2d.rotate(cell.rot);
      const s = tile * 0.62 * cell.scale * (1 + 0.04 * breath);
      drawMotif(cell.kind, s, breath, pal[cell.ci % pal.length], ink);
      c2d.restore();
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
      frame(0.5, params);
    },
    dispose() {
      cache = null;
    },
  };
}
