/** Ngôn ngữ đích cho nút "Dịch" — chỉ Việt / Nhật */
export type TranslateTargetLang = 'vi' | 'ja';

export const TRANSLATE_TARGET_CHANGED = 'vjsync:translateToChanged';

const LEGACY_STORAGE_KEY = 'vjsync_translateTo';

function storageKey(userId: string): string {
  return `vjsync_translateTo_${userId}`;
}

export function normalizeTranslateTarget(value?: string | null): TranslateTargetLang {
  if (value === 'vi' || value === 'ja') return value;
  if (value === 'en') return 'ja';
  return 'ja';
}

export function getTranslateTarget(userId?: string | null): TranslateTargetLang {
  if (!userId) return 'ja';
  try {
    const v = localStorage.getItem(storageKey(userId));
    if (v === 'vi' || v === 'ja') return v;
    if (v === 'en') return 'ja';
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy === 'vi' || legacy === 'ja') return legacy;
  } catch {
    /* private mode */
  }
  return 'ja';
}

export function setTranslateTarget(userId: string | null | undefined, lang: TranslateTargetLang): void {
  if (!userId) return;
  try {
    localStorage.setItem(storageKey(userId), lang);
    window.dispatchEvent(new CustomEvent(TRANSLATE_TARGET_CHANGED, { detail: { userId, lang } }));
  } catch {
    /* ignore */
  }
}

/** Đồng bộ từ server → localStorage khi đăng nhập / tải profile */
export function applyTranslateTarget(userId: string, lang?: string | null): TranslateTargetLang {
  const normalized = normalizeTranslateTarget(lang ?? getTranslateTarget(userId));
  setTranslateTarget(userId, normalized);
  return normalized;
}
