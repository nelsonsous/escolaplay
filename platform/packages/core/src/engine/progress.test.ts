import { describe, it, expect } from 'vitest';
import { recordAnswer, subjectAccuracy, subjectMastery, emptySubjectProgress } from './progress.js';
import type { Profile, Exercise } from '../domain/types.js';

const profile: Profile = {
  id: 'p', name: 'Teste', avatar: '🦊', packId: 'pt-PT.grade-2',
  xp: 100, streakDays: 0, subjects: {},
};

const exHard: Exercise = {
  id: 'm1', subject: 'matematica', topic: 't', type: 'mc', difficulty: 3,
  question: 'q', options: ['a', 'b'], answer: 0,
};

describe('recordAnswer', () => {
  it('soma XP por dificuldade quando acerta', () => {
    const { profile: p, xpGained } = recordAnswer(profile, exHard, true);
    expect(xpGained).toBe(30);
    expect(p.xp).toBe(130);
    expect(p.subjects['matematica']!.correct).toBe(1);
    expect(p.subjects['matematica']!.attempts).toBe(1);
    expect(p.subjects['matematica']!.seenIds).toContain('m1');
  });

  it('nao soma XP quando erra mas conta a tentativa', () => {
    const { profile: p, xpGained } = recordAnswer(profile, exHard, false);
    expect(xpGained).toBe(0);
    expect(p.xp).toBe(100);
    expect(p.subjects['matematica']!.attempts).toBe(1);
    expect(p.subjects['matematica']!.correct).toBe(0);
  });

  it('nao duplica o id ja visto', () => {
    const r1 = recordAnswer(profile, exHard, true);
    const r2 = recordAnswer(r1.profile, exHard, false);
    expect(r2.profile.subjects['matematica']!.seenIds).toEqual(['m1']);
    expect(r2.profile.subjects['matematica']!.attempts).toBe(2);
  });

  it('nao muta o perfil original', () => {
    recordAnswer(profile, exHard, true);
    expect(profile.xp).toBe(100);
    expect(profile.subjects['matematica']).toBeUndefined();
  });
});

describe('metricas', () => {
  it('subjectAccuracy', () => {
    expect(subjectAccuracy({ ...emptySubjectProgress(), correct: 3, attempts: 4 })).toBe(75);
    expect(subjectAccuracy(undefined)).toBe(0);
  });
  it('subjectMastery', () => {
    expect(subjectMastery({ ...emptySubjectProgress(), seenIds: ['a', 'b'] }, 4)).toBe(50);
    expect(subjectMastery(undefined, 10)).toBe(0);
  });
});
