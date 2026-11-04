import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import zhCN from './zh-CN.json';

export const LANGUAGES = ['en', 'zh-CN'] as const;
export type Language = (typeof LANGUAGES)[number];

const STORAGE_KEY = 'passhopper.lang';

/** Picks the saved language, then the browser language, then English. */
export function detectLanguage(saved: string | null, browser: readonly string[]): Language {
  if (saved && (LANGUAGES as readonly string[]).includes(saved)) return saved as Language;
  return browser.some((l) => l.toLowerCase().startsWith('zh')) ? 'zh-CN' : 'en';
}

function readSaved(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** The Chinese font is large, so it is only loaded when the Chinese UI is used. */
async function loadFontsFor(lang: Language) {
  if (lang === 'zh-CN') {
    await Promise.all([
      import('@fontsource/noto-sans-sc/400.css'),
      import('@fontsource/noto-sans-sc/700.css'),
    ]);
  }
}

function applyToDocument(lang: Language) {
  document.documentElement.lang = lang;
  void loadFontsFor(lang);
}

export async function setLanguage(lang: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts for this visit only.
  }
  applyToDocument(lang);
  await i18n.changeLanguage(lang);
}

const initial = detectLanguage(readSaved(), navigator.languages ?? [navigator.language]);

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, 'zh-CN': { translation: zhCN } },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
applyToDocument(initial);

export default i18n;
