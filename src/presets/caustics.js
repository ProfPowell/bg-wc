// caustics — underwater light caustic patterns. Two layered cosine /
// sine fields warped by trig of each other, raised to a power to
// concentrate the bright veins. Two theme tokens stack as inner / outer.

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

void main() {
  vec2 p = v_uv * mix(2.5, 8.0, u_density);
  float t = u_time * 0.55;

  // Two warped sinusoidal fields
  vec2 q1 = vec2(
    p.x + sin(p.y * 0.7 + t) * 0.35,
    p.y + cos(p.x * 0.5 + t * 1.1) * 0.35
  );
  vec2 q2 = q1 * 1.35 + vec2(t * 0.2, -t * 0.15);

  float a = sin(q1.x) * cos(q1.y);
  float b = sin(q2.x * 0.9 + t) * cos(q2.y * 1.1 - t * 0.7);
  float c = pow(abs(a + b) * 0.5, 2.6);
  c = clamp(c * mix(1.5, 3.2, u_intensity), 0.0, 1.0);

  vec3 col = u_bg;
  col = mix(col, u_c1, c);
  col = mix(col, u_c2, c * c * 0.55);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density', 'u_c1', 'u_c2', 'u_bg']);
