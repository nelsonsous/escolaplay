// Meteo Preciso — interface (PWA). A previsão é calculada no telemóvel por ./lib/data.js.
import { loadForecast, requestAnalysis } from './lib/data.js';
import * as api from './api.js';
import * as F from './format.js';
import { weatherIcon, ui } from './icons.js';
import { renderHourly, renderNowcast } from './charts.js';

const VERSION = '1.0.0';
const SCHEDULE = ['07:12', '13:12', '19:42'];
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
const IND = {
  rain: ['rain', 'Chuva'], wind: ['wind', 'Vento'], thunder: ['bolt', 'Trovoada'], fog: ['fog', 'Nevoeiro'],
  frost: ['frost', 'Geada'], heat: ['heat', 'Calor'], snow: ['snow', 'Neve'], uv: ['sun', 'UV'],
};

const state = {
  loc: null, fc: null, savedAt: 0, offline: false, loading: false, lastFetch: 0, error: '',
  analysis: undefined, places: [], status: null,
  layer: api.store.get('layer', 'geocolour'), km: api.store.get('km', 600),
  installEvt: null, iosHint: false, updateReady: false,
};

// ---------- utilitários DOM ----------
const $ = (s, r = document) => r.querySelector(s);
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v; // só marcação interna (ícones)
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false || c === '') continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
const svg = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const sectionHead = (iconName, title, extra) => h('div', { class: 'card-head' }, h('h2', { class: 'card-title' }, svg(ui(iconName)), title), extra);
function guard(name, fn) {
  try { fn(); } catch (e) {
    console.error(`[meteo] secção ${name}:`, e);
    const el = document.getElementById(name);
    if (el) { el.hidden = false; el.replaceChildren(h('p', { class: 'muted' }, 'Esta secção não pôde ser mostrada.')); }
  }
}
function haversineKm(a, b, c, d) {
  const R = 6371, rad = Math.PI / 180;
  const x = Math.sin(((c - a) * rad) / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('show'); setTimeout(() => { t.hidden = true; }, 300); }, 4500);
}
const todayOf = (fc) => fc?.now?.time?.slice(0, 10) || fc?.daily?.[0]?.date || '';
const localGen = (fc) => F.localFromUtc(fc.generatedAt, fc.location?.utcOffsetSeconds);

// ---------- arranque ----------
function init() {
  registerSW();
  setupInstall();
  bindUI();
  const last = api.store.get('last');
  if (last && F.isNum(last.lat) && F.isNum(last.lon)) setLocation(last, { save: false });
  else renderWelcome();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.loc && Date.now() - state.lastFetch > REFRESH_MIN * 60e3) refresh();
  });
  window.addEventListener('online', () => { if (state.offline) refresh(); });
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('/sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) { state.updateReady = true; renderBanners(); } });
}

function setupInstall() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone || api.store.get('install-dismissed')) return;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); state.installEvt = e; renderBanners(); });
  const ua = navigator.userAgent;
  state.iosHint = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function bindUI() {
  $('#loc-btn').addEventListener('click', openDialog);
  $('#gps-btn').addEventListener('click', locate);
  $('#refresh-btn').addEventListener('click', () => (state.loc ? refresh() : openDialog()));
  const dlg = $('#loc-dialog');
  $('#dlg-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  $('#dlg-gps').addEventListener('click', () => { dlg.close(); locate(); });
  let timer;
  $('#dlg-q').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => search(e.target.value), 300); });
  $('#dlg-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); search(e.target.value); } });
  $('#dlg-fav-add').addEventListener('click', toggleFavourite);
}

// ---------- local ----------
function setLocation(loc, { save = true } = {}) {
  state.loc = { lat: api.r4(loc.lat), lon: api.r4(loc.lon), name: loc.name || null, gps: !!loc.gps, acc: loc.acc ?? null };
  if (save) api.store.set('last', state.loc);
  state.analysis = undefined;
  state.offline = false;
  state.error = '';
  const saved = api.loadSavedForecast(state.loc.lat, state.loc.lon);
  if (saved?.fc) { state.fc = saved.fc; state.savedAt = saved.savedAt; renderAll(); }
  else { state.fc = null; renderSkeleton(); }
  updateHeader();
  refresh();
}

function locate() {
  if (!('geolocation' in navigator)) { toast('Este dispositivo não permite obter a localização. Pesquisa o local.'); openDialog(); return; }
  const btn = $('#gps-btn');
  btn.classList.add('is-busy');
  btn.setAttribute('aria-busy', 'true');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      btn.classList.remove('is-busy'); btn.removeAttribute('aria-busy');
      const { latitude, longitude, accuracy } = pos.coords;
      setLocation({ lat: latitude, lon: longitude, gps: true, acc: Math.round(accuracy) });
    },
    (err) => {
      btn.classList.remove('is-busy'); btn.removeAttribute('aria-busy');
      toast(err.code === 1
        ? 'Sem autorização para usar a localização. Ativa-a nas definições ou pesquisa o local.'
        : 'Não foi possível obter a localização. Tenta de novo ou pesquisa o local.');
      if (!state.loc) openDialog();
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
  );
}

function updateHeader() {
  const name = state.loc?.name || state.fc?.location?.name || (state.loc ? 'Local atual' : 'Escolher local');
  $('#loc-name').textContent = name;
  const L = state.fc?.location;
  let sub = '';
  if (state.loc) {
    sub = `${F.num(state.loc.lat, 4)}, ${F.num(state.loc.lon, 4)}`;
    if (F.isNum(L?.elevation)) sub += ` · ${F.num(L.elevation)} m`;
    if (state.loc.gps && F.isNum(state.loc.acc)) sub += ` · GPS ±${F.num(state.loc.acc)} m`;
  }
  $('#loc-sub').textContent = sub;
  document.title = state.loc ? `${name} · Meteo Preciso` : 'Meteo Preciso';
}

// ---------- dados ----------
async function refresh() {
  if (!state.loc || state.loading) return;
  const loc = state.loc;
  state.loading = true;
  document.body.classList.add('is-refreshing');
  $('#refresh-btn').classList.add('is-busy');
  const analysisP = loadAnalysis(loc);
  try {
    const fc = await loadForecast({ lat: loc.lat, lon: loc.lon, name: loc.name || undefined });
    if (state.loc !== loc) return; // o utilizador mudou de local entretanto
    state.fc = fc;
    state.savedAt = Date.now();
    state.lastFetch = Date.now();
    state.offline = false;
    state.error = '';
    api.saveForecast(loc.lat, loc.lon, fc);
    renderAll();
  } catch (e) {
    if (state.loc !== loc) return;
    state.error = e?.message || 'Não foi possível obter a previsão.';
    if (state.fc) { state.offline = true; renderBanners(); toast(state.error); }
    else renderError(state.error);
  } finally {
    if (state.loc === loc) {
      state.loading = false;
      document.body.classList.remove('is-refreshing');
      $('#refresh-btn').classList.remove('is-busy');
    }
  }
  await analysisP;
}

async function loadAnalysis(loc) {
  const [a, p, s] = await Promise.allSettled([api.getAnalysis(loc.lat, loc.lon), api.getPlaces(), api.getStatus()]);
  if (state.loc !== loc) return;
  const key = `an:${loc.lat},${loc.lon}`;
  if (a.status === 'fulfilled' && a.value?.data && !a.value.offline) {
    state.analysis = a.value.data;
    api.store.set(key, { savedAt: Date.now(), data: a.value.data });
  } else if (a.status === 'fulfilled' && a.value?.data) {
    state.analysis = a.value.data;
  } else {
    // sem rede: mostra a última análise guardada neste telemóvel, com a idade certa
    const saved = api.store.get(key);
    state.analysis = saved?.data
      ? { ...saved.data, ageMin: (saved.data.ageMin ?? 0) + (Date.now() - saved.savedAt) / 60e3 }
      : { error: a.reason?.code === 'rede' || a.reason?.status === 503 ? 'sem ligação; aparece quando voltares a ter rede.' : (a.reason?.message || 'análise indisponível.') };
  }
  if (p.status === 'fulfilled') state.places = p.value || [];
  if (s.status === 'fulfilled') state.status = s.value;
  if (state.fc) guard('analysis', renderAnalysis);
}

// ---------- render ----------
function show(id, on = true) { const el = document.getElementById(id); if (el) el.hidden = !on; return el; }
const SECTIONS = ['analysis', 'alerts', 'nowcast', 'hourly', 'indicators', 'daily', 'fire', 'models'];

function renderWelcome() {
  document.body.classList.add('is-empty');
  SECTIONS.forEach((s) => show(s, false));
  const hero = $('#hero');
  hero.className = 'hero hero--welcome';
  hero.replaceChildren(
    h('div', { class: 'welcome' },
      svg(weatherIcon(2, true, 72)),
      h('h1', { class: 'welcome-title' }, 'Previsão para o sítio exato onde estás'),
      h('p', { class: 'welcome-text' }, 'Combina 9 modelos meteorológicos, mais de 200 cenários de ensemble e observações reais, com análise do Claude.'),
      h('div', { class: 'welcome-actions' },
        h('button', { class: 'btn btn-light', type: 'button', onclick: locate, html: `${ui('gps')}<span>Usar a minha localização</span>` }),
        h('button', { class: 'btn btn-outline-light', type: 'button', onclick: openDialog, html: `${ui('search')}<span>Pesquisar local</span>` }),
      ),
    ),
  );
  renderFooter(null);
  renderBanners();
}

function renderSkeleton() {
  document.body.classList.remove('is-empty');
  SECTIONS.forEach((s) => show(s, false));
  const hero = $('#hero');
  hero.className = 'hero hero--loading';
  hero.replaceChildren(h('div', { class: 'skel-hero', 'aria-label': 'A calcular a previsão…', role: 'status' },
    h('span', { class: 'sk sk-a' }), h('span', { class: 'sk sk-b' }), h('span', { class: 'sk sk-c' }), h('span', { class: 'sk sk-d' }),
    h('p', { class: 'skel-note' }, 'A combinar os modelos para este local…')));
  for (const id of ['analysis', 'hourly']) {
    const el = show(id, true);
    el.replaceChildren(h('div', { class: 'skel-card', 'aria-hidden': 'true' }, h('span', { class: 'sk sk-t' }), h('span', { class: 'sk sk-l' }), h('span', { class: 'sk sk-l' }), h('span', { class: 'sk sk-l short' })));
  }
  renderBanners();
}

function renderError(msg) {
  SECTIONS.forEach((s) => show(s, false));
  const hero = $('#hero');
  hero.className = 'hero hero--error';
  hero.replaceChildren(h('div', { class: 'welcome' },
    svg(ui('alert', 'i-xl')),
    h('h1', { class: 'welcome-title' }, 'Sem previsão de momento'),
    h('p', { class: 'welcome-text' }, msg),
    h('div', { class: 'welcome-actions' },
      h('button', { class: 'btn btn-light', type: 'button', onclick: () => refresh(), html: `${ui('refresh')}<span>Tentar de novo</span>` }),
      h('button', { class: 'btn btn-outline-light', type: 'button', onclick: openDialog, html: `${ui('search')}<span>Outro local</span>` }))));
}

function renderAll() {
  const fc = state.fc;
  if (!fc) return;
  document.body.classList.remove('is-empty');
  updateHeader();
  guard('banners', renderBanners);
  guard('hero', () => renderHero(fc));
  guard('analysis', renderAnalysis);
  guard('alerts', () => renderAlerts(fc));
  guard('nowcast', () => renderNowcastCard(fc));
  guard('hourly', () => renderHourlyCard(fc));
  guard('indicators', () => renderIndicators(fc));
  guard('daily', () => renderDaily(fc));
  guard('fire', () => renderFire(fc));
  guard('models', () => renderModels(fc));
  guard('footer', () => renderFooter(fc));
}

// ----- avisos de topo (offline, instalar, versão nova) -----
function renderBanners() {
  const box = $('#banners');
  box.replaceChildren();
  if (state.updateReady) {
    box.append(h('div', { class: 'banner banner--info' }, svg(ui('refresh')), h('span', {}, 'Há uma versão nova da app.'),
      h('button', { class: 'btn btn-small', type: 'button', onclick: () => location.reload() }, 'Atualizar')));
  }
  if (state.offline && state.fc) {
    const g = localGen(state.fc);
    const today = todayOf(state.fc);
    const when = g ? `${F.dayDiff(g.slice(0, 10), today) === 0 ? '' : F.dayLabel(g.slice(0, 10), today).toLowerCase() + ' '}${F.hhmm(g)}` : '';
    box.append(h('div', { class: 'banner banner--warn', role: 'status' }, svg(ui('alert')),
      h('span', {}, `Sem ligação — a mostrar dados de ${when || 'antes'}.`),
      h('button', { class: 'btn btn-small', type: 'button', onclick: () => refresh() }, 'Tentar')));
  }
  const dismiss = () => { api.store.set('install-dismissed', true); state.installEvt = null; state.iosHint = false; renderBanners(); };
  if (state.installEvt) {
    box.append(h('div', { class: 'banner banner--install' }, svg(ui('install')), h('span', {}, 'Instala a Meteo no ecrã inicial e abre-a como uma app.'),
      h('button', { class: 'btn btn-small btn-primary', type: 'button', onclick: async () => { const e = state.installEvt; state.installEvt = null; renderBanners(); e.prompt(); try { await e.userChoice; } catch { /* */ } } }, 'Instalar'),
      h('button', { class: 'icon-btn icon-btn--small', type: 'button', 'aria-label': 'Fechar', onclick: dismiss, html: ui('close') })));
  } else if (state.iosHint) {
    box.append(h('div', { class: 'banner banner--install' }, svg(ui('install')),
      h('span', {}, 'Para instalar: toca em ', h('span', { class: 'inline-ico', html: ui('share', '', 'Partilhar') }), ' Partilhar e depois em «Adicionar ao ecrã principal».'),
      h('button', { class: 'icon-btn icon-btn--small', type: 'button', 'aria-label': 'Fechar', onclick: dismiss, html: ui('close') })));
  }
}

// ----- destaque "agora" -----
function heroTheme(code, isDay) {
  const g = F.wxGroup(code);
  const wet = ['drizzle', 'rain', 'showers', 'freezing'].includes(g) ? 'rain' : ['snow', 'snowshowers'].includes(g) ? 'snow' : g === 'storm' ? 'storm' : g === 'fog' ? 'fog' : ['clear', 'mostly'].includes(g) ? 'clear' : 'cloudy';
  return `hero--${wet}${isDay === false ? ' hero--night' : ''}`;
}

function renderHero(fc) {
  const n = fc.now || {}, d0 = fc.daily?.[0] || {};
  const hero = $('#hero');
  hero.className = `hero ${heroTheme(n.code, n.isDay)}`;
  const t = F.num(n.temp, 1);
  const [ti, td] = t.split(',');
  const conf = d0.confidence;
  const top = h('div', { class: 'hero-top' },
    h('div', { class: 'hero-temp', 'aria-label': `Temperatura agora ${F.deg(n.temp, 1)}` },
      h('span', { class: 't-int', 'aria-hidden': 'true' }, ti), td != null ? h('span', { class: 't-dec', 'aria-hidden': 'true' }, `,${td}`) : null, h('span', { class: 't-deg', 'aria-hidden': 'true' }, '°')),
    h('div', { class: 'hero-icon', html: weatherIcon(n.code, n.isDay, 96, F.wxText(n.code)) }));
  const meta = h('p', { class: 'hero-meta' },
    h('span', {}, `Sensação ${F.deg(n.feels)}`), h('span', {}, `Máx. ${F.deg(d0.tmax)}`), h('span', {}, `Mín. ${F.deg(d0.tmin)}`));
  const lines = h('div', { class: 'hero-lines' });
  if (fc.nowcast?.text) lines.append(h('p', { class: 'hero-line' }, svg(ui('drop')), h('span', {}, fc.nowcast.text)));
  const o = n.obs;
  if (o && F.isNum(o.temp)) {
    lines.append(h('p', { class: 'hero-line' }, svg(ui('station')),
      h('span', {}, `Observado ${F.deg(o.temp, 1)} em ${o.station}`, h('span', { class: 'hero-dim' }, ` · ${F.km(o.distanceKm)} · ${F.ago(o.ageMin)} (${o.source})`))));
  }
  const c = n.correction;
  if (c && F.isNum(c.temp) && Math.abs(c.temp) >= 0.1) {
    lines.append(h('p', { class: 'hero-line hero-dim' }, svg(ui('target')),
      h('span', {}, `Previsão ajustada ${F.signed(c.temp, 1)}° com esta observação nas próximas ${c.decayHours ?? 6} h.`)));
  }
  hero.replaceChildren(
    h('div', { class: 'hero-head' },
      h('p', { class: 'hero-cond' }, F.wxText(n.code)),
      conf ? h('span', { class: `badge badge--${conf}`, html: `${ui(conf === 'alta' ? 'signal3' : conf === 'media' ? 'signal2' : 'signal1')}<span>${F.CONF[conf] || ''}</span>` }) : null),
    top, meta, lines);
}

// ----- análise do Claude -----
function nextRun() {
  const sched = state.analysis?.schedule || state.status?.schedule || SCHEDULE;
  const d = new Date();
  const now = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const next = sched.find((s) => s > now);
  return next ? `hoje às ${next}` : `amanhã às ${sched[0]}`;
}
const nearPlace = () => (state.loc ? state.places.find((p) => haversineKm(p.lat, p.lon, state.loc.lat, state.loc.lon) <= 2) : null);

function renderAnalysis() {
  const card = show('analysis', true);
  const resp = state.analysis;
  const sched = resp?.schedule || state.status?.schedule || SCHEDULE;
  const onDemand = !!(resp?.onDemand ?? state.status?.onDemand);
  const a = resp?.analysis;
  const head = sectionHead('sparkle', 'Análise do Claude',
    a ? h('span', { class: 'chip chip--muted' }, F.ago(resp.ageMin ?? 0)) : null);
  card.classList.toggle('card--analysis', true);
  if (resp === undefined) {
    card.replaceChildren(head, h('div', { class: 'skel-card', 'aria-hidden': 'true' }, h('span', { class: 'sk sk-l' }), h('span', { class: 'sk sk-l' }), h('span', { class: 'sk sk-l short' })));
    return;
  }
  const body = [];
  if (a) {
    body.push(h('h3', { class: 'an-title' }, a.titulo || ''));
    if (a.resumo) body.push(h('p', { class: 'an-text' }, a.resumo));
    if (a.alertas?.length) {
      body.push(h('ul', { class: 'chips', 'aria-label': 'Alertas do Claude' }, a.alertas.map((al) =>
        h('li', { class: `chip chip--${al.nivel || 'info'}` }, h('span', { class: 'chip-dot', 'aria-hidden': 'true' }),
          h('span', {}, h('b', {}, cap1(al.tipo)), al.quando ? ` · ${al.quando}` : '', al.texto ? h('span', { class: 'chip-text' }, al.texto) : null)))));
    }
    const det = h('details', { class: 'an-more' }, h('summary', {}, 'Ver análise completa'));
    const sec = (title, text) => (text ? det.append(h('section', { class: 'an-sec' }, h('h4', {}, title), h('p', {}, text))) : null);
    sec('Próximas horas', a.agora);
    sec('Hoje', a.hoje);
    sec('Amanhã', a.amanha);
    if (a.dias?.length) {
      const today = todayOf(state.fc);
      det.append(h('section', { class: 'an-sec' }, h('h4', {}, 'Próximos dias'),
        h('ul', { class: 'an-days' }, a.dias.map((d) => h('li', {},
          h('b', {}, F.dayLabel(d.data, today)),
          h('span', { class: `conf-tag conf-tag--${d.confianca}`, html: `${ui(d.confianca === 'alta' ? 'signal3' : d.confianca === 'media' ? 'signal2' : 'signal1')}<span class="sr-only">${F.CONF[d.confianca] || ''}</span>` }),
          h('span', {}, d.texto))))));
    }
    sec('Tendência (dias 7 a 15)', a.tendencia);
    sec('Incêndios', a.incendios);
    sec('O que mostra o satélite', a.satelite);
    if (a.conselhos?.length) det.append(h('section', { class: 'an-sec' }, h('h4', {}, 'Conselhos'), h('ul', { class: 'an-list' }, a.conselhos.map((c) => h('li', {}, c)))));
    if (a.fiabilidade) {
      const fi = a.fiabilidade;
      det.append(h('section', { class: 'an-sec' }, h('h4', {}, 'Fiabilidade'),
        h('p', { class: 'an-rel' }, h('span', { class: `conf-pill conf-pill--${fi.curto}` }, `Curto prazo: ${fi.curto === 'media' ? 'média' : fi.curto}`), ' ',
          h('span', { class: `conf-pill conf-pill--${fi.medio}` }, `Médio prazo: ${fi.medio === 'media' ? 'média' : fi.medio}`)),
        fi.texto ? h('p', {}, fi.texto) : null));
    }
    sec('Análise técnica', a.tecnica);
    sec('Como correu a previsão anterior', a.verificacao);
    body.push(det);
    const g = a.generatedAt ? new Date(a.generatedAt) : null;
    const hm = g && !Number.isNaN(+g) ? `${String(g.getHours()).padStart(2, '0')}:${String(g.getMinutes()).padStart(2, '0')}` : '';
    const who = a.by === 'claude-api' ? 'a pedido' : 'agendada';
    const place = resp.place && F.isNum(resp.place.distanceKm) && resp.place.distanceKm > 0.5 ? ` para ${resp.place.name} (a ${F.km(resp.place.distanceKm)})` : '';
    body.push(h('p', { class: 'an-foot' }, `Análise ${who}${hm ? ` das ${hm}` : ''}${place} · próxima ${nextRun()}.`));
  } else {
    body.push(h('p', { class: 'an-empty' }, resp?.error
      ? `Não foi possível obter a análise: ${resp.error}`
      : `Ainda não há análise do Claude para este local. Ativa a análise diária: o Claude junta os modelos, as observações e as imagens de satélite às ${sched.slice(0, -1).join(', ')} e ${sched.at(-1)}.`));
  }
  // interruptor da análise diária
  const near = nearPlace();
  const input = h('input', { type: 'checkbox', role: 'switch', class: 'switch', 'aria-describedby': 'sw-desc' });
  input.checked = !!near;
  input.addEventListener('change', () => togglePlace(input.checked, input));
  body.push(h('label', { class: 'switch-row' },
    h('span', {}, h('b', {}, 'Análise diária do Claude para este local'),
      h('span', { id: 'sw-desc', class: 'switch-desc' }, near ? `Ativa (${near.name}) · ${sched.join(' · ')}` : `Às ${sched.join(', ')}`)),
    input));
  if (onDemand) {
    const btn = h('button', { class: 'btn btn-primary btn-block', type: 'button', html: `${ui('sparkle')}<span>Analisar agora</span>` });
    btn.addEventListener('click', () => analyzeNow(btn));
    body.push(btn);
  }
  card.replaceChildren(head, ...body);
}
const cap1 = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

async function togglePlace(on, input) {
  input.disabled = true;
  try {
    if (on) {
      const name = state.loc.name || state.fc?.location?.name || 'Local';
      const place = await api.addPlace(name, state.loc.lat, state.loc.lon);
      if (place) state.places = [...state.places.filter((p) => p.id !== place.id), place];
      toast(`Ativado. A primeira análise chega ${nextRun()}.`);
    } else {
      const p = nearPlace();
      if (p) { await api.deletePlace(p.id); state.places = state.places.filter((x) => x.id !== p.id); }
      toast('Análise diária desativada para este local.');
    }
  } catch (e) {
    input.checked = !on;
    toast(e.message);
  } finally {
    input.disabled = false;
    renderAnalysis();
  }
}

async function analyzeNow(btn) {
  btn.disabled = true;
  btn.replaceChildren(svg(ui('sparkle', 'spin')), h('span', {}, 'A analisar… pode demorar até 1 minuto'));
  try {
    const analysis = await requestAnalysis(state.fc);
    state.analysis = { ...(state.analysis || {}), analysis, ageMin: 0 };
    renderAnalysis();
  } catch (e) {
    toast(e?.message || 'Não foi possível fazer a análise agora.');
    btn.disabled = false;
    btn.replaceChildren(svg(ui('sparkle')), h('span', {}, 'Analisar agora'));
  }
}

// ----- avisos oficiais + indicadores ativos -----
function renderAlerts(fc) {
  const box = $('#alerts');
  const today = todayOf(fc);
  const items = [];
  for (const w of fc.warnings || []) {
    items.push(h('div', { class: `warn warn--${w.level}`, role: 'note' },
      h('span', { class: 'warn-ico', html: ui('alert') }),
      h('div', { class: 'warn-body' },
        h('p', { class: 'warn-title' }, h('b', {}, w.type), ` · Aviso ${(F.WARN[w.level] || w.level || '').toLowerCase()}`),
        h('p', { class: 'warn-when' }, `${F.period(w.start, w.end, today)} · ${w.source || 'IPMA'}`),
        w.text ? h('p', { class: 'warn-text' }, w.text) : null)));
  }
  const ind = fc.indicators || {};
  const act = Object.keys(IND).filter((k) => (ind[k]?.level || 0) > 0).sort((a, b) => ind[b].level - ind[a].level);
  if (act.length) {
    items.push(h('ul', { class: 'chips', 'aria-label': 'Riscos previstos' }, act.map((k) => {
      const it = ind[k];
      return h('li', { class: `chip chip--lvl${it.level}` }, h('span', { class: 'chip-ico', html: ui(IND[k][0]) }),
        h('span', {}, h('b', {}, IND[k][1]), ` · ${it.label || F.LEVELS[it.level]}${it.peak ? ` · ${F.whenShort(it.peak, today)}` : ''}`));
    })));
  }
  box.hidden = !items.length;
  box.replaceChildren(...items);
}

// ----- próximas 2 horas -----
function renderNowcastCard(fc) {
  const card = show('nowcast', !!fc.nowcast?.steps?.length);
  if (card.hidden) return;
  const chart = h('div', { class: 'nowcast-chart' });
  card.replaceChildren(sectionHead('rain', 'Próximas 2 horas'), h('p', { class: 'lead' }, fc.nowcast.text || ''), chart);
  renderNowcast(chart, fc.nowcast);
}

// ----- 72 horas -----
function renderHourlyCard(fc) {
  const card = show('hourly', !!fc.hourly?.length);
  if (card.hidden) return;
  const chart = h('div', { class: 'chart' });
  card.replaceChildren(sectionHead('clock', `Próximas ${Math.min(72, fc.hourly.length)} horas`), chart);
  renderHourly(chart, fc.hourly, { todayIso: todayOf(fc) });
}

// ----- indicadores -----
function renderIndicators(fc) {
  const card = show('indicators', true);
  const n = fc.now || {}, d0 = fc.daily?.[0] || {}, ind = fc.indicators || {}, H = fc.hourly || [];
  const today = todayOf(fc);
  const tile = (iconName, label, value, sub, extra = {}) => h('div', { class: `tile${extra.cls ? ' ' + extra.cls : ''}` },
    h('div', { class: 'tile-top' }, extra.iconEl || svg(ui(iconName)), h('span', { class: 'tile-label' }, label)),
    h('div', { class: 'tile-val' }, value),
    sub ? h('div', { class: 'tile-sub' }, sub) : null,
    extra.after || null);
  const lvlTile = (key, iconName, label) => {
    const it = ind[key] || { level: 0 };
    const lv = it.level || 0;
    const meter = h('div', { class: `meter meter--${F.levelClass(lv)}`, role: 'img', 'aria-label': `${label}: risco ${it.label || F.LEVELS[lv]} (${lv} de 4)` },
      [1, 2, 3, 4].map((k) => h('i', { class: k <= lv ? 'on' : '' })));
    return tile(iconName, label, cap1(it.label || F.LEVELS[lv]), [it.text, it.peak ? F.whenShort(it.peak, today) : ''].filter(Boolean).join(' · ') || 'Sem risco previsto', { cls: `tile--lvl tile--${F.levelClass(lv)}`, after: meter });
  };
  const rain24 = H.slice(0, 24).reduce((s, x) => s + (x.precip || 0), 0);
  const pop24 = Math.max(0, ...H.slice(0, 24).map((x) => x.pop || 0));
  const arrow = svg(ui('arrow'));
  if (F.isNum(n.dir)) arrow.style.transform = `rotate(${Math.round(n.dir + 180)}deg)`;
  const p = ind.pressure || {};
  const trendIcon = svg(ui('arrow'));
  trendIcon.style.transform = `rotate(${p.delta3h > 0.5 ? 45 : p.delta3h < -0.5 ? 135 : 90}deg)`;
  const vis = n.visibility;
  const agree = ind.agreement;
  const tiles = [
    tile('rain', 'Chuva em 24 h', F.mm(rain24), `Probabilidade máxima ${F.pct(pop24)}`),
    tile('wind', 'Vento', h('span', {}, F.num(n.wind), h('small', {}, ' km/h')), `Rajadas ${F.kmh(n.gust)} · ${F.windFrom(n.dir)}`, { iconEl: arrow }),
    tile('drop', 'Humidade', F.pct(n.rh), `Ponto de orvalho ${F.deg(n.dew, 1)}`),
    tile('gauge', 'Pressão', h('span', {}, F.num(n.pressure), h('small', {}, ' hPa')),
      h('span', { class: 'trend' }, trendIcon, `${p.trend || '—'} · ${F.signed(p.delta3h, 1)} em 3 h · ${F.signed(p.delta24h, 1)} em 24 h`)),
    tile('sun', 'Índice UV', h('span', {}, F.num(d0.uvMax), h('small', {}, ' máx. hoje')), `Agora ${F.num(n.uv, 1)} · ${ind.uv?.label || F.LEVELS[ind.uv?.level || 0]}`),
    tile('cloud', 'Nebulosidade', F.pct(n.cloud), `Nuvens baixas ${F.pct(H[0]?.cloudLow)}`),
    tile('eye', 'Visibilidade', F.dist(vis), F.isNum(vis) && vis < 1000 ? 'Nevoeiro' : F.isNum(vis) && vis < 5000 ? 'Neblina ou chuva' : 'Boa'),
    lvlTile('thunder', 'bolt', 'Trovoada'),
    lvlTile('fog', 'fog', 'Nevoeiro'),
    lvlTile('frost', 'frost', 'Geada'),
    lvlTile('heat', 'heat', 'Calor'),
    tile('target', 'Previsibilidade', ind.predictability?.days != null ? h('span', {}, F.num(ind.predictability.days), h('small', {}, ' dias')) : '–', ind.predictability?.text || ''),
    tile('check', 'Concordância', F.isNum(agree) ? F.pct(agree * 100) : '–', `Entre ${fc.models?.length || 0} modelos nas próximas 48 h`),
  ];
  card.replaceChildren(sectionHead('gauge', 'Indicadores'), h('div', { class: 'tiles' }, tiles));
}

// ----- 16 dias -----
function renderDaily(fc) {
  const D = fc.daily || [];
  const card = show('daily', !!D.length);
  if (!D.length) return;
  const today = todayOf(fc);
  const lo = Math.min(...D.map((d) => (F.isNum(d.tminP10) ? d.tminP10 : d.tmin)).filter(F.isNum));
  const hi = Math.max(...D.map((d) => (F.isNum(d.tmaxP90) ? d.tmaxP90 : d.tmax)).filter(F.isNum));
  const span = Math.max(1, hi - lo);
  const pos = (v) => `${(((v - lo) / span) * 100).toFixed(2)}%`;
  const width = (a, b) => `${Math.max(0, ((b - a) / span) * 100).toFixed(2)}%`;
  const ens = fc.ensemble?.members;
  const list = h('ol', { class: 'days' });
  D.forEach((d, i) => {
    if (i > 0 && d.source === 'ensemble' && D[i - 1].source !== 'ensemble') {
      list.append(h('li', { class: 'day-div', 'aria-hidden': 'true' }, `Dias ${i + 1} a ${D.length} · tendência do ensemble${ens ? ` (${ens} cenários)` : ''}`));
    }
    const range = h('span', { class: 'day-range', 'aria-hidden': 'true' });
    const wLo = F.isNum(d.tminP10) ? d.tminP10 : d.tmin, wHi = F.isNum(d.tmaxP90) ? d.tmaxP90 : d.tmax;
    if (F.isNum(wLo) && F.isNum(wHi)) range.append(h('i', { class: 'whisker', style: `left:${pos(wLo)};width:${width(wLo, wHi)}` }));
    if (F.isNum(d.tmin) && F.isNum(d.tmax)) range.append(h('i', { class: 'rbar', style: `left:${pos(d.tmin)};width:${width(d.tmin, d.tmax)}` }));
    if (i === 0 && F.isNum(fc.now?.temp)) range.append(h('i', { class: 'rnow', style: `left:${pos(Math.min(Math.max(fc.now.temp, lo), hi))}` }));
    const extra = [];
    if ((d.precip || 0) >= 1) extra.push(`${F.mm(d.precip)}${F.isNum(d.precipP90) && d.precipP90 > d.precip * 1.3 + 0.5 ? ` (até ${F.mm(d.precipP90)})` : ''}`);
    if ((d.popHeavy || 0) >= 20) extra.push(`chuva forte ${F.pct(d.popHeavy)}`);
    if ((d.gustMax || 0) >= 50) extra.push(`rajadas ${F.kmh(d.gustMax)}`);
    if (F.isNum(d.anomaly) && Math.abs(d.anomaly) >= 2) extra.push(`${F.num(Math.abs(d.anomaly), 1)}° ${d.anomaly > 0 ? 'acima' : 'abaixo'} do normal`);
    if (d.change24h && F.isNum(d.change24h.tmax) && Math.abs(d.change24h.tmax) >= 1.5) extra.push(`máx. ${F.signed(d.change24h.tmax, 1)}° desde ontem`);
    if (d.change24h && F.isNum(d.change24h.precip) && Math.abs(d.change24h.precip) >= 3) extra.push(`chuva ${F.signed(d.change24h.precip, 0)} mm desde ontem`);
    const label = F.dayLabel(d.date, today);
    const sr = `${label}: ${F.wxText(d.code)}, mínima ${F.deg(d.tmin)}, máxima ${F.deg(d.tmax)}, chuva ${F.pct(d.pop)}${F.CONF[d.confidence] ? ', ' + F.CONF[d.confidence].toLowerCase() : ''}.`;
    list.append(h('li', { class: `day${i === 0 ? ' day--today' : ''}` },
      h('span', { class: 'sr-only' }, sr),
      h('div', { class: 'day-main', 'aria-hidden': 'true' },
        h('span', { class: 'day-name' }, label),
        h('span', { class: 'day-ico', html: weatherIcon(d.code, true, 30) }),
        h('span', { class: `day-pop${(d.pop || 0) >= 10 ? '' : ' is-low'}` }, (d.pop || 0) >= 10 ? F.pct(d.pop) : ''),
        h('span', { class: 'day-tmin' }, F.deg(d.tmin)),
        range,
        h('span', { class: 'day-tmax' }, F.deg(d.tmax)),
        h('span', { class: `day-conf day-conf--${d.confidence}`, html: ui(d.confidence === 'alta' ? 'signal3' : d.confidence === 'media' ? 'signal2' : 'signal1') })),
      extra.length ? h('p', { class: 'day-extra', 'aria-hidden': 'true' }, extra.join(' · ')) : null));
  });
  const n = fc.models?.length || 0;
  card.replaceChildren(
    sectionHead('clock', `${D.length} dias`),
    h('p', { class: 'card-sub' }, `Dias 1 a 7: consenso de ${n} modelos. Depois: mediana do ensemble. A barra vai da mínima à máxima; a linha fina mostra 80% dos cenários.`),
    list,
    h('p', { class: 'legend-inline', 'aria-hidden': 'true' },
      h('span', { class: 'lg' }, h('i', { class: 'k-rbar' }), 'mín.–máx.'),
      h('span', { class: 'lg' }, h('i', { class: 'k-whisker' }), 'cenários P10–P90'),
      h('span', { class: 'lg', html: `${ui('signal3', 'k-sig')}confiança` })));
}

// ----- incêndios e satélite -----
function riskRow(day, lv, label) {
  return h('div', { class: 'risk-row' },
    h('span', { class: 'risk-day' }, day),
    h('div', { class: 'risk-scale', role: 'img', 'aria-label': `Risco de incêndio ${day.toLowerCase()}: ${label || F.FIRE[lv]} (${lv} de 5)` },
      [1, 2, 3, 4, 5].map((k) => h('i', { class: `r${k}${k === lv ? ' is-on' : k < lv ? ' is-below' : ''}` }))),
    h('b', { class: 'risk-label' }, label || F.FIRE[lv] || '–'));
}
function renderFire(fc) {
  const card = show('fire', true);
  const fire = fc.fire || {};
  const today = todayOf(fc);
  const blocks = [sectionHead('flame', 'Incêndios e satélite')];
  if (fire.risk) {
    blocks.push(h('div', { class: 'risk' },
      riskRow('Hoje', fire.risk.today, fire.risk.label),
      F.isNum(fire.risk.tomorrow) ? riskRow('Amanhã', fire.risk.tomorrow, fire.risk.labelTomorrow) : null,
      h('p', { class: 'card-sub' }, `Risco de incêndio rural do IPMA · concelho de ${fire.risk.concelho}`)));
  } else {
    blocks.push(h('p', { class: 'card-sub' }, 'O risco oficial de incêndio (IPMA) só existe para Portugal.'));
  }
  const hs = fire.hotspots || { count: 0, items: [] };
  blocks.push(h('h3', { class: 'sub-title' }, `Focos de calor por satélite · 24 h · até ${hs.radiusKm || 50} km`));
  blocks.push(hs.items?.length
    ? h('ul', { class: 'rows' }, hs.items.map((x) => h('li', { class: 'row' },
      h('span', { class: 'row-dot row-dot--fire', 'aria-hidden': 'true' }),
      h('div', {}, h('b', {}, `${F.km(x.distanceKm)} ${x.bearing || ''}`), h('span', { class: 'row-sub' }, `FRP ${F.num(x.frp, 1)} MW · ${x.sat || 'satélite'} · ${F.hhmm(x.time)}${x.confidence ? ` · confiança ${x.confidence}` : ''}`)))))
    : h('p', { class: 'empty-line' }, svg(ui('check')), 'Nenhum foco detetado.'));
  const inc = fire.incidents || { count: 0, items: [] };
  blocks.push(h('h3', { class: 'sub-title' }, `Ocorrências ativas · ANEPC · até ${inc.radiusKm || 50} km`));
  blocks.push(inc.items?.length
    ? h('ul', { class: 'rows' }, inc.items.map((x) => h('li', { class: 'row' },
      h('span', { class: 'row-dot row-dot--inc', 'aria-hidden': 'true' }),
      h('div', {},
        h('b', {}, `${x.natureza} · ${x.status}`),
        h('span', { class: 'row-sub' }, `${F.km(x.distanceKm)} ${x.bearing || ''} · ${x.location || ''}`),
        h('span', { class: 'row-sub' }, `${F.num(x.man)} operacionais · ${F.num(x.terrain)} terrestres · ${F.num(x.aerial)} aéreos · desde ${F.hhmm(x.time)}`)))))
    : h('p', { class: 'empty-line' }, svg(ui('check')), 'Nenhuma ocorrência ativa por perto.'));
  const r30 = fire.rule30, sp = fire.spread;
  if (r30 || sp) {
    blocks.push(h('div', { class: 'facts' },
      r30 ? h('p', { class: 'fact' }, h('b', {}, 'Regra 30-30-30'), h('span', {}, r30.hours > 0 ? `${r30.hours} h com mais de 30 °C, humidade abaixo de 30% e vento acima de 30 km/h${r30.first ? `, a primeira ${F.whenShort(r30.first, today)}` : ''}.` : (r30.text || 'Não atingida.'))) : null,
      sp ? h('p', { class: 'fact' }, h('b', {}, 'Propagação'), h('span', {}, `${sp.text || ''} (vento ${F.num(sp.wind)} km/h ${F.compass(sp.dir)}, rajadas ${F.num(sp.gust)}, humidade ${F.pct(sp.rh)}).`)) : null));
  }
  // visualizador de satélite
  const sat = h('div', { class: 'sat' });
  blocks.push(h('h3', { class: 'sub-title' }, 'Satélite'), sat);
  card.replaceChildren(...blocks);
  renderSat(sat, fc);
}

function renderSat(box, fc) {
  const lat = state.loc?.lat ?? fc.location.lat, lon = state.loc?.lon ?? fc.location.lon;
  if (!LAYERS.some((l) => l[0] === state.layer)) state.layer = 'geocolour';
  if (!ZOOMS.includes(state.km)) state.km = 600;
  const tabs = h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Camada de satélite' }, LAYERS.map(([id, name]) => {
    const b = h('button', { class: 'seg-btn', type: 'button', role: 'tab', 'aria-selected': String(id === state.layer) }, name);
    b.addEventListener('click', () => { state.layer = id; api.store.set('layer', id); renderSat(box, fc); });
    return b;
  }));
  const zoom = h('div', { class: 'seg seg--small', role: 'group', 'aria-label': 'Largura da imagem' }, ZOOMS.map((z) => {
    const b = h('button', { class: 'seg-btn', type: 'button', 'aria-pressed': String(z === state.km) }, `${F.num(z)} km`);
    b.addEventListener('click', () => { state.km = z; api.store.set('km', z); renderSat(box, fc); });
    return b;
  }));
  const layer = LAYERS.find((l) => l[0] === state.layer);
  const frame = h('div', { class: 'sat-frame is-loading' });
  const img = h('img', { alt: `Imagem de satélite (${layer[1].toLowerCase()}) centrada no local`, width: '720', height: '540', decoding: 'async' });
  img.addEventListener('load', () => frame.classList.remove('is-loading', 'is-error'));
  img.addEventListener('error', () => { frame.classList.remove('is-loading'); frame.classList.add('is-error'); });
  img.src = api.satUrl(state.layer, lat, lon, state.km);
  frame.append(img, h('span', { class: 'sat-marker', 'aria-hidden': 'true' }), h('span', { class: 'sat-msg' }, 'Imagem indisponível de momento.'));
  box.replaceChildren(tabs, frame, zoom,
    h('p', { class: 'card-sub' }, layer[2]),
    h('p', { class: 'card-sub' }, `EUMETSAT · o local está no centro (marca) · cerca de ${F.num(state.km)} km de largura.`));
}

// ----- modelos -----
function renderModels(fc) {
  const card = show('models', true);
  const M = fc.models || [];
  const maxW = Math.max(...M.map((m) => m.weight || 0), 1);
  const ens = fc.ensemble || {};
  const ver = fc.verification;
  const byId = Object.fromEntries(M.map((m) => [m.id, m]));
  card.replaceChildren(
    sectionHead('layers', 'Modelos'),
    h('p', { class: 'card-sub' }, `${M.length} modelos determinísticos${ens.members ? ` e ${F.num(ens.members)} cenários de ${ens.models?.length || 0} ensembles` : ''}. O peso de cada modelo depende da resolução e do erro recente neste local.`),
    h('ul', { class: 'models' }, M.map((m) => h('li', { class: 'model' },
      h('div', { class: 'm-top' },
        h('b', {}, m.name), h('span', { class: 'm-org' }, m.org || ''),
        h('span', { class: 'm-meta' }, `${F.num(m.resKm, m.resKm < 3 ? 1 : 0)} km · ${F.num((m.hours || 0) / 24)} dias`)),
      h('div', { class: 'm-weight', role: 'img', 'aria-label': `Peso ${F.num(m.weight, 1)}` }, h('i', { style: `width:${(((m.weight || 0) / maxW) * 100).toFixed(1)}%` })),
      h('p', { class: 'm-skill' }, `Peso ${F.num(m.weight, 1)}`, m.skill ? ` · erro local ${F.num(m.skill.mae, 1)}° · viés ${F.signed(m.skill.bias, 1)}°` : '')))),
    ens.models?.length ? h('h3', { class: 'sub-title' }, 'Ensembles') : null,
    ens.models?.length ? h('ul', { class: 'chips' }, ens.models.map((e) => h('li', { class: 'chip chip--muted' }, h('b', {}, e.name), ` · ${F.num(e.members)} cenários · ${F.num(e.days)} dias`))) : null,
    h('h3', { class: 'sub-title' }, 'Verificação local'),
    h('p', { class: 'card-sub' }, ver
      ? `Comparado com a estação ${ver.station}: ${F.num(ver.n)} horas nos últimos ${F.num(ver.days)} dias. Mais certeiro: ${byId[ver.best]?.name || ver.best}.`
      : 'Ainda sem verificação local: é preciso uma estação meteorológica perto e alguns dias de observações.'));
}

// ----- rodapé -----
function renderFooter(fc) {
  const ft = $('#footer');
  const g = fc ? localGen(fc) : null;
  const src = [
    ['Open-Meteo.com', 'https://open-meteo.com/'], ['IPMA', 'https://www.ipma.pt/'], ['NOAA AWC (METAR)', 'https://aviationweather.gov/'],
    ['NASA FIRMS', 'https://firms.modaps.eosdis.nasa.gov/'], ['ANEPC via fogos.pt', 'https://fogos.pt/'], ['EUMETSAT', 'https://view.eumetsat.int/'],
  ];
  ft.replaceChildren(
    fc ? h('p', { class: 'ft-upd' }, `Atualizado às ${F.hhmm(g)} (hora local)`, ' ',
      h('button', { class: 'btn btn-small btn-ghost', type: 'button', onclick: () => refresh(), html: `${ui('refresh')}<span>Atualizar</span>` })) : null,
    h('p', { class: 'ft-src' }, 'Fontes: ', src.map(([n, u], i) => [i ? ' · ' : '', h('a', { href: u, target: '_blank', rel: 'noopener' }, n)])),
    h('p', { class: 'ft-lic' }, 'Dados meteorológicos de ', h('a', { href: 'https://open-meteo.com/', target: '_blank', rel: 'noopener' }, 'Open-Meteo.com'),
      ' (', h('a', { href: 'https://creativecommons.org/licenses/by/4.0/', target: '_blank', rel: 'noopener' }, 'CC BY 4.0'), '). Previsão automática: confirma sempre os avisos oficiais do IPMA e da Proteção Civil.'),
    h('p', { class: 'ft-ver' }, `Meteo Preciso ${VERSION}`));
}

// ---------- diálogo de local ----------
function openDialog() {
  const dlg = $('#loc-dialog');
  renderFavs();
  renderPlacesList();
  $('#dlg-results').replaceChildren();
  $('#dlg-q').value = '';
  if (!dlg.open) dlg.showModal();
  setTimeout(() => $('#dlg-q').focus(), 50);
  api.getPlaces().then((p) => { state.places = p || []; renderPlacesList(); }).catch(() => {});
}

async function search(text) {
  const box = $('#dlg-results');
  const qtext = text.trim();
  if (qtext.length < 2) { box.replaceChildren(); return; }
  box.replaceChildren(h('li', { class: 'list-msg' }, 'A pesquisar…'));
  try {
    const res = await api.geocode(qtext);
    if ($('#dlg-q').value.trim() !== qtext) return;
    box.replaceChildren(...(res.length ? res.slice(0, 8).map((r) => locItem(r.name, [r.admin1, r.country].filter(Boolean).join(', '), () => choose({ lat: r.lat, lon: r.lon, name: r.name }))) : [h('li', { class: 'list-msg' }, 'Sem resultados. Experimenta outro nome.')]));
  } catch (e) {
    box.replaceChildren(h('li', { class: 'list-msg' }, e.message));
  }
}
function locItem(title, sub, onPick, onRemove) {
  return h('li', { class: 'list-item' },
    h('button', { class: 'list-btn', type: 'button', onclick: onPick }, svg(ui('pin')), h('span', {}, h('b', {}, title), sub ? h('span', { class: 'list-sub' }, sub) : null)),
    onRemove ? h('button', { class: 'icon-btn icon-btn--small', type: 'button', 'aria-label': `Remover ${title}`, onclick: onRemove, html: ui('trash') }) : null);
}
function choose(loc) { $('#loc-dialog').close(); setLocation(loc); }

const favs = () => api.store.get('favs', []);
function renderFavs() {
  const box = $('#dlg-favs');
  const list = favs();
  box.replaceChildren(...(list.length ? list.map((f) => locItem(f.name, `${F.num(f.lat, 3)}, ${F.num(f.lon, 3)}`, () => choose(f), () => { api.store.set('favs', favs().filter((x) => !(x.lat === f.lat && x.lon === f.lon))); renderFavs(); })) : [h('li', { class: 'list-msg' }, 'Ainda sem favoritos.')]));
  const isFav = state.loc && list.some((f) => haversineKm(f.lat, f.lon, state.loc.lat, state.loc.lon) < 0.2);
  const btn = $('#dlg-fav-add');
  btn.hidden = !state.loc;
  btn.innerHTML = `${ui('star')}<span>${isFav ? 'Remover este local dos favoritos' : 'Guardar este local nos favoritos'}</span>`;
}
function toggleFavourite() {
  if (!state.loc) return;
  const list = favs();
  const i = list.findIndex((f) => haversineKm(f.lat, f.lon, state.loc.lat, state.loc.lon) < 0.2);
  if (i >= 0) list.splice(i, 1);
  else list.unshift({ lat: state.loc.lat, lon: state.loc.lon, name: state.loc.name || state.fc?.location?.name || 'Local' });
  api.store.set('favs', list.slice(0, 10));
  renderFavs();
}
function renderPlacesList() {
  const box = $('#dlg-places');
  box.replaceChildren(...(state.places.length
    ? state.places.map((p) => locItem(p.name, `${F.num(p.lat, 3)}, ${F.num(p.lon, 3)}`, () => choose({ lat: p.lat, lon: p.lon, name: p.name }), async () => {
      try { await api.deletePlace(p.id); state.places = state.places.filter((x) => x.id !== p.id); renderPlacesList(); if (state.fc) renderAnalysis(); } catch (e) { toast(e.message); }
    }))
    : [h('li', { class: 'list-msg' }, 'Nenhum. Ativa no cartão «Análise do Claude» (máx. 5 locais).')]));
}

init();
