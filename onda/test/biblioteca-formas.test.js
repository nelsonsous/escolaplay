// A biblioteca dá o mesmo em WebAssembly (-w), x86-64 (-x) e arm64 (-a, no qemu, quando há): um programa com milhares
// de números (os reais pelos seus bits, Bw), datas, JSON, textos e uma ordenação, compilado nas três formas. O -w é o que
// os outros testes conferem contra o JS; aqui confere-se que as outras formas dão o mesmo, ao byte.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { fonte, gerador, R, ondac } = require('./lib/sonda.js');

const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-formas-'));
let qemu = null;
for (const q of ['qemu-aarch64-static', 'qemu-aarch64']) { try { execFileSync('sh', ['-c', 'command -v ' + q]); qemu = q; break; } catch (e) {} }

test('a biblioteca dá o mesmo em -w, -x e -a: números, Intl, datas, JSON, textos, ordem', () => {
  const G = gerador(99), dv = new DataView(new ArrayBuffer(8)), L = [];
  const bw = (x) => { dv.setFloat64(0, x); return `Bw ${dv.getInt32(0)} ${dv.getUint32(4)}`; };
  for (let i = 0; i < 1500; i++) {
    const x = i % 3 ? G.bits() : Number((G.R() * 10 ** (G.int(30) - 15)).toPrecision(1 + G.int(17)));
    L.push(`_nu_ps ${bw(x)} P 32 _nu_fixo ${bw(x)} ${G.int(25)} P 32 _nu_prec ${bw(x)} ${1 + G.int(40)} P 32`);
    if (Number.isFinite(x) && Math.abs(x) < 1e300) L.push(`_nu_intl ${bw(x)} ${G.int(4)} P 32 _nu_compacto ${bw(x)} P 32 _nu_moeda ${bw(x)} 2 $"USD" P 10`);
  }
  for (let i = 0; i < 300; i++) { const ms = G.int(2 * 8.64e15) - 8.64e15; L.push(`_dt_piso ${bw(ms)} P 32 _dt_phoje ${Math.abs(ms) % 4e12} P 32 _dt_pquando ${Math.abs(ms) % 4e12} P 10`); }
  for (const s of ['1e-7', '  0x1F ', '123456789012345678901234567890', '.5e-300', 'Infinity', '2.4703282292062327e-324']) L.push(`G _nu_s2n $"${s}" P 32 _js_pj _js_parse $"[${s.trim().startsWith('0x') || s === 'Infinity' ? 1 : s.trim()}, \\"é😀\\\\ud800\\"]" 2 0 P 10`);
  L.push('_tx_pj _tx_s16 $"a😀b" 1 2 P 32 N _tx_cmp $"😀" $"\\uffff" P 32 _ht_min $"ÀÉ<x>" P 10');
  L.push('= w A 50 = k A 50 = i 0 W < i 50 { ! + w i i !f + k i F % * i 7 11 = i + i 1 } _or_power w 50 k k 1 = i 0 W < i 50 { N @ + w i P 44 = i + i 1 } P 10');
  // cada linha numa função (o x86 não gosta de corpos gigantes): main chama-as por ordem
  const fs_ = L.map((l, i) => `: f${i} >i { ${l} 0 }`).join('\n');
  const src = fonte() + '\n' + fs_ + '\n: main >i { ' + L.map((_, i) => `f${i}`).join(' ') + ' 0 }\n';
  fs.writeFileSync(path.join(t, 'p.wasm'), execFileSync(ondac, ['-w'], { input: src, maxBuffer: 64 << 20 }));
  const w = execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'p.wasm')], { maxBuffer: 64 << 20 }).toString();
  fs.writeFileSync(path.join(t, 'px'), execFileSync(ondac, ['-x'], { input: src, maxBuffer: 64 << 20 }), { mode: 0o755 });
  const x = execFileSync(path.join(t, 'px'), { maxBuffer: 64 << 20 }).toString();
  assert.ok(w.length > 100000);
  assert.strictEqual(x, w, 'x86-64 igual ao WebAssembly');
  if (qemu) {
    fs.writeFileSync(path.join(t, 'pa'), execFileSync(ondac, ['-a'], { input: src, maxBuffer: 64 << 20 }), { mode: 0o755 });
    assert.strictEqual(execFileSync(qemu, [path.join(t, 'pa')], { maxBuffer: 64 << 20 }).toString(), w, 'arm64 igual ao WebAssembly');
  }
  console.log(`# ${L.length} linhas, ${w.length} bytes iguais em -w e -x${qemu ? ' e -a' : ' (sem qemu: o -a não correu)'}`);
});
