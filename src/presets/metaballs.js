// metaballs — demoscene lava lamp. Sum of inverse-square fields from up to 8
// blobs orbiting the center on incommensurate periods, thresholded at a soft
// iso edge and banded through three theme colors over the theme bg. A pure
// function of u_time, so stills are deterministic. density = blob count,
// intensity = blob size. `seed` is a no-op here: makeShaderPreset's closed
// uniform vocabulary has no u_seed, and the orbits use fixed incommensurate
// periods rather than seeded randomness.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_res;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_bg;

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(v_uv.x * aspect, v_uv.y);
  vec2 mid = vec2(0.5 * aspect, 0.5);
  float count = 4.0 + floor(u_density * 4.0); // 4..8 blobs
  float field = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    if (fi >= count) break;
    vec2 c = mid + vec2(
      sin(u_time * (0.21 + fi * 0.053) + fi * 1.7),
      cos(u_time * (0.17 + fi * 0.041) + fi * 2.9)
    ) * (0.14 + 0.17 * fract(fi * 0.618034));
    float r = 0.09 + 0.05 * fract(fi * 0.7548) + 0.05 * u_intensity;
    vec2 d = p - c;
    field += r * r / (dot(d, d) + 1e-4);
  }
  vec3 col = mix(u_bg, u_c1, smoothstep(0.85, 1.15, field));
  col = mix(col, u_c2, smoothstep(1.6, 2.8, field));
  col = mix(col, u_c3, smoothstep(3.2, 5.2, field));
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, [
  'u_res',
  'u_time',
  'u_intensity',
  'u_density',
  'u_c1',
  'u_c2',
  'u_c3',
  'u_bg',
]);
