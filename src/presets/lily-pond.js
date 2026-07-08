// lily-pond — Monet water. Vertical reflection smears of mixed sky tones,
// seeded lily-pad clusters adrift by millimeters, and slow ripple rings
// expanding on cyclic (t*v+phase)%1 clocks. Pads read as colored ink on
// any ground. density = pad clusters, intensity = reflection contrast.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let smears = [];
  let clusters = [];
  let ripples = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 113);
    smears = [];
    for (let i = 0; i < 26; i++) {
      smears.push({
        x: rand(),
        wd: 0.02 + rand() * 0.07,
        tone: rand(),
        sway: 0.15 + rand() * 0.5,
        phase: rand() * Math.PI * 2,
      });
    }
    const n = 5 + Math.round(params.density * 4); // 5..9 clusters
    clusters = [];
    for (let i = 0; i < n; i++) {
      const pads = [];
      const np = 2 + ((rand() * 3) | 0);
      for (let k = 0; k < np; k++) {
        pads.push({
          dx: (rand() - 0.5) * 0.09,
          dy: (rand() - 0.5) * 0.05,
          r: 0.02 + rand() * 0.03,
          notch: rand() * Math.PI * 2,
        });
      }
      clusters.push({ x: rand(), y: 0.15 + rand() * 0.75, pads, drift: rand() * Math.PI * 2 });
    }
    ripples = [];
    for (let i = 0; i < 3; i++) {
      ripples.push({ x: rand(), y: 0.2 + rand() * 0.6, v: 0.05 + rand() * 0.04, phase: rand() });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!smears.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const s = Math.min(w, h);

    // Water ground.
    const deep = mix(c.info, c.bg, 0.35);
    c2d.fillStyle = rgbCss(deep);
    c2d.fillRect(0, 0, w, h);

    // Reflection smears: vertical soft columns of sky tones.
    const contrast = 0.25 + params.intensity * 0.35;
    for (const sm of smears) {
      const tone = mix(
        sm.tone < 0.5 ? c.primary : c.accent,
        deep,
        1 - contrast * (0.5 + Math.abs(sm.tone - 0.5))
      );
      const x = (sm.x + 0.004 * Math.sin(t * sm.sway + sm.phase)) * w;
      const grad = c2d.createLinearGradient(x, 0, x + sm.wd * w, 0);
      grad.addColorStop(0, rgbaCss(tone, 0));
      grad.addColorStop(0.5, rgbaCss(tone, 0.5));
      grad.addColorStop(1, rgbaCss(tone, 0));
      c2d.fillStyle = grad;
      c2d.fillRect(x, 0, sm.wd * w, h);
    }

    // Ripple rings.
    for (const r of ripples) {
      const p = (r.phase + t * r.v) % 1;
      const rr = p * s * 0.28;
      c2d.strokeStyle = rgbaCss(mix(c.fg, deep, 0.4), 0.35 * (1 - p));
      c2d.lineWidth = 1.2 * px;
      c2d.beginPath();
      c2d.ellipse(r.x * w, r.y * h, rr, rr * 0.35, 0, 0, Math.PI * 2);
      c2d.stroke();
    }

    // Lily pads: green derived from success mixed toward the water.
    const padCol = mix(c.success, deep, 0.25);
    const padLit = mix(padCol, [1, 1, 1], 0.2);
    for (const cl of clusters) {
      const cx = (cl.x + 0.006 * Math.sin(t * 0.11 + cl.drift)) * w;
      const cy = (cl.y + 0.004 * Math.cos(t * 0.09 + cl.drift)) * h;
      for (const p of cl.pads) {
        const x = cx + p.dx * s * 2;
        const y = cy + p.dy * s * 2;
        const r = p.r * s;
        c2d.fillStyle = rgbCss(p.dy < 0 ? padLit : padCol);
        c2d.beginPath();
        c2d.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2);
        c2d.fill();
        // The pad's notch: a wedge of water.
        c2d.fillStyle = rgbCss(deep);
        c2d.beginPath();
        c2d.moveTo(x, y);
        c2d.arc(x, y, r * 1.05, p.notch, p.notch + 0.5);
        c2d.closePath();
        c2d.fill();
      }
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      smears = [];
      clusters = [];
      ripples = [];
    },
  };
}
