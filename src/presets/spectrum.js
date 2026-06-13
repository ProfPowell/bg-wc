// spectrum — an instrument spectrum analyzer. A live FFT bar strip across the
// top feeds a scrolling time-frequency spectrogram (waterfall) below: each step
// the waterfall texture shifts down one row and a fresh magnitude row is written
// at the top, so history streams downward. The "signal" is a deterministic
// function of frequency and `t` (a few drifting formant peaks + broadband
// shimmer) — no audio, no Math.random. Magnitude maps through a
// bg→primary→accent→warning ramp. `density` = frequency bins, `intensity` =
// gain/contrast. Built on the shared ping-pong helper; dispose() frees both
// textures, both FBOs, and all programs.

import {
  QUAD_VS,
  createProgram,
  fullscreenQuad,
  bindQuad,
  createPingPong,
} from '../renderer/webgl.js';

const PREC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

// Shared signal model — used by the scroll pass (top row) and the bar strip.
const SPEC = `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float spec(float fx, float tm, float bins, float gain){
  float fq = (floor(fx * bins) + 0.5) / bins;   // quantise into bins
  float v = 0.0;
  for (int k = 0; k < 5; k++) {
    float kf = float(k);
    float center = 0.1 + 0.19 * kf + 0.06 * sin(tm * (0.3 + kf * 0.2) + kf);
    float amp = (0.75 - kf * 0.1) * (0.5 + 0.5 * sin(tm * (1.0 + kf * 0.7) + kf * 2.0));
    float d = (fq - center) / 0.05;
    v += amp * exp(-d * d);
  }
  v += 0.08 * hash(vec2(floor(fq * bins), floor(tm * 7.0)));
  return clamp(v * gain, 0.0, 1.0);
}`;

const SCROLL_FS = `${PREC}
${SPEC}
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_texel;
uniform float u_time, u_bins, u_gain;
void main(){
  if (v_uv.y < u_texel.y) {
    gl_FragColor = vec4(spec(v_uv.x, u_time, u_bins, u_gain), 0.0, 0.0, 1.0);
  } else {
    gl_FragColor = texture2D(u_tex, vec2(v_uv.x, v_uv.y - u_texel.y));
  }
}`;

const DISPLAY_FS = `${PREC}
${SPEC}
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_time, u_bins, u_gain, u_intensity;
uniform vec3 u_bg, u_c1, u_c2, u_c3;
vec3 ramp(float m){
  vec3 c = mix(u_bg, u_c1, smoothstep(0.0, 0.45, m));
  c = mix(c, u_c2, smoothstep(0.45, 0.78, m));
  c = mix(c, u_c3, smoothstep(0.78, 1.0, m));
  return c;
}
void main(){
  // v_uv.y is 0 at the bottom of the screen, 1 at the top.
  float strip = 0.22;                       // top band = live FFT bars
  if (v_uv.y > 1.0 - strip) {
    float m = spec(v_uv.x, u_time, u_bins, u_gain);
    float hy = (v_uv.y - (1.0 - strip)) / strip;   // 0 at strip base → 1 at top
    float lit = step(hy, m);                        // bar grows up from the base
    float seg = step(0.34, fract(hy * 20.0));       // LED segment gaps
    float colGap = step(0.14, fract(v_uv.x * u_bins));
    vec3 c = ramp(hy) * lit * seg * colGap;
    gl_FragColor = vec4(c + u_bg * (1.0 - lit * seg * colGap), 1.0);
  } else {
    // Waterfall: newest row sits just under the strip and history streams down.
    // Texture stores the newest row near v=0, so map screen-top → texture v=0.
    float texY = ((1.0 - strip) - v_uv.y) / (1.0 - strip);
    float m = texture2D(u_tex, vec2(v_uv.x, texY)).r;
    gl_FragColor = vec4(ramp(m * (0.8 + 0.4 * u_intensity)), 1.0);
  }
}`;

const TARGET = { low: 160, med: 256, high: 384 };
const STEPS = { low: 1, med: 2, high: 2 }; // scroll rows per frame

export function create({ gl, getColors }) {
  const scrollProg = createProgram(gl, QUAD_VS, SCROLL_FS);
  const dispProg = createProgram(gl, QUAD_VS, DISPLAY_FS);
  const buf = fullscreenQuad(gl);
  const aScroll = gl.getAttribLocation(scrollProg, 'a_pos');
  const aDisp = gl.getAttribLocation(dispProg, 'a_pos');
  const su = (n) => gl.getUniformLocation(scrollProg, n);
  const du = (n) => gl.getUniformLocation(dispProg, n);

  let W = 1;
  let H = 1;
  let pp = null;
  let sw = 1;
  let sh = 1;
  let key = '';
  let seeded = false;

  function ensure(params) {
    const q = params.quality || 'med';
    const target = TARGET[q] || TARGET.med;
    const scale = Math.min(1, target / Math.max(W, H));
    const nw = Math.max(2, Math.round(W * scale));
    const nh = Math.max(2, Math.round(H * scale));
    const k = `${q}|${nw}x${nh}`;
    if (pp && k === key) return;
    if (pp) pp.dispose();
    sw = nw;
    sh = nh;
    pp = createPingPong(gl, sw, sh, { filter: gl.LINEAR });
    key = k;
    seeded = false;
  }

  function bins(params) {
    return 16 + Math.round((params.density ?? 0.5) * 48);
  }
  function gain(params) {
    return 0.8 + (params.intensity ?? 0.5) * 0.8;
  }

  function scroll(t, params) {
    pp.bindDst();
    gl.useProgram(scrollProg);
    bindQuad(gl, buf, aScroll);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pp.src());
    gl.uniform1i(su('u_tex'), 0);
    gl.uniform2f(su('u_texel'), 1 / sw, 1 / sh);
    gl.uniform1f(su('u_time'), t);
    gl.uniform1f(su('u_bins'), bins(params));
    gl.uniform1f(su('u_gain'), gain(params));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    pp.swap();
  }

  function display(t, params) {
    const c = getColors();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(dispProg);
    bindQuad(gl, buf, aDisp);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pp.src());
    gl.uniform1i(du('u_tex'), 0);
    gl.uniform1f(du('u_time'), t);
    gl.uniform1f(du('u_bins'), bins(params));
    gl.uniform1f(du('u_gain'), gain(params));
    gl.uniform1f(du('u_intensity'), params.intensity ?? 0.5);
    const bg = c.bg || [0.03, 0.03, 0.05];
    const c1 = c.primary || [0.2, 0.35, 0.7];
    const c2 = c.accent || [0.85, 0.3, 0.5];
    const c3 = c.warning || [0.95, 0.8, 0.3];
    gl.uniform3f(du('u_bg'), bg[0], bg[1], bg[2]);
    gl.uniform3f(du('u_c1'), c1[0], c1[1], c1[2]);
    gl.uniform3f(du('u_c2'), c2[0], c2[1], c2[2]);
    gl.uniform3f(du('u_c3'), c3[0], c3[1], c3[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function warm(params) {
    // Pre-fill the waterfall so the first visible frame already streams.
    for (let i = 0; i < sh; i++) scroll((i / sh) * 4, params);
    seeded = true;
  }

  return {
    resize(nw, nh) {
      W = Math.max(1, nw);
      H = Math.max(1, nh);
      key = '';
    },
    frame(t, params) {
      ensure(params);
      if (!seeded) warm(params);
      const steps = STEPS[params.quality] || STEPS.med;
      for (let i = 0; i < steps; i++) scroll(t, params);
      display(t, params);
    },
    staticFrame(params) {
      ensure(params);
      warm(params);
      display(2.0, params);
    },
    dispose() {
      try {
        if (pp) pp.dispose();
        gl.deleteProgram(scrollProg);
        gl.deleteProgram(dispProg);
        gl.deleteBuffer(buf);
      } catch {}
    },
  };
}
