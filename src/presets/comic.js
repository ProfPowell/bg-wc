// comic — pop-art action burst. Radial "impact" wedges spin out from a
// drifting focal point, with a couple of concentric shock rings. The classic
// comic-panel POW backdrop. Pop group.

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
uniform vec2  u_res;

const float TAU = 6.283185307;

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / max(u_res.y, 1.0);

  // Focal point drifts gently.
  vec2 focus = vec2(0.5 + 0.12 * sin(u_time * 0.25), 0.5 + 0.10 * cos(u_time * 0.2));
  vec2 p = (uv - focus) * vec2(aspect, 1.0);
  float a = atan(p.y, p.x);
  float r = length(p);

  // Radial wedges (the burst), slowly rotating.
  float n = floor(mix(14.0, 40.0, u_density));
  float wedge = step(0.5, fract(a / (TAU / n) + u_time * 0.04));
  vec3 col = mix(u_c1, u_c2, wedge);

  // A shock ring or two in the accent/info color.
  float ring = smoothstep(0.02, 0.0, abs(fract(r * 3.0 - u_time * 0.3) - 0.5) - 0.45);
  col = mix(col, u_c3, ring * mix(0.4, 0.9, u_intensity));

  // Bright pop at the focal core.
  col = mix(col, u_c3, smoothstep(0.10, 0.0, r));
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
  'u_res',
]);
