// grain — animated film grain, tuned to sit at low opacity over a whole
// page (mix-blend-mode: overlay / soft-light). Mostly transparent: it emits
// near-neutral noise with low alpha so it textures whatever is beneath
// rather than painting a field of its own. Pattern group.
//
// Unlike `noise`, the output is monochrome speckle with low coverage — a
// dust/grain layer, not a two-tone cloud.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec2  u_res;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  // Grain cell size: density 0 → chunky, density 1 → fine per-pixel.
  float cell = mix(3.0, 1.0, u_density);
  vec2 g = floor(v_uv * u_res / cell);
  // Time-quantized so it flickers like 24fps film, not a smooth crawl.
  float frame = floor(u_time * 24.0);
  float n = hash(g + frame * 1.7);

  // Monochrome speckle around mid-grey; alpha keeps coverage sparse so it
  // reads as an overlay. intensity scales how visible the grain is.
  float a = abs(n - 0.5) * 2.0;          // 0 at mid, 1 at extremes
  float alpha = smoothstep(0.55, 1.0, a) * mix(0.05, 0.35, u_intensity);
  gl_FragColor = vec4(vec3(n), alpha);
}
`;

export function create({ gl, canvas: _canvas }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uInt = gl.getUniformLocation(program, 'u_intensity');
  const uDen = gl.getUniformLocation(program, 'u_density');
  const uRes = gl.getUniformLocation(program, 'u_res');

  let w = 1,
    h = 1;

  function draw(t, params) {
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
