// nebula — deep-space gas. Layered fbm clouds drift at different parallax
// rates over a bg→primary→accent ramp, pricked with star sparks; occasionally
// a region brightens in a slow "ignition" flare and subsides. Distinct from
// aurora (banded curtains) and noise (abstract field): this reads as volume.
// `density` = cloud richness, `intensity` = glow strength.

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

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * vnoise(p);
    p = p * 2.07 + vec2(13.7, 7.1);
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = v_uv;
  p.x *= u_res.x / max(u_res.y, 1.0);
  float t = u_time * 0.03;

  // Two cloud layers at different drift rates + a fine wisp layer.
  float rich = mix(2.2, 4.2, u_density);
  float g1 = fbm(p * rich + vec2(t, -t * 0.6));
  float g2 = fbm(p * rich * 1.9 + vec2(-t * 1.6, t * 0.9) + 31.0);
  float wisp = fbm(p * rich * 3.6 + vec2(t * 2.4, t * 1.4) + 67.0);

  float gas = g1 * 0.6 + g2 * 0.3 + wisp * 0.18;
  gas = smoothstep(0.32, 0.95, gas);

  // Slow ignition flare: a drifting bright pocket that swells and subsides.
  vec2 fc = vec2(0.5 + 0.3 * sin(u_time * 0.05), 0.5 + 0.25 * cos(u_time * 0.041));
  fc.x *= u_res.x / max(u_res.y, 1.0);
  float swell = pow(max(0.0, sin(u_time * 0.09)), 6.0);
  float flare = exp(-9.0 * dot(p - fc, p - fc)) * swell;

  vec3 col = u_bg * 0.55;
  col = mix(col, u_c1, gas * (0.55 + 0.4 * u_intensity));
  col = mix(col, u_c2, smoothstep(0.55, 1.0, gas) * (0.4 + 0.5 * u_intensity));
  col += u_c2 * flare * (0.5 + 0.8 * u_intensity) * (0.4 + gas);

  // Star sparks: sparse bright hash points with a slow twinkle.
  vec2 cellp = floor(v_uv * u_res / 3.0);
  float star = step(0.9985, hash(cellp));
  float tw = 0.6 + 0.4 * sin(u_time * 2.0 + hash(cellp + 5.0) * 6.28);
  col += vec3(0.9, 0.95, 1.0) * star * tw * (0.4 + 0.6 * u_intensity) * (1.0 - gas * 0.6);

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
