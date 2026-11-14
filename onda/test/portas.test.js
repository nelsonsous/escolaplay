// As portas 120–122 do anfitrião de apps (rt/anfitriao.js): o ecrã acordado (_an_acordado), o sinal sonoro sem
// ficheiros (_an_tom) e a voz (_an_falar). Primeiro com o browser a fingir (o que se pede, quando e por que ordem),
// depois num Chromium a sério (existem e não rebentam).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const R = path.join(__dirname, '..');
const lib = (...ms) => ms.map((m) => fs.readFileSync(path.join(R, 'lib', m + '.onda'), 'utf8')).join('\n');
const SRC = lib('memoria', 'texto', 'anfitriao') + `
: t_acordado i>i v { N _an_acordado v 0 }
: t_tom ii>i hz ms { N _an_tom hz ms 0 }
: t_falar ii>i t l { N _an_falar t l 0 }
: main >i 0
`;
const modulo = () => {
  const w = execFileSync(path.join(R, 'build/ondac'), ['-w', 'main', 't_acordado', 't_tom', 't_falar'], { input: SRC, maxBuffer: 1 << 26 });
  if (w.subarray(0, 4).toString('latin1') !== '\0asm') throw new Error(w.toString().slice(0, 2000));
  return w;
};
const passo = () => new Promise((r) => setImmediate(r)); // deixa correr as promessas pendentes

test('portas 120–122: sem o browser as ter, valem 0 e não fazem nada', () => {
  const { criar } = require(path.join(R, 'rt/anfitriao.js'));
  const linhas = [];
  const app = criar(modulo(), { registo: (x) => linhas.push(x), acordado: null, audio: null, voz: null });
  const diz = (nome, ...a) => { linhas.length = 0; app.chamar(nome, ...a.map((x) => (typeof x === 'string' ? app.escrever(x) : BigInt(x)))); return linhas.join(''); };
  assert.strictEqual(diz('t_acordado', 1), '0');
  assert.strictEqual(diz('t_acordado', 0), '0');
  assert.strictEqual(diz('t_tom', 880, 120), '0');
  assert.strictEqual(diz('t_tom', 0, 0), '0');
  assert.strictEqual(diz('t_falar', 'Olá', 'pt-PT'), '0');
  assert.strictEqual(diz('t_falar', 0, 0), '0');
});

test('porta 120 (_an_acordado): pede o ecrã acordado uma vez, volta a pedi-lo quando a página volta a ver-se, e larga-o', async () => {
  const { criar } = require(path.join(R, 'rt/anfitriao.js'));
  const pedidos = [], sentinelas = [];
  let recusa = false;
  const acordado = {
    request: (tipo) => {
      pedidos.push(tipo);
      if (recusa) return Promise.reject(new Error('NotAllowedError'));
      const s = { solto: false, ouvintes: [], addEventListener: (ev, f) => { if (ev === 'release') s.ouvintes.push(f); }, release: () => { if (!s.solto) { s.solto = true; s.ouvintes.forEach((f) => f()); } return Promise.resolve(); } };
      sentinelas.push(s);
      return Promise.resolve(s);
    },
  };
  const ouvintes = {};
  const documento = { visibilityState: 'visible', querySelector: () => null, addEventListener: (tipo, f) => { (ouvintes[tipo] = ouvintes[tipo] || []).push(f); } };
  const volta = (estado) => { documento.visibilityState = estado; (ouvintes.visibilitychange || []).forEach((f) => f()); };
  const linhas = [];
  const app = criar(modulo(), { registo: (x) => linhas.push(x), documento, acordado });
  const diz = (v) => { linhas.length = 0; app.chamar('t_acordado', BigInt(v)); return linhas.join(''); };

  assert.strictEqual(diz(1), '1');
  await passo();
  assert.deepStrictEqual(pedidos, ['screen']);
  assert.strictEqual(diz(1), '1');
  await passo();
  assert.strictEqual(pedidos.length, 1, 'já o tem: não pede outra vez');
  // a página esconde-se: o browser tira o trinco; ao voltar, o anfitrião pede-o de novo
  volta('hidden');
  sentinelas[0].release();
  await passo();
  assert.strictEqual(pedidos.length, 1, 'escondida não pede');
  volta('visible');
  await passo();
  assert.strictEqual(pedidos.length, 2);
  assert.strictEqual(sentinelas.length, 2);
  // largar: solta o trinco, e voltar a ver-se já não pede nada
  assert.strictEqual(diz(0), '1');
  await passo();
  assert.strictEqual(sentinelas[1].solto, true);
  volta('hidden'); volta('visible');
  await passo();
  assert.strictEqual(pedidos.length, 2);
  // pedir e largar logo a seguir (antes de o browser responder): o trinco que chegar é solto
  diz(1); diz(0);
  await passo();
  assert.strictEqual(pedidos.length, 3);
  assert.strictEqual(sentinelas[2].solto, true);
  // o browser recusa (bateria fraca, página sem foco): não rebenta, e tenta outra vez quando a página voltar
  recusa = true;
  assert.strictEqual(diz(1), '1');
  await passo();
  assert.strictEqual(pedidos.length, 4);
  recusa = false;
  volta('hidden'); volta('visible');
  await passo();
  assert.strictEqual(pedidos.length, 5);
  assert.strictEqual(sentinelas.length, 4);
  assert.strictEqual(sentinelas[3].solto, false);
});

test('porta 121 (_an_tom): um tom de hz hertz durante ms, sem ficheiro; com hz = 0 só prepara o som', () => {
  const { criar } = require(path.join(R, 'rt/anfitriao.js'));
  const feitos = [], tons = [];
  let retomas = 0;
  class Audio {
    constructor() { this.currentTime = 10; this.state = 'suspended'; this.destination = { nome: 'saida' }; feitos.push(this); }
    resume() { retomas++; this.state = 'running'; return Promise.resolve(); }
    createOscillator() {
      const o = { type: '', frequency: { value: 0 }, liga: null, connect(x) { o.liga = x; }, start(t0) { o.t0 = t0; }, stop(t1) { tons.push({ hz: o.frequency.value, tipo: o.type, ms: Math.round((t1 - o.t0) * 1000), t0: o.t0, vai: o.liga && o.liga.liga }); } };
      return o;
    }
    createGain() { const g = { liga: null, rampas: [], gain: { setValueAtTime: (v, t) => g.rampas.push(['fixa', v, t]), linearRampToValueAtTime: (v, t) => g.rampas.push(['sobe', v, t]) }, connect(x) { g.liga = x; } }; return g; }
  }
  const linhas = [];
  const app = criar(modulo(), { registo: (x) => linhas.push(x), audio: Audio });
  const diz = (hz, ms) => { linhas.length = 0; app.chamar('t_tom', BigInt(hz), BigInt(ms)); return linhas.join(''); };
  // preparar: cria o contexto e acorda-o (é o que se faz num toque), sem som
  assert.strictEqual(diz(0, 0), '1');
  assert.strictEqual(feitos.length, 1);
  assert.strictEqual(retomas, 1);
  assert.strictEqual(tons.length, 0);
  assert.strictEqual(diz(880, 120), '1');
  assert.strictEqual(feitos.length, 1, 'um contexto só para a app');
  assert.strictEqual(retomas, 1, 'já está a correr: não o acorda outra vez');
  assert.strictEqual(tons.length, 1);
  assert.deepStrictEqual([tons[0].hz, tons[0].tipo, tons[0].ms, tons[0].t0], [880, 'sine', 120, 10]);
  assert.deepStrictEqual(tons[0].vai, { nome: 'saida' }, 'oscilador → volume → saída');
  assert.strictEqual(diz(1320, 350), '1');
  assert.deepStrictEqual([tons[1].hz, tons[1].ms], [1320, 350]);
  // valores sem sentido não rebentam: um tom curtíssimo ou negativo dura o mínimo (20 ms)
  assert.strictEqual(diz(440, -5), '1');
  assert.strictEqual(tons[2].ms, 20);
  // um browser que falha ao criar o som: vale 0 e a app continua
  class Avariado { constructor() { throw new Error('sem som'); } }
  const app2 = criar(modulo(), { registo: (x) => linhas.push(x), audio: Avariado });
  linhas.length = 0; app2.chamar('t_tom', 880n, 100n);
  assert.strictEqual(linhas.join(''), '0');
});

test('porta 122 (_an_falar): diz o texto na língua pedida (ou na da página), cala o que estava a dizer', () => {
  const { criar } = require(path.join(R, 'rt/anfitriao.js'));
  const feito = [];
  const voz = { cancel: () => feito.push(['cala']), speak: (u) => feito.push(['diz', u.text, u.lang]) };
  class Frase { constructor(texto) { this.text = texto; this.lang = ''; } }
  const documento = { visibilityState: 'visible', querySelector: () => null, addEventListener: () => {}, documentElement: { lang: 'pt-PT' } };
  const linhas = [];
  const app = criar(modulo(), { registo: (x) => linhas.push(x), documento, voz, vozFrase: Frase });
  const diz = (t, l) => { linhas.length = 0; app.chamar('t_falar', t ? app.escrever(t) : 0n, l ? app.escrever(l) : 0n); return linhas.join(''); };
  assert.strictEqual(diz('Troca. Lado esquerdo', 'pt-PT'), '1');
  assert.deepStrictEqual(feito, [['cala'], ['diz', 'Troca. Lado esquerdo', 'pt-PT']]);
  feito.length = 0;
  assert.strictEqual(diz('Good morning', 'en-GB'), '1');
  assert.deepStrictEqual(feito, [['cala'], ['diz', 'Good morning', 'en-GB']]);
  feito.length = 0;
  assert.strictEqual(diz('Olá, ação! çã', 0), '1', 'sem língua: a da página (<html lang>)');
  assert.deepStrictEqual(feito, [['cala'], ['diz', 'Olá, ação! çã', 'pt-PT']]);
  feito.length = 0;
  assert.strictEqual(diz(0, 0), '1', 'sem texto: só cala');
  assert.deepStrictEqual(feito, [['cala']]);
  // uma voz que rebenta (há browsers que lançam sem vozes instaladas): vale 0 e a app continua
  const app2 = criar(modulo(), { registo: (x) => linhas.push(x), voz: { cancel() { throw new Error('sem voz'); }, speak() {} }, vozFrase: Frase });
  linhas.length = 0; app2.chamar('t_falar', app2.escrever('x'), 0n);
  assert.strictEqual(linhas.join(''), '0');
});

test('portas 120–122 num Chromium a sério: valem 1 quando o browser as tem, e não rebentam', async (t) => {
  let pw;
  try { pw = require('playwright'); } catch { t.skip('sem playwright'); return; }
  const wasm = modulo();
  const pagina = '<!doctype html><html lang="pt-PT"><meta charset="utf-8"><title>portas</title><button id="b">toca</button><script src="/rt/anfitriao.js"></script>';
  const srv = http.createServer((req, res) => {
    const u = req.url.split('?')[0];
    if (u === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(pagina); }
    if (u === '/m.wasm') { res.writeHead(200, { 'Content-Type': 'application/wasm' }); return res.end(wasm); }
    if (u === '/rt/anfitriao.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(fs.readFileSync(path.join(R, 'rt/anfitriao.js'))); }
    res.writeHead(404); res.end();
  }).listen(0);
  const br = await pw.chromium.launch();
  try {
    const pg = await br.newPage();
    const erros = [];
    pg.on('pageerror', (e) => erros.push(e.message));
    await pg.goto(`http://127.0.0.1:${srv.address().port}/`);
    // dentro de um toque (um gesto): é aí que os browsers deixam começar o som e a voz
    await pg.evaluate(async () => {
      const linhas = [];
      const app = window.OndaApp.criar(new Uint8Array(await (await fetch('/m.wasm')).arrayBuffer()), { registo: (x) => linhas.push(x) });
      window.__r = null;
      document.getElementById('b').addEventListener('click', () => {
        const diz = (nome, ...a) => { linhas.length = 0; app.chamar(nome, ...a); return linhas.join(''); };
        window.__r = {
          tem: ['wakeLock' in navigator ? '1' : '0', typeof AudioContext !== 'undefined' ? '1' : '0', typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined' ? '1' : '0'],
          acordado: diz('t_acordado', 1n), prepara: diz('t_tom', 0n, 0n), tom: diz('t_tom', 880n, 60n),
          fala: diz('t_falar', app.escrever('Olá'), app.escrever('pt-PT')), cala: diz('t_falar', 0n, 0n), larga: diz('t_acordado', 0n),
        };
      });
    });
    await pg.click('#b');
    await pg.waitForTimeout(300); // o tom e o pedido do trinco acabam sozinhos
    const r = await pg.evaluate(() => window.__r);
    assert.deepStrictEqual([r.acordado, r.larga], [r.tem[0], r.tem[0]]);
    assert.deepStrictEqual([r.prepara, r.tom], [r.tem[1], r.tem[1]]);
    assert.deepStrictEqual([r.fala, r.cala], [r.tem[2], r.tem[2]]);
    assert.deepStrictEqual(r.tem, ['1', '1', '1'], 'o Chromium tem as três');
    assert.deepStrictEqual(erros, []);
  } finally { await br.close(); srv.close(); }
});
