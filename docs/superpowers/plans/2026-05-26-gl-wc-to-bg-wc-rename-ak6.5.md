# gl-wc → bg-wc Rename Implementation Plan (ak6.5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the package/element/CSS-vars/binder-attribute from the `gl-wc` family to the `bg-wc` family **in place**, shipping a backward-compatible alias layer so `<gl-wc>`, `data-bg`, `--gl-wc-*`, and `gl-wc:*` events keep working (warning once where appropriate).

**Architecture:** `<bg-wc>` becomes canonical; `<gl-wc>` is a deprecated subclass alias. CSS vars read `--bg-wc-*` first, falling back to `--gl-wc-*`. The binder's canonical attribute is `data-background`, still scanning legacy `data-bg`. Custom events fire under both `bg-wc:*` (canonical) and `gl-wc:*` (legacy twin). The GitHub repo is renamed to `bg-wc` at the end.

**Tech Stack:** Vanilla JS ESM, Vite library build with `preserveModules`, Playwright tests, `@custom-elements-manifest/analyzer`.

**Target repo:** `/Users/tpowell/src/gl-wc` (working dir stays this path even after the GitHub repo is renamed). Work on a feature branch `claude/bg-wc-rename-ak6.5`.

**Spec:** `docs/superpowers/specs/2026-05-26-gl-wc-to-bg-wc-rename-ak6.5-design.md`

---

### Task 1: Core element rename + back-compat layer (keep tests green)

This is the largest task — it renames the element and bakes in the full backward-compat layer (CSS var fallbacks, event twins, the `<gl-wc>` alias), then updates the existing element tests so the suite stays green.

**Files:**
- Rename: `src/gl-wc.js` → `src/bg-wc.js`
- Create: `src/legacy-alias.js`
- Modify: `src/renderer/tokens.js`, `vite.config.js`
- Modify (tests/harness): `test/test-page.html`, `test/tokens-page.html`, `test/smoke.spec.js`, `test/tokens.spec.js`, `test/bfcache.spec.js`

- [ ] **Step 1: Rename the element file (preserve history)**

```bash
cd /Users/tpowell/src/gl-wc
git mv src/gl-wc.js src/bg-wc.js
```

- [ ] **Step 2: Rename the class and its definition in `src/bg-wc.js`**

Change the class declaration `class GlWc extends HTMLElement {` → `class BgWc extends HTMLElement {`.

Change the file-top comment `// <gl-wc> — theme-aware graphics-layer web component.` → `// <bg-wc> — theme-aware graphics-layer web component (canonical; <gl-wc> is a deprecated alias, see legacy-alias.js).`

At the bottom of the file, replace:
```js
if (!customElements.get('gl-wc')) {
  customElements.define('gl-wc', GlWc);
}
```
with:
```js
if (!customElements.get('bg-wc')) {
  customElements.define('bg-wc', BgWc);
}

// Register the deprecated <gl-wc> alias (side-effecting import).
import './legacy-alias.js';

export { BgWc };
```
(Note: a static `import` at the bottom still hoists; that's fine. If the file already has an `export { GlWc }` or similar, rename it to `BgWc`. If not, the added `export { BgWc }` makes the class importable by `legacy-alias.js`.)

- [ ] **Step 3: CSS custom-property fallbacks in the `STYLE` string of `src/bg-wc.js`**

Replace:
```css
  background: var(--gl-wc-color-bg, var(--color-background, transparent));
```
with:
```css
  background: var(--bg-wc-color-bg, var(--gl-wc-color-bg, var(--color-background, transparent)));
```
And replace:
```css
  z-index: var(--gl-wc-z-index, 0);
```
with:
```css
  z-index: var(--bg-wc-z-index, var(--gl-wc-z-index, 0));
```

- [ ] **Step 4: COLOR_MAPPING overrides accept canonical + legacy (array)**

In `src/bg-wc.js`, change the `COLOR_MAPPING` overrides to arrays (canonical first, legacy fallback):
```js
const COLOR_MAPPING = {
  primary: { token: '--color-primary',    override: ['--bg-wc-color-1', '--gl-wc-color-1'] },
  accent:  { token: '--color-accent',     override: ['--bg-wc-color-2', '--gl-wc-color-2'] },
  info:    { token: '--color-info',       override: ['--bg-wc-color-3', '--gl-wc-color-3'] },
  bg:      { token: '--color-background', override: ['--bg-wc-color-bg', '--gl-wc-color-bg'] },
  fg:      { token: ['--color-foreground', '--color-text'], override: ['--bg-wc-color-fg', '--gl-wc-color-fg'] },
  success: { token: '--color-success',    override: null },
  warning: { token: '--color-warning',    override: null },
  error:   { token: '--color-error',      override: null },
};
```

- [ ] **Step 5: Numeric CSS-var reads accept canonical + legacy in `src/bg-wc.js`**

In `#readParams`, replace the `cssVar` helper and its call sites:
```js
    const css = getComputedStyle(this);
    const cssVar = (name) => {
      const v = parseFloat(css.getPropertyValue(name));
      return Number.isFinite(v) ? v : null;
    };
    return {
      palette: this.getAttribute('palette') || 'theme',
      intensity: cssVar('--gl-wc-intensity') ?? num('intensity', 0.5, 0, 1),
      speed:     cssVar('--gl-wc-speed')     ?? num('speed', 1, 0, 5),
      density:   cssVar('--gl-wc-density')   ?? num('density', 0.5, 0, 1),
```
with:
```js
    const css = getComputedStyle(this);
    // Read --bg-wc-<suffix>, falling back to legacy --gl-wc-<suffix>.
    const cssVar = (suffix) => {
      for (const prefix of ['--bg-wc-', '--gl-wc-']) {
        const v = parseFloat(css.getPropertyValue(prefix + suffix));
        if (Number.isFinite(v)) return v;
      }
      return null;
    };
    return {
      palette: this.getAttribute('palette') || 'theme',
      intensity: cssVar('intensity') ?? num('intensity', 0.5, 0, 1),
      speed:     cssVar('speed')     ?? num('speed', 1, 0, 5),
      density:   cssVar('density')   ?? num('density', 0.5, 0, 1),
```

In `#resize`, replace:
```js
    const css = getComputedStyle(this);
    const cssVar = parseFloat(css.getPropertyValue('--gl-wc-pixel-ratio'));
```
with:
```js
    const css = getComputedStyle(this);
    const pr = (n) => parseFloat(css.getPropertyValue(n));
    const cssVar = Number.isFinite(pr('--bg-wc-pixel-ratio'))
      ? pr('--bg-wc-pixel-ratio')
      : pr('--gl-wc-pixel-ratio');
```
(Leave the subsequent `Number.isFinite(cssVar) ? cssVar : …` logic unchanged.)

- [ ] **Step 6: Event names — emit canonical `bg-wc:*` plus a legacy `gl-wc:*` twin**

In `src/bg-wc.js`, replace the `#emit` method:
```js
  #emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: false, composed: true }));
  }
```
with:
```js
  #emit(type, detail) {
    const fire = (t) =>
      this.dispatchEvent(new CustomEvent(t, { detail, bubbles: false, composed: true }));
    fire(type);
    // Legacy twin: keep gl-wc:* listeners working during deprecation.
    if (type.startsWith('bg-wc:')) fire('gl-wc:' + type.slice('bg-wc:'.length));
  }
```
Then change every `#emit('gl-wc:…', …)` call site to `#emit('bg-wc:…', …)` (there are calls for `:visibility`, `:error`, `:ready`, `:preset-changed`). Use a careful find/replace of the literal `'gl-wc:` → `'bg-wc:` **only inside `#emit(` calls** (do NOT alter the `gl-wc::part(canvas)` comment or other text). Verify afterward with `grep -n "#emit('" src/bg-wc.js` — every emit must use `'bg-wc:`.

- [ ] **Step 7: Create `src/legacy-alias.js`**

```js
// Deprecated <gl-wc> alias for the canonical <bg-wc> element. Importing this
// (done by bg-wc.js) registers <gl-wc> as a subclass that warns once on first
// connect, so existing markup keeps working through the rename.
import { BgWc } from './bg-wc.js';

let warned = false;

class GlWcAlias extends BgWc {
  connectedCallback() {
    if (!warned) {
      warned = true;
      console.warn(
        '<gl-wc> is deprecated and will be removed in a future major. Use <bg-wc> instead.'
      );
    }
    super.connectedCallback?.();
  }
}

if (!customElements.get('gl-wc')) {
  customElements.define('gl-wc', GlWcAlias);
}

export { GlWcAlias };
```

- [ ] **Step 8: `src/renderer/tokens.js` — accept an override that is a string OR an array**

Replace the `readTokenString` override block:
```js
export function readTokenString(host, token, override) {
  const cs = getComputedStyle(host);
  if (override) {
    const v = cs.getPropertyValue(override).trim();
    if (v) return v;
  }
```
with:
```js
export function readTokenString(host, token, override) {
  const cs = getComputedStyle(host);
  if (override) {
    const overrides = Array.isArray(override) ? override : [override];
    for (const o of overrides) {
      const v = cs.getPropertyValue(o).trim();
      if (v) return v;
    }
  }
```

- [ ] **Step 9: `vite.config.js` — rename the lib entry keys/paths**

Replace the `entry` object:
```js
      entry: {
        'gl-wc': 'src/gl-wc.js',
        'data-bg': 'src/data-bg.js',
      },
```
with:
```js
      entry: {
        'bg-wc': 'src/bg-wc.js',
        'data-background': 'src/data-background.js',
      },
```
(The `data-background.js` source is created in Task 2; the build is verified in Task 3. `preserveModules` keeps `dist/` mirroring `src/`.)

- [ ] **Step 10: Update the element tests + harness to canonical names**

In `test/test-page.html`: title `gl-wc test harness` → `bg-wc test harness`; CSS selector `gl-wc { … }` → `bg-wc { … }`; element `<gl-wc id="wc" preset="mesh-gradient" intensity="0.6"></gl-wc>` → `<bg-wc id="wc" preset="mesh-gradient" intensity="0.6"></bg-wc>`; script `src="../src/gl-wc.js"` → `src="../src/bg-wc.js"`.

In `test/tokens-page.html`: update any `../src/gl-wc.js` import to `../src/bg-wc.js` and any `<gl-wc>`→`<bg-wc>` (read the file; apply the same substitutions).

In `test/smoke.spec.js`: rename test titles `gl-wc …` → `bg-wc …` if present; update any selector/`getElementById`/tag query that targets `gl-wc` → `bg-wc`; if it listens for `gl-wc:ready`/`gl-wc:error`, switch to `bg-wc:ready`/`bg-wc:error`. (Read the file and apply.)

In `test/tokens.spec.js`: the two `readTokenString(host, [...], '--gl-wc-color-fg')` calls — change the override argument to the canonical-first array `['--bg-wc-color-fg', '--gl-wc-color-fg']`. Keep everything else.

In `test/bfcache.spec.js`: update the comment and any `<gl-wc>`/`../src/gl-wc.js`/selector references to `bg-wc` / `../src/bg-wc.js`. (Read and apply.)

- [ ] **Step 11: Run the suite — must stay green**

Run: `npm test`
Expected: PASS — smoke/tokens/bfcache all green under the canonical `<bg-wc>` names. (Note: the binder isn't rebuilt yet, but no spec imports it, and `vite.config.js` now references `src/data-background.js` which doesn't exist — Playwright's dev server lazily serves files, so the existing specs that import `../src/bg-wc.js` work; the missing `data-background.js` only affects `npm run build`, exercised in Task 3.)

- [ ] **Step 12: Lint + format + commit**

Run: `npm run lint && npm run format:check` (run `npm run format` if needed).
```bash
git add -A
git commit -m "refactor: rename <gl-wc> element to <bg-wc> with back-compat alias layer"
```

---

### Task 2: Binder rename (`data-bg.js` → `data-background.js`)

**Files:**
- Rename: `src/data-bg.js` → `src/data-background.js`
- Modify: the renamed file's contents

- [ ] **Step 1: Rename the file**

```bash
cd /Users/tpowell/src/gl-wc
git mv src/data-bg.js src/data-background.js
```

- [ ] **Step 2: Rewrite `src/data-background.js` for canonical `data-background` + legacy `data-bg`**

Replace the whole file with:
```js
// Opt-in: bind <bg-wc> backgrounds to arbitrary elements via the
// data-background attribute (canonical) or the deprecated data-bg alias.
//
//   <section data-background="dither" data-background-intensity="0.7">
//     <h1>Hero content stays in the light DOM.</h1>
//   </section>
//
// Importing this file:
//   - Defines <bg-wc> (so you don't also have to import bg-wc.js).
//   - Installs a stylesheet that makes annotated elements a positioning host
//     and pushes the injected <bg-wc> behind their content via z-index: -1.
//   - Scans the document on DOMContentLoaded and binds each annotated element.
//   - Watches the DOM for dynamically added annotated nodes.
//
// Param keys mirror bg-wc attributes (kebab-case): data-background-intensity,
// data-background-speed, data-background-color-{1,2,3,bg,fg} (→ --bg-wc-color-*).
// The legacy data-bg / data-bg-* forms still work and warn once.

import './bg-wc.js';

const STYLE_ID = '__bg-wc-data-background-style';
const STYLE = `
[data-background]:not([data-background-skip]),
[data-bg]:not([data-bg-skip]) {
  position: relative;
  isolation: isolate;
}
[data-background]:not([data-background-skip]) > bg-wc[data-bg-element],
[data-bg]:not([data-bg-skip]) > bg-wc[data-bg-element] {
  position: absolute;
  inset: 0;
  z-index: -1;
  display: block;
  pointer-events: none;
}
`;

const BOUND = new WeakSet();
let warnedLegacy = false;

function ensureStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = STYLE;
  (document.head || document.documentElement).appendChild(s);
}

// camelCase remainder → kebab-case (drops the leading namespace segment):
//   intensity → intensity ; pixelRatio → pixel-ratio ; color1 → color-1
function camelToKebab(tail) {
  const t = tail.charAt(0).toLowerCase() + tail.slice(1);
  return t.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

// Resolve the preset name + the dataset namespace ('background' or legacy 'bg').
function resolve(el) {
  if (el.hasAttribute?.('data-background') && !el.hasAttribute('data-background-skip')) {
    return { preset: el.getAttribute('data-background'), ns: 'background', skipKey: 'backgroundSkip' };
  }
  if (el.hasAttribute?.('data-bg') && !el.hasAttribute('data-bg-skip')) {
    if (!warnedLegacy) {
      warnedLegacy = true;
      console.warn(
        'data-bg is deprecated and will be removed in a future major. Use data-background instead.'
      );
    }
    return { preset: el.getAttribute('data-bg'), ns: 'bg', skipKey: 'bgSkip' };
  }
  return null;
}

function bindOne(el) {
  if (BOUND.has(el)) return;
  const info = resolve(el);
  if (!info || !info.preset) return;
  BOUND.add(el);

  const w = document.createElement('bg-wc');
  w.setAttribute('data-bg-element', '');
  w.setAttribute('preset', info.preset);

  // Map data-<ns>-* → attribute or --bg-wc-color-* CSS var.
  const nsKey = info.ns; // 'background' | 'bg'
  for (const key of Object.keys(el.dataset)) {
    if (key === nsKey || key === info.skipKey) continue;
    if (!key.startsWith(nsKey)) continue;
    const tail = key.slice(nsKey.length);
    if (!tail) continue;
    const kebab = camelToKebab(tail);
    const val = el.dataset[key];
    if (kebab.startsWith('color-')) {
      w.style.setProperty(`--bg-wc-${kebab}`, val);
    } else {
      w.setAttribute(kebab, val);
    }
  }

  el.insertBefore(w, el.firstChild);
}

function scanAndBind(root) {
  if (!root) return;
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.matches?.('[data-background], [data-bg]')) bindOne(root);
  root.querySelectorAll?.('[data-background], [data-bg]').forEach(bindOne);
}

let observer = null;
function startObserver() {
  if (observer || typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) scanAndBind(n);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export function bindDataBackgrounds(root = document) {
  ensureStyle();
  scanAndBind(root);
}

export function stopWatching() {
  observer?.disconnect();
  observer = null;
}

if (typeof document !== 'undefined') {
  ensureStyle();
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        scanAndBind(document);
        startObserver();
      },
      { once: true }
    );
  } else {
    scanAndBind(document);
    startObserver();
  }
}
```

Note the dataset namespace detail: for `data-background-intensity`, `el.dataset` key is `backgroundIntensity`, so `nsKey='background'`, `tail='Intensity'` → `intensity`. For legacy `data-bg-intensity`, key is `bgIntensity`, `nsKey='bg'`, `tail='Intensity'` → `intensity`. The `key.startsWith(nsKey)` guard plus skipping the bare `nsKey`/`skipKey` keys handles both. (`data-background` itself is dataset key `background`, skipped; `data-bg` is `bg`, skipped.)

- [ ] **Step 3: Build sanity (the binder must at least parse/serve)**

Run: `npx vite build 2>&1 | tail -20`
Expected: build completes; `dist/bg-wc.js` and `dist/data-background.js` both emitted (full build assertions happen in Task 3). If the build errors, fix before committing.

- [ ] **Step 4: Lint + format + commit**

Run: `npm run lint && npm run format:check` (format if needed).
```bash
git add -A
git commit -m "refactor: rename data-bg binder to data-background (legacy data-bg still bound)"
```

---

### Task 3: Package metadata, build, manifest

**Files:**
- Modify: `package.json`
- Regenerate: `custom-elements.json`

- [ ] **Step 1: Edit `package.json`**

Apply these field changes:
- `"name": "@profpowell/gl-wc"` → `"name": "@profpowell/bg-wc"`
- `"version": "0.1.0"` → `"version": "0.2.0"`
- `"description"`: → `"Theme-aware background web component: animated WebGL & Canvas2D backgrounds behind any HTML content."`
- `"main": "dist/gl-wc.js"` → `"dist/bg-wc.js"`; `"module": "dist/gl-wc.js"` → `"dist/bg-wc.js"`
- `"exports"`:
  ```json
  "exports": {
    ".": "./dist/bg-wc.js",
    "./data-background": "./dist/data-background.js",
    "./data-bg": "./dist/data-background.js",
    "./presets/*": "./dist/presets/*.js"
  },
  ```
- `"sideEffects": ["dist/gl-wc.js"]` → `["dist/bg-wc.js", "dist/data-background.js"]`
- `"repository".url`: `git+https://github.com/ProfPowell/gl-wc.git` → `git+https://github.com/ProfPowell/bg-wc.git`
- `"homepage": "https://profpowell.github.io/gl-wc/"` → `"https://profpowell.github.io/bg-wc/"`
- `"keywords"`: move `"background"` to the front of the array (otherwise unchanged).

Leave `customElements`, `scripts`, `devDependencies`, `files`, `author`, `license`, `type` unchanged.

- [ ] **Step 2: Clean build + verify outputs**

Run: `npm run build && ls dist && ls dist/presets | wc -l`
Expected: `dist/bg-wc.js` and `dist/data-background.js` present; `dist/renderer/`, `dist/util/`, and `dist/presets/` mirror `src/` (preserveModules); preset count matches `src/presets` (56). No build error. There must be NO `dist/gl-wc.js` or `dist/data-bg.js`.

- [ ] **Step 3: Regenerate the custom elements manifest**

Run: `npm run analyze`
Then confirm the manifest references `bg-wc`:
Run: `grep -c '"bg-wc"' custom-elements.json` (expect ≥ 1) and `grep -c '"gl-wc"' custom-elements.json` (the alias subclass may appear — that's fine).

- [ ] **Step 4: Run the test suite (no regressions)**

Run: `npm test`
Expected: PASS (same as Task 1/2).

- [ ] **Step 5: Commit**

```bash
git add package.json custom-elements.json
git commit -m "build: rename package to @profpowell/bg-wc, update exports + manifest"
```

---

### Task 4: Alias regression tests (TDD-style)

**Files:**
- Create: `test/alias-page.html`
- Create: `test/alias.spec.js`

- [ ] **Step 1: Create `test/alias-page.html`**

```html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>bg-wc alias harness</title>
<style> bg-wc, gl-wc { display: block; width: 240px; height: 160px; } </style></head>
<body>
  <gl-wc id="legacy" preset="mesh-gradient"></gl-wc>
  <section id="binder-legacy" data-bg="dither" style="width:240px;height:160px"></section>
  <script type="module" src="../src/data-background.js"></script>
</body></html>
```

- [ ] **Step 2: Write the alias tests**

Create `test/alias.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('<gl-wc> alias upgrades, renders, and warns once', async ({ page }) => {
  const warnings = [];
  page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
  await page.goto('/test/alias-page.html');
  // The element upgrades to the BgWc subclass and produces a canvas.
  await page.waitForFunction(
    () => !!document.getElementById('legacy')?.shadowRoot?.querySelector('canvas')
  );
  const isBgWc = await page.evaluate(() => {
    const el = document.getElementById('legacy');
    return el instanceof customElements.get('bg-wc');
  });
  expect(isBgWc).toBe(true);
  expect(warnings.some((w) => /<gl-wc> is deprecated/.test(w))).toBe(true);
});

test('legacy data-bg still injects a <bg-wc> child and warns', async ({ page }) => {
  const warnings = [];
  page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
  await page.goto('/test/alias-page.html');
  await page.waitForFunction(
    () => !!document.getElementById('binder-legacy')?.querySelector('bg-wc[data-bg-element]')
  );
  expect(warnings.some((w) => /data-bg is deprecated/.test(w))).toBe(true);
});

test('canonical bg-wc:ready also fires a legacy gl-wc:ready twin', async ({ page }) => {
  await page.goto('/test/alias-page.html');
  const got = await page.evaluate(
    () =>
      new Promise((res) => {
        const el = document.getElementById('legacy');
        let bg = false;
        let gl = false;
        const done = () => bg && gl && res({ bg, gl });
        el.addEventListener('bg-wc:ready', () => {
          bg = true;
          done();
        });
        el.addEventListener('gl-wc:ready', () => {
          gl = true;
          done();
        });
        setTimeout(() => res({ bg, gl }), 4000);
      })
  );
  expect(got).toEqual({ bg: true, gl: true });
});
```

- [ ] **Step 3: Add a legacy-CSS-var fallback test to `test/tokens.spec.js`**

After the existing tests in `test/tokens.spec.js`, add a test confirming the canonical override beats the token AND that a legacy override still works. Append:
```js
test('readTokenString prefers --bg-wc override, falls back to --gl-wc', async ({ page }) => {
  await page.goto('/test/tokens-page.html');
  const r = await page.evaluate(() => {
    const host = document.createElement('div');
    host.style.setProperty('--gl-wc-color-1', 'rgb(10, 20, 30)');
    document.body.appendChild(host);
    const legacyOnly = window.readTokenString(host, '--color-primary', [
      '--bg-wc-color-1',
      '--gl-wc-color-1',
    ]);
    host.style.setProperty('--bg-wc-color-1', 'rgb(40, 50, 60)');
    const canonical = window.readTokenString(host, '--color-primary', [
      '--bg-wc-color-1',
      '--gl-wc-color-1',
    ]);
    host.remove();
    return { legacyOnly, canonical };
  });
  expect(r.legacyOnly).toBe('rgb(10, 20, 30)');
  expect(r.canonical).toBe('rgb(40, 50, 60)');
});
```
(Confirm `window.readTokenString` is exposed by `tokens-page.html`; the existing tokens tests call it, so it is. If `tokens-page.html` imports `../src/gl-wc.js`, it was already updated to `../src/bg-wc.js` in Task 1.)

- [ ] **Step 4: Run the suite**

Run: `npm test`
Expected: PASS — all prior tests plus the 3 alias tests and the new tokens fallback test.

- [ ] **Step 5: Commit**

```bash
git add test/alias-page.html test/alias.spec.js test/tokens.spec.js
git commit -m "test: alias regression coverage (<gl-wc>, data-bg, event twins, css-var fallback)"
```

---

### Task 5: Site + README

**Files:**
- Modify: `docs/index.html`, `docs/api.html`, `docs/gallery.js`, `docs/site.css`, `README.md`
- Check: `vite.site.config.js`

- [ ] **Step 1: Read `vite.site.config.js`** and update any reference to `src/gl-wc.js`, `gl-wc.js` asset names, or `gl-wc`-named entries → `bg-wc` equivalents. (If it references the built `dist/gl-wc.js` or the `vbAssets` plugin paths, update only the gl-wc→bg-wc parts.)

- [ ] **Step 2: Update the docs site markup/styles/scripts**

In `docs/index.html`, `docs/api.html`, `docs/gallery.js`, `docs/site.css`: replace the element tag `gl-wc` → `bg-wc` (including `</gl-wc>`, CSS selectors `gl-wc {`, `gl-wc::part`), the binder attribute `data-bg`/`data-bg-*` → `data-background`/`data-background-*`, and CSS vars `--gl-wc-*` → `--bg-wc-*`. Update prose/titles that say "gl-wc" → "bg-wc". Update any import path `gl-wc.js`/`data-bg.js` → `bg-wc.js`/`data-background.js` and any `@profpowell/gl-wc` package specifier → `@profpowell/bg-wc`.

Apply per file (counts to guide completeness — every occurrence must be handled):
- `docs/index.html`: ~13 `gl-wc`
- `docs/api.html`: ~61 `gl-wc`, ~44 `data-bg`
- `docs/gallery.js`: ~12 `gl-wc`
- `docs/site.css`: ~3 `gl-wc`, ~9 `data-bg`

Be careful in `api.html`/`site.css` to convert `data-bg` → `data-background` and `data-bg-<x>` → `data-background-<x>` consistently (the legacy forms still work, but the docs should teach the canonical names). Where event names appear in docs (`gl-wc:ready` etc.), use the canonical `bg-wc:ready` (mention the legacy twin once if the docs have an events section).

- [ ] **Step 3: Rewrite the relevant parts of `README.md`**

Retitle to `bg-wc`. Update the install command to `npm install @profpowell/bg-wc`, usage examples to `<bg-wc>` / `data-background` / `--bg-wc-*` / `@profpowell/bg-wc/data-background`, and any badge/Pages/homepage links from `/gl-wc` to `/bg-wc`. Add a short "Migrating from gl-wc" note: `<gl-wc>`, `data-bg`, `--gl-wc-*`, and `gl-wc:*` events still work but are deprecated; switch to the `bg-wc` names.

- [ ] **Step 4: Verify the site builds**

Run: `npm run build:site 2>&1 | tail -20`
Expected: site build succeeds, no unresolved `gl-wc` import errors.

- [ ] **Step 5: Sanity-grep for stragglers (informational)**

Run: `grep -rn "gl-wc\|data-bg\b\|--gl-wc" docs/ README.md | grep -v "deprecated\|legacy\|Migrating\|gl-wc:" | head -40`
Review the output: remaining hits should only be intentional deprecation/migration mentions or the legacy event twin. Fix any unintended stragglers.

- [ ] **Step 6: Commit**

```bash
git add docs README.md vite.site.config.js
git commit -m "docs: rename site + README to bg-wc (canonical), note gl-wc deprecation"
```

---

### Task 6: Rename the GitHub repo (finish-time)

**Do this only after the feature branch is merged to `main`** (so branch CI runs under the stable name first). This task is executed by the controller during branch finishing, not by a task subagent.

- [ ] **Step 1: Rename the repo**

```bash
gh repo rename bg-wc --repo ProfPowell/gl-wc --yes
```

- [ ] **Step 2: Update the local remote URL**

```bash
cd /Users/tpowell/src/gl-wc
git remote set-url origin https://github.com/ProfPowell/bg-wc.git
git remote -v
```

- [ ] **Step 3: Verify Pages + CI**

Confirm the Pages deploy re-runs and the site is reachable at `https://profpowell.github.io/bg-wc/` (GitHub also redirects the old `/gl-wc/` URL). Confirm Actions are green on `main`.

- [ ] **Step 4: File a follow-up bead for npm deprecation**

```bash
bd create --title="npm deprecate @profpowell/gl-wc -> bg-wc" --type=task --priority=3 \
  --description="After publishing @profpowell/bg-wc@0.2.0, run: npm deprecate @profpowell/gl-wc \"renamed to @profpowell/bg-wc\". Manual step; needs npm auth."
```

---

## Self-Review

**1. Spec coverage:**
- §2.1 element alias → Task 1 Steps 2/7 (`BgWc` + `<gl-wc>` subclass warn-once). ✓
- §2.2 CSS var fallback → Task 1 Steps 3/4/5/8 (STYLE nested var, COLOR_MAPPING arrays, cssVar dual-prefix, readTokenString array). ✓
- §2.3 binder attr → Task 2 (`data-background` canonical + legacy `data-bg` warn). ✓
- §3 package → Task 3. ✓
- §4 file table → Tasks 1/2/3/5 (every listed file). ✓
- §4.1 binder export names preserved (`bindDataBackgrounds`/`stopWatching`) → Task 2 keeps them. ✓
- §5 repo rename → Task 6. ✓
- §6 testing (renamed + alias specs, build outputs, site build) → Tasks 1/3/4/5. ✓
- Events (`bg-wc:*` canonical + `gl-wc:*` twin) → Task 1 Step 6 + Task 4 test. ✓ (Spec §2 implied via "gl-wc:* events keep working"; made explicit here.)

**2. Placeholder scan:** No TBD/TODO. Substitution steps name exact files, old/new snippets, and occurrence counts; new files are given in full. No vague "handle edge cases."

**3. Type/name consistency:** Class `BgWc` defined in Task 1 Step 2, imported by `legacy-alias.js` (Step 7) and re-exported. Binder exports `bindDataBackgrounds`/`stopWatching` unchanged. Event prefix `bg-wc:`/twin `gl-wc:` consistent between Task 1 Step 6 and Task 4. CSS var prefixes `--bg-wc-`/`--gl-wc-` consistent across Steps 3/4/5/8 and the binder's `--bg-wc-color-*`. Vite entry keys `bg-wc`/`data-background` match the package `exports` paths and the `dist/*.js` filenames asserted in Task 3.
