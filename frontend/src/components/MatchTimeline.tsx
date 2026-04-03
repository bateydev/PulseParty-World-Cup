import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { formatTime } from '../utils/formatters';

/**
 * MatchTimeline Component
 *
 * Displays match events as cards with icons and timestamps.
 * Features:
 * - Auto-scroll to latest event
 * - Localized event descriptions using i18n
 * - Event type icons
 * - Mobile-first responsive design
 *
 * Requirements: 2.5, 8.5
 */

// Event type to icon mapping
const EVENT_ICONS: Record<string, string> = {
  goal: '⚽',
  assist: '🎯',
  yellow_card: '🟨',
  red_card: '🟥',
  substitution: '🔄',
  corner: '🚩',
  shot: '🎯',
  possession: '📊',
  prediction: '🔮',
};

// Event type to color mapping
const EVENT_COLORS: Record<string, string> = {
  goal: 'bg-green-50 border-green-200',
  assist: 'bg-blue-50 border-blue-200',
  yellow_card: 'bg-yellow-50 border-yellow-200',
  red_card: 'bg-red-50 border-red-200',
  substitution: 'bg-purple-50 border-purple-200',
  corner: 'bg-indigo-50 border-indigo-200',
  shot: 'bg-gray-50 border-gray-200',
  possession: 'bg-teal-50 border-teal-200',
  prediction: 'bg-purple-100 border-purple-300',
};

export function MatchTimeline() {
  const { t, i18n } = useTranslation();
  const { matchEvents } = useAppStore();
  const timelineEndRef = useRef<HTMLDivElement>(null);
  const locale = i18n.language;

  // Auto-scroll to latest event
  useEffect(() => {
    if (timelineEndRef.current && matchEvents.length > 0) {
      // Check if scrollIntoView is available (not available in test environment)
      if (typeof timelineEndRef.current.scrollIntoView === 'function') {
        timelineEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [matchEvents]);

  // Format timestamp to display time
  const formatTimestamp = (timestamp: string): string => {
    return formatTime(timestamp, locale);
  };

  // Get localized event description
  const getEventDescription = (event: typeof matchEvents[0]): string => {
    const { eventType, metadata } = event;

    // Extract common metadata fields
    const player = metadata?.playerName || metadata?.player || 'Unknown';
    const team = metadata?.teamName || metadata?.team || 'Unknown';
    const playerOut = metadata?.playerOut || 'Unknown';
    const playerIn = metadata?.playerIn || 'Unknown';
    const percentage = metadata?.percentage || '0';
    const choice = metadata?.choice || 'Unknown';
    const predictionType = metadata?.predictionType || 'Unknown';

    // Map event type to translation key and interpolate values
    switch (eventType) {
      case 'goal':
        return t('events.goal_description', { player, team });
      case 'assist':
        return t('events.assist_description', { player });
      case 'yellow_card':
        return t('events.yellow_card_description', { player });
      case 'red_card':
        return t('events.red_card_description', { player });
      case 'substitution':
        return t('events.substitution_description', { playerOut, playerIn });
      case 'corner':
        return t('events.corner_description', { team });
      case 'shot':
        return t('events.shot_description', { player });
      case 'possession':
        return t('events.possession_description', { team, percentage });
      case 'prediction':
        return `You predicted: ${choice} for ${predictionType.replace(/_/g, ' ')}`;
      default:
        return `${eventType}: ${JSON.stringify(metadata)}`;
    }
  };

  // Get event icon
  const getEventIcon = (eventType: string): string => {
    return EVENT_ICONS[eventType] || '📌';
  };

  // Get event card color
  const getEventColor = (eventType: string): string => {
    return EVENT_COLORS[eventType] || 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="match-timeline w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('match.timeline')}</h2>
      </div>

      {/* Timeline Container */}
      <div className="timeline-container bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 max-h-[600px] overflow-y-auto border border-gray-200 dark:border-gray-700">
        {matchEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>{t('common.loading')}</p>
            <p className="text-sm mt-2">Waiting for match events...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matchEvents.map((event) => (
              <div
                key={event.eventId}
                className={`event-card p-4 rounded-xl border-2 transition-all hover:shadow-md bg-white dark:bg-gray-700 ${
                  event.eventType === 'goal' 
                    ? 'border-green-400 dark:border-green-500' 
                    : event.eventType === 'yellow_card' || event.eventType === 'red_card'
                    ? 'border-yellow-400 dark:border-yellow-500'
                    : 'border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Event Icon */}
                  <div className="flex-shrink-0 text-3xl" aria-hidden="true">
                    {getEventIcon(event.eventType)}
                  </div>

                  {/* Event Content */}
                  <div className="flex-1 min-w-0">
                    {/* Event Type and Timestamp */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm uppercase tracking-wide text-gray-900 dark:text-white">
                        {t(`events.${event.eventType}`, event.eventType)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>

                    {/* Event Description */}
                    <p className="text-sm text-gray-700 dark:text-gray-300">{getEventDescription(event)}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Auto-scroll anchor */}
            <div ref={timelineEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
