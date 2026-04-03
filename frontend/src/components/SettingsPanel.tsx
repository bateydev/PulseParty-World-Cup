/**
 * Settings Panel Component
 *
 * Provides user settings including:
 * - Low-bandwidth mode toggle
 * - Language selection
 * - Dark mode toggle
 * - Other app preferences
 *
 * Requirements: 6.6, 6.7, 8.3
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLowBandwidth } from '../hooks/useLowBandwidth';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleDarkMode: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  isDark,
  onToggleDarkMode,
}) => {
  const { t, i18n } = useTranslation();
  const { isEnabled, isAutoDetected, toggle } = useLowBandwidth();

  if (!isOpen) return null;

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-full max-w-md z-50 transform transition-transform duration-300 ${
          isDark ? 'bg-gray-900' : 'bg-white'
        } shadow-2xl overflow-y-auto`}
      >
        {/* Header */}
        <div
          className={`sticky top-0 px-6 py-4 border-b ${
            isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('settings.title', 'Settings')}
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isDark
                  ? 'hover:bg-gray-800 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Appearance Section */}
          <section>
            <h3
              className={`text-lg font-semibold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {t('settings.appearance', 'Appearance')}
            </h3>

            {/* Dark Mode Toggle */}
            <div
              className={`flex items-center justify-between p-4 rounded-xl ${
                isDark ? 'bg-gray-800' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{isDark ? '🌙' : '☀️'}</span>
                <div>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {t('settings.dark_mode', 'Dark Mode')}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isDark
                      ? t('settings.dark_mode_on', 'Easier on the eyes')
                      : t('settings.dark_mode_off', 'Bright and clear')}
                  </p>
                </div>
              </div>
              <button
                onClick={onToggleDarkMode}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  isDark ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    isDark ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Language Section */}
          <section>
            <h3
              className={`text-lg font-semibold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {t('settings.language', 'Language')}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {[
                { code: 'en', name: 'English', flag: '🇬🇧' },
                { code: 'fr', name: 'Français', flag: '🇫🇷' },
                { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
                { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`p-4 rounded-xl transition-all ${
                    i18n.language === lang.code
                      ? isDark
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : isDark
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-2xl mb-1">{lang.flag}</div>
                  <div className="text-sm font-medium">{lang.name}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Performance Section */}
          <section>
            <h3
              className={`text-lg font-semibold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {t('settings.performance', 'Performance')}
            </h3>

            {/* Low Bandwidth Mode */}
            <div
              className={`p-4 rounded-xl ${
                isDark ? 'bg-gray-800' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {t('settings.low_bandwidth_mode', 'Low Bandwidth Mode')}
                    </p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {t(
                        'settings.low_bandwidth_desc',
                        'Reduces data usage by limiting update frequency and media quality'
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggle}
                  className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ${
                    isEnabled ? 'bg-orange-600' : isDark ? 'bg-gray-700' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                      isEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Auto-detected indicator */}
              {isAutoDetected && (
                <div
                  className={`mt-3 p-2 rounded-lg text-xs ${
                    isDark
                      ? 'bg-orange-900/30 text-orange-300'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  <span className="font-medium">
                    {t('settings.auto_detected', 'Auto-detected: Slow connection')}
                  </span>
                </div>
              )}

              {/* What's affected */}
              {isEnabled && (
                <div className={`mt-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <p className="font-medium mb-1">
                    {t('settings.low_bandwidth_affects', 'What changes:')}
                  </p>
                  <ul className="space-y-1 ml-4">
                    <li>• {t('settings.reduced_updates', 'Reduced real-time update frequency')}</li>
                    <li>• {t('settings.essential_events', 'Only essential match events')}</li>
                    <li>• {t('settings.compressed_data', 'Compressed data transmission')}</li>
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* About Section */}
          <section>
            <h3
              className={`text-lg font-semibold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {t('settings.about', 'About')}
            </h3>

            <div
              className={`p-4 rounded-xl ${
                isDark ? 'bg-gray-800' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-2xl">⚽</span>
                </div>
                <div>
                  <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    PulseParty Rooms
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Version 1.0.0
                  </p>
                </div>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {t(
                  'settings.about_desc',
                  'Real-time social multiplayer fan experience for live football matches'
                )}
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};
