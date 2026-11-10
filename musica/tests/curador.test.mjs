// A tarefa agendada de ponta a ponta: o Worker num servidor local (Tidal simulado, KV em memória) e os scripts
// dados.mjs e publicar.mjs a correr a sério contra ele, como na tarefa agendada.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import worker from '../proxy/src/worker.js';
import { simulador, kv } from './simulador.mjs';

const correr = promisify(execFile);
const RAIZ = new URL('..', import.meta.url).pathname;
let servidor, base, env, sim;
const CHAVE = 'chave-do-agente-para-os-testes-0123456789';

before(async () => {
    sim = simulador();
    globalThis.fetch = sim.fetch; // o Worker fala com o Tidal simulado; os scripts (outros processos) falam com o Worker
    env = { KV: kv(), TIDAL_CLIENT_ID: 'CLIENTE' };
    servidor = createServer(async (req, res) => {
        const corpo = await new Promise((ok) => { const b = []; req.on('data', (c) => b.push(c)); req.on('end', () => ok(Buffer.concat(b))); });
        const r = await worker.fetch(new Request(base + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : corpo }), env, { waitUntil() {} });
        res.writeHead(r.status, Object.fromEntries(r.headers));
        res.end(Buffer.from(await r.arrayBuffer()));
    });
    await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
    base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => servidor.close());

const script = (nome, args, { semChave = false, agora = '' } = {}) => correr(process.execPath, [join(RAIZ, 'curador', nome), ...args],
    // sem chave: e uma conta Cloudflare que não existe, para nunca ir à KV verdadeira
    { env: { ...process.env, MUSICA_WORKER: base, MUSICA_AGORA: agora, ...(semChave ? { MUSICA_CHAVE: '', CF_ACCOUNT_ID: 'conta-de-teste' } : { MUSICA_CHAVE: CHAVE }) }, timeout: 60000 })
    .catch((e) => ({ stdout: e.stdout, stderr: e.stderr, code: e.code }));

test('sem Tidal ligado (e ainda sem chave do agente): os dados dizem para terminar', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'musica-'));
    const r = await script('dados.mjs', [dir], { semChave: true });
    assert.equal(r.code, undefined, r.stderr);
    assert.match(r.stdout, /Tidal não ligado/);
    assert.match(readFileSync(join(dir, 'dados.md'), 'utf8'), /Termina aqui/);
});

test('dados → proposta → ensaio → publicar com pedido', async () => {
    const { createHash } = await import('node:crypto');
    await env.KV.put('tidal:tokens', JSON.stringify({ access: 'AT1', refresh: 'RT1', expira: Date.now() + 3600e3, utilizador: 'nelson', pais: 'PT' }));
    await env.KV.put('chaves', JSON.stringify({ [createHash('sha256').update(CHAVE).digest('hex')]: { tipo: 'agente', nome: 'Maestro' } }));
    await env.KV.put('pedidos', JSON.stringify([{ id: 'q1abc', texto: 'Jazz e soul para o carro', opcoes: { faixas: 5, maxArtista: 1, estilo: 'audiofilo', arco: 'onda' }, estado: 'pendente', criadoEm: new Date().toISOString() }]));
    const dir = mkdtempSync(join(tmpdir(), 'musica-'));

    const d = await script('dados.mjs', [dir]);
    assert.equal(d.code, undefined, d.stderr);
    const md = readFileSync(join(dir, 'dados.md'), 'utf8');
    assert.match(md, /Conta Tidal: \*\*nelson\*\* \(PT\)/);
    assert.match(md, /^## Pedidos à espera/m, 'os títulos no início da linha (sem indentação: senão o Markdown faz deles código)');
    assert.doesNotMatch(md, /^ {4}\S/m);
    assert.match(md, /`q1abc` — «Jazz e soul para o carro» · 5 faixas, máx\. 1 por artista, estilo audiofilo/);
    assert.match(md, /Miles Davis — So What · 1959 · Hi-Res · 136 bpm · 7A · Jazz/);
    assert.match(md, /Ainda não há nenhuma — \*\*cria a primeira\*\*/);
    // as novidades dos artistas que segues e as tuas mixes do Tidal, com o id do Tidal
    assert.match(md, /- \d{4}-\d{2}-\d{2} · Nina Simone — «Disco novo»/);
    assert.match(md, /- `102` Nina Simone — Feeling Good/);
    assert.match(md, /### Descoberta\n- `106` Massive Attack — Teardrop/);
    assert.match(md, /### Diária\n- `101` Miles Davis — So What/);
    assert.ok(JSON.parse(readFileSync(join(dir, 'perfil.json'), 'utf8')).favoritas.length >= 3);

    const proposta = {
        nome: 'Jazz e soul para o carro', descricao: 'Gravações que mostram o som.', resumo: 'Tens ouvido jazz modal e soul dos anos 60; aqui vai uma seleção com gravações de referência, para o carro.',
        tendencias: ['Reedição de Kind of Blue em Hi-Res'], opcoes: { faixas: 5, maxArtista: 1, estilo: 'audiofilo', arco: 'onda' },
        candidatas: [
            { artista: 'Miles Davis', titulo: 'So What', ano: 1959, genero: 'jazz', nota: 98, energia: 40, motivo: 'Referência de gravação: Kind of Blue.' },
            { artista: 'Nina Simone', titulo: 'Feeling Good', ano: 1965, genero: 'soul', nota: 95, energia: 50, motivo: 'A voz e os metais, sem truques.' },
            { artista: 'Daft Punk', titulo: 'Get Lucky', ano: 2013, genero: 'disco', nota: 88, energia: 80, motivo: 'Produção impecável, ótima para testar graves.' },
            { artista: 'Amália Rodrigues', titulo: 'Barco Negro', ano: 1955, genero: 'fado', nota: 93, energia: 35, motivo: 'Fado essencial.' },
            { artista: 'Miles Davis', titulo: 'Faixa 3', ano: 1959, genero: 'jazz', nota: 80, energia: 45, motivo: 'Mais Miles.' },
            { artista: 'Ninguém', titulo: 'Não existe', ano: 2020, genero: 'pop', nota: 70, energia: 50, motivo: 'Não está no Tidal.' },
            { artista: 'Faixa Fantasma', titulo: 'Também não', ano: 2021, genero: 'rock', nota: 60, energia: 50, motivo: 'Também não.' },
        ],
    };
    writeFileSync(join(dir, 'proposta.json'), JSON.stringify(proposta));
    // só 4 artistas encontrados para 5 faixas com máx. 1 por artista → recusa e explica
    const curto = await script('publicar.mjs', [join(dir, 'proposta.json'), '--ensaio']);
    assert.match(curto.stderr, /só conseguiu 4 de 5/);
    assert.match(curto.stdout, /Encontradas no Tidal: 5 de 7 · não encontradas: Ninguém — Não existe; Faixa Fantasma — Também não/);

    proposta.candidatas.push({ artista: 'Massive Attack', titulo: 'Teardrop', ano: 1998, genero: 'trip-hop', nota: 94, energia: 30, motivo: 'Graves profundos e espaço: teste de som clássico.' });
    writeFileSync(join(dir, 'proposta.json'), JSON.stringify(proposta));
    const ensaio = await script('publicar.mjs', [join(dir, 'proposta.json'), '--ensaio']);
    assert.equal(ensaio.code, undefined, ensaio.stderr);
    assert.match(ensaio.stdout, /«Jazz e soul para o carro» — 5 faixas/);
    assert.match(ensaio.stdout, /ensaio: nada gravado/);
    assert.equal(sim.criadas.length, 0);

    const pub = await script('publicar.mjs', [join(dir, 'proposta.json'), '--pedido', 'q1abc', '--modelo', 'modelo-teste']);
    assert.equal(pub.code, undefined, pub.stderr);
    assert.match(pub.stdout, /no Tidal: https:\/\/tidal\.com\/browse\/playlist\/uuid-nova · pedido q1abc feito/);
    assert.equal(sim.criadas.length, 1);
    assert.equal(sim.criadas[0].name, 'Jazz e soul para o carro');
    assert.equal(sim.itens.length, 5);
    assert.equal(new Set(sim.itens).size, 5);
    const idx = JSON.parse(await env.KV.get('playlists'));
    const doc = JSON.parse(await env.KV.get('playlist:' + idx[0].id));
    assert.equal(doc.por, 'curador');
    assert.equal(doc.modelo, 'modelo-teste');
    assert.deepEqual(doc.faixas.map((f) => f.id), sim.itens, 'a ordem do motor é a do Tidal');
    assert.ok(doc.faixas.every((f) => f.motivo && f.porque && f.pontos > 0));
    assert.equal(doc.candidatas.length, 6, 'as candidatas encontradas ficam para afinar na app');
    assert.ok(doc.candidatas[0].sinais && doc.candidatas[0].faixa);
    assert.equal(JSON.parse(await env.KV.get('pedidos'))[0].estado, 'feito');
    assert.equal(JSON.parse(await env.KV.get('pedidos'))[0].playlist, doc.id);
});

test('várias pessoas: uma secção por pessoa no dados.md e publicar na biblioteca de cada uma (--utilizador)', async () => {
    // uma segunda pessoa, convidada pelo dono, com o seu Tidal e um pedido
    await env.KV.put('utilizadores', JSON.stringify([{ uid: 'uana', nome: 'ana' }]));
    await env.KV.put('u:uana:tidal:tokens', await env.KV.get('tidal:tokens'));
    await env.KV.put('u:uana:pedidos', JSON.stringify([{ id: 'q2ana', texto: 'Fado para a Ana', opcoes: { faixas: 5, maxArtista: 2, estilo: 'equilibrado', arco: 'onda' }, estado: 'pendente', criadoEm: new Date().toISOString() }]));
    const dir = mkdtempSync(join(tmpdir(), 'musica-'));
    const d = await script('dados.mjs', [dir]);
    assert.equal(d.code, undefined, d.stderr);
    const md = readFileSync(join(dir, 'dados.md'), 'utf8');
    assert.match(md, /\*\*2 pessoas\*\* na app/);
    assert.match(md, /# Pessoa: nelson \(`dono`\)/);
    assert.match(md, /# Pessoa: nelson \(`uana`\)[\s\S]*`q2ana` — «Fado para a Ana»/);
    assert.ok(JSON.parse(readFileSync(join(dir, 'uana', 'perfil.json'), 'utf8')).favoritas.length >= 3);
    // a proposta da Ana vai para a biblioteca dela e o pedido dela fica feito
    const proposta = { nome: 'Fado para a Ana', descricao: 'Fado.', resumo: 'Fado e companhia, com gravações de referência. Para ouvir com calma ao fim do dia.', opcoes: { faixas: 5, maxArtista: 2, estilo: 'equilibrado', arco: 'onda' },
        candidatas: ['So What', 'Feeling Good', 'Get Lucky', 'Barco Negro', 'Teardrop', 'Faixa 3', 'Faixa 7'].map((titulo, i) => ({ artista: ['Miles Davis', 'Nina Simone', 'Daft Punk', 'Amália Rodrigues', 'Massive Attack', 'Miles Davis', 'Miles Davis'][i], titulo, ano: 1960, genero: 'fado', nota: 90 - i, energia: 40, motivo: 'm' })) };
    writeFileSync(join(dir, 'uana', 'proposta.json'), JSON.stringify(proposta));
    const pub = await script('publicar.mjs', [join(dir, 'uana', 'proposta.json'), '--utilizador', 'uana', '--pedido', 'q2ana', '--modelo', 'modelo-teste']);
    assert.equal(pub.code, undefined, pub.stderr);
    assert.equal(JSON.parse(await env.KV.get('u:uana:playlists'))[0].nome, 'Fado para a Ana');
    assert.equal(JSON.parse(await env.KV.get('u:uana:pedidos'))[0].estado, 'feito');
    assert.ok(!JSON.parse(await env.KV.get('playlists')).some((x) => x.nome === 'Fado para a Ana'), 'não vai para a biblioteca do dono');
});

test('paridade: o dados.md da versão Onda é o da versão em JavaScript, ao byte (as duas pessoas, as datas de Lisboa)', async () => {
    // 10 dias de tendências: uma canção a subir, uma nova, acentos e «(feat. …)»; a Nina Simone (que o dono segue) nas tabelas
    const { recolher } = await import('../proxy/src/tendencias.js');
    for (let d = 0; d < 10; d++) {
        const lista = Array.from({ length: 30 }, (_, i) => [`Artista ${i}`, `Canção ${i}`, i % 2 ? 'Pop' : 'Jazz']);
        lista.splice(d < 3 ? 25 : 25 - (d - 2) * 3, 0, ['Amália Rodrigues', 'Barco Negro (feat. Alguém)', 'Fado']);
        if (d >= 6) lista.splice(1, 0, ['Nina Simone', 'Feeling Good', 'Jazz']);
        sim.tabelas.pt = lista;
        await recolher(env, Date.parse('2026-11-01T04:23:00Z') + d * 864e5);
    }
    // como correu: a playlist do dono no Tidal, com uma faixa guardada, uma tirada e «atualizar sozinha» ligado
    const idx = JSON.parse(await env.KV.get('playlists'));
    const doc = JSON.parse(await env.KV.get('playlist:' + idx[0].id));
    const novas = doc.faixas.filter((f) => !['101', '102', '105'].includes(f.id)); // (estas já são favoritas no simulador)
    sim.favoritasNovas = [{ id: novas[0].id, addedAt: new Date(Date.now() + 1000).toISOString() }];
    sim.listas[doc.tidal.id] = (sim.listas[doc.tidal.id] || []).filter((x) => x.id !== novas[1].id);
    // um pedido de afinação («não esta» numa faixa e o que mudar)
    const pedirAo = (caminho, corpo) => worker.fetch(new Request(base + caminho, { method: 'POST', headers: { authorization: `Bearer ${CHAVE}`, 'content-type': 'application/json' }, body: JSON.stringify(corpo) }), env, { waitUntil() {} });
    assert.equal((await pedirAo(`/api/playlists/${doc.id}/rejeitar`, { faixa: novas[1].id })).status, 200);
    assert.equal((await pedirAo(`/api/playlists/${doc.id}/afinar`, { texto: 'Mais vozes, menos eletrónica' })).status, 201);
    const ren = await worker.fetch(new Request(`${base}/api/playlists/${doc.id}/renovar`, { method: 'POST', headers: { authorization: `Bearer ${CHAVE}`, 'content-type': 'application/json' }, body: '{"ativo":true}' }), env, { waitUntil() {} });
    assert.equal(ren.status, 200);
    for (const agora of ['2026-11-13T09:30:00Z', '2026-07-03T22:59:00Z', '2027-03-28T00:59:59Z']) {
        const a = mkdtempSync(join(tmpdir(), 'musica-onda-')), b = mkdtempSync(join(tmpdir(), 'musica-js-'));
        const onda = await script('dados.mjs', [a], { agora });
        const js = await script(join('js', 'dados.mjs'), [b], { agora });
        assert.equal(onda.code, undefined, onda.stderr);
        assert.equal(js.code, undefined, js.stderr);
        const md = (d) => readFileSync(join(d, 'dados.md'), 'utf8').replaceAll(d, '<dir>');
        assert.equal(md(a), md(b), `dados.md com MUSICA_AGORA=${agora}`);
        assert.equal(onda.stdout.replaceAll(a, '<dir>'), js.stdout.replaceAll(b, '<dir>'));
        // o perfil.json é o que o Worker deu (tirando a hora em que o gerou)
        const pj = (f) => { const x = JSON.parse(readFileSync(f, 'utf8')); delete x.geradoEm; return x; };
        assert.deepEqual(pj(join(a, 'perfil.json')), pj(join(b, 'perfil.json')));
        assert.deepEqual(pj(join(a, 'uana', 'perfil.json')), pj(join(b, 'uana', 'perfil.json')));
    }
});

test('paridade: o publicar da versão Onda mostra, recusa e grava como a versão em JavaScript', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'musica-pub-'));
    // um perfil com acentos, géneros e décadas: o gosto pesa nos sinais (e os empates do topo contam)
    writeFileSync(join(dir, 'perfil.json'), JSON.stringify({
        favoritas: [
            { id: '101', artistas: ['Miles Davis'], generos: ['Jazz'], ano: 1959, isrc: 'USAAA0000101' },
            { id: '900', artistas: ['Amália Rodrigues'], generos: ['Fado'], ano: 1955 },
            { id: '901', artistas: ['Amália Rodrigues', 'Simon & Garfunkel'], generos: ['Folk', 'Fado'], ano: 1966 },
            { id: 902, artistas: ['Nina Simone (Live)'], generos: ['Soul'], ano: 1965 },
            { id: '903', artistas: ['Daft Punk'], generos: ['Electrónica', 'Disco'], ano: 2013 },
        ],
        artistas: [{ nome: 'Massive Attack' }, 'Björk', { nome: 'Nina Simone' }],
    }));
    const f = join(dir, 'proposta.json');
    const ambos = async (conteudo, args = []) => {
        if (conteudo !== undefined) writeFileSync(f, typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo));
        const onda = await script('publicar.mjs', [f, ...args]);
        const js = await script(join('js', 'publicar.mjs'), [f, ...args]);
        return { onda, js };
    };
    const igual = ({ onda, js }, nome, { stderr = true } = {}) => {
        assert.equal(onda.code, js.code, `${nome}: código de saída (${onda.stderr})`);
        assert.equal(onda.stdout, js.stdout, `${nome}: stdout`);
        if (stderr) assert.equal(onda.stderr, js.stderr, `${nome}: stderr`);
    };

    // sem ficheiro, ficheiro que não existe, JSON inválido, null
    const uso = { onda: await script('publicar.mjs', []), js: await script(join('js', 'publicar.mjs'), []) };
    igual(uso, 'uso');
    assert.equal(uso.onda.code, 2);
    const falta = { onda: await script('publicar.mjs', [join(dir, 'nao-ha.json')]), js: await script(join('js', 'publicar.mjs'), [join(dir, 'nao-ha.json')]) };
    igual(falta, 'ficheiro que não existe');
    const mau = await ambos('{"nome": "x",');
    igual(mau, 'JSON inválido', { stderr: false });
    assert.ok(mau.onda.stderr.startsWith(`JSON inválido em ${f}: `));
    igual(await ambos('null'), 'null');

    // os erros da validação, pela mesma ordem
    igual(await ambos({ nome: '  ', resumo: 'curto', opcoes: { faixas: '12', maxArtista: 0.4 }, candidatas: [
        { artista: 'Miles Davis', titulo: 'So What', nota: '85' }, { artist: ' Nina  Simone ', title: 'Feeling Good', year: '1965 (orig.)', genre: ' ' },
        { artista: 'MILES DAVIS', titulo: 'so what', nota: 90 }, { artista: '', titulo: 'Sem artista' }, 'nem objeto', null] }), 'proposta inválida');

    const resumo = 'Tens ouvido jazz modal e fado; aqui vai uma seleção com gravações de referência e alguma descoberta pelo meio.';
    const c = (artista, titulo, extra = {}) => ({ artista, titulo, ano: 1960, genero: 'jazz', nota: 80, motivo: `Porque ${titulo}.`, ...extra });
    const rica = {
        nome: '  Jazz,   fado   e companhia ', descricao: 'Gravações que mostram o som.', resumo, tendencias: ['  Reedição  Hi-Res ', '', 42, null, 'a', 'b', 'c', 'd', 'e', 'f', 'g'],
        opcoes: { faixas: 7, maxArtista: '3', estilo: 'descoberta', arco: 'sobe' },
        candidatas: [
            c('Miles Davis', 'So What', { ano: '1959', nota: '97.6', energia: 40, fixa: 1 }),
            c('miles davis', 'SO WHAT', { nota: 10 }),
            c('  Nina   Simone ', 'Feeling Good', { genero: 'Soul', ano: 1965, tendencia: 90, bpm: '120' }),
            c('Amália Rodrigues', 'Barco Negro', { genero: 'Fado', ano: 1955, isrc: 'usaaa0000105', album: 'Busto' }),
            c('Massive Attack', 'Teardrop', { genero: 'Trip-Hop', ano: 1998, tidalId: 106, energia: '' }),
            c('Daft Punk', 'Get Lucky', { genero: 'Electrónica', ano: 2013, nota: 88.5, energia: 101 }),
            ...[1, 2, 3, 4, 5, 6].map((i) => c('Miles Davis', `Faixa ${i}`, { nota: 70 + i, genero: i % 2 ? 'Jazz' : 'Bebop', ano: 1950 + i })),
            c('Ninguém', 'Não existe'), c('Faixa Fantasma', 'Também não', { isrc: 'XX' }),
        ],
    };
    igual(await ambos(rica, ['--ensaio']), 'ensaio');
    // um por artista: o motor não chega às 7 faixas — recusa (ou aceita menos com --aceitar-menos)
    const curta = { ...rica, opcoes: { faixas: 7, maxArtista: 1, estilo: 'audiofilo', arco: 'onda' } };
    const recusa = await ambos(curta, ['--ensaio']);
    igual(recusa, 'menos faixas');
    assert.match(recusa.onda.stderr, /só conseguiu 5 de 7/);
    igual(await ambos(curta, ['--ensaio', '--aceitar-menos']), 'aceitar menos');
    for (const estilo of ['equilibrado', 'moda', 'gosto', 'nenhum']) {
        for (const arco of ['plano', 'onda', 'desce']) igual(await ambos({ ...rica, opcoes: { ...rica.opcoes, estilo, arco } }, ['--ensaio']), `ensaio ${estilo}/${arco}`);
    }

    // sem letras explícitas: a versão limpa no lugar da explícita; a que só existe explícita fica de fora
    const limpa = { ...rica, opcoes: { ...rica.opcoes, limpa: true }, candidatas: [...rica.candidatas,
        c('Pop Teste', 'Canção Forte', { ano: 2025, genero: 'Pop' }), c('Pop Teste', 'Só Explícita', { ano: 2025, genero: 'Pop', tidalId: '109' })] };
    const l = await ambos(limpa, ['--ensaio']);
    igual(l, 'sem letras explícitas');
    assert.match(l.onda.stdout, /não encontradas: .*Pop Teste — Só Explícita/);
    if (/Canção Forte/.test(l.onda.stdout)) assert.match(l.onda.stdout, /Pop Teste — Canção Forte \(Clean Edit\)|Canção Forte · 2025/);

    // gravar: o mesmo documento na biblioteca (tirando o id e a hora) e o mesmo publicada.json
    const gravar = async (nome) => {
        const r = await script(nome, [f, '--modelo', 'modelo-paridade', '--sem-tidal']);
        assert.equal(r.code, undefined, r.stderr);
        const pub = JSON.parse(readFileSync(join(dir, 'publicada.json'), 'utf8'));
        const doc = JSON.parse(await env.KV.get('playlist:' + pub.id));
        const sem = (x) => { const y = { ...x }; delete y.id; delete y.criadaEm; delete y.atualizadaEm; return y; };
        return { stdout: r.stdout.replaceAll(pub.id, '<id>'), pub: sem(pub), doc: sem(doc), bruto: readFileSync(join(dir, 'publicada.json'), 'utf8').replaceAll(pub.id, '<id>').replace(/"criadaEm": "[^"]*"/g, '') };
    };
    writeFileSync(f, JSON.stringify(rica));
    const o = await gravar('publicar.mjs'), j = await gravar(join('js', 'publicar.mjs'));
    assert.equal(o.stdout, j.stdout);
    assert.deepEqual(o.doc, j.doc);
    assert.deepEqual(o.pub, j.pub);
    assert.equal(o.bruto, j.bruto, 'o publicada.json, ao byte');
    assert.equal(o.doc.modelo, 'modelo-paridade');
    assert.equal(o.doc.faixas.length, 7);
    // renovar a mesma playlist (a que se atualiza sozinha): as duas versões fazem o mesmo, no mesmo sítio
    const id = JSON.parse(readFileSync(join(dir, 'publicada.json'), 'utf8')).id;
    const renovarCom = async (nome) => {
        writeFileSync(f, JSON.stringify({ ...rica, opcoes: { ...rica.opcoes, estilo: 'gosto' } }));
        const r = await script(nome, [f, '--renovar', id, '--modelo', 'modelo-renovar', '--sem-tidal']);
        assert.equal(r.code, undefined, r.stderr);
        const d = JSON.parse(await env.KV.get('playlist:' + id));
        for (const k of ['criadaEm', 'renovadaEm', 'renovacoes', 'historico']) delete d[k];
        return { stdout: r.stdout, d };
    };
    const ro = await renovarCom('publicar.mjs'), rj = await renovarCom(join('js', 'publicar.mjs'));
    assert.equal(ro.stdout, rj.stdout);
    assert.match(ro.stdout, new RegExp(`Renovada: «Jazz, fado e companhia» \\(${id}\\)`));
    assert.deepEqual(ro.d, rj.d);
    assert.equal(ro.d.modelo, 'modelo-renovar');
    assert.equal(ro.d.opcoes.estilo, 'gosto');
    assert.equal(JSON.parse(await env.KV.get('playlist:' + id)).renovacoes, 2);
    // uma proposta (variante) de um pedido: só na app, à espera de ser escolhida
    writeFileSync(f, JSON.stringify(rica));
    const variante = async (nome) => {
        const r = await script(nome, [f, '--variante', 'Mais conhecida', '--modelo', 'm']);
        assert.equal(r.code, undefined, r.stderr);
        const pub = JSON.parse(readFileSync(join(dir, 'publicada.json'), 'utf8'));
        const d = JSON.parse(await env.KV.get('playlist:' + pub.id));
        for (const k of ['id', 'criadaEm']) delete d[k];
        return { stdout: r.stdout.replaceAll(pub.id, '<id>'), d };
    };
    const vo = await variante('publicar.mjs'), vj = await variante(join('js', 'publicar.mjs'));
    assert.equal(vo.stdout, vj.stdout);
    assert.deepEqual(vo.d, vj.d);
    assert.deepEqual([vo.d.rascunho, vo.d.variante, vo.d.tidal], [true, 'Mais conhecida', null]);
    assert.match(vo.stdout, /proposta «Mais conhecida», só na app/);
    // as ideias de pedidos: as duas versões guardam o mesmo
    const fi = join(dir, 'ideias.json');
    writeFileSync(fi, JSON.stringify({ ideias: [{ texto: 'Estrada ao sol, rock com energia', momento: 'dia', opcoes: { arco: 'sobe' } }, { texto: 'Condução à noite: synthwave', momento: 'noite' }, { texto: 'Clássicos portugueses' }] }));
    const ideias = async (nome) => { const r = await script(nome, [fi]); const x = JSON.parse(await env.KV.get('ideias')); delete x.geradasEm; return { ...r, x }; };
    const io = await ideias('ideias.mjs'), ij = await ideias(join('js', 'ideias.mjs'));
    assert.equal(io.code, undefined, io.stderr);
    assert.equal(io.stdout, ij.stdout);
    assert.equal(io.stdout, 'Ideias guardadas: 3 (de dia 1, de noite 1)\n');
    assert.deepEqual(io.x, ij.x);
    const semFicheiro = { onda: await script('ideias.mjs', []), js: await script(join('js', 'ideias.mjs'), []) };
    igual(semFicheiro, 'ideias sem ficheiro');
});

test('paridade: o normal() e a chave() da versão Onda são os do JavaScript (acentos, parênteses, « - ...», ruído de edição)', async () => {
    const { correr: maestro } = await import('../curador/correr.mjs');
    const { normal } = await import('../lib/tidal.js');
    const chave = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const casos = ['Amália Rodrigues', 'Simon & Garfunkel', 'So What (Remastered 2009)', 'Song - 2011 Remaster', 'Hello [Live]', 'Ça  va — bien', 'Björk',
        'Røyksopp', 'Łódź', 'İstanbul', 'Café del Mar - Deluxe Edition', 'Mono Stereo Mix', '1999 remastered version', 'Bonus Track', '(sem fecho', 'a ( b ) c [ d ] e',
        'x - y - z', 'x -y', 'x - y', 'A\n- b', 'linha (com\nquebra)', '  espaços   ', '', 'Ελληνικά', '😀 emoji', 'é combinado', 'Ｆｕｌｌ', 'Ǖǘ',
        'Remasterizado', 'remasterizada 2001', 'Kelvin K', 'Ṁṅ ẞ ẑ', 'R&B', 'Rock&Roll', 'a & & b', 'Tom Jobim [Ao Vivo] - Live', 'MÚSICA'];
    for (let c = 0xc0; c < 0x2ff; c += 3) casos.push(String.fromCodePoint(c) + 'x' + String.fromCodePoint(c + 1));
    for (let c = 0x1e00; c < 0x1eff; c += 2) casos.push(String.fromCodePoint(c, c + 1));
    let out = '';
    await new Promise((ok) => maestro('textos', casos, { saida: { 1: (u) => { out += Buffer.from(u).toString('utf8'); }, 2: () => {} }, sair: ok }));
    const linhas = out.trimEnd().split('\n').map((l) => JSON.parse(l));
    assert.equal(linhas.length, casos.length);
    casos.forEach((c, i) => assert.deepEqual(linhas[i].slice(0, 2), [normal(c), chave(c)], JSON.stringify(c)));
});
