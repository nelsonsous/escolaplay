// English Tutor — chamada à API Mistral (com fallback opcional Groq).
// Função pura: recebe key + histórico + texto do utilizador, devolve
// resposta estruturada {reply, corrected, tip}.
//
// Fiel ao prompt do PWA (`_tutorRespond` em app.js) — mantém formato JSON
// estrito e o tom warm/encouraging do tutor para PM.

/** Uma mensagem do histórico de conversa. */
export interface TutorMessage {
  /** Quem disse — 'student' (utilizador) ou 'tutor' (IA). */
  role: 'student' | 'tutor';
  text: string;
}

/** Resposta estruturada do tutor. */
export interface TutorReply {
  /** Resposta principal em inglês (2-3 frases + pergunta). */
  reply: string;
  /** Versão corrigida da última frase do aluno (ou "" se já estava bem). */
  corrected: string;
  /** Dica curta em PT-PT sobre o erro principal (ou elogio se perfeito). */
  tip: string;
}

/** Opções para uma chamada ao tutor. */
export interface CallTutorOptions {
  /** Chave da API Mistral. */
  apiKey: string;
  /** Histórico de conversa (últimas N mensagens) — ordem cronológica. */
  history: TutorMessage[];
  /** O que o aluno acabou de dizer. */
  userText: string;
  /** Modelo a usar (default 'mistral-small-latest'). */
  model?: string;
  /** Tokens máximos da resposta. */
  maxTokens?: number;
  /** Endpoint custom (testing). */
  endpoint?: string;
  /** Fetch custom (testing — caso contrário usa global fetch). */
  fetch?: typeof globalThis.fetch;
}

const DEFAULT_ENDPOINT = 'https://api.mistral.ai/v1/chat/completions';
const DEFAULT_MODEL = 'mistral-small-latest';

/** Mensagem fixa de abertura (não gasta call à IA, igual ao PWA). */
export const TUTOR_OPENER =
  "Hi! I'm your English tutor. Let's practise for your meetings. To start: what did you work on this week?";

function buildPrompt(history: TutorMessage[], userText: string): string {
  const hist = history.slice(-8)
    .map((m) => `${m.role === 'student' ? 'Student' : 'Tutor'}: ${m.text}`)
    .join('\n');

  return `You are a warm, encouraging English tutor for a Portuguese Project Manager (level B2→C1) preparing to lead SAP/consulting meetings in English.

Conversation so far:
${hist}

The student just said (transcribed from speech): "${userText}"

Do ALL of this:
1) "corrected": rewrite the student's sentence with correct grammar, verb tenses and natural word choice. If it was already correct, return "".
2) "tip": ONE short tip in EUROPEAN PORTUGUESE (Portugal, never Brazilian), max 18 words, about the main mistake (tense, grammar or a likely pronunciation slip). If perfect, a short praise in PT-PT.
3) "reply": your spoken answer in ENGLISH — react naturally, 2-3 short sentences, and END with ONE question to keep the student talking. Keep it conversational and meeting-relevant.

Return STRICT JSON only:
{"corrected":"...","tip":"...","reply":"..."}`;
}

/**
 * Chama a API Mistral para obter a próxima resposta do tutor.
 * Throws em caso de erro de rede / 401 / parse — caller deve tratar.
 */
export async function callTutor(opts: CallTutorOptions): Promise<TutorReply> {
  const {
    apiKey,
    history,
    userText,
    model = DEFAULT_MODEL,
    maxTokens = 420,
    endpoint = DEFAULT_ENDPOINT,
    fetch: fetchFn = globalThis.fetch,
  } = opts;

  if (!apiKey) {
    throw new Error('Missing Mistral API key');
  }
  if (!userText.trim()) {
    throw new Error('Empty user text');
  }

  const prompt = buildPrompt(history, userText);
  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature: 0.7,
    response_format: { type: 'json_object' as const },
  };

  const res = await fetchFn(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await safeText(res);
    throw new Error(`Mistral ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as MistralChatResponse;
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Mistral: no content in response');
  }
  return parseTutorJson(content, userText);
}

interface MistralChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

async function safeText(res: Response): Promise<string> {
  try { return await res.text(); } catch { return ''; }
}

/** Parsa o JSON da resposta com fallbacks defensivos. Exportado para testes. */
export function parseTutorJson(raw: string, userText: string): TutorReply {
  const m = raw.match(/\{[\s\S]*\}/);
  let corrected = '', tip = '', reply = '';
  if (m && m[0]) {
    try {
      const p = JSON.parse(m[0]);
      corrected = String(p.corrected ?? '').trim();
      tip = String(p.tip ?? '').trim();
      reply = String(p.reply ?? '').trim();
    } catch { /* fall through */ }
  }
  if (!reply) reply = "Got it. Can you tell me a bit more?";
  // Se "corrected" é igual ao input, não vale a pena mostrar.
  if (corrected && normalizeForCompare(corrected) === normalizeForCompare(userText)) {
    corrected = '';
  }
  return { reply, corrected, tip };
}

function normalizeForCompare(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
