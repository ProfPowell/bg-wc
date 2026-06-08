// noise — drifting fractal value noise, two-color tint.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3  u_fg;
uniform vec3  u_bg;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
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
  float s = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p *= 2.02; a *= 0.5;
  }
  return s;
}

void main() {
  // density controls noise scale; intensity controls contrast.
  float scale = mix(1.5, 8.0, u_density);
  vec2 p = v_uv * scale + vec2(u_time * 0.07, u_time * 0.04);
  float n = fbm(p);
  float k = mix(0.4, 1.6, u_intensity);
  n = clamp((n - 0.5) * k + 0.5, 0.0, 1.0);
  vec3 col = mix(u_bg, u_fg, n);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density', 'u_fg', 'u_bg']);
