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

// Importa expo-av para forçar audio session em playback antes de cada speak.
// Carregamento defensivo — se não estiver instalado, ignora.
let AvAudio: any = null;
try {

  AvAudio = require('expo-av').Audio;
} catch {
  AvAudio = null;
}

async function ensurePlaybackAudioSession(): Promise<void> {
  if (!AvAudio) return;
  try {
    await AvAudio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch {
    /* swallow */
  }
}

type SpeechModule = {
  speak: (text: string, opts?: {
    language?: string; voice?: string; rate?: number; pitch?: number;
    onDone?: () => void; onError?: () => void; onStopped?: () => void;
    onStart?: () => void;
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

// Sequência monotónica — cada chamada incrementa. Se uma nova chamada
// vier antes da anterior terminar de preparar, a anterior aborta para
// evitar dois speaks sobrepostos.
let speakSeq = 0;

async function _ttsSpeakSafely(text: string, lang: string, voiceOverride?: string | null): Promise<void> {
  if (!Speech) return;

  const mySeq = ++speakSeq;

  // 1. Stop SEMPRE (idempotente, seguro mesmo em idle).
  try { Speech.stop(); } catch { /* swallow */ }

  // 2. Esperar 300ms para garantir que o motor sai do estado "stopping"
  //    completamente — alguns iOS deixam o motor pendurado se chamarmos
  //    speak demasiado cedo após stop.
  await new Promise<void>((r) => setTimeout(r, 300));
  if (mySeq !== speakSeq) return; // nova call sobrepôs-se — abortar

  // 3. Garantir audio session em playback. Após cada gravação ou
  //    interrupção, isto é o que permite que speak tenha realmente som.
  await ensurePlaybackAudioSession();
  if (mySeq !== speakSeq) return;

  // 4. Pequeno tick após setAudioMode para o session ficar efectivo.
  await new Promise<void>((r) => setTimeout(r, 60));
  if (mySeq !== speakSeq || !Speech) return;

  // 5. Resolve qual voz usar.
  let candidate: string | null = null;
  if (voiceOverride !== undefined) {
    candidate = voiceOverride;
  } else if (preferredVoice[lang]) {
    candidate = preferredVoice[lang]!;
  } else if (bestVoiceCache[lang]) {
    candidate = bestVoiceCache[lang]!;
  }

  // 6. Valida (apenas se conseguimos lista de vozes — não bloqueia).
  if (candidate) {
    const known = await ensureKnownVoices(lang);
    if (known.size > 0 && !known.has(candidate)) {
      candidate = null;
    }
  }
  if (mySeq !== speakSeq || !Speech) return;

  // 7. Speak. Sem onError retry (interrupções legítimas disparam onError).
  Speech.speak(text, voiceOpts(lang, candidate));

  // Em paralelo, descobre a melhor voz para cache.
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
