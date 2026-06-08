// dither — animated gradient between two theme colors, ordered-dither look.
// WebGL2 / WebGL1 compatible (GLSL ES 1.00 syntax).

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3  u_c1;
uniform vec3  u_c2;
uniform vec2  u_res;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = v_uv;
  // Animated gradient axis — wobbles around vertical.
  float wave = sin(uv.x * 3.0 + u_time * 0.7) * 0.18;
  float g = clamp(uv.y * 0.85 + wave + sin(u_time * 0.5) * 0.15, 0.0, 1.0);

  // Dither cell size: density 0 → coarse 12px, density 1 → fine 1px.
  float cell = mix(12.0, 1.0, u_density);
  vec2 cellCoord = floor(gl_FragCoord.xy / cell);
  float d = hash(cellCoord);

  // Intensity scales how much dither perturbs the gradient threshold.
  float threshold = mix(0.5, d, clamp(u_intensity, 0.0, 1.0));
  float mask = step(threshold, g);
  vec3 col = mix(u_c1, u_c2, mask);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density', 'u_c1', 'u_c2', 'u_res']);
