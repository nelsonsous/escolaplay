// Inglês com o Claude — conector MCP «Voz Mistral» (Cloudflare Worker)
//
// As páginas publicadas no claude.ai não podem chamar sites externos, mas
// podem chamar os conectores MCP da conta. Este Worker é um servidor MCP
// mínimo (Streamable HTTP, sem estado, respostas em JSON) que dá à app a voz
// Voxtral do Mistral:
//
//   speak  { text, voice? } → MP3 em base64 em structuredContent.data
//   voices {}               → vozes de síntese disponíveis na conta Mistral
//
// A chave Mistral fica num segredo do Worker e nunca chega ao browser.
// O endereço do conector leva um código secreto: /mcp/<ACCESS_TOKEN>.
// Cada frase fica em cache no CDN da Cloudflare (a mesma frase só vai ao
// Mistral uma vez por região e por mês).
//
// Segredos (uma vez):
//   npx wrangler secret put MISTRAL_API_KEY
//   npx wrangler secret put ACCESS_TOKEN
// Opcionais (em [vars] no wrangler.toml): DEFAULT_VOICE, MISTRAL_TTS_MODEL.

const MISTRAL = 'https://api.mistral.ai/v1';
const DEFAULT_MODEL = 'voxtral-mini-tts-2603';
const DEFAULT_VOICE = 'gb_oliver_neutral';
const MAX_CHARS = 1000;
const LATEST_PROTOCOL = '2025-06-18';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id',
    'Access-Control-Max-Age': '86400',
};

const TOOLS = [
    {
        name: 'speak',
        title: 'Falar em inglês (voz Mistral)',
        description: 'Reads a short English text aloud with a Mistral Voxtral voice and returns the MP3 audio as base64 in structuredContent.data. Used by the "Inglês com o Claude" practice app; it is not useful in a chat.',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'English text to read aloud, at most 1000 characters.' },
                voice: { type: 'string', description: 'Mistral voice id, for example gb_oliver_neutral, gb_jane_neutral or en_paul_neutral. Optional.' },
            },
            required: ['text'],
            additionalProperties: false,
        },
        annotations: { title: 'Falar (voz Mistral)', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    {
        name: 'voices',
        title: 'Vozes Mistral',
        description: 'Lists the Mistral text-to-speech voice ids available to this account.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { title: 'Vozes Mistral', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
];

export default {
    async fetch(req, env, ctx) {
        if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
        const url = new URL(req.url);
        const parts = url.pathname.split('/').filter(Boolean);

        if (parts.length === 0) {
            return new Response('Voz Mistral: o Worker está a funcionar. O conector MCP está em /mcp/<ACCESS_TOKEN>.', {
                headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' },
            });
        }
        const token = env.ACCESS_TOKEN || '';
        if (parts.length !== 2 || parts[0] !== 'mcp' || !token || !safeEqual(parts[1], token)) {
            return new Response('not found', { status: 404, headers: CORS });
        }
        if (req.method === 'DELETE') return new Response(null, { status: 204, headers: CORS });
        if (req.method !== 'POST') {
            // Sem stream SSE do lado do servidor: só pedidos POST com resposta JSON.
            return new Response('method not allowed', { status: 405, headers: { ...CORS, Allow: 'POST, DELETE, OPTIONS' } });
        }

        let msg;
        try { msg = await req.json(); } catch { return json(rpcError(null, -32700, 'Parse error')); }

        if (Array.isArray(msg)) {
            const out = [];
            for (const m of msg) { const r = await handle(m, env, ctx); if (r) out.push(r); }
            return out.length ? json(out) : accepted();
        }
        const r = await handle(msg, env, ctx);
        return r ? json(r) : accepted();
    },
};

async function handle(m, env, ctx) {
    if (!m || typeof m !== 'object' || m.jsonrpc !== '2.0' || typeof m.method !== 'string') {
        return m && typeof m === 'object' && 'id' in m ? rpcError(m.id ?? null, -32600, 'Invalid Request') : null;
    }
    if (!('id' in m)) return null; // notificações (initialized, cancelled, …) não têm resposta
    const { id, method } = m;
    const params = m.params && typeof m.params === 'object' ? m.params : {};
    switch (method) {
        case 'initialize': {
            const asked = typeof params.protocolVersion === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.protocolVersion) ? params.protocolVersion : '';
            return rpcResult(id, {
                protocolVersion: asked || LATEST_PROTOCOL,
                capabilities: { tools: { listChanged: false } },
                serverInfo: { name: 'voz-mistral', title: 'Voz Mistral', version: '1.0.0' },
                instructions: 'Text-to-speech for the "Inglês com o Claude" app: the speak tool returns MP3 audio as base64.',
            });
        }
        case 'ping': return rpcResult(id, {});
        case 'tools/list': return rpcResult(id, { tools: TOOLS });
        case 'tools/call': return rpcResult(id, await callTool(params, env, ctx));
        case 'resources/list': return rpcResult(id, { resources: [] });
        case 'resources/templates/list': return rpcResult(id, { resourceTemplates: [] });
        case 'prompts/list': return rpcResult(id, { prompts: [] });
        default: return rpcError(id, -32601, 'Method not found: ' + method);
    }
}

async function callTool(params, env, ctx) {
    const args = params.arguments && typeof params.arguments === 'object' ? params.arguments : {};
    try {
        if (params.name === 'speak') return await speak(args, env, ctx);
        if (params.name === 'voices') return await voices(env);
        return toolError('Ferramenta desconhecida: ' + params.name);
    } catch (e) {
        return toolError('[500] ' + String((e && e.message) || e));
    }
}

async function speak(args, env, ctx) {
    const text = String(args.text || '').replace(/\s+/g, ' ').trim();
    if (!text) return toolError('[400] Falta o texto.');
    if (text.length > MAX_CHARS) return toolError('[400] Texto longo demais (máximo ' + MAX_CHARS + ' caracteres).');
    if (!env.MISTRAL_API_KEY) return toolError('[500] Falta o segredo MISTRAL_API_KEY no Worker.');
    const asked = String(args.voice || '');
    const voice = /^[A-Za-z0-9_.-]{1,64}$/.test(asked) ? asked : (env.DEFAULT_VOICE || DEFAULT_VOICE);
    const model = env.MISTRAL_TTS_MODEL || DEFAULT_MODEL;

    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const key = new Request('https://voz-mistral.cache/tts/' + model + '/' + voice + '/' + await sha256(text));
    let b64 = '';
    const hit = cache ? await cache.match(key) : null;
    if (hit) {
        b64 = await hit.text();
    } else {
        // A API rejeita campos extra: só model, input, voice_id/voice e response_format.
        const res = await fetch(MISTRAL + '/audio/speech', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + env.MISTRAL_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, input: text, voice_id: voice, voice, response_format: 'mp3' }),
        });
        if (!res.ok) {
            let detail = '';
            try { detail = (await res.text()).slice(0, 300); } catch {}
            return toolError('[' + res.status + '] ' + statusMessage(res.status) + (detail ? ' — ' + detail : ''));
        }
        const type = res.headers.get('content-type') || '';
        if (/json|text/i.test(type)) {
            // Algumas versões devolvem JSON com o áudio em base64.
            const j = await res.json().catch(() => null);
            const v = j && (j.audio_data || j.audio || j.audio_content || j.data || (j.output && j.output.audio));
            b64 = typeof v === 'string' ? v.replace(/^data:[^,]*,/, '') : '';
            if (!b64) return toolError('[502] O Mistral respondeu sem áudio.');
        } else {
            const buf = await res.arrayBuffer();
            if (buf.byteLength < 200) return toolError('[502] O Mistral devolveu um áudio vazio.');
            b64 = toBase64(new Uint8Array(buf));
        }
        if (cache) {
            const put = cache.put(key, new Response(b64, { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=2592000' } }));
            if (ctx && ctx.waitUntil) ctx.waitUntil(put); else await put;
        }
    }
    const bytes = Math.floor(b64.length * 3 / 4);
    return {
        content: [{ type: 'text', text: 'Áudio MP3 com ' + bytes + ' bytes (voz ' + voice + '), em base64 em structuredContent.data.' }],
        structuredContent: { mimeType: 'audio/mpeg', data: b64, voice, model, bytes },
        isError: false,
    };
}

async function voices(env) {
    if (!env.MISTRAL_API_KEY) return toolError('[500] Falta o segredo MISTRAL_API_KEY no Worker.');
    const res = await fetch(MISTRAL + '/audio/voices', { headers: { Authorization: 'Bearer ' + env.MISTRAL_API_KEY } });
    if (!res.ok) return toolError('[' + res.status + '] ' + statusMessage(res.status));
    const j = await res.json().catch(() => null);
    const arr = Array.isArray(j) ? j : (j && (j.data || j.voices || j.items)) || [];
    const list = arr
        .map(v => (typeof v === 'string' ? { id: v } : v && typeof v === 'object'
            ? { id: String(v.id || v.voice_id || v.name || ''), name: String(v.name || v.display_name || ''), language: String(v.language || v.lang || v.locale || '') }
            : null))
        .filter(v => v && v.id);
    return {
        content: [{ type: 'text', text: list.map(v => v.id).join(', ') || 'Sem vozes.' }],
        structuredContent: { voices: list },
        isError: false,
    };
}

function statusMessage(status) {
    if (status === 401 || status === 403) return 'O Mistral recusou a chave (MISTRAL_API_KEY).';
    if (status === 429) return 'Limite do plano do Mistral atingido; tenta daqui a um minuto.';
    if (status >= 500) return 'O Mistral está indisponível agora.';
    return 'O Mistral recusou o pedido.';
}

function toolError(text) { return { content: [{ type: 'text', text }], isError: true }; }
function rpcResult(id, result) { return { jsonrpc: '2.0', id, result }; }
function rpcError(id, code, message) { return { jsonrpc: '2.0', id, error: { code, message } }; }
function json(body) {
    return new Response(JSON.stringify(body), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
function accepted() { return new Response(null, { status: 202, headers: CORS }); }

function safeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    let r = 0;
    for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return r === 0;
}

function toBase64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
}

async function sha256(text) {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('');
}
