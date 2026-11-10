// REFERÊNCIA em JavaScript, só para os testes de paridade (mercados/tests/conselheiro-onda.test.mjs): o script que a
// tarefa agendada corre é o de Onda (mercados/conselheiro/onda/*.onda), lançado por mercados/conselheiro/publicar.mjs.
// Conselheiro — valida a análise escrita pelo Claude e grava-a na base de dados (KV).
//   node mercados/conselheiro/publicar.mjs /tmp/conselheiro/analise.json [/tmp/conselheiro/dados.json]
// Grava advice:<data>, advice:latest e advice:lessons. A app lê-a em /advice.
// Formato 2 (Mercados 4): um veredicto por cada ativo do dados.json (os que a app mostra), com convicção 0–100
// por prazo, níveis e o porquê, mais a classificação do Claude por prazo. A app continua a ler o formato antigo.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { kvPut, todayLisbon, isMain, normVerdict, textCheck, HZ, REF_KEYS, FAM, ACTION_LABEL } from './comum.mjs';

export const MAX_EXTRA = 8; // ativos de fora das listas da app (toda a Trade Republic, universo.json)
const RANK_MAX = 15, RANK_AUTO = 10;

// a: analise.json; dados: dados.json; uniRows: linhas do universo.json (opcional). Devolve { out, errs }.
export function buildAdvice(a, dados, uniRows = []) {
    const errs = [];
    const str = textCheck(errs);
    if (!a || typeof a !== 'object') return { out: null, errs: ['a análise tem de ser um objeto JSON'] };
    const rows = new Map((dados.rows || []).map((r) => [r.s, r]));
    const uni = new Map((uniRows || []).map((r) => [r.s, r]));
    const out = {
        v: 2,
        date: todayLisbon(),
        generatedAt: new Date().toISOString(),
        headline: str(a.headline, 160, 'headline', true),
        market: str(a.market, 1400, 'market', true),
        planNote: str(a.planNote, 160, 'planNote'),
        plan: (Array.isArray(a.plan) ? a.plan : []).slice(0, 6).map((x, i) => ({ s: str(x.s, 24, `plan[${i}].s`, true), name: str(x.name, 60, `plan[${i}].name`), amount: str(x.amount, 30, `plan[${i}].amount`, true), why: str(x.why, 220, `plan[${i}].why`) })),
        actions: [],
        rank: {},
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

    // um veredicto por ativo: todos os do dados.json (o que a app mostra) e até MAX_EXTRA da lista toda da TR
    const list = Array.isArray(a.actions) ? a.actions : [];
    if (!Array.isArray(a.actions)) errs.push('actions tem de ser a lista dos veredictos (um por ativo)');
    const seen = new Set();
    list.forEach((x, i) => {
        const s = x && x.s, r = rows.get(s);
        const p = `actions[${i}] ${s || '?'}`;
        if (!r && !uni.has(s)) { errs.push(`${p}: ativo desconhecido (não está no dados.json nem na lista da TR)`); return; }
        if (seen.has(s)) { errs.push(`${p}: repetido`); return; }
        seen.add(s);
        const o = normVerdict(x, errs, { p, ref: !!r && r.kind === 'ref', price: r ? r.price : null });
        // segunda opinião: o sinal automático (regra) do mesmo ativo; se o veredicto for de outra família
        // (entrar / ficar / sair), o Claude explica porquê discorda
        if (r && r.rule && FAM[r.rule] != null && FAM[o.key] != null) {
            o.alg = r.rule;
            const w = str(x.algWhy, 300, `${p}.algWhy`);
            if (FAM[o.key] !== FAM[r.rule] && !w.trim()) errs.push(`${p}: o teu veredicto (${o.action}) discorda do sinal automático (${r.ruleAction || ACTION_LABEL[r.rule]}): explica porquê em algWhy (até 300 caracteres)`);
            if (w.trim()) o.algWhy = w;
        }
        out.actions.push(o);
    });
    const extra = out.actions.filter((x) => !rows.has(x.s)).length;
    if (extra > MAX_EXTRA) errs.push(`no máximo ${MAX_EXTRA} ativos de fora das listas da app; vieram ${extra}`);
    const miss = [...rows.keys()].filter((s) => !seen.has(s));
    if (miss.length) errs.push(`faltam ${miss.length} ativos em actions (a app mostra o veredicto em todos): ${miss.join(', ')}`);

    // classificação do Claude por prazo: só o que se compra, da maior convicção para a menor (empates: decides tu)
    const inv = out.actions.filter((x) => !REF_KEYS.includes(x.key) && !(rows.get(x.s) && rows.get(x.s).kind === 'ref'));
    const R = a.rank && typeof a.rank === 'object' ? a.rank : {};
    for (const h of HZ) {
        const given = R[h];
        if (given == null || (Array.isArray(given) && !given.length)) {
            out.rank[h] = inv.filter((x) => Number.isFinite(x[h])).sort((x, y) => y[h] - x[h]).slice(0, RANK_AUTO).map((x) => x.s);
            continue;
        }
        if (!Array.isArray(given)) { errs.push(`rank.${h} tem de ser uma lista de símbolos`); continue; }
        const L = [];
        let prev = null;
        given.slice(0, RANK_MAX).forEach((s, j) => {
            const x = inv.find((y) => y.s === s);
            if (!x) { errs.push(`rank.${h}[${j}]: ${s} não está em actions (ou é referência)`); return; }
            if (L.includes(s)) { errs.push(`rank.${h}: ${s} repetido`); return; }
            if (prev && Number.isFinite(x[h]) && Number.isFinite(prev[h]) && x[h] > prev[h]) errs.push(`rank.${h}: ${s} (${x[h]}) atrás de ${prev.s} (${prev[h]}): ordena pela convicção ou ajusta-a`);
            L.push(s); prev = x;
        });
        out.rank[h] = L;
    }
    // preços no momento do conselho (em euros; referência na sua unidade), para a avaliação dos dias seguintes
    out.prices = Object.fromEntries((dados.rows || []).map((r) => [r.s, r.priceEur ?? r.price]).filter(([, p]) => Number.isFinite(p)));
    return { out, errs };
}

if (isMain(import.meta.url)) {
    const [file, dadosFile = '/tmp/conselheiro/dados.json'] = process.argv.slice(2);
    if (!file) { console.error('uso: publicar.mjs analise.json [dados.json]'); process.exit(2); }
    const a = JSON.parse(readFileSync(file, 'utf8'));
    const dados = JSON.parse(readFileSync(dadosFile, 'utf8'));
    // também se pode comentar ativos de toda a lista da Trade Republic (universo.mjs)
    const uniFile = path.join(path.dirname(dadosFile), 'universo.json');
    const uniRows = existsSync(uniFile) ? JSON.parse(readFileSync(uniFile, 'utf8')).rows || [] : [];
    const { out, errs } = buildAdvice(a, dados, uniRows);
    if (errs.length) { console.error(`Análise inválida (${errs.length}):\n- ` + errs.join('\n- ')); process.exit(1); }
    await kvPut(`advice:${out.date}`, out);
    await kvPut('advice:latest', out);
    await kvPut('advice:lessons', out.lessons);
    console.log(`Publicado advice:${out.date} (${out.actions.length} ativos, ${out.plan.length} linhas de plano, ${out.lessons.length} lições; mais fortes a médio prazo: ${out.rank.mid.slice(0, 3).join(', ')}).`);
}
