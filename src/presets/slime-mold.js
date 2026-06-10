// slime-mold — Physarum. Agents live in a float texture (x, y, heading); each
// frame they sense the chemical trail at three points, steer toward the
// strongest, deposit, and move (wrapping toroidally). The trail diffuses and
// decays. Built on the shared ping-pong helper (one for agents, one for the
// trail) plus a vertex-texture-fetch point pass that deposits agents back into
// the trail. `density` = agent count, `intensity` = display contrast. Needs a
// renderable float format (WebGL2 + EXT_color_buffer_float); degrades to a
// frozen field otherwise. Per-frame state → excluded from the visual baseline.

import {
  QUAD_VS,
  createProgram,
  fullscreenQuad,
  bindQuad,
  createPingPong,
} from '../renderer/webgl.js';

const PREC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

const SEED_FS = `${PREC}
varying vec2 v_uv;
uniform float u_seed;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + u_seed) * 43758.5453); }
void main(){
  float x = hash(v_uv * 1.7);
  float y = hash(v_uv * 2.3 + 5.1);
  float a = hash(v_uv * 0.7 + 1.3) * 6.2831853;
  gl_FragColor = vec4(x, y, a, 1.0);
}`;

const UPDATE_FS = `${PREC}
varying vec2 v_uv;
uniform sampler2D u_agents;
uniform sampler2D u_trail;
uniform float u_time, u_sensorDist, u_sensorAngle, u_rotAngle, u_step;
float sense(vec2 pos, float ang){
  vec2 d = vec2(cos(ang), sin(ang)) * u_sensorDist;
  return texture2D(u_trail, fract(pos + d)).x;
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + u_time) * 43758.5453); }
void main(){
  vec4 s = texture2D(u_agents, v_uv);
  vec2 pos = s.xy; float ang = s.z;
  float f = sense(pos, ang);
  float l = sense(pos, ang + u_sensorAngle);
  float r = sense(pos, ang - u_sensorAngle);
  if (f >= l && f >= r) {}
  else if (l > r) ang += u_rotAngle;
  else if (r > l) ang -= u_rotAngle;
  else ang += (hash(v_uv) - 0.5) * u_rotAngle * 2.0;
  pos = fract(pos + vec2(cos(ang), sin(ang)) * u_step);
  gl_FragColor = vec4(pos, ang, 1.0);
}`;

const DEPOSIT_VS = `
attribute vec2 a_id;
uniform sampler2D u_agents;
void main(){
  vec2 pos = texture2D(u_agents, a_id).xy;
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 1.0;
}`;

const DEPOSIT_FS = `precision mediump float;
uniform float u_deposit;
void main(){ gl_FragColor = vec4(vec3(u_deposit), 1.0); }`;

const DIFFUSE_FS = `${PREC}
varying vec2 v_uv;
uniform sampler2D u_trail;
uniform vec2 u_texel;
uniform float u_decay;
void main(){
  float sum = 0.0;
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++)
      sum += texture2D(u_trail, fract(v_uv + vec2(float(i), float(j)) * u_texel)).x;
  gl_FragColor = vec4(vec3(sum / 9.0 * u_decay), 1.0);
}`;

const DISPLAY_FS = `precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_trail;
uniform vec3 u_bg, u_c1, u_c2;
uniform float u_intensity;
void main(){
  float v = texture2D(u_trail, v_uv).x;
  v = clamp(v * (1.0 + u_intensity * 3.0), 0.0, 1.0);
  vec3 col = mix(u_bg, u_c1, smoothstep(0.0, 0.5, v));
  col = mix(col, u_c2, smoothstep(0.5, 1.0, v));
  gl_FragColor = vec4(col, 1.0);
}`;

const TRAIL = { low: 192, med: 256, high: 384 };

export function create({ gl, getColors }) {
  const seedProg = createProgram(gl, QUAD_VS, SEED_FS);
  const updProg = createProgram(gl, QUAD_VS, UPDATE_FS);
  const depProg = createProgram(gl, DEPOSIT_VS, DEPOSIT_FS);
  const difProg = createProgram(gl, QUAD_VS, DIFFUSE_FS);
  const dspProg = createProgram(gl, QUAD_VS, DISPLAY_FS);
  const quad = fullscreenQuad(gl);

  const loc = (p, n) => gl.getUniformLocation(p, n);
  const aQuadSeed = gl.getAttribLocation(seedProg, 'a_pos');
  const aQuadUpd = gl.getAttribLocation(updProg, 'a_pos');
  const aQuadDif = gl.getAttribLocation(difProg, 'a_pos');
  const aQuadDsp = gl.getAttribLocation(dspProg, 'a_pos');
  const aId = gl.getAttribLocation(depProg, 'a_id');

  let W = 1;
  let H = 1;
  let agents = null;
  let trail = null;
  let idBuf = null;
  let A = 0;
  let TT = 0;
  let agentCount = 0;
  let key = '';

  function ensure(params) {
    const q = params.quality || 'med';
    const a = Math.round(96 + (params.density ?? 0.5) * 72); // agents per side
    const tt = TRAIL[q] || TRAIL.med;
    const k = `${params.seed | 0}|${a}|${tt}`;
    if (key === k && agents) return;
    if (agents) agents.dispose();
    if (trail) trail.dispose();
    if (idBuf) gl.deleteBuffer(idBuf);
    A = a;
    TT = tt;
    agentCount = A * A;
    agents = createPingPong(gl, A, A, { filter: gl.NEAREST });
    trail = createPingPong(gl, TT, TT, { filter: gl.LINEAR, wrap: gl.REPEAT });
    // Agent-id point buffer (texel centres).
    const ids = new Float32Array(agentCount * 2);
    let p = 0;
    for (let j = 0; j < A; j++)
      for (let i = 0; i < A; i++) {
        ids[p++] = (i + 0.5) / A;
        ids[p++] = (j + 0.5) / A;
      }
    idBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, idBuf);
    gl.bufferData(gl.ARRAY_BUFFER, ids, gl.STATIC_DRAW);
    key = k;
    seed(params);
  }

  function seed(params) {
    // Seed agents.
    agents.bindDst();
    gl.disable(gl.BLEND);
    gl.useProgram(seedProg);
    bindQuad(gl, quad, aQuadSeed);
    gl.uniform1f(loc(seedProg, 'u_seed'), (params.seed | 0) * 0.001 + 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    agents.swap();
    // Clear both trail buffers.
    for (let i = 0; i < 2; i++) {
      trail.bindDst();
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      trail.swap();
    }
  }

  function stepSim(t) {
    // 1) Agents sense + move.
    agents.bindDst();
    gl.disable(gl.BLEND);
    gl.useProgram(updProg);
    bindQuad(gl, quad, aQuadUpd);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, agents.src());
    gl.uniform1i(loc(updProg, 'u_agents'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, trail.src());
    gl.uniform1i(loc(updProg, 'u_trail'), 1);
    gl.uniform1f(loc(updProg, 'u_time'), t);
    gl.uniform1f(loc(updProg, 'u_sensorDist'), 0.012);
    gl.uniform1f(loc(updProg, 'u_sensorAngle'), 0.45);
    gl.uniform1f(loc(updProg, 'u_rotAngle'), 0.35);
    gl.uniform1f(loc(updProg, 'u_step'), 0.0026);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    agents.swap();

    // 2) Trail: diffuse/decay into the off buffer, then deposit agents on top.
    trail.bindDst();
    gl.disable(gl.BLEND);
    gl.useProgram(difProg);
    bindQuad(gl, quad, aQuadDif);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, trail.src());
    gl.uniform1i(loc(difProg, 'u_trail'), 0);
    gl.uniform2f(loc(difProg, 'u_texel'), 1 / TT, 1 / TT);
    gl.uniform1f(loc(difProg, 'u_decay'), 0.92);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(depProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, idBuf);
    gl.enableVertexAttribArray(aId);
    gl.vertexAttribPointer(aId, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, agents.src());
    gl.uniform1i(loc(depProg, 'u_agents'), 0);
    gl.uniform1f(loc(depProg, 'u_deposit'), 0.22);
    gl.drawArrays(gl.POINTS, 0, agentCount);
    gl.disable(gl.BLEND);
    trail.swap();
  }

  function display(params) {
    const c = getColors();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(dspProg);
    bindQuad(gl, quad, aQuadDsp);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, trail.src());
    gl.uniform1i(loc(dspProg, 'u_trail'), 0);
    const bg = c.bg || [0, 0, 0];
    const c1 = c.primary || [0.3, 0.7, 0.5];
    const c2 = c.accent || [0.95, 0.5, 0.3];
    gl.uniform3f(loc(dspProg, 'u_bg'), bg[0], bg[1], bg[2]);
    gl.uniform3f(loc(dspProg, 'u_c1'), c1[0], c1[1], c1[2]);
    gl.uniform3f(loc(dspProg, 'u_c2'), c2[0], c2[1], c2[2]);
    gl.uniform1f(loc(dspProg, 'u_intensity'), params.intensity ?? 0.5);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) {
      W = Math.max(1, nw);
      H = Math.max(1, nh);
    },
    frame(t, params) {
      ensure(params);
      stepSim(t);
      display(params);
    },
    staticFrame(params) {
      ensure(params);
      seed(params);
      for (let i = 0; i < 80; i++) stepSim(i * 0.05);
      display(params);
    },
    dispose() {
      try {
        if (agents) agents.dispose();
        if (trail) trail.dispose();
        if (idBuf) gl.deleteBuffer(idBuf);
        gl.deleteProgram(seedProg);
        gl.deleteProgram(updProg);
        gl.deleteProgram(depProg);
        gl.deleteProgram(difProg);
        gl.deleteProgram(dspProg);
        gl.deleteBuffer(quad);
      } catch {}
    },
  };
}
