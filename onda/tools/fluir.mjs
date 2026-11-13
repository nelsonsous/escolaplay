#!/usr/bin/env node
// fluir.mjs — passa código Onda do estilo antigo para a Onda fluida (it.141), sem lhe mudar o significado.
//
//   node onda/tools/fluir.mjs [--ver] contexto.onda… -- alvo.onda…
//
// Os ficheiros de contexto dão as assinaturas (a biblioteca e o que vem antes na montagem); os alvos são reescritos
// no sítio (com --ver só diz o que mudaria). O que faz, sempre com o mesmo significado:
//   "<b class=\"x\">" esc n "</b>"         →  `<b class="x">{ esc n }</b>`      (moldes: textos e código da mesma linha)
//   _ar_get c $"nome"  ·  sg $"k"          →  c.nome  ·  es.k                   (o ponto; os atalhos vêm em --atalho sg=es)
//   _ar_ps n 1, _ar_verd n, _ar_eqt n t…   →  esc n, ha n, eh n t…              (a fala, se lib/fala.onda está no contexto)
//   ? c { a b 0 } 0                        →  Se c { a b }                      (quando o valor não conta ou é sempre 0)
//   = i 0 W < i n { a = i + i 1 }          →  L i n { a }                       (n literal ou um local que o corpo não muda)
// Não mexe no que não reconhece, nos comentários nem no espaçamento à volta. Correr duas vezes dá o mesmo.
import { readFileSync, writeFileSync } from 'node:fs';

const WS = (c) => c === 32 || c === 9 || c === 10 || c === 13;
const FIM = (c) => WS(c) || c === 123 || c === 125 || c === 40 || c === 41 || Number.isNaN(c);

// ---------- tokens crus, com a posição: um molde inteiro e um nome com pontos são um token só ----------
// Com visita, chama-a também para cada palavra e cada texto constante que está dentro de uma interpolação de um molde
// (visita(tipo, texto): 'name' ou 'tc'), que no resultado não são tokens à parte.
export function tokens(src, visita) {
  const t = [], n = src.length;
  const texto = (s) => { const q = src.charCodeAt(s); let j = s + 1; while (j < n && src.charCodeAt(j) !== q) { if (src.charCodeAt(j) === 92) j++; j++; } if (j >= n) throw new Error('texto sem fim'); return j + 1; };
  // um nome acaba também numa crase: f`…` é um molde com nome (o molde, colado, é o 1.º argumento de f)
  const eNm = (c) => (c >= 97 && c <= 122) || c === 95;
  const palavra = (s) => { const nm = eNm(src.charCodeAt(s)); let j = s + 1; if (src.charCodeAt(s) === 39 && j < n) j++; while (j < n && !FIM(src.charCodeAt(j)) && !(nm && src.charCodeAt(j) === 96)) j++; return j; };
  // o código de uma interpolação, até à } que a fecha (devolve o índice a seguir a ela)
  const interp = (s) => {
    let j = s, pf = 0;
    for (;;) {
      if (j >= n) throw new Error('falta a } de uma interpolação');
      const c = src.charCodeAt(j), c1 = src.charCodeAt(j + 1);
      if (WS(c)) j++;
      else if (c === 35) { while (j < n && src.charCodeAt(j) !== 10) j++; }
      else if (c === 34) j = texto(j);
      else if (c === 96) j = molde(j);
      else if (c === 36 && (c1 === 34 || c1 === 96)) { const e = texto(j + 1); if (visita) visita('tc', src.slice(j, e)); j = e; }
      else if (c === 125 && pf === 0) return j + 1;
      else if (c === 123 || c === 125) { pf += c === 123 ? 1 : -1; j++; }
      else if (c === 40 || c === 41) j++;
      else { const e = palavra(j); if (visita) visita('name', src.slice(j, e)); j = e; }
    }
  };
  const molde = (s) => {
    let j = s + 1;
    for (;;) {
      if (j >= n) throw new Error('molde sem fim');
      const c = src.charCodeAt(j);
      if (c === 92) j += 2; else if (c === 96) return j + 1; else if (c === 123) j = interp(j + 1); else j++;
    }
  };
  let i = 0;
  const poe = (k, s, e) => t.push({ k, x: src.slice(s, e), s, e });
  while (i < n) {
    const c = src.charCodeAt(i), c1 = src.charCodeAt(i + 1);
    if (WS(c)) { i++; continue; }
    if (c === 35) { while (i < n && src.charCodeAt(i) !== 10) i++; continue; }
    if (c === 34) { const e = texto(i); poe('str', i, e); i = e; continue; }
    if (c === 96) { const e = molde(i); poe('tpl', i, e); i = e; continue; }
    if (c === 36 && (c1 === 34 || c1 === 96)) { const e = texto(i + 1); poe('tc', i, e); i = e; continue; }
    if (c === 123 || c === 125 || c === 40 || c === 41) { poe('op', i, i + 1); i++; continue; }
    const e = palavra(i), x = src.slice(i, e);
    const dg = (ch) => ch >= 48 && ch <= 57;
    let k;
    if (dg(c) || (c === 45 && e - i > 1 && dg(c1))) k = x.includes('.') ? 'real' : 'int';
    else if (c === 39) k = 'chr';
    else if ((c >= 97 && c <= 122) || c === 95) k = x.includes('.') ? 'dot' : 'name';
    else k = 'op';
    poe(k, i, e); i = e;
  }
  return t;
}

// todas as palavras e todos os textos constantes de um programa, também os de dentro dos moldes: [{ k: 'name' | 'tc', x }]
// (para quem monta um programa e precisa de saber que nomes ele usa: mercados/conselheiro/onda/build.mjs)
export function palavras(src) {
  const out = [];
  for (const t of tokens(src, (k, x) => out.push({ k, x }))) if (t.k === 'name' || t.k === 'dot' || t.k === 'tc') out.push({ k: t.k === 'tc' ? 'tc' : 'name', x: t.x });
  return out;
}
// o conteúdo de um texto constante ($"…" ou $`…`), sem os escapes
export function conteudo(tc) {
  const cru = tc[1] === '`', m = tc.slice(2, -1);
  return m.replace(/\\(.)/gs, (_, c) => (c === 'n' ? '\n' : c === 't' ? '\t' : c));
}

// ---------- as funções (nome → aridade, parâmetros e onde começa o corpo) ----------
function definicoes(T, F, fich) {
  const fs = [];
  for (let i = 0; i < T.length; i++) {
    if (T[i].k !== 'op' || T[i].x !== ':') continue;
    const nome = T[i + 1].x, sig = T[i + 2].x, g = sig.indexOf('>');
    if (g < 0) throw new Error(`${fich}: assinatura inválida de ${nome}`);
    const f = { nome, n: g, par: T.slice(i + 3, i + 3 + g).map((t) => t.x), em: i + 3 + g, fim: T.length, fich };
    if (fs.length) fs[fs.length - 1].fim = i;
    fs.push(f);
    if (F.has(nome)) throw new Error(`${fich}: função repetida ${nome} (também em ${F.get(nome).fich})`);
    F.set(nome, f);
    i += 2 + g;
  }
  return fs;
}

const AR = new Map();
for (const o of ['+', '-', '*', '/', '%', '&', '|', '^', '<<', '>>', '<', '>', '<=', '>=', '==', '!=', '&&', '||', 'Mn', 'Mx', 'Pw', 'At', 'Bw', '!', '!f', 'Av', 'Oc', 'Rb', 'W', 'Se']) AR.set(o, 2);
for (const o of ['~', 'F', 'I', 'Sq', 'Sn', 'Cs', 'Ex', 'Lg', 'Fl', 'Ab', 'Bh', 'Bl', '@', '@f', 'A', 'P', 'N', 'G', 'X', 'O', 'K']) AR.set(o, 1);
for (const o of ['R', 'T', 'Ac', 'Kc']) AR.set(o, 0);
AR.set('?', 3); AR.set('Y', 3);

// ---------- o corpo de uma função em árvore: cada nó sabe o primeiro e o último token (a, z) ----------
function arvore(T, f, F) {
  let pos = f.em;
  const loc = new Set(f.par), todos = new Set(f.par);
  const ex = () => {
    if (pos >= f.fim) throw new Error(`fim inesperado em ${f.nome}`);
    const i = pos++, t = T[i];
    const folha = { k: 'folha', t, a: i, z: i, kids: [] };
    if (t.k !== 'name' && t.k !== 'op') return folha;
    if (t.k === 'name') {
      if (loc.has(t.x)) return folha;
      const g = F.get(t.x);
      if (!g) throw new Error(`nome desconhecido em ${f.nome}: ${t.x}`);
      const kids = [];
      for (let j = 0; j < g.n; j++) kids.push(ex());
      return { k: 'cham', nome: t.x, t, a: i, z: kids.length ? kids[kids.length - 1].z : i, kids };
    }
    const o = t.x;
    if (o === '{') {
      const kids = [];
      for (;;) { if (pos >= f.fim) throw new Error(`falta } em ${f.nome}`); if (T[pos].k === 'op' && T[pos].x === '}') break; kids.push(ex()); }
      return { k: 'bloco', t, a: i, z: pos++, kids };
    }
    if (o === '(') {
      const e = ex();
      if (pos >= f.fim || T[pos].x !== ')') throw new Error(`falta ) em ${f.nome}`);
      return { k: 'par', t, a: i, z: pos++, kids: [e] };
    }
    if (o === '=') {
      const nt = T[pos++];
      if (!nt || nt.k !== 'name') throw new Error(`= precisa de nome em ${f.nome}`);
      const e = ex();
      loc.add(nt.x); todos.add(nt.x);
      return { k: 'poe', nome: nt.x, t, a: i, z: e.z, kids: [e] };
    }
    if (o === 'L') {
      const nt = T[pos++];
      if (!nt || nt.k !== 'name') throw new Error(`L precisa de nome em ${f.nome}`);
      const lim = ex();
      loc.add(nt.x); todos.add(nt.x);
      const b = ex();
      return { k: 'ciclo', nome: nt.x, t, a: i, z: b.z, kids: [lim, b] };
    }
    if (o === 'E' || o === 'S' || o === 'D') {
      const antes = o === 'S' ? 1 : 2, kids = [];
      for (let j = 0; j < antes; j++) kids.push(ex());
      const ft = T[pos++], g = ft && F.get(ft.x);
      if (!g) throw new Error(`${o} precisa de uma função em ${f.nome}`);
      for (let j = o === 'D' ? 2 : 1; j < g.n; j++) kids.push(ex());
      return { k: 'op', o, t, a: i, z: kids.length > antes ? kids[kids.length - 1].z : pos - 1, kids };
    }
    if (!AR.has(o)) throw new Error(`operador que o fluir não conhece em ${f.nome}: ${o}`);
    const kids = [];
    for (let j = 0; j < AR.get(o); j++) kids.push(ex());
    return { k: 'op', o, t, a: i, z: kids.length ? kids[kids.length - 1].z : i, kids };
  };
  const raiz = ex();
  if (pos !== f.fim) throw new Error(`tokens a mais em ${f.nome}`);
  return { raiz, todos };
}

// ---------- a fala: os nomes da biblioteca que têm uma palavra curta ----------
const FALA = new Map([['_ar_verd', 'ha'], ['_ar_eqt', 'eh'], ['_ar_igual', 'igual'], ['_ar_vnum', 'num'], ['_ar_txt', 'txt'], ['_ar_tipo', 'tipo'],
  ['_ar_prim', 'pri'], ['_ar_prox', 'seg'], ['_ar_n', 'quantos'], ['_ar_idx', 'idx'], ['_nu_fin', 'fin'], ['_tx_igual', 'mesmo'], ['_tx_html', 'esct'], ['_tx_p', 'crut']]);
const CHAVE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const eInt = (n, v) => n.k === 'folha' && n.t.k === 'int' && n.t.x === v;
const eNome = (n, nome) => n.k === 'folha' && n.t.k === 'name' && n.t.x === nome;
const dentro = (t) => t.x.slice(t.k === 'tc' ? 2 : 1, -1);
// o texto de um "..." como texto de um molde: as aspas deixam de se escapar; as chavetas e a crase passam a escapar-se
function paraMolde(s, chavetas) {
  let o = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') { const d = s[++i]; o += d === '"' ? '"' : '\\' + d; } else if (c === '`') o += '\\`'; else if (chavetas && (c === '{' || c === '}')) o += '\\' + c; else o += c;
  }
  return o;
}
const temAspas = (s) => /\\"/.test(s.replace(/\\\\/g, ''));

export function fluir(src, fich, F, op) {
  const T = tokens(src);
  const fs = [...F.values()].filter((f) => f.fich === fich).sort((a, b) => a.em - b.em);
  const edits = [];
  const conta = { moldes: 0, pontos: 0, fala: 0, se: 0, ciclos: 0, zeros: 0 };
  for (const f of fs) {
    const { raiz, todos } = arvore(T, f, F);
    const gap = (a, b) => src.slice(T[a].e, T[b].s);
    const poeEm = (n, nome) => (n.k === 'poe' || n.k === 'ciclo') && n.nome === nome ? true : n.kids.some((k) => poeEm(k, nome));
    const falaOk = (w) => op.fala && !todos.has(w);
    // a.b.c se n é uma cadeia de _ar_get com chaves fixas a partir de um local, de uma função sem argumentos ou de um atalho
    const ponto = (n) => {
      if (n.k === 'folha' && (n.t.k === 'name' || n.t.k === 'dot')) return n.t.x;
      if (n.k === 'cham' && n.kids.length === 0) return n.nome;
      const chave = (k) => (k.k === 'folha' && k.t.k === 'tc' && CHAVE.test(dentro(k.t)) ? dentro(k.t) : null);
      if (n.k === 'cham' && n.nome === '_ar_get' && chave(n.kids[1])) { const b = ponto(n.kids[0]); return b ? `${b}.${chave(n.kids[1])}` : null; }
      if (n.k === 'cham' && op.atalhos.has(n.nome) && n.kids.length === 1 && chave(n.kids[0])) return `${op.atalhos.get(n.nome)}.${chave(n.kids[0])}`;
      return null;
    };
    // vale sempre 0 (e é inteiro)? então um `? c X 0` é um `Se c X` também quando o valor conta
    const zero = (n) => {
      if (n.k === 'folha') return n.t.k === 'str' || n.t.k === 'tpl' || eInt(n, '0');
      if (n.k === 'bloco') return n.kids.length > 0 && zero(n.kids[n.kids.length - 1]);
      if (n.k === 'ciclo') return true;
      if (n.k === 'op') return n.o === 'W' || n.o === 'Se' || (n.o === '?' && zero(n.kids[1]) && zero(n.kids[2]));
      return false;
    };
    // o texto novo do nó; usado = o valor dele conta
    const padrao = (n, usa) => {
      let o = '', p = T[n.a].s;
      n.kids.forEach((k, j) => { o += src.slice(p, T[k.a].s) + emit(k, usa(j)); p = T[k.z].e; });
      return o + src.slice(p, T[n.z].e);
    };
    const semComentario = (a, b) => !gap(a, b).includes('#');
    // um bloco que ficou só com um molde (ou um texto) numa linha dispensa as chavetas: { `…` } → `…`
    const soUm = (txt) => {
      const m = /^\{\s*([\s\S]*?)\s*\}$/.exec(txt);
      if (!m || txt.includes('\n')) return txt;
      let tk;
      try { tk = tokens(m[1]); } catch { return txt; }
      return tk.length === 1 && tk[0].s === 0 && tk[0].e === m[1].length && (tk[0].k === 'tpl' || tk[0].k === 'str') ? m[1] : txt;
    };
    // um bloco: os ciclos contados, os moldes (textos e código seguidos na mesma linha) e, com tira, sem o último
    // elemento (o 0 do fim de um Se, o incremento de um ciclo), que leva consigo o espaço de antes
    const bloco = (n, usado, tira) => {
      // um 0 no fim a seguir a uma coisa que já vale 0 (um texto, um molde, um Se, um ciclo) não faz falta
      const m = n.kids.length;
      if (!tira && op.se && m > 1 && eInt(n.kids[m - 1], '0') && zero(n.kids[m - 2]) && semComentario(n.kids[m - 2].z, n.kids[m - 1].a)) { conta.zeros++; return soUm(bloco(n, usado, 2)); }
      const fora = tira ? 1 : 0;
      // tira = 2: o último sai e o penúltimo passa a ser o último (o valor do bloco é o dele)
      const ks = n.kids.slice(0, m - fora).map((k, j) => ({ n: k, a: k.a, z: k.z, usado: (tira === 2 ? j === m - 2 : !tira && j === m - 1) ? usado : false }));
      // = i 0 W < i N { … = i + i 1 }  →  L i N { … }
      for (let j = 0; j + 1 < ks.length; j++) {
        const s = ks[j].n, w = ks[j + 1].n;
        if (!op.ciclos || !s || !w || !(s.k === 'poe' && eInt(s.kids[0], '0') && w.k === 'op' && w.o === 'W')) continue;
        const c = w.kids[0], b = w.kids[1], i = s.nome;
        if (!(c.k === 'op' && c.o === '<' && eNome(c.kids[0], i) && b.k === 'bloco' && b.kids.length)) continue;
        const u = b.kids[b.kids.length - 1], lim = c.kids[1];
        if (!(u.k === 'poe' && u.nome === i && u.kids[0].k === 'op' && u.kids[0].o === '+' && eNome(u.kids[0].kids[0], i) && eInt(u.kids[0].kids[1], '1'))) continue;
        const fixo = (lim.k === 'folha' && lim.t.k === 'int') || (lim.k === 'folha' && lim.t.k === 'name' && lim.t.x !== i && !poeEm(b, lim.t.x));
        if (!fixo || !semComentario(s.z, w.a) || !semComentario(c.z, b.a) || (b.kids.length > 1 ? !semComentario(b.kids[b.kids.length - 2].z, u.a) : !semComentario(b.a, u.a))) continue;
        let corpo = null;
        if (b.kids.length === 2 && b.kids[0].k !== 'folha') { corpo = emit(b.kids[0], false); if (corpo.includes('\n')) corpo = null; }
        if (corpo == null) corpo = soUm(bloco(b, false, true));
        conta.ciclos++;
        ks.splice(j, 2, { texto: `L ${i} ${emit(lim, true)} ${corpo}`, a: s.a, z: w.z, usado: ks[j + 1].usado });
      }
      const eTexto = (k) => !!k.n && k.n.k === 'folha' && (k.n.t.k === 'str' || k.n.t.k === 'tpl');
      const txt = ks.map((k) => (k.texto != null ? k.texto : eTexto(k) ? null : emit(k.n, k.usado)));
      // moldes: corridas de textos e de código que escreve, na mesma linha
      const cabe = (k, j) => eTexto(k) || (!!k.n && !txt[j].includes('\n') && (k.n.k === 'cham' || k.n.k === 'bloco' || k.n.k === 'par' || (k.n.k === 'op' && ['?', 'Se', 'N', 'P', 'G'].includes(k.n.o))));
      const eP = (k) => !!k.n && k.n.k === 'op' && k.n.o === 'P';
      const pecas = [];
      for (let j = 0; j < ks.length; j++) {
        let e = j;
        if (op.moldes && cabe(ks[j], j) && !eP(ks[j])) {
          while (e + 1 < ks.length && cabe(ks[e + 1], e + 1) && !gap(ks[e].z, ks[e + 1].a).includes('\n')) e++;
          // acaba num texto, ou num código cujo valor não conta; um P solto (uma mudança de linha…) fica de fora
          while (e > j && ((!eTexto(ks[e]) && ks[e].usado) || eP(ks[e]))) e--;
          const run = ks.slice(j, e + 1), strs = run.filter(eTexto);
          const vale = strs.length > 0 && (run.length > strs.length || strs.length > 1 || (strs[0].n.t.k === 'str' && temAspas(dentro(strs[0].n.t))));
          if (vale) {
            let m = '';
            run.forEach((k, q) => { m += eTexto(k) ? (k.n.t.k === 'str' ? paraMolde(dentro(k.n.t), true) : k.n.t.x.slice(1, -1)) : `{ ${txt[j + q]} }`; });
            conta.moldes++;
            pecas.push({ a: ks[j].a, z: ks[e].z, texto: '`' + m + '`' });
            j = e; continue;
          }
        }
        pecas.push({ a: ks[j].a, z: ks[j].z, texto: txt[j] != null ? txt[j] : emit(ks[j].n, ks[j].usado) });
      }
      let o = '', p = T[n.a].s;
      for (const q of pecas) { o += src.slice(p, T[q.a].s) + q.texto; p = T[q.z].e; }
      if (tira) p = T[n.kids[n.kids.length - 1].z].e;
      return o + src.slice(p, T[n.z].e);
    };
    const emit = (n, usado) => {
      if (n.k === 'folha') {
        if (op.moldes && n.t.k === 'str' && temAspas(dentro(n.t))) { conta.moldes++; return '`' + paraMolde(dentro(n.t), true) + '`'; }
        if (op.moldes && n.t.k === 'tc' && n.t.x[1] === '"' && temAspas(dentro(n.t))) { conta.moldes++; return '$`' + paraMolde(dentro(n.t), false) + '`'; }
        return n.t.x;
      }
      if (n.k === 'bloco') return bloco(n, usado, false);
      if (n.k === 'par') return padrao(n, () => usado);
      if (n.k === 'poe') return padrao(n, () => true);
      if (n.k === 'ciclo') return padrao(n, (j) => j === 0);
      if (n.k === 'cham') {
        if (op.pontos) { const d = n.nome === '_ar_get' || op.atalhos.has(n.nome) ? ponto(n) : null; if (d) { conta.pontos++; return d; } }
        if (n.nome === '_ar_ps' && (eInt(n.kids[1], '1') || eInt(n.kids[1], '0'))) {
          const w = eInt(n.kids[1], '1') ? 'esc' : 'cru';
          if (falaOk(w)) { conta.fala++; return w + gap(n.a, n.kids[0].a) + emit(n.kids[0], true); }
        }
        if (FALA.has(n.nome) && falaOk(FALA.get(n.nome))) { conta.fala++; return FALA.get(n.nome) + padrao(n, () => true).slice(n.t.x.length); }
        return padrao(n, () => true);
      }
      // operadores
      if (n.o === '?' && op.se && eInt(n.kids[2], '0') && (!usado || zero(n.kids[1])) && semComentario(n.kids[1].z, n.kids[2].a)) {
        const x = n.kids[1];
        let corpo = null;
        if (x.k === 'bloco' && x.kids.length) {
          const semZ = x.kids.length > 1 && eInt(x.kids[x.kids.length - 1], '0') && semComentario(x.kids[x.kids.length - 2].z, x.kids[x.kids.length - 1].a);
          const dentroB = semZ ? x.kids.slice(0, -1) : x.kids;
          if (dentroB.length === 1 && dentroB[0].k !== 'folha' && semComentario(x.a, dentroB[0].a) && semComentario(x.kids[x.kids.length - 1].z, x.z)) { corpo = emit(dentroB[0], false); if (corpo.includes('\n')) corpo = null; }
          if (corpo == null) corpo = soUm(bloco(x, false, semZ));
        } else corpo = emit(x, false);
        conta.se++;
        return 'Se' + gap(n.a, n.kids[0].a) + emit(n.kids[0], true) + gap(n.kids[0].z, x.a) + corpo;
      }
      if (n.o === '?') return padrao(n, (j) => (j === 0 ? true : usado));
      if (n.o === 'W' || n.o === 'Se') return padrao(n, (j) => j === 0);
      return padrao(n, () => true);
    };
    const novo = emit(raiz, true), velho = src.slice(T[raiz.a].s, T[raiz.z].e);
    if (novo !== velho) edits.push({ s: T[raiz.a].s, e: T[raiz.z].e, novo });
  }
  let out = src;
  for (const ed of edits.sort((a, b) => b.s - a.s)) out = out.slice(0, ed.s) + ed.novo + out.slice(ed.e);
  return { out, conta, funcoes: edits.length };
}

// ---------- linha de comando ----------
if (process.argv[1] && process.argv[1].endsWith('fluir.mjs')) {
  const args = process.argv.slice(2), ver = args.includes('--ver');
  const atalhos = new Map(args.filter((a) => a.startsWith('--atalho=')).map((a) => a.slice(9).split('=')));
  const fich = args.filter((a) => !a.startsWith('--') || a === '--');
  const corte = fich.indexOf('--');
  if (corte < 0) { console.error('uso: node fluir.mjs [--ver] [--atalho=sg=es] contexto.onda… -- alvo.onda…'); process.exit(2); }
  const ctx = fich.slice(0, corte), alvos = fich.slice(corte + 1);
  const F = new Map(), fontes = new Map();
  for (const f of [...ctx, ...alvos]) { fontes.set(f, readFileSync(f, 'utf8')); definicoes(tokens(fontes.get(f)), F, f); }
  const temFala = [...ctx, ...alvos].some((f) => f.endsWith('fala.onda')), temArvore = F.has('_mb');
  const op = { moldes: true, se: true, ciclos: true, pontos: temArvore, fala: temFala, atalhos };
  let total = 0;
  for (const f of alvos) {
    const r = fluir(fontes.get(f), f, F, op);
    const mud = r.out !== fontes.get(f);
    console.log(`${f}: ${mud ? `${r.funcoes} funções` : 'igual'} · moldes ${r.conta.moldes} · pontos ${r.conta.pontos} · fala ${r.conta.fala} · Se ${r.conta.se} · L ${r.conta.ciclos} · zeros ${r.conta.zeros}`);
    if (mud) { total++; if (!ver) writeFileSync(f, r.out); }
  }
  console.log(`${total} de ${alvos.length} ficheiros ${ver ? 'mudariam' : 'mudados'}`);
}
