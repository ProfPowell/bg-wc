import { test, expect } from '@playwright/test';
import { listPresets } from '../src/presets/index.js';

// gl-wc-5cbv: WebGL1 fallback for the ping-pong simulations. Forcing WebGL1
// (getContext('webgl2') → null) must not leave slime-mold blank or frozen at
// any quality, and the shared helper must pick a float-renderable format on
// WebGL1 (via OES_texture_half_float / OES_texture_float) and validate the
// framebuffer it ends up with instead of silently rendering into nothing.

// Installed before any page script: every canvas refuses WebGL2.
const FORCE_GL1 = `
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if (type === 'webgl2') return null;
    return orig.call(this, type, ...rest);
  };
`;

const HARNESS = `
  async function mount(presetName, params) {
    const mod = await import('/src/presets/' + presetName + '.js');
    const { createGLContext } = await import('/src/renderer/webgl.js');
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    const gl = createGLContext(canvas);
    const buf = new Uint8Array(160 * 120 * 4);
    const pixels = () => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.readPixels(0, 0, 160, 120, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      return Array.from(buf);
    };
    const colors = {
      primary: [0.42, 0.25, 0.63, 1],
      accent: [0.85, 0.27, 0.94, 1],
      info: [0.15, 0.82, 0.65, 1],
      bg: [0.98, 0.98, 0.98, 1],
      fg: [0.1, 0.1, 0.1, 1],
      success: [0.2, 0.7, 0.3, 1],
      warning: [0.9, 0.7, 0.1, 1],
      error: [0.8, 0.2, 0.2, 1],
    };
    const host = { getAttribute: () => null, hasAttribute: () => false };
    const inst = mod.create({
      host, canvas, gl, c2d: null, css3d: null,
      getColors: () => colors, getParams: () => params, pxScale: 1,
    });
    inst.resize(160, 120);
    gl.viewport(0, 0, 160, 120);
    return { inst, gl, pixels };
  }
  // Number of distinct RGB values — 1 means a flat, blank field.
  const distinct = (px) => {
    const s = new Set();
    for (let i = 0; i < px.length; i += 4) s.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
    return s.size;
  };
  const eq = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
`;

test.describe('forced WebGL1', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(FORCE_GL1);
    await page.goto('/test/new-presets-page.html');
  });

  test('the override really yields a WebGL1 context', async ({ page }) => {
    const r = await page.evaluate(async () => {
      const { createGLContext } = await import('/src/renderer/webgl.js');
      const gl = createGLContext(document.createElement('canvas'));
      return { name: gl?.constructor?.name, version: gl?.getParameter(gl.VERSION) };
    });
    expect(r.name).toBe('WebGLRenderingContext');
    expect(r.version).toMatch(/WebGL 1\.0/);
  });

  for (const quality of ['low', 'med', 'high']) {
    test(`slime-mold renders and moves on WebGL1 at quality=${quality}`, async ({ page }) => {
      const r = await page.evaluate(
        async ([q, harness]) => {
          const { mount, distinct, eq } = new Function(
            harness + 'return { mount, distinct, eq };'
          )();
          const params = {
            palette: 'theme',
            intensity: 0.6,
            speed: 1,
            density: 0.5,
            seed: 7,
            quality: q,
            fit: 'cover',
            text: '',
          };
          const { inst, pixels } = await mount('slime-mold', params);
          // Half a second of simulation, then another: the trail must be a
          // real field (not a flat bg) and the agents must still be moving.
          for (let i = 0; i <= 30; i++) inst.frame(i / 60, params);
          const a = pixels();
          for (let i = 31; i <= 60; i++) inst.frame(i / 60, params);
          const b = pixels();
          inst.dispose();
          return { distinctA: distinct(a), moved: !eq(a, b) };
        },
        [quality, HARNESS]
      );
      expect(r.distinctA, 'the trail field must not be a flat bg color').toBeGreaterThan(8);
      expect(r.moved, 'agents must keep moving (not frozen by a byte-only fallback)').toBe(true);
    });
  }

  test('createPingPong picks a float-renderable format on WebGL1 and validates it', async ({
    page,
  }) => {
    const r = await page.evaluate(async () => {
      const { createGLContext, createPingPong } = await import('/src/renderer/webgl.js');
      const gl = createGLContext(document.createElement('canvas'));
      const pp = createPingPong(gl, 64, 64, { filter: gl.LINEAR, wrap: gl.REPEAT });
      pp.bindDst();
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      // A WebGL1 texture with REPEAT must be power-of-two; the helper must
      // refuse the combination loudly instead of handing back a sampler that
      // reads black.
      let npotError = null;
      try {
        createPingPong(gl, 96, 96, { wrap: gl.REPEAT });
      } catch (e) {
        npotError = String(e.message || e);
      }
      // NPOT with CLAMP_TO_EDGE (reaction-diffusion, spectrum) stays legal.
      const npotClamp = createPingPong(gl, 96, 72, { filter: gl.LINEAR });
      pp.dispose();
      npotClamp.dispose();
      return {
        float: pp.float,
        complete: status === gl.FRAMEBUFFER_COMPLETE,
        npotError,
        npotClampFloat: npotClamp.float,
      };
    });
    expect(r.float, 'WebGL1 with OES_texture_(half_)float must get a float target').toBe(true);
    expect(r.complete).toBe(true);
    expect(r.npotError).toMatch(/power-of-two/i);
    expect(r.npotClampFloat).toBe(true);
  });

  test('every webgl preset loads under WebGL1 without a bg-wc:error', async ({ page }) => {
    const names = listPresets()
      .filter((p) => p.renderer === 'webgl')
      .map((p) => p.name);
    const failed = await page.evaluate(async (list) => {
      const el = document.getElementById('wc');
      const bad = [];
      for (const name of list) {
        let err = null;
        const onErr = (e) => {
          err = `${e.detail.phase}: ${e.detail.error?.message || e.detail.error}`;
        };
        el.addEventListener('bg-wc:error', onErr);
        el.setAttribute('preset', name);
        await el.ready;
        el.removeEventListener('bg-wc:error', onErr);
        if (err || el.hasAttribute('data-fallback')) bad.push(`${name} (${err || 'fallback'})`);
      }
      return bad;
    }, names);
    expect(failed).toEqual([]);
  });
});
