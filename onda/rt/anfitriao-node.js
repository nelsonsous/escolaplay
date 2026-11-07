// Anfitrião Node para programas Onda (scripts de linha de comando). Corre um módulo `ondac -w` como o anfitrião de
// apps (anfitriao.js): o `main` corre uma vez e cada resposta (rede, relógio) chama uma função exportada da Onda,
// com a memória viva entre chamadas. Além das portas do runtime (0–9) e das de apps que fazem sentido fora do browser
// (103/104 relógio, 108 agora, 109 aleatório), dá o que um script precisa:
//   200 arg      i 0       → argumento i da linha de comando (texto; 0 se não há); i = -1 → quantos
//   201 env      nome 0    → variável de ambiente (texto; 0 se não está definida)
//   202 ler      caminho 0 → os bytes do ficheiro (texto; 0 se falhou — a mensagem fica na 213)
//   204 pasta    caminho 0 → cria a pasta e as que faltam (mkdir -p) → 1 (0 se falhou)
//   205 existe   caminho 0 → 1 se existe
//   206 pedido   p fn      → fetch: p = 5 palavras [método, url, cabeçalhos, corpo, ms] (textos; 0 = sem: GET, sem
//                            cabeçalhos, sem corpo, sem limite de tempo); cabeçalhos = "Nome: valor" por linha.
//                            No fim chama fn(t, estado): t = o corpo (bytes), estado = HTTP; 0 = o pedido falhou
//                            (t = a mensagem do erro, como o e.message do JS); -estado = veio a resposta mas o corpo
//                            não (t = a mensagem). Com ms, um AbortController corta o pedido (e a leitura do corpo).
//   208 saída    fd 0      → a saída (P, N, "...") passa a ir para fd (1 stdout, 2 stderr) até ao fecho; 0 0 → volta
//                            à anterior. Os fluxos fazem uma pilha (a Onda esvazia o _fl antes de mudar).
//   209 abrir    caminho 0 → abre um fluxo e põe a saída nele: um ficheiro (gravado ao fechar) ou, com 0, um texto
//   210 fechar   0 0       → fecha o fluxo do topo (ficheiro: 1, 0 se falhou; texto: o texto) e volta ao anterior
//   211 sair     c 0       → termina o processo com o código c (depois de escrever tudo)
//   213 erro     0 0       → a mensagem do último erro (texto)
// Texto: o formato do `O t` (M[t] = fim, um byte por palavra em M[t+1 .. fim-1]). Uso:
//   const { correr } = require('onda/rt/anfitriao-node.js'); correr(bytes, { args: ['dados', '/tmp/x'] });
// opcoes: args, env, buscar (o fetch), sair (process.exit), saida ({ 1: fn, 2: fn } em vez do stdout e do stderr)
'use strict';
const fs = require('node:fs');
const { cfmt } = require('./anfitriao.js');

function correr(bytes, opcoes = {}) {
    const args = opcoes.args || [];
    const env = opcoes.env || process.env;
    const buscar = opcoes.buscar || ((...a) => fetch(...a));
    const sair = opcoes.sair || ((c) => process.exit(c));
    const out = { 1: (u) => process.stdout.write(u), 2: (u) => process.stderr.write(u), ...(opcoes.saida || {}) };
    let mem = null, ex = null, u8 = null, i32 = null, erro = '';
    const vistas = () => { if (!u8 || u8.buffer !== mem.buffer) { u8 = new Uint8Array(mem.buffer); i32 = new Int32Array(mem.buffer); } };
    const W = (a, n) => new BigInt64Array(mem.buffer, (Number(a) + 16) * 8, n);
    // os bytes de um texto (um por palavra: o byte baixo de cada palavra de 8)
    const bytesDe = (t) => {
        t = Number(t);
        if (!t) return new Uint8Array(0);
        vistas();
        const fim = Number(W(t, 1)[0]), n = Math.max(0, fim - t - 1), o = (t + 17) * 8, r = new Uint8Array(n);
        for (let i = 0; i < n; i++) r[i] = u8[o + 8 * i];
        return r;
    };
    const ler = (t) => Buffer.from(bytesDe(t)).toString('utf8');
    // reserva um texto com os bytes u (com o _oa do runtime) e devolve o endereço
    const escrever = (u) => {
        if (typeof u === 'string') u = Buffer.from(u, 'utf8');
        const t = Number(ex._oa(BigInt(u.length + 1)));
        vistas();
        let w = (t + 16) * 2;
        i32[w] = t + 1 + u.length; i32[w + 1] = 0;
        for (let i = 0; i < u.length; i++) { w += 2; i32[w] = u[i]; i32[w + 1] = 0; }
        return BigInt(t);
    };
    const chamar = (nome, ...a) => {
        const f = ex[nome];
        if (typeof f !== 'function') throw new Error(`onda: não há a função ${nome}`);
        try { f(...a); } catch (e) { if (!e || e.ondaExit === undefined) throw e; }
        ex._fl();
    };
    // fluxos de saída: a pilha (o topo recebe o que a Onda escreve)
    const pilha = [{ fd: 1 }];
    const escreve = (u) => { const s = pilha[pilha.length - 1]; if (s.partes) s.partes.push(Buffer.from(u)); else out[s.fd](u); };
    const relogios = new Map();
    let nr = 0;
    const sys = (c, a, b) => {
        switch (Number(c)) {
            case 0: { // escrever: b palavras desde M[a], um byte em cada
                const n = Number(b);
                if (n > 0) { vistas(); const o = (Number(a) + 16) * 8, u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = u8[o + 8 * i]; escreve(u); }
                return 0n;
            }
            case 1: return -1n;
            case 2: process.exitCode = Number(a); throw { ondaExit: Number(a) };
            case 3: return BigInt(args.length);
            case 4: { const s = Buffer.from(String(args[Number(a)] ?? ''), 'utf8'), j = Number(b); return j >= 0 && j < s.length ? BigInt(s[j]) : 0n; }
            case 5: { const x = new Float64Array(new BigInt64Array([a]).buffer)[0], t = cfmt(x), v = W(b, t.length); for (let i = 0; i < t.length; i++) v[i] = BigInt(t.charCodeAt(i)); return BigInt(t.length); }
            case 6: return BigInt(Math.round((performance.timeOrigin + performance.now()) * 1000));
            case 7: { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
            case 103: { const fn = ler(b), id = ++nr; relogios.set(id, setInterval(() => chamar(fn, 0n), Number(a))); return BigInt(id); }
            case 104: { clearInterval(relogios.get(Number(a))); relogios.delete(Number(a)); return 0n; }
            case 108: return BigInt(Date.now());
            case 109: return BigInt(Math.floor(Math.random() * Math.max(1, Number(a))));
            case 200: { const i = Number(a); return i < 0 ? BigInt(args.length) : i < args.length ? escrever(String(args[i])) : 0n; }
            case 201: { const v = env[ler(a)]; return v === undefined ? 0n : escrever(String(v)); }
            case 202: try { return escrever(fs.readFileSync(ler(a))); } catch (e) { erro = e.message; return 0n; }
            case 204: try { fs.mkdirSync(ler(a), { recursive: true }); return 1n; } catch (e) { erro = e.message; return 0n; }
            case 205: return fs.existsSync(ler(a)) ? 1n : 0n;
            case 206: {
                const p = W(a, 5).map(Number), fn = ler(b);
                const init = { method: p[0] ? ler(p[0]) : 'GET' };
                if (p[2]) { init.headers = {}; for (const l of ler(p[2]).split('\n')) { const i = l.indexOf(':'); if (i > 0) init.headers[l.slice(0, i)] = l.slice(i + 1).trim(); } }
                if (p[3]) init.body = bytesDe(p[3]);
                const ms = p[4];
                let t = null;
                if (ms > 0) { const ctl = new AbortController(); init.signal = ctl.signal; t = setTimeout(() => ctl.abort(), ms); }
                (async () => {
                    let r, u;
                    try { r = await buscar(ler(p[1]), init); } catch (e) { clearTimeout(t); return chamar(fn, escrever(String(e && e.message)), 0n); }
                    try { u = new Uint8Array(await r.arrayBuffer()); } catch (e) { clearTimeout(t); return chamar(fn, escrever(String(e && e.message)), BigInt(-r.status)); }
                    clearTimeout(t);
                    chamar(fn, escrever(u), BigInt(r.status));
                })();
                return 0n;
            }
            case 208: if (Number(a)) pilha.push({ fd: Number(a) }); else if (pilha.length > 1) pilha.pop(); return 0n;
            case 209: pilha.push({ caminho: Number(a) ? ler(a) : null, partes: [] }); return BigInt(pilha.length);
            case 210: {
                if (pilha.length < 2) return 0n;
                const s = pilha.pop();
                if (!s.partes) return 0n;
                const u = Buffer.concat(s.partes);
                if (s.caminho === null) return escrever(u);
                try { fs.writeFileSync(s.caminho, u); return 1n; } catch (e) { erro = e.message; return 0n; }
            }
            case 211: ex._fl(); sair(Number(a)); throw { ondaExit: Number(a) };
            case 213: return escrever(erro);
        }
        throw new Error('onda: porta ' + c + ' desconhecida');
    };
    const m1 = (c, x) => [Math.sin, Math.cos, Math.exp, Math.log][Number(c)](x);
    const m2 = (c, x, y) => (Number(c) === 0 ? Math.pow(x, y) : Math.atan2(x, y));
    const mod = bytes instanceof WebAssembly.Module ? bytes : new WebAssembly.Module(bytes);
    ex = new WebAssembly.Instance(mod, { env: { sys, m1, m2 } }).exports;
    mem = ex.memory;
    chamar('_start');
    return { exports: ex, chamar, ler, escrever, bytes: bytesDe, parar: () => { for (const t of relogios.values()) clearInterval(t); relogios.clear(); } };
}

module.exports = { correr };
