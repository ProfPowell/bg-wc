// warp — displacement-warped grid pattern over a theme-color base.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3  u_c1;
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
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.0; a *= 0.5; }
  return s;
}

void main() {
  vec2 uv = v_uv;
  // Warp the uv coordinates via fbm-derived offset.
  vec2 q = vec2(fbm(uv * 2.0 + u_time * 0.15),
                fbm(uv * 2.0 - u_time * 0.13 + 5.2));
  float amp = mix(0.05, 0.35, u_intensity);
  vec2 wuv = uv + (q - 0.5) * amp;

  // Grid pattern at density-controlled frequency.
  float freq = mix(6.0, 40.0, u_density);
  vec2 g = abs(fract(wuv * freq) - 0.5);
  float line = smoothstep(0.48, 0.5, max(g.x, g.y));

  vec3 col = mix(u_bg, u_c1, line);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density', 'u_c1', 'u_bg']);
