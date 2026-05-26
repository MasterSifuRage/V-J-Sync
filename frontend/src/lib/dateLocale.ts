/** BCP 47 locale for date/time formatting from UI language (vi | ja). */
export function uiDateLocale(lang: string): string {
  return lang === 'ja' ? 'ja-JP' : 'vi-VN';
}

export const ROLE_I18N_KEYS: Record<number, string> = {
  1: 'director',
  2: 'manager',
  3: 'employee',
  4: 'guest',
};
