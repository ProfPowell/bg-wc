# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->


## Build & Test

```bash
npm install
npm run dev          # vite dev server for the product site/gallery (docs/)
npm run build        # library build → dist/ (preserveModules; one chunk per preset)
npm run build:site   # product site + demos → dist-site/ (deployed to GitHub Pages)
npm test             # Playwright browser suite (test/*.spec.js, main project)
npm run test:visual  # per-preset pixel baselines (regenerate in the CI container)
npm run test:node    # node:test units (test/*.mjs: SSR import, battery, registry)
npm run test:pack    # build + npm-pack smoke (exports map / files resolution)
npm run lint         # eslint src/ test/
npm run format:check # prettier --check
npm run analyze      # regenerate custom-elements.json (cem)
npm run cem:check    # cem analyze + fail if custom-elements.json drifted
```

CI (`.github/workflows/ci.yml`) runs lint, format:check, cem:check, the node
units, both builds, pack-smoke, and the Playwright suite on Node 20 + 22, plus
the visual project in the pinned Playwright container. `cem:check` only
works because the manifest modules are sorted (see
`custom-elements-manifest.config.mjs`) so output is identical across OSes.

## Architecture Overview

- **`src/bg-wc.js`** — the `<bg-wc>` custom element (the legacy `<gl-wc>` alias
  is removed). Owns the lifecycle: canvas/context creation per renderer kind, the rAF
  loop (`#tick`), attribute/param reading (`#readParams`), theme token resolution,
  visibility/reduced-motion/battery gating, and fallback handling.
- **`src/presets/index.js`** — the preset **registry** (`name → { renderer,
  group, loader }`) plus `listPresets`/`listGroups`. The file header documents the
  **preset contract** (`create(ctx)` → `{ resize, frame, staticFrame, dispose }`,
  the params catalog, and the time-scaling rule). Each preset is one file in
  `src/presets/` lazy-loaded via dynamic `import()`.
- **`src/renderer/`** — thin context wrappers: `webgl.js` (program/quad helpers),
  `canvas2d.js`, `css3d.js`, and `tokens.js` (CSS var → RGBA tuple resolver +
  `rgbCss`/`rgbaCss` helpers + the LRU color cache).
- **`src/util/`** — `observe.js` (visibility / reduced-motion / tab-visibility),
  `pause.js` (battery power-save + `mulberry32` PRNG).
- **`docs/`** — the product site: `gallery.js` drives the preset gallery,
  `site.css` styles it, `api.html` is the API reference.

**First-class constraint — the WebGL context cap.** Browsers allow only ~16 live
WebGL contexts per page. Presets are grouped (`group` in the registry) and the
gallery lazy-mounts cards by viewport visibility with a hard live-WebGL budget
(`MAX_WEBGL` in `docs/gallery.js`) so a page never overflows the cap and drops
contexts. Any UI that shows many presets at once must respect this.

## Conventions & Patterns

- **Adding a preset:** one `REGISTRY` entry in `src/presets/index.js` + one
  `src/presets/<name>.js` implementing the contract in that file's header.
- **Colors come from the theme** via `getColors()` — never hardcode a palette.
  Read it every frame so runtime theme changes apply.
- **`t` is pre-scaled by `speed`** before it reaches `frame()`; never multiply
  motion by `params.speed` again.
- **Layout is seeded** with `mulberry32(params.seed)` for deterministic,
  reproducible output.
- Run `cem:check` after changing any `src/` exports — the manifest is committed
  and gated in CI.
