import {
  generatePredictionWindow,
  generateTimeBasedPredictionWindow,
  shouldTriggerPrediction,
  getRemainingTime,
  isWindowExpired,
  TRIGGER_EVENT_TYPES,
  TIME_BASED_INTERVAL_MS,
} from './predictionWindowGenerator';
import { MatchEvent, PredictionWindow } from '../types';

describe('Prediction Window Generator', () => {
  const mockRoomId = 'room-123';
  const mockMatchId = 'match-456';

  describe('generatePredictionWindow', () => {
    it('should generate prediction window for goal event', () => {
      const goalEvent: MatchEvent = {
        eventId: 'event-1',
        matchId: mockMatchId,
        eventType: 'goal',
        timestamp: new Date().toISOString(),
        teamId: 'team-1',
        playerId: 'player-1',
        metadata: {},
      };

      const window = generatePredictionWindow(goalEvent, mockRoomId);

      expect(window).not.toBeNull();
      expect(window!.roomId).toBe(mockRoomId);
      expect(window!.matchId).toBe(mockMatchId);
      expect(window!.predictionType).toBe('next_goal_scorer');
      expect(window!.options).toContain('Home Team');
      expect(window!.options).toContain('Away Team');
      expect(window!.windowId).toBeDefined();
      expect(window!.createdAt).toBeDefined();
      expect(window!.expiresAt).toBeDefined();
    });

    it('should generate prediction window for corner event', () => {
      const cornerEvent: MatchEvent = {
        eventId: 'event-2',
        matchId: mockMatchId,
        eventType: 'corner',
        timestamp: new Date().toISOString(),
        teamId: 'team-1',
        metadata: {},
      };

      const window = generatePredictionWindow(cornerEvent, mockRoomId);

      expect(window).not.toBeNull();
      expect(window!.predictionType).toBe('next_corner');
      expect(window!.options).toContain('Home Team');
      expect(window!.options).toContain('Away Team');
    });

    it('should return null for non-trigger event types', () => {
      const yellowCardEvent: MatchEvent = {
        eventId: 'event-3',
        matchId: mockMatchId,
        eventType: 'yellow_card',
        timestamp: new Date().toISOString(),
        teamId: 'team-1',
        playerId: 'player-1',
        metadata: {},
      };

      const window = generatePredictionWindow(yellowCardEvent, mockRoomId);

      expect(window).toBeNull();
    });

    it('should return null for substitution event', () => {
      const subEvent: MatchEvent = {
        eventId: 'event-4',
        matchId: mockMatchId,
        eventType: 'substitution',
        timestamp: new Date().toISOString(),
        teamId: 'team-1',
        metadata: {},
      };

      const window = generatePredictionWindow(subEvent, mockRoomId);

      expect(window).toBeNull();
    });

    it('should set expiration time in the future', () => {
      const goalEvent: MatchEvent = {
        eventId: 'event-5',
        matchId: mockMatchId,
        eventType: 'goal',
        timestamp: new Date().toISOString(),
        teamId: 'team-1',
        metadata: {},
      };

      const window = generatePredictionWindow(goalEvent, mockRoomId);

      expect(window).not.toBeNull();

      const now = new Date();
      const expiresAt = new Date(window!.expiresAt);

      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should generate unique window IDs for multiple events', () => {
      const event1: MatchEvent = {
        eventId: 'event-6',
        matchId: mockMatchId,
        eventType: 'goal',
        timestamp: new Date().toISOString(),
        teamId: 'team-1',
        metadata: {},
      };

      const event2: MatchEvent = {
        eventId: 'event-7',
        matchId: mockMatchId,
        eventType: 'corner',
        timestamp: new Date().toISOString(),
        teamId: 'team-2',
        metadata: {},
      };

      const window1 = generatePredictionWindow(event1, mockRoomId);
      const window2 = generatePredictionWindow(event2, mockRoomId);

      expect(window1).not.toBeNull();
      expect(window2).not.toBeNull();
      expect(window1!.windowId).not.toBe(window2!.windowId);
    });
  });

  describe('generateTimeBasedPredictionWindow', () => {
    it('should generate time-based prediction window with match_outcome type', () => {
      const window = generateTimeBasedPredictionWindow(mockMatchId, mockRoomId);

      expect(window).toBeDefined();
      expect(window.roomId).toBe(mockRoomId);
      expect(window.matchId).toBe(mockMatchId);
      expect(window.predictionType).toBe('match_outcome');
      expect(window.options).toContain('Home Win');
      expect(window.options).toContain('Draw');
      expect(window.options).toContain('Away Win');
      expect(window.windowId).toBeDefined();
      expect(window.createdAt).toBeDefined();
      expect(window.expiresAt).toBeDefined();
    });

    it('should set expiration time in the future', () => {
      const window = generateTimeBasedPredictionWindow(mockMatchId, mockRoomId);

      const now = new Date();
      const expiresAt = new Date(window.expiresAt);

      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should generate unique window IDs for multiple calls', () => {
      const window1 = generateTimeBasedPredictionWindow(
        mockMatchId,
        mockRoomId
      );
      const window2 = generateTimeBasedPredictionWindow(
        mockMatchId,
        mockRoomId
      );

      expect(window1.windowId).not.toBe(window2.windowId);
    });
  });

  describe('shouldTriggerPrediction', () => {
    it('should return true for goal events', () => {
      expect(shouldTriggerPrediction('goal')).toBe(true);
    });

    it('should return true for corner events', () => {
      expect(shouldTriggerPrediction('corner')).toBe(true);
    });

    it('should return false for yellow_card events', () => {
      expect(shouldTriggerPrediction('yellow_card')).toBe(false);
    });

    it('should return false for red_card events', () => {
      expect(shouldTriggerPrediction('red_card')).toBe(false);
    });

    it('should return false for substitution events', () => {
      expect(shouldTriggerPrediction('substitution')).toBe(false);
    });

    it('should return false for shot events', () => {
      expect(shouldTriggerPrediction('shot')).toBe(false);
    });

    it('should return false for possession events', () => {
      expect(shouldTriggerPrediction('possession')).toBe(false);
    });
  });

  describe('getRemainingTime', () => {
    it('should return positive remaining time for active window', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30000); // 30 seconds from now

      const window: PredictionWindow = {
        windowId: 'window-1',
        roomId: mockRoomId,
        matchId: mockMatchId,
        predictionType: 'next_goal_scorer',
        options: ['Home Team', 'Away Team'],
        expiresAt: expiresAt.toISOString(),
        createdAt: now.toISOString(),
      };

      const remaining = getRemainingTime(window);

      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(30);
    });

    it('should return 0 for expired window', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() - 5000); // 5 seconds ago

      const window: PredictionWindow = {
        windowId: 'window-2',
        roomId: mockRoomId,
        matchId: mockMatchId,
        predictionType: 'next_goal_scorer',
        options: ['Home Team', 'Away Team'],
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date(now.getTime() - 35000).toISOString(),
      };

      const remaining = getRemainingTime(window);

      expect(remaining).toBe(0);
    });

    it('should return 0 for window expiring exactly now', () => {
      const now = new Date();

      const window: PredictionWindow = {
        windowId: 'window-3',
        roomId: mockRoomId,
        matchId: mockMatchId,
        predictionType: 'next_goal_scorer',
        options: ['Home Team', 'Away Team'],
        expiresAt: now.toISOString(),
        createdAt: new Date(now.getTime() - 30000).toISOString(),
      };

      const remaining = getRemainingTime(window);

      expect(remaining).toBe(0);
    });
  });

  describe('isWindowExpired', () => {
    it('should return false for active window', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30000); // 30 seconds from now

      const window: PredictionWindow = {
        windowId: 'window-4',
        roomId: mockRoomId,
        matchId: mockMatchId,
        predictionType: 'next_goal_scorer',
        options: ['Home Team', 'Away Team'],
        expiresAt: expiresAt.toISOString(),
        createdAt: now.toISOString(),
      };

      expect(isWindowExpired(window)).toBe(false);
    });

    it('should return true for expired window', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() - 5000); // 5 seconds ago

      const window: PredictionWindow = {
        windowId: 'window-5',
        roomId: mockRoomId,
        matchId: mockMatchId,
        predictionType: 'next_goal_scorer',
        options: ['Home Team', 'Away Team'],
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date(now.getTime() - 35000).toISOString(),
      };

      expect(isWindowExpired(window)).toBe(true);
    });
  });

  describe('Constants', () => {
    it('should define correct trigger event types', () => {
      expect(TRIGGER_EVENT_TYPES).toContain('goal');
      expect(TRIGGER_EVENT_TYPES).toContain('corner');
      expect(TRIGGER_EVENT_TYPES).toHaveLength(2);
    });

    it('should define 10-minute interval for time-based predictions', () => {
      expect(TIME_BASED_INTERVAL_MS).toBe(10 * 60 * 1000);
    });
  });
});
