import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// lanterns — sky lanterns at dusk. Paper envelopes with warm flickering
// flame cores rise from below on swaying paths, scaled and dimmed by depth,
// and fade into the upper field; each lantern's whole life (position, sway,
// flicker) is a deterministic function of `t`, so the scene needs no per-frame
// state. Glow comes from a pre-rendered halo sprite. `warning`/`accent`
// warmth over a deep dusk `bg`. `density` = lantern count, `intensity` =
// glow strength.

const RISE_SEC = 26; // seconds for one lantern to cross the sky

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;
  let halo = null;
  let haloKey = '';

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const n = 8 + Math.round((params.density ?? 0.5) * 16);
    const lanterns = [];
    for (let i = 0; i < n; i++) {
      lanterns.push({
        x0: rng(), // base x (fraction)
        depth: 0.3 + rng() * 0.7, // 1 near, 0.3 far
        phase: rng(), // life-cycle offset
        sway: 0.5 + rng() * 1.2,
        swayPh: rng() * Math.PI * 2,
        flick: 5 + rng() * 5,
        tone: rng(), // warning↔accent mix
      });
    }
    cache = { key, lanterns };
    return cache;
  }

  function haloSprite(col, intensity) {
    const k = `${rgb(col)}|${intensity.toFixed(2)}`;
    if (halo && haloKey === k) return halo;
    haloKey = k;
    const S = 64;
    halo = document.createElement('canvas');
    halo.width = S;
    halo.height = S;
    const o = halo.getContext('2d');
    const g = o.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, rgb(col, 0.5 + 0.4 * intensity));
    g.addColorStop(0.4, rgb(col, 0.18 + 0.18 * intensity));
    g.addColorStop(1, rgb(col, 0));
    o.fillStyle = g;
    o.fillRect(0, 0, S, S);
    return halo;
  }

  function frame(t, params) {
    const { lanterns } = build(params);
    const c = getColors();
    const intensity = params.intensity ?? 0.5;
    const warm = c.warning || [1, 0.72, 0.3];
    const rose = c.accent || [0.95, 0.5, 0.4];
    const bg = c.bg && c.bg[3] > 0.01 ? c.bg : [0.08, 0.07, 0.14];

    // Dusk gradient: deep above, faintly warm at the horizon.
    clearAndFill(c2d, w, h, bg);
    const sky = c2d.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgb(mix(bg, [0, 0, 0], 0.35)));
    sky.addColorStop(0.75, rgb(bg, 0));
    sky.addColorStop(1, rgb(mix(bg, warm, 0.18)));
    c2d.fillStyle = sky;
    c2d.fillRect(0, 0, w, h);

    // Far-to-near so near lanterns overlap far ones.
    const sorted = [...lanterns].sort((a, b) => a.depth - b.depth);
    for (const ln of sorted) {
      const life = (t / (RISE_SEC / ln.depth) + ln.phase) % 1; // near rise faster
      const y = h * (1.08 - life * 1.3);
      if (y < -h * 0.1 || y > h * 1.1) continue;
      const x =
        w * ln.x0 +
        Math.sin(t * 0.2 * ln.sway + ln.swayPh) * w * 0.03 * ln.depth +
        Math.sin(t * 0.07 + ln.swayPh * 2) * w * 0.04;
      const size = Math.min(w, h) * 0.045 * ln.depth;
      const fade = Math.min(1, life * 6) * Math.min(1, (1 - life) * 2.4) * (0.35 + 0.65 * ln.depth);
      if (fade <= 0.01) continue;
      const flicker = 0.82 + 0.18 * Math.sin(t * ln.flick) * Math.sin(t * ln.flick * 0.37 + 2);
      const col = mix(warm, rose, ln.tone * 0.6);

      c2d.globalAlpha = fade;
      // Halo.
      const hs = size * 5 * (0.7 + 0.6 * intensity) * flicker;
      c2d.drawImage(haloSprite(col, intensity), x - hs / 2, y - hs / 2, hs, hs);
      // Paper envelope: rounded-top trapezoid, lit from within.
      const env = mix(col, [1, 1, 0.92], 0.45);
      c2d.fillStyle = rgb(env, 0.9 * flicker);
      c2d.beginPath();
      c2d.moveTo(x - size * 0.55, y + size * 0.6);
      c2d.quadraticCurveTo(x - size * 0.7, y - size * 0.5, x, y - size * 0.85);
      c2d.quadraticCurveTo(x + size * 0.7, y - size * 0.5, x + size * 0.55, y + size * 0.6);
      c2d.closePath();
      c2d.fill();
      // Mouth + flame point.
      c2d.fillStyle = rgb(mix(col, [0, 0, 0], 0.4), 0.9);
      c2d.fillRect(x - size * 0.3, y + size * 0.55, size * 0.6, size * 0.12);
      c2d.fillStyle = rgb([1, 0.95, 0.8], flicker);
      c2d.beginPath();
      c2d.arc(x, y + size * 0.45, size * 0.14 * flicker, 0, Math.PI * 2);
      c2d.fill();
    }
    c2d.globalAlpha = 1;
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
      halo = null;
      haloKey = '';
    },
    frame,
    staticFrame(params) {
      frame(RISE_SEC * 0.6, params); // sky mid-festival
    },
    dispose() {
      cache = null;
      halo = null;
    },
  };
}
