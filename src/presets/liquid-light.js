// liquid-light — the Joshua Light Show oil projection. Three saturated dye
// blobs swirl on a domain-warped field; where dyes overlap they mix toward
// white the way projected light does (screen blending). A pure function of
// u_time. density = blob scale, intensity = dye saturation.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_res;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_bg;

// One dye pool: a soft blob field around a moving center.
float dye(vec2 p, vec2 c, float r) {
  float d = length(p - c);
  return smoothstep(r, r * 0.25, d);
}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(v_uv.x * aspect, v_uv.y);

  // The projectionist nudges the slide: slow domain warp.
  p.x += 0.06 * sin(p.y * 5.0 + u_time * 0.31);
  p.y += 0.06 * sin(p.x * 4.0 - u_time * 0.23);

  float r = 0.34 + 0.18 * u_density;
  vec2 c1 = vec2(0.5 * aspect, 0.5) + 0.24 * vec2(sin(u_time * 0.17), cos(u_time * 0.13));
  vec2 c2 = vec2(0.5 * aspect, 0.5) + 0.27 * vec2(sin(u_time * 0.11 + 2.4), cos(u_time * 0.19 + 1.1));
  vec2 c3 = vec2(0.5 * aspect, 0.5) + 0.21 * vec2(sin(u_time * 0.23 + 4.2), cos(u_time * 0.09 + 3.3));

  float sat = 0.55 + 0.45 * u_intensity;
  float a1 = dye(p, c1, r);
  float a2 = dye(p, c2, r * 1.1);
  float a3 = dye(p, c3, r * 0.9);

  // gl-wc-0eq6 lesson: screen can only lighten, so over a light ground the
  // projection vanished. Pick the physics by ground luminance — projected
  // light (screen) on dark rooms, dye-as-pigment (multiply) on light paper.
  float lum = 0.2126 * u_bg.r + 0.7152 * u_bg.g + 0.0722 * u_bg.b;
  vec3 col = u_bg;
  if (lum < 0.5) {
    col = 1.0 - (1.0 - col) * (1.0 - u_c1 * sat * a1);
    col = 1.0 - (1.0 - col) * (1.0 - u_c2 * sat * a2);
    col = 1.0 - (1.0 - col) * (1.0 - u_c3 * sat * a3);
  } else {
    col *= mix(vec3(1.0), u_c1, sat * a1);
    col *= mix(vec3(1.0), u_c2, sat * a2);
    col *= mix(vec3(1.0), u_c3, sat * a3);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, [
  'u_res',
  'u_time',
  'u_intensity',
  'u_density',
  'u_c1',
  'u_c2',
  'u_c3',
  'u_bg',
]);
