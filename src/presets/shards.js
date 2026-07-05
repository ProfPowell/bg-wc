// shards — a slow-motion cloud of translucent crystal fragments on a
// spherical shell, the whole cloud rotating while each shard shimmers on
// its own staggered cycle. Shards are clip-path'd gradient planes in the
// three theme colors, double-sided so the far side of the shell reads.

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb } from '../renderer/tokens.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const STYLE = `
  .stage { perspective: 38em; overflow: hidden; display: grid; place-items: center; }
  .cloud { position: relative; transform-style: preserve-3d;
    animation: shTurn var(--sh-dur, 75s) linear -26s infinite; }
  .shard { position: absolute; width: 5em; height: 5em; left: -2.5em; top: -2.5em;
    background-image: linear-gradient(var(--ang, 30deg), var(--col), transparent 75%);
    clip-path: polygon(var(--clip));
    animation: shShimmer var(--sh-shimdur, 11s) ease-in-out var(--delay, -4s) infinite alternate; }
  @keyframes shTurn { to { transform: rotateY(360deg) rotateX(14deg); } }
  @keyframes shShimmer {
    from { opacity: var(--sh-oplo, 0.25); }
    to { opacity: var(--sh-ophi, 0.85); }
  }
  ${PAUSE_RULE}
`;

export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 73);
  const n = 16 + Math.round(p.density * 12); // 16..28 shards

  const cloud = document.createElement('div');
  cloud.className = 'cloud';
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'shard';
    const theta = rand() * 360;
    const phi = (rand() - 0.5) * 140;
    const r = 9 + rand() * 5;
    s.style.transform = `rotateY(${theta.toFixed(1)}deg) rotateX(${phi.toFixed(1)}deg) translateZ(${r.toFixed(1)}em) rotate(${(rand() * 360).toFixed(0)}deg)`;
    // A seeded triangle or quad.
    const pts =
      rand() < 0.5
        ? `${(rand() * 40).toFixed(0)}% 0%, 100% ${(rand() * 60).toFixed(0)}%, ${(20 + rand() * 40).toFixed(0)}% 100%`
        : `${(rand() * 30).toFixed(0)}% 0%, 100% ${(rand() * 30).toFixed(0)}%, ${(60 + rand() * 40).toFixed(0)}% 100%, 0% ${(50 + rand() * 40).toFixed(0)}%`;
    s.style.setProperty('--clip', pts);
    s.style.setProperty('--ang', `${(rand() * 360).toFixed(0)}deg`);
    s.style.setProperty('--col', `var(--sh-c${i % 3})`);
    s.style.setProperty('--delay', `${(-rand() * 11).toFixed(2)}s`);
    cloud.appendChild(s);
  }
  css3d.stage.appendChild(cloud);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const sp = Math.max(0.05, params.speed);
    css3d.setVars({
      '--sh-dur': `${(75 / sp).toFixed(2)}s`,
      '--sh-shimdur': `${(11 / sp).toFixed(2)}s`,
      '--sh-oplo': (0.15 + params.intensity * 0.2).toFixed(2),
      '--sh-ophi': (0.55 + params.intensity * 0.4).toFixed(2),
    });
    const key = rgb(c.primary) + rgb(c.accent) + rgb(c.info);
    if (key !== lastKey) {
      lastKey = key;
      css3d.setVars({
        '--sh-c0': rgb(c.primary),
        '--sh-c1': rgb(c.accent),
        '--sh-c2': rgb(c.info),
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
