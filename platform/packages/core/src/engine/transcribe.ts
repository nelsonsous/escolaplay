// Speech-to-Text via Mistral Voxtral.
// O PWA usava Web Speech API (browser-native, grátis), que não existe em
// React Native. No mobile gravamos com expo-audio e enviamos o ficheiro
// para o endpoint /v1/audio/transcriptions de Mistral — usa a mesma key.
//
// Esta é uma função pura: recebe um Blob/File (ou FormData no nativo) e
// devolve a transcrição. O caller é responsável por preparar o áudio.

export interface TranscribeOptions {
  apiKey: string;
  /** Formulário multipart com pelo menos um campo 'file' (e idealmente 'model', 'language'). */
  form: FormData;
  /** Modelo Voxtral (default 'voxtral-mini-latest'). */
  model?: string;
  /** Endpoint custom (testing). */
  endpoint?: string;
  /** Fetch custom (testing). */
  fetch?: typeof globalThis.fetch;
}

export interface TranscribeResult {
  /** Texto transcrito. */
  text: string;
  /** Idioma detetado (se devolvido). */
  language?: string;
}

const DEFAULT_ENDPOINT = 'https://api.mistral.ai/v1/audio/transcriptions';
const DEFAULT_MODEL = 'voxtral-mini-latest';

/**
 * Envia o áudio do FormData para Mistral e devolve a transcrição.
 * O caller tem de incluir o campo 'file' no FormData (Blob no web, ou
 * `{ uri, type, name }` em RN).
 */
export async function transcribeAudio(opts: TranscribeOptions): Promise<TranscribeResult> {
  const {
    apiKey,
    form,
    model = DEFAULT_MODEL,
    endpoint = DEFAULT_ENDPOINT,
    fetch: fetchFn = globalThis.fetch,
  } = opts;

  if (!apiKey) throw new Error('Missing Mistral API key');

  // Garante que o model está incluído (se não estiver, adiciona).
  if (!form.has('model')) form.append('model', model);

  const res = await fetchFn(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      // NOTA: não definir Content-Type — fetch + FormData
      // automaticamente põe multipart/form-data com boundary.
    },
    body: form as any,
  });

  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch { /* swallow */ }
    throw new Error(`Mistral STT ${res.status}: ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as TranscribeApiResponse;
  const result: TranscribeResult = { text: String(json?.text || '').trim() };
  if (json?.language) result.language = json.language;
  return result;
}

interface TranscribeApiResponse {
  text?: string;
  language?: string;
}
