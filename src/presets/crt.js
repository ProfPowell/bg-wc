// crt — a CRT picture tube: barrel curvature, scanlines, an RGB phosphor
// mask, a slow rolling brightness bar, and a vignette, over a drifting
// two-tone base. Scanline / mask frequencies are fixed (not res-derived)
// so they don't shimmer or alias.

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

vec2 barrel(vec2 uv) {
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + 0.18 * r2;       // outward distortion
  return c * 0.5 + 0.5;
}

void main() {
  vec2 uv = barrel(v_uv);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);   // outside the tube
    return;
  }

  // Base picture: drifting two-tone with a faint test-card wobble.
  float g = uv.y + sin(uv.x * 5.0 + u_time) * 0.06;
  vec3 base = mix(u_c1, u_c2, clamp(g, 0.0, 1.0));

  // Scanlines (fixed frequency).
  float lines = mix(150.0, 320.0, u_density);
  float scan = 0.82 + 0.18 * sin(uv.y * lines * 3.14159);

  // RGB phosphor mask — vertical subpixel stripes.
  float m = mod(floor(uv.x * 240.0), 3.0);
  vec3 mask = vec3(0.6);
  if (m < 0.5)      mask.r = 1.0;
  else if (m < 1.5) mask.g = 1.0;
  else              mask.b = 1.0;
  mask = mix(vec3(1.0), mask, mix(0.3, 0.9, u_intensity));

  // Slow rolling bright bar.
  float roll = smoothstep(0.06, 0.0, abs(fract(uv.y - u_time * 0.12) - 0.5) - 0.45);

  // Vignette.
  vec2 c = uv * 2.0 - 1.0;
  float vig = 1.0 - dot(c, c) * 0.35;

  vec3 col = base * scan * mask * vig + roll * 0.06;
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
    staticFrame(params) { draw(0, params); },
    dispose() { try { gl.deleteProgram(program); gl.deleteBuffer(buf); } catch {} },
  };
}
