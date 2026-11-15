// As receitas a partir de uma ligação (ciclo 3, volta 1). Cola-se na app o link de um vídeo de receita (TikTok ou
// YouTube) e o conector lê-o pela ligação oficial de incorporação (oEmbed: o título, que no TikTok é a legenda do vídeo
// com os ingredientes, e o autor), sem entrar na página nem passar proteções. A IA da Cloudflare (a dos talões) tira da
// legenda os ingredientes que se compram no supermercado, com nomes simples («farinha», «ovos», «bacalhau»), e a app
// mostra-os para se escolher o que falta e juntar à lista. A resposta guarda-se na KV 30 dias (não se pergunta à IA
// duas vezes pela mesma receita). O Instagram não tem oEmbed sem uma chave da Meta: fica de fora.
import { Erro } from './casa.js';
import { UA } from './rede.js';
import { MODELO, lerResposta } from './talao.js';

const DIAS30 = 30 * 24 * 3600;
const FONTES = [
    { k: 'tiktok', nome: 'TikTok', hosts: /^(www\.|m\.|vm\.|vt\.)?tiktok\.com$/, oembed: (u) => 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(u) },
    { k: 'youtube', nome: 'YouTube', hosts: /^(www\.|m\.)?(youtube\.com|youtu\.be)$/, oembed: (u) => 'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(u) },
];

// a fonte de uma ligação (ou null): só https, só os sites conhecidos
export function fonteDe(ligacao) {
    let u;
    try { u = new URL(String(ligacao ?? '').trim()); } catch { return null; }
    if (u.protocol !== 'https:') return null;
    const f = FONTES.find((x) => x.hosts.test(u.hostname.toLowerCase()));
    return f ? { ...f, url: u.origin + u.pathname } : null; // sem o «?…» (os códigos de partilha não interessam)
}

const PEDIDO = `És um ajudante de compras português. Recebes a legenda de um vídeo de receita (pode estar noutra língua).
Responde só com JSON, sem mais texto:
{"prato": "nome do prato em português de Portugal", "ingredientes": [{"t": "ingrediente", "n": "quantidade da receita"}]}
Regras: só o que se compra no supermercado (não a água da torneira, nem o sal e a pimenta se não forem pedidos à parte);
"t" é um nome simples e genérico em português de Portugal, no singular ou como se pede na loja («farinha», «ovos»,
«natas», «bacalhau», «azeite», «cebola», «chouriço»), sem marcas e sem a quantidade; "n" é a quantidade como vem
(«200 g», «2», «1 colher») ou "" se não vem. Não inventes ingredientes que a legenda não diz. Se a legenda não tem
ingredientes, responde {"prato": "…", "ingredientes": []}.`;

// sem IA (ou se falha): as linhas da legenda que parecem ingredientes («- 200 g de farinha», «• 2 ovos»)
export function ingredientesSimples(legenda) {
    const linhas = String(legenda ?? '').replace(/\s[-–]\s/g, '\n- ').split(/\n|(?=•)|·|;/).map((l) => l.trim()).filter(Boolean);
    const out = [];
    for (const l of linhas) {
        const m = l.match(/^[-–*•✔️✅▪️🔸]*\s*((?:\d+(?:[.,/-]\d+)?|½|¼|¾)\s*(?:(?:kg|gr|g|ml|dl|cl|l|colheres?|chávenas?|copos?|dentes?|latas?|pacotes?|unidades?)\b)?\s*(?:de\s+)?)?(.+)$/i);
        if (!m || !/^[-–*•✔✅▪🔸]|\d/.test(l)) continue;
        const t = m[2].replace(/#\S+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (t.length >= 3 && t.length <= 40) out.push({ t, n: (m[1] ?? '').trim() });
    }
    return out.slice(0, 30);
}

// arruma a resposta: nomes curtos, sem repetidos, no máximo 30
export function arrumarIngredientes(lista) {
    const vistos = new Set(), out = [];
    for (const i of Array.isArray(lista) ? lista : []) {
        const t = String(i?.t ?? '').replace(/\s+/g, ' ').replace(/[.!]+$/, '').trim().toLowerCase().slice(0, 40);
        const k = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (t.length < 2 || vistos.has(k)) continue;
        vistos.add(k);
        out.push({ t, n: String(i?.n ?? '').trim().slice(0, 30) });
        if (out.length >= 30) break;
    }
    return out;
}

// pergunta à IA os ingredientes de uma legenda (ou o texto de uma receita); sem IA, as linhas que parecem ingredientes
async function ingredientesDe(env, legenda) {
    if (env.AI && legenda) {
        try {
            const r = await env.AI.run(MODELO, { messages: [{ role: 'system', content: PEDIDO }, { role: 'user', content: legenda }], max_tokens: 900, temperature: 0 });
            const d = lerResposta(r);
            const ingredientes = arrumarIngredientes(d?.ingredientes);
            if (ingredientes.length) return { prato: String(d.prato ?? '').slice(0, 80) || null, ingredientes, como: 'ia' };
        } catch { /* fica a leitura simples */ }
    }
    return { prato: null, ingredientes: arrumarIngredientes(ingredientesSimples(legenda)), como: 'linhas' };
}

// a legenda pelo oEmbed (null se não vem: o TikTok, pedido de um centro de dados, responde sem o título)
async function oembed(f) {
    let r;
    try { r = await fetch(f.oembed(f.url), { headers: { 'user-agent': UA, accept: 'application/json' }, signal: AbortSignal.timeout(10000) }); } catch { throw new Erro(502, `não consegui ler o vídeo no ${f.nome}`); }
    if (!r.ok) throw new Erro(404, `o ${f.nome} não deu este vídeo (${r.status}): é público?`);
    return r.json().catch(() => ({}));
}

// lê uma receita: { url } (a ligação; a app pode mandar já a legenda, lida no telemóvel) ou { texto } (colado):
// { fonte, url, titulo, autor, imagem, prato, ingredientes: [{ t, n }], como: 'ia'|'linhas', semLegenda? }
export async function lerReceita(env, { url: ligacao, legenda: dada, autor: autorDado, texto } = {}) {
    if (texto != null && String(texto).trim()) {
        const t = String(texto).slice(0, 4000);
        const r = await ingredientesDe(env, t);
        return { fonte: 'texto', url: null, titulo: null, autor: null, imagem: null, ...r };
    }
    const f = fonteDe(ligacao);
    if (!f) throw new Erro(400, 'cola a ligação de um vídeo do TikTok ou do YouTube, ou o texto da receita');
    const chave = 'receita:' + f.url;
    const guardada = await env.KV.get(chave, { type: 'json' }).catch(() => null);
    if (guardada) return { ...guardada, guardada: 1 };
    let legenda = String(dada ?? '').slice(0, 3000), autor = autorDado ? String(autorDado).slice(0, 60) : null, imagem = null;
    if (!legenda) {
        const o = await oembed(f);
        legenda = String(o?.title ?? '').slice(0, 3000);
        autor = o?.author_name ? String(o.author_name).slice(0, 60) : null;
        imagem = o?.thumbnail_url ?? null;
    }
    if (!legenda) return { fonte: f.k, url: f.url, titulo: null, autor, imagem, prato: null, ingredientes: [], como: 'linhas', semLegenda: 1 };
    const r = await ingredientesDe(env, legenda);
    const res = { fonte: f.k, url: f.url, titulo: legenda.split('\n')[0].replace(/#\S+/g, '').trim().slice(0, 120) || null, autor, imagem, ...r };
    if (res.ingredientes.length) await env.KV.put(chave, JSON.stringify(res), { expirationTtl: DIAS30 }).catch(() => {});
    return res;
}
