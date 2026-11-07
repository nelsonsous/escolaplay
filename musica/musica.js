// Música — a app (PWA). Playlists do Curador (tarefa agendada do Claude) e tuas, pedidos, o teu gosto, e o motor de
// curadoria escrito na Onda a correr aqui no telemóvel (WebAssembly) para afinar a escolha e a ordem.
import { api, chave, store, getProxy, setProxy, PROXY_PADRAO } from './api.js';
import { qualidadeTexto, camelotTexto } from './lib/tidal.js';
import { validarProposta, normalizarOpcoes } from './lib/playlist.js';
import { encontrar, preparar, afinar, deGuardadas, paraGuardar, mistura } from './lib/curadoria.js';

const VERSAO = '1.0.0';
const $body = document.getElementById('mu-body');
const $toast = document.getElementById('mu-toast');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const minutos = (s) => (s >= 3600 ? `${Math.floor(s / 3600)} h ${String(Math.round((s % 3600) / 60)).padStart(2, '0')} min` : `${Math.max(1, Math.round(s / 60))} min`);
const dia = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) : '');
const NOMES_ESTILO = { equilibrado: 'Equilibrado', descoberta: 'Descoberta', moda: 'Na moda', gosto: 'O meu gosto', audiofilo: 'Audiófilo' };
const NOMES_ARCO = { onda: 'Onda', sobe: 'Sobe', desce: 'Acalma', plano: 'Sem arco' };
const PORQUE = { gosto: 'o teu gosto', qualidade: 'som', tendencia: 'na moda', claude: 'Claude', novidade: 'novidade', fixa: 'fixada' };
const SUGESTOES = ['Faixas bem gravadas para testar o som do carro', 'Jazz para um domingo de manhã', 'O melhor de 2026 até agora, de vários géneros',
    'Fado e música portuguesa nova', 'Soul e funk dos anos 70', 'Treino: energia sempre a subir', 'Para conduzir à noite, calma e com graves'];

let vez = 0; // cada vista nova invalida as respostas atrasadas da anterior
let estado = null, estadoEm = 0;
let wasm = null;
const docs = new Map();

function toast(msg, ms = 3400) {
    $toast.textContent = msg;
    $toast.classList.add('on');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => $toast.classList.remove('on'), ms);
}
const html = (v, s) => { if (v === vez) $body.innerHTML = s; return v === vez; };
async function motor() {
    if (!wasm) {
        const r = await fetch('onda/curador.wasm');
        if (!r.ok) throw new Error('Não consegui carregar o motor Onda.');
        wasm = new Uint8Array(await r.arrayBuffer());
    }
    return wasm;
}
async function carregarEstado(forcar) {
    if (!forcar && estado && Date.now() - estadoEm < 30000) return estado;
    estado = await api.estado();
    estadoEm = Date.now();
    return estado;
}
const nomeAparelho = () => (/iPhone/.test(navigator.userAgent) ? 'iPhone' : /iPad/.test(navigator.userAgent) ? 'iPad' : /Android/.test(navigator.userAgent) ? 'Android' : /Mac/.test(navigator.userAgent) ? 'Mac' : 'browser');
const temAcesso = () => !!(chave.get() && estado?.tu);

// ---------- arranque: o regresso do Tidal (#chave=, #ligado=, #erro=) e o link de ligação (?ligar=) ----------
function lerRetorno() {
    const h = new URLSearchParams(location.hash.slice(1));
    const q = new URLSearchParams(location.search);
    let aviso = null;
    if (h.has('chave')) { chave.set(h.get('chave')); store.del('musica:codigo'); aviso = 'Tidal ligado — este aparelho fica com acesso.'; }
    else if (h.has('ligado')) aviso = 'Tidal ligado outra vez.';
    else if (h.has('erro')) aviso = 'Não liguei ao Tidal: ' + h.get('erro');
    if (q.get('ligar')) { store.set('musica:codigo', q.get('ligar')); q.delete('ligar'); }
    if (q.get('proxy')) { setProxy(q.get('proxy')); q.delete('proxy'); }
    if (aviso || location.search !== (q.toString() ? `?${q}` : '')) history.replaceState(null, '', location.pathname + (q.toString() ? `?${q}` : '') + (aviso ? '#/' : location.hash));
    return aviso;
}

async function ligarTidal() {
    try {
        const { url } = await api.ligar(store.get('musica:codigo'), nomeAparelho());
        location.href = url;
    } catch (e) { toast(e.message, 6000); }
}

// ---------- rotas ----------
function rota() {
    const [nome, arg] = location.hash.replace(/^#\/?/, '').split('/');
    const tab = nome === 'p' ? 'playlists' : nome || 'playlists';
    for (const a of document.querySelectorAll('.mu-nav a')) { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
    window.scrollTo(0, 0);
    const v = ++vez;
    const vista = nome === 'p' && arg ? () => vPlaylist(v, decodeURIComponent(arg)) : ({ pedir: vPedir, gosto: vGosto, ajustes: vAjustes }[nome] || vPlaylists).bind(null, v);
    vista().catch((e) => html(v, `${cab('Música')}<div class="mu-card"><h3>Algo correu mal</h3><p class="mu-erro">${esc(e.message)}</p>
        <div class="mu-acoes"><button class="mu-btn sec" data-acao="repetir">Tentar outra vez</button></div></div>`));
}
addEventListener('hashchange', rota);
$body.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-acao]');
    if (!b) return;
    if (b.dataset.acao === 'repetir') rota();
    if (b.dataset.acao === 'ligar') ligarTidal();
    if (b.dataset.acao === 'config') guardarClientId(b);
});
async function guardarClientId(b) {
    const id = document.getElementById('cfg-id')?.value.trim();
    if (!id) return toast('Cola o Client ID.');
    b.disabled = true;
    try { await api.configurar(store.get('musica:codigo'), id); estado = null; toast('Client ID guardado. Agora liga o Tidal.'); rota(); }
    catch (e) { toast(e.message, 6000); b.disabled = false; }
}

const pill = () => (estado?.ligado ? `<a class="mu-pill on" href="#/ajustes">${esc(estado.utilizador || 'Tidal')}</a>` : '<a class="mu-pill off" href="#/ajustes">Tidal desligado</a>');
const cab = (titulo, sub = '') => `<header class="mu-head"><div><h1>${esc(titulo)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>${pill()}</header>`;

function boasVindas() {
    const codigo = store.get('musica:codigo');
    if (!estado.clientId) {
        const pode = !!(codigo || (chave.get() && estado.tu));
        return `<div class="mu-card boas"><h3>Primeiro: a tua app no Tidal</h3><p>Em <a href="https://developer.tidal.com/dashboard" target="_blank" rel="noopener">developer.tidal.com</a>
            cria uma app (grátis) e, nas definições dela:</p><ul class="mu-tend"><li>Redirect URI: <code>${esc(estado.retorno)}</code></li>
            <li>Scopes: <code>user.read collection.read playlists.read playlists.write search.read recommendations.read</code></li></ul>
            ${pode ? `<label class="mu-campo"><span>Client ID da app</span><input id="cfg-id" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="copia-o do Tidal"></label>
            <div class="mu-acoes"><button class="mu-btn" data-acao="config">Guardar e continuar</button></div>`
            : '<p class="mu-nota">Depois abre o link de ligação que o Claude te deu (termina em <code>?ligar=…</code>) para colares aqui o Client ID.</p>'}</div>`;
    }
    if (chave.get() && !estado.tu) {
        return `<div class="mu-card boas"><h3>Este aparelho perdeu o acesso</h3><p>A chave guardada já não é válida. Abre outra vez o link de ligação que o Claude te deu.</p></div>`;
    }
    if (codigo) {
        return `<div class="mu-card boas"><h3>Liga o teu Tidal</h3><p>Vais à página de login do Tidal, autorizas, e voltas aqui. As playlists passam a ser criadas
            na tua conta e o Curador (o Claude) passa a ler o teu gosto.</p><div class="mu-acoes"><button class="mu-btn" data-acao="ligar">Ligar ao Tidal</button></div></div>`;
    }
    return `<div class="mu-card boas"><h3>Liga o teu Tidal</h3><p>Para ligar este aparelho, abre o <b>link de ligação</b> que o Claude te deu (termina em <code>?ligar=…</code>).
        Só serve uma vez; depois este aparelho fica com acesso.</p></div>`;
}

// ---------- Playlists ----------
async function vPlaylists(v) {
    html(v, `${cab('Música', 'Playlists de qualidade para o teu Tidal')}<p class="mu-nota">A carregar…</p>`);
    await carregarEstado();
    if (!temAcesso() || !estado.ligado) {
        const cache = store.get('musica:cache:playlists', []);
        return html(v, `${cab('Música', 'Playlists de qualidade para o teu Tidal')}${boasVindas()}${cache.length ? listaPlaylists(cache) : ''}`);
    }
    const [pls, peds] = await Promise.all([api.playlists(), api.pedidos().catch(() => [])]);
    store.set('musica:cache:playlists', pls.slice(0, 30));
    const pend = peds.filter((p) => p.estado === 'pendente');
    html(v, `${cab('Música', 'Playlists de qualidade para o teu Tidal')}
        ${pend.length ? `<a class="mu-card" href="#/pedir" style="display:block;text-decoration:none;color:inherit"><h3>${pend.length} pedido${pend.length > 1 ? 's' : ''} à espera do Curador</h3>
            <p>«${esc(pend[0].texto)}»${pend.length > 1 ? ' e mais' : ''}. O Curador trata deles às 07:44 e às 18:44.</p></a>` : ''}
        ${pls.length ? listaPlaylists(pls) : `<div class="mu-card"><h3>Ainda não há playlists</h3><p>O Curador cria a primeira «Onda da semana» na próxima manhã. Ou faz já um pedido.</p>
            <div class="mu-acoes"><a class="mu-btn" href="#/pedir">Fazer um pedido</a></div></div>`}`);
}
function listaPlaylists(pls) {
    return `<h2 class="mu-sec">As tuas playlists</h2><div class="mu-lista-pl">${pls.map((p) => `<a class="mu-pl" href="#/p/${encodeURIComponent(p.id)}">
        <div class="nm">${esc(p.nome)}</div><div class="mt">${p.faixas} faixas · ${minutos(p.duracao || 0)} · ${esc(dia(p.criadaEm))}</div>
        <div class="tags">${p.por === 'curador' ? '<span class="mu-chip">✦ Curador</span>' : '<span class="mu-chip">por ti</span>'}${p.tidal ? '<span class="mu-chip tidal">no Tidal</span>' : '<span class="mu-chip">só na app</span>'}</div></a>`).join('')}</div>`;
}

// ---------- uma playlist ----------
const chipQualidade = (tags) => { const q = qualidadeTexto(tags || []); return q === 'Hi-Res' ? '<span class="mu-chip hires">Hi-Res</span>' : q === 'Sem perdas' ? '<span class="mu-chip lossless">Sem perdas</span>' : ''; };
function linhaFaixa(f, i, { afinar = false, fixa = false } = {}) {
    const meta = [f.ano || '', f.genero || '', f.bpm ? `${f.bpm} bpm` : '', camelotTexto(f.tom), f.duracao ? minutos(f.duracao) : ''].filter(Boolean).join(' · ');
    return `<li class="mu-faixa${fixa ? ' fixa' : ''}" data-id="${esc(f.id)}"><span class="n">${i + 1}</span>
        <div><div class="t"><a href="${esc(f.url || `https://tidal.com/browse/track/${f.id}`)}" target="_blank" rel="noopener">${esc(f.titulo)}</a>${f.versao ? ` <span class="mu-nota">(${esc(f.versao)})</span>` : ''}</div>
        <div class="a">${esc((f.artistas || []).join(', '))}</div><div class="m">${esc(meta)}</div>${f.motivo ? `<div class="mot">${esc(f.motivo)}</div>` : ''}
        ${afinar ? `<div class="ctl"><button data-fixar="${esc(f.id)}" aria-pressed="${fixa}">📌 fixar</button><button data-tirar="${esc(f.id)}">✕ tirar</button></div>` : ''}</div>
        <div class="dir">${chipQualidade(f.tags)}${f.porque ? `<span class="why">${esc(PORQUE[f.porque] || f.porque)} ${f.pontos ? Math.round(f.pontos / 10) : ''}</span>` : ''}</div></li>`;
}
function barras(pares, total) {
    return `<div class="mu-mix">${pares.slice(0, 6).map(([k, n]) => `<div class="mu-barra"><span>${esc(k)}</span><span class="b"><i style="width:${Math.round((n / total) * 100)}%"></i></span><span class="v">${n}</span></div>`).join('')}</div>`;
}

async function vPlaylist(v, id) {
    html(v, `<a class="mu-voltar" href="#/">‹ Playlists</a><p class="mu-nota">A carregar…</p>`);
    await carregarEstado();
    const d = docs.get(id) || (await api.playlist(id));
    docs.set(id, d);
    const m = mistura(d.faixas);
    const tidalBtn = d.tidal ? `<a class="mu-btn" href="${esc(d.tidal.url)}" target="_blank" rel="noopener">Abrir no Tidal</a>` : '<button class="mu-btn" id="enviar">Enviar para o Tidal</button>';
    const pode = temAcesso() && estado.ligado;
    if (!html(v, `<a class="mu-voltar" href="#/">‹ Playlists</a>
        <header class="mu-head"><div><h1>${esc(d.nome)}</h1><div class="sub">${d.faixas.length} faixas · ${minutos(m.duracao)} · ${esc(dia(d.criadaEm))} · ${d.por === 'curador' ? '✦ Curador' : 'por ti'}</div></div></header>
        <div class="mu-acoes">${pode ? tidalBtn : ''}<button class="mu-btn sec" id="afinar">Afinar no telemóvel</button></div>
        ${d.pedido ? `<p class="mu-nota">Pedido: «${esc(d.pedido)}»</p>` : ''}
        ${d.resumo || d.descricao ? `<div class="mu-card"><h3>Porquê esta playlist</h3><p class="mu-resumo">${esc(d.resumo || d.descricao)}</p>
            ${d.tendencias?.length ? `<ul class="mu-tend">${d.tendencias.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</div>` : ''}
        <div id="afinador"></div>
        <h2 class="mu-sec">Faixas</h2><ol class="mu-faixas" id="faixas">${d.faixas.map((f, i) => linhaFaixa(f, i)).join('')}</ol>
        <div class="mu-card" style="margin-top:12px"><h3>A mistura</h3>${barras(m.generos, d.faixas.length)}${barras(m.decadas, d.faixas.length)}</div>
        <div class="mu-acoes"><button class="mu-btn perigo" id="apagar">Apagar da biblioteca</button></div>`)) return;
    const $env = document.getElementById('enviar');
    if ($env) $env.onclick = async () => {
        $env.disabled = true; $env.textContent = 'A criar no Tidal…';
        try { const n = await api.enviar(id); docs.set(id, n); toast('Criada no Tidal.'); rota(); } catch (e) { toast(e.message, 6000); $env.disabled = false; $env.textContent = 'Enviar para o Tidal'; }
    };
    document.getElementById('apagar').onclick = async () => {
        if (!confirm(`Apagar «${d.nome}» da biblioteca da app?${d.tidal ? ' (no Tidal fica.)' : ''}`)) return;
        try { await api.apagar(id); docs.delete(id); location.hash = '#/'; toast('Apagada da biblioteca.'); } catch (e) { toast(e.message); }
    };
    document.getElementById('afinar').onclick = () => abrirAfinador(v, d);
}

// Afinar: o motor Onda corre aqui, a cada mudança — escolha e ordem novas na hora
function abrirAfinador(v, d) {
    const perfil = store.get('musica:cache:perfil');
    let cands = d.candidatas?.length ? deGuardadas(d.candidatas)
        : preparar(d.faixas.map((f) => ({ c: { artista: f.artistas?.[0] || '', titulo: f.titulo, ano: f.ano, genero: f.genero, motivo: f.motivo }, f })), perfil);
    const op = { ...normalizarOpcoes(d.opcoes || {}) };
    op.faixas = Math.min(op.faixas, cands.length) || cands.length;
    const fixas = new Set(), tiradas = new Set();
    let ultimo = null;
    const $a = document.getElementById('afinador');
    const seg = (nome, opcoes, atual) => `<div class="mu-seg" data-seg="${nome}">${Object.entries(opcoes).map(([k, t]) => `<button type="button" data-v="${k}" aria-pressed="${k === String(atual)}">${esc(t)}</button>`).join('')}</div>`;
    const desenhar = () => {
        $a.innerHTML = `<div class="mu-card mu-afinar"><h3>Afinar com o motor Onda</h3>
            <p>${cands.length} candidatas. Muda as regras e o motor escolhe e ordena outra vez, aqui no telemóvel.</p>
            <label class="mu-campo"><span>Faixas</span><div class="mu-range"><input type="range" id="af-n" min="5" max="${Math.max(5, cands.length)}" value="${op.faixas}"><output id="af-nv">${op.faixas}</output></div></label>
            <div class="mu-campo"><span>Máximo por artista</span>${seg('maxArtista', { 1: '1', 2: '2', 3: '3', 4: '4' }, op.maxArtista)}</div>
            <div class="mu-campo"><span>Estilo</span>${seg('estilo', NOMES_ESTILO, op.estilo)}</div>
            <div class="mu-campo"><span>Energia ao longo da playlist</span>${seg('arco', NOMES_ARCO, op.arco)}</div>
            <label class="mu-campo"><span>Acrescentar do Tidal</span><input type="search" id="af-q" placeholder="artista e título" enterkeyhint="search"></label><div id="af-res"></div>
            <div class="mu-motor" id="af-motor"></div>
            <div class="mu-acoes"><button class="mu-btn" id="af-tidal">Guardar e enviar para o Tidal</button><button class="mu-btn sec" id="af-guardar">Só guardar na app</button></div></div>`;
        $a.querySelector('#af-n').oninput = (e) => { op.faixas = +e.target.value; $a.querySelector('#af-nv').textContent = op.faixas; recalcular(); };
        for (const s of $a.querySelectorAll('[data-seg]')) s.onclick = (e) => {
            const b = e.target.closest('button'); if (!b) return;
            op[s.dataset.seg] = s.dataset.seg === 'maxArtista' ? +b.dataset.v : b.dataset.v;
            for (const x of s.children) x.setAttribute('aria-pressed', x === b);
            recalcular();
        };
        $a.querySelector('#af-q').onkeydown = (e) => { if (e.key === 'Enter') procurar(e.target.value); };
        $a.querySelector('#af-tidal').onclick = () => guardar(true);
        $a.querySelector('#af-guardar').onclick = () => guardar(false);
    };
    const recalcular = async () => {
        if (v !== vez) return;
        const usadas = cands.filter((x) => !tiradas.has(x.f.id)).map((x) => ({ ...x, s: { ...x.s, fixa: fixas.has(x.f.id) } }));
        const t0 = performance.now();
        const r = await afinar(op, usadas, await motor());
        ultimo = { ...r, usadas };
        const ms = performance.now() - t0;
        document.getElementById('faixas').innerHTML = r.faixas.map((f, i) => linhaFaixa(f, i, { afinar: true, fixa: fixas.has(f.id) })).join('');
        const mm = mistura(r.faixas);
        document.getElementById('af-motor').textContent = `motor Onda (WASM): ${r.faixas.length} faixas de ${usadas.length} em ${ms.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} ms · ${minutos(mm.duracao)} · custo das transições ${r.custo}`;
    };
    const procurar = async (q) => {
        const $r = document.getElementById('af-res');
        if (q.trim().length < 2) return;
        $r.innerHTML = '<p class="mu-nota">A procurar no Tidal…</p>';
        try {
            const fs = await api.pesquisa(q.trim());
            $r.innerHTML = fs.length ? `<ol class="mu-faixas">${fs.slice(0, 6).map((f, i) => linhaFaixa(f, i).replace('<div class="dir">', `<div class="dir"><button class="mu-btn peq" data-junta="${esc(f.id)}">+ juntar</button>`)).join('')}</ol>` : '<p class="mu-nota">Nada encontrado.</p>';
            for (const b of $r.querySelectorAll('[data-junta]')) b.onclick = () => {
                const f = fs.find((x) => x.id === b.dataset.junta);
                if (!cands.some((x) => x.f.id === f.id)) cands = cands.concat(preparar([{ c: { artista: f.artistas[0], titulo: f.titulo, motivo: 'Escolhida por ti.' }, f }], perfil));
                fixas.add(f.id); tiradas.delete(f.id);
                op.faixas = Math.min(op.faixas + 1, cands.length);
                $r.innerHTML = ''; desenhar(); recalcular(); toast(`«${f.titulo}» entra (fixada).`);
            };
        } catch (e) { $r.innerHTML = `<p class="mu-erro">${esc(e.message)}</p>`; }
    };
    const guardar = async (paraTidal) => {
        if (!ultimo?.faixas.length) return;
        if (!(temAcesso() && estado.ligado)) return toast('Liga o Tidal primeiro (Ajustes).');
        const b = document.getElementById(paraTidal ? 'af-tidal' : 'af-guardar');
        b.disabled = true; b.textContent = paraTidal ? 'A criar no Tidal…' : 'A guardar…';
        try {
            const n = await api.guardar({ nome: `${d.nome.slice(0, 50)} · afinada`, descricao: d.descricao, resumo: d.resumo, tendencias: d.tendencias, pedido: d.pedido,
                opcoes: op, faixas: ultimo.faixas, custo: ultimo.custo, candidatas: paraGuardar(ultimo.usadas), tidal: paraTidal });
            docs.set(n.id, n);
            toast(paraTidal ? 'Nova versão criada no Tidal.' : 'Guardada na biblioteca.');
            location.hash = '#/p/' + encodeURIComponent(n.id);
        } catch (e) { toast(e.message, 6000); b.disabled = false; b.textContent = paraTidal ? 'Guardar e enviar para o Tidal' : 'Só guardar na app'; }
    };
    document.getElementById('faixas').onclick = (e) => {
        const fx = e.target.closest('[data-fixar]'), tr = e.target.closest('[data-tirar]');
        if (fx) { fixas.has(fx.dataset.fixar) ? fixas.delete(fx.dataset.fixar) : fixas.add(fx.dataset.fixar); recalcular(); }
        if (tr) { tiradas.add(tr.dataset.tirar); fixas.delete(tr.dataset.tirar); recalcular(); }
    };
    document.getElementById('afinar').hidden = true;
    desenhar();
    recalcular().catch((e) => toast(e.message, 6000));
    $a.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- Pedir ----------
const INSTRUCOES = `És o curador musical da minha app Música (Tidal, sem perdas; ouço muito no carro). Pesquisa na web o que for preciso e responde SÓ com JSON, sem mais texto, neste formato:
{"nome":"até 60 caracteres","descricao":"até 300","resumo":"2 a 6 frases: porquê estas escolhas","tendencias":["o que está a dar — onde se viu"],
 "opcoes":{"faixas":30,"maxArtista":2,"estilo":"equilibrado","arco":"onda"},
 "candidatas":[{"artista":"…","titulo":"…","ano":1972,"genero":"soul","nota":90,"energia":50,"tendencia":0,"motivo":"até 140 caracteres"}]}
Regras: só gravações reais e publicadas, artista e título como no Tidal (versão de estúdio original, salvo pedido); entre 1,5× e 2× o número de faixas em candidatas (um motor escolhe e ordena); "ano" = ano original da gravação; "genero" = etiqueta curta, sempre igual para o mesmo género; "nota" 0-100 = qualidade da música e da gravação + encaixe no pedido; "energia" 0-100; "tendencia" 0-100 só para o que está mesmo a dar agora; "motivo" em português de Portugal. Privilegia gravações excelentes. Estilos: equilibrado, descoberta, moda, gosto, audiofilo. Arcos: onda, sobe, desce, plano.
O meu pedido: `;

async function vPedir(v) {
    html(v, `${cab('Pedir', 'Ao Curador, ou monta tu com uma proposta do Claude')}<p class="mu-nota">A carregar…</p>`);
    await carregarEstado();
    const pode = temAcesso() && estado.ligado;
    const peds = pode ? await api.pedidos().catch(() => []) : [];
    const op = { faixas: 30, maxArtista: 2, estilo: 'equilibrado', arco: 'onda' };
    const seg = (nome, opcoes, atual) => `<div class="mu-seg" data-seg="${nome}">${Object.entries(opcoes).map(([k, t]) => `<button type="button" data-v="${k}" aria-pressed="${k === String(atual)}">${esc(t)}</button>`).join('')}</div>`;
    if (!html(v, `${cab('Pedir', 'Ao Curador, ou monta tu com uma proposta do Claude')}
        ${pode ? '' : boasVindas()}
        <div class="mu-card"><h3>O que te apetece ouvir?</h3>
            <label class="mu-campo"><span class="sr">Pedido</span><textarea id="pd-tx" maxlength="500" placeholder="Ex.: jazz dos anos 60 bem gravado para a viagem de sábado"></textarea></label>
            <div class="mu-chips">${SUGESTOES.map((s) => `<button type="button" class="mu-chip" data-sug="${esc(s)}">${esc(s)}</button>`).join('')}</div>
            <label class="mu-campo"><span>Faixas</span><div class="mu-range"><input type="range" id="pd-n" min="10" max="60" step="5" value="30"><output id="pd-nv">30</output></div></label>
            <div class="mu-campo"><span>Máximo por artista</span>${seg('maxArtista', { 1: '1', 2: '2', 3: '3', 4: '4' }, 2)}</div>
            <div class="mu-campo"><span>Estilo</span>${seg('estilo', NOMES_ESTILO, 'equilibrado')}</div>
            <div class="mu-campo"><span>Energia ao longo da playlist</span>${seg('arco', NOMES_ARCO, 'onda')}</div>
            <div class="mu-acoes"><button class="mu-btn" id="pd-ok" ${pode ? '' : 'disabled'}>Pedir ao Curador</button></div>
            <p class="mu-nota">O Curador (tarefa agendada do Claude) pesquisa o que está a dar, cruza com o teu gosto e cria a playlist no Tidal às 07:44 e às 18:44.</p></div>
        ${peds.length ? `<h2 class="mu-sec">Os teus pedidos</h2><div class="mu-card">${peds.slice(0, 12).map((p) => `<div class="mu-pedido"><div><div class="tx">«${esc(p.texto)}»</div>
            <div class="mt">${p.estado === 'feito' ? `feito a ${esc(dia(p.feitoEm))}` : `à espera · ${esc(dia(p.criadoEm))}`} · ${p.opcoes.faixas} faixas · ${esc(NOMES_ESTILO[p.opcoes.estilo] || '')}</div></div>
            ${p.estado === 'feito' && p.playlist ? `<a class="mu-btn sec peq" href="#/p/${encodeURIComponent(p.playlist)}">Ver</a>` : p.estado === 'pendente' ? `<button class="mu-btn sec peq" data-cancelar="${esc(p.id)}">Cancelar</button>` : ''}</div>`).join('')}</div>` : ''}
        <h2 class="mu-sec">Já tens uma proposta do Claude?</h2>
        <div class="mu-card"><h3>Montar aqui, já</h3><p>Copia as instruções, cola numa conversa com o Claude com o teu pedido no fim, e cola aqui a resposta (JSON).
            O telemóvel encontra as faixas no Tidal e o motor Onda escolhe e ordena.</p>
            <div class="mu-acoes"><button class="mu-btn sec" id="im-copiar">Copiar instruções para o Claude</button></div>
            <label class="mu-campo"><span>Resposta do Claude (JSON)</span><textarea id="im-json" spellcheck="false" placeholder='{"nome": "…", "candidatas": [ … ]}'></textarea></label>
            <div class="mu-acoes"><button class="mu-btn" id="im-ok" ${pode ? '' : 'disabled'}>Montar playlist</button></div><p class="mu-nota" id="im-estado"></p></div>`)) return;

    const $tx = document.getElementById('pd-tx');
    for (const b of $body.querySelectorAll('[data-sug]')) b.onclick = () => { $tx.value = b.dataset.sug; $tx.focus(); };
    document.getElementById('pd-n').oninput = (e) => { op.faixas = +e.target.value; document.getElementById('pd-nv').textContent = op.faixas; };
    for (const s of $body.querySelectorAll('[data-seg]')) s.onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        op[s.dataset.seg] = s.dataset.seg === 'maxArtista' ? +b.dataset.v : b.dataset.v;
        for (const x of s.children) x.setAttribute('aria-pressed', x === b);
    };
    document.getElementById('pd-ok').onclick = async (e) => {
        if ($tx.value.trim().length < 3) return toast('Escreve o que queres ouvir.');
        e.target.disabled = true;
        try { await api.pedir($tx.value.trim(), op); toast('Pedido feito — o Curador trata dele na próxima corrida.'); rota(); } catch (err) { toast(err.message); e.target.disabled = false; }
    };
    for (const b of $body.querySelectorAll('[data-cancelar]')) b.onclick = async () => {
        try { await api.cancelar(b.dataset.cancelar); toast('Pedido cancelado.'); rota(); } catch (err) { toast(err.message); }
    };
    document.getElementById('im-copiar').onclick = async () => {
        try { await navigator.clipboard.writeText(INSTRUCOES + ($tx.value.trim() || '…')); toast('Instruções copiadas. Cola-as no Claude.'); }
        catch { document.getElementById('im-json').value = INSTRUCOES + ($tx.value.trim() || '…'); toast('Não deu para copiar: as instruções estão na caixa, copia-as daí.'); }
    };
    document.getElementById('im-ok').onclick = (e) => montarProposta(v, e.target);
}

async function montarProposta(v, btn) {
    const $e = document.getElementById('im-estado');
    const texto = document.getElementById('im-json').value.trim();
    let bruto;
    try { bruto = JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1)); } catch { return toast('Isso não é JSON válido.'); }
    const { ok, errors, value: p } = validarProposta(bruto);
    if (!ok) { $e.textContent = errors.join(' · '); return; }
    btn.disabled = true;
    try {
        $e.textContent = 'A ler o teu gosto…';
        const perfil = await api.perfil().catch(() => store.get('musica:cache:perfil'));
        if (perfil) store.set('musica:cache:perfil', perfil);
        const enc = await encontrar(p.candidatas, api.resolver, { progresso: (a, n) => { if (v === vez) $e.textContent = `A procurar no Tidal: ${a} de ${n}…`; } });
        const cands = preparar(enc, perfil);
        const r = await afinar(p.opcoes, cands, await motor());
        if (!r.faixas.length) throw new Error('O Tidal não tem nenhuma destas faixas.');
        $e.textContent = `${cands.length} de ${p.candidatas.length} encontradas · motor Onda: ${r.faixas.length} faixas. A guardar…`;
        const n = await api.guardar({ ...p, faixas: r.faixas, custo: r.custo, candidatas: paraGuardar(cands), tidal: false });
        docs.set(n.id, n);
        toast('Montada. Vê e envia para o Tidal.');
        location.hash = '#/p/' + encodeURIComponent(n.id);
    } catch (err) { $e.textContent = err.message; btn.disabled = false; }
}

// ---------- Gosto ----------
async function vGosto(v) {
    html(v, `${cab('O teu gosto', 'Das tuas favoritas no Tidal')}<p class="mu-nota">A carregar…</p>`);
    await carregarEstado();
    let p = store.get('musica:cache:perfil');
    const pode = temAcesso() && estado.ligado;
    if (pode) { try { p = await api.perfil(); store.set('musica:cache:perfil', p); } catch (e) { if (!p) throw e; } }
    if (!p) return html(v, `${cab('O teu gosto')}${boasVindas()}`);
    const r = p.resumo || {};
    const tot = (xs) => Math.max(1, ...xs.map((x) => x.n));
    const bar = (xs, k) => `<div class="mu-mix">${xs.slice(0, 8).map((x) => `<div class="mu-barra"><span>${esc(x[k])}</span><span class="b"><i style="width:${Math.round((x.n / tot(xs)) * 100)}%"></i></span><span class="v">${x.n}</span></div>`).join('')}</div>`;
    if (!html(v, `${cab('O teu gosto', `${p.favoritas.length} favoritas · atualizado ${dia(p.geradoEm)}`)}
        <div class="mu-acoes"><button class="mu-btn sec" id="gs-at" ${pode ? '' : 'disabled'}>Atualizar do Tidal</button></div>
        ${r.artistas?.length ? `<div class="mu-card"><h3>Artistas que mais aparecem</h3>${bar(r.artistas, 'nome')}</div>` : ''}
        ${r.decadas?.length ? `<div class="mu-card"><h3>Décadas</h3>${bar(r.decadas.map((d) => ({ ...d, nome: `${d.decada}s` })).sort((a, b) => a.nome.localeCompare(b.nome)), 'nome')}</div>` : ''}
        ${r.generos?.length ? `<div class="mu-card"><h3>Géneros (etiquetas do Tidal)</h3>${bar(r.generos, 'nome')}</div>` : ''}
        ${r.qualidade?.length ? `<div class="mu-card"><h3>Qualidade das favoritas</h3><div class="mu-chips">${r.qualidade.map((q) => `<span class="mu-chip">${esc(q.q)} · ${q.n}</span>`).join('')}</div></div>` : ''}
        ${p.artistas?.length ? `<div class="mu-card"><h3>Artistas que segues</h3><div class="mu-chips">${p.artistas.slice(0, 40).map((a) => `<span class="mu-chip">${esc(a.nome)}</span>`).join('')}</div></div>` : ''}
        <h2 class="mu-sec">Favoritas mais recentes</h2><ol class="mu-faixas">${p.favoritas.slice(0, 25).map((f, i) => linhaFaixa(f, i)).join('') || '<li class="mu-vazio">Sem favoritas.</li>'}</ol>
        ${p.playlists?.length ? `<h2 class="mu-sec">As tuas playlists no Tidal</h2><div class="mu-card">${p.playlists.slice(0, 20).map((x) => `<div class="mu-pedido"><div class="tx">${esc(x.nome)}</div>
            <a class="mu-btn sec peq" href="${esc(x.url)}" target="_blank" rel="noopener">Abrir</a></div>`).join('')}</div>` : ''}`)) return;
    const b = document.getElementById('gs-at');
    b.onclick = async () => { b.disabled = true; b.textContent = 'A ler do Tidal…'; try { store.set('musica:cache:perfil', await api.perfil(true)); rota(); } catch (e) { toast(e.message); b.disabled = false; } };
}

// ---------- Ajustes ----------
async function vAjustes(v) {
    html(v, `${cab('Ajustes')}<p class="mu-nota">A carregar…</p>`);
    let erro = null;
    try { await carregarEstado(true); } catch (e) { erro = e.message; estado = estado || { ligado: false, clientId: false }; }
    const kb = wasm ? (wasm.length / 1024).toLocaleString('pt-PT', { maximumFractionDigits: 1 }) : null;
    if (!html(v, `${cab('Ajustes')}
        ${erro ? `<div class="mu-card"><h3>Conector</h3><p class="mu-erro">${esc(erro)}</p></div>` : ''}
        <div class="mu-card"><h3>Tidal</h3>
            ${estado.ligado ? `<dl class="mu-kv"><dt>Conta</dt><dd>${esc(estado.utilizador || '—')} (${esc(estado.pais || '—')})</dd><dt>Desde</dt><dd>${esc(dia(estado.ligadoEm))}</dd>
                <dt>Biblioteca</dt><dd>${estado.playlists ?? '—'} playlists · ${estado.pedidos ?? 0} pedidos à espera</dd></dl>` : '<p>Não está ligado.</p>'}
            <div class="mu-acoes">${temAcesso() || store.get('musica:codigo') ? `<button class="mu-btn sec" data-acao="ligar">${estado.ligado ? 'Ligar outra vez' : 'Ligar ao Tidal'}</button>` : ''}
                ${estado.ligado && temAcesso() ? '<button class="mu-btn perigo" id="aj-desligar">Desligar o Tidal</button>' : ''}</div>
            ${!estado.clientId ? `<p class="mu-nota">Falta o Client ID no conector. Redirect URI a registar em developer.tidal.com: <code>${esc(estado.retorno || '')}</code></p>` : ''}</div>
        <div class="mu-card"><h3>Este aparelho</h3><p>${chave.get() ? (estado.tu ? 'Tem acesso à tua biblioteca e ao teu Tidal.' : 'Tem uma chave que já não é válida.') : 'Ainda não tem acesso.'}</p>
            ${chave.get() ? '<div class="mu-acoes"><button class="mu-btn perigo" id="aj-esquecer">Esquecer este aparelho</button></div>' : ''}</div>
        <div class="mu-card"><h3>Conector de dados</h3><label class="mu-campo"><span>Endereço</span><input id="aj-proxy" value="${esc(getProxy())}" inputmode="url" autocapitalize="off" spellcheck="false"></label>
            <div class="mu-acoes"><button class="mu-btn sec" id="aj-proxy-ok">Guardar</button><button class="mu-btn sec" id="aj-proxy-rep">Repor</button></div></div>
        <div class="mu-card"><h3>Motor de curadoria</h3><p>Escrito na <b>Onda</b>, a linguagem que criaste: <code>curador.onda</code> compila para WebAssembly${kb ? ` (${kb} KB)` : ''} e corre aqui no telemóvel,
            na tarefa agendada e nos testes — e o juiz confirma que dá o mesmo, ao bit, que o binário nativo.</p>
            <div class="mu-acoes"><button class="mu-btn sec" id="aj-motor">Testar o motor</button></div><p class="mu-motor" id="aj-motor-r"></p></div>
        <p class="mu-nota">Música ${VERSAO} · conector ${esc(estado.versao || '—')} · <a href="https://github.com/nelsonsous/escolaplay/tree/main/musica" target="_blank" rel="noopener">código</a></p>`)) return;
    document.getElementById('aj-desligar')?.addEventListener('click', async () => {
        if (!confirm('Desligar o Tidal? O Curador deixa de criar playlists até voltares a ligar.')) return;
        try { await api.desligar(); toast('Tidal desligado.'); rota(); } catch (e) { toast(e.message); }
    });
    document.getElementById('aj-esquecer')?.addEventListener('click', () => {
        if (!confirm('Esquecer este aparelho? Para voltar a ter acesso precisas de um link de ligação novo.')) return;
        chave.del(); estado = null; toast('Aparelho esquecido.'); rota();
    });
    document.getElementById('aj-proxy-ok').onclick = () => { setProxy(document.getElementById('aj-proxy').value); estado = null; toast('Conector guardado.'); rota(); };
    document.getElementById('aj-proxy-rep').onclick = () => { setProxy(PROXY_PADRAO); estado = null; toast('Conector reposto.'); rota(); };
    document.getElementById('aj-motor').onclick = async () => {
        const out = document.getElementById('aj-motor-r');
        try {
            const w = await motor();
            const r = (i) => ((i * 2654435761) % 1000 + 1000) % 1000;
            const cands = Array.from({ length: 60 }, (_, i) => ({ c: { motivo: '' }, f: { id: String(i), titulo: `t${i}`, artistas: [`a${i % 25}`], tags: [], duracao: 200 },
                s: { artista: `a${i % 25}`, genero: ['jazz', 'soul', 'rock', 'pop', 'fado'][i % 5], ano: 1950 + (i * 7) % 75, gosto: r(i), qualidade: 750, tendencia: r(i + 7), claude: r(i + 3), novidade: r(i + 11), energia: r(i + 5), bpm: 70 + (i * 13) % 100, tom: 1 + (i * 5) % 24 } }));
            const t0 = performance.now();
            const res = await afinar({ faixas: 30, maxArtista: 2, estilo: 'equilibrado', arco: 'onda' }, cands, w);
            out.textContent = `${res.faixas.length} faixas escolhidas de 60 e ordenadas em ${(performance.now() - t0).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} ms (${(w.length / 1024).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} KB de WASM).`;
        } catch (e) { out.textContent = e.message; }
    };
}

// ---------- arranque ----------
const aviso = lerRetorno();
if (aviso) setTimeout(() => toast(aviso, 5000), 300);
if (!location.hash) history.replaceState(null, '', location.pathname + location.search + '#/');
rota();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
