import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslation from './locales/en/translation.json';
import frTranslation from './locales/fr/translation.json';
import deTranslation from './locales/de/translation.json';
import swTranslation from './locales/sw/translation.json';

/**
 * i18n Configuration for PulseParty Rooms
 * 
 * Supports: English (EN), French (FR), German (DE), Swahili (SW)
 * 
 * Features:
 * - Automatic browser language detection
 * - Locale persistence in localStorage
 * - Fallback to English for missing translations
 * 
 * Requirements: 8.1, 8.2
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      fr: {
        translation: frTranslation,
      },
      de: {
        translation: deTranslation,
      },
      sw: {
        translation: swTranslation,
      },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr', 'de', 'sw'],
    
    // Language detection configuration
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],
      
      // Keys to use for localStorage
      lookupLocalStorage: 'pulseparty_language',
      
      // Cache user language preference
      caches: ['localStorage'],
      
      // Exclude certain detection methods
      excludeCacheFor: ['cimode'],
    },
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // React-specific options
    react: {
      useSuspense: false, // Disable suspense for better error handling
    },
  });

export default i18n;
