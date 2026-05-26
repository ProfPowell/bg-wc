# border-wc component (ak6.3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@profpowell/border-wc` — a light-DOM web component that draws *extreme* border effects CSS can't (`squiggle` via SVG, `draw` via SVG, `sparks` via Canvas) using the shared perimeter primitive; the CSS-tier effects live in vanilla-breeze (ak6.1) and are out of scope here.

**Architecture:** A new sibling repo `~/src/border-wc` (Vite lib build + eslint/prettier/Playwright/cem, matching terminal-window/browser-window). `<border-wc>` is a light-DOM element that sets `position:relative` and appends an SVG or Canvas overlay per effect; one dispatcher maps `effect` → a pure `(host) => cleanup` function. The rounded-rect geometry is the embedded `src/perimeter.js` (copied from vanilla-breeze, canonical there). Colors resolve oklch-safely via Canvas pixel readback for the Canvas renderer; SVG uses the raw CSS color.

**Tech Stack:** vanilla JS ESM, Vite (lib), Playwright, ESLint, Prettier, cem analyze.

**Repo:** Create `~/src/border-wc`, `git init`, work on `main` (new repo — explicit user consent given). npm `@profpowell/border-wc`.

**Spec:** `gl-wc/docs/superpowers/specs/2026-05-25-border-wc-component-design.md`. Bead `gl-wc-ak6.3`. **Scope reminder:** only `squiggle`/`draw`/`sparks` (+ deferred `liquid`); CSS effects (spin/pulse/march) are vanilla-breeze's job; the `data-border-effect` binder is ak6.4 (separate). Reduced-motion forces `animate` off and renders a static fallback.

**API (from spec §2):** `<border-wc effect="squiggle|draw|sparks" color thickness speed radius animate mode>`; params resolve **CSS var (`--border-wc-*`) → attribute → default**; events `border-wc:effect-applied {effect}`, `border-wc:draw-complete {}`; methods `el.effect` (reflects), `el.refresh()`.

---

## File structure (in `~/src/border-wc`)
- `package.json`, `vite.config.js`, `eslint.config.js`, `.prettierrc`, `playwright.config.js`, `custom-elements-manifest.config.mjs`, `.gitignore`, `LICENSE`, `README.md` — scaffold.
- `src/perimeter.js` — embedded copy of vanilla-breeze `src/lib/perimeter.js` (canonical there).
- `src/color.js` — `toRGBA(cssColor)` oklch-safe pixel-readback (for Canvas).
- `src/params.js` — `readParams(host)` (CSS var → attr → default) + `prefersReducedMotion(host)`.
- `src/effects/draw.js`, `src/effects/squiggle.js`, `src/effects/sparks.js` — each `export function create<Effect>(host) → cleanup`.
- `src/border-wc.js` — the element + dispatcher + registration.
- `test/test-page.html`, `test/*.spec.js` — Playwright.
- `demos/index.html` — specimen.

---

## Task 1: Scaffold the repo

**Files:** Create `~/src/border-wc/{package.json, .gitignore, LICENSE, eslint.config.js, .prettierrc, vite.config.js, playwright.config.js, custom-elements-manifest.config.mjs, README.md}`

- [ ] **Step 1: Init**
```bash
mkdir -p ~/src/border-wc/src/effects ~/src/border-wc/test ~/src/border-wc/demos
cd ~/src/border-wc && git init -q && git branch -m main
```

- [ ] **Step 2: `package.json`**
```json
{
  "name": "@profpowell/border-wc",
  "version": "0.1.0",
  "description": "Light-DOM web component for high-touch border effects (squiggle, draw, sparks) the platform under-serves.",
  "license": "MIT",
  "type": "module",
  "main": "dist/border-wc.js",
  "module": "dist/border-wc.js",
  "exports": { ".": "./dist/border-wc.js" },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": ["dist/border-wc.js"],
  "customElements": "custom-elements.json",
  "keywords": ["web-component", "custom-element", "border", "svg", "canvas", "vanilla-breeze"],
  "author": "ProfPowell",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write \"src/**/*.js\"",
    "format:check": "prettier --check \"src/**/*.js\"",
    "analyze": "cem analyze",
    "prepublishOnly": "npm run build && npm run analyze"
  }
}
```

- [ ] **Step 3: `.gitignore`**
```
node_modules/
dist/
.DS_Store
*.log
test-results/
playwright-report/
.idea/
```

- [ ] **Step 4: `LICENSE`** — MIT, author ProfPowell, year 2026 (copy the standard MIT text).

- [ ] **Step 5: `vite.config.js`**
```js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    lib: { entry: 'src/border-wc.js', formats: ['es'], fileName: () => 'border-wc.js' },
  },
  server: { open: '/demos/index.html' },
});
```

- [ ] **Step 6: `eslint.config.js`** (browser globals, matching siblings)
```js
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly', document: 'readonly', customElements: 'readonly',
        HTMLElement: 'readonly', CustomEvent: 'readonly', SVGElement: 'readonly',
        IntersectionObserver: 'readonly', ResizeObserver: 'readonly',
        requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly',
        getComputedStyle: 'readonly', matchMedia: 'readonly', performance: 'readonly',
        document: 'readonly', console: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  { ignores: ['dist/', 'node_modules/', 'demos/', 'test/'] },
];
```

- [ ] **Step 7: `.prettierrc`**
```json
{ "semi": true, "singleQuote": true, "tabWidth": 2, "trailingComma": "es5", "printWidth": 100, "bracketSpacing": true }
```

- [ ] **Step 8: `playwright.config.js`**
```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5180', trace: 'on-first-retry' },
  webServer: {
    command: 'npx vite --port 5180',
    url: 'http://localhost:5180/test/test-page.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
```

- [ ] **Step 9: `custom-elements-manifest.config.mjs`**
```js
export default {
  globs: ['src/**/*.js'],
  exclude: ['src/**/*.test.js'],
  outdir: '.',
  litelement: false,
};
```

- [ ] **Step 10: `README.md`** — short intro: what it is (extreme border effects: squiggle/draw/sparks), install (`npm i @profpowell/border-wc`), a usage snippet, note it pairs with vanilla-breeze's CSS-tier `data-border-effect` (spin/pulse/march) and reads VB tokens. Keep ~30 lines.

- [ ] **Step 11: Install + commit**
```bash
npm install -D vite@^7 @playwright/test eslint @eslint/js prettier @custom-elements-manifest/analyzer
git add -A && git commit -m "scaffold @profpowell/border-wc (Vite + eslint/prettier/playwright/cem)"
```
Expected: installs clean; commit created. (No remote yet; that's set up at finish.)

---

## Task 2: Embed the perimeter primitive

**Files:** Create `~/src/border-wc/src/perimeter.js`; Test: `test/test-page.html` (minimal), `test/perimeter.spec.js`

- [ ] **Step 1: Copy the canonical source** from vanilla-breeze and add an attribution header:
```bash
cp ~/src/vanilla-breeze/src/lib/perimeter.js ~/src/border-wc/src/perimeter.js
```
Then prepend to `src/perimeter.js` a comment:
```js
// Embedded from @profpowell/vanilla-breeze (src/lib/perimeter.js) — canonical
// source lives there (Decorated Layers shared geometry). Keep in sync.
```

- [ ] **Step 2: Create `test/test-page.html`** (the Playwright harness, used by later tasks too):
```html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>border-wc test</title>
<style> border-wc { display:block; width:320px; height:200px; } </style></head>
<body>
  <border-wc id="bw" effect="draw"><div class="content">card</div></border-wc>
  <script type="module" src="../src/border-wc.js"></script>
</body></html>
```

- [ ] **Step 3: Write `test/perimeter.spec.js`** (smoke that the embedded module loads in the browser):
```js
import { test, expect } from '@playwright/test';
test('embedded perimeter computes a rounded-rect path', async ({ page }) => {
  await page.goto('/test/test-page.html');
  const d = await page.evaluate(async () => {
    const m = await import('/src/perimeter.js');
    return m.roundedRectPath({ width: 100, height: 100, radius: 10 });
  });
  expect(d).toMatch(/A10 10 0 0 1/);
});
```

- [ ] **Step 4: Run** (the webServer auto-starts):
```bash
npx playwright install chromium && npx playwright test test/perimeter.spec.js
```
Expected: PASS (NOTE: `border-wc.js` doesn't exist yet, so test-page.html's module 404s — that's fine for THIS test which imports perimeter.js directly; if Playwright's webServer health-check on test-page.html fails because the module 404s, create a stub `src/border-wc.js` with `// stub` first, or point the webServer `url` at `/src/perimeter.js`. Simplest: create an empty `src/border-wc.js` placeholder now; Task 4 fills it.)

- [ ] **Step 5: Commit**
```bash
git add src/perimeter.js test/test-page.html test/perimeter.spec.js src/border-wc.js
git commit -m "embed perimeter primitive from vanilla-breeze + test harness"
```

---

## Task 3: Color util (oklch-safe, for Canvas)

**Files:** Create `src/color.js`; Test: `test/color.spec.js`

- [ ] **Step 1: Write failing test** `test/color.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('toRGBA resolves oklch to rgb()', async ({ page }) => {
  await page.goto('/test/test-page.html');
  const out = await page.evaluate(async () => {
    const { toRGBA } = await import('/src/color.js');
    return { ok: toRGBA('oklch(62% .1 230)'), named: toRGBA('rebeccapurple'), bad: toRGBA('not-a-color') };
  });
  // oklch resolves to a real non-black rgb; named resolves; invalid → transparent-ish black
  expect(out.ok).toMatch(/^rgb/);
  expect(out.named).toMatch(/^rgb/);
});
```

- [ ] **Step 2: Run → FAIL** `npx playwright test test/color.spec.js` (color.js missing).

- [ ] **Step 3: Implement `src/color.js`** (pixel readback — same lesson as gl-wc):
```js
// Resolve ANY CSS color (oklch/lab/hsl/named/hex/rgb) to an "rgb(r, g, b)" /
// "rgba(...)" string a Canvas 2D context can use, by rendering 1px and reading
// it back. SVG can use the raw CSS color directly; this is for the Canvas effect.
let ctx;
const cache = new Map();
export function toRGBA(css) {
  if (!css) return 'rgba(0,0,0,0)';
  const key = String(css).trim();
  if (cache.has(key)) return cache.get(key);
  if (!ctx) ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  const out = a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
  cache.set(key, out);
  return out;
}
```

- [ ] **Step 4: Run → PASS**. **Step 5: Commit** `git add src/color.js test/color.spec.js && git commit -m "feat: oklch-safe color resolution for canvas (pixel readback)"`

---

## Task 4: `<border-wc>` element + dispatcher (with a no-op effect)

**Files:** Create `src/params.js`, replace `src/border-wc.js`; Test: `test/element.spec.js`

- [ ] **Step 1: `src/params.js`**
```js
// Param resolution: CSS custom property (--border-wc-*) → attribute → default.
export function readParams(host) {
  const cs = getComputedStyle(host);
  const cssVar = (n) => cs.getPropertyValue(n).trim();
  const numAttr = (name, def) => {
    const v = parseFloat(host.getAttribute(name));
    return Number.isFinite(v) ? v : def;
  };
  const pick = (varName, attr, def, parse = (x) => x) => {
    const v = cssVar(varName);
    if (v) return parse(v);
    const a = host.getAttribute(attr);
    return a != null ? parse(a) : def;
  };
  return {
    color: pick('--border-wc-color', 'color', 'currentColor'),
    thickness: pick('--border-wc-thickness', 'thickness', 2, parseFloat),
    speed: pick('--border-wc-speed', 'speed', 1000, parseFloat),
    radius: pick('--border-wc-radius', 'radius', null, parseFloat),
    animate: host.hasAttribute('animate'),
    mode: host.getAttribute('mode') || 'center',
  };
}
export function reducedMotion(host) {
  const m = host.getAttribute('motion');
  if (m === 'reduce') return true;
  if (m === 'force') return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}
// Resolve the corner radius to use: explicit param, else the host's border-radius.
export function resolveRadius(host, params) {
  if (Number.isFinite(params.radius)) return params.radius;
  const r = parseFloat(getComputedStyle(host).borderTopLeftRadius);
  return Number.isFinite(r) ? r : 0;
}
```

- [ ] **Step 2: Write failing test** `test/element.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('border-wc upgrades, reflects effect, exposes refresh()', async ({ page }) => {
  await page.goto('/test/test-page.html');
  const r = await page.evaluate(() => {
    const el = document.getElementById('bw');
    return {
      upgraded: el instanceof HTMLElement && typeof el.refresh === 'function',
      effect: el.effect,
      position: getComputedStyle(el).position,
    };
  });
  expect(r.upgraded).toBe(true);
  expect(r.effect).toBe('draw');
  expect(r.position).toBe('relative');
});
test('changing effect re-applies without error', async ({ page }) => {
  await page.goto('/test/test-page.html');
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.evaluate(() => { document.getElementById('bw').setAttribute('effect', 'sparks'); });
  await page.waitForTimeout(200);
  expect(errs).toEqual([]);
});
```

- [ ] **Step 3: Run → FAIL** (element not defined / no refresh).

- [ ] **Step 4: Implement `src/border-wc.js`** (dispatcher + lifecycle; effects imported lazily so this task can land before all effects exist — use a registry with the three names, each dynamically imported):
```js
import { readParams, reducedMotion } from './params.js';

const STYLE_HOST = (host) => {
  const cs = getComputedStyle(host);
  if (cs.position === 'static') host.style.position = 'relative';
  if (cs.display === 'inline') host.style.display = 'block';
};

// effect name → loader returning { create(host) => cleanup }
const EFFECTS = {
  draw: () => import('./effects/draw.js').then((m) => m.createDraw),
  squiggle: () => import('./effects/squiggle.js').then((m) => m.createSquiggle),
  sparks: () => import('./effects/sparks.js').then((m) => m.createSparks),
};

class BorderWC extends HTMLElement {
  static get observedAttributes() {
    return ['effect', 'color', 'thickness', 'speed', 'radius', 'animate', 'mode', 'motion'];
  }
  #cleanup = null;
  #token = 0;

  get effect() { return this.getAttribute('effect'); }
  set effect(v) { v == null ? this.removeAttribute('effect') : this.setAttribute('effect', String(v)); }

  connectedCallback() { STYLE_HOST(this); this.#apply(); }
  disconnectedCallback() { this.#teardown(); }
  attributeChangedCallback() { if (this.isConnected) this.#apply(); }
  refresh() { this.#apply(); }

  #teardown() { try { this.#cleanup?.(); } catch {} this.#cleanup = null; }

  async #apply() {
    this.#teardown();
    const name = this.effect;
    if (!name || !EFFECTS[name]) return; // unknown/base value → no-op (CSS tier handles spin/pulse/etc.)
    const token = ++this.#token;
    let create;
    try { create = await EFFECTS[name](); } catch { return; }
    if (token !== this.#token || !this.isConnected) return;
    const params = { ...readParams(this), reduce: reducedMotion(this) };
    try {
      this.#cleanup = create(this, params) || null;
      this.dispatchEvent(new CustomEvent('border-wc:effect-applied', { detail: { effect: name } }));
    } catch (err) {
      this.dispatchEvent(new CustomEvent('border-wc:error', { detail: { error: err } }));
    }
  }
}

if (!customElements.get('border-wc')) customElements.define('border-wc', BorderWC);
export { BorderWC };
```

- [ ] **Step 5: Run → PASS** (upgrade + refresh + position; effect change is a no-op until effects exist but must not error — the `EFFECTS[name]()` import will fail gracefully via catch until Tasks 5-7 add the files; ensure the catch makes it a clean no-op). **Step 6: Commit** `git add src/border-wc.js src/params.js test/element.spec.js && git commit -m "feat: border-wc element + dispatcher (lifecycle, params, refresh)"`

---

## Task 5: `draw` effect (SVG stroke-dashoffset)

**Files:** Create `src/effects/draw.js`; Test: `test/draw.spec.js`

- [ ] **Step 1: Write failing test** `test/draw.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('draw appends an SVG stroke and emits draw-complete', async ({ page }) => {
  await page.goto('/test/test-page.html');
  const done = page.evaluate(() => new Promise((res) => {
    const el = document.getElementById('bw');
    el.addEventListener('border-wc:draw-complete', () => res(true), { once: true });
    el.setAttribute('speed', '120');
    el.setAttribute('effect', 'draw'); // re-apply
  }));
  // an <svg> overlay exists
  await page.waitForTimeout(50);
  const hasSvg = await page.evaluate(() => !!document.getElementById('bw').querySelector('svg[data-border-wc]'));
  expect(hasSvg).toBe(true);
  expect(await done).toBe(true);
});
```

- [ ] **Step 2: Run → FAIL**.

- [ ] **Step 3: Implement `src/effects/draw.js`**:
```js
import { roundedRectPath, roundedRectPerimeter } from '../perimeter.js';
import { resolveRadius } from '../params.js';

const SVGNS = 'http://www.w3.org/2000/svg';

export function createDraw(host, params) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('data-border-wc', 'draw');
  Object.assign(svg.style, { position: 'absolute', inset: '0', overflow: 'visible', pointerEvents: 'none' });
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  const path = document.createElementNS(SVGNS, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', params.color);
  path.setAttribute('stroke-width', String(params.thickness));
  svg.appendChild(path);
  host.appendChild(svg);

  let raf = 0;
  const render = (animateIn) => {
    const rect = host.getBoundingClientRect();
    const inset = params.thickness / 2;
    const radius = resolveRadius(host, params);
    path.setAttribute('d', roundedRectPath({ width: rect.width, height: rect.height, radius, inset }));
    const len = roundedRectPerimeter({ width: rect.width, height: rect.height, radius, inset }) || 1;
    path.style.transition = 'none';
    path.style.strokeDasharray = String(len);
    if (!animateIn || params.reduce) {
      path.style.strokeDashoffset = '0'; // static: fully drawn
      host.dispatchEvent(new CustomEvent('border-wc:draw-complete', { detail: {} }));
      return;
    }
    path.style.strokeDashoffset = String(len);
    // next frame: animate offset → 0 over `speed` ms
    raf = requestAnimationFrame(() => {
      path.style.transition = `stroke-dashoffset ${params.speed}ms linear`;
      path.style.strokeDashoffset = '0';
    });
    const onEnd = (e) => {
      if (e.propertyName !== 'stroke-dashoffset') return;
      host.dispatchEvent(new CustomEvent('border-wc:draw-complete', { detail: {} }));
      path.removeEventListener('transitionend', onEnd);
    };
    path.addEventListener('transitionend', onEnd);
  };
  render(true);

  const ro = new ResizeObserver(() => render(false)); // re-fit on resize (no re-animate)
  ro.observe(host);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); svg.remove(); };
}
```

- [ ] **Step 4: Run → PASS**. **Step 5: Commit** `git add src/effects/draw.js test/draw.spec.js && git commit -m "feat(effect): draw (SVG stroke-dashoffset + draw-complete)"`

---

## Task 6: `squiggle` effect (SVG feTurbulence + displacement)

**Files:** Create `src/effects/squiggle.js`; Test: `test/squiggle.spec.js`

- [ ] **Step 1: Write failing test** `test/squiggle.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('squiggle appends an SVG with a turbulence filter on a stroked path', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'squiggle'));
  await page.waitForTimeout(80);
  const r = await page.evaluate(() => {
    const svg = document.getElementById('bw').querySelector('svg[data-border-wc="squiggle"]');
    return { hasSvg: !!svg, hasTurb: !!svg?.querySelector('feTurbulence'), hasPath: !!svg?.querySelector('path[filter]') };
  });
  expect(r).toEqual({ hasSvg: true, hasTurb: true, hasPath: true });
});
```

- [ ] **Step 2: Run → FAIL**.

- [ ] **Step 3: Implement `src/effects/squiggle.js`**:
```js
import { roundedRectPath } from '../perimeter.js';
import { resolveRadius } from '../params.js';

const SVGNS = 'http://www.w3.org/2000/svg';
let uid = 0;

export function createSquiggle(host, params) {
  const id = `bw-sq-${++uid}`;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('data-border-wc', 'squiggle');
  Object.assign(svg.style, { position: 'absolute', inset: '0', overflow: 'visible', pointerEvents: 'none' });
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.innerHTML =
    `<defs><filter id="${id}" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="1" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G"/>` +
    `</filter></defs>`;
  const path = document.createElementNS(SVGNS, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', params.color);
  path.setAttribute('stroke-width', String(params.thickness));
  path.setAttribute('filter', `url(#${id})`);
  svg.appendChild(path);
  host.appendChild(svg);
  const turb = svg.querySelector('feTurbulence');

  const fit = () => {
    const rect = host.getBoundingClientRect();
    path.setAttribute('d', roundedRectPath({ width: rect.width, height: rect.height, radius: resolveRadius(host, params), inset: params.thickness / 2 }));
  };
  fit();

  let raf = 0;
  if (params.animate && !params.reduce) {
    // Reseed the turbulence periodically; rate derived from `speed`.
    let seed = 1;
    let last = 0;
    const loop = (now) => {
      if (now - last > params.speed / 8) {
        turb.setAttribute('seed', String((seed = (seed + 1) % 100)));
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  const ro = new ResizeObserver(fit);
  ro.observe(host);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); svg.remove(); };
}
```

- [ ] **Step 4: Run → PASS**. **Step 5: Commit** `git add src/effects/squiggle.js test/squiggle.spec.js && git commit -m "feat(effect): squiggle (SVG feTurbulence + displacement)"`

---

## Task 7: `sparks` effect (Canvas + perimeter sampler + IO pause)

**Files:** Create `src/effects/sparks.js`; Test: `test/sparks.spec.js`

- [ ] **Step 1: Write failing test** `test/sparks.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('sparks appends a sized canvas and renders', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'sparks'));
  await page.waitForTimeout(150);
  const r = await page.evaluate(() => {
    const c = document.getElementById('bw').querySelector('canvas[data-border-wc="sparks"]');
    return { hasCanvas: !!c, sized: !!c && c.width > 0 && c.height > 0 };
  });
  expect(r).toEqual({ hasCanvas: true, sized: true });
});
```

- [ ] **Step 2: Run → FAIL**.

- [ ] **Step 3: Implement `src/effects/sparks.js`**:
```js
import { roundedRectSampler } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { toRGBA } from '../color.js';

export function createSparks(host, params) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('data-border-wc', 'sparks');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const color = toRGBA(params.color === 'currentColor' ? getComputedStyle(host).color : params.color);

  let sampler = () => [0, 0];
  let dpr = 1;
  const fit = () => {
    const rect = host.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    sampler = roundedRectSampler({ width: rect.width, height: rect.height, radius: resolveRadius(host, params), inset: params.thickness / 2 });
  };
  fit();

  const N = 24;
  const parts = Array.from({ length: N }, (_, i) => ({ t: i / N, v: (0.02 + Math.random() * 0.02) }));
  let raf = 0;
  const frame = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    const dt = params.reduce ? 0 : 1; // reduced motion → static dots
    for (const p of parts) {
      p.t = (p.t + p.v * 0.016 * dt) % 1;
      const [x, y] = sampler(p.t);
      ctx.beginPath();
      ctx.arc(x * dpr, y * dpr, params.thickness * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = params.reduce ? 0 : requestAnimationFrame(frame);
  };
  frame();

  // Pause the rAF loop when off-screen.
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !raf && !params.reduce) raf = requestAnimationFrame(frame);
    else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
  });
  io.observe(host);
  const ro = new ResizeObserver(fit);
  ro.observe(host);
  return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); canvas.remove(); };
}
```

- [ ] **Step 4: Run → PASS**. **Step 5: Commit** `git add src/effects/sparks.js test/sparks.spec.js && git commit -m "feat(effect): sparks (canvas perimeter particles + IO pause)"`

---

## Task 8: Reduced-motion + full test + demo + manifest

**Files:** Create `test/reduced-motion.spec.js`, `demos/index.html`; generate `custom-elements.json`

- [ ] **Step 1: Reduced-motion test** `test/reduced-motion.spec.js` (Playwright emulates it):
```js
import { test, expect } from '@playwright/test';
test.use({ colorScheme: 'light' });
test('reduced motion: draw renders fully drawn immediately (no animation)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/test/test-page.html');
  const completed = await page.evaluate(() => new Promise((res) => {
    const el = document.getElementById('bw');
    let got = false;
    el.addEventListener('border-wc:draw-complete', () => { got = true; res(true); }, { once: true });
    el.setAttribute('effect', 'draw');
    setTimeout(() => res(got), 100); // should fire ~immediately under reduce
  }));
  expect(completed).toBe(true);
});
```
Run → expect PASS (draw's `params.reduce` path fires draw-complete synchronously). Fix the effect if needed.

- [ ] **Step 2: `demos/index.html`** — a specimen with three `<border-wc>` cards (`effect="squiggle" animate`, `effect="draw"`, `effect="sparks"`), each wrapping some content, on a neutral page; imports `../src/border-wc.js`. Add a refresh button for the draw card (`el.refresh()`).

- [ ] **Step 3: Build + analyze + full test**
```bash
npm run build && ls dist/border-wc.js
npm run analyze && grep -c '"tagName": "border-wc"' custom-elements.json
npm run lint
npx playwright test
```
Expected: dist built; manifest has border-wc; lint clean; all specs pass.

- [ ] **Step 4: Commit**
```bash
git add test/reduced-motion.spec.js demos/index.html custom-elements.json
git commit -m "test: reduced-motion; add demo + custom-elements manifest"
```

---

## Task 9: Final verification

- [ ] **Step 1:** `npm run build && npm test && npm run lint && npm run analyze` — all green.
- [ ] **Step 2:** Visual sanity: `npm run dev` (opens demos), confirm squiggle wobbles (animate), draw draws in (and `refresh()` re-runs it), sparks travel the perimeter; toggle OS reduced-motion → effects静 static.
- [ ] **Step 3:** Return to gl-wc: `bd update gl-wc-ak6.3 --status completed` (after review); set up the GitHub remote + push + (sibling-standard) Pages/CI as a follow-up.

---

## Notes for the implementer
- **Scope:** only squiggle/draw/sparks. Unknown `effect` values (spin/pulse/march/liquid) are a clean no-op (CSS tier / deferred) — don't error.
- **oklch:** SVG `stroke` takes the raw CSS color; only the Canvas (`sparks`) needs `toRGBA` (pixel readback).
- **Light DOM:** overlays are appended as host children with `pointer-events:none`; slotted content stays put. Set `position:relative` only if static.
- **Reduced motion** (`reduce`): draw → fully drawn + immediate draw-complete; squiggle → static (no reseed loop); sparks → static dots (no rAF).
- **Embedded perimeter** is a copy; canonical in vanilla-breeze (keep in sync; Phase-2 shapes land there first).
- New repo has **no remote yet** — finishing/publishing (GitHub remote, Pages, npm) is a follow-up after the build is reviewed.
