import { describe, it, expect } from 'vitest';
import {
  levelInfo,
  levelProgressPercent,
  xpForCorrect,
  LEVELS,
} from './xp.js';

describe('xpForCorrect', () => {
  it('credita XP conforme a dificuldade', () => {
    expect(xpForCorrect(1)).toBe(10);
    expect(xpForCorrect(2)).toBe(20);
    expect(xpForCorrect(3)).toBe(30);
  });
});

describe('levelInfo', () => {
  it('comeca em Aprendiz com 0 XP', () => {
    const info = levelInfo(0);
    expect(info.name).toBe('Aprendiz');
    expect(info.number).toBe(1);
    expect(info.into).toBe(0);
    expect(info.span).toBe(500);
    expect(info.next).toBe('Aventureiro');
  });

  it('mantem-se em Aprendiz logo abaixo do limite seguinte', () => {
    const info = levelInfo(499);
    expect(info.name).toBe('Aprendiz');
    expect(info.into).toBe(499);
  });

  it('sobe para Aventureiro exatamente no limite', () => {
    const info = levelInfo(500);
    expect(info.name).toBe('Aventureiro');
    expect(info.number).toBe(2);
    expect(info.into).toBe(0);
    expect(info.span).toBe(1000); // 1500 - 500
  });

  it('calcula um nivel intermedio (Cavaleiro)', () => {
    const info = levelInfo(4000);
    expect(info.name).toBe('Cavaleiro');
    expect(info.into).toBe(1000); // 4000 - 3000
    expect(info.span).toBe(2000); // 5000 - 3000
  });

  it('no nivel maximo usa span de +5000 e next null', () => {
    const info = levelInfo(13000);
    expect(info.name).toBe('Lenda');
    expect(info.number).toBe(LEVELS.length);
    expect(info.into).toBe(1000); // 13000 - 12000
    expect(info.span).toBe(5000);
    expect(info.next).toBeNull();
  });
});

describe('levelProgressPercent', () => {
  it('e 0 no inicio de um nivel', () => {
    expect(levelProgressPercent(500)).toBe(0);
  });

  it('e ~50 a meio do primeiro nivel', () => {
    expect(levelProgressPercent(250)).toBe(50);
  });

  it('nunca passa de 100', () => {
    expect(levelProgressPercent(999999)).toBe(100);
  });
});
