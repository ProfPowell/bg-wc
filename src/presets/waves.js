// waves — math sine bands. Four stacked color bands whose boundaries
// are sine-displaced versions of horizontal lines. Two superposed waves
// for organic motion.

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

void main() {
  vec2 uv = v_uv;
  float freq = mix(2.0, 8.0, u_density);
  float amp  = mix(0.04, 0.18, u_intensity);

  float wave = sin(uv.x * freq + u_time) * amp
             + sin(uv.x * freq * 1.7 - u_time * 0.6 + 1.3) * amp * 0.4;
  float y = uv.y + wave;

  float fade = 0.012;
  vec3 col = u_bg;
  col = mix(col, u_c1, smoothstep(0.25 - fade, 0.25 + fade, y));
  col = mix(col, u_c2, smoothstep(0.50 - fade, 0.50 + fade, y));
  col = mix(col, u_c3, smoothstep(0.75 - fade, 0.75 + fade, y));
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
