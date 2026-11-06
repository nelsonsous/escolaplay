// Meteo — previsão do tempo para o ponto exato, com a mesma linguagem da app Mercados.
// A previsão é calculada no telemóvel por ./lib/data.js; o conector (Cloudflare Worker) serve
// METAR, FIRMS, fogos.pt, satélite, locais e a análise do Claude. Endereço nos Ajustes ou ?proxy=URL.
import { loadForecast, requestAnalysis, setProxy, getProxy, DEFAULT_PROXY } from './lib/data.js';
import * as api from './api.js';
import * as F from './format.js';
import { weatherIcon, ui } from './icons.js';
import { renderHourly, renderNowcast } from './charts.js';

const VERSION = '1.2.0';
const SCHEDULE = ['07:34', '13:34', '20:34']; // igual ao conector (/api/status)
const REFRESH_MIN = 15;
const LAYERS = [
    ['geocolour', 'Nuvens', 'Nuvens em cor natural de dia; de noite, infravermelho com as luzes das cidades (satélite MTG, Meteosat de 3.ª geração).'],
    ['ir', 'Infravermelho', 'Infravermelho 10,5 µm: quanto mais branco, mais alto e frio é o topo da nuvem. Mostra frentes e trovoadas de dia e de noite.'],
    ['lightning', 'Relâmpagos', 'Relâmpagos detetados pelo Lightning Imager do MTG nos últimos minutos, sobre o infravermelho.'],
    ['fire', 'Fogo', 'Temperatura do fogo (RGB): os focos ativos aparecem em laranja e amarelo.'],
    ['rain', 'Chuva', 'Intensidade da precipitação estimada por satélite (H SAF).'],
    ['airmass', 'Massas de ar', 'Massas de ar: vermelho = ar seco que desce (perto das depressões), verde = ar tropical, azul e violeta = ar polar. Ajuda a ver frentes e correntes de jato.'],
];
const ZOOMS = [300, 600, 1200];
const IND = { rain: ['rain', 'Chuva'], wind: ['wind', 'Vento'], thunder: ['bolt', 'Trovoada'], fog: ['fog', 'Nevoeiro'], frost: ['frost', 'Geada'], heat: ['heat', 'Calor'], snow: ['snow', 'Neve'], uv: ['sun', 'UV'] };
const SRC = { det: 'Modelos determinísticos', ens: 'Ensembles', prev: 'Corridas anteriores', metar: 'METAR (aeroportos)', place: 'Nome do local', clim: 'Normal climática', analysis: 'Análise do Claude', stations: 'Estações do IPMA', obs: 'Observações do IPMA', warnings: 'Avisos do IPMA', rcm0: 'Risco de incêndio (hoje)', rcm1: 'Risco de incêndio (amanhã)', districts: 'Distritos do IPMA', fogos: 'Ocorrências ANEPC', firms: 'Focos de calor (FIRMS)', ipmaFc: 'Previsão oficial do IPMA (concelho)', elev: 'Altitude das estações', obsHist: 'Histórico das estações', terrain: 'Relevo à volta do ponto' };
const FAR_KM = 2; // a análise mostrada é de um ponto a mais do que isto do ponto selecionado → avisar e oferecer mudar
const TITLES = { dias: 'Próximos dias', satelite: 'Satélite', analise: 'Análise', ajustes: 'Ajustes' };

// ---------- configuração ----------
const KEY = 'meteo:v1';
const DEFAULTS = { proxy: '', tab: 'agora', fs: 'n', layer: 'geocolour', km: 600, loc: null, favs: [], noInstall: false };
const cfg = { ...DEFAULTS, ...(api.store.get(KEY) || {}) };
if (!Array.isArray(cfg.favs)) cfg.favs = [];
if (!TITLES[cfg.tab] && cfg.tab !== 'agora') cfg.tab = 'agora';
const saveCfg = () => api.store.set(KEY, cfg);
{
    const sp = new URLSearchParams(location.search);
    const p = sp.get('proxy');
    if (p && /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)/.test(p)) {
        cfg.proxy = p.replace(/\/+$/, ''); saveCfg();
        sp.delete('proxy');
        history.replaceState(null, '', location.pathname + (sp.toString() ? '?' + sp : ''));
    }
}
setProxy(cfg.proxy || DEFAULT_PROXY);

const st = {
    fc: null, savedAt: 0, loading: false, error: '', offline: false, lastFetch: 0,
    analysis: undefined, places: [], status: null, statusErr: '',
    pulling: false, sheet: null, installEvt: null, iosHint: false, updateReady: false, analyzing: false,
};

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
const near = (a, b, km = 0.2) => a && b && haversineKm(a.lat, a.lon, b.lat, b.lon) <= km;

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
    }
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (!standalone && !cfg.noInstall) {
        window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); st.installEvt = e; scheduleRender(); });
        const ua = navigator.userAgent;
        st.iosHint = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    }
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && cfg.loc && Date.now() - st.lastFetch > REFRESH_MIN * 60e3) refresh();
    });
    window.addEventListener('online', () => { if (st.offline) refresh(); });
    loadStatus();
    if (cfg.loc) setLocation(cfg.loc, { save: false });
    else render();
}
function applyFs() {
    if (cfg.fs && cfg.fs !== 'n') document.documentElement.dataset.fs = cfg.fs;
    else delete document.documentElement.dataset.fs;
}

// ---------- local ----------
function setLocation(loc, { save = true } = {}) {
    cfg.loc = { lat: api.r4(loc.lat), lon: api.r4(loc.lon), name: loc.name || null, gps: !!loc.gps, acc: loc.acc ?? null };
    if (save) saveCfg();
    st.analysis = undefined; st.offline = false; st.error = '';
    const saved = api.loadSavedForecast(cfg.loc.lat, cfg.loc.lon);
    st.fc = saved?.fc || null; st.savedAt = saved?.savedAt || 0;
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
    try {
        const fc = await loadForecast({ lat: loc.lat, lon: loc.lon, name: loc.name || undefined });
        if (cfg.loc !== loc) return;
        st.fc = fc; st.savedAt = Date.now(); st.lastFetch = Date.now(); st.offline = false; st.error = '';
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
async function loadAnalysis(loc) {
    const [a, p] = await Promise.allSettled([api.getAnalysis(loc.lat, loc.lon), api.getPlaces()]);
    if (cfg.loc !== loc) return;
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
async function loadStatus() {
    try { st.status = await api.getStatus(); st.statusErr = ''; } catch (e) { st.status = null; st.statusErr = e.message; }
    if (cfg.tab === 'ajustes' || cfg.tab === 'analise') scheduleRender();
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
    document.title = cfg.loc ? `${placeName()} · Meteo` : 'Meteo';
}
function renderStatus() {
    const el = $('#mt-status');
    if (!el) return;
    if (!cfg.loc) { el.innerHTML = '<span><span class="dot"></span>Escolhe um local</span>'; return; }
    const fc = st.fc;
    let a;
    if (st.loading) a = '<span><span class="dot warn"></span>A atualizar…</span>';
    else if (!fc) a = st.error ? '<span><span class="dot off"></span>Sem previsão</span>' : '<span><span class="dot warn"></span>A calcular…</span>';
    else {
        const g = localGen(fc), today = todayOf(fc);
        const when = g ? `${F.dayDiff(g.slice(0, 10), today) === 0 ? '' : F.dayLabel(g.slice(0, 10), today).toLowerCase() + ' '}${F.hhmm(g)}` : '';
        const old = Date.now() - st.savedAt > 45 * 60e3;
        a = st.offline ? `<span><span class="dot off"></span>Sem ligação · dados de ${esc(when)}</span>`
            : `<span><span class="dot ${old ? 'warn' : 'on'}"></span>${old ? 'Dados de' : 'Atualizado às'} <b>${esc(when)}</b></span>`;
    }
    const L = fc?.location;
    let b = `${F.num(cfg.loc.lat, 4)}, ${F.num(cfg.loc.lon, 4)}`;
    if (F.isNum(L?.elevation)) b += ` · ${F.num(L.elevation)} m`;
    if (cfg.loc.gps && F.isNum(cfg.loc.acc)) b += ` · GPS ±${F.num(cfg.loc.acc)} m`;
    el.innerHTML = `${a}<span class="num">${esc(b)}</span>`;
}
function mount() {
    const fc = st.fc;
    if (cfg.tab === 'agora' && fc) {
        const nc = $('#nc-chart'); if (nc) renderNowcast(nc, fc.nowcast);
        const hc = $('#h-chart'); if (hc) renderHourly(hc, fc.hourly, { todayIso: todayOf(fc) });
    }
    const img = $('#sat-img');
    if (img) {
        const fr = img.closest('.sat-frame');
        const done = () => fr.classList.remove('loading', 'err');
        img.addEventListener('load', done);
        img.addEventListener('error', () => { fr.classList.remove('loading'); fr.classList.add('err'); });
        if (img.complete && img.naturalWidth) done();
    }
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
        return { title: 'Meteo', html: `<div class="welcome">${weatherIcon(2, true, 72)}<h2>Previsão para o sítio exato onde estás</h2>
            <p>Combina 9 modelos meteorológicos, mais de 200 cenários de ensemble e observações reais, com análise do Claude.</p>
            <div class="btns"><button type="button" class="btn pri" data-act="gps">${ui('gps')}Usar a minha localização</button><button type="button" class="btn" data-act="place">${ui('search')}Pesquisar local</button></div></div>` };
    }
    const title = `<button type="button" class="pg-loc" data-act="place" aria-label="${esc(placeName())} — mudar de local">${esc(placeName())}${ui('chevron')}</button>`;
    const fc = st.fc;
    if (!fc) {
        return { title, html: st.error
            ? `<div class="empty">${esc(st.error)}<div style="margin-top:10px"><button type="button" class="btn pri sm" data-act="refresh">Tentar de novo</button></div></div>`
            : skeleton() };
    }
    return { title, html: banners() + nowBox(fc) + alertsHtml(fc) + teaserHtml() + nowcastSec(fc) + hourlySec(fc) + tilesSec(fc) };
}

function tintOf(code, isDay) {
    const g = F.wxGroup(code);
    const t = ['drizzle', 'rain', 'showers', 'freezing'].includes(g) ? 'rain' : ['snow', 'snowshowers'].includes(g) ? 'snow' : g === 'storm' ? 'storm' : g === 'fog' ? 'fog' : ['clear', 'mostly'].includes(g) ? 'clear' : 'cloudy';
    return `t-${t}${isDay === false ? ' night' : ''}`;
}
function nowBox(fc) {
    const n = fc.now || {}, d0 = fc.daily?.[0] || {};
    const [ti, td] = F.num(n.temp, 1).split(',');
    const lines = [];
    if (fc.nowcast?.text) lines.push(`<li>${ui('drop')}<span>${esc(fc.nowcast.text)}</span></li>`);
    const o = n.obs;
    const many = (o?.n || 1) > 1;
    if (o && F.isNum(o.temp)) lines.push(`<li>${ui('station')}<span>Observado <b>${esc(F.deg(o.temp, 1))}</b> em ${esc(o.station)} · ${many ? '~' : ''}${esc(F.km(o.distanceKm))} · ${esc(F.ago(o.ageMin))} (${esc((o.sources || [o.source]).join(' + '))})</span></li>`);
    const c = n.correction;
    if (c && F.isNum(c.temp) && Math.abs(c.temp) >= 0.1) lines.push(`<li>${ui('target')}<span>Previsão ajustada ${esc(F.signed(c.temp, 1))}° com ${many ? `${esc(o.n)} estações` : 'esta observação'} nas próximas ${esc(c.decayHours ?? 6)} h.</span></li>`);
    const tl = terrainLine(fc);
    if (tl) lines.push(`<li>${ui('relief')}<span>${esc(tl)}</span></li>`);
    const conf = d0.confidence;
    return `<section class="box now ${tintOf(n.code, n.isDay)}" aria-label="Agora">
        <div class="now-top">
            <div><div class="now-t num" aria-label="${esc(F.deg(n.temp, 1))}"><span aria-hidden="true">${esc(ti)}</span>${td != null ? `<small aria-hidden="true">,${esc(td)}</small>` : ''}<i aria-hidden="true">°</i></div>
                <div class="now-c">${esc(F.wxText(n.code))}</div></div>
            <div class="now-i">${weatherIcon(n.code, n.isDay, 96, F.wxText(n.code))}</div>
        </div>
        <div class="now-m num"><span>Sensação ${esc(F.deg(n.feels))}</span><span>Máx. ${esc(F.deg(d0.tmax))}</span><span>Mín. ${esc(F.deg(d0.tmin))}</span>${conf ? `<span class="badge">${sig(conf, false)}${esc(F.CONF[conf] || '')}</span>` : ''}</div>
        ${lines.length ? `<ul class="now-l">${lines.join('')}</ul>` : ''}
    </section>`;
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
    const reg = r.place?.id ? st.places.find((x) => x.id === r.place.id) || null : null; // local registado, como está agora (pode ter mudado de sítio)
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
    const act = Object.keys(IND).filter((k) => (ind[k]?.level || 0) > 0).sort((a, b) => ind[b].level - ind[a].level);
    if (act.length) {
        h += `<ul class="tags" aria-label="Riscos previstos">${act.map((k) => { const it = ind[k];
            return `<li class="tag l${it.level}">${ui(IND[k][0])}<span><b>${IND[k][1]}</b> · ${esc(it.label || F.LEVELS[it.level])}${it.peak ? ` · ${esc(F.whenShort(it.peak, today))}` : ''}</span></li>`; }).join('')}</ul>`;
    }
    return h;
}
function nextRun() {
    const sched = st.analysis?.schedule || st.status?.schedule || SCHEDULE;
    const d = new Date();
    const now = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const next = sched.find((s) => s > now);
    return next ? `hoje às ${next}` : `amanhã às ${sched[0]}`;
}
function teaserHtml() {
    const r = st.analysis;
    if (r === undefined) return `<div class="claude" id="cl-teaser" aria-busy="true"><div class="adv-src">Análise do Claude</div><div class="skel skel-l"></div><div class="skel skel-l s"></div></div>`;
    const a = r?.analysis;
    if (!a) return `<button type="button" class="claude" id="cl-teaser" data-tab="analise"><div class="adv-src">Análise do Claude</div><p>Ainda não há análise para este local. Ativa a análise diária: o Claude junta os modelos, as observações e o satélite às ${esc(SCHEDULE.join(', '))}.</p><span class="lnk">Ativar</span></button>`;
    const ap = analysedPoint();
    const main = `<div class="adv-src">Análise do Claude <span>· ${esc(F.ago(r.ageMin ?? 0))}</span></div>${ap ? forLine(ap) : ''}
        <div class="cl-head">${esc(a.titulo)}</div>${a.resumo ? `<p class="clamp">${esc(a.resumo)}</p>` : ''}<span class="lnk">Ler a análise completa</span>`;
    // feita para outro ponto (> 2 km): dizê-lo e oferecer mudar a análise diária para aqui
    if (ap?.far && ap.reg && !ap.moved) {
        return `<div class="claude far" id="cl-teaser"><button type="button" class="cl-go" data-tab="analise">${main}</button>
            <div class="cl-far"><p>Esta análise é para um ponto a ${esc(F.km(ap.d))} daqui: o tempo aqui pode ser diferente.</p>
            <button type="button" class="btn sm pri" data-act="place-move">${ui('pin')}Mudar a análise diária para este ponto</button></div></div>`;
    }
    const note = ap?.far ? `<p class="cl-farmsg">${esc(ap.moved ? `A análise diária já passou para este ponto: a próxima chega ${nextRun()}.` : 'Feita para outro ponto: o tempo aqui pode ser diferente.')}</p>` : '';
    return `<button type="button" class="claude" id="cl-teaser" data-tab="analise">${main}${note}</button>`;
}
const nowcastSec = (fc) => (fc.nowcast?.steps?.length
    ? `<section class="sec"><div class="sec-h"><h2>Próximas 2 horas</h2></div><div class="box"><p class="lead">${esc(fc.nowcast.text || '')}</p><div id="nc-chart"></div></div></section>` : '');
const hourlySec = (fc) => (fc.hourly?.length
    ? `<section class="sec"><div class="sec-h"><h2>Próximas ${Math.min(72, fc.hourly.length)} horas</h2><span class="sub">toca numa hora</span></div><div class="box"><div id="h-chart" class="chart"></div></div></section>` : '');

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
    return `<section class="sec"><div class="sec-h"><h2>Indicadores</h2></div><div class="tiles">${tiles.join('')}</div></section>`;
}

function viewDays() {
    const title = TITLES.dias;
    if (!cfg.loc) return needPlace(title);
    const fc = st.fc;
    if (!fc) return { title, html: skeleton() };
    const D = fc.daily || [];
    const today = todayOf(fc);
    const lo = Math.min(...D.map((d) => (F.isNum(d.tminP10) ? d.tminP10 : d.tmin)).filter(F.isNum));
    const hi = Math.max(...D.map((d) => (F.isNum(d.tmaxP90) ? d.tmaxP90 : d.tmax)).filter(F.isNum));
    const span = Math.max(1, hi - lo);
    const pos = (v) => (((v - lo) / span) * 100).toFixed(2);
    const wid = (a, b) => Math.max(0, ((b - a) / span) * 100).toFixed(2);
    const ens = fc.ensemble?.members;
    let rows = '';
    D.forEach((d, i) => {
        if (i > 0 && d.source === 'ensemble' && D[i - 1].source !== 'ensemble') rows += `<div class="grp-h">Dias ${i + 1} a ${D.length} <small>tendência do ensemble${ens ? ` · ${esc(F.num(ens))} cenários` : ''}</small></div>`;
        const wLo = F.isNum(d.tminP10) ? d.tminP10 : d.tmin, wHi = F.isNum(d.tmaxP90) ? d.tmaxP90 : d.tmax;
        let rng = '';
        if (F.isNum(wLo) && F.isNum(wHi)) rng += `<i class="wh" style="left:${pos(wLo)}%;width:${wid(wLo, wHi)}%"></i>`;
        if (F.isNum(d.tmin) && F.isNum(d.tmax)) rng += `<i class="rb" style="left:${pos(d.tmin)}%;width:${wid(d.tmin, d.tmax)}%"></i>`;
        if (i === 0 && F.isNum(fc.now?.temp)) rng += `<i class="rn" style="left:${pos(Math.min(Math.max(fc.now.temp, lo), hi))}%"></i>`;
        const x = dayExtras(d);
        const label = F.dayLabel(d.date, today);
        const sr = `${label}: ${F.wxText(d.code)}, mínima ${F.deg(d.tmin)}, máxima ${F.deg(d.tmax)}, chuva ${F.pct(d.pop)}${F.CONF[d.confidence] ? ', ' + F.CONF[d.confidence].toLowerCase() : ''}`;
        rows += `<button type="button" class="row day${i === 0 ? ' today' : ''}" data-day="${i}" aria-label="${esc(sr)}">
            <span class="d-n" aria-hidden="true"><b>${esc(label)}</b><small>${esc(F.dateShort(d.date))}</small></span>
            <span aria-hidden="true">${weatherIcon(d.code, true, 30)}</span>
            <span class="d-p" aria-hidden="true">${(d.pop || 0) >= 10 ? esc(F.pct(d.pop)) : ''}</span>
            <span class="d-lo" aria-hidden="true">${esc(F.deg(d.tmin))}</span>
            <span class="rng" aria-hidden="true">${rng}</span>
            <span class="d-hi" aria-hidden="true">${esc(F.deg(d.tmax))}</span>
            <span class="d-c" aria-hidden="true">${sig(d.confidence, false)}</span>
            ${x.length ? `<span class="d-x" aria-hidden="true">${esc(x.join(' · '))}</span>` : ''}
        </button>`;
    });
    return { title, html: `<section class="sec"><div class="sec-h"><h2>${D.length} dias</h2><span class="sub">toca num dia para ver as horas</span></div>
        <div class="list">${rows}</div>
        <p class="legend-inline" aria-hidden="true"><span class="lg"><i class="k-rb"></i>mín.–máx.</span><span class="lg"><i class="k-wh"></i>80% dos cenários</span><span class="lg">${ui('signal3')}confiança</span></p>
        <p class="note">Dias 1 a 7: consenso ponderado de ${esc(fc.models?.length || 0)} modelos, corrigido com as observações. Depois: mediana do ensemble. A linha fina vai do cenário frio (P10) ao quente (P90).</p></section>` };
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
        <div class="sat-frame loading"><img id="sat-img" src="${esc(api.satUrl(cfg.layer, cfg.loc.lat, cfg.loc.lon, cfg.km))}" width="720" height="540" alt="${esc(`Imagem de satélite (${layer[1].toLowerCase()}) centrada no local`)}" decoding="async"><span class="sat-mk" aria-hidden="true"></span><span class="sat-msg">Imagem indisponível de momento.</span></div>
        <div class="sat-bar"><div class="seg" role="group" aria-label="Largura da imagem">${ZOOMS.map((z) => `<button type="button" data-km="${z}" aria-pressed="${z === cfg.km}" class="${z === cfg.km ? 'on' : ''}">${F.num(z)} km</button>`).join('')}</div><span class="note" style="margin:0">EUMETSAT · o local está no centro</span></div>
        <p class="note">${esc(layer[2])}</p></section>`;
    html += fc ? fireHtml(fc) : skeleton();
    return { title, html };
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
        const sec = (t, x) => (x ? `<div class="an-sec"><h4>${t}</h4><p>${esc(x)}</p></div>` : '');
        const ap = analysedPoint();
        // feita para outro ponto (> 2 km): dizê-lo claramente e oferecer mudar a análise diária para o ponto selecionado
        if (ap?.far) {
            h += `<div class="warn far-pt" role="note">${ui('alert')}<div><b>Esta análise é para outro ponto, a ${esc(F.km(ap.d))} daqui</b>
                <span class="w-when">${esc(forTxt(ap))}</span>
                <p>${esc(ap.moved ? `O tempo aqui pode ser diferente. A análise diária já passou para este ponto: a próxima chega ${nextRun()}.`
                    : 'O tempo aqui pode ser diferente (altitude, relevo, distância ao mar).')}</p>
                ${ap.reg && !ap.moved ? `<button type="button" class="btn sm pri" data-act="place-move">${ui('pin')}Mudar a análise diária para este ponto</button>` : ''}</div></div>`;
        }
        h += `<article class="today">
            <div class="adv-src">Análise do Claude <span>· ${a.by === 'claude-api' ? 'a pedido' : 'agendada'}${hm ? ` às ${esc(hm)}` : ''}${r.offline ? ' · guardada' : ''}</span></div>
            ${ap ? forLine(ap) : ''}
            <div class="cl-head">${esc(a.titulo)}</div>${a.resumo ? `<p style="margin:6px 0 0;color:var(--soft)">${esc(a.resumo)}</p>` : ''}
            ${a.alertas?.length ? `<ul class="tags" aria-label="Alertas do Claude">${a.alertas.map((x) => `<li class="tag ${esc(x.nivel || 'info')}"><span class="dot"></span><span><b>${esc(cap1(x.tipo))}</b>${x.quando ? ` · ${esc(x.quando)}` : ''}${x.texto ? ` — ${esc(x.texto)}` : ''}</span></li>`).join('')}</ul>` : ''}
            ${sec('Próximas horas', a.agora)}${sec('Hoje', a.hoje)}${sec('Amanhã', a.amanha)}
            ${a.dias?.length ? `<div class="an-sec"><h4>Próximos dias</h4><ul class="an-days">${a.dias.map((d) => `<li><b>${esc(today ? F.dayLabel(d.data, today) : d.data)}</b>${sig(d.confianca)}<span>${esc(d.texto)}</span></li>`).join('')}</ul></div>` : ''}
            ${sec('Tendência (dias 7 a 15)', a.tendencia)}${sec('Incêndios', a.incendios)}${sec('O que mostra o satélite', a.satelite)}
            ${a.conselhos?.length ? `<div class="an-sec"><h4>Conselhos</h4><ul class="an-list">${a.conselhos.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>` : ''}
            ${a.fiabilidade ? `<div class="an-sec"><h4>Fiabilidade</h4><p><span class="badge">${sig(a.fiabilidade.curto, false)}Curto prazo: ${esc(a.fiabilidade.curto === 'media' ? 'média' : a.fiabilidade.curto)}</span><span class="badge">${sig(a.fiabilidade.medio, false)}Médio prazo: ${esc(a.fiabilidade.medio === 'media' ? 'média' : a.fiabilidade.medio)}</span></p>${a.fiabilidade.texto ? `<p style="margin-top:6px">${esc(a.fiabilidade.texto)}</p>` : ''}</div>` : ''}
            ${sec('Análise técnica', a.tecnica)}${sec('Como correu a previsão anterior', a.verificacao)}
            <p class="an-meta">Feita ${esc(F.ago(r.ageMin ?? 0))} · próxima ${esc(nextRun())}.</p>
        </article>`;
    } else {
        h += `<div class="today"><div class="adv-src">Análise do Claude</div><p style="margin:6px 0 0;color:var(--soft)">${r?.error && !r.offline ? `Não foi possível obter a análise (${esc(r.error)}).` : `Ainda não há análise para este local. Com a análise diária ligada, o Claude junta os modelos, as observações e as imagens de satélite às ${esc(sched.slice(0, -1).join(', '))} e ${esc(sched.at(-1))}.`}</p></div>`;
    }
    const np = nearPlace();
    h += `<div class="form"><div class="sw"><span><b>Análise diária para este local</b><br><small class="hint">${np ? `Ligada (${esc(np.name)}) · ${esc(sched.join(' · '))}` : `Às ${esc(sched.join(', '))} · até 5 locais`}</small></span>
        <div class="seg" role="group" aria-label="Análise diária"><button type="button" data-act="place-on" class="${np ? 'on' : ''}" aria-pressed="${!!np}">Sim</button><button type="button" data-act="place-off" class="${np ? '' : 'on'}" aria-pressed="${!np}">Não</button></div></div>
        ${onDemand ? `<button type="button" class="btn pri blk" data-act="analyze"${st.analyzing ? ' disabled' : ''}>${ui('sparkle', st.analyzing ? 'spin' : '')}${st.analyzing ? 'A analisar… pode demorar 1 minuto' : 'Analisar agora'}</button>` : ''}</div></section>`;
    if (fc) h += compareHtml(fc) + reliabilityHtml(fc) + obsHtml(fc) + modelsHtml(fc);
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
        <p class="note">Máxima/mínima de cada fonte tal como sai, sem correções; o consenso já junta tudo com os pesos da verificação local e as observações. A laranja, 2° ou mais acima do consenso; a azul, 2° ou mais abaixo.</p></section>`;
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
const nearPlace = () => (cfg.loc ? st.places.find((p) => haversineKm(p.lat, p.lon, cfg.loc.lat, cfg.loc.lon) <= 2) : null);
function reliabilityHtml(fc) {
    const ind = fc.indicators || {}, ver = fc.verification;
    const byId = Object.fromEntries((fc.models || []).map((m) => [m.id, m]));
    return `<section class="sec"><div class="sec-h"><h2>Fiabilidade</h2></div><div class="stats">
        <div><small>Previsibilidade</small><b>${ind.predictability?.days != null ? `${esc(F.num(ind.predictability.days))} dias` : '–'}</b><em>${esc(ind.predictability?.text || '')}</em></div>
        <div><small>Concordância (48 h)</small><b>${F.isNum(ind.agreement) ? esc(F.pct(ind.agreement * 100)) : '–'}</b><em>entre ${esc(fc.models?.length || 0)} modelos</em></div>
        <div><small>Verificação local</small><b>${ver ? ((ver.stations || 1) > 1 ? `${esc(F.num(ver.stations))} estações` : `${esc(F.num(ver.n))} horas`) : 'Ainda não'}</b><em>${esc(ver ? ((ver.stations || 1) > 1 ? `${F.num(ver.n)} comparações · ${ver.days} dia${ver.days === 1 ? '' : 's'} · ~${F.km(ver.distanceKm)}` : `${ver.station} · ${ver.days} dias`) : 'precisa de uma estação perto')}</em></div>
        <div><small>Mais certeiro aqui</small><b>${esc(ver ? (byId[ver.best]?.name || ver.best) : '–')}</b><em>${esc(ver ? 'menor erro recente' : '')}</em></div>
    </div></section>`;
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
        <p class="note">O peso de cada modelo depende da resolução e do erro recente neste local (comparado com as estações perto). A previsão oficial do IPMA (AROME 2,5 km revista por meteorologistas) pesa mais nos primeiros 3 dias.</p></section>`;
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
    return out;
}
function viewSettings() {
    const title = TITLES.ajustes;
    const L = cfg.loc;
    let h = `<section class="sec"><div class="sec-h"><h2>Local</h2></div><div class="form">
        ${L ? `<div class="sw"><span><b>${esc(placeName())}</b><br><small class="hint num">${esc(`${F.num(L.lat, 4)}, ${F.num(L.lon, 4)}${L.gps ? ' · GPS' : ''}`)}</small></span><button type="button" class="btn sm" data-act="place">Mudar</button></div>` : ''}
        ${L && st.fc ? `<ul class="prec" aria-label="Precisão para este ponto">${precisionLines(st.fc).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        <button type="button" class="btn blk" data-act="gps">${ui('gps')}Usar a minha localização exata</button>
        <div><label>Favoritos</label><div class="wl">${cfg.favs.length ? cfg.favs.map((f, i) => `<div class="wl-i"><button type="button" class="wl-go" data-fav="${i}"><b>${esc(f.name)}</b><small class="num">${esc(`${F.num(f.lat, 3)}, ${F.num(f.lon, 3)}`)}</small></button><button type="button" class="xbtn" data-rmfav="${i}" aria-label="${esc('Retirar ' + f.name)}">✕</button></div>`).join('') : '<div class="hint">Ainda sem favoritos.</div>'}</div>
            ${L ? `<button type="button" class="btn sm" data-act="fav" style="margin-top:8px">${ui('star')}${cfg.favs.some((f) => near(f, L)) ? 'Retirar este local' : 'Guardar este local'}</button>` : ''}</div>
    </div></section>`;
    h += `<section class="sec"><div class="sec-h"><h2>Análise diária do Claude</h2><span class="sub">até 5 locais</span></div><div class="form"><div class="wl">${st.places.length ? st.places.map((p) => `<div class="wl-i"><button type="button" class="wl-go" data-goplace="${esc(p.id)}"><b>${esc(p.name)}</b><small class="num">${esc(`${F.num(p.lat, 3)}, ${F.num(p.lon, 3)}`)}</small></button><button type="button" class="xbtn" data-rmplace="${esc(p.id)}" aria-label="${esc('Desligar ' + p.name)}">✕</button></div>`).join('') : '<div class="hint">Nenhum local. Liga-a no separador Análise.</div>'}</div>
        <div class="hint">O Claude escreve a análise às ${esc((st.status?.schedule || SCHEDULE).join(', '))}, com os modelos, as observações e as imagens de satélite.</div></div></section>`;
    const stTxt = st.status ? `Ligado · versão ${esc(st.status.version || '?')} · análise imediata: ${st.status.onDemand ? 'sim' : 'não'}` : st.statusErr ? `Sem resposta: ${esc(st.statusErr)}` : 'A testar…';
    h += `<section class="sec" id="conector"><div class="sec-h"><h2>Conector de dados</h2></div><div class="form"><div><label for="f-proxy">Endereço do teu Worker</label>
        <div class="inl"><input id="f-proxy" class="inp" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="${esc(DEFAULT_PROXY)}" value="${esc(cfg.proxy)}"><button type="button" class="btn pri" data-act="save-proxy">Guardar</button></div>
        <div class="hint" id="f-proxy-msg">${stTxt}. Vazio = ${esc(DEFAULT_PROXY.replace('https://', ''))}. Serve observações METAR, satélite, incêndios, locais e a análise.</div></div></div></section>`;
    h += `<section class="sec"><div class="sec-h"><h2>Preferências</h2></div><div class="form"><div><label>Tamanho da letra</label><div class="seg fs">${[['n', 'Normal'], ['l', 'Grande'], ['xl', 'Muito grande']].map(([v, l]) => `<button type="button" data-fs="${v}" class="${(cfg.fs || 'n') === v ? 'on' : ''}" aria-pressed="${(cfg.fs || 'n') === v}">${l}</button>`).join('')}</div>
        <div class="hint">Segue também o tamanho de texto do iPhone (Definições → Ecrã e brilho → Tamanho do texto).</div></div></div></section>`;
    const S = st.fc?.status;
    if (S) h += `<section class="sec"><div class="sec-h"><h2>Estado das fontes</h2><span class="sub">última atualização</span></div><div class="list">${Object.entries(S).map(([k, v]) => `<div class="row" style="min-height:48px"><span class="r-ico ${v === 'ok' ? 'ok-ico' : 'inc-ico'}">${ui(v === 'ok' ? 'check' : 'alert')}</span><div class="r-main"><div class="r-name">${esc(SRC[k] || k)}</div>${v === 'ok' ? '' : `<div class="r-sub">${esc(v)}</div>`}</div></div>`).join('')}</div></section>`;
    h += `<div class="disc"><b>Meteo ${VERSION}.</b> Modelos e ensembles: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>), com dados do ECMWF, DWD, Météo-France, Met Office, NOAA, ECCC, JMA e CMA. Observações e avisos: IPMA e NOAA AWC (METAR). Incêndios: NASA FIRMS e ANEPC via fogos.pt. Satélite: EUMETSAT. Análise: Claude. Previsão automática: confirma sempre os avisos oficiais do IPMA e da Proteção Civil.</div>`;
    return { title, html: h };
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
        card.innerHTML = `<div class="grab"></div><div class="d-head"><div><h2 id="mt-sheet-title">Escolher local</h2><div class="d-sub">A previsão é calculada para o ponto exato que escolheres.</div></div>${closeBtn}</div>
            <button type="button" class="btn pri blk" data-act="gps">${ui('gps')}Usar a minha localização exata</button>
            <div style="margin-top:12px"><label class="sr-only" for="f-q">Pesquisar local</label><input id="f-q" class="inp" type="search" placeholder="Cidade, vila ou freguesia" autocomplete="off" autocapitalize="words" enterkeyhint="search"><div class="res" id="f-res" aria-live="polite"></div></div>
            ${cfg.favs.length ? `<div class="grp-h" style="margin-top:18px">Favoritos</div><div class="wl">${cfg.favs.map((f, i) => `<div class="wl-i"><button type="button" class="wl-go" data-fav="${i}"><b>${esc(f.name)}</b><small class="num">${esc(`${F.num(f.lat, 3)}, ${F.num(f.lon, 3)}`)}</small></button></div>`).join('')}</div>` : ''}
            ${st.places.length ? `<div class="grp-h" style="margin-top:18px">Com análise diária</div><div class="wl">${st.places.map((p) => `<div class="wl-i"><button type="button" class="wl-go" data-goplace="${esc(p.id)}"><b>${esc(p.name)}</b><small class="num">${esc(`${F.num(p.lat, 3)}, ${F.num(p.lon, 3)}`)}</small></button></div>`).join('')}</div>` : ''}`;
        return;
    }
    if (s.kind === 'off') {
        const p = st.places.find((x) => x.id === s.arg?.id);
        if (!p) { closeSheet(); return; }
        const sched = st.status?.schedule || SCHEDULE;
        card.innerHTML = `<div class="grab"></div><div class="d-head"><div><h2 id="mt-sheet-title">Desligar a análise diária de ${esc(p.name)}?</h2>
            <div class="d-sub">A análise atual fica guardada.</div></div>${closeBtn}</div>
            <p class="note" style="margin:0 2px 14px">O Claude deixa de analisar este local às ${esc(sched.join(', '))}. Se voltares a ligar, aparece outra vez a última análise.</p>
            <div class="btns-col"><button type="button" class="btn blk danger" data-act="off-yes">Desligar</button><button type="button" class="btn blk" data-act="close">Cancelar</button></div>`;
        return;
    }
    if (s.kind === 'day') {
        const fc = st.fc, d = fc?.daily?.[s.arg];
        if (!d) { closeSheet(); return; }
        const today = todayOf(fc);
        const pr = (a, b) => (F.isNum(a) && F.isNum(b) ? `80% entre ${F.num(a, 1)} e ${F.num(b, 1)}°` : '');
        const hours = (fc.hourly || []).filter((x) => x.time.slice(0, 10) === d.date);
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
            <div class="d-big">${weatherIcon(d.code, true, 64)}<div><b class="num">${esc(F.deg(d.tmax))} / ${esc(F.deg(d.tmin))}</b><br><span>máxima e mínima</span></div></div>
            <div class="stats">${stats.map(([k, v, e]) => `<div><small>${esc(k)}</small><b class="num">${esc(v)}</b>${e ? `<em>${esc(e)}</em>` : ''}</div>`).join('')}</div>
            ${hours.length ? `<div class="sec-h"><h2>Hora a hora</h2><span class="sub">toca numa hora</span></div><div class="box"><div id="d-chart" class="chart"></div></div>` : '<p class="note">O detalhe hora a hora existe para as próximas 72 horas. Para este dia, os valores vêm da distribuição dos cenários.</p>'}`;
        if (hours.length) renderHourly($('#d-chart'), hours, { todayIso: today });
    }
}
// puxar a folha para baixo para fechar (como na Mercados)
(function swipeToClose() {
    const c = $('#mt-sheet-card'), bg = $('.mt-sheet-bg');
    let y0 = null, dy = 0, t0 = 0, drag = false;
    c.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1 || e.target.closest('.chart-scroll, input')) { y0 = null; return; }
        y0 = e.touches[0].clientY; dy = 0; t0 = Date.now(); drag = false;
    }, { passive: true });
    c.addEventListener('touchmove', (e) => {
        if (y0 == null) return;
        dy = e.touches[0].clientY - y0;
        if (!drag) {
            if (dy > 6 && c.scrollTop <= 0) drag = true;
            else if (dy < -6 || c.scrollTop > 0) { y0 = null; return; }
            else return;
        }
        e.preventDefault();
        const d = Math.max(0, dy);
        c.style.transition = 'none'; c.style.transform = `translateY(${d}px)`;
        bg.style.transition = 'none'; bg.style.opacity = String(Math.max(0.15, 1 - d / 500));
    }, { passive: false });
    const end = () => {
        if (y0 == null) return;
        const was = drag; y0 = null; drag = false;
        if (!was) return;
        const v = dy / Math.max(1, Date.now() - t0);
        if (dy > 110 || (dy > 30 && v > 0.5)) { closeSheet(true); return; }
        c.style.transition = 'transform .2s ease-out'; c.style.transform = '';
        bg.style.transition = 'opacity .2s'; bg.style.opacity = '';
    };
    c.addEventListener('touchend', end);
    c.addEventListener('touchcancel', end);
})();

// puxar para baixo no topo da página → atualizar
(() => {
    const ptr = $('#mt-ptr'), body = $('#mt-body'), TH = 70;
    let y0 = null, x0 = 0, dy = 0, busy = false;
    const set = (h, txt) => { ptr.style.height = h + 'px'; ptr.firstChild.textContent = txt; body.style.transform = h ? `translateY(${h}px)` : ''; };
    document.addEventListener('touchstart', (e) => {
        if (busy || window.scrollY > 0 || !$('#mt-sheet').hidden || e.target.closest('input, .chart-scroll, .chips')) { y0 = null; return; }
        y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dy = 0;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (y0 == null) return;
        const my = e.touches[0].clientY - y0, mx = e.touches[0].clientX - x0;
        if (my <= 0 || Math.abs(mx) > my) { if (st.pulling) { st.pulling = false; set(0, ''); } return; }
        st.pulling = true; dy = Math.min(120, my * 0.5);
        body.style.transition = 'none'; ptr.style.transition = 'none';
        set(dy, dy > TH * 0.7 ? 'Larga para atualizar' : 'Puxa para atualizar');
    }, { passive: true });
    document.addEventListener('touchend', () => {
        if (y0 == null) return;
        y0 = null;
        if (!st.pulling) return;
        body.style.transition = ''; ptr.style.transition = '';
        if (dy > TH * 0.7 && cfg.loc) {
            busy = true; set(44, 'A atualizar…');
            Promise.all([refresh(), loadStatus()]).finally(() => { busy = false; st.pulling = false; set(0, ''); scheduleRender(); });
        } else { st.pulling = false; set(0, ''); }
    }, { passive: true });
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
    try {
        if (on && !nearPlace()) {
            const p = await api.addPlace(placeName(), cfg.loc.lat, cfg.loc.lon);
            if (p) st.places = [...st.places.filter((x) => x.id !== p.id), p];
            toast(`Ligada. A primeira análise chega ${nextRun()}.`);
        } else if (!on) {
            const p = nearPlace();
            if (p) { openSheet('off', { id: p.id }); return; }
            toast('A análise diária já está desligada para este local.');
        }
    } catch (e) { toast(e.message); }
    render();
}
// desligar só depois de confirmar (folha); a análise fica guardada no conector e "Desfazer" volta a ligar o mesmo local
async function placeOff(id) {
    const p = st.places.find((x) => x.id === id);
    closeSheet(true);
    if (!p) return;
    try {
        await api.deletePlace(p.id);
        st.places = st.places.filter((x) => x.id !== p.id);
        render();
        toast(`Análise diária desligada para ${p.name}.`, () => placeBack(p));
    } catch (e) { toast(e.message); }
}
async function placeBack(p) {
    try {
        const n = await api.addPlace(p.name, p.lat, p.lon);
        if (n) st.places = [...st.places.filter((x) => x.id !== n.id), n];
        render();
        toast(`Análise diária de ${p.name} ligada de novo.`);
        if (cfg.loc) loadAnalysis(cfg.loc);
    } catch (e) { toast(e.message); }
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
async function analyzeNow() {
    if (!st.fc || st.analyzing) return;
    st.analyzing = true; render();
    try {
        const analysis = await requestAnalysis(st.fc);
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
    const t = ev.target.closest('[data-act],[data-tab],[data-day],[data-layer],[data-km],[data-fs],[data-pick],[data-fav],[data-rmfav],[data-goplace],[data-rmplace]');
    if (!t) return;
    const d = t.dataset;
    if (d.tab) { cfg.tab = d.tab; saveCfg(); closeSheet(); window.scrollTo(0, 0); render(); if (d.tab === 'ajustes') loadStatus(); return; }
    if (d.day != null) { openSheet('day', +d.day); return; }
    if (d.layer) { cfg.layer = d.layer; saveCfg(); render(); return; }
    if (d.km) { cfg.km = +d.km; saveCfg(); render(); return; }
    if (d.fs) { cfg.fs = d.fs; saveCfg(); applyFs(); render(); return; }
    if (d.pick != null) { const r = lastRes[+d.pick]; if (r) { closeSheet(); setLocation({ lat: r.lat, lon: r.lon, name: r.name }); } return; }
    if (d.fav != null) { const f = cfg.favs[+d.fav]; if (f) { closeSheet(); setLocation(f); } return; }
    if (d.rmfav != null) { const f = cfg.favs[+d.rmfav]; cfg.favs.splice(+d.rmfav, 1); saveCfg(); render(); if (f) toast(`${f.name} retirado dos favoritos`); return; }
    if (d.goplace) { const p = st.places.find((x) => x.id === d.goplace); if (p) { closeSheet(); setLocation({ lat: p.lat, lon: p.lon, name: p.name }); } return; }
    if (d.rmplace) { if (st.places.some((x) => x.id === d.rmplace)) openSheet('off', { id: d.rmplace }); return; }
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
        case 'save-proxy': saveProxy(); break;
        case 'fav': {
            const i = cfg.favs.findIndex((f) => near(f, cfg.loc));
            if (i >= 0) { cfg.favs.splice(i, 1); toast('Retirado dos favoritos'); }
            else { cfg.favs.unshift({ lat: cfg.loc.lat, lon: cfg.loc.lon, name: placeName() }); cfg.favs = cfg.favs.slice(0, 10); toast('Guardado nos favoritos'); }
            saveCfg(); render(); break;
        }
        case 'install': { const e = st.installEvt; st.installEvt = null; render(); e?.prompt(); break; }
        case 'no-install': cfg.noInstall = true; st.installEvt = null; st.iosHint = false; saveCfg(); render(); break;
        default: break;
    }
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
window.__mt = { cfg, st, render };
init();
