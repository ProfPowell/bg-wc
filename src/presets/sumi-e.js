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
    gl.uniform1f(u.seed, ((((params.seed | 0) % 997) + 997) % 997) / 31);
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
