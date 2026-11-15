// As receitas a partir de uma ligação ou de um texto (ciclo 3): as fontes aceites, a leitura simples das linhas, a
// legenda lida no telemóvel, o oEmbed sem legenda (o TikTok num centro de dados), a IA e a KV.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fonteDe, ingredientesSimples, arrumarIngredientes, lerReceita } from '../proxy/src/receita.js';
import { kv } from './kv.mjs';

const fetchReal = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchReal; });
const LEGENDA = 'Bacalhau com Natas 😍 Lista de ingredientes: - 1-2 postas de bacalhau - 1 L leite - 100 gr manteiga #bacalhau';

test('as fontes: TikTok e YouTube em https, sem o «?…» da partilha; o resto não', () => {
    assert.deepEqual(fonteDe('https://www.tiktok.com/@terapianofogo/video/7316138102043479329?is_from_webapp=1&sender_device=pc')?.url, 'https://www.tiktok.com/@terapianofogo/video/7316138102043479329');
    assert.equal(fonteDe('https://vm.tiktok.com/ZMabc123/')?.k, 'tiktok');
    assert.equal(fonteDe('https://youtu.be/abc')?.k, 'youtube');
    assert.equal(fonteDe('http://www.tiktok.com/@a/video/1'), null);
    assert.equal(fonteDe('https://www.instagram.com/reel/abc/'), null);
    assert.equal(fonteDe('não é um link'), null);
});

test('sem IA: as linhas que parecem ingredientes, sem as hashtags, e sem repetidos', () => {
    const l = ingredientesSimples('Bacalhau com natas\n- 2 postas de bacalhau\n• 1 L leite\n- 100 g de manteiga #receita\nBom apetite!');
    assert.deepEqual(l.map((i) => i.t), ['postas de bacalhau', 'leite', 'manteiga']);
    assert.deepEqual(arrumarIngredientes([{ t: 'Ovos' }, { t: 'ovos.' }, { t: 'Natas', n: '200 ml' }, { t: 'x' }]), [{ t: 'ovos', n: '' }, { t: 'natas', n: '200 ml' }]);
});

test('ler: a legenda do telemóvel vai à IA e fica na KV; o oEmbed sem legenda diz-o; o texto colado também se lê', async () => {
    const perguntas = [];
    const env = { KV: kv({}), AI: { run: async (m, o) => { perguntas.push(o.messages[1].content); return { response: '{"prato":"Bacalhau com natas","ingredientes":[{"t":"bacalhau","n":"2 postas"},{"t":"leite","n":"1 L"},{"t":"manteiga","n":"100 g"}]}' }; } } };
    globalThis.fetch = async () => { throw new Error('não devia pedir'); };
    const url = 'https://www.tiktok.com/@terapianofogo/video/7316138102043479329';
    const r = await lerReceita(env, { url, legenda: LEGENDA, autor: 'Terapia no Fogo' });
    assert.equal(r.prato, 'Bacalhau com natas');
    assert.deepEqual(r.ingredientes.map((i) => i.t), ['bacalhau', 'leite', 'manteiga']);
    assert.equal(r.como, 'ia');
    assert.equal((await lerReceita(env, { url })).guardada, 1); // da KV, sem perguntar outra vez
    assert.equal(perguntas.length, 1);
    // o oEmbed do TikTok sem o título (como responde a um centro de dados)
    globalThis.fetch = async () => new Response(JSON.stringify({ version: '1.0', type: 'video', provider_name: 'TikTok' }), { status: 200 });
    const s = await lerReceita(env, { url: 'https://www.tiktok.com/@outro/video/1' });
    assert.equal(s.semLegenda, 1);
    assert.deepEqual(s.ingredientes, []);
    // e com o título (o YouTube dá só o título)
    globalThis.fetch = async (u) => { assert.match(String(u), /youtube\.com\/oembed/); return new Response(JSON.stringify({ title: LEGENDA, author_name: 'Canal' }), { status: 200 }); };
    const y = await lerReceita({ KV: kv({}) }, { url: 'https://www.youtube.com/watch?v=x' });
    assert.equal(y.como, 'linhas');
    assert.deepEqual(y.ingredientes.map((i) => i.t), ['postas de bacalhau', 'leite', 'manteiga']); // a legenda numa linha só, com « - »
    // o texto colado
    const t = await lerReceita({ KV: kv({}) }, { texto: '- 3 ovos\n- 200 ml natas' });
    assert.deepEqual(t.ingredientes.map((i) => i.t), ['ovos', 'natas']);
    await assert.rejects(lerReceita(env, { url: 'https://exemplo.pt/receita' }), /TikTok/);
});
