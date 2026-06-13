import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// breezeblock — an atomic-ranch decorative concrete screen. A tiled grid of one
// geometric aperture motif (hourglass, circle-in-square, leaf, double-Y) with
// warm light raking through the openings from behind: a slow diagonal light
// band (shine.js logic) brightens apertures as it crosses, and a single
// starburst sunburst floats over the wall. Block face in fg/primary muted
// toward bg; light in warning/accent. `density` = aperture count, `intensity`
// = backlight strength. `mode`: hourglass | circle | leaf | mixed.
// staticFrame: a lit wall mid-sweep.

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const MOTIFS = ['hourglass', 'circle', 'leaf', 'doubley'];

export function create({ c2d, getColors, host }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function readMode() {
    const m = (host?.getAttribute('mode') || 'mixed').toLowerCase();
    return MOTIFS.includes(m) ? m : 'mixed';
  }

  function build(params) {
    const mode = readMode();
    const key = `${params.seed | 0}|${params.density}|${mode}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const cols = 3 + Math.round((params.density ?? 0.5) * 6);
    const cell = w / cols;
    const rows = Math.ceil(h / cell) + 1;
    const blocks = [];
    for (let gy = 0; gy < rows; gy++)
      for (let gx = 0; gx < cols; gx++) {
        const motif = mode === 'mixed' ? MOTIFS[(rng() * 3) | 0] : mode; // exclude doubley from random unless chosen
        blocks.push({ gx, gy, motif });
      }
    // Sunburst clock placed on a seeded cell intersection.
    const sun = {
      x: (0.3 + rng() * 0.4) * w,
      y: (0.3 + rng() * 0.4) * h,
      r: cell * (0.7 + rng() * 0.5),
      rays: 16 + ((rng() * 12) | 0),
    };
    cache = { key, cols, cell, rows, blocks, sun };
    return cache;
  }

  // Add the aperture (hole) for a cell as a subpath of the CURRENT path — no
  // beginPath, so several can compose into one even-odd fill (the wall punch).
  function aperturePath(motif, x, y, s, m) {
    const x0 = x + m;
    const y0 = y + m;
    const sw = s - 2 * m;
    const cx = x + s / 2;
    const cy = y + s / 2;
    if (motif === 'circle') {
      c2d.moveTo(cx + sw * 0.42, cy);
      c2d.arc(cx, cy, sw * 0.42, 0, Math.PI * 2);
    } else if (motif === 'hourglass') {
      c2d.moveTo(x0, y0);
      c2d.lineTo(x0 + sw, y0);
      c2d.lineTo(cx, cy);
      c2d.lineTo(x0 + sw, y0 + sw);
      c2d.lineTo(x0, y0 + sw);
      c2d.lineTo(cx, cy);
      c2d.closePath();
    } else if (motif === 'leaf') {
      c2d.moveTo(cx, y0);
      c2d.quadraticCurveTo(x0 + sw, cy, cx, y0 + sw);
      c2d.quadraticCurveTo(x0, cy, cx, y0);
      c2d.closePath();
    } else {
      // doubley: two opposed wedges
      c2d.moveTo(x0, y0);
      c2d.lineTo(cx, cy - sw * 0.12);
      c2d.lineTo(x0 + sw, y0);
      c2d.lineTo(cx + sw * 0.12, cy);
      c2d.lineTo(x0 + sw, y0 + sw);
      c2d.lineTo(cx, cy + sw * 0.12);
      c2d.lineTo(x0, y0 + sw);
      c2d.lineTo(cx - sw * 0.12, cy);
      c2d.closePath();
    }
  }

  function frame(t, params) {
    const { cols, cell, blocks, sun } = build(params);
    const c = getColors();
    const bg = c.bg && c.bg[3] > 0.01 ? c.bg : [0.12, 0.1, 0.12];
    const intensity = params.intensity ?? 0.5;
    const warm = c.warning || [1, 0.7, 0.3];
    const accent = c.accent || [1, 0.5, 0.35];
    const block = mix(c.fg || c.primary || [0.7, 0.68, 0.62], bg, 0.45);

    // Backlight wall: warm gradient behind the screen.
    clearAndFill(c2d, w, h, bg);
    const back = c2d.createLinearGradient(0, 0, w, h);
    back.addColorStop(0, rgb(mix(bg, warm, 0.2)));
    back.addColorStop(1, rgb(mix(bg, accent, 0.3)));
    c2d.fillStyle = back;
    c2d.fillRect(0, 0, w, h);

    // Light band sweeping diagonally (shine logic) brightens apertures.
    const sweep = (fract) => {
      const s = ((t * 0.08) % 1.6) - 0.3;
      return 1 - Math.min(1, Math.abs(fract - s) / 0.32);
    };

    const m = cell * 0.14;
    // Glow under apertures where the light band crosses.
    for (const b of blocks) {
      const x = b.gx * cell;
      const y = b.gy * cell;
      const diag = (x / w) * 0.5 + (y / h) * 0.5;
      const lightAmt = Math.max(0, sweep(diag)) * (0.5 + 0.6 * intensity);
      if (lightAmt > 0.02) {
        c2d.beginPath();
        aperturePath(b.motif, x, y, cell, m);
        c2d.fillStyle = rgb(mix(warm, [1, 1, 0.85], 0.4), 0.4 + 0.5 * lightAmt);
        c2d.fill();
      }
    }

    // The concrete screen: fill everything, then punch the apertures.
    c2d.save();
    c2d.beginPath();
    c2d.rect(0, 0, w, h);
    for (const b of blocks) aperturePath(b.motif, b.gx * cell, b.gy * cell, cell, m);
    c2d.fillStyle = rgb(block);
    c2d.fill('evenodd');
    c2d.restore();

    // Mortar lines between blocks.
    c2d.strokeStyle = rgb(mix(block, [0, 0, 0], 0.25), 0.5);
    c2d.lineWidth = Math.max(1, cell * 0.02);
    c2d.beginPath();
    for (let gx = 0; gx <= cols; gx++) {
      c2d.moveTo(gx * cell, 0);
      c2d.lineTo(gx * cell, h);
    }
    for (let y = 0; y <= h; y += cell) {
      c2d.moveTo(0, y);
      c2d.lineTo(w, y);
    }
    c2d.stroke();

    // Starburst sunburst clock floating over the wall, slowly rotating.
    const rot = t * 0.06;
    c2d.strokeStyle = rgb(mix(warm, [1, 1, 1], 0.3));
    c2d.lineWidth = Math.max(1.5, cell * 0.03);
    c2d.lineCap = 'round';
    c2d.beginPath();
    for (let i = 0; i < sun.rays; i++) {
      const a = rot + (i / sun.rays) * Math.PI * 2;
      const inner = sun.r * (i % 2 === 0 ? 0.4 : 0.6);
      const outer = sun.r * (i % 2 === 0 ? 1 : 0.78);
      c2d.moveTo(sun.x + Math.cos(a) * inner, sun.y + Math.sin(a) * inner);
      c2d.lineTo(sun.x + Math.cos(a) * outer, sun.y + Math.sin(a) * outer);
    }
    c2d.stroke();
    c2d.fillStyle = rgb(mix(accent, [1, 1, 1], 0.2));
    c2d.beginPath();
    c2d.arc(sun.x, sun.y, sun.r * 0.28, 0, Math.PI * 2);
    c2d.fill();
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      frame(2, params);
    },
    dispose() {
      cache = null;
    },
  };
}
