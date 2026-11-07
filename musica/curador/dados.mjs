// Curador — passo 1: o que ouves (favoritas, artistas, playlists), o que o Curador já fez e os pedidos à espera.
//   NODE_USE_ENV_PROXY=1 node musica/curador/dados.mjs [/tmp/musica]
// Grava <dir>/dados.md (para ler; uma secção por pessoa da app) e <dir>/<pessoa>/perfil.json (o publicar.mjs usa-o
// para os sinais de gosto; o do dono também em <dir>/perfil.json).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { api, pessoa, lisboa, minutos } from './comum.mjs';
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

// cada pessoa da app (o dono e quem foi convidado); com um Worker antigo, sem a lista, só o dono
const pessoas = (await api('/api/utilizadores').catch(() => [{ uid: 'dono', ligado: true }])).filter((x) => x.ligado);

// a secção de uma pessoa (os pedidos, a playlist da semana, as novidades, as mixes e o gosto dela)
async function secao(quem) {
    pessoa(quem.uid);
    const pasta = join(dir, quem.uid);
    mkdirSync(pasta, { recursive: true });
    const [perfil, pedidos, playlists] = await Promise.all([api('/api/perfil?fresco=1'), api('/api/pedidos'), api('/api/playlists')]);
    writeFileSync(join(pasta, 'perfil.json'), JSON.stringify(perfil));
    if (quem.uid === 'dono') writeFileSync(join(dir, 'perfil.json'), JSON.stringify(perfil));
    const recentes = await Promise.all(playlists.slice(0, 3).map((p) => api('/api/playlists/' + p.id).catch(() => null)));
    // o que o Tidal já sabe de ti (as tuas mixes) e os álbuns novos dos artistas que segues
    const [mixes, novas] = await Promise.all([api('/api/mixes').catch(() => null), api('/api/novidades?dias=7').catch(() => null)]);
    const agora = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const sextaDeManha = agora.find((x) => x.type === 'weekday')?.value === 'Fri' && Number(agora.find((x) => x.type === 'hour')?.value) < 12;
    const NOMES_MIX = { descoberta: 'Descoberta', diaria: 'Diária', lancamentos: 'Lançamentos' };

    const linhaFaixa = (f) => `${f.artistas.join(', ')} — ${f.titulo}${f.versao ? ` (${f.versao})` : ''} · ${f.ano || '?'} · ${qualidadeTexto(f.tags)}` +
        `${f.bpm ? ` · ${f.bpm} bpm` : ''}${f.tom ? ` · ${camelotTexto(f.tom)}` : ''}${f.generos?.length ? ` · ${f.generos.join('/')}` : ''}`;
    const pend = pedidos.filter((p) => p.estado === 'pendente');
    const ultimaSemanal = playlists.find((p) => p.por === 'curador' && /semana/i.test(p.nome));
    const diasSemanal = ultimaSemanal ? Math.floor((Date.now() - Date.parse(ultimaSemanal.criadaEm)) / 86400e3) : null;
    const r = perfil.resumo || {};

    return `# Pessoa: ${perfil.utilizador || quem.nome || quem.uid} (\`${quem.uid}\`)

    Conta Tidal: **${perfil.utilizador || '?'}** (${perfil.pais}) · ${perfil.favoritas.length} favoritas lidas (as mais recentes) · ${perfil.artistas.length} artistas seguidos · ${perfil.playlists.length} playlists tuas.

    ## Pedidos à espera (${pend.length})
    ${pend.length ? pend.map((p) => `- \`${p.id}\` — «${p.texto}» · ${p.opcoes.faixas} faixas, máx. ${p.opcoes.maxArtista} por artista, estilo ${p.opcoes.estilo}, arco ${p.opcoes.arco} · pedido a ${lisboa(new Date(p.criadoEm))}`).join('\n') : '- nenhum'}

    ## Playlist da semana
    ${ultimaSemanal ? `A última foi «${ultimaSemanal.nome}» há ${diasSemanal} dia(s)${diasSemanal >= 7 ? ' — **está na altura de uma nova**.' : '.'}` : 'Ainda não há nenhuma — **cria a primeira**.'}

    ## Novidades dos artistas que segues (álbuns dos últimos 7 dias)
    ${novas?.albuns?.length ? novas.albuns.map((a) => `- ${a.data} · ${a.artista} — «${a.titulo}»`).join('\n') + '\n\nFaixas (com o id do Tidal):\n' + novas.faixas.map((f) => `- \`${f.id}\` ${linhaFaixa(f)}`).join('\n') : '- nenhum álbum novo esta semana'}
    ${sextaDeManha && (novas?.faixas?.length || 0) >= 5 ? '\n**É sexta de manhã: cria a playlist «Novidades dos teus artistas · dd/mm»** com estas faixas.' : ''}

    ## As tuas mixes do Tidal (o Tidal escolheu-as para ti; usa-as como candidatas quando encaixam)
    ${(mixes?.mixes || []).filter((m) => m.faixas.length).map((m) => `### ${NOMES_MIX[m.tipo] || m.tipo}\n${m.faixas.slice(0, 20).map((f) => `- \`${f.id}\` ${linhaFaixa(f)}`).join('\n')}`).join('\n\n') || '- o Tidal não devolveu mixes'}

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
}

const secoes = [];
for (const q of pessoas) secoes.push(await secao(q).catch((e) => `# Pessoa: ${q.nome || q.uid} (\`${q.uid}\`)\n\nNão consegui ler os dados desta pessoa: ${e.message}\n`));
const md = `# Curador — dados de ${lisboa()}

${pessoas.length > 1 ? `**${pessoas.length} pessoas** na app. Trata cada uma à parte: os pedidos, a playlist da semana e as novidades são de cada pessoa — escreve a proposta em \`${dir}/<id>/proposta.json\` e publica com \`--utilizador <id>\`.` : 'Uma pessoa na app (o dono).'}

${secoes.join('\n---\n\n')}`;
writeFileSync(join(dir, 'dados.md'), md);
console.log(md);
