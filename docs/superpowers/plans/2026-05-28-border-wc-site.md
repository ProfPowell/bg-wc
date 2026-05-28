# border-wc Test Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the border-wc test site (gallery playground + API docs + 3-tile demos hub) inside `~/src/border-wc`, mirroring the bg-wc docs site so the family reads as one ecosystem.

**Architecture:** Three pages on a shared shell (`docs/site.css`, vanilla-breeze, theme picker, `prefer-dark`). The gallery is an interactive playground (knobs + live `<border-wc>` + copyable snippet). The API docs page mirrors bg-wc's plain `api.html`. The demos hub is a grid of browser-window tiles with the full overlay UX (lazy IO mount/unmount, scroll-lock, force-reload-on-click, `target="_top"` back-links). All bg-wc infrastructure is **ported (not linked)** so border-wc stays self-contained.

**Tech Stack:** Static HTML/CSS, vanilla JS ESM, Vite multi-page site build, `vanilla-breeze`, `@profpowell/code-block`, `@profpowell/browser-window`, Playwright (already installed) for headless verification.

**Target:** `/Users/tpowell/src/border-wc` on a feature branch `feat/site-v1`. Spec: `~/src/gl-wc/docs/superpowers/specs/2026-05-28-border-wc-site-design.md`. The library build (`vite.config.js`) and npm package contents are **not changed** — this is site work only.

**Reference files in `~/src/gl-wc` to port from:**
- `docs/site.css` — port + strip the bg-wc-specific gallery-card rules; keep the site header, `.page-head`, `main.content`, `.bw-card`/`.bw-open` overlay rules.
- `docs/prefer-dark.js` — verbatim.
- `demos/demos-hub.js` — port pattern (rewrite imports for border-wc).
- `index.html` — root redirect, retitled.
- `docs/api.html` — structural reference for the API page.
- `vite.site.config.js` — adapt entry list to border-wc.

---

### Task 1: Site scaffolding (deps, scripts, vite config, root redirect)

**Files:**
- Modify: `package.json`
- Create: `vite.site.config.js`
- Create: `index.html`

- [ ] **Step 1: Add site devDependencies and scripts.**

Edit `package.json`. Add to `devDependencies` (alphabetical, alongside existing):
```json
    "@profpowell/browser-window": "^1.4.7",
    "@profpowell/code-block": "^2.9.0",
    "vanilla-breeze": "^0.1.3",
```
Add to `scripts` (keep existing `dev`/`build`/`test`/etc.; add these alongside):
```json
    "site:dev": "vite --config vite.site.config.js",
    "site:build": "vite build --config vite.site.config.js",
    "site:preview": "vite preview --config vite.site.config.js"
```
(`dev`/`build` continue to mean the library dev/build, matching the existing convention.)

- [ ] **Step 2: Install the new deps**

```bash
cd /Users/tpowell/src/border-wc
npm install
```
Expected: installs `vanilla-breeze`, `@profpowell/code-block`, `@profpowell/browser-window` (browser-window may already be present — fine).

- [ ] **Step 3: Create `vite.site.config.js`**

```js
import { defineConfig } from 'vite';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Product-site + themed-demos multi-page build. Mirrors bg-wc's vite.site.config.js
// pattern (root index redirect + docs/* + demos/*). Bare imports (vanilla-breeze,
// @profpowell/code-block, @profpowell/browser-window) resolve from node_modules.

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

// vanilla-breeze lazily imports its optional Pagefind search bundle from an
// absolute path that doesn't exist here. Stub it so dev + build don't 404.
const PAGEFIND_ID = '/pagefind/pagefind.js';
const pagefindStub = {
  name: 'border-wc:pagefind-stub',
  resolveId(id) {
    if (id === PAGEFIND_ID) return '\0pagefind-stub';
    return null;
  },
  load(id) {
    if (id === '\0pagefind-stub') return 'export default {}; export const search = () => ({ results: [] });';
    return null;
  },
};

// vanilla-breeze fetches its theme CSS and lucide icon SVGs from `/vb/...` at
// runtime. Serve them from node_modules in dev and emit them as assets at build.
const VB_DIR = 'node_modules/vanilla-breeze/dist/cdn';
const VB_BUILD_ICONS = [
  'palette', 'sun', 'moon', 'monitor', 'contrast', 'sliders',
  'type', 'check', 'chevron-down', 'chevron-up', 'x', 'circle',
];
const vbAssets = {
  name: 'border-wc:vb-assets',
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
```

- [ ] **Step 3.5: Verify the existing library build still uses the correct outDir**

Run: `cat vite.config.js | grep -A1 outDir`
Expected: `outDir: 'dist'` (the LIBRARY build emits to `dist/`; the site build emits to `dist-site/`). These must be separate so they don't clobber each other.

- [ ] **Step 4: Create root `/index.html` (redirect)**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>border-wc</title>
  <meta http-equiv="refresh" content="0; url=./docs/index.html">
</head>
<body>
  <p><a href="./docs/">Open the border-wc docs &rarr;</a></p>
</body>
</html>
```

- [ ] **Step 5: Smoke-build the site (it has only the redirect so far)**

Run: `npm run site:build 2>&1 | tail -5`
Expected: build succeeds; emits at least `dist-site/index.html`. (Subsequent tasks add the other pages.)

- [ ] **Step 6: Commit**

```bash
git checkout -b feat/site-v1
git add package.json package-lock.json vite.site.config.js index.html
git commit -m "site: scaffolding (deps, vite multi-page config, root redirect)"
```

---

### Task 2: Shared shell — `site.css`, `prefer-dark.js`, `docs-entry.js`

**Files:**
- Create: `docs/site.css`
- Create: `docs/prefer-dark.js`
- Create: `docs/docs-entry.js`

- [ ] **Step 1: Port `prefer-dark.js` verbatim**

Copy `/Users/tpowell/src/gl-wc/docs/prefer-dark.js` to `/Users/tpowell/src/border-wc/docs/prefer-dark.js`:
```bash
cp /Users/tpowell/src/gl-wc/docs/prefer-dark.js docs/prefer-dark.js
```
No edits needed.

- [ ] **Step 2: Port `site.css` adapted to border-wc**

Copy `/Users/tpowell/src/gl-wc/docs/site.css` to `/Users/tpowell/src/border-wc/docs/site.css`, then edit:
- **Strip** any `bg-wc` element selectors (e.g., `bg-wc { … }` for sizing, `#heroBg { … }` etc., the `.hero` rules from the gallery's hero, the `.demo[data-theme=…]` blocks if any — none should remain in our current version of bg-wc's site.css since the hero was removed for api.html but bg-wc's gallery `.hero` still has rules; strip those `.hero` blocks).
- **Keep**: site `header.site`, base resets (`html, body`, `*`), typography, `.page-head`, `main.content` and its `h1`/`h2`/`h3`, `.muted`, the `.bw-card` / `.bw-open` / `.demos` grid rules, `.featured*` if any (drop if present — border-wc has no featured row), `section[id] { scroll-margin-top: 80px; }`, `code, pre { font-family … }`, `a { color … }`, footer rules.
- **Add** a small border-wc-specific block at the bottom for the **gallery playground**:
  ```css
  /* Gallery playground: 3 effect cards with knobs */
  .playground {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 28px;
    margin: 0 0 48px;
  }
  .effect-card {
    background: color-mix(in oklab, var(--color-foreground) 6%, var(--color-background));
    border: 1px solid var(--color-border);
    border-radius: var(--radius-l, 16px);
    padding: 24px;
    display: flex; flex-direction: column; gap: 16px;
  }
  .effect-card h3 {
    margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em;
    font-family: ui-monospace, "SF Mono", Menlo, monospace; opacity: 0.7;
  }
  .effect-card .sample {
    min-height: 140px;
    padding: 20px;
    border-radius: var(--radius-m, 12px);
    background: var(--color-background);
    display: flex; align-items: center; justify-content: center;
    font-family: ui-monospace, monospace;
    color: var(--color-text, var(--color-foreground));
  }
  .effect-card .knobs {
    display: grid; grid-template-columns: auto 1fr; gap: 8px 14px; align-items: center;
    font-size: 13px;
  }
  .effect-card .knobs label { opacity: 0.7; font-family: ui-monospace, monospace; }
  .effect-card .knobs input[type="range"],
  .effect-card .knobs input[type="color"] { width: 100%; }
  .effect-card code-block { display: block; font-size: 12px; }
  ```

After editing, **smoke-check** by grepping for stray bg-wc references:
```bash
grep -nE "bg-wc|#heroBg|\.hero|data-theme=" docs/site.css | head
```
The output should be empty (or only show comments you intentionally kept).

- [ ] **Step 3: Create `docs/docs-entry.js`**

```js
// Docs + gallery entry. Loads the site infrastructure (vanilla-breeze theme
// system, theme-picker), the border-wc element so any <border-wc> on the page
// upgrades, code-block for snippet display, and the prefer-dark nudge.
// The playground (gallery only) wires its own knobs via playground.js.
import 'vanilla-breeze';
import 'vanilla-breeze/css';
import '@profpowell/code-block';
import '../src/border-wc.js';
import './prefer-dark.js';
```

- [ ] **Step 4: Commit**

```bash
git add docs/site.css docs/prefer-dark.js docs/docs-entry.js
git commit -m "site: shared shell (site.css, prefer-dark, docs-entry)"
```

---

### Task 3: API docs page — `docs/api.html`

**Files:**
- Create: `docs/api.html`

- [ ] **Step 1: Write `docs/api.html`** (full page, mirroring bg-wc's `docs/api.html` structure)

```html
<!doctype html>
<html lang="en" data-mode="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>border-wc — docs</title>
  <meta name="description" content="API reference for the border-wc web component: the <border-wc> element, attributes, properties, methods, events, custom properties, and the data-border-effect binder.">
  <script>
    (() => {
      const vb = new URL('../vb', document.baseURI).href.replace(/\/$/, '');
      window.__VB_THEME_BASE = vb;
      document.documentElement.dataset.iconPath = vb + '/icons';
    })();
  </script>
  <link rel="stylesheet" href="./site.css">
</head>
<body>
  <header class="site" data-sticky data-layout="cluster" data-layout-justify="between" data-layout-gap="m">
    <a href="./index.html" class="brand"><strong>&lt;border-wc&gt;</strong></a>
    <nav class="horizontal pills" aria-label="Site">
      <ul>
        <li><a href="./index.html">Gallery</a></li>
        <li><a href="./api.html" aria-current="page">Docs</a></li>
        <li><a href="../demos/">Demos</a></li>
        <li><a href="https://github.com/ProfPowell/border-wc" target="_blank" rel="noopener">GitHub</a></li>
      </ul>
    </nav>
    <theme-picker compact>
      <button type="button" data-trigger class="ghost">
        <icon-wc name="palette" size="sm"></icon-wc>
        Theme
      </button>
    </theme-picker>
  </header>

  <main class="content">

    <header class="page-head">
      <h1>API Reference</h1>
      <p class="muted">Complete documentation for the <code>&lt;border-wc&gt;</code> web component and the <code>data-border-effect</code> attribute binder.</p>
    </header>

    <section id="install">
      <h2>Install</h2>
      <code-block theme="dark" language="bash">npm install @profpowell/border-wc</code-block>
      <p class="muted">Import the element. It self-registers as <code>&lt;border-wc&gt;</code> on import:</p>
      <code-block theme="dark" language="javascript">import '@profpowell/border-wc';</code-block>
      <p class="muted">Or via a CDN:</p>
      <code-block theme="dark" language="html">&lt;script type="module" src="https://unpkg.com/@profpowell/border-wc"&gt;&lt;/script&gt;</code-block>
    </section>

    <section id="element">
      <h2>Element &mdash; <code>&lt;border-wc&gt;</code></h2>
      <p>Wraps an element with an extreme border effect. The component reads design tokens and updates live as attributes change.</p>
      <code-block theme="dark" language="html">&lt;border-wc effect="squiggle" color="var(--ink)" animate&gt;
  &lt;blockquote&gt;The shape around the thing is the thing.&lt;/blockquote&gt;
&lt;/border-wc&gt;</code-block>

      <h3>Attributes</h3>
      <table>
        <thead><tr><th>Attribute</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>effect</code></td><td>One of <code>squiggle</code>, <code>draw</code>, <code>sparks</code>.</td></tr>
          <tr><td><code>color</code></td><td>Stroke / particle color (any CSS color; defaults to <code>currentColor</code>).</td></tr>
          <tr><td><code>thickness</code></td><td>Stroke width in px (default 2).</td></tr>
          <tr><td><code>speed</code></td><td>Animation duration in ms (default 1000).</td></tr>
          <tr><td><code>radius</code></td><td>Corner radius in px. Falls back to the host's computed <code>border-radius</code>.</td></tr>
          <tr><td><code>animate</code></td><td>Boolean. When present, plays the entrance / loop animation.</td></tr>
          <tr><td><code>mode</code></td><td>Effect-specific placement mode (e.g. <code>center</code>).</td></tr>
          <tr><td><code>motion</code></td><td><code>auto</code> | <code>reduce</code> | <code>force</code> &mdash; overrides <code>prefers-reduced-motion</code>.</td></tr>
        </tbody>
      </table>

      <h3>CSS custom properties</h3>
      <p>Every attribute can also be set via a matching <code>--border-wc-*</code> custom property, which takes precedence over the attribute. Use these to theme the effect from the cascade:</p>
      <code-block theme="dark" language="css">.fancy { --border-wc-color: oklch(0.7 0.18 250); --border-wc-thickness: 3px; }</code-block>

      <h3>Events</h3>
      <ul>
        <li><code>border-wc:effect-applied</code> &mdash; fired once after a successful apply. <code>detail.effect</code> is the effect name.</li>
        <li><code>border-wc:error</code> &mdash; fired if an effect throws. <code>detail.error</code> is the error.</li>
        <li><code>border-wc:draw-complete</code> &mdash; fired by the <code>draw</code> effect when the stroke animation finishes.</li>
      </ul>
    </section>

    <section id="data-border-effect">
      <h2>Attribute binder &mdash; <code>data-border-effect</code></h2>
      <p>border-wc shares the <code>data-border-effect</code> attribute with vanilla-breeze's base tier. Base values (<code>spin</code>, <code>pulse</code>, <code>march</code>, <code>hue-cycle</code>, <code>breathe</code>, <code>corner-trace</code>) are owned by vanilla-breeze's CSS &mdash; border-wc ignores them. Extreme values (<code>squiggle</code>, <code>draw</code>, <code>sparks</code>) are handled here.</p>
      <p>To opt in to extreme effects without writing a <code>&lt;border-wc&gt;</code> wrapper, import the binder once:</p>
      <code-block theme="dark" language="javascript">import '@profpowell/border-wc/attr';</code-block>
      <p>Then annotate any element:</p>
      <code-block theme="dark" language="html">&lt;article data-border-effect="squiggle"&gt;&hellip;&lt;/article&gt;</code-block>
      <p>Params come from <code>--border-wc-*</code> CSS custom properties (the same set as on the element). The binder auto-scans on import and watches the DOM for added / changed / removed nodes.</p>
    </section>

    <section id="vanilla-breeze">
      <h2>Used with vanilla-breeze</h2>
      <p>border-wc is the extreme-tier sibling of vanilla-breeze's base border tier &mdash; together they form the &ldquo;Decorated Layers&rdquo; border surface. Pair this package with vanilla-breeze for CSS-only base effects (<code>spin</code>, <code>pulse</code>, &hellip;) and reach for <code>&lt;border-wc&gt;</code> / the binder when you need SVG / canvas-driven effects. Both honor <code>data-border-effect</code>, so authors write one attribute.</p>
    </section>

  </main>

  <footer>
    <p>MIT &middot; <a href="https://github.com/ProfPowell/border-wc">ProfPowell/border-wc</a></p>
  </footer>
  <script type="module" src="./docs-entry.js"></script>
</body>
</html>
```

- [ ] **Step 2: Build + commit**

Run: `npm run site:build 2>&1 | tail -3`
Expected: build succeeds; emits `dist-site/docs/api.html`.

```bash
git add docs/api.html
git commit -m "site: API reference page (matches bg-wc layout)"
```

---

### Task 4: Gallery playground — `docs/index.html` + `docs/playground.js`

**Files:**
- Create: `docs/index.html`
- Create: `docs/playground.js`

- [ ] **Step 1: Create `docs/index.html`**

```html
<!doctype html>
<html lang="en" data-mode="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>border-wc &mdash; gallery</title>
  <meta name="description" content="Try border-wc's three extreme border effects live: squiggle, draw, sparks. Live knobs, copyable snippet.">
  <script>
    (() => {
      const vb = new URL('../vb', document.baseURI).href.replace(/\/$/, '');
      window.__VB_THEME_BASE = vb;
      document.documentElement.dataset.iconPath = vb + '/icons';
    })();
  </script>
  <link rel="stylesheet" href="./site.css">
</head>
<body>
  <header class="site" data-sticky data-layout="cluster" data-layout-justify="between" data-layout-gap="m">
    <a href="./index.html" class="brand"><strong>&lt;border-wc&gt;</strong></a>
    <nav class="horizontal pills" aria-label="Site">
      <ul>
        <li><a href="./index.html" aria-current="page">Gallery</a></li>
        <li><a href="./api.html">Docs</a></li>
        <li><a href="../demos/">Demos</a></li>
        <li><a href="https://github.com/ProfPowell/border-wc" target="_blank" rel="noopener">GitHub</a></li>
      </ul>
    </nav>
    <theme-picker compact>
      <button type="button" data-trigger class="ghost">
        <icon-wc name="palette" size="sm"></icon-wc>
        Theme
      </button>
    </theme-picker>
  </header>

  <main class="content">
    <header class="page-head">
      <h1>border-wc</h1>
      <p class="muted">Extreme border effects the platform under-serves. Three effects today &mdash; tweak the knobs to see them live and copy the snippet.</p>
    </header>

    <section class="playground">

      <article class="effect-card" data-effect="squiggle">
        <h3>squiggle</h3>
        <border-wc effect="squiggle" animate>
          <div class="sample">Hand-drawn vibe</div>
        </border-wc>
        <div class="knobs">
          <label for="sq-color">color</label>     <input id="sq-color" type="color" value="#ec4899">
          <label for="sq-thick">thickness</label> <input id="sq-thick" type="range" min="1" max="6" step="0.5" value="2">
          <label for="sq-speed">speed</label>     <input id="sq-speed" type="range" min="200" max="3000" step="100" value="1000">
          <label for="sq-radius">radius</label>   <input id="sq-radius" type="range" min="0" max="40" step="2" value="12">
        </div>
        <code-block language="html" theme="dark"></code-block>
      </article>

      <article class="effect-card" data-effect="draw">
        <h3>draw</h3>
        <border-wc effect="draw" animate>
          <div class="sample">Stroke-on reveal</div>
        </border-wc>
        <div class="knobs">
          <label for="dr-color">color</label>     <input id="dr-color" type="color" value="#3b82f6">
          <label for="dr-thick">thickness</label> <input id="dr-thick" type="range" min="1" max="6" step="0.5" value="2">
          <label for="dr-speed">speed</label>     <input id="dr-speed" type="range" min="200" max="3000" step="100" value="1200">
          <label for="dr-radius">radius</label>   <input id="dr-radius" type="range" min="0" max="40" step="2" value="12">
        </div>
        <code-block language="html" theme="dark"></code-block>
      </article>

      <article class="effect-card" data-effect="sparks">
        <h3>sparks</h3>
        <border-wc effect="sparks" animate>
          <div class="sample">Live indicator</div>
        </border-wc>
        <div class="knobs">
          <label for="sp-color">color</label>     <input id="sp-color" type="color" value="#10b981">
          <label for="sp-thick">thickness</label> <input id="sp-thick" type="range" min="1" max="6" step="0.5" value="2">
          <label for="sp-speed">speed</label>     <input id="sp-speed" type="range" min="200" max="3000" step="100" value="1000">
          <label for="sp-radius">radius</label>   <input id="sp-radius" type="range" min="0" max="40" step="2" value="12">
        </div>
        <code-block language="html" theme="dark"></code-block>
      </article>

    </section>
  </main>

  <footer>
    <p>MIT &middot; <a href="https://github.com/ProfPowell/border-wc">ProfPowell/border-wc</a></p>
  </footer>
  <script type="module" src="./docs-entry.js"></script>
  <script type="module" src="./playground.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `docs/playground.js`** (live knobs + snippet)

```js
// Wires the gallery playground: each .effect-card has knobs that update its
// inner <border-wc> attributes/CSS vars live, and a code-block that shows the
// current HTML snippet. Knob IDs use the two-letter prefix sq-/dr-/sp- matching
// the squiggle/draw/sparks cards in docs/index.html.

const SAMPLE_LABELS = {
  squiggle: 'Hand-drawn vibe',
  draw: 'Stroke-on reveal',
  sparks: 'Live indicator',
};

function setupCard(card) {
  const effect = card.dataset.effect;
  const win = card.querySelector('border-wc');
  const sample = card.querySelector('.sample');
  const codeBlock = card.querySelector('code-block');
  const inputs = card.querySelectorAll('.knobs input');

  function read() {
    const v = {};
    for (const i of inputs) v[i.id.split('-')[1]] = i.value;
    return v;
  }

  function apply() {
    const { color, thick, speed, radius } = read();
    win.setAttribute('color', color);
    win.setAttribute('thickness', thick);
    win.setAttribute('speed', speed);
    win.setAttribute('radius', radius);
    sample.style.borderRadius = radius + 'px';
    // Update the code-block snippet.
    const label = SAMPLE_LABELS[effect] ?? 'Sample';
    const snippet =
      `<border-wc effect="${effect}" color="${color}" thickness="${thick}"\n` +
      `           speed="${speed}" radius="${radius}" animate>\n` +
      `  <div class="sample">${label}</div>\n` +
      `</border-wc>`;
    codeBlock.setAttribute('value', snippet);
    codeBlock.textContent = snippet;
  }

  for (const i of inputs) i.addEventListener('input', apply);
  apply(); // initialize
}

document.querySelectorAll('.effect-card').forEach(setupCard);
```

- [ ] **Step 3: Build + commit**

Run: `npm run site:build 2>&1 | tail -3`
Expected: builds; both docs pages emit.

```bash
git add docs/index.html docs/playground.js
git commit -m "site: gallery playground (3 effect cards with live knobs + snippet)"
```

---

### Task 5: Demos hub script — `demos/demos-hub.js`

**Files:**
- Create: `demos/demos-hub.js`

- [ ] **Step 1: Write the hub script** (port of the bg-wc pattern, imports adapted)

```js
// Demos hub entry. Loads the site infrastructure so the hub carries the same
// header + theme-picker as the gallery/docs pages, plus border-wc and
// browser-window. Implements the full overlay UX from bg-wc:
//   - lazy mount/unmount iframes (IntersectionObserver, rootMargin '0px')
//   - click -> unmount others + force-reload this + toggleMaximize
//   - background scroll-lock while any browser-window is maximized
//   - remount currently-visible tiles after overlay close
import 'vanilla-breeze';
import 'vanilla-breeze/css';
import '../src/border-wc.js';
import '@profpowell/browser-window';
import '../docs/prefer-dark.js';

function mountDemo(win) {
  const src = win?.dataset.demoSrc;
  if (src && win.getAttribute('src') !== src) win.setAttribute('src', src);
}
function unmountDemo(win) {
  if (win?.hasAttribute('src')) win.removeAttribute('src');
}

// On overlay open, free contexts: unmount every OTHER tile and force-reload
// this one so the overlay opens with a guaranteed-fresh state.
document.addEventListener('click', (e) => {
  const open = e.target.closest('.bw-open');
  if (!open) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  const win = open.closest('.bw-card')?.querySelector('browser-window');
  if (win && typeof win.toggleMaximize === 'function') {
    e.preventDefault();
    document
      .querySelectorAll('.bw-card browser-window')
      .forEach((w) => { if (w !== win) unmountDemo(w); });
    unmountDemo(win);
    mountDemo(win);
    win.toggleMaximize();
  }
});

// Mount tiles only while strictly visible.
const demoObserver = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      const win = e.target.querySelector('browser-window');
      if (e.isIntersecting) mountDemo(win);
      else if (!win?.classList.contains('browser-window-maximized')) unmountDemo(win);
    }
  },
  { rootMargin: '0px' }
);
document.querySelectorAll('.bw-card').forEach((card) => demoObserver.observe(card));

function remountVisibleNow() {
  const vh = window.innerHeight;
  for (const card of document.querySelectorAll('.bw-card')) {
    const r = card.getBoundingClientRect();
    if (r.bottom > 0 && r.top < vh) mountDemo(card.querySelector('browser-window'));
  }
}

// Scroll-lock while overlay is open + remount visible after close.
const docEl = document.documentElement;
let savedOverflow = null;
let wasOverlayOpen = false;
function syncScrollLock() {
  const anyOpen = !!document.querySelector('browser-window.browser-window-maximized');
  if (anyOpen && savedOverflow === null) {
    savedOverflow = docEl.style.overflow;
    docEl.style.overflow = 'hidden';
  } else if (!anyOpen && savedOverflow !== null) {
    docEl.style.overflow = savedOverflow;
    savedOverflow = null;
  }
  if (wasOverlayOpen && !anyOpen) remountVisibleNow();
  wasOverlayOpen = anyOpen;
}
new MutationObserver(syncScrollLock).observe(document.body, {
  subtree: true,
  attributes: true,
  attributeFilter: ['class'],
});
```

- [ ] **Step 2: Commit**

```bash
git add demos/demos-hub.js
git commit -m "site: demos hub script (port of bg-wc overlay UX pattern)"
```

---

### Task 6: Demos hub page — `demos/index.html`

**Files:**
- Modify (replace): `demos/index.html`

- [ ] **Step 1: Replace the existing placeholder `demos/index.html`** with the 3-tile hub.

```html
<!doctype html>
<html lang="en" data-mode="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>border-wc &mdash; themed demos</title>
  <meta name="description" content="Three themed demos showing border-wc effects in real design contexts: Notebook (squiggle), Sketchbook (draw), Achievement (sparks).">
  <script>
    (() => {
      const vb = new URL('../vb', document.baseURI).href.replace(/\/$/, '');
      window.__VB_THEME_BASE = vb;
      document.documentElement.dataset.iconPath = vb + '/icons';
    })();
  </script>
  <link rel="stylesheet" href="../docs/site.css">
</head>
<body>
  <header class="site" data-sticky data-layout="cluster" data-layout-justify="between" data-layout-gap="m">
    <a href="../docs/index.html" class="brand"><strong>&lt;border-wc&gt;</strong></a>
    <nav class="horizontal pills" aria-label="Site">
      <ul>
        <li><a href="../docs/index.html">Gallery</a></li>
        <li><a href="../docs/api.html">Docs</a></li>
        <li><a href="./" aria-current="page">Demos</a></li>
        <li><a href="https://github.com/ProfPowell/border-wc" target="_blank" rel="noopener">GitHub</a></li>
      </ul>
    </nav>
    <theme-picker compact>
      <button type="button" data-trigger class="ghost">
        <icon-wc name="palette" size="sm"></icon-wc>
        Theme
      </button>
    </theme-picker>
  </header>

  <main class="content">
    <header class="page-head">
      <h1>Themed demos</h1>
      <p class="muted">Each tile is a real full-bleed demo page running inside a browser-window &mdash; click any to open it as an overlay.</p>
    </header>

    <div class="demos">
      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./notebook.html" title="Notebook"
                        url="profpowell.github.io/border-wc/demos/notebook.html"></browser-window>
        <a class="bw-open" href="./notebook.html" aria-label="Open the Notebook demo"></a>
        <div class="meta"><span class="name">Notebook</span><span class="desc">squiggle &middot; handwritten cards</span></div>
      </div>

      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./sketchbook.html" title="Sketchbook"
                        url="profpowell.github.io/border-wc/demos/sketchbook.html"></browser-window>
        <a class="bw-open" href="./sketchbook.html" aria-label="Open the Sketchbook demo"></a>
        <div class="meta"><span class="name">Sketchbook</span><span class="desc">draw &middot; portfolio reveal</span></div>
      </div>

      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./achievement.html" title="Achievement"
                        url="profpowell.github.io/border-wc/demos/achievement.html"></browser-window>
        <a class="bw-open" href="./achievement.html" aria-label="Open the Achievement demo"></a>
        <div class="meta"><span class="name">Achievement</span><span class="desc">sparks &middot; unlocked badges</span></div>
      </div>
    </div>
  </main>

  <footer>
    <p>MIT &middot; <a href="https://github.com/ProfPowell/border-wc">ProfPowell/border-wc</a></p>
  </footer>
  <script type="module" src="./demos-hub.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add demos/index.html
git commit -m "site: demos hub page (3 browser-window tiles)"
```

---

### Task 7: Themed demo — `demos/notebook.html` (squiggle)

**Files:**
- Create: `demos/notebook.html`

- [ ] **Step 1: Write the Notebook demo**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Notebook &mdash; border-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --paper: #fbf6e9;
      --ink: #1b1a17;
      --rule: #d3cfc3;
      --accent: #2563eb;
      --warn: #d97706;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; min-height: 100vh; background: var(--paper); color: var(--ink); font-family: Inter, system-ui, sans-serif; }
    body {
      background-image:
        linear-gradient(transparent 31px, var(--rule) 32px),
        radial-gradient(circle at 1.5rem 50%, #c44 8px, transparent 9px);
      background-size: 100% 32px, 100% 100%;
      background-attachment: fixed;
      padding: 32px clamp(20px, 5vw, 64px);
    }
    .topbar { display:flex; justify-content:space-between; align-items:center; margin-bottom: 32px; font-family: ui-monospace, monospace; font-size: 12px; opacity: 0.75; }
    .topbar a { color: var(--accent); text-decoration: none; }
    h1 { font-family: Caveat, cursive; font-size: clamp(40px, 7vw, 72px); margin: 0 0 8px; letter-spacing: -0.02em; }
    .lede { font-family: Caveat, cursive; font-size: clamp(22px, 3vw, 28px); margin: 0 0 32px; opacity: 0.7; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 28px; }
    .quote {
      padding: 20px 24px;
      background: var(--paper);
      font-family: Caveat, cursive;
      font-size: 22px;
      line-height: 1.4;
      border-radius: 12px;
    }
    .quote cite { display: block; margin-top: 14px; font-size: 14px; font-family: Inter, sans-serif; font-style: normal; opacity: 0.6; }
    .quote.q1 { transform: rotate(-1.2deg); }
    .quote.q2 { transform: rotate(0.8deg); }
    .quote.q3 { transform: rotate(-0.4deg); }
    .quote.q4 { transform: rotate(1.4deg); }
    border-wc { display: block; }
  </style>
</head>
<body>
  <div class="topbar">
    <strong>NOTEBOOK</strong>
    <a href="./" target="_top">&larr; Demos</a>
  </div>

  <h1>field notes &amp; misc.</h1>
  <p class="lede">squiggle borders &middot; handwritten cards</p>

  <div class="grid">
    <border-wc effect="squiggle" color="#1b1a17" thickness="2" radius="12">
      <blockquote class="quote q1">
        The shape around the thing is the thing.
        <cite>&mdash; somebody on the internet</cite>
      </blockquote>
    </border-wc>

    <border-wc effect="squiggle" color="#d97706" thickness="2.5" radius="12" speed="1400">
      <blockquote class="quote q2">
        Make it look like it was drawn by a person who was, generally speaking, having a nice day.
        <cite>&mdash; design crit, paraphrased</cite>
      </blockquote>
    </border-wc>

    <border-wc effect="squiggle" color="#2563eb" thickness="2" radius="12">
      <blockquote class="quote q3">
        Borders are the most obvious tell.
        <cite>&mdash; me, earlier this week</cite>
      </blockquote>
    </border-wc>

    <border-wc effect="squiggle" color="#c44" thickness="3" radius="12" speed="900">
      <blockquote class="quote q4">
        TODO: buy more pens.
        <cite>&mdash; the eternal sticky note</cite>
      </blockquote>
    </border-wc>
  </div>

  <script type="module" src="../src/border-wc.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add demos/notebook.html
git commit -m "site: Notebook themed demo (squiggle)"
```

---

### Task 8: Themed demo — `demos/sketchbook.html` (draw)

**Files:**
- Create: `demos/sketchbook.html`

- [ ] **Step 1: Write the Sketchbook demo**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sketchbook &mdash; border-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f4ecd8;
      --ink: #1a1814;
      --stroke: #1a1814;
      --muted: #6b5a3e;
      --accent: #b3261e;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; min-height: 100vh; background: var(--bg); color: var(--ink); font-family: Inter, system-ui, sans-serif; }
    body { padding: 40px clamp(20px, 5vw, 64px); }
    .topbar { display:flex; justify-content:space-between; align-items:center; margin-bottom: 40px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; }
    .topbar a { color: var(--accent); text-decoration: none; }
    h1 { font-size: clamp(40px, 7vw, 96px); font-weight: 900; letter-spacing: -0.04em; line-height: 0.95; margin: 0 0 6px; }
    .lede { font-family: 'JetBrains Mono', monospace; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.6; margin: 0 0 48px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
    .project {
      padding: 20px;
      background: color-mix(in oklab, var(--ink) 4%, var(--bg));
      border-radius: 16px;
      display: flex; flex-direction: column; gap: 14px;
      transition: transform 0.25s ease;
    }
    .project:hover { transform: translateY(-3px); }
    .thumb {
      aspect-ratio: 4 / 3;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 60%, var(--ink)));
      display: flex; align-items: center; justify-content: center;
      font-family: 'JetBrains Mono', monospace;
      color: var(--bg);
      font-size: 14px;
      letter-spacing: 0.08em;
    }
    .project[data-tone="b"] .thumb { background: linear-gradient(135deg, #1a3c6c, #6ab04c); }
    .project[data-tone="c"] .thumb { background: linear-gradient(135deg, #d97706, #fde4cc); color: #1a1814; }
    .project[data-tone="d"] .thumb { background: linear-gradient(135deg, #2a1d3f, #ff5e8e); }
    .title { font-weight: 700; font-size: 17px; }
    .meta { font-family: 'JetBrains Mono', monospace; font-size: 11px; opacity: 0.55; letter-spacing: 0.06em; text-transform: uppercase; }
    border-wc { display: block; cursor: pointer; }
  </style>
</head>
<body>
  <div class="topbar">
    <strong>SKETCHBOOK</strong>
    <a href="./" target="_top">&larr; Demos</a>
  </div>

  <h1>recent work.</h1>
  <p class="lede">draw effect &middot; stroke reveals on hover</p>

  <div class="grid">
    <border-wc effect="draw" color="#1a1814" thickness="2" radius="16" speed="1400" animate>
      <article class="project" data-tone="a">
        <div class="thumb">01 / Atlas</div>
        <div class="title">Atlas brand system</div>
        <div class="meta">2026 &middot; identity, web, type</div>
      </article>
    </border-wc>
    <border-wc effect="draw" color="#1a1814" thickness="2" radius="16" speed="1400" animate>
      <article class="project" data-tone="b">
        <div class="thumb">02 / Greenhouse</div>
        <div class="title">Greenhouse mobile app</div>
        <div class="meta">2026 &middot; product, motion</div>
      </article>
    </border-wc>
    <border-wc effect="draw" color="#1a1814" thickness="2" radius="16" speed="1400" animate>
      <article class="project" data-tone="c">
        <div class="thumb">03 / Drift</div>
        <div class="title">Drift studio site</div>
        <div class="meta">2025 &middot; editorial, art-direction</div>
      </article>
    </border-wc>
    <border-wc effect="draw" color="#1a1814" thickness="2" radius="16" speed="1400" animate>
      <article class="project" data-tone="d">
        <div class="thumb">04 / Mauve</div>
        <div class="title">Mauve type specimen</div>
        <div class="meta">2025 &middot; type, print</div>
      </article>
    </border-wc>
  </div>

  <script type="module" src="../src/border-wc.js"></script>
  <script>
    // Re-trigger the draw animation on hover (the component already fires it on
    // load; toggling animate replays).
    document.querySelectorAll('border-wc').forEach((el) => {
      el.addEventListener('mouseenter', () => { el.removeAttribute('animate'); requestAnimationFrame(() => el.setAttribute('animate', '')); });
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add demos/sketchbook.html
git commit -m "site: Sketchbook themed demo (draw)"
```

---

### Task 9: Themed demo — `demos/achievement.html` (sparks)

**Files:**
- Create: `demos/achievement.html`

- [ ] **Step 1: Write the Achievement demo**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Achievement &mdash; border-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #05060e;
      --fg: #f3f5ff;
      --gold: #ffd23a;
      --pink: #ff5fa2;
      --teal: #25d0a6;
      --muted: #7884a8;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; min-height: 100vh; background: radial-gradient(ellipse at top, #14163a 0%, var(--bg) 60%); color: var(--fg); font-family: Inter, system-ui, sans-serif; }
    body { padding: 40px clamp(20px, 5vw, 64px); }
    .topbar { display:flex; justify-content:space-between; align-items:center; margin-bottom: 40px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--muted); }
    .topbar a { color: var(--teal); text-decoration: none; }
    .lede {
      font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase;
      color: var(--gold); margin: 0 0 12px;
    }
    h1 { font-size: clamp(36px, 6vw, 64px); font-weight: 900; letter-spacing: -0.03em; margin: 0 0 48px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
    .badge {
      padding: 24px; border-radius: 18px;
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
      display: flex; flex-direction: column; gap: 12px;
    }
    .icon {
      width: 56px; height: 56px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px;
      background: linear-gradient(135deg, var(--gold), var(--pink));
      color: var(--bg);
      font-weight: 900;
    }
    .badge[data-tone="b"] .icon { background: linear-gradient(135deg, var(--teal), #6cb6ff); }
    .badge[data-tone="c"] .icon { background: linear-gradient(135deg, var(--pink), #b76cff); }
    .name { font-weight: 700; font-size: 17px; }
    .desc { font-size: 13px; color: var(--muted); line-height: 1.5; }
    .xp { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--gold); letter-spacing: 0.08em; }
    border-wc { display: block; }
  </style>
</head>
<body>
  <div class="topbar">
    <strong>ACHIEVEMENT</strong>
    <a href="./" target="_top">&larr; Demos</a>
  </div>

  <p class="lede">&star; Unlocked</p>
  <h1>Three new achievements.</h1>

  <div class="grid">
    <border-wc effect="sparks" color="#ffd23a" thickness="2" radius="18" animate>
      <article class="badge" data-tone="a">
        <div class="icon">&starf;</div>
        <div class="name">First Light</div>
        <div class="desc">Shipped your first border-wc effect.</div>
        <div class="xp">+250 XP</div>
      </article>
    </border-wc>

    <border-wc effect="sparks" color="#25d0a6" thickness="2" radius="18" animate>
      <article class="badge" data-tone="b">
        <div class="icon">&hearts;</div>
        <div class="name">Mark-up Artist</div>
        <div class="desc">Annotated 10 different elements with a single binder.</div>
        <div class="xp">+500 XP</div>
      </article>
    </border-wc>

    <border-wc effect="sparks" color="#ff5fa2" thickness="2" radius="18" animate>
      <article class="badge" data-tone="c">
        <div class="icon">&clubs;</div>
        <div class="name">Decorated Layer</div>
        <div class="desc">Used vanilla-breeze base + a border-wc extreme on one element.</div>
        <div class="xp">+1000 XP</div>
      </article>
    </border-wc>
  </div>

  <script type="module" src="../src/border-wc.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add demos/achievement.html
git commit -m "site: Achievement themed demo (sparks)"
```

---

### Task 10: Deploy workflow + README

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify: `README.md`

- [ ] **Step 1: Replace the Pages deploy steps** so they build the site with Vite and upload `dist-site/`.

In `.github/workflows/pages.yml`, replace the "Assemble demo site" step with a "Build site" step. The relevant block becomes:
```yaml
      - run: npm ci

      - name: Build library
        run: npm run build

      - name: Build site
        run: npm run site:build

      - name: Setup Pages
        uses: actions/configure-pages@v5
        with:
          enablement: true

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: 'dist-site'
```
(Drop the `mkdir _site && cp -r demos ...` heredoc that previously assembled the site by hand.)

- [ ] **Step 2: Update README links**

In `README.md`, ensure the "Live demo →" link points at `https://profpowell.github.io/border-wc/` (likely already there; verify). Add a one-line note: "Try the playground at /docs/, read the API at /docs/api.html, see themed demos at /demos/."

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/pages.yml README.md
git commit -m "deploy: Pages workflow builds the site via Vite; README links"
```

---

### Task 11: Verify (local build, full headless run)

**Files:** none (verification only; throwaway script, not committed)

- [ ] **Step 1: Full library build sanity (unchanged)**

Run: `npm run build 2>&1 | tail -3`
Expected: emits `dist/border-wc.js` + `dist/data-border-effect.js` as before (the library build is untouched).

- [ ] **Step 2: Site build**

Run: `npm run site:build 2>&1 | tail -3`
Expected: emits `dist-site/index.html`, `dist-site/docs/{index,api}.html`, `dist-site/demos/{index,notebook,sketchbook,achievement}.html`, plus the `vb/themes/*.css` + `vb/icons/lucide/*.svg` assets.

- [ ] **Step 3: Headless run against the dev server**

Start: `npm run site:dev -- --port 5180 >/tmp/border-site.log 2>&1 &` then wait until `Local:` appears in the log (poll up to 20s).

Create `/Users/tpowell/src/border-wc/.verify.mjs`:
```js
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
const errs = []; p.on('console', m=>m.type()==='error'&&errs.push(m.text())); p.on('pageerror', e=>errs.push(String(e)));

// Gallery / playground
await p.goto('http://localhost:5180/docs/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1500);
const gallery = await p.evaluate(() => ({
  cards: document.querySelectorAll('.effect-card').length,
  upgraded: [...document.querySelectorAll('border-wc')].every(el => el.shadowRoot != null || !!el.querySelector('svg, canvas')),
  themePicker: !!customElements.get('theme-picker'),
}));

// API page
await p.goto('http://localhost:5180/docs/api.html', { waitUntil: 'load' });
await p.waitForTimeout(800);
const api = await p.evaluate(() => ({
  h1: document.querySelector('main.content h1')?.textContent.trim(),
  noHero: !document.querySelector('.hero'),
}));

// Demos hub: scroll, click first tile, verify overlay opens + closes
await p.goto('http://localhost:5180/demos/', { waitUntil: 'load' });
await p.waitForTimeout(1500);
const tilesBefore = await p.evaluate(() => document.querySelectorAll('.bw-card browser-window').length);
await p.$eval('.bw-card .bw-open', el => el.click());
await p.waitForTimeout(2500);
const open = await p.evaluate(() => ({
  anyMaximized: !!document.querySelector('browser-window.browser-window-maximized'),
  scrollLocked: document.documentElement.style.overflow === 'hidden',
}));
await p.keyboard.press('Escape'); await p.waitForTimeout(500);
const closed = await p.evaluate(() => !document.querySelector('browser-window.browser-window-maximized'));

console.log('gallery:', JSON.stringify(gallery));
console.log('api:', JSON.stringify(api));
console.log('demos hub: tiles=', tilesBefore, '| open:', JSON.stringify(open), '| escape closed:', closed);
console.log('errors:', errs.slice(0, 5));
await b.close();
```
Run: `node .verify.mjs`

Expected:
- `gallery`: `cards: 3`, `upgraded: true`, `themePicker: true`.
- `api`: `h1: "API Reference"`, `noHero: true`.
- `demos hub`: `tiles: 3`, `open: { anyMaximized: true, scrollLocked: true }`, `escape closed: true`.
- `errors: []`.

If any expectation fails, fix the corresponding file before continuing.

- [ ] **Step 4: Stop the server + clean up**

```bash
pkill -f "vite --config vite.site.config.js"
rm -f /tmp/border-site.log /Users/tpowell/src/border-wc/.verify.mjs
```

- [ ] **Step 5: Push the branch + open PR**

```bash
git push -u origin feat/site-v1
gh pr create --title "Site v1: gallery playground + API docs + 3-tile themed demos hub" --body "<see spec for summary>"
```

Wait for CI to settle (border-wc has lint/security/test/build); if green, merge:
```bash
gh pr merge --merge --delete-branch
```

After merge, the Pages workflow rebuilds the site via `npm run site:build` and deploys. Visit `https://profpowell.github.io/border-wc/` once the deploy completes and spot-check the three pages + at least one overlay.

---

## Self-Review

**1. Spec coverage:**
- §1 scope + ported-not-linked → Tasks 1, 2, 5 (devdeps + ports verbatim with adapted imports). ✓
- §2.1 gallery / playground (3 cards + knobs + snippet) → Task 4. ✓
- §2.2 plain API page → Task 3. ✓
- §2.3 demos hub with full overlay UX → Tasks 5 + 6 (script port + hub markup). ✓
- §3 three themed demos (Notebook / Sketchbook / Achievement, target=_top back-links) → Tasks 7, 8, 9. ✓
- §4 site.css + prefer-dark + docs-entry + demos-hub.js + playground.js + root redirect → Tasks 1, 2, 4, 5. ✓
- §5 file list → covered across Tasks 1–9. ✓
- §6 verification (build, headless gallery/api/demos hub, no console errors) → Task 11. ✓
- §7 out of scope (manifest UI, source view, search, more demos, mobile-specific, release automation) → respected; not implemented. ✓
- Pages workflow + README → Task 10. ✓

**2. Placeholder scan:** every step has concrete content. The themed-demo HTML is complete starter content; no "TBD." The PR-body line in Task 11 Step 5 says `<see spec for summary>` — replace at execution time with a real summary.

**3. Consistency:** Imports in `docs-entry.js` (Task 2) match what `docs/index.html` and `docs/api.html` reference (Tasks 3, 4). The `data-demo-src` + `.bw-open` + `.bw-card` naming in `demos/index.html` (Task 6) matches the selectors used in `demos-hub.js` (Task 5). The themed demos' back-link `<a href="./" target="_top">` is consistent across all three (Tasks 7-9), matching the no-nesting fix. Site URLs in nav (`./index.html` / `./api.html` / `../demos/`) are consistent across pages.
