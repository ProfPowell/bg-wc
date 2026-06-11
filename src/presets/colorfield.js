// colorfield — colour-field abstraction. Two to three stacked soft-edged
// rectangles of colour float over a toned ground; edges are wide smoothsteps
// roughened with grain, and the fields breathe — edge positions and tints
// drift very slowly (the speed mapping is deliberately glacial; the work must
// feel still). `density` = band count/inset, `intensity` = saturation + edge
// softness contrast.

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

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// Soft rectangle mask with per-edge softness and grain-roughened border.
float field(vec2 uv, vec2 lo, vec2 hi, float soft, float g) {
  vec2 e = vec2(soft) * (1.0 + g);
  float m = smoothstep(lo.x - e.x, lo.x + e.x, uv.x) * (1.0 - smoothstep(hi.x - e.x, hi.x + e.x, uv.x));
  m *= smoothstep(lo.y - e.y, lo.y + e.y, uv.y) * (1.0 - smoothstep(hi.y - e.y, hi.y + e.y, uv.y));
  return m;
}

void main() {
  vec2 uv = v_uv;
  float t = u_time * 0.02; // glacial
  float grain = hash(uv * 240.0) * 0.5 + hash(uv * 91.0 + 7.0) * 0.5;
  float g = (grain - 0.5) * 0.35;

  // Toned ground: bg pulled slightly toward the first field colour.
  vec3 col = mix(u_bg, u_c1, 0.08 + 0.04 * u_intensity);

  float soft = mix(0.10, 0.035, u_intensity);
  float inset = mix(0.16, 0.08, u_density);
  float bands = 2.0 + step(0.5, u_density); // 2 or 3 stacked fields

  // Field 1: large upper block.
  float b1 = 0.52 + 0.05 * sin(t * 1.0);
  vec3 f1 = mix(u_c1, u_c2, 0.15 + 0.1 * sin(t * 0.7));
  col = mix(col, f1, field(uv, vec2(inset, inset), vec2(1.0 - inset, b1), soft, g) * (0.75 + 0.25 * u_intensity));

  // Field 2: lower block, slightly overlapping.
  float b2 = b1 - 0.03 + 0.04 * sin(t * 0.8 + 2.1);
  vec3 f2 = mix(u_c2, u_c3, 0.2 + 0.15 * sin(t * 0.5 + 1.0));
  col = mix(col, f2, field(uv, vec2(inset, b2), vec2(1.0 - inset, 1.0 - inset), soft * 1.4, g) * (0.7 + 0.25 * u_intensity));

  // Field 3 (high density): a thin horizon bar across the seam.
  if (bands > 2.5) {
    float y3 = b1 - 0.02 + 0.02 * sin(t * 1.3 + 4.0);
    col = mix(col, u_c3, field(uv, vec2(inset * 1.4, y3 - 0.035), vec2(1.0 - inset * 1.4, y3 + 0.035), soft * 0.7, g) * 0.8);
  }

  // Surface grain over everything.
  col += (grain - 0.5) * 0.045;
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
]);
