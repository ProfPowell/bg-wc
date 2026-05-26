// aurora — vertical curtains of light. Two stretched value-noise samples
// multiplied give the wispy structure; a vertical envelope keeps it in
// the upper sky; three theme tokens stack as glow layers.

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

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec2 p = v_uv;
  // Stretch horizontally so noise reads as vertical curtains
  float stretch = mix(2.0, 5.0, u_density);
  vec2 q = vec2(p.x * stretch + u_time * 0.10, p.y * 1.8 - u_time * 0.04);
  float n1 = vnoise(q);
  float n2 = vnoise(q * 2.2 + vec2(u_time * 0.20, -u_time * 0.06));
  // pow < 1 lifts the dark dips so the curtain never disappears entirely;
  // a baseline ribbon peaks across the mid-sky so there's always some glow.
  float ribbon = exp(-abs(p.y - 0.55) * 6.0) * 0.45;
  float curtain = (pow(n1 * n2, 0.9) * mix(2.8, 5.5, u_intensity)) + ribbon;

  // Vertical envelope — peak in the upper third
  float vmask = smoothstep(0.0, 0.55, p.y) * (1.0 - smoothstep(0.85, 1.0, p.y));
  curtain *= vmask;

  vec3 col = u_bg;
  col = mix(col, u_c1, smoothstep(0.0, 0.8, curtain));
  col = mix(col, u_c2, smoothstep(0.8, 1.6, curtain));
  col = mix(col, u_c3, smoothstep(1.6, 2.6, curtain));
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
