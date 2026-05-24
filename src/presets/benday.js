// benday — pop-art Ben-Day dots (Lichtenstein). Bold flat color regions
// split by a slowly drifting diagonal, overlaid with a coarse grid of large
// dots whose radius follows a soft gradient — the comic-shading look.
// Pop group.

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
uniform vec2  u_res;

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / max(u_res.y, 1.0);

  // Flat region split by a drifting diagonal.
  float split = uv.x + uv.y - 1.0 + 0.18 * sin(u_time * 0.3);
  vec3 base = split > 0.0 ? u_c1 : u_c2;

  // Coarse Ben-Day dot grid (aspect-corrected → round).
  float cell = mix(46.0, 16.0, u_density);
  vec2 g = fract(vec2(uv.x * aspect, uv.y) * cell) - 0.5;
  float d = length(g);

  // Dot radius from a soft moving gradient → comic shading.
  float shade = 0.5 + 0.42 * sin(uv.x * 3.0 + u_time * 0.5) * cos(uv.y * 2.0 - u_time * 0.3);
  float radius = mix(0.12, 0.46, clamp(shade, 0.0, 1.0)) * mix(0.8, 1.2, u_intensity);
  float dot = smoothstep(radius, radius - 0.07, d);

  vec3 col = mix(base, u_c3, dot);
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
    gl.uniform3f(uC2, c.accent[0],  c.accent[1],  c.accent[2]);
    gl.uniform3f(uC3, c.info[0],    c.info[1],    c.info[2]);
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
