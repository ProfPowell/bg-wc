# CODEX review: bg-wc

- **Reviewed:** 2026-09-01
- **Baseline:** `main` at `a990f00`
- **Scope:** runtime architecture, the 199-preset catalog, binder, accessibility,
  rendering, tests, npm packaging, documentation site, dependencies, and GitHub
  automation.

## Executive assessment

bg-wc has a notably strong foundation for a graphics-heavy web-component library:
the published library has no runtime dependencies, renderer disposal is deliberate,
the catalog is broad, and the automated suite is much deeper than is typical for a
project of this size. The main opportunity is now consistency, not more surface
area. Cross-cutting contracts such as “time comes only from `t`,” “paused means
static,” “CI deploys exactly what passed,” and “published metadata describes the
tarball” are not yet enforced end to end.

I found no P0 issue requiring repository shutdown. I would, however, fix the P1
items below before the next public release or Pages deployment. Four are immediate
release blockers:

1. The `data-background` binder can turn permitted `data-*` input into executable
   event-handler attributes.
2. Pages can build and deploy a different commit from the one whose CI run passed.
3. `custom-elements.json` points consumers at source files omitted from the npm
   package.
4. The production site omits a GitHub icon that works during development, exposing
   a broader dev-versus-build verification gap.

The largest runtime theme is stopped-state correctness. Resizing can erase a
reduced-motion canvas, `speed="0"` does not actually stop all motion, snapshots
advance stateful simulations, and seven presets advance by invocation count rather
than elapsed time.

### Priority map

| Priority | Workstream                                                 | Tracking     |
| -------- | ---------------------------------------------------------- | ------------ |
| P1       | Restrict binder attributes and repair ownership semantics  | `gl-wc-ff9s` |
| P1       | Deploy the exact CI-approved revision with least privilege | `gl-wc-mnyv` |
| P1       | Make CEM paths and npm package exports truthful            | `gl-wc-fvam` |
| P1       | Verify production assets and restore the GitHub icon       | `gl-wc-kkgm` |
| P1       | Make paused, reduced-motion, and zero-speed output static  | `gl-wc-6efd` |
| P1       | Make snapshots observational and failures consistent       | `gl-wc-bfsy` |
| P1       | Make stateful presets obey elapsed-time semantics          | `gl-wc-beh4` |
| P1       | Repair the slime-mold WebGL1 fallback                      | `gl-wc-5cbv` |
| P1       | Refresh vulnerable and oversized development dependencies  | `gl-wc-88gx` |
| P2       | Keep DPR and contextual color rendering live               | `gl-wc-yfrp` |
| P2       | Add built-site, cross-browser, and reduced-motion coverage | `gl-wc-rp9v` |
| P2       | Align public API documentation and behavior                | `gl-wc-ylp4` |
| P2       | Modernize CI and release automation                        | `gl-wc-nx0q` |
| P3       | Reduce renderer and demo hot-path overhead                 | `gl-wc-sbyi` |

## P1: fix before the next release or deployment

### 1. The binder is an attribute-smuggling gadget

[`bindOne()`](src/data-background.js#L74-L100) strips the
`data-background-` prefix from every matching attribute and forwards the remainder
to `setAttribute()`. That turns an inert attribute such as
`data-background-onfocus` into `onfocus` on an injected `<bg-wc>`. A Chromium probe
with `data-background-tabindex="0"` and an `onfocus` payload created a focusable
component and executed the handler.

This matters when an application sanitizer permits arbitrary `data-*` attributes
but removes executable `on*` attributes. A strict Content Security Policy can
reduce exploitability, but it does not make an open attribute translator a safe
library contract.

**Tighten it:** replace the open mapper with an explicit set of supported bg-wc
parameters. Reject at least `on*`, `style`, and generic element attributes. In the
same module, stop treating the [`BOUND` WeakSet](src/data-background.js#L44) as the
sole source of truth: if a framework removes the injected child, a later preset
change currently does not recreate it. Decide whether mapped parameters are live
or one-shot, and make [`stopWatching()`](src/data-background.js#L150-L171) able to
cancel queued startup. Test all three behaviors. Tracked by `gl-wc-ff9s`.

### 2. Pages may deploy an untested commit

The Pages workflow is triggered by a successful `workflow_run`, but its
[`actions/checkout`](.github/workflows/deploy-pages.yml#L26-L29) has no `ref`.
GitHub documents that `GITHUB_SHA` for `workflow_run` is the last commit on the
default branch, not necessarily the triggering run’s head. If commit A passes and
commit B reaches `main` before the deploy job checks out, the workflow can deploy B
without B having passed CI. That contradicts the safety comment at the top of the
workflow. See GitHub’s official
[`workflow_run` documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run).

**Tighten it:** preferably make CI upload the tested `dist-site` artifact and have
Pages deploy that artifact. At minimum, check out
`github.event.workflow_run.head_sha` and assert/log the revision being deployed.
Also move the workflow-wide
[`pages: write` and `id-token: write` permissions](.github/workflows/deploy-pages.yml#L13-L16)
to the deploy job; the dependency-installing build job needs only `contents: read`
and should use `persist-credentials: false`. Tracked by `gl-wc-mnyv`.

### 3. Published custom-elements metadata points outside the tarball

The first manifest entry already declares
[`src/bg-wc.js`](custom-elements.json#L7), and the same source-prefixed pattern is
used throughout the manifest, including private helpers such as
[`src/presets/_dots.js`](custom-elements.json#L208) and `_pool.js`. The package’s
[`files`](package.json#L17-L22) list publishes `dist`, the manifest, README, and
license—but not `src`. Consumers following the manifest therefore receive paths
that do not exist after installation. The Custom Elements Manifest schema defines
`module.path` as the JavaScript file that must be imported; it is not just an
origin note. See the official
[CEM schema](https://github.com/webcomponents/custom-elements-manifest/blob/main/schema.d.ts).

The wildcard `./presets/*` export also exposes underscore-prefixed helpers, and the
current pack smoke imports only one preset. `prepublishOnly` assumes a build path
rather than making clean packing deterministic.

**Tighten it:** post-process source paths to the mirrored `dist` paths, filter
private/internal modules, block private wildcard subpaths, and assert that every
manifest path and public export exists in an installed tarball. Put deterministic
artifact generation in `prepack`; make the release gate import the root, binder,
and representative/all public preset subpaths. Tracked by `gl-wc-fvam`.

### 4. Development masks missing production assets

The site uses `<icon-wc name="github">` in
[`docs/index.html`](docs/index.html#L101-L103),
[`docs/api.html`](docs/api.html#L2493-L2495), and
[`demos/index.html`](demos/index.html#L756-L758), but `github` is absent from the
[`VB_BUILD_ICONS` allowlist](vite.site.config.js#L69-L72). The Vite development
middleware serves arbitrary Vanilla Breeze icons, while the production emitter
copies only the allowlist and silently skips unavailable assets. A production build
confirmed `dist-site/vb/icons/lucide/github.svg` was absent even though the source
dependency contains it.

**Tighten it:** add or derive the required icon set, make requested-but-missing
assets fatal at build time, and run a browser smoke against served `dist-site` that
fails on local 4xx responses, page errors, registration failures, and missing
critical assets. The current verifier checks registration reachability but not
asset completeness. Tracked by `gl-wc-kkgm`.

### 5. “Stopped” rendering is not reliably static

There are three related failures in the host lifecycle:

- [`#resize()`](src/bg-wc.js#L584-L602) resets canvas width and height, which clears
  the bitmap, but it does not redraw a still frame. In a reduced-motion probe, a
  populated PNG data URL shrank from 62,630 to 4,094 bytes after a host resize while
  the fallback remained hidden.
- Attribute changes such as palette, density, intensity, quality, and text do not
  consistently repaint while paused or reduced-motion because no animation frame
  is running. CSS3D parameters likewise remain stale until playback resumes.
- [`#evalPlay()`](src/bg-wc.js#L630-L650) does not include effective speed in the
  play predicate, and [`#tick`](src/bg-wc.js#L656-L683) always schedules another
  frame. In Chromium, a CSS3D `cube-wave` with `speed="0"` stayed `running` and its
  transform changed; Canvas/WebGL presets can still redraw even when their scaled
  time appears frozen.

**Tighten it:** introduce a single invalidation path that can render exactly one
still frame. Use it after inactive resize and parameter/theme changes. Treat zero
speed as stopped for Canvas, WebGL, and CSS3D, without breaking restart. Tests
should cover paused, reduced-motion, hidden, zero-speed, resize, attribute change,
and resume transitions. Tracked by `gl-wc-6efd`.

### 6. `snapshot()` changes what it observes and bypasses the error doctrine

[`snapshot()`](src/bg-wc.js#L214-L224) invokes the preset’s `frame()` before reading
pixels. For a stateful renderer, taking a screenshot therefore advances the
simulation. Consecutive paused `boids` captures differed at 35,258 PNG byte
positions. Other probes found that a removed CSS3D preset can reach
`toBlob()` on a non-canvas layer and throw a `TypeError`, while a forced frame error
can be swallowed and return a stale PNG.

Silent catches around snapshot, resize, and CSS3D `setPlaying` also sit outside the
central runtime-failure behavior. A required resize may fail even though the
component later signals readiness.

**Tighten it:** make snapshots observational—read the current buffer or define a
non-mutating capture hook. Type-check the active renderer and document explicit
results for canvas, CSS3D, unloaded, disposed, superseded, and failed states. Route
snapshot, resize, and playback-controller errors through one tested failure
boundary, distinguishing initialization failure from later runtime failure.
Tracked by `gl-wc-bfsy`.

### 7. Seven stateful presets are frame-rate dependent

The preset contract says motion derives from speed-scaled `t`, but the following
presets mutate on each `frame()` invocation even when `t` does not advance:

- [`reaction-diffusion`](src/presets/reaction-diffusion.js#L194-L199)
- [`slime-mold`](src/presets/slime-mold.js#L245)
- [`spectrum`](src/presets/spectrum.js#L184-L189)
- [`boids`](src/presets/boids.js#L143-L148)
- [`mycelium`](src/presets/mycelium.js#L106-L113)
- [`radar`](src/presets/radar.js#L42-L55)
- [`oscilloscope`](src/presets/oscilloscope.js#L168-L173)

Repeated-identical-`t` probes changed thousands of pixel channels for most of these
presets. Consequences include simulation speed changing between 60 Hz and 120 Hz,
zero speed still animating, quality changing temporal speed in some simulations,
and snapshots advancing state. The existing time-rule test samples only 42 of 199
presets; visual exclusions hide most of the offenders.

**Tighten it:** use a bounded fixed-step accumulator derived from `t - lastT`, run
zero steps for nonpositive deltas, cap catch-up, and make fade/decay time-based.
Apply repeated-`t`, zero-speed, and 60-versus-120-Hz parity checks catalog-wide,
including WebGL. Tracked by `gl-wc-beh4`.

### 8. Slime-mold’s WebGL1 fallback is blank at two quality levels

[`createPingPong()`](src/renderer/webgl.js#L81-L126) advertises RGBA8 degradation
for WebGL1. Slime-mold, however, applies `REPEAT` to 192/256/384 trail textures
([setup](src/presets/slime-mold.js#L139-L140)); WebGL1 requires NPOT textures to use
`CLAMP_TO_EDGE`. Forced-WebGL1 probes produced no non-background pixels at low/192
and high/384 quality, while medium/256 rendered. The RGBA8 path also clamps the
agent angle, stored as `0..2π`, to `0..1`, corrupting headings even at medium
quality. The helper validates the float allocation but not every final fallback
allocation.

**Tighten it:** either declare this preset WebGL2-only and provide a real static
fallback, or use WebGL1-compatible dimensions/wrapping and normalize angle data
with shader encode/decode. Check final framebuffer completeness and test forced
WebGL1 at every quality. Tracked by `gl-wc-5cbv`.

### 9. The development dependency graph needs immediate maintenance

`npm audit` reported 10 development-only findings: 7 high, 1 moderate, and 2 low.
`npm audit --omit=dev` reported zero, so this is not a published runtime exposure;
it is build, CI, and local-development exposure. Notable affected chains start at
Vite 7.3.3, ESLint 10.4.0, and Vanilla Breeze 0.1.3.

The Vanilla Breeze development dependency is particularly surprising: it pulls
`codex-claude-bridge`, MCP/agent packages, server libraries, and native SQLite into
a project that uses it for browser UI/CSS. The install measured about 236 MB, with
roughly 80 MB attributable to the unrelated OpenAI/SQLite portion. The latest
Vanilla Breeze checked during this review still declared the bridge dependency, so
blindly upgrading does not remove the architectural bloat.

**Tighten it:** refresh direct and transitive versions, then adopt a documented
audit policy and automated update cadence. Correct Vanilla Breeze’s upstream
dependency metadata or consume a browser-only artifact. Keep the severity bounded
in communication—the package has zero runtime dependencies—but do not normalize a
red build toolchain. Tracked by `gl-wc-88gx`.

## P2: next hardening cycle

### 10. Dynamic DPR and contextual CSS colors are stale or incorrect

The host passes `pxScale` once when creating a preset
([`src/bg-wc.js`](src/bg-wc.js#L418-L431)). Changing `pixel-ratio` later resizes the
backing store but leaves the value captured by 43 Canvas2D presets unchanged. A
1-to-2 DPR probe doubled backing width but left the effective line width at 1
device pixel, halving stroke thickness in CSS pixels.

Color resolution has a parallel context problem. Non-`light-dark()` values are
parsed through a detached canvas and cached by raw string
([`tokens.js`](src/renderer/tokens.js#L75-L103)). A red host with
`--color-primary: currentColor` resolved to black. System colors, forced-colors,
and expressions containing `currentColor` have the same context/cache risk.

**Recommendation:** pass DPR through resize, expose it live, or rebuild safely;
longer term, centralize a CSS-pixel transform. Resolve contextual colors against
the host and cache the resulting concrete value with its context. Add DPR
1→2→1 visual parity plus `currentColor`, scheme-change, and system-color tests.
Tracked by `gl-wc-yfrp`.

### 11. Browser and production coverage do not match the support statement

The API page targets current Chromium, Firefox, and Safari
([`docs/api.html`](docs/api.html#L2438-L2442)), but Playwright defines no
browser-specific projects and CI installs Chromium only. Most behavior tests run
against the Vite development server rather than the built site. Five demos with
their own CSS or JavaScript animation—`retro-8bit`, `terminal`, `trading`, `vhs`,
and `vibe`—also omit reduced-motion handling; component-level motion controls do
not stop demo-owned effects.

**Recommendation:** add a focused Firefox/WebKit matrix for registration,
lifecycle, pause/resume, snapshot, Canvas2D, CSS3D, and representative WebGL paths
rather than tripling all 465 tests. Serve `dist-site` for production smoke tests.
Add a catalog-wide reduced-motion check for both components and demo-owned motion.
Set `failOnFlakyTests` in CI and upload reports/traces on failure. Tracked by
`gl-wc-rp9v`.

### 12. Several public API claims need a decision

- `fit` is observed and documented as `cover`, `contain`, or `stretch`, but the host
  treats it as advisory and no preset reads it; all three values produced identical
  geometry.
- `ready` is described as first-frame readiness but can settle on failure,
  supersession, removal, or disconnect.
- The snapshot table says it returns a PNG, while CSS3D and error states have
  different behavior elsewhere in the documentation/runtime.
- Public `text` behavior is not represented in `observedAttributes` or CEM.
- Plain Node imports fail at `class BgWc extends HTMLElement`; the SSR test installs
  a shim and therefore does not verify a plain server import.

**Recommendation:** implement `fit` centrally around a defined logical viewport or
deprecate it. Define status/error semantics for `ready` and `snapshot`, surface
`text` consistently, and either make imports server-safe or explicitly document
the required DOM shim/browser-only contract. Test the decisions and regenerate CEM.
Tracked by `gl-wc-ylp4`.

### 13. CI and release automation are behind the project’s maturity

At the review date, Node 20 is end-of-life according to the official
[Node.js EOL page](https://nodejs.org/en/about/eol), but `package.json`, CI, and
Pages still use it. Vite’s own supported minimum is more specific than the blanket
`node >=20` engine declaration. Actions and the visual-test container also use
mutable tags; the repository has no visible exact-commit npm publish workflow or
changelog, and release validation is spread across scripts. Existing issue
`gl-wc-je9b` already tracks the v0.5.0 release itself.

The local collaboration instructions also require `bd dolt push`, while this
checkout has no Dolt remote configured and `bd prime` describes a different
ephemeral-branch close flow. That ambiguity makes otherwise mandatory session
completion impossible to follow literally.

**Recommendation:** move automation to a maintained Node 22/24 line, decide the
public engine independently, and pin the package manager. Pin actions/container
images to immutable SHAs/digests with automated bumps. Define one release command
that runs lint, formatting, CEM drift, Node/browser tests, library/site builds,
built-site smoke, and installed-tarball checks. Use exact-commit trusted npm
publishing with provenance, or document the external publisher. Reconcile Beads
instructions with an actually configured remote. Tracked by `gl-wc-nx0q`.

## P3: measured cleanup and performance work

These are worthwhile after correctness contracts are enforced:

- Cache WebGL uniform locations after linking. Instrumented hot frames made 17
  lookups in slime-mold and 14 in low-quality spectrum; high-quality spectrum
  warm-up can make roughly 1,900.
- Share one computed-style snapshot per host/invalidation. `#readParams()` and
  token resolution currently trigger overlapping reads.
- Add production size budgets. The site build emitted roughly 798 KB of minified
  Vanilla Breeze JavaScript (about 213 KB gzip) and roughly 1 MB of shared CSS;
  most demo pages parse the latter in their own document/iframe.
- Reduce or lazy-load site-only UI dependencies and narrow source-map warning
  suppression, which currently ignores any warning containing `.css.map`.
- Make demos resilient offline. 107 of 113 individual demo pages reference Google
  Fonts, while smoke tests intentionally ignore third-party request failures.
- Broaden lint/format scope to root configs and workflows, and scope browser/Node
  globals by file pattern. Add focused coverage thresholds for registry, binder,
  lifecycle, and error boundaries before pursuing blanket graphics coverage.
- Consider TypeScript declarations for the public API, strict-CSP-compatible style
  installation, canvas pixel-area limits, and shared document/media/battery
  observers.

The measurable renderer/site work is grouped in `gl-wc-sbyi`; test and workflow
items belong with `gl-wc-rp9v` and `gl-wc-nx0q`.

## What is already strong

- The published library has zero runtime dependencies, an explicit `files` and
  `exports` surface, source maps, preserve-modules output, and an installed-tarball
  smoke test.
- CI already covers lint, formatting, deterministic CEM drift, Node tests, library
  and site builds, browser behavior, package installation, and a reproducible
  visual-baseline container.
- The main browser suite is unusually broad for a visual component: 465 behavior
  tests plus 192 visual baselines, with no skipped/focused tests or test TODOs found.
- Runtime disposal is thoughtful: observers and animation frames are cleaned up,
  WebGL contexts are explicitly released, context concurrency is managed, and
  reduced-motion, visibility, battery, and quality controls are first-class ideas.
- The recent shared CSS3D pause rule and `seededPool` extraction reduce duplicated
  renderer/preset state without changing public behavior.
- Token caching is bounded, preset seeding is generally deterministic, and the
  fallback/error direction is sound even though a few call paths still escape it.

## Suggested sequence

1. **Release stop:** fix `gl-wc-ff9s`, `gl-wc-mnyv`, `gl-wc-fvam`, and
   `gl-wc-kkgm`; add regression tests before deploying again.
2. **Runtime invariants:** fix `gl-wc-6efd`, `gl-wc-bfsy`, `gl-wc-beh4`, and
   `gl-wc-5cbv`. These changes should land before tuning individual presets.
3. **Build-chain hygiene:** resolve `gl-wc-88gx`, then complete the existing
   `gl-wc-je9b` release gate.
4. **Compatibility/API:** address `gl-wc-yfrp`, `gl-wc-rp9v`, `gl-wc-ylp4`, and
   `gl-wc-nx0q`.
5. **Optimize from measurements:** take on `gl-wc-sbyi` only after the behavioral
   invariants are protected.

## Validation performed and review limits

The review used static inspection, production builds, package inspection, targeted
Chromium probes, and the repository’s normal gates. Results on current `main` or
the review branch rebased to it:

- `npm run lint` — passed.
- `npm run format:check` and `npx prettier --check CODEX-REVIEW.md` — passed.
- `npm run test:node` — 33/33 passed on current `main`.
- `npm test` — 465/465 Playwright behavior tests passed on current `main` in about
  2.1 minutes.
- `npm run cem:check` — passed, meaning the checked-in manifest is reproducible;
  it does **not** mean its published paths are valid.
- `npm run build:site && npm run verify:site` — passed, with a large-bundle warning.
- Installed-tarball smoke — passed using a temporary npm cache; the default cache
  contained unrelated root-owned entries.
- `npm audit --omit=dev` — zero findings; full `npm audit` — 10 development-only
  findings (7 high, 1 moderate, 2 low) as of the review date.

The authoritative visual suite was not rerun because it is pinned to the project’s
Linux container; the existing 192 baselines were inspected. Targeted dynamic probes
used Chromium. I did not inspect private npm publishing configuration or live
GitHub Pages settings, so workflow recommendations are based on repository-visible
configuration and GitHub’s documented event semantics.
