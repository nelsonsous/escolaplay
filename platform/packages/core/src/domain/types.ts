// Modelo de dominio da EscolaPlay.
//
// Desenhado para ser GLOBAL desde a base: o conteudo nao esta colado ao
// curriculo portugues. Um `CurriculumPack` representa um curriculo de um
// pais/lingua/ano. Trocar de pais = trocar de pack. O motor (XP, niveis,
// selecao de exercicios) nao conhece portugues nenhum.

export type ExerciseType = 'mc' | 'tf' | 'fill' | 'order' | 'match';

export type Difficulty = 1 | 2 | 3;

export interface Subject {
  /** Chave estavel usada em exercicios e progresso (ex: "portugues"). */
  key: string;
  /** Nome apresentavel, localizado pelo pack (ex: "Portugues"). */
  name: string;
  /** Identificador de icone (ex: "fa-book"). Agnostico de plataforma. */
  icon: string;
  /** Cor de marca da disciplina (hex). */
  color: string;
}

/**
 * Exercicio normalizado. O formato legado usa chaves curtas
 * (`s`, `t`, `diff`, `q`, `opts`, `ans`, `exp`) — ver `content/legacy.ts`
 * para o adaptador que converte sem reescrever os 35k de conteudo.
 */
export interface Exercise {
  id: string;
  /** Chave da disciplina (Subject.key). */
  subject: string;
  /** Topico do curriculo a que pertence. */
  topic: string;
  type: ExerciseType;
  difficulty: Difficulty;
  question: string;
  /** Opcoes para "mc"/"order"/"match". Ausente em "fill"/"tf". */
  options?: string[];
  /**
   * Resposta. O formato depende do tipo:
   *  - mc: indice da opcao correta (number)
   *  - tf: boolean
   *  - fill: lista de respostas aceites (string[])
   *  - order/match: depende do conteudo (number[] | string[])
   */
  answer: number | boolean | string[] | number[];
  /** Explicacao mostrada apos responder. */
  explanation?: string;
}

/** Mapa disciplina -> lista ordenada de topicos do curriculo. */
export type Curriculum = Record<string, string[]>;

/**
 * A costura que torna a app global. Identifica um curriculo concreto
 * (lingua + ano) e agrega tudo o que esse curriculo precisa.
 */
export interface CurriculumPack {
  /** Id estavel, ex: "pt-PT.grade-2". */
  id: string;
  /** Locale BCP-47, ex: "pt-PT", "pt-BR", "es-ES". */
  locale: string;
  /** Ano de escolaridade (2..6, etc). */
  grade: number;
  /** Etiqueta localizada, ex: "2.º ano". */
  label: string;
  subjects: Subject[];
  curriculum: Curriculum;
  exercises: Exercise[];
}

/** Progresso por disciplina dentro de um perfil. */
export interface SubjectProgress {
  /** XP acumulado nesta disciplina. */
  xp: number;
  /** Ids de exercicios ja respondidos. */
  seenIds: string[];
  /** Numero de respostas certas. */
  correct: number;
  /** Total de tentativas. */
  attempts: number;
}

/**
 * Perfil de um aluno. Independente de plataforma e de armazenamento —
 * a web (localStorage) e o mobile (AsyncStorage/Firestore) implementam
 * a persistencia; o core so define a forma.
 */
export interface Profile {
  id: string;
  name: string;
  avatar: string;
  /** Pack de curriculo ativo (ex: "pt-PT.grade-2"). */
  packId: string;
  xp: number;
  streakDays: number;
  subjects: Record<string, SubjectProgress>;
  /** Codigo curto unico para amizades/duelos. */
  userCode?: string;
  /** Perfil visivel publicamente para amigos/duelos. */
  shareable?: boolean;
}
