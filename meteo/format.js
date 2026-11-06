// Formatação PT-PT da app Meteo.
// As horas da previsão vêm em hora local do sítio ("2026-11-06T15:00"), sem fuso:
// tratamo-las como componentes de texto e nunca as passamos por new Date() local.

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const MINUS = '−';
const fmts = new Map();
function nf(d) {
  let f = fmts.get(d);
  if (!f) { f = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d }); fmts.set(d, f); }
  return f;
}

/** Número com d casas, vírgula decimal e sinal de menos tipográfico; '–' se não houver valor. */
export function num(v, d = 0) {
  if (!isNum(v)) return '–';
  const p = 10 ** d;
  let r = Math.round(v * p) / p;
  if (r === 0) r = 0; // nunca "-0"
  return (r < 0 ? MINUS : '') + nf(d).format(Math.abs(r));
}
export const deg = (v, d = 0) => (isNum(v) ? `${num(v, d)}°` : '–');
export const signed = (v, d = 1) => {
  if (!isNum(v)) return '–';
  const r = Math.round(v * 10 ** d) / 10 ** d;
  return (r > 0 ? '+' : '') + num(r, d);
};
export const pct = (v) => (isNum(v) ? `${num(v)}%` : '–');
export const kmh = (v) => (isNum(v) ? `${num(v)} km/h` : '–');
export const mm = (v) => (isNum(v) ? `${num(v, v > 0 && v < 10 ? 1 : 0)} mm` : '–');
export const km = (v) => (isNum(v) ? `${num(v, v < 10 ? 1 : 0)} km` : '–');
export const hpa = (v) => (isNum(v) ? `${num(v)} hPa` : '–');
export function dist(m) { // visibilidade em metros → texto
  if (!isNum(m)) return '–';
  return m >= 10000 ? `${num(m / 1000)} km` : m >= 1000 ? `${num(m / 1000, 1)} km` : `${num(m)} m`;
}

// ---------- datas e horas (texto local) ----------
export function parts(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso || '');
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3], h: m[4] ? +m[4] : 0, mi: m[5] ? +m[5] : 0 };
}
const pad = (n) => String(n).padStart(2, '0');
export const hhmm = (iso) => { const p = parts(iso); return p ? `${pad(p.h)}:${pad(p.mi)}` : '–'; };
export const hourShort = (iso) => { const p = parts(iso); return p ? `${p.h}h` : ''; };
const WD = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const WDS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const utcDay = (p) => Date.UTC(p.y, p.mo - 1, p.d);
export function weekday(iso) { const p = parts(iso); return p ? new Date(utcDay(p)).getUTCDay() : 0; }
export const wdShort = (iso) => WDS[weekday(iso)];
export const wdLong = (iso) => WD[weekday(iso)];
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export function dateShort(iso) { const p = parts(iso); return p ? `${p.d} ${MON[p.mo - 1]}` : ''; }
export function dayDiff(aIso, bIso) {
  const a = parts(aIso), b = parts(bIso);
  return a && b ? Math.round((utcDay(b) - utcDay(a)) / 864e5) : NaN;
}
/** "Hoje", "Amanhã", "Dom 8" */
export function dayLabel(dateIso, todayIso) {
  const diff = dayDiff(todayIso, dateIso);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  return `${cap(wdShort(dateIso))} ${parts(dateIso)?.d ?? ''}`;
}
/** "hoje 15h", "amanhã 09h", "dom 09h" — para picos e períodos. */
export function whenShort(iso, todayIso) {
  if (!iso) return '';
  const diff = dayDiff(todayIso, iso);
  const day = diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : wdShort(iso);
  return `${day} ${pad(parts(iso).h)}h`;
}
/** Período "sáb 18:00 – dom 21:00" (ou "hoje 15:00–18:00" no mesmo dia). */
export function period(startIso, endIso, todayIso) {
  if (!startIso) return '';
  const dayOf = (iso) => { const d = dayDiff(todayIso, iso); return d === 0 ? 'hoje' : d === 1 ? 'amanhã' : wdShort(iso); };
  if (!endIso) return `desde ${dayOf(startIso)} ${hhmm(startIso)}`;
  if (dayDiff(startIso, endIso) === 0) return `${dayOf(startIso)} ${hhmm(startIso)}–${hhmm(endIso)}`;
  return `${dayOf(startIso)} ${hhmm(startIso)} – ${dayOf(endIso)} ${hhmm(endIso)}`;
}
/** Hora local "AAAA-MM-DDTHH:MM" de um instante UTC, com o desvio do sítio. */
export function localFromUtc(utcIso, offsetSec) {
  const t = Date.parse(utcIso);
  if (!Number.isFinite(t)) return null;
  return new Date(t + (offsetSec || 0) * 1000).toISOString().slice(0, 16);
}
export function ago(min) {
  if (!isNum(min)) return '';
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${Math.round(min)} min`;
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  if (h < 24) return m ? `há ${h} h ${m} min` : `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'há 1 dia' : `há ${d} dias`;
}

// ---------- vento ----------
const C16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
const norm = (deg) => ((deg % 360) + 360) % 360;
export const compass = (d) => (isNum(d) ? C16[Math.round(norm(d) / 22.5) % 16] : '–');
const FROM8 = ['norte', 'nordeste', 'leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste'];
export const windFrom = (d) => (isNum(d) ? `de ${FROM8[Math.round(norm(d) / 45) % 8]}` : '');

// ---------- níveis ----------
export const LEVELS = ['nenhum', 'baixo', 'moderado', 'elevado', 'muito elevado'];
/** nível 0..4 → classe de estado (cores reservadas, sempre com ícone + texto) */
export const levelClass = (l) => ['none', 'low', 'warn', 'serious', 'critical'][l] || 'none';
export const FIRE = [null, 'Reduzido', 'Moderado', 'Elevado', 'Muito elevado', 'Máximo'];
export const WARN = { green: 'Verde', yellow: 'Amarelo', orange: 'Laranja', red: 'Vermelho' };
export const CONF = { alta: 'Confiança alta', media: 'Confiança média', baixa: 'Confiança baixa' };

// ---------- tempo (códigos WMO) ----------
const WX = {
  0: 'Céu limpo', 1: 'Pouco nublado', 2: 'Parcialmente nublado', 3: 'Muito nublado',
  45: 'Nevoeiro', 48: 'Nevoeiro com geada',
  51: 'Chuvisco fraco', 53: 'Chuvisco', 55: 'Chuvisco intenso', 56: 'Chuvisco gelado', 57: 'Chuvisco gelado intenso',
  61: 'Chuva fraca', 63: 'Chuva', 65: 'Chuva forte', 66: 'Chuva gelada', 67: 'Chuva gelada forte',
  71: 'Neve fraca', 73: 'Neve', 75: 'Neve forte', 77: 'Grãos de neve',
  80: 'Aguaceiros fracos', 81: 'Aguaceiros', 82: 'Aguaceiros fortes', 85: 'Aguaceiros de neve', 86: 'Aguaceiros de neve fortes',
  95: 'Trovoada', 96: 'Trovoada com granizo', 99: 'Trovoada forte com granizo',
};
export const wxText = (code) => WX[code] ?? '—';
/** grupo visual do código (para ícone e fundo do destaque) */
export function wxGroup(code) {
  if (code === 0) return 'clear';
  if (code === 1) return 'mostly';
  if (code === 2) return 'partly';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 55) return 'drizzle';
  if (code === 56 || code === 57 || code === 66 || code === 67) return 'freezing';
  if (code >= 61 && code <= 65) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'showers';
  if (code === 85 || code === 86) return 'snowshowers';
  if (code >= 95) return 'storm';
  return 'overcast';
}
