// Maestro — último passo (a versão em JavaScript, só como referência do teste de paridade; a que corre é a Onda): valida a proposta do Claude, encontra as faixas no Tidal, deixa o motor Onda escolher e
// ordenar, e cria a playlist na tua conta (e na biblioteca da app).
//   NODE_USE_ENV_PROXY=1 node musica/curador/publicar.mjs /tmp/musica/<pessoa>/proposta.json [--utilizador <pessoa>] [--pedido <id>] [--modelo <id>]
//        [--ensaio] (não grava nada) [--sem-tidal] (só na biblioteca da app) [--aceitar-menos]
//        [--renovar <id>] (renova essa playlist, a que se atualiza sozinha: no mesmo sítio da app e do Tidal)
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { api, pessoa, arg, flag, minutos } from '../comum.mjs';
import { validarProposta } from '../../lib/playlist.js';
import { encontrar, preparar, afinar, paraGuardar, mistura } from '../../lib/curadoria.js';
import { qualidadeTexto, camelotTexto } from '../../lib/tidal.js';

const file = process.argv[2];
if (!file || file.startsWith('--')) { console.error('uso: publicar.mjs /tmp/musica/<pessoa>/proposta.json [--utilizador <pessoa>] [--pedido <id>] [--modelo <id>] [--ensaio]'); process.exit(2); }
let bruto;
try { bruto = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.error(`JSON inválido em ${file}: ${e.message}`); process.exit(1); }
const { ok, errors, value: p } = validarProposta(bruto, { strict: true });
if (!ok) { console.error('Proposta inválida:\n- ' + errors.join('\n- ')); process.exit(1); }

pessoa(arg('--utilizador'));
const pedidoId = arg('--pedido');
const renovarId = arg('--renovar');
if (pedidoId) {
    const pedido = (await api('/api/pedidos')).find((x) => x.id === pedidoId);
    if (!pedido) { console.error(`O pedido ${pedidoId} não existe.`); process.exit(1); }
    if (pedido.estado !== 'pendente') { console.error(`O pedido ${pedidoId} já foi tratado (por outra corrida): não se publica outra vez.`); process.exit(1); }
    if (!p.pedido) p.pedido = pedido.texto;
}

// 1) encontrar as candidatas no Tidal (lotes de 10), 2) sinais do teu gosto, 3) o motor Onda
// (sem letras explícitas: o conector procura a versão limpa; uma explícita que ainda venha conta como não encontrada)
const encontradas = await encontrar(p.candidatas, async (lote) => (await api('/api/resolver', { method: 'POST', body: { faixas: lote, ...(p.opcoes.limpa ? { limpa: true } : {}) } })).faixas);
if (p.opcoes.limpa) for (const x of encontradas) if (x.f?.explicita) x.f = null;
const falta = encontradas.filter((x) => !x.f);
const perfilFile = join(dirname(file), 'perfil.json');
const perfil = existsSync(perfilFile) ? JSON.parse(readFileSync(perfilFile, 'utf8')) : await api('/api/perfil');
const cands = preparar(encontradas, perfil);
const wasm = readFileSync(new URL('../../onda/curador.wasm', import.meta.url));
const { faixas, custo } = await afinar(p.opcoes, cands, wasm);

console.log(`Encontradas no Tidal: ${cands.length} de ${p.candidatas.length}${falta.length ? ` · não encontradas: ${falta.map((x) => `${x.c.artista} — ${x.c.titulo}`).join('; ')}` : ''}`);
if (faixas.length < p.opcoes.faixas && !flag('--aceitar-menos')) {
    console.error(`O motor só conseguiu ${faixas.length} de ${p.opcoes.faixas} faixas (máx. ${p.opcoes.maxArtista} por artista). ` +
        'Acrescenta candidatas (de outros artistas) à proposta e publica outra vez — ou usa --aceitar-menos.');
    process.exit(1);
}

const m = mistura(faixas);
const lista = (xs) => xs.map(([k, n]) => `${k} ${n}`).join(', ');
console.log(`\n«${p.nome}» — ${faixas.length} faixas, ${minutos(m.duracao)} · custo das transições ${custo}`);
faixas.forEach((f, i) => console.log(`${String(i + 1).padStart(2)}. ${f.artistas.join(', ')} — ${f.titulo} · ${f.ano || '?'} · ${f.genero || '?'} · ${qualidadeTexto(f.tags)}` +
    `${f.bpm ? ` · ${f.bpm} bpm` : ''}${f.tom ? ` · ${camelotTexto(f.tom)}` : ''} · ${f.porque} ${f.pontos}`));
console.log(`\nGéneros: ${lista(m.generos)}\nDécadas: ${lista(m.decadas)}\nQualidade: ${lista([...faixas.reduce((x, f) => x.set(qualidadeTexto(f.tags), (x.get(qualidadeTexto(f.tags)) || 0) + 1), new Map())])}`);

if (flag('--ensaio')) { console.log('\n(ensaio: nada gravado)'); process.exit(0); }

// 4) gravar na biblioteca e criar no Tidal
const doc = await api(renovarId ? `/api/playlists/${renovarId}/renovacoes` : '/api/playlists', { method: 'POST', body: {
    nome: p.nome, descricao: p.descricao, resumo: p.resumo, tendencias: p.tendencias, pedido: p.pedido, opcoes: p.opcoes, faixas, custo,
    candidatas: paraGuardar(cands), modelo: arg('--modelo', 'claude'), tidal: !flag('--sem-tidal'),
} });
if (pedidoId) await api(`/api/pedidos/${pedidoId}?playlist=${doc.id}`, { method: 'DELETE' });
writeFileSync(join(dirname(file), 'publicada.json'), JSON.stringify(doc, null, 2));
console.log(`\n${renovarId ? 'Renovada' : 'Publicada'}: «${doc.nome}» (${doc.id})${doc.tidal ? ` · no Tidal: ${doc.tidal.url}` : ' · só na biblioteca da app'}${pedidoId ? ` · pedido ${pedidoId} feito` : ''}`);
