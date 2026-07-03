// celtic-knot — interlaced strapwork. A diagonal plait on a seeded grid:
// every cell carries two crossing diagonals; seeded "breaks" merge cells into
// longer weaving straps (the classic knotwork move). The over-under illusion
// comes from drawing order: every strap is drawn wide-outline-then-fill, and
// the "over" diagonal of each cell is drawn after its "under" partner. A
// highlight dash slides along the straps with t (pure function of t).
// density = grid fineness, intensity = strap weight.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let cellsX = 0;
  let cellsY = 0;
  let breaks = null; // Uint8Array per cell: 0 cross, 1 horizontal pair, 2 vertical pair
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 8);
    const s = Math.min(w, h);
    const cell = Math.max(28, s * (0.16 - params.density * 0.08));
    cellsX = Math.max(3, Math.ceil(w / cell));
    cellsY = Math.max(3, Math.ceil(h / cell));
    breaks = new Uint8Array(cellsX * cellsY);
    for (let i = 0; i < breaks.length; i++) {
      const r = rand();
      breaks[i] = r < 0.18 ? 1 : r < 0.36 ? 2 : 0;
    }
    lastKey = `${params.seed}|${params.density}|${w}x${h}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${w}x${h}`;
    if (!breaks || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const cw = w / cellsX;
    const ch = h / cellsY;
    const strap = (3 + params.intensity * 5) * px;
    const outline = rgbCss(c.fg);
    const fill = rgbCss(c.primary);
    const glint = rgbaCss(c.accent, 0.9);
    c2d.lineCap = 'round';

    // One diagonal segment of a cell; kind 'a' runs TL->BR, 'b' runs BL->TR.
    // Break codes reroute the pair into arcs that turn back (longer straps).
    function seg(ix, iy, kind, pass) {
      const x = ix * cw;
      const y = iy * ch;
      const code = breaks[iy * cellsX + ix];
      c2d.strokeStyle = pass === 0 ? outline : pass === 1 ? fill : glint;
      c2d.lineWidth = pass === 0 ? strap + 3 * px : pass === 1 ? strap : 1.4 * px;
      if (pass === 2) {
        // Sliding highlight: dashes travel along the strap direction.
        c2d.setLineDash([cw * 0.22, cw * 0.78]);
        c2d.lineDashOffset = -t * 24 - (ix + iy) * 7;
      }
      c2d.beginPath();
      if (code === 1) {
        // Horizontal turn-backs: both diagonals become top/bottom arcs.
        if (kind === 'a') c2d.arc(x + cw / 2, y, cw * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
        else c2d.arc(x + cw / 2, y + ch, cw * 0.32, 1.15 * Math.PI, 1.85 * Math.PI);
      } else if (code === 2) {
        // Vertical turn-backs: left/right arcs.
        if (kind === 'a') c2d.arc(x, y + ch / 2, ch * 0.32, -0.35 * Math.PI, 0.35 * Math.PI);
        else c2d.arc(x + cw, y + ch / 2, ch * 0.32, 0.65 * Math.PI, 1.35 * Math.PI);
      } else if (kind === 'a') {
        c2d.moveTo(x + cw * 0.08, y + ch * 0.08);
        c2d.lineTo(x + cw * 0.92, y + ch * 0.92);
      } else {
        c2d.moveTo(x + cw * 0.08, y + ch * 0.92);
        c2d.lineTo(x + cw * 0.92, y + ch * 0.08);
      }
      c2d.stroke();
      c2d.setLineDash([]);
    }

    // Weave: for each cell, the "under" diagonal first (checkerboard picks
    // which), then the "over" one — outline+fill per diagonal so the over
    // strap visually severs the under strap at the crossing.
    for (let iy = 0; iy < cellsY; iy++) {
      for (let ix = 0; ix < cellsX; ix++) {
        const overA = (ix + iy) % 2 === 0;
        const order = overA ? ['b', 'a'] : ['a', 'b'];
        for (const kind of order) {
          seg(ix, iy, kind, 0);
          seg(ix, iy, kind, 1);
        }
        seg(ix, iy, order[1], 2);
      }
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      breaks = null;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      breaks = null;
    },
  };
}
