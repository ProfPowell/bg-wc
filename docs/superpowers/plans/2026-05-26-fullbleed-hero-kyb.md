# Full-bleed Docs Hero + api Dark-Default Implementation Plan (gl-wc-kyb)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make both bg-wc docs heroes full-bleed with an offset glass panel (animation reads beside the text), and give api.html the gallery's first-load dark nudge — all while keeping guaranteed text contrast.

**Architecture:** Pure docs change (HTML + CSS + a small shared JS module). Unify `.hero`/`.hero-inner` in `site.css` onto one full-bleed + column-aligned-offset style; move the gallery hero out of `<main>` so it spans the viewport; extract the dark-nudge into `docs/prefer-dark.js` imported by both page entries.

**Tech Stack:** Static HTML/CSS, vanilla JS ESM, Vite site build (`vite.site.config.js`). No framework, no build-config change.

**Target:** `~/src/gl-wc/docs/`. Work on a feature branch `feat/fullbleed-hero-kyb`. Spec: `docs/superpowers/specs/2026-05-26-fullbleed-hero-kyb-design.md`.

---

### Task 1: Shared first-load dark nudge (`prefer-dark.js`)

**Files:**
- Create: `docs/prefer-dark.js`
- Modify: `docs/gallery.js` (remove inline copy, import shared)
- Modify: `docs/docs-entry.js` (import shared)

- [ ] **Step 1: Create `docs/prefer-dark.js`** (verbatim logic from gallery.js, made a reusable module that self-registers on load)

```js
// First-load default: prefer dark (presets pop on dark backgrounds). theme-picker
// starts in "auto" until the visitor chooses, so only override that implicit
// default — an explicit Light/Dark choice (persisted by theme-picker) is left
// untouched. Runs after load so theme-picker has initialized its controls.
// Shared by the gallery (gallery.js) and the API page (docs-entry.js).
export function preferDarkByDefault() {
  const picker = document.querySelector('theme-picker');
  const checked = picker && picker.querySelector('input[type="radio"]:checked');
  if (checked && checked.value === 'auto') {
    const dark = picker.querySelector('input[type="radio"][value="dark"]');
    if (dark) dark.click();
    else document.documentElement.dataset.mode = 'dark';
  } else if (!picker) {
    document.documentElement.dataset.mode = 'dark';
  }
}

window.addEventListener('load', preferDarkByDefault);
```

- [ ] **Step 2: Remove the inline copy from `docs/gallery.js`** and import the shared module instead.

Delete this block from `docs/gallery.js` (the comment + function + listener, currently the tail of the file):
```js
// First-load default: prefer dark (presets pop on dark backgrounds). theme-picker
// starts in "auto" until the visitor chooses, so only override that implicit
// default — an explicit Light/Dark choice (persisted by theme-picker) is left
// untouched. Runs after load so theme-picker has initialized its controls.
function preferDarkByDefault() {
  const picker = document.querySelector('theme-picker');
  const checked = picker && picker.querySelector('input[type="radio"]:checked');
  if (checked && checked.value === 'auto') {
    const dark = picker.querySelector('input[type="radio"][value="dark"]');
    if (dark) dark.click();
    else document.documentElement.dataset.mode = 'dark';
  } else if (!picker) {
    document.documentElement.dataset.mode = 'dark';
  }
}
window.addEventListener('load', preferDarkByDefault);
```
Add an import at the **top** of `docs/gallery.js` (after any existing imports; if there are none, as the first line):
```js
import './prefer-dark.js';
```
(The module self-registers its own `load` listener, so no call is needed.)

- [ ] **Step 3: Import the shared module in `docs/docs-entry.js`.** Append after the existing imports:
```js
import './prefer-dark.js';
```

- [ ] **Step 4: Verify the site still builds**

Run: `cd /Users/tpowell/src/gl-wc && npm run build:site 2>&1 | tail -8`
Expected: build succeeds, no unresolved import of `./prefer-dark.js`.

- [ ] **Step 5: Commit**

```bash
git add docs/prefer-dark.js docs/gallery.js docs/docs-entry.js
git commit -m "feat(docs): shared first-load dark nudge; wire api.html for parity"
```

---

### Task 2: Full-bleed + offset hero styles (`site.css`)

**Files:**
- Modify: `docs/site.css`

- [ ] **Step 1: Replace the gallery hero block.** Find (around line 33):
```css
.hero {
  margin-bottom: 40px; border-radius: 14px; overflow: hidden;
  border: 1px solid var(--color-border);
}
#heroBg { display: block; min-height: 320px; }
```
Replace with:
```css
/* Full-bleed hero, shared by the gallery (<bg-wc> element) and the API page
   (data-background binder). Edge-to-edge animated background; the text sits in
   an offset themed-glass panel aligned to the page content column. */
.hero {
  position: relative;
  overflow: hidden;
  margin: 0 0 40px;
  border: 0;
  border-radius: 0;
  border-bottom: 1px solid var(--color-border);
}
/* Gallery: the <bg-wc> element is the block that gives the hero its height. */
#heroBg { display: block; min-height: clamp(360px, 60vh, 560px); }
```

- [ ] **Step 2: Replace the `.hero-inner` block.** Find (around line 42):
```css
.hero-inner {
  margin: clamp(16px, 4vw, 40px);
  padding: clamp(28px, 4vw, 44px);
  display: flex; flex-direction: column; gap: 14px;
  max-width: 600px;
  background: color-mix(in oklab, var(--color-background) 72%, transparent);
  border: var(--border-width-thin, 1px) solid var(--color-border);
  border-radius: var(--radius-l, 16px);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}
```
Replace with:
```css
/* Offset glass panel: left edge aligned to the 1200px content column, so the
   animation reads in the open space beside it. The themed translucent fill +
   blur guarantee text contrast over any background/theme. */
.hero-inner {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  max-width: 600px;
  margin-block: clamp(20px, 6vh, 64px);
  margin-inline-start: max(
    clamp(16px, 4vw, 24px),
    calc((100% - 1200px) / 2 + clamp(16px, 4vw, 24px))
  );
  margin-inline-end: clamp(16px, 4vw, 24px);
  padding: clamp(28px, 4vw, 44px);
  display: flex; flex-direction: column; gap: 14px;
  text-align: left;
  background: color-mix(in oklab, var(--color-background) 72%, transparent);
  border: var(--border-width-thin, 1px) solid var(--color-border);
  border-radius: var(--radius-l, 16px);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}
```

- [ ] **Step 3: Slim the API-page hero override block.** Find (around line 183):
```css
/* API-page hero (the data-background full-bleed variant). Scoped via [data-background] so it
   does not collide with the gallery's bordered/rounded .hero above. */
.hero[data-background] {
  position: relative;
  min-height: 56vh;
  margin-bottom: 0;
  border: 0;
  border-radius: 0;
  border-bottom: 1px solid var(--color-border);
  display: flex; align-items: center;
  overflow: hidden;
}
.hero[data-background] .hero-inner {
  position: relative; z-index: 2;
  margin: clamp(20px, 5vh, 64px) auto;
  padding: clamp(28px, 5vw, 56px);
  max-width: 760px;
  text-align: center;
  background: color-mix(in oklab, var(--color-background) 74%, transparent);
  border: var(--border-width-thin, 1px) solid var(--color-border);
  border-radius: var(--radius-l, 18px);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}
.hero[data-background] .meta-row { justify-content: center; }
.hero[data-background] h1 {
```
Replace everything from the comment through the `.hero[data-background] .meta-row { … }` line (i.e. the comment, the `.hero[data-background]` block, the `.hero[data-background] .hero-inner` block, and the `.meta-row` line) with just:
```css
/* API hero uses the data-background binder (injected <bg-wc> sits behind at
   z-index:-1). The section itself carries the height + vertical centering,
   since the injected background is absolutely positioned. Panel + full-bleed
   framing come from the shared .hero / .hero-inner rules above. */
.hero[data-background] {
  min-height: clamp(360px, 60vh, 560px);
  display: flex;
  align-items: center;
}
```
**Keep** the `.hero[data-background] h1 { … }` block that immediately follows (the large API title typography) exactly as-is — do not delete it.

- [ ] **Step 4: Verify build**

Run: `npm run build:site 2>&1 | tail -8`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add docs/site.css
git commit -m "style(docs): unify heroes on full-bleed + column-aligned offset panel"
```

---

### Task 3: Move gallery hero out of `<main>`; bump api intensity

**Files:**
- Modify: `docs/index.html`
- Modify: `docs/api.html`

- [ ] **Step 1: In `docs/index.html`, move the hero section out of `<main>`.**

Current structure:
```html
  <main data-layout="stack" data-layout-gap="l">
    <section class="hero">
      <bg-wc preset="mesh-gradient" intensity="0.65" speed="1" density="0.5" id="heroBg">
        <div class="hero-inner" data-layout="stack" data-layout-gap="s">
          ...
        </div>
      </bg-wc>
    </section>

    <section data-layout="stack" data-layout-gap="s">
```
Cut the entire `<section class="hero">…</section>` block and paste it **immediately before** `<main …>` (so it is a direct child of `<body>`, a sibling of `<header>` and `<main>`, matching api.html). Result:
```html
  <section class="hero">
    <bg-wc preset="mesh-gradient" intensity="0.65" speed="1" density="0.5" id="heroBg">
      <div class="hero-inner" data-layout="stack" data-layout-gap="s">
        ...
      </div>
    </bg-wc>
  </section>

  <main data-layout="stack" data-layout-gap="l">
    <section data-layout="stack" data-layout-gap="s">
```
(Leave the hero's inner markup unchanged. The `<header>` element stays where it is, before the hero.)

- [ ] **Step 2: In `docs/api.html`, bump the hero animation intensity.** Find:
```html
  <section class="hero" data-background="mesh-gradient" data-background-intensity="0.65" data-background-speed="0.35">
```
Change `data-background-intensity="0.65"` to `data-background-intensity="0.72"`:
```html
  <section class="hero" data-background="mesh-gradient" data-background-intensity="0.72" data-background-speed="0.35">
```

- [ ] **Step 3: Verify build**

Run: `npm run build:site 2>&1 | tail -8`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add docs/index.html docs/api.html
git commit -m "feat(docs): gallery hero full-bleed (out of main); bump api hero intensity"
```

---

### Task 4: Verify the result in a headless browser

**Files:** none (verification only; throwaway script, not committed)

- [ ] **Step 1: Start the site dev server in the background**

Run: `npm run dev -- --port 5179 &` then wait ~3s for it to be ready. (The dev script is `vite --config vite.site.config.js`.)

- [ ] **Step 2: Run a headless check against both pages** using the already-installed Playwright. Create a throwaway `/tmp/hero-check.mjs`:

```js
import { chromium } from '@playwright/test';
const base = 'http://localhost:5179';
const b = await chromium.launch();
for (const [path, page] of [['/index.html', 'gallery'], ['/api.html', 'api']]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(base + (path === '/index.html' ? '/' : path), { waitUntil: 'load' });
  await p.waitForTimeout(600); // let preferDarkByDefault + theme-picker settle
  const r = await p.evaluate(() => {
    const hero = document.querySelector('.hero');
    const inner = document.querySelector('.hero-inner');
    const hr = hero.getBoundingClientRect();
    const ir = inner.getBoundingClientRect();
    const cs = getComputedStyle(inner);
    return {
      mode: document.documentElement.dataset.mode,
      heroFullWidth: Math.abs(hr.width - window.innerWidth) < 2,
      heroMinH: hr.height,
      panelLeft: Math.round(ir.left),
      panelMaxW: ir.width,
      panelBg: cs.backgroundColor,
      radius: getComputedStyle(hero).borderTopLeftRadius,
    };
  });
  console.log(page, JSON.stringify(r), 'errors:', errs);
  await p.close();
}
await b.close();
```
Run: `node /tmp/hero-check.mjs`

Expected for **both** pages:
- `mode` is `"dark"` (api parity confirmed).
- `heroFullWidth` is `true` (spans the viewport).
- `heroMinH` ≥ 360.
- `panelLeft` ≈ the content column's left edge (~`(1440-1200)/2 + ~24` ≈ `144`, not `0` and not centered ~`420`).
- `panelMaxW` ≤ 600.
- `panelBg` is a non-transparent `rgb(...)`/`color(...)` value (contrast scrim present).
- `radius` is `"0px"` (full-bleed, no rounded card).
- `errors:` empty.

- [ ] **Step 2b: Light-mode contrast spot check.** In the same script you can toggle: after the dark check, run `await p.evaluate(() => document.documentElement.dataset.mode = 'light')`, wait 200ms, and re-read `getComputedStyle(inner).backgroundColor` — confirm it's still a non-transparent themed color (scrim holds in light). (Optional if the dark check already shows a solid scrim; the `color-mix` is theme-driven so both modes are covered by the same rule.)

- [ ] **Step 3: Stop the dev server**

Run: `kill %1` (or find and kill the vite process on port 5179). Remove `/tmp/hero-check.mjs`.

- [ ] **Step 4: Report results** to the controller. If any expectation fails (panel centered, hero not full-width, mode not dark, scrim transparent), fix the corresponding CSS/markup before finishing. No commit in this task unless a fix was needed (then commit the fix with a descriptive message).

---

## Self-Review

**1. Spec coverage:**
- §3.1 full-bleed structure (move gallery hero out of `<main>`; unified `.hero`; `#heroBg` fills; api keeps min-height+flex) → Task 2 Steps 1/3 + Task 3 Step 1. ✓
- §3.2 offset panel aligned to content column (margin math, max-width 600, left text) → Task 2 Step 2. ✓
- §3.3 api dark parity via shared `prefer-dark.js` (extract from gallery.js, import in docs-entry.js) → Task 1. ✓
- §3.4 intensity bump (api 0.65→0.72; gallery unchanged) → Task 3 Step 2. ✓
- §5 verification (build:site; full-width, dark mode, offset left, scrim, no errors) → Task 1/2/3 build steps + Task 4. ✓
- §6 out of scope (no preset/component/binder changes, no copy changes) → respected; only docs files touched. ✓

**2. Placeholder scan:** No TBD/TODO. Every CSS/HTML/JS edit shows exact before→after; verification gives concrete expected values. The Task 4 script is complete runnable code.

**3. Consistency:** `.hero` (full-bleed, radius 0, border-bottom) defined once in Task 2 Step 1 and asserted (`radius "0px"`, `heroFullWidth`) in Task 4. `.hero-inner` offset (`max-width 600`, `margin-inline-start` column math) in Task 2 Step 2, asserted (`panelMaxW ≤ 600`, `panelLeft ≈ 144`) in Task 4. `preferDarkByDefault` exported from `prefer-dark.js` (Task 1 Step 1), imported by gallery.js + docs-entry.js (Steps 2/3), asserted (`mode "dark"`) in Task 4. The api `.hero[data-background] h1` typography block is explicitly preserved (Task 2 Step 3). `#heroBg` `min-height: clamp(360px,60vh,560px)` matches `.hero[data-background] min-height` so both heroes are the same height.
