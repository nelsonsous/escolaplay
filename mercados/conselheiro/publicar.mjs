// Conselheiro — valida a análise escrita pelo Claude e grava-a na base de dados (KV).
//   node mercados/conselheiro/publicar.mjs /tmp/conselheiro/analise.json [/tmp/conselheiro/dados.json]
// Grava advice:<data>, advice:latest e advice:lessons. A app lê-a em /advice.
import { readFileSync } from 'node:fs';
import { kvPut, todayLisbon, ACTION_KEYS } from './comum.mjs';

const [file, dadosFile = '/tmp/conselheiro/dados.json'] = process.argv.slice(2);
if (!file) { console.error('uso: publicar.mjs analise.json [dados.json]'); process.exit(2); }
const a = JSON.parse(readFileSync(file, 'utf8'));
const dados = JSON.parse(readFileSync(dadosFile, 'utf8'));
const known = new Set(dados.rows.map((r) => r.s));

const errs = [];
const str = (v, max, name, req) => { if (v == null || v === '') { if (req) errs.push(`falta ${name}`); return ''; } if (typeof v !== 'string') { errs.push(`${name} tem de ser texto`); return ''; } if (v.length > max) errs.push(`${name} com mais de ${max} caracteres`); return v; };
const out = {
    date: todayLisbon(),
    generatedAt: new Date().toISOString(),
    headline: str(a.headline, 160, 'headline', true),
    market: str(a.market, 1400, 'market', true),
    planNote: str(a.planNote, 160, 'planNote'),
    plan: (Array.isArray(a.plan) ? a.plan : []).slice(0, 6).map((x, i) => ({ s: str(x.s, 24, `plan[${i}].s`, true), name: str(x.name, 60, `plan[${i}].name`), amount: str(x.amount, 30, `plan[${i}].amount`, true), why: str(x.why, 220, `plan[${i}].why`) })),
    actions: (Array.isArray(a.actions) ? a.actions : []).slice(0, 12).map((x, i) => {
        if (!known.has(x.s)) errs.push(`actions[${i}].s desconhecido: ${x.s}`);
        if (!ACTION_KEYS.includes(x.key)) errs.push(`actions[${i}].key inválido: ${x.key}`);
        return { s: x.s, key: x.key, action: str(x.action, 40, `actions[${i}].action`, true), why: str(x.why, 300, `actions[${i}].why`, true), plan: str(x.plan, 300, `actions[${i}].plan`) };
    }),
    risks: (Array.isArray(a.risks) ? a.risks : []).slice(0, 6).map((r, i) => str(r, 240, `risks[${i}]`, true)),
    // resumo em 3 linhas curtas (o que aparece primeiro na app)
    tldr: (Array.isArray(a.tldr) ? a.tldr : []).slice(0, 3).map((r, i) => str(r, 120, `tldr[${i}]`, true)),
    // porque sobe ou desce muito: o motivo (notícia, setor, mercado) de cada movimento forte
    movers: (Array.isArray(a.movers) ? a.movers : []).slice(0, 10).map((x, i) => ({ s: str(x.s, 24, `movers[${i}].s`, true), why: str(x.why, 260, `movers[${i}].why`, true) })),
    review: str(a.review, 1400, 'review'),
    lessons: (Array.isArray(a.lessons) ? a.lessons : []).slice(0, 15).map((r, i) => str(r, 240, `lessons[${i}]`, true)),
};
if (!out.plan.length) errs.push('plan vazio: diz sempre o que fazer com o plano do mês');
if (!out.tldr.length) errs.push('tldr vazio: escreve o resumo em 3 linhas curtas (mercado · plano · atenção)');
// o que o investidor tem aparece sempre em actions (a app mostra o conselho em cada um)
const HOLD = ['VWCE.DE', 'c:BTC', 'c:ETH', 'c:SOL', 'c:XRP'];
for (const k of HOLD) if (!out.actions.some((x) => x.s === k)) errs.push(`actions sem ${k}: comenta sempre os 5 que o investidor tem`);
if (errs.length) { console.error('Análise inválida:\n- ' + errs.join('\n- ')); process.exit(1); }
// preços no momento do conselho (em euros), para a avaliação dos dias seguintes
out.prices = Object.fromEntries(dados.rows.map((r) => [r.s, r.priceEur ?? r.price]).filter(([, p]) => Number.isFinite(p)));

await kvPut(`advice:${out.date}`, out);
await kvPut('advice:latest', out);
await kvPut('advice:lessons', out.lessons);
console.log(`Publicado advice:${out.date} (${out.actions.length} ativos, ${out.plan.length} linhas de plano, ${out.lessons.length} lições).`);
