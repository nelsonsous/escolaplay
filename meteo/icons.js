// Ícones da app: tempo (SVG 64×64, cores por variáveis CSS para o tema) e interface (24×24, traço).
import { wxGroup } from './format.js';

// ---------- degradês (uma vez no documento: os ícones e os gráficos usam url(#wxg-…)) ----------
const DEFS = `<svg id="wx-defs" aria-hidden="true" focusable="false" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden"><defs>
<radialGradient id="wxg-sun" cx="40%" cy="38%" r="70%"><stop offset="0" stop-color="#fff3a6"/><stop offset=".45" stop-color="#ffd23f"/><stop offset="1" stop-color="#ff9f1c"/></radialGradient>
<radialGradient id="wxg-glow"><stop offset="0" stop-color="#ffc531" stop-opacity=".55"/><stop offset="1" stop-color="#ffc531" stop-opacity="0"/></radialGradient>
<linearGradient id="wxg-moon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#b9c2e3"/></linearGradient>
<linearGradient id="wxg-cloud" gradientUnits="userSpaceOnUse" x1="0" y1="17" x2="0" y2="48"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c6d0de"/></linearGradient>
<linearGradient id="wxg-cloud2" gradientUnits="userSpaceOnUse" x1="0" y1="17" x2="0" y2="48"><stop offset="0" stop-color="#b4bfcf"/><stop offset="1" stop-color="#6f7b8d"/></linearGradient>
<linearGradient id="wxg-drop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd3ff"/><stop offset="1" stop-color="#2e7cf6"/></linearGradient>
<linearGradient id="wxg-bolt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff07a"/><stop offset="1" stop-color="#ff9a1a"/></linearGradient>
</defs></svg>`;
if (typeof document !== 'undefined' && !document.getElementById('wx-defs')) (document.body || document.documentElement).insertAdjacentHTML('afterbegin', DEFS);

// ---------- peças ----------
// nuvem: uma só forma (sem costuras), com volume (degradê) e uma sombra suave por baixo; escura nas trovoadas
const CLOUD_D = 'M20 48a10 10 0 0 1-2.2-19.76A13 13 0 0 1 43.6 27a9.5 9.5 0 0 1 4.4 17.9A6 6 0 0 1 46 48z';
const cloud = (tx = 0, ty = 0, s = 1, fill = 'var(--wx-cloud)') => {
  const dark = fill === 'var(--wx-cloud-2)';
  return `<g class="wx-cloud"><g transform="translate(${tx} ${ty}) scale(${s})"><path d="${CLOUD_D}" transform="translate(0 1.6)" fill="#000" opacity=".22"/><path d="${CLOUD_D}" fill="url(#wxg-${dark ? 'cloud2' : 'cloud'})"/></g></g>`;
};

function sun(cx, cy, r, rays = true) {
  const o = `style="transform-origin:${cx}px ${cy}px"`; // as animações (rodar, pulsar) são à volta do centro do sol
  let s = `<circle cx="${cx}" cy="${cy}" r="${(r * 1.9).toFixed(1)}" fill="url(#wxg-glow)"/><circle class="wx-sun" ${o} cx="${cx}" cy="${cy}" r="${r}" fill="url(#wxg-sun)"/>`;
  if (rays) {
    const r1 = r + 4.5, r2 = r + 9;
    s += `<g class="wx-rays" ${o} stroke="#ffb52e" stroke-width="3" stroke-linecap="round">`;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      const c = Math.cos(a), si = Math.sin(a);
      s += `<line x1="${(cx + r1 * c).toFixed(1)}" y1="${(cy + r1 * si).toFixed(1)}" x2="${(cx + r2 * c).toFixed(1)}" y2="${(cy + r2 * si).toFixed(1)}"/>`;
    }
    s += '</g>';
  }
  return s;
}
// crescente: círculo (32,32) r15 menos círculo (40,25) r13
const moon = (tx = 0, ty = 0, s = 1) =>
  `<g class="wx-moon"><path transform="translate(${tx} ${ty}) scale(${s})" fill="url(#wxg-moon)" d="M29.6 17.19A15 15 0 1 0 46.36 36.34A13 13 0 0 1 29.6 17.19Z"/><circle transform="translate(${tx} ${ty}) scale(${s})" cx="25" cy="37" r="2.6" fill="#a9b2d6" opacity=".5"/><circle transform="translate(${tx} ${ty}) scale(${s})" cx="32" cy="41.5" r="1.6" fill="#a9b2d6" opacity=".45"/></g>`;

function drops(n, y0 = 46) {
  const xs = n === 1 ? [32] : n === 2 ? [26, 38] : [22, 32, 42];
  // gotas em forma de lágrima, um pouco inclinadas (o grupo de fora é o que a animação mexe)
  return `<g fill="url(#wxg-drop)">${xs
    .map((x, i) => `<g class="wx-drop" style="--i:${i}"><path transform="translate(${x - 1} ${y0 - 1}) rotate(16) scale(1.3)" d="M0 0C1.9 3.1 3.4 5.2 3.4 7a3.4 3.4 0 0 1-6.8 0C-3.4 5.2-1.9 3.1 0 0z"/></g>`)
    .join('')}</g>`;
}
const drizzle = (y0 = 48) =>
  `<g fill="var(--wx-rain)">${[22, 32, 42].map((x, i) => `<circle class="wx-drop" style="--i:${i}" cx="${x - i}" cy="${y0 + (i % 2) * 5}" r="2"/><circle class="wx-drop" style="--i:${i + 1.5}" cx="${x - 3 - i}" cy="${y0 + 8 + (i % 2) * 2}" r="2"/>`).join('')}</g>`;
function flake(x, y, r = 4) {
  let s = '';
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI) / 3;
    const dx = (r * Math.cos(a)).toFixed(1), dy = (r * Math.sin(a)).toFixed(1);
    s += `<line x1="${(x - dx).toFixed(1)}" y1="${(y - dy).toFixed(1)}" x2="${(x + +dx).toFixed(1)}" y2="${(y + +dy).toFixed(1)}"/>`;
  }
  return s;
}
const flakes = (y0 = 50) =>
  `<g stroke="var(--wx-snow)" stroke-width="2.2" stroke-linecap="round">${[[22, y0], [34, y0 + 6], [44, y0 - 1]].map(([x, y], i) => `<g class="wx-flake" style="--i:${i}">${flake(x, y)}</g>`).join('')}</g>`;
const ice = (y0 = 56) => `<g fill="var(--wx-snow)"><circle class="wx-hail" style="--i:0" cx="20" cy="${y0}" r="2.2"/><circle class="wx-hail" style="--i:1" cx="44" cy="${y0 - 3}" r="2.2"/></g>`;
const bolt = `<path class="wx-bolt" fill="url(#wxg-bolt)" stroke="#ffb020" stroke-width=".8" stroke-linejoin="round" d="M34 41l-9 12h7l-3 10 11-14h-7l4-8z"/>`;
const hail = `<g fill="var(--wx-snow)"><circle class="wx-hail" style="--i:0" cx="20" cy="52" r="2.4"/><circle class="wx-hail" style="--i:1" cx="46" cy="54" r="2.4"/><circle class="wx-hail" style="--i:2" cx="24" cy="60" r="2.4"/></g>`;
const fog = `<g stroke="var(--wx-fog)" stroke-width="3.2" stroke-linecap="round"><line class="wx-fogl" style="--i:0" x1="12" y1="46" x2="52" y2="46"/><line class="wx-fogl" style="--i:1" x1="16" y1="53" x2="48" y2="53"/><line class="wx-fogl" style="--i:2" x1="22" y1="60" x2="44" y2="60"/></g>`;

/** Corpo do ícone (sem <svg>), para embutir em gráficos. */
export function weatherIconInner(code, isDay = true) {
  const g = wxGroup(code);
  const day = isDay !== false;
  const smallSky = day ? sun(22, 22, 8.5, true) : moon(-6, -8, 0.82);
  const upCloud = (fill) => cloud(-2, -8, 1, fill);
  switch (g) {
    case 'clear': return day ? sun(32, 32, 11) : moon(0, 0, 1);
    case 'mostly': return (day ? sun(27, 27, 10.5) : moon(-3, -3, 0.95)) + cloud(16, 18, 0.62);
    case 'partly': return smallSky + cloud(3, 2, 1);
    case 'overcast': return cloud(-8, -7, 0.82, 'var(--wx-cloud-2)') + cloud(-1, 1, 1);
    case 'fog': return cloud(-2, -12, 0.9, 'var(--wx-cloud-2)') + fog;
    case 'drizzle': return upCloud() + drizzle();
    case 'freezing': return upCloud() + drops(2) + ice();
    case 'rain': return upCloud() + drops(code >= 65 ? 3 : code >= 63 ? 2 : 1);
    case 'snow': return upCloud() + flakes();
    case 'showers': return smallSky + cloud(2, -4, 0.95) + drops(code >= 82 ? 3 : 2, 48);
    case 'snowshowers': return smallSky + cloud(2, -4, 0.95) + flakes(52);
    case 'storm': return upCloud('var(--wx-cloud-2)') + bolt + (code >= 96 ? hail : '');
    case 'hail': return upCloud('var(--wx-cloud-2)') + hail;
    default: return cloud(-1, 0, 1);
  }
}

/** Ícone de tempo completo (SVG inline). anim: as peças mexem (sol, chuva, neve, trovoada…) — só nos ícones grandes. */
export function weatherIcon(code, isDay = true, size = 48, label = '', anim = false) {
  const a = label ? `role="img" aria-label="${escAttr(label)}"` : 'aria-hidden="true"';
  return `<svg class="wx${anim ? ' anim' : ''}" width="${size}" height="${size}" viewBox="0 0 64 64" ${a}>${weatherIconInner(code, isDay)}</svg>`;
}

// ---------- interface ----------
const UI = {
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  gps: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
  star: '<path d="M12 3.6l2.6 5.2 5.8.9-4.2 4.1 1 5.7L12 16.8l-5.2 2.7 1-5.7-4.2-4.1 5.8-.9z"/>',
  chevron: '<path d="M6.5 9.5L12 15l5.5-5.5"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  sparkle: '<path d="M12 3.5c.7 4.6 2.9 6.8 7.5 7.5-4.6.7-6.8 2.9-7.5 7.5-.7-4.6-2.9-6.8-7.5-7.5 4.6-.7 6.8-2.9 7.5-7.5z"/><path d="M19 3v3M17.5 4.5h3"/>',
  flame: '<path d="M12 21c-3.6 0-6.3-2.5-6.3-6 0-3.3 2.3-5.4 3.8-8.3.4 2 1.5 3.2 2.9 3.9.3-2.6 1.4-4.9 3.4-6.8.6 3.5 3.5 5.9 3.5 10.4 0 4-2.9 6.8-7.3 6.8z"/>',
  satellite: '<path d="M8.5 8.5l3-3 7 7-3 3z"/><path d="M5.5 5.5l3 3M15.5 15.5l3 3"/><path d="M3 8l5-5M16 21l5-5"/><path d="M5 14a5 5 0 0 0 5 5"/>',
  wind: '<path d="M3 8.5h10.5a2.8 2.8 0 1 0-2.8-2.8"/><path d="M3 12.5h15a2.8 2.8 0 1 1-2.8 2.8"/><path d="M3 16.5h6"/>',
  drop: '<path d="M12 3.5s6 6.4 6 10.6a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z"/>',
  gauge: '<path d="M4.3 17a8.5 8.5 0 1 1 15.4 0"/><path d="M12 15.5l3.6-5"/><circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  cloud: '<path d="M7.2 18.5h9.6a4.2 4.2 0 0 0 .6-8.4 6 6 0 0 0-11.5 1.6 3.4 3.4 0 0 0 1.3 6.8z"/>',
  bolt: '<path d="M13 2.5L5.5 13.5H11l-1 8 7.5-11H12z"/>',
  fog: '<path d="M4 8.5h16M3 12.5h18M5 16.5h14"/>',
  frost: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6"/><path d="M9.6 4.4L12 5.9l2.4-1.5M9.6 19.6L12 18.1l2.4 1.5"/>',
  heat: '<path d="M14 14.4V5.2a2 2 0 0 0-4 0v9.2a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  layers: '<path d="M12 3.5l8.5 4.6L12 12.7 3.5 8.1z"/><path d="M3.5 12.4l8.5 4.6 8.5-4.6"/><path d="M3.5 16.4l8.5 4.6 8.5-4.6"/>',
  check: '<path d="M4.5 12.5l4.5 4.5L19.5 6.5"/>',
  alert: '<path d="M12 3.8l9 15.7H3z"/><path d="M12 10v4.4"/><circle cx="12" cy="17.1" r=".9" fill="currentColor" stroke="none"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.3"/><circle cx="12" cy="7.9" r=".95" fill="currentColor" stroke="none"/>',
  arrow: '<path d="M12 19.5V4.5M6.5 10L12 4.5 17.5 10"/>',
  install: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  share: '<path d="M12 3.5v11M8 7.3l4-3.8 4 3.8"/><path d="M8 10.5H6v10h12v-10h-2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  rain: '<path d="M7.2 14.5h9.6a4.2 4.2 0 0 0 .6-8.4 6 6 0 0 0-11.5 1.6 3.4 3.4 0 0 0 1.3 6.8z"/><path d="M9 17.5l-1 2.5M13 17.5l-1 2.5M17 17.5l-1 2.5"/>',
  snow: '<path d="M12 4v16M5.1 8l13.8 8M5.1 16l13.8-8"/>',
  waves: '<path d="M2.5 9c2 0 2-1.5 4-1.5S8.5 9 10.5 9s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5"/><path d="M2.5 14c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5"/><path d="M2.5 19c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5"/>',
  station: '<path d="M12 21V10"/><path d="M8 21h8"/><circle cx="12" cy="7" r="2.5"/><path d="M7.5 3.5a6.5 6.5 0 0 0 0 7M16.5 3.5a6.5 6.5 0 0 1 0 7"/>',
  relief: '<path d="M2.5 19.5l6-9.5 3.6 5.4 2.4-3.4 7 7.5z"/><path d="M7.2 12.1l1.3 1.4 1.4-1.3"/>',
  radar: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5a4.5 4.5 0 1 1-4.5 4.5"/><path d="M12 12l5.6-5.6"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
  person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20.5a7 7 0 0 1 14 0"/>',
  signal1: '<rect x="4" y="15" width="3.5" height="5" rx="1" fill="currentColor" stroke="none"/><rect x="10.25" y="10" width="3.5" height="10" rx="1"/><rect x="16.5" y="5" width="3.5" height="15" rx="1"/>',
  signal2: '<rect x="4" y="15" width="3.5" height="5" rx="1" fill="currentColor" stroke="none"/><rect x="10.25" y="10" width="3.5" height="10" rx="1" fill="currentColor" stroke="none"/><rect x="16.5" y="5" width="3.5" height="15" rx="1"/>',
  signal3: '<rect x="4" y="15" width="3.5" height="5" rx="1" fill="currentColor" stroke="none"/><rect x="10.25" y="10" width="3.5" height="10" rx="1" fill="currentColor" stroke="none"/><rect x="16.5" y="5" width="3.5" height="15" rx="1" fill="currentColor" stroke="none"/>',
};

export function ui(name, cls = '', label = '') {
  const a = label ? `role="img" aria-label="${escAttr(label)}"` : 'aria-hidden="true"';
  return `<svg class="i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" ${a} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${UI[name] || ''}</svg>`;
}

export function escAttr(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
