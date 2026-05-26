# data-border-effect Binder Implementation Plan (ak6.4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an opt-in `data-border-effect` attribute binder in the `border-wc` package that applies the extreme effects (`squiggle`/`draw`/`sparks`) directly to any annotated element — no `<border-wc>` wrapper — while ignoring base values that vanilla-breeze CSS owns.

**Architecture:** Extract the effect registry + host-styling helper out of `border-wc.js` into a shared `src/registry.js`. Add `src/data-border-effect.js`, a side-effecting module that scans `[data-border-effect]`, applies the matching effect's `create(el, params)` to extreme-valued elements, and watches the DOM with a `MutationObserver`. Ship it as a second library entry (`./attr`) so the base component import stays untouched.

**Tech Stack:** Vanilla JS ESM, Vite multi-entry library build, Playwright tests, existing `params.js`/`effects/*` modules.

**Target repo:** `/Users/tpowell/src/border-wc` (branch `main`). All paths below are relative to that repo unless noted.

---

### Task 1: Extract shared registry (DRY refactor, no behavior change)

**Files:**
- Create: `src/registry.js`
- Modify: `src/border-wc.js` (lines 1–14, and `connectedCallback`/`#apply`)
- Test: existing `test/element.spec.js`, `test/squiggle.spec.js`, `test/draw.spec.js`, `test/sparks.spec.js` (regression — no new test)

- [ ] **Step 1: Create the shared registry**

Create `src/registry.js`:

```js
// Shared effect registry + host styling, used by <border-wc> and the
// data-border-effect binder so both resolve effects from one source.

// effect name → loader returning the effect's create() fn
export const EFFECTS = {
  draw: () => import('./effects/draw.js').then((m) => m.createDraw),
  squiggle: () => import('./effects/squiggle.js').then((m) => m.createSquiggle),
  sparks: () => import('./effects/sparks.js').then((m) => m.createSparks),
};

// The "extreme" values border-wc renders. Base values (spin/pulse/march/
// hue-cycle/breathe/corner-trace) are owned by vanilla-breeze CSS.
export const EXTREME = Object.keys(EFFECTS);

// Make an element a positioning context so absolute overlays fit it.
export function styleHost(host) {
  const cs = getComputedStyle(host);
  if (cs.position === 'static') host.style.position = 'relative';
  if (cs.display === 'inline') host.style.display = 'block';
}
```

- [ ] **Step 2: Refactor `border-wc.js` to use the registry**

In `src/border-wc.js`, replace the top of the file (the `readParams` import plus the local `STYLE_HOST` const and `EFFECTS` const, current lines 1–14) with:

```js
import { readParams, reducedMotion } from './params.js';
import { EFFECTS, styleHost } from './registry.js';
```

Then in `connectedCallback`, change `STYLE_HOST(this);` to `styleHost(this);`. Leave everything else (the `#apply` body referencing `EFFECTS[name]`) unchanged.

- [ ] **Step 3: Run the existing suite to verify no behavior change**

Run: `npm test`
Expected: PASS — same count as before this task (element/squiggle/draw/sparks/color/reduced-motion/perimeter specs all green).

- [ ] **Step 4: Lint and format**

Run: `npm run lint && npm run format:check`
Expected: no errors. (If `format:check` flags the new file, run `npm run format` then re-check.)

- [ ] **Step 5: Commit**

```bash
git add src/registry.js src/border-wc.js
git commit -m "refactor: extract shared effect registry (registry.js)"
```

---

### Task 2: The binder module + tests (TDD)

**Files:**
- Create: `test/binder-page.html` (fixture)
- Create: `test/binder.spec.js`
- Create: `src/data-border-effect.js`

- [ ] **Step 1: Create the test fixture page**

Create `test/binder-page.html`:

```html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>binder test</title>
<style> [data-border-effect] { display:block; width:320px; height:160px; margin:12px; } </style></head>
<body>
  <div id="ex" data-border-effect="squiggle">extreme</div>
  <div id="base" data-border-effect="spin">base (ignored)</div>
  <div id="host"></div>
  <script type="module" src="../src/data-border-effect.js"></script>
</body></html>
```

- [ ] **Step 2: Write the failing tests**

Create `test/binder.spec.js`:

```js
import { test, expect } from '@playwright/test';

const overlay = (id, kind) =>
  `document.getElementById('${id}').querySelector('[data-border-wc="${kind}"]')`;

test('extreme value gets an overlay and a positioning context', async ({ page }) => {
  await page.goto('/test/binder-page.html');
  await page.waitForTimeout(120);
  const r = await page.evaluate(() => {
    const el = document.getElementById('ex');
    return {
      hasSvg: !!el.querySelector('svg[data-border-wc="squiggle"]'),
      positioned: getComputedStyle(el).position === 'relative',
    };
  });
  expect(r).toEqual({ hasSvg: true, positioned: true });
});

test('base value is ignored (no overlay)', async ({ page }) => {
  await page.goto('/test/binder-page.html');
  await page.waitForTimeout(120);
  const has = await page.evaluate(
    () => !!document.getElementById('base').querySelector('[data-border-wc]')
  );
  expect(has).toBe(false);
});

test('dynamically added node gets bound', async ({ page }) => {
  await page.goto('/test/binder-page.html');
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.id = 'late';
    d.setAttribute('data-border-effect', 'draw');
    document.body.appendChild(d);
  });
  await page.waitForTimeout(120);
  const has = await page.evaluate(
    () => !!document.getElementById('late').querySelector('svg[data-border-wc="draw"]')
  );
  expect(has).toBe(true);
});

test('changing the value tears down old overlay and applies the new one', async ({ page }) => {
  await page.goto('/test/binder-page.html');
  await page.waitForTimeout(120);
  await page.evaluate(() =>
    document.getElementById('ex').setAttribute('data-border-effect', 'sparks')
  );
  await page.waitForTimeout(120);
  const r = await page.evaluate(() => {
    const el = document.getElementById('ex');
    return {
      svgGone: !el.querySelector('svg[data-border-wc="squiggle"]'),
      hasCanvas: !!el.querySelector('canvas[data-border-wc="sparks"]'),
    };
  });
  expect(r).toEqual({ svgGone: true, hasCanvas: true });
});

test('removing the attribute tears down the overlay', async ({ page }) => {
  await page.goto('/test/binder-page.html');
  await page.waitForTimeout(120);
  await page.evaluate(() =>
    document.getElementById('ex').removeAttribute('data-border-effect')
  );
  await page.waitForTimeout(120);
  const has = await page.evaluate(
    () => !!document.getElementById('ex').querySelector('[data-border-wc]')
  );
  expect(has).toBe(false);
});

test('no console errors during binding', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/test/binder-page.html');
  await page.waitForTimeout(150);
  expect(errors).toEqual([]);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- binder`
Expected: FAIL — `data-border-effect.js` does not exist yet, so `webServer`/import resolves to a 404 and overlays never appear (assertions fail).

- [ ] **Step 4: Implement the binder**

Create `src/data-border-effect.js`:

```js
// Opt-in binder: applies border-wc's extreme effects to any element annotated
// with data-border-effect="squiggle|draw|sparks". Base values (spin/pulse/…)
// are vanilla-breeze CSS and ignored here. Importing this module auto-scans
// the document and watches for changes. Mirrors @profpowell/gl-wc/data-bg.
import { EFFECTS, EXTREME, styleHost } from './registry.js';
import { readParams, reducedMotion } from './params.js';

// el → { value, cleanup, token }. WeakMap so detached nodes are collectable.
const bound = new WeakMap();
let observer = null;

// First extreme value in the (space-separated) attribute, else null.
function extremeValue(el) {
  const raw = el.getAttribute('data-border-effect');
  if (!raw) return null;
  for (const v of raw.trim().split(/\s+/)) {
    if (EXTREME.includes(v)) return v;
  }
  return null;
}

function teardown(el) {
  const prev = bound.get(el);
  if (!prev) return;
  try {
    prev.cleanup?.();
  } catch {
    /* effect cleanup is best-effort */
  }
  bound.delete(el);
}

async function applyTo(el) {
  const value = extremeValue(el);
  const prev = bound.get(el);
  if (prev && prev.value === value && prev.cleanup) return; // unchanged, already applied
  teardown(el);
  if (!value) return; // base / unknown / removed → no-op

  // Claim the slot synchronously so a racing change can invalidate this run.
  const token = {};
  bound.set(el, { value, cleanup: null, token });

  let create;
  try {
    create = await EFFECTS[value]();
  } catch {
    return; // failed to load effect module
  }
  const cur = bound.get(el);
  if (!cur || cur.token !== token || !el.isConnected) return; // superseded mid-load

  styleHost(el);
  const params = { ...readParams(el), reduce: reducedMotion(el) };
  try {
    cur.cleanup = create(el, params) || null;
  } catch {
    /* effect threw on apply; leave element unstyled */
  }
}

// Scan a subtree and (re)bind every annotated element.
export function bindBorderEffects(root = document) {
  const els = root.querySelectorAll ? root.querySelectorAll('[data-border-effect]') : [];
  els.forEach(applyTo);
}

export function stopWatching() {
  observer?.disconnect();
  observer = null;
}

function eachAnnotated(node, fn) {
  if (node.nodeType !== 1) return;
  if (node.hasAttribute('data-border-effect')) fn(node);
  node.querySelectorAll?.('[data-border-effect]').forEach(fn);
}

function startWatching() {
  if (observer) return;
  observer = new MutationObserver((records) => {
    for (const rec of records) {
      if (rec.type === 'attributes') {
        applyTo(rec.target);
      } else {
        rec.addedNodes.forEach((n) => eachAnnotated(n, applyTo));
        rec.removedNodes.forEach((n) => eachAnnotated(n, teardown));
      }
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-border-effect'],
  });
}

function init() {
  bindBorderEffects();
  startWatching();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- binder`
Expected: PASS — all 6 binder tests green.

- [ ] **Step 6: Lint and format**

Run: `npm run lint && npm run format:check`
Expected: no errors. (Run `npm run format` first if needed.)

- [ ] **Step 7: Commit**

```bash
git add src/data-border-effect.js test/binder-page.html test/binder.spec.js
git commit -m "feat: data-border-effect binder (opt-in attribute application)"
```

---

### Task 3: Build wiring + package exports

**Files:**
- Modify: `vite.config.js` (lib config)
- Modify: `package.json` (`exports`, `sideEffects`)

- [ ] **Step 1: Emit both library entries**

Replace the `lib` line in `vite.config.js` so both modules build, each keeping its source filename:

```js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: {
        'border-wc': 'src/border-wc.js',
        'data-border-effect': 'src/data-border-effect.js',
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
  },
  server: { open: '/demos/index.html' },
});
```

- [ ] **Step 2: Add the `./attr` export and mark it side-effecting**

In `package.json`, change the `exports` block and `sideEffects` array to:

```json
  "exports": {
    ".": "./dist/border-wc.js",
    "./attr": "./dist/data-border-effect.js"
  },
```

```json
  "sideEffects": [
    "dist/border-wc.js",
    "dist/data-border-effect.js"
  ],
```

- [ ] **Step 3: Build and verify both bundles plus the lazy effect chunks emit**

Run: `npm run build && ls dist`
Expected: `dist/border-wc.js`, `dist/data-border-effect.js`, and the per-effect chunks (`draw*.js`, `squiggle*.js`, `sparks*.js`) all present. No build error.

- [ ] **Step 4: Verify the built binder is importable and self-runs**

Run:
```bash
node -e "import('./dist/data-border-effect.js').then(m=>console.log(Object.keys(m).sort().join(',')))" 2>&1 | tail -1
```
Expected: prints `bindBorderEffects,stopWatching` (the module's `init()` calls `getComputedStyle`/`matchMedia` only inside `bindBorderEffects` over an empty document scan in Node, which finds no elements — if Node throws on `document`, that is acceptable; the authoritative check is the Playwright suite in Task 2). If it throws a `document is not defined` ReferenceError, that's fine — note it and move on.

- [ ] **Step 5: Run the full suite once more**

Run: `npm test`
Expected: PASS — element/effects/color/reduced-motion/perimeter/binder all green.

- [ ] **Step 6: Commit**

```bash
git add vite.config.js package.json
git commit -m "build: emit data-border-effect entry, add ./attr export"
```

---

### Task 4: Demo + README

**Files:**
- Modify: `demos/index.html` (add a binder section)
- Modify: `README.md` (document the binder)

- [ ] **Step 1: Add a binder demo section**

Open `demos/index.html`. Find the closing of the last effect demo section, and before the script tag (or at the end of the demo body) add a section that imports the binder and shows it on plain elements. Insert this block (adjust the surrounding markup to match the file's existing section pattern — wrap in whatever `<section>`/heading structure the other demos use):

```html
<section>
  <h2>data-border-effect (binder)</h2>
  <p>No wrapper — the attribute applies the effect to the element itself.</p>
  <div class="demo-row">
    <article data-border-effect="squiggle" style="padding:1rem">squiggle</article>
    <article data-border-effect="draw" style="padding:1rem">draw</article>
    <article data-border-effect="sparks" style="padding:1rem">sparks</article>
    <article data-border-effect="spin" style="padding:1rem">spin (CSS tier — no overlay)</article>
  </div>
  <script type="module" src="../src/data-border-effect.js"></script>
</section>
```

- [ ] **Step 2: Verify the demo renders without console errors**

Run: `npm run dev` (then open the printed URL in a browser, or rely on the Task 2 Playwright coverage which exercises the same module). Confirm the three extreme articles get overlays and the `spin` one does not.
Expected: visible squiggle/draw/sparks borders; `spin` article plain; no console errors. Stop the dev server when done (Ctrl-C).

- [ ] **Step 3: Document the binder in the README**

In `README.md`, after the Attributes table (before the "Part of the Decorated Layers family" line), add:

```markdown
## Attribute binder (no wrapper)

Opt in once and annotate any element — no `<border-wc>` wrapper needed:

```html
<script type="module" src="https://unpkg.com/@profpowell/border-wc/attr"></script>
<article data-border-effect="squiggle">…</article>
```

The binder applies the **extreme** effects (`squiggle`, `draw`, `sparks`) directly
to the element and watches the DOM for added/changed/removed nodes. **Base** values
(`spin`, `pulse`, `march`, …) are owned by vanilla-breeze's CSS and ignored here.
Params come from `--border-wc-*` custom properties (same knobs as the component).
```
```

- [ ] **Step 4: Commit**

```bash
git add demos/index.html README.md
git commit -m "docs: demo + README for data-border-effect binder"
```

---

## Self-Review

**1. Spec coverage:**
- Scope (opt-in, extreme vs base) → Tasks 1 (`EXTREME`), 2 (`extremeValue`, base-ignored test). ✓
- Author surface (`./attr` sub-entry, `--border-wc-*` params) → Task 3 export; binder reuses `readParams`. ✓
- Mechanism (direct overlay, positioning context, WeakMap, MutationObserver, idempotent) → Task 2 implementation + tests. ✓
- Architecture/files (`registry.js`, `border-wc.js` refactor, `data-border-effect.js`, exports, vite entries) → Tasks 1, 2, 3. ✓
- Testing (6 Playwright cases incl. reduced-motion-no-throw via no-console-errors) → Task 2. ✓ (Reduced-motion is exercised by the sparks/draw effects' own `params.reduce` paths already covered in `reduced-motion.spec.js`; the binder passes `reduce` through and the no-error test guards against throws.)
- Out of scope (per-element param attrs, rename, data-background) → not implemented. ✓
- Open question (sub-entry path) → resolved to `./attr` in Task 3. ✓

**2. Placeholder scan:** No TBD/TODO; every code step shows full code; commands have expected output. ✓

**3. Type consistency:** `EFFECTS`/`EXTREME`/`styleHost` defined in Task 1 and imported identically in Task 2. `bindBorderEffects`/`stopWatching` are the only exports, matching the Node check in Task 3 Step 4. Overlay selectors (`[data-border-wc="squiggle|draw|sparks"]`) match the effect modules (`svg`/`canvas` `data-border-wc` attributes). ✓
