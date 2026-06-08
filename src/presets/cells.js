// cells — animated Voronoi cellular pattern (Vanta CELLS vibe). Each cell
// center orbits a little; fill tints by distance to the nearest center,
// and cell borders (where the two nearest centers are equidistant) darken
// toward the background. 3x3 neighbor search — ~9 hashes per pixel.

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
uniform vec2  u_res;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

void main() {
  vec2 uv = v_uv;
  uv.x *= u_res.x / max(u_res.y, 1.0);   // keep cells round-ish
  float scale = mix(3.0, 8.0, u_density);
  vec2 p = uv * scale;
  vec2 i = floor(p), f = fract(p);

  float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash2(i + g);
      o = 0.5 + 0.42 * sin(u_time * 0.6 + 6.2831 * o);  // orbit the center
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; }
      else if (d < d2) { d2 = d; }
    }
  }

  float edge = d2 - d1;                       // ~0 along cell borders
  float border = smoothstep(0.0, 0.06, edge);
  vec3 fill = mix(u_c1, u_c2, clamp(d1, 0.0, 1.0));
  fill *= mix(0.7, 1.0, u_intensity);
  vec3 col = mix(u_bg, fill, border);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density', 'u_c1', 'u_c2', 'u_bg', 'u_res']);
