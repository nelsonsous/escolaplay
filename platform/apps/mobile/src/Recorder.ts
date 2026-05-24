// Gravação de áudio para envio à Mistral Voxtral (STT).
// Wrapper defensivo de expo-av — se o módulo não existir, retorna null
// e o caller mostra mensagem amigável.

type AvModule = typeof import('expo-av');
let Av: AvModule | null = null;
try {

  Av = require('expo-av');
} catch {
  Av = null;
}

export function recorderAvailable(): boolean {
  return !!Av;
}

export interface RecordingHandle {
  stopAndGetUri: () => Promise<string | null>;
  cancel: () => Promise<void>;
}

/**
 * Pede permissão de microfone e começa a gravar. Retorna um handle
 * com `stopAndGetUri()` que termina e devolve a URI do ficheiro
 * (`file://...`), ou `cancel()` para abortar.
 *
 * Throws se permissão for negada ou se o módulo não estiver instalado.
 */
export async function startRecording(): Promise<RecordingHandle> {
  if (!Av) throw new Error('expo-av não instalado');
  const { Audio } = Av;

  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) throw new Error('Permissão de microfone negada');

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const recording = new Audio.Recording();
  // Preset HIGH_QUALITY = AAC 44.1kHz, 128kbps — boa para Voxtral.
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();

  let done = false;
  const stopInternal = async (returnUri: boolean): Promise<string | null> => {
    if (done) return null;
    done = true;
    try {
      await recording.stopAndUnloadAsync();
    } catch {
      /* swallow */
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {
      /* swallow */
    }
    if (!returnUri) return null;
    try {
      return recording.getURI();
    } catch {
      return null;
    }
  };

  return {
    stopAndGetUri: () => stopInternal(true),
    cancel: () => stopInternal(false).then(() => undefined),
  };
}

/**
 * Constrói o FormData esperado por Mistral Voxtral a partir de uma URI
 * de ficheiro local (`file://...` no iOS).
 *
 * Em React Native usamos a forma `{ uri, name, type }` que o fetch
 * trata como blob. Não precisamos de ler o ficheiro para memória.
 */
export function buildTranscribeForm(uri: string, language?: string): FormData {
  const form = new FormData();
  // Nome e tipo do ficheiro — o iOS expo-av default produz .m4a (AAC).
  // O servidor da Mistral aceita m4a/aac/wav/mp3.
  form.append('file', {
    uri,
    name: 'speech.m4a',
    type: 'audio/m4a',
  } as any);
  form.append('model', 'voxtral-mini-latest');
  if (language) form.append('language', language);
  return form;
}
