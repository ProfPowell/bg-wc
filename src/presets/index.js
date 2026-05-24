// Preset registry. Names → { renderer, group, loader }.
// Adding a preset is one entry here + one file.
//
// `group` categorizes presets for catalog UIs. It also lets a page show
// one group at a time so it never instantiates more simultaneous WebGL
// contexts than the browser allows (~16) — see /site gallery.

const REGISTRY = {
  // Smooth color fields
  'mesh-gradient': { renderer: 'webgl',    group: 'gradient',    loader: () => import('./mesh-gradient.js') },
  'waves':         { renderer: 'webgl',    group: 'gradient',    loader: () => import('./waves.js') },
  'plasma':        { renderer: 'webgl',    group: 'gradient',    loader: () => import('./plasma.js') },
  'rainbow':       { renderer: 'webgl',    group: 'gradient',    loader: () => import('./rainbow.js') },
  'shine':         { renderer: 'webgl',    group: 'gradient',    loader: () => import('./shine.js') },
  'conic':         { renderer: 'webgl',    group: 'gradient',    loader: () => import('./conic.js') },

  // Structured / geometric patterns
  'dither':        { renderer: 'webgl',    group: 'pattern',     loader: () => import('./dither.js') },
  'halftone':      { renderer: 'webgl',    group: 'pattern',     loader: () => import('./halftone.js') },
  'warp':          { renderer: 'webgl',    group: 'pattern',     loader: () => import('./warp.js') },
  'topology':      { renderer: 'webgl',    group: 'pattern',     loader: () => import('./topology.js') },
  'cells':         { renderer: 'webgl',    group: 'pattern',     loader: () => import('./cells.js') },
  'kaleidoscope':  { renderer: 'webgl',    group: 'pattern',     loader: () => import('./kaleidoscope.js') },
  'grain':         { renderer: 'webgl',    group: 'pattern',     loader: () => import('./grain.js') },

  // Organic ambient motion
  'noise':         { renderer: 'webgl',    group: 'atmospheric', loader: () => import('./noise.js') },
  'lava':          { renderer: 'webgl',    group: 'atmospheric', loader: () => import('./lava.js') },
  'aurora':        { renderer: 'webgl',    group: 'atmospheric', loader: () => import('./aurora.js') },
  'caustics':      { renderer: 'webgl',    group: 'atmospheric', loader: () => import('./caustics.js') },
  'tunnel':        { renderer: 'webgl',    group: 'atmospheric', loader: () => import('./tunnel.js') },

  // 80s / 90s — distortion, displays, demoscene
  'glitch':        { renderer: 'webgl',    group: 'retro',       loader: () => import('./glitch.js') },
  'vhs':           { renderer: 'webgl',    group: 'retro',       loader: () => import('./vhs.js') },
  'synthwave':     { renderer: 'webgl',    group: 'retro',       loader: () => import('./synthwave.js') },
  'crt':           { renderer: 'webgl',    group: 'retro',       loader: () => import('./crt.js') },
  'gameboy':       { renderer: 'webgl',    group: 'retro',       loader: () => import('./gameboy.js') },
  'copperbars':    { renderer: 'webgl',    group: 'retro',       loader: () => import('./copperbars.js') },
  'matrix':        { renderer: 'canvas2d', group: 'retro',       loader: () => import('./matrix.js') },

  // Arcade / Vectrex vector graphics
  'asteroids':     { renderer: 'canvas2d', group: 'vector',      loader: () => import('./asteroids.js') },
  'wireframe':     { renderer: 'canvas2d', group: 'vector',      loader: () => import('./wireframe.js') },
  'spirograph':    { renderer: 'canvas2d', group: 'vector',      loader: () => import('./spirograph.js') },
  'incoming':      { renderer: 'canvas2d', group: 'vector',      loader: () => import('./incoming.js') },
  'trench':        { renderer: 'webgl',    group: 'vector',      loader: () => import('./trench.js') },

  // Canvas2D particle systems
  'stars':         { renderer: 'canvas2d', group: 'particles',   loader: () => import('./stars.js') },
  'snow':          { renderer: 'canvas2d', group: 'particles',   loader: () => import('./snow.js') },
  'confetti':      { renderer: 'canvas2d', group: 'particles',   loader: () => import('./confetti.js') },
  'network':       { renderer: 'canvas2d', group: 'particles',   loader: () => import('./network.js') },
  'particles':     { renderer: 'canvas2d', group: 'particles',   loader: () => import('./particles.js') },
  'pulse':         { renderer: 'canvas2d', group: 'particles',   loader: () => import('./pulse.js') },
  'tetris':        { renderer: 'canvas2d', group: 'particles',   loader: () => import('./tetris.js') },
};

// Human-readable group labels, in display order.
const GROUP_LABELS = {
  gradient:    'Gradients',
  pattern:     'Patterns',
  atmospheric: 'Atmospheric',
  retro:       'Retro',
  vector:      'Vector',
  particles:   'Particles',
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
