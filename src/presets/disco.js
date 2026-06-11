// disco — mirror-ball light. A grid of parallelogram light cells (the
// reflections a faceted ball throws) sweeps across a dark floor-and-wall
// space with perspective stretch toward the bottom; cells tint-cycle through
// theme roles and an occasional lens-flare ping blooms where a facet catches.
// `density` = facet count, `intensity` = beam brightness.

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
uniform vec2  u_res;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = v_uv;
  // Perspective stretch: cells grow toward the floor (lower third).
  float persp = 1.0 + smoothstep(0.45, 0.0, uv.y) * 1.6;
  vec2 p = vec2(uv.x * (u_res.x / max(u_res.y, 1.0)), uv.y * persp);

  // Skewed cell lattice sweeping sideways (parallelogram cells).
  float n = mix(7.0, 16.0, u_density);
  vec2 q = vec2(p.x * n + p.y * 2.2 + u_time * 0.9, p.y * n * 0.85);
  vec2 cell = floor(q);
  vec2 f = fract(q);

  float hcell = hash(cell);
  // Each facet flashes on its own slow cycle as the ball turns.
  float phase = fract(hcell + u_time * 0.11);
  float lit = smoothstep(0.0, 0.18, phase) * (1.0 - smoothstep(0.30, 0.55, phase));

  // Soft-edged parallelogram spot inside the cell.
  vec2 d = abs(f - 0.5);
  float spot = (1.0 - smoothstep(0.18, 0.46, d.x)) * (1.0 - smoothstep(0.16, 0.44, d.y));

  // Tint cycles through the three roles per facet.
  float pick = fract(hcell * 7.31 + u_time * 0.02);
  vec3 tint = pick < 0.33 ? u_c1 : (pick < 0.66 ? u_c2 : u_c3);

  vec3 col = u_bg * 0.32;
  // Ambient haze so the room reads.
  col += tint * 0.03;
  col += tint * spot * lit * (0.5 + 0.9 * u_intensity);

  // Occasional lens-flare ping: one facet blooms with a cross streak.
  float ping = step(0.997, hash(cell + floor(u_time * 0.5)));
  float cross = exp(-22.0 * d.y * d.y) + exp(-22.0 * d.x * d.x);
  col += tint * ping * lit * cross * (0.6 + 0.8 * u_intensity);

  // Floor sheen: brighten reflections low in frame.
  col *= 1.0 + smoothstep(0.45, 0.0, uv.y) * 0.35;

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
  'u_res',
]);
