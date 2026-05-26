/** Ngôn ngữ giao diện — chỉ Việt / Nhật */
export type UILanguage = 'vi' | 'ja';

const STORAGE_KEY = 'vjsync_uiLang';

export function normalizeUILanguage(lang?: string | null): UILanguage {
  return lang === 'ja' ? 'ja' : 'vi';
}

export function getStoredUILanguage(): UILanguage {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'vi' || v === 'ja') return v;
  } catch {
    /* ignore */
  }
  return 'vi';
}

export function setStoredUILanguage(lang: UILanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}
