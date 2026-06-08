// crt — a CRT picture tube: barrel curvature, scanlines, an RGB phosphor
// mask, a slow rolling brightness bar, and a vignette, over a drifting
// two-tone base. Scanline / mask frequencies are fixed (not res-derived)
// so they don't shimmer or alias.

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

vec2 barrel(vec2 uv) {
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + 0.18 * r2;       // outward distortion
  return c * 0.5 + 0.5;
}

void main() {
  vec2 uv = barrel(v_uv);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);   // outside the tube
    return;
  }

  // Base picture: drifting two-tone with a faint test-card wobble.
  float g = uv.y + sin(uv.x * 5.0 + u_time) * 0.06;
  vec3 base = mix(u_c1, u_c2, clamp(g, 0.0, 1.0));

  // Scanlines (fixed frequency).
  float lines = mix(150.0, 320.0, u_density);
  float scan = 0.82 + 0.18 * sin(uv.y * lines * 3.14159);

  // RGB phosphor mask — vertical subpixel stripes.
  float m = mod(floor(uv.x * 240.0), 3.0);
  vec3 mask = vec3(0.6);
  if (m < 0.5)      mask.r = 1.0;
  else if (m < 1.5) mask.g = 1.0;
  else              mask.b = 1.0;
  mask = mix(vec3(1.0), mask, mix(0.3, 0.9, u_intensity));

  // Slow rolling bright bar.
  float roll = smoothstep(0.06, 0.0, abs(fract(uv.y - u_time * 0.12) - 0.5) - 0.45);

  // Vignette.
  vec2 c = uv * 2.0 - 1.0;
  float vig = 1.0 - dot(c, c) * 0.35;

  vec3 col = base * scan * mask * vig + roll * 0.06;
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density', 'u_c1', 'u_c2', 'u_bg']);
