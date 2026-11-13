// Avisos no telemóvel (Web Push) do conector da Música: «as propostas estão prontas» e «a playlist foi afinada».
// É o mesmo de meteo/proxy/src/push.js (só a parte genérica): o par de chaves VAPID é criado no primeiro uso e fica no
// KV (push:vapid); cada mensagem vai cifrada para o telemóvel (RFC 8291, aes128gcm), por isso o serviço de notificações
// (Apple, Google, Mozilla) não a consegue ler. Só WebCrypto: corre no Worker e nos testes (Node).

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
