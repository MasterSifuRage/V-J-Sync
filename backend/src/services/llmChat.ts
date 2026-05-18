import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { readOpenAIApiKey, withOpenAIRetries } from '../utils/openaiHttpError';

const GEMINI_PLACEHOLDER = 'your-google-ai-studio-api-key';

function normalizeKey(raw: string | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  let key = raw.replace(/^\uFEFF/, '').trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  if (!key || key === GEMINI_PLACEHOLDER) return null;
  return key;
}

/** Đọc key Gemini: GEMINI_API_KEY, GOOGLE_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, hoặc OPENAI_API_KEY nếu là AIza... */
export function readGeminiApiKey(): string | null {
  const a = normalizeKey(process.env.GEMINI_API_KEY);
  if (a) return a;
  const b = normalizeKey(process.env.GOOGLE_API_KEY);
  if (b) return b;
  const c = normalizeKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  if (c) return c;
  const fromOpenAI = normalizeKey(process.env.OPENAI_API_KEY);
  if (fromOpenAI?.startsWith('AIza')) return fromOpenAI;
  return null;
}

/**
 * auto: Gemini nếu có key, không thì OpenAI.
 * gemini: chỉ Gemini (bỏ qua OpenAI).
 * openai: chỉ OpenAI.
 */
export function resolveLLM(): 'gemini' | 'openai' | null {
  const mode = (process.env.AI_PROVIDER || 'auto').trim().toLowerCase();
  if (mode === 'gemini') {
    return readGeminiApiKey() ? 'gemini' : null;
  }
  if (mode === 'openai') {
    return readOpenAIApiKey() ? 'openai' : null;
  }
  if (readGeminiApiKey()) return 'gemini';
  if (readOpenAIApiKey()) return 'openai';
  return null;
}

const geminiModelId = () =>
  (process.env.GEMINI_MODEL || 'gemini-2.0-flash').replace(/^\uFEFF/, '').trim() || 'gemini-2.0-flash';

let geminiSdk: GoogleGenerativeAI | null = null;
function getGeminiSdk(): GoogleGenerativeAI | null {
  const k = readGeminiApiKey();
  if (!k) return null;
  if (!geminiSdk) geminiSdk = new GoogleGenerativeAI(k);
  return geminiSdk;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableGemini(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|503|500|502|UNAVAILABLE|RESOURCE_EXHAUSTED|ECONNRESET|ETIMEDOUT/i.test(msg);
}

async function withGeminiRetries<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const max = Math.min(6, Math.max(2, parseInt(process.env.GEMINI_RETRY_ATTEMPTS || '4', 10) || 4));
  const baseMs = 700;
  let last: unknown;
  for (let attempt = 0; attempt < max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isRetryableGemini(err) || attempt === max - 1) throw err;
      const waitMs = baseMs * 2 ** attempt + Math.floor(Math.random() * 350);
      console.warn(`[gemini/${label}] thử lại sau ${waitMs}ms (${attempt + 2}/${max})`);
      await sleep(waitMs);
    }
  }
  throw last;
}

export type LlmGenerateOpts = {
  system: string;
  user: string;
  label: string;
  temperature?: number;
  maxTokens?: number;
};

async function geminiGenerateText(opts: LlmGenerateOpts): Promise<string> {
  const sdk = getGeminiSdk();
  if (!sdk) throw new Error('GEMINI_NO_CLIENT');
  const model = sdk.getGenerativeModel({
    model: geminiModelId(),
    systemInstruction: opts.system,
  });
  const result = await withGeminiRetries(opts.label, () =>
    model.generateContent({
      contents: [{ role: 'user', parts: [{ text: opts.user }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.3,
        maxOutputTokens: opts.maxTokens ?? 2048,
      },
    }),
  );
  const text = result.response.text();
  if (!text?.trim()) throw new Error('GEMINI_EMPTY_RESPONSE');
  return text.trim();
}

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  const key = readOpenAIApiKey();
  if (!key) return null;
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: key, maxRetries: 4, timeout: 120_000 });
  return openaiClient;
}

async function openaiGenerateText(opts: LlmGenerateOpts): Promise<string> {
  const openai = getOpenAI();
  if (!openai) throw new Error('OPENAI_NO_CLIENT');
  const completion = await withOpenAIRetries(opts.label, () =>
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 2000,
    }),
  );
  const t = completion.choices[0]?.message?.content?.trim();
  if (!t) throw new Error('OPENAI_EMPTY_RESPONSE');
  return t;
}

export async function llmGenerateText(opts: LlmGenerateOpts): Promise<string> {
  const p = resolveLLM();
  if (p === 'gemini') return geminiGenerateText(opts);
  if (p === 'openai') return openaiGenerateText(opts);
  throw new Error('LLM_NO_PROVIDER');
}
