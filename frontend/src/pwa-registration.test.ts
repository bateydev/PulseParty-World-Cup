/**
 * Unit tests for PWA registration module
 * 
 * Tests:
 * - PWA status initialization
 * - Online/offline detection
 * - Status change notifications
 * - Standalone mode detection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPWAStatus,
  isStandalone,
  onPWAStatusChange,
  setupNetworkListeners,
} from './pwa-registration';

describe('PWA Registration', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('getPWAStatus', () => {
    it('should return initial PWA status', () => {
      const status = getPWAStatus();
      
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('isInstalled');
      expect(status).toHaveProperty('needsUpdate');
      expect(status).toHaveProperty('registration');
      
      expect(typeof status.isOnline).toBe('boolean');
      expect(typeof status.isInstalled).toBe('boolean');
      expect(typeof status.needsUpdate).toBe('boolean');
    });

    it('should reflect navigator.onLine status', () => {
      const status = getPWAStatus();
      expect(status.isOnline).toBe(navigator.onLine);
    });
  });

  describe('isStandalone', () => {
    it('should return boolean indicating standalone mode', () => {
      // Mock matchMedia before calling isStandalone
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: false,
        media: '(display-mode: standalone)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: mockMatchMedia,
      });

      const standalone = isStandalone();
      expect(typeof standalone).toBe('boolean');
    });

    it('should detect display-mode: standalone', () => {
      // Mock matchMedia for standalone mode
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: true,
        media: '(display-mode: standalone)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: mockMatchMedia,
      });

      const standalone = isStandalone();
      expect(standalone).toBe(true);
    });
  });

  describe('onPWAStatusChange', () => {
    it('should call callback immediately with current status', () => {
      const callback = vi.fn();
      
      onPWAStatusChange(callback);
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: expect.any(Boolean),
          isInstalled: expect.any(Boolean),
          needsUpdate: expect.any(Boolean),
          registration: null,
        })
      );
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      
      const unsubscribe = onPWAStatusChange(callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Calling unsubscribe should not throw
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('setupNetworkListeners', () => {
    it('should set up online and offline event listeners', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      
      setupNetworkListeners();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'offline',
        expect.any(Function)
      );
    });
  });
});
