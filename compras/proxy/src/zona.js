// A zona de entrega do Continente (volta 7): o stock e, por vezes, o preço online dependem da loja que serve o código
// postal. O site escolhe-a com dois pedidos que o robots.txt deixa: Stores-GetCoverageArea?postalCode=… (a loja da
// zona) e Stores-SetStoreContext (põe essa loja na sessão). O conector faz o mesmo, guarda os cookies da sessão e lê
// a página do produto com eles. Só com o código postal que a casa deu (e autorizou a usar para isto).
import { UA } from './rede.js';
import { lerProduto } from './fontes/continente.js';

const BASE = 'https://www.continente.pt/on/demandware.store/Sites-continente-Site/default/';
const MS = 12000;
const cookies = (r) => (r.headers.getSetCookie?.() ?? [r.headers.get('set-cookie')].filter(Boolean)).map((c) => c.split(';')[0]);
export const cpValido = (cp) => /^\d{4}-\d{3}$/.test(String(cp ?? '').trim());

// a loja online que serve o código postal: { storeId, nome, cookies } ou null
export async function zonaContinente(cp) {
    if (!cpValido(cp)) return null;
    const r = await fetch(`${BASE}Stores-GetCoverageArea?postalCode=${encodeURIComponent(cp)}`, {
        headers: { 'user-agent': UA, accept: 'application/json', 'x-requested-with': 'XMLHttpRequest' }, signal: AbortSignal.timeout(MS),
    });
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    if (!j || j.error || !j.data?.storeId) return null;
    const d = j.data;
    const jar = cookies(r);
    // pôr a loja na sessão (como o site faz quando se escolhe o código postal)
    const corpo = new URLSearchParams({ storeId: d.storeId, physicalStoreId: d.physicalStoreId, areaID: d.areaID, storeID: d.storeID,
        storeInfo: cp, storePostalCode: cp, city: '', latitude: '', longitude: '', searchLatitude: '', searchLongitude: '', ID: '', selectedAddressId: '' });
    const s = await fetch(`${BASE}Stores-SetStoreContext`, {
        method: 'POST', body: corpo, signal: AbortSignal.timeout(MS),
        headers: { 'user-agent': UA, accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest', cookie: jar.join('; ') },
    });
    const jar2 = [...jar.filter((c) => !cookies(s).some((n) => n.split('=')[0] === c.split('=')[0])), ...cookies(s)];
    await s.body?.cancel();
    return { storeId: d.storeId, nome: d.name ?? null, cookies: jar2 };
}

// um produto do Continente lido na zona (com os cookies da sessão): o mesmo que lerProduto, ou null
export async function produtoNaZona(zona, url) {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html', 'accept-language': 'pt-PT', cookie: zona.cookies.join('; ') }, redirect: 'manual', signal: AbortSignal.timeout(MS) });
    if (r.status !== 200) { await r.body?.cancel(); return null; }
    return lerProduto(await r.text(), url);
}

// de hora a hora (o cron): para cada casa com código postal, os produtos do Continente da lista (por riscar, até 8),
// lidos na zona; guarda a disponibilidade em zona_stock. Uma casa por vez, a que foi vista há mais tempo.
export async function stockZonas(db, agora = new Date()) {
    const c = await db.prepare(`SELECT id, cp, itens FROM casa WHERE cp IS NOT NULL ORDER BY
        (SELECT max(visto) FROM zona_stock WHERE casa = casa.id) IS NOT NULL, (SELECT max(visto) FROM zona_stock WHERE casa = casa.id) LIMIT 1`).first();
    if (!c) return null;
    const ps = JSON.parse(c.itens ?? '[]').filter((i) => !i.f && i.p?.continente?.url).map((i) => i.p.continente).slice(0, 8);
    if (!ps.length) return { casa: c.id, n: 0 };
    const z = await zonaContinente(c.cp);
    if (!z) return { casa: c.id, erro: 'sem zona' };
    const quando = agora.toISOString();
    const lidos = await Promise.all(ps.map((p) => produtoNaZona(z, p.url).catch(() => null)));
    const frases = ps.map((p, i) => lidos[i] && db.prepare(`INSERT INTO zona_stock (casa, cadeia, id, disponivel, visto) VALUES (?, 'continente', ?, ?, ?)
        ON CONFLICT (casa, cadeia, id) DO UPDATE SET disponivel = excluded.disponivel, visto = excluded.visto`).bind(c.id, String(p.id), lidos[i].disponivel === false ? 0 : 1, quando)).filter(Boolean);
    if (frases.length) await db.batch(frases);
    return { casa: c.id, n: frases.length, esgotados: lidos.filter((x) => x && x.disponivel === false).length };
}
