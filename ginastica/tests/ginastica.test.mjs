// A Ginástica (ginastica/app.onda, corrida por onda/rt/anfitriao.js) num browser a sério, com o relógio do teste:
// a casa, uma sessão inteira guiada (o relógio, as vezes, os lados, os intervalos, a voz, os sinais, o ecrã acordado),
// a estrela, a pausa, saltar, sair, a página que se esconde, o relógio que se guia pela hora, e a memória.
// As regras estão escritas outra vez aqui, em JavaScript, a partir do dados.json: é contra elas que a app se confere.
//   node --test ginastica/tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join, extname } from 'node:path';

const AQUI = fileURLToPath(new URL('.', import.meta.url));
const APP = join(AQUI, '..'), RAIZ = join(APP, '..'), ONDA = join(RAIZ, 'onda');
let chromium = null;
try { chromium = createRequire(import.meta.url)('playwright').chromium; } catch { /* sem Playwright: os testes do browser saltam */ }
const semBrowser = !chromium && 'sem Playwright';
const DADOS = JSON.parse(readFileSync(join(APP, 'dados.json'), 'utf8'));
// monta a app antes de tudo: os testes do browser usam sempre o módulo da fonte de agora, também quando se corre só um
const MONTAGEM = execFileSync('node', [join(APP, 'build.mjs')], { env: { ...process.env, ONDA } }).toString();

// ---------- as regras, em JavaScript ----------
const exDe = (dados, id) => dados.exercicios.find((e) => e.id === id);
// os passos de uma sessão: o exercício, as vezes (as dele, ou as que a sessão muda) e os lados. `feitas` = quantas
// vezes a sessão já foi feita (escolhe o exercício de um passo «à vez»)
function passos(s, feitas = 0, dados = DADOS) {
    return s.passos.map((p) => {
        if (typeof p === 'string') return { e: exDe(dados, p), v: 0 };
        if (p && p.ex) return { e: exDe(dados, p.ex), v: p.vezes || 0 };
        if (p && Array.isArray(p.vez) && p.vez.length) return { e: exDe(dados, p.vez[feitas % p.vez.length]), v: 0 };
        return { e: null };
    }).filter((p) => p.e).map(({ e, v }) => ({ e, vezes: v > 0 ? v : e.vezes > 0 ? e.vezes : 1, lados: Array.isArray(e.lados) && e.lados.length ? e.lados : null }));
}
const nl = (p) => (p.lados ? p.lados.length : 1);
const pausa = (e) => (e.pausa > 0 ? e.pausa : 10);
const dura = (p) => (p.e.tipo === 'tempo' ? p.e.seg
    : p.e.tipo === 'segura' ? p.vezes * nl(p) * p.e.seg + p.vezes * (nl(p) - 1) * 5 + (p.vezes - 1) * pausa(p.e)
        : p.e.dura > 0 ? p.e.dura : 45);
const minutos = (ps) => Math.floor((ps.reduce((s, p) => s + dura(p) + 8, 0) + 30) / 60);
const plural = (n, um, mt) => `${n} ${n === 1 ? um : mt}`;
const pseg = (s) => (s >= 60 && s % 60 === 0 ? plural(s / 60, 'minuto', 'minutos') : plural(s, 'segundo', 'segundos'));
const dose = (p) => (p.e.quanto ? p.e.quanto : p.e.tipo === 'tempo' ? pseg(p.e.seg) : `${plural(p.vezes, 'vez', 'vezes')} · ${pseg(p.e.seg)}${nl(p) > 1 ? ' de cada lado' : ''}`);
const d2 = (v) => String(v).padStart(2, '0');
const mss = (s) => `${Math.floor(s / 60)}:${d2(s % 60)}`;
// as contagens de um passo, por ordem: [segundos, a etiqueta no ecrã, o que a voz diz ao começar (ou null)]
function fases(p) {
    if (p.e.tipo === 'tempo') return [[p.e.seg, '', null]];
    const f = [];
    for (let v = 0; v < p.vezes; v++) {
        for (let l = 0; l < nl(p); l++) {
            const etiqueta = [p.lados ? p.lados[l] : null, p.vezes > 1 ? `${v + 1} de ${p.vezes}` : null].filter(Boolean).join(' · ');
            f.push([p.e.seg, etiqueta, l === 0 ? (p.lados ? p.lados[0] : v > 0 ? 'Outra vez' : null) : null]);
            if (l + 1 < nl(p)) f.push([5, `A seguir: ${p.lados[l + 1]}`, `Troca. ${p.lados[l + 1]}`]);
            else if (v + 1 < p.vezes) f.push([pausa(p.e), 'Descansa', 'Descansa']);
        }
    }
    return f;
}
// os sinais de uma contagem de s segundos: um curto aos 3, 2 e 1 e um comprido no fim
const sinais = (s) => [...Array.from({ length: Math.max(0, Math.min(3, s - 1)) }, () => [880, 120]), [1320, 350]];

// ---------- o que não precisa de browser ----------
test('ginástica: os dados são os do plano (29 exercícios, quatro sessões) e servem à app', () => {
    const plano = readFileSync(join(APP, 'PLANO.md'), 'utf8');
    const tabela = plano.slice(plano.indexOf('## Os exercícios'), plano.indexOf('## Doze semanas'));
    const doPlano = new Map([...tabela.matchAll(/^\| (\d+) \| ([^|]+?) \|/gm)].map((m) => [Number(m[1]), m[2]]));
    assert.equal(doPlano.size, 29);
    const numerados = DADOS.exercicios.filter((e) => e.n !== undefined);
    assert.deepEqual(numerados.map((e) => e.n), Array.from({ length: 29 }, (_, i) => i + 1));
    for (const e of numerados) assert.equal(e.nome, doPlano.get(e.n), `o nome do exercício ${e.n} é o do plano`);
    assert.equal(new Set(DADOS.exercicios.map((e) => e.id)).size, DADOS.exercicios.length, 'ids sem repetir');
    for (const e of DADOS.exercicios) {
        assert.ok(/^[a-z]+$/.test(e.id) && e.nome && e.como && e.como.length <= 170, `${e.id}: nome e «como se faz» (até 170 letras)`);
        assert.ok(['tempo', 'segura', 'conta'].includes(e.tipo), `${e.id}: tipo`);
        if (e.tipo !== 'conta') assert.ok(Number.isInteger(e.seg) && e.seg > 0, `${e.id}: segundos`);
        if (e.tipo === 'conta') assert.ok(e.quanto && e.dura > 0, `${e.id}: quanto e dura`);
        if (e.tipo === 'segura') assert.ok(e.vezes >= 1 && e.vezes <= 3 && e.seg <= 30, `${e.id}: até 3 vezes e 30 segundos`);
    }
    assert.ok(exDe(DADOS, 'ponte').vezes <= 5, 'no máximo cinco pontes por sessão');
    // as sessões das semanas 1 a 4 (sem o 11 e o 22), pelos números do plano; 0 = a bolinha, depois da ponte
    const numeros = (s, feitas) => passos(s, feitas).map((p) => p.e.n || 0);
    const aquece = [1, 2, 3, 4], fecho = [13, 14, 16, 29];
    assert.deepEqual(DADOS.sessoes.map((s) => [s.id, s.nome]), [['A', 'Pernas'], ['B', 'Centro e costas'], ['C', 'Equilíbrio e voltas'], ['D', 'Aparelho e dança']]);
    assert.deepEqual(numeros(DADOS.sessoes[0]), [...aquece, 5, 9, 10, 12, ...fecho]);
    assert.deepEqual(numeros(DADOS.sessoes[1]), [...aquece, 5, 6, 7, 8, 15, 17, 18, 0, ...fecho]);
    assert.deepEqual(numeros(DADOS.sessoes[2]), [...aquece, 7, 19, 20, 21, 23, 24, ...fecho]);
    assert.deepEqual([0, 1, 2, 3].map((k) => numeros(DADOS.sessoes[3], k)), [25, 26, 27, 25].map((ap) => [...aquece, 5, ap, 28, ...fecho]));
    // na sessão A as espargatas fazem-se duas vezes; nas outras, uma
    assert.deepEqual(passos(DADOS.sessoes[0]).slice(-4, -1).map((p) => p.vezes), [2, 2, 2]);
    assert.deepEqual(passos(DADOS.sessoes[1]).slice(-4, -1).map((p) => p.vezes), [1, 1, 1]);
    // barquinho ou prancha em todas, e cada sessão cabe em 15 a 20 minutos
    for (const s of DADOS.sessoes) {
        assert.ok(passos(s).some((p) => p.e.id === 'barquinho' || p.e.id === 'prancha'), `${s.id}: o centro`);
        const m = minutos(passos(s));
        assert.ok(m >= 12 && m <= 20, `${s.id}: ${m} minutos`);
    }
});

test('ginástica: a app monta-se — um módulo pequeno, só com as funções dos eventos à vista', () => {
    assert.match(MONTAGEM, /gerado\/app\.wasm, \d+ bytes/);
    assert.match(execFileSync('node', [join(APP, 'build.mjs'), '--verificar'], { env: { ...process.env, ONDA } }).toString(), /gerado\/ em dia/);
    const wasm = readFileSync(join(APP, 'gerado/app.wasm'));
    assert.ok(wasm.length < 60000, `o módulo tem ${wasm.length} bytes`);
    const nomes = WebAssembly.Module.exports(new WebAssembly.Module(wasm)).map((e) => e.name).filter((n) => !n.startsWith('_') && n !== 'memory');
    assert.deepEqual(nomes.sort(), ['clique', 'lido', 'main', 'tique']);
    assert.equal(readFileSync(join(APP, 'gerado/anfitriao.js'), 'utf8'), readFileSync(join(ONDA, 'rt/anfitriao.js'), 'utf8'), 'o anfitrião da app é o da Onda');
    // o que a página pede está na lista do service worker (abre sem rede), com a mesma versão
    const sw = readFileSync(join(APP, 'sw.js'), 'utf8'), pagina = readFileSync(join(APP, 'index.html'), 'utf8'), casca = readFileSync(join(APP, 'app.js'), 'utf8');
    for (const f of [...pagina.matchAll(/(?:href|src)="([^"#]+)"/g)].map((m) => m[1]).concat([...casca.matchAll(/fetch\('([^']+)'\)/g)].map((m) => m[1]))) {
        assert.ok(sw.includes(`'${f}'`), `o service worker guarda ${f}`);
        assert.ok(existsSync(join(APP, f.split('?')[0])), `${f} existe`);
    }
    console.log(`# módulo: ${wasm.length} bytes (o molde: ${readFileSync(join(ONDA, 'molde/gerado/app.wasm')).length})`);
});

// ---------- no browser ----------
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
function servidor() {
    const estado = { falha: false };
    const srv = createServer((req, res) => {
        const u = decodeURIComponent(req.url.split('?')[0]);
        const f = join(RAIZ, u);
        if (estado.falha && u.endsWith('dados.json')) { res.writeHead(503); return res.end(); }
        if (!f.startsWith(RAIZ) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': TIPOS[extname(f)] || 'application/octet-stream' });
        createReadStream(f).pipe(res);
    }).listen(0);
    return { srv, estado, url: () => `http://127.0.0.1:${srv.address().port}/ginastica/index.html` };
}
// o que o browser dá à app, a fingir: fica escrito o que ela pediu (o ecrã acordado, os tons, as falas)
const FINGE = () => {
    const p = window.__portas = { acordado: 0, largado: 0, tons: [], falas: [], calas: 0, contextos: 0 };
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async () => { p.acordado++; const s = new EventTarget(); s.release = async () => { p.largado++; s.dispatchEvent(new Event('release')); }; return s; } } });
    window.AudioContext = class {
        constructor() { p.contextos++; this.currentTime = 0; this.state = 'running'; this.destination = {}; }
        resume() { return Promise.resolve(); }
        createOscillator() { const o = { frequency: { value: 0 }, connect() {}, start(t) { o.t0 = t; }, stop(t) { p.tons.push([o.frequency.value, Math.round((t - o.t0) * 1000)]); } }; return o; }
        createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} }; }
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speaking: false, pending: false, cancel() { p.calas++; }, speak(u) { p.falas.push([u.text, u.lang]); } } });
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; this.lang = ''; } };
};
const AGORA = '2026-11-16T18:00:00Z', HOJE = '2026-11-16';
// abre a app num telemóvel, com o relógio do teste parado às 18:00 de 16/11/2026 (hora de Lisboa)
async function abre(br, url, { antes, relogio = true } = {}) {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'pt-PT' });
    await ctx.addInitScript(FINGE);
    if (antes) await ctx.addInitScript(antes);
    const pg = await ctx.newPage();
    const erros = [];
    pg.on('pageerror', (e) => erros.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/503/.test(m.text())) erros.push(m.text()); });
    if (relogio) await pg.clock.install({ time: new Date('2026-11-16T17:59:00Z') });
    await pg.goto(url);
    await pg.waitForSelector('#ecra [data-onda]');
    if (relogio) await pg.clock.pauseAt(new Date(AGORA));
    return { ctx, pg, erros };
}
const portas = (pg) => pg.evaluate(() => window.__portas);
const feitas = (pg) => pg.evaluate(() => localStorage.getItem('ginastica:feitas'));
const topo = (pg) => pg.evaluate(() => Number(new BigInt64Array(window.app.exports.memory.buffer, 15 * 8, 1)[0]));
const toca = (pg, acao) => pg.click(`[data-onda="${acao}"]`);

// a casa: as sessões, a escolhida, o resumo, a lista e as estrelas
async function confereCasa(pg, k, estrelas, hoje, feitasDaSessao = 0, dados = DADOS) {
    const s = dados.sessoes[k], ps = passos(s, feitasDaSessao, dados);
    assert.deepEqual(await pg.locator('.sessoes button').allTextContents(), dados.sessoes.map((x) => x.id));
    assert.equal(await pg.textContent('.sessoes button.on'), s.id);
    assert.equal(await pg.textContent('h2.nome'), s.nome);
    assert.equal(await pg.textContent('.resumo'), `${plural(ps.length, 'exercício', 'exercícios')} · cerca de ${plural(minutos(ps), 'minuto', 'minutos')}`);
    assert.deepEqual(await pg.locator('.lista li').allTextContents(), ps.map((p) => p.e.nome));
    assert.equal(await pg.textContent('.estrelas'), `★ ${estrelas}${hoje ? ' · já tens a estrela de hoje' : ''}`);
    return ps;
}
// a apresentação de um passo: onde vai, o nome, como se faz, quanto, e o botão
async function confereApresentacao(pg, p, i, n) {
    assert.equal(await pg.textContent('.passo'), `${i + 1} de ${n}`);
    assert.equal(await pg.textContent('h2.nome'), p.e.nome);
    assert.equal(await pg.textContent('.como'), p.e.como);
    assert.equal(await pg.textContent('.dose'), dose(p));
    assert.equal(await pg.textContent('#relogio'), '');
    assert.equal(await pg.textContent('.etiqueta'), '');
    assert.equal(await pg.textContent('[data-onda="vai:0"]'), p.e.tipo === 'conta' ? 'Feito' : 'Vai');
}
// faz um passo inteiro, com o relógio do teste; junta a `reg` o que a voz e os sinais devem ter dito
async function fazPasso(pg, p, i, n, reg) {
    await confereApresentacao(pg, p, i, n);
    reg.falas.push(p.e.nome);
    await toca(pg, 'vai:0');
    if (p.e.tipo === 'conta') return;
    for (const [s, etiqueta, voz] of fases(p)) {
        if (voz) reg.falas.push(voz);
        assert.equal(await pg.textContent('#relogio'), mss(s), `${p.e.nome}: o relógio começa em ${mss(s)}`);
        assert.equal(await pg.textContent('.etiqueta'), etiqueta);
        assert.equal(await pg.textContent('[data-onda="pausa:0"]'), 'Pausa');
        if (s > 12) { // a meio, o relógio já desceu; o resto salta-se de uma vez (sem tiques pelo meio) até faltarem 5 s
            await pg.clock.runFor(2000);
            assert.equal(await pg.textContent('#relogio'), mss(s - 2));
            await pg.clock.fastForward((s - 7) * 1000);
            assert.equal(await pg.textContent('#relogio'), mss(5), `${p.e.nome}: depois do salto faltam 5 segundos`);
            await pg.clock.runFor(5000);
        } else if (s > 4) {
            await pg.clock.runFor(2000);
            assert.equal(await pg.textContent('#relogio'), mss(s - 2));
            await pg.clock.runFor((s - 2) * 1000);
        } else await pg.clock.runFor(s * 1000);
        reg.tons.push(...sinais(s));
    }
}
async function fazSessao(pg, ps, reg) {
    for (let i = 0; i < ps.length; i++) await fazPasso(pg, ps[i], i, ps.length, reg);
}

test('ginástica: as quatro sessões inteiras, guiadas — o relógio, as vezes e os lados, a voz, os sinais, o ecrã acordado e a estrela', { skip: semBrowser }, async () => {
    const { srv, url } = servidor();
    const br = await chromium.launch();
    try {
        const { pg, erros } = await abre(br, url());
        const h0 = await topo(pg);
        // a casa, ao abrir pela primeira vez: a sessão A, sem estrelas
        let ps = await confereCasa(pg, 0, 0, false);
        assert.equal(await pg.textContent('[data-onda="comeca:0"]'), 'Começar');
        assert.deepEqual(await portas(pg), { acordado: 0, largado: 0, tons: [], falas: [], calas: 0, contextos: 0 }, 'em casa não há som, voz nem ecrã preso');
        const reg = { falas: [], tons: [] };
        for (let k = 0; k < DADOS.sessoes.length; k++) {
            if (k) { await toca(pg, `sessao:${k}`); ps = await confereCasa(pg, k, k, true); } // a seguinte já vem escolhida; tocar nela não muda nada
            await toca(pg, 'comeca:0');
            let p = await portas(pg);
            assert.deepEqual([p.acordado, p.largado, p.contextos], [k + 1, k, 1], 'ao começar: o ecrã fica acordado e o som fica preparado, uma vez');
            await fazSessao(pg, ps, reg);
            // o fim: a estrela, guardada com o dia
            assert.equal(await pg.textContent('.fim h2'), 'Parabéns!');
            assert.equal(await pg.textContent('.fim .texto'), `Ganhaste a estrela de hoje. Já tens ${plural(k + 1, 'estrela', 'estrelas')}.`);
            reg.falas.push('Parabéns! Ganhaste a estrela de hoje.'); reg.tons.push([1568, 600]);
            p = await portas(pg);
            assert.deepEqual([p.acordado, p.largado], [k + 1, k + 1], 'no fim, o ecrã volta a poder apagar');
            assert.deepEqual(p.falas, reg.falas.map((f) => [f, 'pt-PT']), `sessão ${DADOS.sessoes[k].id}: o que a voz disse, por ordem`);
            assert.deepEqual(p.tons, reg.tons, `sessão ${DADOS.sessoes[k].id}: os sinais, por ordem`);
            assert.equal(await feitas(pg), DADOS.sessoes.slice(0, k + 1).map((s) => `${HOJE}:${s.id},`).join(''));
            await toca(pg, 'casa:0');
            // a casa propõe a sessão seguinte (depois da D, outra vez a A; e a D seguinte traz o arco em vez da corda)
            await confereCasa(pg, (k + 1) % DADOS.sessoes.length, k + 1, true);
            assert.equal(await topo(pg), h0, 'uma sessão inteira não deixa nada no monte');
        }
        await toca(pg, 'sessao:3');
        const outraD = await confereCasa(pg, 3, 4, true, 1);
        assert.equal(outraD[5].e.id, 'arco');
        assert.equal(passos(DADOS.sessoes[3], 0)[5].e.id, 'corda');
        // fica tudo guardado: ao voltar a abrir, as estrelas e a sessão seguinte lá estão
        await pg.reload();
        await pg.waitForSelector('[data-onda="comeca:0"]');
        await confereCasa(pg, 0, 4, true, 1);
        assert.deepEqual(erros, []);
    } finally { await br.close(); srv.close(); }
});

test('ginástica: a pausa, a página que se esconde, o relógio pela hora, saltar e sair', { skip: semBrowser }, async () => {
    const { srv, url } = servidor();
    const br = await chromium.launch();
    try {
        const { pg, erros } = await abre(br, url());
        const ps = passos(DADOS.sessoes[0]), n = ps.length;
        await toca(pg, 'comeca:0');
        const reg = { falas: [], tons: [] };
        // o 1.º (um minuto a saltitar): pausa a meio — o relógio fica onde estava, por muito que se espere
        await confereApresentacao(pg, ps[0], 0, n);
        await toca(pg, 'vai:0');
        await pg.clock.runFor(12500);
        assert.equal(await pg.textContent('#relogio'), '0:48', 'faltam 47,5 s: mostra 48');
        await toca(pg, 'pausa:0');
        assert.equal(await pg.textContent('[data-onda="pausa:0"]'), 'Continuar');
        assert.equal(await pg.locator('#relogio b.parado').count(), 1);
        await pg.clock.runFor(600000);
        assert.equal(await pg.textContent('#relogio'), '0:48');
        assert.equal(await pg.textContent('h2.nome'), ps[0].e.nome);
        await toca(pg, 'pausa:0');
        assert.equal(await pg.locator('#relogio b.parado').count(), 0);
        await pg.clock.runFor(47000);
        assert.equal(await pg.textContent('#relogio'), '0:01', 'continua de onde ficou: ainda falta meio segundo');
        await pg.clock.runFor(500);
        await confereApresentacao(pg, ps[1], 1, n);
        // a página esconde-se (outra app, o ecrã bloqueado): a sessão pára sozinha e só continua quando a pessoa quiser
        for (const i of [1, 2, 3]) await toca(pg, 'vai:0'); // os três de contar: «Feito»
        await confereApresentacao(pg, ps[4], 4, n); // o barquinho: 3 × 15 s
        await toca(pg, 'vai:0');
        await pg.clock.runFor(5000);
        const ve = (estado) => pg.evaluate((e) => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => e }); document.dispatchEvent(new Event('visibilitychange')); }, estado);
        await ve('hidden');
        await pg.clock.runFor(120000);
        await ve('visible');
        assert.equal(await pg.textContent('#relogio'), '0:10');
        assert.equal(await pg.textContent('[data-onda="pausa:0"]'), 'Continuar');
        await toca(pg, 'pausa:0');
        // o relógio guia-se pela hora: o telemóvel adormece 7 s (um salto, sem tiques pelo meio) e ao acordar está certo
        await pg.clock.fastForward(7000);
        assert.equal(await pg.textContent('#relogio'), '0:03');
        await pg.clock.runFor(3000);
        assert.equal(await pg.textContent('.etiqueta'), 'Descansa');
        assert.equal(await pg.textContent('#relogio'), '0:10');
        // adormece mais do que faltava: a contagem acaba ao acordar, e a seguinte começa do princípio (não se atropelam)
        await pg.clock.fastForward(45000);
        assert.equal(await pg.textContent('.etiqueta'), '2 de 3');
        assert.equal(await pg.textContent('#relogio'), '0:15');
        // sair pede para confirmar; «Continuar a sessão» volta ao mesmo sítio, com o relógio a andar
        await toca(pg, 'sai:0');
        assert.deepEqual(await pg.locator('.botoes button').allTextContents(), ['Continuar a sessão', 'Sair sem estrela']);
        await toca(pg, 'fica:0');
        assert.equal(await pg.textContent('[data-onda="pausa:0"]'), 'Pausa');
        await pg.clock.runFor(2000);
        assert.equal(await pg.textContent('#relogio'), '0:13');
        // saltar: passa ao exercício seguinte, sem acabar este
        await toca(pg, 'salta:0');
        await confereApresentacao(pg, ps[5], 5, n);
        await pg.clock.runFor(60000);
        await confereApresentacao(pg, ps[5], 5, n); // na apresentação o relógio não corre
        // sair a sério: volta a casa, sem estrela, e o ecrã volta a poder apagar
        await toca(pg, 'sai:0');
        await toca(pg, 'sai:1');
        await confereCasa(pg, 0, 0, false);
        assert.equal(await feitas(pg), null);
        let p = await portas(pg);
        assert.deepEqual([p.acordado, p.largado], [1, 1]);
        // saltar tudo não dá estrela: é preciso fazer pelo menos metade
        await toca(pg, 'comeca:0');
        for (let i = 0; i < n; i++) { await confereApresentacao(pg, ps[i], i, n); await toca(pg, 'salta:0'); }
        assert.equal(await pg.textContent('.fim h2'), 'Hoje ficou a meio');
        assert.equal(await pg.textContent('.fim .texto'), 'Sem estrela desta vez. Amanhã há mais.');
        assert.equal(await feitas(pg), null);
        await toca(pg, 'casa:0');
        await confereCasa(pg, 0, 0, false);
        // metade feita e metade saltada: já conta
        await toca(pg, 'comeca:0');
        for (let i = 0; i < n; i++) {
            if (i < n / 2) await fazPasso(pg, ps[i], i, n, reg);
            else { await confereApresentacao(pg, ps[i], i, n); await toca(pg, 'salta:0'); }
        }
        assert.equal(await pg.textContent('.fim h2'), 'Parabéns!');
        assert.equal(await feitas(pg), `${HOJE}:A,`);
        p = await portas(pg);
        assert.deepEqual([p.acordado, p.largado], [3, 3]);
        assert.deepEqual(erros, []);
    } finally { await br.close(); srv.close(); }
});

test('ginástica: o que está guardado (as feitas, o som e a voz) e o que vem de fora (lixo, HTML nos dados, a rede em baixo)', { skip: semBrowser }, async () => {
    const { srv, estado, url } = servidor();
    const br = await chromium.launch();
    try {
        // um armazém com história e com lixo: contam as que são de sessões que existem; a última foi a D (segue-se a A)
        let { ctx, pg, erros } = await abre(br, url(), {
            antes: () => { if (!localStorage.getItem('ginastica:feitas')) localStorage.setItem('ginastica:feitas', '2026-11-10:A,2026-11-11:B,lixo,2026-11-12:Z,:,2026-11-13:D,2026-11-14:A,2026-11-15:D,'); },
        });
        await confereCasa(pg, 0, 5, false);
        await toca(pg, 'sessao:3');
        const d = await confereCasa(pg, 3, 5, false, 2); // a D já foi feita duas vezes: hoje é a bola
        assert.equal(d[5].e.id, 'bola');
        // desligar o som e a voz: nem tons nem falas, e fica guardado
        assert.deepEqual(await pg.locator('.ajustes button').allTextContents(), ['Som: ligado', 'Voz: ligada']);
        await toca(pg, 'som:0'); await toca(pg, 'voz:0');
        assert.deepEqual(await pg.locator('.ajustes button').allTextContents(), ['Som: desligado', 'Voz: desligada']);
        await toca(pg, 'sessao:0');
        const ps = passos(DADOS.sessoes[0]);
        await toca(pg, 'comeca:0');
        for (let i = 0; i < 6; i++) await fazPasso(pg, ps[i], i, ps.length, { falas: [], tons: [] });
        let p = await portas(pg);
        assert.deepEqual([p.tons, p.falas, p.contextos], [[], [], 0], 'calada: nem sinais nem voz');
        assert.equal(p.acordado, 1, 'o ecrã fica acordado na mesma');
        await pg.reload();
        await pg.waitForSelector('[data-onda="comeca:0"]');
        assert.deepEqual(await pg.locator('.ajustes button').allTextContents(), ['Som: desligado', 'Voz: desligada']);
        await toca(pg, 'voz:0');
        assert.deepEqual(await pg.locator('.ajustes button').allTextContents(), ['Som: desligado', 'Voz: ligada']);
        assert.deepEqual(erros, []);
        await ctx.close();

        // dados com HTML e com passos que não existem: o texto aparece como texto, e o que não existe salta-se
        const maus = JSON.parse(JSON.stringify(DADOS));
        maus.exercicios[0].nome = '<img src=x onerror="window.__mau=1"> & "aspas"';
        maus.exercicios[0].como = '<b>negrito</b> & <script>window.__mau=2</script>';
        maus.sessoes[0].nome = 'Pernas <i>&amp;</i>';
        maus.sessoes[0].passos = ['saltitar', 'naoexiste', { ex: 'tambemnao' }, { vez: [] }, 42, null, 'circulos'];
        maus.sessoes.push({ id: 'E', nome: 'Vazia', passos: ['nada'] });
        ({ ctx, pg, erros } = await abre(br, url(), { antes: undefined }));
        await pg.route('**/dados.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(maus) }));
        await pg.reload();
        await pg.waitForSelector('[data-onda="comeca:0"]');
        const psm = await confereCasa(pg, 0, 0, false, 0, maus);
        assert.deepEqual(psm.map((x) => x.e.id), ['saltitar', 'circulos']);
        assert.equal(await pg.locator('#ecra img, #ecra i, #ecra script').count(), 0);
        await toca(pg, 'comeca:0');
        await confereApresentacao(pg, psm[0], 0, 2);
        assert.equal(await pg.locator('#ecra img, #ecra b:not(#relogio b), #ecra script').count(), 0);
        assert.equal(await pg.evaluate(() => window.__mau), undefined);
        await toca(pg, 'sai:0'); await toca(pg, 'sai:1');
        // uma sessão sem exercícios que existam não começa
        await toca(pg, 'sessao:4');
        assert.equal(await pg.textContent('.resumo'), '0 exercícios · cerca de 0 minutos');
        assert.equal(await pg.locator('[data-onda="comeca:0"][disabled]').count(), 1);
        await pg.evaluate(() => window.app.chamar('clique', window.app.escrever('comeca:0')));
        assert.equal(await pg.locator('.sessoes').count(), 1, 'continua em casa');
        // ações que não existem ou com números fora do sítio não fazem nada
        await pg.evaluate(() => { for (const a of ['sessao:99', 'sessao:-1', 'vai:0', 'pausa:0', 'salta:0', 'sai:1', 'casa:0', 'xpto:1', '', ':']) window.app.chamar('clique', window.app.escrever(a)); });
        assert.equal(await pg.textContent('.sessoes button.on'), 'E');
        assert.deepEqual(erros, []);
        await ctx.close();

        // a rede em baixo: diz que não há ligação e deixa tentar outra vez
        estado.falha = true;
        ({ ctx, pg, erros } = await abre(br, url(), { relogio: false }));
        assert.match(await pg.textContent('#ecra'), /Sem ligação/);
        estado.falha = false;
        await toca(pg, 'tenta:0');
        await pg.waitForSelector('[data-onda="comeca:0"]');
        await confereCasa(pg, 0, 0, false);
        assert.deepEqual(erros, []);
    } finally { await br.close(); srv.close(); }
});

// mede o que está no ecrã, sem olhar para ele: o que sai para fora ou fica cortado, os botões mais pequenos do que um
// dedo, o texto com pouco contraste, e onde ficam o botão principal e o fim do cartão
const MEDE = () => {
    const W = innerWidth, H = innerHeight, probs = [], de = document.documentElement;
    const nome = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.replace(/ /g, '.') : '');
    const rgb = (c) => { const m = c.match(/[\d.]+/g).map(Number); return m.length > 3 && m[3] === 0 ? null : m.slice(0, 3); };
    const luz = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const fundo = (el) => { for (let x = el; x; x = x.parentElement) { const c = rgb(getComputedStyle(x).backgroundColor); if (c) return c; } return [0, 0, 0]; };
    if (de.scrollWidth > W) probs.push(`a página tem ${de.scrollWidth} px de largura`);
    for (const el of document.querySelectorAll('header h1, #ecra *')) {
        const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        if (!r.width || !r.height) continue;
        if (r.left < -0.5 || r.right > W + 0.5) probs.push(`${nome(el)} sai para fora (${Math.round(r.left)} a ${Math.round(r.right)})`);
        if (cs.display !== 'inline' && el.scrollWidth > el.clientWidth + 1) probs.push(`${nome(el)} fica cortado`);
        if (el.tagName === 'BUTTON' && (r.height < 44 || r.width < 44)) probs.push(`${nome(el)} é pequeno para um dedo (${Math.round(r.width)}×${Math.round(r.height)})`);
        if ([...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim()) && !el.disabled) {
            const a = luz(rgb(cs.color)), b = luz(fundo(el)), razao = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            if (razao < 4.5) probs.push(`${nome(el)} tem pouco contraste (${razao.toFixed(1)})`);
        }
    }
    const baixo = (s) => { const el = document.querySelector(s); return el ? Math.round(el.getBoundingClientRect().bottom) : 0; };
    const rel = document.querySelector('#relogio b');
    return { H, alto: de.scrollHeight, principal: baixo('.acao'), fim: baixo('.botoes'), relogio: rel ? parseFloat(getComputedStyle(rel).fontSize) : 0, probs };
};

test('ginástica: o desenho cabe num telemóvel pequeno, num normal e num tablet — nada cortado, botões de dedo, contraste, o relógio grande', { skip: semBrowser }, async () => {
    const { srv, url } = servidor();
    const br = await chromium.launch();
    try {
        const linhas = [];
        for (const [w, h] of [[320, 568], [390, 844], [768, 1024]]) {
            const ctx = await br.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, locale: 'pt-PT' });
            await ctx.addInitScript(FINGE);
            await ctx.addInitScript(`window.__mede = ${MEDE}`);
            const pg = await ctx.newPage();
            await pg.clock.install({ time: new Date('2026-11-16T17:59:00Z') });
            await pg.goto(url());
            await pg.waitForSelector('[data-onda="comeca:0"]');
            await pg.clock.pauseAt(new Date(AGORA));
            // faz os toques e mede o ecrã que fica, numa só ida ao browser
            const mede = async (onde, ...toques) => {
                const m = await pg.evaluate((ts) => { for (const t of ts) window.app.chamar('clique', window.app.escrever(t)); return window.__mede(); }, toques);
                assert.deepEqual(m.probs, [], `${w}×${h}, ${onde}`);
                return m;
            };
            // a casa de cada sessão: «Começar» vê-se sem rolar
            for (let k = 0; k < DADOS.sessoes.length; k++) {
                const m = await mede(`a casa da sessão ${DADOS.sessoes[k].id}`, `sessao:${k}`);
                assert.ok(m.principal <= h, `${w}×${h}: «Começar» vê-se sem rolar (${m.principal})`);
            }
            // todos os passos de todas as sessões: a apresentação, a contar, o intervalo, parado, a pergunta de sair
            let pior = 0, menor = 1e9;
            for (let k = 0; k < DADOS.sessoes.length; k++) {
                const ps = passos(DADOS.sessoes[k]);
                for (let i = 0; i < ps.length; i++) {
                    const onde = `${DADOS.sessoes[k].id}, ${ps[i].e.nome}`;
                    let m = await mede(`${onde}: a apresentação`, ...(i ? ['salta:0'] : [`sessao:${k}`, 'comeca:0']));
                    pior = Math.max(pior, m.alto);
                    if (ps[i].e.tipo === 'conta') continue;
                    m = await mede(`${onde}: a contar`, 'vai:0');
                    pior = Math.max(pior, m.alto); menor = Math.min(menor, m.relogio);
                    assert.ok(m.principal <= h, `${w}×${h}, ${onde}: «Pausa» vê-se sem rolar (${m.principal})`);
                    if (fases(ps[i]).length > 1) { await pg.clock.fastForward(ps[i].e.seg * 1000); await mede(`${onde}: o intervalo`); }
                    await mede(`${onde}: parado`, 'pausa:0');
                    await mede(`${onde}: a pergunta de sair`, 'sai:0');
                    await toca(pg, 'fica:0');
                }
                await mede('o fim, sem estrela', 'salta:0');
                await toca(pg, 'casa:0');
            }
            assert.ok(menor >= 80, `${w}×${h}: o relógio lê-se de longe (${menor} px)`);
            if (h >= 800) assert.ok(pior <= h, `${w}×${h}: uma sessão inteira sem rolar (o cartão mais alto tem ${pior} px)`);
            // o fim com estrela: metade da sessão A feita (cada contagem acaba num salto do relógio), o resto saltado
            await toca(pg, 'sessao:0'); await toca(pg, 'comeca:0');
            const ps = passos(DADOS.sessoes[0]);
            for (let i = 0; i < ps.length; i++) {
                if (i >= ps.length / 2) { await toca(pg, 'salta:0'); continue; }
                await toca(pg, 'vai:0');
                if (ps[i].e.tipo !== 'conta') for (const [seg] of fases(ps[i])) await pg.clock.fastForward(seg * 1000);
            }
            assert.equal(await pg.textContent('.fim h2'), 'Parabéns!');
            await mede('o fim, com estrela');
            linhas.push(`${w}×${h}: o cartão mais alto ${pior} px, o relógio ${menor} px`);
            await ctx.close();
        }
        console.log('# ' + linhas.join('; '));
    } finally { await br.close(); srv.close(); }
});

test('ginástica: a memória não cresce com o uso, e cada toque e cada tique são rápidos', { skip: semBrowser }, async () => {
    const { srv, url } = servidor();
    const br = await chromium.launch();
    try {
        const { pg, erros } = await abre(br, url(), { relogio: false });
        const h0 = await topo(pg);
        // 300 eventos em casa (escolher sessões, o som e a voz) e 300 numa sessão (pausa, continuar, sair e ficar, tiques)
        const medidas = await pg.evaluate(() => {
            const toca = (a) => window.app.chamar('clique', window.app.escrever(a));
            const mede = (n, f) => { const t = performance.now(); for (let i = 0; i < n; i++) f(i); return (performance.now() - t) / n; };
            const casa = mede(300, (i) => toca(i % 3 === 2 ? 'som:0' : `sessao:${i % 4}`));
            toca('sessao:0'); toca('comeca:0'); toca('vai:0');
            const sessao = mede(300, (i) => toca(['pausa:0', 'pausa:0', 'sai:0', 'fica:0'][i % 4]));
            const tique = mede(3000, () => window.app.chamar('tique', 0n));
            toca('pausa:0');
            const parado = mede(3000, () => window.app.chamar('tique', 0n));
            toca('sai:0'); toca('sai:1');
            return { casa, sessao, tique, parado };
        });
        assert.equal(await topo(pg), h0, '600 toques e 6000 tiques deixam o monte onde estava');
        assert.equal(await pg.locator('.sessoes').count(), 1);
        assert.ok(medidas.casa < 3 && medidas.sessao < 3, `um toque: ${medidas.casa.toFixed(3)} ms em casa, ${medidas.sessao.toFixed(3)} ms na sessão`);
        assert.ok(medidas.tique < 0.2 && medidas.parado < 0.2, `um tique: ${medidas.tique.toFixed(4)} ms a contar, ${medidas.parado.toFixed(4)} ms parado`);
        console.log(`# um toque: ${medidas.casa.toFixed(3)} ms em casa (desenha a lista), ${medidas.sessao.toFixed(3)} ms na sessão; um tique: ${medidas.tique.toFixed(4)} ms a contar, ${medidas.parado.toFixed(4)} ms parado`);
        // o relógio muda só os algarismos: o cartão do exercício fica com os mesmos nós de um segundo para o outro
        const mesmos = await pg.evaluate(async () => {
            const toca = (a) => window.app.chamar('clique', window.app.escrever(a));
            toca('comeca:0'); toca('vai:0');
            const antes = [...document.querySelectorAll('#ecra h2, #ecra .como, #ecra .botoes button, #relogio')];
            const t0 = document.querySelector('#relogio').textContent;
            await new Promise((r) => setTimeout(r, 1300));
            const depois = [...document.querySelectorAll('#ecra h2, #ecra .como, #ecra .botoes button, #relogio')];
            const t1 = document.querySelector('#relogio').textContent;
            toca('sai:0'); toca('sai:1');
            return { iguais: antes.length === depois.length && antes.every((x, i) => x === depois[i]), t0, t1 };
        });
        assert.ok(mesmos.iguais, 'os nós do cartão são os mesmos');
        assert.deepEqual([mesmos.t0, mesmos.t1], ['1:00', '0:59']);
        assert.equal(await topo(pg), h0, 'um tique que redesenha o relógio também solta o que reservou');
        assert.deepEqual(erros, []);
    } finally { await br.close(); srv.close(); }
});
