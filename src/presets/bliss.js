// bliss — the Windows XP desktop: a blue gradient sky with soft drifting
// fbm clouds over rolling green hills. Sky reads from --color-info → bg,
// hills from --color-primary. Retro group.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3  u_c1;   // hills (primary, green)
uniform vec3  u_c3;   // sky (info, blue)
uniform vec3  u_bg;   // sky toward the horizon / light

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.0; a *= 0.5; }
  return s;
}

void main() {
  vec2 uv = v_uv;

  // Rolling hill silhouette (a couple of sines).
  float hill = 0.34
             + 0.05 * sin(uv.x * 6.0 + 1.0)
             + 0.03 * sin(uv.x * 13.0 - 0.5);

  if (uv.y > hill) {
    // Sky: bright near the horizon, deep blue up top.
    float sky = (uv.y - hill) / (1.0 - hill);
    vec3 col = mix(mix(u_bg, u_c3, 0.4), u_c3, sky);
    // Drifting clouds.
    float scale = mix(2.0, 4.0, u_density);
    float cl = fbm(vec2(uv.x * scale + u_time * 0.03, uv.y * scale));
    float clouds = smoothstep(0.55, 0.85, cl) * (1.0 - sky * 0.4);
    col = mix(col, vec3(1.0), clouds * mix(0.4, 0.8, u_intensity));
    gl_FragColor = vec4(col, 1.0);
  } else {
    // Hills: lit toward the top edge, darker low.
    float g = uv.y / hill;                     // 0 bottom → 1 at ridge
    vec3 hi = mix(u_c1, vec3(1.0), 0.25);
    vec3 col = mix(u_c1 * 0.7, hi, g);
    // soft mottling
    col *= 0.95 + 0.05 * fbm(uv * 8.0 + u_time * 0.02);
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

export const create = makeShaderPreset(FS, [
  'u_time',
  'u_intensity',
  'u_density',
  'u_c1',
  'u_c3',
  'u_bg',
]);
