// synthwave — Outrun neon: a banded setting sun over a gradient sky, and a
// perspective grid floor scrolling toward the viewer. The 80s aesthetic.

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

float line(float v, float thick) {
  float f = min(fract(v), 1.0 - fract(v));
  return 1.0 - smoothstep(0.0, thick, f);
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / max(u_res.y, 1.0);
  float horizon = 0.5;
  vec3 col;

  if (uv.y >= horizon) {
    // Sky gradient (bg up high → c3 at horizon).
    float sky = (uv.y - horizon) / (1.0 - horizon);
    col = mix(u_c3, u_bg, sky);

    // Sun: vertical gradient c2 (top) → c1 (bottom), with horizontal cut bands
    // that thicken toward the bottom of the disc.
    vec2 sc = vec2(0.5, horizon + 0.20);
    vec2 d = (uv - sc) * vec2(aspect, 1.0);
    float disc = smoothstep(0.205, 0.20, length(d));
    float yy = (uv.y - (sc.y - 0.2)) / 0.4;            // 0 bottom → 1 top of disc
    float bands = step(0.5, fract(yy * 9.0)) + step(0.78, yy); // bands fade out near top
    vec3 sun = mix(u_c1, u_c2, clamp(yy, 0.0, 1.0));
    col = mix(col, sun, disc * clamp(bands, 0.0, 1.0));
  } else {
    // Floor grid via fake perspective: depth grows as we approach horizon.
    float fy = horizon - uv.y;                 // 0 at horizon → 0.5 at bottom
    float z = 0.18 / (fy + 0.012);             // depth
    float x = (uv.x - 0.5) * z * aspect;       // world x
    float freq = mix(1.0, 2.4, u_density);
    float depthLine = line(z * 1.2 - u_time * 0.8, 0.06 + fy * 0.10);
    float sideLine  = line(x * freq, 0.05 + fy * 0.10);
    float grid = max(depthLine, sideLine);
    // Fade the grid out toward the horizon, glow toward the viewer.
    float fade = smoothstep(0.0, 0.10, fy);
    vec3 gridCol = mix(u_c2, u_c1, fade);
    col = mix(u_bg, gridCol, grid * fade * mix(0.7, 1.0, u_intensity));
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density', 'u_c1', 'u_c2', 'u_c3', 'u_bg', 'u_res']);
