// fog — layered banks. Three octaves of scrolled value-noise fbm at
// different parallax speeds, mixed from the theme bg toward an fg-tinted
// mist, weighted toward the horizon. A pure function of u_time. density =
// bank thickness, intensity = mist opacity.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_res;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3 u_bg;
uniform vec3 u_fg;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int k = 0; k < 4; k++) {
    v += a * vnoise(p);
    p = p * 2.03 + vec2(17.0, 9.0);
    a *= 0.5;
  }
  return v;
}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(v_uv.x * aspect, v_uv.y);
  vec3 mist = mix(u_bg, u_fg, 0.35);

  // Three banks, far to near: smaller scale + slower drift in the distance.
  float far  = fbm(p * 2.2 + vec2(u_time * 0.012, 0.0));
  float mid  = fbm(p * 3.4 + vec2(u_time * 0.028, 3.7));
  float near = fbm(p * 5.2 + vec2(u_time * 0.05, 9.1));

  // Horizon weighting: banks thicken toward the bottom of the frame.
  float horizon = smoothstep(0.0, 1.0, 1.0 - v_uv.y);
  float thick = 0.35 + 0.45 * u_density;
  float bank = far * 0.45 + mid * 0.35 + near * 0.4;
  bank = smoothstep(1.0 - thick, 1.15, bank * (0.55 + 0.65 * horizon));

  vec3 col = mix(u_bg, mist, bank * (0.5 + 0.5 * u_intensity));
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, [
  'u_res',
  'u_time',
  'u_intensity',
  'u_density',
  'u_bg',
  'u_fg',
]);
