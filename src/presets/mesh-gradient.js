// mesh-gradient — Stripe-style soft blobs over a base color, three theme tints.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform vec3  u_c1;
uniform vec3  u_c2;
uniform vec3  u_c3;
uniform vec3  u_bg;

// Soft falloff weight for blob at center c with radius r at uv p.
float blob(vec2 p, vec2 c, float r) {
  float d = length(p - c);
  return 1.0 - smoothstep(0.0, r, d);
}

void main() {
  vec2 p = v_uv;
  float t = u_time * 0.35;
  vec2 c1 = vec2(0.35 + 0.18 * sin(t),         0.40 + 0.25 * cos(t * 0.7));
  vec2 c2 = vec2(0.70 + 0.20 * cos(t * 1.1),   0.30 + 0.18 * sin(t * 1.3));
  vec2 c3 = vec2(0.50 + 0.30 * sin(t * 0.9),   0.75 + 0.18 * cos(t * 0.8));

  float r = mix(0.45, 0.85, u_intensity);
  float w1 = blob(p, c1, r);
  float w2 = blob(p, c2, r);
  float w3 = blob(p, c3, r);
  float wB = 0.2; // base presence

  float total = w1 + w2 + w3 + wB;
  vec3 col = (u_c1 * w1 + u_c2 * w2 + u_c3 * w3 + u_bg * wB) / total;

  gl_FragColor = vec4(col, 1.0);
}
`;

export function create({ gl, getColors }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uInt = gl.getUniformLocation(program, 'u_intensity');
  const uC1 = gl.getUniformLocation(program, 'u_c1');
  const uC2 = gl.getUniformLocation(program, 'u_c2');
  const uC3 = gl.getUniformLocation(program, 'u_c3');
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
    gl.uniform3f(uC1, c.primary[0], c.primary[1], c.primary[2]);
    gl.uniform3f(uC2, c.accent[0], c.accent[1], c.accent[2]);
    gl.uniform3f(uC3, c.info[0], c.info[1], c.info[2]);
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
