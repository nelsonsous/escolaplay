// Maestro — passo 1: o que ouves (favoritas, artistas, playlists), o que o Maestro já fez e os pedidos à espera.
//   (referência do teste de paridade: o script da tarefa agendada é o curador/onda/dados.onda)
// Grava <dir>/dados.md (para ler; uma secção por pessoa da app) e <dir>/<pessoa>/perfil.json (o publicar.mjs usa-o
// para os sinais de gosto; o do dono também em <dir>/perfil.json).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { api, pessoa, agora, lisboa, minutos } from '../comum.mjs';
import { qualidadeTexto, camelotTexto } from '../../lib/tidal.js';

const dir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '/tmp/musica';
mkdirSync(dir, { recursive: true });

// o estado não precisa de chave: antes da primeira ligação ao Tidal ainda não há chave do agente
const estado = await api('/api/estado', { semChave: true });
if (!estado.ligado) {
    const msg = estado.clientId ? 'O Tidal ainda não foi ligado na app.' : 'Ainda falta o Client ID do Tidal no conector.';
    writeFileSync(join(dir, 'dados.md'), `# Maestro\n\n**Tidal não ligado** — ${msg} Termina aqui.\n`);
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
    // e as tendências: o que se está a ouvir (as tabelas que o conector recolhe todos os dias) e o que disso é do teu gosto
    const [mixes, novas, tend] = await Promise.all([api('/api/mixes').catch(() => null), api('/api/novidades?dias=7').catch(() => null),
        api('/api/tendencias').catch(() => null)]);
    // como correram as playlists (o conector avalia-as sozinho) e as que se atualizam sozinhas
    const aval = await api('/api/avaliacoes').catch(() => null);
    const hoje = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(agora());
    const sextaDeManha = hoje.find((x) => x.type === 'weekday')?.value === 'Fri' && Number(hoje.find((x) => x.type === 'hour')?.value) < 12;
    const NOMES_MIX = { descoberta: 'Descoberta', diaria: 'Diária', lancamentos: 'Lançamentos' };

    const linhaFaixa = (f) => `${f.artistas.join(', ')} — ${f.titulo}${f.versao ? ` (${f.versao})` : ''} · ${f.ano || '?'} · ${qualidadeTexto(f.tags)}` +
        `${f.bpm ? ` · ${f.bpm} bpm` : ''}${f.tom ? ` · ${camelotTexto(f.tom)}` : ''}${f.generos?.length ? ` · ${f.generos.join('/')}` : ''}`;
    const pend = pedidos.filter((p) => p.estado === 'pendente');
    const ultimaSemanal = playlists.find((p) => p.por === 'curador' && /semana/i.test(p.nome));
    const diasSemanal = ultimaSemanal ? Math.floor((agora().getTime() - Date.parse(ultimaSemanal.criadaEm)) / 86400e3) : null;
    const r = perfil.resumo || {};
    const ESTADO = { sobe: 'a subir', nova: 'nova', dura: 'dura' };
    const nome = (x) => `${x.artista} — ${x.titulo}`;
    const cat = (f, e, fmt) => f.itens.filter((x) => x.estado === e).slice(0, 8).map(fmt).join(' · ') || '—';
    const pl = aval?.playlists || [];
    const lista = (xs, n = 10) => xs.slice(0, n).map((x) => `${x.artista} — ${x.titulo}`).join('; ');
    const etq = (a) => (['ainda cedo', 'sem sinais'].includes(a.etiqueta) ? ` · ${a.etiqueta}` : ` · **${a.etiqueta}** (nota ${a.nota})`);
    const correram = pl.map((x) => {
        const a = x.avaliacao;
        return `- «${x.nome}» (${String(x.renovadaEm || x.criadaEm).slice(0, 10)})${etq(a)}${a.guardadas.length ? ` · guardaste ${a.guardadas.length}: ${lista(a.guardadas)}` : ''}` +
            `${a.tiradas.length ? ` · tiraste ${a.tiradas.length}: ${lista(a.tiradas)}` : ''}${a.juntadas ? ` · juntaste ${a.juntadas}` : ''}${a.eco.length ? ` · nas tuas mixes: ${a.eco.join(', ')}` : ''}`;
    }).join('\n') || '- ainda não há playlists para avaliar';
    const tiradas = [...new Map(pl.flatMap((x) => x.avaliacao.tiradas).map((t) => [t.id, t])).values()].slice(0, 40);
    const renovar = pl.filter((x) => x.renovar).map((x) => {
        const dias = Math.floor((agora().getTime() - Date.parse(x.renovadaEm || x.criadaEm)) / 864e5), o = x.opcoes, a = x.avaliacao;
        return `- \`${x.id}\` «${x.nome}» · ${x.renovadaEm ? 'renovada' : 'criada'} há ${dias} dia(s)${dias >= 7 ? ' — **está na altura de a renovar**' : ''}
  - Critério: ${x.pedido ? `«${x.pedido}» · ` : ''}${o.faixas} faixas, máx. ${o.maxArtista} por artista, estilo ${o.estilo}, arco ${o.arco}${o.limpa ? ', sem letras explícitas' : ''}
  - Fica (guardaste): ${a.guardadas.map((g) => `\`${g.id}\` ${g.artista} — ${g.titulo}`).join('; ') || '—'}
  - Não voltes a pôr (tiraste): ${lista(a.tiradas, 30) || '—'}`;
    }).join('\n') || '- nenhuma';
    const tendencias = !tend?.dias ? '- ainda sem dados (o conector recolhe as tabelas uma vez por dia)'
        : `Histórico de ${tend.dias} dia(s), desde ${tend.desde}: «a subir» = ganhou 10 ou mais lugares numa semana; «nova» = entrou nos últimos 7 dias; «dura» = 21 dias ou mais na tabela. Usa-as no campo \`tendencia\` das candidatas.

### Para ti (das tabelas, o que é do teu gosto)
${tend.paraTi.map((x) => `- ${nome(x)} · ${x.fonte} n.º ${x.pos}${x.estado ? ` · ${ESTADO[x.estado]}` : ''} · ${x.porque}`).join('\n') || '- nada das tabelas encaixa no teu gosto, por agora'}${tend.fontes.map((f) => `

### ${f.nome}
- Top 10 hoje: ${f.itens.slice(0, 10).map((x) => `${x.pos}. ${nome(x)}`).join(' · ')}
- A subir: ${cat(f, 'sobe', (x) => `${nome(x)} (${x.semana}.º → ${x.pos}.º)`)}
- Novas: ${cat(f, 'nova', (x) => `${nome(x)} (${x.pos}.º)`)}
- Duram: ${cat(f, 'dura', (x) => `${nome(x)} (${x.dias} dias, ${x.pos}.º)`)}`).join('')}`;

    return `# Pessoa: ${perfil.utilizador || quem.nome || quem.uid} (\`${quem.uid}\`)

Conta Tidal: **${perfil.utilizador || '?'}** (${perfil.pais}) · ${perfil.favoritas.length} favoritas lidas (as mais recentes) · ${perfil.artistas.length} artistas seguidos · ${perfil.playlists.length} playlists tuas.

## Pedidos à espera (${pend.length})
${pend.length ? pend.map((p) => `- \`${p.id}\` — «${p.texto}» · ${p.opcoes.faixas} faixas, máx. ${p.opcoes.maxArtista} por artista, estilo ${p.opcoes.estilo}, arco ${p.opcoes.arco}${p.opcoes.limpa ? ', sem letras explícitas' : ''} · pedido a ${lisboa(new Date(p.criadoEm))}` +
    `${p.afinar ? ` · **${p.afinar.rever ? 'rever' : 'afinar'} a playlist «${p.afinar.nome}» (\`${p.afinar.playlist}\`)**${p.afinar.rever ? ' — são as faixas parecidas do Tidal, por rever' : ''}${p.afinar.rejeitadas.length ? ` — tira: ${p.afinar.rejeitadas.map((x) => `${x.artista} — ${x.titulo}`).join('; ')}` : ''}` : ''}`).join('\n') : '- nenhum'}

## Playlist da semana
${ultimaSemanal ? `A última foi «${ultimaSemanal.nome}» há ${diasSemanal} dia(s)${diasSemanal >= 7 ? ' — **está na altura de uma nova**.' : '.'}` : 'Ainda não há nenhuma — **cria a primeira**.'}

## Novidades dos artistas que segues (álbuns dos últimos 7 dias)
${novas?.albuns?.length ? novas.albuns.map((a) => `- ${a.data} · ${a.artista} — «${a.titulo}»`).join('\n') + '\n\nFaixas (com o id do Tidal):\n' + novas.faixas.map((f) => `- \`${f.id}\` ${linhaFaixa(f)}`).join('\n') : '- nenhum álbum novo esta semana'}
${sextaDeManha && (novas?.faixas?.length || 0) >= 5 ? '\n**É sexta de manhã: cria a playlist «Novidades dos teus artistas · dd/mm»** com estas faixas.' : ''}

## As tuas mixes do Tidal (o Tidal escolheu-as para ti; usa-as como candidatas quando encaixam)
${(mixes?.mixes || []).filter((m) => m.faixas.length).map((m) => `### ${NOMES_MIX[m.tipo] || m.tipo}\n${m.faixas.slice(0, 20).map((f) => `- \`${f.id}\` ${linhaFaixa(f)}`).join('\n')}`).join('\n\n') || '- o Tidal não devolveu mixes'}

## Tendências (o que se está a ouvir: tabelas do Apple Music e do Deezer, recolhidas pelo conector todos os dias)
${tendencias}

## Como correram as playlists (automático: faixas que guardaste nas favoritas, que tiraste ou juntaste no Tidal, e artistas delas que o Tidal pôs nas tuas mixes)
${correram}

### Não voltes a propor (faixas que tiraste das playlists)
${tiradas.length ? `- ${lista(tiradas, 40)}` : '- nenhuma'}

## Playlists que se atualizam sozinhas (ligadas na app)
${renovar}

## O teu gosto (das favoritas)
- Artistas mais presentes: ${(r.artistas || []).map((a) => `${a.nome} (${a.n})`).join(', ') || '—'}
- Géneros (etiquetas do Tidal): ${(r.generos || []).map((g) => `${g.nome} (${g.n})`).join(', ') || 'o Tidal não indicou'}
- Décadas: ${(r.decadas || []).map((d) => `${d.decada}s (${d.n})`).join(', ') || '—'}
- Qualidade das favoritas: ${(r.qualidade || []).map((q) => `${q.q} ${q.n}`).join(', ') || '—'}
- Artistas seguidos: ${perfil.artistas.slice(0, 40).map((a) => a.nome).join(', ') || '—'}
- As tuas playlists: ${perfil.playlists.slice(0, 25).map((p) => `${p.nome}${p.faixas != null ? ` (${p.faixas})` : ''}`).join('; ') || '—'}

### Favoritas mais recentes
${perfil.favoritas.slice(0, 40).map((f) => `- ${linhaFaixa(f)}${f.adicionada ? ` · ❤ ${f.adicionada.slice(0, 10)}` : ''}`).join('\n') || '- nenhuma'}

## O que o Maestro já fez (não repetir estas faixas)
${playlists.slice(0, 10).map((p) => `- ${p.criadaEm.slice(0, 10)} · «${p.nome}» · ${p.faixas} faixas, ${minutos(p.duracao)}${p.tidal ? ' · no Tidal' : ''}`).join('\n') || '- ainda nada'}
${recentes.filter(Boolean).map((d) => `\n### «${d.nome}» (${d.criadaEm.slice(0, 10)})\n${d.faixas.map((f) => `- ${f.artistas.join(', ')} — ${f.titulo}`).join('\n')}`).join('\n')}
`;
}

const secoes = [];
for (const q of pessoas) secoes.push(await secao(q).catch((e) => `# Pessoa: ${q.nome || q.uid} (\`${q.uid}\`)\n\nNão consegui ler os dados desta pessoa: ${e.message}\n`));
const md = `# Maestro — dados de ${lisboa()}

${pessoas.length > 1 ? `**${pessoas.length} pessoas** na app. Trata cada uma à parte: os pedidos, a playlist da semana e as novidades são de cada pessoa — escreve a proposta em \`${dir}/<id>/proposta.json\` e publica com \`--utilizador <id>\`.` : 'Uma pessoa na app (o dono).'}

${secoes.join('\n---\n\n')}`;
writeFileSync(join(dir, 'dados.md'), md);
console.log(md);
