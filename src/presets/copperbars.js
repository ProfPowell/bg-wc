// copperbars — Amiga demoscene copper bars: horizontal metallic bands that
// bob vertically on offset sine phases, each with a bright specular center
// fading to dark edges. Set against a starfield-free flat background.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

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

vec3 barTint(float k) {
  // Cycle through the three theme tints across the stack of bars.
  if (k < 0.5) return mix(u_c1, u_c2, k * 2.0);
  return mix(u_c2, u_c3, (k - 0.5) * 2.0);
}

void main() {
  vec2 uv = v_uv;
  float bars = floor(mix(4.0, 8.0, u_density));
  float thick = mix(0.10, 0.05, u_density);   // half-thickness of each bar
  float speed = 0.5;

  vec3 col = u_bg;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= bars) break;
    float fi = float(i);
    float phase = fi * 1.3;
    float center = 0.5 + 0.42 * sin(u_time * speed + phase);
    float dist = abs(uv.y - center);
    if (dist > thick) continue;
    float t = dist / thick;                    // 0 center → 1 edge
    vec3 tint = barTint(fi / max(bars - 1.0, 1.0));
    // Metallic: bright specular core, darkening to the rim.
    float shade = (1.0 - t * t);
    vec3 barCol = tint * (0.4 + 0.6 * shade) + vec3(shade * shade) * 0.5 * u_intensity;
    col = mix(col, barCol, smoothstep(1.0, 0.85, t));
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

export function create({ gl, getColors }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uInt  = gl.getUniformLocation(program, 'u_intensity');
  const uDen  = gl.getUniformLocation(program, 'u_density');
  const uC1   = gl.getUniformLocation(program, 'u_c1');
  const uC2   = gl.getUniformLocation(program, 'u_c2');
  const uC3   = gl.getUniformLocation(program, 'u_c3');
  const uBg   = gl.getUniformLocation(program, 'u_bg');

  let w = 1, h = 1;

  function draw(t, params) {
    const c = getColors();
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    bindQuad(gl, buf, aPos);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uInt, params.intensity);
    gl.uniform1f(uDen, params.density);
    gl.uniform3f(uC1, c.primary[0], c.primary[1], c.primary[2]);
    gl.uniform3f(uC2, c.accent[0],  c.accent[1],  c.accent[2]);
    gl.uniform3f(uC3, c.info[0],    c.info[1],    c.info[2]);
    gl.uniform3f(uBg, c.bg[0],      c.bg[1],      c.bg[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(t, params) { draw(t, params); },
    staticFrame(params) { draw(0, params); },
    dispose() { try { gl.deleteProgram(program); gl.deleteBuffer(buf); } catch {} },
  };
}
