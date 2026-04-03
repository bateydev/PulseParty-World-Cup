/**
 * Unit tests for PWA Status Component
 * 
 * Tests:
 * - Offline indicator display
 * - Update notification display
 * - usePWAStatus hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PWAStatusIndicator, usePWAStatus } from './PWAStatus';
import * as pwaRegistration from '../pwa-registration';

// Mock the PWA registration module
vi.mock('../pwa-registration', () => ({
  onPWAStatusChange: vi.fn((callback) => {
    // Immediately call with mock status
    callback({
      isOnline: true,
      isInstalled: false,
      needsUpdate: false,
      registration: null,
    });
    return () => {}; // unsubscribe function
  }),
  activateUpdate: vi.fn(),
}));

describe('PWAStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<PWAStatusIndicator />);
    expect(container).toBeTruthy();
  });

  it('should subscribe to PWA status changes on mount', () => {
    render(<PWAStatusIndicator />);
    expect(pwaRegistration.onPWAStatusChange).toHaveBeenCalled();
  });

  it('should display offline indicator when offline', () => {
    // Mock offline status
    vi.mocked(pwaRegistration.onPWAStatusChange).mockImplementation((callback) => {
      callback({
        isOnline: false,
        isInstalled: false,
        needsUpdate: false,
        registration: null,
      });
      return () => {};
    });

    render(<PWAStatusIndicator />);
    
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
    expect(screen.getByText(/some features may be limited/i)).toBeInTheDocument();
  });

  it('should display update notification when update is available', () => {
    // Mock update available status
    vi.mocked(pwaRegistration.onPWAStatusChange).mockImplementation((callback) => {
      callback({
        isOnline: true,
        isInstalled: true,
        needsUpdate: true,
        registration: {} as ServiceWorkerRegistration,
      });
      return () => {};
    });

    render(<PWAStatusIndicator />);
    
    expect(screen.getByText(/update available/i)).toBeInTheDocument();
    expect(screen.getByText(/update now/i)).toBeInTheDocument();
  });
});

describe('usePWAStatus', () => {
  beforeEach(() => {
    // Reset to default mock
    vi.mocked(pwaRegistration.onPWAStatusChange).mockImplementation((callback) => {
      callback({
        isOnline: true,
        isInstalled: false,
        needsUpdate: false,
        registration: null,
      });
      return () => {};
    });
  });

  it('should return PWA status', () => {
    const TestComponent = () => {
      const status = usePWAStatus();
      return (
        <div>
          <span data-testid="online">{status.isOnline.toString()}</span>
          <span data-testid="installed">{status.isInstalled.toString()}</span>
          <span data-testid="needsUpdate">{status.needsUpdate.toString()}</span>
        </div>
      );
    };

    render(<TestComponent />);
    
    expect(screen.getByTestId('online')).toHaveTextContent('true');
    expect(screen.getByTestId('installed')).toHaveTextContent('false');
    expect(screen.getByTestId('needsUpdate')).toHaveTextContent('false');
  });
});
