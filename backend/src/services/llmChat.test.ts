import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('readGeminiApiKey / resolveLLM', () => {
  const env: Record<string, string | undefined> = {};

  beforeEach(() => {
    env.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    env.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    env.AI_PROVIDER = process.env.AI_PROVIDER;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_PROVIDER;
    vi.resetModules();
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
    process.env.GOOGLE_API_KEY = env.GOOGLE_API_KEY;
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = env.GOOGLE_GENERATIVE_AI_API_KEY;
    process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
    process.env.AI_PROVIDER = env.AI_PROVIDER;
    vi.resetModules();
  });

  it('readGeminiApiKey rejects placeholder', async () => {
    process.env.GEMINI_API_KEY = 'your-google-ai-studio-api-key';
    const { readGeminiApiKey } = await import('./llmChat');
    expect(readGeminiApiKey()).toBeNull();
  });

  it('readGeminiApiKey accepts GOOGLE_GENERATIVE_AI_API_KEY', async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'AIzaSy_from_generative_env';
    const { readGeminiApiKey } = await import('./llmChat');
    expect(readGeminiApiKey()).toBe('AIzaSy_from_generative_env');
  });

  it('readGeminiApiKey accepts GOOGLE_API_KEY', async () => {
    process.env.GOOGLE_API_KEY = 'real-gemini-key';
    const { readGeminiApiKey } = await import('./llmChat');
    expect(readGeminiApiKey()).toBe('real-gemini-key');
  });

  it('readGeminiApiKey strips quotes around AIza', async () => {
    process.env.GEMINI_API_KEY = '"AIzaSy_quoted_only"';
    const { readGeminiApiKey } = await import('./llmChat');
    expect(readGeminiApiKey()).toBe('AIzaSy_quoted_only');
  });

  it('resolveLLM prefers Gemini over OpenAI', async () => {
    process.env.GEMINI_API_KEY = 'g';
    process.env.OPENAI_API_KEY = 'sk-openai';
    const { resolveLLM } = await import('./llmChat');
    expect(resolveLLM()).toBe('gemini');
  });

  it('resolveLLM falls back to OpenAI', async () => {
    process.env.OPENAI_API_KEY = 'sk-real';
    const { resolveLLM } = await import('./llmChat');
    expect(resolveLLM()).toBe('openai');
  });

  it('resolveLLM null when no keys', async () => {
    const { resolveLLM } = await import('./llmChat');
    expect(resolveLLM()).toBeNull();
  });

  it('resolveLLM uses Gemini key from OPENAI_API_KEY if AIza', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    process.env.OPENAI_API_KEY = 'AIzaSy_FromOpenAI_slot';
    process.env.AI_PROVIDER = 'auto';
    const { resolveLLM, readGeminiApiKey } = await import('./llmChat');
    expect(readGeminiApiKey()).toBe('AIzaSy_FromOpenAI_slot');
    expect(resolveLLM()).toBe('gemini');
  });

  it('AI_PROVIDER=gemini requires Gemini key', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'sk-real';
    process.env.AI_PROVIDER = 'gemini';
    const { resolveLLM } = await import('./llmChat');
    expect(resolveLLM()).toBeNull();
  });

  it('AI_PROVIDER=openai ignores Gemini', async () => {
    process.env.GEMINI_API_KEY = 'AIzaSy_gemini';
    process.env.OPENAI_API_KEY = 'sk-openai-only';
    process.env.AI_PROVIDER = 'openai';
    const { resolveLLM } = await import('./llmChat');
    expect(resolveLLM()).toBe('openai');
  });
});
