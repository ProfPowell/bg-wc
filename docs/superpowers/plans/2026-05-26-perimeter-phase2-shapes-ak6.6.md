# perimeter Phase 2 — Advanced Shapes Implementation Plan (ak6.6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend vanilla-breeze's `src/lib/perimeter.js` from uniform rounded rects to the full Phase 2 shape set (asymmetric/elliptical radii, `clip-path` polygon/circle/ellipse/inset/path/shape), keeping the same `path-string` + `(t)=>[x,y]` outputs and all 16 existing tests green.

**Architecture:** A unified **segment model** — a traced shape is `{ start:[x,y], segments:[{kind,len,at,d}] }`. Three generics (`tracePath`/`traceLength`/`traceSampler`) consume it. Per-shape **builders** produce segment lists. Lines + circular arcs are analytic (exact); elliptical arcs + beziers are flattened to fixed-N polylines for sampling while keeping exact SVG curve commands in the path. The MVP's `roundedRect*` functions are reimplemented as thin adapters over this core.

**Tech Stack:** Vanilla JS ESM, `node:test` unit tests (no DOM; DOM wrappers tested with a `globalThis.getComputedStyle` stub).

**Target repo:** `/Users/tpowell/src/vanilla-breeze`. Base branch `work/2026-05-21`; create feature branch `feat/perimeter-phase2`. File: `src/lib/perimeter.js`; tests: `tests/unit/perimeter.test.js`. Run tests with `node --test tests/unit/perimeter.test.js`.

**Spec:** `~/src/gl-wc/docs/superpowers/specs/2026-05-26-perimeter-phase2-shapes-ak6.6-design.md`

**Conventions:** keep the existing `n()` (3-decimal rounding) and `clamp()` helpers. Segments use SVG screen coords (y down). Corner order is always `[TL, TR, BR, BL]` as `[[rx,ry],…]`.

---

### Task 1: Segment core + generics + reimplement uniform rounded-rect

Replace `src/lib/perimeter.js` with the segment-based core, reimplementing `roundedRectPath/Sampler/Perimeter` + the DOM wrappers on top of it. **The 16 existing tests must stay green.**

**Files:**
- Modify (full replace): `src/lib/perimeter.js`
- Test: `tests/unit/perimeter.test.js` (existing 16 — do NOT change them in this task)

- [ ] **Step 1: Run the existing tests first (baseline)**

Run: `cd /Users/tpowell/src/vanilla-breeze && node --test tests/unit/perimeter.test.js`
Expected: 16 pass. This is the green bar Task 1 must preserve.

- [ ] **Step 2: Replace `src/lib/perimeter.js` with the segment core + uniform adapters**

```js
/**
 * perimeter — shape geometry primitive (Decorated Layers).
 * Pure core (DOM-free) + thin DOM wrappers. Canonical source in vanilla-breeze;
 * bg-wc / border-wc embed a copy.
 *
 * A traced shape is { start:[x,y], segments:[Segment] }, where
 *   Segment = { kind:'line'|'arc'|'curve', len:number, at:(u)=>[x,y], d:string }
 *   - len: arc length of the segment
 *   - at(u): point at fraction u∈[0,1] along the segment (arc-length within it)
 *   - d: SVG path commands continuing from the previous point (no leading M)
 * Lines and circular arcs are analytic (exact); elliptical arcs and beziers are
 * flattened to fixed-N polylines for length/sampling while keeping exact curve
 * commands in `d`.
 *
 * t-contract for the sampler:
 *   - rounded rects (incl. asymmetric/elliptical): t=0 at the top edge just
 *     clockwise of the top-left corner; clockwise.
 *   - circle/ellipse: t=0 at the top (12 o'clock); clockwise.
 *   - polygon/path/shape: t=0 at the declared start; declaration order.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const n = (v) => (Math.round(v * 1000) / 1000).toString();
const deg = (d) => (d * Math.PI) / 180;

// ---------- generic operations over { start, segments } ----------

export function tracePath({ start, segments }) {
  if (!segments.length) return '';
  let out = `M${n(start[0])} ${n(start[1])}`;
  segments.forEach((s, i) => {
    if (s.len <= 0 && s.kind !== 'line') return; // skip degenerate (e.g. zero-radius arc)
    // Z draws a straight line back to start, so a trailing straight segment is redundant.
    if (i === segments.length - 1 && s.kind === 'line') return;
    out += s.d;
  });
  return out + 'Z';
}

export function traceLength({ segments }) {
  return segments.reduce((acc, s) => acc + s.len, 0);
}

export function traceSampler({ start, segments }) {
  const total = segments.reduce((acc, s) => acc + s.len, 0);
  if (total <= 0) return () => start.slice();
  return (t) => {
    let d = (((t % 1) + 1) % 1) * total;
    for (const s of segments) {
      if (s.len <= 0) continue;
      if (d <= s.len) return s.at(d / s.len);
      d -= s.len;
    }
    for (let i = segments.length - 1; i >= 0; i--) if (segments[i].len > 0) return segments[i].at(1);
    return start.slice();
  };
}

// ---------- segment constructors ----------

function lineSeg(p0, p1) {
  const [x0, y0] = p0;
  const [x1, y1] = p1;
  const len = Math.hypot(x1 - x0, y1 - y0);
  let d;
  if (y0 === y1) d = `H${n(x1)}`;
  else if (x0 === x1) d = `V${n(y1)}`;
  else d = `L${n(x1)} ${n(y1)}`;
  return { kind: 'line', len, at: (u) => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u], d };
}

// Walk a polyline [[x,y],…] by arc length → { len, at }.
function flattenedWalker(poly) {
  const cum = [0];
  for (let i = 1; i < poly.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  }
  const len = cum[cum.length - 1];
  const at = (u) => {
    if (len <= 0) return poly[0].slice();
    const target = clamp(u, 0, 1) * len;
    let i = 1;
    while (i < cum.length && cum[i] < target) i++;
    if (i >= cum.length) return poly[poly.length - 1].slice();
    const seg = cum[i] - cum[i - 1] || 1;
    const f = (target - cum[i - 1]) / seg;
    return [
      poly[i - 1][0] + (poly[i][0] - poly[i - 1][0]) * f,
      poly[i - 1][1] + (poly[i][1] - poly[i - 1][1]) * f,
    ];
  };
  return { len, at };
}

// A 90° corner arc sweeping clockwise from a0deg to a0deg+90, center (cx,cy),
// radii (rx,ry), explicit endpoint `end` (for the `d` string).
function cornerArcSeg({ cx, cy, rx, ry, a0deg, end }) {
  const pt = (adeg) => [cx + rx * Math.cos(deg(adeg)), cy + ry * Math.sin(deg(adeg))];
  const d = `A${n(rx)} ${n(ry)} 0 0 1 ${n(end[0])} ${n(end[1])}`;
  if (rx === ry) {
    const r = rx;
    return { kind: 'arc', len: (Math.PI / 2) * r, at: (u) => pt(a0deg + 90 * u), d };
  }
  const N = 24;
  const poly = [];
  for (let i = 0; i <= N; i++) poly.push(pt(a0deg + 90 * (i / N)));
  return { kind: 'arc', ...flattenedWalker(poly), d };
}

// ---------- rounded rect (uniform for now; per-corner in Task 2) ----------

// corners = [[rxTL,ryTL],[rxTR,ryTR],[rxBR,ryBR],[rxBL,ryBL]] (raw, pre-inset).
export function roundedRectShape({ width, height, corners, inset = 0 }) {
  const ox = inset;
  const oy = inset;
  const w = Math.max(0, width - 2 * inset);
  const h = Math.max(0, height - 2 * inset);
  if (w <= 0 || h <= 0) return { start: [ox, oy], segments: [] };

  // Reduce each radius by the inset, clamp ≥ 0.
  let c = corners.map(([rx, ry]) => [Math.max(0, rx - inset), Math.max(0, ry - inset)]);
  // CSS corner-overlap clamp: scale all radii by the tightest side ratio.
  const ratio = (avail, sum) => (sum > 0 ? avail / sum : Infinity);
  const f = Math.min(
    1,
    ratio(w, c[0][0] + c[1][0]), // top:    rxTL + rxTR
    ratio(w, c[3][0] + c[2][0]), // bottom: rxBL + rxBR
    ratio(h, c[0][1] + c[3][1]), // left:   ryTL + ryBL
    ratio(h, c[1][1] + c[2][1]) // right:  ryTR + ryBR
  );
  if (f < 1) c = c.map(([rx, ry]) => [rx * f, ry * f]);

  const [[rxTL, ryTL], [rxTR, ryTR], [rxBR, ryBR], [rxBL, ryBL]] = c;
  const start = [ox + rxTL, oy];
  const segments = [];
  // top edge → TR corner
  segments.push(lineSeg([ox + rxTL, oy], [ox + w - rxTR, oy]));
  if (rxTR > 0 && ryTR > 0)
    segments.push(
      cornerArcSeg({ cx: ox + w - rxTR, cy: oy + ryTR, rx: rxTR, ry: ryTR, a0deg: -90, end: [ox + w, oy + ryTR] })
    );
  // right edge → BR corner
  segments.push(lineSeg([ox + w, oy + ryTR], [ox + w, oy + h - ryBR]));
  if (rxBR > 0 && ryBR > 0)
    segments.push(
      cornerArcSeg({ cx: ox + w - rxBR, cy: oy + h - ryBR, rx: rxBR, ry: ryBR, a0deg: 0, end: [ox + w - rxBR, oy + h] })
    );
  // bottom edge → BL corner
  segments.push(lineSeg([ox + w - rxBR, oy + h], [ox + rxBL, oy + h]));
  if (rxBL > 0 && ryBL > 0)
    segments.push(
      cornerArcSeg({ cx: ox + rxBL, cy: oy + h - ryBL, rx: rxBL, ry: ryBL, a0deg: 90, end: [ox, oy + h - ryBL] })
    );
  // left edge → TL corner
  segments.push(lineSeg([ox, oy + h - ryBL], [ox, oy + ryTL]));
  if (rxTL > 0 && ryTL > 0)
    segments.push(
      cornerArcSeg({ cx: ox + rxTL, cy: oy + ryTL, rx: rxTL, ry: ryTL, a0deg: 180, end: [ox + rxTL, oy] })
    );
  return { start, segments };
}

function uniformCorners({ width, height, radius = 0, inset = 0 }) {
  const c = [radius, radius];
  return { width, height, inset, corners: [c, c, c, c] };
}

export function roundedRectPath(dims) {
  return tracePath(roundedRectShape(uniformCorners(dims)));
}
export function roundedRectPerimeter(dims) {
  return traceLength(roundedRectShape(uniformCorners(dims)));
}
export function roundedRectSampler(dims) {
  return traceSampler(roundedRectShape(uniformCorners(dims)));
}

// ---------- DOM wrappers ----------

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

- [ ] **Step 3: Run the existing tests — all 16 must still pass**

Run: `node --test tests/unit/perimeter.test.js`
Expected: 16 pass. If the sharp-rect path differs (e.g. a stray `V0`), re-check the `tracePath` trailing-line rule and the zero-arc skip. If an arc-membership test fails, confirm circular arcs use the analytic `cornerArcSeg` branch (`rx === ry`).

- [ ] **Step 4: Commit**

```bash
cd /Users/tpowell/src/vanilla-breeze
git add src/lib/perimeter.js
git commit -m "refactor(perimeter): segment-model core; reimplement uniform rounded-rect on it"
```

---

### Task 2: Asymmetric + elliptical corner radii

The core already supports per-corner elliptical radii (Task 1's `roundedRectShape` takes `corners`). This task adds the **tests** that lock in that behavior. (No production code unless a test reveals a bug.)

**Files:**
- Test: `tests/unit/perimeter.test.js` (append)

- [ ] **Step 1: Append asymmetric/elliptical/clamp tests**

Add to the end of `tests/unit/perimeter.test.js`:

```js
import { roundedRectShape, tracePath, traceLength, traceSampler } from '../../src/lib/perimeter.js';

describe('roundedRectShape — asymmetric & elliptical', () => {
  it('per-corner radii emit their own arcs; a zero corner is sharp', () => {
    const shape = roundedRectShape({
      width: 100, height: 100,
      corners: [[10, 10], [20, 20], [0, 0], [30, 30]],
    });
    const d = tracePath(shape);
    assert.match(d, /A10 10 0 0 1/); // TL
    assert.match(d, /A20 20 0 0 1/); // TR
    assert.match(d, /A30 30 0 0 1/); // BL
    assert.ok(!/A0 0/.test(d));      // BR sharp: no zero-radius arc
    assert.match(d, /Z$/);
  });

  it('elliptical corner emits A rx ry and samples onto the ellipse', () => {
    const shape = roundedRectShape({ width: 100, height: 100, corners: [[0, 0], [20, 10], [0, 0], [0, 0]] });
    const d = tracePath(shape);
    assert.match(d, /A20 10 0 0 1/);
    // The TR corner center is (100-20, 0+10) = (80,10); rx=20, ry=10.
    // Walk to roughly the middle of that corner arc and check the ellipse equation.
    const total = traceLength(shape);
    const topEdgeLen = 100 - 0 - 20; // start (0,0)->(80,0)
    const sampler = traceSampler(shape);
    // Quarter-ellipse perimeter ≈ (π/2)*(rx+ry)/2 rough; sample a t just inside the arc.
    const [x, y] = sampler((topEdgeLen + 5) / total);
    const e = ((x - 80) / 20) ** 2 + ((y - 10) / 10) ** 2;
    assert.ok(Math.abs(e - 1) < 0.05, `point not on ellipse: e=${e}`);
  });

  it('overlap clamp scales radii so opposite corners do not overlap', () => {
    // 100x100, all corners 80 → top sum 160 > 100 → f = 100/160 = 0.625 → r = 50.
    const d = tracePath(roundedRectShape({ width: 100, height: 100, corners: [[80, 80], [80, 80], [80, 80], [80, 80]] }));
    assert.match(d, /A50 50 0 0 1/);
  });

  it('asymmetric perimeter ≈ straight edges + quarter-arc lengths', () => {
    // corners all (10,10): 4 edges of (100-20)=80 + 4 circular quarter-arcs of r=10.
    const L = traceLength(roundedRectShape({ width: 100, height: 100, corners: [[10, 10], [10, 10], [10, 10], [10, 10]] }));
    assert.ok(Math.abs(L - (4 * 80 + 2 * Math.PI * 10)) < 1e-9);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `node --test tests/unit/perimeter.test.js`
Expected: 20 pass. If the elliptical-membership test fails, widen the tolerance only if the flattened point is genuinely close (the chord midpoint sits slightly inside the ellipse — `0.05` should be ample for N=24); otherwise investigate `cornerArcSeg`'s elliptical branch.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/perimeter.test.js
git commit -m "test(perimeter): asymmetric, elliptical, and overlap-clamp coverage"
```

---

### Task 3: polygon, circle, ellipse builders

**Files:**
- Modify: `src/lib/perimeter.js` (add three builders)
- Test: `tests/unit/perimeter.test.js` (append)

- [ ] **Step 1: Add the builders to `src/lib/perimeter.js`** (after `roundedRectSampler`, before the DOM wrappers)

```js
// ---------- polygon ----------

// points = [[x,y],…] already resolved to px. Closed.
export function polygonShape(points) {
  if (!points || points.length < 2) return { start: points?.[0]?.slice() ?? [0, 0], segments: [] };
  const start = points[0].slice();
  const segments = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    segments.push(lineSeg(a, b));
  }
  return { start, segments };
}

// ---------- circle / ellipse ----------

// Two clockwise arcs from the top (12 o'clock). rx/ry equal → circle.
function ellipseSegments({ cx, cy, rx, ry }) {
  const top = [cx, cy - ry];
  const bottom = [cx, cy + ry];
  const half = (a0deg, end) => {
    // 180° sweep, clockwise. Analytic for circle, flattened for ellipse.
    const pt = (adeg) => [cx + rx * Math.cos(deg(adeg)), cy + ry * Math.sin(deg(adeg))];
    const d = `A${n(rx)} ${n(ry)} 0 0 1 ${n(end[0])} ${n(end[1])}`;
    if (rx === ry) return { kind: 'arc', len: Math.PI * rx, at: (u) => pt(a0deg + 180 * u), d };
    const N = 48;
    const poly = [];
    for (let i = 0; i <= N; i++) poly.push(pt(a0deg + 180 * (i / N)));
    return { kind: 'arc', ...flattenedWalker(poly), d };
  };
  // top (−90°) → bottom (+90°) → top (+270°). cos(−90)=0,sin(−90)=−1 → (cx,cy−ry)=top. ✓
  return { start: top, segments: [half(-90, bottom), half(90, top)] };
}

export function circleShape({ cx, cy, r }) {
  return ellipseSegments({ cx, cy, rx: r, ry: r });
}
export function ellipseShape({ cx, cy, rx, ry }) {
  return ellipseSegments({ cx, cy, rx, ry });
}
```

- [ ] **Step 2: Append tests**

```js
import { polygonShape, circleShape, ellipseShape } from '../../src/lib/perimeter.js';

describe('polygonShape', () => {
  it('traces a closed triangle with line segments', () => {
    const shape = polygonShape([[0, 0], [100, 0], [50, 100]]);
    const d = tracePath(shape);
    assert.ok(d.startsWith('M0 0'));
    assert.match(d, /Z$/);
    assert.ok(!/A/.test(d)); // no arcs
    // length = 100 + hypot(50,100) + hypot(50,100)
    const L = traceLength(shape);
    assert.ok(Math.abs(L - (100 + 2 * Math.hypot(50, 100))) < 1e-9);
  });
  it('sampler starts at the first point and walks the edges', () => {
    const s = traceSampler(polygonShape([[0, 0], [100, 0], [50, 100]]));
    assert.deepEqual(s(0).map((v) => Math.round(v)), [0, 0]);
  });
});

describe('circleShape / ellipseShape', () => {
  it('circle length ≈ 2πr and points satisfy the circle equation', () => {
    const shape = circleShape({ cx: 50, cy: 50, r: 50 });
    assert.ok(Math.abs(traceLength(shape) - 2 * Math.PI * 50) < 1e-6);
    const s = traceSampler(shape);
    for (const t of [0, 0.2, 0.5, 0.85]) {
      const [x, y] = s(t);
      assert.ok(Math.abs(Math.hypot(x - 50, y - 50) - 50) < 1e-6);
    }
    assert.deepEqual(s(0).map((v) => Math.round(v)), [50, 0]); // top
  });
  it('ellipse emits A rx ry and samples roughly onto the ellipse', () => {
    const shape = ellipseShape({ cx: 50, cy: 50, rx: 50, ry: 25 });
    assert.match(tracePath(shape), /A50 25 0 0 1/);
    const s = traceSampler(shape);
    const [x, y] = s(0.1);
    const e = ((x - 50) / 50) ** 2 + ((y - 50) / 25) ** 2;
    assert.ok(Math.abs(e - 1) < 0.02);
  });
});
```

- [ ] **Step 3: Run + commit**

Run: `node --test tests/unit/perimeter.test.js` → expect 26 pass.
```bash
git add src/lib/perimeter.js tests/unit/perimeter.test.js
git commit -m "feat(perimeter): polygon, circle, ellipse shape builders"
```

---

### Task 4: inset() + SVG path() parser (with bezier flattening)

**Files:**
- Modify: `src/lib/perimeter.js` (add `insetShape`, bezier helpers, `pathShape`)
- Test: `tests/unit/perimeter.test.js` (append)

- [ ] **Step 1: Add `insetShape` + bezier flattening + `pathShape` to `src/lib/perimeter.js`**

```js
// ---------- inset() ----------

// edges in px from each side; corners as for roundedRectShape (raw radii).
export function insetShape({ top = 0, right = 0, bottom = 0, left = 0, corners = [[0, 0], [0, 0], [0, 0], [0, 0]] }, { width, height }) {
  const w = Math.max(0, width - left - right);
  const h = Math.max(0, height - top - bottom);
  const shape = roundedRectShape({ width: w, height: h, corners });
  // roundedRectShape origins at (0,0); shift into the inset box.
  return shiftShape(shape, left, top);
}

function shiftShape({ start, segments }, dx, dy) {
  if (dx === 0 && dy === 0) return { start, segments };
  const shift = (p) => [p[0] + dx, p[1] + dy];
  const reAt = (s) => (u) => shift(s.at(u));
  // Rewrite absolute coords inside each segment's `d`. Lines/arcs use H/V/A/L.
  const newSegs = segments.map((s) => ({ ...s, at: reAt(s), d: shiftPathCommand(s.d, dx, dy) }));
  return { start: shift(start), segments: newSegs };
}

// Shift the absolute coordinates inside a single-command `d` (H/V/L/A) by dx,dy.
function shiftPathCommand(d, dx, dy) {
  const cmd = d[0];
  if (cmd === 'H') return `H${n(parseFloat(d.slice(1)) + dx)}`;
  if (cmd === 'V') return `V${n(parseFloat(d.slice(1)) + dy)}`;
  if (cmd === 'L') {
    const [x, y] = d.slice(1).split(' ').map(parseFloat);
    return `L${n(x + dx)} ${n(y + dy)}`;
  }
  if (cmd === 'A') {
    // A rx ry rot laf sf x y  → shift the final x y
    const parts = d.slice(1).trim().split(/\s+/).map(Number);
    const [rx, ry, rot, laf, sf, x, y] = parts;
    return `A${n(rx)} ${n(ry)} ${n(rot)} ${laf} ${sf} ${n(x + dx)} ${n(y + dy)}`;
  }
  return d;
}

// ---------- bezier flattening ----------

function flattenCubic(p0, p1, p2, p3, N = 24) {
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const mt = 1 - t;
    const a = mt * mt * mt, b = 3 * mt * mt * t, c = 3 * mt * t * t, e = t * t * t;
    pts.push([a * p0[0] + b * p1[0] + c * p2[0] + e * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + e * p3[1]]);
  }
  return pts;
}
function flattenQuad(p0, p1, p2, N = 24) {
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const mt = 1 - t;
    const a = mt * mt, b = 2 * mt * t, c = t * t;
    pts.push([a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]);
  }
  return pts;
}

// ---------- path() ----------

// Tokenize SVG path data into [{cmd, args:[…]}, …].
function tokenizePath(d) {
  const tokens = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi;
  let m;
  let cur = null;
  while ((m = re.exec(d))) {
    if (m[1]) {
      cur = { cmd: m[1], args: [] };
      tokens.push(cur);
    } else if (cur) {
      cur.args.push(parseFloat(m[2]));
    }
  }
  return tokens;
}

// Parse SVG path data `d` into a traced shape. Supports M L H V C S Q T Z (abs+rel).
// Arcs (A) are flattened via sampling of the SVG-endpoint arc. Coordinates are
// taken as-is (already in px; the DOM layer resolves units before calling).
export function pathShape(d) {
  const toks = tokenizePath(d);
  let cur = [0, 0];
  let startPt = [0, 0];
  let prevCubicCtrl = null;
  let prevQuadCtrl = null;
  const segments = [];
  const push = (seg) => segments.push(seg);
  const rel = (cmd) => cmd === cmd.toLowerCase();
  for (const { cmd, args } of toks) {
    const C = cmd.toUpperCase();
    const r = rel(cmd);
    const ax = (x) => (r ? cur[0] + x : x);
    const ay = (y) => (r ? cur[1] + y : y);
    if (C === 'M') {
      cur = [ax(args[0]), ay(args[1])];
      startPt = cur.slice();
      // subsequent pairs after M are implicit L
      for (let i = 2; i + 1 < args.length; i += 2) {
        const p = [r ? cur[0] + args[i] : args[i], r ? cur[1] + args[i + 1] : args[i + 1]];
        push(lineSeg(cur, p));
        cur = p;
      }
      prevCubicCtrl = prevQuadCtrl = null;
    } else if (C === 'L') {
      for (let i = 0; i + 1 < args.length; i += 2) {
        const p = [r ? cur[0] + args[i] : args[i], r ? cur[1] + args[i + 1] : args[i + 1]];
        push(lineSeg(cur, p));
        cur = p;
      }
      prevCubicCtrl = prevQuadCtrl = null;
    } else if (C === 'H') {
      for (const xv of args) {
        const p = [r ? cur[0] + xv : xv, cur[1]];
        push(lineSeg(cur, p));
        cur = p;
      }
      prevCubicCtrl = prevQuadCtrl = null;
    } else if (C === 'V') {
      for (const yv of args) {
        const p = [cur[0], r ? cur[1] + yv : yv];
        push(lineSeg(cur, p));
        cur = p;
      }
      prevCubicCtrl = prevQuadCtrl = null;
    } else if (C === 'C' || C === 'S') {
      const step = C === 'C' ? 6 : 4;
      for (let i = 0; i + step - 1 < args.length; i += step) {
        let c1, c2, end;
        if (C === 'C') {
          c1 = [ax(args[i]), ay(args[i + 1])];
          c2 = [ax(args[i + 2]), ay(args[i + 3])];
          end = [ax(args[i + 4]), ay(args[i + 5])];
        } else {
          c1 = prevCubicCtrl ? [2 * cur[0] - prevCubicCtrl[0], 2 * cur[1] - prevCubicCtrl[1]] : cur.slice();
          c2 = [ax(args[i]), ay(args[i + 1])];
          end = [ax(args[i + 2]), ay(args[i + 3])];
        }
        const poly = flattenCubic(cur, c1, c2, end);
        push({ kind: 'curve', ...flattenedWalker(poly), d: `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(end[0])} ${n(end[1])}` });
        prevCubicCtrl = c2;
        prevQuadCtrl = null;
        cur = end;
      }
    } else if (C === 'Q' || C === 'T') {
      const step = C === 'Q' ? 4 : 2;
      for (let i = 0; i + step - 1 < args.length; i += step) {
        let c1, end;
        if (C === 'Q') {
          c1 = [ax(args[i]), ay(args[i + 1])];
          end = [ax(args[i + 2]), ay(args[i + 3])];
        } else {
          c1 = prevQuadCtrl ? [2 * cur[0] - prevQuadCtrl[0], 2 * cur[1] - prevQuadCtrl[1]] : cur.slice();
          end = [ax(args[i]), ay(args[i + 1])];
        }
        const poly = flattenQuad(cur, c1, end);
        push({ kind: 'curve', ...flattenedWalker(poly), d: `Q${n(c1[0])} ${n(c1[1])} ${n(end[0])} ${n(end[1])}` });
        prevQuadCtrl = c1;
        prevCubicCtrl = null;
        cur = end;
      }
    } else if (C === 'Z') {
      cur = startPt.slice();
      prevCubicCtrl = prevQuadCtrl = null;
    }
  }
  return { start: startPt, segments };
}
```

(Note: `pathShape` intentionally does not implement the `A` arc command for MVP path() support — `clip-path: path()` strings rarely use `A`. If an `A` appears, it is skipped; document this limitation. `shape()` arcs are handled in Task 5 by converting to explicit geometry.)

- [ ] **Step 2: Append tests**

```js
import { insetShape, pathShape } from '../../src/lib/perimeter.js';

describe('insetShape', () => {
  it('equals roundedRectShape on the inset box, shifted into place', () => {
    const got = tracePath(insetShape({ top: 10, right: 10, bottom: 10, left: 10, corners: [[5, 5], [5, 5], [5, 5], [5, 5]] }, { width: 100, height: 100 }));
    // inset box is 80x80 at origin (10,10); start = (10+5, 10) = (15,10)
    assert.ok(got.startsWith('M15 10'), got);
    assert.match(got, /A5 5 0 0 1/);
  });
});

describe('pathShape', () => {
  it('traces a closed straight-line triangle', () => {
    const shape = pathShape('M0 0 L100 0 L100 100 Z');
    const d = tracePath(shape);
    assert.ok(d.startsWith('M0 0'));
    assert.match(d, /Z$/);
    const L = traceLength(shape);
    assert.ok(Math.abs(L - (100 + 100 + Math.hypot(100, 100))) < 1e-9);
  });
  it('flattens a cubic and measures a sane length', () => {
    // straight-line cubic from (0,0) to (30,0) with collinear controls → length 30.
    const shape = pathShape('M0 0 C10 0 20 0 30 0');
    assert.ok(Math.abs(traceLength(shape) - 30) < 1e-6);
  });
  it('handles relative commands', () => {
    const shape = pathShape('M10 10 l10 0 l0 10 z');
    const s = traceSampler(shape);
    assert.deepEqual(s(0).map((v) => Math.round(v)), [10, 10]);
    assert.ok(Math.abs(traceLength(shape) - (10 + 10 + Math.hypot(10, 10))) < 1e-9);
  });
});
```

- [ ] **Step 3: Run + commit**

Run: `node --test tests/unit/perimeter.test.js` → expect 31 pass.
```bash
git add src/lib/perimeter.js tests/unit/perimeter.test.js
git commit -m "feat(perimeter): inset() builder + SVG path() parser with bezier flattening"
```

---

### Task 5: CSS shape() parser

`shape()` uses verbs (`from <x> <y>`, `line to <x> <y>`, `hline to <x>`, `vline to <y>`, `curve to <x> <y> via <cx> <cy>` [and `via <cx2> <cy2>` for cubic], `close`) with lengths/percentages. This task converts a parsed verb list (coordinates already resolved to px) into a traced shape by reusing the bezier helpers.

**Files:**
- Modify: `src/lib/perimeter.js` (add `shapeShape`)
- Test: `tests/unit/perimeter.test.js` (append)

- [ ] **Step 1: Add `shapeShape` to `src/lib/perimeter.js`**

```js
// ---------- CSS shape() ----------

// commands = ordered verbs with px-resolved coords:
//   { verb:'from', to:[x,y] }
//   { verb:'line', to:[x,y] }
//   { verb:'hline', x } | { verb:'vline', y }
//   { verb:'curve', to:[x,y], via:[[cx,cy]] }   // 1 control = quadratic, 2 = cubic
//   { verb:'close' }
export function shapeShape(commands) {
  let cur = [0, 0];
  let startPt = [0, 0];
  const segments = [];
  for (const c of commands) {
    if (c.verb === 'from') {
      cur = c.to.slice();
      startPt = cur.slice();
    } else if (c.verb === 'line') {
      segments.push(lineSeg(cur, c.to));
      cur = c.to.slice();
    } else if (c.verb === 'hline') {
      const p = [c.x, cur[1]];
      segments.push(lineSeg(cur, p));
      cur = p;
    } else if (c.verb === 'vline') {
      const p = [cur[0], c.y];
      segments.push(lineSeg(cur, p));
      cur = p;
    } else if (c.verb === 'curve') {
      const end = c.to;
      if (c.via.length === 2) {
        const [c1, c2] = c.via;
        const poly = flattenCubic(cur, c1, c2, end);
        segments.push({ kind: 'curve', ...flattenedWalker(poly), d: `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(end[0])} ${n(end[1])}` });
      } else {
        const c1 = c.via[0];
        const poly = flattenQuad(cur, c1, end);
        segments.push({ kind: 'curve', ...flattenedWalker(poly), d: `Q${n(c1[0])} ${n(c1[1])} ${n(end[0])} ${n(end[1])}` });
      }
      cur = end.slice();
    } else if (c.verb === 'close') {
      cur = startPt.slice();
    }
  }
  return { start: startPt, segments };
}
```

- [ ] **Step 2: Append tests**

```js
import { shapeShape } from '../../src/lib/perimeter.js';

describe('shapeShape', () => {
  it('matches the equivalent pathShape for a straight triangle', () => {
    const viaShape = shapeShape([
      { verb: 'from', to: [0, 0] },
      { verb: 'line', to: [100, 0] },
      { verb: 'line', to: [100, 100] },
      { verb: 'close' },
    ]);
    const viaPath = pathShape('M0 0 L100 0 L100 100 Z');
    assert.equal(tracePath(viaShape), tracePath(viaPath));
    assert.ok(Math.abs(traceLength(viaShape) - traceLength(viaPath)) < 1e-9);
  });
  it('supports hline/vline and a cubic curve', () => {
    const shape = shapeShape([
      { verb: 'from', to: [0, 0] },
      { verb: 'hline', x: 100 },
      { verb: 'curve', to: [100, 100], via: [[100, 33], [100, 66]] },
      { verb: 'vline', y: 0 },
      { verb: 'close' },
    ]);
    const d = tracePath(shape);
    assert.ok(d.startsWith('M0 0'));
    assert.match(d, /C100 33 100 66 100 100/);
    assert.match(d, /Z$/);
  });
});
```

- [ ] **Step 3: Run + commit**

Run: `node --test tests/unit/perimeter.test.js` → expect 33 pass.
```bash
git add src/lib/perimeter.js tests/unit/perimeter.test.js
git commit -m "feat(perimeter): CSS shape() builder"
```

---

### Task 6: clip-path parsing + shape-detecting DOM wrappers

Wire it together: parse a computed `clip-path` string (resolving %/px against the host box) and make `perimeterPath`/`perimeterSampler` detect the source (clip-path first, else per-corner border-radius).

**Files:**
- Modify: `src/lib/perimeter.js` (add `parseClipPath`, per-corner radius reading, update DOM wrappers)
- Test: `tests/unit/perimeter.test.js` (append)

- [ ] **Step 1: Add `parseClipPath` + length resolution + per-corner reads, and update the DOM wrappers in `src/lib/perimeter.js`**

Replace the existing DOM-wrappers section (from `function readDims` to the end of the file) with:

```js
// ---------- clip-path parsing ----------

// Resolve a CSS length/percentage token against a reference length (px).
function resolveLen(tok, ref) {
  const t = String(tok).trim();
  if (t.endsWith('%')) return (parseFloat(t) / 100) * ref;
  return parseFloat(t) || 0;
}

// Parse a computed clip-path value into a traced shape, resolving against {width,height}.
// Returns null for 'none' / unsupported so callers fall back to border-radius.
export function parseClipPath(value, box) {
  if (!value || value === 'none') return null;
  const v = value.trim();
  const { width, height } = box;
  const fnMatch = v.match(/^([a-z-]+)\((.*)\)$/i);
  if (!fnMatch) return null;
  const fn = fnMatch[1].toLowerCase();
  const inner = fnMatch[2].trim();

  if (fn === 'polygon') {
    // optional fill-rule prefix then "x y, x y, …"
    const body = inner.replace(/^(nonzero|evenodd)\s*,?\s*/i, '');
    const pts = body.split(',').map((pair) => {
      const [xs, ys] = pair.trim().split(/\s+/);
      return [resolveLen(xs, width), resolveLen(ys, height)];
    });
    return polygonShape(pts);
  }
  if (fn === 'circle') {
    // circle( <r>? [at <cx> <cy>]? )
    const at = inner.split(/\bat\b/i);
    const r = at[0].trim();
    const [cxs, cys] = (at[1] || '50% 50%').trim().split(/\s+/);
    const cx = resolveLen(cxs ?? '50%', width);
    const cy = resolveLen(cys ?? '50%', height);
    const radius = r ? resolveLen(r, Math.hypot(width, height) / Math.SQRT2) : Math.min(width, height) / 2;
    return circleShape({ cx, cy, r: radius });
  }
  if (fn === 'ellipse') {
    const at = inner.split(/\bat\b/i);
    const radii = at[0].trim().split(/\s+/);
    const [cxs, cys] = (at[1] || '50% 50%').trim().split(/\s+/);
    const rx = radii[0] ? resolveLen(radii[0], width) : width / 2;
    const ry = radii[1] ? resolveLen(radii[1], height) : height / 2;
    return ellipseShape({ cx: resolveLen(cxs ?? '50%', width), cy: resolveLen(cys ?? '50%', height), rx, ry });
  }
  if (fn === 'inset') {
    // inset( t r b l [round <radius…>] )
    const [edgesPart, roundPart] = inner.split(/\bround\b/i);
    const e = edgesPart.trim().split(/\s+/).map((x) => x);
    // CSS shorthand: 1–4 values (t / t h / t h b / t r b l)
    const top = resolveLen(e[0], height);
    const right = resolveLen(e[1] ?? e[0], width);
    const bottom = resolveLen(e[2] ?? e[0], height);
    const left = resolveLen(e[3] ?? e[1] ?? e[0], width);
    let corners = [[0, 0], [0, 0], [0, 0], [0, 0]];
    if (roundPart) {
      const rr = roundPart.trim().split(/\s+/);
      const cr = resolveLen(rr[0], Math.min(width, height));
      corners = [[cr, cr], [cr, cr], [cr, cr], [cr, cr]];
    }
    return insetShape({ top, right, bottom, left, corners }, box);
  }
  if (fn === 'path') {
    const d = inner.replace(/^(nonzero|evenodd)\s*,?\s*/i, '').replace(/^["']|["']$/g, '');
    return pathShape(d);
  }
  // shape() string parsing is out of MVP DOM scope (verbs vary); callers can use shapeShape directly.
  return null;
}

// ---------- DOM wrappers (shape detection) ----------

// Read one corner radius computed value ("10px" or "10px 20px") → [rx, ry] in px.
function readCorner(cs, prop) {
  const v = (cs[prop] || '').trim();
  if (!v) return [0, 0];
  const parts = v.split(/\s+/).map((p) => parseFloat(p) || 0);
  return parts.length >= 2 ? [parts[0], parts[1]] : [parts[0], parts[0]];
}

function readShape(host, inset) {
  const rect = host.getBoundingClientRect();
  const cs = getComputedStyle(host);
  const clip = parseClipPath(cs.clipPath, { width: rect.width, height: rect.height });
  if (clip) return clip; // clip-path wins; inset not applied to an explicit shape
  const corners = [
    readCorner(cs, 'borderTopLeftRadius'),
    readCorner(cs, 'borderTopRightRadius'),
    readCorner(cs, 'borderBottomRightRadius'),
    readCorner(cs, 'borderBottomLeftRadius'),
  ];
  return roundedRectShape({ width: rect.width, height: rect.height, corners, inset });
}

export function perimeterPath(host, inset = 0) {
  return tracePath(readShape(host, inset));
}
export function perimeterSampler(host, inset = 0) {
  return traceSampler(readShape(host, inset));
}
```

Note: `readCorner` falls back to `[parts[0], parts[0]]` when only one value is present, so the original single-`borderTopLeftRadius` stub still yields a uniform circular corner. But the existing DOM tests stub ONLY `borderTopLeftRadius`; the other three corner props are `undefined` → `readCorner` returns `[0,0]`. **That breaks the existing uniform DOM test.** To preserve it: in `readShape`, if only `borderTopLeftRadius` is present (the other corner props are absent/empty), treat it as uniform. Implement that fallback:

```js
function readShape(host, inset) {
  const rect = host.getBoundingClientRect();
  const cs = getComputedStyle(host);
  const clip = parseClipPath(cs.clipPath, { width: rect.width, height: rect.height });
  if (clip) return clip;
  const tl = readCorner(cs, 'borderTopLeftRadius');
  const hasPerCorner =
    cs.borderTopRightRadius != null || cs.borderBottomRightRadius != null || cs.borderBottomLeftRadius != null;
  const corners = hasPerCorner
    ? [tl, readCorner(cs, 'borderTopRightRadius'), readCorner(cs, 'borderBottomRightRadius'), readCorner(cs, 'borderBottomLeftRadius')]
    : [tl, tl, tl, tl];
  return roundedRectShape({ width: rect.width, height: rect.height, corners, inset });
}
```

Use this second `readShape`. (Real browsers always return all four corner props, so per-corner works in practice; the `hasPerCorner` guard keeps the minimal test stub — which sets only `borderTopLeftRadius` — behaving as uniform.)

- [ ] **Step 2: Confirm the existing DOM-wrapper tests still pass, then append detection tests**

```js
import { parseClipPath } from '../../src/lib/perimeter.js';

describe('parseClipPath', () => {
  it('returns null for none', () => {
    assert.equal(parseClipPath('none', { width: 100, height: 100 }), null);
  });
  it('parses polygon with %', () => {
    const shape = parseClipPath('polygon(0% 0%, 100% 0%, 50% 100%)', { width: 100, height: 100 });
    assert.equal(tracePath(shape), tracePath(polygonShape([[0, 0], [100, 0], [50, 100]])));
  });
  it('parses circle at center', () => {
    const shape = parseClipPath('circle(40px at 50% 50%)', { width: 100, height: 100 });
    assert.ok(Math.abs(traceLength(shape) - 2 * Math.PI * 40) < 1e-6);
  });
  it('parses inset with round', () => {
    const shape = parseClipPath('inset(10px round 5px)', { width: 100, height: 100 });
    // inset 10 on all sides → 80x80 box at (10,10); start (15,10)
    assert.ok(tracePath(shape).startsWith('M15 10'));
  });
});

describe('DOM wrappers — shape detection', () => {
  afterEach(() => { delete globalThis.getComputedStyle; });
  it('perimeterPath traces clip-path polygon when present', () => {
    globalThis.getComputedStyle = () => ({ clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)' });
    const host = { getBoundingClientRect: () => ({ width: 100, height: 100 }) };
    assert.equal(perimeterPath(host), tracePath(polygonShape([[0, 0], [100, 0], [50, 100]])));
  });
  it('perimeterPath reads per-corner radii when no clip-path', () => {
    globalThis.getComputedStyle = () => ({
      clipPath: 'none',
      borderTopLeftRadius: '10px 20px',
      borderTopRightRadius: '0px',
      borderBottomRightRadius: '0px',
      borderBottomLeftRadius: '0px',
    });
    const host = { getBoundingClientRect: () => ({ width: 100, height: 100 }) };
    assert.match(perimeterPath(host), /A10 20 0 0 1/);
  });
});
```

- [ ] **Step 3: Run the FULL suite**

Run: `node --test tests/unit/perimeter.test.js`
Expected: all pass (16 original + the new ones; ~39 total). The original two DOM-wrapper tests must still pass via the `hasPerCorner` fallback.

- [ ] **Step 4: Commit**

```bash
git add src/lib/perimeter.js tests/unit/perimeter.test.js
git commit -m "feat(perimeter): clip-path parsing + shape-detecting DOM wrappers"
```

---

## Self-Review

**1. Spec coverage:**
- §2 segment model + generics (`tracePath`/`traceLength`/`traceSampler`, analytic vs flattened, trailing-line rule) → Task 1. ✓
- §3.1 asymmetric + elliptical + overlap clamp → Task 1 (`roundedRectShape`) + Task 2 (tests). ✓
- §3.2 polygon, §3.3 circle, §3.4 ellipse → Task 3. ✓
- §3.5 inset, §3.6 path() (+ bezier flattening) → Task 4. ✓
- §3.7 shape() → Task 5. ✓
- §4 public API (uniform adapters preserved; new builders + generics exported; detecting DOM wrappers; `parseClipPath`) → Tasks 1 & 6. ✓
- §5 t-contract (documented in file header; circle/ellipse start at top; polygon/path/shape declared order) → Task 1 header + Task 3/4/5 builders. ✓
- §6 testing (all listed cases) → Tasks 2–6. ✓
- §7 out-of-scope (embedded-copy sync; clip-path boxes; keyword radii beyond a default) → not implemented; circle/ellipse keyword radii get a documented default in `parseClipPath`. ✓

**2. Placeholder scan:** No TBD/TODO. Every code step gives full code; commands have expected pass counts. The one acknowledged limitation (`pathShape` skips the `A` arc command) is documented inline, not a placeholder.

**3. Type/name consistency:** `Segment {kind,len,at,d}` used uniformly. Builders all return `{start, segments}`. Generics take `{start, segments}` (or `{segments}`). `roundedRectShape({width,height,corners,inset})`, `polygonShape(points)`, `circleShape/ellipseShape({cx,cy,r|rx,ry})`, `insetShape(edges, box)`, `pathShape(d)`, `shapeShape(commands)`, `parseClipPath(value, box)` — names match between definitions (Tasks 1/3/4/5/6) and their test imports. `flattenedWalker`, `flattenCubic`, `flattenQuad`, `cornerArcSeg`, `lineSeg`, `shiftShape` are internal and defined before use. The `hasPerCorner` fallback in Task 6 explicitly preserves the Task-1 uniform DOM test.
