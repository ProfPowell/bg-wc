// gyroid — raymarched gyroid (a triply periodic minimal surface), slowly
// rotating and drifting through the lattice, lit with two theme colours as
// key/rim against a bg fog. Fragment-only with a fixed march step count chosen
// by `quality` (low 32 / med 48 / high 72) and an early-exit so it stays cheap
// on mobile. `density` scales the lattice frequency; `intensity` mixes the
// surface colour between primary and accent.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const MAX_STEPS = 72;

const FS = `precision mediump float;
varying vec2 v_uv;
uniform float u_time, u_intensity, u_density;
uniform int u_steps;
uniform vec3 u_c1, u_c2, u_bg;
uniform vec2 u_res;

float freq() { return mix(1.6, 4.2, u_density); }

float gyroid(vec3 p) {
  return dot(sin(p), cos(p.yzx));
}

float map(vec3 p) {
  float f = freq();
  float g = gyroid(p * f + vec3(0.0, 0.0, u_time * 0.25));
  return abs(g) / f - 0.04; // thin shell of the surface
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.02, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)));
}

mat3 rotX(float a) {
  float c = cos(a), s = sin(a);
  return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
}
mat3 rotY(float a) {
  float c = cos(a), s = sin(a);
  return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
}

void main() {
  vec2 uv = v_uv - 0.5;
  uv.x *= u_res.x / max(u_res.y, 1.0);

  vec3 ro = vec3(0.0, 0.0, 3.0);
  vec3 rd = normalize(vec3(uv, -1.4));
  mat3 R = rotY(u_time * 0.15) * rotX(0.5 + u_time * 0.07);
  ro = R * ro;
  rd = R * rd;

  float t = 0.0;
  float hit = 0.0;
  vec3 p = ro;
  for (int i = 0; i < ${MAX_STEPS}; i++) {
    if (i >= u_steps) break;
    p = ro + rd * t;
    float d = map(p);
    if (d < 0.002) { hit = 1.0; break; }
    t += d;
    if (t > 14.0) break;
  }

  vec3 col = u_bg;
  if (hit > 0.5) {
    vec3 n = calcNormal(p);
    vec3 L = normalize(vec3(0.5, 0.8, 0.4));
    float key = max(dot(n, L), 0.0);
    float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
    vec3 base = mix(u_c1, u_c2, u_intensity);
    col = base * (0.22 + 0.78 * key) + u_c2 * rim * 0.8;
    float fog = smoothstep(4.0, 13.0, t);
    col = mix(col, u_bg, fog);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const STEPS = { low: 32, med: 48, high: 72 };

export function create({ gl, getColors }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const u = (n) => gl.getUniformLocation(program, n);
  const uTime = u('u_time');
  const uInt = u('u_intensity');
  const uDen = u('u_density');
  const uSteps = u('u_steps');
  const uC1 = u('u_c1');
  const uC2 = u('u_c2');
  const uBg = u('u_bg');
  const uRes = u('u_res');
  let w = 1;
  let h = 1;

  function draw(t, params) {
    const c = getColors();
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    bindQuad(gl, buf, aPos);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uInt, params.intensity ?? 0.5);
    gl.uniform1f(uDen, params.density ?? 0.5);
    gl.uniform1i(uSteps, STEPS[params.quality] || STEPS.med);
    const c1 = c.primary || [0.3, 0.6, 1];
    const c2 = c.accent || [0.95, 0.4, 0.6];
    const bg = c.bg || [0.03, 0.04, 0.06];
    gl.uniform3f(uC1, c1[0], c1[1], c1[2]);
    gl.uniform3f(uC2, c2[0], c2[1], c2[2]);
    gl.uniform3f(uBg, bg[0], bg[1], bg[2]);
    gl.uniform2f(uRes, w, h);
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
