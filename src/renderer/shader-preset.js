// makeShaderPreset — collapses the boilerplate shared by fullscreen-quad shader
// presets (createProgram → a_pos → N uniform locations → viewport/clear/
// useProgram/bindQuad → N uniform*f → drawArrays → dispose). A preset becomes
// its fragment shader plus the list of uniforms it declares.
//
// Only the closed uniform vocabulary below is supported. Presets needing
// blending or a custom uniform (e.g. paper-grain, girih, op-art) keep their own
// create().

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from './webgl.js';

// Each setter writes one uniform from the standard sources: animation time `t`,
// the live `params`, the resolved colors `c`, and the canvas size `w`/`h`.
const SETTERS = {
  u_time: (gl, l, t) => gl.uniform1f(l, t),
  u_intensity: (gl, l, t, p) => gl.uniform1f(l, p.intensity),
  u_density: (gl, l, t, p) => gl.uniform1f(l, p.density),
  u_c1: (gl, l, t, p, c) => gl.uniform3f(l, c.primary[0], c.primary[1], c.primary[2]),
  u_c2: (gl, l, t, p, c) => gl.uniform3f(l, c.accent[0], c.accent[1], c.accent[2]),
  u_c3: (gl, l, t, p, c) => gl.uniform3f(l, c.info[0], c.info[1], c.info[2]),
  u_bg: (gl, l, t, p, c) => gl.uniform3f(l, c.bg[0], c.bg[1], c.bg[2]),
  u_fg: (gl, l, t, p, c) => gl.uniform3f(l, c.fg[0], c.fg[1], c.fg[2]),
  u_ink: (gl, l, t, p, c) => gl.uniform3f(l, c.fg[0], c.fg[1], c.fg[2]),
  u_res: (gl, l, t, p, c, w, h) => gl.uniform2f(l, w, h),
};

// Returns a preset create() for the given fragment shader and the uniform names
// it uses (must all be keys of SETTERS).
export function makeShaderPreset(FS, uniformNames) {
  for (const name of uniformNames) {
    if (!SETTERS[name]) throw new Error(`makeShaderPreset: unsupported uniform "${name}"`);
  }
  return function create({ gl, getColors }) {
    const program = createProgram(gl, QUAD_VS, FS);
    const buf = fullscreenQuad(gl);
    const aPos = gl.getAttribLocation(program, 'a_pos');
    const locs = uniformNames.map((name) => [name, gl.getUniformLocation(program, name)]);

    let w = 1,
      h = 1;

    function draw(t, params) {
      const c = getColors();
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      bindQuad(gl, buf, aPos);
      for (const [name, loc] of locs) SETTERS[name](gl, loc, t, params, c, w, h);
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
  };
}
