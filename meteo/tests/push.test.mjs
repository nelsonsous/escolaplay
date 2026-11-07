// Notificações (proxy/src/push.js): assinaturas, horas, mensagem, VAPID (RFC 8292) e cifra (RFC 8291) — sem rede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { b64u, b64uDecode, validSubscription, validTime, validTz, localParts, duePush, pushMessage, newVapidKeys, vapidAuth,
    encryptPayload, sendPush } from '../proxy/src/push.js';

const te = new TextEncoder(), td = new TextDecoder();
// o lado do telemóvel: chave ECDH P-256 e segredo de 16 bytes, como o browser cria
async function browserSub(endpoint = 'https://web.push.apple.com/QGtestetoken') {
    const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
    const auth = crypto.getRandomValues(new Uint8Array(16));
    return { sub: { endpoint, keys: { p256dh: b64u(pub), auth: b64u(auth) } }, kp, pub, auth };
}
async function hkdf(salt, ikm, info, n) {
    const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, n * 8));
}
// decifra como o browser (RFC 8291): para provar que a mensagem cifrada chega legível ao telemóvel
async function decrypt(body, { kp, pub, auth }) {
    const salt = body.slice(0, 16), rs = new DataView(body.buffer, body.byteOffset).getUint32(16), idlen = body[20], asPub = body.slice(21, 21 + idlen);
    assert.equal(rs, 4096);
    const asKey = await crypto.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, kp.privateKey, 256));
    const info = new Uint8Array([...te.encode('WebPush: info\0'), ...pub, ...asPub]);
    const ikm = await hkdf(auth, shared, info, 32);
    const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16), nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
    const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, body.slice(21 + idlen)));
    assert.equal(plain[plain.length - 1], 2, 'delimitador do último registo');
    return td.decode(plain.slice(0, -1));
}

test('assinaturas: só serviços de notificações conhecidos, com chaves válidas; horas de 15 em 15 min; fusos válidos', async () => {
    const { sub } = await browserSub();
    assert.deepEqual(validSubscription(sub), sub);
    assert.ok(validSubscription({ ...sub, endpoint: 'https://fcm.googleapis.com/fcm/send/abc' }));
    assert.ok(validSubscription({ ...sub, endpoint: 'https://wns2-par02p.notify.windows.com/w/?token=x' }));
    for (const endpoint of ['http://web.push.apple.com/x', 'https://evil.example.com/push', 'https://web.push.apple.com.evil.com/x', 'nada'])
        assert.equal(validSubscription({ ...sub, endpoint }), null, endpoint);
    assert.equal(validSubscription({ ...sub, keys: { ...sub.keys, auth: b64u(new Uint8Array(8)) } }), null);
    assert.equal(validSubscription({ ...sub, keys: { ...sub.keys, p256dh: b64u(new Uint8Array(65)) } }), null, 'chave pública não comprimida começa por 0x04');
    assert.deepEqual(['19:00', '07:45', '23:15'].map(validTime), ['19:00', '07:45', '23:15']);
    assert.deepEqual(['19:10', '24:00', '7:00', ''].map(validTime), [null, null, null, null]);
    assert.equal(validTz('Europe/Lisbon'), 'Europe/Lisbon');
    assert.equal(validTz('Atlantic/Azores'), 'Atlantic/Azores');
    assert.equal(validTz('Marte/Base'), null);
});

test('hora local: Lisboa no inverno e no verão, Açores; domingo', () => {
    assert.deepEqual(localParts(Date.parse('2026-11-08T19:05:00Z')), { date: '2026-11-08', hm: '19:05', min: 19 * 60 + 5, dow: 0 });
    assert.equal(localParts(Date.parse('2026-07-01T18:05:00Z')).hm, '19:05', 'verão: UTC+1');
    assert.equal(localParts(Date.parse('2026-11-09T20:05:00Z'), 'Atlantic/Azores').hm, '19:05');
    assert.equal(localParts(Date.parse('2026-11-09T23:30:00Z')).date, '2026-11-09');
    assert.equal(localParts(Date.parse('2026-11-09T00:30:00Z')).hm, '00:30');
});

test('quando enviar: depois da hora escolhida (até 2 h), uma vez por dia; ao domingo a da semana', () => {
    const e = { id: 'a', ep: 'https://web.push.apple.com/x', time: '19:00', tz: 'Europe/Lisbon', sunday: true };
    const at = (iso, x = e) => duePush([x], Date.parse(iso));
    assert.equal(at('2026-11-09T18:45:00Z').length, 0, 'antes da hora');
    assert.equal(at('2026-11-09T19:00:00Z').length, 1);
    assert.equal(at('2026-11-09T19:00:00Z')[0].weekly, false, 'segunda-feira: a do dia');
    assert.equal(at('2026-11-09T20:59:00Z').length, 1, 'uma volta falhada ainda envia');
    assert.equal(at('2026-11-09T21:00:00Z').length, 0, 'mais de 2 h depois: já não');
    assert.equal(at('2026-11-09T19:15:00Z', { ...e, last: '2026-11-09' }).length, 0, 'já enviada hoje');
    assert.equal(at('2026-11-08T19:00:00Z')[0].weekly, true, 'domingo: a da semana');
    assert.equal(at('2026-11-08T19:00:00Z', { ...e, sunday: false })[0].weekly, false);
    assert.equal(at('2026-11-09T18:00:00Z', { ...e, time: '19:00', tz: 'Atlantic/Azores' }).length, 0);
    assert.equal(at('2026-11-09T20:00:00Z', { ...e, time: '19:00', tz: 'Atlantic/Azores' }).length, 1, 'nos Açores às 19:00 de lá');
    assert.equal(duePush([{ ...e, ep: null }, null, { ...e, time: 'x' }], Date.parse('2026-11-09T19:00:00Z')).length, 0);
});

test('mensagem: amanhã e o que vestir; ao domingo a semana; sem análise fresca, aviso simples', () => {
    const now = Date.parse('2026-11-09T19:00:00Z'), url = 'https://exemplo/meteo/?tab=analise';
    const a = { generatedAt: '2026-11-09T17:40:00Z', place: { name: 'Santo Tirso' }, amanha: 'Chuva de manhã.', vestir: 'Casaco.',
        semana: 'Semana longa.', notificacao: { amanha: 'Chuva fraca até às 11h; 9 a 18 °C. Casaco impermeável de manhã.', semana: 'Chuva seg e ter; depois sol.' } };
    assert.deepEqual(pushMessage(a, { url, nowMs: now }), { title: 'Amanhã em Santo Tirso', body: a.notificacao.amanha, url, tag: 'meteo-dia' });
    assert.deepEqual(pushMessage(a, { url, nowMs: now, weekly: true, name: 'Casa' }), { title: 'A semana em Casa', body: a.notificacao.semana, url, tag: 'meteo-semana' });
    const old = pushMessage({ ...a, generatedAt: '2026-11-08T07:00:00Z' }, { url, nowMs: now });
    assert.match(old.body, /ainda não chegou/);
    const noNotif = pushMessage({ ...a, notificacao: undefined, amanha: 'x '.repeat(150) }, { nowMs: now });
    assert.ok(noNotif.body.length <= 180 && noNotif.body.endsWith('…'));
});

test('VAPID: chave pública P-256 e JWT ES256 assinado para a origem do serviço', async () => {
    const keys = await newVapidKeys();
    const pub = b64uDecode(keys.publicKey);
    assert.equal(pub.length, 65);
    assert.equal(pub[0], 4);
    const now = Date.parse('2026-11-09T19:00:00Z');
    const h = await vapidAuth('https://web.push.apple.com/QGabc', keys, { subject: 'https://nelsonsous.github.io/escolaplay/meteo/', nowMs: now });
    const m = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(h);
    assert.ok(m, h);
    assert.equal(m[4], keys.publicKey);
    assert.deepEqual(JSON.parse(td.decode(b64uDecode(m[1]))), { typ: 'JWT', alg: 'ES256' });
    assert.deepEqual(JSON.parse(td.decode(b64uDecode(m[2]))), { aud: 'https://web.push.apple.com', exp: now / 1000 + 12 * 3600, sub: 'https://nelsonsous.github.io/escolaplay/meteo/' });
    const vk = await crypto.subtle.importKey('raw', pub, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, vk, b64uDecode(m[3]), te.encode(`${m[1]}.${m[2]}`)), 'assinatura válida');
});

test('cifra (aes128gcm): o telemóvel decifra a mensagem; envio com os cabeçalhos certos', async () => {
    const b = await browserSub();
    const msg = { title: 'Amanhã em Santo Tirso', body: 'Chuva fraca até às 11h; 9 a 18 °C. Casaco impermeável de manhã.', url: 'u', tag: 'meteo-dia' };
    const body = await encryptPayload(b.sub, te.encode(JSON.stringify(msg)));
    assert.deepEqual(JSON.parse(await decrypt(body, b)), msg);
    const keys = await newVapidKeys();
    let req = null;
    const status = await sendPush(b.sub, msg, keys, { subject: 'https://x/', fetchFn: async (u, init) => { req = { u, ...init }; return { status: 201 }; } });
    assert.equal(status, 201);
    assert.equal(req.u, b.sub.endpoint);
    assert.equal(req.method, 'POST');
    assert.equal(req.headers['content-encoding'], 'aes128gcm');
    assert.equal(req.headers.ttl, String(6 * 3600));
    assert.match(req.headers.authorization, /^vapid t=.+, k=/);
    assert.deepEqual(JSON.parse(await decrypt(req.body, b)), msg);
    assert.equal(await sendPush(b.sub, msg, keys, { fetchFn: async () => { throw new Error('rede'); } }), 0, 'sem rede: 0');
});
