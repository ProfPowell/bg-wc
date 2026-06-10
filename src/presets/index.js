// =============================================================================
// PRESET CONTRACT
// =============================================================================
// A preset is a module with a single named export `create(ctx)` returning an
// instance. <bg-wc> calls it once per preset load (see bg-wc.js #loadPreset).
//
// ctx (provided by <bg-wc>):
//   host        — the <bg-wc> element.
//   canvas      — the <canvas> (webgl & canvas2d presets); null for css3d.
//   gl          — WebGLRenderingContext   (webgl presets only, else null).
//   c2d         — CanvasRenderingContext2D (canvas2d presets only, else null).
//   css3d       — CSS-3D stage helper      (css3d presets only, else null).
//   getColors() — theme palette as RGBA tuples in [0..1]: { primary, accent,
//                 info, success, warning, error, bg, fg }. Call it EVERY frame —
//                 the theme can change at runtime.
//   getParams() — snapshot of the live params (same shape passed to frame()).
//
// instance (returned by create):
//   resize(W, H)        — REQUIRED. W/H are DEVICE pixels (already × dpr); the
//                         drawing context is NOT pre-scaled, so size everything
//                         relative to W/H to stay resolution-independent.
//   frame(t, params)    — REQUIRED for motion. Draw one animated frame; called
//                         each rAF tick. `t` is elapsed seconds ALREADY scaled
//                         by params.speed — see TIME RULE.
//   staticFrame(params) — RECOMMENDED. Draw one still frame (prefers-reduced-
//                         motion and paused). Presets without it surface the
//                         reduced-motion fallback instead of a frozen image.
//   dispose()           — OPTIONAL. Release GPU programs / buffers / state.
//   setPlaying(on)      — css3d only: start/stop CSS animation.
//
// params (from attributes / CSS vars; read fresh each frame):
//   intensity  0..1  (default 0.5)  effect / palette strength
//   speed      0..5  (default 1)    motion rate — see TIME RULE
//   density    0..1  (default 0.5)  element count / scale
//   seed       int   (default 0)    deterministic layout seed
//   quality    'low' | 'med' | 'high'      (default 'med')
//   fit        'cover' | 'contain' | …      (default 'cover')
//   palette    string (default 'theme')
//   text       string  free text for text presets (lines split on '|')
//
// TIME RULE: `t` is already multiplied by params.speed before it reaches
// frame(). Drive motion from `t` (or a derived dt = t - lastT); do NOT multiply
// motion by params.speed again — that applies speed twice (speed²). See gl-wc-ant.
//
// Adding a preset = one REGISTRY entry below + one src/presets/<name>.js file.
// =============================================================================

// Preset registry. Names → { renderer, group, loader }.
//
// `group` categorizes presets for catalog UIs. It also lets a page show
// one group at a time so it never instantiates more simultaneous WebGL
// contexts than the browser allows (~16) — see /site gallery.

const REGISTRY = {
  // Smooth color fields
  ribbons: { renderer: 'canvas2d', group: 'gradient', loader: () => import('./ribbons.js') },
  flowlines: {
    renderer: 'canvas2d',
    group: 'gradient',
    loader: () => import('./flowlines.js'),
  },
  'mesh-gradient': {
    renderer: 'webgl',
    group: 'gradient',
    loader: () => import('./mesh-gradient.js'),
  },
  waves: { renderer: 'webgl', group: 'gradient', loader: () => import('./waves.js') },
  plasma: { renderer: 'webgl', group: 'gradient', loader: () => import('./plasma.js') },
  rainbow: { renderer: 'webgl', group: 'gradient', loader: () => import('./rainbow.js') },
  shine: { renderer: 'webgl', group: 'gradient', loader: () => import('./shine.js') },
  conic: { renderer: 'webgl', group: 'gradient', loader: () => import('./conic.js') },

  // Structured / geometric shapes
  mosaic: { renderer: 'canvas2d', group: 'geometric', loader: () => import('./mosaic.js') },
  supergraphics: {
    renderer: 'canvas2d',
    group: 'geometric',
    loader: () => import('./supergraphics.js'),
  },
  warp: { renderer: 'webgl', group: 'geometric', loader: () => import('./warp.js') },
  topology: { renderer: 'webgl', group: 'geometric', loader: () => import('./topology.js') },
  cells: { renderer: 'webgl', group: 'geometric', loader: () => import('./cells.js') },
  kaleidoscope: {
    renderer: 'webgl',
    group: 'geometric',
    loader: () => import('./kaleidoscope.js'),
  },
  doodles: { renderer: 'canvas2d', group: 'geometric', loader: () => import('./doodles.js') },
  scandi: { renderer: 'canvas2d', group: 'geometric', loader: () => import('./scandi.js') },
  truchet: { renderer: 'canvas2d', group: 'geometric', loader: () => import('./truchet.js') },

  // Overlay textures — grain, dot screens, dither
  dither: { renderer: 'webgl', group: 'texture', loader: () => import('./dither.js') },
  halftone: { renderer: 'webgl', group: 'texture', loader: () => import('./halftone.js') },
  grain: { renderer: 'webgl', group: 'texture', loader: () => import('./grain.js') },
  'paper-grain': { renderer: 'webgl', group: 'texture', loader: () => import('./paper-grain.js') },
  stipple: { renderer: 'canvas2d', group: 'texture', loader: () => import('./stipple.js') },

  // Organic ambient motion
  noise: { renderer: 'webgl', group: 'atmospheric', loader: () => import('./noise.js') },
  lava: { renderer: 'webgl', group: 'atmospheric', loader: () => import('./lava.js') },
  aurora: { renderer: 'webgl', group: 'atmospheric', loader: () => import('./aurora.js') },
  caustics: { renderer: 'webgl', group: 'atmospheric', loader: () => import('./caustics.js') },
  tunnel: { renderer: 'webgl', group: 'atmospheric', loader: () => import('./tunnel.js') },
  marble: { renderer: 'webgl', group: 'atmospheric', loader: () => import('./marble.js') },

  // Pop art / deco
  benday: { renderer: 'webgl', group: 'pop', loader: () => import('./benday.js') },
  comic: { renderer: 'webgl', group: 'pop', loader: () => import('./comic.js') },
  deco: { renderer: 'webgl', group: 'pop', loader: () => import('./deco.js') },
  atomic: { renderer: 'canvas2d', group: 'pop', loader: () => import('./atomic.js') },
  groove: { renderer: 'canvas2d', group: 'pop', loader: () => import('./groove.js') },

  // Ornamental geometry
  girih: { renderer: 'webgl', group: 'ornamental', loader: () => import('./girih.js') },
  mandala: { renderer: 'webgl', group: 'ornamental', loader: () => import('./mandala.js') },
  'op-art': { renderer: 'webgl', group: 'ornamental', loader: () => import('./op-art.js') },
  // Dot-art — Aboriginal / pointillist dotwork
  dotwork: { renderer: 'canvas2d', group: 'ornamental', loader: () => import('./dotwork.js') },
  tapestry: { renderer: 'canvas2d', group: 'ornamental', loader: () => import('./tapestry.js') },

  // Japanese — ink, pattern, season
  seigaiha: { renderer: 'canvas2d', group: 'japanese', loader: () => import('./seigaiha.js') },
  'sumi-e': { renderer: 'webgl', group: 'japanese', loader: () => import('./sumi-e.js') },
  kintsugi: { renderer: 'canvas2d', group: 'japanese', loader: () => import('./kintsugi.js') },
  'ukiyo-e': { renderer: 'canvas2d', group: 'japanese', loader: () => import('./ukiyo-e.js') },
  sakura: { renderer: 'canvas2d', group: 'japanese', loader: () => import('./sakura.js') },

  // Print art — riso overprint, pen plots, relief cuts
  risograph: { renderer: 'webgl', group: 'print', loader: () => import('./risograph.js') },
  plotter: { renderer: 'canvas2d', group: 'print', loader: () => import('./plotter.js') },
  linocut: { renderer: 'canvas2d', group: 'print', loader: () => import('./linocut.js') },

  // Classic — design-history styles (Bauhaus, Morris, damask, …)
  bauhaus: { renderer: 'canvas2d', group: 'classic', loader: () => import('./bauhaus.js') },

  // Science — biological / physical simulation aesthetics
  phyllotaxis: {
    renderer: 'canvas2d',
    group: 'science',
    loader: () => import('./phyllotaxis.js'),
  },
  'reaction-diffusion': {
    renderer: 'webgl',
    group: 'science',
    loader: () => import('./reaction-diffusion.js'),
  },

  // Tech — engineering / sci-fi instrument aesthetics
  circuit: { renderer: 'canvas2d', group: 'tech', loader: () => import('./circuit.js') },
  gyroid: { renderer: 'webgl', group: 'tech', loader: () => import('./gyroid.js') },

  // 80s / 90s — distortion, displays, demoscene
  system7: { renderer: 'canvas2d', group: 'retro', loader: () => import('./system7.js') },
  glitch: { renderer: 'webgl', group: 'retro', loader: () => import('./glitch.js') },
  vhs: { renderer: 'webgl', group: 'retro', loader: () => import('./vhs.js') },
  synthwave: { renderer: 'webgl', group: 'retro', loader: () => import('./synthwave.js') },
  crt: { renderer: 'webgl', group: 'retro', loader: () => import('./crt.js') },
  gameboy: { renderer: 'webgl', group: 'retro', loader: () => import('./gameboy.js') },
  copperbars: { renderer: 'webgl', group: 'retro', loader: () => import('./copperbars.js') },
  matrix: { renderer: 'canvas2d', group: 'retro', loader: () => import('./matrix.js') },
  bliss: { renderer: 'webgl', group: 'retro', loader: () => import('./bliss.js') },
  mystify: { renderer: 'canvas2d', group: 'retro', loader: () => import('./mystify.js') },

  // Arcade / Vectrex vector graphics
  asteroids: { renderer: 'canvas2d', group: 'vector', loader: () => import('./asteroids.js') },
  wireframe: { renderer: 'canvas2d', group: 'vector', loader: () => import('./wireframe.js') },
  spirograph: { renderer: 'canvas2d', group: 'vector', loader: () => import('./spirograph.js') },
  incoming: { renderer: 'canvas2d', group: 'vector', loader: () => import('./incoming.js') },
  trench: { renderer: 'webgl', group: 'vector', loader: () => import('./trench.js') },
  tempest: { renderer: 'webgl', group: 'vector', loader: () => import('./tempest.js') },
  fireworks: { renderer: 'canvas2d', group: 'vector', loader: () => import('./fireworks.js') },

  // Type as the background — set the string with the `text` attribute
  source: { renderer: 'canvas2d', group: 'text', loader: () => import('./source.js') },
  crawl: { renderer: 'canvas2d', group: 'text', loader: () => import('./crawl.js') },
  marquee: { renderer: 'canvas2d', group: 'text', loader: () => import('./marquee.js') },
  sinescroll: { renderer: 'canvas2d', group: 'text', loader: () => import('./sinescroll.js') },
  cascade: { renderer: 'canvas2d', group: 'text', loader: () => import('./cascade.js') },

  // Canvas2D particle systems
  stars: { renderer: 'canvas2d', group: 'particles', loader: () => import('./stars.js') },
  snow: { renderer: 'canvas2d', group: 'particles', loader: () => import('./snow.js') },
  confetti: { renderer: 'canvas2d', group: 'particles', loader: () => import('./confetti.js') },
  network: { renderer: 'canvas2d', group: 'particles', loader: () => import('./network.js') },
  particles: { renderer: 'canvas2d', group: 'particles', loader: () => import('./particles.js') },
  pulse: { renderer: 'canvas2d', group: 'particles', loader: () => import('./pulse.js') },
  tetris: { renderer: 'canvas2d', group: 'particles', loader: () => import('./tetris.js') },

  // Dimensional / CSS-3D scenes
  'fly-through': {
    renderer: 'css3d',
    group: 'dimensional',
    loader: () => import('./fly-through.js'),
  },
  explode: { renderer: 'css3d', group: 'dimensional', loader: () => import('./explode.js') },

  // Animated charts — busy data backgrounds
  trades: { renderer: 'canvas2d', group: 'dataviz', loader: () => import('./trades.js') },
  dashboard: { renderer: 'canvas2d', group: 'dataviz', loader: () => import('./dashboard.js') },
  vectormap: { renderer: 'canvas2d', group: 'dataviz', loader: () => import('./vectormap.js') },
  scatter: { renderer: 'canvas2d', group: 'dataviz', loader: () => import('./scatter.js') },
  waveform: { renderer: 'canvas2d', group: 'dataviz', loader: () => import('./waveform.js') },
  wordcloud: { renderer: 'canvas2d', group: 'dataviz', loader: () => import('./wordcloud.js') },
};

// Human-readable group labels, in display order.
const GROUP_LABELS = {
  gradient: 'Gradients',
  geometric: 'Geometric',
  texture: 'Texture',
  atmospheric: 'Atmospheric',
  retro: 'Retro',
  vector: 'Vector',
  text: 'Text',
  pop: 'Pop art',
  ornamental: 'Ornamental',
  japanese: 'Japanese',
  print: 'Print art',
  classic: 'Classic',
  science: 'Science',
  tech: 'Tech',
  dataviz: 'Dataviz',
  particles: 'Particles',
  dimensional: 'Dimensional / 3D',
};

export function listPresets() {
  return Object.entries(REGISTRY).map(([name, { renderer, group }]) => ({ name, renderer, group }));
}

// [{ id, label, presets: [{name, renderer, group}] }] in display order.
export function listGroups() {
  const all = listPresets();
  return Object.keys(GROUP_LABELS).map((id) => ({
    id,
    label: GROUP_LABELS[id],
    presets: all.filter((p) => p.group === id),
  }));
}

export function getPresetMeta(name) {
  return REGISTRY[name] || null;
}

export async function loadPreset(name) {
  const meta = REGISTRY[name];
  if (!meta) throw new Error(`Unknown preset: ${name}`);
  const mod = await meta.loader();
  if (typeof mod.create !== 'function') {
    throw new Error(`Preset "${name}" missing create() export`);
  }
  return { renderer: meta.renderer, create: mod.create };
}
