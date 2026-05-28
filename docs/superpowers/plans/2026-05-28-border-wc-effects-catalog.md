# border-wc effects catalog Implementation Plan (14 new effects)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 14 new extreme border effects to `@profpowell/border-wc` (lightning, flames, glitch, grass, vines, fireflies, ascii, stitching, typewriter, barbed-wire, rope, scallop, psychedelic, plasma), bringing the catalog to 17 total, with gallery cards + tests for each.

**Architecture:** Each effect is `src/effects/<name>.js` exporting `create<Name>(host, params) => cleanup`. New shared helpers in `src/effects/_helpers.js` provide `attachCanvas` and `attachOverlaySvg` so the new modules stay small. The existing 3 effects (`squiggle`, `draw`, `sparks`) stay as-is (refactor to helpers later). `src/registry.js` adds 14 entries; `<border-wc>` element + `data-border-effect` binder pick them up via the existing pattern with **no other source change**.

**Tech Stack:** Vanilla JS ESM, Vite library build, Playwright tests. No new runtime deps.

**Target:** `/Users/tpowell/src/border-wc` on feature branch `feat/effects-catalog-14`. Spec: `~/src/gl-wc/docs/superpowers/specs/2026-05-28-border-wc-effects-catalog-design.md`.

**Existing pattern reference:** `src/effects/draw.js`, `src/effects/sparks.js`, `src/effects/squiggle.js` — same constructor signature, same lifecycle (create overlay → animate via rAF / observer / interval → return cleanup that removes overlay + disconnects observers).

---

### Task 1: Helpers + registry stubs

**Files:**
- Create: `src/effects/_helpers.js`
- Modify: `src/registry.js` (add 14 entries)

- [ ] **Step 1: Create `src/effects/_helpers.js`**

```js
// Shared helpers for the effect modules. Each new effect uses either
// attachCanvas (particle / pixel work) or attachOverlaySvg (vector work)
// so the per-effect modules stay small. Existing draw/squiggle/sparks
// are untouched in this PR (refactor in a follow-up).

const SVGNS = 'http://www.w3.org/2000/svg';

// Make the host a positioning context so an absolutely-positioned overlay fits.
function ensurePositioned(host) {
  const cs = getComputedStyle(host);
  if (cs.position === 'static') host.style.position = 'relative';
  if (cs.display === 'inline') host.style.display = 'block';
}

/**
 * Attach a <canvas> overlay sized to the host, with DPR-aware backing store
 * and a `fit()` helper consumers can call from a ResizeObserver. Returns the
 * canvas, the 2d context, a fit function, and the current host rect.
 */
export function attachCanvas(host, dataAttr) {
  ensurePositioned(host);
  const canvas = document.createElement('canvas');
  canvas.setAttribute('data-border-wc', dataAttr);
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  });
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let dpr = 1;
  let rect = host.getBoundingClientRect();
  const fit = () => {
    rect = host.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
  };
  fit();
  return {
    canvas,
    ctx,
    fit,
    dpr: () => dpr,
    rect: () => rect,
  };
}

/**
 * Attach a positioned, inset:0, pointer-events:none <svg> overlay to the host
 * with the given `data-border-wc` value. Returns the svg element; the caller
 * appends paths/groups as needed.
 */
export function attachOverlaySvg(host, dataAttr) {
  ensurePositioned(host);
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('data-border-wc', dataAttr);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  Object.assign(svg.style, {
    position: 'absolute',
    inset: '0',
    overflow: 'visible',
    pointerEvents: 'none',
  });
  host.appendChild(svg);
  return svg;
}

export const SVG_NS = SVGNS;
```

- [ ] **Step 2: Extend `src/registry.js`** to add the 14 new lazy loaders.

Replace the `EFFECTS` block with:
```js
// effect name → loader returning the effect's create() fn
export const EFFECTS = {
  draw: () => import('./effects/draw.js').then((m) => m.createDraw),
  squiggle: () => import('./effects/squiggle.js').then((m) => m.createSquiggle),
  sparks: () => import('./effects/sparks.js').then((m) => m.createSparks),
  lightning: () => import('./effects/lightning.js').then((m) => m.createLightning),
  flames: () => import('./effects/flames.js').then((m) => m.createFlames),
  glitch: () => import('./effects/glitch.js').then((m) => m.createGlitch),
  grass: () => import('./effects/grass.js').then((m) => m.createGrass),
  vines: () => import('./effects/vines.js').then((m) => m.createVines),
  fireflies: () => import('./effects/fireflies.js').then((m) => m.createFireflies),
  ascii: () => import('./effects/ascii.js').then((m) => m.createAscii),
  stitching: () => import('./effects/stitching.js').then((m) => m.createStitching),
  typewriter: () => import('./effects/typewriter.js').then((m) => m.createTypewriter),
  'barbed-wire': () => import('./effects/barbed-wire.js').then((m) => m.createBarbedWire),
  rope: () => import('./effects/rope.js').then((m) => m.createRope),
  scallop: () => import('./effects/scallop.js').then((m) => m.createScallop),
  psychedelic: () => import('./effects/psychedelic.js').then((m) => m.createPsychedelic),
  plasma: () => import('./effects/plasma.js').then((m) => m.createPlasma),
};
```
The `EXTREME = Object.keys(EFFECTS)` line below it is unchanged — it picks up all 17 automatically.

- [ ] **Step 3: Smoke-check build still works (loaders point at missing files, but the registry itself is fine)**

The dynamic imports are lazy so the build doesn't try to resolve them yet — Vite chunks them on demand. But the per-effect modules don't exist; visiting an effect would fail at runtime. Subsequent tasks add the modules.

Run: `npm run build 2>&1 | tail -3`
Expected: build succeeds (lazy import targets don't need to exist at library-build time when they're string specifiers).

- [ ] **Step 4: Commit**

```bash
cd /Users/tpowell/src/border-wc
git checkout -b feat/effects-catalog-14
git add src/effects/_helpers.js src/registry.js
git commit -m "feat(effects): scaffolding (helpers + registry entries for 14 new effects)"
```

---

### Task 2: Energy effects — lightning, flames, glitch

**Files:**
- Create: `src/effects/lightning.js`, `src/effects/flames.js`, `src/effects/glitch.js`
- Create: `test/lightning.spec.js`, `test/flames.spec.js`, `test/glitch.spec.js`

- [ ] **Step 1: `src/effects/lightning.js`**

```js
import { roundedRectSampler } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachCanvas } from './_helpers.js';
import { toRGBA } from '../color.js';

export function createLightning(host, params) {
  const { canvas, ctx, fit, dpr, rect } = attachCanvas(host, 'lightning');
  const color = toRGBA(
    params.color === 'currentColor' ? getComputedStyle(host).color : params.color
  );

  let sampler = () => [0, 0];
  const refit = () => {
    fit();
    const r = rect();
    sampler = roundedRectSampler({
      width: r.width,
      height: r.height,
      radius: resolveRadius(host, params),
      inset: params.thickness / 2,
    });
  };
  refit();

  function drawBolt(a, b, jitter, depth) {
    const d = dpr();
    if (depth === 0 || Math.hypot(b[0] - a[0], b[1] - a[1]) < 4) {
      ctx.beginPath();
      ctx.moveTo(a[0] * d, a[1] * d);
      ctx.lineTo(b[0] * d, b[1] * d);
      ctx.stroke();
      return;
    }
    const midX = (a[0] + b[0]) / 2 + (Math.random() - 0.5) * jitter;
    const midY = (a[1] + b[1]) / 2 + (Math.random() - 0.5) * jitter;
    const mid = [midX, midY];
    drawBolt(a, mid, jitter / 2, depth - 1);
    drawBolt(mid, b, jitter / 2, depth - 1);
    if (Math.random() < 0.35 && depth > 2) {
      const fork = [midX + (Math.random() - 0.5) * jitter * 1.5, midY + (Math.random() - 0.5) * jitter * 1.5];
      drawBolt(mid, fork, jitter / 2, depth - 2);
    }
  }

  let raf = 0;
  let lastBolt = 0;
  const interval = Math.max(80, params.speed / 4);
  function frame(now) {
    if (params.reduce) return; // handled below
    const d = dpr();
    // fade prior frame
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = params.thickness * d;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 8 * d;
    if (now - lastBolt > interval) {
      const a = sampler(Math.random());
      const b = sampler(Math.random());
      drawBolt(a, b, 24, 6);
      lastBolt = now;
    }
    raf = requestAnimationFrame(frame);
  }

  if (params.reduce) {
    // static: a single jagged outline using the sampler
    const d = dpr();
    ctx.strokeStyle = color;
    ctx.lineWidth = params.thickness * d;
    ctx.beginPath();
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const [x, y] = sampler(t);
      const jx = (Math.random() - 0.5) * 4;
      const jy = (Math.random() - 0.5) * 4;
      if (i === 0) ctx.moveTo((x + jx) * d, (y + jy) * d);
      else ctx.lineTo((x + jx) * d, (y + jy) * d);
    }
    ctx.closePath();
    ctx.stroke();
  } else {
    raf = requestAnimationFrame(frame);
  }

  const ro = new ResizeObserver(refit);
  ro.observe(host);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    canvas.remove();
  };
}
```

- [ ] **Step 2: `src/effects/flames.js`**

```js
import { roundedRectSampler } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachCanvas } from './_helpers.js';

export function createFlames(host, params) {
  const { canvas, ctx, fit, dpr, rect } = attachCanvas(host, 'flames');

  let sampler = () => [0, 0];
  const refit = () => {
    fit();
    const r = rect();
    sampler = roundedRectSampler({
      width: r.width,
      height: r.height,
      radius: resolveRadius(host, params),
      inset: params.thickness / 2,
    });
  };
  refit();

  const N = 60;
  const parts = Array.from({ length: N }, (_, i) => spawn(i / N));
  function spawn(t) {
    return { t, life: 0, max: 0.6 + Math.random() * 0.6, dx: (Math.random() - 0.5) * 0.3, dy: -0.8 - Math.random() * 0.8 };
  }
  function colorAt(life) {
    const k = life;
    // red -> orange -> yellow -> transparent
    if (k < 0.33) return `rgba(255, ${Math.round(80 + k * 120)}, 0, ${1 - k * 0.5})`;
    if (k < 0.66) return `rgba(255, ${Math.round(160 + (k - 0.33) * 250)}, 0, ${1 - k * 0.5})`;
    return `rgba(255, 230, ${Math.round((k - 0.66) * 200)}, ${Math.max(0, 1 - k)})`;
  }

  let raf = 0;
  function frame() {
    const d = dpr();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      p.life += 0.016;
      if (p.life > p.max) Object.assign(p, spawn(Math.random()));
      const [x, y] = sampler(p.t);
      const offX = p.dx * p.life * 24;
      const offY = p.dy * p.life * 16;
      const r = (2 + p.life * 6) * d * params.thickness * 0.5;
      ctx.fillStyle = colorAt(p.life / p.max);
      ctx.beginPath();
      ctx.arc((x + offX) * d, (y + offY) * d, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    raf = params.reduce ? 0 : requestAnimationFrame(frame);
  }
  frame();

  const ro = new ResizeObserver(refit);
  ro.observe(host);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    canvas.remove();
  };
}
```

- [ ] **Step 3: `src/effects/glitch.js`**

```js
import { roundedRectPath } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachOverlaySvg, SVG_NS } from './_helpers.js';

export function createGlitch(host, params) {
  const svg = attachOverlaySvg(host, 'glitch');
  const channels = [
    { color: '#ff2b6a', el: document.createElementNS(SVG_NS, 'path') },
    { color: '#2bff8a', el: document.createElementNS(SVG_NS, 'path') },
    { color: '#2bb9ff', el: document.createElementNS(SVG_NS, 'path') },
  ];
  for (const c of channels) {
    c.el.setAttribute('fill', 'none');
    c.el.setAttribute('stroke', c.color);
    c.el.setAttribute('stroke-width', String(params.thickness));
    c.el.style.mixBlendMode = 'screen';
    svg.appendChild(c.el);
  }

  const fit = () => {
    const r = host.getBoundingClientRect();
    const d = roundedRectPath({
      width: r.width,
      height: r.height,
      radius: resolveRadius(host, params),
      inset: params.thickness / 2,
    });
    channels.forEach((c) => c.el.setAttribute('d', d));
  };
  fit();

  let timer = 0;
  function shuffle() {
    channels.forEach((c) => {
      const dx = (Math.random() - 0.5) * 6;
      const dy = (Math.random() - 0.5) * 6;
      c.el.setAttribute('transform', `translate(${dx} ${dy})`);
    });
  }
  shuffle();
  if (!params.reduce) {
    timer = setInterval(shuffle, Math.max(100, params.speed / 6));
  }

  const ro = new ResizeObserver(fit);
  ro.observe(host);
  return () => {
    clearInterval(timer);
    ro.disconnect();
    svg.remove();
  };
}
```

- [ ] **Step 4: Tests for lightning, flames, glitch**

`test/lightning.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('lightning appends a canvas overlay', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'lightning'));
  await page.waitForTimeout(120);
  const has = await page.evaluate(() => !!document.getElementById('bw').querySelector('canvas[data-border-wc="lightning"]'));
  expect(has).toBe(true);
});
```

`test/flames.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('flames appends a canvas overlay', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'flames'));
  await page.waitForTimeout(120);
  const has = await page.evaluate(() => !!document.getElementById('bw').querySelector('canvas[data-border-wc="flames"]'));
  expect(has).toBe(true);
});
```

`test/glitch.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('glitch appends an SVG with three colored paths', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'glitch'));
  await page.waitForTimeout(120);
  const n = await page.evaluate(() => document.getElementById('bw').querySelectorAll('svg[data-border-wc="glitch"] path').length);
  expect(n).toBe(3);
});
```

- [ ] **Step 5: Build + test + commit**

```bash
npm run build 2>&1 | tail -2
npm test 2>&1 | tail -3   # expect 18 + 3 = 21 passing
git add src/effects/lightning.js src/effects/flames.js src/effects/glitch.js \
        test/lightning.spec.js test/flames.spec.js test/glitch.spec.js
git commit -m "feat(effects): energy — lightning, flames, glitch"
```

---

### Task 3: Organic effects — grass, vines, fireflies

**Files:** create `src/effects/{grass,vines,fireflies}.js` and `test/{grass,vines,fireflies}.spec.js`.

- [ ] **Step 1: `src/effects/grass.js`**

```js
import { roundedRectSampler } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachCanvas } from './_helpers.js';

export function createGrass(host, params) {
  const { canvas, ctx, fit, dpr, rect } = attachCanvas(host, 'grass');

  let sampler = () => [0, 0];
  const refit = () => {
    fit();
    const r = rect();
    sampler = roundedRectSampler({
      width: r.width,
      height: r.height,
      radius: resolveRadius(host, params),
      inset: params.thickness / 2,
    });
  };
  refit();

  const N = 80;
  const blades = Array.from({ length: N }, (_, i) => ({
    t: i / N,
    len: 8 + Math.random() * 16,
    sway: Math.random() * Math.PI * 2,
    phase: 0.4 + Math.random() * 0.6,
  }));
  const startMs = performance.now();
  const growMs = Math.max(200, params.speed / 2);

  function tangentNormal(t) {
    const dt = 0.001;
    const a = sampler((t - dt + 1) % 1);
    const b = sampler((t + dt) % 1);
    const tx = b[0] - a[0], ty = b[1] - a[1];
    const L = Math.hypot(tx, ty) || 1;
    return { nx: ty / L, ny: -tx / L };
  }

  let raf = 0;
  function frame(now) {
    const d = dpr();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const t = (now - startMs) / 1000;
    const grow = params.reduce ? 1 : Math.min(1, (now - startMs) / growMs);
    for (const b of blades) {
      const [x, y] = sampler(b.t);
      const { nx, ny } = tangentNormal(b.t);
      const len = b.len * grow;
      const sway = params.reduce ? 0 : Math.sin(t * 0.8 + b.sway) * 0.5 * b.phase;
      const tipX = x + nx * len + sway * 8;
      const tipY = y + ny * len;
      const ctlX = x + nx * len * 0.5 + sway * 6;
      const ctlY = y + ny * len * 0.6;
      const g = ctx.createLinearGradient(x * d, y * d, tipX * d, tipY * d);
      g.addColorStop(0, '#1e6b2a');
      g.addColorStop(1, '#6fd06b');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.5 * d;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x * d, y * d);
      ctx.quadraticCurveTo(ctlX * d, ctlY * d, tipX * d, tipY * d);
      ctx.stroke();
    }
    raf = params.reduce ? 0 : requestAnimationFrame(frame);
  }
  frame(performance.now());

  const ro = new ResizeObserver(refit);
  ro.observe(host);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    canvas.remove();
  };
}
```

- [ ] **Step 2: `src/effects/vines.js`**

```js
import { roundedRectPath, roundedRectPerimeter, roundedRectSampler } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachOverlaySvg, SVG_NS } from './_helpers.js';

export function createVines(host, params) {
  const svg = attachOverlaySvg(host, 'vines');
  const vine = document.createElementNS(SVG_NS, 'path');
  vine.setAttribute('fill', 'none');
  vine.setAttribute('stroke', params.color === 'currentColor' ? '#2f6b2a' : params.color);
  vine.setAttribute('stroke-width', String(Math.max(2, params.thickness)));
  vine.setAttribute('stroke-linecap', 'round');
  svg.appendChild(vine);
  const leaves = document.createElementNS(SVG_NS, 'g');
  svg.appendChild(leaves);

  let sampler = () => [0, 0];
  let len = 0;
  const fit = () => {
    const r = host.getBoundingClientRect();
    const radius = resolveRadius(host, params);
    const inset = params.thickness / 2;
    vine.setAttribute('d', roundedRectPath({ width: r.width, height: r.height, radius, inset }));
    len = roundedRectPerimeter({ width: r.width, height: r.height, radius, inset }) || 1;
    sampler = roundedRectSampler({ width: r.width, height: r.height, radius, inset });
    vine.style.transition = 'none';
    vine.style.strokeDasharray = String(len);
    vine.style.strokeDashoffset = params.reduce ? '0' : String(len);
    // place leaves
    leaves.innerHTML = '';
    const LEAF_COUNT = 14;
    for (let i = 0; i < LEAF_COUNT; i++) {
      const t = i / LEAF_COUNT;
      const [x, y] = sampler(t);
      const dx = sampler((t + 0.001) % 1)[0] - x;
      const dy = sampler((t + 0.001) % 1)[1] - y;
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      const leaf = document.createElementNS(SVG_NS, 'path');
      leaf.setAttribute('d', 'M0 0 q6 -4 12 0 q-6 4 -12 0 z');
      leaf.setAttribute('fill', '#4a9c44');
      leaf.setAttribute('transform', `translate(${x} ${y}) rotate(${ang + 90})`);
      leaf.style.opacity = params.reduce ? '1' : '0';
      leaf.style.transition = `opacity 200ms linear ${(t * params.speed).toFixed(0)}ms`;
      leaves.appendChild(leaf);
    }
  };
  fit();

  if (!params.reduce) {
    // Force reflow then start growth (avoids rAF-collapse, mirroring the fix in draw.js).
    void vine.getBoundingClientRect();
    vine.style.transition = `stroke-dashoffset ${params.speed}ms ease-out`;
    vine.style.strokeDashoffset = '0';
    requestAnimationFrame(() => {
      leaves.querySelectorAll('path').forEach((l) => (l.style.opacity = '1'));
    });
  }

  const ro = new ResizeObserver(fit);
  ro.observe(host);
  return () => {
    ro.disconnect();
    svg.remove();
  };
}
```

- [ ] **Step 3: `src/effects/fireflies.js`**

```js
import { roundedRectSampler } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachCanvas } from './_helpers.js';
import { toRGBA } from '../color.js';

export function createFireflies(host, params) {
  const { canvas, ctx, fit, dpr, rect } = attachCanvas(host, 'fireflies');
  const baseColor = toRGBA(
    params.color === 'currentColor' ? '#ffe27a' : params.color
  );

  let sampler = () => [0, 0];
  const refit = () => {
    fit();
    const r = rect();
    sampler = roundedRectSampler({
      width: r.width,
      height: r.height,
      radius: resolveRadius(host, params),
      inset: params.thickness / 2,
    });
  };
  refit();

  const N = 10;
  const parts = Array.from({ length: N }, (_, i) => ({
    t: i / N + Math.random() * 0.02,
    v: 0.004 + Math.random() * 0.005,
    blink: Math.random() * Math.PI * 2,
  }));
  let raf = 0;
  function frame(now) {
    const d = dpr();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 12 * d;
    ctx.fillStyle = baseColor;
    const t = now * 0.001;
    for (const p of parts) {
      if (!params.reduce) p.t = (p.t + p.v) % 1;
      const [x, y] = sampler(p.t);
      const alpha = params.reduce ? 0.8 : 0.5 + 0.5 * Math.sin(t * 1.4 + p.blink);
      ctx.globalAlpha = Math.max(0.15, alpha);
      ctx.beginPath();
      ctx.arc(x * d, y * d, (params.thickness + 1.5) * d, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = params.reduce ? 0 : requestAnimationFrame(frame);
  }
  frame(performance.now());

  const ro = new ResizeObserver(refit);
  ro.observe(host);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    canvas.remove();
  };
}
```

- [ ] **Step 4: Tests** for grass, vines, fireflies

`test/grass.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('grass appends a canvas overlay', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'grass'));
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => !!document.getElementById('bw').querySelector('canvas[data-border-wc="grass"]'))).toBe(true);
});
```

`test/vines.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('vines appends an SVG with a vine path and leaves', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'vines'));
  await page.waitForTimeout(120);
  const r = await page.evaluate(() => {
    const svg = document.getElementById('bw').querySelector('svg[data-border-wc="vines"]');
    return { hasSvg: !!svg, paths: svg?.querySelectorAll('path').length || 0 };
  });
  expect(r.hasSvg).toBe(true);
  expect(r.paths).toBeGreaterThan(1); // vine + leaves
});
```

`test/fireflies.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('fireflies appends a canvas overlay', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'fireflies'));
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => !!document.getElementById('bw').querySelector('canvas[data-border-wc="fireflies"]'))).toBe(true);
});
```

- [ ] **Step 5: Build + test + commit**

```bash
npm run build 2>&1 | tail -2
npm test 2>&1 | tail -3   # expect 24 passing
git add src/effects/grass.js src/effects/vines.js src/effects/fireflies.js \
        test/grass.spec.js test/vines.spec.js test/fireflies.spec.js
git commit -m "feat(effects): organic — grass, vines, fireflies"
```

---

### Task 4: Retro/craft effects — ascii, stitching, typewriter

**Files:** create `src/effects/{ascii,stitching,typewriter}.js` and tests.

- [ ] **Step 1: `src/effects/ascii.js`**

```js
import { attachOverlaySvg } from './_helpers.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function createAscii(host, params) {
  const svg = attachOverlaySvg(host, 'ascii');
  const g = document.createElementNS(SVG_NS, 'g');
  svg.appendChild(g);

  const CHAR_W = 8;
  const CHAR_H = 14;
  const fill = params.color === 'currentColor' ? 'currentColor' : params.color;

  let chars = [];
  const fit = () => {
    g.innerHTML = '';
    chars = [];
    const r = host.getBoundingClientRect();
    const cols = Math.max(2, Math.floor(r.width / CHAR_W));
    const rows = Math.max(2, Math.floor(r.height / CHAR_H));
    // top, bottom rows; left, right cols
    const make = (x, y, ch) => {
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', x);
      t.setAttribute('y', y);
      t.setAttribute('fill', fill);
      t.setAttribute('font-family', 'ui-monospace, "SF Mono", Menlo, monospace');
      t.setAttribute('font-size', String(CHAR_H));
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('dominant-baseline', 'central');
      t.textContent = ch;
      t.style.opacity = params.reduce ? '1' : '0';
      g.appendChild(t);
      chars.push(t);
    };
    make(CHAR_W / 2, CHAR_H / 2, '╔');
    for (let i = 1; i < cols - 1; i++) make(i * CHAR_W + CHAR_W / 2, CHAR_H / 2, '═');
    make((cols - 1) * CHAR_W + CHAR_W / 2, CHAR_H / 2, '╗');
    for (let j = 1; j < rows - 1; j++) {
      make(CHAR_W / 2, j * CHAR_H + CHAR_H / 2, '║');
      make((cols - 1) * CHAR_W + CHAR_W / 2, j * CHAR_H + CHAR_H / 2, '║');
    }
    make(CHAR_W / 2, (rows - 1) * CHAR_H + CHAR_H / 2, '╚');
    for (let i = 1; i < cols - 1; i++) make(i * CHAR_W + CHAR_W / 2, (rows - 1) * CHAR_H + CHAR_H / 2, '═');
    make((cols - 1) * CHAR_W + CHAR_W / 2, (rows - 1) * CHAR_H + CHAR_H / 2, '╝');
  };
  fit();

  // Type-on reveal.
  if (!params.reduce) {
    const step = Math.max(8, params.speed / Math.max(1, chars.length));
    chars.forEach((c, i) => {
      setTimeout(() => { c.style.opacity = '1'; }, i * step);
    });
  }

  const ro = new ResizeObserver(fit);
  ro.observe(host);
  return () => {
    ro.disconnect();
    svg.remove();
  };
}
```

- [ ] **Step 2: `src/effects/stitching.js`**

```js
import { roundedRectPath } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachOverlaySvg, SVG_NS } from './_helpers.js';

export function createStitching(host, params) {
  const svg = attachOverlaySvg(host, 'stitching');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', params.color);
  path.setAttribute('stroke-width', String(Math.max(1.5, params.thickness)));
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-dasharray', '6 4');
  svg.appendChild(path);

  const fit = () => {
    const r = host.getBoundingClientRect();
    path.setAttribute(
      'd',
      roundedRectPath({
        width: r.width,
        height: r.height,
        radius: resolveRadius(host, params),
        inset: params.thickness / 2,
      })
    );
  };
  fit();
  if (!params.reduce && host.hasAttribute('animate')) {
    path.style.animation = `bw-stitch-march ${Math.max(800, params.speed * 4)}ms linear infinite`;
  }
  // Inject keyframes once.
  if (!document.getElementById('bw-stitch-kf')) {
    const s = document.createElement('style');
    s.id = 'bw-stitch-kf';
    s.textContent = '@keyframes bw-stitch-march { to { stroke-dashoffset: -10; } }';
    document.head.appendChild(s);
  }

  const ro = new ResizeObserver(fit);
  ro.observe(host);
  return () => {
    ro.disconnect();
    svg.remove();
  };
}
```

- [ ] **Step 3: `src/effects/typewriter.js`**

```js
import { roundedRectSampler, roundedRectPerimeter } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachOverlaySvg } from './_helpers.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function createTypewriter(host, params) {
  const svg = attachOverlaySvg(host, 'typewriter');
  const g = document.createElementNS(SVG_NS, 'g');
  svg.appendChild(g);
  const fill = params.color === 'currentColor' ? 'currentColor' : params.color;
  const message = params.mode && params.mode !== 'center' ? String(params.mode) : 'hello world  ';

  let chars = [];
  const fit = () => {
    g.innerHTML = '';
    chars = [];
    const r = host.getBoundingClientRect();
    const radius = resolveRadius(host, params);
    const inset = params.thickness / 2 + 2;
    const sampler = roundedRectSampler({ width: r.width, height: r.height, radius, inset });
    const perim = roundedRectPerimeter({ width: r.width, height: r.height, radius, inset });
    const CHAR_W = 9;
    const N = Math.max(8, Math.floor(perim / CHAR_W));
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const [x, y] = sampler(t);
      const t2 = sampler((t + 0.001) % 1);
      const ang = (Math.atan2(t2[1] - y, t2[0] - x) * 180) / Math.PI;
      const ch = message[i % message.length] || ' ';
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', String(x));
      text.setAttribute('y', String(y));
      text.setAttribute('fill', fill);
      text.setAttribute('font-family', 'ui-monospace, "SF Mono", Menlo, monospace');
      text.setAttribute('font-size', '11');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('transform', `rotate(${ang} ${x} ${y})`);
      text.textContent = ch;
      text.style.opacity = params.reduce ? '1' : '0';
      g.appendChild(text);
      chars.push(text);
    }
  };
  fit();
  if (!params.reduce) {
    const step = Math.max(8, params.speed / Math.max(1, chars.length));
    chars.forEach((c, i) => setTimeout(() => { c.style.opacity = '1'; }, i * step));
  }

  const ro = new ResizeObserver(fit);
  ro.observe(host);
  return () => { ro.disconnect(); svg.remove(); };
}
```

- [ ] **Step 4: Tests** for ascii, stitching, typewriter

`test/ascii.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('ascii appends an SVG of text characters', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'ascii'));
  await page.waitForTimeout(120);
  const n = await page.evaluate(() => document.getElementById('bw').querySelectorAll('svg[data-border-wc="ascii"] text').length);
  expect(n).toBeGreaterThan(4); // at least the corners
});
```

`test/stitching.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('stitching appends a dashed SVG path', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'stitching'));
  await page.waitForTimeout(120);
  const r = await page.evaluate(() => {
    const path = document.getElementById('bw').querySelector('svg[data-border-wc="stitching"] path');
    return { hasPath: !!path, dasharray: path?.getAttribute('stroke-dasharray') };
  });
  expect(r.hasPath).toBe(true);
  expect(r.dasharray).toBeTruthy();
});
```

`test/typewriter.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('typewriter appends an SVG of rotated text chars around the perimeter', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'typewriter'));
  await page.waitForTimeout(120);
  const n = await page.evaluate(() => document.getElementById('bw').querySelectorAll('svg[data-border-wc="typewriter"] text').length);
  expect(n).toBeGreaterThan(8);
});
```

- [ ] **Step 5: Build + test + commit**

```bash
npm run build 2>&1 | tail -2
npm test 2>&1 | tail -3   # expect 27 passing
git add src/effects/ascii.js src/effects/stitching.js src/effects/typewriter.js \
        test/ascii.spec.js test/stitching.spec.js test/typewriter.spec.js
git commit -m "feat(effects): retro/craft — ascii, stitching, typewriter"
```

---

### Task 5: Pattern/industrial effects — barbed-wire, rope, scallop

- [ ] **Step 1: `src/effects/barbed-wire.js`**

```js
import { roundedRectSampler, roundedRectPath, roundedRectPerimeter } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachOverlaySvg, SVG_NS } from './_helpers.js';

export function createBarbedWire(host, params) {
  const svg = attachOverlaySvg(host, 'barbed-wire');
  const wire = document.createElementNS(SVG_NS, 'path');
  wire.setAttribute('fill', 'none');
  wire.setAttribute('stroke', params.color === 'currentColor' ? '#aaa' : params.color);
  wire.setAttribute('stroke-width', String(Math.max(1.5, params.thickness)));
  svg.appendChild(wire);
  const barbs = document.createElementNS(SVG_NS, 'g');
  barbs.setAttribute('stroke', wire.getAttribute('stroke'));
  barbs.setAttribute('stroke-width', String(Math.max(1.5, params.thickness)));
  barbs.setAttribute('stroke-linecap', 'round');
  svg.appendChild(barbs);

  const fit = () => {
    const r = host.getBoundingClientRect();
    const radius = resolveRadius(host, params);
    const inset = params.thickness / 2;
    wire.setAttribute('d', roundedRectPath({ width: r.width, height: r.height, radius, inset }));
    const perim = roundedRectPerimeter({ width: r.width, height: r.height, radius, inset });
    const sampler = roundedRectSampler({ width: r.width, height: r.height, radius, inset });
    barbs.innerHTML = '';
    const N = Math.max(8, Math.floor(perim / 30));
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const [x, y] = sampler(t);
      // X-shape barb
      for (const d of [25, -25]) {
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', String(x - 4));
        line.setAttribute('y1', String(y - 4));
        line.setAttribute('x2', String(x + 4));
        line.setAttribute('y2', String(y + 4));
        line.setAttribute('transform', `rotate(${d} ${x} ${y})`);
        barbs.appendChild(line);
      }
    }
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(host);
  return () => { ro.disconnect(); svg.remove(); };
}
```

- [ ] **Step 2: `src/effects/rope.js`**

```js
import { roundedRectSampler, roundedRectPerimeter } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachOverlaySvg, SVG_NS } from './_helpers.js';

export function createRope(host, params) {
  const svg = attachOverlaySvg(host, 'rope');
  const a = document.createElementNS(SVG_NS, 'path');
  const b = document.createElementNS(SVG_NS, 'path');
  for (const p of [a, b]) {
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', params.color === 'currentColor' ? '#9a6b3b' : params.color);
    p.setAttribute('stroke-width', String(Math.max(2, params.thickness)));
    p.setAttribute('stroke-linecap', 'round');
    svg.appendChild(p);
  }

  const fit = () => {
    const r = host.getBoundingClientRect();
    const radius = resolveRadius(host, params);
    const inset = params.thickness / 2;
    const sampler = roundedRectSampler({ width: r.width, height: r.height, radius, inset });
    const perim = roundedRectPerimeter({ width: r.width, height: r.height, radius, inset });
    function build(phaseShift) {
      const N = Math.max(64, Math.floor(perim / 4));
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const [x, y] = sampler(t);
        const t2 = sampler((t + 0.001) % 1);
        const dx = t2[0] - x, dy = t2[1] - y;
        const L = Math.hypot(dx, dy) || 1;
        const nx = dy / L, ny = -dx / L;
        const phase = t * Math.PI * N * 0.5 + phaseShift;
        const k = 3 * Math.sin(phase);
        pts.push(`${x + nx * k},${y + ny * k}`);
      }
      return 'M' + pts.join('L') + 'Z';
    }
    a.setAttribute('d', build(0));
    b.setAttribute('d', build(Math.PI));
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(host);
  return () => { ro.disconnect(); svg.remove(); };
}
```

- [ ] **Step 3: `src/effects/scallop.js`**

```js
import { roundedRectSampler, roundedRectPerimeter } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachOverlaySvg, SVG_NS } from './_helpers.js';

export function createScallop(host, params) {
  const svg = attachOverlaySvg(host, 'scallop');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', params.color);
  path.setAttribute('stroke-width', String(Math.max(1.5, params.thickness)));
  svg.appendChild(path);

  let sampler = () => [0, 0];
  let perim = 0;
  const fit = () => {
    const r = host.getBoundingClientRect();
    const radius = resolveRadius(host, params);
    const inset = params.thickness / 2;
    sampler = roundedRectSampler({ width: r.width, height: r.height, radius, inset });
    perim = roundedRectPerimeter({ width: r.width, height: r.height, radius, inset });
    render(0);
  };
  function render(time) {
    const ARC_W = 12;
    const N = Math.max(6, Math.floor(perim / ARC_W));
    let d = '';
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const [x, y] = sampler(t);
      const t2 = sampler((t + 0.001) % 1);
      const dx = t2[0] - x, dy = t2[1] - y;
      const L = Math.hypot(dx, dy) || 1;
      const nx = dy / L, ny = -dx / L;
      const wob = params.reduce ? 0 : Math.sin(time * 0.002 + t * Math.PI * 8) * 1.5;
      const px = x + nx * (4 + wob);
      const py = y + ny * (4 + wob);
      d += (i === 0 ? 'M' : 'L') + px.toFixed(2) + ',' + py.toFixed(2) + ' ';
    }
    path.setAttribute('d', d + 'Z');
  }

  fit();
  let raf = 0;
  function frame(now) {
    render(now);
    raf = params.reduce ? 0 : requestAnimationFrame(frame);
  }
  if (!params.reduce) raf = requestAnimationFrame(frame);

  const ro = new ResizeObserver(fit);
  ro.observe(host);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); svg.remove(); };
}
```

- [ ] **Step 4: Tests**

`test/barbed-wire.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('barbed-wire appends an SVG with wire path and barb lines', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'barbed-wire'));
  await page.waitForTimeout(120);
  const r = await page.evaluate(() => {
    const svg = document.getElementById('bw').querySelector('svg[data-border-wc="barbed-wire"]');
    return { hasSvg: !!svg, lines: svg?.querySelectorAll('line').length || 0 };
  });
  expect(r.hasSvg).toBe(true);
  expect(r.lines).toBeGreaterThan(8);
});
```

`test/rope.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('rope appends an SVG with two intertwined paths', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'rope'));
  await page.waitForTimeout(120);
  const n = await page.evaluate(() => document.getElementById('bw').querySelectorAll('svg[data-border-wc="rope"] path').length);
  expect(n).toBe(2);
});
```

`test/scallop.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('scallop appends an SVG path with a closed scalloped outline', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'scallop'));
  await page.waitForTimeout(120);
  const d = await page.evaluate(() => document.getElementById('bw').querySelector('svg[data-border-wc="scallop"] path')?.getAttribute('d'));
  expect(d).toBeTruthy();
  expect(d.endsWith('Z')).toBe(true);
});
```

- [ ] **Step 5: Build + test + commit**

```bash
npm run build 2>&1 | tail -2
npm test 2>&1 | tail -3   # expect 30 passing
git add src/effects/barbed-wire.js src/effects/rope.js src/effects/scallop.js \
        test/barbed-wire.spec.js test/rope.spec.js test/scallop.spec.js
git commit -m "feat(effects): pattern — barbed-wire, rope, scallop"
```

---

### Task 6: Trippy/chromatic effects — psychedelic, plasma

- [ ] **Step 1: `src/effects/psychedelic.js`**

```js
import { roundedRectPath } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachOverlaySvg, SVG_NS } from './_helpers.js';

let gradId = 0;

export function createPsychedelic(host, params) {
  const svg = attachOverlaySvg(host, 'psychedelic');
  const id = `bw-psy-${++gradId}`;
  const defs = document.createElementNS(SVG_NS, 'defs');
  const grad = document.createElementNS(SVG_NS, 'linearGradient');
  grad.setAttribute('id', id);
  grad.setAttribute('x1', '0'); grad.setAttribute('x2', '1');
  grad.setAttribute('y1', '0'); grad.setAttribute('y2', '0');
  ['#ff0080', '#ff8000', '#ffd200', '#00d26a', '#00a3ff', '#7a2bff', '#ff0080'].forEach((c, i, a) => {
    const s = document.createElementNS(SVG_NS, 'stop');
    s.setAttribute('offset', String(i / (a.length - 1)));
    s.setAttribute('stop-color', c);
    grad.appendChild(s);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', `url(#${id})`);
  path.setAttribute('stroke-width', String(Math.max(2, params.thickness)));
  svg.appendChild(path);

  const fit = () => {
    const r = host.getBoundingClientRect();
    path.setAttribute(
      'd',
      roundedRectPath({
        width: r.width,
        height: r.height,
        radius: resolveRadius(host, params),
        inset: params.thickness / 2,
      })
    );
  };
  fit();

  let raf = 0;
  const start = performance.now();
  function frame(now) {
    const t = ((now - start) / params.speed) % 1;
    grad.setAttribute('gradientTransform', `translate(${t.toFixed(3)} 0)`);
    raf = params.reduce ? 0 : requestAnimationFrame(frame);
  }
  if (!params.reduce) raf = requestAnimationFrame(frame);

  const ro = new ResizeObserver(fit);
  ro.observe(host);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); svg.remove(); };
}
```

- [ ] **Step 2: `src/effects/plasma.js`**

```js
import { roundedRectSampler } from '../perimeter.js';
import { resolveRadius } from '../params.js';
import { attachCanvas } from './_helpers.js';

// Simple 1D pseudo-noise (deterministic, no external dep).
function noise1d(x) {
  const n = Math.sin(x * 12.9898) * 43758.5453;
  return n - Math.floor(n);
}

export function createPlasma(host, params) {
  const { canvas, ctx, fit, dpr, rect } = attachCanvas(host, 'plasma');

  let sampler = () => [0, 0];
  const refit = () => {
    fit();
    const r = rect();
    sampler = roundedRectSampler({
      width: r.width,
      height: r.height,
      radius: resolveRadius(host, params),
      inset: params.thickness / 2,
    });
  };
  refit();

  let raf = 0;
  const start = performance.now();
  function frame(now) {
    const d = dpr();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';
    const t = (now - start) / 1000;
    const N = 120;
    for (let i = 0; i < N; i++) {
      const s = i / N;
      const [x, y] = sampler(s);
      const hue = (noise1d(s * 7 + t * 0.6) * 360 + t * 60) % 360;
      ctx.fillStyle = `hsl(${hue}, 95%, 55%)`;
      ctx.beginPath();
      ctx.arc(x * d, y * d, (params.thickness + 2) * d, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    raf = params.reduce ? 0 : requestAnimationFrame(frame);
  }
  frame(performance.now());

  const ro = new ResizeObserver(refit);
  ro.observe(host);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); canvas.remove(); };
}
```

- [ ] **Step 3: Tests**

`test/psychedelic.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('psychedelic appends an SVG with a gradient-stroked path', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'psychedelic'));
  await page.waitForTimeout(120);
  const stroke = await page.evaluate(() => document.getElementById('bw').querySelector('svg[data-border-wc="psychedelic"] path')?.getAttribute('stroke'));
  expect(stroke).toMatch(/^url\(#/);
});
```

`test/plasma.spec.js`:
```js
import { test, expect } from '@playwright/test';
test('plasma appends a canvas overlay', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('bw').setAttribute('effect', 'plasma'));
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => !!document.getElementById('bw').querySelector('canvas[data-border-wc="plasma"]'))).toBe(true);
});
```

- [ ] **Step 4: Build + test + commit**

```bash
npm run build 2>&1 | tail -2
npm test 2>&1 | tail -3   # expect 32 passing
git add src/effects/psychedelic.js src/effects/plasma.js \
        test/psychedelic.spec.js test/plasma.spec.js
git commit -m "feat(effects): trippy — psychedelic, plasma"
```

---

### Task 7: Registry spec + extended reduced-motion coverage

- [ ] **Step 1: `test/registry.spec.js`**

```js
import { test, expect } from '@playwright/test';
test('registry exposes all 17 effect names', async ({ page }) => {
  await page.goto('/test/test-page.html');
  const r = await page.evaluate(async () => {
    const m = await import('/src/registry.js');
    return { keys: Object.keys(m.EFFECTS).sort(), extreme: m.EXTREME.sort() };
  });
  const expected = [
    'ascii', 'barbed-wire', 'draw', 'fireflies', 'flames', 'glitch', 'grass',
    'lightning', 'plasma', 'psychedelic', 'rope', 'scallop', 'sparks',
    'squiggle', 'stitching', 'typewriter', 'vines',
  ];
  expect(r.keys).toEqual(expected);
  expect(r.extreme).toEqual(expected);
});

test('every effect renders some overlay element with motion=reduce', async ({ page }) => {
  // Smoke-coverage for the reduced-motion contract: each effect must show
  // *something* even when motion is reduced — no blank.
  await page.goto('/test/test-page.html');
  const results = await page.evaluate(async () => {
    const m = await import('/src/registry.js');
    const out = {};
    const host = document.getElementById('bw');
    for (const name of Object.keys(m.EFFECTS)) {
      host.setAttribute('motion', 'reduce');
      host.setAttribute('effect', name);
      await new Promise((r) => setTimeout(r, 150));
      const hasOverlay = !!host.querySelector(`[data-border-wc="${name}"]`);
      out[name] = hasOverlay;
      host.removeAttribute('effect');
      await new Promise((r) => setTimeout(r, 30));
    }
    return out;
  });
  for (const [name, ok] of Object.entries(results)) {
    expect(ok, `${name} should render overlay in motion=reduce`).toBe(true);
  }
});
```

- [ ] **Step 2: Build + test + commit**

```bash
npm test 2>&1 | tail -3   # expect 34 passing
git add test/registry.spec.js
git commit -m "test: registry + reduced-motion coverage for all 17 effects"
```

---

### Task 8: Gallery (`docs/index.html` + `docs/playground.js`)

Extend the playground to 17 cards across 5 vibe-sections with a TOC, plus Replay buttons on the discrete-start effects.

- [ ] **Step 1: Rewrite the `<main>` of `docs/index.html`**

Replace the existing `<main class="content">…</main>` block with:

```html
  <main class="content">
    <header class="page-head">
      <h1>border-wc</h1>
      <p class="muted">Seventeen extreme border effects the platform under-serves — tweak the knobs, copy the snippet.</p>
      <nav class="toc">
        <a href="#energy">Energy</a> · <a href="#organic">Organic</a> ·
        <a href="#retro">Retro / craft</a> · <a href="#pattern">Pattern</a> ·
        <a href="#trippy">Trippy</a>
      </nav>
    </header>

    <section id="energy">
      <h2>Energy</h2>
      <div class="playground">
        <article class="effect-card" data-effect="lightning" data-prefix="lt">
          <h3>lightning</h3>
          <border-wc effect="lightning" animate><div class="sample">Critical alert</div></border-wc>
          <div class="knobs"><label for="lt-color">color</label><input id="lt-color" type="color" value="#62baff"><label for="lt-thick">thickness</label><input id="lt-thick" type="range" min="1" max="6" step="0.5" value="2"><label for="lt-speed">speed</label><input id="lt-speed" type="range" min="200" max="3000" step="100" value="1000"><label for="lt-radius">radius</label><input id="lt-radius" type="range" min="0" max="40" step="2" value="12"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
        <article class="effect-card" data-effect="flames" data-prefix="fl">
          <h3>flames</h3>
          <border-wc effect="flames" animate><div class="sample">Hot deal</div></border-wc>
          <div class="knobs"><label for="fl-color">color</label><input id="fl-color" type="color" value="#ff5a00"><label for="fl-thick">thickness</label><input id="fl-thick" type="range" min="1" max="6" step="0.5" value="2"><label for="fl-speed">speed</label><input id="fl-speed" type="range" min="200" max="3000" step="100" value="1000"><label for="fl-radius">radius</label><input id="fl-radius" type="range" min="0" max="40" step="2" value="12"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
        <article class="effect-card" data-effect="glitch" data-prefix="gl">
          <h3>glitch</h3>
          <border-wc effect="glitch" animate><div class="sample">Error state</div></border-wc>
          <div class="knobs"><label for="gl-color">color</label><input id="gl-color" type="color" value="#ffffff"><label for="gl-thick">thickness</label><input id="gl-thick" type="range" min="1" max="6" step="0.5" value="2"><label for="gl-speed">speed</label><input id="gl-speed" type="range" min="200" max="3000" step="100" value="800"><label for="gl-radius">radius</label><input id="gl-radius" type="range" min="0" max="40" step="2" value="12"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
      </div>
    </section>

    <section id="organic">
      <h2>Organic</h2>
      <div class="playground">
        <article class="effect-card" data-effect="grass" data-prefix="gr">
          <h3>grass</h3>
          <border-wc effect="grass" animate><div class="sample">Garden</div></border-wc>
          <div class="knobs"><label for="gr-color">color</label><input id="gr-color" type="color" value="#4cc44c"><label for="gr-thick">thickness</label><input id="gr-thick" type="range" min="1" max="6" step="0.5" value="2"><label for="gr-speed">speed</label><input id="gr-speed" type="range" min="200" max="3000" step="100" value="1200"><label for="gr-radius">radius</label><input id="gr-radius" type="range" min="0" max="40" step="2" value="12"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
        <article class="effect-card" data-effect="vines" data-prefix="vn">
          <h3>vines <button type="button" class="replay" data-replay aria-label="Replay vines animation">&#9654; Replay</button></h3>
          <border-wc effect="vines" animate><div class="sample">Secret garden</div></border-wc>
          <div class="knobs"><label for="vn-color">color</label><input id="vn-color" type="color" value="#2f6b2a"><label for="vn-thick">thickness</label><input id="vn-thick" type="range" min="1" max="6" step="0.5" value="3"><label for="vn-speed">speed</label><input id="vn-speed" type="range" min="200" max="3000" step="100" value="1800"><label for="vn-radius">radius</label><input id="vn-radius" type="range" min="0" max="40" step="2" value="14"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
        <article class="effect-card" data-effect="fireflies" data-prefix="ff">
          <h3>fireflies</h3>
          <border-wc effect="fireflies" animate><div class="sample">Twilight</div></border-wc>
          <div class="knobs"><label for="ff-color">color</label><input id="ff-color" type="color" value="#ffe27a"><label for="ff-thick">thickness</label><input id="ff-thick" type="range" min="1" max="6" step="0.5" value="2"><label for="ff-speed">speed</label><input id="ff-speed" type="range" min="200" max="3000" step="100" value="2400"><label for="ff-radius">radius</label><input id="ff-radius" type="range" min="0" max="40" step="2" value="14"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
      </div>
    </section>

    <section id="retro">
      <h2>Retro / craft</h2>
      <div class="playground">
        <article class="effect-card" data-effect="ascii" data-prefix="as">
          <h3>ascii <button type="button" class="replay" data-replay aria-label="Replay ascii animation">&#9654; Replay</button></h3>
          <border-wc effect="ascii" animate><div class="sample">Terminal</div></border-wc>
          <div class="knobs"><label for="as-color">color</label><input id="as-color" type="color" value="#7fff7f"><label for="as-thick">thickness</label><input id="as-thick" type="range" min="1" max="6" step="0.5" value="2"><label for="as-speed">speed</label><input id="as-speed" type="range" min="200" max="3000" step="100" value="1200"><label for="as-radius">radius</label><input id="as-radius" type="range" min="0" max="40" step="2" value="0"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
        <article class="effect-card" data-effect="stitching" data-prefix="st">
          <h3>stitching</h3>
          <border-wc effect="stitching" animate><div class="sample">Quilt</div></border-wc>
          <div class="knobs"><label for="st-color">color</label><input id="st-color" type="color" value="#d23527"><label for="st-thick">thickness</label><input id="st-thick" type="range" min="1" max="6" step="0.5" value="2"><label for="st-speed">speed</label><input id="st-speed" type="range" min="200" max="3000" step="100" value="800"><label for="st-radius">radius</label><input id="st-radius" type="range" min="0" max="40" step="2" value="12"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
        <article class="effect-card" data-effect="typewriter" data-prefix="tw">
          <h3>typewriter <button type="button" class="replay" data-replay aria-label="Replay typewriter animation">&#9654; Replay</button></h3>
          <border-wc effect="typewriter" animate><div class="sample">Story time</div></border-wc>
          <div class="knobs"><label for="tw-color">color</label><input id="tw-color" type="color" value="#ffffff"><label for="tw-thick">thickness</label><input id="tw-thick" type="range" min="1" max="6" step="0.5" value="2"><label for="tw-speed">speed</label><input id="tw-speed" type="range" min="200" max="3000" step="100" value="1600"><label for="tw-radius">radius</label><input id="tw-radius" type="range" min="0" max="40" step="2" value="12"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
      </div>
    </section>

    <section id="pattern">
      <h2>Pattern / industrial</h2>
      <div class="playground">
        <article class="effect-card" data-effect="barbed-wire" data-prefix="bw">
          <h3>barbed-wire</h3>
          <border-wc effect="barbed-wire" animate><div class="sample">Restricted</div></border-wc>
          <div class="knobs"><label for="bw-color">color</label><input id="bw-color" type="color" value="#bbbbbb"><label for="bw-thick">thickness</label><input id="bw-thick" type="range" min="1" max="6" step="0.5" value="2"><label for="bw-speed">speed</label><input id="bw-speed" type="range" min="200" max="3000" step="100" value="1000"><label for="bw-radius">radius</label><input id="bw-radius" type="range" min="0" max="40" step="2" value="12"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
        <article class="effect-card" data-effect="rope" data-prefix="rp">
          <h3>rope</h3>
          <border-wc effect="rope" animate><div class="sample">Nautical</div></border-wc>
          <div class="knobs"><label for="rp-color">color</label><input id="rp-color" type="color" value="#9a6b3b"><label for="rp-thick">thickness</label><input id="rp-thick" type="range" min="1" max="6" step="0.5" value="2.5"><label for="rp-speed">speed</label><input id="rp-speed" type="range" min="200" max="3000" step="100" value="1200"><label for="rp-radius">radius</label><input id="rp-radius" type="range" min="0" max="40" step="2" value="12"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
        <article class="effect-card" data-effect="scallop" data-prefix="sc">
          <h3>scallop</h3>
          <border-wc effect="scallop" animate><div class="sample">Victorian</div></border-wc>
          <div class="knobs"><label for="sc-color">color</label><input id="sc-color" type="color" value="#e0b3d6"><label for="sc-thick">thickness</label><input id="sc-thick" type="range" min="1" max="6" step="0.5" value="2"><label for="sc-speed">speed</label><input id="sc-speed" type="range" min="200" max="3000" step="100" value="1600"><label for="sc-radius">radius</label><input id="sc-radius" type="range" min="0" max="40" step="2" value="14"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
      </div>
    </section>

    <section id="trippy">
      <h2>Trippy / chromatic</h2>
      <div class="playground">
        <article class="effect-card" data-effect="psychedelic" data-prefix="py">
          <h3>psychedelic</h3>
          <border-wc effect="psychedelic" animate><div class="sample">60s vibes</div></border-wc>
          <div class="knobs"><label for="py-color">color</label><input id="py-color" type="color" value="#ff00aa"><label for="py-thick">thickness</label><input id="py-thick" type="range" min="1" max="6" step="0.5" value="3"><label for="py-speed">speed</label><input id="py-speed" type="range" min="200" max="3000" step="100" value="2000"><label for="py-radius">radius</label><input id="py-radius" type="range" min="0" max="40" step="2" value="14"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
        <article class="effect-card" data-effect="plasma" data-prefix="pl">
          <h3>plasma</h3>
          <border-wc effect="plasma" animate><div class="sample">Demo-scene</div></border-wc>
          <div class="knobs"><label for="pl-color">color</label><input id="pl-color" type="color" value="#5b8eff"><label for="pl-thick">thickness</label><input id="pl-thick" type="range" min="1" max="6" step="0.5" value="3"><label for="pl-speed">speed</label><input id="pl-speed" type="range" min="200" max="3000" step="100" value="1400"><label for="pl-radius">radius</label><input id="pl-radius" type="range" min="0" max="40" step="2" value="14"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
      </div>
    </section>

    <section id="originals">
      <h2>Originals</h2>
      <div class="playground">
        <article class="effect-card" data-effect="squiggle" data-prefix="sq">
          <h3>squiggle</h3>
          <border-wc effect="squiggle" animate><div class="sample">Hand-drawn vibe</div></border-wc>
          <div class="knobs"><label for="sq-color">color</label><input id="sq-color" type="color" value="#ec4899"><label for="sq-thick">thickness</label><input id="sq-thick" type="range" min="1" max="6" step="0.5" value="2"><label for="sq-speed">speed</label><input id="sq-speed" type="range" min="200" max="3000" step="100" value="1000"><label for="sq-radius">radius</label><input id="sq-radius" type="range" min="0" max="40" step="2" value="12"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
        <article class="effect-card" data-effect="draw" data-prefix="dr">
          <h3>draw <button type="button" class="replay" data-replay aria-label="Replay draw animation">&#9654; Replay</button></h3>
          <border-wc effect="draw" animate><div class="sample">Stroke-on reveal</div></border-wc>
          <div class="knobs"><label for="dr-color">color</label><input id="dr-color" type="color" value="#3b82f6"><label for="dr-thick">thickness</label><input id="dr-thick" type="range" min="1" max="6" step="0.5" value="2"><label for="dr-speed">speed</label><input id="dr-speed" type="range" min="200" max="3000" step="100" value="1200"><label for="dr-radius">radius</label><input id="dr-radius" type="range" min="0" max="40" step="2" value="12"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
        <article class="effect-card" data-effect="sparks" data-prefix="sp">
          <h3>sparks</h3>
          <border-wc effect="sparks" animate><div class="sample">Live indicator</div></border-wc>
          <div class="knobs"><label for="sp-color">color</label><input id="sp-color" type="color" value="#10b981"><label for="sp-thick">thickness</label><input id="sp-thick" type="range" min="1" max="6" step="0.5" value="2"><label for="sp-speed">speed</label><input id="sp-speed" type="range" min="200" max="3000" step="100" value="1000"><label for="sp-radius">radius</label><input id="sp-radius" type="range" min="0" max="40" step="2" value="12"></div>
          <code-block language="html" theme="dark"></code-block>
        </article>
      </div>
    </section>
  </main>
```

(Note: the originals — squiggle/draw/sparks — go in their own section at the end so the new effects lead.)

- [ ] **Step 2: Update `docs/playground.js`** to read the prefix from `data-prefix` (knobs are now per-card-prefixed differently per effect)

Replace the file with:
```js
const SAMPLE_LABELS = new Proxy({}, { get: (_, k) => k.replace(/-/g, ' ') });

function writeSnippet(cb, snippet) {
  if (typeof cb.setCode === 'function') cb.setCode(snippet);
  else cb.textContent = snippet;
}

function setupCard(card) {
  const effect = card.dataset.effect;
  const win = card.querySelector('border-wc');
  const sample = card.querySelector('.sample');
  const codeBlock = card.querySelector('code-block');
  const inputs = card.querySelectorAll('.knobs input');
  const replay = card.querySelector('[data-replay]');

  function read() {
    const v = {};
    for (const i of inputs) {
      // id pattern is "<prefix>-<knob>"; key off the part after the dash
      const key = i.id.split('-').slice(1).join('-');
      v[key] = i.value;
    }
    return v;
  }

  function apply() {
    const { color, thick, speed, radius } = read();
    win.setAttribute('color', color);
    win.setAttribute('thickness', thick);
    win.setAttribute('speed', speed);
    win.setAttribute('radius', radius);
    sample.style.borderRadius = radius + 'px';
    const label = sample.textContent.trim();
    const snippet =
      `<border-wc effect="${effect}" color="${color}" thickness="${thick}"\n` +
      `           speed="${speed}" radius="${radius}" animate>\n` +
      `  <div class="sample">${label}</div>\n` +
      `</border-wc>`;
    writeSnippet(codeBlock, snippet);
  }

  for (const i of inputs) i.addEventListener('input', apply);
  if (replay) {
    replay.addEventListener('click', () => {
      if (typeof win.refresh === 'function') win.refresh();
    });
  }
  customElements.whenDefined('code-block').then(apply);
  apply();
}

document.querySelectorAll('.effect-card').forEach(setupCard);
```

- [ ] **Step 3: Small CSS bump for the TOC + section spacing** — append to `docs/site.css`:

```css
.toc { font-size: 14px; opacity: 0.7; margin-top: 8px; }
.toc a { color: var(--color-primary); }
main.content section h2 { margin-top: 8px; }
```

- [ ] **Step 4: Site build + commit**

```bash
npm run site:build 2>&1 | tail -2
git add docs/index.html docs/playground.js docs/site.css
git commit -m "site: playground extended to 17 effects across 5 sections + TOC"
```

---

### Task 9: API docs page + README

- [ ] **Step 1: Update `docs/api.html`** — change the `effect` attribute description + add a new "Effects" catalog section.

In the attributes table, replace the `effect` row's description with:
```html
<tr><td><code>effect</code></td><td>One of <code>squiggle</code>, <code>draw</code>, <code>sparks</code>, <code>lightning</code>, <code>flames</code>, <code>glitch</code>, <code>grass</code>, <code>vines</code>, <code>fireflies</code>, <code>ascii</code>, <code>stitching</code>, <code>typewriter</code>, <code>barbed-wire</code>, <code>rope</code>, <code>scallop</code>, <code>psychedelic</code>, <code>plasma</code>. See the <a href="#effects">Effects catalog</a> below.</td></tr>
```

Add a new `<section id="effects">` immediately after the Element section (before `#data-border-effect`):

```html
    <section id="effects">
      <h2>Effects catalog</h2>
      <p class="muted">All 17 effects in one place. Try them live in the <a href="./index.html">gallery playground</a>.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Vibe</th><th>What it draws</th></tr></thead>
          <tbody>
            <tr><td><code>lightning</code></td><td>energy</td><td>Jagged electric bolts with optional forks.</td></tr>
            <tr><td><code>flames</code></td><td>energy</td><td>Fire particles licking outward.</td></tr>
            <tr><td><code>glitch</code></td><td>energy</td><td>RGB-channel offset triplet, periodic shuffle.</td></tr>
            <tr><td><code>grass</code></td><td>organic</td><td>Growing blades with gentle sway.</td></tr>
            <tr><td><code>vines</code></td><td>organic</td><td>Stroked vine + leaves; grows then sits.</td></tr>
            <tr><td><code>fireflies</code></td><td>organic</td><td>Slow drifting glow with blinking.</td></tr>
            <tr><td><code>ascii</code></td><td>retro/craft</td><td>Box-drawing characters around the perimeter.</td></tr>
            <tr><td><code>stitching</code></td><td>retro/craft</td><td>Dashed stitches; optional marching ants.</td></tr>
            <tr><td><code>typewriter</code></td><td>retro/craft</td><td>Rotated chars typed one-at-a-time around.</td></tr>
            <tr><td><code>barbed-wire</code></td><td>pattern</td><td>Wire path + X-shaped barbs at intervals.</td></tr>
            <tr><td><code>rope</code></td><td>pattern</td><td>Two intertwined sinusoidal strokes.</td></tr>
            <tr><td><code>scallop</code></td><td>pattern</td><td>Outward semi-arcs as a frilly edge.</td></tr>
            <tr><td><code>psychedelic</code></td><td>trippy</td><td>Rainbow gradient stroke, animated flow.</td></tr>
            <tr><td><code>plasma</code></td><td>trippy</td><td>Noise-driven multi-color energy on Canvas.</td></tr>
            <tr><td><code>squiggle</code></td><td>original</td><td>SVG turbulence-filtered hand-drawn outline.</td></tr>
            <tr><td><code>draw</code></td><td>original</td><td>Stroke-dasharray reveal animation.</td></tr>
            <tr><td><code>sparks</code></td><td>original</td><td>Canvas particles chasing the perimeter.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
```

- [ ] **Step 2: README** — replace the first paragraph

In `README.md`, change the first descriptive paragraph (around line 7-10) to:
```markdown
A light-DOM web component for high-touch border effects — **17 effects** across
energy (lightning / flames / glitch), organic (grass / vines / fireflies),
retro/craft (ascii / stitching / typewriter), pattern (barbed-wire / rope /
scallop), trippy (psychedelic / plasma), and the originals (squiggle / draw /
sparks). Pairs with vanilla-breeze's CSS-tier `data-border-effect` (spin / pulse
/ march): use the CSS tier for cheap, always-on motion, and reach for
`<border-wc>` when you need SVG / canvas-driven effects.
```

- [ ] **Step 3: Commit**

```bash
git add docs/api.html README.md
git commit -m "docs: catalog of all 17 effects in api.html + README"
```

---

### Task 10: Verify (build, full test suite, headless gallery walk)

- [ ] **Step 1: Full library + site build**

```bash
npm run build 2>&1 | tail -3   # library: lazy chunks for all 17 effects
npm run site:build 2>&1 | tail -3
```

- [ ] **Step 2: Full test suite**

```bash
npm test 2>&1 | tail -3
```
Expected: **~36 passing** (18 pre-existing + 14 per-effect + 2 registry/reduced-motion).

- [ ] **Step 3: Headless gallery walk** — `/Users/tpowell/src/border-wc/.gallerywalk.mjs`:

```js
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = []; p.on('console', m=>m.type()==='error'&&errs.push(m.text())); p.on('pageerror', e=>errs.push(String(e)));
await p.goto('http://localhost:5184/docs/index.html', { waitUntil:'load' });
await p.waitForTimeout(2500);
const r = await p.evaluate(() => {
  const cards = [...document.querySelectorAll('.effect-card')];
  return {
    cardCount: cards.length,
    effects: cards.map(c => c.dataset.effect).sort(),
    upgraded: cards.every(c => !!c.querySelector('border-wc')),
    snippets: cards.every(c => {
      const cb = c.querySelector('code-block');
      const sr = cb?.shadowRoot;
      // Look for the rendered snippet inside the shadow (not the host CSS).
      const code = sr?.querySelector('code, pre');
      return code && code.textContent && /border-wc/.test(code.textContent);
    }),
  };
});
console.log(JSON.stringify(r));
console.log('errors:', errs.slice(0,5));
await b.close();
```
Run:
```bash
npm run site:dev -- --port 5184 >/tmp/border-site.log 2>&1 &
for i in $(seq 1 20); do sleep 1; grep -q "Local:" /tmp/border-site.log && break; done
node .gallerywalk.mjs
rm -f .gallerywalk.mjs
pkill -f "vite --config vite.site.config.js"
```
Expected: `cardCount: 17`, 17 distinct effects, `upgraded: true`, `snippets: true`, no errors.

- [ ] **Step 4: Push + PR + (after CI) merge + verify live**

```bash
git push -u origin feat/effects-catalog-14
gh pr create --title "Effects catalog: 14 new extreme border effects (17 total)" --body "<see spec for summary>"
# Wait for CI green; then merge:
gh pr merge --merge --delete-branch
git checkout main && git pull
```
Then wait for the Pages deploy and spot-check live.

---

## Self-Review

**1. Spec coverage:**
- §2 the 14 effects with rendering + animation + reduced-motion → Tasks 2–6, each providing the complete `create<Name>` module. ✓
- §3.1 effect module shape → all new modules follow the existing `(host, params) => cleanup` signature. ✓
- §3.2 registry → Task 1 Step 2 adds all 14 entries; `EXTREME` automatically picks them up. ✓
- §3.3 helpers → Task 1 Step 1 provides `attachCanvas` + `attachOverlaySvg`; existing 3 effects untouched. ✓
- §3.4 params surface → all modules read from `params` (color/thickness/speed/radius/animate/mode/reduce); no new keys. ✓
- §3.5 reduced motion contract → every module has an `if (params.reduce)` static path. ✓
- §4 gallery extension → Task 8 with 5 sections + TOC + 17 cards + Replay buttons. ✓
- §5 api docs update → Task 9 lists all 17 in the attribute row + new Effects section. ✓
- §6 tests → 14 per-effect specs (Tasks 2–6), registry spec + reduced-motion coverage (Task 7). ✓
- §7 file list → covered across Tasks 1–9. ✓
- §8 verification → Task 10. ✓

**2. Placeholder scan:** every code step has complete code. The PR body in Task 10 Step 4 says `<see spec for summary>` — replace at execution time with a real summary (acceptable as a marker; the body content is explicit).

**3. Consistency:**
- Effect names match across registry (Task 1), per-effect modules (Tasks 2–6), test selectors (`svg[data-border-wc="<name>"]` / `canvas[data-border-wc="<name>"]`), gallery `data-effect` (Task 8), api.html catalog (Task 9), and registry spec expected list (Task 7).
- `attachCanvas` and `attachOverlaySvg` signatures match across helpers (Task 1) and all consumers.
- Replay button + `border-wc.refresh()` pattern matches the existing draw-card pattern; applied to `vines`, `ascii`, `typewriter`, `draw` (already had one).
- `params.reduce` handling consistent across all 14 effects (every module honors it; the registry-spec test asserts each renders an overlay in reduce mode).
