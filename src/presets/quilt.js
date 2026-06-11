import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// quilt — patchwork. A grid of classic quilt blocks (log cabin, flying geese,
// pinwheel, nine-patch) assembles patch by patch — each patch pops in on a
// staggered schedule — under a cached fabric-grain overlay. Long after a block
// is assembled it occasionally re-pieces itself (its cycle restarts), so the
// quilt keeps quietly reworking. Palette is theme roles softened toward bg
// like scandi. `density` = block size, `intensity` = palette strength.

const CYCLE = 26; // seconds per block between re-piecings
const PATCH_SEC = 0.28; // assembly time per patch

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// ---- block pattern generators: unit-square patch lists [{pts, ci}] ----------

function ninePatch(rng) {
  const a = (rng() * 5) | 0;
  const b = (a + 1 + ((rng() * 4) | 0)) % 5;
  const out = [];
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 3; i++)
      out.push({
        pts: [
          [i / 3, j / 3],
          [(i + 1) / 3, j / 3],
          [(i + 1) / 3, (j + 1) / 3],
          [i / 3, (j + 1) / 3],
        ],
        ci: (i + j) % 2 === 0 ? a : b,
      });
  return out;
}

function pinwheel(rng) {
  const a = (rng() * 5) | 0;
  const b = (a + 1 + ((rng() * 4) | 0)) % 5;
  const out = [];
  const quads = [
    [
      [0, 0],
      [0.5, 0],
      [0.5, 0.5],
      [0, 0.5],
    ],
    [
      [0.5, 0],
      [1, 0],
      [1, 0.5],
      [0.5, 0.5],
    ],
    [
      [1, 0.5],
      [1, 1],
      [0.5, 1],
      [0.5, 0.5],
    ],
    [
      [0, 0.5],
      [0.5, 0.5],
      [0.5, 1],
      [0, 1],
    ],
  ];
  for (let q = 0; q < 4; q++) {
    const [p0, p1, p2, p3] = quads[q];
    out.push({ pts: [p0, p1, p2], ci: a });
    out.push({ pts: [p0, p2, p3], ci: b });
  }
  return out;
}

function flyingGeese(rng) {
  const goose = (rng() * 5) | 0;
  const sky = (goose + 1 + ((rng() * 4) | 0)) % 5;
  const out = [];
  for (let r = 0; r < 4; r++) {
    const y0 = r / 4;
    const y1 = (r + 1) / 4;
    out.push({
      pts: [
        [0, y1],
        [0.5, y0],
        [1, y1],
      ],
      ci: goose,
    });
    out.push({
      pts: [
        [0, y0],
        [0.5, y0],
        [0, y1],
      ],
      ci: sky,
    });
    out.push({
      pts: [
        [0.5, y0],
        [1, y0],
        [1, y1],
      ],
      ci: sky,
    });
  }
  return out;
}

function logCabin(rng) {
  const warmSide = rng() < 0.5;
  const out = [
    {
      pts: [
        [0.4, 0.4],
        [0.6, 0.4],
        [0.6, 0.6],
        [0.4, 0.6],
      ],
      ci: 4,
    },
  ];
  let x0 = 0.4;
  let y0 = 0.4;
  let x1 = 0.6;
  let y1 = 0.6;
  const stripW = 0.1;
  for (let ring = 0; ring < 4; ring++) {
    const cA = (ring + (warmSide ? 0 : 1)) % 2 === 0 ? 0 : 2;
    const cB = cA + 1;
    // top strip then right (colour A), bottom then left (colour B).
    out.push({
      pts: [
        [x0 - stripW, y0 - stripW],
        [x1, y0 - stripW],
        [x1, y0],
        [x0 - stripW, y0],
      ],
      ci: cA,
    });
    out.push({
      pts: [
        [x1, y0 - stripW],
        [x1 + stripW, y0 - stripW],
        [x1 + stripW, y1],
        [x1, y1],
      ],
      ci: cA,
    });
    out.push({
      pts: [
        [x0, y1],
        [x1 + stripW, y1],
        [x1 + stripW, y1 + stripW],
        [x0, y1 + stripW],
      ],
      ci: cB,
    });
    out.push({
      pts: [
        [x0 - stripW, y0],
        [x0, y0],
        [x0, y1 + stripW],
        [x0 - stripW, y1 + stripW],
      ],
      ci: cB,
    });
    x0 -= stripW;
    y0 -= stripW;
    x1 += stripW;
    y1 += stripW;
  }
  return out;
}

const PATTERNS = [ninePatch, pinwheel, flyingGeese, logCabin];

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;
  let grain = null;

  function fabricGrain() {
    if (grain && grain.width === w && grain.height === h) return grain;
    grain = document.createElement('canvas');
    grain.width = w;
    grain.height = h;
    const o = grain.getContext('2d');
    const rng = mulberry32(7);
    // Fine woven texture: sparse light/dark single-pixel threads.
    for (let y = 0; y < h; y += 2) {
      o.fillStyle = `rgba(${y % 4 === 0 ? '255,255,255' : '0,0,0'},0.03)`;
      o.fillRect(0, y, w, 1);
    }
    for (let x = 0; x < w; x += 3) {
      o.fillStyle = 'rgba(0,0,0,0.025)';
      o.fillRect(x, 0, 1, h);
    }
    for (let i = 0; i < (w * h) / 900; i++) {
      o.fillStyle = `rgba(255,255,255,${0.02 + rng() * 0.03})`;
      o.fillRect(rng() * w, rng() * h, 2, 1);
    }
    return grain;
  }

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const block = Math.max(70, Math.min(w, h) * (0.36 - 0.2 * (params.density ?? 0.5)));
    const cols = Math.ceil(w / block) + 1;
    const rows = Math.ceil(h / block) + 1;
    const blocks = [];
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const patches = PATTERNS[(rng() * PATTERNS.length) | 0](rng);
        // Seeded patch order for the assembly animation.
        const order = patches.map((_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
          const j = (rng() * (i + 1)) | 0;
          [order[i], order[j]] = [order[j], order[i]];
        }
        blocks.push({ gx, gy, patches, order, phase: rng(), rot: (rng() * 4) | 0 });
      }
    }
    cache = { key, block, blocks };
    return cache;
  }

  function palette(c, intensity) {
    const base = [c.primary, c.accent, c.info, c.warning, c.error].filter(Boolean);
    while (base.length < 5) base.push(c.fg || [0.5, 0.5, 0.5]);
    const toward = c.bg && c.bg[3] > 0.01 ? c.bg : [1, 1, 1];
    return base.map((col) => mix(col, toward, 0.5 - 0.3 * intensity));
  }

  function frame(t, params) {
    const { block, blocks } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const pal = palette(c, params.intensity ?? 0.5);
    const seam = mix(c.fg || [0.3, 0.3, 0.3], c.bg && c.bg[3] > 0.01 ? c.bg : [1, 1, 1], 0.55);

    for (const b of blocks) {
      const local = ((t / CYCLE + b.phase) % 1) * CYCLE;
      const x0 = b.gx * block;
      const y0 = b.gy * block;
      c2d.save();
      c2d.translate(x0 + block / 2, y0 + block / 2);
      c2d.rotate((b.rot * Math.PI) / 2);
      c2d.translate(-block / 2, -block / 2);
      for (let oi = 0; oi < b.order.length; oi++) {
        const patch = b.patches[b.order[oi]];
        const p = Math.min(1, Math.max(0, (local - oi * PATCH_SEC) / PATCH_SEC));
        if (p <= 0) continue;
        const cxm = patch.pts.reduce((s, q) => s + q[0], 0) / patch.pts.length;
        const cym = patch.pts.reduce((s, q) => s + q[1], 0) / patch.pts.length;
        const pop = 0.6 + 0.4 * p;
        c2d.globalAlpha = p;
        c2d.fillStyle = rgb(pal[patch.ci % pal.length]);
        c2d.strokeStyle = rgb(seam, 0.8);
        c2d.lineWidth = Math.max(1, block * 0.008);
        c2d.beginPath();
        for (let i = 0; i < patch.pts.length; i++) {
          const px = (cxm + (patch.pts[i][0] - cxm) * pop) * block;
          const py = (cym + (patch.pts[i][1] - cym) * pop) * block;
          if (i === 0) c2d.moveTo(px, py);
          else c2d.lineTo(px, py);
        }
        c2d.closePath();
        c2d.fill();
        c2d.stroke();
      }
      c2d.restore();
    }
    c2d.globalAlpha = 1;
    c2d.drawImage(fabricGrain(), 0, 0);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
      grain = null;
    },
    frame,
    staticFrame(params) {
      frame(CYCLE * 0.8, params); // most blocks fully pieced
    },
    dispose() {
      cache = null;
      grain = null;
    },
  };
}
