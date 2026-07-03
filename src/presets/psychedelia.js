// psychedelia — 1960s liquid poster warp. Concentric contour bands around two
// drifting centers, domain-warped so the rings melt and breathe; bands cycle
// hard-edged through the three theme colors at full saturation (the vibrating
// Fillmore look). A pure function of u_time — stills are deterministic.
// density = ring frequency, intensity = warp depth.

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
  vec2 a = vec2(0.5 * aspect, 0.5) + 0.22 * vec2(sin(u_time * 0.11), cos(u_time * 0.13));
  vec2 b = vec2(0.5 * aspect, 0.5) - 0.22 * vec2(sin(u_time * 0.09 + 2.1), cos(u_time * 0.07 + 1.3));

  // Melt the domain before measuring distance.
  float warp = 0.05 + 0.12 * u_intensity;
  p.x += warp * sin(p.y * 7.0 + u_time * 0.5) * sin(p.y * 2.3 - u_time * 0.21);
  p.y += warp * sin(p.x * 6.0 - u_time * 0.4) * sin(p.x * 3.1 + u_time * 0.17);

  float da = length(p - a);
  float db = length(p - b);
  float field = 8.0 * da * db / (da + db); // rounded two-center contour metric

  float rings = 6.0 + u_density * 10.0;
  float band = fract(field * rings * 0.5 - u_time * 0.12);

  vec3 col = u_c1;
  if (band > 0.25) col = u_c2;
  if (band > 0.5) col = u_c3;
  if (band > 0.75) col = u_bg;
  // Thin ink line at each band edge keeps the poster crispness.
  float edge = smoothstep(0.0, 0.035, band) * smoothstep(0.0, 0.035, 1.0 - band);
  col *= 0.35 + 0.65 * edge;

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
