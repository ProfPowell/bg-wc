// paper-grain — warm, slow-drifting paper fiber texture. A sibling of `grain`,
// retuned for paper rather than film: the speckle is tinted toward the ink/fg
// color, the temporal change is a slow drift (not a 24fps strobe), and the
// default intensity is low so it textures warm paper without reading as noise.
// Sits over a page at low alpha (multiply / soft-light). Pattern group.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3  u_ink;
uniform vec2  u_res;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  // Fiber cell size: density 0 -> coarse, density 1 -> fine.
  float cell = mix(2.5, 1.0, u_density);
  vec2 g = floor(v_uv * u_res / cell);
  // Slow drift: advance the noise field a fraction of a cell per second
  // instead of quantizing to whole film frames. Paper breathes, it doesn't flicker.
  float drift = u_time * 0.6;
  float n = hash(g + floor(drift) * 1.7);
  float n2 = hash(g + floor(drift + 1.0) * 1.7);
  n = mix(n, n2, fract(drift));

  // Sparse coverage so it reads as an overlay; tint toward the ink color.
  float a = abs(n - 0.5) * 2.0;
  float alpha = smoothstep(0.6, 1.0, a) * mix(0.02, 0.18, u_intensity);
  // Blend the speckle between a touch lighter and the ink color for warmth.
  vec3 col = mix(vec3(1.0), u_ink, 0.6);
  gl_FragColor = vec4(col, alpha);
}
`;

export function create({ gl, getColors }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uInt = gl.getUniformLocation(program, 'u_intensity');
  const uDen = gl.getUniformLocation(program, 'u_density');
  const uInk = gl.getUniformLocation(program, 'u_ink');
  const uRes = gl.getUniformLocation(program, 'u_res');

  let w = 1,
    h = 1;

  function draw(t, params) {
    const c = getColors();
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(program);
    bindQuad(gl, buf, aPos);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uInt, params.intensity);
    gl.uniform1f(uDen, params.density);
    gl.uniform3f(uInk, c.fg[0], c.fg[1], c.fg[2]);
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
