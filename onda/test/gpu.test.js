// Forma GPU (ondac -g px): o shader GLSL gerado pela Onda renderiza em WebGL2 (Chromium/SwiftShader) e dá
// a mesma imagem que a forma CPU (D), dentro da tolerancia declarada no proprio exemplo (+-8/255 em 95% dos pixeis).
// Se nao houver browser disponivel, o teste salta em vez de falhar.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-gpu-'));
const W = 480, H = 270, T = 2.0;   // metade da resolucao do exemplo, chega para comparar

function tokval(src, nome) { const m = src.match(new RegExp(': ' + nome + ' >i (\\d+)')); return m ? +m[1] : null; }

test('GPU: o GLSL da Onda renderiza em WebGL2 e iguala a CPU (tolerancia do exemplo)', async (ctx) => {
  let chromium;
  try { chromium = require('playwright').chromium; } catch { return ctx.skip('playwright indisponivel'); }

  const src = fs.readFileSync(path.join(R, 'ex/julia.onda'), 'utf8');
  const tol = tokval(src, 'tol') ?? 8, aceita = tokval(src, 'aceita') ?? 95;
  const glsl = execFileSync(ondac, ['-g', 'px'], { input: src }).toString();
  // imagem da CPU na mesma resolucao (editar os argumentos de D no main)
  const cpuSrc = src.replace('D 960 540 px 2.0 960.0 540.0', `D ${W} ${H} px ${T.toFixed(1)} ${W}.0 ${H}.0`);
  fs.writeFileSync(path.join(t, 'j.c'), execFileSync(ondac, [], { input: cpuSrc }));
  execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'j.c'), '-o', path.join(t, 'jc'), '-lm']);
  const ppm = execFileSync(path.join(t, 'jc'));

  let b;
  try { b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); }
  catch (e) { return ctx.skip('sem browser: ' + e.message); }
  let r;
  try {
    const p = await b.newPage();
    r = await p.evaluate(({ glsl, W, H, T }) => {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const gl = c.getContext('webgl2', { preserveDrawingBuffer: true });
      if (!gl) return { err: 'sem webgl2' };
      const sh = (ty, s) => { const o = gl.createShader(ty); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
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
        return { b64: btoa(s) };
      } catch (e) { return { err: String(e) }; }
    }, { glsl, W, H, T });
  } finally { await b.close(); }

  assert.ok(!r.err, 'GLSL nao compilou/renderizou: ' + r.err);
  const g = Buffer.from(r.b64, 'base64');
  let o = 0, nl = 0; while (nl < 3) { if (ppm[o++] === 10) nl++; }   // saltar o cabecalho PPM
  let close = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a = ((H - 1 - y) * W + x) * 4, q = o + (y * W + x) * 3; let m = 0;
    for (let k = 0; k < 3; k++) { const df = Math.abs(g[a + k] - ppm[q + k]); if (df > m) m = df; }
    if (m <= tol) close++;
  }
  const pct = 100 * close / (W * H);
  assert.ok(pct >= aceita, `so ${pct.toFixed(2)}% dos pixeis dentro de +-${tol} (exigido ${aceita}%)`);
});
