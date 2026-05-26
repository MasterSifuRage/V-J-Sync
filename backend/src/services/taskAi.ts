import { isAiConfigured, resolveSummarizeProvider, resolveTranslateProvider } from './aiConfig';
import { summarizeText } from './summarizeService';
import { translateText } from './translateService';
import { isValidTranslation } from '../utils/llmOutputSanitize';

export interface TaskDescriptionAiFields {
  summary: string | null;
  summaryJa: string | null;
  descriptionJa: string | null;
}

/** Tóm tắt (Ollama/LLM) + dịch JA tùy chọn (Ollama / DeepL / Google — tách provider). */
export async function enrichTaskDescription(
  description: string,
  options?: { translateJa?: boolean },
): Promise<TaskDescriptionAiFields> {
  if (!description.trim() || !isAiConfigured()) {
    return { summary: null, summaryJa: null, descriptionJa: null };
  }

  const summary = await summarizeTaskDescription(description);
  if (!options?.translateJa) {
    return { summary, summaryJa: null, descriptionJa: null };
  }

  const descriptionJa = await translateText(description, 'vi', 'ja', { cacheKind: 'task-desc' });
  const summaryJa = summary ? await translateText(summary, 'vi', 'ja', { cacheKind: 'task-summary' }) : null;

  return {
    summary,
    summaryJa: summaryJa && isValidTranslation(summaryJa, 'ja') ? summaryJa : null,
    descriptionJa: descriptionJa && isValidTranslation(descriptionJa, 'ja') ? descriptionJa : null,
  };
}

export async function summarizeTaskDescription(description: string): Promise<string | null> {
  if (!description.trim() || !resolveSummarizeProvider()) return null;
  return summarizeText(description, { contentType: 'mô tả công việc' });
}

export async function translateTaskComment(
  content: string,
  authorLang: string,
): Promise<string | null> {
  const from = authorLang === 'ja' ? 'ja' : 'vi';
  const to = from === 'ja' ? 'vi' : 'ja';
  if (!resolveTranslateProvider()) return null;
  return translateText(content, from, to, { cacheKind: 'comment' });
}

export { translateText as translateWithCache } from './translateService';
