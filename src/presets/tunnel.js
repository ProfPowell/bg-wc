// tunnel — endless zoom into a tunnel. Polar coordinates around the
// center; inverse-radius gives depth (infinity at the center); time
// scrolls along that depth axis. Theme tokens stripe the walls.

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
  vec2 p = (v_uv - 0.5) * 2.0;
  p.x *= u_res.x / max(u_res.y, 1.0);

  float r = length(p);
  float a = atan(p.y, p.x);

  // 1/r → infinity at center, near 0 at edge → far/near in tunnel coords
  float depth = 1.0 / max(r, 0.04);

  // Scroll along depth
  float zoom = mix(0.6, 3.0, u_intensity);
  float z = depth + u_time * zoom;

  // Ring banding along the tunnel + soft angular ribbing
  float bands = mix(2.0, 8.0, u_density);
  float ring  = sin(z * bands) * 0.5 + 0.5;
  float rib   = sin(a * 12.0) * 0.08;
  ring = clamp(ring + rib, 0.0, 1.0);

  // Vanishing-point fade — pure bg at the center
  float fade = smoothstep(0.0, 0.45, r);

  vec3 col = mix(u_c1, u_c2, ring);
  col = mix(u_bg, col, fade);
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
