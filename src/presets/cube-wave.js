// cube-wave — the isometric traveling-wave classic, with real boxes. An n×n
// board of small cubes viewed from a fixed dimetric angle; each cube bobs in
// translateZ with a negative delay proportional to its distance from center,
// so the wave radiates outward and a paused still catches it mid-swell. The
// board breathes a few degrees so the composition never freezes visually.
// Each cube is a wrapper + bob + 3 faces (5 nodes), so the grid caps at
// side 6 to stay inside the ~220 budget (5·36 + 2 = 182).

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const CELL = 2.4; // em pitch
const SIZE = 1.8; // em cube edge

const STYLE = `
  .stage { perspective: 60em; overflow: hidden; display: grid; place-items: center; }
  .breathe { transform-style: preserve-3d;
    animation: cwBreathe var(--cw-breathedur, 33s) ease-in-out calc(var(--cw-breathedur, 33s) * -0.36) infinite alternate; }
  .board { position: relative; transform-style: preserve-3d;
    transform: rotateX(58deg) rotateZ(45deg); }
  .cube { position: absolute; transform-style: preserve-3d; }
  .bob { position: absolute; transform-style: preserve-3d;
    animation: cwBob var(--cw-dur, 4.5s) ease-in-out calc(var(--cw-dur, 4.5s) * var(--dfrac, -0.4)) infinite alternate; }
  .t, .l, .r { position: absolute; width: ${SIZE}em; height: ${SIZE}em; }
  .t { background: var(--cw-top); transform: translateZ(${SIZE}em); }
  .l { background: var(--cw-left); transform: rotateX(-90deg) translateZ(${-SIZE / 2}em) translateY(${SIZE / 2}em); }
  .r { background: var(--cw-right); transform: rotateY(90deg) translateZ(${SIZE / 2}em) translateX(${SIZE / 2}em); }
  @keyframes cwBob { from { transform: translateZ(calc(var(--z0) * -1)); }
    to { transform: translateZ(var(--cw-amp, 1.6em)); } }
  @keyframes cwBreathe { from { transform: rotateX(-4deg); } to { transform: rotateX(4deg); } }
  ${PAUSE_RULE}
`;

export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 79);
  const side = 4 + Math.round(p.density * 2); // 4..6 per side (5 nodes per cube)

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
      // Wave radiates from center; tiny seeded jitter keeps rings organic.
      const dist = Math.hypot(i - mid, j - mid) + rand() * 0.15;
      // Grid position AND the frozen mid-swell height live INLINE (screenshot
      // harnesses cancel infinite animations); the keyframe bobs .bob around
      // that resting height.
      const z0 = (Math.sin(dist * 1.15) * 0.5 + 0.5) * 1.2;
      cube.style.transform = `translate3d(${((i - mid) * CELL).toFixed(2)}em, ${((j - mid) * CELL).toFixed(2)}em, ${z0.toFixed(2)}em)`;
      const bob = document.createElement('div');
      bob.className = 'bob';
      bob.style.setProperty('--dfrac', (-0.4 - dist * 0.078).toFixed(3));
      bob.style.setProperty('--z0', `${z0.toFixed(2)}em`);
      for (const cls of ['t', 'l', 'r']) {
        const f = document.createElement('div');
        f.className = cls;
        bob.appendChild(f);
      }
      cube.appendChild(bob);
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
