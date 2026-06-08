// conic — a rotating angular (conic) gradient sweeping the three theme
// tints around the center. Designed to sit behind a card as a spotlight
// border/glow (give the card a slightly inset opaque background so only a
// rim of this shows), or full-bleed as a slow radar sweep / loader.
// Gradient group.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3  u_c1;
uniform vec3  u_c2;
uniform vec3  u_c3;
uniform vec3  u_bg;
uniform vec2  u_res;

const float TAU = 6.283185307;

void main() {
  vec2 p = v_uv - 0.5;
  p.x *= u_res.x / max(u_res.y, 1.0);
  float a = atan(p.y, p.x) + u_time * (0.3 + u_intensity * 0.9);
  // Normalize angle to 0..1 and (optionally) repeat to get multiple sweeps.
  float reps = floor(mix(1.0, 3.0, u_density));
  float h = fract((a / TAU) * reps);

  // Three-stop wheel c1 → c2 → c3 → c1.
  vec3 col;
  if (h < 1.0 / 3.0)      col = mix(u_c1, u_c2, h * 3.0);
  else if (h < 2.0 / 3.0) col = mix(u_c2, u_c3, (h - 1.0 / 3.0) * 3.0);
  else                    col = mix(u_c3, u_c1, (h - 2.0 / 3.0) * 3.0);

  // Slight radial falloff toward bg at the very center for a cleaner core.
  float r = length(p);
  col = mix(u_bg, col, smoothstep(0.0, 0.12, r));
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, [
  'u_time',
  'u_intensity',
  'u_density',
  'u_c1',
  'u_c2',
  'u_c3',
  'u_bg',
  'u_res',
]);
