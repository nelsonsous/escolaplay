// node --test mercados/tests — o conselheiro em Onda dá o mesmo que o JS de referência, byte a byte.
// Cada cenário corre nos dois lados (mercados/conselheiro/js/*.mjs e mercados/conselheiro/*.mjs → Onda) com a mesma
// rede e o mesmo relógio simulados (conselheiro-rede.mjs) e compara os ficheiros escritos, os pedidos feitos (e os PUT
// do KV), o stdout, o stderr e o código de saída. Ver conselheiro-paridade.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { comparar } from './conselheiro-paridade.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../..');

// ---------- peças dos cenários ----------
const dono = (id) => ({ 'cfg:owner': { valor: id } });
const diario = (id, d, meta = { s: '2026-11-06', c: 0 }) => ({ ['j:' + id]: { valor: { v: 1, ...d }, meta } });
const DIAS = {
    '2026-10-01': [{ s: 'VWCE.DE', p: 150, a: 'buy', l: 60, m: 55, sh: 40, o: 0 }, { s: 'NVDA', p: 150, a: 'avoid' }, { s: 'TSLA', p: 300, a: 'avoid' }, { s: 'c:BTC', p: 50, a: 'scale' }],
    '2026-11-04': [{ s: 'VWCE.DE', p: 160, a: 'buy' }, { s: 'NVDA', p: 150, a: 'avoid' }, { s: 'AAPL', p: 0.01, a: 'hold' }],
    '2026-11-06': [{ s: 'VWCE.DE', p: 161, a: 'hold' }, { s: 'BCP.LS', p: 0.5, a: 'buy' }, { s: 'IWDA.AS', p: 90, a: 'buy' }],
};
// 18 ações juntadas pelo dono (com as da app passam de 40: dois pedidos de consenso) e um consenso com tudo o que o conector dá
const MUITAS = ['ZZA.DE', 'ZZB.DE', 'ZZC.DE', 'ZZD.PA', 'ZZE.PA', 'ZZF.L', 'ZZG.L', 'ZZH.AS', 'ZZI.AS', 'ZZJ', 'ZZK', 'ZZL', 'ZZM', 'ZZN', 'ZZO', 'ZZP', 'ZZQ.MI', 'ZZR.MI'];
const RICO = { key: 'sell', mean: 4.4, n: 14, target: 80, price: 100, rev: { up: 1, down: 9, chg: -0.12 }, sur: { n: 4, beats: 1, avg: -0.06 }, votes3: [0, 1, 5, 6, 2], f: { pe: 44.44, cr: -0.081, mg: -0.02, roe: -0.11, de: 212.6, peg: 3 } };
const LOTES = { 'c:BTC': { plan: '2025-01-02', buys: [{ d: '2025-03-01', e: 100 }, { d: '2026-10-01', e: 50.5 }] }, 'c:ETH': { plan: '', buys: [{ d: '2026-02-30', e: 20 }] } };
const conselho = (date, extra = {}) => ({ ['advice:' + date]: { valor: {
    v: 2, date, generatedAt: date + 'T07:16:00.000Z', headline: 'Leitura de ' + date, market: 'Mercado.', planNote: '900 € em 2 execuções',
    plan: [{ s: 'VWCE.DE', name: '', amount: '810 €', why: 'núcleo' }, { s: 'c:BTC', name: '', amount: '90 €', why: '' }],
    actions: [{ s: 'NVDA', key: 'buy', action: 'Comprar', short: 50, mid: 75, long: 80, entry: 150, why: 'x' }, { s: 'BZ=F', key: 'up', action: 'Em alta', mid: 60, why: 'y' },
        { s: 'c:BTC', key: 'wait', action: 'Esperar', mid: 45, why: 'z' }, { s: 'TSLA', key: 'sell', mid: 20, why: 'w' }, { s: 'VWCE.DE', key: 'hold', mid: 62, stop: 120, why: 'v' }],
    rank: { short: [], mid: ['NVDA'], long: [] }, risks: [], tldr: ['a'], movers: [], review: '', lessons: ['l1'],
    prices: { 'VWCE.DE': 150, NVDA: 160, 'c:BTC': 90000, 'BZ=F': 70, TSLA: 310 }, ...extra } } });

// ---------- os cenários ----------
export function cenarios() {
    const C = [];
    const d = (nome, c) => C.push({ nome: 'dados: ' + nome, script: 'dados', args: ['{pasta}'], agora: '2026-11-06T07:15:00Z', semente: 7, ...c });
    d('com o dono, diário, lotes de cripto, conselhos anteriores e lições', { kv: { ...dono('dono-teste-0001'), ...diario('dono-teste-0001', { days: DIAS, lots: LOTES, saveDays: [2, 16], my: ['VWCE.DE', 'c:ETH', 'EGL.LS'] }), ...conselho('2026-11-04'), ...conselho('2026-11-05', { v: undefined }), 'advice:lessons': { valor: ['Não perseguir subidas', 'Cripto: manter 365 dias'] } } });
    d('com quantidades na carteira (4.17): pesos, um sem preço, um sem investido, textos', { kv: { ...dono('dono-teste-0002'), ...diario('dono-teste-0002', { days: DIAS, saveDays: [2],
        lots: { 'VWCE.DE': { plan: '', buys: [], qty: 25.31, cost: 4200 }, 'c:BTC': { plan: '2025-01-02', buys: [{ d: '2025-03-01', e: 100 }], qty: '0.0412', cost: 3800.5 }, 'XYZ.DE': { qty: 3, cost: 300 }, 'c:ETH': { qty: 1, cost: 0 }, 'c:SOL': { qty: 'abc', cost: 10 } }, my: ['VWCE.DE'] }) } });
    d('sem dono: vários diários (páginas do KV), um sem days, um texto, 50 conselhos (os últimos 45), o de hoje fora da avaliação', {
        agora: '2026-11-07T15:14:00Z', semente: 8, pagina: 2,
        kv: { ...diario('aaaa-0001', { days: DIAS, my: ['NVDA', 'c:ADA'] }), ...diario('aaaa-0002', { my: ['TSLA'] }), ...diario('aaaa-0003', { days: { '2026-11-07': [{ s: 'SAP.DE', p: 120, a: 'wait' }] }, lots: { 'c:SOL': { plan: '2026-01-09', buys: [] } }, saveDays: [9, 23] }),
            ...Object.assign({}, ...Array.from({ length: 50 }, (_, i) => conselho(`2026-${String(9 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`))), ...conselho('2026-11-07') },
        kvTexto: { 'j:aaaa-0004': 'isto não é JSON' } });
    d('falhas: cotações de hoje (HTTP 500), câmbios, agenda (tempo esgotado), notícias, listas e lições do KV', {
        semente: 9,
        kv: { ...dono('dono-teste-0001'), ...diario('dono-teste-0001', { days: DIAS, my: ['ZZZ.L', 'NESN.SW'] }), ...conselho('2026-11-05') },
        falhas: [{ url: 'range=1d', estado: 500, corpo: { error: 'Yahoo em baixo' } }, { url: '/calendar', tipo: 'tempo' }, { url: 'q=stock%20market', estado: 503, corpo: 'Service Unavailable' },
            { url: 'q=bitcoin', tipo: 'corpo', estado: 500 }, { url: 'sym=NVDA', tipo: 'rede' }, { url: 'values/j%3Adono', tipo: 'corpo', estado: 200 }, { url: 'keys\\?prefix=advice', estado: 403, corpo: { success: false, errors: [{ code: 10000, message: 'Authentication error' }] } },
            { url: 'values/advice%3Alessons', tipo: 'rede' }] });
    d('falhas: o histórico de 1 ano falha num lote (tudo sem histórico) e o dono dá erro do KV', {
        semente: 10, falhas: [{ url: 'values/cfg%3Aowner', estado: 500, corpo: 'erro interno' }, { url: 'keys\\?prefix=j', tipo: 'corpo', estado: 200 }, { url: 'range=1y', estado: 502, corpo: { error: { code: 1 } }, vezes: 1 }],
        kv: { ...diario('x-0001', { days: DIAS }) } });
    d('símbolos estranhos no diário e câmbios (GBp, DKK, CHF, sem EUR/USD)', {
        semente: 11, agora: '2026-11-08T09:30:00Z',
        kv: { ...dono('d-0001'), ...diario('d-0001', { days: { '2026-11-08': [{ s: '1234', p: 10, a: 'buy' }, { s: 'BRK.B', p: 400, a: 'hold' }, { s: '^IXIC', p: 1, a: 'x' }, { s: 'c:ADA', p: 0.3, a: 'buy' }, { s: 'A', p: 100, a: 'buy' }, { s: 'ZZZ.L', p: 2, a: 'buy' }, { s: 'aapl', p: 1, a: 'buy' }, { s: 'bad sym', p: 1, a: 'buy' }, { s: 'X'.repeat(21), p: 1, a: 'buy' }, null, { s: 'SHRT.DE', p: 5, a: 'buy' }, { s: 'NANS.DE', p: 5, a: 'buy' }] }, my: ['NESN.SW', 7, 'c:TOOLONGSYMBOL1', 'GBX.L', 'c:ADA'] }) },
        simbolos: { 'EURUSD=X': { semPreco: true }, 'SHRT.DE': { curto: 30 }, 'NANS.DE': { serie: Array.from({ length: 80 }, (_, i) => [1790000000 + i * 86400, i % 2 ? 'x' : null]) }, 'GBX.L': { moeda: 'GBX' }, 'ZZZ.L': { nomeLongo: 'Libras & Companhia — nome comprido que passa dos quarenta caracteres' }, 'EURGBP=X': { semPreco: true } } });
    d('cripto: planos e compras em todas, dias de plano, e um valor que não é número (NaN)', {
        semente: 12, kv: { ...dono('c-0001'), ...diario('c-0001', { days: {}, lots: { 'c:BTC': { plan: '2024-11-02', buys: [{ d: '2025-11-01', e: 'abc' }] }, 'c:ETH': { plan: '2026-06-16', buys: [] }, 'c:SOL': { buys: [{ d: '2026-11-06', e: 1 }, { d: '2025-01-01', e: 2.345 }] }, 'c:XRP': { plan: '2026-11-07', buys: [] } }, saveDays: [23, 9] }) } });
    d('horário de verão em Lisboa e a passagem da meia-noite', { agora: '2026-10-24T23:30:00Z', semente: 13, kv: { ...dono('h-0001'), ...diario('h-0001', { days: DIAS }) } });
    d('fim de semana de inverno, sem nada no KV e sem notícias', { agora: '2026-01-10T08:00:00Z', semente: 14, semNoticias: true });
    // as outras fontes da decisão (conector 1.8.0): o consenso e o medo da cripto, certos, estranhos e em falta
    d('fontes: consenso com entradas estranhas (null, texto, sem símbolo, com erro, chaves fora de ordem) e um ativo sem nada', { semente: 31,
        simbolos: { AAPL: { cons: null }, MSFT: { cons: 'texto' }, NVDA: { cons: { key: 'buy', n: 5 } }, AMZN: { consErro: true }, GOOGL: { cons: { symbol: 'GOOGL', 2: 'dois', key: 'buy', mean: '2', n: 12, target: 'x', price: -3, rev: [1, 2], sur: { beats: 'a', n: 4 }, f: { pe: '9', cr: null, mg: 0.2, de: 12.5 }, 1: 'um' } },
            META: { cons: { symbol: 'META', key: 7, n: 30, f: [] } }, TSLA: { cons: { symbol: 'TSLA', none: true, key: 'sell', f: { pe: 181.1, cr: -0.002, mg: 0.031, roe: 0.07, de: 0.4 }, fund: { pe: 20, ter: 0.002 } } },
            'VWCE.DE': { cons: { symbol: 'VWCE.DE', none: true, fund: { pe: 21.456, pb: 3, ter: 0.0022, top: 'x' } } }, 'EUNL.DE': { cons: { symbol: 'EUNL.DE', none: true, fund: 'nada' } } } });
    d('fontes: o corpo do consenso não é o esperado e o medo da cripto vem torto', { semente: 32, consCorpo: { items: 'não é uma lista' }, cg: { fng: { v: '20', label: 7, prev: 'x' }, btcDom: 'muito' } });
    d('fontes: o consenso é uma lista e o medo da cripto um número; depois null e um Fear & Greed sem rótulo', { semente: 33, consCorpo: [1, 2], cg: 5 });
    d('fontes: null nos dois', { semente: 34, consCorpo: null, cg: null });
    d('fontes: Fear & Greed nos extremos e sem rótulo, domínio do Bitcoin', { semente: 35, cg: { fng: { v: 4, prev: 96, label: '' }, btcDom: 61.25 } });
    d('fontes: o conector antigo (404 nas duas rotas novas) e os juros em falta', { semente: 36, simbolos: { '^TNX': { erro: 'Not Found' }, 'DX-Y.NYB': { semPreco: true } },
        falhas: [{ url: '/consensus', estado: 404, corpo: { error: 'não encontrado' } }, { url: '/cryptoglobal', tipo: 'tempo' }] });
    d('fontes: mais de 40 ações e fundos (dois pedidos de consenso); o primeiro falha e o segundo responde', { semente: 37,
        kv: { ...dono('f-0001'), ...diario('f-0001', { days: {}, my: MUITAS }) }, simbolos: { ZZP: { cons: { symbol: 'ZZP', ...RICO } }, 'ZZC.DE': { cons: { symbol: 'ZZC.DE', ...RICO } } },
        falhas: [{ url: '/consensus', estado: 500, corpo: { error: 'Yahoo recusou' }, vezes: 1 }] });
    d('fontes: dois pedidos de consenso; o primeiro responde e o segundo falha', { semente: 37,
        kv: { ...dono('f-0001'), ...diario('f-0001', { days: {}, my: MUITAS }) }, simbolos: { ZZP: { cons: { symbol: 'ZZP', ...RICO } }, 'ZZC.DE': { cons: { symbol: 'ZZC.DE', ...RICO } } },
        falhas: [{ url: 'consensus\\?symbols=EUNL', tipo: 'rede' }] });
    d('títulos com emoji no corte e um nome cortado a meio de um par (URIError nas notícias)', {
        semente: 15, titulosEstranhos: true,
        kv: { ...dono('e-0001'), ...diario('e-0001', { days: { '2026-11-06': [{ s: 'EMOJ.DE', p: 1, a: 'buy' }] }, my: ['EMOJ.DE'] }) },
        simbolos: { 'EMOJ.DE': { nomeLongo: 'A'.repeat(38) + '😀😀 resto', dia: 0.2 } } });
    d('erro que o JS não apanha: notícias com JSON inválido (r é null)', { semente: 16, falhas: [{ url: 'q=bolsa', estado: 200, corpo: '{"items": [' }] });
    d('erro que o JS não apanha: data de compra inválida (RangeError no cryptoTax)', { semente: 17, kv: { ...dono('r-0001'), ...diario('r-0001', { days: {}, lots: { 'c:BTC': { buys: [{ d: '2025-13-05', e: 10 }] } } }) } });
    d('a mesma corrida com um corpo do KV cortado e o diário do dono em falta (404)', { semente: 18, kv: { ...dono('ninguem-0001'), ...conselho('2026-11-05') }, falhas: [{ url: 'values/advice%3A2026-11-05', tipo: 'corpo', estado: 200 }] });

    const u = (nome, c) => C.push({ nome: 'universo: ' + nome, script: 'universo', args: ['{pasta}'], agora: '2026-11-07T07:20:00Z', semente: 3, ...c });
    u('1340 ativos, alguns sem dados, um lote que falha duas vezes e outro que falha sempre', {
        simbolos: { MMM: { erro: 'Not Found' }, AOS: { curto: 30 }, ABT: { semPreco: true }, 'BTC-EUR': { nulos: true } },
        falhas: [{ url: 'symbols=[^&]*ACN', estado: 500, corpo: { error: 'Yahoo recusou' }, vezes: 2 }, { url: 'symbols=[^&]*AAPL', tipo: 'rede' }] });
    u('a maior parte falha: não grava no KV', { semente: 4, falhas: [{ url: 'symbols=(?!VWCE)', estado: 500, corpo: { error: 'em baixo' } }] });
    u('JSON inválido e corpo cortado: TypeError apanhado e tentado de novo', { semente: 5, falhas: [{ url: 'symbols=[^&]*MMM', estado: 200, corpo: 'null', vezes: 3 }, { url: 'symbols=[^&]*BTC-EUR', tipo: 'corpo', estado: 200, vezes: 1 }] });
    u('erro que o JS não apanha: o KV recusa o uni:latest', { semente: 6, falhas: [{ url: 'values/uni%3Alatest', metodo: 'PUT', estado: 500, corpo: { success: false, errors: [{ code: 10001, message: 'falhou' }] } }] });

    const o = (nome, c) => C.push({ nome: 'outros: ' + nome, script: 'outros', args: ['dados', '{pasta}'], agora: '2026-11-07T14:20:00Z', semente: 11, ...c });
    const app = (id, s, c, my) => diario(id, { days: {}, my }, { s, c });
    const APPS = { ...dono('dono-0001'), ...app('dono-0001', '2026-11-07', 1, ['VWCE.DE']), ...app('app-aaaa-0001', '2026-11-07', 1, ['AAPL', 'c:BTC', '1234', 'VWCE.DE', 'AAPL', 'bad sym', 'MSFT']),
        ...app('app-aaaa-0002', '2026-11-06', 1, ['NVDA', 'c:SOL', 'BRK-B', 'ZZZZ.DE']), ...app('app-aaaa-0003', '2026-11-07', 1, []), ...app('app-aaaa-0004', '2026-11-01', 1, ['TSLA']),
        ...app('app-aaaa-0005', '2026-11-07', 0, ['META']), ...app('app-aaaa-0006', '2026-11-05', 1, ['7203.T', 'c:XRP', 'GLD', 'ETF1']), ...app('app-aaaa-0007', '2026-11-07', 1, ['AMD', '0700.HK']) };
    o('desligada pelo dono', { kv: { 'cfg:others': { valor: { claude: false } } } });
    o('várias apps (páginas, a do dono fora, símbolos estranhos, notícias dos movimentos fortes)', { pagina: 3, kv: APPS, simbolos: { 'ZZZZ.DE': { erro: 'Not Found' }, GLD: { nomeLongo: 'SPDR Gold ETF Trust' }, ETF1: { nome: 'Some etc fund' }, AMD: { dia: 0.2 }, 1234: { dia: 0.3 } } });
    o('nenhuma app a analisar: grava o cfg:lastRun', { kv: { ...dono('dono-0001'), ...app('z-0001', '2026-10-01', 1, ['AAPL']) } });
    o('mais de 20 apps, empates na data, falhas de cotações, notícias e diários', {
        semente: 12, kv: { ...Object.assign({}, ...Array.from({ length: 25 }, (_, i) => app(`m-${String(i).padStart(4, '0')}`, i % 3 ? '2026-11-07' : '2026-11-05', 1, ['AAPL', `S${i}.DE`, 'c:ETH']))) },
        simbolos: { 'S3.DE': { dia: 0.3 }, 'S4.DE': { dia: 0.3 } },
        falhas: [{ url: 'range=1d', estado: 500, vezes: 1 }, { url: 'q=S3', tipo: 'rede' }, { url: 'values/j%3Am-0002', estado: 500 }] });
    o('erro que o JS não apanha: o KV falha no cfg:others', { falhas: [{ url: 'values/cfg%3Aothers', tipo: 'rede' }] });
    // publicar das outras apps: o outros.json e a análise do Claude
    const OJ = { date: '2026-11-07', at: '2026-11-07T14:20:00.000Z', queued: 3, max: 20,
        users: [{ ref: 'A1', id: 'app-aaaa-0001', assets: ['AAPL', 'c:BTC', '1234'] }, { ref: 'A2', id: 'app-aaaa-0002', assets: ['NVDA'] }],
        rows: { 1234: { name: 'Mil', price: 33.6, kind: 'stock' }, AAPL: { name: 'Apple', price: 233.41, kind: 'stock' }, 'c:BTC': { name: 'BTC', price: 88000, kind: 'crypto' }, NVDA: { name: 'Nvidia', price: 190, kind: 'stock' } }, news: {} };
    const OA = { A1: { headline: 'Leitura', tldr: ['Mercado: x', 'Os teus ativos: y', 'Atenção: z'], actions: [{ s: 'AAPL', key: 'hold', why: 'ok' }, { s: 'c:BTC', key: 'buy', short: 60, mid: 70, long: 80, entry: 85000, why: 'ok' }, { s: '1234', key: 'avoid', why: 'fraco' }], movers: [{ s: 'AAPL', why: 'resultados' }] },
        A2: { headline: 'B', tldr: ['t'], actions: [{ s: 'NVDA', key: 'scale', why: 'desconto', entry: 180, target: 215, stop: 164 }], movers: [] } };
    const op = (nome, a, c = {}) => C.push({ nome: 'outros publicar: ' + nome, script: 'outros', args: ['publicar', '{pasta}/outros-analise.json'], agora: '2026-11-07T14:40:00Z', ficheiros: { 'outros.json': OJ, 'outros-analise.json': a }, ...c });
    op('válida: grava ua:<id> e cfg:lastRun', OA);
    op('inválida: todas as mensagens', { A1: { headline: '', tldr: [], actions: [{ s: 'MSFT', key: 'buy', why: 'x' }, null, { s: 'AAPL', key: 'comprar', short: 120, mid: '70', long: true, entry: 2330, why: 'y'.repeat(281) }, { s: 'c:BTC', key: 'sell', short: 60, mid: 70, long: 80, why: '😀'.repeat(141) }], movers: [{ s: 'NVDA', why: '' }] } });
    op('erro que o JS não apanha: um mover null', { A1: { headline: 'h', tldr: ['t'], actions: [], movers: [null] }, A2: OA.A2 });
    C.push({ nome: 'outros publicar: sem ficheiro (uso)', script: 'outros', args: ['publicar'], agora: '2026-11-07T14:40:00Z' });
    C.push({ nome: 'outros: sem comando (uso)', script: 'outros', args: [], agora: '2026-11-07T14:40:00Z' });

    // publicar: o dados.json e a análise do Claude (os casos do conselheiro.test.mjs, e tipos que o JSON permite)
    const DADOS = { date: '2026-11-07', rows: [
        { s: 'VWCE.DE', kind: 'fund', price: 165.84, priceEur: 165.84, rule: 'wait', ruleAction: 'Esperar que estabilize' },
        { s: 'NVDA', kind: 'stock', price: 196, priceEur: 170.14, rule: 'avoid', ruleAction: 'Evitar' },
        { s: 'c:BTC', kind: 'crypto', price: 68000, priceEur: 68000, rule: 'buy', ruleAction: 'Comprar' },
        { s: 'BZ=F', kind: 'ref', price: 98.3, priceEur: null, rule: null },
        { s: '1234', kind: 'stock', price: null, priceEur: null, rule: 'hold' }] };
    const BASE = { headline: 'Leitura do dia', market: 'Mercado.', plan: [{ s: 'VWCE.DE', amount: '810 €' }, { s: 'c:BTC', amount: '90 €' }], tldr: ['Mercado: x', 'Plano: y', 'Atenção: z'], review: 'ok', lessons: ['l1', 'l2'], risks: ['r'], movers: [{ s: 'NVDA', why: 'subiu' }] };
    const V = () => ({
        'VWCE.DE': { key: 'hold', action: 'Manter e reforçar', short: 40, mid: 62, long: 85, why: 'Núcleo; tendência longa a favor (L82).' },
        NVDA: { key: 'scale', short: 48, mid: 70, long: 75, entry: 190, target: 230, stop: 172, why: 'Desconto de 22% (RSI 31); resultados a 17/11.', plan: 'Metade agora.', algWhy: 'A regra vê a queda; os resultados pesam mais.' },
        'c:BTC': { key: 'wait', short: 40, mid: 45, long: 62, why: 'Abaixo da MM20; suporte 66 700 €.', algWhy: 'Esperar pelo suporte.' },
        'BZ=F': { key: 'up', short: 60, mid: 55, long: 45, why: 'Acima da MM200.' },
        1234: { key: 'hold', short: 50, mid: 50, long: 50, why: 'neutro' } });
    const analise = (mod = (x) => x, over = {}) => { const v = V(); mod(v); return { ...BASE, actions: Object.entries(v).map(([s, x]) => ({ s, ...x })), ...over }; };
    const UNI = { rows: Array.from({ length: 10 }, (_, i) => ({ s: `X${i}.DE` })) };
    const p = (nome, a, c = {}) => C.push({ nome: 'publicar: ' + nome, script: 'publicar', args: ['{pasta}/analise.json', '{pasta}/dados.json'], agora: '2026-11-07T07:40:00Z', ficheiros: { 'analise.json': a, 'dados.json': DADOS, ...(c.uni ? { 'universo.json': c.uni } : {}) }, ...c });
    p('válida (formato 2): grava advice:<data>, advice:latest e advice:lessons', analise());
    p('classificação do Claude e ativos da lista toda da TR', analise((v) => Object.assign(v, Object.fromEntries(UNI.rows.slice(0, 8).map((u) => [u.s, { key: 'buy', short: 60, mid: 65, long: 70, why: 'tendência forte' }]))), { rank: { mid: ['NVDA', 'X0.DE', 'VWCE.DE'], long: [] } }), { uni: UNI });
    p('o universo.json não é JSON válido', analise(), { uni: '{"rows": [' });
    p('faltam ativos, repetidos, desconhecidos e mais de 8 de fora', { ...analise((v) => { delete v['c:BTC']; delete v['BZ=F']; }), actions: [...analise((v) => { delete v['c:BTC']; delete v['BZ=F']; }).actions, { s: 'VWCE.DE', key: 'hold', why: 'x' }, { s: 'ZZZ', key: 'buy', short: 60, mid: 60, long: 60, why: 'x' }, ...UNI.rows.map((u) => ({ s: u.s, key: 'buy', why: 'x' }))] }, { uni: UNI });
    p('formato antigo (sem convicção)', { ...BASE, actions: ['VWCE.DE', 'NVDA', 'c:BTC', 'BZ=F', '1234'].map((s) => ({ s, key: s === 'BZ=F' ? 'up' : 'hold', action: 'Manter', why: 'porquê' })) });
    p('veredictos, convicção e níveis', analise((v) => {
        v['BZ=F'].key = 'buy'; v.NVDA = { ...v.NVDA, mid: 120, short: 'alta', stop: 195, target: 185 }; v['c:BTC'] = { ...v['c:BTC'], key: 'sell', short: 70, mid: 80, long: 90 };
        v['VWCE.DE'] = { ...v['VWCE.DE'], key: 'buy', short: 10, mid: 20, long: 30, entry: 1900, target: 'x', stop: true }; v[1234] = { ...v[1234], key: ['hold'], short: [55], mid: ' 61 ', long: '', why: '' };
    }));
    p('tipos que o JSON permite: números em texto, listas, booleanos, null, objetos', analise((v) => {
        v.NVDA = { ...v.NVDA, short: '48', mid: [70], long: {}, entry: '190', target: 230.123456789, stop: null, action: 7, plan: ['x'] };
        v['c:BTC'] = { ...v['c:BTC'], short: false, mid: 0, long: 100, entry: 0, why: 12 }; v['BZ=F'] = { ...v['BZ=F'], key: 'flat', action: '', short: 1e2, mid: -0, long: 0.5 };
    }, { headline: 'x'.repeat(161), market: 7, planNote: ['n'], plan: [{ s: 'VWCE.DE', amount: 810 }, { s: '', amount: '' }, 5], risks: [null, 'r'.repeat(241), '😀'], tldr: ['a', '', 'c', 'd'], movers: [{ s: 3, why: 'w' }], lessons: 'não é lista', review: { a: 1 } }));
    p('discordar do sinal automático exige o porquê (algWhy)', analise((v) => { delete v.NVDA.algWhy; v['c:BTC'].algWhy = '    \n'; v[1234] = { ...v[1234], key: 'sell', short: 40, mid: 40, long: 40, algWhy: 'x'.repeat(201) }; }));
    p('classificação com erros', analise((v) => v, { rank: { mid: ['VWCE.DE', 'NVDA', 'NVDA', 'BZ=F', 'ZZZ', 7], long: 'x', short: [] } }));
    p('plano, resumo e título em falta', analise((v) => v, { plan: [], tldr: [], headline: '', market: '' }));
    p('a análise não é um objeto', null);
    p('a análise é uma lista', []);
    p('actions não é uma lista e rank é uma lista', { ...BASE, actions: { s: 'NVDA' }, rank: ['NVDA'] });
    p('substitutos sozinhos e emoji nos textos', analise((v) => { v.NVDA.why = '\ud83d' + 'a'.repeat(279); v['VWCE.DE'].why = '😀'.repeat(140); v['VWCE.DE'].action = '\udc00'; }, { headline: 'Título 😀 com \ud800' }));
    p('erro que o JS não apanha: um item do plano é null', analise((v) => v, { plan: [null] }));
    p('erro que o JS não apanha: o KV recusa a gravação', analise(), { falhas: [{ url: 'values/advice%3A2026', metodo: 'PUT', estado: 500, corpo: { success: false, errors: [{ code: 1, message: 'não' }] } }] });
    p('erro que o JS não apanha: o ficheiro da análise não existe', analise(), { args: ['{pasta}/nao-existe.json', '{pasta}/dados.json'] });
    p('erro que o JS não apanha: JSON inválido na análise', '{"headline": "x",}');
    C.push({ nome: 'publicar: sem argumentos (uso)', script: 'publicar', args: [], agora: '2026-11-07T07:40:00Z' });

    const b = (nome, c) => C.push({ nome: 'backtest: ' + nome, script: 'backtest', args: [], agora: '2026-11-06T10:00:00Z', semente: 21, ...c });
    b('5 anos e 90 € (por omissão)', {});
    b('3 anos, 45 €, ativos com poucos dias e um sem dados', { args: ['3', '45'], simbolos: { NVDA: { curto: 200 }, 'SAP.DE': { erro: 'Not Found' } } });
    b('sem o VWCE (sem referência) e com nulos nas séries', { args: ['2', '30'], simbolos: { 'VWCE.DE': { erro: 'Not Found' }, AAPL: { nulos: true } } });
    b('argumentos que não são números', { args: ['abc', ''] });
    b('erro que o JS não apanha: o conector falha', { falhas: [{ url: '/quotes', estado: 500, corpo: { error: 'Yahoo em baixo' } }] });
    return C;
}

// corre os dois lados de um cenário (JS e depois Onda, na mesma pasta), com vários cenários ao mesmo tempo
function lado(lado, cena, pasta) {
    return new Promise((ok) => {
        const filho = spawn(process.execPath, [path.join(here, 'conselheiro-paridade.mjs'), '--lado', lado, '--pasta', pasta], { cwd: raiz });
        const out = [];
        filho.stdout.on('data', (b) => out.push(b));
        filho.stdin.end(JSON.stringify(cena));
        filho.on('close', () => ok(JSON.parse(Buffer.concat(out).toString('utf8'))));
    });
}
async function emParalelo(itens, n, f) {
    const r = new Array(itens.length);
    let i = 0;
    await Promise.all(Array.from({ length: n }, async () => { while (i < itens.length) { const j = i++; r[j] = await f(itens[j]); } }));
    return r;
}

test('conselheiro em Onda: o mesmo que o JS em todos os cenários (ficheiros, pedidos e KV, stdout, stderr, código)', { timeout: 600000 }, async () => {
    const C = cenarios();
    const base = mkdtempSync(path.join(tmpdir(), 'cons-par-'));
    const res = await emParalelo(C, Math.max(2, Math.min(8, cpus().length)), async (cena) => {
        const pasta = path.join(base, String(C.indexOf(cena)));
        const a = await lado('js', cena, pasta), b = await lado('onda', cena, pasta);
        return { cena, d: comparar(a, b), a, b };
    });
    rmSync(base, { recursive: true, force: true });
    // o cenário das quantidades escreve mesmo a secção, com os pesos (não só "sem quantidades")
    const qt = res.find((r) => /quantidades na carteira/.test(r.cena.nome));
    if (qt) {
        const md = String((qt.b.ficheiros || {})['dados.md'] || qt.b.stdout || '');
        assert.match(md, /## O que tens: quantidades e pesos \(Carteira da app\)\n- VWCE\.DE: 25\.31 unidades · investido 4200 € · vale \d+ € \([\d.]+% do total\)/, md.slice(md.indexOf('## O que tens: quant'), md.indexOf('## O que tens: quant') + 500));
        assert.match(md, /- XYZ\.DE: 3 unidades · investido 300 € · vale 300 €/, 'sem preço: vale o investido');
        assert.match(md, /- Total: \d+ € \(investido 8301 €\)/);
        const sec = md.slice(md.indexOf('## O que tens: quant'), md.indexOf('## Lições guardadas'));
        assert.doesNotMatch(sec, /c:ETH|c:SOL/, 'sem investido ou sem quantidade: fica de fora');
    }
    // as fontes: o texto de um consenso com tudo, a média sem o voto do Claude, os dois pedidos e o aviso de quando um falha
    const RICO_TXT = /\| FONTES analistas sell 4\.4 \(14\) alvo -20\.0% rev 1↑9↓ surp 1\/4 · P\/E 44\.4 vendas -8\.1% margem -2\.0% ROE -11\.0% dívida 213% · média \d+ sair \[analistas 7, fundamentos 28, técnica \d+, sentimento \d+\]$/;
    const linha = (md, s) => md.split('\n').find((l) => l.startsWith(`- ${s} `)) || '';
    for (const [re, com, sem, aviso] of [[/o primeiro falha e o segundo responde/, 'ZZC.DE', 'ZZP', 'Yahoo recusou'], [/o primeiro responde e o segundo falha/, 'ZZP', 'ZZC.DE', 'fetch failed']]) {
        const r = res.find((x) => re.test(x.cena.nome)), md = String(r.b.ficheiros['dados.md']);
        assert.equal(r.b.registo.pedidos.filter((x) => x.url.includes('/consensus?')).length, 2, 'dois pedidos de consenso');
        assert.match(linha(md, com), RICO_TXT, linha(md, com));
        assert.match(linha(md, sem), /\| FONTES média \d+ (entrar|ficar|sair) \[técnica \d+, sentimento \d+\]$/, linha(md, sem));
        assert.ok(md.includes(`\n- analistas e fundamentos: ${aviso}`), 'o pedido que falha fica nos avisos');
        const row = JSON.parse(r.b.ficheiros['dados.json']).rows.find((x) => x.s === com);
        assert.deepEqual([row.cons.symbol, row.cons.rev.chg, row.cons.votes3.length, row.fontes.fam, row.fontes.f[0]], [undefined, -0.12, 5, -1, ['analistas', 7]]);
    }
    const fg = res.find((r) => /Fear & Greed nos extremos/.test(r.cena.nome)), mdF = String(fg.b.ficheiros['dados.md']);
    assert.match(mdF, /\n(Juros EUA 10 anos [\d.]+% \([+-]?[\d.]+\) · )?(Dólar \(índice\) [\d.]+ \([+-]?[\d.]+%\) · )?Fear & Greed da cripto 4, antes 96 · domínio do Bitcoin 61\.3%\n/);
    assert.match(linha(mdF, 'c:BTC'), /\| FONTES F&G 4 · média \d+ (entrar|ficar|sair) \[técnica \d+, sentimento 78\]$/, linha(mdF, 'c:BTC'));
    const velho = res.find((r) => /o conector antigo/.test(r.cena.nome)), mdV = String(velho.b.ficheiros['dados.md']);
    assert.doesNotMatch(mdV, /analistas [a-z_]+ \d|F&G \d|Fear & Greed|Juros EUA/, 'sem as rotas novas não há fontes novas');
    assert.match(mdV, /\n- analistas e fundamentos: [^\n]+\n- sentimento da cripto: /, 'e fica nos avisos');
    const mal = res.filter((r) => r.d.length);
    for (const r of mal) console.log(`✗ ${r.cena.nome}\n  ${r.d.join('\n  ')}`);
    assert.equal(mal.length, 0, `${mal.length} de ${C.length} cenários diferem`);
    const pedidos = res.reduce((s, r) => s + ((r.a.registo && r.a.registo.pedidos.length) || 0), 0);
    const puts = res.reduce((s, r) => s + ((r.a.registo && r.a.registo.pedidos.filter((x) => x.metodo === 'PUT').length) || 0), 0);
    console.log(`✓ ${C.length} cenários iguais: ${pedidos} pedidos (${puts} gravações no KV), ${res.reduce((s, r) => s + Object.keys(r.a.ficheiros).length, 0)} ficheiros`);
});

// as funções do modelo do JS na Onda (js.onda) contra o próprio Node, em valores escolhidos e ao acaso
test('conselheiro em Onda: JSON, números, datas de Lisboa e textos UTF-16 iguais aos do Node', async () => {
    const { correr } = await import('../conselheiro/correr.mjs');
    let buf = [];
    const h = correr('', [], { args: [], saida: { 1: (u) => buf.push(Buffer.from(u)) } });
    const call = (f, ...a) => { buf = []; h.chamar(f, ...a); return Buffer.concat(buf).toString('utf8'); };
    const T = (x) => h.escrever(Buffer.isBuffer(x) ? x : Buffer.from(x, 'utf8'));
    const bits = (x) => { const v = new DataView(new ArrayBuffer(8)); v.setFloat64(0, x); return `${v.getInt32(0)} ${v.getUint32(4)}`; };
    let seed = 99;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
    const ri = (n) => Math.floor(rnd() * n);
    const M = () => Number(new BigInt64Array(h.exports.memory.buffer, 0, 16)[15]);
    const solta = (m) => { const t = M(); new Uint8Array(h.exports.memory.buffer, (m + 16) * 8, (t - m) * 8).fill(0); new BigInt64Array(h.exports.memory.buffer, 0, 16)[15] = BigInt(m); };
    const m0 = M();
    const nums = [0, -0, 5e-324, 1.7976931348623157e308, 2 ** 53, 2 ** 60, 1e21, 1e-7, 0.1, 0.05, 0.15, 0.25, 1.005, 2.675, -0.04, 999.95, 123456789012345680000, 0.000001, 1e-6 * 3];
    for (let i = 0; i < 3000; i++) nums.push(ri(3) ? (rnd() - 0.5) * 10 ** (ri(40) - 20) : Number((rnd() * 1000).toPrecision(1 + ri(17))));
    for (const x of nums) {
        assert.equal(call('t_ps', x), String(x));
        assert.equal(call('t_fix', x, 1n), x.toFixed(1)); assert.equal(call('t_fix', x, 2n), x.toFixed(2));
        assert.equal(call('t_r6', x), bits(Number(x.toPrecision(6))), 'toPrecision(6) ' + x);
        const j = JSON.stringify(x); assert.equal(call('t_json', T(j), 0n), JSON.stringify(JSON.parse(j)));
        const e = x.toExponential(16 + ri(4)); assert.equal(call('t_num', T(e)), bits(Number(e)), e);
        solta(m0);
    }
    for (const s of ['', ' 12 ', '0x1F', '0b101', '-0x1', '.5', '5.', '.', '1e', 'Infinity', '-Infinity', 'infinity', '12abc', '\u00a012\u2028', '1'.repeat(400), '0.' + '0'.repeat(400) + '1'])
        assert.equal(call('t_tonum', T(JSON.stringify(s))), bits(Number(s)), 'Number(' + JSON.stringify(s) + ')');
    const v = { a: [1, -0, 1.5e300, 'x\u0001"\\é😀\ud800'], 1: null, '01': true, 4294967294: { z: [] }, 4294967295: {}, b: '' };
    const j = JSON.stringify(v);
    assert.equal(call('t_json', T(j), 0n), JSON.stringify(JSON.parse(j)));
    assert.equal(call('t_json', T(j), 1n), JSON.stringify(JSON.parse(j), null, 1));
    for (const s of ['[1,]', '{"a":1,}', '01', '"\\x"', '"a\u0001"', '1 2', '\ufeff1', 'NaN']) assert.equal(call('t_json', T(s), 0n), 'ERRO', s);
    const lis = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }), quando = new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', weekday: 'long', hour: '2-digit', minute: '2-digit' });
    for (let y = 1997; y < 2100; y++) for (const mes of [2, 9]) {
        const ult = new Date(Date.UTC(y, mes + 1, 0)), dia = ult.getUTCDate() - ult.getUTCDay();
        for (const k of [-61, -1, 0, 1, 59]) { const t = Date.UTC(y, mes, dia, 1, 0) + k * 60000; assert.equal(call('t_lis', BigInt(t)), lis.format(t) + ' ' + quando.format(t)); }
    }
    // as regras de Lisboa na Onda são as da UE, as de Portugal desde 31 de março de 1996 (antes houve outras)
    for (let i = 0; i < 2000; i++) { const t = Math.floor(rnd() * 4e12), tl = 828230400000 + (t % 3e12); assert.equal(call('t_lis', BigInt(tl)), lis.format(tl) + ' ' + quando.format(tl)); assert.equal(call('t_iso', t - 1e12), new Date(t - 1e12).toISOString()); }
    const ch = ['a', '"', '\\', '\n', 'é', '€', '😀', '\ud83d', '\ude00', '\u2028', '\u00a0'];
    for (let i = 0; i < 2000; i++) {
        let s = ''; for (let k = ri(10); k > 0; k--) s += ch[ri(ch.length)];
        const a = ri(s.length + 2), b2 = a + ri(s.length + 2);
        assert.equal(call('t_s16', T(JSON.stringify(s)), BigInt(a), BigInt(b2)), JSON.stringify(s.slice(a, b2)));
        assert.equal(call('t_l16', T(JSON.stringify(s))), String(s.length));
        let u; try { u = encodeURIComponent(s); } catch { u = 'URIError'; }
        assert.equal(call('t_uri', T(JSON.stringify(s))), u);
        solta(m0);
    }
    for (let i = 0; i < 2000; i++) { const u = Buffer.from(Array.from({ length: ri(10) }, () => [ri(256), 0xef, 0xbb, 0xbf, 0xed, 0xa0, 0xf0, 0x9f, 0xc2][ri(9)])); assert.equal(Buffer.from(call('t_norm', T(u), 1n)).toString('hex'), Buffer.from(new TextDecoder().decode(u)).toString('hex')); solta(m0); }
});

test('conselheiro em Onda: as listas da app (STOCKS, FUNDS, CRYPTO, MARKET, MINE, rótulos) são as do comum.mjs', async () => {
    const R = await import('../conselheiro/js/comum.mjs');
    const src = readFileSync(path.join(raiz, 'mercados/conselheiro/onda/comum.onda'), 'utf8');
    const corpo = src.slice(src.indexOf(': cs_cfgjson'), src.indexOf(': cs_c i>i'));
    // o JSON da configuração está em moldes, um por linha (as chavetas escapadas: \{ \})
    const cfg = JSON.parse([...corpo.matchAll(/^\s*`(.*)`[\s}]*$/gm)].map((m) => m[1].replace(/\\([{}])/g, '$1')).join(''));
    for (const k of ['STOCKS', 'FUNDS', 'CRYPTO', 'MARKET', 'MINE', 'ACTION_KEYS', 'REF_KEYS', 'ACTION_LABEL', 'FAM', 'HZ', 'LEVELS']) assert.deepEqual(cfg[k], R[k], k);
});

test('conselheiro em Onda: o conselheiro.wasm gravado corresponde às fontes', async () => {
    const { construir, DESTINO } = await import('../conselheiro/onda/build.mjs');
    assert.ok(Buffer.compare(construir().wasm, readFileSync(DESTINO)) === 0, 'correr node mercados/conselheiro/onda/build.mjs');
});
