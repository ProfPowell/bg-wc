// tempest — the Atari Tempest tube. A regular N-gon corridor seen down its
// axis: radial spokes at each vertex, polygonal rings receding to the
// center, each angular segment tinted from the theme wheel. Vector group.

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
uniform vec2  u_res;

const float TAU = 6.283185307;

float line(float v, float thick) {
  float f = min(fract(v), 1.0 - fract(v));
  return 1.0 - smoothstep(0.0, thick, f);
}

void main() {
  vec2 p = (v_uv - 0.5) * 2.0;
  p.x *= u_res.x / max(u_res.y, 1.0);

  float a = atan(p.y, p.x);
  float r = length(p);

  float n = floor(mix(6.0, 12.0, u_density));   // sides
  float seg = TAU / n;
  float am = mod(a, seg) - seg * 0.5;
  float m = r * cos(am);                          // polygon-normalized radius (1 at edge)

  float depth = 1.0 / max(m, 0.05);
  float z = depth + u_time * 2.0;

  float rings  = line(z * 0.6, 0.06);             // polygonal rings receding
  float spokes = line(a / seg, 0.045);            // radial claws at vertices
  float grid = max(rings, spokes);

  float fade = smoothstep(0.0, 0.5, m);           // vanish to bg at center

  // Tint per angular segment.
  float idx = mod(floor(a / seg), 3.0);
  vec3 segCol = idx < 0.5 ? u_c1 : (idx < 1.5 ? u_c2 : u_c3);

  vec3 col = mix(u_bg, segCol, grid * fade * mix(0.7, 1.0, u_intensity));

  // The active rim glows brighter (player's edge of the well).
  float rim = smoothstep(0.95, 1.02, m) * (1.0 - smoothstep(1.02, 1.12, m));
  col += segCol * rim * 0.6;

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
  const uC3   = gl.getUniformLocation(program, 'u_c3');
  const uBg   = gl.getUniformLocation(program, 'u_bg');
  const uRes  = gl.getUniformLocation(program, 'u_res');

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
    gl.uniform3f(uC3, c.info[0],    c.info[1],    c.info[2]);
    gl.uniform3f(uBg, c.bg[0],      c.bg[1],      c.bg[2]);
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
