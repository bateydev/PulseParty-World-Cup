import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * WrappedRecapView Component
 *
 * Displays a "Wrapped" style recap similar to Spotify Wrapped with:
 * - Personal stats with animations (total points, rank, accuracy, streak, clutch moments)
 * - Share button for social media
 * - Historical recap access
 * - Mobile-first responsive design
 *
 * Requirements: 5.2, 5.3, 5.5
 */

interface WrappedRecap {
  userId: string;
  roomId: string;
  matchId: string;
  totalPoints: number;
  finalRank: number;
  accuracy: number; // percentage
  longestStreak: number;
  clutchMoments: number;
  shareableUrl: string;
}

interface WrappedRecapViewProps {
  recap: WrappedRecap;
  onClose?: () => void;
  onViewHistory?: () => void;
}

export function WrappedRecapView({
  recap,
  onClose,
  onViewHistory,
}: WrappedRecapViewProps) {
  const { t } = useTranslation();
  const [animationStep, setAnimationStep] = useState(0);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Animated counter hook
  const useAnimatedCounter = (
    target: number,
    duration: number = 1000,
    delay: number = 0
  ) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      const timeout = setTimeout(() => {
        const startTime = Date.now();
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOutQuad = 1 - (1 - progress) * (1 - progress);
          setCount(Math.floor(target * easeOutQuad));

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            setCount(target);
          }
        };
        animate();
      }, delay);

      return () => clearTimeout(timeout);
    }, [target, duration, delay]);

    return count;
  };

  // Animate stats sequentially
  useEffect(() => {
    const steps = [0, 1, 2, 3, 4, 5];
    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setAnimationStep(steps[currentStep]);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    return () => clearInterval(interval);
  }, []);

  // Animated values
  const animatedPoints = useAnimatedCounter(
    recap.totalPoints,
    1000,
    animationStep >= 1 ? 0 : 1000
  );
  const animatedRank = useAnimatedCounter(
    recap.finalRank,
    800,
    animationStep >= 2 ? 0 : 1000
  );
  const animatedAccuracy = useAnimatedCounter(
    recap.accuracy,
    800,
    animationStep >= 3 ? 0 : 1000
  );
  const animatedStreak = useAnimatedCounter(
    recap.longestStreak,
    800,
    animationStep >= 4 ? 0 : 1000
  );
  const animatedClutch = useAnimatedCounter(
    recap.clutchMoments,
    800,
    animationStep >= 5 ? 0 : 1000
  );

  // Handle share functionality
  const handleShare = async () => {
    try {
      // Try native Web Share API first
      if (navigator.share) {
        await navigator.share({
          title: t('recap.wrapped_title'),
          text: `${t('recap.total_points')}: ${recap.totalPoints} | ${t('recap.final_rank')}: #${recap.finalRank} | ${t('recap.accuracy')}: ${recap.accuracy}%`,
          url: recap.shareableUrl,
        });
        setShareSuccess(true);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(recap.shareableUrl);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
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

  return (
    <div className="wrapped-recap-view fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-y-auto">
      <div className="w-full max-w-md mx-auto p-6">
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            aria-label={t('common.close')}
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Title */}
        <div
          className={`text-center mb-8 transition-all duration-700 ${
            animationStep >= 0
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-4'
          }`}
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            {t('recap.wrapped_title')}
          </h1>
          <p className="text-white/70 text-lg">{t('recap.title')}</p>
        </div>

        {/* Stats Cards */}
        <div className="space-y-4">
          {/* Total Points */}
          <div
            className={`stat-card bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 transition-all duration-700 ${
              animationStep >= 1
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-8'
            }`}
          >
            <div className="text-white/70 text-sm uppercase tracking-wide mb-2">
              {t('recap.total_points')}
            </div>
            <div className="text-5xl font-bold text-white">
              {animatedPoints}
            </div>
            <div className="text-yellow-400 text-2xl mt-2">⭐</div>
          </div>

          {/* Final Rank */}
          <div
            className={`stat-card bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 transition-all duration-700 ${
              animationStep >= 2
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-8'
            }`}
          >
            <div className="text-white/70 text-sm uppercase tracking-wide mb-2">
              {t('recap.final_rank')}
            </div>
            <div className="text-5xl font-bold text-white flex items-center gap-3">
              <span>{getRankDisplay(animatedRank)}</span>
              {recap.finalRank > 3 && <span>#{animatedRank}</span>}
            </div>
          </div>

          {/* Accuracy */}
          <div
            className={`stat-card bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 transition-all duration-700 ${
              animationStep >= 3
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-8'
            }`}
          >
            <div className="text-white/70 text-sm uppercase tracking-wide mb-2">
              {t('recap.accuracy')}
            </div>
            <div className="text-5xl font-bold text-white">
              {animatedAccuracy}%
            </div>
            <div className="mt-2">
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${animatedAccuracy}%` }}
                />
              </div>
            </div>
          </div>

          {/* Longest Streak */}
          <div
            className={`stat-card bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 transition-all duration-700 ${
              animationStep >= 4
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-8'
            }`}
          >
            <div className="text-white/70 text-sm uppercase tracking-wide mb-2">
              {t('recap.longest_streak')}
            </div>
            <div className="text-5xl font-bold text-white flex items-center gap-3">
              <span>{animatedStreak}</span>
              {recap.longestStreak > 0 && <span className="text-3xl">🔥</span>}
            </div>
          </div>

          {/* Clutch Moments */}
          <div
            className={`stat-card bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 transition-all duration-700 ${
              animationStep >= 5
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-8'
            }`}
          >
            <div className="text-white/70 text-sm uppercase tracking-wide mb-2">
              {t('recap.clutch_moments')}
            </div>
            <div className="text-5xl font-bold text-white flex items-center gap-3">
              <span>{animatedClutch}</span>
              {recap.clutchMoments > 0 && <span className="text-3xl">⚡</span>}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className={`mt-8 space-y-3 transition-all duration-700 delay-300 ${
            animationStep >= 5
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            {shareSuccess ? (
              <span className="flex items-center justify-center gap-2">
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {navigator.share ? 'Shared!' : 'Link Copied!'}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
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
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                {t('recap.share_title')}
              </span>
            )}
          </button>

          {/* View History Button */}
          {onViewHistory && (
            <button
              onClick={onViewHistory}
              className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 border border-white/20"
            >
              {t('recap.view_history')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
