# Journal Theme — Tokens (sub-project A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `journal` Vanilla Breeze showcase theme — light + "night journal" dark token sets — that any page wears via `data-theme="journal"`.

**Architecture:** A single CSS theme file (`src/tokens/themes/_extreme-journal.css`) modeled on `_extreme-cottagecore.css`, using `[data-theme~="journal"]` selectors and `@import`ed web fonts. The CDN build (`scripts/build-cdn.js`) auto-globs `_extreme-*.css` → `dist/cdn/themes/journal.css`; tier is read from `site/data/themeRegistry.js`. The dot-grid page background reuses VB's `--page-bg-*` tokens (consumed by `src/base/reset.css`).

**Tech Stack:** Plain CSS custom properties; Node build scripts; Playwright (`from 'playwright/test'`) computed-style tests run server-independently by injecting the theme CSS from disk.

**Repo:** `~/src/vanilla-breeze` (ALL tasks). **Spec:** `~/src/bg-wc/docs/superpowers/specs/2026-05-30-journal-theme-tokens-design.md`.

**Note on `dist/`:** `dist/` is tracked in this repo, but a full `npm run build:cdn` regenerates the entire CDN. Do NOT commit the dist churn — Task 2's build step is verification only; discard dist changes afterward. Release builds own `dist/`.

---

## File structure

- Create: `src/tokens/themes/_extreme-journal.css` — the theme (light block + component overrides in Task 1; dark block in Task 2).
- Modify: `site/data/themeRegistry.js` — add the `journal` registry entry (drives lint tier + UI).
- Modify: `scripts/build-cdn.js` — add `'journal'` to `SHOWCASE_THEME_IDS` (manifest tier tag).
- Create: `tests/visual/journal-theme.spec.js` — server-independent computed-style tests (light in Task 1, dark in Task 2).

---

## Task 1: Light token block + registration

**Files:**
- Create: `src/tokens/themes/_extreme-journal.css`
- Modify: `site/data/themeRegistry.js`
- Modify: `scripts/build-cdn.js`
- Create: `tests/visual/journal-theme.spec.js`

- [ ] **Step 1: Write the failing light-mode test**

Create `tests/visual/journal-theme.spec.js`:

```js
/**
 * Journal theme — computed-style checks.
 *
 * Server-independent: reads _extreme-journal.css from disk, injects it, sets
 * data-theme/data-mode on the document element, and asserts the resolved tokens.
 * Lightness is parsed from the oklch() value so the checks survive minor tuning.
 */
import { test, expect } from 'playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dirname, '../..');
const themeCss = readFileSync(join(root, 'src/tokens/themes/_extreme-journal.css'), 'utf8');

// First number after `oklch(` is the lightness (0..1).
function lightnessOf(value) {
  const m = /oklch\(\s*([0-9.]+)/.exec(value);
  return m ? parseFloat(m[1]) : NaN;
}

async function readTokens(page, { mode } = {}) {
  return page.evaluate(
    ({ css, mode }) => {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
      const el = document.documentElement;
      el.setAttribute('data-theme', 'journal');
      if (mode) el.setAttribute('data-mode', mode);
      else el.removeAttribute('data-mode');
      const cs = getComputedStyle(el);
      const get = (n) => cs.getPropertyValue(n).trim();
      return {
        background: get('--color-background'),
        text: get('--color-text'),
        primary: get('--color-primary'),
        accent: get('--color-accent'),
        pageImage: get('--page-bg-image'),
        pageSize: get('--page-bg-size'),
      };
    },
    { css: themeCss, mode }
  );
}

test('light: paper background, ink text, deep-mint primary, dot-grid page bg', async ({ page }) => {
  await page.setContent('<!doctype html><title>t</title>');
  const t = await readTokens(page);
  expect(lightnessOf(t.background)).toBeGreaterThan(0.9); // paper
  expect(lightnessOf(t.text)).toBeLessThan(0.45); // ink
  const pl = lightnessOf(t.primary);
  expect(pl).toBeGreaterThan(0.45); // deep mint, not the pastel (~0.86)
  expect(pl).toBeLessThan(0.65);
  expect(t.pageImage).toContain('radial-gradient'); // dot grid
  expect(t.pageSize).toContain('22px');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd ~/src/vanilla-breeze && npx playwright test journal-theme`
Expected: FAIL — `_extreme-journal.css` does not exist yet (`readFileSync` throws / no tests collected).

- [ ] **Step 3: Create the theme file (light block)**

Create `src/tokens/themes/_extreme-journal.css`:

```css
/**
 * Extreme Theme: Journal
 * Dot-grid paper, washi tape, handmade warmth — a bullet-journal aesthetic.
 *
 * Character: Warm, handmade, analog
 * - Paper / ink / pencil neutrals + a soft pastel accent family
 *   (mint, blush, butter, sky, lilac, coral) and a red margin rule.
 * - Hand-lettered headings (Shantell Sans), serif body (Newsreader),
 *   mono accents (JetBrains Mono).
 * - Small notebook-square radii, warm sepia shadows, minimal motion.
 *
 * Light: warm paper base, deep-mint/coral action colors, faint dot grid.
 * Dark:  "night journal" — deep ink-navy desk, charcoal-navy paper.
 *
 * NOTE: --font-sans is intentionally a SERIF (Newsreader). This is a showcase
 * theme; the dramatic body shift is on purpose — do not "fix" it.
 *
 * The pastel palette lives on as --_journal-* private tokens for the journal
 * component recipes (sub-projects B/C); the semantic action colors below use
 * contrast-safe DEEP variants of those hues.
 */

@import url("https://fonts.googleapis.com/css2?family=Shantell+Sans:ital,wght@0,400;0,600;0,700;1,500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=JetBrains+Mono:wght@400;700&display=swap");

:root[data-theme~="journal"],
[data-theme~="journal"] {
  color-scheme: light;

  /* Theme hints */
  --theme-border-style: rough;
  --theme-icon-set: lucide;

  /* Raw journal palette (private; consumed by journal recipes B/C) */
  --_journal-paper: oklch(0.965 0.018 88);
  --_journal-paper-edge: oklch(0.99 0.01 88);
  --_journal-kraft: oklch(0.81 0.06 72);
  --_journal-ink: oklch(0.32 0.045 262);
  --_journal-pencil: oklch(0.56 0.012 270);
  --_journal-dot: oklch(0.8 0.018 250);
  --_journal-margin: oklch(0.64 0.16 25);
  --_journal-mint: oklch(0.86 0.09 160);
  --_journal-blush: oklch(0.86 0.08 18);
  --_journal-butter: oklch(0.91 0.1 96);
  --_journal-sky: oklch(0.85 0.08 232);
  --_journal-lilac: oklch(0.84 0.08 300);
  --_journal-coral: oklch(0.79 0.13 36);

  /* Surfaces */
  --color-background: var(--_journal-paper);
  --color-surface: var(--_journal-paper-edge);
  --color-surface-alt: oklch(0.95 0.015 88);
  --color-surface-raised: oklch(1 0.004 88);
  --color-surface-sunken: oklch(0.93 0.012 250);

  /* Text */
  --color-text: var(--_journal-ink);
  --color-text-muted: var(--_journal-pencil);
  --color-text-subtle: oklch(0.66 0.012 270);

  /* Action colors — contrast-safe deep variants of the pastel hues */
  --color-primary: oklch(0.55 0.1 165);
  --caret-color: var(--color-primary);
  --color-primary-hover: oklch(0.48 0.1 165);
  --color-primary-subtle: oklch(0.93 0.03 160);
  --color-accent: oklch(0.62 0.16 36);
  --color-accent-hover: oklch(0.55 0.16 36);
  --color-accent-subtle: oklch(0.93 0.04 36);

  /* Status */
  --color-success: oklch(0.58 0.12 150);
  --color-warning: oklch(0.74 0.12 85);
  --color-error: oklch(0.58 0.16 25);
  --color-info: oklch(0.62 0.1 232);

  /* Borders */
  --color-border: var(--_journal-dot);
  --color-border-muted: oklch(0.88 0.012 250);
  --color-border-strong: oklch(0.7 0.02 250);

  /* Typography */
  --_journal-hand: "Shantell Sans", "Comic Sans MS", cursive;
  --font-sans: "Newsreader", Georgia, serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --line-height-normal: 1.5;
  --line-height-tight: 1.25;

  /* Shape — notebook-square */
  --radius-xs: 2px;
  --radius-s: 3px;
  --radius-m: 5px;
  --radius-l: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-full: 9999px;

  /* Shadows — warm sepia paper-lift */
  --shadow-xs: 0 1px 2px oklch(0.4 0.04 60 / 0.1);
  --shadow-sm: 0 2px 5px oklch(0.4 0.04 60 / 0.12);
  --shadow-md: 0 4px 12px oklch(0.4 0.04 60 / 0.16);
  --shadow-lg: 0 10px 24px oklch(0.4 0.04 60 / 0.2);
  --shadow-xl: 0 16px 36px oklch(0.4 0.04 60 / 0.24);
  --shadow-2xl: 0 22px 48px oklch(0.4 0.04 60 / 0.28);

  /* Motion — a journal sits still */
  --duration-instant: 60ms;
  --duration-fast: 110ms;
  --duration-normal: 220ms;
  --duration-slow: 330ms;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);

  /* Page background — paper + faint dot grid (reuses --page-bg-* in reset.css) */
  --page-bg-color: var(--_journal-paper);
  --page-bg-image: radial-gradient(circle, var(--_journal-dot) 1.3px, transparent 1.7px);
  --page-bg-size: 22px 22px;
}

/* Component overrides — hand-lettered headings */
:root[data-theme~="journal"] :is(h1, h2, h3),
[data-theme~="journal"] :is(h1, h2, h3) {
  font-family: var(--_journal-hand);
  color: var(--color-text);
}
```

- [ ] **Step 4: Add the registry entry**

In `site/data/themeRegistry.js`, add this object alongside the other `category: 'extreme'` / `tier: 'showcase'` entries (e.g. right after the `cottagecore` entry — match the surrounding formatting):

```js
  {
    id: 'journal',
    name: 'Journal',
    tier: 'showcase',
    category: 'extreme',
    character: 'Dot-grid paper, washi tape, and handmade warmth',
    colors: { huePrimary: 160, hueSecondary: 232, hueAccent: 36 },
    swatchBg: '#f3ecdc',
    swatchFg: '#27313f',
  },
```

- [ ] **Step 5: Register the build tier**

In `scripts/build-cdn.js`, add `'journal'` to the `SHOWCASE_THEME_IDS` set. Change:

```js
const SHOWCASE_THEME_IDS = new Set([
  'swiss', 'brutalist', 'art-deco', 'editorial',
```
to:
```js
const SHOWCASE_THEME_IDS = new Set([
  'journal',
  'swiss', 'brutalist', 'art-deco', 'editorial',
```

- [ ] **Step 6: Run the light test to verify it passes**

Run: `cd ~/src/vanilla-breeze && npx playwright test journal-theme`
Expected: PASS — `light: paper background, ink text, deep-mint primary, dot-grid page bg` (runs for both `desktop` and `mobile` projects). Do NOT run `lint:theme-tokens` yet — the dark variant lands in Task 2.

- [ ] **Step 7: Commit**

```bash
cd ~/src/vanilla-breeze
git add src/tokens/themes/_extreme-journal.css site/data/themeRegistry.js scripts/build-cdn.js tests/visual/journal-theme.spec.js
git commit -m "feat(theme): journal — light token block + registration"
```

---

## Task 2: Night-journal dark variant + lint gate + build verification

**Files:**
- Modify: `src/tokens/themes/_extreme-journal.css`
- Modify: `tests/visual/journal-theme.spec.js`

- [ ] **Step 1: Add the failing dark-mode test**

In `tests/visual/journal-theme.spec.js`, append:

```js
test('dark: night-journal desk background, paper-white text', async ({ page }) => {
  await page.setContent('<!doctype html><title>t</title>');
  const t = await readTokens(page, { mode: 'dark' });
  expect(lightnessOf(t.background)).toBeLessThan(0.3); // deep ink-navy desk
  expect(lightnessOf(t.text)).toBeGreaterThan(0.8); // warm paper-white
  expect(t.pageImage).toContain('radial-gradient'); // dot grid still present
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/src/vanilla-breeze && npx playwright test journal-theme`
Expected: the new dark test FAILS — with no dark block, `--color-background` is still the light paper (L≈0.965, not < 0.3). The light test still passes.

- [ ] **Step 3: Add the dark variant**

In `src/tokens/themes/_extreme-journal.css`, append the following. The SAME declaration body is used in two selector blocks — the explicit `data-mode="dark"` block and the `prefers-color-scheme: dark` auto-block (VB convention). Paste the full body into both:

```css
/* ===== Night journal (dark) ===== */
:root[data-theme~="journal"][data-mode="dark"],
[data-theme~="journal"][data-mode="dark"] {
  color-scheme: dark;

  --color-background: oklch(0.2 0.02 262);
  --color-surface: oklch(0.25 0.02 262);
  --color-surface-alt: oklch(0.23 0.02 262);
  --color-surface-raised: oklch(0.29 0.02 262);
  --color-surface-sunken: oklch(0.17 0.02 262);

  --color-text: oklch(0.92 0.012 88);
  --color-text-muted: oklch(0.74 0.012 270);
  --color-text-subtle: oklch(0.62 0.012 270);

  --color-primary: oklch(0.8 0.11 165);
  --color-primary-hover: oklch(0.86 0.11 165);
  --color-primary-subtle: oklch(0.32 0.05 165);
  --color-accent: oklch(0.74 0.15 36);
  --color-accent-hover: oklch(0.8 0.15 36);
  --color-accent-subtle: oklch(0.34 0.07 36);

  --color-success: oklch(0.74 0.13 150);
  --color-warning: oklch(0.82 0.12 85);
  --color-error: oklch(0.68 0.16 25);
  --color-info: oklch(0.74 0.1 232);

  --color-border: oklch(0.4 0.02 262);
  --color-border-muted: oklch(0.32 0.02 262);
  --color-border-strong: oklch(0.52 0.03 262);

  --shadow-xs: 0 1px 2px oklch(0 0 0 / 0.4);
  --shadow-sm: 0 2px 5px oklch(0 0 0 / 0.45);
  --shadow-md: 0 4px 12px oklch(0 0 0 / 0.5);
  --shadow-lg: 0 10px 24px oklch(0 0 0 / 0.55);
  --shadow-xl: 0 16px 36px oklch(0 0 0 / 0.6);
  --shadow-2xl: 0 22px 48px oklch(0 0 0 / 0.65);

  --page-bg-color: var(--color-background);
  --page-bg-image: radial-gradient(circle, oklch(0.42 0.02 262) 1.3px, transparent 1.7px);
  --page-bg-size: 22px 22px;
}

@media (prefers-color-scheme: dark) {
  :root[data-theme~="journal"]:not([data-mode="light"]) {
    color-scheme: dark;

    --color-background: oklch(0.2 0.02 262);
    --color-surface: oklch(0.25 0.02 262);
    --color-surface-alt: oklch(0.23 0.02 262);
    --color-surface-raised: oklch(0.29 0.02 262);
    --color-surface-sunken: oklch(0.17 0.02 262);

    --color-text: oklch(0.92 0.012 88);
    --color-text-muted: oklch(0.74 0.012 270);
    --color-text-subtle: oklch(0.62 0.012 270);

    --color-primary: oklch(0.8 0.11 165);
    --color-primary-hover: oklch(0.86 0.11 165);
    --color-primary-subtle: oklch(0.32 0.05 165);
    --color-accent: oklch(0.74 0.15 36);
    --color-accent-hover: oklch(0.8 0.15 36);
    --color-accent-subtle: oklch(0.34 0.07 36);

    --color-success: oklch(0.74 0.13 150);
    --color-warning: oklch(0.82 0.12 85);
    --color-error: oklch(0.68 0.16 25);
    --color-info: oklch(0.74 0.1 232);

    --color-border: oklch(0.4 0.02 262);
    --color-border-muted: oklch(0.32 0.02 262);
    --color-border-strong: oklch(0.52 0.03 262);

    --shadow-xs: 0 1px 2px oklch(0 0 0 / 0.4);
    --shadow-sm: 0 2px 5px oklch(0 0 0 / 0.45);
    --shadow-md: 0 4px 12px oklch(0 0 0 / 0.5);
    --shadow-lg: 0 10px 24px oklch(0 0 0 / 0.55);
    --shadow-xl: 0 16px 36px oklch(0 0 0 / 0.6);
    --shadow-2xl: 0 22px 48px oklch(0 0 0 / 0.65);

    --page-bg-color: var(--color-background);
    --page-bg-image: radial-gradient(circle, oklch(0.42 0.02 262) 1.3px, transparent 1.7px);
    --page-bg-size: 22px 22px;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd ~/src/vanilla-breeze && npx playwright test journal-theme`
Expected: PASS — both light and dark tests (across both projects).

- [ ] **Step 5: Run the theme-token lint gate**

Run: `cd ~/src/vanilla-breeze && npm run lint:theme-tokens`
Expected: exit 0; the `journal` showcase theme reports complete token coverage in both mode variants. If it flags a missing token, add that exact token to the dark block(s) above and re-run until it passes.

- [ ] **Step 6: Verify the CDN build emits the theme (no dist commit)**

Run: `cd ~/src/vanilla-breeze && npm run build:cdn`
Expected: `dist/cdn/themes/journal.css` is generated and `dist/cdn/themes/manifest.json` lists `journal` with `tier: "showcase"`. Verify:

```bash
test -f dist/cdn/themes/journal.css && echo "journal.css OK"
grep -A3 '"journal"' dist/cdn/themes/manifest.json | grep -q 'showcase' && echo "tier OK"
```

Then DISCARD all dist changes (release builds own `dist/`; we don't commit the CDN churn here):

```bash
git checkout -- dist/ 2>/dev/null; git clean -fdq dist/cdn/themes 2>/dev/null || true
git status --porcelain dist | head   # expect no journal-related dist changes staged
```

- [ ] **Step 7: Commit**

```bash
cd ~/src/vanilla-breeze
git add src/tokens/themes/_extreme-journal.css tests/visual/journal-theme.spec.js
git commit -m "feat(theme): journal — night-journal dark variant + lint coverage"
```

---

## Self-review notes (verification before done)

- **Spec coverage:** light token block (Task 1 Step 3) covers §2–§4; private `--_journal-*` palette + deep-variant action colors (Step 3); dot-grid page bg via `--page-bg-*` light + dark (Steps 3 / T2 S3); complete dark variant + lint (T2 S3/S5); `themeRegistry` entry (T1 S4) + `SHOWCASE_THEME_IDS` (T1 S5) + on-demand build emission (T2 S6); computed-style tests light+dark (T1 S1 / T2 S1). All acceptance criteria mapped.
- **Placeholder scan:** none — full CSS and test code inline; exact commands with expected output.
- **Consistency:** test reads `--color-background/-text/-primary/-accent/--page-bg-image/--page-bg-size`; theme defines all of them. `data-theme~="journal"` + `data-mode="dark"` selectors match what the test sets on `document.documentElement`. Registry id `journal` matches the `_extreme-journal.css` filename stem (so `fileToRegistryId` resolves) and the `SHOWCASE_THEME_IDS` entry.
- **Out of scope (by design):** component recipes (B), showcase page + washi/doodles/rough-borders wiring (C), any change to border-wc/bg-wc.
