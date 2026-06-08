// tempest — the Atari Tempest tube. A regular N-gon corridor seen down its
// axis: radial spokes at each vertex, polygonal rings receding to the
// center, each angular segment tinted from the theme wheel. Vector group.

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

const float TAU = 6.283185307;

float line(float v, float thick) {
  float f = min(fract(v), 1.0 - fract(v));
  return 1.0 - smoothstep(0.0, thick, f);
}

void main() {
  vec2 p = (v_uv - 0.5) * 2.0;
  p.x *= u_res.x / max(u_res.y, 1.0);

  float a = atan(p.y, p.x);
  float r = length(p);

  float n = floor(mix(6.0, 12.0, u_density));   // sides
  float seg = TAU / n;
  float am = mod(a, seg) - seg * 0.5;
  float m = r * cos(am);                          // polygon-normalized radius (1 at edge)

  float depth = 1.0 / max(m, 0.05);
  float z = depth + u_time * 2.0;

  float rings  = line(z * 0.6, 0.06);             // polygonal rings receding
  float spokes = line(a / seg, 0.045);            // radial claws at vertices
  float grid = max(rings, spokes);

  float fade = smoothstep(0.0, 0.5, m);           // vanish to bg at center

  // Tint per angular segment.
  float idx = mod(floor(a / seg), 3.0);
  vec3 segCol = idx < 0.5 ? u_c1 : (idx < 1.5 ? u_c2 : u_c3);

  vec3 col = mix(u_bg, segCol, grid * fade * mix(0.7, 1.0, u_intensity));

  // The active rim glows brighter (player's edge of the well).
  float rim = smoothstep(0.95, 1.02, m) * (1.0 - smoothstep(1.02, 1.12, m));
  col += segCol * rim * 0.6;

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
