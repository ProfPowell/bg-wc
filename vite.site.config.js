import { defineConfig } from 'vite';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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

// vanilla-breeze's <theme-picker> Theme dropdown lazy-loads brand themes from
// `${window.__VB_THEME_BASE}/themes/<name>.css` (set in each page's <head> to
// resolve to the site-root `vb/` dir). Serve vanilla-breeze's real theme CSS at
// `/vb/themes/*.css` — dev via middleware, build via emitted assets — so every
// theme the picker offers loads natively with no CDN dependency or 404.
const VB_THEMES_DIR = 'node_modules/vanilla-breeze/dist/cdn/themes';
const vbThemes = {
  name: 'gl-wc:vb-themes',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const m = req.url && req.url.match(/^\/vb\/themes\/([\w-]+\.css)(?:\?.*)?$/);
      if (!m) return next();
      try {
        res.setHeader('Content-Type', 'text/css');
        res.end(readFileSync(join(VB_THEMES_DIR, m[1])));
      } catch {
        next();
      }
    });
  },
  generateBundle() {
    if (!existsSync(VB_THEMES_DIR)) return;
    for (const f of readdirSync(VB_THEMES_DIR)) {
      if (f.endsWith('.css')) {
        this.emitFile({ type: 'asset', fileName: `vb/themes/${f}`, source: readFileSync(join(VB_THEMES_DIR, f)) });
      }
    }
  },
};

export default defineConfig({
  root: '.',
  base: './',
  plugins: [pagefindStub, vbThemes],
  build: {
    outDir: 'dist-site',
    emptyOutDir: true,
    rollupOptions: { input },
  },
  server: { open: '/docs/index.html' },
});
