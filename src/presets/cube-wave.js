// cube-wave — the isometric traveling-wave classic, with real boxes. An n×n
// board of small cubes viewed from a fixed dimetric angle; each cube bobs in
// translateZ with a negative delay proportional to its distance from center,
// so the wave radiates outward and a paused still catches it mid-swell. The
// board breathes a few degrees so the composition never freezes visually.
// Three visible faces per cube (top/left/right) keep the node budget at
// 3n²+2 (≤ 194 at max density).

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const CELL = 2.4; // em pitch
const SIZE = 1.8; // em cube edge

const STYLE = `
  .stage { perspective: 60em; overflow: hidden; display: grid; place-items: center; }
  .breathe { transform-style: preserve-3d;
    animation: cwBreathe var(--cw-breathedur, 33s) ease-in-out -12s infinite alternate; }
  .board { position: relative; transform-style: preserve-3d;
    transform: rotateX(58deg) rotateZ(45deg); }
  .cube { position: absolute; transform-style: preserve-3d;
    animation: cwBob var(--cw-dur, 4.5s) ease-in-out var(--delay, 0s) infinite alternate; }
  .t, .l, .r { position: absolute; width: ${SIZE}em; height: ${SIZE}em; }
  .t { background: var(--cw-top); transform: translateZ(${SIZE}em); }
  .l { background: var(--cw-left); transform: rotateX(-90deg) translateZ(${-SIZE / 2}em) translateY(${SIZE / 2}em); }
  .r { background: var(--cw-right); transform: rotateY(90deg) translateZ(${SIZE / 2}em) translateX(${SIZE / 2}em); }
  @keyframes cwBob { from { transform: translate3d(var(--x), var(--y), 0); }
    to { transform: translate3d(var(--x), var(--y), var(--cw-amp, 1.6em)); } }
  @keyframes cwBreathe { from { transform: rotateX(-4deg); } to { transform: rotateX(4deg); } }
  ${PAUSE_RULE}
`;

export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 79);
  const side = 5 + Math.round(p.density * 3); // 5..8 per side

  const breathe = document.createElement('div');
  breathe.className = 'breathe';
  const board = document.createElement('div');
  board.className = 'board';
  breathe.appendChild(board);
  const mid = (side - 1) / 2;
  for (let i = 0; i < side; i++) {
    for (let j = 0; j < side; j++) {
      const cube = document.createElement('div');
      cube.className = 'cube';
      cube.style.setProperty('--x', `${((i - mid) * CELL).toFixed(2)}em`);
      cube.style.setProperty('--y', `${((j - mid) * CELL).toFixed(2)}em`);
      // Wave radiates from center; tiny seeded jitter keeps rings organic.
      const dist = Math.hypot(i - mid, j - mid) + rand() * 0.15;
      cube.style.setProperty('--delay', `calc(var(--cw-step, -0.35s) * ${dist.toFixed(2)} - 2s)`);
      for (const cls of ['t', 'l', 'r']) {
        const f = document.createElement('div');
        f.className = cls;
        cube.appendChild(f);
      }
      board.appendChild(cube);
    }
  }
  css3d.stage.appendChild(breathe);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const sp = Math.max(0.05, params.speed);
    css3d.setVars({
      '--cw-dur': `${(4.5 / sp).toFixed(2)}s`,
      '--cw-breathedur': `${(33 / sp).toFixed(2)}s`,
      '--cw-step': `${(-0.35 / sp).toFixed(3)}s`,
      '--cw-amp': `${(0.8 + params.intensity * 1.4).toFixed(2)}em`,
    });
    const key = rgb(c.primary) + rgb(c.bg);
    if (key !== lastKey) {
      lastKey = key;
      css3d.setVars({
        '--cw-top': rgb(c.primary),
        '--cw-left': rgb(mix(c.primary, c.bg, 0.45)),
        '--cw-right': rgb(mix(c.primary, c.bg, 0.65)),
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
