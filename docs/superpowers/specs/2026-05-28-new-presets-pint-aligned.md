# Spec: Four New Background Presets — mosaic, ribbons, source, system7

**Date:** 2026-05-28
**Author:** Driven by user request after reviewing pint.com aesthetic
**Status:** Spec — awaiting plan + implementation

## Summary

Add four new Canvas2D presets to `@profpowell/bg-wc`. Two are calibrated for the pint.com aesthetic (refined B2B, purple-on-light, "stylized boxes"); two are stand-alone tech and retro showcases.

| Preset | Group | Personality |
|---|---|---|
| `mosaic` | `pattern` | Pint-aligned squares; 4 modes via `mode` attribute |
| `ribbons` | `gradient` | Bezier ribbons with crisp outlines (geometric waves) |
| `source` | `text` | Faded HTML source listing — IDE through frosted glass |
| `system7` | `retro` | Drifting Mac window chrome on 50% stipple |

Net add: ~700–900 LOC of presets + ~50 LOC registry/demo/tests.

## Motivation

The 56 existing presets cover broad ground but leave specific gaps:
- No refined geometric squares preset for corporate/B2B integration
- No "geometric wave" preset that is genuinely geometric (existing `waves` is gradient-based)
- No code/markup preset; `matrix`'s `text` attribute is the closest but is rain-formatted
- No classic-Mac-OS preset; `gameboy` is the only adjacent retro grayscale

User reviewed pint.com and asked for four backgrounds spanning these gaps.

## Design

### Preset 1: `mosaic` (group: `pattern`)

Single preset, four modes selectable via `mode` attribute on the host (read via `host.getAttribute('mode')` each frame; default `isometric`).

- **`isometric`** (default): rhombus tiles drawn at 30° (faux-3D cube tops) in a wide grid. Subtle drift along the iso axes; occasional tile pulses in primary/accent colors.
- **`flat`**: 3–4 parallax layers of axis-aligned squares at varied sizes (largest farthest back, slowest). Soft horizontal drift, varied alpha by depth.
- **`sparse`**: thin outline grid covering the viewport; every few seconds one cell fades in→full→out at primary or accent. Network/dashboard reading.
- **`stacked`**: short vertical stacks of squares assemble bottom-up and dissolve top-down on a loop.

**Params consumed:**
- `density`: tile/stack count (0..1)
- `intensity`: glow/contrast (0..1)
- `speed`: drift rate (host already pre-scales `t`)
- `palette`: theme tokens via `getColors()` — primary, accent, info, bg, fg
- `seed`: deterministic layout

**Default:** `density=0.5 intensity=0.5 speed=0.4 mode=isometric`. Calibrated subtle/ambient.

**`staticFrame`:** Reduced-motion still — same composition, no motion offsets, no pulses (one quiet frame).

### Preset 2: `ribbons` (group: `gradient`)

Stacked Bezier ribbons (3–5 by default, scales with `density`). Each ribbon is a filled band between two cubic Bezier curves sharing a phase-shifted sine envelope.

**Crisp-not-gradient discipline:**
- Top edge of each ribbon has a 1.5–2px stroke in `--color-fg` at low alpha (≈0.15)
- Bands are solid-filled at distinct alpha levels (no inter-band blur)
- Color cycling: primary → accent → info, repeating; adjacent ribbons get adjacent palette entries

**Params:**
- `density`: ribbon count (clamped 3–8)
- `intensity`: amplitude scale (0..1, maps to 0.05..0.25 of viewport height)
- `speed`: horizontal phase drift rate
- Theme tokens via `getColors()`

**Default:** `density=0.4 intensity=0.5 speed=0.3`. Subtle/ambient.

**`staticFrame`:** Same ribbons at phase=0.

### Preset 3: `source` (group: `text`)

Fixed HTML source listing rendered in a small monospace font, filling viewport like a quiet IDE pane. Two motions:

1. **Slow vertical scroll** — listing advances ~1 line every 6s default; on reaching end, wraps seamlessly.
2. **Span flickers** — random spans flicker opacity briefly (suggesting cursor highlights / lint passes). 1–3 flickers per second at default intensity.

**Color mapping:**
- Tags (`<div`, `</span>` etc.): `--color-primary` at low alpha (~0.4)
- Attribute names (e.g., `class=`): `--color-accent` at low alpha (~0.45)
- Strings (e.g., `"hello"`): `--color-info` at low alpha (~0.45)
- Plain text content: `--color-fg` at very low alpha (~0.25)
- Background: `--color-background`

**Default listing:** A realistic ~80-line HTML document with semantic elements, attributes, and a couple of `<script>`/`<style>` blocks. Ships baked into the preset so it works with zero config.

**Author override:** Set the existing `text` attribute on the host to a custom listing (raw text). When present, that becomes the rendered source.

**Params:**
- `density`: font scale (0..1, maps to 9–14px monospace)
- `intensity`: flicker frequency (0..1)
- `speed`: scroll rate (host pre-scales)

**`staticFrame`:** Single static snapshot of the listing — no scroll, no flicker.

### Preset 4: `system7` (group: `retro`)

Background: iconic Mac 50% stipple (alternating pixels). Over it: 3–5 mini "windows" drift slowly, occasionally crossing.

**Window anatomy** (each window):
- White interior
- 1px black border
- Title bar = 6 horizontal black lines (the classic Macintosh stripe pattern)
- Hollow black-outlined square close box on title bar's left
- 1–2 lines of 25% stipple for "contents"

Windows wrap around viewport edges so they appear to drift across infinitely.

**Theme mechanism:**
- Default: hard black on white (deliberate — the lock-in to monochrome is the point)
- When `use-theme` attribute is present on host: page color = `--color-background`, chrome color = `--color-fg`

**Params:**
- `density`: window count (clamped 2–8)
- `intensity`: selects stipple density — 25% / 50% / 75% (mapped from 0..1 in thirds)
- `speed`: drift rate
- `seed`: deterministic window positions/sizes

**`staticFrame`:** Snapshot at t=0.

## Implementation strategy

### File layout

```
src/presets/
  mosaic.js     (new)
  ribbons.js    (new)
  source.js     (new)
  system7.js    (new)
src/presets/index.js  (modified — add 4 registry entries)
docs/api.html         (modified — document new presets + custom attrs)
demos/pint-tribute.html  (new — composition demo with mosaic + ribbons)
test/new-presets.spec.js (new — smoke tests)
```

### Registry entries

```js
mosaic:  { renderer: 'canvas2d', group: 'pattern', loader: () => import('./mosaic.js') },
ribbons: { renderer: 'canvas2d', group: 'gradient', loader: () => import('./ribbons.js') },
source:  { renderer: 'canvas2d', group: 'text', loader: () => import('./source.js') },
system7: { renderer: 'canvas2d', group: 'retro', loader: () => import('./system7.js') },
```

### Custom attributes

Two new attributes used only by these presets (read by the presets directly from `host`, not added to the standard params catalog):

- `mode` (string) — read by `mosaic`; values `isometric` / `flat` / `sparse` / `stacked`; default `isometric`. Re-read each frame (no `attributeChangedCallback` wiring needed; consistent with how `palette`/`quality` are read fresh per frame).
- `use-theme` (boolean) — read by `system7`; presence enables theme tokens.

Documented in `docs/api.html` per-preset; not added to `bg-wc.js` `observedAttributes`.

### Demo

`demos/pint-tribute.html` shows:
- `<bg-wc preset="mosaic" mode="isometric">` as a hero background
- A second `<bg-wc preset="ribbons">` in a section below
- Both with CSS vars set to a plausible pint-purple palette: `--color-primary: oklch(45% 0.15 290)`, `--color-background: #fafafa`, `--color-fg: #1a1a1a`
- One paragraph noting "these adapt to whatever palette you set — drop them into your site with your own theme tokens"

Linked from `demos/index.html`.

### Tests

`test/new-presets.spec.js` adds 4 smoke tests (one per preset):
- Load the preset, await `ready`, assert canvas has nonzero pixels via `snapshot()` blob size > some floor
- For `mosaic`: also exercise each of the 4 modes (4 sub-tests)
- For `system7`: also test `use-theme` attribute toggling chrome color

Deep visual regression (baselines per preset) intentionally NOT scoped here — that's `gl-wc-t8b`, owned separately.

### CEM

After implementation: run `npm run analyze`. Verify the manifest includes the new presets. The custom attributes are not currently in CEM scope (they're preset-specific, not on `<bg-wc>` itself); add a short note in `docs/api.html` instead.

### Build / publish

No changes to `vite.config.js`. The `preserveModules: true` + `./presets/*` exports pattern already handles new preset files automatically. Verify `npm run build` produces `dist/presets/mosaic.js` etc. as expected.

## Risks & open questions

1. **Mode attribute precedent.** This is the first preset (`mosaic`) to read a host attribute other than `text`. Establishing this convention has knock-on implications — future presets may follow. Worth being explicit in the preset contract doc (handled separately via `gl-wc-1a0`).
2. **`source` rendering performance.** Drawing 60+ lines of text every frame is fine on modern hardware, but if the listing scrolls smoothly we may want to render the static lines into an offscreen canvas once and only re-render the flickering spans per frame. Optimize only if measurable.
3. **`system7` aesthetic risk.** "Drifting windows" might feel busy. Default count is 4; if testing reveals it reads as cluttered, reduce default to 3 and let `density` reach higher.
4. **Pint-style demo.** The purple/off-white palette in `pint-tribute.html` is a *plausible* approximation, not pulled from inspecting pint.com's actual CSS. If you want exact match, we'd need a follow-up to extract real values.
5. **`source` author-text override** uses the existing `text` attribute, which today is documented as "set text to display" (used by `marquee`, `crawl`, `sinescroll`, `cascade`). Behavior is consistent but worth noting in docs.

## Acceptance criteria

- 4 new preset files created and registered
- All 4 visible in the gallery (`docs/index.html`)
- `mosaic` honors `mode` attribute with 4 distinct visual states
- `system7` defaults to black/white; honors `use-theme` attribute
- `source` ships with a default listing and accepts override via `text`
- `npm run lint && npm run build && npm test` all pass
- `npm run analyze` produces a manifest that includes the new presets
- `demos/pint-tribute.html` exists and renders both `mosaic` and `ribbons` with pint-style theming
- One smoke test per preset; mosaic tests all 4 modes; system7 tests theme toggle
