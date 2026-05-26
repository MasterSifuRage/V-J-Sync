export type ContentLang = 'vi' | 'ja';

const JA_CHAR = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
const JA_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g;
const VI_DIACRITIC_RE = /[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i;

export function hasJapaneseScript(text: string): boolean {
  return JA_CHAR.test(text);
}

export function detectTextLang(text: string): ContentLang {
  const ja = (text.match(JA_RE) || []).length;
  if (ja >= Math.max(3, Math.ceil(text.length * 0.06))) return 'ja';
  return 'vi';
}

export function isValidTranslation(text: string, target: ContentLang): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/dưới đây là|tiếng việt sang tiếng nhật|ベトナム語から日本語/i.test(t)) return false;
  if (target === 'ja') {
    const jaCount = (t.match(JA_RE) || []).length;
    return jaCount >= Math.min(8, Math.ceil(t.length * 0.08));
  }
  return VI_DIACRITIC_RE.test(t) || !hasJapaneseScript(t);
}

export function translationPair(
  sourceLang: ContentLang,
  targetLang: ContentLang,
): { from: ContentLang; to: ContentLang } | null {
  if (sourceLang === targetLang) return null;
  return { from: sourceLang, to: targetLang };
}
