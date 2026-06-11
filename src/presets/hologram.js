// hologram — a projected wireframe. An icosahedron and a torus knot alternate
// slowly rotating above a projector glow; the object renders as emissive
// scan-lined lines drawn twice with a chromatic offset (cyan/secondary ghost),
// with occasional horizontal frame tears. Geometry lives in two static LINES
// VBOs; rotation/projection/tear run in the vertex shader, scanlines in the
// fragment. `density` = scanline pitch, `intensity` = emission. dispose()
// releases both buffers and both programs.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const SWAP_SEC = 9; // seconds per shape
const START_OFF = SWAP_SEC * 0.5; // offset so a frozen first frame shows a lit shape

const LINE_VS = `
attribute vec3 a_xyz;
uniform float u_time, u_tearY, u_tearAmt, u_chroma;
varying float v_depth;
varying float v_y;
void main() {
  float ya = u_time * 0.5;
  float xa = 0.45 + sin(u_time * 0.21) * 0.25;
  float cy = cos(ya), sy = sin(ya), cx = cos(xa), sx = sin(xa);
  vec3 p = a_xyz;
  p = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
  p = vec3(p.x, cx * p.y - sx * p.z, sx * p.y + cx * p.z);
  float zCam = p.z + 3.2;
  vec2 s = p.xy * (2.0 / zCam);
  s.y += 0.08; // float above the projector base
  // Frame tear: a horizontal band shears sideways.
  if (abs(s.y - u_tearY) < 0.05) s.x += u_tearAmt;
  s.x += u_chroma;
  v_depth = clamp(1.6 - zCam * 0.38, 0.2, 1.0);
  v_y = s.y;
  gl_Position = vec4(s.x * 0.72, s.y * 0.72, 0.0, 1.0);
}`;

const LINE_FS = `
precision mediump float;
uniform vec3 u_col;
uniform float u_alpha, u_scan, u_res_y;
varying float v_depth;
varying float v_y;
void main() {
  // Horizontal scan slices: thin dark gaps across the projection.
  float scan = 0.72 + 0.28 * step(0.3, fract(gl_FragCoord.y / u_scan));
  gl_FragColor = vec4(u_col * v_depth * scan * u_alpha, 1.0);
}`;

const GLOW_FS = `
precision mediump float;
varying vec2 v_uv;
uniform vec3 u_bg, u_col;
uniform float u_intensity, u_time;
void main() {
  vec3 col = u_bg * 0.4;
  // Projector base: a bright ellipse low in frame + a faint upward cone.
  vec2 d = (v_uv - vec2(0.5, 0.16)) * vec2(1.6, 5.0);
  col += u_col * exp(-dot(d, d)) * (0.5 + 0.4 * u_intensity);
  float cone = smoothstep(0.42, 0.0, abs(v_uv.x - 0.5)) * smoothstep(0.16, 0.75, v_uv.y);
  col += u_col * cone * 0.06 * (1.0 + 0.15 * sin(u_time * 7.0));
  gl_FragColor = vec4(col, 1.0);
}`;

// Icosahedron edges as LINES vertex pairs.
function icosahedron() {
  const t = (1 + Math.sqrt(5)) / 2;
  const v = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ].map((p) => {
    const l = Math.hypot(...p);
    return p.map((x) => x / l);
  });
  const faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  const seen = new Set();
  const out = [];
  for (const f of faces) {
    for (let i = 0; i < 3; i++) {
      const a = f[i];
      const b = f[(i + 1) % 3];
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(...v[a], ...v[b]);
    }
  }
  return new Float32Array(out);
}

// Torus knot (p=2, q=3) sampled into LINES segment pairs.
function torusKnot() {
  const N = 220;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const u = (i / N) * Math.PI * 2;
    const r = 0.62 + 0.28 * Math.cos(3 * u);
    pts.push([r * Math.cos(2 * u), 0.28 * Math.sin(3 * u), r * Math.sin(2 * u)]);
  }
  const out = [];
  for (let i = 0; i < N; i++) out.push(...pts[i], ...pts[i + 1]);
  return new Float32Array(out);
}

export function create({ gl, getColors }) {
  const lineProg = createProgram(gl, LINE_VS, LINE_FS);
  const glowProg = createProgram(gl, QUAD_VS, GLOW_FS);
  const quad = fullscreenQuad(gl);

  const aXYZ = gl.getAttribLocation(lineProg, 'a_xyz');
  const lu = (n) => gl.getUniformLocation(lineProg, n);
  const uTime = lu('u_time');
  const uTearY = lu('u_tearY');
  const uTearAmt = lu('u_tearAmt');
  const uChroma = lu('u_chroma');
  const uCol = lu('u_col');
  const uAlpha = lu('u_alpha');
  const uScan = lu('u_scan');
  const aGlow = gl.getAttribLocation(glowProg, 'a_pos');
  const gu = (n) => gl.getUniformLocation(glowProg, n);

  const icoBuf = gl.createBuffer();
  const icoData = icosahedron();
  gl.bindBuffer(gl.ARRAY_BUFFER, icoBuf);
  gl.bufferData(gl.ARRAY_BUFFER, icoData, gl.STATIC_DRAW);
  const knotBuf = gl.createBuffer();
  const knotData = torusKnot();
  gl.bindBuffer(gl.ARRAY_BUFFER, knotBuf);
  gl.bufferData(gl.ARRAY_BUFFER, knotData, gl.STATIC_DRAW);

  let w = 1;
  let h = 1;

  function drawShape(buf, count, t, col, ghost, alpha, params) {
    gl.useProgram(lineProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aXYZ);
    gl.vertexAttribPointer(aXYZ, 3, gl.FLOAT, false, 0, 0);
    gl.uniform1f(uTime, t);
    // Occasional tear: brief shear bands keyed to time.
    const tearOn = Math.sin(t * 1.7) > 0.96 ? 1 : 0;
    gl.uniform1f(uTearY, Math.sin(t * 5.1) * 0.5);
    gl.uniform1f(uTearAmt, tearOn * 0.07 * Math.sin(t * 31));
    gl.uniform1f(uScan, Math.max(2, h * (0.012 - 0.007 * (params.density ?? 0.5))));
    const em = 0.5 + 0.6 * (params.intensity ?? 0.5);
    // Ghost pass (chroma offset), then main pass.
    gl.uniform1f(uChroma, 0.012);
    gl.uniform3f(uCol, ghost[0], ghost[1], ghost[2]);
    gl.uniform1f(uAlpha, alpha * em * 0.45);
    gl.drawArrays(gl.LINES, 0, count);
    gl.uniform1f(uChroma, 0);
    gl.uniform3f(uCol, col[0], col[1], col[2]);
    gl.uniform1f(uAlpha, alpha * em);
    gl.drawArrays(gl.LINES, 0, count);
  }

  function draw(t, params) {
    const c = getColors();
    gl.viewport(0, 0, w, h);
    const bg = c.bg || [0.02, 0.04, 0.06];
    const cyan = c.accent || [0.3, 0.95, 0.95];
    const ghost = c.primary || [0.6, 0.4, 0.95];

    // Base glow underlay.
    gl.disable(gl.BLEND);
    gl.useProgram(glowProg);
    bindQuad(gl, quad, aGlow);
    gl.uniform3f(gu('u_bg'), bg[0], bg[1], bg[2]);
    gl.uniform3f(gu('u_col'), cyan[0], cyan[1], cyan[2]);
    gl.uniform1f(gu('u_intensity'), params.intensity ?? 0.5);
    gl.uniform1f(gu('u_time'), t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Emissive wireframe, alternating shapes with a short crossfade.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    const phase = (t / SWAP_SEC) % 2;
    const within = phase % 1;
    const fadeIn = Math.min(1, within / 0.12);
    const fadeOut = Math.min(1, (1 - within) / 0.12);
    const alpha = Math.min(fadeIn, fadeOut);
    if (phase < 1) drawShape(icoBuf, icoData.length / 3, t, cyan, ghost, alpha, params);
    else drawShape(knotBuf, knotData.length / 3, t, cyan, ghost, alpha, params);
    gl.disable(gl.BLEND);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame(t, params) {
      draw(t + START_OFF, params);
    },
    staticFrame(params) {
      draw(SWAP_SEC * 0.5, params); // icosahedron mid-hold, no tear
    },
    dispose() {
      try {
        gl.deleteProgram(lineProg);
        gl.deleteProgram(glowProg);
        gl.deleteBuffer(quad);
        gl.deleteBuffer(icoBuf);
        gl.deleteBuffer(knotBuf);
      } catch {}
    },
  };
}
