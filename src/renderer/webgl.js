// Thin WebGL2 wrapper with WebGL1 fallback. No state machine — presets own their programs.

export function createGLContext(canvas) {
  const opts = {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power',
  };
  return canvas.getContext('webgl2', opts) || canvas.getContext('webgl', opts);
}

export function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(s) || 'unknown';
    gl.deleteShader(s);
    // Echo the GL log so the cause is visible in the console, not only wrapped
    // inside the host's runtime-error event.
    console.error('bg-wc: shader compile failed\n' + info);
    throw new Error('Shader compile failed: ' + info);
  }
  return s;
}

export function createProgram(gl, vsSrc, fsSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  const ok = gl.getProgramParameter(p, gl.LINK_STATUS);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!ok) {
    const info = gl.getProgramInfoLog(p) || 'unknown';
    gl.deleteProgram(p);
    console.error('bg-wc: program link failed\n' + info);
    throw new Error('Program link failed: ' + info);
  }
  return p;
}

// Reusable: two triangles covering clip space.
export function fullscreenQuad(gl) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  return buf;
}

// Shared vertex shader for fullscreen quad. Written in GLSL ES 1.00 so it works on WebGL1 and WebGL2.
export const QUAD_VS = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Returns a draw fn for a fullscreen quad bound to attribute index `loc`.
export function bindQuad(gl, buf, loc) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
}

// -----------------------------------------------------------------------------
// Ping-pong framebuffers — shared by stateful simulation presets (reaction-
// diffusion, slime-mold, spectrum). Two textures + their FBOs; each step reads
// `src()` and renders into `bindDst()`, then `swap()`. Textures start empty —
// seed the field with a render pass (uploading half-float pixel data is
// awkward; rendering is not). `dispose()` deletes both textures and both FBOs.
//
// Format ladder (gl-wc-5cbv) — the first candidate whose framebuffer reports
// FRAMEBUFFER_COMPLETE wins, so `float` is only ever true for a target that
// really renders:
//   1. WebGL2 + EXT_color_buffer_float          → RGBA16F / HALF_FLOAT
//   2. WebGL1 + OES_texture_half_float           → RGBA / HALF_FLOAT_OES
//   3. WebGL1 + OES_texture_float                → RGBA / FLOAT
//   4. RGBA / UNSIGNED_BYTE                      (float: false)
// A LINEAR filter on a float target needs the matching *_linear extension;
// without it the target is created with NEAREST rather than left incomplete.
// If even the byte target is incomplete the helper THROWS: the caller's
// create() then fails and the host shows its fallback, instead of a preset
// quietly rendering into a framebuffer that drops every draw.
//
// WebGL1 caveat: a texture that wraps (REPEAT / MIRRORED_REPEAT) must be
// power-of-two or sampling returns black. The helper refuses that
// combination up front (throws) so the misuse is loud, not blank.
export function createPingPong(gl, width, height, opts = {}) {
  const isGL2 =
    typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  const wantFloat = opts.float !== false;
  const wrap = opts.wrap || gl.CLAMP_TO_EDGE;
  const wantFilter = opts.filter || gl.NEAREST;

  const pot = (n) => n > 0 && (n & (n - 1)) === 0;
  if (!isGL2 && wrap !== gl.CLAMP_TO_EDGE && !(pot(width) && pot(height))) {
    throw new Error(
      `bg-wc: WebGL1 needs power-of-two dimensions for a wrapping texture (got ${width}x${height})`
    );
  }

  // Candidate formats, best first. `linearExt` names the extension a LINEAR
  // filter needs on that format (null: always filterable).
  const candidates = [];
  if (wantFloat) {
    if (isGL2 && gl.getExtension('EXT_color_buffer_float')) {
      candidates.push({ internal: gl.RGBA16F, type: gl.HALF_FLOAT, float: true, linearExt: null });
    }
    if (!isGL2) {
      const half = gl.getExtension('OES_texture_half_float');
      if (half) {
        // Optional on some drivers; the status check below is what decides.
        gl.getExtension('EXT_color_buffer_half_float');
        candidates.push({
          internal: gl.RGBA,
          type: half.HALF_FLOAT_OES,
          float: true,
          linearExt: 'OES_texture_half_float_linear',
        });
      }
      if (gl.getExtension('OES_texture_float')) {
        gl.getExtension('WEBGL_color_buffer_float');
        candidates.push({
          internal: gl.RGBA,
          type: gl.FLOAT,
          float: true,
          linearExt: 'OES_texture_float_linear',
        });
      }
    }
  }
  candidates.push({ internal: gl.RGBA, type: gl.UNSIGNED_BYTE, float: false, linearExt: null });

  let textures = [];
  let fbos = [];
  let float = false;

  function makeTex(c, filter) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, c.internal, width, height, 0, gl.RGBA, c.type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return tex;
  }
  function makeFbo(tex) {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return fbo;
  }
  function release() {
    for (const t of textures) gl.deleteTexture(t);
    for (const f of fbos) gl.deleteFramebuffer(f);
    textures = [];
    fbos = [];
  }

  let complete = false;
  for (const c of candidates) {
    const filter =
      wantFilter === gl.LINEAR && c.linearExt && !gl.getExtension(c.linearExt)
        ? gl.NEAREST
        : wantFilter;
    textures = [makeTex(c, filter), makeTex(c, filter)];
    fbos = [makeFbo(textures[0]), makeFbo(textures[1])];
    complete =
      gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE &&
      (gl.bindFramebuffer(gl.FRAMEBUFFER, fbos[0]),
      gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE);
    if (complete) {
      float = c.float;
      break;
    }
    release();
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!complete) {
    throw new Error(`bg-wc: no renderable framebuffer format for a ${width}x${height} target`);
  }

  let cur = 0;
  return {
    width,
    height,
    float,
    src() {
      return textures[cur];
    },
    // Bind the off (write) target and set the viewport to the buffer size.
    bindDst() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbos[cur ^ 1]);
      gl.viewport(0, 0, width, height);
    },
    swap() {
      cur ^= 1;
    },
    dispose: release,
  };
}
