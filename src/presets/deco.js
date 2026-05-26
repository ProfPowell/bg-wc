// deco — art-deco sunburst. Symmetric fan rays from the lower-centre with
// concentric arcs over a flat ground, the muted-elegant Nagel / Gatsby look.
// Works best with a restrained palette (peach / teal / ink). Pop group.

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

const float PI = 3.141592653589793;

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / max(u_res.y, 1.0);

  // Rays fan from a point just below the bottom edge.
  vec2 q = (uv - vec2(0.5, -0.05)) * vec2(aspect, 1.0);
  float a = atan(q.y, q.x);            // ~0..PI across the upper field
  float r = length(q);

  float n = floor(mix(10.0, 22.0, u_density));
  float ray = step(0.5, fract(a / (PI / n) + u_time * 0.02));
  vec3 col = mix(u_c1, u_c2, ray);

  // Concentric arcs (deco fan ribs).
  float arc = step(0.5, fract(r * mix(3.0, 7.0, u_density) - u_time * 0.05));
  col = mix(col, u_c3, arc * 0.18);

  // A calm ground band along the very bottom.
  col = mix(col, u_bg, smoothstep(0.16, 0.0, uv.y));

  // Vignette toward the corners keeps it poster-like.
  vec2 c = (uv - 0.5) * vec2(aspect, 1.0);
  col *= 1.0 - dot(c, c) * 0.25 * (1.0 - u_intensity * 0.5);
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
