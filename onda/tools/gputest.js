// Renderiza um shader GLSL gerado pela Onda em WebGL2 (Chromium) e compara com a imagem da CPU.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [glslPath, ppmPath, W, H, T] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6]];
  const glsl = fs.readFileSync(glslPath, 'utf8');
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage();
  const r = await p.evaluate(({ glsl, W, H, T }) => {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const gl = c.getContext('webgl2', { preserveDrawingBuffer: true });
    if (!gl) return { err: 'sem webgl2' };
    const sh = (ty, src) => { const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    try {
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, '#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, glsl)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return { err: gl.getProgramInfoLog(pr) };
      gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1fv(gl.getUniformLocation(pr, 'u'), new Float32Array([T, W, H, 0, 0, 0, 0, 0]));
      gl.viewport(0, 0, W, H); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let s = ''; for (let i = 0; i < px.length; i += 32768) s += String.fromCharCode.apply(null, px.subarray(i, i + 32768));
      return { b64: btoa(s), renderer: gl.getParameter(gl.RENDERER) };
    } catch (e) { return { err: String(e) }; }
  }, { glsl, W, H, T });
  await b.close();
  if (r.err) { console.log('ERRO GLSL:', r.err); process.exit(1); }
  const g = Buffer.from(r.b64, 'base64');
  const d = fs.readFileSync(ppmPath); let o = 0, nl = 0; while (nl < 3) { if (d[o++] === 10) nl++; }
  let close = 0, sum = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a = ((H - 1 - y) * W + x) * 4, q = o + (y * W + x) * 3; let m = 0;
    for (let k = 0; k < 3; k++) { const df = Math.abs(g[a + k] - d[q + k]); sum += df; if (df > m) m = df; }
    if (m <= 8) close++;
  }
  console.log(`GPU (${r.renderer}) compilou e renderizou ${W}x${H}; pixeis iguais a CPU (+-8): ${(100 * close / (W * H)).toFixed(2)}%; erro medio ${(sum / (W * H * 3)).toFixed(2)}/255`);
})();
