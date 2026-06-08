// lava — metaball lava lamp. Five soft point sources drift on Lissajous
// orbits, summed via inverse-square falloff. Two smoothstep thresholds
// pick the inner-core color and the outer-glow color over the bg.

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
  // Work in aspect-corrected space so blobs are round, not stretched.
  vec2 p = v_uv;
  p.x *= u_res.x / max(u_res.y, 1.0);

  // density controls blob radius/coupling, intensity controls total field
  float r = mix(0.10, 0.22, u_density);
  float scale = mix(0.05, 0.18, u_intensity);

  float field = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 c = vec2(
      0.5 * u_res.x / max(u_res.y, 1.0) + 0.32 * sin(u_time * (0.30 + fi * 0.06) + fi * 1.7),
      0.5                              + 0.28 * cos(u_time * (0.25 + fi * 0.05) + fi * 2.1)
    );
    float d = length(p - c);
    field += (r * r) / (d * d + 0.001);
  }
  field *= scale * 6.0;

  float outer = smoothstep(0.6, 1.1, field);
  float inner = smoothstep(1.2, 2.4, field);
  vec3 col = u_bg;
  col = mix(col, u_c2, outer);
  col = mix(col, u_c1, inner);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density', 'u_c1', 'u_c2', 'u_bg', 'u_res']);
