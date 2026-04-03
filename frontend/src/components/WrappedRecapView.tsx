import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { Toast } from './Toast';
import {
  formatPercentage,
  formatPoints,
  formatDateTime,
} from '../utils/formatters';

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
  const { t, i18n } = useTranslation();
  const { user } = useAppStore();
  const [animationPhase, setAnimationPhase] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Get current locale
  const locale = i18n.language;

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
      points: formatPoints(recap.totalPoints, locale),
      rank: recap.finalRank,
      accuracy: formatPercentage(recap.accuracy, locale, 1),
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
          setToastMessage(t('recap.linkCopied'));
        } catch (err) {
          console.error('Failed to copy:', err);
          setToastMessage('Failed to copy link');
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
    <div className="wrapped-recap-view w-full max-w-4xl mx-auto animate-fadeIn">
      {/* Hero Section */}
      <div className="relative mb-8 rounded-3xl overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 text-center text-white">
          <div className="text-6xl mb-4 animate-bounce">
            {recap.finalRank === 1 ? '👑' : recap.finalRank <= 3 ? '🎉' : '⚽'}
          </div>
          <h2 className="text-4xl font-bold mb-2">{t('recap.title')}</h2>
          <p className="text-xl opacity-90 mb-4">{getPerformanceMessage()}</p>
          <div className="inline-block bg-white/20 backdrop-blur-sm px-6 py-2 rounded-full">
            <p className="font-semibold">
              {user?.displayName || t('common.guest')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid - Modern Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {/* Total Points */}
        <div
          className={`stat-card group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border-2 border-transparent hover:border-blue-500 transition-all duration-500 transform hover:scale-105 ${
            animationPhase >= 1
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-2xl shadow-lg">
              💎
            </div>
            <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
              {formatPoints(recap.totalPoints, locale)}
            </div>
          </div>
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {t('recap.stats.totalPoints')}
          </div>
        </div>

        {/* Final Rank */}
        <div
          className={`stat-card group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border-2 border-transparent hover:border-purple-500 transition-all duration-500 transform hover:scale-105 ${
            animationPhase >= 2
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg">
              🏆
            </div>
            <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
              {getRankDisplay(recap.finalRank)}
            </div>
          </div>
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {t('recap.stats.finalRank')}
          </div>
        </div>

        {/* Accuracy */}
        <div
          className={`stat-card group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border-2 border-transparent hover:border-green-500 transition-all duration-500 transform hover:scale-105 ${
            animationPhase >= 3
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-2xl shadow-lg">
              🎯
            </div>
            <div className="text-3xl font-black text-green-600 dark:text-green-400">
              {formatPercentage(recap.accuracy, locale, 0)}
            </div>
          </div>
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {t('recap.stats.accuracy')}
          </div>
        </div>

        {/* Longest Streak */}
        <div
          className={`stat-card group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border-2 border-transparent hover:border-orange-500 transition-all duration-500 transform hover:scale-105 ${
            animationPhase >= 4
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg">
              🔥
            </div>
            <div className="text-3xl font-black text-orange-600 dark:text-orange-400">
              {recap.longestStreak}
            </div>
          </div>
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {t('recap.stats.longestStreak')}
          </div>
        </div>

        {/* Clutch Moments */}
        <div
          className={`stat-card group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border-2 border-transparent hover:border-red-500 transition-all duration-500 transform hover:scale-105 col-span-2 ${
            animationPhase >= 5
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-2xl shadow-lg">
              ⚡
            </div>
            <div className="text-3xl font-black text-red-600 dark:text-red-400">
              {recap.clutchMoments}
            </div>
          </div>
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {t('recap.stats.clutchMoments')}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            {t('recap.stats.clutchDescription')}
          </div>
        </div>
      </div>

      {/* Share Section - Modern Design */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>📤</span>
            {t('recap.shareTitle')}
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleShare('twitter')}
            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
            </svg>
            <span className="text-xs">Twitter</span>
          </button>

          <button
            onClick={() => handleShare('facebook')}
            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span className="text-xs">Facebook</span>
          </button>

          <button
            onClick={() => handleShare('copy')}
            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <svg
              className="w-6 h-6"
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
            <span className="text-xs">{t('recap.copyLink')}</span>
          </button>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        {t('recap.generatedAt', {
          date: formatDateTime(recap.createdAt, locale),
        })}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
