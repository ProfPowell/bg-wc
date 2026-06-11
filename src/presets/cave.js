import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// cave — parietal art. Charcoal animal outlines (hand-authored polylines) and
// ochre handprint stencils emerge from a rock substrate; a torchlight vignette
// drifts across the wall, brightening what it passes. The substrate (mottled
// rock + cracks) and the handprint stencils are cached offscreen at build;
// animals draw on plotter-style by cumulative arc length, each on its own
// staggered cycle. `density` = figure count, `intensity` = torch strength.

const REVEAL_SEC = 12; // seconds for one figure to fully draw on
const START_OFF = 16; // clock offset so a frozen first frame shows a painted wall

// Hand-authored animal outlines in unit coords (x right, y down, body ~1×0.6).
const ANIMALS = [
  // bison: heavy hump, short horns, four legs
  [
    [0.05, 0.42],
    [0.12, 0.3],
    [0.2, 0.18],
    [0.32, 0.1],
    [0.45, 0.08],
    [0.52, 0.12],
    [0.56, 0.08],
    [0.6, 0.04],
    [0.63, 0.09],
    [0.6, 0.14],
    [0.68, 0.16],
    [0.78, 0.22],
    [0.88, 0.26],
    [0.95, 0.32],
    [0.93, 0.4],
    [0.88, 0.38],
    [0.86, 0.55],
    [0.84, 0.58],
    [0.82, 0.42],
    [0.66, 0.44],
    [0.64, 0.58],
    [0.61, 0.58],
    [0.6, 0.45],
    [0.38, 0.46],
    [0.36, 0.58],
    [0.33, 0.58],
    [0.32, 0.45],
    [0.16, 0.47],
    [0.14, 0.58],
    [0.11, 0.57],
    [0.1, 0.45],
    [0.05, 0.42],
  ],
  // deer: slim body, long neck, antler strokes
  [
    [0.1, 0.5],
    [0.18, 0.42],
    [0.3, 0.38],
    [0.5, 0.36],
    [0.62, 0.3],
    [0.7, 0.18],
    [0.72, 0.08],
    [0.76, 0.16],
    [0.75, 0.06],
    [0.8, 0.14],
    [0.78, 0.22],
    [0.74, 0.3],
    [0.78, 0.38],
    [0.84, 0.44],
    [0.82, 0.5],
    [0.76, 0.46],
    [0.74, 0.6],
    [0.71, 0.6],
    [0.7, 0.46],
    [0.5, 0.48],
    [0.48, 0.62],
    [0.45, 0.62],
    [0.44, 0.48],
    [0.22, 0.5],
    [0.2, 0.62],
    [0.17, 0.61],
    [0.16, 0.5],
    [0.1, 0.5],
  ],
];

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null; // { key, rock, figures:[{pts,cum,total,x,y,s,phase}], prints:[{cv,x,y}] }

  function rockSubstrate(rng, c) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const o = cv.getContext('2d');
    const bg = c.bg && c.bg[3] > 0.01 ? c.bg : [0.16, 0.12, 0.09];
    const warm = mix(bg, c.warning || [0.8, 0.6, 0.3], 0.18);
    o.fillStyle = rgb(warm);
    o.fillRect(0, 0, w, h);
    // Mottling: soft darker/lighter blobs.
    for (let i = 0; i < 140; i++) {
      const r = (0.02 + rng() * 0.09) * Math.min(w, h);
      const g = o.createRadialGradient(0, 0, 0, 0, 0, r);
      const dark = rng() < 0.5;
      g.addColorStop(0, rgb(dark ? [0, 0, 0] : [1, 1, 1], 0.05 + rng() * 0.06));
      g.addColorStop(1, rgb([0, 0, 0], 0));
      o.save();
      o.translate(rng() * w, rng() * h);
      o.fillStyle = g;
      o.beginPath();
      o.arc(0, 0, r, 0, Math.PI * 2);
      o.fill();
      o.restore();
    }
    // Cracks: a few jagged dark polylines.
    o.strokeStyle = rgb([0, 0, 0], 0.18);
    o.lineWidth = Math.max(1, Math.min(w, h) * 0.0025);
    for (let i = 0; i < 5; i++) {
      let x = rng() * w;
      let y = rng() * h * 0.4;
      o.beginPath();
      o.moveTo(x, y);
      for (let s = 0; s < 14; s++) {
        x += (rng() - 0.5) * w * 0.06;
        y += rng() * h * 0.07;
        o.lineTo(x, y);
      }
      o.stroke();
    }
    return cv;
  }

  // Ochre handprint stencil: spray of pigment dots with the hand left dark.
  function handprint(rng, c, size) {
    const cv = document.createElement('canvas');
    cv.width = size;
    cv.height = size;
    const o = cv.getContext('2d');
    const ochre = mix(c.warning || [0.85, 0.55, 0.25], c.error || [0.7, 0.3, 0.2], rng() * 0.5);
    for (let i = 0; i < 600; i++) {
      const a = rng() * Math.PI * 2;
      const r = (Math.sqrt(rng()) * size) / 2;
      o.fillStyle = rgb(ochre, 0.12 + rng() * 0.25);
      o.beginPath();
      o.arc(
        size / 2 + Math.cos(a) * r,
        size / 2 + Math.sin(a) * r,
        0.8 + rng() * 1.6,
        0,
        Math.PI * 2
      );
      o.fill();
    }
    // Erase the hand: palm circle + five finger lozenges.
    o.globalCompositeOperation = 'destination-out';
    const px = size / 2;
    const py = size * 0.58;
    o.beginPath();
    o.arc(px, py, size * 0.16, 0, Math.PI * 2);
    o.fill();
    for (let f = 0; f < 5; f++) {
      const fa = -Math.PI / 2 + (f - 2) * 0.32;
      const fl = size * (f === 0 ? 0.16 : 0.24);
      o.save();
      o.translate(px + Math.cos(fa) * size * 0.13, py + Math.sin(fa) * size * 0.13);
      o.rotate(fa);
      o.beginPath();
      o.ellipse(fl / 2, 0, fl / 2, size * 0.035, 0, 0, Math.PI * 2);
      o.fill();
      o.restore();
    }
    return cv;
  }

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const c = getColors();
    const rock = rockSubstrate(rng, c);
    const density = params.density ?? 0.5;

    const figures = [];
    const nFig = 2 + Math.round(density * 3);
    for (let i = 0; i < nFig; i++) {
      const proto = ANIMALS[(rng() * ANIMALS.length) | 0];
      const s = Math.min(w, h) * (0.22 + rng() * 0.22);
      const pts = proto.map(([x, y]) => [x * s, y * s * 1.1]);
      const cum = [0];
      let total = 0;
      for (let k = 1; k < pts.length; k++) {
        total += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
        cum.push(total);
      }
      figures.push({
        pts,
        cum,
        total,
        x: rng() * (w - s),
        y: rng() * (h - s * 0.7),
        phase: rng(),
        flip: rng() < 0.5 ? -1 : 1,
        s,
      });
    }

    const prints = [];
    const nPr = 1 + Math.round(density * 3);
    for (let i = 0; i < nPr; i++) {
      const size = Math.min(w, h) * (0.12 + rng() * 0.08);
      prints.push({
        cv: handprint(rng, c, Math.max(48, size | 0)),
        x: rng() * (w - size),
        y: rng() * (h - size),
      });
    }
    cache = { key, rock, figures, prints };
    return cache;
  }

  function strokeFigure(fig, limit, ink) {
    c2d.strokeStyle = rgb(ink, 0.85);
    c2d.lineWidth = Math.max(2, fig.s * 0.022);
    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';
    c2d.save();
    c2d.translate(fig.x + (fig.flip < 0 ? fig.s : 0), fig.y);
    c2d.scale(fig.flip, 1);
    c2d.beginPath();
    c2d.moveTo(fig.pts[0][0], fig.pts[0][1]);
    for (let k = 1; k < fig.pts.length; k++) {
      if (fig.cum[k] <= limit) c2d.lineTo(fig.pts[k][0], fig.pts[k][1]);
      else {
        const segLen = fig.cum[k] - fig.cum[k - 1] || 1;
        const f = Math.max(0, (limit - fig.cum[k - 1]) / segLen);
        if (f > 0)
          c2d.lineTo(
            fig.pts[k - 1][0] + (fig.pts[k][0] - fig.pts[k - 1][0]) * f,
            fig.pts[k - 1][1] + (fig.pts[k][1] - fig.pts[k - 1][1]) * f
          );
        break;
      }
    }
    c2d.stroke();
    c2d.restore();
  }

  function frame(t0, params) {
    const t = t0 + START_OFF;
    const { rock, figures, prints } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    c2d.drawImage(rock, 0, 0);

    // Handprints fade in early and stay.
    for (let i = 0; i < prints.length; i++) {
      const p = prints[i];
      c2d.globalAlpha = Math.min(1, Math.max(0, t * 0.4 - i * 0.5 + 1));
      c2d.drawImage(p.cv, p.x, p.y);
    }
    c2d.globalAlpha = 1;

    // Animals draw on, each on its own staggered cycle, then hold.
    const charcoal = mix(c.fg || [0.1, 0.08, 0.06], [0, 0, 0], 0.5);
    for (const fig of figures) {
      const r = Math.min(1, Math.max(0, t / REVEAL_SEC - fig.phase) * 2.2);
      if (r > 0) strokeFigure(fig, r * fig.total, charcoal);
    }

    // Torchlight: a drifting bright pool, darkness elsewhere.
    const intensity = params.intensity ?? 0.5;
    const tx = w * (0.5 + 0.34 * Math.sin(t * 0.21));
    const ty = h * (0.5 + 0.3 * Math.sin(t * 0.13 + 1.7));
    const R = Math.min(w, h) * (0.5 + 0.25 * intensity);
    const g = c2d.createRadialGradient(tx, ty, R * 0.15, tx, ty, R * 1.6);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${0.55 + 0.3 * (1 - intensity)})`);
    c2d.fillStyle = g;
    c2d.fillRect(0, 0, w, h);
    // Warm glow at the torch centre.
    const warm = c2d.createRadialGradient(tx, ty, 0, tx, ty, R * 0.6);
    warm.addColorStop(
      0,
      rgb(mix(c.warning || [1, 0.7, 0.3], [1, 1, 1], 0.3), 0.12 + 0.1 * intensity)
    );
    warm.addColorStop(1, 'rgba(0,0,0,0)');
    c2d.fillStyle = warm;
    c2d.fillRect(0, 0, w, h);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      frame(REVEAL_SEC * 1.4, params); // figures fully drawn, torch mid-wall
    },
    dispose() {
      cache = null;
    },
  };
}
