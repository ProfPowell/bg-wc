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
  // Ink covers where fbm < cov; fbm clusters tightly around 0.5, so coverage
  // is steered just below the mean: ~15% ink at intensity 0 up to ~50% at 1.
  float cov = mix(0.42, 0.50, u_intensity);

  // Layer A: blobs, drifting right. Tight smoothstep = crisp stencil edges.
  vec2 offA = vec2(u_time * 0.012 + u_seed, sin(u_time * 0.05) * 0.004 + u_seed);
  float inkA = smoothstep(cov + 0.012, cov - 0.012, fbm3(uv * sc + offA));

  // Layer B: warped diagonal bars, misregistration wobble.
  vec2 offB = vec2(-u_time * 0.009, u_time * 0.006) + vec2(u_seed * 1.7)
            + vec2(0.013 * sin(u_time * 0.07), 0.011 * cos(u_time * 0.05));
  float warp = fbm3(uv * sc * 0.7 + offB) * 1.4;
  float bars = fract((uv.x + uv.y) * sc * 0.9 + warp);
  float bw = mix(0.08, 0.22, u_intensity);
  float inkB = smoothstep(bw, bw - 0.03, abs(bars - 0.5))
             * smoothstep(cov + 0.06, cov - 0.06, fbm3(uv * sc * 0.5 - offB));

  // Per-ink grain + dropouts (the riso texture).
  inkA *= mix(1.0, 0.72 + 0.28 * hash(px * 0.7 + vec2(1.3)), u_grain);
  inkB *= mix(1.0, 0.72 + 0.28 * hash(px * 0.7 + vec2(7.7)), u_grain);
  inkA *= step(0.04 * u_grain, hash(px * 0.31));
  inkB *= step(0.04 * u_grain, hash(px * 0.37 + vec2(3.0)));

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
    gl.uniform1f(u.seed, ((((params.seed | 0) % 997) + 997) % 997) / 31);
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
