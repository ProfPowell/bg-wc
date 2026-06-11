// stained-glass — a gothic window. Pane geometry is a seeded Voronoi
// partition: cell seed points are computed on the CPU once per layout key and
// uploaded as a uniform array; the fragment shader finds the nearest / second
// nearest seed, draws thick dark lead cames where the two distances meet, and
// tints each pane between two theme roles picked by a per-cell hash. Behind
// the glass a slow fbm light bloom drifts, brightening panes as it crosses,
// and a fine grain gives each pane a glass texture. `intensity` = saturation +
// bloom strength; `density` = pane count. dispose() releases program + buffer.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';
import { mulberry32 } from '../util/pause.js';

const MAX_CELLS = 40;

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time, u_intensity;
uniform int u_ncells;
uniform vec2 u_cells[${MAX_CELLS}];
uniform vec3 u_roles[5];
uniform vec3 u_bg;
uniform vec2 u_res;

float hash1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash2(i), b = hash2(i + vec2(1.0, 0.0));
  float c = hash2(i + vec2(0.0, 1.0)), d = hash2(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  return 0.55 * vnoise(p) + 0.3 * vnoise(p * 2.1 + 4.7) + 0.15 * vnoise(p * 4.3 + 9.1);
}

void main() {
  vec2 p = v_uv;
  p.x *= u_res.x / max(u_res.y, 1.0);

  // Nearest + second-nearest pane seed.
  float d1 = 1e9, d2 = 1e9;
  float id = 0.0;
  for (int i = 0; i < ${MAX_CELLS}; i++) {
    if (i >= u_ncells) break;
    float d = distance(p, u_cells[i]);
    if (d < d1) { d2 = d1; d1 = d; id = float(i); }
    else if (d < d2) { d2 = d; }
  }

  // Pane tint: two roles by cell hash, blended by a second hash. GLSL ES 1.00
  // forbids dynamic uniform-array indexing in fragment shaders, so select via
  // a constant-index loop instead.
  float hA = hash1(id + 1.0);
  float hB = hash1(id + 17.0);
  float iA = floor(mod(hA * 5.0, 5.0));
  float iB = floor(mod(hA * 23.0, 5.0));
  vec3 ra = u_roles[0];
  vec3 rb = u_roles[0];
  for (int i = 0; i < 5; i++) {
    if (float(i) == iA) ra = u_roles[i];
    if (float(i) == iB) rb = u_roles[i];
  }
  vec3 pane = mix(ra, rb, hB * 0.6);
  pane = mix(vec3(dot(pane, vec3(0.33))), pane, 0.6 + 0.4 * u_intensity);

  // Drifting light bloom behind the window.
  vec2 lp = p * 1.4 + vec2(u_time * 0.05, sin(u_time * 0.07) * 0.3);
  float light = fbm(lp);
  light = smoothstep(0.35, 0.85, light) * (0.5 + 0.7 * u_intensity);
  pane *= 0.55 + 0.75 * light;

  // Glass grain per pane.
  float grain = hash2(p * 240.0 + id) * 0.08 + vnoise(p * 60.0 + id * 3.0) * 0.1;
  pane += grain - 0.07;

  // Lead cames where the two nearest cells meet, plus a window-edge frame.
  float came = smoothstep(0.012, 0.03, d2 - d1);
  vec2 e = min(v_uv, 1.0 - v_uv);
  float frameEdge = smoothstep(0.006, 0.02, min(e.x, e.y));
  vec3 lead = u_bg * 0.25 + vec3(0.04);
  vec3 col = mix(lead, pane, came * frameEdge);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function create({ gl, getColors }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const u = (n) => gl.getUniformLocation(program, n);
  const uTime = u('u_time');
  const uInt = u('u_intensity');
  const uN = u('u_ncells');
  const uCells = u('u_cells[0]');
  const uRoles = u('u_roles[0]');
  const uBg = u('u_bg');
  const uRes = u('u_res');

  let w = 1;
  let h = 1;
  let cells = null;
  let nCells = 0;
  let key = '';

  function buildCells(params) {
    const n = Math.min(MAX_CELLS, Math.round(10 + (params.density ?? 0.5) * 26));
    const k = `${params.seed | 0}|${n}|${w}x${h}`;
    if (cells && key === k) return;
    key = k;
    nCells = n;
    const rng = mulberry32(params.seed | 0 || 1);
    const asp = w / Math.max(1, h);
    cells = new Float32Array(MAX_CELLS * 2);
    for (let i = 0; i < n; i++) {
      cells[i * 2] = rng() * asp;
      cells[i * 2 + 1] = rng();
    }
  }

  function draw(t, params) {
    buildCells(params);
    const c = getColors();
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    bindQuad(gl, buf, aPos);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uInt, params.intensity ?? 0.5);
    gl.uniform1i(uN, nCells);
    gl.uniform2fv(uCells, cells);
    const roles = [
      c.primary || [0.3, 0.4, 0.8],
      c.accent || [0.8, 0.3, 0.4],
      c.info || [0.3, 0.7, 0.7],
      c.warning || [0.9, 0.7, 0.3],
      c.success || [0.3, 0.7, 0.4],
    ];
    const flat = new Float32Array(15);
    for (let i = 0; i < 5; i++) {
      flat[i * 3] = roles[i][0];
      flat[i * 3 + 1] = roles[i][1];
      flat[i * 3 + 2] = roles[i][2];
    }
    gl.uniform3fv(uRoles, flat);
    const bg = c.bg || [0.05, 0.05, 0.08];
    gl.uniform3f(uBg, bg[0], bg[1], bg[2]);
    gl.uniform2f(uRes, w, h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      key = ''; // aspect feeds the cell coords
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
