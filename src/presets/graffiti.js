import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// graffiti — spray writing. Tags are seeded gesture paths (corner-cut splines)
// stamped with a soft-brush dab sprite: a dense opaque core line plus wide
// low-alpha overspray, and descending drip runs from wet points. Tags build
// dab by dab (reveal driven by `t`), hold, then fade behind newer layers.
// Completed tags are baked to per-tag offscreen layers (keyed by palette) so
// only the active tag stamps per frame. Wall = bg + cached concrete texture.
// `density` = strokes per tag, `intensity` = paint opacity. Deterministic.

const TAG_SEC = 5; // seconds per tag (build + hold)
const BUILD_FRAC = 0.55; // fraction of TAG_SEC spent spraying
const VISIBLE = 4; // tags on the wall before the oldest fades out
const START_OFF = TAG_SEC * 2.4; // clock offset so a frozen first frame shows a worked wall

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let wall = null;
  let layers = new Map(); // tag index → baked canvas
  let sprites = new Map(); // color css → dab sprite
  let paletteKey = '';
  let activeTag = null;
  let activeIdx = -1;

  function concrete() {
    if (wall && wall.width === w && wall.height === h) return wall;
    wall = document.createElement('canvas');
    wall.width = w;
    wall.height = h;
    const o = wall.getContext('2d');
    const rng = mulberry32(5);
    for (let i = 0; i < (w * h) / 600; i++) {
      o.fillStyle = `rgba(${rng() < 0.5 ? '0,0,0' : '255,255,255'},${0.02 + rng() * 0.04})`;
      o.fillRect(rng() * w, rng() * h, 1 + rng() * 3, 1 + rng() * 3);
    }
    // Faint block joints.
    o.strokeStyle = 'rgba(0,0,0,0.08)';
    o.lineWidth = 2;
    const bh = h / 5;
    for (let r = 1; r < 5; r++) {
      o.beginPath();
      o.moveTo(0, r * bh);
      o.lineTo(w, r * bh);
      o.stroke();
    }
    return wall;
  }

  function dabSprite(col, alpha) {
    const key = `${rgb(col)}|${alpha.toFixed(2)}`;
    let s = sprites.get(key);
    if (s) return s;
    const S = 32;
    s = document.createElement('canvas');
    s.width = S;
    s.height = S;
    const o = s.getContext('2d');
    const g = o.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, rgb(col, alpha));
    g.addColorStop(0.55, rgb(col, alpha * 0.55));
    g.addColorStop(1, rgb(col, 0));
    o.fillStyle = g;
    o.fillRect(0, 0, S, S);
    sprites.set(key, s);
    return s;
  }

  // Build one tag's dab + drip lists from its seeded gesture strokes.
  function makeTag(idx, params, roles) {
    const rng = mulberry32((params.seed | 0 || 1) ^ (idx * 2654435761));
    const col = roles[idx % roles.length];
    const strokes = 2 + Math.round((params.density ?? 0.5) * 3);
    const cx = w * (0.18 + rng() * 0.64);
    const cy = h * (0.25 + rng() * 0.5);
    const span = Math.min(w, h) * (0.28 + rng() * 0.2);
    const dabs = []; // [x, y, size, overspray?]
    const drips = []; // [x, y, len]
    for (let s = 0; s < strokes; s++) {
      // A sweeping gesture: 3 control points, corner-cut smooth.
      let pts = [
        [cx + (rng() - 0.5) * span * 2, cy + (rng() - 0.5) * span],
        [cx + (rng() - 0.5) * span * 2, cy + (rng() - 0.5) * span],
        [cx + (rng() - 0.5) * span * 2, cy + (rng() - 0.5) * span],
      ];
      for (let it = 0; it < 4; it++) {
        const out = [pts[0]];
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i];
          const b = pts[i + 1];
          out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
          out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
        }
        out.push(pts[pts.length - 1]);
        pts = out;
      }
      const lw = Math.min(w, h) * (0.012 + rng() * 0.012);
      for (let i = 0; i < pts.length; i++) {
        const [x, y] = pts[i];
        dabs.push([
          x + (rng() - 0.5) * lw * 0.4,
          y + (rng() - 0.5) * lw * 0.4,
          lw * (1.6 + rng() * 0.6),
          0,
        ]);
        if (rng() < 0.3)
          dabs.push([
            x + (rng() - 0.5) * lw * 3,
            y + (rng() - 0.5) * lw * 3,
            lw * (3.5 + rng() * 2),
            1,
          ]);
        if (rng() < 0.025) drips.push([x, y, lw * (4 + rng() * 9)]);
      }
    }
    return { col, dabs, drips, lw: Math.min(w, h) * 0.008 };
  }

  function stampTag(ctx, tag, count, dripF, intensity) {
    const core = dabSprite(tag.col, 0.5 + 0.45 * intensity);
    const over = dabSprite(tag.col, 0.1 + 0.08 * intensity);
    const n = Math.min(tag.dabs.length, count);
    for (let i = 0; i < n; i++) {
      const [x, y, sz, ov] = tag.dabs[i];
      ctx.drawImage(ov ? over : core, x - sz / 2, y - sz / 2, sz, sz);
    }
    // Drips grow after their dab has been laid.
    ctx.strokeStyle = rgb(tag.col, 0.5 + 0.3 * intensity);
    ctx.lineWidth = tag.lw;
    ctx.lineCap = 'round';
    for (const [x, y, len] of tag.drips) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + len * dripF);
      ctx.stroke();
    }
  }

  function bakedLayer(idx, params, roles, intensity) {
    let cv = layers.get(idx);
    if (cv) return cv;
    cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const tag = makeTag(idx, params, roles);
    stampTag(cv.getContext('2d'), tag, Infinity, 1, intensity);
    layers.set(idx, cv);
    // Keep only a window of layers around the current era.
    if (layers.size > VISIBLE + 3) {
      const oldest = Math.min(...layers.keys());
      layers.delete(oldest);
    }
    return cv;
  }

  function frame(t0, params) {
    const t = t0 + START_OFF;
    const c = getColors();
    const roles = [c.accent, c.primary, c.warning, c.error, c.info].filter(Boolean);
    if (!roles.length) roles.push(c.fg || [0.9, 0.3, 0.5]);
    const pk = roles.map((r) => rgb(r)).join('|');
    if (pk !== paletteKey) {
      paletteKey = pk;
      layers = new Map();
      sprites = new Map();
    }
    const intensity = params.intensity ?? 0.5;
    clearAndFill(c2d, w, h, c.bg);
    c2d.drawImage(concrete(), 0, 0);

    const cur = Math.floor(t / TAG_SEC);
    const local = (t / TAG_SEC - cur) / BUILD_FRAC;

    // Older tags: baked layers fading with age.
    for (let k = VISIBLE; k >= 1; k--) {
      const idx = cur - k;
      if (idx < 0) continue;
      c2d.globalAlpha = Math.max(0, 1 - (k - 1) / VISIBLE);
      c2d.drawImage(bakedLayer(idx, params, roles, intensity), 0, 0);
    }
    c2d.globalAlpha = 1;

    // Active tag sprays on dab by dab (cached across frames by index).
    if (activeIdx !== cur || !activeTag) {
      activeTag = makeTag(cur, params, roles);
      activeIdx = cur;
    }
    const tag = activeTag;
    const reveal = Math.min(1, local);
    stampTag(c2d, tag, Math.floor(tag.dabs.length * reveal), Math.min(1, local * 0.8), intensity);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      wall = null;
      layers = new Map();
      sprites = new Map();
      activeTag = null;
      activeIdx = -1;
    },
    frame,
    staticFrame(params) {
      frame(TAG_SEC * (VISIBLE - 1) + TAG_SEC * BUILD_FRAC, params); // a worked wall
    },
    dispose() {
      wall = null;
      layers = new Map();
      sprites = new Map();
    },
  };
}
