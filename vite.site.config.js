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
  name: 'bg-wc:pagefind-stub',
  resolveId(id) {
    if (id === PAGEFIND_ID) return '\0pagefind-stub';
    return null;
  },
  load(id) {
    if (id === '\0pagefind-stub') return 'export default {}; export const search = () => ({ results: [] });';
    return null;
  },
};

// vanilla-breeze locates two kinds of assets relative to its own (bundled-away)
// script and otherwise falls back to absolute `/cdn/...`, which 404s under the
// `/bg-wc/` Pages path. We pin both to a site-root `vb/` dir (the page <head>
// sets window.__VB_THEME_BASE + documentElement.dataset.iconPath there) and
// serve the real files from node_modules — dev via middleware, build via
// emitted assets — so there's no CDN dependency and no 404:
//   • <theme-picker> Theme dropdown → `${base}/themes/<name>.css` (all 53)
//   • <icon-wc> (incl. theme-picker's mode icons) → `${base}/icons/lucide/<name>.svg`
const VB_DIR = 'node_modules/vanilla-breeze/dist/cdn';
// The lucide pack is 1900+ files (~7.5MB); emit only the icons the UI uses.
const VB_BUILD_ICONS = [
  'palette', 'sun', 'moon', 'monitor', 'contrast', 'sliders',
  'type', 'check', 'chevron-down', 'chevron-up', 'x', 'circle',
];
const vbAssets = {
  name: 'bg-wc:vb-assets',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const t = req.url && req.url.match(/^\/vb\/themes\/([\w-]+\.css)(?:\?.*)?$/);
      const i = req.url && req.url.match(/^\/vb\/icons\/([\w-]+)\/([\w-]+\.svg)(?:\?.*)?$/);
      try {
        if (t) {
          res.setHeader('Content-Type', 'text/css');
          return res.end(readFileSync(join(VB_DIR, 'themes', t[1])));
        }
        if (i) {
          res.setHeader('Content-Type', 'image/svg+xml');
          return res.end(readFileSync(join(VB_DIR, 'icons', i[1], i[2])));
        }
      } catch {
        /* fall through to 404 */
      }
      next();
    });
  },
  generateBundle() {
    const themes = join(VB_DIR, 'themes');
    if (existsSync(themes)) {
      for (const f of readdirSync(themes)) {
        if (f.endsWith('.css')) {
          this.emitFile({ type: 'asset', fileName: `vb/themes/${f}`, source: readFileSync(join(themes, f)) });
        }
      }
    }
    const lucide = join(VB_DIR, 'icons', 'lucide');
    if (existsSync(lucide)) {
      for (const name of VB_BUILD_ICONS) {
        const file = join(lucide, `${name}.svg`);
        if (existsSync(file)) {
          this.emitFile({ type: 'asset', fileName: `vb/icons/lucide/${name}.svg`, source: readFileSync(file) });
        }
      }
    }
  },
};

export default defineConfig({
  root: '.',
  base: './',
  plugins: [pagefindStub, vbAssets],
  build: {
    outDir: 'dist-site',
    emptyOutDir: true,
    rollupOptions: { input },
  },
  server: { open: '/docs/index.html' },
});
