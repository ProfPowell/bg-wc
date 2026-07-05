// monolith — dark slabs floating and slowly tumbling over a floor grid
// (explode's floor idiom). Each slab is a six-face cuboid; its tumble axis
// rides CSS vars inside a shared keyframe, staggered by negative delays so
// paused stills catch every slab mid-tumble. Slab faces are fg-derived
// near-dark with a primary edge sheen — legible on light and dark grounds.

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb, rgbaCss as rgba } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const STYLE = `
  .stage { perspective: 34em; overflow: hidden; display: grid; place-items: center; }
  .scene { position: relative; transform-style: preserve-3d;
    animation: moOrbit var(--mo-orbitdur, 150s) linear -50s infinite; }
  .floor { position: absolute; inset: -30em; transform: rotateX(-90deg) translateZ(9em);
    background-image:
      radial-gradient(transparent, var(--mo-bg) 30em),
      repeating-linear-gradient(90deg, var(--mo-rule) 0 1px, transparent 0 2em),
      repeating-linear-gradient(var(--mo-rule) 0 1px, transparent 0 2em);
    opacity: var(--mo-floor, 0.35); }
  .slab { position: absolute; transform-style: preserve-3d;
    animation: moTumble var(--dur, 60s) linear var(--delay, -17s) infinite; }
  .face { position: absolute; background: var(--mo-face);
    box-shadow: inset 0 0 0.5em var(--mo-sheen); }
  @keyframes moOrbit { to { transform: rotateY(360deg); } }
  @keyframes moTumble {
    from { transform: translate3d(var(--x), var(--y), var(--z)) rotate3d(var(--ax), var(--ay), var(--az), 0deg); }
    to { transform: translate3d(var(--x), var(--y), var(--z)) rotate3d(var(--ax), var(--ay), var(--az), 360deg); }
  }
  ${PAUSE_RULE}
`;

// Build one w×h×d cuboid out of six positioned faces.
function cuboid(w, h, d) {
  const slab = document.createElement('div');
  slab.className = 'slab';
  const faces = [
    [`${w}em`, `${h}em`, `translate3d(${-w / 2}em, ${-h / 2}em, ${d / 2}em)`],
    [`${w}em`, `${h}em`, `translate3d(${-w / 2}em, ${-h / 2}em, ${-d / 2}em) rotateY(180deg)`],
    [
      `${d}em`,
      `${h}em`,
      `translate3d(${-d / 2}em, ${-h / 2}em, 0) rotateY(90deg) translateZ(${w / 2}em)`,
    ],
    [
      `${d}em`,
      `${h}em`,
      `translate3d(${-d / 2}em, ${-h / 2}em, 0) rotateY(-90deg) translateZ(${w / 2}em)`,
    ],
    [
      `${w}em`,
      `${d}em`,
      `translate3d(${-w / 2}em, ${-d / 2}em, 0) rotateX(90deg) translateZ(${h / 2}em)`,
    ],
    [
      `${w}em`,
      `${d}em`,
      `translate3d(${-w / 2}em, ${-d / 2}em, 0) rotateX(-90deg) translateZ(${h / 2}em)`,
    ],
  ];
  for (const [fw, fh, tf] of faces) {
    const f = document.createElement('div');
    f.className = 'face';
    f.style.width = fw;
    f.style.height = fh;
    f.style.transform = tf;
    slab.appendChild(f);
  }
  return slab;
}

export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 71);
  const n = 3 + Math.round(p.density * 2); // 3..5 slabs

  const scene = document.createElement('div');
  scene.className = 'scene';
  const floor = document.createElement('div');
  floor.className = 'floor';
  scene.appendChild(floor);

  for (let i = 0; i < n; i++) {
    const slab = cuboid(2.2 + rand() * 1.6, 5.5 + rand() * 3, 0.8 + rand() * 0.6);
    slab.style.setProperty('--x', `${((i - (n - 1) / 2) * 7 + (rand() - 0.5) * 3).toFixed(1)}em`);
    slab.style.setProperty('--y', `${(-(1 + rand() * 4)).toFixed(1)}em`);
    slab.style.setProperty('--z', `${((rand() - 0.5) * 10).toFixed(1)}em`);
    slab.style.setProperty('--ax', (rand() * 0.5).toFixed(2));
    slab.style.setProperty('--ay', (0.6 + rand() * 0.4).toFixed(2));
    slab.style.setProperty('--az', (rand() * 0.3).toFixed(2));
    slab.style.setProperty(
      '--dur',
      `calc(var(--mo-base, 60s) * ${(0.8 + rand() * 0.7).toFixed(2)})`
    );
    slab.style.setProperty('--delay', `${(-5 - rand() * 40).toFixed(1)}s`);
    scene.appendChild(slab);
  }
  css3d.stage.appendChild(scene);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const sp = Math.max(0.05, params.speed);
    css3d.setVars({
      '--mo-base': `${(60 / sp).toFixed(2)}s`,
      '--mo-orbitdur': `${(150 / sp).toFixed(2)}s`,
      '--mo-floor': (0.2 + params.intensity * 0.3).toFixed(2),
    });
    const key = rgb(c.fg) + rgb(c.bg) + rgb(c.primary);
    if (key !== lastKey) {
      lastKey = key;
      css3d.setVars({
        '--mo-face': rgb(mix(c.fg, c.bg, 0.12)),
        '--mo-sheen': rgba(c.primary, 0.55),
        '--mo-bg': rgb(c.bg),
        '--mo-rule': rgba(c.fg, 0.5),
      });
    }
  }
  reconcile();

  return {
    setPlaying(pl) {
      css3d.setPlaying(pl);
    },
    frame() {
      reconcile();
    },
    resize(w, h) {
      css3d.stage.style.fontSize = `${Math.min(16, Math.max(3, Math.min(w, h) / 30))}px`;
    },
    dispose() {
      css3d.dispose();
    },
  };
}
