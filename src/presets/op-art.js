// op-art — optical-illusion patterns with false motion, using a high-contrast
// theme pair (foreground / background). mode: riley (sine-warped bands,
// default) | cafewall (offset checker) | moire (drifting gratings) | drift
// (peripheral-drift rings). density = frequency, intensity = contrast/warp.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time, u_intensity, u_density, u_mode;
uniform vec3  u_fg, u_bg;
uniform vec2  u_res;

void main() {
  vec2 p = (v_uv - 0.5);
  p.x *= u_res.x / max(u_res.y, 1.0);
  float freq = mix(8.0, 40.0, u_density);
  float v = 0.5;

  if (u_mode < 0.5) {
    float warp = 0.15 * sin(p.y * 6.0 + u_time * 0.5);
    v = step(0.5, fract((p.x + warp) * freq * 0.5));
  } else if (u_mode < 1.5) {
    float row = floor(p.y * freq * 0.5);
    float off = mod(row, 2.0) * 0.5 + u_time * 0.05;
    float cx = fract(p.x * freq * 0.5 + off);
    float cy = fract(p.y * freq * 0.5);
    float checks = step(0.5, cx);
    float mortar = smoothstep(0.0, 0.08, cy) * smoothstep(1.0, 0.92, cy);
    v = mix(0.5, checks, mortar);
  } else if (u_mode < 2.5) {
    float ph = 0.2 + u_time * 0.03;
    float b = (p.x * cos(ph) + p.y * sin(ph)) * freq;
    v = step(0.0, sin(p.x * freq)) * 0.5 + step(0.0, sin(b)) * 0.5;
  } else {
    float r = length(p);
    v = step(0.5, fract(r * freq * 0.5 - u_time * 0.1));
  }

  v = clamp((v - 0.5) * (1.0 + u_intensity * 1.5) + 0.5, 0.0, 1.0);
  gl_FragColor = vec4(mix(u_bg, u_fg, v), 1.0);
}
`;

export function create({ gl, getColors, host }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const u = (n) => gl.getUniformLocation(program, n);
  const uTime = u('u_time'), uInt = u('u_intensity'), uDen = u('u_density'), uMode = u('u_mode');
  const uFg = u('u_fg'), uBg = u('u_bg'), uRes = u('u_res');
  let w = 1, h = 1;

  function modeOf() {
    const m = (host.getAttribute('mode') || '').toLowerCase();
    if (m === 'cafewall') return 1.0;
    if (m === 'moire') return 2.0;
    if (m === 'drift') return 3.0;
    return 0.0;
  }

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
    gl.uniform1f(uMode, modeOf());
    gl.uniform3f(uFg, c.fg[0], c.fg[1], c.fg[2]);
    gl.uniform3f(uBg, c.bg[0], c.bg[1], c.bg[2]);
    gl.uniform2f(uRes, w, h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(t, params) { draw(t, params); },
    staticFrame(params) { draw(0, params); },
    dispose() { try { gl.deleteProgram(program); gl.deleteBuffer(buf); } catch {} },
  };
}
