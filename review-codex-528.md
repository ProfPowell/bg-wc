# Repository Review - Codex - 2026-05-28

## Scope

Reviewed the `@profpowell/bg-wc` repository at a source, packaging, documentation, and test-coverage level. I inspected the web component lifecycle, the data-background binder, preset registry, renderer utilities, site/build configuration, custom-elements manifest generation, and Playwright tests.

## What Looks Strong

- The project has a clear product shape: a small canonical `<bg-wc>` element, an optional `data-background` binder, lazy-loaded presets, and a separate Vite site build.
- The renderer split is pragmatic. `src/bg-wc.js` owns lifecycle and scheduling, `src/renderer/*` stays thin, and each preset is isolated behind the registry in `src/presets/index.js`.
- Backward compatibility for the `gl-wc` rename is handled deliberately: legacy element, legacy CSS variables, legacy events, and legacy binder attributes are all still supported with warnings.
- The test suite covers the main public seams: upgrade/API smoke tests, snapshots, token parsing, legacy aliases, and WebGL context loss plus bfcache-style recovery.
- Quality gates currently pass:
  - `npm run lint`
  - `npm run build`
  - `npm run analyze`
  - `npm test` with 12 passing Playwright tests

## Observations And Suggestions

### 1. Documented package subpath import appears wrong

`docs/api.html` documents:

```js
import { listGroups } from '@profpowell/bg-wc/presets/index.js';
```

But `package.json` exposes `"./presets/*": "./dist/presets/*.js"`. With that export pattern, consumers should import a star value without the `.js` suffix, for example:

```js
import { listGroups } from '@profpowell/bg-wc/presets/index';
```

Otherwise `./presets/index.js` maps to `./dist/presets/index.js.js` under Node package export pattern replacement.

References: `package.json` exports block, `docs/api.html` package-usage example.

### 2. Removing the `preset` attribute leaves the current renderer alive

`attributeChangedCallback()` calls `#loadCurrentPreset(oldV)` when `preset` changes, but `#loadCurrentPreset()` immediately returns when the current `this.preset` is empty. That means `el.removeAttribute('preset')` does not dispose the active instance, stop rendering, clear the canvas, or resolve a new inert state.

Suggested behavior: when the new preset is absent, cancel RAF, dispose the instance/context, reset renderer state, and decide whether the fallback slot should be shown.

References: `src/bg-wc.js` around `attributeChangedCallback()` and `#loadCurrentPreset()`.

### 3. `ready` can remain pending forever on load/init failures

`#loadCurrentPreset()` calls `#resetReady()` before loading. If `loadPreset()` fails, context creation fails, or preset construction fails, the method emits `bg-wc:error` and returns without resolving or rejecting `ready`.

That creates a trap for callers using `await el.ready`: an invalid preset or WebGL-disabled environment can hang forever. Either rejecting `ready` on failure or resolving it with an error state would make the API much easier to consume and test.

References: `src/bg-wc.js` error paths in `#loadCurrentPreset()`.

### 4. The custom-elements manifest still favors the deprecated tag for CSS parts

`custom-elements-manifest.config.mjs` adds the `canvas` CSS part only when `decl.tagName === 'gl-wc'`. The generated `custom-elements.json` therefore shows `cssParts` on the deprecated alias, not on canonical `bg-wc`.

Suggested fix: attach `cssParts` to `bg-wc`, or to both `bg-wc` and `gl-wc` while the alias remains supported.

References: `custom-elements-manifest.config.mjs`, `custom-elements.json`.

### 5. Public API metadata is noisier than it needs to be

The generated manifest includes implementation artifacts such as internal DOM element properties (`textContent`, `className`, slot `name`) and a generic event named `t`. That weakens downstream docs and editor integrations because consumers see private implementation noise rather than the actual public surface.

Suggested fix: extend the manifest plugin to remove obvious local DOM-construction fields and explicitly declare the public events (`bg-wc:ready`, `bg-wc:error`, `bg-wc:preset-changed`, `bg-wc:visibility`) plus the deprecated legacy twins if desired.

Reference: `custom-elements.json`.

### 6. `spec.md` is now historically useful but operationally stale

`spec.md` still describes the old `<gl-wc>` package, repo, events, CSS variables, docs path, and some implementation choices that diverge from current source. That is fine as a historical design document, but it is risky as "the full design" because `README.md` points readers there.

Suggested fix: either update `spec.md` to canonical `bg-wc` terminology or mark it clearly as the original design spec and point current API readers to `docs/api.html`.

Reference: `README.md` points to `spec.md`; `spec.md` still uses the old canonical names throughout.

### 7. Add focused regression tests for the lifecycle edges

The existing Playwright suite is useful, but the bugs above are not covered. Good additions would be:

- `removeAttribute('preset')` stops RAF/rendering and frees WebGL context.
- Unknown preset emits `bg-wc:error` and settles `ready`.
- Context unavailable or preset `create()` failure settles `ready`.
- `custom-elements.json` contains the `canvas` CSS part for `bg-wc`.
- The documented package subpath import resolves after `npm run build`.

These are small tests but protect the parts of the API most likely to break consumer code.

## Lower-Priority Notes

- `power-save` is read on connect but is not in `observedAttributes`; runtime changes from `off` to automatic mode will not install the battery observer.
- `npm test` logs a Vite warning about a missing `vanilla-breeze.css.map`. It does not fail the suite, but cleaning it up would make CI output easier to scan.
- The checked-in `profpowell-bg-wc-0.2.0.tgz` is likely useful for local release inspection, but if it is not intentionally part of the repository it adds binary/package churn.

## Suggested Priority

1. Fix the documented package subpath import.
2. Fix preset removal and `ready` failure settling.
3. Correct the custom-elements manifest plugin and regenerate the manifest.
4. Refresh or clearly archive `spec.md`.
5. Add the targeted lifecycle/package regression tests.
