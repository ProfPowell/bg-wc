// benday — pop-art Ben-Day dots (Lichtenstein). Bold flat color regions
// split by a slowly drifting diagonal, overlaid with a coarse grid of large
// dots whose radius follows a soft gradient — the comic-shading look.
// Pop group.

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
uniform vec2  u_res;

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / max(u_res.y, 1.0);

  // Flat region split by a drifting diagonal.
  float split = uv.x + uv.y - 1.0 + 0.18 * sin(u_time * 0.3);
  vec3 base = split > 0.0 ? u_c1 : u_c2;

  // Coarse Ben-Day dot grid (aspect-corrected → round).
  float cell = mix(46.0, 16.0, u_density);
  vec2 g = fract(vec2(uv.x * aspect, uv.y) * cell) - 0.5;
  float d = length(g);

  // Dot radius from a soft moving gradient → comic shading.
  float shade = 0.5 + 0.42 * sin(uv.x * 3.0 + u_time * 0.5) * cos(uv.y * 2.0 - u_time * 0.3);
  float radius = mix(0.12, 0.46, clamp(shade, 0.0, 1.0)) * mix(0.8, 1.2, u_intensity);
  float dot = smoothstep(radius, radius - 0.07, d);

  vec3 col = mix(base, u_c3, dot);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density', 'u_c1', 'u_c2', 'u_c3', 'u_res']);
