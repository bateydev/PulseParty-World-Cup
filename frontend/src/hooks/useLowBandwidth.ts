/**
 * Low Bandwidth Mode Hook
 *
 * Provides functionality to detect and manage low-bandwidth mode:
 * - Manual toggle for low-bandwidth mode
 * - Automatic detection based on connection type
 * - Persistence to localStorage
 *
 * Requirements: 6.6, 6.7
 */

import { useState, useEffect } from 'react';

interface NetworkInformation extends EventTarget {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

const STORAGE_KEY = 'pulseparty-low-bandwidth-mode';

/**
 * Get the network connection object if available
 */
function getConnection(): NetworkInformation | null {
  const nav = navigator as NavigatorWithConnection;
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
}

/**
 * Detect if the user is on a slow connection
 */
function isSlowConnection(): boolean {
  const connection = getConnection();
  
  if (!connection) {
    return false;
  }

  // Check if user has enabled data saver mode
  if (connection.saveData) {
    return true;
  }

  // Check effective connection type
  if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
    return true;
  }

  // Check downlink speed (< 1 Mbps is considered slow)
  if (connection.downlink && connection.downlink < 1) {
    return true;
  }

  return false;
}

export interface LowBandwidthState {
  isEnabled: boolean;
  isAutoDetected: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
}

/**
 * Hook to manage low-bandwidth mode
 */
export function useLowBandwidth(): LowBandwidthState {
  // Load initial state from localStorage
  const [isManuallyEnabled, setIsManuallyEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  const [isAutoDetected, setIsAutoDetected] = useState<boolean>(false);

  // Detect slow connection on mount and when connection changes
  useEffect(() => {
    const updateConnectionStatus = () => {
      setIsAutoDetected(isSlowConnection());
    };

    // Initial check
    updateConnectionStatus();

    // Listen for connection changes
    const connection = getConnection();
    if (connection) {
      connection.addEventListener('change', updateConnectionStatus);
      return () => {
        connection.removeEventListener('change', updateConnectionStatus);
      };
    }
  }, []);

  // Persist manual setting to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isManuallyEnabled));
  }, [isManuallyEnabled]);

  const toggle = () => {
    setIsManuallyEnabled((prev) => !prev);
  };

  const enable = () => {
    setIsManuallyEnabled(true);
  };

  const disable = () => {
    setIsManuallyEnabled(false);
  };

  // Low-bandwidth mode is enabled if manually enabled OR auto-detected
  const isEnabled = isManuallyEnabled || isAutoDetected;

  return {
    isEnabled,
    isAutoDetected,
    toggle,
    enable,
    disable,
  };
}
