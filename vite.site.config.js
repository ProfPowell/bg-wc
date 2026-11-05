import { defineConfig, createLogger } from 'vite';

// vanilla-breeze's CSS ships a sourceMappingURL comment but no .map file, so
// vite logs a noisy "Failed to load source map for vanilla-breeze.css" on every
// dev start (and during `npm test`). Drop just that message; pass everything
// else through.
const quietLogger = createLogger();
const baseWarn = quietLogger.warn.bind(quietLogger);
const baseError = quietLogger.error.bind(quietLogger);
const isVbSourcemapNoise = (msg) =>
  typeof msg === 'string' &&
  msg.includes('source map') &&
  (msg.includes('vanilla-breeze') || msg.includes('.css.map'));
quietLogger.warn = (msg, opts) => (isVbSourcemapNoise(msg) ? undefined : baseWarn(msg, opts));
quietLogger.error = (msg, opts) => (isVbSourcemapNoise(msg) ? undefined : baseError(msg, opts));
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
// Only these pages are built into dist-site/ (the deployed Pages site). This is
// an explicit allow-list — there is no publicDir — so internal-only trees like
// docs/superpowers/ (specs, plans, reference pens) and docs/border-idea/ stay in
// the repo but never ship to the public site. Keep it that way.
// Exported so test/built-site.spec.js walks exactly the pages that ship.
export const sitePages = () => ['index.html', 'docs/index.html', 'docs/api.html', ...demoPages];
const input = Object.fromEntries(sitePages().map((f) => [f.replace(/[/.]/g, '_'), f]));

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
// This list covers icons vanilla-breeze's OWN JS renders (theme-picker's mode /
// contrast / density controls) — they are invisible to the markup scan below.
// Icons the site's HTML references (<icon-wc name="…">) are discovered from the
// built pages themselves, so adding one to a page can't silently 404 in
// production the way the GitHub footer icon once did (gl-wc-kkgm).
const VB_BUILD_ICONS = [
  'palette', 'sun', 'moon', 'monitor', 'contrast', 'sliders',
  'type', 'check', 'chevron-down', 'chevron-up', 'x', 'circle',
];
// Every <icon-wc name="…"> in the shipped pages, keyed by icon → first page.
function iconsInMarkup(pages) {
  const found = new Map();
  for (const page of pages) {
    const html = readFileSync(page, 'utf8');
    for (const m of html.matchAll(/<icon-wc\b[^>]*\bname="([\w-]+)"/g)) {
      if (!found.has(m[1])) found.set(m[1], page);
    }
  }
  return found;
}
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
    // A required asset that cannot be emitted FAILS the build (this.error) —
    // dev middleware serves the whole pack from node_modules, so a silent skip
    // here would only surface as a 404 on GitHub Pages.
    const themes = join(VB_DIR, 'themes');
    if (!existsSync(themes)) this.error(`bg-wc:vb-assets: ${themes} missing — is vanilla-breeze installed?`);
    for (const f of readdirSync(themes)) {
      if (f.endsWith('.css')) {
        this.emitFile({ type: 'asset', fileName: `vb/themes/${f}`, source: readFileSync(join(themes, f)) });
      }
    }
    const lucide = join(VB_DIR, 'icons', 'lucide');
    const required = new Map(VB_BUILD_ICONS.map((n) => [n, 'VB_BUILD_ICONS (vite.site.config.js)']));
    for (const [name, page] of iconsInMarkup(sitePages())) {
      if (!required.has(name)) required.set(name, page);
    }
    for (const [name, where] of required) {
      const file = join(lucide, `${name}.svg`);
      if (!existsSync(file)) {
        this.error(
          `bg-wc:vb-assets: icon "${name}" (referenced by ${where}) has no ${file} — ` +
            'the built site would 404 on it'
        );
      }
      this.emitFile({ type: 'asset', fileName: `vb/icons/lucide/${name}.svg`, source: readFileSync(file) });
    }
  },
};

export default defineConfig({
  root: '.',
  base: './',
  // Multi-page site: no SPA fallback, so a missing file is a real 404 in both
  // `vite` (dev) and `vite preview` (dist-site) instead of a 200 serving
  // index.html — test/built-site.spec.js relies on that to catch missing assets.
  appType: 'mpa',
  customLogger: quietLogger,
  plugins: [pagefindStub, vbAssets],
  build: {
    outDir: 'dist-site',
    emptyOutDir: true,
    rollupOptions: { input },
  },
  server: { open: '/docs/index.html' },
});
