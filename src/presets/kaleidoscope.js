// kaleidoscope — polar angle folded into N mirrored segments, then a
// rotating trig pattern mapped through three theme tokens. The
// psychedelic / symmetric piece of the catalog.

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

const float PI = 3.141592653589793;

void main() {
  vec2 p = (v_uv - 0.5);
  p.x *= u_res.x / max(u_res.y, 1.0);

  float r = length(p);
  float a = atan(p.y, p.x);

  // Fold angle into seg mirrored wedges + slow global spin.
  float seg = floor(mix(3.0, 12.0, u_density));
  float wedge = (2.0 * PI) / seg;
  a += u_time * 0.15;
  a = abs(mod(a, wedge) - wedge * 0.5);

  vec2 q = vec2(cos(a), sin(a)) * r;
  float t = u_time * (0.4 + u_intensity * 0.8);
  float pat = sin(q.x * 12.0 + t)
            + cos(q.y * 12.0 - t)
            + sin(r * 16.0 - t * 1.7);
  pat = pat / 3.0 * 0.5 + 0.5;

  vec3 col;
  if (pat < 0.5) col = mix(u_c1, u_c2, pat * 2.0);
  else           col = mix(u_c2, u_c3, (pat - 0.5) * 2.0);
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
  const uC3 = gl.getUniformLocation(program, 'u_c3');
  const uRes = gl.getUniformLocation(program, 'u_res');

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
    gl.uniform3f(uC3, c.info[0], c.info[1], c.info[2]);
    gl.uniform2f(uRes, w, h);
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
