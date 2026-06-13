// komorebi — dappled late-afternoon light through swaying trees. A foliage
// shadow base (layered fbm) is pierced by soft warm sunflecks: bright blobs
// that drift and breathe as if leaves shift overhead, with long raking light
// shafts and a gentle ripple. Deliberately diverged from `caustics` (cool,
// fast, water-celled): this is warm, slow, leaf-edged, gold-green. `density` =
// fleck density, `intensity` = light strength. makeShaderPreset-shaped but with
// its own create() (needs u_res); dispose() frees program + buffer.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time, u_intensity, u_density;
uniform vec3 u_bg, u_c1, u_c2, u_c3;   // shade base, leaf, sunlight, warm rim
uniform vec2 u_res;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; }
  return v;
}

void main(){
  vec2 p = v_uv;
  p.x *= u_res.x / max(u_res.y, 1.0);
  float t = u_time * 0.06;                       // slow leaf sway

  // Foliage shade: layered canopy noise drifting on a light breeze.
  vec2 sway = vec2(sin(t * 0.9) * 0.05, cos(t * 0.7) * 0.03);
  float canopy = fbm(p * 3.2 + sway * 2.0);
  canopy = canopy * 0.7 + fbm(p * 7.0 - sway) * 0.3;

  // Base: deep leaf-shade between bg and a cool leaf green.
  vec3 col = mix(u_bg, u_c1, 0.4 + 0.4 * canopy);

  // Sunflecks: high-frequency canopy gaps that the light pours through. The
  // threshold drifts so flecks open and close like moving leaves.
  float gaps = fbm(p * mix(5.0, 10.0, u_density) + vec2(t * 1.3, -t));
  float thresh = 0.62 - 0.12 * sin(t * 1.7);
  float fleck = smoothstep(thresh, thresh + 0.16, gaps);
  // Soften + add a second finer sparkle layer.
  fleck *= 0.7 + 0.3 * smoothstep(0.5, 0.9, fbm(p * 16.0 + t * 2.0));

  // Long raking light shafts (late afternoon, low angle).
  float shaft = 0.5 + 0.5 * sin((p.x * 1.2 + p.y * 2.4) * 3.0 + t * 0.6);
  shaft = pow(shaft, 3.0) * 0.4;

  float light = clamp(fleck + shaft * fleck, 0.0, 1.0) * (0.55 + 0.6 * u_intensity);
  col = mix(col, u_c2, light);              // warm sunlight in the gaps
  col += u_c3 * pow(light, 2.0) * 0.5;       // warm rim/bloom at the brightest

  // Gentle vignette so the eye settles centre-frame.
  float vig = 1.0 - 0.35 * length(v_uv - 0.5);
  gl_FragColor = vec4(col * vig, 1.0);
}
`;

export function create({ gl, getColors }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const u = (n) => gl.getUniformLocation(program, n);
  const uTime = u('u_time');
  const uInt = u('u_intensity');
  const uDen = u('u_density');
  const uBg = u('u_bg');
  const uC1 = u('u_c1');
  const uC2 = u('u_c2');
  const uC3 = u('u_c3');
  const uRes = u('u_res');
  let w = 1;
  let h = 1;

  function draw(t, params) {
    const c = getColors();
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    bindQuad(gl, buf, aPos);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uInt, params.intensity ?? 0.5);
    gl.uniform1f(uDen, params.density ?? 0.5);
    // Shade base = bg toward a deep green; leaf = success/primary; sunlight =
    // warning; warm rim = accent.
    const bg = c.bg || [0.06, 0.09, 0.05];
    const leaf = c.success || c.primary || [0.2, 0.4, 0.2];
    const sun = c.warning || [0.95, 0.85, 0.5];
    const rim = c.accent || [1, 0.7, 0.4];
    gl.uniform3f(uBg, bg[0], bg[1], bg[2]);
    gl.uniform3f(uC1, leaf[0], leaf[1], leaf[2]);
    gl.uniform3f(uC2, sun[0], sun[1], sun[2]);
    gl.uniform3f(uC3, rim[0], rim[1], rim[2]);
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
      draw(2.5, params);
    },
    dispose() {
      try {
        gl.deleteProgram(program);
        gl.deleteBuffer(buf);
      } catch {}
    },
  };
}
