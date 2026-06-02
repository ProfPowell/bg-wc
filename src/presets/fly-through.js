// src/presets/fly-through.js
// fly-through — skeleton; the scene is built out in a later task. For now it
// just mounts an empty stage so the css3d pipeline is exercisable.

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

export function create({ css3d }) {
  css3d.mountStyle(`
    .stage { perspective: var(--perspective, 600px); overflow: hidden; }
    .stage .scene { position: absolute; inset: 0; transform-style: preserve-3d; }
    ${PAUSE_RULE}
  `);
  const scene = document.createElement('div');
  scene.className = 'scene';
  css3d.stage.appendChild(scene);

  return {
    setPlaying(p) {
      css3d.setPlaying(p);
    },
    frame() {},
    dispose() {
      css3d.dispose();
    },
  };
}
