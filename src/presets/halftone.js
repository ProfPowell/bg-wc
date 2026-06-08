// halftone — proper rotated dot-grid halftone (not the hash dither). An
// animated gradient drives dot radius on a 45-degree-rotated grid;
// aspect-corrected so the dots stay round. Two-tone: primary on bg.
// Inspired by VFX-JS's halftone effect.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3  u_c1;
uniform vec3  u_bg;
uniform vec2  u_res;

void main() {
  vec2 uv = v_uv;
  vec2 aspect = vec2(u_res.x / max(u_res.y, 1.0), 1.0);

  // Source tone — a slow moving gradient field, 0..1.
  float val = 0.5
            + 0.30 * sin(uv.x * 3.0 + u_time)
            + 0.20 * cos(uv.y * 2.5 - u_time * 0.6);
  val = clamp(val, 0.0, 1.0);

  // 45-degree rotated, aspect-corrected dot grid.
  float cells = mix(18.0, 70.0, u_density);
  vec2 p = uv * aspect * cells;
  float c = 0.70710678, s = 0.70710678;
  vec2 rp = mat2(c, -s, s, c) * p;
  vec2 cell = fract(rp) - 0.5;
  float d = length(cell);

  // Dot radius grows with the source tone.
  float radius = val * 0.62 * mix(0.7, 1.25, u_intensity);
  float dot = smoothstep(radius, radius - 0.06, d);

  vec3 col = mix(u_bg, u_c1, dot);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, [
  'u_time',
  'u_intensity',
  'u_density',
  'u_c1',
  'u_bg',
  'u_res',
]);
