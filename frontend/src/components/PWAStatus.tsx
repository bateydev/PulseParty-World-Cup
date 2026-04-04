/**
 * PWA Status Component
 *
 * Displays:
 * - Offline indicator when network is unavailable
 * - Update notification when new version is available
 * - Installation prompt for PWA
 *
 * Requirements: 6.4, 6.5
 */

import React, { useEffect, useState } from 'react';
import {
  onPWAStatusChange,
  activateUpdate,
  type PWAStatus,
} from '../pwa-registration';

export const PWAStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<PWAStatus>({
    isOnline: navigator.onLine,
    isInstalled: false,
    needsUpdate: false,
    registration: null,
  });

  useEffect(() => {
    const unsubscribe = onPWAStatusChange(setStatus);
    return unsubscribe;
  }, []);

  return (
    <>
      {/* Offline Indicator */}
      {!status.isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium z-50">
          <span className="inline-flex items-center gap-2">
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
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
            You're offline. Some features may be limited.
          </span>
        </div>
      )}

      {/* Update Available Notification */}
      {status.needsUpdate && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-[100] max-w-sm">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <div className="flex-1">
              <p className="font-medium mb-1">Update Available</p>
              <p className="text-sm text-blue-100 mb-3">
                A new version of PulseParty is ready to install.
              </p>
              <button
                onClick={activateUpdate}
                className="bg-white text-blue-600 px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                Update Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reconnection Indicator - Shows briefly when coming back online */}
      {status.isOnline && !status.wasOffline && (
        <div className="fixed top-0 left-0 right-0 bg-green-500 text-white px-4 py-2 text-center text-sm font-medium z-50 animate-fade-in-out">
          <span className="inline-flex items-center gap-2">
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
                d="M5 13l4 4L19 7"
              />
            </svg>
            Back online
          </span>
        </div>
      )}
    </>
  );
};

/**
 * Hook to access PWA status in components
 */
export function usePWAStatus(): PWAStatus {
  const [status, setStatus] = useState<PWAStatus>({
    isOnline: navigator.onLine,
    isInstalled: false,
    needsUpdate: false,
    registration: null,
  });

  useEffect(() => {
    const unsubscribe = onPWAStatusChange(setStatus);
    return unsubscribe;
  }, []);

  return status;
}
