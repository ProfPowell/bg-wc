// satellites — a tiny orrery. A planet approximated by stacked translucent
// discs, three seeded-tilt orbit rings each carrying a few themed cards
// circling at their own periods (negative delays scatter the phases). The
// whole system precesses slowly.

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb, rgbaCss as rgba } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const STYLE = `
  .stage { perspective: 40em; overflow: hidden; display: grid; place-items: center; }
  .system { position: relative; transform-style: preserve-3d;
    animation: saPrecess var(--sa-predur, 120s) linear -40s infinite; }
  .disc { position: absolute; border-radius: 50%; background: var(--sa-planet);
    transform-style: preserve-3d; opacity: 0.55; }
  .orbit { position: absolute; transform-style: preserve-3d; }
  .track { position: absolute; border-radius: 50%; border: 1px solid var(--sa-track); }
  .spin { position: absolute; transform-style: preserve-3d;
    animation: saSpin var(--dur, 24s) linear var(--delay, -9s) infinite; }
  .sat { position: absolute; width: 1.6em; height: 2.3em; left: -0.8em; top: -1.15em;
    border-radius: 0.2em; background: var(--col);
    opacity: var(--sa-op, 0.95); }
  @keyframes saSpin { to { transform: rotateY(360deg); } }
  @keyframes saPrecess { to { transform: rotateY(360deg) rotateX(8deg); } }
  ${PAUSE_RULE}
`;

export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 97);

  const system = document.createElement('div');
  system.className = 'system';

  // Planet: stacked discs approximating a 5em-radius sphere.
  const R = 5;
  for (let k = -3; k <= 3; k++) {
    const z = (k / 3.5) * R;
    const r = Math.sqrt(Math.max(0.4, R * R - z * z));
    const disc = document.createElement('div');
    disc.className = 'disc';
    disc.style.width = `${(r * 2).toFixed(2)}em`;
    disc.style.height = `${(r * 2).toFixed(2)}em`;
    disc.style.left = `${-r.toFixed(2)}em`;
    disc.style.top = `${-r.toFixed(2)}em`;
    disc.style.transform = `rotateX(90deg) translateZ(${z.toFixed(2)}em)`;
    system.appendChild(disc);
  }

  // Three tilted orbits, each with 2-4 satellites (density adds passengers).
  for (let o = 0; o < 3; o++) {
    const orbit = document.createElement('div');
    orbit.className = 'orbit';
    orbit.style.transform = `rotate3d(${(rand() * 2 - 1).toFixed(2)}, 0.2, ${(rand() * 2 - 1).toFixed(2)}, ${(28 + rand() * 40).toFixed(0)}deg)`;
    const radius = 8.5 + o * 3;
    const track = document.createElement('div');
    track.className = 'track';
    track.style.width = `${radius * 2}em`;
    track.style.height = `${radius * 2}em`;
    track.style.left = `${-radius}em`;
    track.style.top = `${-radius}em`;
    track.style.transform = 'rotateX(90deg)';
    orbit.appendChild(track);
    const spin = document.createElement('div');
    spin.className = 'spin';
    spin.style.setProperty('--dur', `calc(var(--sa-base, 24s) * ${(0.7 + o * 0.5).toFixed(2)})`);
    spin.style.setProperty('--delay', `${(-rand() * 20).toFixed(1)}s`);
    const nSats = 2 + Math.round(p.density * 2); // 2..4 per orbit
    for (let s = 0; s < nSats; s++) {
      const sat = document.createElement('div');
      sat.className = 'sat';
      sat.style.setProperty('--col', `var(--sa-c${(o + s) % 3})`);
      sat.style.transform = `rotateY(${((s * 360) / nSats + rand() * 20).toFixed(0)}deg) translateZ(${radius}em)`;
      spin.appendChild(sat);
    }
    orbit.appendChild(spin);
    system.appendChild(orbit);
  }
  css3d.stage.appendChild(system);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const sp = Math.max(0.05, params.speed);
    css3d.setVars({
      '--sa-base': `${(24 / sp).toFixed(2)}s`,
      '--sa-predur': `${(120 / sp).toFixed(2)}s`,
      '--sa-op': (0.7 + params.intensity * 0.3).toFixed(2),
    });
    const key = rgb(c.primary) + rgb(c.accent) + rgb(c.info) + rgb(c.fg) + rgb(c.bg);
    if (key !== lastKey) {
      lastKey = key;
      css3d.setVars({
        '--sa-planet': rgb(mix(c.primary, c.bg, 0.45)),
        '--sa-track': rgba(c.fg, 0.3),
        '--sa-c0': rgb(c.primary),
        '--sa-c1': rgb(c.accent),
        '--sa-c2': rgb(c.info),
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
