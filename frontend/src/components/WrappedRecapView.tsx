import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';

/**
 * WrappedRecapView Component
 *
 * Displays personalized match summary with:
 * - Personal stats with animations (total points, rank, accuracy, streak, clutch moments)
 * - Share button for social media
 * - Historical recap access
 * - Mobile-first responsive design
 *
 * Requirements: 5.2, 5.3, 5.5
 */

interface WrappedRecapData {
  userId: string;
  roomId: string;
  matchId: string;
  totalPoints: number;
  finalRank: number;
  accuracy: number; // percentage
  longestStreak: number;
  clutchMoments: number;
  shareableUrl: string;
  createdAt: string;
}

interface WrappedRecapViewProps {
  recap?: WrappedRecapData;
  onClose?: () => void;
}

export function WrappedRecapView({ recap, onClose }: WrappedRecapViewProps) {
  const { t } = useTranslation();
  const { user } = useAppStore();
  const [animationPhase, setAnimationPhase] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Animate stats reveal
  useEffect(() => {
    if (!recap) return;

    const phases = [0, 1, 2, 3, 4, 5];
    let currentPhase = 0;

    const interval = setInterval(() => {
      currentPhase++;
      if (currentPhase < phases.length) {
        setAnimationPhase(currentPhase);
      } else {
        clearInterval(interval);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [recap]);

  // Handle share action
  const handleShare = async (platform: 'twitter' | 'facebook' | 'copy') => {
    if (!recap) return;

    const shareText = t('recap.shareText', {
      points: recap.totalPoints,
      rank: recap.finalRank,
      accuracy: recap.accuracy.toFixed(1),
    });

    const shareUrl = recap.shareableUrl || window.location.href;

    switch (platform) {
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
        break;
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
          alert(t('recap.linkCopied'));
        } catch (err) {
          console.error('Failed to copy:', err);
        }
        break;
    }

    setShowShareMenu(false);
  };

  // Get rank display with medal
  const getRankDisplay = (rank: number): string => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  // Get performance message based on stats
  const getPerformanceMessage = (): string => {
    if (!recap) return '';

    if (recap.finalRank === 1) {
      return t('recap.performance.champion');
    } else if (recap.finalRank <= 3) {
      return t('recap.performance.podium');
    } else if (recap.accuracy >= 70) {
      return t('recap.performance.accurate');
    } else if (recap.longestStreak >= 5) {
      return t('recap.performance.consistent');
    } else if (recap.clutchMoments >= 3) {
      return t('recap.performance.clutch');
    } else {
      return t('recap.performance.participant');
    }
  };

  if (!recap) {
    return (
      <div className="wrapped-recap-view w-full max-w-2xl mx-auto p-4">
        <div className="text-center py-12 text-gray-500">
          <p>{t('recap.noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrapped-recap-view w-full max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {t('recap.title')}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            aria-label={t('common.close')}
          >
            ×
          </button>
        )}
      </div>

      {/* Performance Message */}
      <div className="mb-6 text-center">
        <p className="text-xl font-semibold text-gray-700">
          {getPerformanceMessage()}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {user?.displayName || t('common.guest')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Total Points */}
        <div
          className={`stat-card bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg transform transition-all duration-500 ${
            animationPhase >= 1
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="text-sm uppercase tracking-wide mb-2">
            {t('recap.stats.totalPoints')}
          </div>
          <div className="text-4xl font-bold">{recap.totalPoints}</div>
        </div>

        {/* Final Rank */}
        <div
          className={`stat-card bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg transform transition-all duration-500 ${
            animationPhase >= 2
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="text-sm uppercase tracking-wide mb-2">
            {t('recap.stats.finalRank')}
          </div>
          <div className="text-4xl font-bold">
            {getRankDisplay(recap.finalRank)}
          </div>
        </div>

        {/* Accuracy */}
        <div
          className={`stat-card bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg transform transition-all duration-500 ${
            animationPhase >= 3
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="text-sm uppercase tracking-wide mb-2">
            {t('recap.stats.accuracy')}
          </div>
          <div className="text-4xl font-bold">{recap.accuracy.toFixed(1)}%</div>
        </div>

        {/* Longest Streak */}
        <div
          className={`stat-card bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow-lg transform transition-all duration-500 ${
            animationPhase >= 4
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="text-sm uppercase tracking-wide mb-2">
            {t('recap.stats.longestStreak')}
          </div>
          <div className="text-4xl font-bold">
            {recap.longestStreak} 🔥
          </div>
        </div>

        {/* Clutch Moments */}
        <div
          className={`stat-card bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-6 shadow-lg transform transition-all duration-500 md:col-span-2 ${
            animationPhase >= 5
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="text-sm uppercase tracking-wide mb-2">
            {t('recap.stats.clutchMoments')}
          </div>
          <div className="text-4xl font-bold">
            {recap.clutchMoments} ⚡
          </div>
          <div className="text-xs mt-2 opacity-90">
            {t('recap.stats.clutchDescription')}
          </div>
        </div>
      </div>

      {/* Share Section */}
      <div className="share-section bg-white rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-semibold mb-4">
          {t('recap.shareTitle')}
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleShare('twitter')}
            className="flex-1 bg-blue-400 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
            </svg>
            Twitter
          </button>

          <button
            onClick={() => handleShare('facebook')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Facebook
          </button>

          <button
            onClick={() => handleShare('copy')}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            {t('recap.copyLink')}
          </button>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-center mt-6 text-sm text-gray-500">
        {t('recap.generatedAt', {
          date: new Date(recap.createdAt).toLocaleString(),
        })}
      </div>
    </div>
  );
}
