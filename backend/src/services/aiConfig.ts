export type LangCode = 'vi' | 'ja' | 'en';
export type CloudLlmProvider = 'gemini' | 'openai';
export type SummarizeProvider = 'ollama' | CloudLlmProvider;
export type TranslateProvider = 'ollama' | 'deepl' | 'google' | CloudLlmProvider;

function normalizeKey(raw: string | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  let key = raw.replace(/^\uFEFF/, '').trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  if (!key || key.includes('your-') || key.includes('change-this')) return null;
  return key;
}

export function ollamaBaseUrl(): string | null {
  const u = process.env.OLLAMA_BASE_URL?.trim();
  return u || null;
}

export function ollamaModel(purpose: 'summarize' | 'translate' | 'general' = 'general'): string {
  const specific =
    purpose === 'summarize'
      ? process.env.OLLAMA_SUMMARIZE_MODEL?.trim()
      : purpose === 'translate'
        ? process.env.OLLAMA_TRANSLATE_MODEL?.trim()
        : null;
  return (
    specific ||
    (process.env.OLLAMA_MODEL || 'llama3.1:latest').replace(/^\uFEFF/, '').trim() ||
    'llama3.1:latest'
  );
}

export function readGeminiApiKey(): string | null {
  return (
    normalizeKey(process.env.GEMINI_API_KEY) ||
    normalizeKey(process.env.GOOGLE_API_KEY) ||
    normalizeKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  );
}

export function readOpenAIApiKey(): string | null {
  const key = normalizeKey(process.env.OPENAI_API_KEY);
  if (!key || key.startsWith('AIza')) return null;
  return key;
}

export function readDeepLApiKey(): string | null {
  return normalizeKey(process.env.DEEPL_API_KEY);
}

export function readGoogleTranslateApiKey(): string | null {
  return normalizeKey(process.env.GOOGLE_TRANSLATE_API_KEY) || readGeminiApiKey();
}

export function globalAiProvider(): string {
  return (process.env.AI_PROVIDER || 'ollama').trim().toLowerCase();
}

export function resolveCloudLLM(): CloudLlmProvider | null {
  const mode = globalAiProvider();
  if (mode === 'gemini') return readGeminiApiKey() ? 'gemini' : null;
  if (mode === 'openai') return readOpenAIApiKey() ? 'openai' : null;
  if (mode === 'ollama') return null;
  if (readGeminiApiKey()) return 'gemini';
  if (readOpenAIApiKey()) return 'openai';
  return null;
}

export function resolveSummarizeProvider(): SummarizeProvider | null {
  const explicit = (process.env.SUMMARIZE_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'ollama') return ollamaBaseUrl() ? 'ollama' : null;
  if (explicit === 'gemini') return readGeminiApiKey() ? 'gemini' : null;
  if (explicit === 'openai') return readOpenAIApiKey() ? 'openai' : null;

  const global = globalAiProvider();
  if (global === 'ollama') return ollamaBaseUrl() ? 'ollama' : null;
  if (global === 'gemini') return readGeminiApiKey() ? 'gemini' : null;
  if (global === 'openai') return readOpenAIApiKey() ? 'openai' : null;

  if (ollamaBaseUrl()) return 'ollama';
  return resolveCloudLLM();
}

export function resolveTranslateProvider(): TranslateProvider | null {
  const explicit = (process.env.TRANSLATE_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'deepl') return readDeepLApiKey() ? 'deepl' : null;
  if (explicit === 'google') return readGoogleTranslateApiKey() ? 'google' : null;
  if (explicit === 'ollama') return ollamaBaseUrl() ? 'ollama' : null;
  if (explicit === 'gemini') return readGeminiApiKey() ? 'gemini' : null;
  if (explicit === 'openai') return readOpenAIApiKey() ? 'openai' : null;
  if (explicit === 'llm') return resolveCloudLLM();

  const global = globalAiProvider();
  if (global === 'ollama') return ollamaBaseUrl() ? 'ollama' : null;
  if (global === 'gemini') return readGeminiApiKey() ? 'gemini' : null;
  if (global === 'openai') return readOpenAIApiKey() ? 'openai' : null;

  if (readDeepLApiKey()) return 'deepl';
  if (readGoogleTranslateApiKey()) return 'google';
  if (ollamaBaseUrl()) return 'ollama';
  return resolveCloudLLM();
}

export function isAiConfigured(): boolean {
  return !!(resolveSummarizeProvider() || resolveTranslateProvider());
}

export function langLabel(l: LangCode): string {
  switch (l) {
    case 'ja':
      return 'tiếng Nhật';
    case 'en':
      return 'tiếng Anh';
    default:
      return 'tiếng Việt';
  }
}

export function toDeepLLang(code: LangCode): string {
  return { vi: 'VI', ja: 'JA', en: 'EN' }[code];
}

export function toGoogleLang(code: LangCode): string {
  return code;
}
