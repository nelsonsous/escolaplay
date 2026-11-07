// Biblioteca partilhada: leitura do Tidal, correspondência de faixas, sinais para o motor e validação da proposta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segundos, camelot, camelotTexto, qualidadeSom, normal, correspondencia, melhor, faixas } from '../lib/tidal.js';
import { perfilGosto, sinais } from '../lib/sinais.js';
import { validarProposta, normalizarCandidatas, normalizarOpcoes } from '../lib/playlist.js';

test('durações ISO 8601 e roda de Camelot', () => {
    assert.equal(segundos('PT3M45S'), 225);
    assert.equal(segundos('PT1H2M3S'), 3723);
    assert.equal(segundos('PT9.5S'), 10);
    assert.equal(segundos('lixo'), 0);
    assert.equal(camelotTexto(camelot('C', 'MAJOR')), '8B');
    assert.equal(camelotTexto(camelot('A', 'MINOR')), '8A');
    assert.equal(camelotTexto(camelot('D', 'DORIAN')), '7A');
    assert.equal(camelotTexto(camelot('FSharp', 'MAJOR')), '2B');
    assert.equal(camelotTexto(camelot('Ab', 'AEOLIAN')), '1A');
    assert.equal(camelot('UNKNOWN', 'MAJOR'), 0);
    assert.equal(camelot('C', 'BLUES'), 0, 'escala ambígua: desconhecido');
    assert.equal(qualidadeSom(['HIRES_LOSSLESS', 'LOSSLESS']), 1000);
    assert.equal(qualidadeSom(['LOSSLESS', 'DOLBY_ATMOS']), 850);
    assert.equal(qualidadeSom([]), 350);
});

test('normalização e correspondência: estúdio antes do ao vivo, artista tem de bater', () => {
    assert.equal(normal('Dreams - 2004 Remaster'), 'dreams');
    assert.equal(normal('Águas de Março (Remasterizado)'), 'aguas de marco');
    assert.equal(normal('Simon & Garfunkel'), 'simon and garfunkel');
    const estudio = { titulo: 'Get Lucky', versao: 'Radio Edit', artistas: ['Daft Punk', 'Pharrell Williams'], tags: ['LOSSLESS'], popularidade: 900 };
    const vivo = { titulo: 'Get Lucky (Live)', versao: '', artistas: ['Daft Punk'], tags: [], popularidade: 400 };
    const outro = { titulo: 'Get Lucky', versao: '', artistas: ['Cover Band'], tags: ['HIRES_LOSSLESS'], popularidade: 999 };
    assert.equal(melhor({ artista: 'Daft Punk', titulo: 'Get Lucky' }, [vivo, outro, estudio]), estudio);
    assert.equal(melhor({ artista: 'Daft Punk', titulo: 'Get Lucky (Live)' }, [estudio, vivo]).titulo, 'Get Lucky (Live)', 'quando se pede ao vivo');
    assert.equal(melhor({ artista: 'Ninguém', titulo: 'Get Lucky' }, [estudio, vivo]), null);
    assert.equal(correspondencia({ artista: 'Daft Punk', titulo: 'Outra' }, estudio), 0);
});

test('faixas(): JSON:API com artistas, álbum e géneros incluídos', () => {
    const doc = {
        data: [{ id: '7', type: 'tracks', attributes: { title: 'Teardrop', isrc: 'GBAAA9800001', duration: 'PT5M30S', popularity: 0.7, bpm: 77.4, key: 'A', keyScale: 'MAJOR', mediaTags: ['LOSSLESS'] },
            relationships: { artists: { data: [{ id: 'm', type: 'artists' }] }, albums: { data: [{ id: 'al', type: 'albums' }] }, genres: { data: [{ id: 'g', type: 'genres' }] } } }],
        included: [{ id: 'm', type: 'artists', attributes: { name: 'Massive Attack' } }, { id: 'al', type: 'albums', attributes: { title: 'Mezzanine', releaseDate: '1998-04-20', mediaTags: ['HIRES_LOSSLESS'] } },
            { id: 'g', type: 'genres', attributes: { genreName: 'Trip-Hop' } }],
    };
    const f = faixas(doc).get('7');
    assert.deepEqual([f.titulo, f.artistas, f.album, f.ano, f.duracao, f.popularidade, f.bpm, camelotTexto(f.tom), f.generos], ['Teardrop', ['Massive Attack'], 'Mezzanine', 1998, 330, 700, 77, '11B', ['Trip-Hop']]);
    assert.ok(f.tags.includes('HIRES_LOSSLESS'), 'junta as etiquetas do álbum');
    assert.equal(f.url, 'https://tidal.com/browse/track/7');
});

test('sinais: gosto pelas favoritas, novidade, energia, ano original', () => {
    const g = perfilGosto({
        favoritas: [
            { id: '1', isrc: 'X1', artistas: ['Nina Simone'], generos: ['Soul'], ano: 1965 },
            { id: '2', artistas: ['Nina Simone'], generos: ['Soul'], ano: 1966 },
            { id: '3', artistas: ['Nina Simone'], generos: ['Jazz'], ano: 1959 },
        ],
        artistas: [{ nome: 'Miles Davis' }],
    });
    const fNina = { id: '1', isrc: 'X1', artistas: ['Nina Simone'], tags: ['LOSSLESS'], popularidade: 800, bpm: 0, tom: 0, ano: 2006, generos: [] };
    const s = sinais({ artista: 'Nina Simone', titulo: 'Feeling Good', ano: 1965, genero: 'soul', nota: 95, energia: 40 }, fNina, g);
    assert.equal(s.gosto, 1000);
    assert.equal(s.novidade, 150, 'já é favorita');
    assert.equal(s.ano, 1965, 'o ano original, não o da reedição');
    assert.equal(s.claude, 950);
    assert.equal(s.energia, 400);
    assert.equal(s.qualidade, 750);
    assert.equal(s.tendencia, 800);
    const miles = sinais({ artista: 'Miles Davis', titulo: 'So What' }, { id: '9', artistas: ['Miles Davis'], tags: [], popularidade: 0, bpm: 136, tom: 7, ano: 1959, generos: ['Jazz'] }, g);
    assert.equal(miles.gosto, 850, 'artista seguido');
    assert.equal(miles.novidade, 600);
    assert.equal(miles.energia, 691, 'energia estimada pelo bpm');
    assert.equal(miles.genero, 'Jazz', 'sem género do Claude, o do Tidal');
    const novo = sinais({ artista: 'Rosalía', titulo: 'Malamente', genero: 'soul' }, null, g);
    assert.equal(novo.gosto, 450, 'género de que gosta');
    assert.equal(novo.novidade, 1000);
    assert.equal(novo.qualidade, 0, 'sem faixa do Tidal');
});

test('proposta: normaliza, tira repetidas e valida o que a tarefa agendada tem de escrever', () => {
    const c = normalizarCandidatas([{ artist: ' Nina  Simone ', title: 'Feeling Good', year: '1965', note: 'Clássico.' }, { artista: 'nina simone', titulo: 'feeling good' },
        { artista: '', titulo: 'x' }, { artista: 'A', titulo: 'B', nota: 140, energia: -5, isrc: 'bad' }]);
    assert.equal(c.length, 2);
    assert.deepEqual(c[0], { artista: 'Nina Simone', titulo: 'Feeling Good', ano: 1965, motivo: 'Clássico.' });
    assert.equal(c[1].nota, 100);
    assert.equal(c[1].energia, 0);
    assert.equal(c[1].isrc, undefined);
    assert.deepEqual(normalizarOpcoes({ faixas: 500, maxArtista: 0, estilo: 'xpto', arco: 'sobe' }), { faixas: 100, maxArtista: 1, estilo: 'equilibrado', arco: 'sobe' });
    const base = { nome: 'Teste', descricao: 'd', resumo: 'r'.repeat(90), opcoes: { faixas: 5 } };
    const cand = (i) => ({ artista: `A${i}`, titulo: `T${i}`, ano: 1990, genero: 'pop', nota: 80, motivo: 'm' });
    assert.equal(validarProposta({ ...base, candidatas: Array.from({ length: 7 }, (_, i) => cand(i)) }, { strict: true }).ok, true);
    const curta = validarProposta({ ...base, candidatas: Array.from({ length: 5 }, (_, i) => cand(i)) }, { strict: true });
    assert.match(curta.errors.join(' '), /pelo menos 7/);
    const semNota = validarProposta({ ...base, candidatas: Array.from({ length: 7 }, (_, i) => ({ ...cand(i), nota: undefined })) }, { strict: true });
    assert.match(semNota.errors.join(' '), /sem "nota"/);
    assert.equal(validarProposta({ nome: 'x', candidatas: [cand(1)] }).ok, true, 'na app basta nome e candidatas');
    assert.equal(validarProposta(null).ok, false);
});
