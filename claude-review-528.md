# Code Review — @profpowell/bg-wc v0.2.0

**Date:** 2026-05-28
**Reviewer:** Claude (Opus 4.7) via 4 parallel exploration agents
**Scope:** Full codebase — core element, 56 presets, tests, build/tooling, docs/demos
**Repo state:** `main` @ 5cc1f8d, working tree clean

## Executive summary

This is a thoughtfully engineered web component library with strong fundamentals: clean lifecycle, smart bfcache recovery, uniform preset contract, sound build/exports layout, and an unusually clear migration story for the recent `gl-wc → bg-wc` rename. The headline grade is **B+**: it ships well but carries a small number of real defects and one large quality gap.

**The five things to fix first** (revised after merging Codex review findings — see "Reconciliation with codex review" below):

1. **Speed is applied twice** in ~17 presets. Host pre-scales time by `speed`; affected presets compute their own `dt = t - lastT` then multiply by `speed` *again*. At `speed=2` they actually run at 4×. (Verified.)
2. **`el.ready` hangs forever on init failure** (`src/bg-wc.js:285-339`). Every error path returns without calling `#readyResolve()`. A WebGL-disabled browser or a typo'd preset name leaves any `await el.ready` consumer stuck. (Verified — credit: codex review.)
3. **`removeAttribute('preset')` leaves the renderer running** (`src/bg-wc.js:287`). `#loadCurrentPreset` early-returns when `this.preset` is empty, so no dispose, no RAF cancel, no canvas clear. (Verified — credit: codex review.)
4. **Documented subpath import is broken** (`docs/api.html:426`). The example imports `'@profpowell/bg-wc/presets/index.js'`, but the exports pattern `"./presets/*": "./dist/presets/*.js"` interpolates that to `./dist/presets/index.js.js`. (Verified — credit: codex review.)
5. **54 of 56 presets are untested**, and there is no visual regression of any kind. For a project whose value is *how it looks*, this is the single largest exposure.

Also significant: **`customElements` pointer is dangling** in the published tarball — `package.json:64` declares `"customElements": "custom-elements.json"` but `files: ["dist","README.md","LICENSE"]` excludes the file. (Verified.) Beyond these, nothing critical — the remainder is polish, dead artifacts, and a stale spec.

### Reconciliation with codex review

A parallel review by Codex (`review-codex-528.md`) overlapped on five items (CEM still favors `gl-wc` for cssParts; `spec.md` stale; `power-save` not in `observedAttributes`; lifecycle test gaps; `.tgz` checked in) and found **three concrete consumer-facing bugs that this review missed**, now elevated above:

- **Broken documented subpath import** — the `./presets/*` export pattern + the `.js` suffix in the example produces `index.js.js`. This is the single most embarrassing finding because it's *in the published docs*. Any user who copy-pastes the snippet hits it.
- **`removeAttribute('preset')` leaves the renderer alive** — verified by reading the early-return at `src/bg-wc.js:287`. Consumers who treat the attribute as a play/stop control silently leak resources.
- **`ready` never settles on load/init/create failures** — verified across three catch blocks in `#loadCurrentPreset`. The contract "`await el.ready` to know when first paint happened" silently breaks for the unhappy path.

Codex also surfaced **two useful nits** (now folded into the Nits section): the generated `custom-elements.json` includes implementation-detail noise (`textContent`, `className`, slot `name`, a generic event named `t`), and `npm test` emits a `vanilla-breeze.css.map` warning. And it confirmed that `npm run lint`, `npm run build`, `npm run analyze`, and `npm test` all currently pass — useful baseline.

Items this review caught that Codex did not: the speed double-application across 17 presets, 54/56 untested presets + zero visual regression, the dangling `customElements` file pointer, no CI test workflow, the `#tick` stray-frame ordering bug, the battery observer cleanup race, no DPR forwarding to canvas2d presets, ~98 inline `rgb()` assemblies + 30 copies of WebGL boilerplate, SSR import-time `customElements.define` gap, `docs/border-idea/` + `docs/superpowers/` leaking into the deployed site, README's 9-of-56 preset table contradicting the hero, empty CLAUDE.md sections, the `review-codex-528.md` artifact itself.

---

## Strengths

- **Lifecycle is clean.** Symmetric connect/disconnect, `#cleanups` array, rAF cancelled on disconnect, deliberate `WEBGL_lose_context` on dispose to manage the ~16 live-context cap (`src/bg-wc.js:393-397`).
- **bfcache recovery works.** `pageshow` with `e.persisted` rebuilds the preset (`src/bg-wc.js:231-235`); comment correctly notes `webglcontextrestored` is unreliable on restore. Backed by `test/bfcache.spec.js` which reproduces the bug via `WEBGL_lose_context.loseContext()`.
- **Token resolver is the best file in the core.** `src/renderer/tokens.js:23-43` round-trips oklch/lab/color() through `canvas.fillStyle`, defended with a double-assign trick and a `tokens.spec.js` guard for the exact oklch parse-bug from past pain.
- **`#loadingToken` guards stale async preset loads** (`src/bg-wc.js:96,288`). Correct discipline.
- **Deprecation aliases are well-shaped.** `<gl-wc>` subclass warns once; events/CSS vars dual-prefix consistently. Cleanest part of the rename.
- **Library build is right for the use case.** `vite.config.js:18-25` with `preserveModules: true` + unhashed `entryFileNames` matches the `./presets/*` subpath export, so consumers can deep-import one preset and tree-shake the other 55. `sideEffects` correctly lists only the two custom-element entries.
- **Vite site config swaps `fs.globSync` for `readdirSync`** with a comment about CI Node 20 (`vite.site.config.js:7-13`) — the past CI-Node lesson was absorbed.
- **Gallery is data-driven** from `listGroups()` in `src/presets/index.js`, so it cannot go stale per preset.
- **Theme integration is uniform across presets.** All sampled presets read from `getColors()`; no hardcoded brand colors found (one nit: `fireworks.js:111` hardcodes white for the core dot).
- **Reduced-motion handling is centralized** in the host (`src/bg-wc.js:432-447,491-497`) with every preset supplying `staticFrame`. Correct.

---

## Critical & important issues

### Critical: none
No memory leaks, no listener-leak-on-window, no obviously unsafe paths.

### Important

#### 1. Speed double-application (`src/bg-wc.js:506` + 17 presets) — **VERIFIED**
Host advances `this.#timeS += dt * params.speed`, then passes `timeS` to `frame(t, params)`. Presets like `marquee.js:39-41`, `matrix.js:48-60`, `crawl.js:30`, `incoming.js:90`, `cascade.js:55`, `sinescroll.js:35`, `mystify.js:53`, `tetris.js:157`, `pulse.js:24`, `wireframe.js:23`, `network.js:42`, `asteroids.js:61,66`, `dashboard.js:28`, `trades.js:81`, `spirograph.js:23-28` then derive `dt = t - lastT` and multiply by `params.speed` again. Net effect: `speed²`. `spirograph` uses raw `t * speed` *and* the pre-scaled `t`, so at `speed=2` it runs ~4×.

**Fix:** pick one — either (a) stop pre-scaling at `bg-wc.js:506` and document that `t` is raw seconds, or (b) audit & remove the second multiplication from each preset. Option (a) is the smaller diff and the more discoverable contract.

#### 2. `el.ready` never settles on load/init failure (`src/bg-wc.js:285-339`) — *credit: codex*
`#resetReady()` is called at L289. Then every error path — `loadPreset` rejection (L294-298), context creation failure (L315-318), `loaded.create()` throwing (L334-338) — emits `bg-wc:error` and returns without calling `#readyResolve()`. Any caller `await`-ing `el.ready` after a typo'd preset, a WebGL-disabled environment, or a malformed preset module hangs forever. **Fix:** call `this.#readyResolve()` (or reject with the error, or resolve with `{ ok: false, error }`) at every catch site. Document the contract — current code paths suggest it should reject; tests should pin it.

#### 3. `removeAttribute('preset')` leaves the renderer alive (`src/bg-wc.js:287`) — *credit: codex*
`#loadCurrentPreset` returns immediately when `this.preset` is empty, so removing the attribute does not dispose the instance, cancel RAF, clear the canvas, or restore the fallback slot. Consumers using the attribute as a play/stop toggle silently leak a WebGL context (toward the ~16-context cap) and burn CPU. **Fix:** in `attributeChangedCallback` for `preset`, branch on `newV` — if empty/null, call `#disposeInstance()`, cancel `#rafId`, clear the canvas, and emit `bg-wc:preset-changed { from, to: null }`.

#### 4. Documented subpath import is broken (`docs/api.html:426`) — *credit: codex*
The published example reads `import { listGroups } from '@profpowell/bg-wc/presets/index.js'`. With `package.json` exports `"./presets/*": "./dist/presets/*.js"`, the resolver substitutes `*` with `index.js` and yields `./dist/presets/index.js.js` — a 404. **Fix:** change the doc snippet to `'@profpowell/bg-wc/presets/index'` (no `.js`), OR change the exports map to `"./presets/*.js": "./dist/presets/*.js"` if you want the suffix to be canonical. Either is fine; pick one and add a pack-install smoke test (see Tier 1 item 5) to lock it down.

#### 5. `#tick` schedules next frame *before* the work runs (`src/bg-wc.js:501-515`)
On error, the catch cancels `this.#rafId` — but the `requestAnimationFrame(this.#tick)` was already enqueued at the top, so a stray frame fires on a disposed/broken instance. **Fix:** reorder — do work, then schedule the next frame at the end of `#tick`.

#### 6. Battery observer cleanup race (`src/bg-wc.js:222-223` + `src/util/pause.js:3-18`)
`observeBatteryPowerSave` returns an async disposer. If the element disconnects before `navigator.getBattery()` resolves, `disconnectedCallback` empties `#cleanups` *before* the disposer gets pushed — battery listeners leak. **Fix:** AbortController, or guard the `.then()` with an `isConnected` check that disposes immediately.

#### 7. `power-save` is not observable (`src/bg-wc.js:65-79`)
Attribute is read once on connect; flipping `power-save` at runtime is silently ignored. Add it to `observedAttributes` and re-bind in `attributeChangedCallback`.

#### 8. Zero visual regression, 54 presets untested
`smoke.spec.js` and `alias.spec.js` only exercise `mesh-gradient` (plus `dither` once for the alias test). 54 presets reach npm with zero coverage. No `toHaveScreenshot()`, no pixel diffing, no canvas hash. **Fix:** generate a per-preset spec from the registry that mounts each preset on a fixed-size canvas and asserts a screenshot baseline at a loose pixel threshold. Even 56 × 50KB PNGs is ~3MB — trivial. *Codex also recommends targeted lifecycle regressions — see Tier 1 item 5.*

#### 9. No CI test job
`.github/workflows/deploy-pages.yml` builds the Pages site only. Nothing runs `npm test`, `npm run lint`, or `npm run build` (lib) on PRs. `playwright.config.js` declares `forbidOnly: !!process.env.CI` and CI retries, but no workflow sets `CI=1` for them — dead code. **Fix:** add `ci.yml` with Node 20/22 matrix running lint + build + test.

#### 10. Dangling `customElements` pointer in the published package — **VERIFIED**
`package.json:64` declares `"customElements": "custom-elements.json"` but `files` (`["dist","README.md","LICENSE"]`) excludes it. Consumers' tooling (VS Code lit-plugin, etc.) follows the pointer to a 404. **Fix:** add `custom-elements.json` to `files`, *or* drop the field, *or* move it under `dist/` and update the pointer.

#### 11. `spec.md` is badly stale — **VERIFIED (38 `gl-wc` occurrences)**
Still titled `<gl-wc>`, package shown as `@profpowell/gl-wc`, events `gl-wc:*`, CSS vars `--gl-wc-*`. Claims "Ship with **nine** presets" — the repo ships 56. README links to it as "the full design." Readers get a wrong picture. **Fix:** global rename pass + drop §5 preset list (point to `docs/api.html#presets`) + drop §10 docs outline + §12 open questions (now answered). Or replace with a thin `DESIGN.md`.

#### 12. SSR safety gap at import time (`src/bg-wc.js:518-539`, `src/data-background.js`)
`customElements.define` runs at module load with no `typeof customElements !== 'undefined'` guard. Importing in a Node/SSR context throws. **Fix:** wrap both `define` calls in a feature-detect.

---

## Nits & polish

### Core (`src/bg-wc.js`)
- **Magic numbers** without names: `0.1` max-dt (L504), `0.2` battery threshold (`pause.js:6`), `200px` rootMargin (`observe.js:3`), `2` DPR cap (L461). Name them.
- **`fit` attribute is observed and triggers `#resize`** (L77, L269) but `#resize` never applies it. Presets receive it via `getParams()` and must honor it themselves — undocumented contract.
- **`#emit` fires every event twice** (canonical + legacy `gl-wc:` prefix) — pollutes devtools. Cheap; consider a build-time flag to drop the legacy twin in v0.3.
- **`#readParams` calls `getComputedStyle(this)` every frame** (L409). Frame-local cache would help dense pages.
- **`tokens.js` color cache is unbounded** (L15). Long-lived themed apps with many dynamic colors could grow it indefinitely. Add a small LRU cap (128).
- **`#evalPlay` uses `performance.now()`** but `#tick` uses `rAF`'s `nowMs` (L484, L501). Slight time-base mismatch produces a one-frame `dt` spike on resume.
- **`webglcontextrestored`** calls `#loadCurrentPreset(this.preset)` (L377) — passes the *current* preset name as `prevName` for the equality check. Works, but reads confusingly; pass `null`.

### Presets cross-cutting (`src/presets/`)
- **~98 inline `rgb()` string assemblies** + 12 private `function rgb(c)` copies (`asteroids`, `cascade`, `crawl`, `dashboard`, `incoming`, `marquee`, `scatter`, `spirograph`, `sinescroll`, `vectormap`, `waveform`, `wordcloud`). Move to `tokens.js` as `rgbCss(c)`/`rgbaCss(c, a)`.
- **WebGL boilerplate (~25 lines) repeats verbatim** across ~30 shader presets: `createProgram → getAttribLocation('a_pos') → N × getUniformLocation → viewport/clearColor/clear/useProgram/bindQuad → N × uniform*f → drawArrays`. Uniform vocabulary is nearly closed (`u_time, u_intensity, u_density, u_c1..c3, u_bg, u_res`). A `makeShaderPreset(fs, uniforms, mapFn)` helper would collapse each preset to its FS + 5 lines and cut ~750 LOC.
- **Shader compile errors only surface as host runtime errors.** `src/renderer/webgl.js:18-23` throws with the GL log, but the host (`bg-wc.js:316-318`) catches and emits `phase: 'init'` without echoing the shader log to console. Hard to debug in prod.
- **No DPR awareness in canvas2d presets.** Host sizes canvas at devicePixelRatio (`bg-wc.js:457-462`) but `matrix` glyph step, `asteroids`/`fireworks` line widths, `wireframe` strokes are device-pixel constants — they look thin on hi-DPI. Forward `pxScale` via the preset context.
- **`staticFrame` inconsistency.** Some presets duplicate draw logic in `staticFrame` (`confetti`, `fireworks`, `matrix`, `tetris`); others delegate to `frame(0, params)` (`snow`, `plasma`, `conic`, `mesh-gradient`, `aurora`, `dither`, `comic`, `particles`). Prefer delegation unless a genuinely different still is needed.
- **`mesh-gradient.js:55-69`** never passes `u_density` to the shader — `params.density` is ignored.
- **`dither.js`** declares `u_bg` in the FS but the body never reads it. Dead uniform.
- **`matrix.js:82`** `resize()` calls `rebuild({ density: 0.5, seed: lastSeed || 1 })` — hardcoded density, so resize discards the user's density.
- **`grain.js`** doesn't consume `getColors()` — intentional? Inconsistent with the theme-aware promise.
- **`wireframe.js`** has no `dispose` and allocates ~880 small arrays per frame at default seg/lines. Preallocate.
- **`fireworks.js:31`** uses module-scoped `cycle++` (unbounded counter); harmless but lint-flagged.
- **Preset contract is undocumented.** The shape `{resize, frame(t, params), staticFrame(params)?, dispose?}` and the params catalog (`palette/intensity/speed/density/seed/quality/fit/text`) live implicitly across `bg-wc.js:326-339,467,492,508`. A short comment block in `src/presets/index.js` would prevent half the inconsistencies above.

### Tooling & repo hygiene
- **Generated `custom-elements.json` includes implementation noise** *(codex)*. Internal DOM-construction artifacts (`textContent`, `className`, slot `name`) and a generic event named `t` leak into the public manifest, weakening downstream IDE/docs integrations. **Fix:** extend `custom-elements-manifest.config.mjs` to strip local DOM-construction fields and declare the *public* events explicitly (`bg-wc:ready`, `bg-wc:error`, `bg-wc:preset-changed`, `bg-wc:visibility`, plus the legacy twins).
- **`npm test` logs a missing `vanilla-breeze.css.map` warning** *(codex)*. Doesn't fail; clutters CI logs. Configure Vite to suppress or fix the upstream sourcemap reference.
- **`profpowell-bg-wc-0.2.0.tgz` checked in at repo root** (38KB). Leftover from manual `npm pack`. Delete and add `*.tgz` to `.gitignore`. — **VERIFIED**
- **`review-codex-528.md` at repo root.** Internal artifact bleeding into the repo. Move to `internal/reviews/` or delete. — **VERIFIED**
- **No `engines.node`.** After the `globSync`/Node-22 incident, pin `"node": ">=20"`.
- **No sourcemaps in `dist/`** — add `build.sourcemap: true`.
- **ESLint ignores `test/`** (`eslint.config.js:40`) and `format` only globs `src/**` — tests are neither linted nor formatted. Fold them in (add Playwright globals).
- **CEM staleness risk.** `analyze` runs in `prepublishOnly` only; the committed 50KB `custom-elements.json` drifts silently. Add `cem analyze && git diff --exit-code custom-elements.json` to CI.
- **`custom-elements-manifest.config.mjs:24`** still keys on `tagName === 'gl-wc'` for cssParts — after the rename, the canonical element has no `part="canvas"` doc.
- **No pack-install smoke test.** Given the custom `exports` map (`./presets/*`), a CI step that runs `npm pack && npm install $pkg` into a fixture and dynamically imports `@profpowell/bg-wc/presets/dither` would catch dist-layout breaks.
- **`fullyParallel: false, workers: 1`** is fine for 4 specs but won't scale to per-preset visual tests.

### Docs
- **README preset table shows 9 of 56** (`README.md:36-46`). The hero says "Dozens of presets" — contradiction. Title it "Highlights" and link to `docs/api.html#presets` underneath.
- **`docs/border-idea/` and `docs/superpowers/`** ship inside the deployed `dist-site/`. `border-idea` is draft work for a sibling package; `superpowers/` is 25 internal plans/specs. Move out of `docs/` (use `internal/` or a sibling repo) and exclude from the site build.
- **No deprecation timeline** for the gl-wc aliases. Add a target version in the migration section ("removal targeted for 1.0").
- **`CLAUDE.md` Build & Test section is empty** ("_Add your build and test commands here_"). Fill in: `npm run dev`, `npm run build`, `npm run build:site`, `npm test`. Add a one-paragraph architecture overview pointing at `src/bg-wc.js`, `src/presets/`, `src/renderer/`. Note the ~16 WebGL-context cap as a first-class constraint.
- **No per-preset demo pages.** 33 demo files exist but they're themed compositions, not isolated showcases. Deep-linking ("show me `tempest`") only works in the gallery. Optional: auto-generate one mini-page per preset from the registry.

---

## Open questions for the maintainer

1. **`power-save="on"`** — sentinel or any non-"auto"? Today only `"off"` is special-cased (`bg-wc.js:219`); `"on"` is a no-op.
2. **Is `quality` hot-swappable?** It's read fresh each frame but not in `observedAttributes`. Quality changes often require re-init (AA/sample count). Document.
3. **`:state(--child-focused)`** is set (`bg-wc.js:122-131`) but no public attribute/event reflects it. Authors must know to write `:host(:state(--child-focused))`. Worth a docs example.
4. **`data-background` MutationObserver never auto-disconnects** (`data-background.js:130-133`). Intentional for SPAs; document.
5. **`snapshot()` on WebGL with `preserveDrawingBuffer: false`** — currently calls `frame()` then `toBlob` synchronously, which usually works but is fragile. Worth a guarantee comment or a `preserveDrawingBuffer: true` opt-in.

---

## Prioritized action list

### Tier 1 (do before next publish)
1. Fix speed double-application — pick host pre-scale OR per-preset scale, not both.
2. Settle `el.ready` on every failure path in `#loadCurrentPreset` (resolve-with-error or reject; pick one and pin with a test). *(codex)*
3. Handle empty `preset` in `attributeChangedCallback` — dispose, cancel RAF, clear canvas. *(codex)*
4. Fix `docs/api.html:426` subpath import example (drop the `.js` suffix). *(codex)*
5. Add per-preset Playwright spec + visual baselines + the four targeted lifecycle regressions codex called out: `removeAttribute('preset')` stops RAF/disposes context; unknown preset settles `ready`; context-unavailable settles `ready`; CEM contains `canvas` cssPart for `bg-wc`; pack-install resolves the documented subpath import.
6. Add CI workflow (lint + build + test on Node 20/22).
7. Fix the `customElements` pointer — add to `files` or drop the field.
8. Delete `profpowell-bg-wc-0.2.0.tgz`, `review-codex-528.md`; add `*.tgz` to `.gitignore`.

### Tier 2 (next sprint)
6. Rewrite or retire `spec.md`.
7. Reorder `#tick` (work first, then schedule next frame).
8. Fix battery observer cleanup race; add `power-save` to `observedAttributes`.
9. Move `docs/border-idea/` and `docs/superpowers/` out of the deployed site.
10. Pin `engines.node >= 20`; add `build.sourcemap: true`.
11. Add `cem analyze` drift check to CI; fix `gl-wc` → `bg-wc` in `custom-elements-manifest.config.mjs:24`.
12. Document the preset contract in a header comment in `src/presets/index.js`.

### Tier 3 (cleanup pass)
13. Extract `rgbCss`/`rgbaCss` to `tokens.js`; remove ~98 inline assemblies + 12 private copies.
14. Add `makeShaderPreset(fs, uniforms, mapFn)` helper; collapse ~30 WebGL presets.
15. Forward `pxScale` (DPR) into the preset context; fix hi-DPI thinness in canvas2d presets.
16. Fix `matrix.js:82` hardcoded density on resize, `mesh-gradient` ignored density, `dither` dead `u_bg`, `wireframe` missing dispose + hot-loop allocs.
17. Fold `test/` into lint/format; add Playwright globals.
18. Fill in `CLAUDE.md` build & architecture sections.
19. Add pack-install smoke test to CI.
20. Add deprecation timeline to the README migration section.

---

## File reference index

| Path | Notes |
|---|---|
| `src/bg-wc.js` | Main element, 544 lines, well-organized; speed scaling at L506, `#tick` reorder at L501-515 |
| `src/data-background.js` | DOM binder; SSR guard gap |
| `src/renderer/tokens.js` | Best file in the core; add `rgbCss`/`rgbaCss` here |
| `src/renderer/webgl.js` | Shader log on throw doesn't reach console |
| `src/renderer/canvas2d.js` | Tiny, clean |
| `src/util/observe.js`, `pause.js` | Pause has the battery cleanup race |
| `src/presets/index.js` | Document the preset contract here |
| `src/presets/{17 files}` | Speed double-apply — see issue #1 |
| `test/*.spec.js` | 4 specs, 1.5 presets covered |
| `playwright.config.js` | Workers=1 will sting after per-preset specs |
| `vite.config.js` | Add `sourcemap: true` |
| `package.json` | Add `engines`, fix `customElements` vs `files` |
| `eslint.config.js` | Lint `test/` too |
| `custom-elements-manifest.config.mjs` | Still keys on `gl-wc` |
| `.github/workflows/` | Only Pages deploy — add `ci.yml` |
| `spec.md` | 38 stale `gl-wc` refs |
| `README.md` | "Highlights" not "Presets"; link to api.html |
| `CLAUDE.md` | Build & Architecture sections empty |
| `docs/border-idea/`, `docs/superpowers/` | Move out of deployed site |
| `profpowell-bg-wc-0.2.0.tgz`, `review-codex-528.md` | Delete |
