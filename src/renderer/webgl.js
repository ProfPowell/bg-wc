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
// diffusion, slime-mold, oscilloscope persistence). Two textures + their FBOs;
// each step reads `src()` and renders into `bindDst()`, then `swap()`. Prefers a
// renderable half-float format on WebGL2 (EXT_color_buffer_float) for headroom,
// and degrades to RGBA8 (UNSIGNED_BYTE) so it still runs on WebGL1 / hosts
// without float-renderable framebuffers. Textures start empty — seed the field
// with a render pass (uploading half-float pixel data is awkward; rendering is
// not). `dispose()` deletes both textures and both framebuffers.
export function createPingPong(gl, width, height, opts = {}) {
  const isGL2 =
    typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  const wantFloat = opts.float !== false;
  const wrap = opts.wrap || gl.CLAMP_TO_EDGE;
  const filter = opts.filter || gl.NEAREST;

  // Pick the best renderable format available.
  let internalFormat = gl.RGBA;
  let type = gl.UNSIGNED_BYTE;
  let float = false;
  if (wantFloat && isGL2 && gl.getExtension('EXT_color_buffer_float')) {
    internalFormat = gl.RGBA16F;
    type = gl.HALF_FLOAT;
    float = true;
  }

  function makeTex() {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, gl.RGBA, type, null);
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

  let textures = [makeTex(), makeTex()];
  let fbos = [makeFbo(textures[0]), makeFbo(textures[1])];

  // If a float framebuffer came back incomplete, fall back to byte and rebuild.
  if (float && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    for (const t of textures) gl.deleteTexture(t);
    for (const f of fbos) gl.deleteFramebuffer(f);
    internalFormat = gl.RGBA;
    type = gl.UNSIGNED_BYTE;
    float = false;
    textures = [makeTex(), makeTex()];
    fbos = [makeFbo(textures[0]), makeFbo(textures[1])];
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

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
    dispose() {
      for (const t of textures) gl.deleteTexture(t);
      for (const f of fbos) gl.deleteFramebuffer(f);
      textures = [];
      fbos = [];
    },
  };
}
