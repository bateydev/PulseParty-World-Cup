/**
 * Low Bandwidth Mode Indicator
 *
 * Displays a banner when low-bandwidth mode is active and provides
 * a toggle to manually enable/disable the mode.
 *
 * Requirements: 6.6, 6.7
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLowBandwidth } from '../hooks/useLowBandwidth';

export const LowBandwidthIndicator: React.FC = () => {
  const { t } = useTranslation();
  const { isEnabled, isAutoDetected, toggle } = useLowBandwidth();

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="fixed top-12 left-0 right-0 bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium z-40">
      <div className="flex items-center justify-center gap-2">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <span>
          {isAutoDetected
            ? t(
                'settings.low_bandwidth_auto',
                'Low bandwidth detected - reduced data mode active'
              )
            : t('settings.low_bandwidth_manual', 'Low bandwidth mode active')}
        </span>
        <button
          onClick={toggle}
          className="ml-2 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs font-semibold transition-colors"
        >
          {t('common.disable', 'Disable')}
        </button>
      </div>
    </div>
  );
};
