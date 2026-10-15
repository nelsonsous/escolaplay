const fs = require('fs'), O = require(process.argv[2] + '/web/ondac.js'), P = process.argv[2];
(async () => {
  await O.load(fs.readFileSync(P + '/web/ondac.wasm'));
  const chk = async (name, file, entry, ref) => {
    const t = performance.now(); const r = await O.compile(fs.readFileSync(file, 'utf8'), entry); const ms = (performance.now() - t).toFixed(2);
    console.log(`${name}: codigo ${r.code}, ${r.text.length} bytes em ${ms} ms, igual ao nativo: ${r.text === fs.readFileSync(ref, 'utf8')}`);
  };
  await chk('julia -> C   ', P + '/ex/julia.onda', null, P + '/build/julia.s.c');
  await chk('julia -> GLSL', P + '/ex/julia.onda', 'px', P + '/build/julia.glsl');
  await chk('ondac -> C (o compilador compila-se a si proprio dentro do WebAssembly)', P + '/build/ondac.onda', null, P + '/seed/ondac.c');
  const e = await O.compile(': main >i + 1 2.5', null); console.log('erro de tipo detetado:', JSON.stringify(e.text.trim()), 'codigo', e.code);
})();
