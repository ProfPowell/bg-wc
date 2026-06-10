// chladni — a vibrating Chladni plate. The nodal function
// |sin(nπx)sin(mπy) ± sin(mπx)sin(nπy)| is evaluated per pixel; "sand"
// accumulates (brightens) where it approaches zero — the nodal lines. The mode
// pair (n,m) cross-fades between integer pairs over time so the figure keeps
// reorganising. `density` pushes toward higher modes, `intensity` sharpens the
// sand. Sand in accent over a primary-tinted bg ground.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision highp float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3  u_c1;
uniform vec3  u_c2;
uniform vec3  u_bg;

const float PI = 3.14159265;

float chladni(vec2 p, float n, float m) {
  return sin(n * PI * p.x) * sin(m * PI * p.y)
       - sin(m * PI * p.x) * sin(n * PI * p.y);
}

void main() {
  vec2 p = v_uv;
  // Mode pairs grow with density; cross-fade between consecutive integer pairs.
  float lo = 2.0 + floor(u_density * 5.0);
  float phase = u_time * 0.12;
  float k = fract(phase);
  float base = floor(phase);
  // (n,m) walk a small lattice as the integer step increments.
  float n0 = lo + mod(base, 4.0);
  float m0 = lo + mod(base * 2.0 + 1.0, 5.0);
  float n1 = lo + mod(base + 1.0, 4.0);
  float m1 = lo + mod((base + 1.0) * 2.0 + 1.0, 5.0);

  float f0 = chladni(p, n0, m0);
  float f1 = chladni(p, n1, m1);
  float f = mix(f0, f1, smoothstep(0.0, 1.0, k));

  // Sand collects near nodes (|f| ~ 0).
  float thresh = mix(0.16, 0.05, u_intensity);
  float sand = 1.0 - smoothstep(0.0, thresh, abs(f));
  sand = pow(sand, 1.5);

  vec3 ground = mix(u_bg, u_c1, 0.12);
  vec3 col = mix(ground, u_c2, sand);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, [
  'u_time',
  'u_intensity',
  'u_density',
  'u_c1',
  'u_c2',
  'u_bg',
]);
