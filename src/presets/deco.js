// deco — art-deco sunburst. Symmetric fan rays from the lower-centre with
// concentric arcs over a flat ground, the muted-elegant Nagel / Gatsby look.
// Works best with a restrained palette (peach / teal / ink). Pop group.

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

const float PI = 3.141592653589793;

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / max(u_res.y, 1.0);

  // Rays fan from a point just below the bottom edge.
  vec2 q = (uv - vec2(0.5, -0.05)) * vec2(aspect, 1.0);
  float a = atan(q.y, q.x);            // ~0..PI across the upper field
  float r = length(q);

  float n = floor(mix(10.0, 22.0, u_density));
  float ray = step(0.5, fract(a / (PI / n) + u_time * 0.02));
  vec3 col = mix(u_c1, u_c2, ray);

  // Concentric arcs (deco fan ribs).
  float arc = step(0.5, fract(r * mix(3.0, 7.0, u_density) - u_time * 0.05));
  col = mix(col, u_c3, arc * 0.18);

  // A calm ground band along the very bottom.
  col = mix(col, u_bg, smoothstep(0.16, 0.0, uv.y));

  // Vignette toward the corners keeps it poster-like.
  vec2 c = (uv - 0.5) * vec2(aspect, 1.0);
  col *= 1.0 - dot(c, c) * 0.25 * (1.0 - u_intensity * 0.5);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, ['u_time', 'u_intensity', 'u_density', 'u_c1', 'u_c2', 'u_c3', 'u_bg', 'u_res']);
