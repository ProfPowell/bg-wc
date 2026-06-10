// moire — two concentric ring fields, one slowly rotating and translating, whose
// interference produces drifting moiré bands in the fragment shader. Unlike
// op-art (hard black/white illusions), this uses a soft theme duotone with a
// gentle radial falloff. `density` = ring frequency, `intensity` = band contrast.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3  u_c1;
uniform vec3  u_c2;
uniform vec3  u_bg;
uniform vec2  u_res;

void main() {
  vec2 p = (v_uv - 0.5);
  p.x *= u_res.x / max(u_res.y, 1.0);

  float freq = mix(28.0, 90.0, u_density);

  // Field A: rings about a fixed centre.
  float r1 = length(p - vec2(-0.12, 0.04));
  float a = 0.5 + 0.5 * sin(r1 * freq);

  // Field B: rings about a slowly orbiting centre, in a rotated frame.
  float ang = u_time * 0.08;
  mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 cB = vec2(0.12 + 0.05 * sin(u_time * 0.13), -0.03 + 0.05 * cos(u_time * 0.11));
  float r2 = length(R * (p - cB));
  float b = 0.5 + 0.5 * sin(r2 * freq);

  // Interference → soft duotone (no hard edges).
  float m = a * b;
  m = clamp((m - 0.5) * (1.0 + u_intensity * 2.0) + 0.5, 0.0, 1.0);
  m = smoothstep(0.15, 0.85, m);

  // Radial falloff so the centre reads brighter than the corners.
  float fall = 1.0 - smoothstep(0.2, 0.9, length(p));

  vec3 duo = mix(u_c1, u_c2, m);
  vec3 col = mix(u_bg, duo, 0.35 + 0.65 * fall);
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
  'u_res',
]);
