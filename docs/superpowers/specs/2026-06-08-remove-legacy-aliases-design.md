# Design: Remove deprecated gl-wc + data-bg aliases

**Date:** 2026-06-08
**Issue:** gl-wc-elz
**Status:** Approved design, ready for implementation

## Summary

Remove every deprecated legacy alias left over from the `@profpowell/gl-wc →
@profpowell/bg-wc` rename (and the earlier `data-bg` binder attribute). After
this change only the canonical surface remains: `<bg-wc>`, `data-background`,
`--bg-wc-*` CSS variables, and `bg-wc:*` events. This is a **breaking** change;
the version bump is intentionally **held** (applied at the next publish).

## Goals

- Delete the `<gl-wc>` custom element, `gl-wc:*` event twins, and `--gl-wc-*` CSS
  variable fallbacks.
- Delete the `data-bg` / `data-bg-skip` binder alias and its `bg` namespace.
- Keep the canonical paths working unchanged.
- Replace the alias tests with regression guards proving the aliases are gone.

## Non-goals

- No version bump (held).
- No rename of `data-bg-element` — it's the binder's internal positioning marker,
  not a user-facing alias. It stays.
- No other refactoring.

## Changes by file

### `src/bg-wc.js`

- Remove `class GlWcAlias`, the `warnedGlWc` flag, and
  `customElements.define('gl-wc', …)`. The module export becomes `{ BgWc }`.
- Remove `const EMIT_LEGACY_GL_WC` and the `gl-wc:` twin branch in `#emit`; events
  fire only in the `bg-wc:` namespace.
- `STYLE`: drop the `--gl-wc-color-bg` and `--gl-wc-z-index` fallbacks (keep
  `--bg-wc-*` and the `--color-*` / `0` defaults).
- `COLOR_MAPPING`: drop `--gl-wc-color-{1,2,3,bg,fg}` from the `override` arrays
  (keep the `--bg-wc-color-*` entries).
- `#readParams` `cssVar`: collapse the prefix loop `['--bg-wc-', '--gl-wc-']` to
  `['--bg-wc-']`.
- Pixel ratio: drop the `--gl-wc-pixel-ratio` fallback (keep `--bg-wc-pixel-ratio`
  and the `pixel-ratio` attribute).

### `src/data-background.js`

- Remove the `[data-bg]` / `[data-bg-skip]` CSS selectors.
- Remove the `data-bg` branch in `bindOne` (the `ns:'bg'` path + its
  console.warn). The binder reads only `data-background` (`ns` becomes always
  `'background'`).
- Collapse the scan/observe selectors `[data-background], [data-bg]` to
  `[data-background]`.
- Keep `data-bg-element` (internal marker) and all `data-background-*` handling.

### `custom-elements-manifest.config.mjs`

- `TAGS` → `['bg-wc']`.
- `EVENTS` drops the `gl-wc:${name}` twins (only `bg-wc:${name}` remain).
- Regenerate `custom-elements.json`: the `gl-wc` element declaration and the
  `gl-wc:*` events disappear; `cem:check` stays green once committed.

### Docs

- Rewrite README's "Migrating from gl-wc" section as a hard-cut migration note:
  rename `<gl-wc>`→`<bg-wc>`, `data-bg`→`data-background`,
  `--gl-wc-*`→`--bg-wc-*`, and `gl-wc:*`→`bg-wc:*` event listeners.

## Testing

- **Replace `test/alias.spec.js`** (asserts aliases work) with the inverse
  regression guard (`test/legacy-removed.spec.js` or repurpose the file):
  - `customElements.get('gl-wc')` is `undefined`; a `<gl-wc>` element does not
    upgrade (stays a plain `HTMLElement`, no shadow root / canvas).
  - A `bg-wc:ready` listener fires for `<bg-wc>`; a `gl-wc:ready` listener does
    **not**.
  - `--gl-wc-color-1` set on the host is ignored; `--bg-wc-color-1` still wins.
  - `data-bg="plasma"` injects no `<bg-wc>`; `data-background="plasma"` still does.
- **Fix `test/tokens.spec.js`**: the "falls back to `--gl-wc`" case flips to
  "no `--gl-wc` fallback" (only `--bg-wc-*` override is honored).
- All other suites (lifecycle, visual baselines, node units, manifest) stay
  green. Update any incidental `gl-wc`-string expectations (not the `gl-wc-*`
  bead ids in comments, which are unrelated).

## Edge cases

- Existing pages using `<gl-wc>` / `data-bg` / `--gl-wc-*` / `gl-wc:*` silently
  stop working (the point of removal) — documented in the README migration note.
- `data-bg-element` retained, so the binder's z-index positioning is unaffected.
