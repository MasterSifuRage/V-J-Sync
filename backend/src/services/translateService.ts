import {
  LangCode,
  langLabel,
  ollamaBaseUrl,
  readDeepLApiKey,
  readGoogleTranslateApiKey,
  resolveTranslateProvider,
  toDeepLLang,
  toGoogleLang,
} from './aiConfig';
import { llmGenerateText } from './llmChat';
import { getCachedTranslation, setCachedTranslation } from './translationCache';
import {
  isValidTranslation,
  sanitizeSummary,
  sanitizeTranslation,
} from '../utils/llmOutputSanitize';

async function translateViaDeepL(text: string, from: LangCode, to: LangCode): Promise<string> {
  const key = readDeepLApiKey();
  if (!key) throw new Error('DEEPL_NO_KEY');
  const base = (process.env.DEEPL_API_URL || 'https://api-free.deepl.com/v2/translate').replace(/\/$/, '');
  const body = new URLSearchParams({
    auth_key: key,
    text,
    target_lang: toDeepLLang(to),
    source_lang: toDeepLLang(from),
  });
  const res = await fetch(base, { method: 'POST', body });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`DEEPL_HTTP_${res.status}${errBody ? `: ${errBody.slice(0, 160)}` : ''}`);
  }
  const data = (await res.json()) as { translations?: { text?: string }[] };
  const out = data.translations?.[0]?.text?.trim();
  if (!out) throw new Error('DEEPL_EMPTY');
  return out;
}

async function translateViaGoogle(text: string, from: LangCode, to: LangCode): Promise<string> {
  const key = readGoogleTranslateApiKey();
  if (!key) throw new Error('GOOGLE_TRANSLATE_NO_KEY');
  const url = new URL('https://translation.googleapis.com/language/translate/v2');
  url.searchParams.set('key', key);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: toGoogleLang(from),
      target: toGoogleLang(to),
      format: 'text',
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`GOOGLE_TRANSLATE_HTTP_${res.status}${errBody ? `: ${errBody.slice(0, 160)}` : ''}`);
  }
  const data = (await res.json()) as { data?: { translations?: { translatedText?: string }[] } };
  const out = data.data?.translations?.[0]?.translatedText?.trim();
  if (!out) throw new Error('GOOGLE_TRANSLATE_EMPTY');
  return out;
}

async function translateViaOllama(text: string, from: LangCode, to: LangCode): Promise<string> {
  const targetRule =
    to === 'ja'
      ? 'Output ONLY Japanese using kanji, hiragana, and katakana. No Vietnamese, English, romaji, or explanations.'
      : 'Output ONLY Vietnamese. No Japanese, English, or explanations.';
  const raw = await llmGenerateText({
    system: `Professional ${langLabel(from)}→${langLabel(to)} translator for IT workplace.
${targetRule}
Preserve line breaks and bullet lists. Use polite business tone.`,
    user: text,
    label: 'translate',
    purpose: 'translate',
    temperature: 0.1,
    maxTokens: 4000,
  });
  const out = sanitizeTranslation(raw, to);
  if (!isValidTranslation(out, to)) throw new Error('TRANSLATE_INVALID_OUTPUT');
  return out;
}

async function translateViaCloudLlm(
  text: string,
  from: LangCode,
  to: LangCode,
  roleHint?: string,
): Promise<string> {
  const raw = await llmGenerateText({
    system: `Professional translator ${langLabel(from)}→${langLabel(to)}.
${roleHint ? roleHint + '\n' : ''}Return ONLY the translation in ${langLabel(to)}. No notes.`,
    user: text,
    label: 'translate-llm',
    purpose: 'translate',
    temperature: 0.1,
    maxTokens: 2000,
  });
  const out = sanitizeTranslation(raw, to);
  if (!isValidTranslation(out, to)) throw new Error('TRANSLATE_INVALID_OUTPUT');
  return out;
}

async function translateWithProvider(
  text: string,
  from: LangCode,
  to: LangCode,
  roleHint?: string,
): Promise<string> {
  const provider = resolveTranslateProvider();
  if (!provider) throw new Error('TRANSLATE_NO_PROVIDER');

  switch (provider) {
    case 'deepl':
      return translateViaDeepL(text, from, to);
    case 'google':
      return translateViaGoogle(text, from, to);
    case 'ollama':
      return translateViaOllama(text, from, to);
    default:
      return translateViaCloudLlm(text, from, to, roleHint);
  }
}

/** Dịch có cache; fallback Ollama nếu DeepL/Google lỗi. */
export async function translateText(
  text: string,
  from: LangCode,
  to: LangCode,
  opts?: { cacheKind?: string; roleHint?: string },
): Promise<string | null> {
  if (!text.trim() || from === to) return text.trim() || null;
  if (!resolveTranslateProvider() && !ollamaBaseUrl()) return null;

  const kind = opts?.cacheKind ?? 'translate';
  const cached = getCachedTranslation(kind, from, to, text);
  if (cached && isValidTranslation(cached, to)) return cached;

  const providers = resolveTranslateProvider();
  const tryOrder: Array<'primary' | 'ollama'> = ['primary'];
  if (providers !== 'ollama' && ollamaBaseUrl()) tryOrder.push('ollama');

  for (const step of tryOrder) {
    try {
      const out =
        step === 'ollama'
          ? await translateViaOllama(text, from, to)
          : await translateWithProvider(text, from, to, opts?.roleHint);
      setCachedTranslation(kind, from, to, text, out);
      return out;
    } catch (err) {
      console.warn(`[translate/${step}]`, err instanceof Error ? err.message : err);
    }
  }
  return null;
}

export async function translateWithCache(
  text: string,
  from: LangCode,
  to: LangCode,
  roleHint?: string,
): Promise<string> {
  const hit = await translateText(text, from, to, { cacheKind: 'api-translate', roleHint });
  return hit ?? text;
}
