import { describe, it, expect, vi } from 'vitest';
import { callTutor, parseTutorJson, TUTOR_OPENER } from './tutor.js';

describe('tutor: parseTutorJson', () => {
  it('parsa JSON limpo', () => {
    const r = parseTutorJson('{"corrected":"I went to","tip":"Past simple","reply":"Cool!"}', 'i goes to');
    expect(r.reply).toBe('Cool!');
    expect(r.corrected).toBe('I went to');
    expect(r.tip).toBe('Past simple');
  });

  it('aceita JSON envolto em texto', () => {
    const r = parseTutorJson(
      'Here is your response: {"corrected":"","tip":"Perfeito!","reply":"Great!"} -- end',
      'I am ready',
    );
    expect(r.reply).toBe('Great!');
    expect(r.tip).toBe('Perfeito!');
  });

  it('fallback a "Got it" se reply vazio', () => {
    const r = parseTutorJson('{"corrected":"","tip":"","reply":""}', 'hi');
    expect(r.reply).toContain('Got it');
  });

  it('não mostra "corrected" se for igual ao input', () => {
    const r = parseTutorJson('{"corrected":"I am ready","tip":"","reply":"OK"}', 'I am ready');
    expect(r.corrected).toBe('');
  });

  it('lida com lixo total sem crash', () => {
    const r = parseTutorJson('totally not json', 'whatever');
    expect(r.reply).toBeTruthy();
    expect(r.corrected).toBe('');
  });
});

describe('tutor: callTutor', () => {
  it('throw sem apiKey', async () => {
    await expect(callTutor({ apiKey: '', history: [], userText: 'hi' } as any))
      .rejects.toThrow(/Missing Mistral API key/);
  });

  it('throw com userText vazio', async () => {
    await expect(callTutor({ apiKey: 'k', history: [], userText: '   ' } as any))
      .rejects.toThrow(/Empty user text/);
  });

  it('faz POST autorizado com JSON e parsa resposta', async () => {
    const fakeFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"corrected":"","tip":"Bom","reply":"Yes."}' } }] }),
      text: async () => '',
    })) as any;
    const r = await callTutor({
      apiKey: 'sk-abc',
      history: [{ role: 'tutor', text: TUTOR_OPENER }],
      userText: 'I am ready',
      fetch: fakeFetch,
    });
    expect(r.reply).toBe('Yes.');
    expect(fakeFetch).toHaveBeenCalledOnce();
    const [, init] = fakeFetch.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer sk-abc');
    const body = JSON.parse(init.body);
    expect(body.messages[0].content).toContain('English tutor');
    expect(body.messages[0].content).toContain('I am ready');
  });

  it('lança erro descritivo em 401', async () => {
    const fakeFetch = vi.fn(async () => ({
      ok: false, status: 401,
      json: async () => ({}),
      text: async () => 'Unauthorized',
    })) as any;
    await expect(callTutor({
      apiKey: 'bad', history: [], userText: 'hi', fetch: fakeFetch,
    })).rejects.toThrow(/Mistral 401/);
  });
});
