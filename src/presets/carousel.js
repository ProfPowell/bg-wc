// carousel — a rolodex of theme-gradient cards orbiting the camera. The ring
// spins on a long loop and precesses (a slow tilt wobble) so the composition
// never sits still; cards are double-sided with dimmer backfaces. Scene is
// built once from create-time params; reconcile only touches vars.

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const STYLE = `
  .stage { perspective: 36em; overflow: hidden; display: grid; place-items: center; }
  .tilt { transform-style: preserve-3d;
    animation: caPrecess var(--ca-predur, 41s) ease-in-out -12s infinite alternate; }
  .ring { position: relative; transform-style: preserve-3d;
    animation: caSpin var(--ca-dur, 60s) linear -21s infinite; }
  .card { position: absolute; width: 6em; height: 9em; left: -3em; top: -4.5em;
    border-radius: 0.4em; opacity: var(--ca-op, 0.92);
    background-image: linear-gradient(160deg, var(--a), var(--b)); }
  @keyframes caSpin { to { transform: rotateY(360deg); } }
  @keyframes caPrecess {
    from { transform: rotateX(6deg) rotateZ(-3deg); }
    to { transform: rotateX(-8deg) rotateZ(3deg); }
  }
  ${PAUSE_RULE}
`;

export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 63);
  const n = 10 + Math.round(p.density * 4); // 10..14 cards
  const radius = 13 + rand() * 3;

  const tilt = document.createElement('div');
  tilt.className = 'tilt';
  const ring = document.createElement('div');
  ring.className = 'ring';
  tilt.appendChild(ring);
  for (let i = 0; i < n; i++) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.transform = `rotateY(${(i * 360) / n}deg) translateZ(${radius.toFixed(2)}em)`;
    // Three gradient families cycle around the ring.
    card.style.setProperty('--a', `var(--ca-g${i % 3}a)`);
    card.style.setProperty('--b', `var(--ca-g${i % 3}b)`);
    ring.appendChild(card);
  }
  css3d.stage.appendChild(tilt);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const sp = Math.max(0.05, params.speed);
    css3d.setVars({
      '--ca-dur': `${(60 / sp).toFixed(2)}s`,
      '--ca-predur': `${(41 / sp).toFixed(2)}s`,
      '--ca-op': (0.65 + params.intensity * 0.3).toFixed(2),
    });
    const key = rgb(c.primary) + rgb(c.accent) + rgb(c.info) + rgb(c.bg);
    if (key !== lastKey) {
      lastKey = key;
      const pal = [c.primary, c.accent, c.info];
      const vars = {};
      pal.forEach((col, k) => {
        vars[`--ca-g${k}a`] = rgb(col);
        vars[`--ca-g${k}b`] = rgb(mix(col, c.bg, 0.55));
      });
      css3d.setVars(vars);
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
