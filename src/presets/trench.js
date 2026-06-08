// trench — the Death Star trench run. A square corridor (Chebyshev "radius")
// recedes to a center vanishing point; cross-bars scroll toward the viewer
// and wall lines run along its length. The top opens to the void so it reads
// as an open trench, with a glowing exhaust port at the vanishing point.

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

float line(float v, float thick) {
  float f = min(fract(v), 1.0 - fract(v));
  return 1.0 - smoothstep(0.0, thick, f);
}

void main() {
  vec2 p = (v_uv - 0.5) * 2.0;
  p.x *= u_res.x / max(u_res.y, 1.0);

  float m = max(abs(p.x), abs(p.y));   // square radius → corridor cross-section
  float depth = 1.0 / max(m, 0.04);
  float z = depth + u_time * 2.2;

  // Cross-bars along the trench.
  float bars = line(z * 0.5, 0.05);
  // Wall lines: position along whichever wall this pixel lies on.
  float perim = (abs(p.x) > abs(p.y)) ? (p.y / abs(p.x)) : (p.x / abs(p.y));
  float walls = line(perim * mix(3.0, 7.0, u_density), 0.05);

  float grid = max(bars, walls);
  float fade = smoothstep(0.0, 0.5, m);              // dark at the vanishing point
  vec3 col = mix(u_bg, u_c1, grid * fade * mix(0.7, 1.0, u_intensity));

  // Open top: fade the ceiling wall toward bg (so it reads as sky/void).
  float ceiling = smoothstep(0.2, 0.6, p.y) * step(abs(p.x), p.y);
  col = mix(col, u_bg, ceiling * 0.85);

  // Exhaust port: a glowing target at the vanishing point.
  float port = smoothstep(0.16, 0.0, m);
  col += u_c2 * port * (0.5 + 0.5 * sin(u_time * 3.0)) * 0.8;

  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density', 'u_c1', 'u_c2', 'u_bg', 'u_res']);
