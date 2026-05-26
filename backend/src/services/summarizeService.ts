import { resolveSummarizeProvider } from './aiConfig';
import { llmGenerateText } from './llmChat';
import { sanitizeSummary } from '../utils/llmOutputSanitize';

export async function summarizeText(
  content: string,
  opts?: { contentType?: string; maxTokens?: number },
): Promise<string | null> {
  if (!content.trim() || !resolveSummarizeProvider()) return null;

  const contentType = opts?.contentType ?? 'nội dung';
  try {
    const raw = await llmGenerateText({
      system: `Summarize the following ${contentType} in Vietnamese (2-4 sentences or up to 5 bullet points).
Output ONLY the summary in Vietnamese. No title, no intro like "Dưới đây là", no markdown headers.`,
      user: content,
      label: 'summarize',
      purpose: 'summarize',
      temperature: 0.1,
      maxTokens: opts?.maxTokens ?? 500,
    });
    const out = sanitizeSummary(raw);
    return out || null;
  } catch (err) {
    console.warn('[summarize]', err instanceof Error ? err.message : err);
    return null;
  }
}
