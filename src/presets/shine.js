// shine — diagonal sheen sweep over a subtle base gradient (VFX-JS shine).
// Two highlight bands travel across the diagonal at offset phases, like
// light raking across glossy material. Cheap: a couple of smoothsteps.

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

float band(float diag, float phase, float width) {
  float s = fract(u_time * 0.12 + phase) * 1.6 - 0.3; // sweep position
  return 1.0 - smoothstep(0.0, width, abs(diag - s));
}

void main() {
  vec2 uv = v_uv;
  // Base: a quiet diagonal gradient between bg and the primary tint.
  float diag = uv.x * 0.6 + uv.y * 0.6;
  vec3 base = mix(u_bg, u_c1, clamp(diag, 0.0, 1.0) * 0.6 + 0.1);

  float width = mix(0.18, 0.06, u_density);
  float sheen = band(diag, 0.0, width)
              + band(diag, 0.45, width * 0.6) * 0.6;

  vec3 col = base + u_c2 * sheen * mix(0.25, 0.9, u_intensity);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density', 'u_c1', 'u_c2', 'u_bg']);
