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

/** Um exemplo wrong→right para ilustrar a regra. */
export interface TutorExample {
  wrong: string;
  right: string;
  note?: string;
}

/** Um mini-exercício mc para praticar a regra. */
export interface TutorPracticeExercise {
  q: string;
  opts: string[];
  ans: number;
  exp?: string;
}

/** Análise pedagógica do erro principal. */
export interface TutorErrorAnalysis {
  /** Chave estável da categoria (ex: "tempos_verbais"). */
  category: string;
  /** Etiqueta da categoria em PT-PT (ex: "Tempos verbais"). */
  categoryLabel: string;
  /** Título curto da regra em PT-PT (ex: "Already vs Yet em frases negativas"). */
  title: string;
  /** Explicação pedagógica em PT-PT (1-2 frases). */
  lesson: string;
  /** Exemplos wrong→right (2-3). */
  examples: TutorExample[];
  /** Exercícios mc para praticar (2-3). */
  practice: TutorPracticeExercise[];
}

/** Resposta estruturada do tutor. */
export interface TutorReply {
  /** Resposta principal em inglês (2-3 frases + pergunta). */
  reply: string;
  /** Versão corrigida da última frase do aluno (ou "" se já estava bem). */
  corrected: string;
  /** Dica curta em PT-PT sobre o erro principal (ou elogio se perfeito). */
  tip: string;
  /** Análise pedagógica do erro (null se não houve erro relevante). */
  errorAnalysis: TutorErrorAnalysis | null;
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

Do ALL of this and return STRICT JSON only:

1) "corrected": rewrite the student's sentence with correct grammar, tenses and natural word choice. If it was already correct, return "".

2) "tip": ONE short tip in EUROPEAN PORTUGUESE (Portugal, never Brazilian), max 18 words, about the main mistake. If perfect, a short praise in PT-PT.

3) "errorAnalysis": if there is a MEANINGFUL grammar/usage error (not just a typo or pronunciation slip), return a pedagogical analysis object. If no meaningful error, return null. Object shape:
   {
     "category": one of "tempos_verbais","conectores","preposicoes","vocabulario","estrutura_frase","artigos","modais","outro",
     "categoryLabel": short PT-PT label (ex: "Tempos verbais", "Conectores e ligadores"),
     "title": ONE short PT-PT line naming the rule (ex: "Already vs Yet em frases negativas"),
     "lesson": 1-2 sentences in PT-PT explaining WHEN to use which form (max 50 words, no markdown),
     "examples": [
       {"wrong": "...", "right": "...", "note": "..."}  // 2-3 short example pairs
     ],
     "practice": [
       {"q": "English sentence with ___", "opts": ["a","b","c","d"], "ans": 0, "exp": "short PT-PT explanation"}
       // EXACTLY 3 mc exercises to drill THIS specific rule
     ]
   }

4) "reply": your spoken answer in ENGLISH — react naturally to the student's message (2-3 short sentences) and END with ONE question to keep them talking. Conversational, meeting-relevant.

Return ONLY this JSON object (no markdown, no commentary):
{"corrected":"...","tip":"...","errorAnalysis":null or {...},"reply":"..."}`;
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
    // Resposta agora pode incluir lição + 3 exercícios — precisa mais tokens.
    max_tokens: Math.max(maxTokens, 900),
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
  let errorAnalysis: TutorErrorAnalysis | null = null;
  if (m && m[0]) {
    try {
      const p = JSON.parse(m[0]);
      corrected = String(p.corrected ?? '').trim();
      tip = String(p.tip ?? '').trim();
      reply = String(p.reply ?? '').trim();
      errorAnalysis = sanitizeErrorAnalysis(p.errorAnalysis);
    } catch { /* fall through */ }
  }
  if (!reply) reply = "Got it. Can you tell me a bit more?";
  // Se "corrected" é igual ao input, não vale a pena mostrar — e também
  // não faz sentido haver análise de erro.
  if (corrected && normalizeForCompare(corrected) === normalizeForCompare(userText)) {
    corrected = '';
    errorAnalysis = null;
  }
  return { reply, corrected, tip, errorAnalysis };
}

function sanitizeErrorAnalysis(raw: unknown): TutorErrorAnalysis | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const category = String(r.category || '').trim();
  const categoryLabel = String(r.categoryLabel || '').trim();
  const title = String(r.title || '').trim();
  const lesson = String(r.lesson || '').trim();
  if (!title || !lesson) return null;

  const examples = Array.isArray(r.examples)
    ? r.examples
        .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
        .map((e) => {
          const ex: TutorExample = {
            wrong: String(e.wrong || '').trim(),
            right: String(e.right || '').trim(),
          };
          if (e.note !== undefined) ex.note = String(e.note).trim();
          return ex;
        })
        .filter((e) => e.wrong && e.right)
        .slice(0, 3)
    : [];

  const practice = Array.isArray(r.practice)
    ? r.practice
        .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
        .map((e) => {
          const opts = Array.isArray(e.opts) ? e.opts.map((o) => String(o)) : [];
          const ans = typeof e.ans === 'number' ? e.ans : -1;
          const out: TutorPracticeExercise = {
            q: String(e.q || '').trim(),
            opts,
            ans,
          };
          if (e.exp !== undefined) out.exp = String(e.exp).trim();
          return out;
        })
        .filter((e) => e.q && e.opts.length >= 2 && e.ans >= 0 && e.ans < e.opts.length)
        .slice(0, 3)
    : [];

  return {
    category: category || 'outro',
    categoryLabel: categoryLabel || 'Inglês',
    title,
    lesson,
    examples,
    practice,
  };
}

function normalizeForCompare(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
