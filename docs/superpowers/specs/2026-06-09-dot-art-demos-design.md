# Dot-art gallery controls + showcase demos

**Date:** 2026-06-09
**Status:** Approved (brainstorm) — pending implementation plan
**Author:** brainstormed with ProfPowell

## Motivation

The three dot-art presets (`dotwork`, `stipple`, `tapestry`) shipped to the registry
and already auto-appear in the gallery via `listGroups()`. But: (1) `dotwork` and
`stipple` have `mode` variants that the gallery cannot currently switch — the gallery
only renders mode pills for presets listed in its `MODE_OPTIONS` map, and the new
presets aren't in it; (2) there are no showcase demos for the new presets. This adds
the missing mode controls and three immersive demo pages.

## Part A — Gallery mode controls

File: `docs/gallery.js`.

1. Add entries to `MODE_OPTIONS` (the first option MUST be the preset's own default so
   the initially-pressed pill is honest):
   - `dotwork`: `rings` (default) · `spiral` · `double` · `whorl` · `waterholes`
   - `stipple`: `field` (default) · `contour` · `vortex`
   - `tapestry`: **no entry** — it has no `mode`, so it correctly renders without pills.
2. Add `CARD_DEFAULTS` so the dense presets read well on first paint (verify against the
   live card; adjust if needed):
   - `dotwork`: `{ density: 0.7 }`
   - `tapestry`: `{ density: 0.7 }`
   (`stipple` looks fine at the shared `BASE_DEFAULTS`; confirm visually.)

No other gallery change — listing, lazy-mount, and the WebGL budget are unaffected (all
three are canvas2d).

## Part B — Three showcase demos

Each demo is a single full-page HTML in `demos/`, following the established pattern
(`demos/mandala.html` is the reference): CSS-custom-property palette, full-bleed
`<bg-wc class="bg">`, a `.vignette` overlay, a back-nav (`<a href="./" target="_top">←
Demos</a>`), a centered hero (`.eyebrow` / `h1` / `.lede`), a `.telemetry` footer, and
themed Google fonts. `overflow: hidden`, full-viewport stage. Script:
`<script type="module" src="../src/bg-wc.js"></script>`.

1. **`demos/dotwork.html`** — concentric dot-rosette signature. Earthy palette (deep
   night background; ochre / terracotta / turquoise / white accents). `preset="dotwork"
   mode="rings"`, moderate `density`/`intensity`, slow `speed`. Copy describes the
   technique (concentric rings of dots radiating across a field).
2. **`demos/stipple.html`** — pointillist field. Impressionist palette. `preset="stipple"`
   with `mode="field"` (graded pointillism). Copy describes pointillism / hand-stippled
   color fields.
3. **`demos/tapestry.html`** — dense dot-art composite as a rich backdrop. Vibrant
   multi-color palette. `preset="tapestry"`, higher `density`. Copy describes a densely
   packed dot tapestry that content layers over.

### Demo index cards

File: `demos/index.html`. Add three `.bw-card` blocks (mirroring the existing
`browser-window` preview + `.bw-open` link + `.meta` markup), placed near the other
ornamental/pattern demos (e.g. after the Mandala card). Names / descriptions:
- Dotwork — "concentric dots"
- Stipple — "pointillist field"
- Tapestry — "dot composite"

The site build (`vite.site.config.js`) auto-globs `demos/*.html`, so the new pages are
included with no config change.

## Theming & cultural sensitivity

The source art draws on Aboriginal Australian dot-painting, which carries sacred
cultural meaning. The demos are themed around the **visual technique** (pointillism,
concentric dot fields, dotwork) and **deliberately avoid appropriating sacred terms**
("songlines", "Dreaming", etc.) in the public-facing copy. The internal `waterholes`
mode value is unchanged (it's an attribute, not public demo copy).

## Out of scope (YAGNI)

- On-page interactive controls in the demos (the brainstorm chose immersive showcase
  pages matching the existing 44 demos, not playgrounds).
- A landing-page content mock for tapestry.
- Per-demo Playwright specs — demos are validated by `build:site` success + a manual /
  Playwright screenshot render check, consistent with the existing demos (which have no
  per-demo tests).

## Verification

- `npm run build:site` succeeds and emits the three demos to `dist-site/demos/`.
- Open each demo in a browser (Playwright screenshot) — confirm it renders, the dot art
  is visible, and the page looks polished. "High touch" means looking, not assuming.
- Gallery: confirm `dotwork` and `stipple` show mode pills that switch the rendered
  variant live; confirm `tapestry` shows no pills and renders.

## Tracking

Work tracked in **beads** (`bd`), per repo convention.
