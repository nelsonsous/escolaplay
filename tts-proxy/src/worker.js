// EscolaPlay TTS proxy — Cloudflare Worker
//
// Faz proxy do Microsoft Edge Read-Aloud TTS (WebSocket) para um GET HTTPS
// que devolve um MP3. Resolve o silêncio em iOS Safari, onde o WebSocket
// para a Microsoft é estrangulado pela Apple em modo PWA.
//
// Endpoint:
//   GET /?text=...&voice=pt-PT-RaquelNeural&lang=pt-PT
//
// Devolve: audio/mpeg (MP3, 24 kHz, 48 kbps mono) com Cache-Control longo.
// O Cloudflare Cache memoriza a resposta — só a primeira chamada da mesma
// frase vai à Microsoft.

const EDGE_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
};

async function secToken() {
    const WIN_EPOCH = 11644473600;
    let ticks = Math.floor(Date.now() / 1000) + WIN_EPOCH;
    ticks -= ticks % 300;
    ticks *= 1e9 / 100;
    const data = new TextEncoder().encode(String(ticks) + EDGE_TOKEN);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function uuidHex() {
    return crypto.randomUUID().replace(/-/g, '');
}

function xmlEsc(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/'/g, '&apos;').replace(/"/g, '&quot;');
}

function concatChunks(chunks) {
    const total = chunks.reduce((s, c) => s + c.byteLength, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const c of chunks) { out.set(new Uint8Array(c), pos); pos += c.byteLength; }
    return out.buffer;
}

async function synth(text, voice, lang, rate, pitch) {
    const token = await secToken();
    const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${EDGE_TOKEN}&Sec-MS-GEC=${token}&Sec-MS-GEC-Version=1-130.0.2849.68`;

    const resp = await fetch(wsUrl, { headers: { 'Upgrade': 'websocket' } });
    const ws = resp.webSocket;
    if (!ws) throw new Error('upstream did not upgrade to ws');
    ws.accept();

    return new Promise((resolve, reject) => {
        const chunks = [];
        const to = setTimeout(() => { try { ws.close(); } catch {} reject(new Error('timeout')); }, 15000);
        const settle = (ok) => {
            clearTimeout(to);
            try { ws.close(); } catch {}
            if (ok && chunks.length) resolve(concatChunks(chunks));
            else reject(new Error('no audio'));
        };

        ws.addEventListener('message', (ev) => {
            const data = ev.data;
            if (typeof data === 'string') {
                if (data.indexOf('Path:turn.end') !== -1) settle(true);
            } else {
                try {
                    const buf = data instanceof ArrayBuffer ? data : data;
                    const view = new DataView(buf);
                    const hLen = view.getUint16(0);
                    chunks.push(buf.slice(2 + hLen));
                } catch {}
            }
        });
        ws.addEventListener('error', () => { clearTimeout(to); reject(new Error('ws error')); });
        ws.addEventListener('close', () => {
            clearTimeout(to);
            if (chunks.length) resolve(concatChunks(chunks));
            else reject(new Error('closed without audio'));
        });

        try {
            ws.send(`X-Timestamp:${new Date().toString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`);

            const safe = xmlEsc(text);
            const withBreaks = (text.length > 60 && !/<break|<prosody|<voice/i.test(text))
                ? safe.replace(/([\.\!\?])\s+/g, '$1 <break time="180ms"/> ')
                      .replace(/([,;:])\s+/g, '$1 <break time="80ms"/> ')
                : safe;

            const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'><voice name='${voice}'><prosody rate='${rate}' pitch='${pitch}'>${withBreaks}</prosody></voice></speak>`;
            ws.send(`X-RequestId:${uuidHex()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toString()}\r\nPath:ssml\r\n\r\n${ssml}`);
        } catch (e) {
            clearTimeout(to);
            reject(e);
        }
    });
}

export default {
    async fetch(req) {
        if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
        if (req.method !== 'GET') return new Response('method not allowed', { status: 405, headers: CORS });

        const url = new URL(req.url);
        const text = (url.searchParams.get('text') || '').trim();
        if (!text) return new Response('missing text', { status: 400, headers: CORS });
        if (text.length > 1500) return new Response('text too long (max 1500)', { status: 413, headers: CORS });

        const voice = (url.searchParams.get('voice') || 'pt-PT-RaquelNeural').slice(0, 60);
        const isPT = voice.startsWith('pt-');
        const lang = (url.searchParams.get('lang') || (isPT ? 'pt-PT' : 'en-US')).slice(0, 8);
        const rate = (url.searchParams.get('rate') || (isPT ? '+3%' : '+10%')).slice(0, 6);
        const pitch = (url.searchParams.get('pitch') || (isPT ? '+2%' : '0%')).slice(0, 6);

        // Cache no edge da Cloudflare — segunda chamada da mesma frase serve do CDN.
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), { method: 'GET' });
        const cached = await cache.match(cacheKey);
        if (cached) return cached;

        try {
            const buf = await synth(text, voice, lang, rate, pitch);
            const res = new Response(buf, {
                status: 200,
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Cache-Control': 'public, max-age=2592000, immutable',
                    'Content-Length': String(buf.byteLength),
                    ...CORS,
                },
            });
            cache.put(cacheKey, res.clone());
            return res;
        } catch (e) {
            return new Response('tts failed: ' + (e && e.message || 'unknown'), { status: 502, headers: CORS });
        }
    },
};
