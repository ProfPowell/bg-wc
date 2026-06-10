// damask — a procedural damask tile. A flourish built from mirrored petal /
// teardrop SDFs is repeated across the field with 4-fold mirror symmetry, and a
// slow diagonal specular sheen sweeps over it (the band logic from shine.js).
// `density` = tile repeat count, `intensity` = motif contrast + sheen strength.
// Motif in primary, ground in bg, sheen tinted with accent.

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

// Soft ellipse field: <0 inside, >0 outside.
float ell(vec2 q, vec2 c, vec2 r) {
  return length((q - c) / r) - 1.0;
}

void main() {
  float reps = mix(2.0, 6.0, u_density);
  vec2 cell = fract(v_uv * reps) - 0.5;   // [-0.5, 0.5] per tile
  vec2 p = abs(cell);                      // fold into one quadrant (4-fold mirror)

  // Damask flourish: central teardrop + side curl + a couple of accents.
  float d = ell(p, vec2(0.0, 0.10), vec2(0.085, 0.26));      // central spine
  d = min(d, ell(p, vec2(0.20, 0.24), vec2(0.13, 0.075)));   // side scroll
  d = min(d, ell(p, vec2(0.30, 0.07), vec2(0.06, 0.05)));    // outer bud
  d = min(d, ell(p, vec2(0.06, 0.40), vec2(0.05, 0.10)));    // inner leaf
  d = min(d, ell(p, vec2(0.0, 0.44), vec2(0.03, 0.05)));     // tip dot

  float edge = mix(0.05, 0.015, u_intensity);
  float motif = 1.0 - smoothstep(-edge, edge, d);

  vec3 col = mix(u_bg, u_c1, motif);

  // Diagonal sheen sweep (shine.js band), page-wide across the tiles.
  float diag = v_uv.x * 0.6 + v_uv.y * 0.6;
  float s = fract(u_time * 0.09) * 1.6 - 0.3;
  float width = mix(0.20, 0.08, u_density);
  float sheen = 1.0 - smoothstep(0.0, width, abs(diag - s));
  col += u_c2 * sheen * mix(0.15, 0.6, u_intensity) * (0.35 + 0.65 * motif);

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
