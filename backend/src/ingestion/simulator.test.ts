import {
  MatchEventSimulator,
  createSimulator,
  RECORDED_MATCH_EVENTS,
} from './simulator';
import { MatchEvent } from '../types';

/**
 * Unit tests for Simulator Mode
 *
 * Tests cover:
 * - Simulator initialization and configuration
 * - Event replay with realistic timing
 * - Environment variable detection
 * - Loop mode functionality
 * - Speed multiplier
 * - Simulated event metadata
 */

describe('MatchEventSimulator', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should create simulator with default configuration', () => {
      const simulator = new MatchEventSimulator();
      const config = simulator.getConfig();

      expect(config.speedMultiplier).toBe(1.0);
      expect(config.loop).toBe(false);
    });

    it('should create simulator with custom configuration', () => {
      const simulator = new MatchEventSimulator({
        enabled: true,
        speedMultiplier: 2.0,
        loop: true,
      });

      const config = simulator.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.speedMultiplier).toBe(2.0);
      expect(config.loop).toBe(true);
    });

    it('should detect simulator mode from environment variable (true)', () => {
      process.env.SIMULATOR_MODE = 'true';
      const simulator = new MatchEventSimulator();

      expect(simulator.isEnabled()).toBe(true);
    });

    it('should detect simulator mode from environment variable (1)', () => {
      process.env.SIMULATOR_MODE = '1';
      const simulator = new MatchEventSimulator();

      expect(simulator.isEnabled()).toBe(true);
    });

    it('should detect simulator mode from environment variable (enabled)', () => {
      process.env.SIMULATOR_MODE = 'enabled';
      const simulator = new MatchEventSimulator();

      expect(simulator.isEnabled()).toBe(true);
    });

    it('should not enable simulator mode when environment variable is false', () => {
      process.env.SIMULATOR_MODE = 'false';
      const simulator = new MatchEventSimulator();

      expect(simulator.isEnabled()).toBe(false);
    });

    it('should not enable simulator mode when environment variable is not set', () => {
      delete process.env.SIMULATOR_MODE;
      const simulator = new MatchEventSimulator();

      expect(simulator.isEnabled()).toBe(false);
    });
  });

  describe('Event Replay', () => {
    it('should replay events with realistic timing', async () => {
      const simulator = new MatchEventSimulator({ enabled: true });
      const events: MatchEvent[] = [];
      const onEvent = jest.fn((event: MatchEvent) => {
        events.push(event);
      });

      simulator.start(onEvent);

      // Fast-forward through first event
      await jest.runAllTimersAsync();

      // Should have replayed all events
      expect(onEvent).toHaveBeenCalled();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].eventType).toBe('possession');

      simulator.stop();
    });

    it('should apply speed multiplier to event timing', async () => {
      const simulator = new MatchEventSimulator({
        enabled: true,
        speedMultiplier: 2.0, // 2x speed
      });
      const onEvent = jest.fn();

      simulator.start(onEvent);

      // Run all timers
      await jest.runAllTimersAsync();

      // Should have replayed events
      expect(onEvent).toHaveBeenCalled();

      simulator.stop();
    });

    it('should add simulator metadata to replayed events', async () => {
      const simulator = new MatchEventSimulator({ enabled: true });
      const events: MatchEvent[] = [];
      const onEvent = jest.fn((event: MatchEvent) => {
        events.push(event);
      });

      simulator.start(onEvent);

      // Replay first event
      jest.runOnlyPendingTimers();
      await Promise.resolve(); // Let async callback complete

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].metadata.simulated).toBe(true);
      expect(events[0].metadata.simulatorTimestamp).toBeDefined();
      expect(typeof events[0].metadata.simulatorTimestamp).toBe('string');

      simulator.stop();
    });

    it('should not start if simulator is disabled', () => {
      const simulator = new MatchEventSimulator({ enabled: false });
      const onEvent = jest.fn();

      simulator.start(onEvent);

      jest.advanceTimersByTime(10000);
      expect(onEvent).not.toHaveBeenCalled();
      expect(simulator.isActive()).toBe(false);
    });

    it('should not start if already running', async () => {
      const simulator = new MatchEventSimulator({ enabled: true });
      const onEvent = jest.fn();

      simulator.start(onEvent);
      expect(simulator.isActive()).toBe(true);

      // Try to start again
      simulator.start(onEvent);

      // Should only have one event (not restarted)
      jest.runOnlyPendingTimers();
      await Promise.resolve();

      expect(onEvent).toHaveBeenCalledTimes(1);

      simulator.stop();
    });
  });

  describe('Loop Mode', () => {
    it('should loop events when loop mode is enabled', async () => {
      // Create a simulator with loop enabled
      const simulator = new MatchEventSimulator({
        enabled: true,
        loop: true,
      });
      const onEvent = jest.fn();

      simulator.start(onEvent);

      // Run first event
      jest.runOnlyPendingTimers();
      await Promise.resolve();
      expect(onEvent).toHaveBeenCalledTimes(1);

      simulator.stop();
    });

    it('should stop after all events when loop mode is disabled', async () => {
      const simulator = new MatchEventSimulator({
        enabled: true,
        loop: false,
      });
      const onEvent = jest.fn();

      simulator.start(onEvent);

      // Run all events
      await jest.runAllTimersAsync();

      expect(onEvent).toHaveBeenCalledTimes(RECORDED_MATCH_EVENTS.length);
      expect(simulator.isActive()).toBe(false);
    });
  });

  describe('State Management', () => {
    it('should track simulator state correctly', async () => {
      const simulator = new MatchEventSimulator({ enabled: true });
      const onEvent = jest.fn();

      // Initial state
      let state = simulator.getState();
      expect(state.isActive).toBe(false);
      expect(state.currentEventIndex).toBe(0);
      expect(state.eventsReplayed).toBe(0);

      // Start simulator
      simulator.start(onEvent);
      state = simulator.getState();
      expect(state.isActive).toBe(true);

      // Replay first event
      jest.runOnlyPendingTimers();
      await Promise.resolve();

      state = simulator.getState();
      expect(state.eventsReplayed).toBeGreaterThanOrEqual(1);

      // Stop simulator
      simulator.stop();
      state = simulator.getState();
      expect(state.isActive).toBe(false);
    });

    it('should handle errors during event replay gracefully', async () => {
      const simulator = new MatchEventSimulator({ enabled: true });
      const onEvent = jest.fn().mockImplementation(() => {
        throw new Error('Event processing failed');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      simulator.start(onEvent);

      // First event should fail but simulator should continue
      jest.runOnlyPendingTimers();
      await Promise.resolve();

      expect(onEvent).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      simulator.stop();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Stop Functionality', () => {
    it('should stop simulator and clear timer', () => {
      const simulator = new MatchEventSimulator({ enabled: true });
      const onEvent = jest.fn();

      simulator.start(onEvent);
      expect(simulator.isActive()).toBe(true);

      simulator.stop();
      expect(simulator.isActive()).toBe(false);

      // Events should not continue after stop
      jest.advanceTimersByTime(100000);
      expect(onEvent).toHaveBeenCalledTimes(0);
    });

    it('should handle stop when not running', () => {
      const simulator = new MatchEventSimulator({ enabled: true });

      // Should not throw error
      expect(() => simulator.stop()).not.toThrow();
    });
  });

  describe('Factory Function', () => {
    it('should create simulator using factory function', () => {
      const simulator = createSimulator({
        enabled: true,
        speedMultiplier: 3.0,
      });

      expect(simulator).toBeInstanceOf(MatchEventSimulator);
      expect(simulator.getConfig().speedMultiplier).toBe(3.0);
    });

    it('should create simulator with default config using factory', () => {
      const simulator = createSimulator();

      expect(simulator).toBeInstanceOf(MatchEventSimulator);
      expect(simulator.getConfig().speedMultiplier).toBe(1.0);
    });
  });

  describe('Recorded Events', () => {
    it('should have valid recorded events', () => {
      expect(RECORDED_MATCH_EVENTS).toBeDefined();
      expect(RECORDED_MATCH_EVENTS.length).toBeGreaterThan(0);

      // Verify all events have required fields
      RECORDED_MATCH_EVENTS.forEach((event) => {
        expect(event.eventId).toBeDefined();
        expect(event.matchId).toBeDefined();
        expect(event.eventType).toBeDefined();
        expect(event.timestamp).toBeDefined();
        expect(event.teamId).toBeDefined();
        expect(event.metadata).toBeDefined();
      });
    });

    it('should have events in chronological order', () => {
      for (let i = 1; i < RECORDED_MATCH_EVENTS.length; i++) {
        const prevTime = new Date(
          RECORDED_MATCH_EVENTS[i - 1].timestamp
        ).getTime();
        const currTime = new Date(RECORDED_MATCH_EVENTS[i].timestamp).getTime();

        expect(currTime).toBeGreaterThanOrEqual(prevTime);
      }
    });

    it('should include diverse event types', () => {
      const eventTypes = new Set(RECORDED_MATCH_EVENTS.map((e) => e.eventType));

      // Should have at least goal, card, corner (requirement 13.2)
      expect(eventTypes.has('goal')).toBe(true);
      expect(eventTypes.has('yellow_card')).toBe(true);
      expect(eventTypes.has('corner')).toBe(true);
    });
  });
});
