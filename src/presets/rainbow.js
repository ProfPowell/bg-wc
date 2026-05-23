// rainbow — flowing spectral gradient (HSV hue sweep), VFX-JS "rainbow"
// reimagined as a background. This preset is intentionally NOT theme-
// tinted: it owns its hue wheel. density = hue cycles across the width,
// intensity = wave distortion, speed = scroll.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;

vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(0.0, 1.0/3.0, 2.0/3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

void main() {
  vec2 uv = v_uv;
  float wave = sin(uv.x * 5.0 + u_time) * 0.12 * u_intensity
             + cos(uv.y * 4.0 - u_time * 0.7) * 0.08 * u_intensity;
  float cycles = mix(0.5, 2.5, u_density);
  float hue = fract(uv.x * cycles + uv.y * 0.25 + wave + u_time * 0.08);
  vec3 col = hsv2rgb(vec3(hue, 0.72, 0.96));
  gl_FragColor = vec4(col, 1.0);
}
`;

export function create({ gl }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uInt  = gl.getUniformLocation(program, 'u_intensity');
  const uDen  = gl.getUniformLocation(program, 'u_density');

  let w = 1, h = 1;

  function draw(t, params) {
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    bindQuad(gl, buf, aPos);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uInt, params.intensity);
    gl.uniform1f(uDen, params.density);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(t, params) { draw(t, params); },
    staticFrame(params) { draw(0, params); },
    dispose() { try { gl.deleteProgram(program); gl.deleteBuffer(buf); } catch {} },
  };
}
