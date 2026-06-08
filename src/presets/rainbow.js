// rainbow — flowing spectral gradient (HSV hue sweep), VFX-JS "rainbow"
// reimagined as a background. This preset is intentionally NOT theme-
// tinted: it owns its hue wheel. density = hue cycles across the width,
// intensity = wave distortion, speed = scroll.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;

vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(0.0, 1.0/3.0, 2.0/3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

void main() {
  vec2 uv = v_uv;
  float wave = sin(uv.x * 5.0 + u_time) * 0.12 * u_intensity
             + cos(uv.y * 4.0 - u_time * 0.7) * 0.08 * u_intensity;
  float cycles = mix(0.5, 2.5, u_density);
  float hue = fract(uv.x * cycles + uv.y * 0.25 + wave + u_time * 0.08);
  vec3 col = hsv2rgb(vec3(hue, 0.72, 0.96));
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density']);
