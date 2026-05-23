// API publica do core. Web e mobile importam daqui — nunca de caminhos
// internos.

export type {
  ExerciseType,
  Difficulty,
  Subject,
  Exercise,
  Curriculum,
  CurriculumPack,
  SubjectProgress,
  Profile,
} from './domain/types.js';

export {
  LEVELS,
  XP_BY_DIFFICULTY,
  xpForCorrect,
  levelInfo,
  levelProgressPercent,
} from './engine/xp.js';
export type { Level, LevelInfo } from './engine/xp.js';

export {
  normalizeText,
  checkFillAnswer,
  checkAnswer,
} from './engine/answer.js';
export type { UserAnswer } from './engine/answer.js';

export {
  buildPackFromLegacy,
  fromLegacyExercise,
} from './content/legacy.js';
export type {
  LegacySubject,
  LegacySubjects,
  LegacyExercise,
  BuildPackInput,
} from './content/legacy.js';
