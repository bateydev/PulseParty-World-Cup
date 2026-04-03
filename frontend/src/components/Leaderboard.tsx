import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';

/**
 * Leaderboard Component
 *
 * Displays real-time rankings with:
 * - User rank, name, points, streak in table format
 * - Highlighted current user row
 * - Smooth rank transition animations
 * - Mobile-first responsive design
 *
 * Requirements: 4.6
 */

export function Leaderboard() {
  const { t } = useTranslation();
  const { leaderboard, user } = useAppStore();

  // Get streak display with fire emoji
  const getStreakDisplay = (streak: number): string => {
    if (streak === 0) return '-';
    return `${streak} 🔥`;
  };

  // Check if this is the current user
  const isCurrentUser = (userId: string): boolean => {
    return user?.userId === userId;
  };

  // Get rank display with medal for top 3
  const getRankDisplay = (rank: number): string => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `${rank}`;
    }
  };

  return (
    <div className="leaderboard w-full max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-semibold">{t('leaderboard.title')}</h2>
      </div>

      {/* Leaderboard Container */}
      <div className="leaderboard-container bg-white rounded-lg shadow-md overflow-hidden">
        {leaderboard.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>{t('common.loading')}</p>
            <p className="text-sm mt-2">Waiting for players...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide">
                    {t('leaderboard.rank')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide">
                    {t('leaderboard.player')}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wide">
                    {t('leaderboard.points')}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-wide">
                    {t('leaderboard.streak')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaderboard.map((entry, index) => {
                  const isCurrent = isCurrentUser(entry.userId);
                  return (
                    <tr
                      key={entry.userId}
                      className={`transition-all duration-300 ease-in-out ${
                        isCurrent
                          ? 'bg-yellow-50 border-l-4 border-yellow-500 font-semibold'
                          : 'hover:bg-gray-50'
                      }`}
                      style={{
                        transform: `translateY(${index * 0}px)`,
                      }}
                    >
                      {/* Rank */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg font-bold">
                            {getRankDisplay(entry.rank)}
                          </span>
                        </div>
                      </td>

                      {/* Player Name */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">
                            {entry.displayName}
                          </span>
                          {isCurrent && (
                            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-semibold">
                              {t('leaderboard.you')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Points */}
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <span className="text-lg font-bold text-blue-600">
                          {entry.totalPoints}
                        </span>
                      </td>

                      {/* Streak */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span className="text-sm">
                          {getStreakDisplay(entry.streak)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
