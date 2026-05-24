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

/** Toca o texto na voz preferida (se houver) ou na melhor disponível. */
export function ttsSpeak(text: string, lang: string = 'en-US'): void {
  if (!Speech) return;
  // Limpa qualquer fala em curso. Adicionamos um pequeno delay antes de
  // chamar speak — em alguns devices iOS, chamar speak imediatamente
  // após stop falha silenciosamente (motor ainda em estado "stopping").
  try { Speech.stop(); } catch { /* swallow */ }

  const doSpeak = () => {
    if (!Speech) return;
    // 1.º preferred (override do utilizador)
    const pref = preferredVoice[lang];
    if (pref) {
      Speech.speak(text, voiceOpts(lang, pref));
      return;
    }
    // 2.º best discovered (cached)
    const cached = bestVoiceCache[lang];
    if (cached !== undefined) {
      Speech.speak(text, voiceOpts(lang, cached));
      return;
    }
    // 3.º default + lookup em background
    getBestVoice(lang).catch(() => {/* swallow */});
    Speech.speak(text, voiceOpts(lang, null));
  };

  // 100ms de delay defensivo — imperceptível para o utilizador mas
  // suficiente para o motor TTS recuperar entre stop e speak.
  setTimeout(doSpeak, 100);
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
