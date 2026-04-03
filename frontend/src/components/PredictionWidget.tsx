import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';

/**
 * PredictionWidget Component
 *
 * Displays prediction window with:
 * - Countdown timer showing remaining time
 * - Multiple choice options as buttons
 * - Submit button with loading state
 * - Result feedback animation after evaluation
 *
 * Requirements: 3.3, 3.4, 3.5
 */

export function PredictionWidget() {
  const { t } = useTranslation();
  const { activePredictionWindow, submitPrediction, wsConnected, addMatchEvent } = useAppStore();

  // Local state
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [showResult, setShowResult] = useState(false);
  const [resultType, setResultType] = useState<'correct' | 'incorrect' | null>(null);
  const [pointsAwarded, setPointsAwarded] = useState<number>(0);

  // Calculate remaining time
  useEffect(() => {
    if (!activePredictionWindow) {
      setRemainingSeconds(0);
      setHasSubmitted(false);
      setSelectedChoice(null);
      setShowResult(false);
      setResultType(null);
      setSubmitError(null);
      setIsSubmitting(false);
      return;
    }

    // Reset state when new prediction window appears
    setHasSubmitted(false);
    setSelectedChoice(null);
    setShowResult(false);
    setResultType(null);
    setSubmitError(null);
    setIsSubmitting(false);

    const calculateRemaining = () => {
      const expiresAt = new Date(activePredictionWindow.expiresAt);
      const now = new Date();
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setRemainingSeconds(diff);

      if (diff === 0 && !hasSubmitted) {
        setSubmitError(t('prediction.time_up'));
      }
    };

    // Initial calculation
    calculateRemaining();

    // Update every second
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [activePredictionWindow, t]);

  // Handle choice selection
  const handleSelectChoice = (choice: string) => {
    console.log('🔵 handleSelectChoice called with:', choice);
    console.log('🔵 hasSubmitted:', hasSubmitted);
    console.log('🔵 remainingSeconds:', remainingSeconds);
    
    if (hasSubmitted) {
      console.log('❌ Already submitted, ignoring click');
      return;
    }
    if (remainingSeconds === 0) {
      console.log('❌ Time expired, ignoring click');
      return;
    }
    
    console.log('✅ Player selected:', choice);
    setSelectedChoice(choice);
    setSubmitError(null);
  };

  // Handle prediction submission
  const handleSubmit = async () => {
    if (!activePredictionWindow || !selectedChoice || hasSubmitted) return;

    if (remainingSeconds === 0) {
      setSubmitError(t('prediction.expired'));
      return;
    }

    // In demo mode, allow submission even without WebSocket
    const isDemoMode = !wsConnected;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (isDemoMode) {
        // Demo mode: simulate submission
        console.log('Demo prediction submitted:', selectedChoice);
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // Real mode: use WebSocket
        await submitPrediction(activePredictionWindow.windowId, selectedChoice);
      }
      
      setHasSubmitted(true);
      
      // Add prediction to timeline
      const predictionEvent = {
        eventId: `prediction-${Date.now()}`,
        matchId: activePredictionWindow.matchId,
        eventType: 'prediction',
        timestamp: new Date().toISOString(),
        teamId: 'user',
        metadata: {
          predictionType: activePredictionWindow.predictionType,
          choice: selectedChoice,
          windowId: activePredictionWindow.windowId,
        },
      };
      addMatchEvent(predictionEvent);
      
      // Show success feedback
      setTimeout(() => {
        setShowResult(true);
        setResultType('correct'); // This would come from server in real implementation
        setPointsAwarded(25); // This would come from server
      }, 500);
    } catch (error) {
      console.error('Failed to submit prediction:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit prediction');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get prediction type title
  const getPredictionTitle = (type: string): string => {
    const titleKey = `prediction.${type}`;
    const translated = t(titleKey);
    // If translation key not found, return formatted type
    return translated === titleKey ? type.replace(/_/g, ' ') : translated;
  };

  // Format countdown display
  const formatCountdown = (seconds: number): string => {
    return t('prediction.countdown', { seconds });
  };

  // Get countdown color based on remaining time
  const getCountdownColor = (): string => {
    if (remainingSeconds <= 10) return 'text-red-600 font-bold';
    if (remainingSeconds <= 30) return 'text-orange-600 font-semibold';
    return 'text-blue-600';
  };

  // Don't render if no active prediction window
  if (!activePredictionWindow) {
    return null;
  }

  // Get player avatar color based on name
  const getPlayerColor = (name: string): string => {
    const colors = [
      'from-blue-500 to-blue-700',
      'from-red-500 to-red-700',
      'from-green-500 to-green-700',
      'from-purple-500 to-purple-700',
      'from-yellow-500 to-yellow-700',
      'from-pink-500 to-pink-700',
      'from-indigo-500 to-indigo-700',
      'from-orange-500 to-orange-700',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  // Get initials from name
  const getInitials = (name: string): string => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="prediction-widget w-full max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-gray-200 dark:border-gray-700">
        {/* Header with countdown */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('prediction.title')}
          </h3>
          <div
            className={`text-2xl font-mono ${getCountdownColor()}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {formatCountdown(remainingSeconds)}
          </div>
        </div>

        {/* Prediction Question */}
        <div className="mb-6">
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {getPredictionTitle(activePredictionWindow.predictionType)}
          </p>
        </div>

        {/* Player Avatars Grid - 4 columns */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {activePredictionWindow.options.map((option) => (
            <button
              key={option}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟢 Button clicked:', option);
                handleSelectChoice(option);
              }}
              disabled={hasSubmitted || remainingSeconds === 0 || isSubmitting}
              type="button"
              className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all transform hover:scale-105 active:scale-95 ${
                selectedChoice === option
                  ? 'bg-blue-500/20 ring-2 ring-blue-500 shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              } ${
                hasSubmitted || remainingSeconds === 0
                  ? 'opacity-50 cursor-not-allowed hover:scale-100'
                  : ''
              }`}
              aria-pressed={selectedChoice === option}
            >
              {/* Avatar Circle */}
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getPlayerColor(option)} flex items-center justify-center text-white font-bold text-sm shadow-lg ${
                selectedChoice === option ? 'ring-2 ring-white' : ''
              }`}>
                {getInitials(option)}
              </div>
              
              {/* Player Name */}
              <span className="text-xs font-semibold text-gray-900 dark:text-white text-center line-clamp-2">
                {option}
              </span>
            </button>
          ))}
        </div>

        {/* Submit Button */}
        {!hasSubmitted && selectedChoice && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700">
            <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
              You selected: <span className="font-bold text-blue-600 dark:text-blue-400">{selectedChoice}</span>
            </p>
          </div>
        )}
        
        {!hasSubmitted && (
          <button
            onClick={handleSubmit}
            disabled={
              !selectedChoice ||
              isSubmitting ||
              remainingSeconds === 0
            }
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
          >
            {isSubmitting ? '⏳ ' + t('common.loading') : selectedChoice ? '✅ Submit Prediction' : '👆 Select a player first'}
          </button>
        )}

        {/* Submitted Feedback */}
        {hasSubmitted && !showResult && (
          <div className="w-full py-4 px-6 bg-green-100 border-2 border-green-400 text-green-800 rounded-lg font-semibold text-center animate-pulse">
            {t('prediction.submitted')}
          </div>
        )}

        {/* Result Feedback Animation */}
        {showResult && resultType && (
          <div
            className={`w-full py-4 px-6 rounded-lg font-bold text-center text-lg animate-bounce ${
              resultType === 'correct'
                ? 'bg-green-100 border-2 border-green-500 text-green-800'
                : 'bg-red-100 border-2 border-red-500 text-red-800'
            }`}
          >
            {resultType === 'correct'
              ? t('prediction.correct', { points: pointsAwarded })
              : t('prediction.incorrect')}
          </div>
        )}

        {/* Error Message */}
        {submitError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {submitError}
          </div>
        )}

        {/* Progress Bar */}
        {!hasSubmitted && activePredictionWindow && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  remainingSeconds <= 10
                    ? 'bg-red-500'
                    : remainingSeconds <= 30
                    ? 'bg-orange-500'
                    : 'bg-blue-500'
                }`}
                style={{
                  width: `${Math.max(
                    0,
                    (remainingSeconds /
                      Math.max(
                        1,
                        Math.floor(
                          (new Date(activePredictionWindow.expiresAt).getTime() -
                            new Date(activePredictionWindow.createdAt).getTime()) /
                            1000
                        )
                      )) *
                      100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
