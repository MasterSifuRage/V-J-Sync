import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { readOpenAIApiKey, withOpenAIRetries } from '../utils/openaiHttpError';
import {
  ollamaBaseUrl,
  ollamaModel,
  readGeminiApiKey,
  resolveSummarizeProvider,
  resolveTranslateProvider,
  SummarizeProvider,
} from './aiConfig';
import { withLlmQueue } from './llmQueue';

export type LlmProvider = SummarizeProvider;

const geminiModelId = () =>
  (process.env.GEMINI_MODEL || 'gemini-2.0-flash').replace(/^\uFEFF/, '').trim() || 'gemini-2.0-flash';

/** @deprecated Dùng isAiConfigured() hoặc resolveSummarizeProvider() */
export function resolveLLM(): LlmProvider | null {
  return resolveSummarizeProvider();
}

export { readGeminiApiKey };

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
  /** Chọn model Ollama riêng cho tóm tắt / dịch */
  purpose?: 'summarize' | 'translate' | 'general';
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
      model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
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

async function ollamaGenerateText(opts: LlmGenerateOpts): Promise<string> {
  const base = ollamaBaseUrl();
  if (!base) throw new Error('OLLAMA_NO_URL');
  const purpose = opts.purpose ?? 'general';
  const model = ollamaModel(purpose);
  const url = `${base.replace(/\/$/, '')}/api/chat`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
      options: {
        temperature: opts.temperature ?? 0.3,
        num_predict: opts.maxTokens ?? 2048,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OLLAMA_HTTP_${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
  }
  const data = (await res.json()) as { message?: { content?: string } };
  const text = data.message?.content?.trim();
  if (!text) throw new Error('OLLAMA_EMPTY_RESPONSE');
  return text;
}

async function llmGenerateTextInner(opts: LlmGenerateOpts): Promise<string> {
  if (opts.purpose === 'translate') {
    const tp = resolveTranslateProvider();
    if (tp === 'ollama') return ollamaGenerateText(opts);
    if (tp === 'gemini') return geminiGenerateText(opts);
    if (tp === 'openai') return openaiGenerateText(opts);
    if (ollamaBaseUrl()) return ollamaGenerateText(opts);
    throw new Error('LLM_NO_PROVIDER');
  }

  const sp = resolveSummarizeProvider();
  if (sp === 'ollama') return ollamaGenerateText(opts);
  if (sp === 'gemini') return geminiGenerateText(opts);
  if (sp === 'openai') return openaiGenerateText(opts);
  if (ollamaBaseUrl()) return ollamaGenerateText(opts);
  throw new Error('LLM_NO_PROVIDER');
}

/** Xếp hàng tuần tự để tránh burst (đặc biệt khi dùng cloud free tier). */
export async function llmGenerateText(opts: LlmGenerateOpts): Promise<string> {
  return withLlmQueue(() => llmGenerateTextInner(opts));
}
