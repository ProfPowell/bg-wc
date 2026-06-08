// copperbars — Amiga demoscene copper bars: horizontal metallic bands that
// bob vertically on offset sine phases, each with a bright specular center
// fading to dark edges. Set against a starfield-free flat background.

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

vec3 barTint(float k) {
  // Cycle through the three theme tints across the stack of bars.
  if (k < 0.5) return mix(u_c1, u_c2, k * 2.0);
  return mix(u_c2, u_c3, (k - 0.5) * 2.0);
}

void main() {
  vec2 uv = v_uv;
  float bars = floor(mix(4.0, 8.0, u_density));
  float thick = mix(0.10, 0.05, u_density);   // half-thickness of each bar
  float speed = 0.5;

  vec3 col = u_bg;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= bars) break;
    float fi = float(i);
    float phase = fi * 1.3;
    float center = 0.5 + 0.42 * sin(u_time * speed + phase);
    float dist = abs(uv.y - center);
    if (dist > thick) continue;
    float t = dist / thick;                    // 0 center → 1 edge
    vec3 tint = barTint(fi / max(bars - 1.0, 1.0));
    // Metallic: bright specular core, darkening to the rim.
    float shade = (1.0 - t * t);
    vec3 barCol = tint * (0.4 + 0.6 * shade) + vec3(shade * shade) * 0.5 * u_intensity;
    col = mix(col, barCol, smoothstep(1.0, 0.85, t));
  }

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
