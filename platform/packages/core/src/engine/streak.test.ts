import { describe, it, expect } from 'vitest';
import { updateStreak, daysBetween, todayStr } from './streak.js';
import type { StreakState } from './streak.js';

const base: StreakState = { days: 5, best: 5, lastDate: '2026-01-10', lastShield: null };

describe('daysBetween', () => {
  it('conta dias entre datas', () => {
    expect(daysBetween('2026-01-10', '2026-01-11')).toBe(1);
    expect(daysBetween('2026-01-10', '2026-01-13')).toBe(3);
  });
  it('999 se faltar uma data', () => {
    expect(daysBetween(null, '2026-01-10')).toBe(999);
  });
});

describe('updateStreak', () => {
  it('mesmo dia: sem alteracao', () => {
    const r = updateStreak(base, '2026-01-10');
    expect(r.increased).toBe(false);
    expect(r.streak.days).toBe(5);
  });

  it('dia seguinte: +1', () => {
    const r = updateStreak(base, '2026-01-11');
    expect(r.increased).toBe(true);
    expect(r.streak.days).toBe(6);
    expect(r.streak.best).toBe(6);
  });

  it('1 dia de folga (gap 2) ainda continua', () => {
    const r = updateStreak(base, '2026-01-12');
    expect(r.streak.days).toBe(6);
    expect(r.increased).toBe(true);
  });

  it('gap >= 3 sem escudo recente: salva com escudo', () => {
    const r = updateStreak(base, '2026-01-20');
    expect(r.saved).toBe(true);
    expect(r.streak.days).toBe(6);
    expect(r.streak.lastShield).toBe('2026-01-20');
  });

  it('gap >= 3 com escudo usado ha pouco: parte e recomeca em 1', () => {
    const withShield: StreakState = { ...base, lastShield: '2026-01-05' };
    const r = updateStreak(withShield, '2026-01-20');
    expect(r.reset).toBe(true);
    expect(r.streak.days).toBe(1);
  });

  it('todayStr formata a data', () => {
    expect(todayStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
