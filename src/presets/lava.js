// lava — metaball lava lamp. Five soft point sources drift on Lissajous
// orbits, summed via inverse-square falloff. Two smoothstep thresholds
// pick the inner-core color and the outer-glow color over the bg.

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
uniform vec2  u_res;

void main() {
  // Work in aspect-corrected space so blobs are round, not stretched.
  vec2 p = v_uv;
  p.x *= u_res.x / max(u_res.y, 1.0);

  // density controls blob radius/coupling, intensity controls total field
  float r = mix(0.10, 0.22, u_density);
  float scale = mix(0.05, 0.18, u_intensity);

  float field = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 c = vec2(
      0.5 * u_res.x / max(u_res.y, 1.0) + 0.32 * sin(u_time * (0.30 + fi * 0.06) + fi * 1.7),
      0.5                              + 0.28 * cos(u_time * (0.25 + fi * 0.05) + fi * 2.1)
    );
    float d = length(p - c);
    field += (r * r) / (d * d + 0.001);
  }
  field *= scale * 6.0;

  float outer = smoothstep(0.6, 1.1, field);
  float inner = smoothstep(1.2, 2.4, field);
  vec3 col = u_bg;
  col = mix(col, u_c2, outer);
  col = mix(col, u_c1, inner);
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
