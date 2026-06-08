// mesh-gradient — Stripe-style soft blobs over a base color, three theme tints.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform vec3  u_c1;
uniform vec3  u_c2;
uniform vec3  u_c3;
uniform vec3  u_bg;

// Soft falloff weight for blob at center c with radius r at uv p.
float blob(vec2 p, vec2 c, float r) {
  float d = length(p - c);
  return 1.0 - smoothstep(0.0, r, d);
}

void main() {
  vec2 p = v_uv;
  float t = u_time * 0.35;
  vec2 c1 = vec2(0.35 + 0.18 * sin(t),         0.40 + 0.25 * cos(t * 0.7));
  vec2 c2 = vec2(0.70 + 0.20 * cos(t * 1.1),   0.30 + 0.18 * sin(t * 1.3));
  vec2 c3 = vec2(0.50 + 0.30 * sin(t * 0.9),   0.75 + 0.18 * cos(t * 0.8));

  float r = mix(0.45, 0.85, u_intensity);
  float w1 = blob(p, c1, r);
  float w2 = blob(p, c2, r);
  float w3 = blob(p, c3, r);
  float wB = 0.2; // base presence

  float total = w1 + w2 + w3 + wB;
  vec3 col = (u_c1 * w1 + u_c2 * w2 + u_c3 * w3 + u_bg * wB) / total;

  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_c1', 'u_c2', 'u_c3', 'u_bg']);
