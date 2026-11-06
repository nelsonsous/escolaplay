// Gráficos SVG da app (sem bibliotecas).
// 72 h = três pequenos múltiplos com o mesmo eixo do tempo (temperatura, chuva, vento):
// cada um com a sua escala — nunca dois eixos y no mesmo painel.
import { isNum, num, parts, wdShort, cap, compass, hhmm, deg, mm, kmh, pct } from './format.js';
import { weatherIconInner } from './icons.js';

const STEP = 18;   // px por hora
const PADR = 16;   // folga à direita
const AXIS_W = 44; // coluna fixa com as escalas
const G = {
  icon: 4, iconSize: 22,
  tT: 44, tB: 146,
  pT: 168, pB: 220,
  wT: 242, wB: 292,
  arrows: 307,
  hours: 332, days: 350,
  H: 360,
};

const f = (v) => Math.round(v * 10) / 10;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function tempScale(min, max) {
  for (const s of [1, 2, 5, 10, 20]) {
    const lo = Math.floor((min - 1) / s) * s, hi = Math.ceil((max + 1.5) / s) * s;
    if ((hi - lo) / s <= 4) return { lo, hi, step: s };
  }
  return { lo: Math.floor(min), hi: Math.ceil(max) + 1, step: Math.ceil(max - min) || 1 };
}
const niceCeil = (v, opts) => opts.find((o) => o >= v) ?? Math.ceil(v);

/** Curva monótona (Fritsch–Carlson): não inventa máximos entre pontos. */
export function monotonePath(pts, move = true) {
  const n = pts.length;
  if (!n) return '';
  if (n === 1) return `${move ? 'M' : 'L'}${f(pts[0][0])},${f(pts[0][1])}`;
  const dx = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  t[n - 1] = m[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `${move ? 'M' : 'L'}${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${f(pts[i][0] + h)},${f(pts[i][1] + t[i] * h)},${f(pts[i + 1][0] - h)},${f(pts[i + 1][1] - t[i + 1] * h)},${f(pts[i + 1][0])},${f(pts[i + 1][1])}`;
  }
  return d;
}
/** índices seguidos com valor (para partir linhas nos buracos) */
function runs(n, ok) {
  const out = [];
  let cur = null;
  for (let i = 0; i < n; i++) {
    if (ok(i)) { if (!cur) out.push((cur = [])); cur.push(i); } else cur = null;
  }
  return out;
}
/** barra com cantos de 4 px no topo e base reta */
function barPath(x, y, w, h, r = 4) {
  r = Math.max(0, Math.min(r, w / 2, h));
  return `M${f(x)},${f(y + h)}V${f(y + r)}A${r},${r} 0 0 1 ${f(x + r)},${f(y)}H${f(x + w - r)}A${r},${r} 0 0 1 ${f(x + w)},${f(y + r)}V${f(y + h)}Z`;
}
const popClass = (p) => (!isNum(p) || p < 30 ? 'p1' : p < 60 ? 'p2' : 'p3');

// ---------------------------------------------------------------------------
export function renderHourly(root, hourly, { todayIso } = {}) {
  const H = (hourly || []).slice(0, 72);
  root.textContent = '';
  if (!H.length) { root.innerHTML = '<p class="muted">Sem dados horários.</p>'; return; }
  const n = H.length;
  const W = n * STEP + PADR;
  const xc = (i) => i * STEP + STEP / 2;

  const temps = H.flatMap((h) => [h.temp, h.tempLo, h.tempHi]).filter(isNum);
  const ts = tempScale(Math.min(...temps), Math.max(...temps));
  const yT = (v) => G.tB - ((v - ts.lo) / (ts.hi - ts.lo)) * (G.tB - G.tT);
  const pData = Math.max(0, ...H.map((h) => Math.max(h.precip || 0, h.precipHi || 0)));
  const pTop = niceCeil(Math.max(pData, 1), [1, 2, 5, 10, 20, 50, 100]);
  const yP = (v) => G.pB - (Math.min(Math.max(v, 0), pTop) / pTop) * (G.pB - G.pT);
  const wData = Math.max(10, ...H.map((h) => Math.max(h.gust || 0, h.wind || 0)));
  const wTop = niceCeil(wData, [20, 30, 40, 60, 80, 100, 120, 150, 200]);
  const yW = (v) => G.wB - (Math.min(Math.max(v, 0), wTop) / wTop) * (G.wB - G.wT);

  let s = '';
  // noite
  for (const r of runs(n, (i) => H[i].isDay === false)) {
    s += `<rect class="night" x="${r[0] * STEP}" y="0" width="${r.length * STEP}" height="${G.arrows + 10}"/>`;
  }
  // grelha
  for (let v = ts.lo; v <= ts.hi + 1e-9; v += ts.step) s += `<line class="grid" x1="0" x2="${W}" y1="${f(yT(v))}" y2="${f(yT(v))}"/>`;
  s += `<line class="grid" x1="0" x2="${W}" y1="${f(yP(pTop))}" y2="${f(yP(pTop))}"/><line class="base" x1="0" x2="${W}" y1="${G.pB}" y2="${G.pB}"/>`;
  s += `<line class="grid" x1="0" x2="${W}" y1="${f(yW(wTop))}" y2="${f(yW(wTop))}"/><line class="base" x1="0" x2="${W}" y1="${G.wB}" y2="${G.wB}"/>`;
  // meia-noite
  H.forEach((h, i) => { if (i > 0 && parts(h.time)?.h === 0) s += `<line class="midnight" x1="${i * STEP}" x2="${i * STEP}" y1="0" y2="${G.days - 12}"/>`; });

  // temperatura: banda entre modelos + linha do consenso
  for (const r of runs(n, (i) => isNum(H[i].tempLo) && isNum(H[i].tempHi))) {
    const hi = r.map((i) => [xc(i), yT(H[i].tempHi)]);
    const lo = r.map((i) => [xc(i), yT(H[i].tempLo)]).reverse();
    s += `<path class="band-t" d="${monotonePath(hi)}${monotonePath(lo, false)}Z"/>`;
  }
  for (const r of runs(n, (i) => isNum(H[i].temp))) s += `<path class="line-t" d="${monotonePath(r.map((i) => [xc(i), yT(H[i].temp)]))}"/>`;

  // extremos de cada dia (rótulo seletivo) + ponto "agora"
  const byDay = new Map();
  H.forEach((h, i) => { if (!isNum(h.temp)) return; const d = h.time.slice(0, 10); if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(i); });
  for (const idx of byDay.values()) {
    let iMax = idx[0], iMin = idx[0];
    for (const i of idx) { if (H[i].temp > H[iMax].temp) iMax = i; if (H[i].temp < H[iMin].temp) iMin = i; }
    for (const [i, up] of [[iMax, true], [iMin, false]]) {
      if (i < 2 || i > n - 3 || (i === iMin && iMin === iMax)) continue;
      const y = yT(H[i].temp);
      s += `<circle class="dot-t" cx="${f(xc(i))}" cy="${f(y)}" r="4"/><text class="lbl ${up ? 'lbl-hi' : 'lbl-lo'}" x="${f(xc(i))}" y="${f(up ? y - 9 : y + 17)}" text-anchor="middle">${esc(num(H[i].temp) + '°')}</text>`;
    }
  }
  if (isNum(H[0].temp)) s += `<circle class="dot-t" cx="${f(xc(0))}" cy="${f(yT(H[0].temp))}" r="4"/>`;

  // chuva: barras (tom = probabilidade) + máximo entre modelos
  let iPmax = -1;
  H.forEach((h, i) => {
    const p = h.precip || 0;
    if (p >= 0.05) {
      const y = yP(p), hh = Math.max(2, G.pB - y);
      s += `<path class="bar ${popClass(h.pop)}" d="${barPath(xc(i) - 6, G.pB - hh, 12, hh)}"/>`;
      if (iPmax < 0 || p > (H[iPmax].precip || 0)) iPmax = i;
    }
    if (isNum(h.precipHi) && h.precipHi >= Math.max(0.2, p + 0.15)) {
      const y1 = yP(Math.max(p, 0)), y2 = yP(h.precipHi);
      s += `<line class="cap" x1="${f(xc(i))}" x2="${f(xc(i))}" y1="${f(y1)}" y2="${f(y2)}"/><line class="cap" x1="${f(xc(i) - 3)}" x2="${f(xc(i) + 3)}" y1="${f(y2)}" y2="${f(y2)}"/>`;
    }
  });
  if (iPmax >= 0 && H[iPmax].precip >= 0.2) {
    const top = Math.min(yP(H[iPmax].precip), isNum(H[iPmax].precipHi) ? yP(H[iPmax].precipHi) : G.pB);
    s += `<text class="lbl" x="${f(xc(iPmax))}" y="${f(Math.max(G.pT - 2, top - 5))}" text-anchor="middle">${esc(mm(H[iPmax].precip))}</text>`;
  } else if (iPmax < 0) {
    s += `<text class="lbl lbl-muted" x="8" y="${G.pB - 18}">Sem chuva prevista</text>`;
  }

  // vento: área do vento médio + linha das rajadas
  for (const r of runs(n, (i) => isNum(H[i].wind))) {
    const top = r.map((i) => [xc(i), yW(H[i].wind)]);
    s += `<path class="area-w" d="M${f(xc(r[0]))},${G.wB}${monotonePath(top, false)}L${f(xc(r.at(-1)))},${G.wB}Z"/>`;
  }
  let iGmax = -1;
  for (const r of runs(n, (i) => isNum(H[i].gust))) {
    s += `<path class="line-w" d="${monotonePath(r.map((i) => [xc(i), yW(H[i].gust)]))}"/>`;
    for (const i of r) if (iGmax < 0 || H[i].gust > H[iGmax].gust) iGmax = i;
  }
  if (iGmax >= 0) {
    const y = yW(H[iGmax].gust);
    s += `<circle class="dot-w" cx="${f(xc(iGmax))}" cy="${f(y)}" r="4"/><text class="lbl" x="${f(Math.min(Math.max(xc(iGmax), 24), W - 30))}" y="${f(Math.max(G.wT - 4, y - 8))}" text-anchor="middle">${esc(kmh(H[iGmax].gust))}</text>`;
  }

  // ícones, setas de direção e eixo x (de 3 em 3 h)
  H.forEach((h, i) => {
    if (i % 3) return;
    const x = xc(i);
    s += `<g transform="translate(${f(x - G.iconSize / 2)} ${G.icon}) scale(${f(G.iconSize / 64 * 1000) / 1000})">${weatherIconInner(h.code, h.isDay)}</g>`;
    if (isNum(h.dir)) s += `<path class="arrow" transform="translate(${f(x)} ${G.arrows}) rotate(${Math.round(h.dir + 180)})" d="M0,-6L4.2,4.5L0,2.2L-4.2,4.5Z"/>`;
    const p = parts(h.time);
    s += i === 0
      ? `<text class="ax ax-now" x="2" y="${G.hours}">Agora</text>`
      : `<text class="ax" x="${f(x)}" y="${G.hours}" text-anchor="middle">${p.h}h</text>`;
  });
  // rótulo do primeiro dia só se a meia-noite seguinte estiver a ≥ 4 h (senão colide)
  const firstMidnight = H.findIndex((h, i) => i > 0 && parts(h.time).h === 0);
  H.forEach((h, i) => {
    const p = parts(h.time);
    if (i === 0 && p.h !== 0 && (firstMidnight < 0 || firstMidnight >= 4)) s += `<text class="ax ax-day" x="2" y="${G.days}">${esc(h.time.slice(0, 10) === todayIso ? 'Hoje' : cap(wdShort(h.time)))}</text>`;
    else if (p.h === 0 && i < n - 4) s += `<text class="ax ax-day" x="${i * STEP + 4}" y="${G.days}">${esc(`${cap(wdShort(h.time))} ${p.d}`)}</text>`;
  });
  // mira (cruz) do toque/rato
  s += `<g class="xh" visibility="hidden"><line x1="0" x2="0" y1="0" y2="${G.arrows + 10}"/><circle class="xh-dot" r="4.5" cx="0" cy="0"/></g>`;

  // eixo fixo (escalas)
  let ax = '';
  for (let v = ts.lo; v <= ts.hi + 1e-9; v += ts.step) ax += `<text class="ax" x="${AXIS_W - 6}" y="${f(yT(v) + 4)}" text-anchor="end">${esc(num(v) + '°')}</text>`;
  ax += `<text class="ax" x="${AXIS_W - 6}" y="${f(yP(pTop) + 4)}" text-anchor="end">${esc(num(pTop))}</text><text class="ax ax-unit" x="${AXIS_W - 6}" y="${f(yP(pTop) + 15)}" text-anchor="end">mm</text>`;
  ax += `<text class="ax" x="${AXIS_W - 6}" y="${f(yW(wTop) + 4)}" text-anchor="end">${esc(num(wTop))}</text><text class="ax ax-unit" x="${AXIS_W - 6}" y="${f(yW(wTop) + 15)}" text-anchor="end">km/h</text>`;

  root.innerHTML = `
    <div class="legend" aria-hidden="true">
      <div class="lg-row"><span class="lg-name">Temperatura</span><span class="lg"><i class="k-line k-t"></i>consenso</span><span class="lg"><i class="k-area k-t"></i>variação entre modelos</span></div>
      <div class="lg-row"><span class="lg-name">Chuva</span><span class="lg"><i class="k-bar p1"></i><i class="k-bar p2"></i><i class="k-bar p3"></i>probabilidade &lt;30 · 30–60 · &gt;60%</span><span class="lg"><i class="k-cap"></i>máximo dos modelos</span></div>
      <div class="lg-row"><span class="lg-name">Vento</span><span class="lg"><i class="k-line k-w"></i>rajada</span><span class="lg"><i class="k-area k-w"></i>médio</span><span class="lg"><i class="k-arrow"></i>para onde sopra</span></div>
    </div>
    <div class="chart-body">
      <svg class="chart-axis" width="${AXIS_W}" height="${G.H}" viewBox="0 0 ${AXIS_W} ${G.H}" aria-hidden="true">${ax}</svg>
      <div class="chart-scroll" tabindex="0" role="group" aria-label="Gráfico das próximas ${n} horas: temperatura, chuva e vento. Toca numa hora ou usa as setas do teclado; a tabela abaixo tem todos os valores.">
        <div class="chart-canvas" style="width:${W}px;height:${G.H}px">
          <svg width="${W}" height="${G.H}" viewBox="0 0 ${W} ${G.H}" aria-hidden="true">${s}</svg>
          <div class="chart-tip" hidden aria-live="polite"></div>
        </div>
      </div>
    </div>
    <details class="twin"><summary>Ver tabela das ${n} horas</summary><div class="twin-scroll"></div></details>`;

  // ---------- interação ----------
  const scroller = root.querySelector('.chart-scroll');
  const canvas = root.querySelector('.chart-canvas');
  const tip = root.querySelector('.chart-tip');
  const xh = root.querySelector('.xh');
  const dot = root.querySelector('.xh-dot');
  let sel = -1;

  function select(i, { scroll = false } = {}) {
    if (i < 0 || i >= n) return hide();
    sel = i;
    const h = H[i], x = xc(i);
    xh.setAttribute('visibility', 'visible');
    xh.setAttribute('transform', `translate(${f(x)} 0)`);
    if (isNum(h.temp)) { dot.setAttribute('cy', f(yT(h.temp))); dot.setAttribute('visibility', 'visible'); } else dot.setAttribute('visibility', 'hidden');
    tip.textContent = '';
    const p = parts(h.time);
    const head = document.createElement('div');
    head.className = 'tip-head';
    head.textContent = `${i === 0 ? 'Agora · ' : ''}${cap(wdShort(h.time))} ${p.d}, ${hhmm(h.time)}`;
    tip.append(head);
    const row = (val, label) => {
      const r = document.createElement('div');
      r.className = 'tip-row';
      const b = document.createElement('b'); b.textContent = val;
      const sp = document.createElement('span'); sp.textContent = label;
      r.append(b, sp); tip.append(r);
    };
    row(deg(h.temp, 1), isNum(h.tempLo) && isNum(h.tempHi) ? `temperatura (${num(h.tempLo, 1)} a ${num(h.tempHi, 1)})` : 'temperatura');
    row(mm(h.precip || 0), `chuva · ${pct(h.pop)} prob.${isNum(h.precipHi) && h.precipHi > (h.precip || 0) + 0.1 ? ` · até ${mm(h.precipHi)}` : ''}`);
    row(kmh(h.gust), `rajada · vento ${num(h.wind)} ${compass(h.dir)}`);
    row(pct(h.cloud), `nuvens${isNum(h.feels) ? ` · sensação ${deg(h.feels)}` : ''}`);
    tip.hidden = false;
    placeTip();
    if (scroll) {
      const left = x - scroller.clientWidth / 2;
      scroller.scrollTo({ left: Math.max(0, left), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }
  function placeTip() {
    if (sel < 0) return;
    const x = xc(sel);
    const tw = tip.offsetWidth || 180;
    const vis0 = scroller.scrollLeft, vis1 = vis0 + scroller.clientWidth;
    let left = x + 12;
    if (left + tw > vis1 - 6) left = x - 12 - tw;
    left = Math.max(vis0 + 6, Math.min(left, vis1 - tw - 6));
    tip.style.transform = `translate(${Math.round(left)}px, 0)`;
  }
  function hide() { sel = -1; xh.setAttribute('visibility', 'hidden'); tip.hidden = true; }
  const idxAt = (clientX) => Math.max(0, Math.min(n - 1, Math.floor((clientX - canvas.getBoundingClientRect().left) / STEP)));

  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved < 8) { const i = idxAt(e.clientX); if (i === sel && e.pointerType !== 'mouse') hide(); else select(i); }
  });
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') select(idxAt(e.clientX)); });
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
  scroller.addEventListener('scroll', placeTip, { passive: true });
  scroller.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); select(Math.max(0, Math.min(n - 1, (sel < 0 ? 0 : sel + (k === 'ArrowRight' ? 1 : -1)))), { scroll: true }); }
    else if (k === 'Home') { e.preventDefault(); select(0, { scroll: true }); }
    else if (k === 'End') { e.preventDefault(); select(n - 1, { scroll: true }); }
    else if (k === 'Escape') hide();
  });
  scroller.addEventListener('blur', () => { if (!scroller.matches(':hover')) hide(); });

  // tabela (gémea acessível), construída só quando aberta
  const twin = root.querySelector('.twin');
  twin.addEventListener('toggle', () => {
    if (!twin.open || twin.dataset.built) return;
    twin.dataset.built = '1';
    const t = document.createElement('table');
    t.className = 'tbl';
    t.innerHTML = '<thead><tr><th scope="col">Hora</th><th scope="col">Temp.</th><th scope="col">Modelos</th><th scope="col">Chuva</th><th scope="col">Prob.</th><th scope="col">Vento</th><th scope="col">Rajada</th><th scope="col">Nuvens</th></tr></thead>';
    const tb = document.createElement('tbody');
    for (const h of H) {
      const tr = document.createElement('tr');
      const p = parts(h.time);
      const cells = [`${cap(wdShort(h.time))} ${p.h}h`, deg(h.temp, 1), isNum(h.tempLo) ? `${num(h.tempLo, 1)}–${num(h.tempHi, 1)}` : '–', mm(h.precip || 0), pct(h.pop), `${num(h.wind)} ${compass(h.dir)}`, num(h.gust), pct(h.cloud)];
      cells.forEach((c, j) => { const td = document.createElement(j ? 'td' : 'th'); if (!j) td.scope = 'row'; td.textContent = c; tr.append(td); });
      tb.append(tr);
    }
    t.append(tb);
    root.querySelector('.twin-scroll').append(t);
  });
}

// ---------------------------------------------------------------------------
/** Próximas 2 horas: 8 barras de 15 min (uma série, sem legenda). */
export function renderNowcast(root, nowcast) {
  const steps = (nowcast?.steps || []).slice(0, 8);
  root.textContent = '';
  if (!steps.length) return;
  const Wv = 320, base = 62, top = 16;
  const max = Math.max(0, ...steps.map((s) => s.precip || 0));
  const pTop = max > 0 ? niceCeil(max, [0.5, 1, 2, 5, 10, 20, 50]) : 1;
  const slot = Wv / steps.length, bw = Math.min(24, slot - 14);
  let s = `<line class="base" x1="0" x2="${Wv}" y1="${base}" y2="${base}"/>`;
  let iMax = -1;
  steps.forEach((st, i) => {
    const p = st.precip || 0;
    const cx = slot * i + slot / 2;
    if (p > 0) {
      const hh = Math.max(2, (p / pTop) * (base - top));
      s += `<path class="bar nc" d="${barPath(cx - bw / 2, base - hh, bw, hh)}"><title>${esc(`${hhmm(st.time)} · ${mm(p)}`)}</title></path>`;
      if (iMax < 0 || p > steps[iMax].precip) iMax = i;
    } else {
      s += `<line class="nc-zero" x1="${f(cx - bw / 2)}" x2="${f(cx + bw / 2)}" y1="${base}" y2="${base}"/>`;
    }
    if (i % 2 === 1) s += `<text class="ax" x="${f(cx)}" y="${base + 18}" text-anchor="middle">${esc(hhmm(st.time))}</text>`;
  });
  if (iMax >= 0) {
    const cx = slot * iMax + slot / 2, hh = Math.max(2, (steps[iMax].precip / pTop) * (base - top));
    s += `<text class="lbl" x="${f(cx)}" y="${f(base - hh - 6)}" text-anchor="middle">${esc(mm(steps[iMax].precip))}</text>`;
  }
  const label = steps.map((st) => `${hhmm(st.time)} ${mm(st.precip || 0)}`).join(', ');
  root.innerHTML = `<svg class="nowcast-svg" viewBox="0 0 ${Wv} ${base + 26}" role="img" aria-label="${esc('Chuva prevista a cada 15 minutos: ' + label)}">${s}</svg>`;
}

