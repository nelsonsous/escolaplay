// A biblioteca de contagens (lib/tempo.onda): o tempo escrito como num relógio (m:ss), igual à mesma conta em
// JavaScript em WebAssembly e em x86-64, e contagens que se guiam pela hora marcada e não pelos tiques do relógio
// (um ecrã que adormece não as atrasa).
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-tempo-'));
const lib = (...ms) => ms.map((m) => fs.readFileSync(path.join(R, 'lib', m + '.onda'), 'utf8')).join('\n');
function compilar(src, args) {
  const w = execFileSync(ondac, args, { input: src, maxBuffer: 1 << 26 });
  if (args[0] === '-w' && w.subarray(0, 4).toString('latin1') !== '\0asm') throw new Error(w.toString().slice(0, 2000));
  return w;
}

// a referência em JavaScript
const d2 = (v) => String(v).padStart(2, '0');
const mss = (s) => { s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}:${d2(m)}:${d2(s % 60)}` : `${m}:${d2(s % 60)}`; };

test('tempo: o m:ss é igual à conta em JavaScript (-w e -x)', () => {
  const soltos = [-86400, -5, -1, 35999, 36000, 86399, 86400, 359999, 360000, 10000000, 123456789];
  const N = 7300; // de 0 a 2:01:39, um a um: todas as viragens de minuto e as duas primeiras de hora
  const src = lib('tempo') + `\n: main >i { ${soltos.map((s) => `_tp_mss ${s} P 10`).join(' ')} L i ${N} { _tp_mss i P 10 } 0 }\n`;
  const espera = [...soltos, ...Array.from({ length: N }, (_, i) => i)].map(mss).join('\n') + '\n';
  fs.writeFileSync(path.join(t, 't.wasm'), compilar(src, ['-w', 'main']));
  const w = execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 't.wasm')], { maxBuffer: 1 << 26 }).toString();
  assert.strictEqual(w, espera);
  fs.writeFileSync(path.join(t, 'tx'), compilar(src, ['-x']), { mode: 0o755 });
  assert.strictEqual(execFileSync(path.join(t, 'tx'), { maxBuffer: 1 << 26 }).toString(), w, 'x86-64 igual ao WebAssembly');
  assert.deepStrictEqual([mss(0), mss(5), mss(75), mss(600), mss(3600), mss(3661)], ['0:00', '0:05', '1:15', '10:00', '1:00:00', '1:01:01']);
  console.log(`# ${soltos.length + N} tempos, ${w.length} bytes iguais em -w, -x e JavaScript`);
});

test('tempo: a contagem guia-se pela hora marcada, não pelos tiques do relógio', () => {
  const { criar } = require(path.join(R, 'rt/anfitriao.js'));
  const src = lib('tempo') + `
: t_fim i>i s { N _tp_fim s 0 }
: t_falta i>i f { N _tp_falta f 0 }
: t_faltams i>i f { N _tp_faltams f 0 }
: main >i 0
`;
  const linhas = [];
  const app = criar(compilar(src, ['-w', 'main', 't_fim', 't_falta', 't_faltams']), { registo: (x) => linhas.push(x) });
  const diz = (nome, x) => { linhas.length = 0; app.chamar(nome, BigInt(x)); return Number(linhas.join('')); };
  const agora = Date.now;
  let T = 1800000000000;
  Date.now = () => T;
  try {
    const fim = diz('t_fim', 20);
    assert.strictEqual(fim, T + 20000, 'a hora marcada: daqui a 20 segundos');
    assert.strictEqual(diz('t_falta', fim), 20);
    T += 1;
    assert.strictEqual(diz('t_falta', fim), 20, 'faltam 19,999 s: o relógio ainda mostra 20');
    T += 999;
    assert.strictEqual(diz('t_falta', fim), 19);
    // o ecrã adormeceu 7,3 s e não houve tique nenhum: ao acordar, o que falta está certo
    T += 7300;
    assert.strictEqual(diz('t_faltams', fim), 11700);
    assert.strictEqual(diz('t_falta', fim), 12);
    T = fim - 1;
    assert.strictEqual(diz('t_falta', fim), 1);
    T = fim;
    assert.strictEqual(diz('t_falta', fim), 0, 'chegou a hora');
    // passou da hora (o telemóvel esteve guardado): nunca fica negativo
    T = fim + 300000;
    assert.strictEqual(diz('t_falta', fim), 0);
    assert.strictEqual(diz('t_faltams', fim), 0);
    assert.strictEqual(diz('t_fim', 0), T);
  } finally { Date.now = agora; app.parar(); }
});
