import { describe, it, expect } from 'vitest';
import { askLocalResolve, askNorm, askTokenize, askSuggestions } from './ask.js';
import { getPackByGrade, getPack } from '../content/packs.js';

describe('ask: resolução local', () => {
  it('normaliza removendo diacríticos e em minúsculas', () => {
    expect(askNorm('Olá, Mundo!')).toBe('ola, mundo!');
    expect(askNorm('PORTUGUÊS — Coesão')).toBe('portugues — coesao');
  });

  it('tokeniza e remove stopwords', () => {
    expect(askTokenize('o que significa um nome próprio?')).toEqual(['nome', 'proprio']);
    expect(askTokenize('how do you say closing meeting?')).toContain('closing');
  });

  it('encontra tópico relevante no pack do 2.º ano', () => {
    const pack = getPackByGrade('pt-PT', 2)!;
    const r = askLocalResolve(pack, 'sílabas da palavra menina');
    expect(r.source).toBe('local');
    expect(r.topMatch).not.toBeNull();
    expect(r.topMatch!.subjectKey).toBe('portugues');
    expect(r.topMatch!.topic.toLowerCase()).toContain('sílaba');
  });

  it('devolve source=empty quando nada encontra', () => {
    const pack = getPackByGrade('pt-PT', 2)!;
    const r = askLocalResolve(pack, 'xyz quantum chronosynclastic infundibulum');
    expect(r.source).toBe('empty');
    expect(r.topMatch).toBeNull();
  });

  it('pergunta vazia devolve source=empty', () => {
    const pack = getPackByGrade('pt-PT', 2)!;
    expect(askLocalResolve(pack, '').source).toBe('empty');
    expect(askLocalResolve(pack, '   ').source).toBe('empty');
  });

  it('pack english-pm resolve perguntas em inglês', () => {
    const pack = getPack('en-PM.english-pm')!;
    const r = askLocalResolve(pack, 'how to open a meeting agenda?');
    expect(r.source).toBe('local');
    expect(r.topMatch).not.toBeNull();
    expect(r.topMatch!.subjectKey).toBe('english_pm');
  });

  it('askSuggestions devolve perguntas baseadas em tópicos reais', () => {
    const pack = getPackByGrade('pt-PT', 2)!;
    const sug = askSuggestions(pack, 3);
    expect(sug.length).toBeGreaterThan(0);
    expect(sug.length).toBeLessThanOrEqual(3);
    expect(sug[0]).toMatch(/o que é/i);
  });
});
