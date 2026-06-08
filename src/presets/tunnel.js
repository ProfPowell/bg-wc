// tunnel — endless zoom into a tunnel. Polar coordinates around the
// center; inverse-radius gives depth (infinity at the center); time
// scrolls along that depth axis. Theme tokens stripe the walls.

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
uniform vec2  u_res;

void main() {
  vec2 p = (v_uv - 0.5) * 2.0;
  p.x *= u_res.x / max(u_res.y, 1.0);

  float r = length(p);
  float a = atan(p.y, p.x);

  // 1/r → infinity at center, near 0 at edge → far/near in tunnel coords
  float depth = 1.0 / max(r, 0.04);

  // Scroll along depth
  float zoom = mix(0.6, 3.0, u_intensity);
  float z = depth + u_time * zoom;

  // Ring banding along the tunnel + soft angular ribbing
  float bands = mix(2.0, 8.0, u_density);
  float ring  = sin(z * bands) * 0.5 + 0.5;
  float rib   = sin(a * 12.0) * 0.08;
  ring = clamp(ring + rib, 0.0, 1.0);

  // Vanishing-point fade — pure bg at the center
  float fade = smoothstep(0.0, 0.45, r);

  vec3 col = mix(u_c1, u_c2, ring);
  col = mix(u_bg, col, fade);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, [
  'u_time',
  'u_intensity',
  'u_density',
  'u_c1',
  'u_c2',
  'u_bg',
  'u_res',
]);
