// halcyon — the catalog's most restful entry. Enormous soft color fields
// (theme colors pulled far toward the ground) breathe into one another on
// very low-frequency fbm; no structure survives a squint, but a floor on
// the field contrast keeps it from reading blank (baseline requirement).
// Pure u_time. density = field scale, intensity = field presence.

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
  float a = 0.6;
  for (int k = 0; k < 3; k++) {
    v += a * vnoise(p);
    p = p * 1.9 + vec2(11.0, 7.0);
    a *= 0.5;
  }
  return v;
}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(v_uv.x * aspect, v_uv.y);
  float scale = 1.1 + u_density * 1.2;

  float f1 = fbm(p * scale + vec2(u_time * 0.008, u_time * 0.005));
  float f2 = fbm(p * scale * 0.8 + vec2(-u_time * 0.006, u_time * 0.009) + 31.0);
  float f3 = fbm(p * scale * 1.3 + vec2(u_time * 0.004, -u_time * 0.007) + 63.0);

  // presence keeps a visible floor (0.35) so the field never goes blank.
  float presence = 0.35 + 0.45 * u_intensity;
  vec3 t1 = mix(u_bg, u_c1, 0.4);
  vec3 t2 = mix(u_bg, u_c2, 0.35);
  vec3 t3 = mix(u_bg, u_c3, 0.3);

  vec3 col = u_bg;
  col = mix(col, t1, smoothstep(0.35, 0.75, f1) * presence);
  col = mix(col, t2, smoothstep(0.4, 0.8, f2) * presence * 0.8);
  col = mix(col, t3, smoothstep(0.45, 0.85, f3) * presence * 0.6);

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
