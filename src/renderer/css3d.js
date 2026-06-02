// src/renderer/css3d.js
// css3d — DOM / CSS-3D renderer. Unlike webgl/canvas2d there is no drawing
// context: the "context" is a <div> stage mounted in the shadow root that a
// preset builds a `transform-style: preserve-3d` scene into. Motion lives in
// CSS @keyframes; JS only sets parameters and toggles play-state. See
// docs/superpowers/specs/2026-06-02-css3d-renderer-dimensional-presets-design.md
// (approach C).

export function createCSS3DContext() {
  const stage = document.createElement('div');
  stage.className = 'stage';
  stage.setAttribute('part', 'stage');
  stage.setAttribute('aria-hidden', 'true');
  stage.setAttribute('role', 'presentation');
  // Default to playing; the component flips this via setPlaying().
  stage.setAttribute('data-playing', '1');

  let styleEl = null;

  return {
    stage,

    // Inject (or replace) the preset's scoped stylesheet inside the stage.
    mountStyle(css) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        stage.appendChild(styleEl);
      }
      styleEl.textContent = css;
      return styleEl;
    },

    // Write CSS custom properties onto the stage, skipping unchanged values so
    // a per-frame reconcile does not thrash style recalc.
    setVars(map) {
      const s = stage.style;
      for (const k in map) {
        const v = String(map[k]);
        if (s.getPropertyValue(k) !== v) s.setProperty(k, v);
      }
    },

    // Start/stop CSS motion without tearing the scene down. Presets gate their
    // animations on `.stage[data-playing="0"]` (see the shared pause rule each
    // preset includes).
    setPlaying(playing) {
      stage.setAttribute('data-playing', playing ? '1' : '0');
    },

    dispose() {
      try {
        styleEl?.remove();
      } catch {}
      styleEl = null;
      stage.replaceChildren();
    },
  };
}
