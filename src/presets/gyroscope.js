// gyroscope — nested wireframe rings spinning on different axes around a
// glowing core, grounded by a faint equatorial disc. Each ring's spin axis
// lives in CSS vars consumed inside the keyframe (the explode --tx idiom),
// so one keyframe animates every ring. Scene built once; reconcile is vars.

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb, rgbaCss as rgba } from '../renderer/tokens.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const STYLE = `
  .stage { perspective: 40em; overflow: hidden; display: grid; place-items: center; }
  .rig { position: relative; transform-style: preserve-3d;
    animation: gyDrift var(--gy-driftdur, 87s) linear -30s infinite; }
  .ring { position: absolute; border-radius: 50%; border-style: solid;
    transform-style: preserve-3d;
    animation: gySpin var(--dur, 20s) linear var(--delay, -7s) infinite; }
  .core { position: absolute; width: 3.4em; height: 3.4em; left: -1.7em; top: -1.7em;
    border-radius: 50%;
    background-image: radial-gradient(var(--gy-core), transparent 65%);
    animation: gyPulse var(--gy-pulsedur, 9s) ease-in-out -4s infinite alternate; }
  .equator { position: absolute; border-radius: 50%;
    border: 1px solid var(--gy-eq); transform: rotateX(90deg); opacity: 0.5; }
  @keyframes gySpin { to { transform: rotate3d(var(--ax), var(--ay), var(--az), 360deg); } }
  @keyframes gyDrift { to { transform: rotateY(360deg); } }
  @keyframes gyPulse { from { opacity: var(--gy-oplo, 0.5); } to { opacity: 1; } }
  ${PAUSE_RULE}
`;

export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 67);
  const n = 6 + Math.round(p.density * 4); // 6..10 rings

  const rig = document.createElement('div');
  rig.className = 'rig';
  const core = document.createElement('div');
  core.className = 'core';
  rig.appendChild(core);
  for (let i = 0; i < n; i++) {
    const ring = document.createElement('div');
    ring.className = 'ring';
    const d = 9 + i * 4.5; // em diameter
    ring.style.width = `${d}em`;
    ring.style.height = `${d}em`;
    ring.style.left = `${-d / 2}em`;
    ring.style.top = `${-d / 2}em`;
    ring.style.borderWidth = '0.32em';
    ring.style.borderColor = `var(--gy-c${i % 3})`;
    // A distinct, seeded spin axis per ring.
    ring.style.setProperty('--ax', (rand() * 2 - 1).toFixed(2));
    ring.style.setProperty('--ay', (rand() * 2 - 1).toFixed(2));
    ring.style.setProperty('--az', (rand() * 0.6).toFixed(2));
    ring.style.setProperty('--dur', `calc(var(--gy-base, 20s) * ${(0.7 + i * 0.35).toFixed(2)})`);
    ring.style.setProperty('--delay', `${(-3 - rand() * 9).toFixed(2)}s`);
    rig.appendChild(ring);
  }
  const eq = document.createElement('div');
  eq.className = 'equator';
  const ed = 9 + (n - 1) * 4.5 + 6;
  eq.style.width = `${ed}em`;
  eq.style.height = `${ed}em`;
  eq.style.left = `${-ed / 2}em`;
  eq.style.top = `${-ed / 2}em`;
  rig.appendChild(eq);
  css3d.stage.appendChild(rig);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const sp = Math.max(0.05, params.speed);
    css3d.setVars({
      '--gy-base': `${(20 / sp).toFixed(2)}s`,
      '--gy-driftdur': `${(87 / sp).toFixed(2)}s`,
      '--gy-pulsedur': `${(9 / sp).toFixed(2)}s`,
      '--gy-oplo': (0.35 + params.intensity * 0.3).toFixed(2),
    });
    const key = rgb(c.primary) + rgb(c.accent) + rgb(c.info) + rgb(c.fg);
    if (key !== lastKey) {
      lastKey = key;
      css3d.setVars({
        '--gy-c0': rgb(c.primary),
        '--gy-c1': rgb(c.accent),
        '--gy-c2': rgb(c.info),
        '--gy-core': rgb(c.accent),
        '--gy-eq': rgba(c.fg, 0.4),
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
