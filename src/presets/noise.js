// noise — drifting fractal value noise, two-color tint.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3  u_fg;
uniform vec3  u_bg;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p *= 2.02; a *= 0.5;
  }
  return s;
}

void main() {
  // density controls noise scale; intensity controls contrast.
  float scale = mix(1.5, 8.0, u_density);
  vec2 p = v_uv * scale + vec2(u_time * 0.07, u_time * 0.04);
  float n = fbm(p);
  float k = mix(0.4, 1.6, u_intensity);
  n = clamp((n - 0.5) * k + 0.5, 0.0, 1.0);
  vec3 col = mix(u_bg, u_fg, n);
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
  const uFg = gl.getUniformLocation(program, 'u_fg');
  const uBg = gl.getUniformLocation(program, 'u_bg');

  let w = 1,
    h = 1;

  function draw(t, params) {
    const colors = getColors();
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    bindQuad(gl, buf, aPos);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uInt, params.intensity);
    gl.uniform1f(uDen, params.density);
    gl.uniform3f(uFg, colors.fg[0], colors.fg[1], colors.fg[2]);
    gl.uniform3f(uBg, colors.bg[0], colors.bg[1], colors.bg[2]);
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
