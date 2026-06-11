import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// swarm — a drone light show. 300–800 points (by `density`) fly smooth
// formation transitions: scatter → ring → lattice → figure → scatter. Each
// drone is a damped spring easing toward its slot in the current formation,
// with per-drone seeded jitter and staggered departure so shapes dissolve and
// reform organically. If the host sets `text`, each line (split on '|') is
// rasterized offscreen and its filled pixels become formation targets, cycled
// into the rotation. Drones draw as a pre-rendered glow sprite (accent core,
// primary halo) — no per-frame shadowBlur. `intensity` = glow strength.
// `staticFrame` = one settled formation. Motion integrates dt = t − lastT, so
// frozen time (speed=0) holds a stable frame.

const FORM_SEC = 7; // seconds per formation (incl. transition)
const SPRING = 6; // spring stiffness toward the slot
const DAMP = 3.5; // velocity damping

export function create({ c2d, getColors, host }) {
  let w = 0;
  let h = 0;
  let drones = null; // [{x,y,vx,vy,delay,jp,ja}]
  let lastT = 0;
  let stateKey = '';
  let targetCache = new Map(); // formation key → Float32Array targets
  let sprite = null;
  let spriteKey = '';

  function readLines(params) {
    const txt = (host?.getAttribute('text') || params.text || '').trim();
    return txt
      ? txt
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  }

  function ensureDrones(params) {
    const n = Math.round(300 + (params.density ?? 0.5) * 500);
    const k = `${params.seed | 0}|${n}|${w}x${h}`;
    if (drones && stateKey === k) return;
    stateKey = k;
    targetCache = new Map();
    const rng = mulberry32(params.seed | 0 || 1);
    drones = [];
    for (let i = 0; i < n; i++) {
      drones.push({
        x: rng() * w,
        y: rng() * h,
        vx: 0,
        vy: 0,
        delay: rng() * 0.35, // stagger as a fraction of the formation period
        jp: rng() * Math.PI * 2, // jitter phase
        ja: 0.5 + rng(), // jitter amplitude factor
      });
    }
    lastT = 0;
  }

  // ---- formation target generators (n slots each, in device px) -------------

  function genScatter(n, rng) {
    const out = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      out[i * 2] = (0.06 + rng() * 0.88) * w;
      out[i * 2 + 1] = (0.06 + rng() * 0.88) * h;
    }
    return out;
  }

  function genRing(n) {
    const out = new Float32Array(n * 2);
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.36;
    // Two concentric rings so density reads as structure, not a thin line.
    for (let i = 0; i < n; i++) {
      const ring = i % 3 === 0 ? 0.62 : 1;
      const a = (i / n) * Math.PI * 2 * (ring === 1 ? 1 : 1.618);
      out[i * 2] = cx + Math.cos(a) * R * ring;
      out[i * 2 + 1] = cy + Math.sin(a) * R * ring;
    }
    return out;
  }

  function genLattice(n) {
    const out = new Float32Array(n * 2);
    const cols = Math.ceil(Math.sqrt((n * w) / h));
    const rows = Math.ceil(n / cols);
    const mx = w * 0.12;
    const my = h * 0.12;
    for (let i = 0; i < n; i++) {
      const gx = i % cols;
      const gy = (i / cols) | 0;
      out[i * 2] = mx + (gx / Math.max(1, cols - 1)) * (w - 2 * mx);
      out[i * 2 + 1] = my + (gy / Math.max(1, rows - 1)) * (h - 2 * my);
    }
    return out;
  }

  function genFigure(n) {
    // Five-point star outline, slots spaced by arc length.
    const out = new Float32Array(n * 2);
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.4;
    const pts = [];
    for (let k = 0; k < 10; k++) {
      const r = k % 2 === 0 ? R : R * 0.45;
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    pts.push(pts[0]);
    const lens = [0];
    let total = 0;
    for (let k = 1; k < pts.length; k++) {
      total += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      lens.push(total);
    }
    let seg = 1;
    for (let i = 0; i < n; i++) {
      const d = (i / n) * total;
      while (lens[seg] < d) seg++;
      const f = (d - lens[seg - 1]) / (lens[seg] - lens[seg - 1] || 1);
      out[i * 2] = pts[seg - 1][0] + (pts[seg][0] - pts[seg - 1][0]) * f;
      out[i * 2 + 1] = pts[seg - 1][1] + (pts[seg][1] - pts[seg - 1][1]) * f;
    }
    return out;
  }

  // Rasterize one text line offscreen and sample its filled pixels as slots.
  function genText(n, line, rng) {
    const off = document.createElement('canvas');
    const ow = 360;
    const oh = 120;
    off.width = ow;
    off.height = oh;
    const o = off.getContext('2d', { willReadFrequently: true });
    let fs = 96;
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    do {
      o.font = `900 ${fs}px "Arial Black", Arial, sans-serif`;
      fs -= 6;
    } while (fs > 18 && o.measureText(line).width > ow * 0.94);
    o.fillStyle = '#fff';
    o.fillText(line, ow / 2, oh / 2);
    const data = o.getImageData(0, 0, ow, oh).data;
    const px = [];
    for (let y = 0; y < oh; y += 2)
      for (let x = 0; x < ow; x += 2) if (data[(y * ow + x) * 4 + 3] > 128) px.push([x, y]);
    const out = new Float32Array(n * 2);
    if (!px.length) return genScatter(n, rng);
    // Scale the glyph box to ~70% of the canvas width, centred.
    const scale = Math.min((w * 0.72) / ow, (h * 0.5) / oh);
    const ox = (w - ow * scale) / 2;
    const oy = (h - oh * scale) / 2;
    for (let i = 0; i < n; i++) {
      const p = px[(rng() * px.length) | 0];
      out[i * 2] = ox + p[0] * scale;
      out[i * 2 + 1] = oy + p[1] * scale;
    }
    return out;
  }

  function targetsFor(idx, params) {
    const lines = readLines(params);
    const base = ['scatter', 'ring', 'lattice', 'figure'];
    // Interleave text lines after each base formation, cycling through lines.
    const seq = [];
    if (lines.length) {
      for (let i = 0; i < base.length; i++) {
        seq.push(base[i]);
        seq.push(`text:${lines[i % lines.length]}`);
      }
    } else {
      seq.push(...base);
    }
    const name = seq[((idx % seq.length) + seq.length) % seq.length];
    const n = drones.length;
    const key = `${name}|${n}`;
    let tg = targetCache.get(key);
    if (!tg) {
      const rng = mulberry32(((params.seed | 0) ^ 0x9e3779b9) + idx * 0);
      if (name === 'scatter') tg = genScatter(n, rng);
      else if (name === 'ring') tg = genRing(n);
      else if (name === 'lattice') tg = genLattice(n);
      else if (name === 'figure') tg = genFigure(n);
      else tg = genText(n, name.slice(5), rng);
      targetCache.set(key, tg);
    }
    return tg;
  }

  function ensureSprite(c, intensity) {
    const k = `${rgb(c.accent || [1, 1, 1])}|${rgb(c.primary || [0.4, 0.6, 1])}|${intensity.toFixed(2)}`;
    if (sprite && spriteKey === k) return;
    spriteKey = k;
    const S = 32;
    sprite = document.createElement('canvas');
    sprite.width = S;
    sprite.height = S;
    const o = sprite.getContext('2d');
    const g = o.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    const core = c.accent || [1, 1, 1];
    const halo = c.primary || [0.4, 0.6, 1];
    g.addColorStop(0, rgb(core, 1));
    g.addColorStop(0.25, rgb(core, 0.9));
    g.addColorStop(0.45, rgb(halo, 0.35 + 0.45 * intensity));
    g.addColorStop(1, rgb(halo, 0));
    o.fillStyle = g;
    o.fillRect(0, 0, S, S);
  }

  function settle(params) {
    // Place every drone exactly on its slot in formation 1 (the ring).
    const tg = targetsFor(1, params);
    for (let i = 0; i < drones.length; i++) {
      drones[i].x = tg[i * 2];
      drones[i].y = tg[i * 2 + 1];
      drones[i].vx = 0;
      drones[i].vy = 0;
    }
  }

  function draw(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const intensity = params.intensity ?? 0.5;
    ensureSprite(c, intensity);
    const size = Math.max(6, Math.min(w, h) * (0.014 + 0.012 * intensity));
    const half = size / 2;
    for (const d of drones) {
      const jx = Math.sin(t * 1.3 + d.jp) * d.ja;
      const jy = Math.cos(t * 1.1 + d.jp * 1.7) * d.ja;
      c2d.drawImage(sprite, d.x + jx - half, d.y + jy - half, size, size);
    }
  }

  function frame(t, params) {
    ensureDrones(params);
    let dt = t - lastT;
    lastT = t;
    if (!(dt >= 0)) dt = 0;
    dt = Math.min(dt, 0.05);

    const fIdx = Math.floor(t / FORM_SEC);
    const local = t / FORM_SEC - fIdx;
    const tg = targetsFor(fIdx, params);
    const prev = targetsFor(fIdx - 1, params);

    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      // Before this drone's staggered departure time it still holds the
      // previous formation's slot.
      const src = local < d.delay ? prev : tg;
      const txx = src[i * 2];
      const tyy = src[i * 2 + 1];
      d.vx += ((txx - d.x) * SPRING - d.vx * DAMP) * dt;
      d.vy += ((tyy - d.y) * SPRING - d.vy * DAMP) * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    }
    draw(t, params);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      drones = null;
      stateKey = '';
    },
    frame,
    staticFrame(params) {
      ensureDrones(params);
      settle(params);
      draw(0, params);
    },
    dispose() {
      drones = null;
      targetCache = new Map();
      sprite = null;
    },
  };
}
