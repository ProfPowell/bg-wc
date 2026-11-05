// Tag names the manifest should describe.
const TAGS = ['bg-wc'];

// DOM-construction artifacts the analyzer picks up from the constructor (it sees
// `el.className = …`, `slot.name = …`, etc. on local vars) and reports as public
// members. They are not part of the element's API.
const NOISE_MEMBERS = new Set([
  'textContent',
  'className',
  'innerHTML',
  'slot',
  'name', // from a local `slot.name = 'fallback'`, not element API
  'part',
  'style',
  'dataset',
  'tagName',
]);

// The element dispatches events in the `bg-wc:` namespace (see #emit). The
// analyzer can't see these dynamic strings — it only guesses a bogus `t` — so
// declare them explicitly.
const BASE_EVENTS = [
  ['ready', 'Preset loaded and first frame rendered. detail: { preset, renderer }.'],
  ['error', 'Load / init / runtime failure. detail: { phase, error }.'],
  ['preset-changed', 'The `preset` attribute changed. detail: { from, to }.'],
  ['visibility', 'Element entered or left the viewport. detail: { visible }.'],
];
const EVENTS = BASE_EVENTS.map(([name, description]) => ({
  name: `bg-wc:${name}`,
  type: { text: 'CustomEvent' },
  description,
}));

const CSS_PARTS = [
  { name: 'canvas', description: 'The rendered background canvas (webgl / canvas2d presets).' },
  { name: 'stage', description: 'The DOM/CSS-3D stage element (css3d presets).' },
];

function forEachElement(manifest, fn) {
  for (const mod of manifest.modules || []) {
    for (const decl of mod.declarations || []) {
      if (TAGS.includes(decl.tagName)) fn(decl);
    }
  }
}

// Drop private (`_`/`#`) and DOM-noise members so the manifest documents only the
// real public surface.
function stripMembers() {
  return {
    name: 'strip-members',
    packageLinkPhase({ customElementsManifest }) {
      for (const mod of customElementsManifest.modules || []) {
        for (const decl of mod.declarations || []) {
          if (!decl.members) continue;
          decl.members = decl.members.filter(
            (m) => !m.name.startsWith('_') && !m.name.startsWith('#') && !NOISE_MEMBERS.has(m.name)
          );
        }
      }
    },
  };
}

// Declare the real public events (replacing the analyzer's bogus `t`) and the
// shadow parts on the element.
function declareApi() {
  return {
    name: 'declare-api',
    packageLinkPhase({ customElementsManifest }) {
      forEachElement(customElementsManifest, (decl) => {
        decl.events = EVENTS.map((e) => ({ ...e }));
        decl.cssParts = CSS_PARTS.map((p) => ({ ...p }));
      });
    },
  };
}

// The package ships dist/ only (package.json "files"); the analyzer reads src/.
// dist/ mirrors src/ file-for-file (vite preserveModules, preserveModulesRoot
// 'src'), so rewriting the path prefix yields paths that resolve in the
// installed tarball (gl-wc-fvam). scripts/pack-smoke.mjs verifies every path.
function isInternal(path) {
  return (
    path.startsWith('src/renderer/') ||
    path.startsWith('src/util/') ||
    /\/_[^/]*\.js$/.test(path) || // `_`-prefixed shared preset helpers
    path === 'src/presets/index.js' // the registry; listPresets is re-exported from bg-wc.js
  );
}

const toDist = (p) => (typeof p === 'string' && p.startsWith('src/') ? 'dist/' + p.slice(4) : p);

// Rewrite every `module` reference (declarations, exports, superclass, mixins…)
// anywhere in the manifest, not only module.path.
function rewriteModuleRefs(node) {
  if (Array.isArray(node)) {
    node.forEach(rewriteModuleRefs);
  } else if (node && typeof node === 'object') {
    if ('module' in node) node.module = toDist(node.module);
    for (const v of Object.values(node)) rewriteModuleRefs(v);
  }
}

function publishedPaths() {
  return {
    name: 'published-paths',
    packageLinkPhase({ customElementsManifest }) {
      const mods = customElementsManifest.modules || [];
      customElementsManifest.modules = mods.filter((m) => !isInternal(m.path));
      for (const m of customElementsManifest.modules) {
        m.path = toDist(m.path);
        rewriteModuleRefs(m);
      }
    },
  };
}

// Module order in the analyzer's output follows filesystem read order, which
// differs between OSes (macOS vs CI's Linux) — making `cem:check` flake. Sort
// modules by path so the manifest is byte-identical everywhere.
function sortModules() {
  return {
    name: 'sort-modules',
    packageLinkPhase({ customElementsManifest }) {
      customElementsManifest.modules?.sort((a, b) => a.path.localeCompare(b.path, 'en'));
    },
  };
}

export default {
  globs: ['src/**/*.js'],
  exclude: ['src/**/*.test.js'],
  outdir: '.',
  litelement: false,
  plugins: [stripMembers(), declareApi(), publishedPaths(), sortModules()],
};
