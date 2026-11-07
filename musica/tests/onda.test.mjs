// O motor de curadoria (curador.onda): regras da escolha e da ordem, e o juiz — o WASM (app, Worker,
// tarefa agendada) e o binário nativo (C gerado pela Onda, compilado com gcc) têm de dar o mesmo, ao bit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { correr, entrada, saida, curar } from '../onda/onda.js';
import { procurarCompilador, ondac } from '../onda/compilar.mjs';

const ONDA = new URL('../onda/', import.meta.url).pathname;
const wasm = readFileSync(join(ONDA, 'curador.wasm'));

// gerador determinístico (os testes dão sempre o mesmo)
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
const GEN = ['jazz', 'soul', 'rock', 'fado', 'pop', 'hip-hop', 'electronica', 'funk', ''];
function aleatorias(n, seed) {
    const r = rng(seed), int = (a, b) => a + Math.floor(r() * (b - a + 1));
    return Array.from({ length: n }, (_, i) => ({
        artista: `Artista ${int(0, Math.max(1, Math.floor(n / 3)))}`, genero: GEN[int(0, GEN.length - 1)],
        ano: r() < 0.1 ? 0 : int(1950, 2025), gosto: int(0, 1000), qualidade: [350, 750, 1000][int(0, 2)],
        tendencia: int(0, 1000), claude: int(300, 1000), novidade: int(0, 1000), energia: int(0, 1000),
        bpm: r() < 0.3 ? 0 : int(60, 180), tom: r() < 0.3 ? 0 : int(1, 24), fixa: r() < 0.05, i,
    }));
}

let nativo = null;
function binarioNativo() {
    if (nativo !== null) return nativo;
    try {
        const dir = mkdtempSync(join(tmpdir(), 'onda-'));
        execFileSync('gcc', ['-O2', '-o', join(dir, 'curador'), join(ONDA, 'curador.c'), '-lm'], { stdio: 'pipe' });
        nativo = join(dir, 'curador');
    } catch { nativo = false; }
    return nativo;
}

// o anfitrião oficial da Onda (onda/wasm/host.js, Node) — a terceira forma, quando o repositório o tem
const HOST_OFICIAL = join(ONDA, '..', '..', 'onda', 'wasm', 'host.js');

test('juiz: o WASM (no anfitrião da app e no oficial da Onda) e o binário nativo dão o mesmo, ao bit', { skip: !binarioNativo() && 'sem gcc' }, async () => {
    const casos = [[0, 0, 1], [1, 1, 2], [5, 3, 3], [12, 8, 4], [30, 20, 5], [60, 30, 6], [90, 40, 7]];
    for (const [n, k, seed] of casos) {
        for (const op of [{ k, maxArtista: 2, arco: 'onda' }, { k, maxArtista: 1, estilo: 'moda', arco: 'sobe' }, { k, maxArtista: 0, estilo: 'audiofilo', arco: 'plano' }]) {
            const inp = entrada(op, aleatorias(n, seed));
            const w = await correr(wasm, inp);
            const c = execFileSync(binarioNativo(), { input: inp }).toString();
            assert.equal(w.code, 0);
            assert.equal(w.text, c, `n=${n} k=${k} ${JSON.stringify(op)}`);
            if (existsSync(HOST_OFICIAL)) {
                const o = execFileSync(process.execPath, [HOST_OFICIAL, join(ONDA, 'curador.wasm')], { input: inp }).toString();
                assert.equal(o, w.text, `anfitrião oficial · n=${n} k=${k}`);
            }
        }
    }
});

test('escolhe K, sem repetir, com as fixas e o máximo por artista', async () => {
    const cands = aleatorias(60, 11);
    for (const maxArtista of [1, 2, 3]) {
        const { ordem } = await curar(wasm, { k: 25, maxArtista }, cands);
        // capacidade: as fixas entram todas; cada artista dá no máximo maxArtista (as fixas contam)
        const por = {};
        for (const c of cands) { const a = (por[c.artista] ||= { fixas: 0, livres: 0 }); c.fixa ? a.fixas++ : a.livres++; }
        const capacidade = Object.values(por).reduce((s, a) => s + a.fixas + Math.max(0, Math.min(a.livres, maxArtista - a.fixas)), 0);
        assert.equal(ordem.length, Math.min(25, capacidade), `máx. ${maxArtista} por artista`);
        assert.equal(new Set(ordem.map((o) => o.i)).size, ordem.length, 'sem repetidas');
        const fixas = cands.filter((c) => c.fixa).map((c) => c.i);
        for (const f of fixas) assert.ok(ordem.some((o) => o.i === f), `a fixa ${f} entra`);
        const porArtista = {};
        for (const o of ordem) if (!cands[o.i].fixa) porArtista[cands[o.i].artista] = (porArtista[cands[o.i].artista] || 0) + 1;
        assert.ok(Math.max(...Object.values(porArtista)) <= maxArtista, `máx. ${maxArtista} por artista`);
        for (const o of ordem) assert.ok(o.pontos >= 0 && o.pontos <= 1000 && o.motivo);
    }
});

test('a pontuação manda: com tudo igual, escolhe as melhores', async () => {
    const cands = Array.from({ length: 10 }, (_, i) => ({ artista: `A${i}`, genero: 'jazz', ano: 1960, gosto: 500, qualidade: 750, tendencia: 500, claude: i * 100, novidade: 500, energia: 500 }));
    const { ordem } = await curar(wasm, { k: 3, maxArtista: 1, pesos: { gosto: 0, qualidade: 0, tendencia: 0, claude: 1000, novidade: 0 }, penalizacoes: { artista: 0, genero: 0, decada: 0 }, arco: 'plano' }, cands);
    assert.deepEqual(ordem.map((o) => o.i).sort((a, b) => a - b), [7, 8, 9]);
    assert.ok(ordem.every((o) => o.motivo === 'claude'));
});

test('diversidade: penalizar o género espalha os géneros', async () => {
    // metade jazz com nota um pouco melhor; com a penalização de género, entram outros géneros
    const cands = Array.from({ length: 20 }, (_, i) => ({ artista: `A${i}`, genero: i < 10 ? 'jazz' : ['rock', 'soul', 'pop', 'fado', 'funk'][i % 5], ano: 1970, gosto: 500, qualidade: 750, tendencia: 500, claude: i < 10 ? 900 : 800, novidade: 500, energia: 500 }));
    const sem = await curar(wasm, { k: 10, penalizacoes: { artista: 0, genero: 0, decada: 0 }, arco: 'plano' }, cands);
    const com = await curar(wasm, { k: 10, penalizacoes: { artista: 0, genero: 600, decada: 0 }, arco: 'plano' }, cands);
    const jazz = (r) => r.ordem.filter((o) => cands[o.i].genero === 'jazz').length;
    assert.equal(jazz(sem), 10);
    assert.ok(jazz(com) <= 6, `com penalização: ${jazz(com)} de 10 são jazz`);
});

test('ordem: o arco "onda" sobe até ao pico e desce no fim; o mesmo artista não fica seguido', async () => {
    const r = rng(5);
    const cands = Array.from({ length: 24 }, (_, i) => ({ artista: `A${i % 12}`, genero: 'pop', ano: 2000, gosto: 500, qualidade: 750, tendencia: 500, claude: 800, novidade: 500, energia: Math.floor(r() * 1000), bpm: 0, tom: 0 }));
    const { ordem } = await curar(wasm, { k: 24, maxArtista: 2, arco: 'onda' }, cands);
    const e = ordem.map((o) => cands[o.i].energia);
    const media = (a) => a.reduce((s, x) => s + x, 0) / a.length;
    const inicio = media(e.slice(0, 4)), pico = media(e.slice(13, 18)), fim = media(e.slice(-3));
    assert.ok(pico > inicio + 150 && pico > fim + 150, `energia início ${inicio}, pico ${pico}, fim ${fim}`);
    for (let p = 1; p < ordem.length; p++) assert.notEqual(cands[ordem[p].i].artista, cands[ordem[p - 1].i].artista, `posição ${p}`);
});

test('ordem: bpm e tom compatíveis ficam juntos (roda de Camelot)', async () => {
    // dois grupos: 90 bpm em 8A/9A e 128 bpm em 3B/4B; sem arco, a ordem não deve saltar entre grupos mais do que 1 vez
    const cands = [];
    for (let i = 0; i < 6; i++) cands.push({ artista: `L${i}`, genero: 'soul', ano: 1975, gosto: 500, qualidade: 750, tendencia: 500, claude: 800, novidade: 500, energia: 400, bpm: 88 + i, tom: 8 + (i % 2) });
    for (let i = 0; i < 6; i++) cands.push({ artista: `R${i}`, genero: 'soul', ano: 1975, gosto: 500, qualidade: 750, tendencia: 500, claude: 800, novidade: 500, energia: 400, bpm: 126 + i, tom: 15 + (i % 2) });
    const { ordem } = await curar(wasm, { k: 12, maxArtista: 1, arco: 'plano' }, cands);
    let saltos = 0;
    for (let p = 1; p < ordem.length; p++) if (cands[ordem[p].i].artista[0] !== cands[ordem[p - 1].i].artista[0]) saltos++;
    assert.equal(saltos, 1);
});

test('casos limite: vazia, K maior do que N, K = 0, formato errado', async () => {
    assert.deepEqual(await curar(wasm, { k: 5 }, []), { ordem: [], custo: 0 });
    const tres = aleatorias(3, 9).map((c) => ({ ...c, fixa: false }));
    assert.equal((await curar(wasm, { k: 10, maxArtista: 0 }, tres)).ordem.length, 3);
    assert.equal((await curar(wasm, { k: 0 }, tres)).ordem.length, 0);
    const r = await correr(wasm, '2\n');
    assert.equal(r.code, 2);
    assert.match(r.text, /formato desconhecido/);
    assert.throws(() => saida('3\n1 1 1\n'), /esperava/);
});

test('curador.wasm e curador.c correspondem a curador.onda (compilador do repositório)', { skip: !procurarCompilador() && 'sem o compilador Onda' }, async () => {
    const fonte = readFileSync(join(ONDA, 'curador.onda'), 'utf8');
    assert.ok(existsSync(join(ONDA, 'curador.c')));
    assert.equal(Buffer.compare(await ondac(procurarCompilador(), fonte, ['-w']), wasm), 0, 'curador.wasm desatualizado: corre npm run onda');
    assert.equal(Buffer.compare(await ondac(procurarCompilador(), fonte, []), readFileSync(join(ONDA, 'curador.c'))), 0, 'curador.c desatualizado: corre npm run onda');
});
