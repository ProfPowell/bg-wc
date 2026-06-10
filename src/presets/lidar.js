// lidar — a point cloud of a procedural terrain heightfield, revealed by a plane
// that scans across it: points flare on the scan line, stay dimly revealed
// behind it, and are dark ahead. A single static VBO is built from seeded value
// noise; the projection (a slow yaw + oblique tilt) and the scan brightness are
// computed in the vertex shader from `t`. `density` = height relief, `intensity`
// = point brightness. GL_POINTS, mediump.

import { createProgram } from '../renderer/webgl.js';
import { mulberry32 } from '../util/pause.js';

const GRID = 130; // points per side

const VS = `
attribute vec3 a_xyz;       // ground x, height, ground y  (x,z in [-0.5,0.5])
uniform float u_time;
uniform float u_density;
uniform float u_intensity;
uniform vec2  u_res;
uniform vec3  u_c1;
uniform vec3  u_c2;
varying vec3 v_col;
varying float v_b;

void main() {
  float yaw = u_time * 0.08;
  float ch = cos(yaw), sh = sin(yaw);
  vec3 q = a_xyz;
  q.y *= mix(0.1, 0.55, u_density);          // height relief
  // Yaw about vertical.
  vec2 r = vec2(ch * q.x - sh * q.z, sh * q.x + ch * q.z);
  // Oblique projection: depth + height.
  vec2 s = vec2(r.x * 1.5, r.y * 0.7 - q.y * 1.1 + 0.12);
  float asp = u_res.y / max(u_res.x, 1.0);
  gl_Position = vec4(s.x * asp, s.y, 0.0, 1.0);

  // Scan plane sweeps across the (pre-yaw) ground y; offset so t=0 is mid-field.
  float scan = fract(u_time * 0.14 + 0.5) - 0.5;
  float gy = a_xyz.z;
  float near = exp(-90.0 * (gy - scan) * (gy - scan));
  float revealed = smoothstep(0.0, 0.04, scan - gy) * 0.28;
  v_b = max(near, revealed) * (0.5 + 0.5 * u_intensity);
  float depth = 0.5 + 0.5 * r.y;
  gl_PointSize = mix(1.5, 3.5, depth);
  v_col = mix(u_c1, u_c2, near);
}
`;

const FS = `
precision mediump float;
varying vec3 v_col;
varying float v_b;
uniform vec3 u_bg;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  if (dot(d, d) > 0.25) discard;            // round points
  gl_FragColor = vec4(mix(u_bg, v_col, clamp(v_b, 0.0, 1.0)), 1.0);
}
`;

export function create({ gl, getColors }) {
  const program = createProgram(gl, VS, FS);
  const aXYZ = gl.getAttribLocation(program, 'a_xyz');
  const u = (n) => gl.getUniformLocation(program, n);
  const uTime = u('u_time');
  const uDen = u('u_density');
  const uInt = u('u_intensity');
  const uRes = u('u_res');
  const uC1 = u('u_c1');
  const uC2 = u('u_c2');
  const uBg = u('u_bg');

  let w = 1;
  let h = 1;
  let buf = null;
  let count = 0;
  let seedKey = null;

  // Cheap seeded value noise on a coarse lattice, bilinearly sampled.
  function buildGeom(seed) {
    if (seedKey === seed && buf) return;
    seedKey = seed;
    const rng = mulberry32(seed || 1);
    const L = 10; // noise lattice resolution
    const lat = new Float32Array((L + 1) * (L + 1));
    for (let i = 0; i < lat.length; i++) lat[i] = rng();
    const sampleH = (u01, v01) => {
      const fx = u01 * L;
      const fy = v01 * L;
      const x0 = Math.min(L - 1, fx | 0);
      const y0 = Math.min(L - 1, fy | 0);
      const tx = fx - x0;
      const ty = fy - y0;
      const a = lat[x0 + y0 * (L + 1)];
      const b = lat[x0 + 1 + y0 * (L + 1)];
      const cc = lat[x0 + (y0 + 1) * (L + 1)];
      const d = lat[x0 + 1 + (y0 + 1) * (L + 1)];
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      return (a + (b - a) * sx) * (1 - sy) + (cc + (d - cc) * sx) * sy;
    };
    const data = new Float32Array(GRID * GRID * 3);
    let p = 0;
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const u01 = i / (GRID - 1);
        const v01 = j / (GRID - 1);
        data[p++] = u01 - 0.5;
        data[p++] = sampleH(u01, v01) - 0.5;
        data[p++] = v01 - 0.5;
      }
    }
    if (!buf) buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    count = GRID * GRID;
  }

  function draw(t, params) {
    buildGeom(params.seed | 0);
    const c = getColors();
    gl.viewport(0, 0, w, h);
    const bg = c.bg || [0.02, 0.03, 0.05];
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aXYZ);
    gl.vertexAttribPointer(aXYZ, 3, gl.FLOAT, false, 0, 0);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uDen, params.density ?? 0.5);
    gl.uniform1f(uInt, params.intensity ?? 0.5);
    gl.uniform2f(uRes, w, h);
    const c1 = c.primary || [0.3, 0.7, 1];
    const c2 = c.accent || [0.95, 0.5, 0.6];
    gl.uniform3f(uC1, c1[0], c1[1], c1[2]);
    gl.uniform3f(uC2, c2[0], c2[1], c2[2]);
    gl.uniform3f(uBg, bg[0], bg[1], bg[2]);
    gl.drawArrays(gl.POINTS, 0, count);
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
        if (buf) gl.deleteBuffer(buf);
      } catch {}
    },
  };
}
