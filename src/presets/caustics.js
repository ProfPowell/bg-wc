// caustics — underwater light caustic patterns. Two layered cosine /
// sine fields warped by trig of each other, raised to a power to
// concentrate the bright veins. Two theme tokens stack as inner / outer.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3  u_c1;
uniform vec3  u_c2;
uniform vec3  u_bg;

void main() {
  vec2 p = v_uv * mix(2.5, 8.0, u_density);
  float t = u_time * 0.55;

  // Two warped sinusoidal fields
  vec2 q1 = vec2(
    p.x + sin(p.y * 0.7 + t) * 0.35,
    p.y + cos(p.x * 0.5 + t * 1.1) * 0.35
  );
  vec2 q2 = q1 * 1.35 + vec2(t * 0.2, -t * 0.15);

  float a = sin(q1.x) * cos(q1.y);
  float b = sin(q2.x * 0.9 + t) * cos(q2.y * 1.1 - t * 0.7);
  float c = pow(abs(a + b) * 0.5, 2.6);
  c = clamp(c * mix(1.5, 3.2, u_intensity), 0.0, 1.0);

  vec3 col = u_bg;
  col = mix(col, u_c1, c);
  col = mix(col, u_c2, c * c * 0.55);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function create({ gl, getColors }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uInt = gl.getUniformLocation(program, 'u_intensity');
  const uDen = gl.getUniformLocation(program, 'u_density');
  const uC1 = gl.getUniformLocation(program, 'u_c1');
  const uC2 = gl.getUniformLocation(program, 'u_c2');
  const uBg = gl.getUniformLocation(program, 'u_bg');

  let w = 1,
    h = 1;

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
    gl.uniform3f(uC2, c.accent[0], c.accent[1], c.accent[2]);
    gl.uniform3f(uBg, c.bg[0], c.bg[1], c.bg[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame(t, params) {
      draw(t, params);
    },
    staticFrame(params) {
      draw(0, params);
    },
    dispose() {
      try {
        gl.deleteProgram(program);
        gl.deleteBuffer(buf);
      } catch {}
    },
  };
}
