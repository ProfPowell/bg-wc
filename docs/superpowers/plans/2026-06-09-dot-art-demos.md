# Dot-art Gallery Controls + Showcase Demos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose `dotwork`/`stipple` mode controls in the gallery and add three immersive showcase demos (`dotwork`, `stipple`, `tapestry`) to the demos site.

**Architecture:** Two surfaces. (1) `docs/gallery.js` drives the catalog; it already auto-lists every preset via `listGroups()` and renders mode pills for presets present in its `MODE_OPTIONS` map — so this adds two map entries + two card-default tweaks. (2) `demos/` holds one full-page HTML per showcase, following the `demos/mandala.html` pattern (CSS-var palette, full-bleed `<bg-wc>`, vignette, back-nav, hero, telemetry); the site build auto-globs `demos/*.html`, and `demos/index.html` lists each as a `browser-window` preview card.

**Tech Stack:** Vanilla JS, HTML/CSS, Vite multi-page site build, Playwright (screenshot verification).

**Spec:** `docs/superpowers/specs/2026-06-09-dot-art-demos-design.md`

---

## File Structure

- **Modify** `docs/gallery.js` — add `dotwork` + `stipple` to `MODE_OPTIONS`; add `dotwork`/`tapestry` to `CARD_DEFAULTS`.
- **Create** `demos/dotwork.html` — concentric dot-rosette showcase.
- **Create** `demos/stipple.html` — pointillist field showcase.
- **Create** `demos/tapestry.html` — dense dot-composite showcase.
- **Modify** `demos/index.html` — three new `.bw-card` entries.
- No `vite.site.config.js` change — `demos/*.html` is auto-globbed.

---

## Task 1: Setup — branch + beads issues

**Files:** none (tracking)

- [ ] **Step 1: Confirm branch** — work happens on `feat/dot-art-demos` (already created; the spec is committed there). Verify:

```bash
git branch --show-current   # expect: feat/dot-art-demos
```

- [ ] **Step 2: Create beads issues**

```bash
bd create --title="Dot-art gallery controls + showcase demos" --type=feature --priority=2 --description="Gallery mode pills for dotwork/stipple + 3 immersive demos. Spec: docs/superpowers/specs/2026-06-09-dot-art-demos-design.md"
bd create --title="Gallery mode controls for dotwork/stipple" --type=task --priority=2 --description="Add MODE_OPTIONS + CARD_DEFAULTS entries in docs/gallery.js"
bd create --title="Three dot-art showcase demos" --type=task --priority=2 --description="demos/dotwork.html, stipple.html, tapestry.html following mandala.html pattern"
bd create --title="Demos index cards + site build for dot-art demos" --type=task --priority=2 --description="Add 3 bw-card entries to demos/index.html; verify build:site"
```

- [ ] **Step 3: Claim the gallery task** (`bd ready`, then `bd update <gallery-id> --claim`).

---

## Task 2: Gallery mode controls

**Files:**
- Modify: `docs/gallery.js`

- [ ] **Step 1: Add the two `MODE_OPTIONS` entries**

In `docs/gallery.js`, inside the `MODE_OPTIONS = { … }` object, add these two entries (placement within the object doesn't matter; put them after the `'op-art'` entry):

```js
  dotwork: [
    { label: 'rings', value: 'rings' },
    { label: 'spiral', value: 'spiral' },
    { label: 'double', value: 'double' },
    { label: 'whorl', value: 'whorl' },
    { label: 'waterholes', value: 'waterholes' },
  ],
  stipple: [
    { label: 'field', value: 'field' },
    { label: 'contour', value: 'contour' },
    { label: 'vortex', value: 'vortex' },
  ],
```

(`tapestry` gets NO entry — it has no `mode`, so it correctly renders without pills.)

- [ ] **Step 2: Add the `CARD_DEFAULTS` density bumps**

Replace the existing `CARD_DEFAULTS` object:

```js
const CARD_DEFAULTS = {
  'paper-grain': { intensity: 1 },
};
```

with:

```js
const CARD_DEFAULTS = {
  'paper-grain': { intensity: 1 },
  dotwork: { density: 0.7 },
  tapestry: { density: 0.7 },
};
```

- [ ] **Step 3: Verify the site still builds (catches any JS syntax error in gallery.js)**

Run: `npm run build:site`
Expected: completes with `✓ built` and no error. (`docs/index.html` imports `gallery.js`, so a syntax error would fail the build.)

- [ ] **Step 4: Lint + commit**

```bash
npm run lint -- docs/gallery.js
git add docs/gallery.js
git commit -m "feat(gallery): mode pills for dotwork/stipple + denser dot-art card defaults"
```

(Visual confirmation that the pills switch modes live is done by the controller in the final verification step.)

---

## Task 3: Three showcase demo pages

**Files:**
- Create: `demos/dotwork.html`
- Create: `demos/stipple.html`
- Create: `demos/tapestry.html`

Each file follows the `demos/mandala.html` structure exactly (same element skeleton and class names; only palette, fonts, preset attributes, and copy differ). Copy is technique-focused; no appropriated sacred terms.

- [ ] **Step 1: Create `demos/dotwork.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dotwork &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-background: #160d08;   /* deep earth night */
      --color-foreground: #f5ece0;
      --color-primary: #d2603a;      /* terracotta */
      --color-accent: #e0a83e;       /* ochre */
      --color-info: #3aa6b0;         /* turquoise */
      --color-success: #c7452f;      /* deep red */
      --color-warning: #e8c07a;      /* sand */
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--color-background); color: var(--color-foreground); overflow: hidden; }
    body { font-family: 'Marcellus', Georgia, serif; min-height: 100vh; }
    .stage { position: relative; width: 100vw; height: 100vh; }
    bg-wc.bg { position: absolute; inset: 0; }
    .vignette { position: absolute; inset: 0; z-index: 2; pointer-events: none;
      background: radial-gradient(ellipse 64% 60% at 50% 50%, transparent 28%, rgba(22,13,8,0.88) 100%); }

    .nav { position: absolute; top: 24px; left: 32px; z-index: 12; font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.2em; }
    .nav a { color: var(--color-foreground); text-decoration: none; opacity: 0.7; }
    .nav a:hover { opacity: 1; }

    .content { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); z-index: 6; text-align: center; padding: 0 clamp(20px, 4vw, 80px); }
    .eyebrow { font-family: 'Space Mono', monospace; font-size: 13px; letter-spacing: 0.24em; color: var(--color-accent); opacity: 0.92; margin-bottom: 18px; text-transform: lowercase; }
    h1 { font-weight: 400; font-size: clamp(64px, 13vw, 220px); letter-spacing: 0.04em; line-height: 0.95; margin: 0; text-transform: uppercase;
      background: linear-gradient(180deg, #fff 0%, var(--color-accent) 60%, var(--color-primary) 120%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 6px 30px rgba(210,96,58,0.4)); }
    .lede { max-width: 560px; margin: 22px auto 0; font-size: clamp(16px, 1.3vw, 20px); line-height: 1.55; color: rgba(245,236,224,0.82); }
    .lede code { font-family: ui-monospace, monospace; font-size: 0.85em; background: rgba(255,255,255,0.08); padding: 2px 7px; border-radius: 4px; }

    .telemetry { position: absolute; bottom: 28px; left: 0; right: 0; z-index: 6; display: flex; justify-content: space-between; padding: 0 clamp(28px, 6vw, 80px);
      font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.18em; color: var(--color-accent); opacity: 0.82; flex-wrap: wrap; gap: 12px; }
    .telemetry span { color: var(--color-foreground); opacity: 0.5; padding-right: 6px; }
  </style>
</head>
<body>
  <nav class="nav"><a href="./" target="_top">&larr; Demos</a></nav>

  <main class="stage">
    <bg-wc class="bg" preset="dotwork" mode="rings" intensity="0.65" density="0.7" speed="0.6"></bg-wc>
    <div class="vignette"></div>

    <div class="content">
      <div class="eyebrow">// concentric dot fields &middot; canvas2d</div>
      <h1>Dotwork</h1>
      <p class="lede">
        Rings of hand-placed dots radiating from scattered centers, each rosette turning
        slowly and cycling your palette as it grows. <code>preset="dotwork"</code> &mdash;
        a pointillist field inspired by dot-painting technique, calm behind content.
      </p>
    </div>

    <div class="telemetry">
      <div><span>preset</span>dotwork</div>
      <div><span>render</span>canvas2d</div>
      <div><span>mode</span>rings</div>
      <div><span>palette</span>theme</div>
    </div>
  </main>

  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `demos/stipple.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Stipple &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-background: #0f1430;   /* deep indigo */
      --color-foreground: #f0f3ff;
      --color-primary: #ef6f6c;      /* coral */
      --color-accent: #ffd166;       /* gold */
      --color-info: #4ecdc4;         /* aqua */
      --color-success: #9b5de5;      /* violet */
      --color-warning: #f78c6b;      /* peach */
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--color-background); color: var(--color-foreground); overflow: hidden; }
    body { font-family: 'Fraunces', Georgia, serif; min-height: 100vh; }
    .stage { position: relative; width: 100vw; height: 100vh; }
    bg-wc.bg { position: absolute; inset: 0; }
    .vignette { position: absolute; inset: 0; z-index: 2; pointer-events: none;
      background: radial-gradient(ellipse 66% 62% at 50% 50%, transparent 30%, rgba(15,20,48,0.85) 100%); }

    .nav { position: absolute; top: 24px; left: 32px; z-index: 12; font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.2em; }
    .nav a { color: var(--color-foreground); text-decoration: none; opacity: 0.7; }
    .nav a:hover { opacity: 1; }

    .content { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); z-index: 6; text-align: center; padding: 0 clamp(20px, 4vw, 80px); }
    .eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 13px; letter-spacing: 0.24em; color: var(--color-accent); opacity: 0.92; margin-bottom: 18px; text-transform: lowercase; }
    h1 { font-weight: 600; font-size: clamp(64px, 13vw, 220px); letter-spacing: 0.01em; line-height: 0.95; margin: 0;
      background: linear-gradient(180deg, #fff 0%, var(--color-info) 60%, var(--color-success) 120%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 6px 30px rgba(78,205,196,0.4)); }
    .lede { max-width: 560px; margin: 22px auto 0; font-size: clamp(16px, 1.3vw, 20px); line-height: 1.55; color: rgba(240,243,255,0.82); }
    .lede code { font-family: ui-monospace, monospace; font-size: 0.85em; background: rgba(255,255,255,0.08); padding: 2px 7px; border-radius: 4px; }

    .telemetry { position: absolute; bottom: 28px; left: 0; right: 0; z-index: 6; display: flex; justify-content: space-between; padding: 0 clamp(28px, 6vw, 80px);
      font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.18em; color: var(--color-accent); opacity: 0.82; flex-wrap: wrap; gap: 12px; }
    .telemetry span { color: var(--color-foreground); opacity: 0.5; padding-right: 6px; }
  </style>
</head>
<body>
  <nav class="nav"><a href="./" target="_top">&larr; Demos</a></nav>

  <main class="stage">
    <bg-wc class="bg" preset="stipple" mode="field" intensity="0.7" density="0.6" speed="0.8"></bg-wc>
    <div class="vignette"></div>

    <div class="content">
      <div class="eyebrow">// pointillism &middot; canvas2d</div>
      <h1>Stipple</h1>
      <p class="lede">
        Thousands of tiny dots scattered across the field, their color sampled from a
        smooth gradient through your palette &mdash; a hand-stippled pointillist texture.
        <code>preset="stipple"</code>, with <code>contour</code> and <code>vortex</code>
        flow modes for motion.
      </p>
    </div>

    <div class="telemetry">
      <div><span>preset</span>stipple</div>
      <div><span>render</span>canvas2d</div>
      <div><span>mode</span>field</div>
      <div><span>palette</span>theme</div>
    </div>
  </main>

  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `demos/tapestry.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tapestry &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-background: #0a1230;   /* deep night navy */
      --color-foreground: #ffffff;
      --color-primary: #e63946;      /* red */
      --color-accent: #f4a261;       /* amber */
      --color-info: #48cae4;         /* sky */
      --color-success: #2a9d8f;      /* teal */
      --color-warning: #e9c46a;      /* gold */
      --color-error: #9d4edd;        /* violet */
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--color-background); color: var(--color-foreground); overflow: hidden; }
    body { font-family: 'Cormorant Garamond', Georgia, serif; min-height: 100vh; }
    .stage { position: relative; width: 100vw; height: 100vh; }
    bg-wc.bg { position: absolute; inset: 0; }
    .vignette { position: absolute; inset: 0; z-index: 2; pointer-events: none;
      background: radial-gradient(ellipse 60% 56% at 50% 50%, transparent 22%, rgba(10,18,48,0.9) 100%); }

    .nav { position: absolute; top: 24px; left: 32px; z-index: 12; font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.2em; }
    .nav a { color: var(--color-foreground); text-decoration: none; opacity: 0.7; }
    .nav a:hover { opacity: 1; }

    .content { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); z-index: 6; text-align: center; padding: 0 clamp(20px, 4vw, 80px); }
    .eyebrow { font-family: 'Space Mono', monospace; font-size: 13px; letter-spacing: 0.24em; color: var(--color-accent); opacity: 0.92; margin-bottom: 18px; text-transform: lowercase; }
    h1 { font-weight: 700; font-size: clamp(64px, 13vw, 220px); letter-spacing: 0.02em; line-height: 0.95; margin: 0; text-transform: uppercase;
      background: linear-gradient(180deg, #fff 0%, var(--color-info) 55%, var(--color-error) 120%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 6px 34px rgba(72,202,228,0.4)); }
    .lede { max-width: 580px; margin: 22px auto 0; font-size: clamp(16px, 1.3vw, 20px); line-height: 1.55; color: rgba(255,255,255,0.82); }
    .lede code { font-family: ui-monospace, monospace; font-size: 0.85em; background: rgba(255,255,255,0.10); padding: 2px 7px; border-radius: 4px; }

    .telemetry { position: absolute; bottom: 28px; left: 0; right: 0; z-index: 6; display: flex; justify-content: space-between; padding: 0 clamp(28px, 6vw, 80px);
      font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.18em; color: var(--color-accent); opacity: 0.82; flex-wrap: wrap; gap: 12px; }
    .telemetry span { color: var(--color-foreground); opacity: 0.5; padding-right: 6px; }
  </style>
</head>
<body>
  <nav class="nav"><a href="./" target="_top">&larr; Demos</a></nav>

  <main class="stage">
    <bg-wc class="bg" preset="tapestry" intensity="0.7" density="0.75" speed="0.5"></bg-wc>
    <div class="vignette"></div>

    <div class="content">
      <div class="eyebrow">// dense dot composite &middot; canvas2d</div>
      <h1>Tapestry</h1>
      <p class="lede">
        A pointillist field packed edge to edge with dot rosettes and whorls in every
        palette color &mdash; a dense, woven backdrop that page content layers over.
        <code>preset="tapestry"</code>, built from the full theme palette.
      </p>
    </div>

    <div class="telemetry">
      <div><span>preset</span>tapestry</div>
      <div><span>render</span>canvas2d</div>
      <div><span>layers</span>field + rings + whorls</div>
      <div><span>palette</span>theme</div>
    </div>
  </main>

  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 4: Verify they build**

Run: `npm run build:site`
Expected: `✓ built`; confirm the three files emitted:

```bash
ls dist-site/demos/dotwork.html dist-site/demos/stipple.html dist-site/demos/tapestry.html
```

Expected: all three listed.

- [ ] **Step 5: Commit**

```bash
git add demos/dotwork.html demos/stipple.html demos/tapestry.html
git commit -m "feat(demos): dot-art showcase pages (dotwork, stipple, tapestry)"
```

---

## Task 4: Demos index cards

**Files:**
- Modify: `demos/index.html`

- [ ] **Step 1: Add three cards**

In `demos/index.html`, inside the `<div class="demos">` grid, immediately AFTER the existing Mandala card (the `.bw-card` whose `data-demo-src="./mandala.html"`), insert:

```html
      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./dotwork.html" title="Dotwork"
                        url="profpowell.github.io/bg-wc/demos/dotwork.html"></browser-window>
        <a class="bw-open" href="./dotwork.html" aria-label="Open the Dotwork demo"></a>
        <div class="meta"><span class="name">Dotwork</span><span class="desc">concentric dots</span></div>
      </div>
      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./stipple.html" title="Stipple"
                        url="profpowell.github.io/bg-wc/demos/stipple.html"></browser-window>
        <a class="bw-open" href="./stipple.html" aria-label="Open the Stipple demo"></a>
        <div class="meta"><span class="name">Stipple</span><span class="desc">pointillist field</span></div>
      </div>
      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./tapestry.html" title="Tapestry"
                        url="profpowell.github.io/bg-wc/demos/tapestry.html"></browser-window>
        <a class="bw-open" href="./tapestry.html" aria-label="Open the Tapestry demo"></a>
        <div class="meta"><span class="name">Tapestry</span><span class="desc">dot composite</span></div>
      </div>
```

- [ ] **Step 2: Update the page `<meta name="description">` if it enumerates demos**

Open `demos/index.html`, check the `<meta name="description">` content. If it lists example demo names, optionally append "dot art". If it's generic, leave it. (Non-blocking; do not invent a new description.)

- [ ] **Step 3: Verify the build still succeeds**

Run: `npm run build:site`
Expected: `✓ built`, no error.

- [ ] **Step 4: Commit**

```bash
git add demos/index.html
git commit -m "docs(demos): index cards for dot-art showcase demos"
```

---

## Task 5: Verification + integration (controller-run)

**Files:** none (verification + merge)

- [ ] **Step 1: Full site build + presence check**

```bash
npm run build:site
ls dist-site/demos/dotwork.html dist-site/demos/stipple.html dist-site/demos/tapestry.html
```

Expected: build clean; all three present.

- [ ] **Step 2: Screenshot each demo (high-touch render check)**

Start the dev server in the background and screenshot each demo via Playwright (or the Playwright/Chrome MCP). Confirm: dot art is visibly rendered (not a blank/solid field), the hero text reads cleanly over it, and nothing overflows.

```bash
npm run dev   # background; serves at the printed localhost port
```

Navigate to `/demos/dotwork.html`, `/demos/stipple.html`, `/demos/tapestry.html`; capture a screenshot of each; inspect.

- [ ] **Step 3: Gallery mode-pill check**

Navigate to `/docs/index.html`. In the Ornamental group, find the `dotwork` card and confirm mode pills (rings/spiral/double/whorl/waterholes) appear and clicking one changes the rendered card. In the Texture group, confirm the `stipple` card shows field/contour/vortex pills. Confirm the `tapestry` card renders with NO pills.

- [ ] **Step 4: Quality gates** (these surfaces don't change `src/`, but run the lib gates to be safe)

```bash
npm run lint
npm run format:check
```

Expected: clean. (No `cem:check`/preset tests needed — no `src/` exports changed. `gallery.js` is covered by the build.)

- [ ] **Step 5: Close beads issues**

```bash
bd close <gallery-id> <demos-id> <index-id> <epic-id>
```

- [ ] **Step 6: Integrate** — use `superpowers:finishing-a-development-branch` to merge `feat/dot-art-demos` to `main`, then complete the session-close protocol:

```bash
git pull --rebase
git push
git status   # MUST show up to date with origin
```

---

## Notes for the implementer

- **Match `demos/mandala.html` exactly** for structure/class names — only palette, fonts, preset attributes, and copy change. This keeps the demos consistent with the existing 44.
- **Copy stays technique-focused** (pointillism, dotwork, concentric dot fields). Do NOT use appropriated sacred terms ("songlines", "Dreaming") in demo copy.
- **Theme colors drive the dots.** Each demo sets `--color-*` CSS vars; `tapestry` sets all six accent roles for the full multicolor look, the others set a coherent subset. The presets read these every frame via `getColors()`.
- **No vite config change** — `demos/*.html` is auto-globbed into the site build.
- **Prettier** likely does not format `.html` here (the repo's format:check passed on the existing demos); only run `--write` on a file `format:check` actually flags.
