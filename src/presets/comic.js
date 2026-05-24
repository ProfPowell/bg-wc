// comic — pop-art action burst. Radial "impact" wedges spin out from a
// drifting focal point, with a couple of concentric shock rings. The classic
// comic-panel POW backdrop. Pop group.

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

const float TAU = 6.283185307;

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / max(u_res.y, 1.0);

  // Focal point drifts gently.
  vec2 focus = vec2(0.5 + 0.12 * sin(u_time * 0.25), 0.5 + 0.10 * cos(u_time * 0.2));
  vec2 p = (uv - focus) * vec2(aspect, 1.0);
  float a = atan(p.y, p.x);
  float r = length(p);

  // Radial wedges (the burst), slowly rotating.
  float n = floor(mix(14.0, 40.0, u_density));
  float wedge = step(0.5, fract(a / (TAU / n) + u_time * 0.04));
  vec3 col = mix(u_c1, u_c2, wedge);

  // A shock ring or two in the accent/info color.
  float ring = smoothstep(0.02, 0.0, abs(fract(r * 3.0 - u_time * 0.3) - 0.5) - 0.45);
  col = mix(col, u_c3, ring * mix(0.4, 0.9, u_intensity));

  // Bright pop at the focal core.
  col = mix(col, u_c3, smoothstep(0.10, 0.0, r));
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
