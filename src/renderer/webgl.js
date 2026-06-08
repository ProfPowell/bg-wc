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
