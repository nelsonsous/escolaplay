// Céu animado do cartão «Agora»: o tempo que faz, a mexer por trás da temperatura — chuva a cair (mais gotas e mais
// inclinadas com mais chuva e vento), neve, nuvens a passar (mais depressa com vento), o brilho do sol ou da lua,
// estrelas, nevoeiro e relâmpagos. Desde a 1.18 é um campo da Onda na placa gráfica (onda/ceu.onda → GLSL, startSky);
// o céu em HTML e CSS (skyHtml) fica por baixo, para os telemóveis sem WebGL2. As posições são sempre as mesmas para o
// mesmo tempo (sem acaso verdadeiro) e a fase segue um relógio, por isso redesenhar a página não faz saltar.
import { wxGroup } from './format.js';
import { CEU_GLSL } from './onda/ceu-glsl.js';

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
        case 'drizzle': s.clouds = 2; s.rain = 90; s.drizzle = true; break;
        case 'freezing': s.clouds = 2; s.rain = 90; s.hail = 4; break;
        case 'rain': s.clouds = 3; s.rain = code >= 65 ? 230 : code >= 63 ? 150 : 95; break;
        case 'showers': s.clouds = 2; s.glow = true; s.rain = code >= 82 ? 220 : code >= 81 ? 150 : 100; break;
        case 'snow': s.clouds = 2; s.snow = code >= 75 ? 26 : code >= 73 ? 18 : 12; break;
        case 'snowshowers': s.clouds = 2; s.glow = true; s.snow = code >= 86 ? 22 : 14; break;
        case 'storm': s.clouds = 3; s.dark = true; s.rain = 210; s.flash = true; s.hail = code >= 96 ? 6 : 0; break;
        case 'hail': s.clouds = 3; s.dark = true; s.rain = 110; s.hail = 8; break;
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
    // chuva: desenhada num canvas (startRain): gotas em três profundidades e salpicos no fundo; mais vento, mais inclinada
    const slant = clamp(5 + w * 0.35, 5, 24);
    if (s.rain) h += `<canvas class="sky-rain" data-n="${s.rain}" data-dz="${s.drizzle ? 1 : 0}" data-a="${f1(slant)}"></canvas>`;
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
    return `<div class="sky" aria-hidden="true" data-sky="${s.group}" data-p="${skyParams(code, isDay, wind).map((v) => +v.toFixed(3)).join(',')}" style="--a:${f1(slant)}deg">${h}</div>`;
}

/**
 * Os números do céu em Onda (ceu.onda, u[3..7]) para um código de tempo: chuva, neve, nuvens e vento (0..1) e o modo
 * (bits: 1 dia, 2 brilho do sol ou da lua, 4 nevoeiro, 8 relâmpago, 16 granizo, 32 céu escuro, 64 morrinha).
 */
export function skyParams(code, isDay = true, wind = 0) {
    const s = skyScene(code, isDay);
    const modo = (s.day ? 1 : 0) | (s.glow ? 2 : 0) | (s.fog ? 4 : 0) | (s.flash ? 8 : 0) | (s.hail ? 16 : 0) | (s.dark ? 32 : 0) | (s.drizzle ? 64 : 0);
    const rain = s.drizzle ? 0.6 : clamp(s.rain / 230, 0, 1); // morrinha: muitas gotas curtas
    return [rain, clamp(s.snow / 26, 0, 1), clamp(s.clouds / 3, 0, 1), clamp((Number.isFinite(wind) ? wind : 0) / 80, 0, 1), modo];
}

// ---------- o céu na placa gráfica (campo da Onda) ----------
// Um só canvas WebGL2 para a app inteira: quando a página se redesenha, muda-se para o cartão novo (criar um contexto
// por desenho seria lento e o browser limita-os). Sai preto onde não há nada e mistura-se no cartão em modo «screen»
// (meteo.css: .sky.gl), por isso só acrescenta luz. 30 imagens por segundo, só quando está à vista.
const GL = { ok: null, canvas: null, gl: null, u: null, p: [0, 0, 0, 0, 0], raf: 0, last: 0, frames: 0, err: '', hold: 0 };
const GL_SCALE = () => Math.min(1.5, window.devicePixelRatio || 1); // o céu é suave: 1,5 píxeis por ponto chega
function glInit() {
    if (GL.ok !== null) return GL.ok;
    GL.ok = false;
    try {
        const c = document.createElement('canvas');
        c.className = 'sky-gl';
        const gl = c.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' });
        if (!gl) { GL.err = 'sem WebGL2'; return false; }
        const sh = (type, src) => {
            const o = gl.createShader(type);
            gl.shaderSource(o, src); gl.compileShader(o);
            if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o) || 'shader');
            return o;
        };
        const pr = gl.createProgram();
        gl.attachShader(pr, sh(gl.VERTEX_SHADER, '#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
        gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, CEU_GLSL));
        gl.bindAttribLocation(pr, 0, 'p');
        gl.linkProgram(pr);
        if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr) || 'link');
        gl.useProgram(pr);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        GL.u = gl.getUniformLocation(pr, 'u');
        // a placa gráfica pode tirar o contexto (memória, segundo plano): volta o céu em CSS
        c.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            GL.ok = false; GL.err = 'contexto perdido';
            cancelAnimationFrame(GL.raf); GL.raf = 0;
            const sky = c.parentNode;
            c.remove();
            if (sky) { sky.classList.remove('gl'); startRain(sky.querySelector('.sky-rain')); }
        });
        GL.canvas = c; GL.gl = gl; GL.ok = true;
    } catch (e) { GL.ok = false; GL.err = String(e?.message || e).slice(0, 200); }
    return GL.ok;
}
function glDraw(t) {
    const c = GL.canvas, gl = GL.gl, k = GL_SCALE();
    const w = Math.max(1, Math.round(c.clientWidth * k)), h = Math.max(1, Math.round(c.clientHeight * k));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    gl.viewport(0, 0, w, h);
    gl.uniform1fv(GL.u, new Float32Array([t % 600, w, h, ...GL.p])); // t dá a volta de 10 em 10 min (a precisão de 32 bits)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    GL.frames++;
}
function glLoop(now) {
    GL.raf = 0;
    const c = GL.canvas;
    if (!GL.ok || !c?.isConnected) return; // o cartão saiu da página: pára até o próximo startSky
    if (!document.hidden && now >= GL.hold && now - GL.last >= 32) {
        const r = c.getBoundingClientRect();
        if (r.width > 0 && r.bottom > 0 && r.top < window.innerHeight) { GL.last = now; glDraw(now / 1000); }
    }
    GL.raf = requestAnimationFrame(glLoop);
}
/** Pára o céu durante ms (enquanto a página anda com o dedo ou troca de separador): menos trabalho, sem tremer. */
export function pauseSky(ms) { GL.hold = Math.max(GL.hold, performance.now() + ms); }
/** Liga o céu da Onda ao .sky do cartão (lê os números de data-p). false: sem WebGL2, fica o céu em CSS. */
export function startSky(sky) {
    if (!sky?.dataset.p || !glInit()) return false;
    GL.p = sky.dataset.p.split(',').map(Number);
    if (GL.canvas.parentNode !== sky) sky.append(GL.canvas);
    sky.classList.add('gl');
    glDraw(performance.now() / 1000); // já, para não piscar a preto
    if (!GL.raf) GL.raf = requestAnimationFrame(glLoop);
    return true;
}
/** Para os testes: o estado do céu da Onda e, com t, uma imagem desenhada nesse instante (RGBA, de baixo para cima). */
export function skyGL(t) {
    const o = { on: !!GL.ok && !!GL.canvas?.isConnected, frames: GL.frames, err: GL.err, p: GL.p.slice(), w: GL.canvas?.width || 0, h: GL.canvas?.height || 0 };
    if (t != null && o.on) {
        glDraw(t);
        const gl = GL.gl, px = new Uint8Array(o.w * o.h * 4);
        gl.readPixels(0, 0, o.w, o.h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        o.px = px;
    }
    return o;
}

// ---------- chuva no canvas ----------
// Cada gota tem profundidade z (0 longe .. 1 perto): as de perto são mais compridas, mais grossas, mais claras e mais
// rápidas (paralaxe); caem inclinadas pelo vento e, as de perto, rebentam em salpicos perto do fundo do cartão.
// O estado fica no módulo: quando a página se redesenha (canvas novo), a chuva continua de onde ia.
const RAIN = { drops: [], splash: [], key: '', canvas: null, raf: 0, last: 0, io: null, vis: true, frames: 0 };
function seedDrop(d, w, h, top) {
    const z = Math.random() ** 1.6; // mais gotas ao longe
    d.z = z;
    d.x = Math.random() * (w * 1.3) - w * 0.15;
    d.y = top ? -Math.random() * h * 0.3 : Math.random() * h;
    d.v = (0.75 + 0.9 * z) * h * (0.9 + Math.random() * 0.25); // px por segundo
    d.l = (5 + 22 * z) * (0.85 + Math.random() * 0.3);
    d.end = h * (0.82 + 0.18 * Math.random()) + 4 * z; // onde rebenta (as de perto, mais abaixo)
    return d;
}
/** Liga (ou volta a ligar, se a página se redesenhou) a chuva a um canvas.sky-rain. */
export function startRain(canvas) {
    if (!canvas || typeof window === 'undefined') return;
    const n = Number(canvas.dataset.n) || 0, dz = canvas.dataset.dz === '1', ang = (Number(canvas.dataset.a) || 8) * Math.PI / 180;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const key = `${n}:${dz}`;
    // a página redesenhou-se (canvas novo): a imagem que estava marcada era do canvas antigo, e esse ciclo acaba —
    // por isso cancela-se e começa-se já o deste (senão a chuva parava ao fim de um segundo)
    if (RAIN.raf) cancelAnimationFrame(RAIN.raf);
    RAIN.raf = 0;
    RAIN.canvas = canvas;
    // Quem decide se está no ecrã é cada imagem (o retângulo do canvas), não o IntersectionObserver: no iPhone ele pode
    // dizer «fora do ecrã» para um canvas acabado de pôr na página, e a chuva parava. Fora do ecrã, o ciclo pára; volta
    // com o observador, ao deslocar a página ou quando a app volta a ficar visível.
    const kick = () => { if (!RAIN.raf && RAIN.canvas === canvas && canvas.isConnected) RAIN.raf = requestAnimationFrame(frame); };
    RAIN.kick = kick;
    RAIN.io?.disconnect();
    RAIN.io = 'IntersectionObserver' in window ? new IntersectionObserver(() => RAIN.kick?.()) : null;
    RAIN.io?.observe(canvas);
    if (!RAIN.listening) {
        RAIN.listening = true;
        window.addEventListener('scroll', () => RAIN.kick?.(), { passive: true });
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') RAIN.kick?.(); });
        window.addEventListener('pageshow', () => RAIN.kick?.());
    }
    const tanA = Math.tan(ang), sinA = Math.sin(ang), cosA = Math.cos(ang);
    function frame(now) {
        RAIN.raf = 0;
        RAIN.frames++;
        if (RAIN.canvas !== canvas || !canvas.isConnected) return;
        // 30 imagens por segundo chegam para a chuva e poupam bateria
        if (RAIN.last && now - RAIN.last < 30) { RAIN.raf = requestAnimationFrame(frame); return; }
        const W = canvas.clientWidth, H = canvas.clientHeight;
        if (!W || !H) { RAIN.raf = requestAnimationFrame(frame); return; } // ainda sem tamanho: tenta na próxima imagem
        const r = canvas.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= (window.innerHeight || 1e4) || document.visibilityState === 'hidden') { RAIN.vis = false; RAIN.last = 0; return; }
        RAIN.vis = true;
        if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
        if (RAIN.key !== key || RAIN.w !== W || RAIN.h !== H) {
            RAIN.drops = Array.from({ length: n }, () => seedDrop({}, W, H, false));
            RAIN.splash = []; RAIN.key = key; RAIN.w = W; RAIN.h = H;
        }
        const dt = RAIN.last ? Math.min(0.05, (now - RAIN.last) / 1000) : 0.016;
        RAIN.last = now;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.lineCap = 'round';
        // três camadas (longe, meio, perto): um caminho por camada
        for (const [z0, z1, alpha, lw] of [[0, 0.35, 0.22, 0.7], [0.35, 0.7, 0.38, 1.0], [0.7, 1.01, 0.5, 1.4]]) {
            ctx.beginPath();
            for (const d of RAIN.drops) {
                if (d.z < z0 || d.z >= z1) continue;
                const len = dz ? 2 + d.l * 0.15 : d.l;
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x + len * sinA, d.y - len * cosA); // o rasto fica para trás (cima, contra o vento)
            }
            ctx.strokeStyle = `rgba(175, 205, 255, ${dz ? alpha * 0.9 : alpha})`;
            ctx.lineWidth = dz ? lw * 1.2 : lw;
            ctx.stroke();
        }
        // salpicos: um arco que se abre e duas gotinhas que saltam
        if (!dz) {
            ctx.lineWidth = 0.8;
            for (const s of RAIN.splash) {
                const k = s.t / 0.32, a = (1 - k) * 0.55 * s.z;
                ctx.strokeStyle = `rgba(190, 215, 255, ${a.toFixed(3)})`;
                ctx.beginPath();
                ctx.ellipse(s.x, s.y, 2 + 9 * k * s.z, 0.8 + 2.2 * k * s.z, 0, Math.PI, 2 * Math.PI);
                ctx.stroke();
                ctx.fillStyle = ctx.strokeStyle;
                for (const sd of [-1, 1]) {
                    const px = s.x + sd * (3 + 7 * k) * s.z, py = s.y - (9 * k - 12 * k * k) * s.z * 1.4;
                    ctx.fillRect(px - 0.6, py - 0.6, 1.2, 1.2);
                }
            }
        }
        // andar
        for (const d of RAIN.drops) {
            d.y += d.v * dt;
            d.x += d.v * dt * tanA * -1;
            if (d.y >= d.end) {
                if (!dz && d.z > 0.55 && RAIN.splash.length < 40) RAIN.splash.push({ x: d.x, y: d.end, z: d.z, t: 0 });
                seedDrop(d, W, H, true);
            }
        }
        for (const s of RAIN.splash) s.t += dt;
        RAIN.splash = RAIN.splash.filter((s) => s.t < 0.32);
        RAIN.raf = requestAnimationFrame(frame);
    }
    RAIN.raf = requestAnimationFrame(frame);
}

/** Para os testes: quantas imagens a chuva já desenhou (deve continuar a subir depois de a página se redesenhar). */
export const rainFrames = () => RAIN.frames;
