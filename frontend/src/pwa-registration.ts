/**
 * PWA Service Worker Registration and Lifecycle Management
 *
 * This module handles:
 * - Service worker registration
 * - Update notifications
 * - Offline/online status detection
 * - Cache management
 *
 * Requirements: 6.1, 6.2, 6.4, 6.5
 */

export interface PWAStatus {
  isOnline: boolean;
  isInstalled: boolean;
  needsUpdate: boolean;
  registration: ServiceWorkerRegistration | null;
}

type PWAStatusCallback = (status: PWAStatus) => void;

let statusCallback: PWAStatusCallback | null = null;
const currentStatus: PWAStatus = {
  isOnline: navigator.onLine,
  isInstalled: false,
  needsUpdate: false,
  registration: null,
};

/**
 * Register the service worker and set up lifecycle handlers
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported in this browser');
    return null;
  }

  try {
    // The service worker is automatically registered by vite-plugin-pwa
    // This function sets up additional lifecycle handlers

    const registration = await navigator.serviceWorker.ready;

    currentStatus.isInstalled = true;
    currentStatus.registration = registration;
    notifyStatusChange();

    // Check for updates periodically (every 60 seconds)
    setInterval(() => {
      registration.update();
    }, 60000);

    // Listen for service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // New service worker available
          currentStatus.needsUpdate = true;
          notifyStatusChange();

          console.log('New version available! Reload to update.');
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Activate the waiting service worker and reload the page
 */
export function activateUpdate(): void {
  const registration = currentStatus.registration;
  if (!registration || !registration.waiting) {
    console.warn('No service worker update available');
    return;
  }

  // Tell the waiting service worker to skip waiting and become active
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });

  // Reload the page when the new service worker takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

/**
 * Set up online/offline event listeners
 */
export function setupNetworkListeners(): void {
  window.addEventListener('online', () => {
    currentStatus.isOnline = true;
    notifyStatusChange();
    console.log('Network connection restored');
  });

  window.addEventListener('offline', () => {
    currentStatus.isOnline = false;
    notifyStatusChange();
    console.log('Network connection lost - running in offline mode');
  });
}

/**
 * Subscribe to PWA status changes
 */
export function onPWAStatusChange(callback: PWAStatusCallback): () => void {
  statusCallback = callback;

  // Immediately call with current status
  callback(currentStatus);

  // Return unsubscribe function
  return () => {
    statusCallback = null;
  };
}

/**
 * Get current PWA status
 */
export function getPWAStatus(): PWAStatus {
  return { ...currentStatus };
}

/**
 * Clear all caches (useful for debugging or manual cache reset)
 */
export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) {
    console.warn('Cache API not supported');
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('All caches cleared');
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
}

/**
 * Check if the app is running in standalone mode (installed as PWA)
 */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Notify subscribers of status changes
 */
function notifyStatusChange(): void {
  if (statusCallback) {
    statusCallback({ ...currentStatus });
  }
}

/**
 * Initialize PWA features
 */
export function initializePWA(): void {
  setupNetworkListeners();
  registerServiceWorker();

  // Log installation status
  if (isStandalone()) {
    console.log('Running as installed PWA');
  } else {
    console.log('Running in browser mode');
  }
}
