// mandala — layered concentric radial symmetry. Polar coordinates from center;
// concentric radius bands each carry an N-fold petal motif keyed to the ring
// index, colors cycling primary→accent→info outward, adjacent rings counter-
// rotating. Calm, meditative motion.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time, u_intensity, u_density;
uniform vec3  u_c1, u_c2, u_c3, u_bg;
uniform vec2  u_res;
const float PI = 3.141592653589793;

float band(float x, float w) { return smoothstep(w, 0.0, abs(x)); }

void main() {
  vec2 p = (v_uv - 0.5);
  p.x *= u_res.x / max(u_res.y, 1.0);
  float r = length(p) * 2.0;
  float a = atan(p.y, p.x);

  float rings = floor(mix(4.0, 10.0, u_density));
  float idx = floor(r * rings);
  float rf = fract(r * rings);
  float sym = 6.0 + 2.0 * idx;
  float dir = mod(idx, 2.0) * 2.0 - 1.0;
  float aa = a + dir * u_time * 0.12;
  float wedge = (2.0 * PI) / sym;
  float af = abs(mod(aa, wedge) - wedge * 0.5);

  float ringLine = band(rf, 0.05);
  float petal = band(rf - 0.5, 0.16 + 0.08 * u_intensity)
              * smoothstep(0.1, 0.7, cos(af * sym * 0.5));

  float m = mod(idx, 3.0);
  vec3 ringCol = (m < 1.0) ? u_c1 : (m < 2.0) ? u_c2 : u_c3;

  vec3 col = u_bg;
  col = mix(col, ringCol, petal);
  col = mix(col, u_c3, ringLine * 0.5);
  col = mix(col, u_c2, band(r, 0.08));
  col = mix(col, u_bg, smoothstep(1.7, 2.4, r));
  gl_FragColor = vec4(col, 1.0);
}
`;

export function create({ gl, getColors }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const u = (n) => gl.getUniformLocation(program, n);
  const uTime = u('u_time'),
    uInt = u('u_intensity'),
    uDen = u('u_density');
  const uC1 = u('u_c1'),
    uC2 = u('u_c2'),
    uC3 = u('u_c3'),
    uBg = u('u_bg'),
    uRes = u('u_res');
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
    gl.uniform3f(uBg, c.bg[0], c.bg[1], c.bg[2]);
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
