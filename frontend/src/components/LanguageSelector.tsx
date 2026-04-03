import React from 'react';
import { useTranslation } from 'react-i18next';

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', flag: '🇬🇧', name: 'EN' },
    { code: 'fr', flag: '🇫🇷', name: 'FR' },
    { code: 'de', flag: '🇩🇪', name: 'DE' },
    { code: 'sw', flag: '🇹🇿', name: 'SW' },
  ];

  const currentLang =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  return (
    <div className="relative group">
      <button className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all transform hover:scale-105 active:scale-95">
        <span className="text-xl">{currentLang.flag}</span>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {currentLang.name}
        </span>
      </button>

      {/* Dropdown */}
      <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform scale-95 group-hover:scale-100 z-50">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-xl last:rounded-b-xl ${
              i18n.language === lang.code
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <span className="text-xl">{lang.flag}</span>
            <span className="text-sm font-semibold">{lang.name}</span>
            {i18n.language === lang.code && (
              <span className="ml-auto text-blue-600 dark:text-blue-400">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
