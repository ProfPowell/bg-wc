// chrome — 80s airbrushed logo metal. A mirrored horizon: banded sky
// gradient above, compressed darker reflection below, hot horizon line,
// and a specular sweep traveling the band. Bands derive from the theme
// primary mixed toward white/black so the metal reads in any theme.
// Pure function of u_time. density = band count, intensity = specular heat.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_res;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3 u_c1;
uniform vec3 u_bg;
uniform vec3 u_fg;

void main() {
  float horizon = 0.55;
  float y = v_uv.y;
  // Fold the reflection: below the horizon we sample the sky, compressed.
  float sky = y > horizon ? (y - horizon) / (1.0 - horizon)
                          : (horizon - y) / horizon * 0.7;
  float refl = y > horizon ? 0.0 : 1.0;

  // Banded metal: the sky gradient carries harmonic bands.
  float bands = 3.0 + u_density * 6.0;
  float band = 0.5 + 0.5 * sin(sky * bands * 3.14159 + 1.3);
  vec3 hi = mix(u_c1, vec3(1.0), 0.75);
  vec3 lo = mix(u_c1, vec3(0.0), 0.55);
  vec3 col = mix(lo, hi, smoothstep(0.0, 1.0, sky) * 0.6 + band * 0.4);
  // The reflection is darker and slightly tinted toward the ground color.
  col = mix(col, mix(col, u_bg, 0.45) * 0.7, refl);

  // Hot horizon line.
  float line = exp(-abs(y - horizon) * 90.0);
  col += mix(u_c1, vec3(1.0), 0.85) * line * (0.5 + 0.5 * u_intensity);

  // Specular sweep: a bright spot traveling the horizon.
  float sweepX = fract(u_time * 0.06);
  float spot = exp(-pow((v_uv.x - sweepX) * 7.0, 2.0)) * exp(-abs(y - horizon) * 14.0);
  col += vec3(1.0) * spot * (0.35 + 0.5 * u_intensity);

  // Thin streak highlights in the upper sky.
  float streak = smoothstep(0.985, 1.0, sin(y * 60.0 + 3.0)) * step(horizon, y);
  col += mix(u_c1, vec3(1.0), 0.6) * streak * 0.25;

  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, [
  'u_res',
  'u_time',
  'u_intensity',
  'u_density',
  'u_c1',
  'u_bg',
  'u_fg',
]);
