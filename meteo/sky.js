// Céu animado do cartão «Agora»: o tempo que faz, a mexer por trás da temperatura — chuva a cair (mais gotas e mais
// inclinadas com mais chuva e vento), neve, nuvens a passar (mais depressa com vento), o brilho do sol ou da lua,
// estrelas, nevoeiro e relâmpagos. Só HTML e CSS (transform e opacity): leve no telemóvel. As posições são sempre as
// mesmas para o mesmo tempo (sem acaso verdadeiro) e a fase segue um relógio, por isso redesenhar a página não faz saltar.
import { wxGroup } from './format.js';

function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const f1 = (x) => (Math.round(x * 10) / 10).toString();

/** O que o céu mostra para um código de tempo (WMO): quantas gotas, flocos, nuvens, estrelas… */
export function skyScene(code, isDay = true) {
    const g = wxGroup(code), day = isDay !== false;
    const s = { group: g, day, rain: 0, snow: 0, hail: 0, clouds: 0, dark: false, glow: false, stars: 0, fog: 0, flash: false, drizzle: false };
    switch (g) {
        case 'clear': s.glow = true; s.stars = day ? 0 : 24; break;
        case 'mostly': s.glow = true; s.clouds = 1; s.stars = day ? 0 : 14; break;
        case 'partly': s.glow = true; s.clouds = 2; s.stars = day ? 0 : 8; break;
        case 'overcast': s.clouds = 3; break;
        case 'fog': s.fog = 3; s.clouds = 1; break;
        case 'drizzle': s.clouds = 2; s.rain = 10; s.drizzle = true; break;
        case 'freezing': s.clouds = 2; s.rain = 14; s.hail = 4; break;
        case 'rain': s.clouds = 3; s.rain = code >= 65 ? 34 : code >= 63 ? 22 : 14; break;
        case 'showers': s.clouds = 2; s.glow = true; s.rain = code >= 82 ? 30 : code >= 81 ? 20 : 14; break;
        case 'snow': s.clouds = 2; s.snow = code >= 75 ? 26 : code >= 73 ? 18 : 12; break;
        case 'snowshowers': s.clouds = 2; s.glow = true; s.snow = code >= 86 ? 22 : 14; break;
        case 'storm': s.clouds = 3; s.dark = true; s.rain = 26; s.flash = true; s.hail = code >= 96 ? 6 : 0; break;
        case 'hail': s.clouds = 3; s.dark = true; s.rain = 16; s.hail = 8; break;
        default: s.clouds = 2;
    }
    return s;
}

/**
 * HTML do céu (decorativo: aria-hidden). wind = km/h (nuvens mais rápidas e chuva mais inclinada); t = segundos de um
 * relógio que não pára (performance.now() / 1000), para a animação continuar de onde ia quando a página se redesenha.
 */
export function skyHtml(code, isDay = true, { wind = 0, t = 0 } = {}) {
    if (!Number.isFinite(code)) return '';
    const s = skyScene(code, isDay);
    const r = rng(1000 + code * 7 + (s.day ? 1 : 0));
    const w = clamp(Number.isFinite(wind) ? wind : 0, 0, 80);
    const at = (dur, off) => `-${f1((t + off * dur) % dur)}s`; // atraso negativo: já vai a meio
    let h = '';
    if (s.glow) h += `<i class="sky-glow${s.day ? '' : ' moon'}"></i>`;
    for (let k = 0; k < s.stars; k++) {
        const d = 2.6 + r() * 3.6, z = 1.4 + r() * 1.4;
        h += `<i class="sky-st" style="left:${f1(r() * 96 + 2)}%;top:${f1(r() * 62 + 3)}%;width:${f1(z)}px;height:${f1(z)}px;animation-duration:${f1(d)}s;animation-delay:${at(d, r())}"></i>`;
    }
    for (let k = 0; k < s.clouds; k++) {
        const cw = 62 + r() * 34, d = clamp(120 - w * 2.2, 34, 120) * (0.8 + r() * 0.5);
        const to = Math.round(10000 / cw + 12);
        h += `<i class="sky-c${s.dark ? ' dark' : ''}" style="top:${f1(-22 + k * 24 + r() * 10)}%;width:${f1(cw)}%;height:${f1(46 + r() * 22)}%;--to:${to}%;animation-duration:${f1(d)}s;animation-delay:${at(d, (k + r() * 0.6) / Math.max(1, s.clouds))}"></i>`;
    }
    for (let k = 0; k < s.fog; k++) {
        const d = 9 + r() * 6;
        h += `<i class="sky-f" style="top:${f1(14 + k * 26 + r() * 6)}%;animation-duration:${f1(d)}s;animation-delay:${at(d, r())}"></i>`;
    }
    // chuva: cada gota cai numa «pista» à altura do cartão; mais vento, mais inclinada
    const slant = clamp(5 + w * 0.35, 5, 24);
    for (let k = 0; k < s.rain; k++) {
        const d = (s.drizzle ? 1.5 : 0.62) + r() * (s.drizzle ? 0.9 : 0.5);
        h += `<i class="sky-r${s.drizzle ? ' dz' : ''}" style="left:${f1(((k + r()) / s.rain) * 132 - 2)}%;--o:${f1(0.35 + r() * 0.5)};--l:${Math.round(10 + r() * 12)}px;animation-duration:${f1(d)}s;animation-delay:${at(d, r())}"></i>`;
    }
    for (let k = 0; k < s.hail; k++) {
        const d = 0.9 + r() * 0.5;
        h += `<i class="sky-h" style="left:${f1(((k + r()) / s.hail) * 128)}%;animation-duration:${f1(d)}s;animation-delay:${at(d, r())}"></i>`;
    }
    for (let k = 0; k < s.snow; k++) {
        const d = 6 + r() * 6, z = 3 + r() * 3;
        h += `<i class="sky-s" style="left:${f1(((k + r()) / s.snow) * 104 - 2)}%;--z:${f1(z)}px;--o:${f1(0.4 + r() * 0.5)};--sw:${f1(2.4 + r() * 2.2)}s;animation-duration:${f1(d)}s;animation-delay:${at(d, r())}"></i>`;
    }
    if (s.flash) h += `<i class="sky-fl" style="animation-delay:${at(9, 0.4)}"></i>`;
    if (!h) return '';
    return `<div class="sky" aria-hidden="true" data-sky="${s.group}" style="--a:${f1(slant)}deg">${h}</div>`;
}
