// chamber — the camera lives inside a slowly rotating room. Six inward-facing
// gradient planes (backfaces hidden, so you always see the far interior) with
// fg rule lines like wainscoting; a soft light disc orbits counter to the
// room, drifting across the walls. The scene node count is tiny (~10) — the
// whole effect is gradients on big planes. Seed nudges wall hues.

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb, rgbaCss as rgba } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const HALF = 21; // em half-room

const STYLE = `
  .stage { perspective: 18em; overflow: hidden; display: grid; place-items: center; }
  .room { position: relative; transform-style: preserve-3d;
    animation: chTurn var(--ch-dur, 140s) linear -47s infinite; }
  .wall { position: absolute; width: ${HALF * 2}em; height: ${HALF * 2}em;
    left: ${-HALF}em; top: ${-HALF}em;
    backface-visibility: hidden;
    background-image:
      repeating-linear-gradient(var(--ch-rule) 0 1px, transparent 1px ${HALF / 3}em),
      linear-gradient(var(--wa), var(--wb));
    opacity: var(--ch-op, 0.96); }
  .glow { position: absolute; width: 12em; height: 12em; left: -6em; top: -6em;
    border-radius: 50%;
    background-image: radial-gradient(var(--ch-glow), transparent 70%);
    animation: chOrbit var(--ch-glowdur, 61s) linear -20s infinite; }
  .glow[data-dim] { opacity: 0.5;
    animation: chOrbitDim var(--ch-glowdur, 61s) linear -20s infinite; }
  @keyframes chTurn { to { transform: rotateY(360deg); } }
  @keyframes chOrbit { from { transform: rotateY(0deg) translateZ(${HALF - 2}em); }
    to { transform: rotateY(-360deg) translateZ(${HALF - 2}em); } }
  @keyframes chOrbitDim { from { transform: rotateY(0deg) translateZ(${HALF - 2}em); }
    to { transform: rotateY(360deg) translateZ(${HALF - 2}em); } }
  ${PAUSE_RULE}
`;

// NOTE: the dimensional-wave smoke asserts >= 10 stage descendants; this
// scene sits at exactly 10 counting the mounted <style> (room + 6 walls +
// 2 glows + style). Removing a node or relocating the style breaks it.
// The glows' wall-hugging positions live in their orbit keyframes on
// purpose: when screenshot harnesses cancel animations they rest at room
// center, which reads as the chamber's light source — a deliberate
// exception to the inline-pose rule (the walls carry the composition).
export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 89);
  const hueShuffle = rand() < 0.5; // seed swaps which walls get primary vs accent

  const room = document.createElement('div');
  room.className = 'room';
  // 4 walls + ceiling + floor, all facing inward.
  const placements = [
    `rotateY(0deg) translateZ(${-HALF}em)`,
    `rotateY(90deg) translateZ(${-HALF}em)`,
    `rotateY(180deg) translateZ(${-HALF}em)`,
    `rotateY(270deg) translateZ(${-HALF}em)`,
    `rotateX(90deg) translateZ(${-HALF}em)`,
    `rotateX(-90deg) translateZ(${-HALF}em)`,
  ];
  placements.forEach((tf, i) => {
    const wall = document.createElement('div');
    wall.className = 'wall';
    wall.style.transform = tf;
    const fam = (i + (hueShuffle ? 1 : 0)) % 2 === 0 ? 'p' : 'a';
    wall.style.setProperty('--wa', `var(--ch-${fam}a)`);
    wall.style.setProperty('--wb', `var(--ch-${fam}b)`);
    room.appendChild(wall);
  });
  const glow = document.createElement('div');
  glow.className = 'glow';
  room.appendChild(glow);
  const dimGlow = document.createElement('div');
  dimGlow.className = 'glow';
  dimGlow.setAttribute('data-dim', '');
  room.appendChild(dimGlow);
  css3d.stage.appendChild(room);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const sp = Math.max(0.05, params.speed);
    css3d.setVars({
      '--ch-dur': `${(140 / sp).toFixed(2)}s`,
      '--ch-glowdur': `${(61 / sp).toFixed(2)}s`,
      '--ch-op': (0.85 + params.intensity * 0.15).toFixed(2),
    });
    const key = rgb(c.primary) + rgb(c.accent) + rgb(c.bg) + rgb(c.fg);
    if (key !== lastKey) {
      lastKey = key;
      css3d.setVars({
        '--ch-pa': rgb(mix(c.primary, c.bg, 0.35)),
        '--ch-pb': rgb(mix(c.primary, c.bg, 0.75)),
        '--ch-aa': rgb(mix(c.accent, c.bg, 0.4)),
        '--ch-ab': rgb(mix(c.accent, c.bg, 0.8)),
        '--ch-glow': rgba(c.warning, 0.5),
        '--ch-rule': rgba(c.fg, 0.18),
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
