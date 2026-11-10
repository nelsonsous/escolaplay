// Meteo — previsão do tempo para o ponto exato, com a mesma linguagem da app Mercados.
// A previsão é calculada no telemóvel por ./lib/data.js (com o radar no ponto, RainViewer); o conector (Cloudflare
// Worker) serve METAR, FIRMS, fogos.pt, satélite, locais, avisos do utilizador e a análise do Claude.
// Endereço do conector nos Ajustes ou ?proxy=URL. Sem contas: cada telemóvel tem uma identidade anónima (api.js); a
// análise diária do Claude está desligada por omissão e cada telemóvel liga-a para 1 local, que só ele vê. O dono da app
// (?dono=<código>, uma vez) não tem limite, vê e gere os locais todos e tem o painel "Utilização".
import { loadForecast, requestAnalysis, setProxy, getProxy, DEFAULT_PROXY, radarMaps } from './lib/data.js';
import { withReport, reportActive } from './lib/engine.js';
import { mergeMemory, learnHistory, LVARS, LEADS } from './lib/learn.js';
import { radarFrames, radarTileUrl, RADAR } from './lib/radar.js';
import { REPORT_KINDS, REPORT_MIN } from './lib/sources.js';
import * as api from './api.js';
import * as F from './format.js';
import { weatherIcon, ui } from './icons.js';
import { renderHourly, renderNowcast } from './charts.js';
import { skyHtml, startRain, rainFrames, startSky, skyGL, pauseSky } from './sky.js';
import { waterFeel, seaState } from './lib/marine.js';

const VERSION = '1.18.3';
const SCHEDULE = ['07:34', '13:34', '17:34', '20:34']; // igual ao conector (/api/status)
const REFRESH_MIN = 15;
const LAYERS = [
    ['geocolour', 'Nuvens', 'Nuvens em cor natural de dia; de noite, infravermelho com as luzes das cidades (satélite MTG, Meteosat de 3.ª geração).'],
    ['radar', 'Radar', 'Radar de chuva (RainViewer, que junta os radares meteorológicos, incluindo os do IPMA): as últimas 2 horas, de 10 em 10 minutos, sobre as nuvens. As manchas em cunha que não se mexem, perto dos radares, são ecos fixos e não chuva.'],
    ['ir', 'Infravermelho', 'Infravermelho 10,5 µm: quanto mais branco, mais alto e frio é o topo da nuvem. Mostra frentes e trovoadas de dia e de noite.'],
    ['lightning', 'Relâmpagos', 'Relâmpagos detetados pelo Lightning Imager do MTG nos últimos minutos, sobre o infravermelho.'],
    ['fire', 'Fogo', 'Temperatura do fogo (RGB): os focos ativos aparecem em laranja e amarelo.'],
    ['rain', 'Chuva', 'Intensidade da precipitação estimada por satélite (H SAF).'],
    ['airmass', 'Massas de ar', 'Massas de ar: vermelho = ar seco que desce (perto das depressões), verde = ar tropical, azul e violeta = ar polar. Ajuda a ver frentes e correntes de jato.'],
];
const ZOOMS = [300, 600, 1200];
const RZOOMS = [7, 6]; // radar: imagens centradas no ponto, ~240 e ~470 km de largura
const RAIN_CLS = (mmh) => (mmh >= 10 ? 'r3' : mmh >= 2.5 ? 'r2' : mmh >= RADAR.wetMmh ? 'r1' : '');
const REPORT_ICON = { chuva: 61, 'chuva-forte': 65, 'nao-chove': 2, nevoeiro: 45, granizo: 89, trovoada: 95 };
const IND = { rain: ['rain', 'Chuva'], wind: ['wind', 'Vento'], thunder: ['bolt', 'Trovoada'], fog: ['fog', 'Nevoeiro'], frost: ['frost', 'Geada'], heat: ['heat', 'Calor'], snow: ['snow', 'Neve'], uv: ['sun', 'UV'] };
const SRC = { marine: 'Mar (Open-Meteo Marine)', det: 'Modelos determinísticos', ens: 'Ensembles', prev: 'Corridas anteriores', metar: 'METAR (aeroportos)', place: 'Nome do local', clim: 'Normal climática', analysis: 'Análise do Claude', stations: 'Estações do IPMA', obs: 'Observações do IPMA', warnings: 'Avisos do IPMA', rcm0: 'Risco de incêndio (hoje)', rcm1: 'Risco de incêndio (amanhã)', districts: 'Distritos do IPMA', fogos: 'Ocorrências ANEPC', firms: 'Focos de calor (FIRMS)', ipmaFc: 'Previsão oficial do IPMA (concelho)', elev: 'Altitude das estações', obsHist: 'Histórico das estações', terrain: 'Relevo à volta do ponto', radar: 'Radar de chuva (RainViewer)' };
const SHARE_KM = 5; // como o conector (lib/places.js): na mesma cidade junta-se à análise que já existe
const FAR_KM = 2; // a análise mostrada é de um ponto a mais do que isto do ponto selecionado → avisar e oferecer mudar
const TITLES = { dias: 'Próximos dias', satelite: 'Satélite', analise: 'Análise', ajustes: 'Ajustes' };
const APP_URL = 'https://nelsonsous.github.io/escolaplay/meteo/';
// texto de "Partilhar" (já leva o endereço: sem url à parte, que alguns sítios repetem)
const SHARE_TEXT = '🌦️ Meteo — previsão do tempo para o sítio exato onde estás. Junta 9 modelos meteorológicos, 212 cenários, a previsão oficial do IPMA, as estações mais próximas e o radar, e ajusta tudo ao ponto e ao relevo onde estás: agora e próximas 2 horas, 72 horas e 16 dias com a confiança de cada dia, avisos do IPMA, incêndios, satélite e, opcional, uma análise escrita pelo Claude. Grátis, sem conta e sem publicidade. https://nelsonsous.github.io/escolaplay/meteo/ — iPhone: abre no Safari → Partilhar → «Adicionar ao ecrã principal». Android: abre no Chrome → ⋮ → «Instalar app».';
const OTHERS_UI = [['on', 'Ligada'], ['1x', 'Só 1× por dia (07:34)'], ['off', 'Desligada']]; // "análise dos outros" (só o dono)
const PAUSE_DAYS = 14; // como o conector (lib/places.js): sem abrir a app 14 dias, a análise diária fica em pausa

// ---------- configuração ----------
const KEY = 'meteo:v1';
const DEFAULTS = { proxy: '', tab: 'agora', fs: 'n', layer: 'geocolour', km: 600, rz: 7, loc: null, favs: [], noInstall: false, lv: 't', ll: 1, anim: true };
const cfg = { ...DEFAULTS, ...(api.store.get(KEY) || {}) };
if (!Array.isArray(cfg.favs)) cfg.favs = [];
if (!TITLES[cfg.tab] && cfg.tab !== 'agora') cfg.tab = 'agora';
const saveCfg = () => api.store.set(KEY, cfg);
let openFromLink = null, focusFromLink = ''; // secção «Ver mais» a abrir já e parte a mostrar (vindas da notificação)
let ownerJust = ''; // 'set' | 'cleared': o código do dono acabou de chegar pelo endereço (aviso quando o conector responder)
{
    const sp = new URLSearchParams(location.search);
    let changed = false;
    const p = sp.get('proxy');
    if (p && /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)/.test(p)) {
        cfg.proxy = p.replace(/\/+$/, ''); saveCfg();
        sp.delete('proxy'); changed = true;
    }
    // ?dono=<código> (uma vez): fica só neste telemóvel e sai logo do endereço; ?dono= vazio esquece-o
    if (sp.has('dono')) {
        ownerJust = api.setOwnerCode(sp.get('dono')) ? 'set' : 'cleared';
        sp.delete('dono'); changed = true;
    }
    // ?tab=analise&abrir=d-an (tocar na notificação do fim do dia abre a análise completa)
    const tb = sp.get('tab');
    if (sp.has('tab')) {
        if (tb && (TITLES[tb] || tb === 'agora')) { cfg.tab = tb; saveCfg(); }
        sp.delete('tab'); changed = true;
    }
    if (sp.has('abrir')) { if (/^d-[a-z]+$/.test(sp.get('abrir') || '')) openFromLink = sp.get('abrir'); sp.delete('abrir'); changed = true; }
    if (sp.has('foco')) { if (/^an-[a-z]+$/.test(sp.get('foco') || '')) focusFromLink = sp.get('foco'); sp.delete('foco'); changed = true; }
    if (changed) history.replaceState(null, '', location.pathname + (sp.toString() ? '?' + sp : '') + location.hash);
}
setProxy(cfg.proxy || DEFAULT_PROXY);

const st = {
    fc: null, savedAt: 0, loading: false, error: '', offline: false, lastFetch: 0,
    analysis: undefined, places: [], status: null, statusErr: '', usage: null, usageErr: '', // usage = painel do dono
    pulling: false, sheet: null, installEvt: null, iosHint: false, updateReady: false, analyzing: false,
    report: api.loadReport(), reports: [], // aviso deste telemóvel e avisos recentes do conector
    rv: null, rvErr: '', rvIdx: null, rvPlay: 0, // camada Radar: lista de imagens, imagem mostrada, animação
    memory: null, // memória da aprendizagem deste ponto (telemóvel + conector), para o gráfico da evolução
    push: null, pushBusy: false, // notificações do fim do dia: { on, time, sunday, place } (do conector)
    open: new Set(), // secções «Ver mais» abertas (ficam abertas quando a página se redesenha)
    focus: '', // parte da página a mostrar quando aparecer (a semana, vinda da notificação de domingo)
};
if (openFromLink) st.open.add(openFromLink);
st.focus = focusFromLink;
// a notificação tocada: ir para a análise (aberta toda), e ao domingo para a semana
let navDone = 0, navTimer = 0;
function openFromNotification(n) {
    if (!n || !TITLES[n.tab]) return;
    clearTimeout(navTimer);
    if (n.at && n.at === navDone) return; // o mesmo toque chega pela mensagem e pela cache
    navDone = n.at || 0;
    cfg.tab = n.tab; saveCfg();
    if (n.open) st.open.add(n.open);
    st.focus = /^an-[a-z]+$/.test(n.focus || '') ? n.focus : '';
    closeSheet(); window.scrollTo(0, 0); render();
}
async function checkNav() {
    try {
        const c = await caches.open('meteonav'), r = await c.match('nav');
        if (!r) return false;
        await c.delete('nav');
        const n = await r.json();
        if (Date.now() - n.at < 10 * 60e3) { openFromNotification(n); return true; }
    } catch { /* sem cache: fica onde está */ }
    return false;
}
// No iPhone a app fica visível antes de o service worker gravar o pedido do toque: ver várias vezes durante uns segundos
function watchNav(ms = 6000) {
    clearTimeout(navTimer);
    const t0 = Date.now();
    const tick = async () => { if (await checkNav()) return; if (Date.now() - t0 < ms) navTimer = setTimeout(tick, 250); };
    tick();
}
// Simples (estilo Trade Republic): o essencial à vista, o resto em «Ver mais»
const more = (id, label, inner, cls = '') => (inner ? `<details class="more${cls ? ' ' + cls : ''}" id="${id}"${st.open.has(id) ? ' open' : ''}><summary><span>${label}</span>${ui('chevron')}</summary><div class="more-in">${inner}</div></details>` : '');

// ---------- utilitários ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const cap1 = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
const todayOf = (fc) => fc?.now?.time?.slice(0, 10) || fc?.daily?.[0]?.date || '';
const localGen = (fc) => F.localFromUtc(fc.generatedAt, fc.location?.utcOffsetSeconds);
const sig = (c, lab = true) => ui(c === 'alta' ? 'signal3' : c === 'media' ? 'signal2' : 'signal1', '', lab ? F.CONF[c] || '' : '');
function haversineKm(a, b, c, d) {
    const R = 6371, rad = Math.PI / 180;
    const x = Math.sin(((c - a) * rad) / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
}
const placeName = () => cfg.loc?.name || st.fc?.location?.name || (cfg.loc ? 'Local atual' : 'Meteo');
// o aviso que vale agora (deste telemóvel ou do conector): o mais recente, ≤ 45 min e ≤ 2 km do ponto
function currentReport() {
    if (!cfg.loc) return null;
    const ok = [st.report, ...st.reports].filter((r) => reportActive(r, { lat: cfg.loc.lat, lon: cfg.loc.lon }));
    return ok.sort((a, b) => Date.parse(b.time) - Date.parse(a.time))[0] || null;
}
// a previsão como se mostra: com o aviso do utilizador aplicado ao "agora" e às próximas 2 h
const viewFc = () => (st.fc ? withReport(st.fc, currentReport(), Date.now()) : null);
let reportT = 0;
function reportTimer() { // ao fim dos 45 min o aviso deixa de contar: volta a desenhar
    clearTimeout(reportT);
    const r = currentReport();
    if (r) reportT = setTimeout(() => { scheduleRender(); reportTimer(); }, Math.max(1000, Date.parse(r.time) + REPORT_MIN * 6e4 - Date.now() + 1000));
}
const near = (a, b, km = 0.2) => a && b && haversineKm(a.lat, a.lon, b.lat, b.lon) <= km;
// locais com análise diária: os deste telemóvel (o dono vê também os dos outros, com mine = false e ~1 km)
const isOwner = () => !!st.status?.owner;
const myPlaces = () => st.places.filter((p) => p.mine !== false);
const onPlaces = () => myPlaces().filter((p) => !p.off);
const othersMode = () => st.status?.others || 'on';
function upsertPlace(p) {
    if (!p?.id) return;
    st.places = st.places.some((x) => x.id === p.id) ? st.places.map((x) => (x.id === p.id ? { ...x, ...p, ...(p.off ? {} : { off: undefined, offBy: undefined }) } : x)) : [...st.places, p];
}

let toastT = 0;
function toast(msg, undo) {
    const t = $('#mt-toast');
    t.textContent = msg; t.classList.toggle('act', !!undo);
    if (undo) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 't-undo'; b.textContent = 'Desfazer';
        b.onclick = () => { t.classList.remove('show', 'act'); undo(); };
        t.append(' ', b);
    }
    t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show', 'act'), undo ? 6000 : 3600);
}

// ---------- arranque ----------
function init() {
    applyFs();
    if ('serviceWorker' in navigator) {
        const had = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.register('./sw.js').catch(() => {});
        navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) { st.updateReady = true; scheduleRender(); } });
        navigator.serviceWorker.addEventListener('message', (e) => {
            if (e.data?.type === 'tab') { openFromNotification(e.data); caches.open('meteonav').then((c) => c.delete('nav')).catch(() => {}); }
        });
    }
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (!standalone && !cfg.noInstall) {
        window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); st.installEvt = e; scheduleRender(); });
        const ua = navigator.userAgent;
        st.iosHint = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    }
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') watchNav();
        if (document.visibilityState === 'visible' && cfg.loc && Date.now() - st.lastFetch > REFRESH_MIN * 60e3) refresh();
    });
    watchNav();
    window.addEventListener('pageshow', (e) => { if (e.persisted) watchNav(); });
    window.addEventListener('online', () => { if (st.offline) refresh(); });
    loadStatus();
    if (cfg.loc) setLocation(cfg.loc, { save: false });
    else render();
    reportTimer();
}
function applyFs() {
    if (cfg.fs && cfg.fs !== 'n') document.documentElement.dataset.fs = cfg.fs;
    else delete document.documentElement.dataset.fs;
}

// ---------- local ----------
function setLocation(loc, { save = true } = {}) {
    cfg.loc = { lat: api.r4(loc.lat), lon: api.r4(loc.lon), name: loc.name || null, gps: !!loc.gps, acc: loc.acc ?? null };
    if (save) saveCfg();
    st.analysis = undefined; st.offline = false; st.error = ''; st.reports = []; stopRadar(); st.rv = null;
    const saved = api.loadSavedForecast(cfg.loc.lat, cfg.loc.lon);
    st.fc = saved?.fc || null; st.savedAt = saved?.savedAt || 0;
    st.memory = api.loadLearning(cfg.loc.lat, cfg.loc.lon);
    render();
    refresh();
}
function locate() {
    if (!('geolocation' in navigator)) { toast('Este dispositivo não dá a localização. Pesquisa o local.'); openSheet('place'); return; }
    toast('A obter a localização…');
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            closeSheet();
            setLocation({ lat: latitude, lon: longitude, gps: true, acc: Math.round(accuracy) });
            toast(`Localização com precisão de ${F.num(accuracy)} m`);
        },
        (err) => {
            toast(err.code === 1 ? 'Sem autorização para a localização. Ativa-a nas definições ou pesquisa o local.' : 'Não foi possível obter a localização. Tenta de novo ou pesquisa o local.');
            if (!cfg.loc) openSheet('place');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
}

// ---------- dados ----------
async function refresh() {
    if (!cfg.loc || st.loading) return;
    const loc = cfg.loc;
    st.loading = true; renderStatus();
    const an = loadAnalysis(loc);
    // aprendizagem: a memória deste telemóvel e a do conector (a do local com a análise diária, ≤ 3 km)
    const local = api.loadLearning(loc.lat, loc.lon);
    const remote = (statusP || Promise.resolve()).then(() => api.getLearning(loc.lat, loc.lon)).then((r) => r?.memory || null).catch(() => null);
    try {
        const fc = await loadForecast({ lat: loc.lat, lon: loc.lon, name: loc.name || undefined,
            memory: remote.then((m) => [local, m].filter(Boolean)), reports: st.reports });
        if (cfg.loc !== loc) return;
        st.fc = fc; st.savedAt = Date.now(); st.lastFetch = Date.now(); st.offline = false; st.error = '';
        learnSave(loc, fc, local, remote);
        api.saveForecast(loc.lat, loc.lon, fc);
    } catch (e) {
        if (cfg.loc !== loc) return;
        st.error = /failed to fetch|networkerror|load failed|network/i.test(e?.message || '') ? 'Sem ligação à Internet.' : (e?.message || 'Não foi possível obter a previsão.');
        if (st.fc) { st.offline = true; toast(st.error); }
    } finally {
        if (cfg.loc === loc) { st.loading = false; scheduleRender(); }
    }
    await an;
}
// junta os dias verificados agora (e a memória do conector, quando chegar) à memória deste telemóvel
async function learnSave(loc, fc, local, remote) {
    const win = fc.learning?.window;
    const m = await remote;
    if (!win && !m) return;
    const off = fc.location?.utcOffsetSeconds || 0;
    const today = new Date(Date.parse(fc.generatedAt) + off * 1000).toISOString().slice(0, 10);
    const mem = mergeMemory(local, [m, win].filter(Boolean), { lat: loc.lat, lon: loc.lon, today });
    api.saveLearning(loc.lat, loc.lon, mem);
    if (cfg.loc === loc) { st.memory = mem; if (cfg.tab === 'analise') scheduleRender(); }
}
async function loadAnalysis(loc) {
    // o pedido do estado vai primeiro e regista este telemóvel; os outros vêm depois (uma só gravação no conector)
    if (statusP) await statusP;
    const [a, p, r] = await Promise.allSettled([api.getAnalysis(loc.lat, loc.lon), api.getPlaces(), api.getReports(loc.lat, loc.lon)]);
    if (cfg.loc !== loc) return;
    if (r.status === 'fulfilled') {
        const had = currentReport();
        st.reports = r.value;
        if (currentReport() !== had) { reportTimer(); scheduleRender(); }
    }
    if (a.status === 'fulfilled' && a.value) { st.analysis = a.value; api.saveAnalysis(loc.lat, loc.lon, a.value); }
    else {
        const saved = api.loadSavedAnalysis(loc.lat, loc.lon);
        st.analysis = saved?.data
            ? { ...saved.data, ageMin: (saved.data.ageMin ?? 0) + (Date.now() - saved.savedAt) / 60e3, offline: true }
            : { analysis: null, error: a.reason?.message || 'análise indisponível' };
    }
    if (p.status === 'fulfilled') st.places = p.value || [];
    if (cfg.tab === 'agora' && $('#cl-teaser')) $('#cl-teaser').outerHTML = teaserHtml();
    else if (cfg.tab === 'analise' || cfg.tab === 'ajustes') scheduleRender();
}
let statusP = null;
function loadStatus() {
    statusP = (async () => {
        const had = !!st.status, was = isOwner();
        try { st.status = await api.getStatus(); st.statusErr = ''; } catch (e) { st.status = null; st.statusErr = e.message; }
        if (ownerJust && st.status) {
            toast(ownerJust === 'cleared' ? 'Código do dono esquecido neste telemóvel.' : st.status.owner ? 'Modo dono ligado neste telemóvel.'
                : st.status.ownerCode === 'sem_codigo' ? 'Código guardado, mas o conector ainda não tem o código do dono (OWNER_CODE).' : 'O conector não aceitou este código do dono.');
            ownerJust = '';
        }
        if (had && st.status && isOwner() !== was && cfg.loc) loadAnalysis(cfg.loc); // passou (ou deixou) de ser o dono
        if (st.status?.device) loadPush();
        if (isOwner() && cfg.tab === 'ajustes') loadUsage();
        if (cfg.tab === 'ajustes' || cfg.tab === 'analise') scheduleRender();
    })();
    return statusP;
}
async function loadPush() {
    try { st.push = await api.getPush(); } catch { /* fica o que havia */ }
    if (cfg.tab === 'ajustes') scheduleRender();
}
async function loadUsage() {
    if (!isOwner()) { st.usage = null; return; }
    try { st.usage = await api.getUsage(); st.usageErr = ''; } catch (e) { st.usageErr = e.message; }
    if (cfg.tab === 'ajustes') scheduleRender();
}

// ---------- render ----------
let pending = false;
function scheduleRender() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; render(); });
}
function render() {
    $$('#mt-nav button').forEach((b) => { b.classList.toggle('on', b.dataset.tab === cfg.tab); b.setAttribute('aria-current', b.dataset.tab === cfg.tab ? 'page' : 'false'); });
    if (st.pulling) return;
    const body = $('#mt-body');
    const act = document.activeElement;
    if (act && body.contains(act) && act.matches('input')) { renderStatus(); return; }
    const v = { dias: viewDays, satelite: viewSat, analise: viewAnalysis, ajustes: viewSettings }[cfg.tab] || viewNow;
    const { title, html } = v();
    body.innerHTML = `<h1 class="pg-t">${title}</h1><div class="pg-st" id="mt-status" aria-live="polite"></div>${html}`;
    renderStatus();
    mount();
    const f = st.focus && document.getElementById(st.focus);
    if (f) { st.focus = ''; f.scrollIntoView({ block: 'start' }); }
    document.title = cfg.loc ? `${placeName()} · Meteo` : 'Meteo';
}
function renderStatus() {
    const el = $('#mt-status');
    if (!el) return;
    if (!cfg.loc) { el.innerHTML = '<span><span class="dot"></span>Escolhe um local</span>'; return; }
    const fc = st.fc;
    let a;
    if (st.loading) a = '<span><span class="dot busy"></span>A atualizar…</span>';
    else if (!fc) a = st.error ? '<span><span class="dot off"></span>Sem previsão</span>' : '<span><span class="dot busy"></span>A calcular…</span>';
    else {
        const g = localGen(fc), today = todayOf(fc);
        const when = g ? `${F.dayDiff(g.slice(0, 10), today) === 0 ? '' : F.dayLabel(g.slice(0, 10), today).toLowerCase() + ' '}${F.hhmm(g)}` : '';
        const old = Date.now() - st.savedAt > 45 * 60e3;
        a = st.offline ? `<span><span class="dot off"></span>Sem ligação · dados de ${esc(when)}</span>`
            : `<span><span class="dot ${old ? 'busy' : 'on'}"></span>${old ? 'Dados de' : 'Atualizado às'} <b>${esc(when)}</b></span>`;
    }
    const L = fc?.location;
    let b = `${F.num(cfg.loc.lat, 4)}, ${F.num(cfg.loc.lon, 4)}`;
    if (F.isNum(L?.elevation)) b += ` · ${F.num(L.elevation)} m`;
    if (cfg.loc.gps && F.isNum(cfg.loc.acc)) b += ` · GPS ±${F.num(cfg.loc.acc)} m`;
    el.innerHTML = `${a}<span class="num">${esc(b)}</span>${nearPlace() ? '<span class="cl-on">✦ análise do Claude</span>' : ''}`;
}
// o céu animado pára quando o cartão sai do ecrã (poupa bateria)
let skyWatch = null;
function watchSky() {
    skyWatch?.disconnect();
    const sky = $('.now .sky');
    if (!sky || !('IntersectionObserver' in window)) return;
    skyWatch = new IntersectionObserver((es) => { for (const e of es) e.target.classList.toggle('off', !e.isIntersecting); });
    skyWatch.observe(sky);
    if (!startSky(sky)) startRain(sky.querySelector('.sky-rain')); // a Onda na placa gráfica; sem WebGL2, o céu em CSS
}
function mount() {
    watchSky();
    const fc = viewFc();
    if (cfg.tab === 'agora' && fc) {
        const nc = $('#nc-chart'); if (nc) renderNowcast(nc, fc.nowcast, { onda: cfg.anim !== false });
        const hc = $('#h-chart'); if (hc) renderHourly(hc, fc.hourly, { todayIso: todayOf(fc) });
    }
    const img = $('#sat-img');
    if (img) {
        const fr = img.closest('.sat-frame');
        const done = () => fr.classList.remove('loading', 'err');
        img.addEventListener('load', done);
        img.addEventListener('error', () => { fr.classList.remove('loading'); fr.classList.add(fr.classList.contains('rad') ? 'nobg' : 'err'); });
        if (img.complete && img.naturalWidth) done();
    }
    const rim = $('#rad-img');
    if (rim) rim.addEventListener('error', () => { if (!st.rvPlay) rim.closest('.sat-frame')?.classList.add('err'); });
    // camada Radar: a lista das imagens (pede de novo ao fim de 5 min)
    if (cfg.tab === 'satelite' && cfg.layer === 'radar' && cfg.loc && (!st.rv || Date.now() - st.rv.at > 5 * 60e3)) loadRadarLayer();
}

// ---------- vistas ----------
const needPlace = (title) => ({ title, html: `<div class="empty">Escolhe primeiro um local.<div style="margin-top:10px"><button type="button" class="btn pri sm" data-act="place">Escolher local</button></div></div>` });
const skeleton = () => `<div class="box now"><div class="skel skel-l" style="width:40%;height:56px"></div><div class="skel skel-l"></div><div class="skel skel-l s"></div><p class="note">A combinar os modelos para este ponto…</p></div>`;

function banners() {
    let h = '';
    if (st.updateReady) h += `<div class="banner">${ui('refresh')}<span>Há uma versão nova da app.</span><button type="button" class="btn sm" data-act="reload">Atualizar</button></div>`;
    if (st.offline && st.error) h += `<div class="banner warn">${ui('alert')}<span>${esc(st.error)} A mostrar a última previsão guardada.</span><button type="button" class="btn sm" data-act="refresh">Tentar</button></div>`;
    if (st.installEvt) h += `<div class="banner">${ui('install')}<span>Instala a Meteo no ecrã inicial.</span><button type="button" class="btn pri sm" data-act="install">Instalar</button><button type="button" class="xbtn" data-act="no-install" aria-label="Fechar">✕</button></div>`;
    else if (st.iosHint) h += `<div class="banner">${ui('share')}<span>Para instalar: toca em Partilhar e depois em «Adicionar ao ecrã principal».</span><button type="button" class="xbtn" data-act="no-install" aria-label="Fechar">✕</button></div>`;
    return h;
}

function viewNow() {
    if (!cfg.loc) {
        return { title: 'Meteo', html: `<div class="welcome">${weatherIcon(2, true, 72, '', cfg.anim !== false)}<h2>Previsão para o sítio exato onde estás</h2>
            <p>Combina 9 modelos meteorológicos, mais de 200 cenários de ensemble e observações reais e, se quiseres, uma análise escrita pelo Claude.</p>
            <div class="btns"><button type="button" class="btn pri" data-act="gps">${ui('gps')}Usar a minha localização</button><button type="button" class="btn" data-act="place">${ui('search')}Pesquisar local</button></div></div>` };
    }
    const title = `<button type="button" class="pg-loc" data-act="place" aria-label="${esc(placeName())} — mudar de local">${esc(placeName())}${ui('chevron')}</button>`;
    const fc = viewFc();
    if (!fc) {
        return { title, html: st.error
            ? `<div class="empty">${esc(st.error)}<div style="margin-top:10px"><button type="button" class="btn pri sm" data-act="refresh">Tentar de novo</button></div></div>`
            : skeleton() };
    }
    return { title, html: banners() + nowBox(fc) + alertsHtml(fc) + teaserHtml() + nowcastSec(fc) + seaSec(fc) + hourlySec(fc) + daysMini(fc)
        + more('d-ind', 'Indicadores', tilesSec(fc), 'sec-more') };
}

function tintOf(code, isDay) {
    const g = F.wxGroup(code);
    const t = ['drizzle', 'rain', 'showers', 'freezing'].includes(g) ? 'rain' : ['snow', 'snowshowers'].includes(g) ? 'snow' : g === 'storm' ? 'storm' : g === 'fog' ? 'fog' : ['clear', 'mostly'].includes(g) ? 'clear' : 'cloudy';
    return `t-${t}${isDay === false ? ' night' : ''}`;
}
function nowBox(fc) {
    const n = fc.now || {}, d0 = fc.daily?.[0] || {};
    const [ti, td] = F.num(n.temp, 1).split(',');
    // à vista: o que vem nas próximas 2 horas (e o teu aviso); o resto (radar, estações, correção, relevo) em «Detalhes»
    const main = [];
    if (fc.nowcast?.text) main.push(`<li>${ui('drop')}<span>${esc(fc.nowcast.text)}</span></li>`);
    const rp = fc.report;
    if (rp) main.push(`<li>${ui('person')}<span>O teu aviso: <b>${esc(rp.label)}</b> · ${esc(F.ago(rp.ageMin))} · conta até às ${esc(F.hhmm(addMin(rp.local, REPORT_MIN)))}</span></li>`);
    const lines = [];
    const rl = radarLine(fc);
    if (rl) lines.push(rl);
    const o = n.obs;
    const many = (o?.n || 1) > 1;
    if (o && F.isNum(o.temp)) lines.push(`<li>${ui('station')}<span>Observado <b>${esc(F.deg(o.temp, 1))}</b> em ${esc(o.station)} · ${many ? '~' : ''}${esc(F.km(o.distanceKm))} · ${esc(F.ago(o.ageMin))} (${esc((o.sources || [o.source]).join(' + '))})</span></li>`);
    const c = n.correction;
    if (c && F.isNum(c.temp) && Math.abs(c.temp) >= 0.1) lines.push(`<li>${ui('target')}<span>Previsão ajustada ${esc(F.signed(c.temp, 1))}° com ${many ? `${esc(o.n)} estações` : 'esta observação'} nas próximas ${esc(c.decayHours ?? 6)} h.</span></li>`);
    const tl = terrainLine(fc);
    if (tl) lines.push(`<li>${ui('relief')}<span>${esc(tl)}</span></li>`);
    const conf = d0.confidence;
    return `<section class="box now ${tintOf(n.code, n.isDay)}" aria-label="Agora">
        ${cfg.anim !== false ? skyHtml(n.code, n.isDay, { wind: n.wind, t: performance.now() / 1000 }) : ''}
        <div class="now-top">
            <div><div class="now-t num" aria-label="${esc(F.deg(n.temp, 1))}"><span aria-hidden="true">${esc(ti)}</span>${td != null ? `<small aria-hidden="true">,${esc(td)}</small>` : ''}<i aria-hidden="true">°</i></div>
                <div class="now-c">${esc(F.wxText(n.code))}</div></div>
            <div class="now-i">${weatherIcon(n.code, n.isDay, 96, F.wxText(n.code), cfg.anim !== false)}</div>
        </div>
        <div class="now-m num"><span>Máx. ${esc(F.deg(d0.tmax))}</span><span>Mín. ${esc(F.deg(d0.tmin))}</span><span>Sensação ${esc(F.deg(n.feels))}</span></div>
        ${main.length ? `<ul class="now-l">${main.join('')}</ul>` : ''}
        <div class="now-rpt"><button type="button" class="btn sm" data-act="report">${ui('drop')}${rp ? 'Mudar o aviso' : 'Está a chover?'}</button>
            ${more('d-now', 'Detalhes', `${lines.length ? `<ul class="now-l">${lines.join('')}</ul>` : ''}${conf ? `<p class="hint">${esc(F.CONF[conf] || '')} para hoje.</p>` : ''}`, 'in-box')}</div>
    </section>`;
}
const addMin = (iso, m) => new Date(Date.parse(iso + ':00Z') + m * 6e4).toISOString().slice(0, 16);
// idade da imagem do radar agora (a previsão pode ter sido calculada há algum tempo)
const radarAge = (fc) => (fc.radar?.ageMin ?? 0) + Math.max(0, (Date.now() - Date.parse(fc.generatedAt)) / 6e4);
// "Radar no ponto: 0,6 mm/h (fraca) · há 8 min" + as últimas 2 h em 13 barras
function radarLine(fc) {
    const R = fc.radar;
    if (!R) return '';
    if (R.covered === false) return `<li>${ui('radar')}<span>Radar: este ponto está fora da cobertura.</span></li>`;
    const A = R.atPoint || {}, age = radarAge(fc);
    const what = A.raining ? `<b>${esc(F.num(A.mmh, A.mmh < 10 ? 1 : 0))} mm/h</b> (${esc(A.label)})` : '<b>sem chuva</b>';
    const when = age > RADAR.maxAgeMin ? `imagem de ${F.ago(age)}, antiga` : F.ago(age);
    const L = R.last2h || [];
    const bars = L.map((x) => { const v = x.mmh || 0, h = v < RADAR.wetMmh ? 0 : Math.min(1, 0.3 + (0.7 * Math.log10(v / RADAR.wetMmh)) / 2.7); return `<i class="${RAIN_CLS(v)}" style="height:${Math.round(h * 100)}%"></i>`; }).join('');
    const strip = L.length ? `<div class="rad-strip" role="img" aria-label="${esc(`Radar no ponto nas últimas 2 horas: ${L.map((x) => `${F.hhmm(x.time)} ${F.num(x.mmh || 0, 1)} mm/h`).join(', ')}`)}">
        <div class="rs-bars" aria-hidden="true">${bars}</div><div class="rs-ax" aria-hidden="true"><span>${esc(F.hhmm(L[0].time))}</span><span>últimas 2 h</span><span>${esc(F.hhmm(L.at(-1).time))}</span></div></div>` : '';
    return `<li class="rad-li">${ui('radar')}<div><span>Radar no ponto: ${what} · ${esc(when)}</span>${strip}</div></li>`;
}
// "Vale · 70 m abaixo do relevo à volta" e, se mexe na previsão, quanto
function terrainLine(fc) {
    const T = fc?.location?.terrain, LA = fc?.local;
    if (!T) return '';
    let s = `${T.label} · ${T.text}`;
    if (T.type === 'vale' && LA) {
        if (F.isNum(LA.now) && LA.now <= -0.1) s += ` · agora ${F.num(LA.now, 1)}° (noite limpa e calma)`;
        else if (LA.hours > 0 && F.isNum(LA.max)) s += ` · até ${F.num(LA.max, 1)}° nas noites limpas e calmas`;
    } else if (T.type === 'topo' && F.isNum(LA?.windFactor) && LA.windFactor > 1) s += ` · vento +${F.num((LA.windFactor - 1) * 100)}%`;
    return s;
}
// Para que ponto é a análise mostrada (o local registado quando foi escrita) e a que distância está do ponto selecionado
function analysedPoint() {
    const r = st.analysis, a = r?.analysis;
    if (!a || !cfg.loc) return null;
    const p = F.isNum(a.place?.lat) && F.isNum(a.place?.lon) ? a.place : F.isNum(r.place?.lat) && F.isNum(r.place?.lon) ? r.place : null;
    if (!p) return null;
    const d = haversineKm(cfg.loc.lat, cfg.loc.lon, p.lat, p.lon);
    const reg = r.place?.id ? myPlaces().find((x) => x.id === r.place.id) || null : null; // local deste telemóvel, como está agora (pode ter mudado de sítio)
    const moved = !!reg && haversineKm(cfg.loc.lat, cfg.loc.lon, reg.lat, reg.lon) <= FAR_KM; // a análise diária já é deste ponto
    return { name: p.name || reg?.name || 'local', lat: p.lat, lon: p.lon, d, far: d > FAR_KM, reg, moved };
}
const forTxt = (ap) => `Para ${ap.name} · ${F.num(ap.lat, 4)}, ${F.num(ap.lon, 4)} · ${ap.d < 0.05 ? 'no ponto selecionado' : `a ${F.km(ap.d)} do ponto selecionado`}`;
const forLine = (ap) => `<div class="cl-for${ap.far ? ' far' : ''}">${ui(ap.far ? 'alert' : 'pin')}<span>${esc(forTxt(ap))}</span></div>`;
function alertsHtml(fc) {
    const today = todayOf(fc);
    let h = '';
    const W = fc.warnings || [];
    if (W.length) {
        h += `<div class="warns">${W.map((w) => `<div class="warn ${esc(w.level)}" role="note">${ui('alert')}<div><b>${esc(w.type)}</b> · aviso ${esc((F.WARN[w.level] || w.level || '').toLowerCase())}
            <span class="w-when">${esc(F.period(w.start, w.end, today))} · ${esc(w.source || 'IPMA')}</span>${w.text ? `<p>${esc(w.text)}</p>` : ''}</div></div>`).join('')}</div>`;
    }
    const ind = fc.indicators || {};
    const act = Object.keys(IND).filter((k) => (ind[k]?.level || 0) >= 2).sort((a, b) => ind[b].level - ind[a].level);
    if (act.length) {
        h += `<ul class="tags" aria-label="Riscos previstos">${act.map((k) => { const it = ind[k];
            return `<li class="tag l${it.level}">${ui(IND[k][0])}<span><b>${IND[k][1]}</b> · ${esc(it.label || F.LEVELS[it.level])}${it.peak ? ` · ${esc(F.whenShort(it.peak, today))}` : ''}</span></li>`; }).join('')}</ul>`;
    }
    return h;
}
// as corridas que valem para este telemóvel: com a "análise dos outros" só 1× por dia, só a da manhã
function schedFor() {
    const s = st.analysis?.schedule || st.status?.schedule || SCHEDULE;
    return !isOwner() && othersMode() === '1x' ? s.slice(0, 1) : s;
}
const schedTxt = (s = schedFor()) => (s.length > 1 ? `${s.slice(0, -1).join(', ')} e ${s.at(-1)}` : s[0]);
function nextRun() {
    const sched = schedFor();
    const d = new Date();
    const now = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const next = sched.find((s) => s > now);
    return next ? `hoje às ${next}` : `amanhã às ${sched[0]}`;
}
function teaserHtml() {
    const r = st.analysis;
    if (r === undefined) return `<div class="claude" id="cl-teaser" aria-busy="true"><div class="adv-src">Análise do Claude</div><div class="skel skel-l"></div><div class="skel skel-l s"></div></div>`;
    const a = r?.analysis;
    if (!a) return `<div class="claude cl-opt" id="cl-teaser">${optInHtml()}</div>`;
    const ap = analysedPoint();
    const tomorrow = a.notificacao?.amanha || a.vestir || '';
    const main = `<div class="adv-src">Análise do Claude <span>· ${esc(F.ago(r.ageMin ?? 0))}</span></div>${ap ? forLine(ap) : ''}
        <div class="cl-head">${esc(a.titulo)}</div>${tomorrow ? `<p class="cl-tom"><b>Amanhã</b> ${esc(tomorrow)}</p>` : a.resumo ? `<p class="clamp">${esc(a.resumo)}</p>` : ''}<span class="lnk">Ler a análise</span>`;
    // feita para outro ponto (> 2 km): dizê-lo e oferecer mudar a análise diária para aqui
    if (ap?.far && ap.reg && !ap.moved) {
        return `<div class="claude far" id="cl-teaser"><button type="button" class="cl-go" data-tab="analise">${main}</button>
            <div class="cl-far"><p>Esta análise é para um ponto a ${esc(F.km(ap.d))} daqui: o tempo aqui pode ser diferente.</p>
            <button type="button" class="btn sm pri" data-act="place-move">${ui('pin')}Mudar a análise diária para este ponto</button></div></div>`;
    }
    const note = ap?.far ? `<p class="cl-farmsg">${esc(ap.moved ? `A análise diária já passou para este ponto: a próxima chega ${nextRun()}.` : 'Feita para outro ponto: o tempo aqui pode ser diferente.')}</p>` : '';
    return `<button type="button" class="claude" id="cl-teaser" data-tab="analise">${main}${note}</button>`;
}
// Sem análise para este ponto. A análise diária do Claude está desligada por omissão: ligá-la é uma escolha clara, para
// este local e só para este telemóvel (os outros telemóveis têm 1 local: ligar aqui muda-o para aqui)
function optInHtml() {
    const head = '<div class="adv-src">Análise do Claude</div>';
    if (st.analysis?.error && !st.analysis.offline) return `${head}<p>Não foi possível obter a análise (${esc(st.analysis.error)}).</p>`;
    const here = nearPlace();
    if (here) return `${head}<p>A análise diária do Claude está ligada para este local (${esc(here.name)}). A primeira chega ${esc(nextRun())}.</p>`;
    const owner = isOwner(), mine = owner ? null : myPlaces()[0];
    if (!owner && mine?.off && mine.offBy === 'owner') return `${head}<p>A análise diária deste telemóvel foi desligada pelo dono da app.</p>`;
    if (!owner && othersMode() === 'off') return `${head}<p>A análise diária do Claude está desligada, por agora, pelo dono da app.</p>`;
    const when = !owner && othersMode() === '1x' ? 'uma vez por dia, às 07:34' : `às ${schedTxt()}`;
    return `${head}<p>Opcional: o Claude escreve uma análise para este ponto exato ${esc(when)}, com os modelos, as observações, o radar e o satélite. Uma análise por cidade: se alguém já a tiver aí, passas a ver a mesma.</p>
        ${mine && !mine.off ? `<p class="cl-farmsg">${esc(`Cada telemóvel tem 1 local: a tua análise diária passa de ${mine.name} para aqui.`)}</p>` : ''}
        <button type="button" class="btn pri cl-on" data-act="place-on">${ui('sparkle')}<span>Ativar a análise diária do Claude para este local</span></button>`;
}
// o mar (só num ponto na costa ou na praia): a temperatura da água, as ondas e o UV de hoje; os próximos dias em «Ver mais»
const uvWord = (u) => (!F.isNum(u) ? '' : u < 3 ? 'baixo' : u < 6 ? 'moderado' : u < 8 ? 'alto' : u < 11 ? 'muito alto' : 'extremo');
function seaSec(fc) {
    const m = fc.marine;
    if (!m?.now || !F.isNum(m.now.sst)) return '';
    const n = m.now, uv = fc.daily?.[0]?.uvMax, today = todayOf(fc);
    const tile = (lab, val, sub) => `<div class="sea-t"><small>${esc(lab)}</small><b class="num">${val}</b><em>${esc(sub)}</em></div>`;
    const days = (m.days || []).slice(0, 7).map((d) => `<div class="row sea-d"><span class="r-name">${esc(cap1(F.dayDiff(today, d.date) <= 1 ? F.dayLabel(d.date, today) : `${F.wdShort(d.date)} ${Number(d.date.slice(8, 10))}`))}</span>
        <span class="num">água ${esc(F.num((d.sstMin + d.sstMax) / 2, 1))}°</span><span class="num muted">${F.isNum(d.waveMax) ? `ondas até ${esc(F.num(d.waveMax, 1))} m` : ''}</span></div>`).join('');
    return `<section class="sec" id="mar"><div class="sec-h"><h2>Mar</h2><span class="sub">${esc(m.distanceKm <= 1.5 ? 'aqui' : `a ${F.km(m.distanceKm)}`)} · Open-Meteo</span></div>
        <div class="box sea"><div class="sea-g">
            ${tile('Água', `${esc(F.num(n.sst, 1))}°`, waterFeel(n.sst))}
            ${F.isNum(n.wave) ? tile('Ondas', `${esc(F.num(n.wave, 1))} m`, `${F.isNum(n.period) ? `${F.num(n.period, 0)} s · ` : ''}${F.windFrom(n.dir)}`) : ''}
            ${F.isNum(uv) ? tile('UV hoje', esc(F.num(uv, 0)), uvWord(uv)) : ''}
        </div>
        <p class="note">${esc(cap1(seaState(n.wave)))}${F.isNum(n.swell) && n.swell >= 0.3 ? ` · ondulação de fundo ${F.num(n.swell, 1)} m` : ''}.</p>
        ${more('d-mar', 'Próximos dias', `<div class="list">${days}</div>`)}</div></section>`;
}
function nowcastSec(fc) {
    if (!fc.nowcast?.steps?.length) return '';
    const wet = fc.nowcast.steps.some((x) => (x.prob || 0) >= 30 && (x.precip || 0) >= 0.05) || fc.radar?.atPoint?.raining || fc.radar?.approach;
    if (!wet) return '';
    const src = fc.nowcast.source === 'aviso' ? 'com o teu aviso' : fc.nowcast.source === 'radar+modelos' ? 'radar e modelos' : 'modelos';
    // o radar desmente os modelos (hora da chuva): dizê-lo por baixo do gráfico
    const C = fc.radar?.compare, off = C && (C.lagMin != null ? Math.abs(C.lagMin) >= 20 : !/de acordo/.test(C.text));
    return `<section class="sec"><div class="sec-h"><h2>Próximas 2 horas</h2><span class="sub">${esc(src)}</span></div><div class="box"><p class="lead">${esc(fc.nowcast.text || '')}</p><div id="nc-chart"></div>
        ${off ? `<p class="note rad-cmp">${ui('radar')}<span>${esc(C.text)}</span></p>` : ''}</div></section>`;
}
const hourlySec = (fc) => (fc.hourly?.length
    ? `<section class="sec"><div class="sec-h"><h2>Próximas horas</h2></div><div class="box"><div id="h-chart" class="chart"></div></div></section>` : '');
// os próximos 5 dias (a mesma linha do separador Dias); os 16 no separador Dias
function daysMini(fc) {
    const D = (fc.daily || []).slice(0, 5);
    if (!D.length) return '';
    const S = dayScale(D);
    return `<section class="sec"><div class="sec-h"><h2>Próximos dias</h2></div><div class="list mini">${D.map((d, i) => dayRow(d, i, fc, S, { extras: false })).join('')}</div>
        <button type="button" class="btn blk ghost" data-tab="dias">Ver os ${esc(F.num(fc.daily.length))} dias</button></section>`;
}

function tilesSec(fc) {
    const n = fc.now || {}, d0 = fc.daily?.[0] || {}, ind = fc.indicators || {}, H = fc.hourly || [];
    const today = todayOf(fc);
    const tile = (icon, label, val, sub, extra = '', cls = '') => `<div class="tile${cls ? ' ' + cls : ''}"><div class="tile-top">${icon}<span>${label}</span></div><div class="tile-val num">${val}</div>${sub ? `<div class="tile-sub">${sub}</div>` : ''}${extra}</div>`;
    const lvl = (key, icon, label) => {
        const it = ind[key] || { level: 0 };
        const lv = it.level || 0;
        const meter = `<div class="meter ${F.levelClass(lv)}" role="img" aria-label="${esc(`${label}: risco ${it.label || F.LEVELS[lv]} (${lv} de 4)`)}">${[1, 2, 3, 4].map((k) => `<i class="${k <= lv ? 'on' : ''}"></i>`).join('')}</div>`;
        const sub = [it.text, it.peak ? F.whenShort(it.peak, today) : ''].filter(Boolean).join(' · ') || 'Sem risco previsto';
        return tile(ui(icon), label, esc(cap1(it.label || F.LEVELS[lv])), esc(sub), meter, 'lvl');
    };
    const rain24 = H.slice(0, 24).reduce((s, x) => s + (x.precip || 0), 0);
    const pop24 = Math.max(0, ...H.slice(0, 24).map((x) => x.pop || 0));
    const p = ind.pressure || {};
    const arrow = (deg) => ui('arrow').replace('<svg ', `<svg style="transform:rotate(${Math.round(deg)}deg)" `);
    const vis = n.visibility;
    const tiles = [
        tile(ui('rain'), 'Chuva em 24 h', esc(F.mm(rain24)), `Probabilidade máxima ${esc(F.pct(pop24))}`),
        tile(F.isNum(n.dir) ? arrow(n.dir + 180) : ui('wind'), 'Vento', `${esc(F.num(n.wind))}<small> km/h</small>`, `Rajadas ${esc(F.kmh(n.gust))} · ${esc(F.windFrom(n.dir))}`),
        tile(ui('drop'), 'Humidade', esc(F.pct(n.rh)), `Ponto de orvalho ${esc(F.deg(n.dew, 1))}`),
        tile(ui('gauge'), 'Pressão', `${esc(F.num(n.pressure))}<small> hPa</small>`, `<span class="trend">${arrow(p.delta3h > 0.5 ? 45 : p.delta3h < -0.5 ? 135 : 90)}${esc(p.trend || '—')}</span> · ${esc(F.signed(p.delta3h, 1))} em 3 h · ${esc(F.signed(p.delta24h, 1))} em 24 h`),
        tile(ui('sun'), 'Índice UV', `${esc(F.num(d0.uvMax))}<small> máx. hoje</small>`, `Agora ${esc(F.num(n.uv, 1))} · ${esc(ind.uv?.label || F.LEVELS[ind.uv?.level || 0])}`),
        tile(ui('cloud'), 'Nebulosidade', esc(F.pct(n.cloud)), `Nuvens baixas ${esc(F.pct(H[0]?.cloudLow))}`),
        tile(ui('eye'), 'Visibilidade', esc(F.dist(vis)), F.isNum(vis) && vis < 1000 ? 'Nevoeiro' : F.isNum(vis) && vis < 5000 ? 'Neblina ou chuva' : 'Boa'),
        lvl('thunder', 'bolt', 'Trovoada'), lvl('fog', 'fog', 'Nevoeiro'), lvl('frost', 'frost', 'Geada'), lvl('heat', 'heat', 'Calor'),
        tile(ui('target'), 'Previsibilidade', ind.predictability?.days != null ? `${esc(F.num(ind.predictability.days))}<small> dias</small>` : '–', esc(ind.predictability?.text || '')),
    ];
    return `<div class="tiles">${tiles.join('')}</div>`;
}

function viewDays() {
    const title = TITLES.dias;
    if (!cfg.loc) return needPlace(title);
    const fc = st.fc;
    if (!fc) return { title, html: skeleton() };
    const D = fc.daily || [];
    const ens = fc.ensemble?.members;
    const S = dayScale(D);
    let rows = '';
    D.forEach((d, i) => {
        if (i > 0 && d.source === 'ensemble' && D[i - 1].source !== 'ensemble') rows += `<div class="grp-h">Dias ${i + 1} a ${D.length} <small>tendência do ensemble${ens ? ` · ${esc(F.num(ens))} cenários` : ''}</small></div>`;
        rows += dayRow(d, i, fc, S);
    });
    return { title, html: `<section class="sec"><div class="sec-h"><h2>${D.length} dias</h2><span class="sub">toca num dia para ver as horas</span></div>
        <div class="list">${rows}</div>
        <p class="legend-inline" aria-hidden="true"><span class="lg"><i class="k-rb"></i>mín.–máx.</span><span class="lg"><i class="k-wh"></i>80% dos cenários</span><span class="lg">${ui('signal3')}confiança</span></p>
        <p class="note">Dias 1 a 7: consenso ponderado de ${esc(fc.models?.length || 0)} modelos, corrigido com as observações. Depois: mediana do ensemble. A linha fina vai do cenário frio (P10) ao quente (P90).</p></section>` };
}
// escala comum das barras mín.–máx. dos dias (e a faixa P10–P90 por trás)
function dayScale(D) {
    const lo = Math.min(...D.map((d) => (F.isNum(d.tminP10) ? d.tminP10 : d.tmin)).filter(F.isNum));
    const hi = Math.max(...D.map((d) => (F.isNum(d.tmaxP90) ? d.tmaxP90 : d.tmax)).filter(F.isNum));
    const span = Math.max(1, hi - lo);
    return { lo, hi, pos: (v) => (((v - lo) / span) * 100).toFixed(2), wid: (a, b) => Math.max(0, ((b - a) / span) * 100).toFixed(2) };
}
// uma linha de dia (separador Dias e próximos dias do Agora): nome, ícone, chuva, mín., barra, máx.
function dayRow(d, i, fc, S, { extras = true } = {}) {
    const today = todayOf(fc);
    const wLo = F.isNum(d.tminP10) ? d.tminP10 : d.tmin, wHi = F.isNum(d.tmaxP90) ? d.tmaxP90 : d.tmax;
    let rng = '';
    if (F.isNum(wLo) && F.isNum(wHi)) rng += `<i class="wh" style="left:${S.pos(wLo)}%;width:${S.wid(wLo, wHi)}%"></i>`;
    if (F.isNum(d.tmin) && F.isNum(d.tmax)) rng += `<i class="rb" style="left:${S.pos(d.tmin)}%;width:${S.wid(d.tmin, d.tmax)}%"></i>`;
    if (i === 0 && F.isNum(fc.now?.temp)) rng += `<i class="rn" style="left:${S.pos(Math.min(Math.max(fc.now.temp, S.lo), S.hi))}%"></i>`;
    const x = extras ? dayExtras(d) : [];
    const label = F.dayLabel(d.date, today);
    const sr = `${label}: ${F.wxText(d.code)}, mínima ${F.deg(d.tmin)}, máxima ${F.deg(d.tmax)}, chuva ${F.pct(d.pop)}${F.CONF[d.confidence] ? ', ' + F.CONF[d.confidence].toLowerCase() : ''}`;
    return `<button type="button" class="row day${i === 0 ? ' today' : ''}" data-day="${i}" aria-label="${esc(sr)}">
            <span class="d-n" aria-hidden="true"><b>${esc(label)}</b><small>${esc(F.dateShort(d.date))}</small></span>
            <span aria-hidden="true">${weatherIcon(d.code, true, 30)}</span>
            <span class="d-p" aria-hidden="true">${(d.pop || 0) >= 10 ? esc(F.pct(d.pop)) : ''}</span>
            <span class="d-lo" aria-hidden="true">${esc(F.deg(d.tmin))}</span>
            <span class="rng" aria-hidden="true">${rng}</span>
            <span class="d-hi" aria-hidden="true">${esc(F.deg(d.tmax))}</span>
            <span class="d-c" aria-hidden="true">${sig(d.confidence, false)}</span>
            ${x.length ? `<span class="d-x" aria-hidden="true">${esc(x.join(' · '))}</span>` : ''}
        </button>`;
}
function dayExtras(d) {
    const x = [];
    if ((d.precip || 0) >= 1) x.push(`${F.mm(d.precip)}${F.isNum(d.precipP90) && d.precipP90 > d.precip * 1.3 + 0.5 ? ` (até ${F.mm(d.precipP90)})` : ''}`);
    if ((d.popHeavy || 0) >= 20) x.push(`chuva forte ${F.pct(d.popHeavy)}`);
    if ((d.gustMax || 0) >= 50) x.push(`rajadas ${F.kmh(d.gustMax)}`);
    if (F.isNum(d.anomaly) && Math.abs(d.anomaly) >= 2) x.push(`${F.num(Math.abs(d.anomaly), 1)}° ${d.anomaly > 0 ? 'acima' : 'abaixo'} do normal`);
    if (d.change24h && F.isNum(d.change24h.tmax) && Math.abs(d.change24h.tmax) >= 1.5) x.push(`máx. ${F.signed(d.change24h.tmax, 1)}° desde ontem`);
    if (d.change24h && F.isNum(d.change24h.precip) && Math.abs(d.change24h.precip) >= 3) x.push(`chuva ${F.signed(d.change24h.precip, 0)} mm desde ontem`);
    return x;
}

function viewSat() {
    const title = TITLES.satelite;
    if (!cfg.loc) return needPlace(title);
    if (!LAYERS.some((l) => l[0] === cfg.layer)) cfg.layer = 'geocolour';
    if (!ZOOMS.includes(cfg.km)) cfg.km = 600;
    const layer = LAYERS.find((l) => l[0] === cfg.layer);
    const fc = st.fc;
    let html = `<section class="sec"><div class="chips" role="tablist" aria-label="Camada de satélite">${LAYERS.map(([id, name]) => `<button type="button" role="tab" data-layer="${id}" aria-selected="${id === cfg.layer}" class="${id === cfg.layer ? 'on' : ''}">${name}</button>`).join('')}</div>
        ${cfg.layer === 'radar' ? radarFrameHtml() : `<div class="sat-frame loading"><img id="sat-img" src="${esc(api.satUrl(cfg.layer, cfg.loc.lat, cfg.loc.lon, cfg.km))}" width="720" height="540" alt="${esc(`Imagem de satélite (${layer[1].toLowerCase()}) centrada no local`)}" decoding="async"><span class="sat-mk" aria-hidden="true"></span><span class="sat-msg">Imagem indisponível de momento.</span></div>
        <div class="sat-bar"><div class="seg" role="group" aria-label="Largura da imagem">${ZOOMS.map((z) => `<button type="button" data-km="${z}" aria-pressed="${z === cfg.km}" class="${z === cfg.km ? 'on' : ''}">${F.num(z)} km</button>`).join('')}</div><span class="note" style="margin:0">EUMETSAT · o local está no centro</span></div>`}
        <p class="note">${esc(layer[2])}</p></section>`;
    html += fc ? fireHtml(fc) : skeleton();
    return { title, html };
}
// ---------- camada Radar (RainViewer): imagens centradas no ponto sobre as nuvens, a última e as últimas 2 h ----------
const radarKm = (z) => (40075.016686 * Math.cos((cfg.loc.lat * Math.PI) / 180)) / 2 ** z; // largura da imagem (km)
const rvUrl = (f, z) => radarTileUrl(st.rv.host, f.path, cfg.loc.lat, cfg.loc.lon, { size: 512, z, smooth: 1, snow: 1 });
function rvLabel(f) {
    const off = st.fc?.location?.utcOffsetSeconds;
    const t = F.isNum(off) ? F.localFromUtc(new Date(f.ms).toISOString(), off) : new Date(f.ms - new Date(f.ms).getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    return `${F.hhmm(t)} · ${F.ago((Date.now() - f.ms) / 6e4)}`;
}
function radarFrameHtml() {
    if (!RZOOMS.includes(cfg.rz)) cfg.rz = 7;
    const z = cfg.rz, fr = st.rv?.frames || [];
    const i = fr.length ? Math.min(fr.length - 1, Math.max(0, st.rvIdx ?? fr.length - 1)) : -1;
    const tl = i >= 0 ? rvLabel(fr[i]) : st.rvErr ? 'Radar indisponível' : 'A carregar o radar…';
    const leg = [['#9e9375', 'eco fraco'], ['#36bae5', 'fraca'], ['#00699c', 'moderada'], ['#ffb700', 'forte'], ['#c10000', 'muito forte'], ['#ff77ff', 'granizo']];
    return `<div class="sat-frame rad loading${st.rvErr && !fr.length ? ' err' : ''}">
        <img id="sat-img" class="rad-bg" src="${esc(api.satUrl('geocolour', cfg.loc.lat, cfg.loc.lon, Math.round(radarKm(z))))}" width="720" height="540" alt="" decoding="async">
        ${i >= 0 ? `<img id="rad-img" class="rad-fg" src="${esc(rvUrl(fr[i], z))}" width="512" height="512" alt="${esc(`Radar de chuva à volta do local (${tl})`)}" decoding="async">` : ''}
        <span class="sat-mk" aria-hidden="true"></span><span class="rad-time num" id="rad-time">${esc(tl)}</span>
        <span class="sat-msg">${esc(st.rvErr ? `Radar indisponível de momento (${st.rvErr}).` : 'Imagem indisponível de momento.')}</span></div>
        <div class="sat-bar"><div class="seg" role="group" aria-label="Largura do radar">${RZOOMS.map((rz) => `<button type="button" data-rz="${rz}" aria-pressed="${rz === z}" class="${rz === z ? 'on' : ''}">${F.num(Math.round(radarKm(rz) / 10) * 10)} km</button>`).join('')}</div>
        <button type="button" class="btn sm" data-act="rad-play"${fr.length > 1 ? '' : ' disabled'} aria-pressed="${!!st.rvPlay}">${ui(st.rvPlay ? 'pause' : 'play')}${st.rvPlay ? 'Parar' : 'Últimas 2 h'}</button></div>
        <div class="rad-leg" aria-label="Legenda do radar">${leg.map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join('')}</div>`;
}
async function loadRadarLayer() {
    if (st.rvLoading) return;
    st.rvLoading = true;
    try {
        const { host, frames } = radarFrames(await radarMaps());
        st.rv = { host, frames, at: Date.now() }; st.rvErr = frames.length ? '' : 'sem imagens'; st.rvIdx = null;
    } catch (e) { st.rv = { host: null, frames: [], at: Date.now() }; st.rvErr = e?.message || 'sem resposta'; }
    st.rvLoading = false;
    if (cfg.tab === 'satelite' && cfg.layer === 'radar' && !st.rvPlay) scheduleRender();
}
function stopRadar() { clearTimeout(st.rvPlay); st.rvPlay = 0; st.rvIdx = null; }
// as últimas 2 h: uma imagem a cada 0,5 s (pré-carregadas), fica 1,2 s na última e para
function radarPlay() {
    if (st.rvPlay) { stopRadar(); render(); return; }
    const fr = st.rv?.frames || [];
    if (fr.length < 2) return;
    const urls = fr.map((f) => rvUrl(f, cfg.rz));
    for (const u of urls) { const im = new Image(); im.src = u; }
    st.rvIdx = 0;
    const tick = () => {
        const img = $('#rad-img'), lab = $('#rad-time');
        if (!img || cfg.tab !== 'satelite' || cfg.layer !== 'radar') { stopRadar(); return; }
        const i = st.rvIdx;
        img.src = urls[i]; lab.textContent = rvLabel(fr[i]);
        if (i >= fr.length - 1) { st.rvPlay = setTimeout(() => { stopRadar(); scheduleRender(); }, 1200); return; }
        st.rvIdx = i + 1;
        st.rvPlay = setTimeout(tick, 500);
    };
    st.rvPlay = setTimeout(tick, 30);
    render();
}

function riskRow(day, lv, label) {
    return `<div class="rk"><span class="rk-d">${day}</span><div class="rk-s" role="img" aria-label="${esc(`Risco de incêndio ${day.toLowerCase()}: ${label || F.FIRE[lv]} (${lv} de 5)`)}">${[1, 2, 3, 4, 5].map((k) => `<i class="r${k}${k <= lv ? ' on' : ''}${k === lv ? ' cur' : ''}"></i>`).join('')}</div><b>${esc(label || F.FIRE[lv] || '–')}</b></div>`;
}
function fireHtml(fc) {
    const fire = fc.fire || {};
    const today = todayOf(fc);
    let h = `<section class="sec"><div class="sec-h"><h2>Incêndios</h2><span class="sub">IPMA · NASA FIRMS · ANEPC</span></div>`;
    h += fire.risk
        ? `<div class="box risk">${riskRow('Hoje', fire.risk.today, fire.risk.label)}${F.isNum(fire.risk.tomorrow) ? riskRow('Amanhã', fire.risk.tomorrow, fire.risk.labelTomorrow) : ''}<p class="note" style="margin:0">Risco de incêndio rural do IPMA · concelho de ${esc(fire.risk.concelho)}</p></div>`
        : '<div class="empty">O risco oficial de incêndio (IPMA) só existe para Portugal.</div>';
    const hs = fire.hotspots || { items: [] }, inc = fire.incidents || { items: [] };
    h += `<div class="grp-h">Focos de calor por satélite <small>24 h · até ${esc(hs.radiusKm || 50)} km</small></div><div class="list">`;
    h += hs.items?.length ? hs.items.map((x) => `<div class="row"><span class="r-ico fire-ico">${ui('flame')}</span><div class="r-main"><div class="r-name">${esc(F.km(x.distanceKm))} ${esc(x.bearing || '')}</div><div class="r-sub">FRP ${esc(F.num(x.frp, 1))} MW · ${esc(x.sat || 'satélite')} · ${esc(F.hhmm(x.time))}${x.confidence ? ` · confiança ${esc(x.confidence)}` : ''}</div></div></div>`).join('')
        : `<div class="row"><span class="r-ico ok-ico">${ui('check')}</span><div class="r-main"><div class="r-name">Nenhum foco detetado</div></div></div>`;
    h += `</div><div class="grp-h">Ocorrências ativas <small>ANEPC · até ${esc(inc.radiusKm || 50)} km</small></div><div class="list">`;
    h += inc.items?.length ? inc.items.map((x) => `<div class="row"><span class="r-ico inc-ico">${ui('alert')}</span><div class="r-main"><div class="r-name">${esc(x.natureza)} · ${esc(x.status)}</div><div class="r-sub">${esc(F.km(x.distanceKm))} ${esc(x.bearing || '')} · ${esc(x.location || '')}</div><div class="r-note">${esc(F.num(x.man))} operacionais · ${esc(F.num(x.terrain))} terrestres · ${esc(F.num(x.aerial))} aéreos · desde ${esc(F.hhmm(x.time))}</div></div></div>`).join('')
        : `<div class="row"><span class="r-ico ok-ico">${ui('check')}</span><div class="r-main"><div class="r-name">Nenhuma ocorrência ativa por perto</div></div></div>`;
    h += '</div>';
    const r30 = fire.rule30, sp = fire.spread;
    if (r30 || sp) {
        h += '<div class="stats" style="margin-top:12px">';
        if (r30) h += `<div><small>Regra 30-30-30</small><b>${r30.hours > 0 ? `${esc(F.num(r30.hours))} h` : 'Não atingida'}</b><em>${esc(r30.hours > 0 ? `>30 °C, <30% humidade, >30 km/h${r30.first ? ` · ${F.whenShort(r30.first, today)}` : ''}` : (r30.text || ''))}</em></div>`;
        if (sp) h += `<div><small>Propagação</small><b>${esc(F.num(sp.wind))} km/h ${esc(F.compass(sp.dir))}</b><em>${esc(`rajadas ${F.num(sp.gust)} · humidade ${F.pct(sp.rh)}`)}</em></div>`;
        h += '</div>';
        if (sp?.text) h += `<p class="note">${esc(sp.text)}.</p>`;
    }
    return h + '</section>';
}

// o texto do Claude: as linhas «Período: …» (Manhã, Tarde, Noite, Seg…) viram uma lista arrumada com o período a negrito;
// as outras ficam parágrafos (as análises antigas, numa só linha, continuam a ler-se)
function richText(x) {
    const out = [];
    let list = [];
    const flush = () => { if (list.length) out.push(`<ul class="an-per">${list.join('')}</ul>`); list = []; };
    for (const raw of String(x).split(/\n+/)) {
        const l = raw.trim();
        if (!l) continue;
        const m = /^(?:[-•]\s*)?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 .–-]{0,15}):\s+(.+)$/.exec(l);
        if (m) list.push(`<li><b>${esc(m[1])}</b><span>${esc(m[2])}</span></li>`);
        else if (/^[-•]\s+/.test(l)) list.push(`<li><b></b><span>${esc(l.replace(/^[-•]\s+/, ''))}</span></li>`);
        else { flush(); out.push(`<p>${esc(l)}</p>`); }
    }
    flush();
    // uma só linha com período (as análises antigas: «Quarta: …» num bloco) não é lista: parágrafo com o período a negrito
    if (out.length === 1 && out[0].startsWith('<ul') && (out[0].match(/<li>/g) || []).length === 1) return out[0].replace(/^<ul class="an-per"><li>/, '<p class="an-p1">').replace(/<\/li><\/ul>$/, '</p>');
    return out.join('');
}
function viewAnalysis() {
    const title = TITLES.analise;
    if (!cfg.loc) return needPlace(title);
    const r = st.analysis;
    const a = r?.analysis;
    const sched = r?.schedule || st.status?.schedule || SCHEDULE;
    const onDemand = !!(r?.onDemand ?? st.status?.onDemand);
    const fc = st.fc;
    const today = fc ? todayOf(fc) : '';
    let h = '<section class="sec">';
    if (r === undefined) h += '<div class="today"><div class="adv-src">Análise do Claude</div><div class="skel skel-l"></div><div class="skel skel-l"></div><div class="skel skel-l s"></div></div>';
    else if (a) {
        const g = a.generatedAt ? new Date(a.generatedAt) : null;
        const hm = g && !Number.isNaN(+g) ? `${String(g.getHours()).padStart(2, '0')}:${String(g.getMinutes()).padStart(2, '0')}` : '';
        const sec = (t, x, id) => (x ? `<div class="an-sec"${id ? ` id="${id}"` : ''}><h4>${t}</h4>${richText(x)}</div>` : '');
        const ap = analysedPoint();
        // feita para outro ponto (> 2 km): dizê-lo claramente e oferecer mudar a análise diária para o ponto selecionado
        if (ap?.far) {
            h += `<div class="warn far-pt" role="note">${ui('alert')}<div><b>Esta análise é para outro ponto, a ${esc(F.km(ap.d))} daqui</b>
                <span class="w-when">${esc(forTxt(ap))}</span>
                <p>${esc(ap.moved ? `O tempo aqui pode ser diferente. A análise diária já passou para este ponto: a próxima chega ${nextRun()}.`
                    : 'O tempo aqui pode ser diferente (altitude, relevo, distância ao mar).')}</p>
                ${ap.reg && !ap.moved && !ap.reg.shared ? `<button type="button" class="btn sm pri" data-act="place-move">${ui('pin')}Mudar a análise diária para este ponto</button>` : ''}</div></div>`;
        }
        h += `<article class="today">
            <div class="adv-src">Análise do Claude <span>· ${a.by === 'claude-api' ? 'a pedido' : 'agendada'}${hm ? ` às ${esc(hm)}` : ''}${r.offline ? ' · guardada' : ''}</span></div>
            ${ap ? forLine(ap) : ''}
            <div class="cl-head">${esc(a.titulo)}</div>${a.resumo ? `<p style="margin:6px 0 0;color:var(--soft)">${esc(a.resumo)}</p>` : ''}
            ${a.alertas?.length ? `<ul class="tags" aria-label="Alertas do Claude">${a.alertas.map((x) => `<li class="tag ${esc(x.nivel || 'info')}"><span class="dot"></span><span><b>${esc(cap1(x.tipo))}</b>${x.quando ? ` · ${esc(x.quando)}` : ''}${x.texto ? ` — ${esc(x.texto)}` : ''}</span></li>`).join('')}</ul>` : ''}
            ${sec('Amanhã', a.amanha)}${sec('O que vestir amanhã', a.vestir)}
            ${more('d-an', 'Ver a análise completa', `${sec('Próximas horas', a.agora)}${sec('Hoje', a.hoje)}
            ${a.dias?.length ? `<div class="an-sec"><h4>Próximos dias</h4><ul class="an-days">${a.dias.map((d) => `<li><b>${esc(today ? F.dayLabel(d.data, today) : d.data)}</b>${sig(d.confianca)}<span>${esc(d.texto)}</span></li>`).join('')}</ul></div>` : ''}
            ${sec('A semana em resumo', a.semana, 'an-semana')}${sec('Tendência (dias 7 a 15)', a.tendencia)}${sec('Incêndios', a.incendios)}${sec('O que mostra o satélite', a.satelite)}
            ${a.conselhos?.length ? `<div class="an-sec"><h4>Conselhos</h4><ul class="an-list">${a.conselhos.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>` : ''}
            ${a.fiabilidade ? `<div class="an-sec"><h4>Fiabilidade</h4><p><span class="badge">${sig(a.fiabilidade.curto, false)}Curto prazo: ${esc(a.fiabilidade.curto === 'media' ? 'média' : a.fiabilidade.curto)}</span><span class="badge">${sig(a.fiabilidade.medio, false)}Médio prazo: ${esc(a.fiabilidade.medio === 'media' ? 'média' : a.fiabilidade.medio)}</span></p>${a.fiabilidade.texto ? `<p style="margin-top:6px">${esc(a.fiabilidade.texto)}</p>` : ''}</div>` : ''}
            ${sec('Análise técnica', a.tecnica)}${sec('Como correu a previsão anterior', a.verificacao)}`)}
            <p class="an-meta">Feita ${esc(F.ago(r.ageMin ?? 0))} · próxima ${esc(nextRun())}.</p>
        </article>`;
    } else {
        h += `<div class="today cl-opt">${optInHtml()}</div>`;
    }
    const np = nearPlace(), owner = isOwner(), mine = owner ? null : myPlaces()[0];
    const swHint = np ? `Ligada (${np.name}) · ${schedFor().join(' · ')}`
        : owner ? `Às ${sched.join(', ')} · sem limite de locais`
        : othersMode() === 'off' ? 'Desligada pelo dono da app, por agora'
        : `${othersMode() === '1x' ? '1× por dia, às 07:34' : `Às ${sched.join(', ')}`} · 1 local por telemóvel${mine && !mine.off ? ` (agora em ${mine.name})` : ''}`;
    h += `<div class="form"><div class="sw"><span><b>Análise diária para este local</b><br><small class="hint">${esc(swHint)}</small></span>
        <div class="seg" role="group" aria-label="Análise diária"><button type="button" data-act="place-on" class="${np ? 'on' : ''}" aria-pressed="${!!np}">Sim</button><button type="button" data-act="place-off" class="${np ? '' : 'on'}" aria-pressed="${!np}">Não</button></div></div>
        ${onDemand ? `<button type="button" class="btn pri blk" data-act="analyze"${st.analyzing ? ' disabled' : ''}>${ui('sparkle', st.analyzing ? 'spin' : '')}${st.analyzing ? 'A analisar… pode demorar 1 minuto' : 'Analisar agora'}</button>` : ''}</div></section>`;
    if (fc) h += more('d-tec', 'Detalhes técnicos', compareHtml(fc) + reliabilityHtml(fc) + learningHtml(fc) + obsHtml(fc) + modelsHtml(fc), 'sec-more');
    return { title, html: h };
}
const officialTxt = (fc) => {
    const of = fc?.official, err = fc?.status?.ipmaFc;
    if (of) return `Previsão oficial IPMA: ${of.local}, ${F.km(of.distanceKm)}`;
    if (fc?.location?.country && fc.location.country !== 'PT') return 'Previsão oficial do IPMA só em Portugal';
    return err && err !== 'ok' ? `Previsão oficial do IPMA indisponível (${err})` : 'Sem previsão oficial do IPMA para este ponto';
};
// fontes lado a lado: cada modelo, o IPMA (oficial) e o ensemble (P50 com P10–P90) em hoje, amanhã e depois
function compareHtml(fc) {
    const C = fc.compare;
    if (!C?.rows?.length) return '';
    const today = todayOf(fc), ref = C.rows[0].days;
    const dev = (x, k, key) => { const r = ref[k]?.[key]; if (!F.isNum(x?.[key]) || !F.isNum(r)) return ''; const d = x[key] - r; return d >= 2 ? ' hot' : d <= -2 ? ' cold' : ''; };
    const cell = (r, x, k) => {
        if (!x) return '<td class="na">–</td>';
        const t = r.kind === 'consenso' ? '' : 'class="d"';
        const sub = r.kind === 'ensemble' ? `${F.num(x.tmaxP10)}–${F.num(x.tmaxP90)}° · ${F.pct(x.pop)}` : r.kind === 'oficial' ? `chuva ${F.pct(x.pop)}`
            : r.kind === 'consenso' ? `${F.mm(x.precip)} · ${F.pct(x.pop)}` : F.mm(x.precip);
        return `<td${x.text ? ` title="${esc(x.text)}"` : ''}><span ${t}><b class="${dev(x, k, 'tmax').trim()}">${esc(F.deg(x.tmax))}</b>/<span class="${dev(x, k, 'tmin').trim()}">${esc(F.deg(x.tmin))}</span></span><small>${esc(sub)}</small></td>`;
    };
    const tag = (r) => (r.kind === 'consenso' ? 'final' : r.kind === 'oficial' ? 'oficial' : r.kind === 'ensemble' ? 'P50 · P10–P90' : `peso ${F.num(r.weight, 1)}`);
    const rows = C.rows.map((r) => `<tr class="k-${esc(r.kind)}"><th scope="row">${esc(r.short)}<small>${esc(tag(r))}</small></th>${C.dates.map((_, k) => cell(r, r.days[k], k)).join('')}</tr>`).join('');
    const agree = { alta: 'Fontes de acordo', media: 'Fontes com algumas diferenças', baixa: 'Fontes muito divididas' }[C.agreement] || '';
    return `<section class="sec" id="fontes"><div class="sec-h"><h2>Fontes lado a lado</h2><span class="sub">${esc(officialTxt(fc))}</span></div>
        <div class="box cmp"><div class="cmp-scroll"><table class="tbl cmp-t"><thead><tr><th scope="col">Fonte</th>${C.dates.map((d) => `<th scope="col">${esc(F.dayLabel(d, today))}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
        ${agree ? `<p class="cmp-ag"><span class="badge">${sig(C.agreement, false)}${esc(agree)}</span>${F.isNum(C.spreadMax) ? `<span>até ${esc(F.num(C.spreadMax, 1))}° entre fontes</span>` : ''}</p>` : ''}
        ${C.notes?.length ? `<ul class="an-list cmp-notes">${C.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>
        <p class="note">Máxima/mínima de cada fonte tal como sai, sem correções; o consenso já junta tudo com os pesos aprendidos neste ponto e as observações. A laranja, 2° ou mais acima do consenso; a azul, 2° ou mais abaixo.</p></section>`;
}
// estações que entram na observação combinada do ponto
function obsHtml(fc) {
    const o = fc.now?.obs;
    if (!o?.stations?.length) return '';
    const maxW = Math.max(...o.stations.map((x) => x.weight || 0), 1);
    return `<section class="sec"><div class="sec-h"><h2>Observações usadas</h2><span class="sub">${esc(`${o.n || o.stations.length} estações · ajustadas a ${F.num(o.elevation ?? fc.location?.elevation)} m`)}</span></div><div class="list">${o.stations.map((x) => `<div class="row${x.used ? '' : ' off'}"><div class="r-main">
        <div class="r-name">${esc(x.name)}</div><div class="r-sub">${esc([x.source, F.km(x.distanceKm), F.isNum(x.elev) ? `${F.num(x.elev)} m` : null, F.ago(x.ageMin)].filter(Boolean).join(' · '))}${x.used ? '' : ' · rejeitada (muito diferente das outras)'}</div>
        <div class="score" role="img" aria-label="${esc(`Peso ${F.num(x.weight)}%`)}"><div class="bar"><i style="width:${(((x.weight || 0) / maxW) * 100).toFixed(1)}%"></i></div></div></div>
        <div class="r-px num">${esc(F.deg(x.tempAdj, 1))}<small>${esc(F.isNum(x.temp) ? `${F.deg(x.temp, 1)} medido` : '')}</small></div></div>`).join('')}</div>
        <p class="note">Cada estação é levada à altitude do ponto (0,65° por 100 m) e pesa pela distância, pela altitude parecida e por ser recente; as muito diferentes das outras ficam de fora. Juntas dão ${esc(F.deg(o.temp, 1))} a ${esc(F.km(o.distanceKm))} em média${F.isNum(o.repr) ? ` · confiança ${esc(F.pct(o.repr * 100))}` : ''}.</p></section>`;
}
// o local deste telemóvel com a análise diária ligada aqui (≤ 2 km do ponto selecionado)
const claudeAt = (loc) => (loc ? onPlaces().find((p) => haversineKm(p.lat, p.lon, loc.lat, loc.lon) <= (p.shared ? SHARE_KM : FAR_KM)) : null);
const nearPlace = () => claudeAt(cfg.loc);
// «Os meus locais»: os guardados (até 12) e os que têm análise diária do Claude (mesmo que não estejam guardados);
// o atual marcado, ✦ nos analisados pelo Claude, ✕ para tirar um guardado
function locsHtml({ remove = true } = {}) {
    const L = cfg.loc;
    const rows = cfg.favs.map((f, i) => ({ f, i, p: claudeAt(f) }));
    for (const p of onPlaces()) if (!rows.some((r) => r.p === p || near(r.f, p, 2))) rows.push({ f: { lat: p.lat, lon: p.lon, name: p.name }, i: -1, p });
    if (!rows.length) return '<div class="hint">Ainda não guardaste locais. Pesquisa um abaixo: fica logo aqui.</div>';
    return `<div class="wl locs">${rows.map(({ f, i, p }) => {
        const here = L && near(f, L);
        const sub = [here ? 'a ver agora' : '', p ? '✦ análise do Claude' : '', !here && !p ? `${F.num(f.lat, 3)}, ${F.num(f.lon, 3)}` : ''].filter(Boolean).join(' · ');
        const go = i >= 0 ? `data-fav="${i}"` : `data-goplace="${esc(p.id)}"`;
        return `<div class="wl-i${here ? ' here' : ''}"><button type="button" class="wl-go" ${go}><b>${esc(f.name)}${here ? ` ${ui('check')}` : ''}</b><small class="num${p ? ' cl' : ''}">${esc(sub)}</small></button>${remove && i >= 0 ? `<button type="button" class="xbtn" data-rmfav="${i}" aria-label="${esc('Tirar ' + f.name)}">✕</button>` : ''}</div>`;
    }).join('')}</div>`;
}
function reliabilityHtml(fc) {
    const ind = fc.indicators || {}, ver = fc.verification, learnBest = fc.learning?.best?.t?.[1] || null;
    const byId = Object.fromEntries((fc.models || []).map((m) => [m.id, m]));
    return `<section class="sec"><div class="sec-h"><h2>Fiabilidade</h2></div><div class="stats">
        <div><small>Previsibilidade</small><b>${ind.predictability?.days != null ? `${esc(F.num(ind.predictability.days))} dias` : '–'}</b><em>${esc(ind.predictability?.text || '')}</em></div>
        <div><small>Concordância (48 h)</small><b>${F.isNum(ind.agreement) ? esc(F.pct(ind.agreement * 100)) : '–'}</b><em>entre ${esc(fc.models?.length || 0)} modelos</em></div>
        <div><small>Verificação local</small><b>${ver ? ((ver.stations || 1) > 1 ? `${esc(F.num(ver.stations))} estações` : `${esc(F.num(ver.n))} horas`) : 'Ainda não'}</b><em>${esc(ver ? ((ver.stations || 1) > 1 ? `${F.num(ver.n)} comparações · ${ver.days} dia${ver.days === 1 ? '' : 's'} · ~${F.km(ver.distanceKm)}` : `${ver.station} · ${ver.days} dias`) : 'precisa de uma estação perto')}</em></div>
        <div><small>Mais certeiro aqui</small><b>${esc(learnBest ? (byId[learnBest]?.name || learnBest) : ver ? (byId[ver.best]?.name || ver.best) : '–')}</b><em>${esc(learnBest ? `temperatura de amanhã · ${F.num(fc.learning.days)} dias` : ver ? 'menor erro recente' : '')}</em></div>
    </div></section>`;
}
// Aprendizagem: o peso que cada modelo ganhou (ou perdeu) neste ponto, por variável e prazo, e como evoluiu dia a dia
const LV_UNIT = { t: (x) => `${F.num(x, 1)}°`, r: (x) => `${F.num(x * 100)}% das horas`, w: (x) => `${F.num(x, 1)} km/h` };
const LV_ERR = { t: 'erro médio', r: 'horas de chuva erradas', w: 'erro médio (sem a exposição da estação)' };
const LINE_C = ['var(--accent)', 'var(--c-precip)', 'var(--c-wind)'];
function learningHtml(fc) {
    const Lr = fc.learning;
    if (!Lr) return '';
    const v = LVARS[cfg.lv] ? cfg.lv : 't', L = [0, 1, 2].includes(cfg.ll) ? cfg.ll : 1;
    const seg = (key, opts, cur) => `<div class="seg lseg" role="group" aria-label="${key === 'lv' ? 'Variável' : 'Prazo'}">${opts.map(([val, lab]) => `<button type="button" data-${key}="${val}" class="${cur === val ? 'on' : ''}" aria-pressed="${cur === val}">${esc(lab)}</button>`).join('')}</div>`;
    const head = `<div class="sec-h"><h2>Aprendizagem</h2><span class="sub">${esc(Lr.days ? `${Lr.days} dia${Lr.days === 1 ? '' : 's'} de memória${Lr.since ? ` · desde ${F.dateShort(Lr.since)}` : ''}` : 'a começar')}</span></div>`;
    if (!Lr.models?.length) return `<section class="sec" id="aprendizagem">${head}<p class="note">Ainda sem verificação neste ponto: precisa de uma estação perto (IPMA ou aeroporto) e das corridas anteriores dos modelos. Cada dia em que houver, o peso dos modelos que acertam mais aqui sobe.</p></section>`;
    const rows = Lr.models.map((m) => ({ m, f: m.f[v][L], s: m[v][L] })).sort((a, b) => b.f - a.f);
    const maxF = Math.max(...rows.map((r) => r.f), 1);
    const best = Lr.best?.[v]?.[L];
    const list = rows.map(({ m, f, s }) => `<div class="row"><div class="r-main">
        <div class="r-name">${esc(m.name)}${m.official ? ' <span class="badge">oficial</span>' : ''}${m.id === best ? ' <span class="badge up">mais certeiro</span>' : ''}</div>
        <div class="r-sub">${esc(s ? `${LV_ERR[v]} ${LV_UNIT[v](s.mae)} · ${F.num(s.days)} dia${s.days === 1 ? '' : 's'}${s.nEff < 3 ? ' · pouca prova' : ''}` : v === 't' ? 'sem verificação neste prazo' : 'sem prova própria: segue a temperatura')}${v === 'r' && F.isNum(m.lag?.[L]) && Math.abs(m.lag[L]) >= 0.5 ? ` · chega ~${F.num(Math.abs(m.lag[L]), 1)} h ${m.lag[L] > 0 ? 'tarde' : 'cedo'}` : ''}</div>
        <div class="score" role="img" aria-label="${esc(`Fator ${F.num(f, 2)}`)}"><div class="bar"><i class="${f >= 1.05 ? 'gain' : f <= 0.95 ? 'loss' : ''}" style="width:${((f / maxF) * 100).toFixed(1)}%"></i></div></div></div>
        <div class="r-px num">×${esc(F.num(f, 2))}</div></div>`).join('');
    const chart = learnChart(st.memory, Lr.models.map((m) => m.id), rows.slice(0, 3).map((r) => r.m), v, L);
    const where = Lr.stations?.length ? ` Verificado contra ${Lr.stations.join(', ')}${Lr.source ? ` (${Lr.source})` : ''}${v === 'r' ? ', o tempo presente dos aeroportos e os teus avisos «Está a chover?»' : ''}.` : '';
    return `<section class="sec" id="aprendizagem">${head}
        ${seg('lv', Object.entries(LVARS), v)}${seg('ll', LEADS.map((x, i) => [i, F.cap(x)]), L)}
        <div class="list">${list}</div>${chart}
        <p class="note">O peso de cada modelo no consenso é o de base × este fator. Cada dia a app compara o que cada modelo previu com o que aconteceu aqui: quem acerta mais do que os outros ganha peso, e ganha mais quanto mais dias o confirmarem; quem falha perde. Os dias recentes contam mais (meia-vida de ${esc(Lr.halfLife)} dias), até ${esc(Lr.keepDays)} dias.${esc(where)}</p></section>`;
}
// evolução do fator (escala logarítmica: ×4 em cima, ×¼ em baixo, ×1 ao meio) dos 3 com mais peso; a referência (o erro
// mediano) é de todos os modelos verificados, como no consenso
let lhCache = { key: '', H: null }; // a evolução só muda quando a memória muda (evita refazer a conta a cada desenho)
function learnChart(memory, ids, models, v, L) {
    if (!memory?.days || !models.length) return '';
    const key = `${memory.updated}|${Object.keys(memory.days).length}|${ids.join(',')}|${v}|${L}`;
    if (lhCache.key !== key) lhCache = { key, H: learnHistory(memory, ids, { v, lead: L }) };
    const H = lhCache.H;
    if (H.length < 2) return '';
    const W = 320, Ht = 130, pl = 30, pr = 8, pt = 8, pb = 18;
    const x = (i) => pl + (i / (H.length - 1)) * (W - pl - pr);
    const y = (f) => pt + ((2 - Math.log2(Math.min(4, Math.max(0.25, f || 1)))) / 4) * (Ht - pt - pb);
    const grid = [[4, '×4'], [2, '×2'], [1, '×1'], [0.5, '×½'], [0.25, '×¼']].map(([f, lab]) => `<line x1="${pl}" x2="${W - pr}" y1="${y(f).toFixed(1)}" y2="${y(f).toFixed(1)}" class="${f === 1 ? 'lc-one' : 'lc-grid'}"/><text x="${pl - 4}" y="${(y(f) + 3).toFixed(1)}" class="lc-ax" text-anchor="end">${lab}</text>`).join('');
    const lines = models.map((m, k) => {
        const pts = H.map((h, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(h.f[m.id]).toFixed(1)}`).join('');
        return `<path d="${pts}" fill="none" stroke="${LINE_C[k]}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    }).join('');
    const ticks = [0, H.length - 1].map((i) => `<text x="${x(i).toFixed(1)}" y="${Ht - 4}" class="lc-ax" text-anchor="${i ? 'end' : 'start'}">${esc(F.dateShort(H[i].date))}</text>`).join('');
    const legend = models.map((m, k) => `<span><i style="background:${LINE_C[k]}"></i>${esc(m.short)}</span>`).join('');
    return `<div class="box lchart"><svg viewBox="0 0 ${W} ${Ht}" role="img" aria-label="${esc(`Evolução do peso: ${models.map((m) => m.short).join(', ')}`)}">${grid}${lines}${ticks}</svg><div class="lc-leg">${legend}</div></div>`;
}
function modelsHtml(fc) {
    const M = fc.models || [];
    const maxW = Math.max(...M.map((m) => m.weight || 0), 1);
    const ens = fc.ensemble || {};
    return `<section class="sec"><div class="sec-h"><h2>Modelos</h2><span class="sub">peso no consenso</span></div><div class="list">${M.map((m) => `<div class="row"><div class="r-main">
        <div class="r-name">${esc(m.name)}${m.official ? ' <span class="badge">oficial</span>' : ''}</div><div class="r-sub">${esc(m.official ? [`${m.local}, a ${F.km(m.distanceKm)}`, `${F.num(m.days || 0)} dias`, m.updated ? `atualizada ${F.hhmm(m.updated)}` : null].filter(Boolean).join(' · ') : [m.org, `${F.num(m.resKm, m.resKm < 3 ? 1 : 0)} km`, `${F.num((m.hours || 0) / 24)} dias`].filter(Boolean).join(' · '))}${m.skill ? ` · erro local ${esc(F.num(m.skill.mae, 1))}° (viés ${esc(F.signed(m.skill.bias, 1))}°)` : ''}</div>
        <div class="score" role="img" aria-label="${esc(`Peso ${F.num(m.weight, 1)}`)}"><div class="bar"><i style="width:${(((m.weight || 0) / maxW) * 100).toFixed(1)}%"></i></div></div></div>
        <div class="r-px num">${esc(F.num(m.weight, 1))}</div></div>`).join('')}</div>
        ${ens.models?.length ? `<div class="grp-h">Ensembles <small>${esc(F.num(ens.members))} cenários</small></div><ul class="tags">${ens.models.map((e) => `<li class="tag"><span><b>${esc(e.name)}</b> · ${esc(F.num(e.members))} · ${esc(F.num(e.days))} dias</span></li>`).join('')}</ul>` : ''}
        <p class="note">O peso de cada modelo depende da resolução e do que a app aprendeu neste ponto: o erro de cada um, dia a dia, contra as estações perto (ver Aprendizagem — a temperatura, a chuva e o vento têm pesos próprios). A previsão oficial do IPMA (AROME 2,5 km revista por meteorologistas) pesa mais nos primeiros 3 dias.</p></section>`;
}

function precisionLines(fc) {
    const out = [officialTxt(fc)];
    const o = fc.now?.obs;
    if (o) out.push((o.n || 1) > 1 ? `Observações: ${o.n} estações até ${F.km(Math.max(...(o.stations || []).filter((x) => x.used).map((x) => x.distanceKm), o.distanceKm))} (a mais próxima a ${F.km(o.nearestKm)})` : `Observação: ${o.station}, ${F.km(o.distanceKm)}`);
    else out.push('Sem estações de observação perto');
    if (F.isNum(fc.location?.elevation)) out.push(`Altitude do ponto: ${F.num(fc.location.elevation)} m (observações ajustadas a esta altitude)`);
    const tl = terrainLine(fc);
    if (tl) out.push(`Relevo: ${tl}`);
    else if (fc.status?.terrain && fc.status.terrain !== 'ok') out.push(`Relevo à volta indisponível (${fc.status.terrain})`);
    const R = fc.radar;
    if (R) out.push(R.covered === false ? 'Radar: ponto fora da cobertura' : `Radar no ponto (RainViewer): imagem de ${F.ago(radarAge(fc))}, ${F.num(R.kmPx, 2)} km por píxel`);
    else if (fc.status?.radar && fc.status.radar !== 'ok') out.push(`Radar indisponível (${fc.status.radar})`);
    return out;
}
function viewSettings() {
    const title = TITLES.ajustes;
    const L = cfg.loc;
    let h = `<section class="sec"><div class="sec-h"><h2>Local</h2></div><div class="form">
        ${L ? `<div class="sw"><span><b>${esc(placeName())}</b><br><small class="hint num">${esc(`${F.num(L.lat, 4)}, ${F.num(L.lon, 4)}${L.gps ? ' · GPS' : ''}`)}</small></span><button type="button" class="btn sm" data-act="place">Mudar</button></div>` : ''}
        ${L && st.fc ? more('d-prec', 'Precisão para este ponto', `<ul class="prec" aria-label="Precisão para este ponto">${precisionLines(st.fc).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`) : ''}
        <button type="button" class="btn blk" data-act="gps">${ui('gps')}Usar a minha localização exata</button>
        <div><label>Os meus locais</label>${locsHtml()}
            ${L ? `<button type="button" class="btn sm" data-act="fav" style="margin-top:8px">${ui(cfg.favs.some((f) => near(f, L)) ? 'trash' : 'plus')}${cfg.favs.some((f) => near(f, L)) ? 'Tirar este local' : 'Guardar este local'}</button>` : ''}</div>
    </div></section>`;
    h += notifHtml();
    h += placesSettingsHtml();
    h += `<section class="sec" id="partilhar"><div class="sec-h"><h2>Partilhar</h2></div><div class="form"><button type="button" class="btn pri blk" data-act="share">${ui('share')}Partilhar a Meteo</button>
        <div class="hint">Envia o endereço e como instalar (iPhone e Android). Grátis e sem conta.</div></div></section>`;
    h += meHtml();
    if (isOwner()) h += usageHtml();
    // Avançado: o conector, o código do dono, a letra e o estado das fontes (escondido; quase nunca é preciso)
    let adv = '';
    const stTxt = st.status ? `Ligado · versão ${esc(st.status.version || '?')} · análise imediata: ${st.status.onDemand ? 'sim' : 'não'}${st.status.owner ? ' · és o dono' : ''}` : st.statusErr ? `Sem resposta: ${esc(st.statusErr)}` : 'A testar…';
    // código do dono guardado (de ?dono=) que o conector não aceita: dizê-lo e deixar esquecê-lo
    const oc = api.ownerCode() && st.status && !st.status.owner
        ? `<div class="banner warn own-note">${ui('alert')}<span>${st.status.ownerCode === 'sem_codigo' ? 'Há um código do dono guardado neste telemóvel, mas o conector ainda não tem o segredo OWNER_CODE.' : 'O código do dono guardado neste telemóvel não foi aceite pelo conector.'}</span><button type="button" class="btn sm" data-act="owner-forget">Esquecer</button></div>` : '';
    adv += `<section class="sec" id="conector"><div class="sec-h"><h2>Conector de dados</h2></div><div class="form">${oc}<div><label for="f-proxy">Endereço do teu Worker</label>
        <div class="inl"><input id="f-proxy" class="inp" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="${esc(DEFAULT_PROXY)}" value="${esc(cfg.proxy)}"><button type="button" class="btn pri" data-act="save-proxy">Guardar</button></div>
        <div class="hint" id="f-proxy-msg">${stTxt}. Vazio = ${esc(DEFAULT_PROXY.replace('https://', ''))}. Serve observações METAR, satélite, incêndios, locais e a análise.</div></div>${ownerHtml()}</div></section>`;
    adv += `<section class="sec"><div class="sec-h"><h2>Preferências</h2></div><div class="form"><div><label>Tamanho da letra</label><div class="seg fs">${[['n', 'Normal'], ['l', 'Grande'], ['xl', 'Muito grande']].map(([v, l]) => `<button type="button" data-fs="${v}" class="${(cfg.fs || 'n') === v ? 'on' : ''}" aria-pressed="${(cfg.fs || 'n') === v}">${l}</button>`).join('')}</div>
        <div class="hint">Segue também o tamanho de texto do iPhone (Definições → Ecrã e brilho → Tamanho do texto).</div></div>
        <div class="sw" id="animacoes"><span><b>Animações</b><br><small class="hint">O céu do cartão «Agora» e os ícones grandes a mexer (chuva, sol, neve…).</small></span>
        <div class="seg" role="group" aria-label="Animações"><button type="button" data-act="anim-on" class="${cfg.anim !== false ? 'on' : ''}" aria-pressed="${cfg.anim !== false}">Sim</button><button type="button" data-act="anim-off" class="${cfg.anim === false ? 'on' : ''}" aria-pressed="${cfg.anim === false}">Não</button></div></div></div></section>`;
    const S = st.fc?.status;
    if (S) adv += `<section class="sec"><div class="sec-h"><h2>Estado das fontes</h2><span class="sub">última atualização</span></div><div class="list">${Object.entries(S).map(([k, v]) => `<div class="row" style="min-height:48px"><span class="r-ico ${v === 'ok' ? 'ok-ico' : 'inc-ico'}">${ui(v === 'ok' ? 'check' : 'alert')}</span><div class="r-main"><div class="r-name">${esc(SRC[k] || k)}</div>${v === 'ok' ? '' : `<div class="r-sub">${esc(v)}</div>`}</div></div>`).join('')}</div></section>`;
    adv += `<div class="disc"><b>Meteo ${VERSION}.</b> Modelos e ensembles: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>), com dados do ECMWF, DWD, Météo-France, Met Office, NOAA, ECCC, JMA e CMA. Observações e avisos: IPMA e NOAA AWC (METAR). Incêndios: NASA FIRMS e ANEPC via fogos.pt. Satélite: EUMETSAT. Análise: Claude. Previsão automática: confirma sempre os avisos oficiais do IPMA e da Proteção Civil.</div>`;
    h += more('d-adv', 'Avançado', adv, 'sec-more');
    h += `<p class="ver-line">Meteo ${VERSION} · fontes e licenças em Avançado</p>`;
    return { title, html: h };
}

// ---------- este telemóvel: o código curto e o nome (obrigatório) que o dono vê no painel Utilização ----------
// Abrir a app não regista nada no conector: o telemóvel fica registado quando a pessoa diz o nome (antes de ligar a
// análise diária, as notificações ou dar um aviso).
const hasName = () => !!st.status?.name;
function ensureName(then = null) {
    if (hasName()) return true;
    st.afterName = then;
    openSheet('nome');
    return false;
}
function meHtml() {
    const S = st.status;
    if (!S) return '';
    return `<section class="sec" id="telemovel"><div class="sec-h"><h2>Este telemóvel</h2>${S.device && S.id ? `<span class="sub num">código ${esc(S.id)}</span>` : ''}</div><div class="form">
        <div><label for="f-name">O teu nome</label><div class="inl"><input id="f-name" class="inp" type="text" maxlength="40" autocomplete="nickname" spellcheck="false" placeholder="Ex.: Ana" value="${esc(S.name || '')}"><button type="button" class="btn pri" data-act="name-save">Guardar</button></div>
        <div class="hint">${S.owner ? 'Para reconheceres este telemóvel no painel Utilização.' : 'Só o dono da app vê este nome, no painel Utilização.'} É obrigatório para ligar a análise diária, as notificações e os avisos. A tua localização não é registada.</div></div>
    </div></section>`;
}
async function nameSave(id = 'f-name') {
    const inp = $('#' + id);
    if (!inp) return;
    inp.blur();
    if (!inp.value.trim()) { toast('Escreve o teu nome.'); return; }
    try {
        const r = await api.setMyName(inp.value);
        st.status = { ...(st.status || {}), name: r?.name || null, device: true, ...(r?.id ? { id: r.id } : {}) };
        const then = st.afterName;
        st.afterName = null;
        if (st.sheet?.kind === 'nome') closeSheet();
        toast(`Nome guardado: ${r?.name}.`);
        render();
        if (then) await then();
    } catch (e) { toast(e.message); render(); }
}

// ---------- notificações do fim do dia ----------
// Às 19:00 por omissão (hora ajustável de 15 em 15 min): amanhã no local e o que vestir, da análise do Claude das 17:34;
// ao domingo, a semana. O conector envia-as (Web Push); no iPhone só com a app instalada no ecrã principal (iOS 16.4+).
const PUSH_TIMES = Array.from({ length: 32 }, (_, i) => `${String(16 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const pushPlace = () => { const own = onPlaces(), P = st.push; return own.find((p) => p.id === P?.place) || nearPlace() || own[0] || null; };
function notifHtml() {
    const P = st.push || { on: false, time: '19:00', sunday: true };
    const seg = (act, on, label) => `<div class="seg" role="group" aria-label="${esc(label)}"><button type="button" data-act="${act}-on" class="${on ? 'on' : ''}" aria-pressed="${!!on}">Sim</button><button type="button" data-act="${act}-off" class="${on ? '' : 'on'}" aria-pressed="${!on}">Não</button></div>`;
    let body;
    if (isIos() && !isStandalone()) body = '<div class="hint">No iPhone, as notificações só chegam à app instalada no ecrã principal (iOS 16.4 ou mais recente): Partilhar → «Adicionar ao ecrã principal», abre a Meteo de lá e liga aqui.</div>';
    else if (!pushSupported()) body = '<div class="hint">Este browser não recebe notificações.</div>';
    else if (!onPlaces().length && !P.on) body = '<div class="hint">A notificação traz a análise diária do Claude do teu local: liga-a primeiro (Análise → «Análise diária para este local»).</div>';
    else {
        const own = onPlaces(), cur = pushPlace();
        body = `<div class="sw"><span><b>Resumo ao fim do dia</b><br><small class="hint">${esc(P.on ? `Às ${P.time}${cur ? ` · ${cur.name}` : ''}` : 'Como vai estar amanhã e o que vestir')}</small></span>${seg('push', P.on, 'Notificação ao fim do dia')}</div>
            ${P.on ? `<div><label for="f-push-time">Hora</label><select id="f-push-time" class="inp"${st.pushBusy ? ' disabled' : ''}>${PUSH_TIMES.map((t) => `<option value="${t}"${t === P.time ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
            <div class="sw"><span><b>Ao domingo: a semana que vem</b><br><small class="hint">Em vez de amanhã, a semana toda</small></span>${seg('push-sun', P.sunday !== false, 'Ao domingo, a semana')}</div>
            ${own.length > 1 ? `<div><label for="f-push-place">Local</label><select id="f-push-place" class="inp">${own.map((p) => `<option value="${esc(p.id)}"${p.id === cur?.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>` : ''}
            <button type="button" class="btn blk" data-act="push-test"${st.pushBusy ? ' disabled' : ''}>${ui('bell')}Enviar uma agora (teste)</button>
            <div class="hint">Da análise do Claude das 17:34, à hora deste telemóvel.</div>`
                : '<div class="hint">Às 19:00 por omissão; ao domingo, a semana que vem.</div>'}`;
    }
    return `<section class="sec" id="notificacoes"><div class="sec-h"><h2>Notificações</h2></div><div class="form">${body}</div></section>`;
}
const b64uBytes = (s) => { const t = s.replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(t + '='.repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0)); };
async function pushSubscription(create) {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub && create) {
        const { publicKey } = await api.getPushKey();
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uBytes(publicKey) });
    }
    return sub;
}
async function pushSend(changes = {}, { create = false } = {}) {
    const P = { time: '19:00', sunday: true, ...(st.push || {}), ...changes };
    const sub = await pushSubscription(create);
    if (!sub) throw new Error('Sem autorização de notificações neste telemóvel.');
    st.push = await api.savePush({ subscription: sub.toJSON(), time: P.time, sunday: P.sunday !== false, place: P.place || pushPlace()?.id,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Lisbon' });
}
// ligar: o pedido de autorização tem de sair logo do toque (sem esperas antes)
function pushOn() {
    // o pedido de autorização tem de vir de um toque: depois do nome, toca-se outra vez em «Ligar»
    if (!ensureName(() => toast('Agora toca em «Ligar» para receber as notificações.'))) return;
    if (!pushSupported()) return;
    const perm = Notification.permission === 'granted' ? Promise.resolve('granted') : Notification.requestPermission();
    st.pushBusy = true; render();
    perm.then(async (p) => {
        if (p !== 'granted') throw new Error('Sem autorização para notificações: ativa-as nas definições do telemóvel, na Meteo.');
        await pushSend({}, { create: true });
        toast(`Notificação ligada: todos os dias às ${st.push.time}.`);
    }).catch((e) => toast(e?.message || 'Não foi possível ligar as notificações.'))
        .finally(() => { st.pushBusy = false; render(); });
}
async function pushOff() {
    st.pushBusy = true; render();
    try { (await pushSubscription(false))?.unsubscribe(); } catch { /* sem assinatura */ }
    try { await api.deletePush(); st.push = { ...(st.push || {}), on: false }; toast('Notificações desligadas.'); }
    catch (e) { toast(e.message); }
    st.pushBusy = false; render();
}
async function pushChange(changes) {
    if (!st.push?.on) { st.push = { ...(st.push || { time: '19:00', sunday: true }), ...changes }; render(); return; }
    st.pushBusy = true; render();
    try { await pushSend(changes); toast(changes.time ? `Notificação às ${st.push.time}.` : 'Guardado.'); }
    catch (e) { toast(e.message); }
    st.pushBusy = false; render();
}
async function pushTest() {
    st.pushBusy = true; render();
    try { const r = await api.testPush(); toast(r?.weekly ? 'Enviada a da semana: deve chegar daqui a segundos.' : 'Enviada: deve chegar daqui a segundos.'); }
    catch (e) { toast(e.message); }
    st.pushBusy = false; render();
}

// "Sou o dono desta app": o código (o segredo OWNER_CODE do conector) escreve-se aqui — no iPhone a app do ecrã principal
// não partilha a memória com o Safari, por isso o link ?dono= aberto no Safari não chega à app instalada
function ownerHtml() {
    if (st.status?.owner) return `<div class="sw own-row"><span><b>És o dono desta app</b><br><small class="hint">Vês todos os locais e o painel Utilização.</small></span><button type="button" class="btn sm" data-act="owner-forget">Esquecer o código</button></div>`;
    return `<details class="own"${api.ownerCode() ? ' open' : ''}><summary>Sou o dono desta app</summary><div class="inl"><input id="f-owner" class="inp" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Código do dono" aria-label="Código do dono"><button type="button" class="btn pri" data-act="owner-save">Entrar</button></div>
        <div class="hint">É o segredo OWNER_CODE do conector (Cloudflare). Fica guardado só neste telemóvel; na app do ecrã principal escreve-o aqui.</div></details>`;
}
function ownerSave() {
    const inp = $('#f-owner'), v = (inp?.value || '').trim();
    if (!v) { toast('Escreve o código do dono.'); return; }
    inp.blur(); // com o campo focado a página não se redesenha (para não estragar o que se escreve)
    api.setOwnerCode(v); ownerJust = 'set'; loadStatus();
}
// Ajustes → "Análise diária do Claude": os locais deste telemóvel; o dono vê também os dos outros (só o nome, ~1 km e o
// estado) e pode desligá-los (e voltar a ligar os que desligou)
function placeState(p) {
    if (p.off) return p.offBy === 'owner' ? 'desligada por ti' : 'desligada no telemóvel';
    return p.status === 'paused' ? `em pausa (${PAUSE_DAYS} dias sem abrir a app)` : 'em uso';
}
function placeRow(p, other = false) {
    const where = other ? `~${F.num(p.lat, 2)}, ${F.num(p.lon, 2)} · ${placeState(p)}` : p.shared ? 'partilhada (já existia nesta cidade)' : `${F.num(p.lat, 3)}, ${F.num(p.lon, 3)}`;
    const act = !p.off ? `<button type="button" class="xbtn" data-rmplace="${esc(p.id)}" aria-label="${esc('Desligar ' + p.name)}">✕</button>`
        : other && p.offBy === 'owner' ? `<button type="button" class="btn sm" data-onplace="${esc(p.id)}">Ligar</button>` : '';
    return `<div class="wl-i${p.off ? ' off' : ''}"><button type="button" class="wl-go" data-goplace="${esc(p.id)}"><b>${esc(p.name)}</b><small class="num">${esc(where)}</small></button>${act}</div>`;
}
function placesSettingsHtml() {
    const owner = isOwner(), mineOn = onPlaces();
    const byOwner = !owner && myPlaces().some((p) => p.off && p.offBy === 'owner');
    let h = `<section class="sec" id="locais"><div class="sec-h"><h2>Análise diária do Claude</h2><span class="sub">${owner ? 'sem limite de locais' : '1 local por telemóvel'}</span></div><div class="form">
        <div class="wl">${mineOn.length ? mineOn.map((p) => placeRow(p)).join('') : `<div class="hint">${byOwner ? 'Desligada pelo dono da app.' : 'Desligada (é opcional). Liga-a no cartão «Análise do Claude» do local que quiseres.'}</div>`}</div>`;
    if (owner) {
        const others = st.places.filter((p) => p.mine === false);
        h += `<div><label>Dos outros telemóveis</label><div class="wl">${others.length ? others.map((p) => placeRow(p, true)).join('') : '<div class="hint">Ainda nenhum.</div>'}</div>
            <div class="hint">Só o nome e a zona (~1 km), nunca o ponto exato. ✕ desliga a análise desse telemóvel e só tu a voltas a ligar.</div></div>`;
    }
    const when = !owner && othersMode() === '1x' ? 'uma vez por dia, às 07:34' : `às ${schedTxt()}`;
    return h + `<div class="hint">O Claude escreve a análise ${esc(when)}, com os modelos, as observações, o radar e as imagens de satélite.${owner ? ''
        : ` Uma análise por cidade (partilhada com quem a ligar na mesma cidade); se ninguém abrir a app durante ${PAUSE_DAYS} dias, fica em pausa até voltarem.`}</div></div></section>`;
}
// Ajustes → "Utilização" (só o dono): telemóveis que abrem a app, locais, análises do Claude e a "análise dos outros"
const pastDay = (d, today) => { const k = F.dayDiff(today, d); return k === 0 ? 'Hoje' : k === -1 ? 'Ontem' : F.dayLabel(d, today); };
function useState(x) {
    if (x.status === 'off') return 'desligado';
    if (x.status === 'paused') return `em pausa${F.isNum(x.days) ? ` · há ${x.days} dias sem abrir a app` : ''}`;
    if (!x.analysed) return x.reason || 'de fora';
    return F.isNum(x.days) ? (x.days === 0 ? 'em uso · abriu a app hoje' : `em uso · abriu a app há ${x.days} dia${x.days === 1 ? '' : 's'}`) : 'em uso';
}
const seenTxt = (days) => (days == null ? 'ainda não abriu' : days === 0 ? 'abriu hoje' : days === 1 ? 'abriu ontem' : `abriu há ${days} dias`);
function usageHtml() {
    const u = st.usage;
    let b;
    if (!u) b = st.usageErr ? `<div class="hint">Sem dados (${esc(st.usageErr)}). <button type="button" class="btn sm" data-act="usage">Tentar</button></div>` : '<div class="skel skel-l"></div><div class="skel skel-l s"></div>';
    else {
        const D = u.devices, P = u.places, guests = P.list.filter((x) => x.kind === 'guest');
        const sum = u.analyses.reduce((a, d) => ({ s: a.s + d.scheduled, i: a.i + d.instant, g: a.g + d.guest }), { s: 0, i: 0, g: 0 });
        b = `<div class="stats use-st">
            <div><small>Telemóveis hoje</small><b class="num">${esc(F.num(D.today))}</b><em>abriram a app</em></div>
            <div><small>7 dias · 30 dias</small><b class="num">${esc(`${F.num(D.d7)} · ${F.num(D.d30)}`)}</b><em>${esc(`${F.num(D.total)} no total${D.owner ? ` (${F.num(D.owner)} teu${D.owner === 1 ? '' : 's'})` : ''}`)}</em></div>
            <div><small>Locais com análise</small><b class="num">${esc(F.num(P.owner + P.guests - P.off))}</b><em>${esc(`${F.num(P.owner)} teu${P.owner === 1 ? '' : 's'} · ${F.num(P.guests)} de outros${P.paused ? ` · ${F.num(P.paused)} em pausa` : ''}`)}</em></div>
            <div><small>Analisados por corrida</small><b class="num">${esc(`${F.num(P.analysed)} de ${F.num(P.cap)}`)}</b><em>os teus nunca ficam de fora</em></div></div>
            ${D.list?.length ? `<div><label>Telemóveis <small>(o nome que escolheram, ou o código)</small></label><ul class="use-l">${D.list.map((d) => `<li><b>${esc(d.name ? `${d.name} · ${d.id}` : `Telemóvel ${d.id}`)}${d.owner ? ' (teu)' : ''}</b><span>${esc([seenTxt(d.days), d.places.length ? d.places.join(', ') : 'sem análise diária', d.push ? 'notificações' : null].filter(Boolean).join(' · '))}</span></li>`).join('')}</ul></div>` : ''}
            <div><label>Locais dos outros <small>(só o nome)</small></label>${guests.length ? `<ul class="use-l">${guests.map((x) => `<li><b>${esc(x.name)}</b><span>${esc(useState(x))}</span></li>`).join('')}</ul>` : '<div class="hint">Ainda nenhum.</div>'}</div>
            <div><label>Análises do Claude, últimos 7 dias</label><div class="cmp-scroll"><table class="tbl use-t"><thead><tr><th scope="col">Dia</th><th scope="col">Agendadas</th><th scope="col">Imediatas</th><th scope="col">De outros</th></tr></thead>
                <tbody>${u.analyses.map((d) => `<tr><th scope="row">${esc(pastDay(d.date, u.today))}</th><td>${esc(F.num(d.scheduled))}</td><td>${esc(F.num(d.instant))}</td><td>${esc(F.num(d.guest))}</td></tr>`).join('')}</tbody>
                <tfoot><tr><th scope="row">7 dias</th><td>${esc(F.num(sum.s))}</td><td>${esc(F.num(sum.i))}</td><td>${esc(F.num(sum.g))}</td></tr></tfoot></table></div></div>`;
    }
    const mode = u?.others || othersMode();
    return `<section class="sec" id="uso"><div class="sec-h"><h2>Utilização</h2><span class="sub">só tu vês isto</span></div><div class="form">${b}
        <div><label>Análise dos outros</label><div class="seg use-seg" role="group" aria-label="Análise diária do Claude nos outros telemóveis">${OTHERS_UI.map(([v, l]) => `<button type="button" data-others="${v}" class="${mode === v ? 'on' : ''}" aria-pressed="${mode === v}">${l}</button>`).join('')}</div>
        <div class="hint">A análise diária do Claude nos outros telemóveis. «Só 1× por dia»: só na análise das 07:34. «Desligada»: os outros não a ligam nem a recebem, e a análise imediata fica só para ti. Os teus locais nunca são cortados; no máximo ${esc(F.num(u?.places?.cap ?? 15))} locais por corrida.</div></div></div></section>`;
}

// ---------- folhas ----------
const closeBtn = `<button type="button" class="mt-ibtn" data-act="close" aria-label="Fechar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`;
function openSheet(kind, arg) {
    st.sheet = { kind, arg };
    const sh = $('#mt-sheet'), card = $('#mt-sheet-card');
    card.style.transition = ''; card.style.transform = ''; $('.mt-sheet-bg').style.opacity = '';
    sh.hidden = false;
    document.body.style.overflow = 'hidden';
    renderSheet();
    card.scrollTop = 0;
    if (kind === 'place') setTimeout(() => $('#f-q')?.focus(), 60);
}
function closeSheet(animated) {
    const done = () => { $('#mt-sheet').hidden = true; document.body.style.overflow = ''; st.sheet = null; };
    if ($('#mt-sheet').hidden) return;
    if (!animated) { done(); return; }
    const c = $('#mt-sheet-card');
    c.style.transition = 'transform .22s ease-in'; c.style.transform = 'translateY(105%)';
    $('.mt-sheet-bg').style.transition = 'opacity .22s'; $('.mt-sheet-bg').style.opacity = '0';
    setTimeout(done, 220);
}
function renderSheet() {
    const card = $('#mt-sheet-card');
    const s = st.sheet;
    if (!s) return;
    if (s.kind === 'place') {
        const L = cfg.loc, saved = L && cfg.favs.some((f) => near(f, L));
        card.innerHTML = `<div class="grab"></div><div class="d-head"><div><h2 id="mt-sheet-title">Os meus locais</h2><div class="d-sub">Toca num local para o ver. ✦ = o Claude analisa-o todos os dias.</div></div>${closeBtn}</div>
            ${locsHtml()}
            ${L && !saved ? `<button type="button" class="btn blk" data-act="fav" style="margin-top:10px">${ui('plus')}Guardar ${esc(placeName())} nos meus locais</button>` : ''}
            <div class="grp-h" style="margin-top:20px">Adicionar um local</div>
            <div><label class="sr-only" for="f-q">Pesquisar local</label><input id="f-q" class="inp" type="search" placeholder="Cidade, vila, freguesia ou praia" autocomplete="off" autocapitalize="words" enterkeyhint="search"><div class="res" id="f-res" aria-live="polite"></div></div>
            <button type="button" class="btn blk" data-act="gps" style="margin-top:10px">${ui('gps')}Usar a minha localização exata</button>`;
        return;
    }
    if (s.kind === 'nome') {
        card.innerHTML = `<div class="grab"></div><div class="d-head"><div><h2 id="mt-sheet-title">Como te chamas?</h2><div class="d-sub">É obrigatório para ligar a análise diária, as notificações e os avisos. Só o dono da app vê o nome.</div></div>${closeBtn}</div>
            <div class="form"><input id="f-myname" class="inp" type="text" maxlength="40" autocomplete="nickname" spellcheck="false" placeholder="Ex.: Ana" aria-label="O teu nome">
            <button type="button" class="btn pri blk" data-act="name-sheet-save">Continuar</button></div>`;
        setTimeout(() => $('#f-myname')?.focus(), 50);
        return;
    }
    if (s.kind === 'report') {
        const cur = currentReport(), day = st.fc?.now?.isDay !== false;
        card.innerHTML = `<div class="grab"></div><div class="d-head"><div><h2 id="mt-sheet-title">Está a chover?</h2>
            <div class="d-sub">Diz o que vês aí agora. O teu aviso manda no «agora» durante ${REPORT_MIN} min e ajuda a análise do Claude.</div></div>${closeBtn}</div>
            <div class="rpt-grid" role="group" aria-label="O que vês agora">${Object.entries(REPORT_KINDS).map(([k, label]) => `<button type="button" data-report="${k}" class="${cur?.kind === k ? 'on' : ''}" aria-pressed="${cur?.kind === k}">${weatherIcon(REPORT_ICON[k], day, 36)}<span>${esc(label)}</span></button>`).join('')}</div>
            ${cur ? `<p class="note">O teu último aviso: ${esc(REPORT_KINDS[cur.kind])}, ${esc(F.ago((Date.now() - Date.parse(cur.time)) / 6e4))}. Um aviso novo substitui-o.</p>` : ''}`;
        return;
    }
    if (s.kind === 'off') {
        const p = st.places.find((x) => x.id === s.arg?.id);
        if (!p) { closeSheet(); return; }
        const other = p.mine === false; // o dono a desligar o local de outro telemóvel
        card.innerHTML = `<div class="grab"></div><div class="d-head"><div><h2 id="mt-sheet-title">Desligar a análise diária de ${esc(p.name)}?</h2>
            <div class="d-sub">${other ? 'É o local de outro telemóvel.' : p.shared ? 'É uma análise partilhada.' : 'A análise atual fica guardada.'}</div></div>${closeBtn}</div>
            <p class="note" style="margin:0 2px 14px">${other ? 'Esse telemóvel deixa de receber a análise do Claude e não a pode voltar a ligar; tu podes, em Ajustes.'
                : p.shared ? 'Deixa de aparecer neste telemóvel; continua para quem a ligou.'
                : `O Claude deixa de analisar este local às ${esc(schedTxt())}. Se voltares a ligar, aparece outra vez a última análise.`}</p>
            <div class="btns-col"><button type="button" class="btn blk danger" data-act="off-yes">Desligar</button><button type="button" class="btn blk" data-act="close">Cancelar</button></div>`;
        return;
    }
    if (s.kind === 'share') { // sem partilha do sistema nem acesso à área de transferência: o texto para copiar à mão
        card.innerHTML = `<div class="grab"></div><div class="d-head"><div><h2 id="mt-sheet-title">Partilhar a Meteo</h2><div class="d-sub">Copia o texto e envia-o numa mensagem.</div></div>${closeBtn}</div>
            <label class="sr-only" for="f-share">Texto para partilhar</label><textarea id="f-share" class="inp share-t" readonly rows="9">${esc(SHARE_TEXT)}</textarea>
            <div class="btns-col" style="margin-top:12px"><button type="button" class="btn pri blk" data-act="share-copy">Copiar o texto</button></div>`;
        return;
    }
    if (s.kind === 'day') {
        const fc = st.fc, d = fc?.daily?.[s.arg];
        if (!d) { closeSheet(); return; }
        const today = todayOf(fc);
        const pr = (a, b) => (F.isNum(a) && F.isNum(b) ? `80% entre ${F.num(a, 1)} e ${F.num(b, 1)}°` : '');
        let hours = (fc.hourly || []).filter((x) => x.time.slice(0, 10) === d.date);
        const next12 = d.date === today && hours.length < 12;
        if (next12) hours = (fc.hourly || []).slice(0, 12);
        const stats = [
            ['Máxima', F.deg(d.tmax, 1), pr(d.tmaxP10, d.tmaxP90)],
            ['Mínima', F.deg(d.tmin, 1), pr(d.tminP10, d.tminP90)],
            ['Chuva', F.mm(d.precip || 0), `${F.pct(d.pop)} prob.${F.isNum(d.precipP90) && d.precipP90 > (d.precip || 0) ? ` · até ${F.mm(d.precipP90)}` : ''}`],
            ['Chuva forte (≥10 mm)', F.pct(d.popHeavy), 'dos cenários'],
            ['Rajada máxima', F.kmh(d.gustMax), `vento ${F.num(d.windMax)} km/h ${F.compass(d.dir)}`],
            ['Índice UV máx.', F.num(d.uvMax, 1), ''],
            ['Sol', `${d.sunrise || '–'} – ${d.sunset || '–'}`, 'nascer e pôr'],
            ['Normal', d.normal ? `${F.deg(d.normal.tmax)} / ${F.deg(d.normal.tmin)}` : '–', F.isNum(d.anomaly) ? `${F.signed(d.anomaly, 1)}° na máxima` : ''],
            ['Desde ontem', d.change24h && F.isNum(d.change24h.tmax) ? `${F.signed(d.change24h.tmax, 1)}°` : '–', d.change24h && F.isNum(d.change24h.precip) ? `chuva ${F.signed(d.change24h.precip, 1)} mm` : 'sem comparação'],
            ['Confiança', cap1(d.confidence === 'media' ? 'média' : d.confidence || '–'), F.isNum(d.spread) ? `dispersão ${F.num(d.spread, 1)}°` : ''],
        ];
        card.innerHTML = `<div class="grab"></div><div class="d-head"><div><h2 id="mt-sheet-title">${esc(cap1(F.dayDiff(today, d.date) <= 1 ? F.dayLabel(d.date, today) : F.wdLong(d.date)))}, ${esc(F.dateShort(d.date))}</h2>
            <div class="d-sub">${esc(F.wxText(d.code))} · ${esc(d.source === 'ensemble' ? `mediana de ${F.num(fc.ensemble?.members || 0)} cenários` : `consenso de ${fc.models?.length || 0} modelos`)}</div></div>${closeBtn}</div>
            <div class="d-big">${weatherIcon(d.code, true, 64, '', cfg.anim !== false)}<div><b class="num">${esc(F.deg(d.tmax))} / ${esc(F.deg(d.tmin))}</b><br><span>máxima e mínima</span></div></div>
            <div class="stats">${stats.map(([k, v, e]) => `<div><small>${esc(k)}</small><b class="num">${esc(v)}</b>${e ? `<em>${esc(e)}</em>` : ''}</div>`).join('')}</div>
            ${hours.length ? `<div class="sec-h"><h2>${next12 ? 'Próximas 12 horas' : 'Hora a hora'}</h2><span class="sub">toca numa hora</span></div><div class="box"><div id="d-chart" class="chart"></div></div>` : '<p class="note">O detalhe hora a hora existe para as próximas 72 horas. Para este dia, os valores vêm da distribuição dos cenários.</p>'}`;
        if (hours.length) renderHourly($('#d-chart'), hours, { todayIso: today });
    }
}
// ---------- gestos de toque ----------
// Um só motor decide o gesto no primeiro movimento, para não se atropelarem:
// • folha aberta: puxar para baixo fecha-a (de qualquer ponto, se estiver no topo); na folha do dia, para os lados muda de dia;
// • linha com ✕ (locais, aviso de instalar): arrastar para a esquerda apaga, como no Mail do iPhone;
// • página: para os lados muda de separador (Agora ⇄ Dias ⇄ Satélite ⇄ Análise ⇄ Ajustes); no topo, para baixo atualiza.
// O que já desliza sozinho para os lados (gráfico das horas, tabelas, botões a mais) e as caixas de texto ficam de fora.
const TABS = ['agora', 'dias', 'satelite', 'analise', 'ajustes'];
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const slideIn = (el, dir) => { if (dir && !calm() && el.animate) el.animate([{ transform: `translateX(${dir * 56}px)`, opacity: 0.25 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2, .8, .2, 1)' }); };
let swapping = false; // a meio de uma troca de separador (os gestos esperam)
function goTab(tab, dir = 0) {
    if (!TABS.includes(tab)) return;
    const body = $('#mt-body');
    const swap = () => { cfg.tab = tab; saveCfg(); closeSheet(); window.scrollTo(0, 0); render(); if (tab === 'ajustes') loadStatus(); };
    if (!dir || calm() || !body.animate) { body.style.transform = ''; swap(); return; }
    // continua o movimento do dedo, sempre para o mesmo lado: a página sai e a nova entra do outro lado. Só transform,
    // sem transparência (com o céu misturado no cartão, a transparência obrigava a refazer tudo em cada imagem: tremia)
    swapping = true; pauseSky(420);
    const w = body.clientWidth || window.innerWidth, x0 = parseFloat((body.style.transform.match(/-?[\d.]+/) || ['0'])[0]) || 0;
    body.style.transition = ''; body.style.transform = '';
    const out = body.animate([{ transform: `translateX(${x0}px)` }, { transform: `translateX(${-dir * w * 0.5}px)` }], { duration: 110, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' });
    out.onfinish = () => {
        swap(); out.cancel();
        body.animate([{ transform: `translateX(${dir * w * 0.3}px)` }, { transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2, .8, .2, 1)' }).onfinish = () => { swapping = false; };
        setTimeout(() => { swapping = false; }, 260);
    };
}
function goDay(i, dir = 0) {
    if (st.sheet?.kind !== 'day' || !st.fc?.daily?.[i]) return false;
    openSheet('day', i);
    slideIn($('#mt-sheet-card'), dir);
    return true;
}
const SWIPE_LABEL = (x) => (x.dataset.rmfav != null ? 'Apagar' : x.dataset.rmplace ? 'Desligar' : 'Fechar');
// depois de um gesto, o dedo a sair não conta como toque no que estava debaixo dele (os cliques do próprio código passam)
let noClick = { until: 0, el: null, x: 0, y: 0 };
document.addEventListener('click', (e) => {
    const n = noClick.el;
    if (e.isTrusted && n && performance.now() < noClick.until && Math.abs(e.clientX - noClick.x) < 30 && Math.abs(e.clientY - noClick.y) < 30
        && (n.contains(e.target) || e.target.contains(n))) { e.preventDefault(); e.stopPropagation(); }
}, true);
(function gestures() {
    const body = $('#mt-body'), ptr = $('#mt-ptr'), sheet = $('#mt-sheet'), card = $('#mt-sheet-card'), bg = $('.mt-sheet-bg');
    let g = null, busy = false;
    const hScroll = (el, stop) => {
        for (; el && el !== stop && el !== document.body; el = el.parentElement) {
            if (el.scrollWidth > el.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return el;
        }
        return null;
    };
    const swRow = (t) => { const r = t.closest('.wl-i, .banner'), x = r?.querySelector(':scope > .xbtn'); return x ? { r, x } : null; };
    const ptrSet = (h, txt) => { ptr.style.height = h + 'px'; ptr.firstChild.textContent = txt; body.style.transform = h ? `translateY(${h}px)` : ''; };
    // as decisões (que gesto é, quanto segue o dedo, se se confirma) são do motor de gestos comum às apps, em Onda
    // (../onda/rt/gestos-onda.js); aqui fica o que a Meteo faz no ecrã
    const OG = window.OndaGestos, ms = (G) => performance.now() - G.t0;
    const MODOS = { 1: 'sheet', 2: 'day', 3: 'tab', 4: 'row', 5: 'ptr' };
    const peek = (tab) => $$('#mt-nav button').forEach((b) => b.classList.toggle('peek', b.dataset.tab === tab));
    const pick = (G) => {
        if (!OG || !OG.ok) return '';
        let c = 0;
        if (G.field) c |= OG.CAMPO;
        if (G.hs) c |= OG.DESLIZA;
        if (G.row) c |= OG.LINHA;
        if (G.inSheet) {
            c |= OG.FOLHA;
            if (G.top && card.scrollTop <= 0) c |= OG.TOPO;
            if (st.sheet?.kind === 'day') c |= OG.PAGINAS;
        } else {
            if (!swapping) c |= OG.SEPARADORES; // a meio de uma troca de separador, espera
            c |= OG.ATUALIZA;
            if (G.top && window.scrollY <= 0) c |= OG.TOPO;
        }
        // no Safari (fora da app instalada) o bordo esquerdo é o «voltar» do próprio browser
        if (G.x0 < 20 && !isStandalone()) c |= OG.BORDA;
        if (st.pulling) c |= OG.A_PUXAR;
        if (busy) c |= OG.A_ATUALIZAR;
        return MODOS[OG.modo(c, G.dx, G.dy)] || '';
    };
    const move = {
        sheet(G) {
            const d = OG.segue(OG.FECHAR, G.dy);
            card.style.transition = 'none'; card.style.transform = `translateY(${d}px)`;
            bg.style.transition = 'none'; bg.style.opacity = String(OG.opac(d));
        },
        day(G) {
            const has = !!st.fc?.daily?.[st.sheet.arg + (G.dx < 0 ? 1 : -1)];
            card.style.transition = 'none'; card.style.transform = `translateX(${OG.segue(OG.PAGINA, G.dx, 0, has)}px)`;
        },
        tab(G) {
            const next = TABS[TABS.indexOf(cfg.tab) + (G.dx < 0 ? 1 : -1)];
            pauseSky(300); // o céu fica parado enquanto a página anda com o dedo
            body.style.transition = 'none'; body.style.transform = `translateX(${OG.segue(OG.SEPARADOR, G.dx, 0, !!next)}px)`;
            peek(next && Math.abs(G.dx) > 80 ? next : '');
        },
        row(G) {
            const { r } = G.row, w = r.offsetWidth;
            r.classList.add('swp'); r.classList.remove('snap');
            r.dataset.sw = SWIPE_LABEL(G.row.x);
            r.style.setProperty('--sx', `${OG.segue(OG.APAGAR, G.dx, w)}px`);
            r.classList.toggle('arm', OG.arma(G.dx, w));
        },
        ptr(G) {
            if (G.dy <= 0) { if (st.pulling) { st.pulling = false; ptrSet(0, ''); } return; }
            st.pulling = true; G.h = OG.segue(OG.ATUALIZAR, G.dy);
            body.style.transition = 'none'; ptr.style.transition = 'none';
            ptrSet(G.h, OG.fim(OG.ATUALIZAR, G.h, 0) ? 'Larga para atualizar' : 'Puxa para atualizar');
        },
    };
    const done = {
        sheet(G, ok) {
            if (ok && OG.fim(OG.FECHAR, G.dy, ms(G))) { closeSheet(true); return; }
            card.style.transition = 'transform .2s ease-out'; card.style.transform = '';
            bg.style.transition = 'opacity .2s'; bg.style.opacity = '';
        },
        day(G, ok) {
            const dir = G.dx < 0 ? 1 : -1;
            card.style.transition = 'transform .2s ease-out'; card.style.transform = '';
            if (ok && OG.fim(OG.PAGINA, G.dx, ms(G))) { card.style.transition = ''; goDay(st.sheet.arg + dir, dir); }
        },
        tab(G, ok) {
            const dir = G.dx < 0 ? 1 : -1, next = TABS[TABS.indexOf(cfg.tab) + dir];
            peek('');
            if (ok && next && OG.fim(OG.SEPARADOR, G.dx, ms(G))) { goTab(next, dir); return; }
            body.style.transition = 'transform .2s ease-out'; body.style.transform = '';
            setTimeout(() => { body.style.transition = ''; }, 220);
        },
        row(G, ok) {
            const { r, x } = G.row, w = r.offsetWidth;
            r.classList.add('snap');
            if (ok && OG.fim(OG.APAGAR, G.dx, ms(G), w)) {
                r.style.setProperty('--sx', `${-w}px`);
                setTimeout(() => { x.click(); if (r.isConnected) { r.style.setProperty('--sx', '0px'); setTimeout(() => r.classList.remove('swp', 'snap', 'arm'), 220); } }, 170);
                return;
            }
            r.style.setProperty('--sx', '0px'); r.classList.remove('arm');
            setTimeout(() => r.classList.remove('swp', 'snap'), 220);
        },
        ptr() {
            if (!st.pulling) return;
            body.style.transition = ''; ptr.style.transition = '';
            if (OG.fim(OG.ATUALIZAR, st.pullH, 0) && cfg.loc) {
                busy = true; ptrSet(44, 'A atualizar…');
                Promise.all([refresh(), loadStatus()]).finally(() => { busy = false; st.pulling = false; ptrSet(0, ''); scheduleRender(); });
            } else { st.pulling = false; ptrSet(0, ''); }
        },
    };
    const end = (ok) => {
        if (!g) return;
        const G = g; g = null;
        if (!G.mode) return;
        if (G.mode !== 'ptr') noClick = { until: performance.now() + 400, el: G.t, x: G.x0 + G.dx, y: G.y0 + G.dy };
        st.pullH = G.h || 0;
        done[G.mode](G, ok);
    };
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1 || g?.mode) { end(false); if (e.touches.length !== 1) return; }
        const t = e.target, p = e.touches[0], inSheet = !sheet.hidden && card.contains(t);
        if (busy || (!sheet.hidden && !inSheet)) { g = null; return; }
        g = { x0: p.clientX, y0: p.clientY, t0: performance.now(), dx: 0, dy: 0, mode: '', t, inSheet, row: swRow(t),
            hs: hScroll(t, inSheet ? card : null), field: !!t.closest('input, textarea, select'),
            top: inSheet ? card.scrollTop <= 0 : window.scrollY <= 0 };
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (!g) return;
        const p = e.touches[0];
        g.dx = p.clientX - g.x0; g.dy = p.clientY - g.y0;
        if (!g.mode) {
            const ax = Math.abs(g.dx), ay = Math.abs(g.dy);
            if (ax < 8 && ay < 8) {
                // na folha, no topo e a descer: segura já (no iPhone o deslizar nativo começa cedo e já não se trava)
                if (g.inSheet && g.top && !g.hs && !g.field && g.dy > 0 && ay >= ax && e.cancelable) e.preventDefault();
                return;
            }
            g.mode = pick(g);
            if (!g.mode) { g = null; return; }
            // o browser já começou a deslizar a página (o toque deixou de se poder cancelar): não lutar com ele —
            // mexer a página para o lado enquanto ela sobe e desce era o que a fazia tremer
            if (g.mode !== 'ptr' && !e.cancelable) { g = null; return; }
        }
        if (g.mode !== 'ptr' && e.cancelable) e.preventDefault();
        move[g.mode](g);
    }, { passive: false });
    document.addEventListener('touchend', () => end(true), { passive: true });
    document.addEventListener('touchcancel', () => end(false), { passive: true });
})();

// ---------- pesquisa de locais ----------
let searchT = 0, lastRes = [];
async function doSearch(qtext) {
    const res = $('#f-res');
    if (!res) return;
    const qq = qtext.trim();
    if (qq.length < 2) { res.innerHTML = ''; return; }
    res.innerHTML = '<div class="hint">A pesquisar…</div>';
    try {
        const r = await api.geocode(qq);
        if (($('#f-q') || {}).value?.trim() !== qq) return;
        lastRes = r.slice(0, 8);
        res.innerHTML = lastRes.length ? lastRes.map((x, i) => `<button type="button" data-pick="${i}">${esc(x.name)} <small>${esc([x.admin1, x.country].filter(Boolean).join(', '))}</small></button>`).join('') : '<div class="hint">Sem resultados. Experimenta outro nome.</div>';
    } catch (e) { res.innerHTML = `<div class="hint">Erro: ${esc(e.message)}</div>`; }
}

// ---------- ações ----------
async function togglePlace(on) {
    if (!cfg.loc) return;
    try {
        if (on) {
            if (!nearPlace() && !ensureName(() => togglePlace(true))) return;
            if (nearPlace()) toast('A análise diária já está ligada para este local.');
            else await turnOn();
        } else {
            const p = nearPlace();
            if (p) { openSheet('off', { id: p.id }); return; }
            toast('A análise diária já está desligada para este local.');
        }
    } catch (e) { toast(e.message); }
    render();
}
// Ligar a análise diária aqui: um local seu desligado perto volta a ligar-se (o mesmo id: a última análise e as lições
// ficam); nos outros telemóveis (1 local cada) o seu local muda para aqui; senão regista-se um novo
async function turnOn() {
    const { lat, lon } = cfg.loc, name = placeName();
    const off = myPlaces().find((p) => p.off && haversineKm(p.lat, p.lon, lat, lon) <= FAR_KM);
    if (off) {
        upsertPlace(await api.updatePlace(off.id, { on: true }));
        toast(`Análise diária de ${off.name} ligada de novo. A próxima chega ${nextRun()}.`);
        loadAnalysis(cfg.loc);
        return;
    }
    // o conector decide: na mesma cidade junta-se à análise que já existe; senão cria (ou pede para mudar o seu local)
    try {
        const p = await api.addPlace(name, lat, lon);
        if (p.shared) st.places = st.places.filter((x) => x.id === p.id || !(x.shared || (!isOwner() && x.mine !== false && !x.off)));
        upsertPlace(p);
        toast(p.shared || p.adopted ? `Ligada: usas a análise diária de ${p.name}, que já existia.` : `Ligada. A primeira análise chega ${nextRun()}.`);
    } catch (e) {
        if (e.code !== 'limite' || !e.data?.place) throw e;
        upsertPlace(e.data.place); // já tinha um local (noutro sítio): muda-o para aqui
        await moveHere(e.data.place, name);
        return;
    }
    loadAnalysis(cfg.loc); // o conector pode ter voltado a ligar um local antigo daqui, com a última análise
}
async function moveHere(p, name) {
    const from = { lat: p.lat, lon: p.lon, name: p.name, off: !!p.off };
    upsertPlace(await api.updatePlace(p.id, { lat: cfg.loc.lat, lon: cfg.loc.lon, name, on: true }));
    render();
    loadAnalysis(cfg.loc);
    toast(from.off ? `Ligada. A primeira análise chega ${nextRun()}.` : `A tua análise diária passa de ${from.name} para este local. A próxima chega ${nextRun()}.`,
        () => api.updatePlace(p.id, { lat: from.lat, lon: from.lon, name: from.name, ...(from.off ? { on: false } : {}) })
            .then((n) => { upsertPlace(n); render(); toast(`A análise diária voltou para ${from.name}.`); }).catch((e) => toast(e.message)));
}
// desligar só depois de confirmar (folha); o local fica guardado no conector (com a análise e as lições) e "Desfazer"
// volta a ligá-lo, com o mesmo id
async function placeOff(id) {
    const p = st.places.find((x) => x.id === id);
    closeSheet(true);
    if (!p) return;
    try {
        await api.deletePlace(p.id);
        if (p.shared) { // sair da análise partilhada: deixa de aparecer aqui; «Desfazer» junta-se outra vez
            st.places = st.places.filter((x) => x.id !== p.id);
            render();
            toast(`Deixaste de usar a análise diária de ${p.name}.`, () => api.addPlace(p.name, p.lat, p.lon).then((n) => { upsertPlace(n); render(); toast(`Voltaste a usar a análise de ${n.name}.`); }).catch((e) => toast(e.message)));
            return;
        }
        upsertPlace({ ...p, off: true, offBy: p.mine === false ? 'owner' : 'device' });
        render();
        toast(`Análise diária desligada para ${p.name}.`, () => placeBack(p));
    } catch (e) { toast(e.message); }
}
async function placeBack(p) {
    try {
        upsertPlace(await api.updatePlace(p.id, { on: true }));
        render();
        toast(`Análise diária de ${p.name} ligada de novo.`);
        if (cfg.loc) loadAnalysis(cfg.loc);
    } catch (e) { toast(e.message); }
}
// Partilhar a app: a partilha do sistema (Web Share); sem ela, copiar o texto; sem isso, mostrá-lo para copiar à mão
async function shareApp() {
    if (navigator.share) {
        try { await navigator.share({ title: 'Meteo', text: SHARE_TEXT }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    if (await copyText(SHARE_TEXT)) { toast('Texto copiado: cola-o numa mensagem.'); return; }
    openSheet('share');
}
async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch { /* sem acesso à área de transferência */ }
    const ta = $('#f-share');
    if (!ta) return false;
    ta.focus(); ta.select();
    try { return document.execCommand('copy'); } catch { return false; }
}
// só o dono: a análise diária do Claude nos outros telemóveis (ligada | só 1× por dia | desligada)
async function setOthers(mode) {
    if (!isOwner() || !OTHERS_UI.some(([v]) => v === mode) || mode === (st.usage?.others || othersMode())) return;
    try {
        const r = await api.setOthers(mode);
        if (st.status) st.status = { ...st.status, others: r.others };
        if (st.usage) st.usage = { ...st.usage, others: r.others };
        render();
        toast(`Análise dos outros: ${OTHERS_UI.find(([v]) => v === r.others)[1].toLowerCase()}.`);
        loadUsage();
    } catch (e) { toast(e.message); }
}
function ownerForget() {
    api.setOwnerCode('');
    toast('Código do dono esquecido neste telemóvel.');
    loadStatus();
}
// "Mudar a análise diária para este ponto": o local registado passa para o ponto selecionado (mesmo id: a última
// análise e as lições ficam); "Desfazer" volta a pô-lo onde estava
async function movePlaceHere() {
    const reg = analysedPoint()?.reg;
    if (!reg?.id || !cfg.loc) return;
    const from = { lat: reg.lat, lon: reg.lon };
    try {
        const p = await moveTo(reg.id, cfg.loc.lat, cfg.loc.lon);
        toast(`A análise diária de ${p.name} passa a ser para este ponto. A próxima chega ${nextRun()}.`, () => moveTo(reg.id, from.lat, from.lon)
            .then(() => toast(`A análise diária de ${p.name} voltou ao ponto anterior.`)).catch((e) => toast(e.message)));
    } catch (e) { toast(e.message); }
}
async function moveTo(id, lat, lon) {
    const p = await api.movePlace(id, lat, lon);
    if (p) {
        st.places = st.places.some((x) => x.id === p.id) ? st.places.map((x) => (x.id === p.id ? p : x)) : [...st.places, p];
        if (st.analysis?.place?.id === p.id) st.analysis = { ...st.analysis, place: { ...st.analysis.place, ...p } };
    }
    render();
    return p;
}
// "Está a chover?": vale já neste telemóvel (45 min) e segue para o conector, para a análise do Claude
async function submitReport(kind) {
    if (!cfg.loc || !Object.hasOwn(REPORT_KINDS, kind)) return;
    const rep = { kind, time: new Date().toISOString(), lat: cfg.loc.lat, lon: cfg.loc.lon };
    st.report = rep; api.saveReport(rep);
    closeSheet(true); reportTimer(); render();
    toast(`Obrigado! «${REPORT_KINDS[kind]}» conta no agora durante ${REPORT_MIN} min.`);
    try { await api.postReport(rep); } catch (e) { toast(`Aviso guardado neste telemóvel; o conector não o recebeu (${e.message})`); }
}
async function analyzeNow() {
    if (!st.fc || st.analyzing) return;
    st.analyzing = true; render();
    try {
        const analysis = await requestAnalysis(viewFc(), { reports: st.reports, headers: api.identityHeaders() });
        st.analysis = { ...(st.analysis || {}), analysis, ageMin: 0, offline: false };
        if (cfg.loc) api.saveAnalysis(cfg.loc.lat, cfg.loc.lon, st.analysis);
        toast('Análise feita ✓');
    } catch (e) { toast(e?.message || 'Não foi possível fazer a análise agora.'); }
    st.analyzing = false; render();
}
async function saveProxy() {
    const v = ($('#f-proxy')?.value || '').trim().replace(/\/+$/, '');
    if (v && !/^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)/.test(v)) { toast('O endereço tem de começar por https://'); return; }
    cfg.proxy = v; saveCfg(); setProxy(v || DEFAULT_PROXY);
    document.activeElement?.blur();
    st.status = null; st.statusErr = ''; render();
    await loadStatus();
    toast(st.status ? 'Conector ligado ✓' : `Conector sem resposta: ${st.statusErr}`);
    if (cfg.loc) refresh();
}

document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-act],[data-tab],[data-day],[data-layer],[data-km],[data-rz],[data-fs],[data-pick],[data-fav],[data-rmfav],[data-goplace],[data-rmplace],[data-onplace],[data-others],[data-report],[data-lv],[data-ll]');
    if (!t) return;
    const d = t.dataset;
    if (d.tab) { goTab(d.tab); return; }
    if (d.day != null) { openSheet('day', +d.day); return; }
    if (d.layer) { stopRadar(); cfg.layer = d.layer; saveCfg(); render(); return; }
    if (d.km) { cfg.km = +d.km; saveCfg(); render(); return; }
    if (d.rz) { stopRadar(); cfg.rz = +d.rz; saveCfg(); render(); return; }
    if (d.report) { submitReport(d.report); return; }
    if (d.fs) { cfg.fs = d.fs; saveCfg(); applyFs(); render(); return; }
    if (d.act === 'anim-on' || d.act === 'anim-off') { cfg.anim = d.act === 'anim-on'; saveCfg(); render(); return; }
    if (d.lv) { cfg.lv = d.lv; saveCfg(); render(); return; }
    if (d.ll != null) { cfg.ll = +d.ll; saveCfg(); render(); return; }
    if (d.pick != null) {
        const r = lastRes[+d.pick];
        if (!r) return;
        closeSheet();
        if (!cfg.favs.some((f) => near(f, r))) { cfg.favs.unshift({ lat: api.r4(r.lat), lon: api.r4(r.lon), name: r.name }); cfg.favs = cfg.favs.slice(0, 12); toast(`${r.name} guardado nos teus locais.`); }
        setLocation({ lat: r.lat, lon: r.lon, name: r.name });
        return;
    }
    if (d.fav != null) { const f = cfg.favs[+d.fav]; if (f) { closeSheet(); setLocation(f); } return; }
    if (d.rmfav != null) {
        const i = +d.rmfav, f = cfg.favs[i];
        if (!f) return;
        const again = () => { render(); if (st.sheet?.kind === 'place') { const y = $('#mt-sheet-card').scrollTop; renderSheet(); $('#mt-sheet-card').scrollTop = y; } };
        cfg.favs.splice(i, 1); saveCfg(); again();
        toast(`${f.name} apagado dos teus locais`, () => { if (!cfg.favs.some((x) => near(x, f))) { cfg.favs.splice(Math.min(i, cfg.favs.length), 0, f); saveCfg(); } again(); });
        return;
    }
    if (d.goplace) { const p = st.places.find((x) => x.id === d.goplace); if (p) { closeSheet(); setLocation({ lat: p.lat, lon: p.lon, name: p.name }); } return; }
    if (d.rmplace) { if (st.places.some((x) => x.id === d.rmplace)) openSheet('off', { id: d.rmplace }); return; }
    if (d.onplace) { const p = st.places.find((x) => x.id === d.onplace); if (p) placeBack(p); return; }
    if (d.others) { setOthers(d.others); return; }
    switch (d.act) {
        case 'close': closeSheet(true); break;
        case 'place': openSheet('place'); break;
        case 'gps': locate(); break;
        case 'refresh': refresh(); break;
        case 'reload': location.reload(); break;
        case 'place-on': togglePlace(true); break;
        case 'place-off': togglePlace(false); break;
        case 'off-yes': placeOff(st.sheet?.arg?.id); break;
        case 'place-move': movePlaceHere(); break;
        case 'analyze': analyzeNow(); break;
        case 'report': if (ensureName(() => openSheet('report'))) openSheet('report'); break;
        case 'rad-play': radarPlay(); break;
        case 'save-proxy': saveProxy(); break;
        case 'share': shareApp(); break;
        case 'share-copy': copyText(SHARE_TEXT).then((ok) => toast(ok ? 'Texto copiado: cola-o numa mensagem.' : 'Seleciona o texto e copia-o.')); break;
        case 'usage': st.usageErr = ''; render(); loadUsage(); break;
        case 'owner-forget': ownerForget(); break;
        case 'owner-save': ownerSave(); break;
        case 'name-save': nameSave(); break;
        case 'name-sheet-save': nameSave('f-myname'); break;
        case 'push-on': pushOn(); break;
        case 'push-off': pushOff(); break;
        case 'push-sun-on': pushChange({ sunday: true }); break;
        case 'push-sun-off': pushChange({ sunday: false }); break;
        case 'push-test': pushTest(); break;
        case 'fav': {
            const i = cfg.favs.findIndex((f) => near(f, cfg.loc));
            if (i >= 0) { cfg.favs.splice(i, 1); toast('Tirado dos teus locais'); }
            else { cfg.favs.unshift({ lat: cfg.loc.lat, lon: cfg.loc.lon, name: placeName() }); cfg.favs = cfg.favs.slice(0, 12); toast('Guardado nos teus locais'); }
            saveCfg(); render(); break;
        }
        case 'install': { const e = st.installEvt; st.installEvt = null; render(); e?.prompt(); break; }
        case 'no-install': cfg.noInstall = true; st.installEvt = null; st.iosHint = false; saveCfg(); render(); break;
        default: break;
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'f-owner') { e.preventDefault(); ownerSave(); }
    if (e.key === 'Enter' && e.target.id === 'f-name') { e.preventDefault(); nameSave(); }
    if (e.key === 'Enter' && e.target.id === 'f-myname') { e.preventDefault(); nameSave('f-myname'); }
});
// «Ver mais»: lembrar o que está aberto (a página redesenha-se com dados novos e não deve fechar o que a pessoa abriu)
document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (d?.tagName === 'DETAILS' && d.classList.contains('more') && d.id) { if (d.open) st.open.add(d.id); else st.open.delete(d.id); }
}, true);
document.addEventListener('change', (e) => {
    if (e.target.id === 'f-push-time') { e.target.blur(); pushChange({ time: e.target.value }); }
    if (e.target.id === 'f-push-place') { e.target.blur(); pushChange({ place: e.target.value }); }
});
document.addEventListener('input', (e) => {
    if (e.target.id === 'f-q') { clearTimeout(searchT); searchT = setTimeout(() => doSearch(e.target.value), 300); }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && st.sheet) closeSheet(true);
    if (e.key !== 'Enter') return;
    if (e.target.id === 'f-q') { e.preventDefault(); clearTimeout(searchT); doSearch(e.target.value); }
    if (e.target.id === 'f-proxy') { e.preventDefault(); saveProxy(); }
});

// para os testes
window.__mt = { cfg, st, render, refresh, loadAnalysis, SHARE_TEXT, rainFrames, skyGL };
init();
