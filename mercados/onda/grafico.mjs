// Monta o gráfico vivo da ficha: mercados/onda/grafico.onda → WebAssembly → mercados/grafico-onda.js (o WASM em
// base64 e a casca que copia os píxeis para um canvas e corre a animação só enquanto há movimento).
//   node mercados/onda/grafico.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../..');
const ondac = path.join(raiz, 'onda/build/ondac');
const destino = path.join(raiz, 'mercados/grafico-onda.js');
if (!existsSync(ondac)) execFileSync('sh', [path.join(raiz, 'onda/build.sh')], { stdio: 'inherit' });

const fonte = readFileSync(path.join(here, 'grafico.onda'), 'utf8');
const ENTRADAS = ['gnovo', 'galvo', 'gcap', 'glo', 'ghi', 'gmuda', 'gpasso', 'gdesenha', 'main'];
const wasm = execFileSync(ondac, ['-w', ...ENTRADAS], { input: fonte, maxBuffer: 1 << 26 });
if (wasm.subarray(0, 4).toString('latin1') !== '\0asm') { process.stderr.write(wasm.toString()); process.exit(1); }
await WebAssembly.compile(wasm);

const casca = String.raw`(function (root) {
    'use strict';
    const WASM = '@WASM@';
    const CAP = 2000;             // pontos no máximo (mais do que isso: reamostra-se)
    const reduz = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let X = null, mem = null, g = 0n;
    const sys = (c, a) => {
        switch (Number(c)) {
            case 2: throw { ondaExit: Number(a) };
            case 6: return BigInt(Math.round(performance.now() * 1000));
            case 7: { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
        }
        return 0n;
    };
    const m1 = (c, x) => [Math.sin, Math.cos, Math.exp, Math.log][Number(c)](x);
    const m2 = (c, x, y) => (Number(c) === 0 ? Math.pow(x, y) : Math.atan2(x, y));
    const pronto = typeof WebAssembly === 'undefined' ? Promise.reject(new Error('sem WebAssembly'))
        : WebAssembly.instantiate(Uint8Array.from(atob(WASM), (ch) => ch.charCodeAt(0)), { env: { sys, m1, m2 } }).then((r) => {
            X = r.instance.exports; mem = X.memory;
            try { X._start(); } catch (e) { if (!e || e.ondaExit === undefined) throw e; }
            g = X.gnovo(BigInt(CAP));
        });
    pronto.catch(() => {});
    const reais = (end, n) => new Float64Array(mem.buffer, (Number(end) + 16) * 8, n);
    const hex = (s) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(s || '').trim()); const v = m ? parseInt(m[1], 16) : 0x888888; return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255]; };

    // um só gráfico (a ficha só tem um): ligar(canvas) prende-o ao canvas do momento (a ficha refaz o HTML)
    let cv = null, ctx = null, img = null, w = 0, h = 0, escala = 1, raf = 0, antes = 0, custo = 0, quadros = 0, sujo = true;
    let ultimo = null, assin = '';
    const api = {
        pronto,
        get ok() { return !!X; },
        get escala() { return escala; },
        sobre: null, // (ctx, geo) → o que a app desenha por cima (etiquetas, o dedo), em píxeis CSS
        ligar(canvas) {
            if (canvas !== cv) { cv = canvas; ctx = canvas.getContext('2d'); img = null; w = h = 0; sujo = true; escala = Math.min((root.devicePixelRatio || 1), 2); }
            return api;
        },
        cores(c) { if (!X) return; const r = reais(g, 29); [c.sobe, c.desce, c.parado, c.ref, c.ponto].forEach((v, i) => r.set(hex(v), 14 + i * 3)); sujo = true; },
        // a série: valores (preços, já pela ordem e igualmente espaçados), novo (outra ficha ou período), base (0 =
        // sem referência), tom (-1, 0, 1), vivo. Os mesmos dados outra vez não fazem nada.
        serie(v, o) {
            if (!X || v.length < 2) return;
            const n = Math.min(v.length, CAP), a = o.novo ? '' : [n, o.base, o.tom, o.vivo].join('|');
            if (!o.novo && a === assin && ultimo && ultimo.length === n) { let i = 0; while (i < n && ultimo[i] === v[i]) i++; if (i === n) return; }
            reais(X.galvo(g), n).set(v.length > CAP ? v.subarray(v.length - CAP) : v);
            ultimo = Float64Array.from(reais(X.galvo(g), n));
            assin = [n, o.base, o.tom, o.vivo].join('|');
            X.gmuda(g, BigInt(n), o.novo ? 1n : 0n, +o.base || 0, o.tom, o.vivo ? 1n : 0n);
            sujo = true; api.anima();
        },
        // a escala mostrada agora (para as etiquetas e o dedo baterem certo com o desenho)
        geo() {
            const W = cv ? cv.clientWidth : 0, H = cv ? cv.clientHeight : 0;
            return { w: W, h: H, topo: H * 0.08, alt: H * 0.80, xr: W - H * 0.07, lo: X ? X.glo(g) : 0, hi: X ? X.ghi(g) : 1 };
        },
        // desenha: recalcula os píxeis se alguma coisa mudou; senão só repõe a imagem e o que vai por cima
        pinta() {
            if (!X || !cv || !cv.isConnected) return;
            const cw = Math.max(2, Math.round(cv.clientWidth * escala)), ch = Math.max(2, Math.round(cv.clientHeight * escala));
            if (cw !== w || ch !== h || !img) { w = cw; h = ch; cv.width = w; cv.height = h; img = ctx.createImageData(w, h); sujo = true; }
            if (sujo) {
                const t0 = performance.now();
                const end = X.gdesenha(g, BigInt(w), BigInt(h));
                const src = new Uint32Array(mem.buffer, (Number(end) + 16) * 8, w * h * 2), dst = new Uint32Array(img.data.buffer);
                for (let i = 0, n = w * h; i < n; i++) dst[i] = src[i << 1];
                sujo = false;
                // se a máquina não aguenta, menos píxeis (a imagem estica, o movimento fica fluido)
                custo += performance.now() - t0;
                if (++quadros === 20) { if (custo / quadros > 12 && escala > 1) { escala = Math.max(1, escala - 0.5); w = 0; /* refaz-se no próximo desenho */ } custo = 0; quadros = 0; }
            }
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.putImageData(img, 0, 0);
            if (api.sobre) { ctx.setTransform(w / cv.clientWidth, 0, 0, h / cv.clientHeight, 0, 0); api.sobre(ctx, api.geo()); }
        },
        // o ciclo de animação: só corre enquanto a Onda diz que alguma coisa se mexe (gpasso = 1)
        anima() {
            if (raf || !X) return;
            antes = performance.now();
            const quadro = (agora) => {
                raf = 0;
                if (!cv || !cv.isConnected) return;
                const dt = reduz() ? 1e4 : Math.min(100, Math.max(0, agora - antes));
                antes = agora;
                const mexe = Number(X.gpasso(g, dt));
                sujo = true; api.pinta();
                if (mexe) raf = requestAnimationFrame(quadro);
            };
            raf = requestAnimationFrame(quadro);
        },
        parar() { if (raf) cancelAnimationFrame(raf); raf = 0; },
        get animando() { return !!raf; },
    };
    root.GraficoOnda = api;
})(typeof self !== 'undefined' ? self : this);
`;
const linhas = fonte.split('\n').length;
writeFileSync(destino, `// GERADO a partir de mercados/onda/grafico.onda (${linhas} linhas de Onda, ${wasm.length} bytes de WASM) por
// \`node mercados/onda/grafico.mjs\` — não editar à mão. O gráfico vivo da ficha: cada píxel é calculado pela Onda.
` + casca.replace('@WASM@', wasm.toString('base64')));
console.log(`grafico-onda.js: ${linhas} linhas de Onda, ${wasm.length} bytes de WASM → ${path.relative(raiz, destino)}`);
