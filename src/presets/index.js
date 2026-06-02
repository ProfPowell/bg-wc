// Preset registry. Names → { renderer, group, loader }.
// Adding a preset is one entry here + one file.
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

  // Structured / geometric patterns
  mosaic: { renderer: 'canvas2d', group: 'pattern', loader: () => import('./mosaic.js') },
  supergraphics: {
    renderer: 'canvas2d',
    group: 'pattern',
    loader: () => import('./supergraphics.js'),
  },
  dither: { renderer: 'webgl', group: 'pattern', loader: () => import('./dither.js') },
  halftone: { renderer: 'webgl', group: 'pattern', loader: () => import('./halftone.js') },
  warp: { renderer: 'webgl', group: 'pattern', loader: () => import('./warp.js') },
  topology: { renderer: 'webgl', group: 'pattern', loader: () => import('./topology.js') },
  cells: { renderer: 'webgl', group: 'pattern', loader: () => import('./cells.js') },
  kaleidoscope: { renderer: 'webgl', group: 'pattern', loader: () => import('./kaleidoscope.js') },
  grain: { renderer: 'webgl', group: 'pattern', loader: () => import('./grain.js') },
  'paper-grain': { renderer: 'webgl', group: 'pattern', loader: () => import('./paper-grain.js') },
  doodles: { renderer: 'canvas2d', group: 'pattern', loader: () => import('./doodles.js') },

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

  // Ornamental geometry
  girih: { renderer: 'webgl', group: 'ornamental', loader: () => import('./girih.js') },
  mandala: { renderer: 'webgl', group: 'ornamental', loader: () => import('./mandala.js') },

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
  'fly-through': { renderer: 'css3d', group: 'dimensional', loader: () => import('./fly-through.js') },
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
  pattern: 'Patterns',
  atmospheric: 'Atmospheric',
  retro: 'Retro',
  vector: 'Vector',
  text: 'Text',
  pop: 'Pop art',
  ornamental: 'Ornamental',
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
