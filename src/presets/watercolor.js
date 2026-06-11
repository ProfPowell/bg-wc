// watercolor — wet-on-wet blooms. Seeded splat centres expand with
// fbm-perturbed edges; pigment glazes multiplicatively (layered washes
// darken where they overlap) with a darker edge-pigment band (the hallmark
// wet-edge granulation) bleeding into paper grain. The deliberate multicolor
// western counterpart to sumi-e: multiple hues on light paper with hard
// granulated edges, not monochrome ink on soft bloom. Splats grow in over a
// long cycle, hold, then fade for the next set. `density` = splat count,
// `intensity` = pigment strength. dispose() releases program + buffer.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';
import { mulberry32 } from '../util/pause.js';

const MAX_SPLATS = 12;
const CYCLE = 24; // seconds: grow + hold + fade
const START_OFF = CYCLE * 0.55; // clock offset so a frozen first frame shows grown washes

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time, u_intensity, u_cycle;
uniform int u_nsplats;
uniform vec4 u_splats[${MAX_SPLATS}];   // x, y, maxR, startFrac
uniform float u_hue[${MAX_SPLATS}];     // role pick per splat
uniform vec3 u_roles[5];
uniform vec3 u_bg;
uniform vec2 u_res;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  return 0.5 * vnoise(p) + 0.3 * vnoise(p * 2.3 + 5.0) + 0.2 * vnoise(p * 4.7 + 11.0);
}

void main() {
  vec2 p = v_uv;
  p.x *= u_res.x / max(u_res.y, 1.0);

  // Paper: light ground with grain.
  float grain = fbm(p * 30.0);
  vec3 paper = mix(u_bg, vec3(1.0), 0.25);
  paper *= 0.97 + grain * 0.05;

  float cyc = u_time / u_cycle;
  float local = fract(cyc);
  float fade = 1.0 - smoothstep(0.88, 1.0, local); // washes lift at cycle end

  vec3 col = paper;
  for (int i = 0; i < ${MAX_SPLATS}; i++) {
    if (i >= u_nsplats) break;
    vec4 s = u_splats[i];
    // Saturating growth from this splat's start fraction.
    float g = clamp((local - s.w) * 4.0, 0.0, 1.0);
    g = 1.0 - (1.0 - g) * (1.0 - g);
    float r = s.z * g;
    if (r <= 0.001) continue;

    // Wet edge: radius perturbed by fbm around the rim (granulation).
    float wob = (fbm(p * 7.0 + float(i) * 13.7) - 0.5) * s.z * 0.55;
    float d = distance(p, s.xy) + wob;

    vec3 pig = u_roles[0];
    for (int k = 0; k < 5; k++) if (float(k) == u_hue[i]) pig = u_roles[k];

    float body = 1.0 - smoothstep(r * 0.55, r, d);
    float edge = smoothstep(r * 0.78, r * 0.97, d) * (1.0 - smoothstep(r * 0.97, r * 1.02, d));
    float str = (0.28 + 0.4 * u_intensity) * fade;
    // Glaze: multiply toward the pigment; the rim runs darker.
    col *= mix(vec3(1.0), pig, body * str * (0.85 + grain * 0.3));
    col *= mix(vec3(1.0), pig * 0.55, edge * str * 1.15);
  }

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
  const uCycle = u('u_cycle');
  const uN = u('u_nsplats');
  const uSplats = u('u_splats[0]');
  const uHue = u('u_hue[0]');
  const uRoles = u('u_roles[0]');
  const uBg = u('u_bg');
  const uRes = u('u_res');

  let w = 1;
  let h = 1;
  let splats = null;
  let hues = null;
  let nSplats = 0;
  let key = '';

  function build(params, era) {
    const n = Math.min(MAX_SPLATS, 4 + Math.round((params.density ?? 0.5) * 8));
    const k = `${params.seed | 0}|${n}|${era}|${w}x${h}`;
    if (splats && key === k) return;
    key = k;
    nSplats = n;
    const rng = mulberry32((params.seed | 0 || 1) + era * 1013904223);
    const asp = w / Math.max(1, h);
    splats = new Float32Array(MAX_SPLATS * 4);
    hues = new Float32Array(MAX_SPLATS);
    for (let i = 0; i < n; i++) {
      splats[i * 4] = (0.12 + rng() * 0.76) * asp;
      splats[i * 4 + 1] = 0.12 + rng() * 0.76;
      splats[i * 4 + 2] = 0.12 + rng() * 0.22; // max radius
      splats[i * 4 + 3] = (i / n) * 0.5 + rng() * 0.05; // staggered starts
      hues[i] = (rng() * 5) | 0;
    }
  }

  function draw(t, params) {
    const era = Math.floor(t / CYCLE);
    build(params, era);
    const c = getColors();
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    bindQuad(gl, buf, aPos);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uInt, params.intensity ?? 0.5);
    gl.uniform1f(uCycle, CYCLE);
    gl.uniform1i(uN, nSplats);
    gl.uniform4fv(uSplats, splats);
    gl.uniform1fv(uHue, hues);
    const roles = [
      c.primary || [0.3, 0.45, 0.8],
      c.accent || [0.85, 0.35, 0.45],
      c.info || [0.3, 0.65, 0.65],
      c.warning || [0.9, 0.7, 0.3],
      c.success || [0.4, 0.65, 0.4],
    ];
    const flat = new Float32Array(15);
    for (let i = 0; i < 5; i++) {
      flat[i * 3] = roles[i][0];
      flat[i * 3 + 1] = roles[i][1];
      flat[i * 3 + 2] = roles[i][2];
    }
    gl.uniform3fv(uRoles, flat);
    const bg = c.bg || [0.96, 0.95, 0.92];
    gl.uniform3f(uBg, bg[0], bg[1], bg[2]);
    gl.uniform2f(uRes, w, h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      key = '';
    },
    frame(t, params) {
      draw(t + START_OFF, params);
    },
    staticFrame(params) {
      draw(CYCLE * 0.75, params); // all washes grown, pre-fade
    },
    dispose() {
      try {
        gl.deleteProgram(program);
        gl.deleteBuffer(buf);
      } catch {}
    },
  };
}
