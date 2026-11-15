// O índice para procurar produtos (volta 2). Os mapas do site das cadeias trazem o nome de cada produto no endereço
// («leite-uht-meio-gordo-mimosa-4421406») e o robots.txt deixa lê-los; a pesquisa dos sites, não. O Ecónomo
// (compras/economo/indice.mjs) faz daqui um texto por cadeia, guardado na KV; o conector procura nele (/api/procurar).
//
// O texto de uma cadeia: primeiro as categorias («#3\tmercearia/arroz-massa-e-leguminosas/massa»), depois uma linha
// por produto: nome \t número \t categoria («massa-esparguete-nacional\t10756\t3»). O endereço refaz-se com a regra
// da cadeia. Procurar é achar a palavra mais comprida da consulta com indexOf (rápido mesmo num texto de 3 MB) e só
// então ver a linha toda: o Worker grátis tem 10 ms de CPU por pedido.

export const CADEIAS = ['continente', 'pingodoce', 'auchan', 'lidl'];

// as categorias que não são de supermercado ficam de fora (o Continente não as põe no endereço: entra tudo)
const FORA = {
    auchan: new Set(['saude-e-bem-estar', 'papelaria-livraria-e-experiencias', 'casa-e-jardim', 'automovel-e-bricolage',
        'eletrodomesticos', 'tecnologia', 'brinquedos', 'viagem-desporto-e-outdoor', 'guarda-chuvas']),
    pingodoce: new Set(['casa-e-eletrodomesticos', 'livraria-e-papelaria']),
};

const REGRAS = {
    continente: {
        ler: (u) => { const m = u.match(/^https:\/\/www\.continente\.pt\/produto\/([a-z0-9-]+)-(\d+)\.html$/); return m && { nome: m[1], id: m[2], cat: '' }; },
        url: (p) => `https://www.continente.pt/produto/${p.nome}-${p.id}.html`,
    },
    pingodoce: {
        ler: (u) => { const m = u.match(/^https:\/\/www\.pingodoce\.pt\/home\/produtos\/((?:[^/?#\s]+\/)*)([a-z0-9-]+)-(\d+)\.html$/); return m && { nome: m[2], id: m[3], cat: m[1].replace(/\/$/, '') }; },
        url: (p) => `https://www.pingodoce.pt/home/produtos/${p.cat ? p.cat + '/' : ''}${p.nome}-${p.id}.html`,
    },
    auchan: {
        ler: (u) => { const m = u.match(/^https:\/\/www\.auchan\.pt\/pt\/((?:[^/?#\s]+\/)*)([a-z0-9-]+)\/(\d+)\.html$/); return m && { nome: m[2], id: m[3], cat: m[1].replace(/\/$/, '') }; },
        url: (p) => `https://www.auchan.pt/pt/${p.cat ? p.cat + '/' : ''}${p.nome}/${p.id}.html`,
    },
    lidl: {
        ler: (u) => { const m = u.match(/^https:\/\/www\.lidl\.pt\/p\/([a-z0-9-]+)\/p(\d+)$/); return m && { nome: m[1], id: m[2], cat: '' }; },
        url: (p) => `https://www.lidl.pt/p/${p.nome}/p${p.id}`,
    },
};

// o produto de um endereço do mapa do site (ou null: outro tipo de página, ou uma categoria que fica de fora)
export function produtoDoEndereco(cadeia, url) {
    const p = REGRAS[cadeia]?.ler(String(url).trim());
    if (!p) return null;
    if (p.cat && FORA[cadeia]?.has(p.cat.split('/')[0])) return null;
    return p;
}
export const endereco = (cadeia, p) => REGRAS[cadeia].url(p);

// os vinhos começam pelo nome da quinta («quinta-do-crasto-tinto»): entram por estas palavras
const VINHO = /(^|-)(tinto|branco|rose|vinho|espumante|moscatel)(-|$)/;
// a 1.ª palavra do nome de cada produto (o tipo: leite, arroz, detergente…), para o vocabulário de supermercado
export const tipoDoNome = (linha) => linha.slice(0, linha.search(/[-\t]|$/));
export function vocabulario(...textos) {
    const v = new Set();
    for (const t of textos) for (const l of t.split('\n')) if (l && l[0] !== '#') v.add(tipoDoNome(l));
    return v;
}

// o texto de uma cadeia, a partir dos endereços dos mapas do site (sem repetidos, pela ordem em que vêm). Com um
// vocabulário (os tipos de produto das cadeias que dizem a categoria), ficam só os produtos de supermercado: é o
// caso do Continente, que vende de tudo e não põe a categoria no endereço (100 mil produtos → metade).
export function montarIndice(cadeia, urls, { vocabulario: voc } = {}) {
    const cats = new Map(), linhas = [], vistos = new Set();
    for (const u of urls) {
        const p = produtoDoEndereco(cadeia, u);
        if (!p || vistos.has(p.id)) continue;
        if (voc && !voc.has(tipoDoNome(p.nome)) && !VINHO.test(p.nome)) continue;
        vistos.add(p.id);
        let c = '';
        if (p.cat) {
            if (!cats.has(p.cat)) cats.set(p.cat, cats.size);
            c = String(cats.get(p.cat));
        }
        linhas.push(`${p.nome}\t${p.id}\t${c}`);
    }
    return [...[...cats].map(([cat, i]) => `#${i}\t${cat}`), ...linhas].join('\n') + '\n';
}

// as categorias de um texto (lê só as linhas «#» do início)
function categorias(texto) {
    const cats = [];
    let i = 0;
    while (texto.charCodeAt(i) === 35) { // '#'
        const fim = texto.indexOf('\n', i);
        const [n, cat] = texto.slice(i + 1, fim).split('\t');
        cats[Number(n)] = cat;
        i = fim + 1;
    }
    return cats;
}

const PARAGEM = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'para', 'p', 'a', 'o', 'em', 'kg', 'g', 'gr', 'l', 'lt', 'ml', 'un']);
// «2 Leites meio-gordo» → ['leite', 'meio', 'gordo']: minúsculas, sem acentos, sem números nem palavras curtas,
// e no singular (pães → pao, limões → limao, leites → leite)
export function palavras(consulta) {
    return String(consulta ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .split(/[^a-z0-9]+/).filter((w) => w && !/^\d/.test(w) && !PARAGEM.has(w))
        .map((w) => w.replace(/(oes|aes)$/, 'ao').replace(/^(.{3,}?)s$/, '$1'));
}

// até n produtos da cadeia cujo nome tem todas as palavras da consulta no começo de uma palavra sua (ovo acha
// «ovos», não «novo»). Primeiro os que começam pela 1.ª palavra pedida e os de nome mais curto (o produto simples).
// a palavra w está no nome a começar uma palavra dele (depois do início ou de um «-»)?
function temPalavra(nome, w) {
    for (let j = nome.indexOf(w); j >= 0; j = nome.indexOf(w, j + 1)) if (j === 0 || nome.charCodeAt(j - 1) === 45) return true;
    return false;
}
const MAX_OCORRENCIAS = 6000;

// Primeiro os nomes que começam pela 1.ª palavra pedida («leite-…» antes de «chocolate-de-leite-…»), e entre eles os
// mais curtos (o produto simples). Procura-se primeiro só nos começos de linha («\nleite»): quase sempre chega, e
// é rápido; só se não chegar se vê o resto (a palavra mais comprida, em qualquer sítio do nome).
export function procurar(cadeia, texto, consulta, n = 6) {
    const ws = palavras(consulta);
    if (!ws.length || !texto) return [];
    const melhores = []; // os n melhores até agora, por pontos (menos é melhor) e nome
    const vistas = new Set();
    const pior = () => melhores[n - 1];
    const considera = (ini, penal) => {
        if (vistas.has(ini) || texto.charCodeAt(ini) === 35) return; // já vista, ou uma categoria
        const tab = texto.indexOf('\t', ini);
        if (tab < 0) return;
        vistas.add(ini);
        const nome = texto.slice(ini, tab);
        // o mesmo nome noutro tamanho só aparece uma vez (o tamanho e o preço vêm com o preço, na volta 3)
        if (!ws.every((w) => temPalavra(nome, w)) || melhores.some((m) => m.nome === nome)) return;
        let tracos = 0;
        for (let k = 0; k < nome.length; k++) if (nome.charCodeAt(k) === 45) tracos++;
        const pontos = tracos + 1 + penal;
        if (melhores.length === n && (pontos > pior().pontos || (pontos === pior().pontos && nome >= pior().nome))) return;
        const fim = texto.indexOf('\n', tab);
        melhores.push({ nome, pontos, resto: texto.slice(tab + 1, fim < 0 ? undefined : fim) });
        melhores.sort((a, b) => a.pontos - b.pontos || (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0));
        if (melhores.length > n) melhores.pop();
    };
    // 1) os nomes que começam pela 1.ª palavra
    if (texto.startsWith(ws[0])) considera(0, 0);
    const inicio = '\n' + ws[0];
    for (let i = texto.indexOf(inicio); i >= 0; i = texto.indexOf(inicio, i + 1)) considera(i + 1, 0);
    // 2) se não chegou: a palavra mais comprida em qualquer sítio do nome, a começar uma palavra dele
    if (melhores.length < n) {
        const ancora = ws.reduce((a, w) => (w.length > a.length ? w : a), '');
        let ocorrencias = 0;
        for (let i = texto.indexOf(ancora); i >= 0 && ocorrencias < MAX_OCORRENCIAS; i = texto.indexOf(ancora, i + 1)) {
            ocorrencias++;
            const antes = i === 0 ? 10 : texto.charCodeAt(i - 1);
            if (antes !== 10 && antes !== 45) continue; // depois de \n ou de -
            const ini = texto.lastIndexOf('\n', i - 1) + 1;
            const tab = texto.indexOf('\t', ini);
            if (tab < 0 || i > tab) continue; // não está no nome
            considera(ini, 1000);
        }
    }
    if (!melhores.length) return [];
    const cats = categorias(texto);
    return melhores.map((p) => {
        const [id, c] = p.resto.split('\t');
        return { id, nome: legivel(p.nome), url: endereco(cadeia, { nome: p.nome, id, cat: c ? cats[Number(c)] ?? '' : '' }) };
    });
}

// «leite-uht-meio-gordo-mimosa» → «Leite uht meio gordo mimosa»
export function legivel(nome) {
    const t = String(nome).replace(/-/g, ' ');
    return t.charAt(0).toUpperCase() + t.slice(1);
}
