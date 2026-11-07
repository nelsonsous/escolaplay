// O formato de uma proposta de playlist (escrita pelo Claude na tarefa agendada, ou criada na app) e a validação.
//
// {
//   "nome": "até 60 caracteres",
//   "descricao": "até 300 caracteres (vai para o Tidal)",
//   "resumo": "2 a 6 frases: o que ouves, o que está a dar e porquê estas escolhas",
//   "tendencias": ["o que está na moda e onde se viu (até 8)"],
//   "pedido": "o pedido que originou a playlist (opcional)",
//   "opcoes": { "faixas": 30, "maxArtista": 2, "estilo": "equilibrado|descoberta|moda|gosto|audiofilo", "arco": "onda|sobe|desce|plano" },
//   "candidatas": [ { "artista", "titulo", "ano", "genero", "nota": 0-100, "energia": 0-100, "tendencia": 0-100,
//                     "motivo": "até 140 caracteres", "fixa": false } ]
// }
import { ESTILOS, ARCOS } from '../onda/onda.js';

const txt = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const num = (v, a, b) => { const n = Number(v); return v === '' || v == null || !Number.isFinite(n) ? null : Math.min(b, Math.max(a, n)); };
export const chaveFaixa = (t) => `${txt(t.artista, 200).toLowerCase()}|${txt(t.titulo, 200).toLowerCase()}`;

export function normalizarCandidatas(lista) {
    const out = [], vistas = new Set();
    for (const r of Array.isArray(lista) ? lista : []) {
        if (!r || typeof r !== 'object') continue;
        const c = { artista: txt(r.artista ?? r.artist, 120), titulo: txt(r.titulo ?? r.title, 160) };
        if (!c.artista || !c.titulo) continue;
        const k = chaveFaixa(c);
        if (vistas.has(k)) continue;
        vistas.add(k);
        const ano = parseInt(r.ano ?? r.year, 10);
        if (ano >= 1900 && ano <= 2100) c.ano = ano;
        if (r.album) c.album = txt(r.album, 160);
        if (r.genero ?? r.genre) c.genero = txt(r.genero ?? r.genre, 40);
        for (const [k2, a, b] of [['nota', 0, 100], ['energia', 0, 100], ['tendencia', 0, 100], ['bpm', 0, 300]]) {
            const v = num(r[k2], a, b);
            if (v != null) c[k2] = Math.round(v);
        }
        const motivo = txt(r.motivo ?? r.note, 140);
        if (motivo) c.motivo = motivo;
        if (r.isrc && /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/i.test(r.isrc)) c.isrc = String(r.isrc).toUpperCase();
        if (r.tidalId && /^\d+$/.test(String(r.tidalId))) c.tidalId = String(r.tidalId);
        if (r.fixa) c.fixa = true;
        out.push(c);
    }
    return out;
}

export function normalizarOpcoes(o = {}) {
    const faixas = Math.round(num(o.faixas ?? o.count, 5, 100) ?? 30);
    return {
        faixas,
        maxArtista: Math.round(num(o.maxArtista ?? o.perArtist, 1, 10) ?? 2),
        estilo: ESTILOS[o.estilo] ? o.estilo : 'equilibrado',
        arco: o.arco in ARCOS ? o.arco : 'onda',
    };
}

// { ok, errors, value } — strict: exige o que a tarefa agendada tem de escrever
export function validarProposta(p, { strict = false } = {}) {
    const errors = [];
    if (!p || typeof p !== 'object') return { ok: false, errors: ['a proposta tem de ser um objeto JSON'], value: null };
    const value = {
        nome: txt(p.nome ?? p.name, 60),
        descricao: txt(p.descricao ?? p.description, 300),
        resumo: txt(p.resumo, 1200),
        tendencias: (Array.isArray(p.tendencias) ? p.tendencias : []).map((t) => txt(t, 200)).filter(Boolean).slice(0, 8),
        pedido: txt(p.pedido, 500),
        opcoes: normalizarOpcoes(p.opcoes || {}),
        candidatas: normalizarCandidatas(p.candidatas ?? p.tracks),
    };
    if (!value.nome) errors.push('"nome" em falta');
    if (!value.candidatas.length) errors.push('"candidatas" vazia (cada uma com "artista" e "titulo")');
    if (strict) {
        if (!value.descricao) errors.push('"descricao" em falta');
        if (value.resumo.length < 80) errors.push('"resumo" curto demais (2 a 6 frases)');
        if (value.candidatas.length < Math.ceil(value.opcoes.faixas * 1.3)) {
            errors.push(`só ${value.candidatas.length} candidatas para ${value.opcoes.faixas} faixas: propõe pelo menos ${Math.ceil(value.opcoes.faixas * 1.3)} (o motor escolhe e algumas podem não existir no Tidal)`);
        }
        const semNota = value.candidatas.filter((c) => c.nota == null).length;
        if (semNota) errors.push(`${semNota} candidata(s) sem "nota" (0-100)`);
        const semMotivo = value.candidatas.filter((c) => !c.motivo).length;
        if (semMotivo) errors.push(`${semMotivo} candidata(s) sem "motivo"`);
        const semGenero = value.candidatas.filter((c) => !c.genero || !c.ano).length;
        if (semGenero) errors.push(`${semGenero} candidata(s) sem "genero" ou "ano" (o ano original da gravação)`);
    }
    return { ok: errors.length === 0, errors, value };
}
