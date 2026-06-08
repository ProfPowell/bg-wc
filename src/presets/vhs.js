// vhs — 80s analog video distortion. A soft two-color "footage" field is
// run through tape wobble (horizontal displacement), chroma bleed (RGB
// horizontal separation, smeary), a scrolling tracking-noise band,
// head-switching static at the bottom edge, and gentle scanlines.
// Distinct from `glitch`, which is digital datamosh.

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

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Base "footage": a soft drifting two-tone field.
vec3 footage(vec2 uv) {
  float g = sin(uv.y * 4.0 + u_time * 0.3) * 0.5 + 0.5;
  float n = vnoise(uv * 3.0 + vec2(u_time * 0.1, 0.0));
  vec3 col = mix(u_c1, u_c2, g);
  return mix(col, u_bg, n * 0.3);
}

void main() {
  vec2 uv = v_uv;
  float amt = mix(0.01, 0.06, u_intensity);

  // Tape wobble — fine jitter + slow noisy drift, per row.
  float wobble = sin(uv.y * 120.0 + u_time * 5.0) * 0.0015
               + (vnoise(vec2(uv.y * 8.0, u_time * 2.0)) - 0.5) * amt;
  uv.x += wobble;

  // Chroma bleed: RGB sampled with horizontal offset.
  float bleed = amt * 1.4 + 0.003;
  vec3 col;
  col.r = footage(uv + vec2(bleed, 0.0)).r;
  col.g = footage(uv).g;
  col.b = footage(uv - vec2(bleed, 0.0)).b;

  // Scrolling tracking-noise band.
  float band = fract(uv.y - u_time * 0.15);
  float track = step(1.0 - mix(0.04, 0.12, u_density), band)
              * vnoise(vec2(uv.x * 200.0, u_time * 30.0));
  col += track * 0.45;

  // Head-switching static at the very bottom.
  float head = smoothstep(0.07, 0.0, v_uv.y);
  float st = vnoise(vec2(v_uv.x * 180.0, u_time * 40.0));
  col = mix(col, vec3(st), head * 0.75);

  // Scanlines (moderate frequency to avoid shimmer).
  col *= 0.86 + 0.14 * sin(v_uv.y * 220.0);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density', 'u_c1', 'u_c2', 'u_bg']);
