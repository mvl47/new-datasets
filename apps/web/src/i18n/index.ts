import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { useThemeStore } from '../state/themeStore';
import de from './locales/de.json';
import en from './locales/en.json';

void i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
  },
  lng: useThemeStore.getState().lang,
  fallbackLng: 'de',
  interpolation: { escapeValue: false },
});

useThemeStore.subscribe((state) => {
  if (i18n.language !== state.lang) {
    void i18n.changeLanguage(state.lang);
  }
});

export default i18n;
