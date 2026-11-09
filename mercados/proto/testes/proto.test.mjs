// Protótipo visual: abre a página num Chromium (os dados do conector vêm de ficheiros gravados; sem Binance, entra
// a demonstração) e verifica que os campos da Onda desenham o que devem.
//   node --test mercados/proto/testes/proto.test.mjs
//   GRAVAR=pasta node mercados/proto/testes/proto.test.mjs   → também grava um vídeo e imagens nessa pasta
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = process.env.PROTO_RAIZ ? path.resolve(process.env.PROTO_RAIZ) : path.join(aqui, '../../..'); // PROTO_RAIZ=dist: a versão minificada
const GRAVAR = process.env.GRAVAR || '';
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };

test('protótipo: gráficos vivos, mapa do mercado e fundo na placa gráfica', async () => {
    const srv = http.createServer((req, res) => {
        const f = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]));
        if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
        fs.createReadStream(f).pipe(res);
    }).listen(0);
    const br = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    try {
        const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-PT',
            ...(GRAVAR ? { recordVideo: { dir: GRAVAR, size: { width: 390, height: 844 } } } : {}) });
        await ctx.route(/mercados-proxy/, (r) => {
            const u = new URL(r.request().url());
            const f = u.searchParams.get('symbols') === 'BTC-EUR' ? 'btc-1d.json' : 'vwce-1mo.json';
            return r.fulfill({ body: fs.readFileSync(path.join(aqui, f)), contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' } });
        });
        await ctx.route(/binance/, (r) => r.abort());
        const pg = await ctx.newPage();
        const erros = [];
        pg.on('pageerror', (e) => erros.push(e.message));
        await pg.goto(`http://127.0.0.1:${srv.address().port}/mercados/proto/index.html`);
        await pg.waitForFunction(() => window.__proto && /€/.test(document.querySelector('#p-btc').textContent) && /€/.test(document.querySelector('#p-vwce').textContent));
        await pg.waitForTimeout(1200);
        // conta píxeis por cor num canvas 2D (verde/vermelho da linha, quase preto do fundo)
        const cores = (sel) => pg.evaluate((sel) => {
            const c = document.querySelector(sel), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
            let verde = 0, verm = 0, preto = 0, claro = 0;
            for (let i = 0; i < d.length; i += 4) {
                const r = d[i], g = d[i + 1], b = d[i + 2];
                if (r + g + b < 24) preto++; else if (g > r * 1.25 && g > 60) verde++; else if (r > g * 1.25 && r > 60) verm++;
                if (r + g + b > 600) claro++;
            }
            return { w: c.width, h: c.height, n: d.length / 4, verde, verm, preto, claro };
        }, sel);
        // gráfico do Bitcoin: uma linha (verde ou vermelha, conforme o dia), fundo preto, o ponto branco do último preço
        const b = await cores('#c-btc');
        assert.ok(b.w >= 390 && b.h >= 210, `tamanho ${b.w}x${b.h}`);
        assert.ok(b.verde + b.verm > b.n * 0.01, 'a linha e o enchimento têm cor');
        assert.ok(b.preto > b.n * 0.3, 'o fundo é preto');
        assert.ok(b.claro > 6, 'o ponto do último preço');
        // a linha passa onde os dados mandam: em cada coluna, o píxel mais claro está na altura do preço dessa coluna
        const desvio = await pg.evaluate(() => {
            const { X } = window.__proto, g = X.g1(), c = document.querySelector('#c-btc');
            const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data;
            const n = Number(X.gn(g)), lo = X.glo(g), hi = X.ghi(g);
            const s = new Float64Array(X.memory.buffer, (Number(new BigInt64Array(X.memory.buffer, (Number(g) + 2 + 16) * 8, 1)[0]) + 16) * 8, n);
            const xr = w - h * 0.07, topo = h * 0.08, alt = h * 0.80;
            // em cada coluna, o píxel na altura do preço é dos mais claros da coluna (nos troços a pique, a linha
            // ocupa vários píxeis da coluna: por isso compara-se o brilho, não a posição do máximo)
            let pior = 1;
            for (let x = 10; x < xr - 30; x += 17) {
                const lum = (y) => { const i = (Math.max(0, Math.min(h - 1, y)) * w + x) * 4; return d[i] + d[i + 1] + d[i + 2]; };
                let max = 1;
                for (let y = 0; y < h; y++) max = Math.max(max, lum(y));
                const u = x / (xr / (n - 1)), k = Math.min(n - 2, Math.floor(u)), f = u - k, v = s[k] + (s[k + 1] - s[k]) * f;
                const ye = Math.round(topo + (hi - v) / (hi - lo) * alt);
                pior = Math.min(pior, Math.max(lum(ye - 1), lum(ye), lum(ye + 1)) / max);
            }
            return pior;
        });
        assert.ok(desvio >= 0.6, `a linha passa onde os dados mandam (brilho mínimo no sítio esperado: ${(desvio * 100).toFixed(0)}% do máximo da coluna)`);
        // ao vivo (demonstração): o preço muda e o gráfico acompanha
        const p0 = await pg.textContent('#p-btc');
        await pg.waitForFunction((p0) => document.querySelector('#p-btc').textContent !== p0, p0, { timeout: 15000 });
        assert.match(await pg.textContent('#e-vivo'), /demonstração|ao vivo/);
        if (GRAVAR) { await pg.waitForTimeout(3500); await pg.screenshot({ path: path.join(GRAVAR, 'proto-1-topo.png') }); }
        // VWCE: sem preços ao vivo, sem anel; a linha existe
        await pg.locator('#c-vwce').scrollIntoViewIfNeeded();
        await pg.waitForTimeout(700);
        const v = await cores('#c-vwce');
        assert.ok(v.verde + v.verm > v.n * 0.01 && v.preto > v.n * 0.3);
        if (GRAVAR) { await pg.waitForTimeout(1500); await pg.screenshot({ path: path.join(GRAVAR, 'proto-2-vwce.png') }); }
        // mapa: 1 340 pontos, verdes e vermelhos
        await pg.locator('#c-mapa').scrollIntoViewIfNeeded();
        await pg.evaluate(() => window.scrollBy(0, 260));
        await pg.waitForTimeout(900);
        const m = await cores('#c-mapa');
        assert.ok(m.verde > m.n * 0.05 && m.verm > m.n * 0.05, `mapa com as duas cores (${m.verde} verdes, ${m.verm} vermelhos de ${m.n})`);
        const casas = await pg.evaluate(() => Number(window.__proto.X.mcasas(window.__proto.X.mapa())));
        assert.ok(casas >= 1340 + 72, 'todas as casas, mais as linhas vazias entre grupos');
        if (GRAVAR) { await pg.waitForTimeout(2500); await pg.screenshot({ path: path.join(GRAVAR, 'proto-3-mapa.png') }); }
        // tocar num ponto mostra o ativo; a primeira casa é o ETF que mais sobe
        const caixa = await pg.locator('#c-mapa').boundingBox();
        const lado = caixa.width / 36;
        await pg.touchscreen.tap(caixa.x + lado * 0.5, caixa.y + lado * 0.5);
        await pg.waitForSelector('#m-etq:not([hidden])');
        const etq = await pg.textContent('#m-etq');
        assert.match(etq, /ETF/);
        assert.match(etq, /[+−]\d+,\d\d% hoje/);
        const esperado = await pg.evaluate(() => { const U = window.PROTO.uni; let b = -1; U.t.forEach((t, i) => { if (t === 0 && (b < 0 || U.d[i] > U.d[b])) b = i; }); return U.n[b]; });
        assert.ok(etq.includes(esperado), `o primeiro ponto é ${esperado}: ${etq}`);
        // aproximar (roda) e voltar
        await pg.mouse.move(caixa.x + caixa.width / 2, caixa.y + 200);
        for (let i = 0; i < 6; i++) { await pg.mouse.wheel(0, -120); await pg.waitForTimeout(GRAVAR ? 220 : 30); }
        assert.ok(await pg.evaluate(() => window.__proto.vista.z > 2), 'aproximou');
        await pg.waitForSelector('#m-repor:not([hidden])');
        if (GRAVAR) {
            await pg.touchscreen.tap(caixa.x + caixa.width * 0.42, caixa.y + 180);
            await pg.waitForTimeout(2200); await pg.screenshot({ path: path.join(GRAVAR, 'proto-4-zoom.png') });
        }
        await pg.click('#m-repor');
        assert.equal(await pg.evaluate(() => window.__proto.vista.z), 1);
        // fundo do Hoje: a placa gráfica (aqui, por software) desenha ondas escuras, nunca claras
        await pg.evaluate(() => window.scrollTo(0, 0));
        await pg.waitForTimeout(500);
        const f = await pg.evaluate(() => {
            const r = window.__proto.fundoPx();
            if (!r) return { gl: false };
            let max = 0, soma = 0, cor = 0;
            for (let i = 0; i < r.px.length; i += 4) { const l = r.px[i] + r.px[i + 1] + r.px[i + 2]; soma += l; if (l > max) max = l; if (l > 12) cor++; }
            return { gl: true, max, media: soma / (r.px.length / 4), cor: cor / (r.px.length / 4) };
        });
        assert.ok(f.gl, 'há WebGL2');
        assert.ok(f.max < 200 && f.max > 20, `o fundo é escuro mas não vazio (máximo ${f.max})`);
        assert.ok(f.cor > 0.15, `as ondas ocupam parte do cartão (${(f.cor * 100).toFixed(0)}%)`);
        const tempos = await pg.evaluate(() => [document.querySelector('#rodape-fps').textContent, document.querySelector('#rodape-ms').textContent, window.__proto.escala]);
        console.log('  ritmo:', tempos.join(' · '), '| fundo: média', f.media.toFixed(1), 'máx', f.max);
        if (GRAVAR) { await pg.waitForTimeout(3000); }
        assert.deepEqual(erros, []);
        await ctx.close();
    } finally { await br.close(); srv.close(); }
});
