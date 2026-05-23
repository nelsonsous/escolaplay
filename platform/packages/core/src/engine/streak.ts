// Motor de ofensiva (streak). Extraido de app.js fielmente, incluindo o
// "escudo" mensal que salva a streak apos uma falha. Puro e testavel.

export interface StreakState {
  days: number;
  best: number;
  /** Data 'YYYY-MM-DD' do ultimo dia com atividade. */
  lastDate: string | null;
  /** Data 'YYYY-MM-DD' do ultimo uso do escudo. */
  lastShield: string | null;
}

export interface StreakUpdate {
  streak: StreakState;
  increased: boolean;
  /** Escudo usado para salvar a streak. */
  saved: boolean;
  /** A streak partiu e recomecou em 1. */
  reset: boolean;
}

/** Data de hoje no formato 'YYYY-MM-DD' (local). */
export function todayStr(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Numero de dias entre duas datas 'YYYY-MM-DD'. 999 se faltar alguma. */
export function daysBetween(a: string | null, b: string | null): number {
  if (!a || !b) return 999;
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

/**
 * Aplica a atividade de hoje a uma streak. Replica a regra da PWA:
 *  - mesmo dia: sem alteracao
 *  - gap 1-2 dias: +1 (1 dia de folga ainda conta)
 *  - gap >= 3: usa escudo se disponivel (>=30 dias desde o ultimo), senao
 *    recomeca em 1.
 */
export function updateStreak(prev: StreakState, today: string = todayStr()): StreakUpdate {
  const streak: StreakState = { ...prev };
  let increased = false;
  let saved = false;
  let reset = false;

  if (streak.lastDate !== today) {
    const gap = daysBetween(streak.lastDate, today);
    if (gap >= 1 && gap <= 2) {
      streak.days += 1;
      increased = true;
    } else {
      const shieldDays = streak.lastShield ? daysBetween(streak.lastShield, today) : null;
      const canSave = streak.days > 0 && (shieldDays == null || shieldDays >= 30);
      if (canSave) {
        streak.days += 1;
        streak.lastShield = today;
        increased = true;
        saved = true;
      } else {
        if (streak.days > 0) reset = true;
        streak.days = 1;
      }
    }
    streak.lastDate = today;
    if (streak.days > streak.best) streak.best = streak.days;
  }

  return { streak, increased, saved, reset };
}
