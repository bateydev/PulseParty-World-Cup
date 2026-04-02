import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          welcome: 'Welcome to PulseParty Rooms',
        },
      },
      fr: {
        translation: {
          welcome: 'Bienvenue à PulseParty Rooms',
        },
      },
      de: {
        translation: {
          welcome: 'Willkommen bei PulseParty Rooms',
        },
      },
      sw: {
        translation: {
          welcome: 'Karibu PulseParty Rooms',
        },
      },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr', 'de', 'sw'],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
