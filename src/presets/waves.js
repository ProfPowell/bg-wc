// waves — math sine bands. Four stacked color bands whose boundaries
// are sine-displaced versions of horizontal lines. Two superposed waves
// for organic motion.

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

void main() {
  vec2 uv = v_uv;
  float freq = mix(2.0, 8.0, u_density);
  float amp  = mix(0.04, 0.18, u_intensity);

  float wave = sin(uv.x * freq + u_time) * amp
             + sin(uv.x * freq * 1.7 - u_time * 0.6 + 1.3) * amp * 0.4;
  float y = uv.y + wave;

  float fade = 0.012;
  vec3 col = u_bg;
  col = mix(col, u_c1, smoothstep(0.25 - fade, 0.25 + fade, y));
  col = mix(col, u_c2, smoothstep(0.50 - fade, 0.50 + fade, y));
  col = mix(col, u_c3, smoothstep(0.75 - fade, 0.75 + fade, y));
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
    dispose() {
      try { gl.deleteProgram(program); gl.deleteBuffer(buf); } catch {}
    },
  };
}
