# border-wc CSS-first refresh — Implementation Plan

**Goal:** Retire 4 weak effects, add 6 CSS-first effects, refactor 2 existing effects, refresh the gallery + docs. End state: 19 effects, ~54 tests passing, GH Pages green.

**Architecture:** Per-effect modules under `src/effects/` continue to follow the `create<Name>(host, params) => cleanup` shape. The new effects lean on `@property`/conic-gradient, `mask-composite: exclude`, scrolling-pseudo gradients, stacked `box-shadow`, animated `clip-path`, SVG `feGaussianBlur+feMerge` filters, and `offset-path`. Two new helpers — `ensureStyles(key, css)` (inject `<style>` once) and `ensureAngleProperty()` (register `--bwc-angle` once) — keep per-effect modules small.

**Tech Stack:** Vanilla JS ESM, Vite, Playwright, vanilla-breeze tokens. No new dependencies.

---

## File structure

- **Modify:** `src/registry.js` (drop 4, add 6, keep refactor names)
- **Modify:** `src/effects/_helpers.js` (add `ensureStyles`, `ensureAngleProperty`)
- **Delete:** `src/effects/{grass,vines,flames,fireflies}.js`, `test/{grass,vines,flames,fireflies}.spec.js`
- **Create:** `src/effects/{aurora,barber,chroma,wings,neon,marquee}.js` + `test/{aurora,barber,chroma,wings,neon,marquee}.spec.js`
- **Rewrite:** `src/effects/{lightning,sparks}.js` (same export name + signature)
- **Rewrite:** `docs/index.html` (19 cards, 7 sections), `docs/playground.js` (keep current `data-effect`/`data-knob` pattern)
- **Modify:** `docs/api.html` (catalog table), `README.md` (effect list), `test/registry.spec.js` (`ALL_EFFECTS` list)

---

### Task 1: Helpers + retire 4 effects + registry update

**Files:**
- Modify: `src/effects/_helpers.js`
- Modify: `src/registry.js`
- Delete: `src/effects/{grass,vines,flames,fireflies}.js`, `test/{grass,vines,flames,fireflies}.spec.js`
- Modify: `test/registry.spec.js`

- [ ] **Step 1: Extend `_helpers.js`**

Append to `src/effects/_helpers.js`:

```js
// Inject a <style> tag once, keyed by `key`. Subsequent calls are no-ops.
const STYLE_KEYS = new Set();
export function ensureStyles(key, css) {
  if (STYLE_KEYS.has(key)) return;
  const style = document.createElement('style');
  style.setAttribute('data-border-wc-styles', key);
  style.textContent = css;
  document.head.appendChild(style);
  STYLE_KEYS.add(key);
}

// Register the --bwc-angle CSS @property once (no-op if unsupported or already
// registered). Used by aurora for smooth conic-gradient rotation.
let ANGLE_REGISTERED = false;
export function ensureAngleProperty() {
  if (ANGLE_REGISTERED) return;
  ANGLE_REGISTERED = true;
  if (typeof CSS === 'undefined' || !CSS.registerProperty) return;
  try {
    CSS.registerProperty({
      name: '--bwc-angle',
      syntax: '<angle>',
      inherits: false,
      initialValue: '0deg',
    });
  } catch (_e) { /* already registered or invalid */ }
}
```

- [ ] **Step 2: Update `src/registry.js`**

Replace the `EFFECTS` map:

```js
export const EFFECTS = {
  // Modern CSS
  aurora: () => import('./effects/aurora.js').then((m) => m.createAurora),
  barber: () => import('./effects/barber.js').then((m) => m.createBarber),
  chroma: () => import('./effects/chroma.js').then((m) => m.createChroma),
  wings: () => import('./effects/wings.js').then((m) => m.createWings),
  // Energy
  lightning: () => import('./effects/lightning.js').then((m) => m.createLightning),
  neon: () => import('./effects/neon.js').then((m) => m.createNeon),
  glitch: () => import('./effects/glitch.js').then((m) => m.createGlitch),
  // Retro / Craft
  ascii: () => import('./effects/ascii.js').then((m) => m.createAscii),
  stitching: () => import('./effects/stitching.js').then((m) => m.createStitching),
  typewriter: () => import('./effects/typewriter.js').then((m) => m.createTypewriter),
  // Pattern
  'barbed-wire': () => import('./effects/barbed-wire.js').then((m) => m.createBarbedWire),
  rope: () => import('./effects/rope.js').then((m) => m.createRope),
  scallop: () => import('./effects/scallop.js').then((m) => m.createScallop),
  // Trippy
  psychedelic: () => import('./effects/psychedelic.js').then((m) => m.createPsychedelic),
  plasma: () => import('./effects/plasma.js').then((m) => m.createPlasma),
  // Marquee
  sparks: () => import('./effects/sparks.js').then((m) => m.createSparks),
  marquee: () => import('./effects/marquee.js').then((m) => m.createMarquee),
  // Originals
  squiggle: () => import('./effects/squiggle.js').then((m) => m.createSquiggle),
  draw: () => import('./effects/draw.js').then((m) => m.createDraw),
};
```

- [ ] **Step 3: Delete retired effect files + tests**

```bash
git rm src/effects/grass.js src/effects/vines.js src/effects/flames.js src/effects/fireflies.js \
       test/grass.spec.js test/vines.spec.js test/flames.spec.js test/fireflies.spec.js
```

- [ ] **Step 4: Update `test/registry.spec.js`**

Replace `ALL_EFFECTS` with the 19-name list. (Modules `aurora`, `barber`, `chroma`, `wings`, `neon`, `marquee` don't exist yet — the test will fail. Skip those entries until Task 7.) For now use a constant `EXISTING_EFFECTS` containing the 13 effects still on disk plus a `pending` list for the new 6; the suite imports both, asserts the EXTREME registry contains the union, but only runs reduced-motion for `EXISTING_EFFECTS`. After Task 7 collapse them.

```js
const NEW_EFFECTS = ['aurora','barber','chroma','wings','neon','marquee'];
const EXISTING_EFFECTS = [
  'lightning','glitch','ascii','stitching','typewriter',
  'barbed-wire','rope','scallop','psychedelic','plasma',
  'sparks','squiggle','draw',
];
const ALL_EFFECTS = [...EXISTING_EFFECTS, ...NEW_EFFECTS].sort();
```

The registry test asserts the EXTREME export equals ALL_EFFECTS. The reduced-motion sweep loops `EXISTING_EFFECTS` only for now.

- [ ] **Step 5: Verify build still passes; commit**

```bash
npm run build 2>&1 | tail -2   # expect: builds OK with broken imports for new effects? No — registry.js has imports for files that don't exist, but they're lazy. Lazy import() doesn't fail at build time. Verify.
# If build fails, swap the 6 new effect loaders for stubs returning the draw module until each task lands. For now, expect lazy import() to be fine — vite doesn't statically resolve dynamic-import targets it can't find. Confirm.
npm test 2>&1 | tail -3   # expect: existing tests pass; new effects' reduce-motion sweep is excluded; ALL_EFFECTS assertion may fail because new effects' lazy import will throw on first access. Adjust by guarding the registry-test assertion to skip name-resolution and just check EXTREME keys.
git add -A
git commit -m "chore(effects): retire grass/vines/flames/fireflies + extend helpers"
```

If lazy imports of nonexistent modules cause Playwright failures in registry.spec.js, gate the new names: assert `EXTREME` contains a superset of EXISTING_EFFECTS, and revisit the exact-equality after Task 7.

---

### Task 2: `aurora` (new)

**Files:**
- Create: `src/effects/aurora.js`
- Create: `test/aurora.spec.js`

- [ ] **Step 1: Implement aurora**

```js
import { resolveRadius } from '../params.js';
import { ensureAngleProperty, ensureStyles } from './_helpers.js';

const AURORA_CSS = `
  [data-border-wc="aurora"] { position: absolute; inset: 0; pointer-events: none;
    border-radius: inherit; border-radius: var(--bwc-radius, 12px);
    padding: var(--bwc-thickness, 2px);
    background: conic-gradient(from var(--bwc-angle, 0deg), var(--bwc-stops));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
  }
  [data-border-wc="aurora-halo"] { position: absolute; inset: calc(-1 * var(--bwc-thickness, 2px) * 4);
    pointer-events: none; border-radius: calc(var(--bwc-radius, 12px) + var(--bwc-thickness, 2px) * 4);
    background: conic-gradient(from var(--bwc-angle, 0deg), var(--bwc-stops));
    filter: blur(calc(var(--bwc-thickness, 2px) * 6)); opacity: 0.55; z-index: -1;
  }
  @keyframes bwc-aurora-spin { to { --bwc-angle: 360deg; } }
`;

function ensurePositioned(host) {
  const cs = getComputedStyle(host);
  if (cs.position === 'static') host.style.position = 'relative';
}

function paletteFor(color) {
  // Accept a comma list, or fall back to a 4-stop theme palette.
  const parts = (color || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    // Close the loop so the gradient is seamless.
    return [...parts, parts[0]].join(', ');
  }
  if (parts.length === 1) {
    const c = parts[0];
    return `${c}, transparent 40%, ${c}`;
  }
  return 'oklch(0.72 0.18 30), oklch(0.72 0.18 220), oklch(0.72 0.18 140), oklch(0.72 0.18 300), oklch(0.72 0.18 30)';
}

export function createAurora(host, params) {
  ensurePositioned(host);
  ensureAngleProperty();
  ensureStyles('aurora', AURORA_CSS);

  const stops = paletteFor(params.color === 'currentColor' ? '' : params.color);
  const radius = resolveRadius(host, params);

  const halo = document.createElement('div');
  halo.setAttribute('data-border-wc', 'aurora-halo');
  const ring = document.createElement('div');
  ring.setAttribute('data-border-wc', 'aurora');
  for (const el of [halo, ring]) {
    el.style.setProperty('--bwc-thickness', `${params.thickness}px`);
    el.style.setProperty('--bwc-radius', `${radius}px`);
    el.style.setProperty('--bwc-stops', stops);
  }
  host.appendChild(halo);
  host.appendChild(ring);

  if (!params.reduce && params.animate !== false) {
    const dur = Math.max(800, params.speed * 4);
    ring.style.animation = `bwc-aurora-spin ${dur}ms linear infinite`;
    halo.style.animation = `bwc-aurora-spin ${dur}ms linear infinite`;
  }

  return () => { halo.remove(); ring.remove(); };
}
```

- [ ] **Step 2: Test**

```js
// test/aurora.spec.js
import { test, expect } from '@playwright/test';
test('aurora appends ring + halo divs', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'aurora'));
  await page.waitForTimeout(120);
  const has = await page.evaluate(() => {
    const host = document.getElementById('bw');
    return !!host.querySelector('[data-border-wc="aurora"]')
        && !!host.querySelector('[data-border-wc="aurora-halo"]');
  });
  expect(has).toBe(true);
});
```

- [ ] **Step 3: Run + commit**

```bash
npm test 2>&1 | tail -3
git add src/effects/aurora.js test/aurora.spec.js
git commit -m "feat(effects): aurora (conic-gradient halo with @property --bwc-angle)"
```

---

### Task 3: `barber` (new)

**Files:** `src/effects/barber.js`, `test/barber.spec.js`

- [ ] **Step 1: Implement**

```js
import { resolveRadius } from '../params.js';
import { ensureStyles } from './_helpers.js';

const BARBER_CSS = `
  [data-border-wc="barber"] { position: absolute; inset: 0; pointer-events: none;
    border-radius: var(--bwc-radius, 12px);
    padding: var(--bwc-thickness, 2px);
    background:
      repeating-linear-gradient(var(--bwc-angle, 45deg),
        var(--bwc-c1) 0 var(--bwc-stripe),
        var(--bwc-c2) var(--bwc-stripe) calc(var(--bwc-stripe) * 2));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
    background-size: 200% 200%;
  }
  @keyframes bwc-barber-march { to { background-position: var(--bwc-march-end); } }
`;

const PRESETS = {
  warning:  { c1: '#000', c2: '#ffd400', angle: '45deg', stripe: '14px' },
  candy:    { c1: '#ec4899', c2: '#ffffff', angle: '-45deg', stripe: '10px' },
  racing:   { c1: '#000', c2: '#ffffff', angle: '0deg', stripe: '16px' },
};

function ensurePositioned(host) {
  const cs = getComputedStyle(host);
  if (cs.position === 'static') host.style.position = 'relative';
}

export function createBarber(host, params) {
  ensurePositioned(host);
  ensureStyles('barber', BARBER_CSS);
  const preset = PRESETS[params.mode] || PRESETS.warning;
  const colors = (params.color || '').split(',').map((s) => s.trim()).filter(Boolean);
  const c1 = colors[0] || preset.c1;
  const c2 = colors[1] || preset.c2;
  const radius = resolveRadius(host, params);

  const el = document.createElement('div');
  el.setAttribute('data-border-wc', 'barber');
  el.style.setProperty('--bwc-c1', c1);
  el.style.setProperty('--bwc-c2', c2);
  el.style.setProperty('--bwc-angle', preset.angle);
  el.style.setProperty('--bwc-stripe', preset.stripe);
  el.style.setProperty('--bwc-radius', `${radius}px`);
  el.style.setProperty('--bwc-thickness', `${params.thickness}px`);
  el.style.setProperty('--bwc-march-end', '200% 200%');
  host.appendChild(el);

  if (!params.reduce && params.animate !== false) {
    el.style.animation = `bwc-barber-march ${Math.max(400, params.speed)}ms linear infinite`;
  }
  return () => el.remove();
}
```

- [ ] **Step 2: Test**

```js
import { test, expect } from '@playwright/test';
test('barber appends a striped overlay div', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'barber'));
  await page.waitForTimeout(120);
  const has = await page.evaluate(() =>
    !!document.getElementById('bw').querySelector('[data-border-wc="barber"]'));
  expect(has).toBe(true);
});
```

- [ ] **Step 3: Commit**

```bash
npm test 2>&1 | tail -3
git add src/effects/barber.js test/barber.spec.js
git commit -m "feat(effects): barber (scrolling diagonal stripes with mode presets)"
```

---

### Task 4: `chroma` (new — mutates host.style.boxShadow)

**Files:** `src/effects/chroma.js`, `test/chroma.spec.js`

- [ ] **Step 1: Implement**

```js
import { ensureStyles } from './_helpers.js';

const CHROMA_CSS = `
  @keyframes bwc-chroma-drift {
    0%,100% { box-shadow: var(--bwc-shadow-a); }
    50%     { box-shadow: var(--bwc-shadow-b); }
  }
`;

function makeShadow(t, R, G, B) {
  // 8-direction stack of 1px shadows in the supplied colors.
  // t = thickness multiplier.
  const o = t;
  return [
    `0 ${o}px 0 0 ${R}`, `0 ${-o}px 0 0 ${G}`,
    `${o}px 0 0 0 ${R}`, `${-o}px 0 0 0 ${G}`,
    `${o}px ${-o}px 0 0 ${B}`, `${-o}px ${o}px 0 0 ${B}`,
    `${o}px ${o}px 0 0 ${R}`, `${-o}px ${-o}px 0 0 ${G}`,
  ].join(', ');
}

export function createChroma(host, params) {
  ensureStyles('chroma', CHROMA_CSS);
  const colors = (params.color || '').split(',').map((s) => s.trim()).filter(Boolean);
  const [R, G, B] = [
    colors[0] || 'rgba(255, 80, 120, 0.85)',
    colors[1] || 'rgba(80, 200, 255, 0.85)',
    colors[2] || 'rgba(255, 200, 0, 0.65)',
  ];
  const t = Math.max(1, params.thickness);
  const prev = host.style.boxShadow || '';
  const a = makeShadow(t, R, G, B);
  const b = makeShadow(t + 1, G, B, R); // drift permutes colors
  host.style.setProperty('--bwc-shadow-a', a);
  host.style.setProperty('--bwc-shadow-b', b);
  host.style.boxShadow = a;
  let animTimer = 0;
  if (!params.reduce && params.animate !== false) {
    host.style.animation = `bwc-chroma-drift ${Math.max(800, params.speed * 2)}ms ease-in-out infinite`;
  }
  host.setAttribute('data-border-wc-chroma', '');
  return () => {
    host.style.animation = '';
    host.style.boxShadow = prev;
    host.style.removeProperty('--bwc-shadow-a');
    host.style.removeProperty('--bwc-shadow-b');
    host.removeAttribute('data-border-wc-chroma');
    if (animTimer) clearTimeout(animTimer);
  };
}
```

- [ ] **Step 2: Test (host attribute set + boxShadow mutated)**

```js
import { test, expect } from '@playwright/test';
test('chroma applies an 8-shadow stack to the host', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'chroma'));
  await page.waitForTimeout(120);
  const r = await page.evaluate(() => {
    const el = document.getElementById('bw');
    return {
      flag: el.hasAttribute('data-border-wc-chroma'),
      shadowSegments: (el.style.boxShadow || '').split(',').length,
    };
  });
  expect(r.flag).toBe(true);
  expect(r.shadowSegments).toBeGreaterThanOrEqual(8);
});
```

- [ ] **Step 3: Commit**

```bash
npm test 2>&1 | tail -3
git add src/effects/chroma.js test/chroma.spec.js
git commit -m "feat(effects): chroma (8-direction chromatic-aberration shadow)"
```

---

### Task 5: `wings` (new)

**Files:** `src/effects/wings.js`, `test/wings.spec.js`

- [ ] **Step 1: Implement**

```js
import { ensureStyles } from './_helpers.js';

const WINGS_CSS = `
  [data-border-wc="wings"] {
    position: absolute; inset: calc(-1 * var(--bwc-wing) * 1.6);
    pointer-events: none; z-index: -1;
    mix-blend-mode: multiply;
    animation: bwc-wings-swap var(--bwc-dur, 6s) ease-in-out infinite;
  }
  [data-border-wc="wings"].b { animation-delay: calc(var(--bwc-dur, 6s) / -2); }
  @keyframes bwc-wings-swap {
    0%, 100% { clip-path: polygon(0 0, calc(100% - var(--bwc-wing)) var(--bwc-wing), 100% 100%, var(--bwc-wing) calc(100% - var(--bwc-wing))); }
    50%      { clip-path: polygon(var(--bwc-wing) var(--bwc-wing), 100% 0, calc(100% - var(--bwc-wing)) calc(100% - var(--bwc-wing)), 0 100%); }
  }
`;

function ensurePositioned(host) {
  const cs = getComputedStyle(host);
  if (cs.position === 'static') host.style.position = 'relative';
  // wings need overflow-visible so the oversized children show.
  // We don't touch host.style.overflow if it's already set.
  if (cs.overflow === 'visible') return;
  // OK to leave; host author controls overflow. Wings clipped by overflow:hidden
  // would just look like normal triangles at corners.
}

export function createWings(host, params) {
  ensurePositioned(host);
  ensureStyles('wings', WINGS_CSS);
  const colors = (params.color || '').split(',').map((s) => s.trim()).filter(Boolean);
  const c1 = colors[0] || '#93e1d8';
  const c2 = colors[1] || '#aa4465';
  const wing = `${Math.max(20, params.thickness * 14)}px`;
  const dur = `${Math.max(1600, params.speed * 5)}ms`;

  const make = (cls, bg) => {
    const el = document.createElement('div');
    el.setAttribute('data-border-wc', 'wings');
    if (cls) el.classList.add(cls);
    el.style.background = bg;
    el.style.setProperty('--bwc-wing', wing);
    el.style.setProperty('--bwc-dur', dur);
    if (params.reduce || params.animate === false) el.style.animation = 'none';
    host.appendChild(el);
    return el;
  };
  const a = make('', c1);
  const b = make('b', c2);
  return () => { a.remove(); b.remove(); };
}
```

- [ ] **Step 2: Test**

```js
import { test, expect } from '@playwright/test';
test('wings appends two oversized clip-path divs', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'wings'));
  await page.waitForTimeout(120);
  const n = await page.evaluate(
    () => document.getElementById('bw').querySelectorAll('[data-border-wc="wings"]').length
  );
  expect(n).toBe(2);
});
```

- [ ] **Step 3: Commit**

```bash
npm test 2>&1 | tail -3
git add src/effects/wings.js test/wings.spec.js
git commit -m "feat(effects): wings (oversized clip-path triangles morphing behind card)"
```

---

### Task 6: `neon` (new)

**Files:** `src/effects/neon.js`, `test/neon.spec.js`

- [ ] **Step 1: Implement**

```js
import { roundedRectPath } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachOverlaySvg, SVG_NS } from './_helpers.js';

let UID = 0;

export function createNeon(host, params) {
  const svg = attachOverlaySvg(host, 'neon');
  const id = `bwc-neon-${++UID}`;
  const defs = document.createElementNS(SVG_NS, 'defs');
  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('id', id);
  filter.setAttribute('x', '-50%');
  filter.setAttribute('y', '-50%');
  filter.setAttribute('width', '200%');
  filter.setAttribute('height', '200%');
  const blur = document.createElementNS(SVG_NS, 'feGaussianBlur');
  blur.setAttribute('stdDeviation', '6');
  blur.setAttribute('result', 'blur');
  const merge = document.createElementNS(SVG_NS, 'feMerge');
  for (let i = 0; i < 3; i++) {
    const n = document.createElementNS(SVG_NS, 'feMergeNode');
    n.setAttribute('in', 'blur');
    merge.appendChild(n);
  }
  const src = document.createElementNS(SVG_NS, 'feMergeNode');
  src.setAttribute('in', 'SourceGraphic');
  merge.appendChild(src);
  filter.appendChild(blur);
  filter.appendChild(merge);
  defs.appendChild(filter);
  svg.appendChild(defs);

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', params.color === 'currentColor' ? '#ff2bd6' : params.color);
  path.setAttribute('stroke-width', String(Math.max(2, params.thickness)));
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('filter', `url(#${id})`);
  svg.appendChild(path);

  const fit = () => {
    const r = host.getBoundingClientRect();
    path.setAttribute('d', roundedRectPath({
      width: r.width, height: r.height,
      radius: resolveRadius(host, params),
      inset: params.thickness / 2,
    }));
  };
  fit();

  if (!params.reduce && params.animate !== false) {
    const dur = Math.max(800, params.speed);
    const anim = document.createElementNS(SVG_NS, 'animate');
    anim.setAttribute('attributeName', 'stdDeviation');
    anim.setAttribute('values', '4;10;4');
    anim.setAttribute('dur', `${dur}ms`);
    anim.setAttribute('repeatCount', 'indefinite');
    blur.appendChild(anim);
  }

  const ro = new ResizeObserver(fit);
  ro.observe(host);
  return () => { ro.disconnect(); svg.remove(); };
}
```

- [ ] **Step 2: Test**

```js
import { test, expect } from '@playwright/test';
test('neon appends an SVG with a feGaussianBlur+feMerge filter', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'neon'));
  await page.waitForTimeout(120);
  const r = await page.evaluate(() => {
    const svg = document.getElementById('bw').querySelector('svg[data-border-wc="neon"]');
    if (!svg) return null;
    return {
      hasFilter: !!svg.querySelector('filter feGaussianBlur'),
      hasMerge: !!svg.querySelector('filter feMerge'),
      hasFiltered: !!svg.querySelector('path[filter]'),
    };
  });
  expect(r).toEqual({ hasFilter: true, hasMerge: true, hasFiltered: true });
});
```

- [ ] **Step 3: Commit**

```bash
npm test 2>&1 | tail -3
git add src/effects/neon.js test/neon.spec.js
git commit -m "feat(effects): neon (SVG feGaussianBlur+feMerge glow stack)"
```

---

### Task 7: `marquee` (new) + finalize registry test

**Files:** `src/effects/marquee.js`, `test/marquee.spec.js`, `test/registry.spec.js`

- [ ] **Step 1: Implement marquee**

```js
import { roundedRectSampler } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachOverlaySvg, ensureStyles, SVG_NS } from './_helpers.js';

const MARQUEE_CSS = `
  @keyframes bwc-marquee-chase {
    0%, 100% { opacity: 0.2; }
    10%      { opacity: 1; }
    20%      { opacity: 0.2; }
  }
`;

export function createMarquee(host, params) {
  ensureStyles('marquee', MARQUEE_CSS);
  const svg = attachOverlaySvg(host, 'marquee');
  svg.style.filter = `drop-shadow(0 0 ${params.thickness * 2}px var(--bwc-marquee-glow, ${
    params.color === 'currentColor' ? 'rgba(255,255,255,0.8)' : params.color
  }))`;

  const fit = () => {
    svg.innerHTML = '';
    const r = host.getBoundingClientRect();
    const sampler = roundedRectSampler({
      width: r.width,
      height: r.height,
      radius: resolveRadius(host, params),
      inset: params.thickness / 2,
    });
    const perim = 2 * (r.width + r.height);
    const bulbR = Math.max(3, params.thickness * 1.2);
    const N = Math.max(10, Math.floor(perim / (bulbR * 4)));
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const [x, y] = sampler(t);
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', String(x));
      c.setAttribute('cy', String(y));
      c.setAttribute('r', String(bulbR));
      c.setAttribute('fill', params.color === 'currentColor' ? '#fff7d6' : params.color);
      const dur = Math.max(800, params.speed);
      if (params.reduce || params.animate === false) {
        c.setAttribute('opacity', '1');
      } else {
        const mode = params.mode || 'chase';
        const delay = mode === 'sparkle' ? Math.random() * dur : mode === 'random' ? (t * dur * (1 + Math.random())) : t * dur;
        c.style.animation = `bwc-marquee-chase ${dur}ms linear infinite`;
        c.style.animationDelay = `-${delay.toFixed(0)}ms`;
      }
      svg.appendChild(c);
    }
  };
  fit();

  const ro = new ResizeObserver(fit);
  ro.observe(host);
  return () => { ro.disconnect(); svg.remove(); };
}
```

- [ ] **Step 2: Test**

```js
import { test, expect } from '@playwright/test';
test('marquee appends SVG with bulb circles around the path', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'marquee'));
  await page.waitForTimeout(120);
  const n = await page.evaluate(
    () => document.getElementById('bw').querySelectorAll('svg[data-border-wc="marquee"] circle').length
  );
  expect(n).toBeGreaterThan(8);
});
```

- [ ] **Step 3: Collapse registry.spec.js**

Rewrite `test/registry.spec.js` so `ALL_EFFECTS` is the final 19:

```js
const ALL_EFFECTS = [
  'aurora','barber','chroma','wings',
  'lightning','neon','glitch',
  'ascii','stitching','typewriter',
  'barbed-wire','rope','scallop',
  'psychedelic','plasma',
  'sparks','marquee',
  'squiggle','draw',
];
```

Drop the EXISTING_EFFECTS / NEW_EFFECTS split.

- [ ] **Step 4: Commit**

```bash
npm test 2>&1 | tail -3   # expect: 19-effect reduce-motion sweep + 6 new specs all pass
git add src/effects/marquee.js test/marquee.spec.js test/registry.spec.js
git commit -m "feat(effects): marquee (chase-light bulbs) + collapse registry test"
```

---

### Task 8: Refactor `lightning`

**Files:** `src/effects/lightning.js`, `test/lightning.spec.js`

- [ ] **Step 1: Rewrite lightning.js**

Replace with an SVG implementation using the same `feGaussianBlur+feMerge` filter shape as neon, but drawing zigzag bolts as polylines anchored at evenly-spaced perimeter points.

```js
import { roundedRectSampler } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachOverlaySvg, SVG_NS } from './_helpers.js';

let UID = 0;

function jaggedSegment(x1, y1, x2, y2, jitter) {
  const STEPS = 6;
  const pts = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const j = i === 0 || i === STEPS ? 0 : (Math.random() - 0.5) * jitter;
    // Perpendicular jitter:
    const dx = x2 - x1, dy = y2 - y1;
    const L = Math.hypot(dx, dy) || 1;
    pts.push([x + (-dy / L) * j, y + (dx / L) * j]);
  }
  return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
}

export function createLightning(host, params) {
  const svg = attachOverlaySvg(host, 'lightning');
  const id = `bwc-light-${++UID}`;
  const defs = document.createElementNS(SVG_NS, 'defs');
  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('id', id);
  filter.setAttribute('x', '-50%'); filter.setAttribute('y', '-50%');
  filter.setAttribute('width', '200%'); filter.setAttribute('height', '200%');
  const blur = document.createElementNS(SVG_NS, 'feGaussianBlur');
  blur.setAttribute('stdDeviation', '3');
  blur.setAttribute('result', 'blur');
  const merge = document.createElementNS(SVG_NS, 'feMerge');
  for (let i = 0; i < 2; i++) {
    const n = document.createElementNS(SVG_NS, 'feMergeNode');
    n.setAttribute('in', 'blur'); merge.appendChild(n);
  }
  const src = document.createElementNS(SVG_NS, 'feMergeNode');
  src.setAttribute('in', 'SourceGraphic');
  merge.appendChild(src);
  filter.appendChild(blur); filter.appendChild(merge);
  defs.appendChild(filter); svg.appendChild(defs);

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('filter', `url(#${id})`);
  svg.appendChild(g);

  let raf = 0;
  let lastTick = 0;
  const fit = () => {
    g.innerHTML = '';
    const r = host.getBoundingClientRect();
    const sampler = roundedRectSampler({
      width: r.width, height: r.height,
      radius: resolveRadius(host, params),
      inset: params.thickness / 2,
    });
    const perim = 2 * (r.width + r.height);
    const N = Math.max(4, Math.min(8, Math.floor(perim / 140)));
    const color = params.color === 'currentColor' ? '#bcd6ff' : params.color;
    for (let i = 0; i < N; i++) {
      const t1 = i / N;
      const t2 = (i + 0.2) / N;
      const [x1, y1] = sampler(t1);
      const [x2, y2] = sampler(t2);
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', jaggedSegment(x1, y1, x2, y2, params.thickness * 4));
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', color);
      p.setAttribute('stroke-width', String(Math.max(1.5, params.thickness)));
      p.setAttribute('stroke-linecap', 'round');
      if (!params.reduce) {
        p.style.opacity = '0';
        p.style.transition = 'opacity 80ms linear';
      }
      g.appendChild(p);
    }
  };
  fit();

  function strike(now) {
    if (now - lastTick > Math.max(180, params.speed / 4)) {
      lastTick = now;
      const paths = g.querySelectorAll('path');
      paths.forEach((p) => (p.style.opacity = '0'));
      // Re-jitter a random subset and flash them on.
      const k = Math.max(1, Math.floor(paths.length / 3));
      for (let i = 0; i < k; i++) {
        const idx = Math.floor(Math.random() * paths.length);
        paths[idx].style.opacity = '1';
      }
    }
    raf = requestAnimationFrame(strike);
  }
  if (!params.reduce && params.animate !== false) raf = requestAnimationFrame(strike);
  else g.querySelectorAll('path').forEach((p) => (p.style.opacity = '1'));

  const ro = new ResizeObserver(fit);
  ro.observe(host);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); svg.remove(); };
}
```

- [ ] **Step 2: Update test**

```js
import { test, expect } from '@playwright/test';
test('lightning appends an SVG with feGaussianBlur filter + paths', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'lightning'));
  await page.waitForTimeout(150);
  const r = await page.evaluate(() => {
    const svg = document.getElementById('bw').querySelector('svg[data-border-wc="lightning"]');
    if (!svg) return null;
    return {
      hasBlur: !!svg.querySelector('filter feGaussianBlur'),
      paths: svg.querySelectorAll('g path').length,
    };
  });
  expect(r.hasBlur).toBe(true);
  expect(r.paths).toBeGreaterThanOrEqual(4);
});
```

- [ ] **Step 3: Commit**

```bash
npm test 2>&1 | tail -3
git add src/effects/lightning.js test/lightning.spec.js
git commit -m "refactor(effects): lightning uses SVG feGaussianBlur (drop canvas)"
```

---

### Task 9: Refactor `sparks` (offset-path)

**Files:** `src/effects/sparks.js`, `test/sparks.spec.js`

- [ ] **Step 1: Rewrite sparks.js**

```js
import { roundedRectPath } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachOverlaySvg, ensureStyles, SVG_NS } from './_helpers.js';

const SPARKS_CSS = `
  @keyframes bwc-sparks-orbit { to { offset-distance: 100%; } }
`;

export function createSparks(host, params) {
  ensureStyles('sparks', SPARKS_CSS);
  const svg = attachOverlaySvg(host, 'sparks');

  const fit = () => {
    svg.innerHTML = '';
    const r = host.getBoundingClientRect();
    const d = roundedRectPath({
      width: r.width, height: r.height,
      radius: resolveRadius(host, params),
      inset: params.thickness / 2,
    });
    const color = params.color === 'currentColor' ? '#fff7c4' : params.color;
    const dur = Math.max(400, params.speed);
    const TRAIL = 3;
    for (let i = 0; i < TRAIL; i++) {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', '0');
      c.setAttribute('cy', '0');
      c.setAttribute('r', String(Math.max(2, params.thickness * 1.2) - i * 0.6));
      c.setAttribute('fill', color);
      c.setAttribute('opacity', String(1 - i * 0.3));
      c.style.offsetPath = `path('${d}')`;
      c.style.offsetRotate = '0deg';
      c.style.offsetDistance = '0%';
      if (!params.reduce && params.animate !== false) {
        c.style.animation = `bwc-sparks-orbit ${dur}ms linear infinite`;
        c.style.animationDelay = `-${i * (dur / 18)}ms`;
      }
      svg.appendChild(c);
    }
  };
  fit();

  const ro = new ResizeObserver(fit);
  ro.observe(host);
  return () => { ro.disconnect(); svg.remove(); };
}
```

- [ ] **Step 2: Update test**

```js
import { test, expect } from '@playwright/test';
test('sparks appends svg circles riding an offset-path', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'sparks'));
  await page.waitForTimeout(150);
  const r = await page.evaluate(() => {
    const svg = document.getElementById('bw').querySelector('svg[data-border-wc="sparks"]');
    if (!svg) return null;
    const c = svg.querySelector('circle');
    return { count: svg.querySelectorAll('circle').length, hasOffset: !!c && /path\(/.test(c.style.offsetPath) };
  });
  expect(r.count).toBe(3);
  expect(r.hasOffset).toBe(true);
});
```

- [ ] **Step 3: Commit**

```bash
npm test 2>&1 | tail -3
git add src/effects/sparks.js test/sparks.spec.js
git commit -m "refactor(effects): sparks uses offset-path SVG (drop canvas)"
```

---

### Task 10: Gallery rewrite (`docs/index.html`)

**Files:** `docs/index.html` (rewrite), `docs/playground.js` (extend to read `data-mode`), `docs/site.css` (no change unless needed)

- [ ] **Step 1: Rewrite docs/index.html**

Replace `<main>` content with 19 cards across 7 sections:

1. **Modern CSS** — aurora, barber (with `<select data-knob-mode>warning/candy/racing</select>`), chroma, wings
2. **Energy** — lightning, neon, glitch
3. **Retro / Craft** — ascii, stitching, typewriter
4. **Pattern** — barbed-wire, rope, scallop
5. **Trippy** — psychedelic, plasma
6. **Marquee** — sparks, marquee (with `<select data-knob-mode>chase/sparkle/random</select>`)
7. **Originals** — squiggle, draw (with Replay)

Each card uses the existing template (`<article class="effect-card" data-effect data-sample-label>`), with knobs `color/thickness/speed/radius` and a `<code-block>` snippet. Effects supporting `mode` (barber, marquee) get a `<select data-knob="mode">` between the knobs.

Drop the four retired cards. Update the TOC under the page-head to the 7 sections.

(Full code: this section will be ~280 lines of HTML, mostly card boilerplate. Generate by repeating the existing pattern with the per-effect color defaults from the spec.)

- [ ] **Step 2: Extend `docs/playground.js` for `<select data-knob>`**

```js
const inputs = card.querySelectorAll('.knobs input[data-knob], .knobs select[data-knob]');
// `apply()` reads via `i.dataset.knob` regardless of element tag; no other change.
```

If `mode` is present, include it in the snippet output: `${snippet base} mode="${mode}"` between speed and radius.

- [ ] **Step 3: Local visual smoke test via dev server**

```bash
npm run dev &
sleep 2 && curl -s http://localhost:5173/docs/ | grep -c "effect-card"  # expect 19
kill %1
```

- [ ] **Step 4: Commit**

```bash
npm run format 2>&1 | tail -3
git add docs/index.html docs/playground.js docs/site.css
git commit -m "feat(docs): 19-effect gallery with 7 sections + mode selects"
```

---

### Task 11: API + README + push + PR

**Files:** `docs/api.html`, `README.md`

- [ ] **Step 1: Update api.html catalog**

Replace the catalog `<tbody>` rows to match the final 19 effects, grouped by family. Add a note row at the bottom: "Reduced motion: every effect with continuous motion renders a static end-state under `prefers-reduced-motion: reduce`." Add a small section under "Used with vanilla-breeze" called **"Modern CSS notes"** documenting:

- `aurora` registers a global `@property --bwc-angle` (no-op on Firefox <128).
- `chroma` mutates `host.style.boxShadow` (captures previous value, restores on cleanup).
- `barber` accepts `mode="warning|candy|racing"`; `marquee` accepts `mode="chase|sparkle|random"`.
- `color` accepts a comma list for multi-stop effects (`aurora`, `barber`, `wings`, `chroma`).

- [ ] **Step 2: Update README**

Replace the effect-list bullet line with the 19-name list. Update the opening paragraph to mention conic-gradient halos and chromatic-aberration shadows.

- [ ] **Step 3: Final verification**

```bash
npm run lint 2>&1 | tail -3
npm run build 2>&1 | tail -3
npm test 2>&1 | tail -3   # expect ~54 passing
```

- [ ] **Step 4: Commit, push, PR**

```bash
git add docs/api.html README.md
git commit -m "docs: catalog refresh for 19 CSS-first effects"
git push -u origin feat/css-first-refresh
gh pr create --title "feat: CSS-first effects refresh (retire 4, add 6, refactor 2)" \
  --body "$(see PR template in execution context)"
gh pr checks --watch
```

After CI green, merge with `gh pr merge --merge --delete-branch`. Watch Pages deploy. Curl the live gallery to verify 19 cards.

---

## Self-review

**Spec coverage:** Every spec section maps to at least one task — retirements (Task 1), 6 new effects (Tasks 2–7), 2 refactors (Tasks 8–9), gallery (10), docs (11), helpers (Task 1).

**Type consistency:** All new `create<Name>(host, params)` functions return `() => void`. All new effects accept the standard params from `src/params.js`. `attachCanvas`, `attachOverlaySvg`, `ensureStyles`, `ensureAngleProperty`, `SVG_NS` exported from `_helpers.js` and used consistently.

**Risks watched:** `@property` double-registration (guarded with `try/catch`), `chroma` boxShadow restoration (captured + restored), `wings` overflow caveat (documented in api.html), lazy-import-of-missing-module in registry.spec.js (gated until Task 7).
