// kaleidoscope — polar angle folded into N mirrored segments, then a
// rotating trig pattern mapped through three theme tokens. The
// psychedelic / symmetric piece of the catalog.

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

const float PI = 3.141592653589793;

void main() {
  vec2 p = (v_uv - 0.5);
  p.x *= u_res.x / max(u_res.y, 1.0);

  float r = length(p);
  float a = atan(p.y, p.x);

  // Fold angle into seg mirrored wedges + slow global spin.
  float seg = floor(mix(3.0, 12.0, u_density));
  float wedge = (2.0 * PI) / seg;
  a += u_time * 0.15;
  a = abs(mod(a, wedge) - wedge * 0.5);

  vec2 q = vec2(cos(a), sin(a)) * r;
  float t = u_time * (0.4 + u_intensity * 0.8);
  float pat = sin(q.x * 12.0 + t)
            + cos(q.y * 12.0 - t)
            + sin(r * 16.0 - t * 1.7);
  pat = pat / 3.0 * 0.5 + 0.5;

  vec3 col;
  if (pat < 0.5) col = mix(u_c1, u_c2, pat * 2.0);
  else           col = mix(u_c2, u_c3, (pat - 0.5) * 2.0);
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
  'u_res',
]);
