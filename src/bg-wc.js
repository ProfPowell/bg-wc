// <bg-wc> — theme-aware graphics-layer web component (canonical; <gl-wc> is a deprecated alias, inlined below).
// See spec.md for the full design.

import { loadPreset, listPresets } from './presets/index.js';
import { createGLContext } from './renderer/webgl.js';
import { createC2DContext, resizeCanvas } from './renderer/canvas2d.js';
import { createCSS3DContext } from './renderer/css3d.js';
import { resolveTokens } from './renderer/tokens.js';
import { observeVisibility, observeReducedMotion, observeTabVisibility } from './util/observe.js';
import { observeBatteryPowerSave } from './util/pause.js';

const STYLE = `
:host {
  display: block;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  background: var(--bg-wc-color-bg, var(--gl-wc-color-bg, var(--color-background, transparent)));
}
:host([hidden]) { display: none; }
canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: var(--bg-wc-z-index, var(--gl-wc-z-index, 0));
  pointer-events: none;
  display: block;
}
.content {
  position: relative;
  z-index: 1;
}
.fallback {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: none;
}
.fallback ::slotted(*) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
:host([data-fallback]) .fallback { display: block; }
:host([data-fallback]) canvas { display: none; }
.stage {
  position: absolute;
  inset: 0;
  z-index: var(--bg-wc-z-index, var(--gl-wc-z-index, 0));
  pointer-events: none;
  overflow: hidden;
}
:host([data-fallback]) .stage { display: none; }
`;

// Authors can override any of these via component-namespaced CSS vars.
const COLOR_MAPPING = {
  primary: { token: '--color-primary', override: ['--bg-wc-color-1', '--gl-wc-color-1'] },
  accent: { token: '--color-accent', override: ['--bg-wc-color-2', '--gl-wc-color-2'] },
  info: { token: '--color-info', override: ['--bg-wc-color-3', '--gl-wc-color-3'] },
  bg: { token: '--color-background', override: ['--bg-wc-color-bg', '--gl-wc-color-bg'] },
  fg: {
    token: ['--color-foreground', '--color-text'],
    override: ['--bg-wc-color-fg', '--gl-wc-color-fg'],
  },
  success: { token: '--color-success', override: null },
  warning: { token: '--color-warning', override: null },
  error: { token: '--color-error', override: null },
};

class BgWc extends HTMLElement {
  static get observedAttributes() {
    return [
      'preset',
      'palette',
      'intensity',
      'speed',
      'density',
      'seed',
      'paused',
      'pixel-ratio',
      'quality',
      'fit',
      'motion',
      'mode',
      'power-save',
    ];
  }

  // Active layer element: <canvas> for webgl/canvas2d, <div class="stage"> for css3d.
  #canvas;
  #instance = null;
  #rendererKind = null;
  #ctx = null;
  #rafId = 0;
  #lastTickMs = 0;
  #timeS = 0;
  #resizeObs = null;
  #cleanups = [];
  #ready;
  #readyResolve;
  #visible = true;
  #docVisible = !document.hidden;
  #reducedMotion = false;
  #powerSave = false;
  #powerSaveCtrl = null;
  #loadingToken = 0;
  #internals = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLE;

    this.#canvas = this.#makeCanvas();

    const fallback = document.createElement('div');
    fallback.className = 'fallback';
    const fallbackSlot = document.createElement('slot');
    fallbackSlot.name = 'fallback';
    fallback.appendChild(fallbackSlot);

    const content = document.createElement('div');
    content.className = 'content';
    content.appendChild(document.createElement('slot'));

    root.append(style, this.#canvas, fallback, content);

    try {
      this.#internals = this.attachInternals?.();
    } catch {}
    this.addEventListener('focusin', () => {
      try {
        this.#internals?.states?.add?.('--child-focused');
      } catch {}
    });
    this.addEventListener('focusout', () => {
      try {
        this.#internals?.states?.delete?.('--child-focused');
      } catch {}
    });

    this.#resetReady();
  }

  #makeCanvas() {
    const c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.setAttribute('role', 'presentation');
    // Exposed so authors can style the canvas from outside the shadow root,
    // e.g. `bg-wc::part(canvas) { image-rendering: pixelated }`.
    c.setAttribute('part', 'canvas');
    return c;
  }

  #resetReady() {
    this.#ready = new Promise((res) => {
      this.#readyResolve = res;
    });
  }

  // --- Public surface --------------------------------------------------------

  get ready() {
    return this.#ready;
  }

  get preset() {
    return this.getAttribute('preset');
  }
  set preset(v) {
    if (v == null) this.removeAttribute('preset');
    else this.setAttribute('preset', String(v));
  }

  get paused() {
    return this.hasAttribute('paused');
  }
  set paused(v) {
    if (v) this.setAttribute('paused', '');
    else this.removeAttribute('paused');
  }

  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }

  async snapshot() {
    // css3d renders to DOM, not a canvas — there is no pixel buffer to read.
    if (this.#rendererKind === 'css3d') return null;
    // Re-render one frame at current time, then read pixels.
    if (this.#instance) {
      try {
        this.#instance.frame?.(this.#timeS, this.#readParams());
      } catch {}
    }
    return new Promise((res) => this.#canvas.toBlob((b) => res(b), 'image/png'));
  }

  static presets() {
    return listPresets();
  }

  // --- Lifecycle -------------------------------------------------------------

  connectedCallback() {
    this.#cleanups.push(
      observeVisibility(this, (v) => {
        this.#visible = v;
        this.#evalPlay();
        this.#emit('bg-wc:visibility', { visible: v });
      })
    );
    this.#cleanups.push(
      observeTabVisibility((v) => {
        this.#docVisible = v;
        this.#evalPlay();
      })
    );
    const rm = observeReducedMotion((m) => {
      this.#reducedMotion = m;
      this.#updateFallbackVisibility();
      this.#evalPlay();
    });
    this.#reducedMotion = rm.matches();
    this.#cleanups.push(rm.dispose);

    if (this.getAttribute('power-save') !== 'off') this.#bindPowerSave();

    // Back/forward-cache restore: while the page was frozen the browser may have
    // dropped our WebGL context, and `webglcontextrestored` is not reliably
    // fired on restore — leaving the canvas blank (hidden behind data-fallback).
    // Rebuild the preset on a persisted pageshow so the background comes back
    // without a full reload. (disconnectedCallback removes this listener.)
    const onPageShow = (e) => {
      if (e.persisted && this.preset) this.#loadCurrentPreset();
    };
    window.addEventListener('pageshow', onPageShow);
    this.#cleanups.push(() => window.removeEventListener('pageshow', onPageShow));

    this.#resizeObs = new ResizeObserver(() => this.#resize());
    this.#resizeObs.observe(this);

    if (this.preset) this.#loadCurrentPreset();
    else this.#updateFallbackVisibility();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.#rafId);
    this.#rafId = 0;
    try {
      this.#resizeObs?.disconnect();
    } catch {}
    for (const c of this.#cleanups) {
      try {
        c();
      } catch {}
    }
    this.#cleanups.length = 0;
    this.#unbindPowerSave();
    this.#disposeInstance();
  }

  attributeChangedCallback(name, oldV, newV) {
    if (oldV === newV) return;
    if (!this.isConnected) return;
    if (name === 'preset') {
      this.#loadCurrentPreset(oldV);
    } else if (name === 'paused') {
      this.#evalPlay();
    } else if (name === 'motion') {
      this.#updateFallbackVisibility();
      this.#evalPlay();
    } else if (name === 'pixel-ratio' || name === 'fit') {
      this.#resize();
    } else if (name === 'mode' || name === 'density') {
      // css3d builds its scene from these at create-time, so a change requires a
      // rebuild. Canvas presets read them per frame and need no re-init — pass
      // the current preset name as prevName so no spurious preset-changed fires.
      if (this.#rendererKind === 'css3d') this.#loadCurrentPreset(this.preset);
    } else if (name === 'power-save') {
      // Runtime-toggleable: 'off' stops watching the battery (and clears the
      // power-save brake); any other value (re)starts the observer.
      if (newV === 'off') this.#unbindPowerSave();
      else this.#bindPowerSave();
      this.#evalPlay();
    }
    // intensity/speed/seed/palette/quality are read fresh each frame.
  }

  // --- Internals -------------------------------------------------------------

  // Battery power-save observer. The AbortController is the teardown handle:
  // aborting it disposes the battery listeners even if getBattery() is still
  // pending, so disconnecting (or toggling power-save off) never leaks.
  #bindPowerSave() {
    if (this.#powerSaveCtrl) return;
    const ctrl = new AbortController();
    this.#powerSaveCtrl = ctrl;
    observeBatteryPowerSave((p) => {
      this.#powerSave = p;
      this.#evalPlay();
    }, ctrl.signal).then((dispose) => {
      // Aborted before getBattery() resolved → dispose now (the signal's abort
      // listener wasn't attached in that window).
      if (ctrl.signal.aborted) dispose();
    });
  }

  #unbindPowerSave() {
    this.#powerSaveCtrl?.abort();
    this.#powerSaveCtrl = null;
    this.#powerSave = false;
  }

  #emit(type, detail) {
    const fire = (t) =>
      this.dispatchEvent(new CustomEvent(t, { detail, bubbles: false, composed: true }));
    fire(type);
    // Legacy twin: keep gl-wc:* listeners working during deprecation.
    if (type.startsWith('bg-wc:')) fire('gl-wc:' + type.slice('bg-wc:'.length));
  }

  async #loadCurrentPreset(prevName = null) {
    const name = this.preset;
    if (!name) {
      // Transitioning to an inert state (preset attribute removed). Stop
      // rendering, free the GL context, surface the fallback slot, and
      // settle `ready` so callers awaiting it don't hang. Skip
      // #updateFallbackVisibility — there's no instance to render, so we
      // always want the fallback visible here.
      cancelAnimationFrame(this.#rafId);
      this.#rafId = 0;
      this.#disposeInstance();
      this.setAttribute('data-fallback', '');
      if (prevName != null) {
        this.#emit('bg-wc:preset-changed', { from: prevName, to: null });
      }
      this.#resetReady();
      this.#readyResolve();
      return;
    }
    const token = ++this.#loadingToken;
    this.#resetReady();

    let loaded;
    try {
      loaded = await loadPreset(name);
    } catch (err) {
      if (token !== this.#loadingToken) return;
      this.setAttribute('data-fallback', '');
      this.#emit('bg-wc:error', { phase: 'load', error: err });
      this.#readyResolve();
      return;
    }
    if (token !== this.#loadingToken) return;

    // Swap the layer element so we can switch renderer kinds without stale
    // context issues. For css3d the layer is a <div> stage; otherwise a <canvas>.
    // NOTE: #canvas holds the active layer element (canvas OR stage); canvas-only
    // code paths gate on #rendererKind.
    this.#disposeInstance();

    let ctx, layer;
    try {
      if (loaded.renderer === 'css3d') {
        ctx = createCSS3DContext();
        layer = ctx.stage;
      } else {
        layer = this.#makeCanvas();
        ctx =
          loaded.renderer === 'webgl'
            ? createGLContext(layer)
            : createC2DContext(layer);
        if (!ctx) throw new Error(`${loaded.renderer} context unavailable`);
      }
    } catch (err) {
      this.setAttribute('data-fallback', '');
      this.#emit('bg-wc:error', { phase: 'init', error: err });
      this.#readyResolve();
      return;
    }
    this.#canvas.replaceWith(layer);
    this.#canvas = layer;

    this.#rendererKind = loaded.renderer;
    this.#ctx = ctx;
    this.#bindContextLossHandlers();

    try {
      this.#instance = loaded.create({
        host: this,
        canvas: loaded.renderer === 'css3d' ? null : this.#canvas,
        gl: loaded.renderer === 'webgl' ? ctx : null,
        c2d: loaded.renderer === 'canvas2d' ? ctx : null,
        css3d: loaded.renderer === 'css3d' ? ctx : null,
        getColors: () => resolveTokens(this, COLOR_MAPPING),
        getParams: () => this.#readParams(),
      });
    } catch (err) {
      this.setAttribute('data-fallback', '');
      this.#emit('bg-wc:error', { phase: 'init', error: err });
      this.#disposeInstance();
      this.#readyResolve();
      return;
    }

    // Size canvas + propagate dimensions to the instance now that it exists.
    this.#resize();

    this.#timeS = 0;
    this.#lastTickMs = 0;
    this.#updateFallbackVisibility();

    // First frame so :ready means "something rendered"
    try {
      this.#instance.frame?.(0, this.#readParams());
    } catch (err) {
      this.#emit('bg-wc:error', { phase: 'runtime', error: err });
    }

    this.#emit('bg-wc:ready', { preset: name, renderer: loaded.renderer });
    this.#readyResolve();
    if (prevName != null && prevName !== name) {
      this.#emit('bg-wc:preset-changed', { from: prevName, to: name });
    }
    this.#evalPlay();
  }

  #bindContextLossHandlers() {
    if (this.#rendererKind !== 'webgl') return;
    this.#canvas.addEventListener('webglcontextlost', this.#onCtxLost);
    this.#canvas.addEventListener('webglcontextrestored', this.#onCtxRestored);
  }
  #onCtxLost = (e) => {
    e.preventDefault();
    cancelAnimationFrame(this.#rafId);
    this.#rafId = 0;
    this.setAttribute('data-fallback', '');
    this.#emit('bg-wc:error', { phase: 'runtime', error: new Error('webgl context lost') });
  };
  #onCtxRestored = () => {
    this.removeAttribute('data-fallback');
    this.#loadCurrentPreset(this.preset);
  };

  #disposeInstance() {
    try {
      this.#instance?.dispose?.();
    } catch {}
    if (this.#rendererKind === 'webgl') {
      // Stop listening for loss before we intentionally drop the context,
      // so our own teardown doesn't fire a spurious bg-wc:error.
      this.#canvas.removeEventListener('webglcontextlost', this.#onCtxLost);
      this.#canvas.removeEventListener('webglcontextrestored', this.#onCtxRestored);
      // Explicitly free the context so a removed element releases its slot
      // immediately, instead of lingering until GC. Browsers cap simultaneous
      // WebGL contexts (~16); pages that mount/unmount many <bg-wc>
      // (galleries, tab groups) rely on this to stay under the limit.
      if (this.#ctx) {
        try {
          this.#ctx.getExtension('WEBGL_lose_context')?.loseContext();
        } catch {}
      }
    }
    this.#instance = null;
    this.#ctx = null;
    this.#rendererKind = null;
  }

  #readParams() {
    const num = (name, def, lo, hi) => {
      const v = parseFloat(this.getAttribute(name));
      return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def;
    };
    const css = getComputedStyle(this);
    // Read --bg-wc-<suffix>, falling back to legacy --gl-wc-<suffix>.
    const cssVar = (suffix) => {
      for (const prefix of ['--bg-wc-', '--gl-wc-']) {
        const v = parseFloat(css.getPropertyValue(prefix + suffix));
        if (Number.isFinite(v)) return v;
      }
      return null;
    };
    return {
      palette: this.getAttribute('palette') || 'theme',
      intensity: cssVar('intensity') ?? num('intensity', 0.5, 0, 1),
      speed: cssVar('speed') ?? num('speed', 1, 0, 5),
      density: cssVar('density') ?? num('density', 0.5, 0, 1),
      seed: num('seed', 0, -1e9, 1e9) | 0,
      quality: this.getAttribute('quality') || 'med',
      fit: this.getAttribute('fit') || 'cover',
      // Free-text payload for text presets (crawl / marquee / …). Read fresh
      // each frame, so changing it needs no re-init. Lines split on "|".
      text: this.getAttribute('text') || '',
    };
  }

  #reducedMotionActive() {
    const m = this.getAttribute('motion') || 'auto';
    if (m === 'reduce') return true;
    if (m === 'force') return false;
    return this.#reducedMotion;
  }

  #updateFallbackVisibility() {
    if (this.#rendererKind === 'css3d') {
      // The paused scene is itself the static representation; never swap to the
      // fallback slot for css3d (even under reduced motion).
      this.removeAttribute('data-fallback');
      return;
    }
    const reduce = this.#reducedMotionActive();
    // If reduced and the preset has no staticFrame, surface fallback. Otherwise let the canvas (or its static frame) show.
    if (reduce && !this.#instance?.staticFrame) {
      this.setAttribute('data-fallback', '');
    } else {
      this.removeAttribute('data-fallback');
    }
  }

  #resize() {
    const rect = this.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    if (this.#rendererKind === 'css3d') {
      try {
        this.#instance?.resize?.(rect.width, rect.height);
      } catch {}
      return;
    }
    const css = getComputedStyle(this);
    const pr = (n) => parseFloat(css.getPropertyValue(n));
    const bgPr = pr('--bg-wc-pixel-ratio');
    const cssVar = Number.isFinite(bgPr) ? bgPr : pr('--gl-wc-pixel-ratio');
    const attr = parseFloat(this.getAttribute('pixel-ratio'));
    const dpr = Number.isFinite(cssVar)
      ? cssVar
      : Number.isFinite(attr)
        ? attr
        : Math.min(globalThis.devicePixelRatio || 1, 2);
    const [W, H] = resizeCanvas(this.#canvas, rect.width, rect.height, dpr);
    if (this.#rendererKind === 'webgl' && this.#ctx) {
      this.#ctx.viewport(0, 0, W, H);
    }
    try {
      this.#instance?.resize?.(W, H);
    } catch {}
  }

  #shouldPlay() {
    if (!this.#instance) return false;
    if (this.paused) return false;
    if (!this.#visible) return false;
    if (!this.#docVisible) return false;
    if (this.#powerSave) return false;
    if (this.#reducedMotionActive()) return false;
    return true;
  }

  #evalPlay() {
    const play = this.#shouldPlay();
    if (this.#rendererKind === 'css3d') {
      // setPlaying is the source of truth for CSS motion. rAF still runs when
      // playing, but only to reconcile params/colors (cheap), never per-node.
      try {
        this.#instance?.setPlaying?.(play);
      } catch {}
    }
    if (play) {
      if (!this.#rafId) {
        this.#lastTickMs = performance.now();
        this.#rafId = requestAnimationFrame(this.#tick);
      }
    } else {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = 0;
      // If reduced motion is the reason we're stopped, ask the preset for one
      // frame if it supports it. (css3d has no staticFrame — its paused scene
      // is already the static representation.)
      if (this.#instance && this.#reducedMotionActive() && this.#instance.staticFrame) {
        try {
          this.#instance.staticFrame(this.#readParams());
        } catch (err) {
          this.#emit('bg-wc:error', { phase: 'runtime', error: err });
        }
      }
    }
  }

  #tick = (nowMs) => {
    const params = this.#readParams();
    const dt = Math.min(0.1, (nowMs - this.#lastTickMs) / 1000);
    this.#lastTickMs = nowMs;
    // Time is speed-scaled here so every preset gets `speed` for free via
    // its `t` argument (and any `dt = t - lastT` it derives). Presets MUST
    // NOT multiply time-based motion by params.speed again — that would
    // double-apply (speed²). See gl-wc-ant.
    this.#timeS += dt * params.speed;
    try {
      this.#instance?.frame?.(this.#timeS, params);
    } catch (err) {
      // Stop the loop and do NOT reschedule — surface the failure instead of
      // firing more frames on a broken instance.
      this.#rafId = 0;
      this.setAttribute('data-fallback', '');
      this.#emit('bg-wc:error', { phase: 'runtime', error: err });
      return;
    }
    // Schedule the next frame only after this one succeeded, so an error path
    // can't leave a frame already enqueued against a disposed instance.
    this.#rafId = requestAnimationFrame(this.#tick);
  };
}

// Guard registration so importing this module in a non-browser / SSR context
// (no customElements registry) doesn't throw at load.
if (typeof customElements !== 'undefined' && !customElements.get('bg-wc')) {
  customElements.define('bg-wc', BgWc);
}

// Deprecated <gl-wc> alias: a subclass that warns once on first connect, so
// existing markup keeps working through the rename. Inlined (not a separate
// module) to register synchronously alongside <bg-wc> without a circular import.
let warnedGlWc = false;
class GlWcAlias extends BgWc {
  connectedCallback() {
    if (!warnedGlWc) {
      warnedGlWc = true;
      console.warn(
        '<gl-wc> is deprecated and will be removed in a future major. Use <bg-wc> instead.'
      );
    }
    super.connectedCallback?.();
  }
}
if (typeof customElements !== 'undefined' && !customElements.get('gl-wc')) {
  customElements.define('gl-wc', GlWcAlias);
}

export { BgWc, GlWcAlias };
export { listPresets };
export default BgWc;
