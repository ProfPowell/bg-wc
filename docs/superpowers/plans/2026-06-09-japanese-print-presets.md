# Japanese + Print-art Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add seven `<bg-wc>` presets — `sumi-e`, `kintsugi`, `ukiyo-e`, `sakura` (new `japanese` group, `seigaiha` moved in) and `risograph`, `plotter`, `linocut` (new `print` group) — each with a showcase demo page.

**Architecture:** Five canvas2d presets follow the established shape (see `src/presets/scandi.js`, `src/presets/kintsugi` pattern below): theme palette via `getColors()` every frame, layout cached by `seed|density|size`, `mulberry32` determinism, `clearAndFill` for bg, `staticFrame` for reduced motion. Two WebGL presets (`sumi-e`, `risograph`) follow `src/presets/grain.js`: fullscreen-quad fragment shader, colors passed as uniforms each frame, `dispose()` frees program + buffer. Demos follow `demos/dotwork.html`.

**Tech Stack:** Vanilla JS ES modules, Canvas2D, WebGL (GLSL ES 1.00), Playwright, node:test, custom-elements-manifest.

**Spec:** `docs/superpowers/specs/2026-06-09-japanese-print-presets-design.md`

**Parallel execution note:** Task 1 lands all shared-file edits (registry, group labels, test lists, bd issues). Tasks 2–8 are then file-disjoint (each creates only `src/presets/<name>.js` + `demos/<name>.html`) and may be dispatched as parallel subagents that DO NOT run git or Playwright (the orchestrator verifies and commits after each lands — Playwright runs share one dev-server port and must not run concurrently). Task 9 integrates.

---

## File Structure

- **Modify** `src/presets/index.js` — new `japanese` + `print` groups, move `seigaiha`, 7 new entries (Task 1).
- **Modify** `test/new-presets.spec.js` — 7 names in `PRESETS` (Task 1).
- **Create** `test/groups-unit.mjs` — node units for the new groups (Task 1).
- **Create** `src/presets/sumi-e.js`, `kintsugi.js`, `ukiyo-e.js`, `sakura.js`, `risograph.js`, `plotter.js`, `linocut.js` (Tasks 2–8, one each).
- **Create** `demos/sumi-e.html`, `kintsugi.html`, `ukiyo-e.html`, `sakura.html`, `risograph.html`, `plotter.html`, `linocut.html` (Tasks 2–8, one each).
- **Modify** `demos/index.html`, `docs/api.html`, `README.md`; regenerate `custom-elements.json` (Task 9).

---

## Task 1: Setup — branch, beads, registry groups, test lists

**Files:**
- Modify: `src/presets/index.js`
- Modify: `test/new-presets.spec.js`
- Create: `test/groups-unit.mjs`

- [ ] **Step 1: Branch + beads epic/issues** (repo uses `bd`, NOT TodoWrite)

```bash
git checkout -b feat/japanese-print-presets
bd create --title="Japanese + print-art presets (7) + demos" --type=epic --priority=2 \
  --description="Per docs/superpowers/specs/2026-06-09-japanese-print-presets-design.md: sumi-e, kintsugi, ukiyo-e, sakura (japanese group), risograph, plotter, linocut (print group), showcase demos, docs/manifest."
# note the returned id as $EPIC, then one task per preset + one for integration:
bd create --title="sumi-e preset + demo" --type=task --priority=2 --description="WebGL ink-wash blooms per spec"
bd create --title="kintsugi preset + demo" --type=task --priority=2 --description="Gold crack veins per spec"
bd create --title="ukiyo-e preset + demo" --type=task --priority=2 --description="Woodblock waves per spec"
bd create --title="sakura preset + demo" --type=task --priority=2 --description="Drifting petals per spec"
bd create --title="risograph preset + demo" --type=task --priority=2 --description="Two-ink overprint per spec"
bd create --title="plotter preset + demo" --type=task --priority=2 --description="Self-drawing pen plots per spec"
bd create --title="linocut preset + demo" --type=task --priority=2 --description="Carved-block print per spec"
bd create --title="Japanese/print round: index cards, docs, manifest, gates" --type=task --priority=2 \
  --description="demos/index.html cards, api.html rows, README, npm run analyze, full quality gates, merge+push"
```

- [ ] **Step 2: Write the failing group unit test**

Create `test/groups-unit.mjs`:

```js
// Units for the japanese/print registry groups added in the 2026-06-09 round.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listGroups, listPresets } from '../src/presets/index.js';

test('japanese group contains the five japanese presets', () => {
  const g = listGroups().find((x) => x.id === 'japanese');
  assert.ok(g, 'japanese group exists');
  assert.deepEqual(
    g.presets.map((p) => p.name).sort(),
    ['kintsugi', 'sakura', 'seigaiha', 'sumi-e', 'ukiyo-e']
  );
});

test('print group contains the three print presets', () => {
  const g = listGroups().find((x) => x.id === 'print');
  assert.ok(g, 'print group exists');
  assert.deepEqual(g.presets.map((p) => p.name).sort(), ['linocut', 'plotter', 'risograph']);
});

test('seigaiha moved out of geometric', () => {
  const p = listPresets().find((x) => x.name === 'seigaiha');
  assert.equal(p.group, 'japanese');
});
```

Run: `node --test test/groups-unit.mjs` — Expected: FAIL (no japanese group yet).

- [ ] **Step 3: Edit the registry**

In `src/presets/index.js`:

a) **Delete** the `seigaiha` line from the "Structured / geometric shapes" block.

b) After the `tapestry` entry (end of the "Ornamental geometry" block), **add**:

```js
  // Japanese — ink, pattern, season
  seigaiha: { renderer: 'canvas2d', group: 'japanese', loader: () => import('./seigaiha.js') },
  'sumi-e': { renderer: 'webgl', group: 'japanese', loader: () => import('./sumi-e.js') },
  kintsugi: { renderer: 'canvas2d', group: 'japanese', loader: () => import('./kintsugi.js') },
  'ukiyo-e': { renderer: 'canvas2d', group: 'japanese', loader: () => import('./ukiyo-e.js') },
  sakura: { renderer: 'canvas2d', group: 'japanese', loader: () => import('./sakura.js') },

  // Print art — riso overprint, pen plots, relief cuts
  risograph: { renderer: 'webgl', group: 'print', loader: () => import('./risograph.js') },
  plotter: { renderer: 'canvas2d', group: 'print', loader: () => import('./plotter.js') },
  linocut: { renderer: 'canvas2d', group: 'print', loader: () => import('./linocut.js') },
```

c) In `GROUP_LABELS`, after `ornamental: 'Ornamental',` **add**:

```js
  japanese: 'Japanese',
  print: 'Print art',
```

- [ ] **Step 4: Add the seven names to the Playwright preset list**

In `test/new-presets.spec.js`, extend the `PRESETS` array:

```js
  'sumi-e',
  'kintsugi',
  'ukiyo-e',
  'sakura',
  'risograph',
  'plotter',
  'linocut',
```

(These tests are RED until Tasks 2–8 land — intended.)

- [ ] **Step 5: Verify the unit test passes, commit**

Run: `node --test test/groups-unit.mjs` — Expected: PASS (3 tests).

```bash
npm run lint -- src/presets/index.js
git add src/presets/index.js test/new-presets.spec.js test/groups-unit.mjs
git commit -m "feat(presets): japanese + print registry groups (entries red until presets land)"
```

---

## Task 2: `sumi-e` — ink-wash blooms (WebGL)

**Files:**
- Create: `src/presets/sumi-e.js`
- Create: `demos/sumi-e.html`

- [ ] **Step 1: Confirm the test is red**

Run: `npx playwright test test/new-presets.spec.js -g "sumi-e"` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement `src/presets/sumi-e.js`**

```js
// sumi-e — ink-wash blooms diffusing into paper. Up to five seeded blooms on
// staggered grow/hold/fade cycles; ink density from domain-warped value-noise
// fbm, soft-thresholded so edges bleed and granulate (bokashi). Paper from
// theme bg, ink from fg with a whisper of primary in the lighter washes.
// Japanese group.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const LIFE = 22.0; // seconds per bloom life cycle

const FS = `
precision highp float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_blooms;
uniform float u_oct;
uniform float u_seed;
uniform vec2  u_res;
uniform vec4  u_bg;
uniform vec3  u_ink;
uniform vec3  u_tint;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) {
    if (float(i) >= u_oct) break;
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s;
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 uv = vec2(v_uv.x * aspect, v_uv.y);

  // Paper tooth: faint multiplicative speckle on the bg tone.
  float tooth = vnoise(uv * 160.0);
  vec3 paper = u_bg.rgb * (0.97 + 0.03 * tooth);

  float ink = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    if (fi >= u_blooms) break;
    vec2 c = vec2(hash(vec2(fi, u_seed)) * aspect, hash(vec2(u_seed, fi + 7.0)));
    float lt = fract(u_time / ${LIFE.toFixed(1)} + fi * 0.37); // local life 0..1
    float grow = smoothstep(0.0, 0.45, lt);
    float fade = 1.0 - smoothstep(0.72, 1.0, lt);
    float R = mix(0.05, 0.38, grow) * (0.6 + 0.8 * hash(vec2(fi * 3.1, u_seed)));
    vec2 q = uv - c;
    float wob = fbm(q * 3.0 + fi * 9.0 + u_time * 0.05);
    float d = length(q) + (wob - 0.5) * 0.22; // domain-warped edge → bleed
    float body = smoothstep(R, R - 0.18, d);
    float rim = smoothstep(R + 0.012, R - 0.02, d) * (1.0 - smoothstep(R - 0.05, R - 0.12, d));
    float gran = fbm(q * 14.0 + fi * 4.0); // granulation inside the wash
    ink += fade * (body * (0.45 + 0.5 * gran) + rim * 0.55);
  }
  ink = clamp(ink * mix(0.6, 1.05, u_intensity), 0.0, 1.0);

  // Lighter washes pick up a whisper of the primary tint; deep ink stays ink.
  vec3 inkCol = mix(u_ink, u_tint, 0.18 * (1.0 - smoothstep(0.5, 0.9, ink)));
  vec3 col = mix(paper, inkCol, ink);
  float a = max(u_bg.a, ink);
  gl_FragColor = vec4(col * a, a); // premultiplied
}
`;

const OCT = { low: 3, med: 4, high: 5 };

export function create({ gl, getColors }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const u = {};
  for (const n of ['time', 'intensity', 'blooms', 'oct', 'seed', 'res', 'bg', 'ink', 'tint']) {
    u[n] = gl.getUniformLocation(program, 'u_' + n);
  }

  let w = 1,
    h = 1;

  function draw(t, params) {
    const c = getColors();
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.useProgram(program);
    bindQuad(gl, buf, aPos);
    gl.uniform1f(u.time, t);
    gl.uniform1f(u.intensity, params.intensity);
    gl.uniform1f(u.blooms, 2 + Math.round(params.density * 3)); // 2..5
    gl.uniform1f(u.oct, OCT[params.quality] || OCT.med);
    gl.uniform1f(u.seed, (((params.seed | 0) % 997) + 997) % 997 / 31);
    gl.uniform2f(u.res, w, h);
    gl.uniform4f(u.bg, c.bg[0], c.bg[1], c.bg[2], c.bg[3]);
    gl.uniform3f(u.ink, c.fg[0], c.fg[1], c.fg[2]);
    gl.uniform3f(u.tint, c.primary[0], c.primary[1], c.primary[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame(t, params) {
      draw(t, params);
    },
    staticFrame(params) {
      draw(LIFE * 0.5, params); // mid-life: one mature bloom
    },
    dispose() {
      try {
        gl.deleteProgram(program);
        gl.deleteBuffer(buf);
      } catch {}
    },
  };
}
```

- [ ] **Step 3: Create `demos/sumi-e.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sumi-e &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-background: #efe9dc;   /* washi */
      --color-foreground: #221d18;   /* sumi ink */
      --color-primary: #8a1f17;      /* vermilion seal */
      --color-accent: #7d6f5a;       /* dried reed */
      --color-info: #3d5a66;         /* indigo grey */
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--color-background); color: var(--color-foreground); overflow: hidden; }
    body { font-family: 'Shippori Mincho', Georgia, serif; min-height: 100vh; }
    .stage { position: relative; width: 100vw; height: 100vh; }
    bg-wc.bg { position: absolute; inset: 0; }
    .vignette { position: absolute; inset: 0; z-index: 2; pointer-events: none;
      background: radial-gradient(ellipse 66% 62% at 50% 50%, transparent 30%, rgba(239,233,220,0.85) 100%); }

    .nav { position: absolute; top: 24px; left: 32px; z-index: 12; font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.2em; }
    .nav a { color: var(--color-foreground); text-decoration: none; opacity: 0.7; }
    .nav a:hover { opacity: 1; }

    .content { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); z-index: 6; text-align: center; padding: 0 clamp(20px, 4vw, 80px); }
    .eyebrow { font-family: 'Space Mono', monospace; font-size: 13px; letter-spacing: 0.24em; color: var(--color-primary); opacity: 0.92; margin-bottom: 18px; text-transform: lowercase; }
    h1 { font-weight: 500; font-size: clamp(64px, 13vw, 220px); letter-spacing: 0.08em; line-height: 0.95; margin: 0; text-transform: uppercase; color: var(--color-foreground);
      filter: drop-shadow(0 4px 26px rgba(34,29,24,0.25)); }
    .lede { max-width: 560px; margin: 22px auto 0; font-size: clamp(16px, 1.3vw, 20px); line-height: 1.55; color: rgba(34,29,24,0.8); }
    .lede code { font-family: ui-monospace, monospace; font-size: 0.85em; background: rgba(34,29,24,0.08); padding: 2px 7px; border-radius: 4px; }

    .telemetry { position: absolute; bottom: 28px; left: 0; right: 0; z-index: 6; display: flex; justify-content: space-between; padding: 0 clamp(28px, 6vw, 80px);
      font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.18em; color: var(--color-primary); opacity: 0.82; flex-wrap: wrap; gap: 12px; }
    .telemetry span { color: var(--color-foreground); opacity: 0.5; padding-right: 6px; }
  </style>
</head>
<body>
  <nav class="nav"><a href="./" target="_top">&larr; Demos</a></nav>

  <main class="stage">
    <bg-wc class="bg" preset="sumi-e" intensity="0.7" density="0.6" speed="0.5"></bg-wc>
    <div class="vignette"></div>

    <div class="content">
      <div class="eyebrow">// ink-wash blooms &middot; webgl</div>
      <h1>Sumi-e</h1>
      <p class="lede">
        Ink blooming into washi &mdash; washes that grow, granulate, and bleed at the
        edges before fading back into the paper. <code>preset="sumi-e"</code> &mdash;
        bokashi gradients from your theme's ink and paper tones.
      </p>
    </div>

    <div class="telemetry">
      <div><span>preset</span>sumi-e</div>
      <div><span>render</span>webgl</div>
      <div><span>cycle</span>22s</div>
      <div><span>palette</span>theme</div>
    </div>
  </main>

  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 4: Verify, lint, commit** *(orchestrator step if run as parallel agents)*

Run: `npx playwright test test/new-presets.spec.js -g "sumi-e"` — Expected: PASS.

```bash
npm run lint -- src/presets/sumi-e.js
git add src/presets/sumi-e.js demos/sumi-e.html
git commit -m "feat(presets): sumi-e — ink-wash blooms (webgl) + demo"
```

---

## Task 3: `kintsugi` — gold crack veins (canvas2d)

**Files:**
- Create: `src/presets/kintsugi.js`
- Create: `demos/kintsugi.html`

- [ ] **Step 1: Confirm the test is red**

Run: `npx playwright test test/new-presets.spec.js -g kintsugi` — Expected: FAIL.

- [ ] **Step 2: Implement `src/presets/kintsugi.js`**

```js
// kintsugi — gold-repaired cracks across a dark stone slab. Seeded branching
// veins grow in, hold while a highlight pulse travels each vein, then fade and
// a fresh network reseeds. Vein polylines cached per seed|cycle|density|size;
// frame() only animates reveal length and shimmer. Japanese group.

import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss } from '../renderer/tokens.js';

const CYCLE = 26; // s: grow → hold → fade → reseed
const SEGS = { low: 36, med: 64, high: 110 };

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function smoothstep(e0, e1, x) {
  const u = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return u * u * (3 - 2 * u);
}

// Momentum random walk with recursive branching; pushes polylines into `out`.
function growVein(rng, x, y, ang, len, step, depth, out) {
  const pts = [[x, y]];
  for (let i = 0; i < len; i++) {
    ang += (rng() - 0.5) * 0.55;
    x += Math.cos(ang) * step;
    y += Math.sin(ang) * step;
    pts.push([x, y]);
    if (depth > 0 && rng() < 0.045) {
      const turn = (rng() < 0.5 ? 1 : -1) * (0.5 + rng() * 0.6);
      growVein(rng, x, y, ang + turn, Math.round(len * 0.45), step * 0.85, depth - 1, out);
    }
  }
  out.push(pts);
}

export function create({ c2d, getColors }) {
  let w = 0,
    h = 0;
  let cache = null; // { key, veins }
  let speck = null; // { key, canvas } faint stone speckle

  function build(params, cycleIdx) {
    const key = `${params.seed | 0}|${cycleIdx}|${params.density}|${params.quality}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32((((params.seed | 0) || 1) ^ (cycleIdx * 0x9e3779b9)) >>> 0);
    const segs = SEGS[params.quality] || SEGS.med;
    const count = Math.max(2, Math.round(2 + params.density * 7));
    const s = Math.min(w, h);
    const veins = [];
    for (let i = 0; i < count; i++) {
      const side = (rng() * 4) | 0;
      const u = rng();
      const x = side === 0 ? u * w : side === 1 ? w : side === 2 ? u * w : 0;
      const y = side === 0 ? 0 : side === 1 ? u * h : side === 2 ? h : u * h;
      const ang = Math.atan2(h / 2 - y, w / 2 - x) + (rng() - 0.5) * 0.8;
      growVein(rng, x, y, ang, segs, s * 0.016, 2, veins);
    }
    cache = { key, veins };
    return cache;
  }

  function speckle(seed) {
    const key = `${seed}|${w}x${h}`;
    if (speck && speck.key === key) return speck.canvas;
    const off = (speck && speck.canvas) || document.createElement('canvas');
    off.width = w;
    off.height = h;
    const g = off.getContext('2d');
    g.clearRect(0, 0, w, h);
    const rng = mulberry32((seed || 1) ^ 0x5f3759df);
    g.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 1200; i++) {
      g.fillRect(rng() * w, rng() * h, 1.5, 1.5);
    }
    speck = { key, canvas: off };
    return off;
  }

  function frame(t, params) {
    const c = getColors();
    const cycleIdx = Math.floor(t / CYCLE);
    const p = (t - cycleIdx * CYCLE) / CYCLE; // 0..1 in cycle
    const { veins } = build(params, cycleIdx);
    const s = Math.min(w, h);

    // Slab: theme bg pulled toward black so the gold reads.
    const slab = mix([c.bg[0], c.bg[1], c.bg[2]], [0, 0, 0], 0.55);
    clearAndFill(c2d, w, h, c.bg[3] > 0.01 ? [slab[0], slab[1], slab[2], 1] : c.bg);
    if (c.bg[3] > 0.01) c2d.drawImage(speckle(params.seed | 0), 0, 0);

    const gold = c.warning || c.accent || c.primary;
    const goldHi = mix([gold[0], gold[1], gold[2]], [1, 1, 1], 0.5);
    const reveal = smoothstep(0, 0.5, p);
    const fadeA = 1 - smoothstep(0.85, 1, p);
    const n = veins.length;

    c2d.lineJoin = 'round';
    c2d.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const pts = veins[i];
      const vr = Math.min(1, Math.max(0, reveal * 1.3 - (i / Math.max(1, n)) * 0.3));
      const upto = Math.max(2, Math.round(pts.length * vr));
      if (upto < 2) continue;

      // glow → mid → core passes
      const passes = [
        [s * 0.012, rgbaCss(gold, (0.1 + 0.25 * params.intensity) * fadeA)],
        [s * 0.004, rgbaCss(gold, 0.7 * fadeA)],
        [s * 0.0018, rgbaCss(goldHi, 0.9 * fadeA)],
      ];
      for (const [lw, style] of passes) {
        c2d.beginPath();
        c2d.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < upto; k++) c2d.lineTo(pts[k][0], pts[k][1]);
        c2d.lineWidth = lw;
        c2d.strokeStyle = style;
        c2d.stroke();
      }

      // Traveling highlight pulse along the revealed vein.
      const pos = (t * 0.08 + i * 0.37) % 1;
      const k = Math.min(upto - 1, Math.round(pos * (upto - 1)));
      const [px, py] = pts[k];
      c2d.beginPath();
      c2d.arc(px, py, s * 0.006, 0, Math.PI * 2);
      c2d.fillStyle = rgbaCss(goldHi, 0.8 * fadeA * params.intensity);
      c2d.fill();
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
      speck = null;
    },
    frame,
    staticFrame(params) {
      frame(CYCLE * 0.6, params); // mid-hold: fully grown, shimmering
    },
    dispose() {
      cache = null;
      speck = null;
    },
  };
}
```

- [ ] **Step 3: Create `demos/kintsugi.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kintsugi &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-background: #14110e;   /* lacquer */
      --color-foreground: #efe6d2;
      --color-primary: #2e2722;      /* warm stone */
      --color-accent: #d4a437;       /* gold */
      --color-warning: #e7c468;      /* bright gold */
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--color-background); color: var(--color-foreground); overflow: hidden; }
    body { font-family: 'Cormorant Garamond', Georgia, serif; min-height: 100vh; }
    .stage { position: relative; width: 100vw; height: 100vh; }
    bg-wc.bg { position: absolute; inset: 0; }
    .vignette { position: absolute; inset: 0; z-index: 2; pointer-events: none;
      background: radial-gradient(ellipse 64% 60% at 50% 50%, transparent 30%, rgba(20,17,14,0.9) 100%); }

    .nav { position: absolute; top: 24px; left: 32px; z-index: 12; font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.2em; }
    .nav a { color: var(--color-foreground); text-decoration: none; opacity: 0.7; }
    .nav a:hover { opacity: 1; }

    .content { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); z-index: 6; text-align: center; padding: 0 clamp(20px, 4vw, 80px); }
    .eyebrow { font-family: 'Space Mono', monospace; font-size: 13px; letter-spacing: 0.24em; color: var(--color-accent); opacity: 0.92; margin-bottom: 18px; text-transform: lowercase; }
    h1 { font-weight: 500; font-size: clamp(64px, 13vw, 220px); letter-spacing: 0.06em; line-height: 0.95; margin: 0; text-transform: uppercase;
      background: linear-gradient(180deg, #fff 0%, var(--color-warning) 55%, var(--color-accent) 115%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 6px 30px rgba(212,164,55,0.35)); }
    .lede { max-width: 560px; margin: 22px auto 0; font-size: clamp(16px, 1.3vw, 20px); line-height: 1.55; color: rgba(239,230,210,0.82); }
    .lede code { font-family: ui-monospace, monospace; font-size: 0.85em; background: rgba(255,255,255,0.08); padding: 2px 7px; border-radius: 4px; }

    .telemetry { position: absolute; bottom: 28px; left: 0; right: 0; z-index: 6; display: flex; justify-content: space-between; padding: 0 clamp(28px, 6vw, 80px);
      font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.18em; color: var(--color-accent); opacity: 0.82; flex-wrap: wrap; gap: 12px; }
    .telemetry span { color: var(--color-foreground); opacity: 0.5; padding-right: 6px; }
  </style>
</head>
<body>
  <nav class="nav"><a href="./" target="_top">&larr; Demos</a></nav>

  <main class="stage">
    <bg-wc class="bg" preset="kintsugi" intensity="0.8" density="0.55" speed="0.6"></bg-wc>
    <div class="vignette"></div>

    <div class="content">
      <div class="eyebrow">// golden repair &middot; canvas2d</div>
      <h1>Kintsugi</h1>
      <p class="lede">
        Cracks grow across the dark slab and fill with gold &mdash; the repair made
        the ornament. <code>preset="kintsugi"</code> &mdash; veins branch, shimmer,
        and reseed in a slow cycle.
      </p>
    </div>

    <div class="telemetry">
      <div><span>preset</span>kintsugi</div>
      <div><span>render</span>canvas2d</div>
      <div><span>cycle</span>26s</div>
      <div><span>palette</span>theme</div>
    </div>
  </main>

  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 4: Verify, lint, commit** *(orchestrator step if run as parallel agents)*

Run: `npx playwright test test/new-presets.spec.js -g kintsugi` — Expected: PASS.

```bash
npm run lint -- src/presets/kintsugi.js
git add src/presets/kintsugi.js demos/kintsugi.html
git commit -m "feat(presets): kintsugi — gold crack veins (canvas2d) + demo"
```

---

## Task 4: `ukiyo-e` — woodblock waves (canvas2d)

**Files:**
- Create: `src/presets/ukiyo-e.js`
- Create: `demos/ukiyo-e.html`

- [ ] **Step 1: Confirm the test is red**

Run: `npx playwright test test/new-presets.spec.js -g "ukiyo-e"` — Expected: FAIL.

- [ ] **Step 2: Implement `src/presets/ukiyo-e.js`**

```js
// ukiyo-e — woodblock-print waves. Flat-color wave layers with outlined crests,
// scalloped foam edges, and curling foam "claws", drifting in parallax beneath
// a bokashi sky band. Deliberately print-like: flat fills + outlines, no
// gradients inside the water. Japanese group.

import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';

const STEPS = 64; // samples across the width per wave path

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0,
    h = 0;
  let cache = null; // { key, layers }

  function build(params) {
    const key = `${params.seed | 0}|${params.density}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32((params.seed | 0) || 1);
    const n = 3 + (params.density > 0.6 ? 1 : 0);
    const layers = [];
    for (let li = 0; li < n; li++) {
      const harm = [];
      for (let k = 0; k < 3; k++) {
        harm.push({
          amp: (0.25 + rng() * 0.75) / (k + 1),
          freq: (1.5 + rng() * 2) * (k + 1),
          ph: rng() * Math.PI * 2,
        });
      }
      layers.push({
        harm,
        base: 0.42 + ((li + 0.5) / n) * 0.52, // fraction of h, far → near
        drift: 0.01 + 0.022 * (li / n), // u-units/s; nearer drifts faster
        claws: 1 + ((rng() * 2) | 0),
        clawU: [rng(), rng(), rng()],
      });
    }
    cache = { key, layers, n };
    return cache;
  }

  function waveY(L, u) {
    let y = 0;
    for (const hm of L.harm) y += Math.sin(u * Math.PI * 2 * hm.freq + hm.ph) * hm.amp;
    return y / 2;
  }

  // One curling foam claw: nested arcs + spray dots, rotated into the wave.
  function claw(x, y, R, foamCss, outlineCss, s) {
    c2d.save();
    c2d.translate(x, y);
    c2d.rotate(-0.35);
    for (let j = 0; j < 5; j++) {
      const r = R * (1 - j * 0.17);
      c2d.beginPath();
      c2d.arc(0, 0, r, Math.PI * 1.05, Math.PI * 1.85);
      c2d.lineWidth = Math.max(1, s * 0.004 * (1 - j * 0.12));
      c2d.strokeStyle = j % 2 ? outlineCss : foamCss;
      c2d.stroke();
    }
    c2d.fillStyle = foamCss;
    for (let j = 0; j < 6; j++) {
      const a = Math.PI * (1.0 - j * 0.09);
      c2d.beginPath();
      c2d.arc(Math.cos(a) * R * 1.18, Math.sin(a) * R * 1.18, s * 0.004 * (1 - j * 0.1), 0, Math.PI * 2);
      c2d.fill();
    }
    c2d.restore();
  }

  function frame(t, params) {
    const c = getColors();
    const { layers, n } = build(params);
    const s = Math.min(w, h);
    clearAndFill(c2d, w, h, c.bg);

    // Bokashi sky band above the horizon.
    if (c.bg[3] > 0.01) {
      const sky = c2d.createLinearGradient(0, 0, 0, h * 0.55);
      sky.addColorStop(0, rgbaCss([c.bg[0], c.bg[1], c.bg[2]], 0));
      const horizon = mix([c.bg[0], c.bg[1], c.bg[2]], [c.primary[0], c.primary[1], c.primary[2]], 0.18);
      sky.addColorStop(1, rgbaCss(horizon, 0.9));
      c2d.fillStyle = sky;
      c2d.fillRect(0, 0, w, h * 0.55);
    }

    const foam = rgbCss([c.fg[0], c.fg[1], c.fg[2]]);
    for (let li = 0; li < n; li++) {
      const L = layers[li];
      const depth = li / Math.max(1, n - 1); // 0 far .. 1 near
      const wash = (1 - depth) * (0.6 - 0.35 * params.intensity);
      const water = mix(
        mix([c.primary[0], c.primary[1], c.primary[2]], [c.info[0], c.info[1], c.info[2]], depth),
        [c.bg[0], c.bg[1], c.bg[2]],
        Math.max(0, wash)
      );
      const waterCss = rgbCss(water);
      const outlineCss = rgbCss(mix(water, [0, 0, 0], 0.25 + 0.2 * params.intensity));
      const amp = s * 0.07 * (0.6 + depth * 0.7);
      const baseY = h * L.base + Math.sin(t * 0.25 + li * 1.7) * h * 0.012; // swell
      const scroll = t * L.drift;

      // Flat fill down to the bottom edge.
      c2d.beginPath();
      c2d.moveTo(-4, h + 4);
      for (let k = 0; k <= STEPS; k++) {
        const u = k / STEPS;
        c2d.lineTo(u * w, baseY + waveY(L, u + scroll) * amp);
      }
      c2d.lineTo(w + 4, h + 4);
      c2d.closePath();
      c2d.fillStyle = waterCss;
      c2d.fill();

      // Outlined crest with scalloped foam dots riding the edge.
      c2d.beginPath();
      for (let k = 0; k <= STEPS; k++) {
        const u = k / STEPS;
        const y = baseY + waveY(L, u + scroll) * amp;
        if (k === 0) c2d.moveTo(0, y);
        else c2d.lineTo(u * w, y);
      }
      c2d.lineWidth = Math.max(1, s * 0.0035);
      c2d.strokeStyle = outlineCss;
      c2d.stroke();
      c2d.fillStyle = foam;
      for (let k = 0; k <= STEPS; k += 2) {
        const u = k / STEPS;
        const y = baseY + waveY(L, u + scroll) * amp;
        const r = s * 0.005 * (1 + 0.6 * Math.sin(u * 40 + li * 3));
        c2d.beginPath();
        c2d.arc(u * w, y - r * 0.4, Math.max(0.5, r), 0, Math.PI * 2);
        c2d.fill();
      }

      // Curling claws ride the crest and drift with it.
      for (let ci = 0; ci < L.claws; ci++) {
        const u = (L.clawU[ci] + scroll * 0.6) % 1;
        const x = u * w;
        const y = baseY + waveY(L, u + scroll) * amp;
        claw(x, y - s * 0.01, s * 0.045 * (0.7 + depth * 0.6), foam, outlineCss, s);
      }
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      cache = null;
    },
  };
}
```

- [ ] **Step 3: Create `demos/ukiyo-e.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ukiyo-e &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-background: #102030;   /* indigo night */
      --color-foreground: #f3ead8;   /* foam cream */
      --color-primary: #2a5f8a;      /* prussian blue */
      --color-info: #71a6c2;         /* spray blue */
      --color-accent: #c9a227;       /* gold leaf */
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--color-background); color: var(--color-foreground); overflow: hidden; }
    body { font-family: 'Shippori Mincho', Georgia, serif; min-height: 100vh; }
    .stage { position: relative; width: 100vw; height: 100vh; }
    bg-wc.bg { position: absolute; inset: 0; }
    .vignette { position: absolute; inset: 0; z-index: 2; pointer-events: none;
      background: radial-gradient(ellipse 66% 62% at 50% 42%, transparent 32%, rgba(16,32,48,0.82) 100%); }

    .nav { position: absolute; top: 24px; left: 32px; z-index: 12; font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.2em; }
    .nav a { color: var(--color-foreground); text-decoration: none; opacity: 0.7; }
    .nav a:hover { opacity: 1; }

    .content { position: absolute; left: 0; right: 0; top: 38%; transform: translateY(-50%); z-index: 6; text-align: center; padding: 0 clamp(20px, 4vw, 80px); }
    .eyebrow { font-family: 'Space Mono', monospace; font-size: 13px; letter-spacing: 0.24em; color: var(--color-info); opacity: 0.92; margin-bottom: 18px; text-transform: lowercase; }
    h1 { font-weight: 600; font-size: clamp(60px, 12vw, 200px); letter-spacing: 0.06em; line-height: 0.95; margin: 0; text-transform: uppercase;
      background: linear-gradient(180deg, #fff 0%, var(--color-info) 60%, var(--color-primary) 120%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 6px 30px rgba(42,95,138,0.45)); }
    .lede { max-width: 560px; margin: 22px auto 0; font-size: clamp(16px, 1.3vw, 20px); line-height: 1.55; color: rgba(243,234,216,0.85); }
    .lede code { font-family: ui-monospace, monospace; font-size: 0.85em; background: rgba(255,255,255,0.08); padding: 2px 7px; border-radius: 4px; }

    .telemetry { position: absolute; bottom: 28px; left: 0; right: 0; z-index: 6; display: flex; justify-content: space-between; padding: 0 clamp(28px, 6vw, 80px);
      font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.18em; color: var(--color-info); opacity: 0.82; flex-wrap: wrap; gap: 12px; }
    .telemetry span { color: var(--color-foreground); opacity: 0.5; padding-right: 6px; }
  </style>
</head>
<body>
  <nav class="nav"><a href="./" target="_top">&larr; Demos</a></nav>

  <main class="stage">
    <bg-wc class="bg" preset="ukiyo-e" intensity="0.75" density="0.6" speed="0.5"></bg-wc>
    <div class="vignette"></div>

    <div class="content">
      <div class="eyebrow">// woodblock waves &middot; canvas2d</div>
      <h1>Ukiyo-e</h1>
      <p class="lede">
        Flat-color swells with outlined crests and curling foam claws, rolling in
        parallax like a print come loose. <code>preset="ukiyo-e"</code> &mdash;
        the floating world, in your theme's blues.
      </p>
    </div>

    <div class="telemetry">
      <div><span>preset</span>ukiyo-e</div>
      <div><span>render</span>canvas2d</div>
      <div><span>layers</span>parallax</div>
      <div><span>palette</span>theme</div>
    </div>
  </main>

  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 4: Verify, lint, commit** *(orchestrator step if run as parallel agents)*

Run: `npx playwright test test/new-presets.spec.js -g "ukiyo-e"` — Expected: PASS.

```bash
npm run lint -- src/presets/ukiyo-e.js
git add src/presets/ukiyo-e.js demos/ukiyo-e.html
git commit -m "feat(presets): ukiyo-e — woodblock waves (canvas2d) + demo"
```

---

## Task 5: `sakura` — drifting petals (canvas2d)

**Files:**
- Create: `src/presets/sakura.js`
- Create: `demos/sakura.html`

- [ ] **Step 1: Confirm the test is red**

Run: `npx playwright test test/new-presets.spec.js -g sakura` — Expected: FAIL.

- [ ] **Step 2: Implement `src/presets/sakura.js`**

```js
// sakura — cherry-blossom petals on the wind. Three depth layers; each petal
// is a notched-teardrop path with per-petal flutter (rotation + sway
// oscillators) riding a global gust field that occasionally surges. Petal
// color blends theme primary toward white per layer. Japanese group.
//
// Distinct from snow/confetti: gusts, flutter physics, depth parallax.

import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss } from '../renderer/tokens.js';

const CAP = { low: 60, med: 140, high: 260 };
const LAYER_ALPHA = [0.35, 0.6, 0.92]; // far → near

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Time-varying gust strength, 0..~1, with occasional surges.
function gust(t) {
  const g = Math.sin(t * 0.13) + Math.sin(t * 0.071 + 2.0);
  return Math.max(0, g) * g * 0.25;
}

export function create({ c2d, getColors }) {
  let w = 0,
    h = 0;
  let cache = null; // { key, petals }

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${params.quality}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32((params.seed | 0) || 1);
    const cap = CAP[params.quality] || CAP.med;
    const count = Math.max(12, Math.round(cap * (0.3 + params.density)));
    const petals = [];
    for (let i = 0; i < count; i++) {
      const depth = i % 3; // 0 far, 2 near
      petals.push({
        depth,
        x0: rng(),
        y0: rng(),
        size: (0.008 + rng() * 0.009) * (0.6 + depth * 0.45),
        vy: (0.025 + rng() * 0.03) * (0.5 + depth * 0.45),
        swayF: 0.4 + rng() * 0.7,
        swayPh: rng() * Math.PI * 2,
        swayAmp: 0.01 + rng() * 0.03,
        spinF: 0.5 + rng() * 1.2,
        spinPh: rng() * Math.PI * 2,
        whiten: rng() * 0.3,
      });
    }
    cache = { key, petals };
    return cache;
  }

  // Notched cherry petal in local coords, tip at +y, size = half-length.
  function petalPath(s) {
    c2d.beginPath();
    c2d.moveTo(0, s);
    c2d.bezierCurveTo(s * 0.85, s * 0.35, s * 0.7, -s * 0.55, s * 0.18, -s * 0.8);
    c2d.quadraticCurveTo(0, -s * 0.55, -s * 0.18, -s * 0.8); // the notch
    c2d.bezierCurveTo(-s * 0.7, -s * 0.55, -s * 0.85, s * 0.35, 0, s);
    c2d.closePath();
  }

  function frame(t, params) {
    const c = getColors();
    const { petals } = build(params);
    const s = Math.min(w, h);
    clearAndFill(c2d, w, h, c.bg);

    const g = gust(t);
    const base = [c.primary[0], c.primary[1], c.primary[2]];
    for (const p of petals) {
      const depthF = 0.4 + p.depth * 0.3;
      const y = ((p.y0 + t * p.vy) % 1.15) * h * 1.15 - h * 0.075;
      const drift = t * (0.005 + g * 0.06) * depthF;
      const sway = Math.sin(t * p.swayF + p.swayPh) * p.swayAmp;
      const x = (((p.x0 + drift + sway) % 1.2) + 1.2) % 1.2;
      const rot = Math.sin(t * p.spinF + p.spinPh) * 1.2 + g * 0.8;

      // Soften toward white per layer + per petal; intensity holds saturation.
      const whiten = Math.min(1, p.whiten + (2 - p.depth) * 0.18 + (1 - params.intensity) * 0.35);
      const col = mix(base, [1, 1, 1], whiten);

      c2d.save();
      c2d.translate(x * w * 1.2 - w * 0.1, y);
      c2d.rotate(rot);
      // Flutter: petals foreshorten as they tumble.
      c2d.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(t * p.spinF * 1.7 + p.spinPh)));
      petalPath(s * p.size * (0.8 + params.intensity * 0.4));
      c2d.fillStyle = rgbaCss(col, LAYER_ALPHA[p.depth]);
      c2d.fill();
      c2d.restore();
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      cache = null;
    },
  };
}
```

- [ ] **Step 3: Create `demos/sakura.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sakura &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-background: #1c1430;   /* dusk indigo */
      --color-foreground: #f7e6ee;
      --color-primary: #e98fb1;      /* blossom */
      --color-accent: #f5c7d6;       /* pale petal */
      --color-info: #8d7bb8;         /* twilight */
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--color-background); color: var(--color-foreground); overflow: hidden; }
    body { font-family: 'Zen Maru Gothic', sans-serif; min-height: 100vh; }
    .stage { position: relative; width: 100vw; height: 100vh; }
    bg-wc.bg { position: absolute; inset: 0; }
    .vignette { position: absolute; inset: 0; z-index: 2; pointer-events: none;
      background: radial-gradient(ellipse 64% 60% at 50% 50%, transparent 30%, rgba(28,20,48,0.85) 100%); }

    .nav { position: absolute; top: 24px; left: 32px; z-index: 12; font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.2em; }
    .nav a { color: var(--color-foreground); text-decoration: none; opacity: 0.7; }
    .nav a:hover { opacity: 1; }

    .content { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); z-index: 6; text-align: center; padding: 0 clamp(20px, 4vw, 80px); }
    .eyebrow { font-family: 'Space Mono', monospace; font-size: 13px; letter-spacing: 0.24em; color: var(--color-primary); opacity: 0.92; margin-bottom: 18px; text-transform: lowercase; }
    h1 { font-weight: 500; font-size: clamp(64px, 13vw, 220px); letter-spacing: 0.08em; line-height: 0.95; margin: 0; text-transform: uppercase;
      background: linear-gradient(180deg, #fff 0%, var(--color-accent) 55%, var(--color-primary) 115%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 6px 30px rgba(233,143,177,0.4)); }
    .lede { max-width: 560px; margin: 22px auto 0; font-size: clamp(16px, 1.3vw, 20px); line-height: 1.55; color: rgba(247,230,238,0.85); }
    .lede code { font-family: ui-monospace, monospace; font-size: 0.85em; background: rgba(255,255,255,0.08); padding: 2px 7px; border-radius: 4px; }

    .telemetry { position: absolute; bottom: 28px; left: 0; right: 0; z-index: 6; display: flex; justify-content: space-between; padding: 0 clamp(28px, 6vw, 80px);
      font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.18em; color: var(--color-primary); opacity: 0.82; flex-wrap: wrap; gap: 12px; }
    .telemetry span { color: var(--color-foreground); opacity: 0.5; padding-right: 6px; }
  </style>
</head>
<body>
  <nav class="nav"><a href="./" target="_top">&larr; Demos</a></nav>

  <main class="stage">
    <bg-wc class="bg" preset="sakura" intensity="0.7" density="0.6" speed="0.7"></bg-wc>
    <div class="vignette"></div>

    <div class="content">
      <div class="eyebrow">// petals on the wind &middot; canvas2d</div>
      <h1>Sakura</h1>
      <p class="lede">
        Notched petals tumble through depth layers, fluttering on gusts that surge
        and die away. <code>preset="sakura"</code> &mdash; hanami at dusk, tinted
        from your theme.
      </p>
    </div>

    <div class="telemetry">
      <div><span>preset</span>sakura</div>
      <div><span>render</span>canvas2d</div>
      <div><span>layers</span>3-depth</div>
      <div><span>palette</span>theme</div>
    </div>
  </main>

  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 4: Verify, lint, commit** *(orchestrator step if run as parallel agents)*

Run: `npx playwright test test/new-presets.spec.js -g sakura` — Expected: PASS.

```bash
npm run lint -- src/presets/sakura.js
git add src/presets/sakura.js demos/sakura.html
git commit -m "feat(presets): sakura — drifting petals (canvas2d) + demo"
```

---

## Task 6: `risograph` — two-ink overprint (WebGL)

**Files:**
- Create: `src/presets/risograph.js`
- Create: `demos/risograph.html`

- [ ] **Step 1: Confirm the test is red**

Run: `npx playwright test test/new-presets.spec.js -g risograph` — Expected: FAIL.

- [ ] **Step 2: Implement `src/presets/risograph.js`**

```js
// risograph — two-ink overprint. Layer A: noise blobs in the primary ink.
// Layer B: warped diagonal bars in the accent ink. Multiply blending where
// they overlap makes the darker riso "third color"; both layers drift with
// slight misregistration wobble and carry heavy per-ink grain + dropouts.
// Paper from theme bg. Print group.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform float u_seed;
uniform float u_grain;
uniform vec2  u_res;
uniform vec4  u_bg;
uniform vec3  u_inkA;
uniform vec3  u_inkB;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm3(vec2 p) {
  float s = 0.5 * vnoise(p);
  p = p * 2.03 + vec2(17.1, 9.2);
  s += 0.25 * vnoise(p);
  p = p * 2.03 + vec2(5.7, 31.3);
  s += 0.125 * vnoise(p);
  return s / 0.875;
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 uv = vec2(v_uv.x * aspect, v_uv.y);
  vec2 px = v_uv * u_res;

  float sc = mix(2.2, 5.0, u_density); // shape scale
  float cov = mix(0.62, 0.46, u_intensity); // lower threshold = more ink

  // Layer A: blobs, drifting right.
  vec2 offA = vec2(u_time * 0.012 + u_seed, sin(u_time * 0.05) * 0.004 + u_seed);
  float inkA = smoothstep(cov + 0.03, cov - 0.03, fbm3(uv * sc + offA));

  // Layer B: warped diagonal bars, misregistration wobble.
  vec2 offB = vec2(-u_time * 0.009, u_time * 0.006) + u_seed * 1.7
            + vec2(0.013 * sin(u_time * 0.07), 0.011 * cos(u_time * 0.05));
  float warp = fbm3(uv * sc * 0.7 + offB) * 1.4;
  float bars = fract((uv.x + uv.y) * sc * 0.9 + warp);
  float bw = mix(0.10, 0.30, u_intensity);
  float inkB = smoothstep(bw, bw - 0.05, abs(bars - 0.5))
             * smoothstep(cov + 0.10, cov - 0.10, fbm3(uv * sc * 0.5 - offB));

  // Per-ink grain + dropouts (the riso texture).
  inkA *= mix(1.0, 0.72 + 0.28 * hash(px * 0.7 + 1.3), u_grain);
  inkB *= mix(1.0, 0.72 + 0.28 * hash(px * 0.7 + 7.7), u_grain);
  inkA *= step(0.04 * u_grain, hash(px * 0.31));
  inkB *= step(0.04 * u_grain, hash(px * 0.37 + 3.0));

  // Multiply overprint on paper.
  vec3 paper = u_bg.rgb * (0.97 + 0.03 * hash(px * 0.13));
  vec3 col = paper;
  col *= mix(vec3(1.0), u_inkA, inkA);
  col *= mix(vec3(1.0), u_inkB, inkB);
  float a = max(u_bg.a, max(inkA, inkB));
  gl_FragColor = vec4(col * a, a); // premultiplied
}
`;

const GRAIN = { low: 0.6, med: 1.0, high: 1.0 };

export function create({ gl, getColors }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const u = {};
  for (const n of ['time', 'intensity', 'density', 'seed', 'grain', 'res', 'bg', 'inkA', 'inkB']) {
    u[n] = gl.getUniformLocation(program, 'u_' + n);
  }

  let w = 1,
    h = 1;

  function draw(t, params) {
    const c = getColors();
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.useProgram(program);
    bindQuad(gl, buf, aPos);
    gl.uniform1f(u.time, t);
    gl.uniform1f(u.intensity, params.intensity);
    gl.uniform1f(u.density, params.density);
    gl.uniform1f(u.seed, (((params.seed | 0) % 997) + 997) % 997 / 31);
    gl.uniform1f(u.grain, GRAIN[params.quality] || GRAIN.med);
    gl.uniform2f(u.res, w, h);
    gl.uniform4f(u.bg, c.bg[0], c.bg[1], c.bg[2], c.bg[3]);
    gl.uniform3f(u.inkA, c.primary[0], c.primary[1], c.primary[2]);
    gl.uniform3f(u.inkB, c.accent[0], c.accent[1], c.accent[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame(t, params) {
      draw(t, params);
    },
    staticFrame(params) {
      draw(0, params);
    },
    dispose() {
      try {
        gl.deleteProgram(program);
        gl.deleteBuffer(buf);
      } catch {}
    },
  };
}
```

- [ ] **Step 3: Create `demos/risograph.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Risograph &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-background: #f4efe3;   /* cream stock */
      --color-foreground: #2a2a2a;
      --color-primary: #ff48b0;      /* fluorescent pink */
      --color-accent: #0078bf;       /* riso medium blue */
      --color-info: #6b4d9e;         /* the overprint violet */
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--color-background); color: var(--color-foreground); overflow: hidden; }
    body { font-family: 'Archivo Black', sans-serif; min-height: 100vh; }
    .stage { position: relative; width: 100vw; height: 100vh; }
    bg-wc.bg { position: absolute; inset: 0; }
    .vignette { position: absolute; inset: 0; z-index: 2; pointer-events: none;
      background: radial-gradient(ellipse 66% 62% at 50% 50%, transparent 34%, rgba(244,239,227,0.82) 100%); }

    .nav { position: absolute; top: 24px; left: 32px; z-index: 12; font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.2em; }
    .nav a { color: var(--color-foreground); text-decoration: none; opacity: 0.7; }
    .nav a:hover { opacity: 1; }

    .content { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); z-index: 6; text-align: center; padding: 0 clamp(20px, 4vw, 80px); }
    .eyebrow { font-family: 'Space Mono', monospace; font-size: 13px; letter-spacing: 0.24em; color: var(--color-accent); opacity: 0.92; margin-bottom: 18px; text-transform: lowercase; }
    h1 { font-weight: 400; font-size: clamp(54px, 11vw, 190px); letter-spacing: 0.01em; line-height: 0.95; margin: 0; text-transform: uppercase; color: var(--color-primary);
      text-shadow: 5px 5px 0 var(--color-accent); }
    .lede { max-width: 560px; margin: 26px auto 0; font-family: 'Space Mono', monospace; font-size: clamp(14px, 1.1vw, 17px); line-height: 1.6; color: rgba(42,42,42,0.85); }
    .lede code { font-size: 0.9em; background: rgba(42,42,42,0.08); padding: 2px 7px; border-radius: 4px; }

    .telemetry { position: absolute; bottom: 28px; left: 0; right: 0; z-index: 6; display: flex; justify-content: space-between; padding: 0 clamp(28px, 6vw, 80px);
      font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.18em; color: var(--color-accent); opacity: 0.85; flex-wrap: wrap; gap: 12px; }
    .telemetry span { color: var(--color-foreground); opacity: 0.5; padding-right: 6px; }
  </style>
</head>
<body>
  <nav class="nav"><a href="./" target="_top">&larr; Demos</a></nav>

  <main class="stage">
    <bg-wc class="bg" preset="risograph" intensity="0.65" density="0.5" speed="0.4"></bg-wc>
    <div class="vignette"></div>

    <div class="content">
      <div class="eyebrow">// two-ink overprint &middot; webgl</div>
      <h1>Riso<br>graph</h1>
      <p class="lede">
        Two drums, slightly out of register: blobs in one ink, bars in the other,
        multiplying into a third color wherever they overlap.
        <code>preset="risograph"</code> &mdash; grain, dropouts and all.
      </p>
    </div>

    <div class="telemetry">
      <div><span>preset</span>risograph</div>
      <div><span>render</span>webgl</div>
      <div><span>inks</span>primary &times; accent</div>
      <div><span>palette</span>theme</div>
    </div>
  </main>

  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 4: Verify, lint, commit** *(orchestrator step if run as parallel agents)*

Run: `npx playwright test test/new-presets.spec.js -g risograph` — Expected: PASS.

```bash
npm run lint -- src/presets/risograph.js
git add src/presets/risograph.js demos/risograph.html
git commit -m "feat(presets): risograph — two-ink overprint (webgl) + demo"
```

---

## Task 7: `plotter` — self-drawing pen plots (canvas2d)

**Files:**
- Create: `src/presets/plotter.js`
- Create: `demos/plotter.html`

- [ ] **Step 1: Confirm the test is red**

Run: `npx playwright test test/new-presets.spec.js -g plotter` — Expected: FAIL.

- [ ] **Step 2: Implement `src/presets/plotter.js`**

```js
// plotter — generative pen-plotter art that draws itself. Each cycle picks a
// seeded composition (flow-field stroke bundles, hatched discs, or a contour
// stack), then reveals the strokes progressively with a visible pen head; the
// finished sheet holds, fades, and a fresh seed loads. Print group.
//
// Distinct from spirograph (single curve family, no progressive draw) and
// flowlines (instant, ambient).

import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss } from '../renderer/tokens.js';

const CYCLE = 30; // s: draw 0..0.8, hold 0.8..0.92, fade 0.92..1
const RES = { low: 0.6, med: 1.0, high: 1.6 }; // stroke-count multiplier

function easeInOut(u) {
  return u * u * (3 - 2 * u);
}

function polyLen(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}

export function create({ c2d, getColors }) {
  let w = 0,
    h = 0;
  let cache = null; // { key, strokes, total }

  function build(params, cycleIdx) {
    const key = `${params.seed | 0}|${cycleIdx}|${params.density}|${params.quality}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32((((params.seed | 0) || 1) ^ (cycleIdx * 0x85ebca6b)) >>> 0);
    const s = Math.min(w, h);
    const mult = RES[params.quality] || RES.med;
    const motif = ['flow', 'rings', 'contours'][(rng() * 3) | 0];
    const strokes = []; // { pts, ink } ink: 0 main, 1 secondary

    if (motif === 'flow') {
      const k1 = (2 + rng() * 3) / s;
      const k2 = (2 + rng() * 3) / s;
      const k3 = (1 + rng() * 2) / s;
      const ph = rng() * Math.PI * 2;
      const n = Math.round((60 + params.density * 140) * mult);
      for (let i = 0; i < n; i++) {
        let x = rng() * w;
        let y = rng() * h;
        const pts = [[x, y]];
        const steps = 40 + ((rng() * 80) | 0);
        for (let j = 0; j < steps; j++) {
          const a = Math.sin(x * k1 + ph) * 1.8 + Math.cos(y * k2 - x * k3) * 1.8;
          x += Math.cos(a) * s * 0.004;
          y += Math.sin(a) * s * 0.004;
          if (x < 0 || x > w || y < 0 || y > h) break;
          pts.push([x, y]);
        }
        if (pts.length > 4) strokes.push({ pts, ink: rng() < 0.18 ? 1 : 0 });
      }
    } else if (motif === 'rings') {
      const discs = Math.round((4 + params.density * 8) * mult);
      for (let i = 0; i < discs; i++) {
        const cx = rng() * w;
        const cy = rng() * h;
        const R = (0.07 + rng() * 0.15) * s;
        const th = rng() * Math.PI;
        const gap = s * (0.006 + rng() * 0.006);
        const cs = Math.cos(th);
        const sn = Math.sin(th);
        for (let o = -R + gap; o < R; o += gap) {
          const half = Math.sqrt(Math.max(0, R * R - o * o));
          const pts = [];
          for (let j = 0; j <= 12; j++) {
            const v = -half + (2 * half * j) / 12;
            const wob = (rng() - 0.5) * s * 0.0015;
            pts.push([cx + cs * v - sn * (o + wob), cy + sn * v + cs * (o + wob)]);
          }
          strokes.push({ pts, ink: 0 });
        }
        const ring = [];
        for (let j = 0; j <= 40; j++) {
          const a = (j / 40) * Math.PI * 2;
          ring.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
        }
        strokes.push({ pts: ring, ink: 1 });
      }
    } else {
      // contours — a ridge stack rising mid-sheet
      const rows = Math.round((18 + params.density * 26) * mult);
      const bumps = [];
      const bn = 3 + ((rng() * 3) | 0);
      for (let b = 0; b < bn; b++) {
        bumps.push({ cx: w * (0.2 + rng() * 0.6), sg: w * (0.05 + rng() * 0.1), amp: h * (0.08 + rng() * 0.18) });
      }
      for (let r = 0; r < rows; r++) {
        const y0 = h * (0.12 + (0.76 * r) / rows);
        const env = Math.sin((Math.PI * r) / rows);
        const pts = [];
        for (let j = 0; j <= 120; j++) {
          const x = (j / 120) * w;
          let lift = 0;
          for (const b of bumps) lift += b.amp * Math.exp(-((x - b.cx) ** 2) / (2 * b.sg * b.sg));
          pts.push([x, y0 - lift * env]);
        }
        strokes.push({ pts, ink: r % 6 === 0 ? 1 : 0 });
      }
    }

    let total = 0;
    for (const st of strokes) {
      st.start = total;
      st.len = polyLen(st.pts);
      total += st.len;
    }
    cache = { key, strokes, total };
    return cache;
  }

  function frame(t, params) {
    const c = getColors();
    const cycleIdx = Math.floor(t / CYCLE);
    const p = (t - cycleIdx * CYCLE) / CYCLE;
    const { strokes, total } = build(params, cycleIdx);
    const s = Math.min(w, h);

    clearAndFill(c2d, w, h, c.bg);
    const budget = easeInOut(Math.min(1, p / 0.8)) * total;
    const fade = p > 0.92 ? 1 - (p - 0.92) / 0.08 : 1;
    const inks = [
      rgbaCss([c.fg[0], c.fg[1], c.fg[2]], 0.85 * fade),
      rgbaCss([c.primary[0], c.primary[1], c.primary[2]], 0.9 * fade),
    ];

    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';
    c2d.lineWidth = Math.max(1, s * 0.0016 * (1 + params.intensity));
    let penX = null;
    let penY = null;
    for (const st of strokes) {
      if (st.start >= budget) break;
      const allow = budget - st.start;
      c2d.beginPath();
      c2d.moveTo(st.pts[0][0], st.pts[0][1]);
      let used = 0;
      let done = true;
      for (let i = 1; i < st.pts.length; i++) {
        const [ax, ay] = st.pts[i - 1];
        const [bx, by] = st.pts[i];
        const seg = Math.hypot(bx - ax, by - ay);
        if (used + seg > allow) {
          const f = (allow - used) / seg;
          penX = ax + (bx - ax) * f;
          penY = ay + (by - ay) * f;
          c2d.lineTo(penX, penY);
          done = false;
          break;
        }
        c2d.lineTo(bx, by);
        used += seg;
      }
      c2d.strokeStyle = inks[st.ink];
      c2d.stroke();
      if (!done) break;
    }

    // Pen head while actively drawing.
    if (p < 0.8 && penX !== null) {
      c2d.beginPath();
      c2d.arc(penX, penY, s * 0.006, 0, Math.PI * 2);
      c2d.fillStyle = inks[1];
      c2d.fill();
      c2d.beginPath();
      c2d.arc(penX, penY, s * 0.011, 0, Math.PI * 2);
      c2d.strokeStyle = inks[0];
      c2d.lineWidth = 1;
      c2d.stroke();
      c2d.lineWidth = Math.max(1, s * 0.0016 * (1 + params.intensity));
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      frame(CYCLE * 0.85, params); // fully drawn sheet, pre-fade
    },
    dispose() {
      cache = null;
    },
  };
}
```

- [ ] **Step 3: Create `demos/plotter.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Plotter &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-background: #f7f4ec;   /* bone white */
      --color-foreground: #1c1c1e;   /* india ink */
      --color-primary: #c4452c;      /* sanguine pen */
      --color-accent: #4a4a4e;
      --color-info: #3c6e8f;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--color-background); color: var(--color-foreground); overflow: hidden; }
    body { font-family: 'IBM Plex Mono', monospace; min-height: 100vh; }
    .stage { position: relative; width: 100vw; height: 100vh; }
    bg-wc.bg { position: absolute; inset: 0; }
    .vignette { position: absolute; inset: 0; z-index: 2; pointer-events: none;
      background: radial-gradient(ellipse 66% 62% at 50% 50%, transparent 34%, rgba(247,244,236,0.85) 100%); }

    .nav { position: absolute; top: 24px; left: 32px; z-index: 12; font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.2em; }
    .nav a { color: var(--color-foreground); text-decoration: none; opacity: 0.7; }
    .nav a:hover { opacity: 1; }

    .content { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); z-index: 6; text-align: center; padding: 0 clamp(20px, 4vw, 80px); }
    .eyebrow { font-size: 13px; letter-spacing: 0.24em; color: var(--color-primary); opacity: 0.92; margin-bottom: 18px; text-transform: lowercase; }
    h1 { font-weight: 600; font-size: clamp(58px, 12vw, 200px); letter-spacing: 0.02em; line-height: 0.95; margin: 0; text-transform: uppercase; color: var(--color-foreground); }
    h1 em { font-style: normal; color: var(--color-primary); }
    .lede { max-width: 560px; margin: 24px auto 0; font-size: clamp(14px, 1.1vw, 17px); line-height: 1.6; color: rgba(28,28,30,0.8); }
    .lede code { font-size: 0.9em; background: rgba(28,28,30,0.07); padding: 2px 7px; border-radius: 4px; }

    .telemetry { position: absolute; bottom: 28px; left: 0; right: 0; z-index: 6; display: flex; justify-content: space-between; padding: 0 clamp(28px, 6vw, 80px);
      font-size: 11px; letter-spacing: 0.18em; color: var(--color-primary); opacity: 0.85; flex-wrap: wrap; gap: 12px; }
    .telemetry span { color: var(--color-foreground); opacity: 0.5; padding-right: 6px; }
  </style>
</head>
<body>
  <nav class="nav"><a href="./" target="_top">&larr; Demos</a></nav>

  <main class="stage">
    <bg-wc class="bg" preset="plotter" intensity="0.7" density="0.55" speed="0.8"></bg-wc>
    <div class="vignette"></div>

    <div class="content">
      <div class="eyebrow">// pen on paper &middot; canvas2d</div>
      <h1>Plot<em>ter</em></h1>
      <p class="lede">
        Watch the pen work: flow fields, hatched discs, and contour stacks drawn
        stroke by stroke, sheet after sheet. <code>preset="plotter"</code> &mdash;
        generative line art with the machine left visible.
      </p>
    </div>

    <div class="telemetry">
      <div><span>preset</span>plotter</div>
      <div><span>render</span>canvas2d</div>
      <div><span>sheet</span>30s</div>
      <div><span>palette</span>theme</div>
    </div>
  </main>

  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 4: Verify, lint, commit** *(orchestrator step if run as parallel agents)*

Run: `npx playwright test test/new-presets.spec.js -g plotter` — Expected: PASS.

```bash
npm run lint -- src/presets/plotter.js
git add src/presets/plotter.js demos/plotter.html
git commit -m "feat(presets): plotter — self-drawing pen plots (canvas2d) + demo"
```

---

## Task 8: `linocut` — carved-block print (canvas2d)

**Files:**
- Create: `src/presets/linocut.js`
- Create: `demos/linocut.html`

- [ ] **Step 1: Confirm the test is red**

Run: `npx playwright test test/new-presets.spec.js -g linocut` — Expected: FAIL.

- [ ] **Step 2: Implement `src/presets/linocut.js`**

```js
// linocut — carved-block print. Bold seeded organic shapes (blobs, leaves,
// suns) with rough jittered edges, flat-filled in the theme inks, carrying
// interior gouge marks cut back to the paper. The whole sheet is rendered
// once to an offscreen canvas (vertically tileable) and rolls slowly like a
// print cylinder. Print group.

import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0,
    h = 0;
  let sheet = null; // { key, canvas }

  // Rough closed blob path: jittered radii, straight segments read as carved.
  function blobPath(g, rng, R) {
    const n = 11;
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = ((i % n) / n) * Math.PI * 2;
      const rad = R * (0.72 + ((i % n) * 7919) % 13 / 13 * 0.5) * (0.94 + rng() * 0.12);
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x + (rng() - 0.5) * R * 0.06, y + (rng() - 0.5) * R * 0.06);
    }
    g.closePath();
  }

  function leafPath(g, rng, R) {
    g.beginPath();
    g.moveTo(0, -R);
    g.quadraticCurveTo(R * (0.7 + rng() * 0.2), 0, 0, R);
    g.quadraticCurveTo(-R * (0.7 + rng() * 0.2), 0, 0, -R);
    g.closePath();
  }

  function sunPath(g, rng, R) {
    const rays = 9 + ((rng() * 4) | 0);
    g.beginPath();
    for (let i = 0; i < rays * 2; i++) {
      const a = (i / (rays * 2)) * Math.PI * 2;
      const rad = (i % 2 ? R : R * 0.55) * (0.95 + rng() * 0.1);
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
  }

  // Draw one shape (with gouges) at a given y offset — called at y-h, y, y+h
  // so the sheet tiles vertically for the cylinder roll.
  function drawShape(g, sh, dy, fillCss, paperBg, s, intensity) {
    g.save();
    g.translate(sh.cx, sh.cy + dy);
    g.rotate(sh.rot);
    const rng = mulberry32(sh.jseed);
    if (sh.kind === 0) blobPath(g, rng, sh.R);
    else if (sh.kind === 1) leafPath(g, rng, sh.R);
    else sunPath(g, rng, sh.R);
    g.fillStyle = fillCss;
    g.fill();
    // Gouge marks: curved hatches cut back to paper, clipped to the shape.
    g.save();
    g.clip();
    g.strokeStyle = paperBg;
    g.lineCap = 'butt';
    g.lineWidth = Math.max(1.5, s * 0.004);
    const gouges = Math.round(4 + intensity * 9);
    for (let j = 0; j < gouges; j++) {
      const r = sh.R * (0.15 + j * (0.8 / gouges));
      const a0 = rng() * Math.PI * 2;
      g.beginPath();
      g.arc((rng() - 0.5) * sh.R * 0.4, (rng() - 0.5) * sh.R * 0.4, r, a0, a0 + 0.9 + rng() * 0.5);
      g.stroke();
    }
    g.restore();
    g.restore();
  }

  function buildSheet(params, c, palKey) {
    const key = `${params.seed | 0}|${params.density}|${params.intensity}|${palKey}|${w}x${h}`;
    if (sheet && sheet.key === key) return sheet.canvas;
    const off = (sheet && sheet.canvas) || document.createElement('canvas');
    off.width = w;
    off.height = h;
    const g = off.getContext('2d');
    clearAndFill(g, w, h, c.bg);

    const rng = mulberry32((params.seed | 0) || 1);
    const s = Math.min(w, h);
    const soften = (1 - params.intensity) * 0.35;
    const inkMain = rgbCss(mix([c.primary[0], c.primary[1], c.primary[2]], [c.bg[0], c.bg[1], c.bg[2]], soften));
    const inkAlt = rgbCss(mix([c.accent[0], c.accent[1], c.accent[2]], [c.bg[0], c.bg[1], c.bg[2]], soften));
    const paperBg = c.bg[3] > 0.01 ? rgbCss([c.bg[0], c.bg[1], c.bg[2]]) : 'rgba(0,0,0,0)';

    // Background field texture: short rough strokes in the dark ink.
    const inkDark = rgbaCss(mix([c.fg[0], c.fg[1], c.fg[2]], [c.bg[0], c.bg[1], c.bg[2]], soften), 0.07);
    g.strokeStyle = inkDark;
    g.lineWidth = Math.max(1, s * 0.0018);
    const fieldStrokes = Math.round(80 + params.intensity * 140);
    for (let i = 0; i < fieldStrokes; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const len = s * (0.012 + rng() * 0.02);
      const a = (rng() - 0.5) * 0.5;
      for (const dy of [-h, 0, h]) {
        g.beginPath();
        g.moveTo(x, y + dy);
        g.lineTo(x + Math.cos(a) * len, y + dy + Math.sin(a) * len);
        g.stroke();
      }
    }

    const count = Math.round(5 + params.density * 9);
    for (let i = 0; i < count; i++) {
      const sh = {
        kind: (rng() * 3) | 0,
        cx: rng() * w,
        cy: rng() * h,
        R: (0.09 + rng() * 0.15) * s,
        rot: rng() * Math.PI * 2,
        jseed: (rng() * 0xffffffff) >>> 0,
      };
      const fill = i % 3 === 2 ? inkAlt : inkMain;
      for (const dy of [-h, 0, h]) drawShape(g, sh, dy, fill, paperBg, s, params.intensity);
    }

    sheet = { key, canvas: off };
    return off;
  }

  function frame(t, params) {
    const c = getColors();
    const palKey = [c.primary, c.accent, c.bg, c.fg].map((x) => rgbCss([x[0], x[1], x[2]])).join();
    const off = buildSheet(params, c, palKey);
    const roll = ((t * h * 0.012) % h + h) % h; // slow cylinder roll
    c2d.clearRect(0, 0, w, h);
    c2d.drawImage(off, 0, roll - h);
    c2d.drawImage(off, 0, roll);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      sheet = null;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      sheet = null;
    },
  };
}
```

- [ ] **Step 3: Create `demos/linocut.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Linocut &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-background: #e8dcc4;   /* warm paper */
      --color-foreground: #1a1612;   /* carve black */
      --color-primary: #1a1612;
      --color-accent: #c8502e;       /* persimmon */
      --color-info: #4f5d4a;         /* moss */
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--color-background); color: var(--color-foreground); overflow: hidden; }
    body { font-family: 'Alfa Slab One', serif; min-height: 100vh; }
    .stage { position: relative; width: 100vw; height: 100vh; }
    bg-wc.bg { position: absolute; inset: 0; }
    .vignette { position: absolute; inset: 0; z-index: 2; pointer-events: none;
      background: radial-gradient(ellipse 66% 62% at 50% 50%, transparent 32%, rgba(232,220,196,0.86) 100%); }

    .nav { position: absolute; top: 24px; left: 32px; z-index: 12; font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.2em; }
    .nav a { color: var(--color-foreground); text-decoration: none; opacity: 0.7; }
    .nav a:hover { opacity: 1; }

    .content { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); z-index: 6; text-align: center; padding: 0 clamp(20px, 4vw, 80px); }
    .eyebrow { font-family: 'Space Mono', monospace; font-size: 13px; letter-spacing: 0.24em; color: var(--color-accent); opacity: 0.92; margin-bottom: 18px; text-transform: lowercase; }
    h1 { font-weight: 400; font-size: clamp(58px, 12vw, 200px); letter-spacing: 0.02em; line-height: 0.95; margin: 0; text-transform: uppercase; color: var(--color-foreground);
      text-shadow: 4px 4px 0 var(--color-accent); }
    .lede { max-width: 560px; margin: 24px auto 0; font-family: 'Space Mono', monospace; font-size: clamp(14px, 1.1vw, 17px); line-height: 1.6; color: rgba(26,22,18,0.82); }
    .lede code { font-size: 0.9em; background: rgba(26,22,18,0.08); padding: 2px 7px; border-radius: 4px; }

    .telemetry { position: absolute; bottom: 28px; left: 0; right: 0; z-index: 6; display: flex; justify-content: space-between; padding: 0 clamp(28px, 6vw, 80px);
      font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.18em; color: var(--color-accent); opacity: 0.85; flex-wrap: wrap; gap: 12px; }
    .telemetry span { color: var(--color-foreground); opacity: 0.5; padding-right: 6px; }
  </style>
</head>
<body>
  <nav class="nav"><a href="./" target="_top">&larr; Demos</a></nav>

  <main class="stage">
    <bg-wc class="bg" preset="linocut" intensity="0.75" density="0.5" speed="0.5"></bg-wc>
    <div class="vignette"></div>

    <div class="content">
      <div class="eyebrow">// carved &amp; rolled &middot; canvas2d</div>
      <h1>Linocut</h1>
      <p class="lede">
        Bold shapes cut from the block, gouge marks left showing, rolling past
        like the cylinder never stopped. <code>preset="linocut"</code> &mdash;
        relief printing in your theme's inks.
      </p>
    </div>

    <div class="telemetry">
      <div><span>preset</span>linocut</div>
      <div><span>render</span>canvas2d</div>
      <div><span>motion</span>cylinder roll</div>
      <div><span>palette</span>theme</div>
    </div>
  </main>

  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 4: Verify, lint, commit** *(orchestrator step if run as parallel agents)*

Run: `npx playwright test test/new-presets.spec.js -g linocut` — Expected: PASS.

```bash
npm run lint -- src/presets/linocut.js
git add src/presets/linocut.js demos/linocut.html
git commit -m "feat(presets): linocut — carved-block print (canvas2d) + demo"
```

---

## Task 9: Index cards, docs, manifest, full gates, integrate

**Files:**
- Modify: `demos/index.html`
- Modify: `docs/api.html`
- Modify: `README.md`
- Regenerate: `custom-elements.json`

- [ ] **Step 1: Add seven cards to `demos/index.html`**

After the `tapestry` card (matching the existing `bw-card` shape exactly), add:

```html
      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./sumi-e.html" title="Sumi-e"
                        url="profpowell.github.io/bg-wc/demos/sumi-e.html"></browser-window>
        <a class="bw-open" href="./sumi-e.html" aria-label="Open the Sumi-e demo"></a>
        <div class="meta"><span class="name">Sumi-e</span><span class="desc">ink-wash blooms</span></div>
      </div>
      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./kintsugi.html" title="Kintsugi"
                        url="profpowell.github.io/bg-wc/demos/kintsugi.html"></browser-window>
        <a class="bw-open" href="./kintsugi.html" aria-label="Open the Kintsugi demo"></a>
        <div class="meta"><span class="name">Kintsugi</span><span class="desc">gold crack veins</span></div>
      </div>
      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./ukiyo-e.html" title="Ukiyo-e"
                        url="profpowell.github.io/bg-wc/demos/ukiyo-e.html"></browser-window>
        <a class="bw-open" href="./ukiyo-e.html" aria-label="Open the Ukiyo-e demo"></a>
        <div class="meta"><span class="name">Ukiyo-e</span><span class="desc">woodblock waves</span></div>
      </div>
      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./sakura.html" title="Sakura"
                        url="profpowell.github.io/bg-wc/demos/sakura.html"></browser-window>
        <a class="bw-open" href="./sakura.html" aria-label="Open the Sakura demo"></a>
        <div class="meta"><span class="name">Sakura</span><span class="desc">drifting petals</span></div>
      </div>
      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./risograph.html" title="Risograph"
                        url="profpowell.github.io/bg-wc/demos/risograph.html"></browser-window>
        <a class="bw-open" href="./risograph.html" aria-label="Open the Risograph demo"></a>
        <div class="meta"><span class="name">Risograph</span><span class="desc">two-ink overprint</span></div>
      </div>
      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./plotter.html" title="Plotter"
                        url="profpowell.github.io/bg-wc/demos/plotter.html"></browser-window>
        <a class="bw-open" href="./plotter.html" aria-label="Open the Plotter demo"></a>
        <div class="meta"><span class="name">Plotter</span><span class="desc">self-drawing plots</span></div>
      </div>
      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./linocut.html" title="Linocut"
                        url="profpowell.github.io/bg-wc/demos/linocut.html"></browser-window>
        <a class="bw-open" href="./linocut.html" aria-label="Open the Linocut demo"></a>
        <div class="meta"><span class="name">Linocut</span><span class="desc">carved-block print</span></div>
      </div>
```

- [ ] **Step 2: Catalog rows in `docs/api.html`**

In `<section id="presets">`, add a **Japanese** group (move the existing `seigaiha` row into it) and a **Print art** group, matching the surrounding row structure:

```html
<tr><td><code>sumi-e</code></td><td>webgl</td><td>Ink-wash blooms diffusing into paper — bokashi bleed, granulation, staggered grow/fade cycles.</td></tr>
<tr><td><code>kintsugi</code></td><td>canvas2d</td><td>Gold crack veins growing, branching, and shimmering across a dark slab; reseeds each cycle.</td></tr>
<tr><td><code>ukiyo-e</code></td><td>canvas2d</td><td>Woodblock-print waves — flat-color parallax layers, outlined crests, curling foam claws.</td></tr>
<tr><td><code>sakura</code></td><td>canvas2d</td><td>Cherry petals on gusting wind across three depth layers.</td></tr>
<tr><td><code>risograph</code></td><td>webgl</td><td>Two-ink riso overprint — misregistered blobs &times; bars multiplying into a third color, heavy grain.</td></tr>
<tr><td><code>plotter</code></td><td>canvas2d</td><td>Pen-plotter art drawing itself — flow fields, hatched discs, contour stacks, visible pen head.</td></tr>
<tr><td><code>linocut</code></td><td>canvas2d</td><td>Carved-block shapes with gouge marks, rolling slowly like a print cylinder.</td></tr>
```

(Adjust cells to the exact column layout of the surrounding groups; move the `seigaiha` row from Geometric into the new Japanese group.)

- [ ] **Step 3: README preset/group counts**

If `README.md` enumerates groups or preset counts, update them (12 → 14 groups; +7 presets). Search for the old numbers: `grep -n "group" README.md`.

- [ ] **Step 4: Regenerate the manifest**

```bash
npm run analyze
npm run cem:check   # Expected: PASS, no drift
```

- [ ] **Step 5: Full quality gate** (mirror CI)

```bash
npm run lint
npm run format:check   # if it fails: npx prettier --write <new files> and restage
npm run test:node
npm run build
npm run build:site
npm test
```

Expected: all green — including the 7 new entries in `new-presets.spec.js` and `groups-unit.mjs`. Debug failures with superpowers:systematic-debugging before proceeding.

- [ ] **Step 6: Visual sanity check**

`npm run dev` → gallery: confirm the **Japanese** and **Print art** tabs appear, all 8 grouped presets render, theme toggle recolors them live. Open each `demos/<name>.html`.

- [ ] **Step 7: Commit, close beads, integrate**

```bash
git add demos/index.html docs/api.html README.md custom-elements.json
git commit -m "docs(demos): index cards + api rows for japanese/print presets; regenerate manifest"
bd close <each-task-id> <epic-id>
```

Then use `superpowers:finishing-a-development-branch` to merge `feat/japanese-print-presets` into `main`, and complete the session-close protocol:

```bash
git pull --rebase
bd dolt push
git push
git status   # MUST show up to date with origin
```

---

## Notes for the implementer

- **Time rule:** `t` is already scaled by `speed`; never multiply by `params.speed` again.
- **Colors:** always from `getColors()`, read every frame. Demo-page hex palettes are page tokens, NOT preset code.
- **Resolution independence:** size everything from device-pixel `W`/`H` given to `resize()`.
- **Offscreen canvases** are created lazily inside `create()` (never at module top level) so SSR import stays DOM-free.
- **WebGL presets** must `dispose()` program + buffer (gallery rotates contexts under the ~16-context cap).
- **Parallel agents** (Tasks 2–8): write your two files only; do NOT run git or Playwright — the orchestrator verifies and commits.
