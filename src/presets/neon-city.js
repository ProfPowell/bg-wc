// neon-city — night skyline over wet asphalt. Procedural tower silhouettes
// carry lit-window grids and a few saturated neon sign blocks; the lower
// third is a rain-slick street reflecting it all — vertically mirrored,
// streak-blurred and ripple-perturbed. Distinct from synthwave (sun/grid
// horizon): this is architecture and reflection. `density` = tower count /
// window pitch, `intensity` = how much of the city is lit.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3  u_c1;
uniform vec3  u_c2;
uniform vec3  u_c3;
uniform vec3  u_bg;
uniform vec2  u_res;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hash1(float n) { return fract(sin(n * 127.1) * 43758.5453); }

const float HORIZON = 0.34; // street line in uv.y

// City colour at a sky-space point (uv.y in [HORIZON, 1]).
vec3 city(vec2 uv) {
  float n = mix(9.0, 18.0, u_density); // towers across
  float col = floor(uv.x * n);
  float fx = fract(uv.x * n);

  // Two-row skyline: near towers + a taller far row peeking between.
  float hNear = 0.18 + hash1(col) * 0.42;
  float hFar = 0.32 + hash1(col + 57.0) * 0.5;
  float y = (uv.y - HORIZON) / (1.0 - HORIZON);

  vec3 sky = mix(u_bg * 0.45, u_c1 * 0.16, 1.0 - y); // faint glow at the skyline
  vec3 c = sky;

  // Far row (slightly lit haze silhouette).
  if (y < hFar && fract(fx + 0.5) > 0.12) c = mix(u_bg * 0.3, u_c1 * 0.1, 0.5);

  // Near towers with window grids.
  float inTower = step(0.08, fx) * step(fx, 0.92) * step(y, hNear);
  if (inTower > 0.5) {
    c = u_bg * 0.18;
    // Window lattice.
    vec2 win = vec2(fx * 6.0, y * 46.0);
    vec2 wid = floor(win);
    vec2 wf = fract(win);
    float pane = step(0.25, wf.x) * step(wf.x, 0.8) * step(0.25, wf.y) * step(wf.y, 0.75);
    float on = step(1.0 - (0.25 + 0.5 * u_intensity), hash(wid + col * 13.0));
    // A few windows blink slowly.
    float blink = step(0.96, hash(wid + col)) * step(0.5, fract(u_time * 0.2 + hash(wid)));
    on = max(on * (1.0 - blink), 0.0);
    vec3 warmth = mix(vec3(1.0, 0.85, 0.6), u_c3, hash(wid + 3.0) * 0.5);
    c += warmth * pane * on * 0.85;
    // Neon sign block: one band on some towers, pulsing.
    float sign = step(0.7, hash1(col + 9.0)) * step(abs(y - hNear * 0.55) , 0.025) * step(0.2, fx) * step(fx, 0.8);
    vec3 neon = hash1(col + 4.0) < 0.5 ? u_c2 : u_c1;
    c += neon * sign * (0.7 + 0.3 * sin(u_time * 2.0 + col)) * (0.6 + 0.6 * u_intensity);
    // Rooftop beacon.
    c += u_c2 * step(abs(fx - 0.5), 0.02) * step(abs(y - hNear), 0.008)
       * (0.5 + 0.5 * sin(u_time * 3.0 + col * 2.0));
  }
  return c;
}

void main() {
  vec2 uv = v_uv;
  uv.x += u_time * 0.004; // slow pan along the street

  if (uv.y >= HORIZON) {
    gl_FragColor = vec4(city(uv), 1.0);
  } else {
    // Rain-slick street: mirrored city, ripple-perturbed and streaked.
    float depth = (HORIZON - uv.y) / HORIZON; // 0 at horizon → 1 at bottom
    float ripple = sin(uv.x * 90.0 + u_time * 1.4) * 0.004
                 + sin(uv.x * 33.0 - u_time * 0.9) * 0.006;
    vec2 m = vec2(uv.x, HORIZON + (HORIZON - uv.y) * (1.0 + depth * 0.25) + ripple * depth);
    vec3 refl = city(m);
    // Vertical streak blur: average a few offset taps.
    refl += city(m + vec2(0.0, 0.012 * depth));
    refl += city(m + vec2(0.0, 0.026 * depth));
    refl /= 3.0;
    refl *= 0.55 - depth * 0.25; // reflections die toward the viewer
    vec3 asphalt = u_bg * 0.22;
    gl_FragColor = vec4(asphalt + refl, 1.0);
  }
}
`;

export const create = makeShaderPreset(FS, [
  'u_time',
  'u_intensity',
  'u_density',
  'u_c1',
  'u_c2',
  'u_c3',
  'u_bg',
  'u_res',
]);
