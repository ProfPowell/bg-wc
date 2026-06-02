// girih — Islamic periodic star-polygon strapwork. A repeating n-fold star
// lattice with interlaced strapwork lines, drawn as anti-aliased strokes over
// theme tokens. `mode`: 8fold (default) | 12fold | 6fold. Slow whole-lattice
// rotation. Scoped to periodic lattices (not aperiodic quasicrystal girih).

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time, u_intensity, u_density, u_fold;
uniform vec3  u_c1, u_c2, u_c3, u_bg;
uniform vec2  u_res;
const float PI = 3.141592653589793;

float band(float x, float w) { return smoothstep(w, 0.0, abs(x)); }

void main() {
  vec2 p = (v_uv - 0.5);
  p.x *= u_res.x / max(u_res.y, 1.0);
  float scale = mix(2.5, 7.0, u_density);
  float ang = u_time * 0.04;
  float ca = cos(ang), sa = sin(ang);
  p = mat2(ca, -sa, sa, ca) * p * scale;

  vec2 cell = fract(p) - 0.5;
  float r = length(cell);
  float a = atan(cell.y, cell.x);

  float lw = 0.022 + 0.02 * u_intensity;
  // n-pointed star outline: radius oscillates fully around the circle so the
  // points are pronounced (a folded-angle edge barely varied and read as a
  // plain ring).
  float rstar = 0.32 + 0.13 * cos(u_fold * a);
  float starLine = band(r - rstar, lw);
  float grid = min(0.5 - abs(cell.x), 0.5 - abs(cell.y));
  float gridLine = band(grid, lw * 0.8);
  float diag = min(abs(cell.x - cell.y), abs(cell.x + cell.y));
  float diagLine = band(diag, lw * 0.7) * step(r, 0.45);

  vec3 col = u_bg;
  col = mix(col, u_c3, gridLine * 0.7);
  col = mix(col, u_c2, diagLine * 0.6);
  col = mix(col, u_c1, starLine);
  col = mix(col, u_c2, band(r, 0.05) * 0.85);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function create({ gl, getColors, host }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const u = (n) => gl.getUniformLocation(program, n);
  const uTime = u('u_time'), uInt = u('u_intensity'), uDen = u('u_density'), uFold = u('u_fold');
  const uC1 = u('u_c1'), uC2 = u('u_c2'), uC3 = u('u_c3'), uBg = u('u_bg'), uRes = u('u_res');
  let w = 1, h = 1;

  function foldOf() {
    const m = (host.getAttribute('mode') || '').toLowerCase();
    if (m.indexOf('12') >= 0) return 12.0;
    if (m.indexOf('6') >= 0) return 6.0;
    return 8.0;
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
    gl.uniform1f(uFold, foldOf());
    gl.uniform3f(uC1, c.primary[0], c.primary[1], c.primary[2]);
    gl.uniform3f(uC2, c.accent[0], c.accent[1], c.accent[2]);
    gl.uniform3f(uC3, c.info[0], c.info[1], c.info[2]);
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
