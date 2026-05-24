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
  Lesson,
  Unit,
  Course,
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

export { buildSession } from './engine/session.js';
export type { SeenMap, ResultMap, BuildSessionOptions } from './engine/session.js';

export { updateStreak, todayStr, daysBetween } from './engine/streak.js';
export type { StreakState, StreakUpdate } from './engine/streak.js';

export {
  recordAnswer,
  subjectAccuracy,
  subjectMastery,
  emptySubjectProgress,
} from './engine/progress.js';

export {
  askLocalResolve,
  askTokenize,
  askNorm,
  askSuggestions,
  exercisesForTopic,
} from './engine/ask.js';
export type { AskMatch, AskResult } from './engine/ask.js';

export {
  listPacks,
  getPack,
  getPackByGrade,
  availableGrades,
} from './content/packs.js';

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
