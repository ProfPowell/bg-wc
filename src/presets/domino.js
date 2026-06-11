import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// domino — chains seen from above. Tiles stand edge-on along seeded curved
// paths (corner-cut splines); a toppling wave travels each chain, every tile
// rotating over its leading edge — its footprint stretching from a thin edge
// to a full face that slightly overlaps the next tile — and behind the
// wavefront tiles quietly re-stand for the next pass. `density` = chain
// count, `intensity` = tile contrast. Deterministic from `t`.

const WAVE_SPEED = 150; // px/s the topple front travels
const TOPPLE_LEN = 60; // px of front over which one tile lays down
const RESTAND_GAP = 0.35; // fraction of chain length behind the front

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const chains = [];
    const n = 2 + Math.round((params.density ?? 0.5) * 3);
    const tileH = Math.max(10, Math.min(w, h) * 0.035); // face length when flat
    for (let ci = 0; ci < n; ci++) {
      // Smooth wandering path.
      let pts = [];
      let x = rng() * w * 0.3;
      let y = (0.15 + 0.7 * rng()) * h;
      const segs = 5;
      for (let i = 0; i <= segs; i++) {
        pts.push([x, y]);
        x += w * (0.7 / segs) * (0.7 + rng() * 0.6);
        y += (rng() - 0.5) * h * 0.4;
        y = Math.max(h * 0.08, Math.min(h * 0.92, y));
      }
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
      // Place tiles at fixed arc-length spacing with tangents.
      const spacing = tileH * 0.55;
      const tiles = [];
      let acc = 0;
      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i][0] - pts[i - 1][0];
        const dy = pts[i][1] - pts[i - 1][1];
        const len = Math.hypot(dx, dy);
        while (acc + len >= spacing) {
          const f = (spacing - acc) / len;
          tiles.push({
            x: pts[i - 1][0] + dx * f,
            y: pts[i - 1][1] + dy * f,
            ang: Math.atan2(dy, dx),
            d: total + spacing - acc,
          });
          acc -= spacing;
        }
        acc += len;
        total += len;
      }
      chains.push({ tiles, total, phase: rng() * total, ci });
    }
    cache = { key, chains, tileH };
    return cache;
  }

  function frame(t, params) {
    const { chains, tileH } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const intensity = params.intensity ?? 0.5;
    const roles = [c.primary, c.accent, c.info].filter(Boolean);
    if (!roles.length) roles.push(c.fg || [0.8, 0.8, 0.85]);
    const tileW = tileH * 0.55; // width across the path

    for (const ch of chains) {
      const span = ch.total * (1 + RESTAND_GAP);
      const front = (t * WAVE_SPEED + ch.phase) % span;
      const col = roles[ch.ci % roles.length];
      const flat = mix(col, c.bg && c.bg[3] > 0.01 ? c.bg : [0, 0, 0], 0.35);

      for (const tile of ch.tiles) {
        // Topple progress: 0 standing, 1 flat. Re-stand behind the front.
        let p = 0;
        const since = front - tile.d;
        if (since > 0) {
          p = Math.min(1, since / TOPPLE_LEN);
          const restand = since - ch.total * RESTAND_GAP * 0.8;
          if (restand > 0) p = Math.max(0, 1 - restand / TOPPLE_LEN);
        }
        const ease = p * p * (3 - 2 * p);
        // Footprint: thin edge when standing → full face when flat, hinged
        // forward over the leading edge.
        const lenNow = tileW * 0.45 + (tileH - tileW * 0.45) * ease;
        const shade = 1 - 0.45 * ease;
        c2d.save();
        c2d.translate(tile.x, tile.y);
        c2d.rotate(tile.ang);
        c2d.fillStyle = rgb(
          ease > 0.02 ? flat.map((v) => v * shade) : col,
          0.75 + 0.25 * intensity
        );
        // Hinge at the leading (forward) edge of the standing tile.
        c2d.fillRect(tileW * 0.22, -tileW / 2, lenNow, tileW);
        // Highlight rim on standing tiles.
        if (ease < 0.3) {
          c2d.fillStyle = rgb([1, 1, 1], 0.35 * (1 - ease / 0.3) * intensity);
          c2d.fillRect(tileW * 0.22, -tileW / 2, Math.max(1.5, tileW * 0.16), tileW);
        }
        c2d.restore();
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
      frame(2, params); // waves mid-chain
    },
    dispose() {
      cache = null;
    },
  };
}
