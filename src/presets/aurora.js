// aurora — vertical curtains of light. Two stretched value-noise samples
// multiplied give the wispy structure; a vertical envelope keeps it in
// the upper sky; three theme tokens stack as glow layers.

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

void main() {
  vec2 p = v_uv;
  // Stretch horizontally so noise reads as vertical curtains
  float stretch = mix(2.0, 5.0, u_density);
  vec2 q = vec2(p.x * stretch + u_time * 0.10, p.y * 1.8 - u_time * 0.04);
  float n1 = vnoise(q);
  float n2 = vnoise(q * 2.2 + vec2(u_time * 0.20, -u_time * 0.06));
  // pow < 1 lifts the dark dips so the curtain never disappears entirely;
  // a baseline ribbon peaks across the mid-sky so there's always some glow.
  float ribbon = exp(-abs(p.y - 0.55) * 6.0) * 0.45;
  float curtain = (pow(n1 * n2, 0.9) * mix(2.8, 5.5, u_intensity)) + ribbon;

  // Vertical envelope — peak in the upper third
  float vmask = smoothstep(0.0, 0.55, p.y) * (1.0 - smoothstep(0.85, 1.0, p.y));
  curtain *= vmask;

  vec3 col = u_bg;
  col = mix(col, u_c1, smoothstep(0.0, 0.8, curtain));
  col = mix(col, u_c2, smoothstep(0.8, 1.6, curtain));
  col = mix(col, u_c3, smoothstep(1.6, 2.6, curtain));
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density', 'u_c1', 'u_c2', 'u_c3', 'u_bg']);
