import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * LanguageSelector Component
 *
 * Provides a dropdown to switch between supported languages.
 * Language preference is automatically persisted to localStorage.
 *
 * Supported languages: EN, FR, DE, SW
 * Requirements: 8.2, 8.3, 8.4
 */
export function LanguageSelector() {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  ];

  const handleLanguageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newLanguage = event.target.value;
    i18n.changeLanguage(newLanguage);
  };

  return (
    <div className="language-selector">
      <label
        htmlFor="language-select"
        className="block text-sm font-medium mb-1"
      >
        {t('settings.language')}
      </label>
      <select
        id="language-select"
        value={i18n.language}
        onChange={handleLanguageChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
