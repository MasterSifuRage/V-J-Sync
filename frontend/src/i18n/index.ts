import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getStoredUILanguage, setStoredUILanguage, type UILanguage } from '../lib/uiLanguage';
import vi from './locales/vi.json';
import ja from './locales/ja.json';

void i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    ja: { translation: ja },
  },
  lng: getStoredUILanguage(),
  fallbackLng: 'vi',
  supportedLngs: ['vi', 'ja'],
  interpolation: { escapeValue: false },
});

export async function applyUILanguage(lang: UILanguage): Promise<void> {
  setStoredUILanguage(lang);
  document.documentElement.lang = lang;
  await i18n.changeLanguage(lang);
}

export default i18n;
