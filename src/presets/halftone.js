// halftone — proper rotated dot-grid halftone (not the hash dither). An
// animated gradient drives dot radius on a 45-degree-rotated grid;
// aspect-corrected so the dots stay round. Two-tone: primary on bg.
// Inspired by VFX-JS's halftone effect.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3  u_c1;
uniform vec3  u_bg;
uniform vec2  u_res;

void main() {
  vec2 uv = v_uv;
  vec2 aspect = vec2(u_res.x / max(u_res.y, 1.0), 1.0);

  // Source tone — a slow moving gradient field, 0..1.
  float val = 0.5
            + 0.30 * sin(uv.x * 3.0 + u_time)
            + 0.20 * cos(uv.y * 2.5 - u_time * 0.6);
  val = clamp(val, 0.0, 1.0);

  // 45-degree rotated, aspect-corrected dot grid.
  float cells = mix(18.0, 70.0, u_density);
  vec2 p = uv * aspect * cells;
  float c = 0.70710678, s = 0.70710678;
  vec2 rp = mat2(c, -s, s, c) * p;
  vec2 cell = fract(rp) - 0.5;
  float d = length(cell);

  // Dot radius grows with the source tone.
  float radius = val * 0.62 * mix(0.7, 1.25, u_intensity);
  float dot = smoothstep(radius, radius - 0.06, d);

  vec3 col = mix(u_bg, u_c1, dot);
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
  const uBg   = gl.getUniformLocation(program, 'u_bg');
  const uRes  = gl.getUniformLocation(program, 'u_res');

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
    gl.uniform3f(uBg, c.bg[0], c.bg[1], c.bg[2]);
    gl.uniform2f(uRes, w, h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(t, params) { draw(t, params); },
    staticFrame(params) { draw(0, params); },
    dispose() { try { gl.deleteProgram(program); gl.deleteBuffer(buf); } catch {} },
  };
}
