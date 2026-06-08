// topology — animated topographic contour lines (Vanta TOPOLOGY vibe).
// An fbm height field drifts; contour lines are drawn where the field
// crosses evenly spaced levels. A faint elevation tint sits underneath.
// Uses a fixed field-space line width (no derivative extension needed).

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

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.0; a *= 0.5; }
  return s;
}

void main() {
  vec2 uv = v_uv;
  float scale = mix(2.0, 5.0, u_density);
  float h = fbm(uv * scale + vec2(u_time * 0.05, u_time * 0.03));

  float levels = mix(7.0, 18.0, u_density);
  float band = fract(h * levels);
  float edge = min(band, 1.0 - band);
  float lw = mix(0.16, 0.08, u_density);   // line half-width in band space
  float line = (1.0 - smoothstep(0.0, lw, edge)) * mix(0.55, 1.0, u_intensity);

  vec3 col = mix(u_bg, u_c1, h * 0.35);
  col = mix(col, u_c2, line);
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
