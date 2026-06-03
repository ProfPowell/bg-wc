// Tag names the manifest should describe (canonical + deprecated alias).
const TAGS = ['bg-wc', 'gl-wc'];

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

// The element dispatches every event in both the canonical `bg-wc:` namespace and
// a legacy `gl-wc:` twin (see #emit). The analyzer can't see these dynamic
// strings — it only guesses a bogus `t` — so declare them explicitly.
const BASE_EVENTS = [
  ['ready', 'Preset loaded and first frame rendered. detail: { preset, renderer }.'],
  ['error', 'Load / init / runtime failure. detail: { phase, error }.'],
  ['preset-changed', 'The `preset` attribute changed. detail: { from, to }.'],
  ['visibility', 'Element entered or left the viewport. detail: { visible }.'],
];
const EVENTS = BASE_EVENTS.flatMap(([name, description]) => [
  { name: `bg-wc:${name}`, type: { text: 'CustomEvent' }, description },
  {
    name: `gl-wc:${name}`,
    type: { text: 'CustomEvent' },
    description: `Deprecated legacy twin of \`bg-wc:${name}\`.`,
  },
]);

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
// shadow parts, on both the canonical element and the alias.
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

export default {
  globs: ['src/**/*.js'],
  exclude: ['src/**/*.test.js'],
  outdir: '.',
  litelement: false,
  plugins: [stripMembers(), declareApi()],
};
