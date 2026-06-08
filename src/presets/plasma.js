// plasma — classic demoscene plasma. Sum of four sines yields a smooth
// scalar field; the field is mapped through three theme tokens with two
// smoothsteps. Cheap on the GPU (just 4 sins per pixel + a length).

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

void main() {
  vec2 p = (v_uv - 0.5) * mix(3.0, 9.0, u_density);
  float t = u_time * mix(0.3, 1.2, u_intensity);

  float v = sin(p.x + t)
          + sin((p.y + t) * 0.85)
          + sin((p.x + p.y + t) * 0.45)
          + sin(length(p) - t);
  v = v * 0.25 * 0.5 + 0.5; // normalize to roughly 0..1

  vec3 col;
  if (v < 0.5) {
    col = mix(u_c1, u_c2, v * 2.0);
  } else {
    col = mix(u_c2, u_c3, (v - 0.5) * 2.0);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density', 'u_c1', 'u_c2', 'u_c3']);
