# VB base tokens — borders · scrollbars · cursors (ak6.1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the vanilla-breeze base tier for three decorated surfaces — animated borders (via a new `data-border-effect` attribute API over the existing token machinery), scrollbar theming (new), and cursor theming + opt-in spotlight — shipping the complete border token vocabulary.

**Architecture:** CSS-first extension tokens under `src/tokens/extensions/` (the established `--glass-blur`/`--motion-hover-*` pattern), exposed per-element via `data-border-effect`/`data-scrollbar`/`data-cursor`/`data-spotlight` attributes; one tiny opt-in JS init for the spotlight, lazy-loaded by `src/main.js` exactly like the other `[data-*]` init modules. Builds via esbuild (`npm run build:cdn`) into `dist/cdn/vanilla-breeze*.css|js`.

**Tech Stack:** vanilla-breeze (CSS cascade layers, `@property`, oklch, esbuild), html-validate, Playwright.

**Repo & branch:** Work in `~/src/vanilla-breeze`. Branch off the current active branch: `git checkout -b feat/decorated-base-tokens work/2026-05-21`. (Spec/beads live in gl-wc: `gl-wc-ak6.1`; spec `docs/superpowers/specs/2026-05-25-vb-base-tokens-borders-scrollbars-cursors-design.md`.)

**Audit baseline (verified 2026-05-25):** `animated-borders.css` ships only `spin`+`pulse`, token+theme-driven, no attribute API. `cursors.css` has tokens only, no spotlight. `data-border-style`/`data-border-shape` are existing attribute conventions. No scrollbar extension. `@property` lives top-level in `src/main.css`; the `@property --vb-border-angle` inside `animated-borders.css` is **inside `@layer tokens` and therefore ignored** (latent bug — spin angle is unregistered).

---

## File structure

- **Modify** `src/main.css` — add `@property --vb-border-angle` to the top-level block (fix the ignored-in-layer registration).
- **Modify** `src/tokens/extensions/animated-borders.css` — add the `data-border-effect` attribute API; keep spin/pulse; add march, hue-cycle, breathe, corner-trace; add the complete (extreme-only) token vocabulary; drop the dead in-file `@property`.
- **Create** `src/tokens/extensions/scrollbars.css` — scrollbar tokens, `:root` application, `data-scrollbar` variants.
- **Modify** `src/tokens/extensions/cursors.css` — add spotlight tokens + `[data-spotlight]` CSS.
- **Modify** `src/tokens/extensions/index.css` — register `scrollbars.css`.
- **Create** `src/utils/spotlight-init.js` — opt-in mousemove → CSS var module.
- **Modify** `src/main.js` — lazy-load `spotlight-init.js` when `[data-spotlight]` present.
- **Create** `demos/examples/demos/decorated-base-tokens.html` — specimen (borders/scrollbars/cursors/spotlight).
- **Modify** `admin/reference/llm-theme-reference.css` — document the complete token vocabulary.

---

## Task 1: Branch + register --vb-border-angle correctly

**Files:** Modify `src/main.css`

- [ ] **Step 1: Branch**

```bash
cd ~/src/vanilla-breeze
git checkout -b feat/decorated-base-tokens work/2026-05-21
```

- [ ] **Step 2: Add the @property to main.css top-level block**

In `src/main.css`, in the top-level `@property` block (after the existing `--shape-border` line ~56), add:

```css
@property --vb-border-angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
```

- [ ] **Step 3: Build and verify it lands registered (top-level, not in a layer)**

```bash
npm run build:cdn
grep -n "@property --vb-border-angle" dist/cdn/vanilla-breeze-core.css
```
Expected: a match that is NOT nested inside an `@layer { … }` block.

- [ ] **Step 4: Commit**

```bash
git add src/main.css
git commit -m "fix(borders): register --vb-border-angle at top level so spin interpolates"
```

---

## Task 2: data-border-effect API + new effects + complete vocabulary

**Files:** Modify `src/tokens/extensions/animated-borders.css`

- [ ] **Step 1: Replace the file body** (keep the header comment; update usage docs)

Remove the in-file `@property --vb-border-angle` block (now in main.css). Keep the `:root` spin/pulse tokens and the `vb-border-spin`/`vb-border-pulse` keyframes. Then add the token vocabulary + attribute rules + new effects below. Add to `:root`:

```css
  /* March (dashed marching-ants via background-position) */
  --border-anim-march-duration: 1s;
  --border-anim-march-color: var(--color-primary);
  --border-anim-march-width: 2px;
  /* Hue-cycle */
  --border-anim-hue-duration: 4s;
  --border-anim-hue-width: 3px;
  --border-anim-hue-color: oklch(60% 0.22 260);
  /* Breathe */
  --border-anim-breathe-duration: 2s;
  --border-anim-breathe-color: var(--color-primary);
  /* Corner-trace (hover) */
  --border-anim-trace-duration: 0.18s;
  --border-anim-trace-color: var(--color-primary);
  /* Complete vocabulary — recognized names rendered by the border-wc package
     (Decorated Layers #4), declared here so themes can set them uniformly. */
  --border-anim-squiggle-duration: 2s;
  --border-anim-draw-duration: 1.5s;
  --border-anim-sparks-count: 24;
  --border-anim-liquid-duration: 6s;
```

- [ ] **Step 2: Add the keyframes** (top level of the file)

```css
@keyframes vb-border-march { to { background-position: 32px 0, 100% 32px, -32px 100%, 0 -32px; } }
@keyframes vb-border-hue   { to { filter: hue-rotate(360deg); } }
@keyframes vb-border-breathe { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0; transform: scale(1.06); } }
```

- [ ] **Step 3: Add the `data-border-effect` attribute rules**

```css
/* Per-element opt-in. Base values render here; extreme values (squiggle/draw/
   sparks/liquid) are no-ops until @profpowell/border-wc is loaded. */
[data-border-effect~="spin"] {
  border: var(--border-anim-spin-width) solid transparent;
  background:
    linear-gradient(var(--color-surface-raised), var(--color-surface-raised)) padding-box,
    conic-gradient(from var(--vb-border-angle),
      var(--color-primary), var(--color-secondary), var(--color-accent), var(--color-primary)) border-box;
  animation: vb-border-spin var(--border-anim-spin-duration) linear infinite;
}
[data-border-effect~="pulse"] {
  border: 2px solid var(--border-anim-pulse-color);
  animation: vb-border-pulse var(--border-anim-pulse-duration) ease-in-out infinite;
}
[data-border-effect~="hue-cycle"] {
  border: var(--border-anim-hue-width) solid var(--border-anim-hue-color);
  animation: vb-border-hue var(--border-anim-hue-duration) linear infinite;
}
[data-border-effect~="march"] { position: relative; }
[data-border-effect~="march"]::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  --c: var(--border-anim-march-color);
  background-image:
    repeating-linear-gradient(90deg,  var(--c) 0 8px, transparent 8px 16px),
    repeating-linear-gradient(180deg, var(--c) 0 8px, transparent 8px 16px),
    repeating-linear-gradient(90deg,  var(--c) 0 8px, transparent 8px 16px),
    repeating-linear-gradient(180deg, var(--c) 0 8px, transparent 8px 16px);
  background-size: 16px var(--border-anim-march-width), var(--border-anim-march-width) 16px, 16px var(--border-anim-march-width), var(--border-anim-march-width) 16px;
  background-position: 0 0, 100% 0, 0 100%, 0 0;
  background-repeat: repeat-x, repeat-y, repeat-x, repeat-y;
  animation: vb-border-march var(--border-anim-march-duration) linear infinite;
}
[data-border-effect~="breathe"] { position: relative; isolation: isolate; }
[data-border-effect~="breathe"]::before {
  content: ""; position: absolute; inset: -6px; border-radius: inherit; pointer-events: none;
  border: 2px solid var(--border-anim-breathe-color);
  animation: vb-border-breathe var(--border-anim-breathe-duration) ease-in-out infinite;
}
[data-border-effect~="trace"] { position: relative; }
[data-border-effect~="trace"]::before, [data-border-effect~="trace"]::after {
  content: ""; position: absolute; inset: 0; border: 2px solid transparent; border-radius: inherit; pointer-events: none;
}
[data-border-effect~="trace"]::before { transition: border-block-start-color var(--border-anim-trace-duration) ease 0s, border-inline-end-color var(--border-anim-trace-duration) ease var(--border-anim-trace-duration); }
[data-border-effect~="trace"]::after  { transition: border-block-end-color var(--border-anim-trace-duration) ease calc(2*var(--border-anim-trace-duration)), border-inline-start-color var(--border-anim-trace-duration) ease calc(3*var(--border-anim-trace-duration)); }
[data-border-effect~="trace"]:hover::before { border-block-start-color: var(--border-anim-trace-color); border-inline-end-color: var(--border-anim-trace-color); }
[data-border-effect~="trace"]:hover::after  { border-block-end-color: var(--border-anim-trace-color); border-inline-start-color: var(--border-anim-trace-color); }
```

- [ ] **Step 4: Extend reduced-motion** — in the existing `@media (prefers-reduced-motion: reduce)` and `:root[data-motion-reduced]` blocks, add the new durations:

```css
    --border-anim-march-duration: 0s;
    --border-anim-hue-duration: 0s;
    --border-anim-breathe-duration: 0s;
    --border-anim-trace-duration: 0s;
```

- [ ] **Step 5: Build + verify**

```bash
npm run build:cdn
grep -c "data-border-effect" dist/cdn/vanilla-breeze-core.css   # expect >= 6
grep -c "border-anim-squiggle-duration" dist/cdn/vanilla-breeze-core.css   # expect >= 1 (vocabulary shipped)
```

- [ ] **Step 6: Commit**

```bash
git add src/tokens/extensions/animated-borders.css
git commit -m "feat(borders): data-border-effect API + march/hue/breathe/trace + full vocabulary"
```

---

## Task 3: Scrollbar extension

**Files:** Create `src/tokens/extensions/scrollbars.css`; Modify `src/tokens/extensions/index.css`

- [ ] **Step 1: Create `src/tokens/extensions/scrollbars.css`**

```css
/**
 * Scrollbar Extension
 *
 * Baseline scrollbar-color / scrollbar-width. Themes set the tokens; :root
 * applies them. Per-element variants via data-scrollbar. Zero JS.
 */
:root {
  --scrollbar-thumb: var(--color-border-strong);
  --scrollbar-track: var(--color-surface-sunken);
  --scrollbar-width: thin; /* auto | thin | none */
  --scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
}
:root {
  scrollbar-color: var(--scrollbar-color);
  scrollbar-width: var(--scrollbar-width);
}
[data-scrollbar] { scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track); scrollbar-width: var(--scrollbar-width); }
[data-scrollbar="primary"] { --scrollbar-thumb: var(--color-primary); --scrollbar-track: color-mix(in oklab, var(--color-primary) 12%, var(--color-surface-sunken)); }
[data-scrollbar="minimal"] { --scrollbar-width: thin; --scrollbar-thumb: var(--color-border); }
[data-scrollbar="hidden"]  { scrollbar-width: none; }
[data-scrollbar="auto"]    { scrollbar-width: auto; }
```

- [ ] **Step 2: Register in `src/tokens/extensions/index.css`** — add at the end of the import list:

```css
@import "./scrollbars.css";
```

- [ ] **Step 3: Build + verify**

```bash
npm run build:cdn
grep -c "scrollbar-color" dist/cdn/vanilla-breeze-core.css   # expect >= 1
```

- [ ] **Step 4: Commit**

```bash
git add src/tokens/extensions/scrollbars.css src/tokens/extensions/index.css
git commit -m "feat(scrollbars): themeable scrollbar-color/width tokens + data-scrollbar"
```

---

## Task 4: Cursor spotlight tokens + CSS

**Files:** Modify `src/tokens/extensions/cursors.css`

- [ ] **Step 1: Append spotlight tokens + CSS** (keep the existing cursor tokens)

```css
/* Spotlight — CSS renders a radial gradient from two custom properties that
   spotlight-init.js updates on mousemove. Opt in per element with data-spotlight;
   enable the JS globally with --spotlight-enabled:1 (e.g. on a dramatic theme). */
@property --spotlight-x { syntax: "<percentage>"; inherits: false; initial-value: 50%; }
@property --spotlight-y { syntax: "<percentage>"; inherits: false; initial-value: 50%; }
:root {
  --spotlight-enabled: 0;
  --spotlight-color: oklch(60% 0.10 var(--hue-primary, 260));
  --spotlight-size: 300px;
}
[data-spotlight] { position: relative; }
[data-spotlight]::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(circle var(--spotlight-size) at var(--spotlight-x) var(--spotlight-y),
    color-mix(in oklab, var(--spotlight-color) 35%, transparent) 0%, transparent 70%);
  transition: --spotlight-x 60ms linear, --spotlight-y 60ms linear;
}
@media (prefers-reduced-motion: reduce) { :root { --spotlight-enabled: 0; } }
:root[data-motion-reduced] { --spotlight-enabled: 0; }
```
> Note: the `@property --spotlight-x/y` must end up top-level in the bundle. Since this file imports into `@layer tokens`, **move these two `@property` lines into the `src/main.css` top-level block instead** (mirroring `--vb-border-angle` in Task 1), and leave the rest here.

- [ ] **Step 2: Move the two `@property` lines to `src/main.css`** top-level block; remove them from cursors.css.

- [ ] **Step 3: Build + verify**

```bash
npm run build:cdn
grep -c "data-spotlight" dist/cdn/vanilla-breeze-core.css   # expect >= 1
grep -c "@property --spotlight-x" dist/cdn/vanilla-breeze-core.css   # expect 1 (top level)
```

- [ ] **Step 4: Commit**

```bash
git add src/tokens/extensions/cursors.css src/main.css
git commit -m "feat(cursors): opt-in spotlight tokens + [data-spotlight] gradient"
```

---

## Task 5: Spotlight init JS (opt-in, lazy-loaded)

**Files:** Create `src/utils/spotlight-init.js`; Modify `src/main.js`

- [ ] **Step 1: Create `src/utils/spotlight-init.js`**

```js
// Opt-in cursor spotlight. Lazy-loaded by main.js when [data-spotlight] exists.
// JS only sets two CSS custom properties; CSS renders the gradient.
function wire(el) {
  if (el.__vbSpotlight) return;
  el.__vbSpotlight = true;
  const onMove = (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--spotlight-x', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    el.style.setProperty('--spotlight-y', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  };
  const onLeave = () => {
    el.style.setProperty('--spotlight-x', '50%');
    el.style.setProperty('--spotlight-y', '50%');
  };
  el.addEventListener('mousemove', onMove, { passive: true });
  el.addEventListener('mouseleave', onLeave, { passive: true });
}

function enabled() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--spotlight-enabled').trim();
  return v === '1';
}

export function initSpotlights(root = document) {
  // Respect the global opt-in token; always wire elements that opt in explicitly.
  if (!enabled() && !root.querySelector?.('[data-spotlight]')) return;
  root.querySelectorAll?.('[data-spotlight]').forEach(wire);
}

initSpotlights();
```

- [ ] **Step 2: Lazy-load from `src/main.js`** — add alongside the other `[data-*]` lazy-loads:

```js
if (document.querySelector('[data-spotlight]')) import('./utils/spotlight-init.js');
```

- [ ] **Step 3: Build + verify the JS bundles**

```bash
npm run build:cdn
grep -c "spotlight" dist/cdn/vanilla-breeze.js   # expect >= 1 (lazy chunk or inline)
node -e "require('node:fs').accessSync('dist/cdn/vanilla-breeze.js'); console.log('js built')"
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/spotlight-init.js src/main.js
git commit -m "feat(cursors): opt-in spotlight init (sets --spotlight-x/y on mousemove)"
```

---

## Task 6: Specimen demo + token reference docs

**Files:** Create `demos/examples/demos/decorated-base-tokens.html`; Modify `admin/reference/llm-theme-reference.css`

- [ ] **Step 1: Create the demo** — a single page using `data-border-effect` (all six base values), `data-scrollbar` variants, custom cursors, and a `data-spotlight` zone. Use VB's standard demo shell:

```html
<!doctype html>
<html lang="en" data-mode="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Decorated base tokens — borders · scrollbars · cursors</title>
  <link rel="stylesheet" href="/src/main.css" />
</head>
<body data-layout="stack" data-layout-gap="l" style="padding:2rem; max-width:70rem; margin-inline:auto;">
  <h1>Decorated base tokens</h1>

  <section data-layout="stack" data-layout-gap="s">
    <h2>Animated borders — <code>data-border-effect</code></h2>
    <div data-layout="grid" data-layout-min="14rem">
      <article class="card" data-border-effect="spin">spin</article>
      <article class="card" data-border-effect="pulse">pulse</article>
      <article class="card" data-border-effect="march">march</article>
      <article class="card" data-border-effect="hue-cycle">hue-cycle</article>
      <article class="card" data-border-effect="breathe">breathe</article>
      <article class="card" data-border-effect="trace">trace (hover)</article>
    </div>
  </section>

  <section data-layout="stack" data-layout-gap="s">
    <h2>Scrollbars — <code>data-scrollbar</code></h2>
    <div data-layout="grid" data-layout-min="16rem">
      <div data-scrollbar="primary" style="height:8rem;overflow:auto;border:1px solid var(--color-border);padding:1rem;">Primary thumb.<br>…(repeat lines to force scroll)…</div>
      <div data-scrollbar="minimal" style="height:8rem;overflow:auto;border:1px solid var(--color-border);padding:1rem;">Minimal.<br>…</div>
    </div>
  </section>

  <section data-layout="stack" data-layout-gap="s">
    <h2>Cursors + spotlight</h2>
    <div data-spotlight style="--spotlight-enabled:1;min-height:14rem;border-radius:var(--radius-l);background:oklch(12% 0.02 260);padding:2rem;color:#fff;">
      Move your mouse — the spotlight follows.
    </div>
  </section>

  <script type="module" src="/src/main.js"></script>
</body>
</html>
```
> Fill the scroll boxes with enough lines to force a scrollbar. Mirror the richer specimen content from the original exploration (`gl-wc/docs/border-idea/borders-cursors-scrollbars.html`) if a fuller demo is wanted.

- [ ] **Step 2: Document the complete vocabulary** in `admin/reference/llm-theme-reference.css` — under the "Extension Tokens (opt-in)" / EXTREME THEME checklist, add the new token families:

```css
  /* Animated borders (base: spin/pulse/march/hue-cycle/breathe/trace; vocabulary: squiggle/draw/sparks/liquid → border-wc) */
  --border-anim-spin-*, --border-anim-pulse-*, --border-anim-march-*, --border-anim-hue-*, --border-anim-breathe-*, --border-anim-trace-*, --border-anim-squiggle-*, --border-anim-draw-*, --border-anim-sparks-*, --border-anim-liquid-*
  /* Scrollbars */ --scrollbar-thumb, --scrollbar-track, --scrollbar-width, --scrollbar-color
  /* Cursors */ --cursor-custom-default, --cursor-custom-pointer, --cursor-text, --spotlight-enabled, --spotlight-color, --spotlight-size
```
(Match the file's existing comment style; this is documentation, not active CSS.)

- [ ] **Step 3: Validate the demo HTML**

```bash
npm run lint:html
```
Expected: passes for `demos/examples/demos/decorated-base-tokens.html` (fix any html-validate errors it reports).

- [ ] **Step 4: Commit**

```bash
git add demos/examples/demos/decorated-base-tokens.html admin/reference/llm-theme-reference.css
git commit -m "docs(decor): specimen demo + token vocabulary reference"
```

---

## Task 7: Build, visual check, and finish

**Files:** none (verification)

- [ ] **Step 1: Full build + token presence in BOTH bundles**

```bash
npm run build:cdn
for b in vanilla-breeze-core vanilla-breeze; do
  echo "== $b =="; grep -c "data-border-effect\|scrollbar-color\|data-spotlight" dist/cdn/$b.css
done
```
Expected: non-zero in both core and full bundles.

- [ ] **Step 2: Theme-token coverage + html lint**

```bash
npm run lint:theme-tokens
npm run lint:html
```
Expected: both pass (address any new-token coverage warnings by ensuring tokens have `:root` defaults).

- [ ] **Step 3: Visual sanity (manual or Playwright)**

Start the dev server and open the demo:
```bash
npm run dev   # site dev server; open the demo route, or open demos/examples/demos/decorated-base-tokens.html via the demo server
```
Confirm: spin/march/hue/breathe animate; trace draws on hover; reduced-motion (OS or `:root[data-motion-reduced]`) freezes them; scrollbars are themed; the spotlight follows the cursor in the dark zone. If VB has a visual-regression suite for demos, add/update a snapshot per `npm run test:visual`.

- [ ] **Step 4: Final commit (if any verification fixes) and stop**

```bash
git add -A && git commit -m "chore(decor): verification fixes" || echo "nothing to commit"
```

Then return to gl-wc and mark the bead: `bd update gl-wc-ak6.1 --status completed` (after review), and open a PR / merge per vanilla-breeze's flow.

---

## Notes for the implementer

- **`@property` must be top-level** (in `src/main.css`), never inside an extension file (those import into `@layer tokens` and are ignored). Tasks 1 and 4 handle this.
- **oklch everywhere**; use `color-mix(in oklab, …)` for tints (matches VB).
- **Defaults off / native**: every token has a sensible `:root` default so importing changes nothing until opted in.
- **Don't reimplement** `data-border-style`/`data-border-shape` — `data-border-effect` is a new, separate sub-attribute.
- The dirty files in the repo at start are `dist/` + `.beads/` artifacts only; ignore them (don't commit unrelated dist churn — commit only the files each task names).
