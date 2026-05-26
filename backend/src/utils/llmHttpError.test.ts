import { GoogleGenerativeAIFetchError } from '@google/generative-ai';
import { describe, it, expect } from 'vitest';
import { mapGeminiError } from './llmHttpError';

describe('mapGeminiError', () => {
  it('maps invalid API key', () => {
    const m = mapGeminiError(new Error('API key not valid. Please pass a valid API key. 401'));
    expect(m?.status).toBe(502);
    expect(m?.error).toContain('GEMINI_API_KEY');
  });

  it('maps rate limit', () => {
    const m = mapGeminiError(new Error('429 RESOURCE_EXHAUSTED'));
    expect(m?.status).toBe(429);
  });

  it('maps HTTP 429 from SDK FetchError', () => {
    const m = mapGeminiError(
      new GoogleGenerativeAIFetchError(
        'Error fetching from https://example: [429 Too Many Requests] Resource exhausted',
        429,
        'Too Many Requests',
      ),
    );
    expect(m?.status).toBe(429);
    expect(m?.error).toMatch(/HTTP 429/);
  });

  it('403 with quota in message body maps to auth, not rate limit', () => {
    const m = mapGeminiError(
      new GoogleGenerativeAIFetchError(
        'Error fetching: [403 Forbidden] Permission denied. {"quotaMetrics":[]}',
        403,
        'Forbidden',
      ),
    );
    expect(m?.status).toBe(502);
    expect(m?.error).toContain('GEMINI_API_KEY');
  });

  it('does not treat bare word quota in a 400 body as rate limit', () => {
    const m = mapGeminiError(
      new GoogleGenerativeAIFetchError(
        'Error fetching: [400 Bad Request] Invalid JSON {"quotaMetrics":"x"}',
        400,
        'Bad Request',
      ),
    );
    expect(m?.status).toBe(502);
    expect(m?.error).toMatch(/HTTP 400/);
  });

  it('returns null for unknown', () => {
    expect(mapGeminiError(new Error('random'))).toBeNull();
  });
});
