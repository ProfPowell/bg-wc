// skyline — extruded city blocks in two depth rows over a ground plane, the
// camera panning laterally on a long alternate loop (negative delay lands
// mid-pan). Buildings are 5-face cuboids with window stripes; a seeded few
// get an accent roof glow. ~24 blocks × 5 faces + ground ≈ 122 nodes.

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb, rgbaCss as rgba } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const STYLE = `
  .stage { perspective: 30em; overflow: hidden; display: grid; place-items: center; }
  .world { position: relative; transform-style: preserve-3d;
    transform: rotateX(12deg);
    animation: skPan var(--sk-dur, 45s) ease-in-out -16s infinite alternate; }
  .ground { position: absolute; inset: -34em; transform: rotateX(-90deg) translateZ(6em);
    background-image:
      radial-gradient(transparent, var(--sk-bg) 30em),
      repeating-linear-gradient(90deg, var(--sk-rule) 0 1px, transparent 0 3em);
    opacity: 0.3; }
  .bldg { position: absolute; transform-style: preserve-3d; }
  .bf { position: absolute;
    background-image: repeating-linear-gradient(var(--sk-win) 0 0.22em, var(--sk-wall) 0.22em 0.66em);
    opacity: var(--sk-op, 0.95); }
  .roof { position: absolute; background: var(--sk-wall); }
  .roof[data-glow] { box-shadow: 0 0 1.2em var(--sk-glow); background: var(--sk-glow); }
  @keyframes skPan { from { transform: rotateX(12deg) translateX(9em); }
    to { transform: rotateX(12deg) translateX(-9em); } }
  ${PAUSE_RULE}
`;

// A 5-face building (4 sides + roof), w×h×d em, base sitting on y=6em plane.
function building(w, h, d) {
  const b = document.createElement('div');
  b.className = 'bldg';
  const faces = [
    [w, h, `translate3d(${-w / 2}em, ${6 - h}em, ${d / 2}em)`],
    [w, h, `translate3d(${-w / 2}em, ${6 - h}em, ${-d / 2}em) rotateY(180deg)`],
    [d, h, `translate3d(${-d / 2}em, ${6 - h}em, 0) rotateY(90deg) translateZ(${w / 2}em)`],
    [d, h, `translate3d(${-d / 2}em, ${6 - h}em, 0) rotateY(-90deg) translateZ(${w / 2}em)`],
  ];
  for (const [fw, fh, tf] of faces) {
    const f = document.createElement('div');
    f.className = 'bf';
    f.style.width = `${fw}em`;
    f.style.height = `${fh}em`;
    f.style.transform = tf;
    b.appendChild(f);
  }
  const roof = document.createElement('div');
  roof.className = 'roof';
  roof.style.width = `${w}em`;
  roof.style.height = `${d}em`;
  roof.style.transform = `translate3d(${-w / 2}em, ${-d / 2}em, 0) rotateX(90deg) translateZ(${-(6 - h) - d / 2}em)`;
  b.appendChild(roof);
  return { b, roof };
}

export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 83);
  const perRow = 9 + Math.round(p.density * 3); // 9..12 per row, 2 rows

  const world = document.createElement('div');
  world.className = 'world';
  const ground = document.createElement('div');
  ground.className = 'ground';
  world.appendChild(ground);

  for (let row = 0; row < 2; row++) {
    const z = row === 0 ? -3 : 5;
    for (let i = 0; i < perRow; i++) {
      const w = 1.6 + rand() * 2.2;
      const h = 3 + rand() * 6;
      const d = 1.6 + rand() * 1.4;
      const { b, roof } = building(w, h, d);
      b.style.transform = `translate3d(${((i - (perRow - 1) / 2) * 4.6 + (rand() - 0.5) * 1.5).toFixed(1)}em, 0, ${z}em)`;
      if (rand() < 0.2) roof.setAttribute('data-glow', '');
      world.appendChild(b);
    }
  }
  css3d.stage.appendChild(world);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const sp = Math.max(0.05, params.speed);
    css3d.setVars({
      '--sk-dur': `${(45 / sp).toFixed(2)}s`,
      '--sk-op': (0.75 + params.intensity * 0.25).toFixed(2),
    });
    const key = rgb(c.fg) + rgb(c.bg) + rgb(c.primary) + rgb(c.accent);
    if (key !== lastKey) {
      lastKey = key;
      css3d.setVars({
        '--sk-wall': rgb(mix(c.fg, c.bg, 0.25)),
        '--sk-win': rgb(mix(c.primary, c.bg, 0.25)),
        '--sk-glow': rgb(c.accent),
        '--sk-bg': rgb(c.bg),
        '--sk-rule': rgba(c.fg, 0.4),
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
