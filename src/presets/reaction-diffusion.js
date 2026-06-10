// reaction-diffusion — Gray-Scott on ping-pong framebuffers. The U/V field is
// seeded from mulberry32 noise blobs, advanced by N sim steps per frame (scaled
// by `quality`), and shown through a bg→primary→accent ramp. `density` selects a
// curated feed/kill regime (spots / stripes / coral / waves) so every value
// looks good; `intensity` ramps display contrast. The sim runs at a capped grid
// resolution (LINEAR-upsampled) for steady perf on any canvas size. dispose()
// deletes both textures, both FBOs, and all three programs.

import {
  QUAD_VS,
  createProgram,
  fullscreenQuad,
  bindQuad,
  createPingPong,
} from '../renderer/webgl.js';
import { mulberry32 } from '../util/pause.js';

const PRECISION = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

const MAX_BLOBS = 24;

const SEED_FS = `${PRECISION}
varying vec2 v_uv;
uniform vec3 u_blobs[${MAX_BLOBS}];
uniform int u_nblobs;
void main() {
  float v = 0.0;
  for (int i = 0; i < ${MAX_BLOBS}; i++) {
    if (i >= u_nblobs) break;
    vec2 d = v_uv - u_blobs[i].xy;
    if (dot(d, d) < u_blobs[i].z * u_blobs[i].z) v = 0.5;
  }
  gl_FragColor = vec4(1.0, v, 0.0, 1.0);
}`;

const SIM_FS = `${PRECISION}
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_texel;
uniform float u_F;
uniform float u_K;
vec2 samp(vec2 o) { return texture2D(u_tex, v_uv + o * u_texel).xy; }
void main() {
  vec2 c = samp(vec2(0.0));
  vec2 lap = samp(vec2(-1.0, 0.0)) * 0.2 + samp(vec2(1.0, 0.0)) * 0.2
           + samp(vec2(0.0, -1.0)) * 0.2 + samp(vec2(0.0, 1.0)) * 0.2
           + samp(vec2(-1.0, -1.0)) * 0.05 + samp(vec2(1.0, -1.0)) * 0.05
           + samp(vec2(-1.0, 1.0)) * 0.05 + samp(vec2(1.0, 1.0)) * 0.05
           - c;
  float U = c.x, V = c.y;
  float uvv = U * V * V;
  float du = lap.x - uvv + u_F * (1.0 - U);
  float dv = 0.5 * lap.y + uvv - (u_F + u_K) * V;
  gl_FragColor = vec4(clamp(U + du, 0.0, 1.0), clamp(V + dv, 0.0, 1.0), 0.0, 1.0);
}`;

const DISPLAY_FS = `precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec3 u_bg, u_c1, u_c2;
uniform float u_intensity;
void main() {
  float v = texture2D(u_tex, v_uv).y;
  v = clamp((v - 0.5) * (1.0 + u_intensity * 2.5) + 0.5, 0.0, 1.0);
  vec3 col = mix(u_bg, u_c1, smoothstep(0.0, 0.5, v));
  col = mix(col, u_c2, smoothstep(0.5, 1.0, v));
  gl_FragColor = vec4(col, 1.0);
}`;

// Curated (feed, kill) regimes; density picks one so every slider value works.
const REGIMES = [
  [0.035, 0.065], // spots
  [0.022, 0.051], // stripes / maze
  [0.0545, 0.062], // coral
  [0.018, 0.051], // waves
];
const STEPS = { low: 6, med: 10, high: 16 };
const TARGET = { low: 128, med: 192, high: 256 };

function regimeFor(density) {
  const i = Math.min(REGIMES.length - 1, Math.max(0, Math.floor(density * REGIMES.length)));
  return REGIMES[i];
}

export function create({ gl, getColors }) {
  const seedProg = createProgram(gl, QUAD_VS, SEED_FS);
  const simProg = createProgram(gl, QUAD_VS, SIM_FS);
  const dispProg = createProgram(gl, QUAD_VS, DISPLAY_FS);
  const buf = fullscreenQuad(gl);

  const aSeed = gl.getAttribLocation(seedProg, 'a_pos');
  const aSim = gl.getAttribLocation(simProg, 'a_pos');
  const aDisp = gl.getAttribLocation(dispProg, 'a_pos');

  const uBlobs = gl.getUniformLocation(seedProg, 'u_blobs[0]');
  const uNblobs = gl.getUniformLocation(seedProg, 'u_nblobs');
  const uTexSim = gl.getUniformLocation(simProg, 'u_tex');
  const uTexel = gl.getUniformLocation(simProg, 'u_texel');
  const uF = gl.getUniformLocation(simProg, 'u_F');
  const uK = gl.getUniformLocation(simProg, 'u_K');
  const uTexDisp = gl.getUniformLocation(dispProg, 'u_tex');
  const uBg = gl.getUniformLocation(dispProg, 'u_bg');
  const uC1 = gl.getUniformLocation(dispProg, 'u_c1');
  const uC2 = gl.getUniformLocation(dispProg, 'u_c2');
  const uInt = gl.getUniformLocation(dispProg, 'u_intensity');

  let W = 1;
  let H = 1;
  let pp = null;
  let simW = 1;
  let simH = 1;
  let key = '';

  function ensureBuffers(params) {
    const q = params.quality || 'med';
    const target = TARGET[q] || TARGET.med;
    const scale = Math.min(1, target / Math.max(W, H));
    const nw = Math.max(2, Math.round(W * scale));
    const nh = Math.max(2, Math.round(H * scale));
    const k = `${q}|${nw}x${nh}`;
    if (pp && k === key) return false;
    if (pp) pp.dispose();
    simW = nw;
    simH = nh;
    pp = createPingPong(gl, simW, simH, { filter: gl.LINEAR });
    key = k;
    seed(params);
    return true;
  }

  function seed(params) {
    const rng = mulberry32(params.seed | 0 || 1);
    const n = 18;
    const data = new Float32Array(MAX_BLOBS * 3);
    for (let i = 0; i < n; i++) {
      data[i * 3] = 0.12 + rng() * 0.76;
      data[i * 3 + 1] = 0.12 + rng() * 0.76;
      data[i * 3 + 2] = 0.02 + rng() * 0.05;
    }
    pp.bindDst();
    gl.useProgram(seedProg);
    bindQuad(gl, buf, aSeed);
    gl.uniform3fv(uBlobs, data);
    gl.uniform1i(uNblobs, n);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    pp.swap();
  }

  function step(F, K) {
    pp.bindDst();
    gl.useProgram(simProg);
    bindQuad(gl, buf, aSim);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pp.src());
    gl.uniform1i(uTexSim, 0);
    gl.uniform2f(uTexel, 1 / simW, 1 / simH);
    gl.uniform1f(uF, F);
    gl.uniform1f(uK, K);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    pp.swap();
  }

  function display(params) {
    const c = getColors();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(dispProg);
    bindQuad(gl, buf, aDisp);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pp.src());
    gl.uniform1i(uTexDisp, 0);
    const bg = c.bg || [0, 0, 0];
    const c1 = c.primary || [0.3, 0.6, 1];
    const c2 = c.accent || [0.95, 0.4, 0.6];
    gl.uniform3f(uBg, bg[0], bg[1], bg[2]);
    gl.uniform3f(uC1, c1[0], c1[1], c1[2]);
    gl.uniform3f(uC2, c2[0], c2[1], c2[2]);
    gl.uniform1f(uInt, params.intensity ?? 0.5);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) {
      W = Math.max(1, nw);
      H = Math.max(1, nh);
      key = ''; // force buffer rebuild at the new size
    },
    frame(t, params) {
      ensureBuffers(params);
      const [F, K] = regimeFor(params.density ?? 0.5);
      const steps = STEPS[params.quality] || STEPS.med;
      for (let i = 0; i < steps; i++) step(F, K);
      display(params);
    },
    staticFrame(params) {
      ensureBuffers(params);
      const [F, K] = regimeFor(params.density ?? 0.5);
      seed(params); // fresh field, then warm up to a settled pattern
      for (let i = 0; i < 200; i++) step(F, K);
      display(params);
    },
    dispose() {
      try {
        if (pp) pp.dispose();
        gl.deleteProgram(seedProg);
        gl.deleteProgram(simProg);
        gl.deleteProgram(dispProg);
        gl.deleteBuffer(buf);
      } catch {}
    },
  };
}
