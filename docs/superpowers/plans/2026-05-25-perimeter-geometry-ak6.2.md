# perimeter geometry primitive (ak6.2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `src/lib/perimeter.js` to vanilla-breeze — a uniform-rounded-rect geometry primitive (SVG path + arc-length sampler) that `border-wc`/`bg-wc` will embed.

**Architecture:** A pure, DOM-free core (`roundedRectPerimeter`, `roundedRectPath`, `roundedRectSampler`) plus thin DOM wrappers (`perimeterPath`, `perimeterSampler`) that read a host's box + uniform border-radius. Pure functions are TDD'd with `node:test`; wrappers tested via a stub host.

**Tech Stack:** vanilla JS ESM, `node:test` + `node:assert/strict` (VB's unit-test convention; run `node --test <file>`).

**Repo & branch:** Work in `~/src/vanilla-breeze`. `git checkout -b feat/perimeter work/2026-05-21` (includes merged ak6.1). Module is source-only (not wired into VB's CDN bundle). Spec: `gl-wc/docs/superpowers/specs/2026-05-25-perimeter-geometry-ak6.2-design.md`; bead `gl-wc-ak6.2`.

**Conventions (from VB):** unit tests live in `tests/unit/<name>.test.js`, import from `../../src/lib/...`, use `import { describe, it } from 'node:test'; import assert from 'node:assert/strict';`. Lint: `npm run lint:js`. Commit hook may stage `.beads/issues.jsonl` — use `--no-verify` and commit only the named files; never commit `dist/`/`.beads` churn.

**Geometry contract (shared by all functions):** inset box has origin `(ox,oy)=(inset,inset)`, inner `w=max(0,width-2·inset)`, `h=max(0,height-2·inset)`, corner `r=clamp(radius-inset, 0, min(w,h)/2)`. Perimeter walked **clockwise** from `t=0` at the start of the top edge `(ox+r, oy)`. Total length `L = 2w + 2h − 8r + 2πr`. Corner arcs (screen coords, y-down): top-right center `(ox+w−r, oy+r)` θ −90°→0°; bottom-right `(ox+w−r, oy+h−r)` 0°→90°; bottom-left `(ox+r, oy+h−r)` 90°→180°; top-left `(ox+r, oy+r)` 180°→270°. Arc point `= [Cx + r·cosθ, Cy + r·sinθ]`.

---

## File structure
- **Create** `src/lib/perimeter.js` — the module (pure core + DOM wrappers), built up across Tasks 1–4.
- **Create** `tests/unit/perimeter.test.js` — `node:test` suite, built up across Tasks 1–4.

---

## Task 1: Branch + `roundedRectPerimeter` (length)

**Files:** Create `src/lib/perimeter.js`, `tests/unit/perimeter.test.js`

- [ ] **Step 1: Branch**
```bash
cd ~/src/vanilla-breeze
git checkout -b feat/perimeter work/2026-05-21
```

- [ ] **Step 2: Write the failing test** — create `tests/unit/perimeter.test.js`:
```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { roundedRectPerimeter } from '../../src/lib/perimeter.js';

describe('roundedRectPerimeter', () => {
  it('sharp rectangle is 2(w+h)', () => {
    assert.equal(roundedRectPerimeter({ width: 100, height: 50, radius: 0 }), 300);
  });
  it('rounded rect uses 2w+2h-8r+2πr', () => {
    const L = roundedRectPerimeter({ width: 100, height: 100, radius: 10 });
    assert.ok(Math.abs(L - (400 - 80 + 2 * Math.PI * 10)) < 1e-9);
  });
  it('clamps radius to half the shorter side', () => {
    // radius 999 on 100x40 → r clamps to 20; L = 2*100+2*40-8*20+2π*20
    const L = roundedRectPerimeter({ width: 100, height: 40, radius: 999 });
    assert.ok(Math.abs(L - (280 - 160 + 2 * Math.PI * 20)) < 1e-9);
  });
  it('inset shrinks the box; degenerate size → 0', () => {
    assert.equal(roundedRectPerimeter({ width: 10, height: 10, radius: 0, inset: 5 }), 0);
  });
});
```

- [ ] **Step 3: Run — verify it FAILS**
```bash
node --test tests/unit/perimeter.test.js
```
Expected: FAIL (module/export missing).

- [ ] **Step 4: Implement** — create `src/lib/perimeter.js`:
```js
/**
 * perimeter — uniform rounded-rect geometry primitive (Decorated Layers).
 * Pure core (DOM-free) + thin DOM wrappers. Canonical source in vanilla-breeze;
 * bg-wc / border-wc embed a copy. MVP: axis-aligned rect, uniform border-radius.
 * Perimeter is walked clockwise from t=0 at the top edge (just past the top-left
 * corner). See docs spec ak6.2.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Resolve the inset box: origin (ox,oy), inner size (w,h), clamped radius r.
function box({ width, height, radius = 0, inset = 0 }) {
  const w = Math.max(0, width - 2 * inset);
  const h = Math.max(0, height - 2 * inset);
  const r = clamp(radius - inset, 0, Math.min(w, h) / 2);
  return { ox: inset, oy: inset, w, h, r };
}

export function roundedRectPerimeter(dims) {
  const { w, h, r } = box(dims);
  if (w <= 0 || h <= 0) return 0;
  return 2 * w + 2 * h - 8 * r + 2 * Math.PI * r;
}
```

- [ ] **Step 5: Run — verify it PASSES**
```bash
node --test tests/unit/perimeter.test.js
```
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add src/lib/perimeter.js tests/unit/perimeter.test.js
git commit --no-verify -m "feat(perimeter): roundedRectPerimeter length + module scaffold"
```

---

## Task 2: `roundedRectPath` (SVG path string)

**Files:** Modify `src/lib/perimeter.js`, `tests/unit/perimeter.test.js`

- [ ] **Step 1: Add the failing test** (append to the test file):
```js
import { roundedRectPath } from '../../src/lib/perimeter.js';

describe('roundedRectPath', () => {
  it('r=0 is a sharp rectangle (no arcs), closed', () => {
    const d = roundedRectPath({ width: 100, height: 50, radius: 0 });
    assert.equal(d, 'M0 0H100V50H0Z');
  });
  it('r>0 contains arc commands and is closed', () => {
    const d = roundedRectPath({ width: 100, height: 100, radius: 10 });
    assert.match(d, /A10 10 0 0 1/);   // clockwise quarter arcs
    assert.match(d, /Z$/);
    assert.ok(d.startsWith('M10 0'));  // starts at top edge, past TL corner
  });
  it('applies inset (origin shifts in by inset)', () => {
    const d = roundedRectPath({ width: 100, height: 100, radius: 0, inset: 5 });
    assert.equal(d, 'M5 5H95V95H5Z');
  });
  it('degenerate size → empty path', () => {
    assert.equal(roundedRectPath({ width: 0, height: 10, radius: 0 }), '');
  });
});
```

- [ ] **Step 2: Run — verify FAIL**
```bash
node --test tests/unit/perimeter.test.js
```
Expected: FAIL (roundedRectPath undefined).

- [ ] **Step 3: Implement** — add to `src/lib/perimeter.js`:
```js
// Trim trailing zeros for stable, compact path strings (e.g. "10" not "10.000").
const n = (v) => {
  const s = (Math.round(v * 1000) / 1000).toString();
  return s;
};

export function roundedRectPath(dims) {
  const { ox, oy, w, h, r } = box(dims);
  if (w <= 0 || h <= 0) return '';
  if (r <= 0) {
    return `M${n(ox)} ${n(oy)}H${n(ox + w)}V${n(oy + h)}H${n(ox)}Z`;
  }
  const a = (x, y) => `A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y)}`;
  return (
    `M${n(ox + r)} ${n(oy)}` +
    `H${n(ox + w - r)}` + a(ox + w, oy + r) +
    `V${n(oy + h - r)}` + a(ox + w - r, oy + h) +
    `H${n(ox + r)}` + a(ox, oy + h - r) +
    `V${n(oy + r)}` + a(ox + r, oy) +
    'Z'
  );
}
```

- [ ] **Step 4: Run — verify PASS**
```bash
node --test tests/unit/perimeter.test.js
```
Expected: PASS (all suites).

- [ ] **Step 5: Commit**
```bash
git add src/lib/perimeter.js tests/unit/perimeter.test.js
git commit --no-verify -m "feat(perimeter): roundedRectPath SVG path (sharp + arcs, inset)"
```

---

## Task 3: `roundedRectSampler` (arc-length sampler)

**Files:** Modify `src/lib/perimeter.js`, `tests/unit/perimeter.test.js`

- [ ] **Step 1: Add the failing test**:
```js
import { roundedRectSampler } from '../../src/lib/perimeter.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

describe('roundedRectSampler', () => {
  it('sharp rect: t=0 is top-left, walks clockwise, wraps', () => {
    const s = roundedRectSampler({ width: 100, height: 100, radius: 0 });
    assert.deepEqual(s(0).map((v) => +v.toFixed(6)), [0, 0]);
    // perimeter 400; t=0.25 → 100 along top edge = top-right corner (100,0)
    assert.ok(near(s(0.25)[0], 100) && near(s(0.25)[1], 0));
    // t=0.5 → bottom-right (100,100)
    assert.ok(near(s(0.5)[0], 100) && near(s(0.5)[1], 100));
    // wrap: s(1) === s(0)
    assert.ok(near(s(1)[0], s(0)[0]) && near(s(1)[1], s(0)[1]));
  });
  it('rounded: t=0 is the top edge start (r,0)', () => {
    const s = roundedRectSampler({ width: 100, height: 100, radius: 10 });
    assert.ok(near(s(0)[0], 10) && near(s(0)[1], 0));
  });
  it('rounded: a point inside the top-right corner arc lies on that arc', () => {
    const r = 10, w = 100, h = 100;
    const s = roundedRectSampler({ width: w, height: h, radius: r });
    const Ltop = w - 2 * r;                 // 80
    const Lcorner = (Math.PI / 2) * r;       // arc length
    const L = roundedRectPerimeter({ width: w, height: h, radius: r });
    const t = (Ltop + Lcorner / 2) / L;      // middle of TR corner
    const [x, y] = s(t);
    const cx = w - r, cy = r;                // TR corner center (90,10)
    assert.ok(near(Math.hypot(x - cx, y - cy), r, 1e-6)); // on the arc
  });
});
```

- [ ] **Step 2: Run — verify FAIL**
```bash
node --test tests/unit/perimeter.test.js
```
Expected: FAIL (roundedRectSampler undefined).

- [ ] **Step 3: Implement** — add to `src/lib/perimeter.js`:
```js
export function roundedRectSampler(dims) {
  const { ox, oy, w, h, r } = box(dims);
  if (w <= 0 || h <= 0) return () => [ox, oy];
  const edgeH = w - 2 * r;          // horizontal edge length
  const edgeV = h - 2 * r;          // vertical edge length
  const arc = (Math.PI / 2) * r;    // quarter-corner length
  const deg = (d) => (d * Math.PI) / 180;
  // Segments in clockwise order, each: { len, at(u) } where u in [0,1].
  const onArc = (cx, cy, a0deg) => (u) => {
    const th = deg(a0deg + 90 * u);
    return [cx + r * Math.cos(th), cy + r * Math.sin(th)];
  };
  const segs = [
    { len: edgeH, at: (u) => [ox + r + edgeH * u, oy] },                       // top edge
    { len: arc,   at: onArc(ox + w - r, oy + r, -90) },                        // TR corner
    { len: edgeV, at: (u) => [ox + w, oy + r + edgeV * u] },                    // right edge
    { len: arc,   at: onArc(ox + w - r, oy + h - r, 0) },                       // BR corner
    { len: edgeH, at: (u) => [ox + w - r - edgeH * u, oy + h] },                // bottom edge
    { len: arc,   at: onArc(ox + r, oy + h - r, 90) },                          // BL corner
    { len: edgeV, at: (u) => [ox, oy + h - r - edgeV * u] },                    // left edge
    { len: arc,   at: onArc(ox + r, oy + r, 180) },                            // TL corner
  ];
  const total = segs.reduce((acc, s) => acc + s.len, 0) || 1;
  return (t) => {
    let d = ((t % 1) + 1) % 1 * total; // wrap into [0,total)
    for (const s of segs) {
      if (s.len <= 0) continue;
      if (d <= s.len) return s.at(d / s.len);
      d -= s.len;
    }
    return segs[0].at(0); // exact end → start (wrap)
  };
}
```

- [ ] **Step 4: Run — verify PASS**
```bash
node --test tests/unit/perimeter.test.js
```
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/perimeter.js tests/unit/perimeter.test.js
git commit --no-verify -m "feat(perimeter): roundedRectSampler (arc-length, clockwise)"
```

---

## Task 4: DOM wrappers `perimeterPath` / `perimeterSampler`

**Files:** Modify `src/lib/perimeter.js`, `tests/unit/perimeter.test.js`

- [ ] **Step 1: Add the failing test** (uses a stub host + a stubbed `getComputedStyle` global, per VB's test style):
```js
import { perimeterPath, perimeterSampler } from '../../src/lib/perimeter.js';
import { afterEach } from 'node:test';

describe('DOM wrappers', () => {
  afterEach(() => { delete globalThis.getComputedStyle; });
  const stubHost = (width, height, radiusPx) => {
    globalThis.getComputedStyle = () => ({ borderTopLeftRadius: `${radiusPx}px` });
    return { getBoundingClientRect: () => ({ width, height }) };
  };
  it('perimeterPath reads host box + uniform radius', () => {
    const host = stubHost(100, 50, 0);
    assert.equal(perimeterPath(host), roundedRectPath({ width: 100, height: 50, radius: 0 }));
  });
  it('perimeterSampler reads host + honors inset', () => {
    const host = stubHost(100, 100, 10);
    const s = perimeterSampler(host, 2);
    const ref = roundedRectSampler({ width: 100, height: 100, radius: 10, inset: 2 });
    assert.deepEqual(s(0.3), ref(0.3));
  });
});
```

- [ ] **Step 2: Run — verify FAIL**
```bash
node --test tests/unit/perimeter.test.js
```
Expected: FAIL (perimeterPath/perimeterSampler undefined).

- [ ] **Step 3: Implement** — add to `src/lib/perimeter.js`:
```js
function readDims(host) {
  const rect = host.getBoundingClientRect();
  const cs = getComputedStyle(host);
  const radius = parseFloat(cs.borderTopLeftRadius) || 0;
  return { width: rect.width, height: rect.height, radius };
}

export function perimeterPath(host, inset = 0) {
  return roundedRectPath({ ...readDims(host), inset });
}

export function perimeterSampler(host, inset = 0) {
  return roundedRectSampler({ ...readDims(host), inset });
}
```

- [ ] **Step 4: Run — verify PASS**
```bash
node --test tests/unit/perimeter.test.js
```
Expected: PASS (all suites).

- [ ] **Step 5: Commit**
```bash
git add src/lib/perimeter.js tests/unit/perimeter.test.js
git commit --no-verify -m "feat(perimeter): perimeterPath/perimeterSampler DOM wrappers"
```

---

## Task 5: Verify (full suite + lint)

**Files:** none (verification)

- [ ] **Step 1: Full unit run for this module + the whole suite**
```bash
node --test tests/unit/perimeter.test.js   # all perimeter suites pass
npm test 2>&1 | tail -6                      # whole VB suite still green (no regressions)
```
Expected: perimeter suites pass; overall `fail 0`.

- [ ] **Step 2: Lint**
```bash
npm run lint:js 2>&1 | tail -5
```
Expected: clean for `src/lib/perimeter.js` (fix any style issues — e.g. unused vars, formatting — in the module).

- [ ] **Step 3: Final commit (if lint fixes) and stop**
```bash
git add src/lib/perimeter.js && git commit --no-verify -m "chore(perimeter): lint fixes" || echo "nothing to commit"
```
Then return to gl-wc and update the bead after review: `bd update gl-wc-ak6.2 --status completed`, and open a PR per VB's flow (base `work/2026-05-21`).

---

## Notes for the implementer
- **Pure-first:** the core functions never touch the DOM; only the two wrappers read `getBoundingClientRect`/`getComputedStyle`. Keep it that way (it's why the math is node-testable).
- **No bundle wiring:** this module is source-only for now (packages embed it later); do NOT add it to `src/main.css`/`main*.js` or the CDN build.
- **Number formatting:** `n()` rounds to 3 decimals for stable path strings; tests for r=0/inset use integer dims so strings are exact.
- **Phase 2** (asymmetric/elliptical radii, `clip-path` shape()/path(), non-rect) is captured in bead `gl-wc-ak6.6` + spec §5 — do NOT implement here.
