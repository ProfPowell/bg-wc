import { defineConfig } from 'vite';
import { existsSync, readdirSync } from 'node:fs';

// Product-site + demos multi-page build. Bare imports (vanilla-breeze,
// @profpowell/code-block) resolve from node_modules — no CDN.
// List demo pages with readdirSync (works on every Node version) rather than
// fs.globSync, which only exists on Node 22+ and broke the CI build on Node 20.
const demoPages = existsSync('demos')
  ? readdirSync('demos')
      .filter((f) => f.endsWith('.html'))
      .map((f) => `demos/${f}`)
  : [];
const input = Object.fromEntries(
  ['index.html', 'docs/index.html', 'docs/api.html', ...demoPages].map((f) => [
    f.replace(/[/.]/g, '_'),
    f,
  ])
);

// vanilla-breeze lazily imports its optional Pagefind search bundle from the
// absolute runtime path /pagefind/pagefind.js. That bundle only exists when a
// Pagefind index has been generated and deployed; it is not present in this
// repo. Resolve the specifier to a harmless empty stub so both the dev server
// (vite:import-analysis) and the production build (Rollup) stop trying to load
// a file that doesn't exist. The import is inside a try/catch in
// vanilla-breeze, so an empty module simply disables in-page search.
const PAGEFIND_ID = '/pagefind/pagefind.js';
const pagefindStub = {
  name: 'gl-wc:pagefind-stub',
  resolveId(id) {
    if (id === PAGEFIND_ID) return '\0pagefind-stub';
    return null;
  },
  load(id) {
    if (id === '\0pagefind-stub') return 'export default {}; export const search = () => ({ results: [] });';
    return null;
  },
};

export default defineConfig({
  root: '.',
  base: './',
  plugins: [pagefindStub],
  build: {
    outDir: 'dist-site',
    emptyOutDir: true,
    rollupOptions: { input },
  },
  server: { open: '/docs/index.html' },
});
