// dither — animated gradient between two theme colors, ordered-dither look.
// WebGL2 / WebGL1 compatible (GLSL ES 1.00 syntax).

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3  u_c1;
uniform vec3  u_c2;
uniform vec2  u_res;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = v_uv;
  // Animated gradient axis — wobbles around vertical.
  float wave = sin(uv.x * 3.0 + u_time * 0.7) * 0.18;
  float g = clamp(uv.y * 0.85 + wave + sin(u_time * 0.5) * 0.15, 0.0, 1.0);

  // Dither cell size: density 0 → coarse 12px, density 1 → fine 1px.
  float cell = mix(12.0, 1.0, u_density);
  vec2 cellCoord = floor(gl_FragCoord.xy / cell);
  float d = hash(cellCoord);

  // Intensity scales how much dither perturbs the gradient threshold.
  float threshold = mix(0.5, d, clamp(u_intensity, 0.0, 1.0));
  float mask = step(threshold, g);
  vec3 col = mix(u_c1, u_c2, mask);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function create({ gl, getColors, getParams: _getParams }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uInt = gl.getUniformLocation(program, 'u_intensity');
  const uDen = gl.getUniformLocation(program, 'u_density');
  const uC1 = gl.getUniformLocation(program, 'u_c1');
  const uC2 = gl.getUniformLocation(program, 'u_c2');
  const uRes = gl.getUniformLocation(program, 'u_res');

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
    gl.uniform3f(uC1, colors.primary[0], colors.primary[1], colors.primary[2]);
    gl.uniform3f(uC2, colors.accent[0], colors.accent[1], colors.accent[2]);
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
