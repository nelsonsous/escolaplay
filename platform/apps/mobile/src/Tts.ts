// Wrapper de Text-to-Speech via expo-speech. Carregamento defensivo —
// se o módulo não estiver instalado, falha silenciosamente.
let Speech: {
  speak: (text: string, opts?: { language?: string; voice?: string; rate?: number; pitch?: number }) => void;
  stop: () => void;
  isSpeakingAsync?: () => Promise<boolean>;
} | null = null;

try {

  Speech = require('expo-speech');
} catch {
  Speech = null;
}

export function ttsAvailable(): boolean {
  return !!Speech;
}

export function ttsSpeak(text: string, lang: string = 'en-US'): void {
  if (!Speech) return;
  try {
    Speech.stop();
    Speech.speak(text, { language: lang, rate: 0.95, pitch: 1.0 });
  } catch {
    /* swallow */
  }
}

export function ttsStop(): void {
  if (!Speech) return;
  try { Speech.stop(); } catch { /* swallow */ }
}
