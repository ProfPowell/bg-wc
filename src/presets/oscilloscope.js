// oscilloscope — Lissajous and waveform traces drawn into an accumulation buffer
// with phosphor persistence: each frame the buffer fades toward bg and fresh
// bright traces are added on top (additive blend), giving glowing trails. The
// trace geometry is a single parametric buffer animated entirely in the vertex
// shader. `density` = trace count, `intensity` = glow brightness. The persistence
// buffer is per-frame state, so this is excluded from the visual still baseline.
//
// 8-bit fade-stall note (gl-wc-4vy): like any RGBA8 accumulate-and-fade, the
// blend toward u_bg stalls a few LSB shy of it. Measured: the whole face
// converges to ONE uniform color ~10 LSB above bg — no per-pixel ghosting
// (the traces sweep the full envelope), so it reads as ambient phosphor glow
// and needs no fix. Contrast matrix/mystify (canvas2d), where uneven
// excitation left visible ghost patterns and the fade is now an alpha erase.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';
import { mulberry32 } from '../util/pause.js';

const SAMPLES = 256;

const TRACE_VS = `
attribute float a_s;
uniform float u_time, u_ax, u_bx, u_phase, u_kind, u_amp;
void main() {
  float theta = a_s * 6.28318;
  vec2 p;
  if (u_kind < 0.5) {
    p = vec2(sin(u_ax * theta + u_time * 0.7 + u_phase), sin(u_bx * theta));
  } else {
    float y = 0.6 * sin(u_ax * theta + u_time) + 0.3 * sin(u_bx * theta * 2.0 + u_time * 1.3);
    p = vec2(a_s * 2.0 - 1.0, y);
  }
  gl_Position = vec4(p * u_amp, 0.0, 1.0);
}`;

const TRACE_FS = `precision mediump float;
uniform vec3 u_col;
void main() { gl_FragColor = vec4(u_col, 1.0); }`;

const FADE_FS = `precision mediump float;
uniform vec3 u_bg;
uniform float u_decay;
void main() { gl_FragColor = vec4(u_bg, u_decay); }`;

const SHOW_FS = `precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
void main() { gl_FragColor = texture2D(u_tex, v_uv); }`;

export function create({ gl, getColors }) {
  const traceProg = createProgram(gl, TRACE_VS, TRACE_FS);
  const fadeProg = createProgram(gl, QUAD_VS, FADE_FS);
  const showProg = createProgram(gl, QUAD_VS, SHOW_FS);
  const quad = fullscreenQuad(gl);

  const aS = gl.getAttribLocation(traceProg, 'a_s');
  const uTime = gl.getUniformLocation(traceProg, 'u_time');
  const uAx = gl.getUniformLocation(traceProg, 'u_ax');
  const uBx = gl.getUniformLocation(traceProg, 'u_bx');
  const uPhase = gl.getUniformLocation(traceProg, 'u_phase');
  const uKind = gl.getUniformLocation(traceProg, 'u_kind');
  const uAmp = gl.getUniformLocation(traceProg, 'u_amp');
  const uCol = gl.getUniformLocation(traceProg, 'u_col');
  const aFade = gl.getAttribLocation(fadeProg, 'a_pos');
  const uBg = gl.getUniformLocation(fadeProg, 'u_bg');
  const uDecay = gl.getUniformLocation(fadeProg, 'u_decay');
  const aShow = gl.getAttribLocation(showProg, 'a_pos');
  const uTex = gl.getUniformLocation(showProg, 'u_tex');

  // Parametric sample buffer 0..1.
  const sbuf = gl.createBuffer();
  const sdata = new Float32Array(SAMPLES);
  for (let i = 0; i < SAMPLES; i++) sdata[i] = i / (SAMPLES - 1);
  gl.bindBuffer(gl.ARRAY_BUFFER, sbuf);
  gl.bufferData(gl.ARRAY_BUFFER, sdata, gl.STATIC_DRAW);

  let w = 1;
  let h = 1;
  let tex = null;
  let fbo = null;
  let needClear = true;

  function ensureTarget() {
    if (tex) return;
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    needClear = true;
  }

  function draw(t, params) {
    ensureTarget();
    const c = getColors();
    const bg = c.bg || [0.02, 0.03, 0.04];
    const roles = [c.accent, c.primary, c.info, c.success].filter(Boolean);
    const intensity = params.intensity ?? 0.5;
    const density = params.density ?? 0.5;
    const traces = 2 + Math.round(density * 6);
    const rng = mulberry32(params.seed | 0 || 1);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, w, h);
    if (needClear) {
      gl.clearColor(bg[0], bg[1], bg[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      needClear = false;
    }

    // Fade the persistence toward bg.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(fadeProg);
    bindQuad(gl, quad, aFade);
    gl.uniform3f(uBg, bg[0], bg[1], bg[2]);
    gl.uniform1f(uDecay, 0.08 + 0.06 * (1 - intensity));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Add bright traces.
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(traceProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, sbuf);
    gl.enableVertexAttribArray(aS);
    gl.vertexAttribPointer(aS, 1, gl.FLOAT, false, 0, 0);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uAmp, 0.85);
    for (let i = 0; i < traces; i++) {
      const kind = rng() < 0.5 ? 0 : 1;
      gl.uniform1f(uKind, kind);
      gl.uniform1f(uAx, 1 + ((rng() * 4) | 0));
      gl.uniform1f(uBx, 1 + ((rng() * 4) | 0));
      gl.uniform1f(uPhase, rng() * 6.28);
      const col = roles[i % roles.length] || [0.3, 1, 0.5];
      const g = 0.4 + 0.6 * intensity;
      gl.uniform3f(uCol, col[0] * g, col[1] * g, col[2] * g);
      gl.drawArrays(gl.LINE_STRIP, 0, SAMPLES);
    }
    gl.disable(gl.BLEND);

    // Show the accumulation on screen.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.useProgram(showProg);
    bindQuad(gl, quad, aShow);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uTex, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) {
      w = Math.max(1, nw);
      h = Math.max(1, nh);
      if (tex) {
        gl.deleteTexture(tex);
        gl.deleteFramebuffer(fbo);
        tex = null;
        fbo = null;
      }
    },
    frame(t, params) {
      draw(t, params);
    },
    staticFrame(params) {
      // Build up a few frames of persistence for a non-empty still.
      for (let i = 0; i < 12; i++) draw(i * 0.1, params);
    },
    dispose() {
      try {
        gl.deleteProgram(traceProg);
        gl.deleteProgram(fadeProg);
        gl.deleteProgram(showProg);
        gl.deleteBuffer(quad);
        gl.deleteBuffer(sbuf);
        if (tex) gl.deleteTexture(tex);
        if (fbo) gl.deleteFramebuffer(fbo);
      } catch {}
    },
  };
}
