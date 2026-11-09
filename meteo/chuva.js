// O gráfico da chuva das próximas 2 horas desenhado pela Onda (onda/chuva.onda → WebAssembly): as barras enchem-se
// como água e a chuva cai lá para dentro. Aqui só se passam os valores, se anda o tempo e se copiam os píxeis para um
// canvas; os textos ficam no SVG por cima (charts.js). Pára quando o gráfico sai do ecrã.
import { CHUVA_WASM } from './onda/chuva-wasm.js';

let X = null, mem = null, estado = 0n;
function onda() {
    if (X) return X;
    const sys = (c, a) => {
        switch (Number(c)) {
            case 2: throw { ondaExit: Number(a) };
            case 6: return BigInt(Math.round(performance.now() * 1000));
            case 7: { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
        }
        return 0n;
    };
    const m1 = (c, x) => [Math.sin, Math.cos, Math.exp, Math.log][Number(c)](x);
    const m2 = (c, x, y) => (Number(c) === 0 ? Math.pow(x, y) : Math.atan2(x, y));
    const bytes = Uint8Array.from(atob(CHUVA_WASM), (ch) => ch.charCodeAt(0));
    X = new WebAssembly.Instance(new WebAssembly.Module(bytes), { env: { sys, m1, m2 } }).exports;
    mem = X.memory;
    try { X._start(); } catch (e) { if (!e || e.ondaExit === undefined) throw e; }
    estado = X.chuva();
    return X;
}
export const ondaOk = () => { try { return !!onda(); } catch { return false; } };

let atual = null; // só há um gráfico destes no ecrã
/** Liga o campo ao canvas: valores (mm em cada 15 min) e o topo da escala. anim = false: uma imagem parada. */
export function rainField(canvas, values, top, { anim = true } = {}) {
    const O = onda();
    atual?.stop();
    const n = Math.min(values.length, 16);
    new Float64Array(mem.buffer, (Number(O.calvo(estado)) + 16) * 8, n).set(values.slice(0, n).map((v) => Math.max(0, v || 0)));
    O.cfixa(estado, BigInt(n), top);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let img = null, w = 0, h = 0, raf = 0, last = 0, vis = true, parado = false;
    const pinta = () => {
        const cw = Math.max(2, Math.round(canvas.clientWidth * dpr)), ch = Math.max(2, Math.round(canvas.clientHeight * dpr));
        if (cw !== w || ch !== h) { w = cw; h = ch; canvas.width = w; canvas.height = h; img = ctx.createImageData(w, h); }
        const end = O.cdesenha(estado, BigInt(w), BigInt(h));
        const src = new Uint32Array(mem.buffer, (Number(end) + 16) * 8, w * h * 2), dst = new Uint32Array(img.data.buffer);
        for (let i = 0, m = w * h; i < m; i++) dst[i] = src[i << 1];
        ctx.putImageData(img, 0, 0);
    };
    // no ecrã? decide cada imagem (o retângulo do canvas); o observador, o deslocar e o voltar à app só o põem a andar
    // de novo (no iPhone o observador pode dizer «fora do ecrã» a um canvas acabado de pôr na página)
    const kick = () => { if (anim && !raf && !parado && canvas.isConnected) raf = requestAnimationFrame(frame); };
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(kick) : null;
    window.addEventListener('scroll', kick, { passive: true });
    document.addEventListener('visibilitychange', kick);
    const frame = (now) => {
        raf = 0;
        if (parado || !canvas.isConnected) { me.stop(); return; }
        const dt = last ? Math.min(100, now - last) : 16;
        last = now;
        O.cpasso(estado, dt);
        pinta();
        const r = canvas.getBoundingClientRect();
        vis = r.bottom > 0 && r.top < (window.innerHeight || 1e4) && document.visibilityState !== 'hidden';
        if (anim && vis) raf = requestAnimationFrame(frame); else last = 0;
    };
    const me = { stop() { parado = true; if (raf) cancelAnimationFrame(raf); raf = 0; io?.disconnect(); window.removeEventListener('scroll', kick); document.removeEventListener('visibilitychange', kick); if (atual === me) atual = null; } };
    atual = me;
    io?.observe(canvas);
    if (anim) frame(performance.now());
    else { O.cpasso(estado, 1e6); pinta(); } // parado: já cheio
    return me;
}

/** Para os testes (Node): os píxeis RGBA (uma palavra cada) do campo w × h, depois de ms de animação. */
export function ondaPixels(values, top, w, h, ms = 1e6) {
    const O = onda();
    new Float64Array(mem.buffer, (Number(O.calvo(estado)) + 16) * 8, values.length).set(values);
    O.cfixa(estado, BigInt(values.length), top);
    O.cpasso(estado, ms);
    const end = O.cdesenha(estado, BigInt(w), BigInt(h));
    const src = new Uint32Array(mem.buffer, (Number(end) + 16) * 8, w * h * 2);
    return Uint32Array.from({ length: w * h }, (_, i) => src[i << 1]);
}
