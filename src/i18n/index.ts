import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { fr } from './locales/fr';
import { en } from './locales/en';

export type SupportedLanguage = 'fr' | 'en';

export const LANG_STORAGE_KEY = 'restomax_lang';

function resolveInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'fr';
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'fr' || saved === 'en') {
      return saved;
    }
  } catch {
    // Ignore storage errors in restricted environments
  }
  return 'fr';
}

const initialLng = resolveInitialLanguage();

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: initialLng,
  fallbackLng: 'fr',
  supportedLngs: ['fr', 'en'],
  interpolation: {
    escapeValue: false,
  },
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLng;
}

i18n.on('languageChanged', (lng) => {
  const normalized: SupportedLanguage = lng.startsWith('en') ? 'en' : 'fr';
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalized;
  }
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANG_STORAGE_KEY, normalized);
    }
  } catch {
    // Ignore storage errors
  }
});

export function getActiveIntlLocale(): string {
  return i18n.language?.startsWith('en') ? 'en-GB' : 'fr-FR';
}

export default i18n;
