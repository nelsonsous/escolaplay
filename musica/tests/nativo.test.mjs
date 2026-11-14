// A app nativa (nativo/, Capacitor): leva os ficheiros da app lá dentro — abre sem rede e não depende do site, como
// a loja da Apple pede. O projeto iOS do repositório já vai montado (no Mac basta o Xcode): estes testes conferem
// que o que lá está é a app de agora, e que a app montada abre e fala com o conector.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join, extname, normalize } from 'node:path';

const AQUI = fileURLToPath(new URL('.', import.meta.url));
const NATIVO = join(AQUI, '..', 'nativo');
const ler = (f) => JSON.parse(readFileSync(join(NATIVO, f), 'utf8'));
let chromium = null;
try { chromium = createRequire(import.meta.url)('playwright').chromium; } catch { /* sem Playwright: o teste do browser salta */ }

test('app nativa: os ficheiros vão dentro da app (não abre o site); o login do Tidal fica dentro dela; o projeto iOS está em dia', () => {
    const cfg = ler('capacitor.config.json');
    assert.equal(cfg.server.url, undefined, 'a app não abre o site: leva os ficheiros');
    assert.deepEqual(cfg.server.allowNavigation, ['musica.mercados-proxy.workers.dev', 'login.tidal.com'], 'o login do Tidal abre dentro da app e volta pelo conector');
    // o que está montado (www e o projeto iOS) é a app de agora: senão, «node musica/nativo/montar.mjs»
    assert.match(execFileSync(process.execPath, [join(NATIVO, 'montar.mjs'), '--verificar'], { encoding: 'utf8' }), /montado e em dia/);
    const { packageClassList, ...ios } = ler('ios/App/App/capacitor.config.json');
    assert.deepEqual(ios, cfg);
    for (const f of ['index.html', 'musica.js', 'musica.css', 'app/musica.wasm', 'onda/anfitriao.js', 'onda/gestos-onda.js', 'privacidade.html', 'apoio.html', 'cordova.js']) {
        assert.ok(existsSync(join(NATIVO, 'ios/App/App/public', f)), f);
    }
    assert.ok(!existsSync(join(NATIVO, 'www/erro.html')), 'a página «sem ligação ao site» já não é precisa');
    const pagina = readFileSync(join(NATIVO, 'www/index.html'), 'utf8');
    assert.ok(!/\.\.\/|https?:\/\/nelsonsous\.github\.io/.test(pagina), 'a página não aponta para fora da app');
    const plist = readFileSync(join(NATIVO, 'ios/App/App/Info.plist'), 'utf8');
    assert.match(plist, /<key>UIUserInterfaceStyle<\/key>\s*<string>Dark<\/string>/);
    assert.match(plist, /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/, 'só usa HTTPS: a loja não pergunta pela cifra em cada envio');
    const versao = ler('package.json').version;
    assert.equal(versao, JSON.parse(readFileSync(join(AQUI, '..', 'package.json'), 'utf8')).version);
    assert.ok(readFileSync(join(NATIVO, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8').includes(`MARKETING_VERSION = ${versao};`), 'a versão da loja é a da app');
});

test('app nativa: a app montada abre sozinha (sem o site) e fala com o conector', { skip: !chromium && 'sem Playwright' }, async () => {
    // serve só a pasta nativo/www, como o Capacitor faz dentro da app
    const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
    const raiz = join(NATIVO, 'www');
    const pedidos = [];
    const srv = createServer((req, res) => {
        const u = new URL(req.url, 'http://x');
        pedidos.push(u.pathname);
        const f = normalize(join(raiz, u.pathname === '/' ? 'index.html' : u.pathname));
        if (!f.startsWith(raiz) || !existsSync(f)) { res.writeHead(404).end(); return; }
        res.writeHead(200, { 'content-type': TIPOS[extname(f)] || 'application/octet-stream' }).end(readFileSync(f));
    });
    await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
    const browser = await chromium.launch();
    try {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
        const page = await ctx.newPage();
        const erros = [];
        page.on('pageerror', (e) => erros.push(String(e)));
        const api = [];
        await page.route('https://musica.mercados-proxy.workers.dev/**', (r) => {
            api.push(new URL(r.request().url()).pathname);
            r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ versao: '9.9.9', clientId: true, ligado: true }) });
        });
        await page.goto(`http://127.0.0.1:${srv.address().port}/`);
        // a app arranca (o módulo em Onda corre), pede o estado ao conector e desenha os três separadores
        await page.getByRole('heading', { name: 'Música' }).waitFor();
        assert.deepEqual(await page.locator('#mu-nav button span').allTextContents(), ['Música', 'Pedir', 'Ajustes']);
        assert.ok(api.includes('/api/estado'));
        await page.locator('#mu-nav [data-onda="ir\t5"]').click();
        await page.getByText('conector 9.9.9').waitFor();
        // as páginas de privacidade e de apoio vão dentro da app, e voltam a ela
        await page.getByRole('link', { name: 'Privacidade' }).click();
        await page.getByRole('heading', { name: 'Privacidade' }).waitFor();
        await page.getByText('O Maestro é uma inteligência artificial').waitFor();
        await page.getByRole('link', { name: '← Voltar à Música' }).click();
        await page.getByRole('heading', { name: 'Música' }).waitFor();
        await page.goto(`http://127.0.0.1:${srv.address().port}/apoio.html`);
        await page.getByRole('heading', { name: 'Apoio' }).waitFor();
        assert.ok(pedidos.every((p) => !p.includes('..')), 'nada se pede fora da pasta da app');
        assert.ok(['/onda/anfitriao.js', '/onda/gestos-onda.js', '/app/musica.wasm', '/musica.js', '/musica.css'].every((p) => pedidos.includes(p)));
        assert.deepEqual(erros, []);
        await ctx.close();
    } finally {
        await browser.close();
        srv.close();
    }
});
