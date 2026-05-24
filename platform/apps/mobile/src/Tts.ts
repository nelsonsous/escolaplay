// Wrapper de Text-to-Speech via expo-speech.
//
// Estratégia: na 1.ª chamada, descobrimos todas as vozes disponíveis no
// iOS, escolhemos a melhor para en-US (preferindo Premium > Enhanced >
// Compact, e vozes Siri / femininas naturais como Ava/Samantha/Siri 2)
// e cacheamos. Cada `ttsSpeak` usa essa voz.
//
// O motor é o mesmo da Siri (AVSpeechSynthesis). Para ter qualidade
// "natural" o utilizador tem de descarregar a voz premium em
// Definições → Acessibilidade → Conteúdo Falado → Vozes → Inglês.

type SpeechModule = {
  speak: (text: string, opts?: {
    language?: string; voice?: string; rate?: number; pitch?: number;
    onDone?: () => void; onError?: () => void;
  }) => void;
  stop: () => void;
  isSpeakingAsync?: () => Promise<boolean>;
  getAvailableVoicesAsync?: () => Promise<Array<{
    identifier: string;
    name: string;
    language: string;
    quality?: 'Default' | 'Enhanced' | 'Premium' | string;
  }>>;
};

let Speech: SpeechModule | null = null;
try {

  Speech = require('expo-speech');
} catch {
  Speech = null;
}

export function ttsAvailable(): boolean {
  return !!Speech;
}

// Cache da melhor voz por language (ex: "en-US").
const bestVoiceCache: Record<string, string | null> = {};
const inflightLookup: Record<string, Promise<string | null> | undefined> = {};

// Override do utilizador (escolhido em Settings). Quando definido, é
// usado em vez da auto-discovery.
const preferredVoice: Record<string, string | null> = {};

/** Cache de identifiers de vozes existentes (por language). */
const knownVoiceIds: Record<string, Set<string>> = {};

async function ensureKnownVoices(lang: string): Promise<Set<string>> {
  if (knownVoiceIds[lang]) return knownVoiceIds[lang]!;
  const ids = new Set<string>();
  if (Speech?.getAvailableVoicesAsync) {
    try {
      const all = await Speech.getAvailableVoicesAsync();
      const langKey = lang.toLowerCase().slice(0, 2);
      all.filter((v) => v.language?.toLowerCase().startsWith(langKey))
        .forEach((v) => ids.add(v.identifier));
    } catch { /* swallow */ }
  }
  knownVoiceIds[lang] = ids;
  return ids;
}

/** Define a voz preferida do utilizador para um idioma. Passa null para limpar. */
export function ttsSetPreferredVoice(lang: string, voiceId: string | null): void {
  preferredVoice[lang] = voiceId;
}

/** Devolve a voz preferida (null se nenhuma). */
export function ttsGetPreferredVoice(lang: string): string | null {
  return preferredVoice[lang] ?? null;
}

// Heurística: priorizar Premium > Enhanced > Default, e dentro de cada
// tier dar preferência a vozes Siri / femininas naturais conhecidas.
const PREFERRED_NAMES = [
  'siri', 'ava', 'evan', 'samantha', 'allison', 'nicky', 'tom', 'aaron',
];
const QUALITY_RANK: Record<string, number> = { Premium: 3, Enhanced: 2, Default: 1 };

async function discoverBestVoice(lang: string): Promise<string | null> {
  if (!Speech?.getAvailableVoicesAsync) return null;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices || voices.length === 0) return null;
    const langLower = lang.toLowerCase();
    const candidates = voices.filter((v) => v.language?.toLowerCase().startsWith(langLower.slice(0, 2)));
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      const qa = QUALITY_RANK[a.quality || 'Default'] || 1;
      const qb = QUALITY_RANK[b.quality || 'Default'] || 1;
      if (qa !== qb) return qb - qa;
      // dentro do mesmo tier, preferência por vozes "conhecidas"
      const na = scoreName(a.name);
      const nb = scoreName(b.name);
      return nb - na;
    });
    return candidates[0]?.identifier ?? null;
  } catch {
    return null;
  }
}

function scoreName(name: string): number {
  const lower = (name || '').toLowerCase();
  for (let i = 0; i < PREFERRED_NAMES.length; i++) {
    if (lower.includes(PREFERRED_NAMES[i]!)) return PREFERRED_NAMES.length - i;
  }
  return 0;
}

function getBestVoice(lang: string): Promise<string | null> {
  if (lang in bestVoiceCache) return Promise.resolve(bestVoiceCache[lang]!);
  if (inflightLookup[lang]) return inflightLookup[lang]!;
  const p = discoverBestVoice(lang).then((v) => {
    bestVoiceCache[lang] = v;
    delete inflightLookup[lang];
    return v;
  });
  inflightLookup[lang] = p;
  return p;
}

/** Toca o texto na voz preferida (se houver) ou na melhor disponível.
 * Se `voiceOverride` for passado, usa essa voz (ignora preferida) —
 * útil para o botão "testar voz" no picker. */
export function ttsSpeak(text: string, lang: string = 'en-US', voiceOverride?: string | null): void {
  if (!Speech) return;
  void _ttsSpeakSafely(text, lang, voiceOverride);
}

async function _ttsSpeakSafely(text: string, lang: string, voiceOverride?: string | null): Promise<void> {
  if (!Speech) return;

  // Só faz stop se efetivamente está a falar — chamar stop em "idle"
  // pode pôr o motor num estado estranho em alguns iOS.
  try {
    const speaking = Speech.isSpeakingAsync ? await Speech.isSpeakingAsync() : false;
    if (speaking) {
      Speech.stop();
      // Espera o motor recuperar antes de pedir nova fala.
      await new Promise<void>((r) => setTimeout(r, 150));
    }
  } catch { /* swallow */ }

  if (!Speech) return;

  // Resolve qual voz usar (override > preferred > cached best > default).
  let candidate: string | null = null;
  if (voiceOverride !== undefined) {
    candidate = voiceOverride; // explicit (pode ser null)
  } else if (preferredVoice[lang]) {
    candidate = preferredVoice[lang]!;
  } else if (bestVoiceCache[lang]) {
    candidate = bestVoiceCache[lang]!;
  }

  // Valida que a voz existe no sistema — evita Speech.speak silencioso
  // quando o identifier está stale (após update iOS, voz removida, etc.).
  if (candidate) {
    const known = await ensureKnownVoices(lang);
    if (!known.has(candidate)) {
      candidate = null; // cai para default
    }
  }

  if (!Speech) return;
  // NOTA: não usamos onError com retry — interrupções legítimas (ex:
  // utilizador a começar a gravar microfone, que muda audio session)
  // também disparam onError, e o retry fazia o TTS começar a falar
  // outra vez no momento errado. A validação de voice identifier antes
  // de speak já cobre o caso da voz não existir.
  Speech.speak(text, voiceOpts(lang, candidate));

  // Em paralelo, descobre a melhor voz para cache (se ainda não houver).
  if (!bestVoiceCache[lang]) {
    getBestVoice(lang).catch(() => {/* swallow */});
  }
}

function voiceOpts(lang: string, voice: string | null): {
  language?: string; voice?: string; rate?: number; pitch?: number;
} {
  const opts: { language?: string; voice?: string; rate?: number; pitch?: number } = {
    language: lang,
    rate: 1.0,
    pitch: 1.0,
  };
  if (voice) opts.voice = voice;
  return opts;
}

export function ttsStop(): void {
  if (!Speech) return;
  try { Speech.stop(); } catch { /* swallow */ }
}

/**
 * Lista todas as vozes disponíveis para um idioma. Útil para um futuro
 * ecrã de Settings onde o utilizador escolhe a sua voz preferida.
 */
export async function ttsListVoices(lang: string = 'en-US'): Promise<Array<{
  identifier: string; name: string; quality: string;
}>> {
  if (!Speech?.getAvailableVoicesAsync) return [];
  try {
    const all = await Speech.getAvailableVoicesAsync();
    return all
      .filter((v) => v.language?.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)))
      .map((v) => ({
        identifier: v.identifier,
        name: v.name,
        quality: String(v.quality || 'Default'),
      }))
      .sort((a, b) => (QUALITY_RANK[b.quality] || 1) - (QUALITY_RANK[a.quality] || 1));
  } catch {
    return [];
  }
}
