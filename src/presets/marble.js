// marble — domain-warped marble veins. fbm warps the coordinates of a
// sinusoidal vein field, giving soft flowing marble / liquid-stone — a
// luxe, mallsoft-friendly drift. Atmospheric group.

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
  vec2 p = v_uv * mix(1.5, 4.0, u_density);
  float t = u_time * 0.05;

  float q1 = fbm(p + vec2(t, -t));
  float q2 = fbm(p + 2.0 * q1 + vec2(1.7, 9.2) + t);
  float vein = 0.5 + 0.5 * sin((p.x + p.y) * 2.5 + q2 * 6.0);
  vein = pow(vein, mix(1.0, 2.4, u_intensity));   // sharpen the veins

  vec3 col = mix(u_bg, u_c1, vein);
  col = mix(col, u_c2, smoothstep(0.55, 0.95, vein));
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density', 'u_c1', 'u_c2', 'u_bg']);
