# Journal Showcase + Publish (sub-project C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish journal's built CDN artifacts and add a full-page showcase that reproduces the research demo using the real journal theme (A), recipe pack (B), border-wc `washi`, and VB `rough-borders`.

**Architecture:** First commit journal's built `dist/cdn` theme+pack artifacts (so `data-theme="journal"` works via ThemeLoader the production way). Then add `demos/examples/demos/journal-theme-showcase.html` (modeled on `art-deco-theme-showcase.html`): `data-theme="journal"` + `main.css`/`main.js` auto-loads the theme, an explicit `<link>` loads the pack CSS, border-wc loads from unpkg, and the rough-border SVG filters are inlined. A server-independent test validates the integrated CSS cascade (incl. the doodle `@layer` override under full VB) plus a static check of the page's wiring.

**Tech Stack:** Static HTML + VB layout custom elements + the journal recipes; Node build (`build:cdn`); Playwright (`from 'playwright/test'`) — CSS injected from the **built** dist files (server-independent, exercises real `@layer` order).

**Repo:** `~/src/vanilla-breeze` (all tasks), executed in an isolated worktree off `origin/main` (currently `b8fee9e3`). **Spec:** `~/src/bg-wc/docs/superpowers/specs/2026-05-31-journal-showcase-design.md`.

**Note on `dist/`:** tracked. Task 1 intentionally commits ONLY journal's dist artifacts; every other dist file `build:cdn` regenerates must be discarded.

---

## File structure

- Commit (Task 1): `dist/cdn/themes/journal.css`(+`.css.map`,`journal.tokens.json`,`journal-dark.tokens.json`), `dist/cdn/packs/journal.full.css`(+`journal.effects.css`), journal entries in `dist/cdn/themes/manifest.json` + `dist/cdn/packs/manifest.json`.
- Create (Task 2): `demos/examples/demos/journal-theme-showcase.html`.
- Create (Task 3): `tests/visual/journal-showcase.spec.js`.

Pure-consume: theme A (`themes/journal.css`), pack B (`packs/journal.full.css`), border-wc `washi` (unpkg `@0.2.0`), rough-borders (`src/assets/rough-border-filters.svg`).

---

## Task 1: Publish journal's CDN artifacts

**Files:** commit selected `dist/cdn/**` journal artifacts only.

- [ ] **Step 1: Build the CDN**

Run: `cd <worktree> && npm run build:cdn`
Expected: completes; builds all themes + packs (including journal).

- [ ] **Step 2: Verify journal artifacts emitted**

```bash
cd <worktree>
test -f dist/cdn/themes/journal.css && echo "theme OK"
test -f dist/cdn/packs/journal.full.css && echo "pack OK"
grep -q '"journal"' dist/cdn/themes/manifest.json && echo "theme manifest OK"
grep -q 'data-callout' dist/cdn/packs/journal.full.css && echo "pack has recipes"
```
Expected: all four echo their OK lines.

- [ ] **Step 3: Stage ONLY journal's dist artifacts + manifests; discard the rest**

```bash
cd <worktree>
git add -f \
  dist/cdn/themes/journal.css dist/cdn/themes/journal.css.map \
  dist/cdn/themes/journal.tokens.json dist/cdn/themes/journal-dark.tokens.json \
  dist/cdn/packs/journal.full.css dist/cdn/packs/journal.effects.css \
  dist/cdn/themes/manifest.json dist/cdn/packs/manifest.json
# discard every other dist change build:cdn produced
git checkout -- dist 2>/dev/null; git clean -fdq dist 2>/dev/null || true
```
(Some listed files may not exist — e.g. no `.map` for a given output. `git add -f` of a missing path errors; if so, drop that path and re-run. Stage whatever journal `themes/journal.*` and `packs/journal.*` files actually exist.)

- [ ] **Step 4: Confirm the staged diff is journal-only**

```bash
cd <worktree> && git status --porcelain && echo "---staged files---" && git diff --cached --name-only
```
Expected: staged list contains ONLY `dist/cdn/themes/journal.*`, `dist/cdn/packs/journal.*`, and the two `manifest.json` files. The manifest diffs must be **journal-only additions** — inspect with `git diff --cached dist/cdn/themes/manifest.json dist/cdn/packs/manifest.json`; if either manifest shows churn to OTHER themes/packs, unstage it (`git restore --staged <manifest>`) and instead hand-add only the `journal` object with an Edit so no unrelated entries change. Working tree must otherwise be clean (no leftover dist).

- [ ] **Step 5: Commit**

```bash
cd <worktree>
git commit -m "build(journal): publish theme + pack CDN artifacts"
```

---

## Task 2: Journal showcase page

**Files:**
- Create: `demos/examples/demos/journal-theme-showcase.html`

- [ ] **Step 1: Create the showcase page**

Create `demos/examples/demos/journal-theme-showcase.html` with EXACTLY this content:

```html
<!doctype html>
<html lang="en" data-theme="journal">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Journal Theme Showcase - Vanilla Breeze</title>
  <!-- VB core: main.js's ThemeLoader auto-loads /cdn/themes/journal.css for data-theme="journal" -->
  <link rel="stylesheet" href="/src/main.css"/>
  <script type="module" src="/src/main.js"></script>
  <!-- Journal recipe pack (the loader does NOT auto-load pack CSS) -->
  <link rel="stylesheet" href="/cdn/packs/journal.full.css"/>
  <!-- border-wc for the washi-tape edge effect -->
  <script type="module" src="https://unpkg.com/@profpowell/border-wc@0.2.0/dist/border-wc.js"></script>
  <style>
    body { padding: var(--size-xl) var(--size-m); }
    .jr-shell { max-inline-size: 60rem; margin-inline: auto; }
    /* Two-column journal spread */
    .jr-spread { display: grid; gap: var(--size-xl); grid-template-columns: 1fr; }
    @media (min-width: 48rem) { .jr-spread { grid-template-columns: 1fr 1fr; } }
    .jr-col { display: flex; flex-direction: column; gap: var(--size-l); min-inline-size: 0; }
    /* Sketch border on the tracker card (rough-borders extension) */
    .jr-sketch { filter: var(--filter-rough-light); }
    /* A washi tape strip is a block border-wc host */
    border-wc[effect="washi"] { display: block; block-size: 34px; }
    .jr-swatches { display: flex; flex-wrap: wrap; gap: 10px; }
    .jr-swatches border-wc { inline-size: 130px; }
    [data-journal="photo"] .jr-pic {
      display: block; inline-size: 100%; block-size: 150px;
      background: linear-gradient(180deg, var(--_journal-sky), var(--_journal-butter));
      border-radius: 1px;
    }
    .jr-lead .jr-kick {
      font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.26em;
      text-transform: uppercase; color: var(--color-text-muted); margin: 0 0 var(--size-2xs);
    }
    .jr-maps { display: grid; gap: var(--size-s); grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); }
    .jr-maps li { list-style: none; border: 1px solid var(--color-border); border-radius: var(--radius-l); padding: var(--size-s) var(--size-m); }
    .jr-maps code { font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-accent); }
    .jr-maps b { font-family: var(--_journal-hand); }
  </style>
</head>
<body>
  <!-- rough-borders filter defs (required in-DOM for filter: url(#vb-rough-*) to resolve) -->
  <svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
    <defs>
      <filter id="vb-rough-light" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id="vb-rough-medium" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id="vb-rough-heavy" x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>
  </svg>

  <div class="jr-shell">
    <div class="jr-lead">
      <p class="jr-kick">decorated layers · theme showcase · vanilla breeze</p>
      <h1>A journaling theme</h1>
      <p>Dot-grid paper, washi tape, and a little handmade imperfection — a surface, decorated edges,
        and soft physical depth. Every element below is a standard component wearing journal tokens.</p>
    </div>

    <!-- The notebook page (binding holes + red margin via the recipe's pseudo-elements) -->
    <div data-journal="page">
      <span data-journal="ribbon"></span>
      <div data-journal="stamp">MAY 31<br>2026</div>

      <!-- washi tape across the top -->
      <border-wc effect="washi" mode="span"
        style="--washi-pattern:stripe;--washi-color:var(--_journal-mint);--washi-torn:fray;margin-block-end:var(--size-l)"></border-wc>

      <h2>May <mark data-tint="mint">’26</mark></h2>
      <p style="font-family:var(--font-mono);font-size:0.75rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--color-text-muted)">week 22 · rapid log</p>

      <div class="jr-spread">
        <div class="jr-col">
          <section>
            <h3>To-do &amp; log</h3>
            <ul data-journal="rapid-log">
              <li data-bullet="dropped">cancel old domain</li>
              <li data-bullet="done">ship border-wc notch fix</li>
              <li data-bullet="task">draft <mark data-tint="butter">shadow-wc</mark> spec</li>
              <li data-bullet="event">3pm — design review</li>
              <li data-bullet="migrated">migrate vine effect to perimeter.js</li>
              <li data-bullet="done">water the monstera</li>
              <li data-bullet="note">idea: container-query washi widths</li>
            </ul>
            <div data-journal="key">
              <span>• task</span><span>✓ done</span><span>✗ dropped</span><span>› migrated</span><span>○ event</span><span>— note</span>
            </div>
          </section>

          <section>
            <h3>Washi swatches</h3>
            <div class="jr-swatches">
              <border-wc effect="washi" mode="span" style="--washi-pattern:stripe;--washi-color:var(--_journal-mint)"></border-wc>
              <border-wc effect="washi" mode="span" style="--washi-pattern:dot;--washi-color:var(--_journal-blush)"></border-wc>
              <border-wc effect="washi" mode="span" style="--washi-pattern:check;--washi-color:var(--_journal-sky)"></border-wc>
              <border-wc effect="washi" mode="span" style="--washi-pattern:grid;--washi-color:var(--_journal-lilac)"></border-wc>
            </div>
          </section>

          <hr data-ornament="doodle"/>
        </div>

        <div class="jr-col">
          <section class="jr-sketch">
            <h3>Habits</h3>
            <table data-journal="tracker">
              <thead>
                <tr><th data-lab></th><th>M</th><th>T</th><th>W</th><th>T</th><th>F</th><th>S</th><th>S</th></tr>
              </thead>
              <tbody>
                <tr style="--_c:var(--_journal-mint)"><td data-lab>read</td><td data-mark="done"></td><td data-mark="done"></td><td data-mark="miss"></td><td data-mark="done"></td><td data-mark="done"></td><td data-mark="miss"></td><td data-mark="miss"></td></tr>
                <tr style="--_c:var(--_journal-sky)"><td data-lab>walk</td><td data-mark="done"></td><td data-mark="done"></td><td data-mark="done"></td><td data-mark="done"></td><td data-mark="miss"></td><td data-mark="done"></td><td data-mark="done"></td></tr>
                <tr style="--_c:var(--_journal-coral)"><td data-lab>water</td><td data-mark="done"></td><td data-mark="miss"></td><td data-mark="done"></td><td data-mark="done"></td><td data-mark="done"></td><td data-mark="miss"></td><td data-mark="done"></td></tr>
              </tbody>
            </table>
          </section>

          <div data-callout="sticky">
            <b>note to self —</b><br>the imperfection <mark data-tint="coral">is</mark> the feature. tiny rotations &amp; jitter = warmth.
          </div>

          <figure data-journal="photo">
            <span class="jr-pic" aria-hidden="true"></span>
            <figcaption>golden hour ☀</figcaption>
          </figure>
        </div>
      </div>
    </div>

    <!-- How it maps to Decorated Layers -->
    <section>
      <h2>How it maps to Decorated Layers</h2>
      <p>A journaling theme isn’t a skin — it’s a stack. Each piece is a standard part wearing journal tokens.</p>
      <ul class="jr-maps">
        <li><b>Dot-grid paper</b><br><code>data-theme="journal"</code> — bg-wc surface concept as the theme’s CSS page background</li>
        <li><b>Washi tape</b><br><code>&lt;border-wc effect="washi"&gt;</code> — border-wc edge effect</li>
        <li><b>Sketch border</b><br><code>filter: var(--filter-rough-light)</code> — VB rough-borders</li>
        <li><b>Sticky note</b><br><code>data-callout="sticky"</code> — journal pack</li>
        <li><b>Taped photo</b><br><code>data-journal="photo"</code> — journal pack</li>
        <li><b>Rapid log</b><br><code>data-journal="rapid-log"</code> + <code>li[data-bullet]</code></li>
        <li><b>Habit tracker</b><br><code>data-journal="tracker"</code> + <code>td[data-mark]</code></li>
        <li><b>Highlighter &amp; doodles</b><br><code>&lt;mark&gt;</code> + <code>hr[data-ornament="doodle"]</code></li>
      </ul>
    </section>

    <footer>
      <p>Journal — part of the Vanilla Breeze extreme theme collection (theme + journal pack + border-wc + rough-borders).</p>
    </footer>
  </div>
</body>
</html>
```

- [ ] **Step 2: Verify the build copies the demo**

Run: `cd <worktree> && npm run build:demos 2>/dev/null || node scripts/build-demos.js`
Then: `test -f dist/demos/examples/demos/journal-theme-showcase.html && echo "demo built OK"`
Expected: `demo built OK` (build-demos auto-discovers `examples/demos/**`). Then DISCARD the dist churn from this verification:
```bash
cd <worktree> && git checkout -- dist 2>/dev/null; git clean -fdq dist 2>/dev/null || true
```
(If `build:demos` is not a script, the `node scripts/build-demos.js` fallback runs it directly; either is fine — this step only verifies discovery.)

- [ ] **Step 3: Commit**

```bash
cd <worktree>
git add demos/examples/demos/journal-theme-showcase.html
git commit -m "demo(journal): theme showcase page (real recipes + washi + rough border)"
```

---

## Task 3: Showcase integration test

**Files:**
- Create: `tests/visual/journal-showcase.spec.js`

- [ ] **Step 1: Write the failing test**

Create `tests/visual/journal-showcase.spec.js`:

```js
/**
 * Journal showcase — integration + page-wiring checks.
 *
 * Part A (cascade): injects the BUILT full VB CSS + journal theme + journal pack
 * from dist/ (so @layer order matches production), sets data-theme="journal",
 * renders representative markup, and asserts the recipes win — including the
 * doodle <hr> overriding VB's base ornament rule (sub-project B's deferred clang).
 *
 * Part B (wiring): statically reads the showcase HTML and asserts it wires the
 * theme, pack, border-wc, rough filters, and the key recipes — no server needed.
 */
import { test, expect } from 'playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dirname, '../..');
const vbCss = readFileSync(join(root, 'dist/cdn/vanilla-breeze.css'), 'utf8');
const themeCss = readFileSync(join(root, 'dist/cdn/themes/journal.css'), 'utf8');
const packCss = readFileSync(join(root, 'dist/cdn/packs/journal.full.css'), 'utf8');
const pageHtml = readFileSync(
  join(root, 'demos/examples/demos/journal-theme-showcase.html'),
  'utf8'
);

async function mountFullStack(page, bodyHtml) {
  await page.setContent('<!doctype html><title>t</title>' + bodyHtml);
  await page.evaluate(
    ({ vbCss, themeCss, packCss }) => {
      // DOM order = cascade/layer order: VB base, then theme tokens, then pack.
      for (const css of [vbCss, themeCss, packCss]) {
        const s = document.createElement('style');
        s.textContent = css;
        document.head.appendChild(s);
      }
      document.documentElement.setAttribute('data-theme', 'journal');
    },
    { vbCss, themeCss, packCss }
  );
}

function css(page, selector, prop, pseudo = null) {
  return page.evaluate(
    ({ selector, prop, pseudo }) =>
      getComputedStyle(document.querySelector(selector), pseudo).getPropertyValue(prop),
    { selector, prop, pseudo }
  );
}

test('cascade: recipes win under full VB; doodle overrides the base ornament', async ({ page }) => {
  await mountFullStack(
    page,
    '<div id="pg" data-journal="page"></div>' +
      '<div id="s" data-callout="sticky">n</div>' +
      '<mark id="m">x</mark>' +
      '<hr id="d" data-ornament="doodle">'
  );
  // theme + recipes apply through the full cascade
  expect(await css(page, '#pg', 'background-image')).toContain('radial-gradient');
  expect(await css(page, '#s', 'transform')).not.toBe('none');
  expect(await css(page, '#m', 'background-image')).toContain('gradient');
  // B's deferred clang: pack's bundle-effects layer must beat VB's base hr[data-ornament]::before
  const ornament = await page.evaluate(
    () => getComputedStyle(document.querySelector('#d'), '::before').content
  );
  expect(ornament).not.toContain('doodle'); // base attr-text is overridden
  const mask =
    (await css(page, '#d', 'mask-image')) || (await css(page, '#d', '-webkit-mask-image'));
  expect(mask).toContain('url('); // squiggle mask applied
});

test('wiring: the showcase page loads theme, pack, border-wc, rough filters, recipes', async () => {
  expect(pageHtml).toContain('data-theme="journal"');
  expect(pageHtml).toContain('/cdn/packs/journal.full.css'); // explicit pack link
  expect(pageHtml).toContain('@profpowell/border-wc@0.2.0'); // pinned border-wc
  expect(pageHtml).toContain('id="vb-rough-light"'); // inlined rough filter defs
  expect(pageHtml).toContain('filter: var(--filter-rough-light)'); // sketch border applied
  // real recipes / packages used
  expect(pageHtml).toContain('data-journal="page"');
  expect(pageHtml).toContain('effect="washi"');
  expect(pageHtml).toContain('data-ornament="doodle"');
  expect(pageHtml).toContain('data-journal="rapid-log"');
  expect(pageHtml).toContain('data-journal="tracker"');
  expect(pageHtml).toContain('data-callout="sticky"');
  expect(pageHtml).toContain('data-journal="photo"');
});
```

- [ ] **Step 2: Run to verify it passes**

Run: `cd <worktree> && npx playwright test journal-showcase`
Expected: PASS — both tests (desktop + mobile). The cascade test depends on Task 1's built dist (`dist/cdn/vanilla-breeze.css`, `themes/journal.css`, `packs/journal.full.css`) being present and Task 2's page existing.

If the doodle override assertion FAILS (base ornament text not overridden), the pack's `@layer bundle-effects` is not out-ranking VB's base layer in this injection order. Fix by ensuring the pack `<style>` is injected LAST (it is) and, if VB's base `hr[data-ornament]` rule is unlayered, escalate a small B follow-up to wrap the doodle rule with higher specificity. Do NOT weaken the assertion.

- [ ] **Step 3: Full journal test sweep + lint**

Run: `cd <worktree> && npx playwright test journal-showcase journal-recipes journal-theme journal-surfaces`
Expected: all journal specs pass, zero failures.
Run: `cd <worktree> && npm run lint:theme-tokens`
Expected: exit 0, no journal FAIL.

- [ ] **Step 4: Commit**

```bash
cd <worktree>
git add tests/visual/journal-showcase.spec.js
git commit -m "test(journal): showcase cascade + page-wiring checks"
```

---

## Self-review notes (verification before done)

- **Spec coverage:** publish journal dist + manifests (Task 1); showcase page via `data-theme` + ThemeLoader + explicit pack link + border-wc unpkg + inlined rough filters, faithful recipe reproduction + maps footer (Task 2); test asserts local stack + doodle override under full VB + (page-wiring includes border-wc presence) (Task 3). Discoverability via build-demos auto-discovery (Task 2 Step 2); no themeRegistry demo field exists, so none added (matches spec §4). All acceptance criteria mapped.
- **Placeholder scan:** none — full HTML + test code inline; exact commands. `<worktree>` is the run-time execution path, not a code placeholder.
- **Consistency:** attribute/recipe names in the page (`data-journal="page/ribbon/stamp/rapid-log/tracker/photo/key"`, `li[data-bullet]`, `td[data-mark]`, `td[data-lab]`, `--_c`, `data-callout="sticky"`, `mark[data-tint]`, `hr[data-ornament="doodle"]`, `effect="washi"`, `--washi-*`, `filter: var(--filter-rough-light)`, `#vb-rough-light`) match B's shipped pack, border-wc's washi API, and the rough-borders extension. The test reads the same built artifacts Task 1 commits.
- **Out of scope (by design):** no source changes to A/B/border-wc/rough-borders; bg-wc unused; no live site deploy.
- **Known risk:** the doodle `@layer` override is the one cross-package cascade unknown; Task 3 Step 2 verifies it and says how to escalate if it loses.
