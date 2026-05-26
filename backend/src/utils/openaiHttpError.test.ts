import { describe, it, expect, afterEach } from 'vitest';
import { AuthenticationError, RateLimitError } from 'openai';
import { readOpenAIApiKey, mapOpenAIError } from './openaiHttpError';

describe('readOpenAIApiKey', () => {
  const orig = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (orig === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = orig;
  });

  it('returns null for placeholder', () => {
    process.env.OPENAI_API_KEY = 'sk-your-openai-api-key';
    expect(readOpenAIApiKey()).toBeNull();
  });

  it('strips BOM and spaces', () => {
    process.env.OPENAI_API_KEY = '\uFEFF  sk-test  ';
    expect(readOpenAIApiKey()).toBe('sk-test');
  });

  it('returns null when unset', () => {
    delete process.env.OPENAI_API_KEY;
    expect(readOpenAIApiKey()).toBeNull();
  });

  it('returns null for Google-style key in OPENAI_API_KEY', () => {
    process.env.OPENAI_API_KEY = 'AIzaSyTestKeyForUnitTestOnly';
    expect(readOpenAIApiKey()).toBeNull();
  });

  it('strips surrounding quotes', () => {
    process.env.OPENAI_API_KEY = '"sk-testquoted"';
    expect(readOpenAIApiKey()).toBe('sk-testquoted');
  });
});

describe('mapOpenAIError', () => {
  const hdr = {} as import('openai/core').Headers;

  it('maps AuthenticationError', () => {
    const err = new AuthenticationError(401, { message: 'bad' }, '401 bad', hdr);
    const m = mapOpenAIError(err);
    expect(m?.status).toBe(502);
    expect(m?.error).toContain('OPENAI_API_KEY');
  });

  it('maps quota-like RateLimitError', () => {
    const err = new RateLimitError(
      429,
      { message: 'insufficient_quota', code: 'insufficient_quota' } as object,
      '429',
      hdr,
    );
    const m = mapOpenAIError(err);
    expect(m?.status).toBe(402);
    expect(m?.error).toMatch(/quota|billing/i);
  });
});
