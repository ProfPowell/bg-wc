// glitch — datamosh / RGB-shift glitch. A banded base between two theme
// colors, sampled three times with per-channel horizontal offsets, plus
// per-row displacement on a quantized time step. Inspired by VFX-JS's
// rgbGlitch / glitch effects, reworked as a generative background.

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

float hash(float x) { return fract(sin(x * 91.345) * 47453.2); }

vec3 base(vec2 uv) {
  // Diagonal stripes between the two tints over the bg.
  float b = step(0.5, fract(uv.y * 5.0 + uv.x * 0.4));
  vec3 stripe = mix(u_c1, u_c2, b);
  // Fade toward bg in horizontal gutters for some breathing room.
  float gut = smoothstep(0.0, 0.04, abs(fract(uv.y * 5.0) - 0.5));
  return mix(u_bg, stripe, gut);
}

void main() {
  vec2 uv = v_uv;
  float gt = floor(u_time * 11.0);          // quantized glitch frame
  float rows = mix(12.0, 44.0, u_density);
  float row = floor(uv.y * rows);
  float amt = mix(0.02, 0.20, u_intensity);

  // Some rows jump horizontally this frame.
  float r = hash(row + gt * 1.7);
  float shift = (r > 0.72) ? (hash(row * 2.3 + gt) - 0.5) * amt : 0.0;

  // Global RGB channel separation.
  float rgb = amt * 0.5 * (hash(gt) - 0.5);

  vec3 col = vec3(
    base(uv + vec2(shift + rgb, 0.0)).r,
    base(uv + vec2(shift,        0.0)).g,
    base(uv + vec2(shift - rgb, 0.0)).b
  );

  // Rare blown-out / blacked-out scanlines.
  float s = hash(row * 3.1 + gt);
  if (s > 0.95) col = mix(col, u_c1 + u_c2, 0.7);
  else if (s < 0.04) col *= 0.25;

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
]);
