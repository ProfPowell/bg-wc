// gameboy — 4-tone handheld. An animated value field is pixelated to a
// coarse virtual screen, ordered-dithered (2x2 Bayer, computed
// arithmetically — no arrays, WebGL1-safe), then quantized to four shades
// interpolated from background → primary. Looks like a DMG with a green
// theme; works as a generic 4-tone with any palette.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3  u_c1;
uniform vec3  u_bg;
uniform vec2  u_res;

// 2x2 ordered dither, value in {0, 1/4, 2/4, 3/4}.
float bayer2(vec2 p) {
  vec2 m = mod(floor(p), 2.0);
  return (m.x * 2.0 + m.y * 3.0 - m.x * m.y * 4.0) / 4.0;
}

void main() {
  // Pixelate to a coarse virtual resolution.
  float px = mix(64.0, 168.0, u_density);
  vec2 res = vec2(px, floor(px * u_res.y / max(u_res.x, 1.0)));
  vec2 cell = floor(v_uv * res);
  vec2 uv = (cell + 0.5) / res;

  // Animated tone field, 0..1.
  float v = 0.5
          + 0.30 * sin(uv.x * 6.0 + u_time)
          + 0.22 * cos(uv.y * 5.0 - u_time * 0.6);
  v = clamp(v, 0.0, 1.0);

  // Ordered dither nudges values across quantization steps.
  v += (bayer2(cell) - 0.375) * mix(0.15, 0.4, u_intensity);

  // Quantize to 4 shades.
  float q = floor(clamp(v, 0.0, 0.999) * 4.0) / 3.0;  // 0, 1/3, 2/3, 1
  // Monochrome ramp: a dark and a light version of the primary hue, so the
  // four tones always have contrast regardless of how dark the theme bg is.
  vec3 darkest  = mix(u_bg, u_c1, 0.22) * 0.6;
  vec3 lightest = mix(u_c1, vec3(1.0), 0.45);
  vec3 col = mix(darkest, lightest, q);
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
