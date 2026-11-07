// Locais com análise diária do Claude: de quem são, quando ficam em pausa, o limite de segurança, a escolha dos locais de
// cada corrida da tarefa agendada e os contadores do painel "Utilização". Só funções puras (sem pedidos), usadas pelo
// conector (proxy/src/worker.js), pela tarefa agendada (analista/*.mjs) e pelos testes.
import { haversine } from './stats.js';

export const OWNER = 'owner';        // place.owner dos locais do dono; os dos outros telemóveis têm o id do telemóvel
export const GUEST_MAX = 1;          // locais com análise diária por telemóvel (o dono não tem limite)
export const ANALYSED_MAX = 15;      // limite de segurança: locais analisados em cada corrida (os do dono nunca são cortados)
export const PAUSE_DAYS = 14;        // telemóvel sem abrir a app há 14 dias → o seu local fica em pausa (volta quando abrir)
export const MORNING_END_HOUR = 12;  // "só 1× por dia": só a corrida da manhã (07:34, hora de Lisboa < 12) analisa os outros
export const STATS_TTL = 40 * 86400; // stats:<AAAA-MM-DD> (análises do dia) guardados 40 dias
/** "Análise dos outros" (Ajustes → Utilização, só o dono): ligada | só 1× por dia (07:34) | desligada. */
export const OTHERS = { on: 'ligada', '1x': 'só 1× por dia (07:34)', off: 'desligada' };
export const KIND_PT = { owner: 'dono', guest: 'convidado' };

/** Dono do local: o id do telemóvel, ou "owner". Migração: os locais de antes (sem dono) são do dono. */
export const placeOwner = (p) => (p && typeof p.owner === 'string' && p.owner) || OWNER;
export const isOwnerPlace = (p) => placeOwner(p) === OWNER;
export const placeKind = (p) => (isOwnerPlace(p) ? 'owner' : 'guest');
/** O valor guardado em settings (KV) → 'on' | '1x' | 'off' (por omissão, ligada). */
export const othersMode = (s) => (s && typeof s === 'object' && Object.hasOwn(OTHERS, s.others) ? s.others : 'on');
/** ~1 km: a localização dos locais dos outros, para o dono (nunca as coordenadas exatas). */
export const approx = (x) => Math.round(x * 100) / 100;

// ---------- datas de Lisboa (a regra "1× por dia" e os contadores do dia contam em hora local) ----------
let fmt = null;
export function lisbon(ms = Date.now()) {
    fmt ||= new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
    const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 };
}
export const isMorningRun = (ms = Date.now()) => lisbon(ms).hour < MORNING_END_HOUR;
const dayNo = (d) => Math.round(Date.parse(d + 'T00:00:00Z') / 864e5);
/** Dias de a a b (datas AAAA-MM-DD). */
export const daysBetween = (a, b) => dayNo(b) - dayNo(a);
export const addDays = (d, n) => new Date((dayNo(d) + n) * 864e5).toISOString().slice(0, 10);
/** Dias (de Lisboa) desde que o telemóvel abriu a app; lastSeen = ISO ou AAAA-MM-DD. null = nunca. */
export function daysUnseen(lastSeen, now = Date.now()) {
    if (typeof lastSeen !== 'string' || lastSeen.length < 10) return null;
    const d = lastSeen.length === 10 ? lastSeen : Number.isFinite(Date.parse(lastSeen)) ? lisbon(Date.parse(lastSeen)).date : null;
    return d ? daysBetween(d, lisbon(now).date) : null;
}

/** Estado de um local: 'off' (desligado), 'paused' (de outro telemóvel que não abre a app há 14 dias) ou 'active'.
 *  lastSeen = do telemóvel dono do local (KV dev:<id>); os locais do dono estão sempre em uso. */
export function placeStatus(place, lastSeen, now = Date.now()) {
    if (place?.off) return 'off';
    if (isOwnerPlace(place)) return 'active';
    const d = daysUnseen(lastSeen, now);
    return d == null || d >= PAUSE_DAYS ? 'paused' : 'active';
}

/**
 * Locais de uma corrida da tarefa agendada (analista/dados.mjs): todos os do dono (nunca são cortados) e os dos outros
 * telemóveis que estão em uso, conforme a "análise dos outros" — ligada; "1x" = só na corrida da manhã (hora de Lisboa);
 * desligada — até `cap` locais ao todo. Primeiro os telemóveis que abriram a app há menos tempo.
 * devices = { <id do telemóvel>: { lastSeen } } (KV dev:<id>); morning = corrida da manhã (por omissão, pela hora de Lisboa).
 * → { run: [{ ...local, kind }], skip: [{ ...local, kind, reason }], morning, others }
 */
export function selectPlaces(places, { devices = {}, others = 'on', now = Date.now(), cap = ANALYSED_MAX, morning = isMorningRun(now) } = {}) {
    const mode = Object.hasOwn(OTHERS, others) ? others : 'on';
    const ok = (Array.isArray(places) ? places : []).filter((p) => p && typeof p.id === 'string' && Number.isFinite(p.lat) && Number.isFinite(p.lon));
    const run = [], skip = [];
    for (const p of ok.filter(isOwnerPlace)) {
        if (p.off) skip.push({ ...p, kind: 'owner', reason: 'desligado' });
        else run.push({ ...p, kind: 'owner' });
    }
    const guests = ok.filter((p) => !isOwnerPlace(p)).map((p) => ({ ...p, kind: 'guest', lastSeen: devices[p.owner]?.lastSeen || null }));
    guests.sort((a, b) => String(b.lastSeen || '').localeCompare(String(a.lastSeen || '')) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    for (const g of guests) {
        const reason = g.off ? (g.offBy === 'owner' ? 'desligado pelo dono' : 'desligado')
            : mode === 'off' ? 'análise dos outros desligada'
            : mode === '1x' && !morning ? 'só 1× por dia (na corrida da manhã)'
            : placeStatus(g, g.lastSeen, now) === 'paused' ? `em pausa (${PAUSE_DAYS} dias ou mais sem abrir a app)`
            : run.length >= cap ? `limite de ${cap} locais analisados`
            : null;
        if (reason) skip.push({ ...g, reason });
        else run.push(g);
    }
    return { run, skip, morning, others: mode };
}

/** Conta uma análise do Claude no dia (KV stats:<AAAA-MM-DD>, data de Lisboa): kind 'scheduled' (tarefa agendada) ou
 *  'instant' (a pedido); guest = para o local de outro telemóvel. */
export function bumpStats(doc, { kind, guest = false } = {}) {
    const d = doc && typeof doc === 'object' && !Array.isArray(doc) ? doc : {};
    const n = (x) => (Number.isFinite(x) && x > 0 ? Math.floor(x) : 0);
    const out = { scheduled: n(d.scheduled), instant: n(d.instant), guest: n(d.guest) };
    if (kind === 'scheduled' || kind === 'instant') out[kind] += 1;
    if (guest) out.guest += 1;
    return out;
}

/** Avisos do utilizador das últimas `hours` horas perto de um ponto (como estão guardados: o mais recente primeiro),
 *  com a idade (min) e a distância ao ponto (km). */
export function recentReports(list, lat, lon, { hours = 720, now = Date.now(), maxKm = Infinity } = {}) {
    return (Array.isArray(list) ? list : [])
        .filter((x) => x && Number.isFinite(Date.parse(x.time)) && now - Date.parse(x.time) <= hours * 36e5)
        .map((x) => ({ ...x, ageMin: Math.round((now - Date.parse(x.time)) / 6e4), distanceKm: Math.round(haversine(lat, lon, x.lat, x.lon) * 10) / 10 }))
        .filter((x) => !(x.distanceKm > maxKm));
}

/**
 * Painel "Utilização" (só o dono). devices = [{ id, s: dia de Lisboa em que abriu a app pela última vez, o: 1 se é do dono }]
 * (metadados das chaves dev:<id>); stats = { <AAAA-MM-DD>: { scheduled, instant, guest } }.
 * Dos outros só o nome dos locais e o estado — nunca as coordenadas.
 */
export function usageSummary({ devices = [], places = [], stats = {}, others = 'on', now = Date.now(), cap = ANALYSED_MAX } = {}) {
    const today = lisbon(now).date;
    const ago = (s) => (typeof s === 'string' && s.length === 10 ? daysBetween(s, today) : Infinity);
    const dv = { today: 0, d7: 0, d30: 0, total: devices.length, owner: 0 };
    for (const d of devices) {
        const a = ago(d.s);
        if (a <= 0) dv.today++;
        if (a <= 6) dv.d7++;
        if (a <= 29) dv.d30++;
        if (d.o) dv.owner++;
    }
    const seen = Object.fromEntries(devices.map((d) => [d.id, { lastSeen: d.s || null }]));
    // como seria a corrida da manhã (a mais completa): quem é analisado e porque fica alguém de fora
    const sel = selectPlaces(places, { devices: seen, others, now, cap, morning: true });
    const row = (p, analysed) => ({ name: p.name, kind: p.kind, status: placeStatus(p, seen[p.owner]?.lastSeen, now), analysed,
        ...(p.reason ? { reason: p.reason } : {}), ...(p.kind === 'guest' && Number.isFinite(ago(seen[p.owner]?.lastSeen)) ? { days: ago(seen[p.owner]?.lastSeen) } : {}) });
    const list = [...sel.run.map((p) => row(p, true)), ...sel.skip.map((p) => row(p, false))]
        .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name, 'pt') : a.kind === 'owner' ? -1 : 1));
    const pl = { total: list.length, owner: 0, guests: 0, active: 0, paused: 0, off: 0, analysed: sel.run.length, cap, list };
    for (const x of list) { pl[x.kind === 'owner' ? 'owner' : 'guests']++; pl[x.status]++; }
    const analyses = Array.from({ length: 7 }, (_, i) => addDays(today, -i)).map((date) => ({ date, ...bumpStats(stats[date]) }));
    return { today, devices: dv, places: pl, analyses, others: Object.hasOwn(OTHERS, others) ? others : 'on' };
}
