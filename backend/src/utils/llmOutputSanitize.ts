import { LangCode } from '../services/aiConfig';

const JA_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
const VI_DIACRITIC_RE = /[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i;

const SUMMARY_PREFIX_RE =
  /^(?:dưới đây là|以下は|here is|below is)[\s\S]{0,120}?(?:\n|:)/i;
const TRANSLATE_PREFIX_RE =
  /^(?:dưới đây là|以下は|here is|below is|bản dịch)[\s\S]{0,160}?(?:\n|:)/i;

export function hasJapaneseScript(text: string): boolean {
  return JA_RE.test(text);
}

export function isValidTranslation(text: string, target: LangCode): boolean {
  const t = text.trim();
  if (!t || t.length < 2) return false;
  if (TRANSLATE_PREFIX_RE.test(t)) return false;
  if (/tiếng việt sang tiếng nhật|ベトナム語から日本語|romaji|\([a-z]{3,}[\s-][a-z]/i.test(t)) {
    return false;
  }
  if (target === 'ja') {
    const jaCount = (t.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g) || []).length;
    return jaCount >= Math.min(8, Math.ceil(t.length * 0.08));
  }
  if (target === 'vi') {
    return VI_DIACRITIC_RE.test(t) || /\b(công việc|khách hàng|hệ thống|báo cáo)\b/i.test(t);
  }
  return true;
}

export function sanitizeSummary(raw: string): string {
  let t = raw.trim();
  t = t.replace(/^```[\s\S]*?\n/m, '').replace(/```$/m, '').trim();
  t = t.replace(SUMMARY_PREFIX_RE, '').trim();
  t = t.replace(/^\*\*tóm tắt\*\*:?\s*/i, '').trim();
  return t;
}

export function sanitizeTranslation(raw: string, target: LangCode): string {
  let t = raw.trim();
  t = t.replace(/^```[\s\S]*?\n/m, '').replace(/```$/m, '').trim();
  t = t.replace(TRANSLATE_PREFIX_RE, '').trim();

  if (target === 'ja') {
    const lines = t.split('\n');
    const jaLines = lines.filter((line) => {
      const s = line.trim();
      if (!s) return true;
      if (/^\*+\s/.test(s) && !hasJapaneseScript(s)) return false;
      if (/^\*\*[^*]+\*\*$/.test(s) && !hasJapaneseScript(s)) return false;
      if (/^\([^)]+\)$/.test(s) && !hasJapaneseScript(s)) return false;
      return true;
    });
    t = jaLines.join('\n').trim();
  }

  return t;
}
