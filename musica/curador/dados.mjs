// Curador — passo 1: o que ouves (favoritas, artistas, playlists), o que o Curador já fez e os pedidos à espera.
//   NODE_USE_ENV_PROXY=1 node musica/curador/dados.mjs [/tmp/musica]
// Grava <dir>/dados.md (para ler) e <dir>/perfil.json (o publicar.mjs usa-o para os sinais de gosto).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { api, lisboa, minutos } from './comum.mjs';
import { qualidadeTexto, camelotTexto } from '../lib/tidal.js';

const dir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '/tmp/musica';
mkdirSync(dir, { recursive: true });

// o estado não precisa de chave: antes da primeira ligação ao Tidal ainda não há chave do agente
const estado = await api('/api/estado', { semChave: true });
if (!estado.ligado) {
    const msg = estado.clientId ? 'O Tidal ainda não foi ligado na app.' : 'Ainda falta o Client ID do Tidal no conector.';
    writeFileSync(join(dir, 'dados.md'), `# Curador\n\n**Tidal não ligado** — ${msg} Termina aqui.\n`);
    console.log(`Tidal não ligado — ${msg} Termina aqui.`);
    process.exit(0);
}

const [perfil, pedidos, playlists] = await Promise.all([api('/api/perfil?fresco=1'), api('/api/pedidos'), api('/api/playlists')]);
writeFileSync(join(dir, 'perfil.json'), JSON.stringify(perfil));
const recentes = await Promise.all(playlists.slice(0, 3).map((p) => api('/api/playlists/' + p.id).catch(() => null)));

const linhaFaixa = (f) => `${f.artistas.join(', ')} — ${f.titulo}${f.versao ? ` (${f.versao})` : ''} · ${f.ano || '?'} · ${qualidadeTexto(f.tags)}` +
    `${f.bpm ? ` · ${f.bpm} bpm` : ''}${f.tom ? ` · ${camelotTexto(f.tom)}` : ''}${f.generos?.length ? ` · ${f.generos.join('/')}` : ''}`;
const pend = pedidos.filter((p) => p.estado === 'pendente');
const ultimaSemanal = playlists.find((p) => p.por === 'curador' && /semana/i.test(p.nome));
const diasSemanal = ultimaSemanal ? Math.floor((Date.now() - Date.parse(ultimaSemanal.criadaEm)) / 86400e3) : null;
const r = perfil.resumo || {};

const md = `# Curador — dados de ${lisboa()}

Conta Tidal: **${perfil.utilizador || '?'}** (${perfil.pais}) · ${perfil.favoritas.length} favoritas lidas (as mais recentes) · ${perfil.artistas.length} artistas seguidos · ${perfil.playlists.length} playlists tuas.

## Pedidos à espera (${pend.length})
${pend.length ? pend.map((p) => `- \`${p.id}\` — «${p.texto}» · ${p.opcoes.faixas} faixas, máx. ${p.opcoes.maxArtista} por artista, estilo ${p.opcoes.estilo}, arco ${p.opcoes.arco} · pedido a ${lisboa(new Date(p.criadoEm))}`).join('\n') : '- nenhum'}

## Playlist da semana
${ultimaSemanal ? `A última foi «${ultimaSemanal.nome}» há ${diasSemanal} dia(s)${diasSemanal >= 7 ? ' — **está na altura de uma nova**.' : '.'}` : 'Ainda não há nenhuma — **cria a primeira**.'}

## O teu gosto (das favoritas)
- Artistas mais presentes: ${(r.artistas || []).map((a) => `${a.nome} (${a.n})`).join(', ') || '—'}
- Géneros (etiquetas do Tidal): ${(r.generos || []).map((g) => `${g.nome} (${g.n})`).join(', ') || 'o Tidal não indicou'}
- Décadas: ${(r.decadas || []).map((d) => `${d.decada}s (${d.n})`).join(', ') || '—'}
- Qualidade das favoritas: ${(r.qualidade || []).map((q) => `${q.q} ${q.n}`).join(', ') || '—'}
- Artistas seguidos: ${perfil.artistas.slice(0, 40).map((a) => a.nome).join(', ') || '—'}
- As tuas playlists: ${perfil.playlists.slice(0, 25).map((p) => `${p.nome}${p.faixas != null ? ` (${p.faixas})` : ''}`).join('; ') || '—'}

### Favoritas mais recentes
${perfil.favoritas.slice(0, 40).map((f) => `- ${linhaFaixa(f)}${f.adicionada ? ` · ❤ ${f.adicionada.slice(0, 10)}` : ''}`).join('\n') || '- nenhuma'}

## O que o Curador já fez (não repetir estas faixas)
${playlists.slice(0, 10).map((p) => `- ${p.criadaEm.slice(0, 10)} · «${p.nome}» · ${p.faixas} faixas, ${minutos(p.duracao)}${p.tidal ? ' · no Tidal' : ''}`).join('\n') || '- ainda nada'}
${recentes.filter(Boolean).map((d) => `\n### «${d.nome}» (${d.criadaEm.slice(0, 10)})\n${d.faixas.map((f) => `- ${f.artistas.join(', ')} — ${f.titulo}`).join('\n')}`).join('\n')}
`;
writeFileSync(join(dir, 'dados.md'), md);
console.log(md);
