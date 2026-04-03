import React, { useState, useEffect } from 'react';
import { PredictionWidget } from './PredictionWidget';
import { useAppStore } from '../store';

export function MobilePredictionSheet() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { activePredictionWindow } = useAppStore();
  const [lastWindowId, setLastWindowId] = useState<string | null>(null);

  // Auto-expand when new prediction appears
  useEffect(() => {
    if (
      activePredictionWindow &&
      activePredictionWindow.windowId !== lastWindowId
    ) {
      setLastWindowId(activePredictionWindow.windowId);
      // Auto-open sheet for new predictions
      if (lastWindowId !== null) {
        setIsExpanded(true);
      }
    }
  }, [activePredictionWindow, lastWindowId]);

  // Don't show if no active prediction
  if (!activePredictionWindow) {
    return null;
  }

  return (
    <>
      {/* Collapsed State - Floating Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-20 right-4 z-40 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-full shadow-2xl font-bold text-sm flex items-center gap-2 animate-bounce hover:scale-110 active:scale-95 transition-all"
        >
          <span className="text-xl">🎯</span>
          <span>Make Prediction</span>
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        </button>
      )}

      {/* Expanded State - Bottom Sheet */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-end animate-fadeIn">
          {/* Backdrop - No blur, just slight darkening */}
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setIsExpanded(false)}
          ></div>

          {/* Sheet Content - Max 50% height */}
          <div className="relative w-full bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl animate-slideUp max-h-[50vh] overflow-y-auto">
            {/* Handle Bar */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 pt-2 pb-2 px-4 border-b border-gray-200 dark:border-gray-700 z-10">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-2"></div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  🎯 Quick Prediction
                </h3>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
            </div>

            {/* Prediction Widget - Compact */}
            <div className="p-3">
              <PredictionWidget />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
