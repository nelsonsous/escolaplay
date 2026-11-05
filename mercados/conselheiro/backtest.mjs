// Conselheiro — teste no passado das regras de mercados/analise.js (para afinar com evidência).
//   NODE_USE_ENV_PROXY=1 node mercados/conselheiro/backtest.mjs [anos=5] [euros_por_compra=90]
// Preços ajustados (dividendos incluídos), comissão de 1 € por compra manual (ETF por plano = 0),
// resultado a 3 meses face ao VWCE. Divide o período em duas metades: uma regra só deve mudar se
// melhorar nas DUAS (uma afina-se, a outra confirma) — senão é afinar à medida do passado.
import { A, px, STOCKS, FUNDS, CRYPTO, yahooOf, kindOf, nameOf } from './comum.mjs';

const years = +(process.argv[2] || 5), ticket = +(process.argv[3] || 90);
const keys = [...Object.keys(FUNDS), ...Object.keys(STOCKS), ...Object.keys(CRYPTO)];
const day = (t) => new Date(t * 1000).toISOString().slice(0, 10);
const assets = [];
for (let i = 0; i < keys.length; i += 40) {
    const part = keys.slice(i, i + 40);
    const r = await px(`/quotes?symbols=${encodeURIComponent(part.map(yahooOf).join(','))}&range=${years}y&interval=1d&adj=1`, 90000);
    for (const q of r.quotes || []) {
        const k = part.find((x) => yahooOf(x) === q.symbol);
        if (k && !q.error && q.series && q.series.length > 300) assets.push({ key: k, kind: kindOf(k), closes: q.series.map((x) => x[1]), days: q.series.map((x) => day(x[0])) });
    }
}
const bench = assets.find((a) => a.key === 'VWCE.DE');
const bf = A.benchFn(bench);
const pc = (x) => (x == null ? '—' : (x > 0 ? '+' : '') + (x * 100).toFixed(1) + '%');
function run(label, cut) {
    const acc = {}, per = [];
    for (const a of assets) {
        const n = a.closes.length;
        const lo = cut === 2 ? Math.floor(n / 2) : 0, hi = cut === 1 ? Math.floor(n / 2) + 63 : n;
        const sub = { ...a, closes: a.closes.slice(0, hi), days: a.days.slice(0, hi) };
        per.push(A.backtestAsset(sub, bf, acc, { cost: a.kind === 'fund' ? 0 : 1 / ticket, warm: Math.max(200, lo) }));
    }
    const S = A.summarize(acc);
    console.log(`\n== ${label}`);
    for (const k of ['buy', 'scale', 'hold', 'wait', 'neutral', 'turn', 'avoid']) if (S[k]) console.log(`${k.padEnd(8)} n=${String(S[k].n63).padStart(4)}  3m ${pc(S[k].avg63).padStart(7)}  acerto ${pc(S[k].hit63).padStart(7)}  vs VWCE ${pc(S[k].ex63).padStart(7)}`);
    return { S, per };
}
console.log(`${assets.length} ativos, ${years} anos, ${ticket} € por compra (comissão ${(100 / ticket).toFixed(1)}%)`);
const all = run('Período todo');
run('1.ª metade (afinar aqui)', 1);
run('2.ª metade (confirmar aqui)', 2);
const buys = all.per.filter((x) => x.buyN >= 5).map((x) => [x.key, x.buyS / x.buyN]).sort((a, b) => a[1] - b[1]);
console.log('\nPiores compras:', buys.slice(0, 4).map(([k, v]) => `${nameOf(k)} ${pc(v)}`).join(', '));
console.log('Melhores compras:', buys.slice(-4).reverse().map(([k, v]) => `${nameOf(k)} ${pc(v)}`).join(', '));
