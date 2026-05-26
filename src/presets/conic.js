// conic — a rotating angular (conic) gradient sweeping the three theme
// tints around the center. Designed to sit behind a card as a spotlight
// border/glow (give the card a slightly inset opaque background so only a
// rim of this shows), or full-bleed as a slow radar sweep / loader.
// Gradient group.

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

void main() {
  vec2 p = v_uv - 0.5;
  p.x *= u_res.x / max(u_res.y, 1.0);
  float a = atan(p.y, p.x) + u_time * (0.3 + u_intensity * 0.9);
  // Normalize angle to 0..1 and (optionally) repeat to get multiple sweeps.
  float reps = floor(mix(1.0, 3.0, u_density));
  float h = fract((a / TAU) * reps);

  // Three-stop wheel c1 → c2 → c3 → c1.
  vec3 col;
  if (h < 1.0 / 3.0)      col = mix(u_c1, u_c2, h * 3.0);
  else if (h < 2.0 / 3.0) col = mix(u_c2, u_c3, (h - 1.0 / 3.0) * 3.0);
  else                    col = mix(u_c3, u_c1, (h - 2.0 / 3.0) * 3.0);

  // Slight radial falloff toward bg at the very center for a cleaner core.
  float r = length(p);
  col = mix(u_bg, col, smoothstep(0.0, 0.12, r));
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
  const uRes = gl.getUniformLocation(program, 'u_res');

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
