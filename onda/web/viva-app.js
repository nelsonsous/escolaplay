(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const W = 960, H = 540;
  const SEMENTE = '__SEMENTE__';
  const nf = new Intl.NumberFormat('pt-PT');
  const f1 = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const f2 = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });
  const EX = { julia: $('s-julia').textContent, ondas: $('s-ondas').textContent };
  const pace = matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 1300;

  // ---------- estado ----------
  let run = 0, sig = null, hash = '', tol = 8, aceita = 95, ativa = null, compOk = null, wasmOk = false;
  let formas = {}, testes = [], tBase = performance.now(), tOff = 2.0, paused = false, tPause = 2.0;
  const cache = new Map();
  const vig = { n: 0, falhas: 0, ultima: 0 };
  const tAgora = () => (paused ? tPause : tOff + (performance.now() - tBase) / 1000);
  const espera = ms => new Promise(r => setTimeout(r, ms));
  let tLog0 = performance.now();

  // ---------- diario ----------
  function log(txt, cls) {
    const li = document.createElement('li');
    if (cls) li.className = cls;
    const s = document.createElement('span'); s.className = 'lt'; s.textContent = '+' + f1.format((performance.now() - tLog0) / 1000) + ' s';
    li.append(s, document.createTextNode(txt));
    $('diario').prepend(li);
    while ($('diario').children.length > 60) $('diario').lastChild.remove();
  }

  // ---------- tabela de formas ----------
  const NOMES = { sig: 'Significado', cpu: 'CPU · JavaScript', gpu: 'GPU · GLSL', mut: 'Erro injetado' };
  const fms = ms => (ms >= 1000 ? f1.format(ms / 1000) + ' s' : ms >= 100 ? nf.format(Math.round(ms)) + ' ms' : ms >= 10 ? f1.format(ms) + ' ms' : f2.format(ms) + ' ms');
  const custo = f => (f && f.msQ !== undefined ? fms(f.msQ) : '—');
  function tabela() {
    const tb = $('formas'); tb.textContent = '';
    for (const k of ['sig', 'cpu', 'gpu', 'mut']) {
      const f = formas[k] || { estado: 'à espera' };
      const tr = document.createElement('tr');
      const est = k === ativa ? 'ativa' : f.estado;
      const chip = document.createElement('span');
      chip.className = 'chip ' + ({ ativa: 'c-on', verificada: 'c-ok', rejeitada: 'c-bad', despromovida: 'c-warn', juiz: 'c-ok' }[est] || 'c-wait');
      chip.textContent = est;
      const td = x => { const c = document.createElement('td'); if (typeof x === 'string') c.textContent = x; else c.append(x); return c; };
      tr.append(td(NOMES[k]), td(chip), td(custo(f)), td(f.nota || ''));
      tb.appendChild(tr);
    }
    $('ro-forma').textContent = ativa ? NOMES[ativa] : 'sem forma';
    $('vig').textContent = vig.n ? 'Vigilância: ' + nf.format(vig.n) + ' píxeis re-verificados contra o significado, ' + nf.format(vig.falhas) + ' fora da tolerância.' : 'Vigilância: começa quando houver uma forma rápida ativa.';
  }
  function mostrarTestes() {
    const ul = $('testes'); ul.textContent = '';
    if (!testes.length) { const li = document.createElement('li'); li.className = 'vazio'; li.textContent = 'Ainda nenhum. Cada píxel que apanhar uma forma errada fica aqui e passa a ser testado primeiro.'; ul.appendChild(li); return; }
    for (const w of testes.slice(-12).reverse()) {
      const li = document.createElement('li'), sw = document.createElement('i');
      sw.style.background = Viva.hex(w.esperado);
      li.append(sw, document.createTextNode('(' + w.x + ', ' + w.y + ') em t = ' + f2.format(w.t) + ' s deve dar ' + Viva.hex(w.esperado)));
      ul.appendChild(li);
    }
  }
  function guardarTestes() { try { localStorage.setItem('onda-viva:' + hash, JSON.stringify(testes.slice(-50))); } catch (e) { /* sem armazenamento */ } }
  function lerTestes() { try { return JSON.parse(localStorage.getItem('onda-viva:' + hash) || '[]'); } catch (e) { return []; } }

  // ---------- desenho CPU (significado e forma JS) ----------
  const c2 = $('c2'), x2 = c2.getContext('2d');
  let img = null;
  function desenharCPU(fn, t, w, h) {
    if (c2.width !== w) { c2.width = w; c2.height = h; img = null; }
    if (!img) img = x2.createImageData(w, h);
    const d = img.data, sx = W / w, sy = H / h;
    for (let j = 0, o = 0; j < h; j++) {
      const y = Math.floor(j * sy);
      for (let i = 0; i < w; i++, o += 4) {
        const c = fn(Math.floor(i * sx), y, t, W, H);
        d[o] = (c >> 16) & 255; d[o + 1] = (c >> 8) & 255; d[o + 2] = c & 255; d[o + 3] = 255;
      }
    }
    x2.putImageData(img, 0, 0);
  }

  // ---------- GPU ----------
  const cg = $('cg');
  let gl = null;
  try { gl = cg.getContext('webgl2', { antialias: false, alpha: false }); } catch (e) { gl = null; }
  let prog = null, uLoc = null, vsObj = null;
  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function programa(fs) {
    if (!vsObj) {
      vsObj = sh(gl.VERTEX_SHADER, '#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}');
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    }
    const p = gl.createProgram();
    gl.attachShader(p, vsObj); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  function desenharGPU(p, t) {
    gl.useProgram(p); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, W, H);
    gl.uniform1fv(gl.getUniformLocation(p, 'u'), new Float32Array([t, W, H, 0, 0, 0, 0, 0]));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function lerGPU(pts) {
    const px = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return pts.map(p => { const o = ((H - 1 - p.y) * W + p.x) * 4; return (px[o] << 16) | (px[o + 1] << 8) | px[o + 2]; });
  }
  function verificarGPU(p, pts, t) {
    desenharGPU(p, t);
    const got = lerGPU(pts);
    const falhas = [];
    let iguais = 0;
    pts.forEach((q, i) => { const e = sig(q.x, q.y, t, W, H); if (Viva.perto(e, got[i], tol)) iguais++; else falhas.push({ x: q.x, y: q.y, t, esperado: e, obtido: got[i] }); });
    return { iguais, n: pts.length, falhas };
  }

  // ---------- o ciclo da Onda Viva ----------
  const vivo = r => r === run;
  async function verificarCompilador() {
    const r = await OndaC.compile(await (await fetch('f/ondac.onda')).text(), null);
    const h = await Viva.sha256(r.text);
    compOk = r.code === 0 && h === SEMENTE;
    log(compOk ? 'Compilador verificado antes de ser usado: compilou-se a si próprio aqui em ' + f2.format(r.ms) + ' ms e deu o SHA-256 da semente (' + h.slice(0, 8) + '…).'
      : 'O compilador não passou no ponto fixo (' + h.slice(0, 8) + '…). Não vai gerar formas: fica o significado.', compOk ? 'ok' : 'bad');
  }
  async function iniciar(src) {
    const r = ++run;
    hash = await Viva.sha256(src);
    if (!vivo(r)) return;
    $('hash').textContent = 'sha256 ' + hash.slice(0, 12) + '…';
    if (cache.has(hash)) {
      const c = cache.get(hash);
      sig = c.sig; formas = c.formas; ativa = c.ativa; tol = c.tol; aceita = c.aceita; testes = c.testes;
      log('Este significado já é conhecido (mesmo hash). As formas foram reutilizadas sem compilar nada.', 'ok');
      tabela(); mostrarTestes(); return;
    }
    try { sig = Significado.funcao(src, 'px'); }
    catch (e) { log('O significado não é válido: ' + e.message.replace('significado: ', '') + '. Nada mudou no ecrã.', 'bad'); run++; return; }
    tol = sig.tem('tol') ? sig.outra('tol')() : 8;
    aceita = sig.tem('aceita') ? sig.outra('aceita')() : 95;
    testes = lerTestes();
    const t = tAgora();
    Viva.medir(sig, t, W, H, 200);
    const m = Viva.medir(sig, t, W, H, 600);
    formas = { sig: { estado: 'juiz', msQ: m.usPx * W * H / 1000, nota: 'referência; nunca muda' } };
    ativa = 'sig';
    vig.n = 0; vig.falhas = 0;
    log('Significado carregado (sha256 ' + hash.slice(0, 8) + '…). Corre no intérprete de referência: ' + f2.format(m.usPx) + ' µs por píxel.' + (testes.length ? ' ' + testes.length + ' testes aprendidos antes.' : ''));
    tabela(); mostrarTestes();
    await espera(pace); if (!vivo(r)) return;
    if (!wasmOk) { log('O compilador embutido não arrancou neste visualizador. Fica o significado.', 'bad'); return; }
    if (compOk === null) { await verificarCompilador(); if (!vivo(r)) return; }
    if (!compOk) return;

    // forma CPU
    formas.cpu = { estado: 'a gerar' }; tabela();
    const fc = await Viva.formaCPU(OndaC, src, 'px'); if (!vivo(r)) return;
    if (fc.erro) { formas.cpu = { estado: 'rejeitada', nota: fc.erro }; log('Forma CPU não gerada: ' + fc.erro, 'bad'); tabela(); }
    else {
      const pts = testes.map(w => ({ x: w.x, y: w.y })).concat(Viva.amostras(400, W, H, Date.now() & 0xffff));
      const v = Viva.verificar(fc.fn, sig, pts, tAgora(), W, H, 0);
      if (v.falhas.length) { formas.cpu = { estado: 'rejeitada', nota: v.falhas.length + ' píxeis diferentes' }; aprender(v.falhas); log('Forma CPU rejeitada: diferente do significado em ' + v.falhas.length + ' píxeis.', 'bad'); }
      else {
        const mc = Viva.medir(fc.fn, tAgora(), W, H, 20000);
        formas.cpu = { estado: 'verificada', fn: fc.fn, msQ: mc.usPx * W * H / 1000, nota: 'igual bit a bit em ' + nf.format(v.n) + ' píxeis' };
        const x = formas.sig.msQ / formas.cpu.msQ;
        log('Forma CPU gerada pelo compilador embutido em ' + f2.format(fc.ms) + ' ms e verificada: igual ao significado, bit a bit, em ' + nf.format(v.n) + ' píxeis. É ' + f1.format(x) + '× mais rápida, por isso foi promovida.', 'ok');
        ativa = 'cpu';
      }
      tabela();
    }
    await espera(pace); if (!vivo(r)) return;

    // erro injetado: o juiz tem de o apanhar
    const mu = Viva.mutar(src, 'px');
    if (mu) {
      const fm = await Viva.formaCPU(OndaC, mu.src, 'px'); if (!vivo(r)) return;
      if (fm.fn) {
        const v = Viva.verificar(fm.fn, sig, Viva.amostras(64, W, H, 99), tAgora(), W, H, 0);
        if (v.falhas.length) {
          const w = v.falhas[0];
          formas.mut = { estado: 'rejeitada', nota: mu.de + ' → ' + mu.para + ': errado em ' + v.falhas.length + '/64' };
          aprender([w]);
          log('Erro injetado de propósito (a constante ' + mu.de + ' passou a ' + mu.para + '): rejeitado. No píxel (' + w.x + ', ' + w.y + ') devia dar ' + Viva.hex(w.esperado) + ' e deu ' + Viva.hex(w.obtido) + '. Esse píxel passa a ser um teste permanente.', 'bad');
        } else { formas.mut = { estado: 'verificada', nota: 'a mudança não alterou o resultado' }; log('O erro injetado não mudou nenhum píxel testado: para este programa, a constante não importa.'); }
        tabela();
      }
    }
    await espera(pace); if (!vivo(r)) return;

    // forma GPU
    if (!gl) { formas.gpu = { estado: 'indisponível', nota: 'sem WebGL2 neste dispositivo' }; log('Este dispositivo não tem GPU acessível (WebGL2). A medição escolhe a forma CPU.'); tabela(); }
    else {
      formas.gpu = { estado: 'a gerar' }; tabela();
      const g = await OndaC.compile(src, 'px', 'g'); if (!vivo(r)) return;
      let p = null;
      try { if (g.code !== 0 || g.text.includes('#error')) throw new Error((g.text.match(/#error onda: (.*)/) || [, g.text.trim()])[1]); p = programa(g.text); }
      catch (e) { formas.gpu = { estado: 'rejeitada', nota: String(e.message).slice(0, 80) }; log('Forma GPU não gerada: ' + e.message, 'bad'); tabela(); }
      if (p) {
        const pts = testes.map(w => ({ x: w.x, y: w.y })).concat(Viva.amostras(400, W, H, (Date.now() >> 3) & 0xffff));
        const tv = tAgora(), v = verificarGPU(p, pts, tv);
        const pct = v.iguais / v.n;
        if (pct < aceita / 100) { formas.gpu = { estado: 'rejeitada', nota: f1.format(pct * 100) + '% dentro de ±' + tol + '/255' }; aprender(v.falhas.slice(0, 3)); log('Forma GPU rejeitada: só ' + f1.format(pct * 100) + '% dos píxeis ficaram dentro de ±' + tol + '/255, e o significado exige ' + aceita + '%.', 'bad'); }
        else {
          const t0 = performance.now(); let k = 0;
          while (k < 6) { desenharGPU(p, tv); lerGPU([{ x: 0, y: 0 }]); k++; }
          const msQ = (performance.now() - t0) / k;
          formas.gpu = { estado: 'verificada', p, msQ, nota: f1.format(pct * 100) + '% dentro de ±' + tol + '/255 (GPU usa 32 bits)' };
          const melhor = ativa === 'cpu' ? formas.cpu.msQ : formas.sig.msQ;
          if (msQ < melhor) { ativa = 'gpu'; log('Forma GPU gerada em ' + f2.format(g.ms) + ' ms e verificada: ' + f1.format(pct * 100) + '% dos píxeis dentro de ±' + tol + '/255 (o significado exige ' + aceita + '%). Um quadro custa ' + fms(msQ) + ', ' + f1.format(melhor / msQ) + '× menos do que a forma anterior. Promovida.', 'ok'); }
          else log('Forma GPU verificada, mas aqui é mais lenta (' + fms(msQ) + ' por quadro). A medição mantém a forma anterior.');
        }
        tabela();
      }
    }
    cache.set(hash, { sig, formas, ativa, tol, aceita, testes });
  }
  function aprender(fs) {
    for (const w of fs) if (!testes.some(q => q.x === w.x && q.y === w.y)) testes.push({ x: w.x, y: w.y, t: w.t, esperado: w.esperado });
    guardarTestes(); mostrarTestes();
  }

  // ---------- ciclo de desenho e vigilancia ----------
  let nq = 0, tq = performance.now();
  function quadro(now) {
    const t = tAgora();
    const gpu = ativa === 'gpu' && formas.gpu && formas.gpu.p;
    cg.hidden = !gpu; c2.hidden = !!gpu;
    let lidos = null, pts = null;
    const vigiar = sig && (ativa === 'gpu' || ativa === 'cpu') && now - vig.ultima > 1500;
    if (vigiar) pts = Viva.amostras(32, W, H, (now * 7) & 0xffff);
    if (gpu) { desenharGPU(formas.gpu.p, t); if (vigiar) lidos = lerGPU(pts); $('ro-res').textContent = '960 × 540'; }
    else if (ativa === 'cpu' && formas.cpu.fn) { desenharCPU(formas.cpu.fn, t, 480, 270); $('ro-res').textContent = '480 × 270'; }
    else if (sig) { desenharCPU(sig, t, 120, 68); $('ro-res').textContent = '120 × 68'; }
    if (vigiar) {
      vig.ultima = now;
      const fn = ativa === 'cpu' ? formas.cpu.fn : null, tl = ativa === 'gpu' ? tol : 0;
      const falhas = [];
      pts.forEach((q, i) => { const e = sig(q.x, q.y, t, W, H), o = lidos ? lidos[i] : fn(q.x, q.y, t, W, H); if (!Viva.perto(e, o, tl)) falhas.push({ x: q.x, y: q.y, t, esperado: e, obtido: o }); });
      vig.n += pts.length; vig.falhas += falhas.length;
      const limite = ativa === 'gpu' ? Math.max(2, Math.ceil(pts.length * (1 - aceita / 100) * 2)) : 0;
      if (falhas.length > limite) {
        const de = ativa;
        formas[de].estado = 'despromovida';
        ativa = formas.cpu && formas.cpu.estado === 'verificada' && de !== 'cpu' ? 'cpu' : 'sig';
        aprender(falhas.slice(0, 3));
        const cc = cache.get(hash); if (cc) cc.ativa = ativa;
        log('Vigilância: a forma ' + NOMES[de] + ' saiu da tolerância em ' + falhas.length + ' de 32 píxeis em t = ' + f2.format(t) + ' s. Foi despromovida para ' + NOMES[ativa] + ' e os píxeis ficam como testes.', 'bad');
      }
      tabela();
    }
    nq++;
    if (now - tq > 700) { $('ro-fps').textContent = f1.format(nq * 1000 / (now - tq)) + ' q/s'; nq = 0; tq = now; }
    $('ro-t').textContent = 't = ' + f1.format(t) + ' s';
    requestAnimationFrame(quadro);
  }

  // ---------- controlos ----------
  const ta = $('src');
  let tm = 0;
  ta.value = EX.julia;
  ta.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => iniciar(ta.value), 700); });
  $('ex').addEventListener('change', e => { ta.value = EX[e.target.value]; iniciar(ta.value); });
  $('recomecar').addEventListener('click', () => { cache.delete(hash); iniciar(ta.value); });
  const pb = $('pausa');
  pb.addEventListener('click', () => {
    if (paused) { tOff = tPause; tBase = performance.now(); paused = false; } else { tPause = tAgora(); paused = true; }
    pb.textContent = paused ? 'Continuar' : 'Pausar';
  });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { paused = true; tPause = 2.0; pb.textContent = 'Continuar'; }

  tabela(); mostrarTestes();
  requestAnimationFrame(quadro);
  (async () => {
    try {
      const r = await fetch('ondac.wasm');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      await OndaC.load(await r.arrayBuffer());
      wasmOk = true;
    } catch (e) { wasmOk = false; }
    iniciar(ta.value);
  })();
})();
