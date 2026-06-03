// mandala — layered concentric radial symmetry. Polar coordinates from center;
// concentric radius bands each carry an N-fold petal motif keyed to the ring
// index, colors cycling primary→accent→info outward, adjacent rings counter-
// rotating. Calm, meditative motion.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time, u_intensity, u_density;
uniform vec3  u_c1, u_c2, u_c3, u_bg;
uniform vec2  u_res;
const float PI = 3.141592653589793;

float band(float x, float w) { return smoothstep(w, 0.0, abs(x)); }

void main() {
  vec2 p = (v_uv - 0.5);
  p.x *= u_res.x / max(u_res.y, 1.0);
  float r = length(p) * 2.0;
  float a = atan(p.y, p.x);

  float rings = floor(mix(4.0, 9.0, u_density));
  float idx = floor(r * rings);
  float rf = fract(r * rings);                       // 0..1 across the ring band
  float sym = 8.0 + 2.0 * idx;                       // petal count grows outward
  float dir = mod(idx, 2.0) * 2.0 - 1.0;             // alternate rings counter-rotate
  float aoff = mod(idx, 2.0) * (PI / sym);           // and interleave by half a petal
  float aa = a + aoff + dir * u_time * 0.10;
  float wedge = (2.0 * PI) / sym;
  float af = abs(mod(aa, wedge) - wedge * 0.5);
  float t = af / (wedge * 0.5);                      // 0 at petal center .. 1 at edge

  // Lotus petal: angularly full at mid-ring, pinching to a point at both ring
  // edges (wr is the petal's half-width as a function of radius across the band).
  // Capped below 1 so adjacent petals don't touch — negative space between
  // petals and rings keeps it ornate rather than a solid tiling.
  float wr = 0.8 * pow(sin(rf * PI), 0.6);
  float edge = wr - t;                               // >0 inside the petal
  float petal = smoothstep(0.0, 0.04, edge);         // filled body
  float rim = band(edge, 0.05);                      // petal outline
  float vein = band(t, 0.035) * smoothstep(0.0, 0.5, wr); // central vein
  float jewel = band(rf - 0.52, 0.06) * band(t, 0.16);    // a gem per petal
  float ringLine = band(rf, 0.035);                  // thin separator between rings

  float m = mod(idx, 3.0);
  vec3 petalCol = (m < 1.0) ? u_c1 : (m < 2.0) ? u_c2 : u_c3;
  vec3 rimCol = (m < 1.0) ? u_c2 : (m < 2.0) ? u_c3 : u_c1;

  vec3 col = u_bg;
  col = mix(col, mix(petalCol, u_bg, 0.45 * (1.0 - wr)), petal); // body, deeper toward tips
  col = mix(col, u_bg, vein * 0.6);                  // dark vein splits the lobe
  col = mix(col, rimCol, rim * (0.7 + 0.3 * u_intensity));
  col = mix(col, u_c2, jewel * 0.9);
  col = mix(col, u_c3, ringLine * 0.35);
  col = mix(col, u_c2, band(r, 0.07));               // bright hub
  col = mix(col, u_bg, smoothstep(1.7, 2.5, r));     // fade at the rim
  gl_FragColor = vec4(col, 1.0);
}
`;

export function create({ gl, getColors }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const u = (n) => gl.getUniformLocation(program, n);
  const uTime = u('u_time'),
    uInt = u('u_intensity'),
    uDen = u('u_density');
  const uC1 = u('u_c1'),
    uC2 = u('u_c2'),
    uC3 = u('u_c3'),
    uBg = u('u_bg'),
    uRes = u('u_res');
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
