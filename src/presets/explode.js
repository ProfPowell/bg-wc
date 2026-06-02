// src/presets/explode.js
// explode — a field of theme-colored particles over a faint floor grid that
// periodically bursts outward and reassembles. Ported from the explode-cube
// reference pen (docs/superpowers/plans/found-demos/explode-cube/explode-cube.css).

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

function rgb(c) {
  return `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`;
}

// Tiny deterministic PRNG so `seed` gives reproducible scatter.
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STYLE = `
  .stage { perspective: 32em; overflow: hidden; display: grid; place-items: center; }
  .scene { position: relative; transform-style: preserve-3d;
    animation: explodeRotate var(--ex-dur, 117s) infinite linear; }
  .floor { position: absolute; inset: -32em; transform: rotateX(-90deg) translateZ(8em);
    background-image:
      radial-gradient(transparent, var(--ex-bg, #000) 32em),
      repeating-linear-gradient(90deg, var(--ex-rule, #fff) 0 1px, transparent 0 2em),
      repeating-linear-gradient(var(--ex-rule, #fff) 0 1px, transparent 0 2em);
    opacity: var(--ex-floor, 0.4); }
  .particle { position: absolute; transform: rotateX(90deg); transform-style: preserve-3d; }
  .particle::before { content: ''; position: absolute; inset: -1em;
    background-image: radial-gradient(var(--ex-color, #fff), transparent 60%);
    /* --ex-delay phase-shifts the loop so a paused (reduced-motion) frame lands
       mid-burst rather than on the degenerate 0% (unexploded) frame. */
    animation: explodeBurst var(--ex-cycle, 6s) cubic-bezier(0.25,0,0.65,1.25) var(--ex-delay, -5.4s) infinite,
               explodeFade var(--ex-cycle, 6s) linear var(--ex-delay, -5.4s) infinite; }
  @keyframes explodeRotate { to { transform: rotateY(360deg); } }
  @keyframes explodeBurst {
    0%, 40%, 100% { transform: translate(0, 0); animation-timing-function: cubic-bezier(0.25,-0.25,0,1); }
    90% { transform: translate(var(--tx, 0), var(--ty, 0)); }
  }
  @keyframes explodeFade { 0%, 40%, 100% { opacity: 0.1; } 60%, 90% { opacity: 1; } }
  ${PAUSE_RULE}
`;

export function create({ host, css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);

  const p = getParams();
  const mode = (host.getAttribute('mode') || 'radial').toLowerCase();
  const rand = mulberry32(p.seed | 0 || 1);
  // density 0..1 → grid side, capped.
  const side = Math.max(4, Math.round(4 + p.density * 10));
  const burst = 2 + p.intensity * 6; // em

  const scene = document.createElement('div');
  scene.className = 'scene';
  const floor = document.createElement('div');
  floor.className = 'floor';
  scene.appendChild(floor);

  for (let gx = 0; gx < side; gx++) {
    for (let gy = 0; gy < side; gy++) {
      const el = document.createElement('div');
      el.className = 'particle';
      // Lay out on a grid, centered.
      el.style.left = `${(gx - side / 2) * 1.4}em`;
      el.style.top = `${(gy - side / 2) * 1.4}em`;
      let tx, ty;
      if (mode === 'cube') {
        // Burst to cube-face offsets (axis-aligned), like the reference pen.
        tx = `${(gx % 2 ? 1 : -1) * burst}em`;
        ty = `${(gy % 2 ? 1 : -1) * burst}em`;
      } else {
        // radial scatter
        const ang = rand() * Math.PI * 2;
        const r = burst * (0.4 + rand() * 0.6);
        tx = `${Math.cos(ang) * r}em`;
        ty = `${Math.sin(ang) * r}em`;
      }
      el.style.setProperty('--tx', tx);
      el.style.setProperty('--ty', ty);
      scene.appendChild(el);
    }
  }
  css3d.stage.appendChild(scene);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const cycle = (6 / Math.max(0.05, params.speed)).toFixed(2);
    css3d.setVars({
      '--ex-cycle': `${cycle}s`,
      '--ex-floor': (0.2 + params.intensity * 0.4).toFixed(2),
    });
    const key = rgb(c.primary) + rgb(c.bg) + rgb(c.fg);
    if (key !== lastKey) {
      lastKey = key;
      css3d.setVars({ '--ex-color': rgb(c.primary), '--ex-bg': rgb(c.bg), '--ex-rule': rgb(c.fg) });
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
      // Scale the field DOWN for small containers (gallery cards), capped at the
      // 16px baseline so a full-viewport section keeps the tuned look.
      css3d.stage.style.fontSize = `${Math.min(16, Math.max(3, Math.min(w, h) / 30))}px`;
    },
    dispose() {
      css3d.dispose();
    },
  };
}
