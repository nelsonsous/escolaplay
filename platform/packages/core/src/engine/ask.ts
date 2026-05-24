// "Falar com o Professor" — resolução local de perguntas em linguagem
// natural baseada nos tópicos do pack ativo. Migra _askLocalResolve do
// PWA. Sem chamadas externas — é puro lookup com scoring.
//
// Para perguntas que não conseguem ser resolvidas localmente, a UI pode
// (opcionalmente) tentar uma chamada a uma API de IA com fallback.
import type { CurriculumPack, Subject } from '../domain/types.js';

/** Match individual: par (disciplina, tópico) que coincide com a pergunta. */
export interface AskMatch {
  subjectKey: string;
  subject: Subject;
  topic: string;
  score: number;
}

/** Resultado de uma pergunta. */
export interface AskResult {
  /** Pergunta normalizada (echo da query). */
  query: string;
  /** Resposta em texto (curta, pedagógica). */
  answer: string;
  /** Top match (subject + topic), null se nada encontrado. */
  topMatch: AskMatch | null;
  /** Top 3 matches em ordem decrescente de score. */
  matches: AskMatch[];
  /** Palavras-chave extraídas (para debug / sugestão de pesquisa). */
  keywords: string[];
  /** Como a resposta foi obtida. */
  source: 'local' | 'ai' | 'empty';
}

// Stopwords agnósticas — PT e EN básicas. Tokens curtos (< 3) também são
// ignorados, por isso não precisamos de todas as preposições curtas.
const STOPWORDS = new Set<string>([
  // PT
  'que', 'qual', 'quais', 'como', 'onde', 'quem', 'porque', 'para', 'pelo',
  'pela', 'dos', 'das', 'dum', 'duma', 'com', 'sem', 'por', 'mais', 'menos',
  'meu', 'minha', 'meus', 'minhas', 'tens', 'tenho', 'uma', 'umas', 'uns',
  'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'isso', 'isto', 'aquilo',
  'aquele', 'aquela', 'significa', 'explica', 'explicar', 'ajuda', 'ajudar',
  'quero', 'queria', 'saber', 'praticar', 'treino', 'treinar', 'sobre',
  // EN
  'the', 'what', 'which', 'how', 'where', 'who', 'why', 'for', 'with',
  'without', 'this', 'that', 'these', 'those', 'mean', 'means', 'explain',
  'help', 'want', 'learn', 'about', 'into', 'from', 'have', 'has', 'and',
  'but', 'are', 'was', 'were', 'you', 'your',
]);

/** Normaliza: lowercase + remove diacríticos. */
export function askNorm(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Tokeniza removendo stopwords e tokens curtos. */
export function askTokenize(s: string): string[] {
  const n = askNorm(s);
  return n
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/**
 * Resolve uma pergunta em linguagem natural contra o pack ativo.
 * Retorna o(s) tópico(s) mais relevantes com uma resposta curta.
 */
export function askLocalResolve(pack: CurriculumPack, question: string): AskResult {
  const query = String(question || '').trim();
  if (!query) {
    return { query: '', answer: '', topMatch: null, matches: [], keywords: [], source: 'empty' };
  }

  const nq = askNorm(query);
  const tokens = askTokenize(query);
  const matches: AskMatch[] = [];

  for (const subject of pack.subjects) {
    const topics = pack.curriculum[subject.key] || [];
    const nsub = askNorm(subject.name);
    const subjectMentioned = !!(nsub && nq.includes(nsub));

    for (const topic of topics) {
      const nt = askNorm(topic);
      let score = 0;
      for (const tk of tokens) {
        if (nt === tk) score += 10;
        else if (nt.includes(tk)) score += 5;
      }
      if (subjectMentioned) score += 3;
      if (score > 0) {
        matches.push({ subjectKey: subject.key, subject, topic, score });
      }
    }
  }

  matches.sort((a, b) => b.score - a.score);
  const top = matches.slice(0, 3);

  let answer = '';
  if (top.length > 0) {
    const first = top[0]!;
    answer = `Encontrei tópicos relacionados em ${first.subject.name}. Tenta o tópico "${first.topic}" ou pratica os exercícios desse tema.`;
  } else {
    answer =
      'Não encontrei nenhum tópico no currículo ativo que corresponda à pergunta. Tenta reformular ou escolhe um tópico no menu de disciplinas.';
  }

  return {
    query,
    answer,
    topMatch: top[0] || null,
    matches: top,
    keywords: tokens,
    source: top.length > 0 ? 'local' : 'empty',
  };
}

/** Conta exercícios de um pack para um (subject, topic) específico. */
export function exercisesForTopic(
  pack: CurriculumPack,
  subjectKey: string,
  topic: string,
): number {
  return pack.exercises.filter((e) => e.subject === subjectKey && e.topic === topic).length;
}

/** Sugestões para popular o ask card (são tópicos reais do pack). */
export function askSuggestions(pack: CurriculumPack, maxN: number = 4): string[] {
  const out: string[] = [];
  for (const subject of pack.subjects) {
    const topics = pack.curriculum[subject.key] || [];
    if (topics.length > 0) {
      // Pega o 1.º tópico de cada disciplina como sugestão.
      out.push(`O que é ${topics[0]!.toLowerCase()}?`);
      if (out.length >= maxN) break;
    }
  }
  return out;
}
