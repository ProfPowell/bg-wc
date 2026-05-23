// Preset registry. Names → dynamic loaders. Adding a preset is one entry here + one file.

const REGISTRY = {
  'dither':        { renderer: 'webgl',    loader: () => import('./dither.js') },
  'noise':         { renderer: 'webgl',    loader: () => import('./noise.js') },
  'mesh-gradient': { renderer: 'webgl',    loader: () => import('./mesh-gradient.js') },
  'warp':          { renderer: 'webgl',    loader: () => import('./warp.js') },
  'waves':         { renderer: 'webgl',    loader: () => import('./waves.js') },
  'lava':          { renderer: 'webgl',    loader: () => import('./lava.js') },
  'stars':         { renderer: 'canvas2d', loader: () => import('./stars.js') },
  'snow':          { renderer: 'canvas2d', loader: () => import('./snow.js') },
  'confetti':      { renderer: 'canvas2d', loader: () => import('./confetti.js') },
  'network':       { renderer: 'canvas2d', loader: () => import('./network.js') },
  'particles':     { renderer: 'canvas2d', loader: () => import('./particles.js') },
  'pulse':         { renderer: 'canvas2d', loader: () => import('./pulse.js') },
  'tetris':        { renderer: 'canvas2d', loader: () => import('./tetris.js') },
};

export function listPresets() {
  return Object.entries(REGISTRY).map(([name, { renderer }]) => ({ name, renderer }));
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
