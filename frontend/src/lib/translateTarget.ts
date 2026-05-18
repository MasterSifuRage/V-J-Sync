/** Ngôn ngữ đích cho nút "Dịch" — đồng bộ với Cài đặt → "Ngôn ngữ dịch sang" (lưu localStorage). */
export type TranslateTargetLang = 'vi' | 'ja' | 'en';

const STORAGE_KEY = 'vjsync_translateTo';

export function getTranslateTarget(): TranslateTargetLang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'vi' || v === 'ja' || v === 'en') return v;
  } catch {
    /* private mode */
  }
  return 'ja';
}

export function setTranslateTarget(lang: TranslateTargetLang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}
