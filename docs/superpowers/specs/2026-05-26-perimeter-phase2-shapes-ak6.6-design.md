# perimeter Phase 2 — advanced shapes (Decorated Layers / ak6.6)

**Date:** 2026-05-26
**Status:** Approved (design)
**Parent:** `2026-05-25-perimeter-geometry-ak6.2-design.md` §5 (Phase 2).
**Target repo:** vanilla-breeze (`~/src/vanilla-breeze`), `src/lib/perimeter.js` + `tests/unit/perimeter.test.js`. Base branch `work/2026-05-21`; feature branch `feat/perimeter-phase2`.
**Depends on:** ak6.2 (done — the uniform rounded-rect MVP).

---

## 1. Scope

Extend the perimeter primitive from "axis-aligned rect, uniform circular radius" to the full set of high-value shapes that show off bg-wc/border-wc:

1. **Asymmetric per-corner** border-radius (each corner its own radius).
2. **Elliptical radii** (`rx ≠ ry`) per corner.
3. **`clip-path` basic shapes:** `polygon()`, `circle()`, `ellipse()`, `inset()`.
4. **`clip-path: path()`** (SVG path data) and **`shape()`** (CSS shape syntax).

All shapes return the **same outputs** the MVP does — an SVG path `d` string and an arc-length `(t) => [x, y]` sampler — so `border-wc`/`bg-wc` consumers are unaffected.

**Not in scope:** rendering; wiring perimeter into VB's runtime bundle; syncing the embedded copies in bg-wc/border-wc (a follow-up bead — those only use the uniform path today, and the new builders are additive).

## 2. Architecture — unified segment model

A traced perimeter is `{ start: [x, y], segments: Segment[] }`. Each `Segment`:

```
Segment = {
  kind: 'line' | 'arc' | 'curve',  // 'line' = straight (H/V/L); arc = circular/elliptical; curve = bezier
  len: number,                     // arc length of this segment
  at: (u) => [x, y],               // point at fraction u∈[0,1] along the segment (arc-length within the segment)
  d: string,                       // SVG path commands continuing from the previous point (no leading M)
}
```

Three **generic** operations (the only things consumers ultimately use):

- `tracePath({ start, segments })` → `M${start} …segment.d… Z`. **Rule:** the closing `Z` draws a straight line back to `start`, so a *final* segment whose `kind === 'line'` and which ends at `start` is **omitted** (its `d` is not appended). Non-line trailing segments (arcs/curves) are always emitted. This reproduces the MVP's compact output (sharp rect = `M0 0H100V50H0Z`, no redundant final edge).
- `traceLength({ segments })` → `Σ len`.
- `traceSampler({ segments })` → arc-length walk: `(t)` wraps mod 1, multiplies by total length, finds the segment, calls `at(localU)`. (Identical walk to the MVP's `segs` loop.)

**Analytic vs flattened segments:**
- `line` and circular `arc` segments are **analytic**: exact `len` and exact `at(u)` (cos/sin for arcs). This preserves the MVP's `1e-6` arc-membership precision.
- **elliptical** arcs and bezier `curve`s are **flattened**: precompute a fixed-N polyline (N≈24 per quarter-turn / scaled by rough length), set `len` = polyline length and `at(u)` = walk that polyline. The path `d` still emits the **exact** curve command (`A rx ry …` / `C` / `Q`), so rendered borders stay crisp; only sampling is approximate (documented, invisible for particle/draw use).

## 3. Shape builders (pure, DOM-free)

Each returns `{ start, segments }`. Inputs are resolved numbers (no %/units — the DOM layer resolves those first).

1. `roundedRectShape({ width, height, corners, inset = 0 })` — `corners` = `[[rxTL,ryTL],[rxTR,ryTR],[rxBR,ryBR],[rxBL,ryBL]]`. Applies the **CSS overlap clamp**: for each edge, scale factor `f = min(1, edgeLen / (adjacentRadiiSum))`, then every radius is multiplied by the global `min(f)` (per the CSS Backgrounds spec). Inset shrinks the box and each radius by `inset` (clamped ≥0). Emits edges as `H`/`V` when axis-aligned, corners as `A rx ry 0 0 1 …`. Uniform circular corners ⇒ byte-identical to the MVP path.
2. `polygonShape(points, { width, height })` — `points` = `[[x,y],…]` already resolved to px; straight `line` segments; closed.
3. `circleShape({ cx, cy, r })` — two `A r r 0 0 1` semicircle arcs; start at top (cx, cy−r), clockwise.
4. `ellipseShape({ cx, cy, rx, ry })` — two `A rx ry` arcs; start at top; flattened sampling.
5. `insetShape({ top, right, bottom, left, corners }, { width, height })` — computes the inset box, delegates to `roundedRectShape`.
6. `pathShape(d)` — parse SVG path data `d` into segments. Support `M m L l H h V v C c S s Q q T t A a Z z`. Lines → analytic; cubic/quadratic → flattened `curve` (De Casteljau); arcs → endpoint-param arc → flattened `curve` (or analytic if circular). The `d` per segment is the absolute-coordinate equivalent.
7. `shapeShape(commands, { width, height })` — parse CSS `shape()` verbs (`from <x> <y>`, `line to`, `hline to`, `vline to`, `curve to … via …`, `smooth to`, `arc to … of <r>`, `close`), resolve %→px against the box, translate to absolute coords, reuse the `pathShape` segment machinery.

## 4. Public API (`src/lib/perimeter.js`)

**Back-compat (reimplemented on the core, same signatures + outputs):**
- `roundedRectPath(dims)` / `roundedRectSampler(dims)` / `roundedRectPerimeter(dims)` — now thin adapters: build the uniform `roundedRectShape` (4 equal circular corners from `dims.radius`) and call `tracePath`/`traceSampler`/`traceLength`. **Must keep the 16 existing tests green** (exact path strings, length formula, sampler positions, clamps, inset).

**New pure builders + generics (named exports):** the six `*Shape` builders, plus `tracePath`, `traceLength`, `traceSampler`.

**New DOM wrappers (shape detection):**
- `perimeterPath(host, inset = 0)` / `perimeterSampler(host, inset = 0)` — detect the source:
  1. Read `getComputedStyle(host).clipPath`. If it is a basic shape or `path()`/`shape()` (not `none`), parse it, resolve against the host border box (`getBoundingClientRect`), trace it. (`inset` is ignored for clip-path sources — the shape is explicit; document this.)
  2. Else read the four computed corner radii (`borderTopLeftRadius`/`…TopRight`/`…BottomRight`/`…BottomLeft`, each possibly `"rx ry"` in px), build `roundedRectShape`, apply `inset`.
  - Uniform-radius hosts must still produce output **identical** to the MVP (the existing DOM-wrapper tests use a single `borderTopLeftRadius`).

A small `parseClipPath(value, { width, height })` helper maps a computed `clip-path` string to a `{ start, segments }` (dispatching to the right builder); returns `null` for `none`/unsupported so the wrapper falls back to border-radius.

## 5. The `t` contract (extended)

- **Rounded rects** (incl. asymmetric/elliptical): unchanged — `t=0` at the top edge just clockwise of the top-left corner; clockwise.
- **circle/ellipse:** `t=0` at the top (12 o'clock); clockwise.
- **polygon/path/shape:** `t=0` at the shape's declared start point; proceeds in declaration order (the shape author controls direction).

Documented in the file header so `draw`/`sparks` behavior stays predictable.

## 6. Testing (`tests/unit/perimeter.test.js`, `node:test`)

Keep all 16 existing tests passing unchanged. Add:

- **Asymmetric:** a rect with corners `[10,10],[20,20],[0,0],[30,30]` → path contains `A10 10`, `A20 20`, `A30 30`, and a sharp bottom-right (no arc there); length ≈ Σ(edges) + Σ(quarter-arcs) within tolerance; sampler `t=0` at top edge start.
- **Elliptical:** corner `[20,10]` → path contains `A20 10 0 0 1`; sampler corner point lies on the ellipse `((x-cx)/rx)² + ((y-cy)/ry)² ≈ 1` within a loose tolerance (flattened).
- **Overlap clamp:** radii larger than the edges scale down so opposite corners don't overlap (e.g. 100×100 all-corners r=80 → effective r=50); assert the emitted arc radius.
- **polygon:** `polygonShape([[0,0],[100,0],[50,100]], …)` → path `M0 0L100 0L50 100Z`-style (3 lines, closed); length = perimeter of the triangle; sampler `t=0` at `[0,0]`, midpoints on edges.
- **circle/ellipse:** `circleShape({cx:50,cy:50,r:50})` → two arcs, closed; length ≈ `2πr`; sampler points satisfy the circle equation; `t=0` at top `[50,0]`.
- **inset:** `insetShape({top:10,right:10,bottom:10,left:10,corners:[[5,5]×4]}, {100,100})` equals `roundedRectShape` on the 80×80 inset box.
- **path():** `pathShape('M0 0 L100 0 L100 100 Z')` → 3 segments, closed; length = 300 for that triangle-ish; a cubic `C` flattens (length within tolerance of a known value).
- **shape():** `shapeShape` parse of `from 0 0 line to 100 0 line to 100 100 close` equals the equivalent `pathShape`.
- **DOM detection:** stub `getComputedStyle` returning a `clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)'` → `perimeterPath(host)` traces the resolved triangle; stub returning per-corner radii (`borderTopLeftRadius: '10px 20px'`, others) → asymmetric/elliptical path; uniform single-radius stub still equals `roundedRectPath(...)`.
- **Generics:** `tracePath` omits a trailing straight-to-start segment (closed polygon path has no redundant final `L`); `traceSampler` wraps mod 1 and is monotonic.

## 7. Out of scope / follow-ups

- Syncing the embedded `perimeter.js` copies in bg-wc and border-wc — follow-up bead, only when those consumers want non-uniform shapes.
- `clip-path` boxes (`border-box`/`margin-box` keywords), `circle()` with `closest-side`/`farthest-side` keyword radii — support explicit lengths/percentages first; keyword radii can be a follow-up if needed (parse `closest-side` as the obvious min-dimension default).
- Self-intersecting/degenerate polygon robustness beyond returning a usable path.

## 8. Open questions

- None blocking. `circle()`/`ellipse()` keyword radii (`closest-side`, etc.): implement the common explicit-length case; treat a missing/keyword radius as `closest-side` (min distance to box edges) as a reasonable default, documented.
