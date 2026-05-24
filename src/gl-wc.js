// <gl-wc> — theme-aware graphics-layer web component.
// See spec.md for the full design.

import { loadPreset, listPresets } from './presets/index.js';
import { createGLContext } from './renderer/webgl.js';
import { createC2DContext, resizeCanvas } from './renderer/canvas2d.js';
import { resolveTokens } from './renderer/tokens.js';
import {
  observeVisibility,
  observeReducedMotion,
  observeTabVisibility,
} from './util/observe.js';
import { observeBatteryPowerSave } from './util/pause.js';

const STYLE = `
:host {
  display: block;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  background: var(--gl-wc-color-bg, var(--color-background, transparent));
}
:host([hidden]) { display: none; }
canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: var(--gl-wc-z-index, 0);
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
`;

// Authors can override any of these via component-namespaced CSS vars.
const COLOR_MAPPING = {
  primary: { token: '--color-primary',    override: '--gl-wc-color-1' },
  accent:  { token: '--color-accent',     override: '--gl-wc-color-2' },
  info:    { token: '--color-info',       override: '--gl-wc-color-3' },
  bg:      { token: '--color-background', override: '--gl-wc-color-bg' },
  fg:      { token: '--color-foreground', override: '--gl-wc-color-fg' },
  success: { token: '--color-success',    override: null },
  warning: { token: '--color-warning',    override: null },
  error:   { token: '--color-error',      override: null },
};

class GlWc extends HTMLElement {
  static get observedAttributes() {
    return [
      'preset', 'palette', 'intensity', 'speed', 'density', 'seed',
      'paused', 'pixel-ratio', 'quality', 'fit', 'motion',
    ];
  }

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

    try { this.#internals = this.attachInternals?.(); } catch {}
    this.addEventListener('focusin', () => {
      try { this.#internals?.states?.add?.('--child-focused'); } catch {}
    });
    this.addEventListener('focusout', () => {
      try { this.#internals?.states?.delete?.('--child-focused'); } catch {}
    });

    this.#resetReady();
  }

  #makeCanvas() {
    const c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.setAttribute('role', 'presentation');
    // Exposed so authors can style the canvas from outside the shadow root,
    // e.g. `gl-wc::part(canvas) { image-rendering: pixelated }`.
    c.setAttribute('part', 'canvas');
    return c;
  }

  #resetReady() {
    this.#ready = new Promise((res) => { this.#readyResolve = res; });
  }

  // --- Public surface --------------------------------------------------------

  get ready() { return this.#ready; }

  get preset() { return this.getAttribute('preset'); }
  set preset(v) {
    if (v == null) this.removeAttribute('preset');
    else this.setAttribute('preset', String(v));
  }

  get paused() { return this.hasAttribute('paused'); }
  set paused(v) {
    if (v) this.setAttribute('paused', '');
    else this.removeAttribute('paused');
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }

  async snapshot() {
    // Re-render one frame at current time, then read pixels.
    if (this.#instance) {
      try { this.#instance.frame?.(this.#timeS, this.#readParams()); } catch {}
    }
    return new Promise((res) => this.#canvas.toBlob((b) => res(b), 'image/png'));
  }

  static presets() { return listPresets(); }

  // --- Lifecycle -------------------------------------------------------------

  connectedCallback() {
    this.#cleanups.push(
      observeVisibility(this, (v) => {
        this.#visible = v;
        this.#evalPlay();
        this.#emit('gl-wc:visibility', { visible: v });
      })
    );
    this.#cleanups.push(
      observeTabVisibility((v) => { this.#docVisible = v; this.#evalPlay(); })
    );
    const rm = observeReducedMotion((m) => {
      this.#reducedMotion = m;
      this.#updateFallbackVisibility();
      this.#evalPlay();
    });
    this.#reducedMotion = rm.matches();
    this.#cleanups.push(rm.dispose);

    if (this.getAttribute('power-save') !== 'off') {
      observeBatteryPowerSave((p) => { this.#powerSave = p; this.#evalPlay(); })
        .then((d) => this.#cleanups.push(d));
    }

    this.#resizeObs = new ResizeObserver(() => this.#resize());
    this.#resizeObs.observe(this);

    if (this.preset) this.#loadCurrentPreset();
    else this.#updateFallbackVisibility();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.#rafId);
    this.#rafId = 0;
    try { this.#resizeObs?.disconnect(); } catch {}
    for (const c of this.#cleanups) { try { c(); } catch {} }
    this.#cleanups.length = 0;
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
    }
    // intensity/speed/density/seed/palette/quality are read fresh each frame.
  }

  // --- Internals -------------------------------------------------------------

  #emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: false, composed: true }));
  }

  async #loadCurrentPreset(prevName = null) {
    const name = this.preset;
    if (!name) return;
    const token = ++this.#loadingToken;
    this.#resetReady();

    let loaded;
    try {
      loaded = await loadPreset(name);
    } catch (err) {
      if (token !== this.#loadingToken) return;
      this.setAttribute('data-fallback', '');
      this.#emit('gl-wc:error', { phase: 'load', error: err });
      return;
    }
    if (token !== this.#loadingToken) return;

    // Swap canvas so we can switch renderer kinds without stale-context issues.
    this.#disposeInstance();
    const fresh = this.#makeCanvas();
    this.#canvas.replaceWith(fresh);
    this.#canvas = fresh;

    let ctx;
    try {
      ctx = loaded.renderer === 'webgl' ? createGLContext(this.#canvas) : createC2DContext(this.#canvas);
      if (!ctx) throw new Error(`${loaded.renderer} context unavailable`);
    } catch (err) {
      this.setAttribute('data-fallback', '');
      this.#emit('gl-wc:error', { phase: 'init', error: err });
      return;
    }

    this.#rendererKind = loaded.renderer;
    this.#ctx = ctx;
    this.#bindContextLossHandlers();

    try {
      this.#instance = loaded.create({
        host: this,
        canvas: this.#canvas,
        gl: loaded.renderer === 'webgl' ? ctx : null,
        c2d: loaded.renderer === 'canvas2d' ? ctx : null,
        getColors: () => resolveTokens(this, COLOR_MAPPING),
        getParams: () => this.#readParams(),
      });
    } catch (err) {
      this.setAttribute('data-fallback', '');
      this.#emit('gl-wc:error', { phase: 'init', error: err });
      this.#disposeInstance();
      return;
    }

    // Size canvas + propagate dimensions to the instance now that it exists.
    this.#resize();

    this.#timeS = 0;
    this.#lastTickMs = 0;
    this.#updateFallbackVisibility();

    // First frame so :ready means "something rendered"
    try { this.#instance.frame?.(0, this.#readParams()); } catch (err) {
      this.#emit('gl-wc:error', { phase: 'runtime', error: err });
    }

    this.#emit('gl-wc:ready', { preset: name, renderer: loaded.renderer });
    this.#readyResolve();
    if (prevName != null && prevName !== name) {
      this.#emit('gl-wc:preset-changed', { from: prevName, to: name });
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
    this.#emit('gl-wc:error', { phase: 'runtime', error: new Error('webgl context lost') });
  };
  #onCtxRestored = () => {
    this.removeAttribute('data-fallback');
    this.#loadCurrentPreset(this.preset);
  };

  #disposeInstance() {
    try { this.#instance?.dispose?.(); } catch {}
    if (this.#rendererKind === 'webgl') {
      // Stop listening for loss before we intentionally drop the context,
      // so our own teardown doesn't fire a spurious gl-wc:error.
      this.#canvas.removeEventListener('webglcontextlost', this.#onCtxLost);
      this.#canvas.removeEventListener('webglcontextrestored', this.#onCtxRestored);
      // Explicitly free the context so a removed element releases its slot
      // immediately, instead of lingering until GC. Browsers cap simultaneous
      // WebGL contexts (~16); pages that mount/unmount many <gl-wc>
      // (galleries, tab groups) rely on this to stay under the limit.
      if (this.#ctx) {
        try { this.#ctx.getExtension('WEBGL_lose_context')?.loseContext(); } catch {}
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
    const cssVar = (name) => {
      const v = parseFloat(css.getPropertyValue(name));
      return Number.isFinite(v) ? v : null;
    };
    return {
      palette: this.getAttribute('palette') || 'theme',
      intensity: cssVar('--gl-wc-intensity') ?? num('intensity', 0.5, 0, 1),
      speed:     cssVar('--gl-wc-speed')     ?? num('speed', 1, 0, 5),
      density:   cssVar('--gl-wc-density')   ?? num('density', 0.5, 0, 1),
      seed:      num('seed', 0, -1e9, 1e9) | 0,
      quality:   this.getAttribute('quality') || 'med',
      fit:       this.getAttribute('fit') || 'cover',
    };
  }

  #reducedMotionActive() {
    const m = this.getAttribute('motion') || 'auto';
    if (m === 'reduce') return true;
    if (m === 'force') return false;
    return this.#reducedMotion;
  }

  #updateFallbackVisibility() {
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
    const css = getComputedStyle(this);
    const cssVar = parseFloat(css.getPropertyValue('--gl-wc-pixel-ratio'));
    const attr = parseFloat(this.getAttribute('pixel-ratio'));
    const dpr = Number.isFinite(cssVar)
      ? cssVar
      : Number.isFinite(attr)
        ? attr
        : Math.min((globalThis.devicePixelRatio || 1), 2);
    const [W, H] = resizeCanvas(this.#canvas, rect.width, rect.height, dpr);
    if (this.#rendererKind === 'webgl' && this.#ctx) {
      this.#ctx.viewport(0, 0, W, H);
    }
    try { this.#instance?.resize?.(W, H); } catch {}
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
    if (this.#shouldPlay()) {
      if (!this.#rafId) {
        this.#lastTickMs = performance.now();
        this.#rafId = requestAnimationFrame(this.#tick);
      }
    } else {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = 0;
      // If reduced motion is the reason we're stopped, ask the preset for one frame if it supports it.
      if (this.#instance && this.#reducedMotionActive() && this.#instance.staticFrame) {
        try { this.#instance.staticFrame(this.#readParams()); } catch (err) {
          this.#emit('gl-wc:error', { phase: 'runtime', error: err });
        }
      }
    }
  }

  #tick = (nowMs) => {
    this.#rafId = requestAnimationFrame(this.#tick);
    const params = this.#readParams();
    const dt = Math.min(0.1, (nowMs - this.#lastTickMs) / 1000);
    this.#lastTickMs = nowMs;
    this.#timeS += dt * params.speed;
    try {
      this.#instance?.frame?.(this.#timeS, params);
    } catch (err) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = 0;
      this.setAttribute('data-fallback', '');
      this.#emit('gl-wc:error', { phase: 'runtime', error: err });
    }
  };
}

if (!customElements.get('gl-wc')) {
  customElements.define('gl-wc', GlWc);
}

export { GlWc, listPresets };
export default GlWc;
