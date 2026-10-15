(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const nf = new Intl.NumberFormat('pt-PT');
  const n1 = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const n2 = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });
  const HASH = '3d642bfb440145f1e3b63d79c12b82f576f2ca7cc9b2030dd3da294144584326';
  const EX = {
    julia: { src: $('s-julia').textContent, glsl: $('g-julia').textContent, t0: 2.0 },
    ondas: { src: $('s-ondas').textContent, glsl: $('g-ondas').textContent, t0: 1.0 },
  };

  // ---------- GPU ----------
  const cv = $('cv'), W = cv.width, H = cv.height;
  let gl = null;
  try { gl = cv.getContext('webgl2', { antialias: false, alpha: false }); } catch (e) { gl = null; }
  let prog = null, uLoc = null, vsObj = null;
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let tNow = EX.julia.t0, tOff = tNow, tStart = performance.now(), mx = 0, my = 0;
  const VS = '#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  function shader(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const m = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(m); }
    return s;
  }
  function useGLSL(fs) {
    if (!gl) return;
    if (!vsObj) {
      vsObj = shader(gl.VERTEX_SHADER, VS);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    }
    const f = shader(gl.FRAGMENT_SHADER, fs), p = gl.createProgram();
    gl.attachShader(p, vsObj); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    if (prog) gl.deleteProgram(prog);
    prog = p; uLoc = gl.getUniformLocation(p, 'u');
    gl.useProgram(p); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    draw();
  }
  function draw() {
    if (!gl || !prog) return;
    gl.viewport(0, 0, W, H);
    gl.uniform1fv(uLoc, new Float32Array([tNow, W, H, mx, my, 0, 0, 0]));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    $('ro-t').textContent = 't = ' + n1.format(tNow) + ' s';
  }
  function loop(now) {
    if (!paused) { tNow = tOff + (now - tStart) / 1000; draw(); }
    requestAnimationFrame(loop);
  }
  const playBtn = $('play');
  function syncPlay() { playBtn.textContent = paused ? 'Continuar' : 'Pausar'; }
  playBtn.addEventListener('click', () => {
    paused = !paused;
    if (!paused) { tOff = tNow; tStart = performance.now(); }
    syncPlay();
  });
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width * W; my = (e.clientY - r.top) / r.height * H;
    if (paused) draw();
  });
  function setTime(t) { tNow = t; tOff = t; tStart = performance.now(); }

  // ---------- compilador ----------
  const ta = $('src'), st = $('status'), out = $('out'), osz = $('out-size');
  let ready = false, view = 'glsl', cur = 'julia', lastGLSL = EX.julia.glsl, lastC = '', seq = 0, tm = 0;
  function setStatus(cls, msg) { st.className = 'status' + (cls ? ' ' + cls : ''); st.textContent = msg; }
  function showOut(t) { out.textContent = t; osz.textContent = nf.format(t.length) + ' bytes'; }
  function tokAt(src, n) {
    const ws = c => c === ' ' || c === '\t' || c === '\n' || c === '\r';
    let i = 0, k = 0;
    while (i < src.length) {
      const c = src[i];
      if (ws(c)) { i++; continue; }
      if (c === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }
      const s = i;
      if (c === '"') { i++; while (i < src.length && src[i] !== '"') { if (src[i] === '\\') i++; i++; } i++; }
      else { while (i < src.length && !ws(src[i])) i++; }
      if (k === n) return src.slice(s, i);
      k++;
    }
    return null;
  }
  function errText(t, src) {
    const m = /#error onda: (.*) \(token (\d+)\)/.exec(t);
    if (!m) return t.trim();
    const n = +m[2], tk = tokAt(src, n > 0 ? n - 1 : 0);
    const near = tk === null ? 'no fim do código' : 'perto de «' + (tk.length > 24 ? tk.slice(0, 24) + '…' : tk) + '»';
    return 'Erro: ' + m[1] + ', ' + near + '. A imagem mostra o último resultado bom.';
  }
  async function compile() {
    if (!ready) return;
    const me = ++seq, src = ta.value;
    const g = await OndaC.compile(src, 'px');
    if (me !== seq) return;
    if (g.code !== 0) { setStatus('bad', errText(g.text, src)); return; }
    try { useGLSL(g.text); } catch (e) { setStatus('bad', 'A GPU recusou o shader: ' + String(e.message || e).slice(0, 240)); return; }
    lastGLSL = g.text; lastC = '';
    setStatus('ok', 'Compilado no teu browser em ' + n2.format(g.ms) + ' ms: ' + nf.format(g.text.length) + ' bytes de GLSL para a GPU' + (gl ? '.' : ' (este dispositivo não tem WebGL2).'));
    if (view === 'c') await showC(); else showOut(lastGLSL);
  }
  async function showC() {
    if (!ready) { showOut('O compilador não arrancou neste visualizador, por isso o C não pode ser gerado aqui.'); return; }
    if (!lastC) { const c = await OndaC.compile(ta.value, null); lastC = c.code === 0 ? c.text : errText(c.text, ta.value); }
    showOut(lastC);
  }
  ta.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(compile, 160); });
  const tabs = { glsl: $('tab-glsl'), c: $('tab-c') };
  Object.entries(tabs).forEach(([k, b]) => b.addEventListener('click', () => {
    view = k;
    Object.entries(tabs).forEach(([j, x]) => x.setAttribute('aria-selected', String(j === k)));
    if (k === 'c') showC(); else showOut(lastGLSL);
  }));
  function loadExample(name) {
    cur = name; ta.value = EX[name].src; setTime(EX[name].t0); lastC = '';
    if (ready) compile();
    else { lastGLSL = EX[name].glsl; try { useGLSL(lastGLSL); } catch (e) { /* mantido */ } if (view === 'glsl') showOut(lastGLSL); }
  }
  $('ex').addEventListener('change', e => loadExample(e.target.value));
  $('reset').addEventListener('click', () => loadExample(cur));

  ta.value = EX.julia.src;
  showOut(EX.julia.glsl);
  syncPlay();
  if (gl) {
    try { useGLSL(EX.julia.glsl); $('ro-dev').textContent = 'GPU · WebGL2'; } catch (e) { setStatus('bad', 'A GPU recusou o shader: ' + e.message); }
    requestAnimationFrame(loop);
  } else {
    cv.hidden = true; $('fallback').hidden = false; playBtn.disabled = true;
    $('ro-dev').textContent = 'CPU · sem WebGL2 neste dispositivo';
  }
  (async () => {
    try {
      const r = await fetch('ondac.wasm');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      await OndaC.load(await r.arrayBuffer());
      ready = true;
      await compile();
    } catch (e) {
      setStatus('', 'Este visualizador não deixou arrancar o compilador WebAssembly (' + (e.message || e) + '). A imagem vem de um shader que a Onda compilou antes.');
      $('verify').disabled = true;
      $('vres').textContent = 'A verificação precisa do compilador WebAssembly, que não arrancou aqui.';
    }
  })();

  // ---------- prova do ponto fixo ----------
  $('verify').addEventListener('click', async () => {
    const b = $('verify'), v = $('vres');
    b.disabled = true; v.className = ''; v.textContent = 'A compilar o compilador…';
    try {
      const src = await (await fetch('f/ondac.onda')).text();
      const r = await OndaC.compile(src, null);
      const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(r.text)));
      const h = Array.from(d, x => x.toString(16).padStart(2, '0')).join('');
      if (r.code === 0 && h === HASH) {
        v.className = 'ok';
        v.textContent = 'Idêntico. A Onda compilou-se a si própria no teu browser em ' + n2.format(r.ms) + ' ms: ' + nf.format(r.text.length) + ' bytes de C, SHA-256 ' + h.slice(0, 8) + '…' + h.slice(-4) + '.';
      } else { v.className = 'bad'; v.textContent = 'Resultado diferente: SHA-256 ' + h.slice(0, 16) + '…'; }
    } catch (e) { v.className = 'bad'; v.textContent = 'Não foi possível verificar: ' + (e.message || e); }
    b.disabled = false;
  });

  // ---------- grafico ----------
  const BENCH = [
    { t: 'fib(35), recursivo', s: 'código sequencial', r: [['Onda', 15.3], ['C -O3', 16.3], ['JavaScript (Node)', 110.7], ['Python', 901.5]] },
    { t: 'π com 200 milhões de termos', s: 'S: redução paralela automática', r: [['Onda', 68.0], ['C -O3 sequencial', 246.3], ['C + OpenMP escrito à mão', 67.1], ['JavaScript (Node)', 471.1], ['Python *', 26947.9]] },
    { t: 'Fractal 960×540', s: 'D: píxeis em paralelo', r: [['Onda', 12.7], ['C -O3 sequencial', 30.8], ['C + OpenMP escrito à mão', 11.8], ['JavaScript (Node)', 73.0], ['Python *', 1153.1]] },
  ];
  const LO = Math.log10(5), HI = Math.log10(50000), X = ms => Math.max(0, (Math.log10(ms) - LO) / (HI - LO) * 100);
  const TICKS = [10, 100, 1000, 10000];
  const fms = ms => (ms < 100 ? n1.format(ms) : nf.format(Math.round(ms))) + ' ms';
  const ffac = f => (f < 10 ? n1.format(f) : nf.format(Math.round(f))) + '×';
  const chart = $('chart'), tip = document.createElement('div');
  tip.className = 'tip'; tip.hidden = true;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
  BENCH.forEach(g => {
    const box = el('div', 'cg'), h = el('h4', '', g.t + ' ');
    h.appendChild(el('small', '', '· ' + g.s)); box.appendChild(h);
    const base = g.r[0][1];
    g.r.forEach(([lab, ms], i) => {
      const row = el('div', 'crow' + (i === 0 ? ' hi' : '')), tr = el('div', 'track'), bar = el('div', 'bar');
      const fac = ms / base, say = i === 0 ? 'referência' : ffac(fac) + ' o tempo da Onda';
      row.tabIndex = 0; row.setAttribute('aria-label', lab + ': ' + fms(ms) + ', ' + say);
      TICKS.forEach(t => { const gl_ = el('div', 'gl'); gl_.style.left = X(t) + '%'; tr.appendChild(gl_); });
      bar.style.width = X(ms) + '%'; tr.appendChild(bar);
      const v = el('span', 'cv', fms(ms)); v.appendChild(el('small', '', say));
      row.append(el('span', 'cl', lab), tr, v);
      const show = () => {
        tip.textContent = lab + ': ' + fms(ms) + (i === 0 ? '' : ', ' + ffac(fac) + ' o tempo da Onda');
        tip.hidden = false;
        const c = chart.getBoundingClientRect(), b = bar.getBoundingClientRect();
        const left = Math.min(Math.max(0, b.right - c.left + 8), Math.max(0, c.width - tip.offsetWidth));
        tip.style.left = left + 'px'; tip.style.top = (b.top - c.top - 34) + 'px';
      };
      row.addEventListener('pointerenter', show); row.addEventListener('focus', show);
      row.addEventListener('pointerleave', () => { tip.hidden = true; }); row.addEventListener('blur', () => { tip.hidden = true; });
      box.appendChild(row);
    });
    const ax = el('div', 'axis'), tk = el('div', 'ticks');
    TICKS.forEach(t => { const s = el('span', '', nf.format(t) + ' ms'); s.style.left = X(t) + '%'; tk.appendChild(s); });
    ax.append(el('span'), tk, el('span'));
    box.appendChild(ax);
    chart.appendChild(box);
  });
  chart.appendChild(tip);

  // ---------- referencia ----------
  const REF = [
    [': nome if>f a b corpo', 'define uma função: tipos dos parâmetros > tipo devolvido'],
    ['+ - * /', 'aritmética, com o mesmo tipo dos dois lados'],
    ['% & | ^ << >>', 'só para inteiros'],
    ['< > <= >= == !=', 'comparação, devolve 0 ou 1'],
    ['&& || ~', 'lógica com curto-circuito'],
    ['F I', 'inteiro → real, real → inteiro'],
    ['Sq Sn Cs Ex Lg Fl Ab', 'raiz, seno, cosseno, exp, log, chão, módulo'],
    ['Pw At Mn Mx', 'potência, atan2, mínimo, máximo'],
    ['? c a b', 'se c então a, senão b'],
    ['W c b', 'enquanto c, faz b'],
    ['{ e1 … en }', 'sequência; vale a última'],
    ['= x e', 'a local x passa a valer e'],
    ['@ ! @f !f', 'lê e escreve a memória (inteiro, real)'],
    ['A n', 'reserva n palavras a zero'],
    ['P N G R "…"', 'escreve byte, inteiro, real ou texto; lê byte'],
    ['O p', 'desvia a saída para a memória'],
    ['Ac Av X T', 'argumentos, sair, relógio'],
    ['E S D', 'campo: evoluir, medir, observar'],
  ];
  const ref = $('ref');
  REF.forEach(([c, d]) => { const r = el('div'); r.append(el('code', '', c), el('span', '', d)); ref.appendChild(r); });

  // ---------- ficheiros ----------
  const FL = window.ONDA_FILES || [], fl = $('flist'), vb = $('vbody'), vn = $('vname'), cache = {};
  async function openFile(f, btn) {
    fl.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', String(b === btn)));
    vn.textContent = f.n; vb.textContent = 'A carregar…';
    try { cache[f.p] = cache[f.p] || await (await fetch(f.p)).text(); vb.textContent = cache[f.p]; }
    catch (e) { vb.textContent = 'Não foi possível abrir ' + f.n + '.'; }
  }
  FL.forEach((f, i) => {
    const li = el('li'), b = el('button');
    b.type = 'button';
    b.append(el('b', '', f.n), el('i', '', nf.format(f.b) + ' B'), el('em', '', f.d));
    b.addEventListener('click', () => openFile(f, b));
    li.appendChild(b); fl.appendChild(li);
    if (i === 0) openFile(f, b);
  });
  $('copy').addEventListener('click', async () => {
    const b = $('copy');
    try { await navigator.clipboard.writeText(vb.textContent); b.textContent = 'Copiado'; }
    catch (e) { const r = document.createRange(); r.selectNodeContents(vb); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selecionado: Ctrl+C'; }
    setTimeout(() => { b.textContent = 'Copiar'; }, 1800);
  });
})();
