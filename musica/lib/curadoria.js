// Da proposta (o que o Claude escolheu) à playlist: encontrar no Tidal, juntar os sinais do teu gosto e deixar o
// motor Onda escolher e ordenar. O mesmo código na tarefa agendada (publicar.mjs) e no telemóvel (app).
import { perfilGosto, sinais } from './sinais.js';
import { curar } from '../onda/onda.js';

// `resolver(lote)` → Promise<[faixa|null]> (o Worker: POST /api/resolver, no máximo 10 de cada vez)
export async function encontrar(candidatas, resolver, { lote = 10, progresso } = {}) {
    const out = [];
    for (let i = 0; i < candidatas.length; i += lote) {
        const parte = candidatas.slice(i, i + lote);
        const r = await resolver(parte.map((c) => ({ artista: c.artista, titulo: c.titulo, isrc: c.isrc, tidalId: c.tidalId })));
        parte.forEach((c, j) => out.push({ c, f: r[j] || null }));
        progresso?.(Math.min(candidatas.length, i + lote), candidatas.length);
    }
    return out;
}

// [{ c, f }] (encontradas) + perfil → candidatas prontas para o motor: [{ c, f, s }], sem a mesma gravação duas vezes
export function preparar(encontradas, perfil) {
    const g = perfilGosto(perfil || {});
    const vistas = new Set();
    return encontradas.filter((x) => x.f && !vistas.has(x.f.id) && vistas.add(x.f.id)).map((x) => ({ c: x.c, f: x.f, s: sinais(x.c, x.f, g) }));
}

// Corre o motor com as opções da playlist: { faixas, custo } (faixas pela ordem final, com o porquê)
export async function afinar(opcoes, cands, wasm) {
    const { ordem, custo } = await curar(wasm, { k: opcoes.faixas, maxArtista: opcoes.maxArtista, estilo: opcoes.estilo, arco: opcoes.arco }, cands.map((x) => x.s));
    const faixas = ordem.map((o) => {
        const { c, f, s } = cands[o.i];
        return { ...f, genero: s.genero, motivo: c.motivo || '', porque: o.motivo, pontos: o.pontos };
    });
    return { faixas, custo };
}

// As candidatas guardadas com uma playlist ({ ...pedido, faixa, sinais }) de volta ao formato do motor
export const deGuardadas = (lista = []) => lista.filter((x) => x && x.faixa && x.sinais).map((x) => ({ c: x, f: x.faixa, s: x.sinais }));
export const paraGuardar = (cands) => cands.map(({ c, f, s }) => ({ ...c, faixa: f, sinais: s }));

const contar = (xs) => [...xs.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]);
export function mistura(faixas) {
    return {
        generos: contar(faixas.map((f) => f.genero || '?')),
        decadas: contar(faixas.map((f) => (f.ano ? `${Math.floor(f.ano / 10) * 10}s` : '?'))),
        duracao: faixas.reduce((t, f) => t + (f.duracao || 0), 0),
    };
}
