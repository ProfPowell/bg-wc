// shine — diagonal sheen sweep over a subtle base gradient (VFX-JS shine).
// Two highlight bands travel across the diagonal at offset phases, like
// light raking across glossy material. Cheap: a couple of smoothsteps.

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

float band(float diag, float phase, float width) {
  float s = fract(u_time * 0.12 + phase) * 1.6 - 0.3; // sweep position
  return 1.0 - smoothstep(0.0, width, abs(diag - s));
}

void main() {
  vec2 uv = v_uv;
  // Base: a quiet diagonal gradient between bg and the primary tint.
  float diag = uv.x * 0.6 + uv.y * 0.6;
  vec3 base = mix(u_bg, u_c1, clamp(diag, 0.0, 1.0) * 0.6 + 0.1);

  float width = mix(0.18, 0.06, u_density);
  float sheen = band(diag, 0.0, width)
              + band(diag, 0.45, width * 0.6) * 0.6;

  vec3 col = base + u_c2 * sheen * mix(0.25, 0.9, u_intensity);
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
    gl.uniform3f(uBg, c.bg[0],      c.bg[1],      c.bg[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(t, params) { draw(t, params); },
    staticFrame(params) { draw(2.0, params); },
    dispose() { try { gl.deleteProgram(program); gl.deleteBuffer(buf); } catch {} },
  };
}
