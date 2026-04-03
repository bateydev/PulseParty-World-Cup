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
  const { activePredictionWindow, submitPrediction, wsConnected } = useAppStore();

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
      return;
    }

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
  }, [activePredictionWindow, hasSubmitted, t]);

  // Handle choice selection
  const handleSelectChoice = (choice: string) => {
    if (hasSubmitted || remainingSeconds === 0) return;
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

    if (!wsConnected) {
      setSubmitError('WebSocket not connected. Please wait...');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitPrediction(activePredictionWindow.windowId, selectedChoice);
      setHasSubmitted(true);
      
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

  return (
    <div className="prediction-widget w-full max-w-2xl mx-auto p-4">
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-lg p-6 border-2 border-blue-200">
        {/* Header with countdown */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">
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
          <p className="text-lg font-semibold text-gray-700">
            {getPredictionTitle(activePredictionWindow.predictionType)}
          </p>
        </div>

        {/* Multiple Choice Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {activePredictionWindow.options.map((option) => (
            <button
              key={option}
              onClick={() => handleSelectChoice(option)}
              disabled={hasSubmitted || remainingSeconds === 0 || isSubmitting}
              className={`py-4 px-6 rounded-lg border-2 font-semibold transition-all transform hover:scale-105 active:scale-95 ${
                selectedChoice === option
                  ? 'border-blue-600 bg-blue-100 text-blue-800 shadow-md'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
              } ${
                hasSubmitted || remainingSeconds === 0
                  ? 'opacity-50 cursor-not-allowed hover:scale-100'
                  : ''
              }`}
              aria-pressed={selectedChoice === option}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Submit Button */}
        {!hasSubmitted && (
          <button
            onClick={handleSubmit}
            disabled={
              !selectedChoice ||
              isSubmitting ||
              remainingSeconds === 0 ||
              !wsConnected
            }
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
          >
            {isSubmitting ? t('common.loading') : t('prediction.submit')}
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
