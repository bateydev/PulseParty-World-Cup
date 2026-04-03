import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { formatPoints, formatRank } from '../utils/formatters';

/**
 * Leaderboard Component
 *
 * Displays real-time rankings with:
 * - Podium display for top 3 players
 * - User rank, name, points, streak in table format
 * - Highlighted current user row
 * - Smooth rank transition animations
 * - Mobile-first responsive design
 *
 * Requirements: 4.6
 */

export function Leaderboard() {
  const { t, i18n } = useTranslation();
  const { leaderboard, user } = useAppStore();
  const locale = i18n.language;

  // Get streak display with fire emoji
  const getStreakDisplay = (streak: number): string => {
    if (streak === 0) return '-';
    return `${streak} 🔥`;
  };

  // Check if this is the current user
  const isCurrentUser = (userId: string): boolean => {
    return user?.userId === userId;
  };

  // Get avatar color based on rank
  const getAvatarColor = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 to-yellow-600';
      case 2:
        return 'from-gray-300 to-gray-500';
      case 3:
        return 'from-orange-400 to-orange-600';
      default:
        return 'from-blue-500 to-purple-600';
    }
  };

  // Get initials from name
  const getInitials = (name: string): string => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  // Reorder for podium display: 2nd, 1st, 3rd
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : 
                      top3.length === 2 ? [top3[1], top3[0]] :
                      top3.length === 1 ? [top3[0]] : [];

  return (
    <div className="leaderboard w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          🏆 {t('leaderboard.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">Top performers in this match</p>
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>{t('common.loading')}</p>
          <p className="text-sm mt-2">Waiting for players...</p>
        </div>
      ) : (
        <>
          {/* Podium for Top 3 */}
          {top3.length > 0 && (
            <div className="mb-8">
              {/* Crown above 1st place */}
              <div className="flex justify-center mb-4">
                <div className="text-6xl animate-bounce">👑</div>
              </div>

              {/* Avatars */}
              <div className="flex justify-center items-end gap-4 mb-4">
                {podiumOrder.map((player, index) => {
                  const actualRank = player.rank;
                  const isCurrent = isCurrentUser(player.userId);
                  
                  return (
                    <div
                      key={player.userId}
                      className={`flex flex-col items-center ${
                        actualRank === 1 ? 'order-2' : actualRank === 2 ? 'order-1' : 'order-3'
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`relative ${actualRank === 1 ? 'mb-2' : ''}`}>
                        <div
                          className={`w-20 h-20 rounded-full bg-gradient-to-br ${getAvatarColor(
                            actualRank
                          )} flex items-center justify-center text-white font-bold text-2xl shadow-2xl ${
                            isCurrent ? 'ring-4 ring-blue-500' : ''
                          } ${actualRank === 1 ? 'w-24 h-24 text-3xl' : ''}`}
                        >
                          {getInitials(player.displayName)}
                        </div>
                        {/* Rank badge */}
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg border-2 border-gray-200 dark:border-gray-700">
                          <span className="text-lg">
                            {actualRank === 1 ? '🥇' : actualRank === 2 ? '🥈' : '🥉'}
                          </span>
                        </div>
                      </div>

                      {/* Name */}
                      <p className={`font-bold text-gray-900 dark:text-white text-center mt-2 ${
                        actualRank === 1 ? 'text-lg' : 'text-sm'
                      }`}>
                        {player.displayName}
                        {isCurrent && <span className="text-blue-500"> (You)</span>}
                      </p>

                      {/* Points */}
                      <p className={`font-bold text-yellow-600 dark:text-yellow-400 ${
                        actualRank === 1 ? 'text-2xl' : 'text-lg'
                      }`}>
                        {formatPoints(player.totalPoints, locale)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Podium Steps */}
              <div className="flex justify-center items-end gap-2 px-4">
                {podiumOrder.map((player) => {
                  const actualRank = player.rank;
                  const heights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' };
                  const colors = {
                    1: 'from-yellow-400 to-yellow-600',
                    2: 'from-gray-300 to-gray-500',
                    3: 'from-orange-400 to-orange-600',
                  };

                  return (
                    <div
                      key={player.userId}
                      className={`flex-1 max-w-[120px] bg-gradient-to-t ${
                        colors[actualRank as keyof typeof colors]
                      } ${heights[actualRank as keyof typeof heights]} rounded-t-2xl shadow-xl flex flex-col items-center justify-center text-white font-bold ${
                        actualRank === 1 ? 'order-2' : actualRank === 2 ? 'order-1' : 'order-3'
                      }`}
                    >
                      <div className="text-4xl mb-1">{actualRank}</div>
                      <div className="text-xs opacity-75">
                        {getStreakDisplay(player.streak)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rest of the players */}
          {rest.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3">
                <h3 className="text-white font-bold">Other Players</h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {rest.map((entry) => {
                  const isCurrent = isCurrentUser(entry.userId);
                  return (
                    <div
                      key={entry.userId}
                      className={`flex items-center justify-between px-4 py-4 transition-all ${
                        isCurrent
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {/* Rank & Avatar */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="text-lg font-bold text-gray-600 dark:text-gray-400 w-8">
                          {formatRank(entry.rank, locale)}
                        </div>
                        <div
                          className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(
                            entry.rank
                          )} flex items-center justify-center text-white font-bold text-sm shadow-lg`}
                        >
                          {getInitials(entry.displayName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {entry.displayName}
                            {isCurrent && (
                              <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Streak: {getStreakDisplay(entry.streak)}
                          </p>
                        </div>
                      </div>

                      {/* Points */}
                      <div className="text-right">
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {formatPoints(entry.totalPoints, locale)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
