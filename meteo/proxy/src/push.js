// Notificações (Web Push) do conector: a notificação do fim do dia com a análise do Claude (amanhã e o que vestir) e,
// ao domingo, a da semana. Sem segredos para gerir: o par de chaves VAPID é criado no primeiro uso e fica no KV
// (push:vapid). Cada mensagem vai cifrada para o telemóvel (RFC 8291, aes128gcm): o serviço de notificações (Apple,
// Google, Mozilla) não a consegue ler. Só WebCrypto: corre no Worker e nos testes (Node).

const te = new TextEncoder();
export const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export function b64uDecode(s) {
    const t = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
const concat = (...parts) => {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
};

// Serviços de notificações aceites (o conector só envia para estes: nada de endereços arbitrários)
const PUSH_HOSTS = /^(?:fcm\.googleapis\.com|android\.googleapis\.com|web\.push\.apple\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com)$/;
export const PUSH_STEP_MIN = 15; // o conector acorda de 15 em 15 min: as horas escolhem-se de 15 em 15
export const PUSH_LATE_MIN = 120; // se falhar uma volta, ainda envia até 2 h depois da hora escolhida
export const PUSH_DEFAULT_TIME = '19:00';

/** Assinatura válida do browser (PushSubscription.toJSON()): https para um serviço conhecido, chaves com o tamanho certo. */
export function validSubscription(s) {
    try {
        const u = new URL(s?.endpoint);
        if (u.protocol !== 'https:' || !PUSH_HOSTS.test(u.hostname) || s.endpoint.length > 1000) return null;
        const p256dh = b64uDecode(s.keys?.p256dh), auth = b64uDecode(s.keys?.auth);
        if (p256dh.length !== 65 || p256dh[0] !== 4 || auth.length !== 16) return null;
        return { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
    } catch { return null; }
}
export const validTime = (t) => (/^([01]\d|2[0-3]):(00|15|30|45)$/.test(t || '') ? t : null);
export function validTz(tz) {
    if (typeof tz !== 'string' || tz.length > 64) return null;
    try { new Intl.DateTimeFormat('en', { timeZone: tz }); return tz; } catch { return null; }
}

/** Data, hora e dia da semana locais (fuso IANA): { date: 'AAAA-MM-DD', hm: 'HH:MM', min: minutos desde a meia-noite, dow: 0 = domingo } */
export function localParts(ms, tz = 'Europe/Lisbon') {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
        minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    const h = Number(p.hour) % 24, mi = Number(p.minute);
    return { date: `${p.year}-${p.month}-${p.day}`, hm: `${String(h).padStart(2, '0')}:${p.minute}`, min: h * 60 + mi,
        dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
}

/** As notificações a enviar agora: passou a hora escolhida (até 2 h) e ainda não foi enviada hoje (dia local). */
export function duePush(index, nowMs) {
    return (Array.isArray(index) ? index : []).filter((e) => {
        if (!e?.ep || !validTime(e.time)) return false;
        const L = localParts(nowMs, e.tz || 'Europe/Lisbon');
        const [h, m] = e.time.split(':').map(Number), late = L.min - (h * 60 + m);
        return e.last !== L.date && late >= 0 && late < PUSH_LATE_MIN;
    }).map((e) => ({ ...e, weekly: !!e.sunday && localParts(nowMs, e.tz || 'Europe/Lisbon').dow === 0 }));
}

const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };
/** Título e texto da notificação a partir da última análise do local (fresca: até 30 h). */
export function pushMessage(analysis, { name, weekly = false, url, nowMs = Date.now() } = {}) {
    const where = name || analysis?.place?.name || 'o teu local';
    const fresh = analysis?.generatedAt && nowMs - Date.parse(analysis.generatedAt) <= 30 * 36e5;
    if (!fresh) return { title: `Meteo · ${where}`, body: 'A análise do Claude ainda não chegou hoje. Abre a app para ver a previsão de amanhã.', url, tag: 'meteo-dia' };
    if (weekly) return { title: `A semana em ${where}`, body: clip(analysis.notificacao?.semana || analysis.semana || analysis.tendencia, 180), url, tag: 'meteo-semana' };
    return { title: `Amanhã em ${where}`, body: clip(analysis.notificacao?.amanha || [analysis.amanha, analysis.vestir].filter(Boolean).join(' '), 180), url, tag: 'meteo-dia' };
}

// ---------- chaves VAPID (criadas uma vez, no KV) ----------
export async function newVapidKeys() {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    return { publicKey: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)), privateJwk: await crypto.subtle.exportKey('jwk', kp.privateKey),
        createdAt: new Date().toISOString() };
}
/** Cabeçalho Authorization (VAPID, RFC 8292): JWT ES256 para a origem do serviço de notificações, válido 12 h. */
export async function vapidAuth(endpoint, keys, { subject, nowMs = Date.now() } = {}) {
    const enc = (o) => b64u(te.encode(JSON.stringify(o)));
    const unsigned = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({ aud: new URL(endpoint).origin, exp: Math.floor(nowMs / 1000) + 12 * 3600, sub: subject })}`;
    const key = await crypto.subtle.importKey('jwk', keys.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(unsigned));
    return `vapid t=${unsigned}.${b64u(sig)}, k=${keys.publicKey}`;
}

// ---------- mensagem cifrada (RFC 8291 + RFC 8188, aes128gcm, um só registo) ----------
async function hkdf(salt, ikm, info, bytes) {
    const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, bytes * 8));
}
export async function encryptPayload(sub, plaintext, { salt = crypto.getRandomValues(new Uint8Array(16)) } = {}) {
    const uaPub = b64uDecode(sub.keys.p256dh), auth = b64uDecode(sub.keys.auth);
    const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
    const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
    const ikm = await hkdf(auth, shared, concat(te.encode('WebPush: info\0'), uaPub, asPub), 32);
    const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
    const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
    const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(plaintext, new Uint8Array([2]))));
    const head = new Uint8Array(16 + 4 + 1 + asPub.length);
    head.set(salt, 0);
    new DataView(head.buffer).setUint32(16, 4096);
    head[20] = asPub.length;
    head.set(asPub, 21);
    return concat(head, ct);
}

/** Envia uma notificação (objeto JSON, cifrado). Devolve o código HTTP do serviço (201 = aceite; 404/410 = assinatura caducada). */
export async function sendPush(sub, message, keys, { subject, ttl = 6 * 3600, fetchFn = fetch } = {}) {
    const body = await encryptPayload(sub, te.encode(JSON.stringify(message)));
    const r = await fetchFn(sub.endpoint, { method: 'POST', body, headers: {
        authorization: await vapidAuth(sub.endpoint, keys, { subject }), 'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream',
        ttl: String(ttl), urgency: 'normal' } }).catch(() => null);
    return r ? r.status : 0;
}
