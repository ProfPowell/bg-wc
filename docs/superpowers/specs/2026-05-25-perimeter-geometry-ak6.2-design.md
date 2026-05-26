# perimeter — shared rounded-rect geometry primitive (Decorated Layers #3 / ak6.2)

**Date:** 2026-05-25
**Status:** Approved (design)
**Parent:** `2026-05-25-decorated-layers-design.md` (umbrella §4). Consumed by `border-wc` (#4, strokes it) and `bg-wc` (masks shaders to it).
**Target repo:** `vanilla-breeze` — `src/lib/perimeter.js` (canonical source; packages embed a copy per the base rule). Spec centralized in gl-wc.

---

## 1. Scope

A small geometry utility that turns an element's outer shape into (a) an SVG path string and (b) an arc-length sampler. **MVP: axis-aligned rectangle with a single uniform `border-radius`.** Authored as the canonical source in vanilla-breeze; not wired into VB's runtime bundle yet (no VB-core consumer until the packages embed it).

## 2. API

**Pure core (DOM-free, the unit-tested heart):**
- `roundedRectPath({ width, height, radius, inset = 0 })` → SVG path `d` string for an axis-aligned rounded rect, inset inward by `inset` on all sides; `radius` clamped to `[0, min(width, height) / 2 - inset]` (and the inset box clamped to ≥0).
- `roundedRectSampler({ width, height, radius, inset = 0 })` → `(t) => [x, y]` for `t ∈ [0, 1]`, **arc-length-parameterized** around the perimeter: 4 straight edges + 4 quarter-circle corners. `t = 0` is the start of the top edge (just clockwise of the top-left corner); direction is **clockwise**. `t` outside `[0,1]` wraps (mod 1).
- `roundedRectPerimeter({ width, height, radius, inset = 0 })` → total arc length `2(w' + h') − 8r' + 2πr'` (w'/h'/r' = inset-adjusted, clamped).

**Thin DOM wrappers (read the host, call the core):**
- `perimeterPath(host, inset = 0)` and `perimeterSampler(host, inset = 0)` — read `host.getBoundingClientRect()` for width/height and `getComputedStyle(host)` for the (uniform, MVP) border-radius from one corner (`borderTopLeftRadius`, parsed to px, clamped), then delegate to the core. Output is in **local box coordinates** (origin `0,0` at the host's top-left border-box corner) so a `border-wc` SVG/Canvas overlay positioned at `inset: 0` over the host aligns directly.

## 3. Design notes

- **Coordinate space:** local to the host's border box (not viewport). Overlays sit at `inset:0`, so local coords map 1:1.
- **Start/direction are part of the contract** (top edge, clockwise) so `border-wc`'s `draw` (stroke-dashoffset) and `sparks` (particle `t`) are predictable and documented.
- **Inset** lets a stroke of width `thickness` sit fully inside the box (`border-wc` passes `thickness/2` or `thickness`). Inset shrinks the box by `2·inset` and the radius by `inset` (clamped ≥0).
- **Degenerate cases:** width/height ≤ 0 → return an empty path / a sampler that yields the origin; radius ≤ 0 → sharp rectangle (no arcs). No throws.
- **One focused module**, pure functions + thin wrappers.

## 4. Testing

`tests/unit/perimeter.test.js` (`node:test` + `node:assert/strict`, matching VB's unit-test style):
- **Pure core:** path string for 100×100 r=0 (sharp rect, 4 lines, closed); r=10 (contains arc commands `A`); perimeter-length formula vs. closed-form for several dims; radius clamping (radius > min/2 clamps); inset shrinks box + radius. Sampler: `t=0` and `t=1` return the same wrap point; `t=0.25/0.5/0.75` land on the expected edges (within tolerance); corner-region `t` points lie on the corner arc (distance from corner center ≈ radius); monotonic progression.
- **DOM wrappers:** a stub `host` providing `getBoundingClientRect()` + a `getComputedStyle` shim (stub the global, per VB's test convention) — assert `perimeterPath(stub)` matches `roundedRectPath` with the read dims.

## 5. Phase 2 — advanced shapes (high-value; do after the basics land)

These are explicitly **planned, not dropped** — they are what make the extreme `border-wc`/`bg-wc` cases impressive (organic frames, ticket edges, shaped hero backgrounds). Tracked as a follow-up bead. After ak6.2 lands:

1. **Asymmetric per-corner `border-radius`** — parse the full 8-value `border-radius` (4 corners × possibly 2 axes); per-corner arcs in path + sampler.
2. **Elliptical radii** (`rx ≠ ry`) — elliptical corner arcs; sampler arc-length over ellipse segments (numeric integration / lookup).
3. **`clip-path: shape()` / `path()`** — read `getComputedStyle(host).clipPath`, parse, trace as the perimeter (this is the big one for non-rect frames).
4. **Arbitrary polygons / `clip-path: polygon()`** and other non-rect shapes.

The MVP API (`perimeterPath`/`perimeterSampler` + sampler `t` contract) is designed to extend to these without breaking consumers: the wrapper detects the shape source (uniform radius → core; later, asymmetric/clip-path → richer tracer) and returns the same path-string + `(t)=>[x,y]` shapes.

## 6. Out of scope (for now)

Implementing the Phase 2 shapes (captured above + in a bead); any rendering (that's `border-wc`/`bg-wc`); wiring perimeter into VB's runtime bundle.
