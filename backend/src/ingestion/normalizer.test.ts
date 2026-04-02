import { describe, it, expect } from '@jest/globals';
import {
  normalizeEvent,
  normalizeEvents,
  getValidEvents,
  NormalizedResult,
} from './normalizer';
import { MatchEvent } from '../types';

describe('normalizeEvent', () => {
  describe('valid events', () => {
    it('should normalize a complete valid event', () => {
      const event: Partial<MatchEvent> = {
        eventId: 'event-123',
        matchId: 'match-456',
        eventType: 'goal',
        timestamp: '2024-01-15T10:30:00.000Z',
        teamId: 'team-789',
        playerId: 'player-101',
        metadata: { minute: 45, half: 1 },
      };

      const result = normalizeEvent(event);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.event).toEqual({
        eventId: 'event-123',
        matchId: 'match-456',
        eventType: 'goal',
        timestamp: '2024-01-15T10:30:00.000Z',
        teamId: 'team-789',
        playerId: 'player-101',
        metadata: { minute: 45, half: 1 },
      });
    });

    it('should normalize event without optional playerId', () => {
      const event: Partial<MatchEvent> = {
        eventId: 'event-123',
        matchId: 'match-456',
        eventType: 'corner',
        timestamp: '2024-01-15T10:30:00.000Z',
        teamId: 'team-789',
        metadata: {},
      };

      const result = normalizeEvent(event);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.event?.playerId).toBeUndefined();
    });

    it('should normalize event without metadata', () => {
      const event: Partial<MatchEvent> = {
        eventId: 'event-123',
        matchId: 'match-456',
        eventType: 'possession',
        timestamp: '2024-01-15T10:30:00.000Z',
        teamId: 'team-789',
      };

      const result = normalizeEvent(event);

      expect(result.isValid).toBe(true);
      expect(result.event?.metadata).toEqual({});
    });
  });

  describe('missing required fields', () => {
    it('should reject event missing eventType', () => {
      const event: Partial<MatchEvent> = {
        eventId: 'event-123',
        matchId: 'match-456',
        timestamp: '2024-01-15T10:30:00.000Z',
        teamId: 'team-789',
      };

      const result = normalizeEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.event).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'eventType',
        message: 'Missing required field: event_type',
        value: undefined,
      });
    });

    it('should reject event missing timestamp', () => {
      const event: Partial<MatchEvent> = {
        eventId: 'event-123',
        matchId: 'match-456',
        eventType: 'goal',
        teamId: 'team-789',
      };

      const result = normalizeEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.event).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'timestamp',
        message: 'Missing required field: timestamp',
        value: undefined,
      });
    });

    it('should reject event missing matchId', () => {
      const event: Partial<MatchEvent> = {
        eventId: 'event-123',
        eventType: 'goal',
        timestamp: '2024-01-15T10:30:00.000Z',
        teamId: 'team-789',
      };

      const result = normalizeEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.event).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'matchId',
        message: 'Missing required field: match_id',
        value: undefined,
      });
    });

    it('should reject event missing teamId', () => {
      const event: Partial<MatchEvent> = {
        eventId: 'event-123',
        matchId: 'match-456',
        eventType: 'goal',
        timestamp: '2024-01-15T10:30:00.000Z',
      };

      const result = normalizeEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.event).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'teamId',
        message: 'Missing required field: teamId',
        value: undefined,
      });
    });

    it('should reject event missing eventId', () => {
      const event: Partial<MatchEvent> = {
        matchId: 'match-456',
        eventType: 'goal',
        timestamp: '2024-01-15T10:30:00.000Z',
        teamId: 'team-789',
      };

      const result = normalizeEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.event).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'eventId',
        message: 'Missing required field: eventId',
        value: undefined,
      });
    });

    it('should report multiple missing fields', () => {
      const event: Partial<MatchEvent> = {
        eventId: 'event-123',
      };

      const result = normalizeEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.event).toBeNull();
      expect(result.errors).toHaveLength(4);
      expect(result.errors.map((e) => e.field)).toEqual([
        'eventType',
        'timestamp',
        'matchId',
        'teamId',
      ]);
    });
  });

  describe('invalid field formats', () => {
    it('should reject invalid ISO 8601 timestamp', () => {
      const event: Partial<MatchEvent> = {
        eventId: 'event-123',
        matchId: 'match-456',
        eventType: 'goal',
        timestamp: '2024-01-15 10:30:00', // Invalid format (missing T and Z)
        teamId: 'team-789',
      };

      const result = normalizeEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.event).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'timestamp',
        message: 'Invalid timestamp format: must be ISO 8601',
        value: '2024-01-15 10:30:00',
      });
    });

    it('should reject malformed timestamp', () => {
      const event: Partial<MatchEvent> = {
        eventId: 'event-123',
        matchId: 'match-456',
        eventType: 'goal',
        timestamp: 'not-a-date',
        teamId: 'team-789',
      };

      const result = normalizeEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('timestamp');
    });
  });

  describe('edge cases', () => {
    it('should handle empty metadata object', () => {
      const event: Partial<MatchEvent> = {
        eventId: 'event-123',
        matchId: 'match-456',
        eventType: 'shot',
        timestamp: '2024-01-15T10:30:00.000Z',
        teamId: 'team-789',
        metadata: {},
      };

      const result = normalizeEvent(event);

      expect(result.isValid).toBe(true);
      expect(result.event?.metadata).toEqual({});
    });

    it('should handle all event types', () => {
      const eventTypes: MatchEvent['eventType'][] = [
        'goal',
        'assist',
        'yellow_card',
        'red_card',
        'substitution',
        'corner',
        'shot',
        'possession',
      ];

      eventTypes.forEach((eventType) => {
        const event: Partial<MatchEvent> = {
          eventId: 'event-123',
          matchId: 'match-456',
          eventType,
          timestamp: '2024-01-15T10:30:00.000Z',
          teamId: 'team-789',
        };

        const result = normalizeEvent(event);
        expect(result.isValid).toBe(true);
        expect(result.event?.eventType).toBe(eventType);
      });
    });
  });
});

describe('normalizeEvents', () => {
  it('should normalize multiple valid events', () => {
    const events: Partial<MatchEvent>[] = [
      {
        eventId: 'event-1',
        matchId: 'match-1',
        eventType: 'goal',
        timestamp: '2024-01-15T10:30:00.000Z',
        teamId: 'team-1',
      },
      {
        eventId: 'event-2',
        matchId: 'match-1',
        eventType: 'corner',
        timestamp: '2024-01-15T10:35:00.000Z',
        teamId: 'team-2',
      },
    ];

    const results = normalizeEvents(events);

    expect(results).toHaveLength(2);
    expect(results[0].isValid).toBe(true);
    expect(results[1].isValid).toBe(true);
  });

  it('should handle mix of valid and invalid events', () => {
    const events: Partial<MatchEvent>[] = [
      {
        eventId: 'event-1',
        matchId: 'match-1',
        eventType: 'goal',
        timestamp: '2024-01-15T10:30:00.000Z',
        teamId: 'team-1',
      },
      {
        eventId: 'event-2',
        // Missing matchId
        eventType: 'corner',
        timestamp: '2024-01-15T10:35:00.000Z',
        teamId: 'team-2',
      },
    ];

    const results = normalizeEvents(events);

    expect(results).toHaveLength(2);
    expect(results[0].isValid).toBe(true);
    expect(results[1].isValid).toBe(false);
  });

  it('should handle empty array', () => {
    const results = normalizeEvents([]);
    expect(results).toHaveLength(0);
  });
});

describe('getValidEvents', () => {
  it('should extract only valid events', () => {
    const results: NormalizedResult[] = [
      {
        event: {
          eventId: 'event-1',
          matchId: 'match-1',
          eventType: 'goal',
          timestamp: '2024-01-15T10:30:00.000Z',
          teamId: 'team-1',
          metadata: {},
        },
        errors: [],
        isValid: true,
      },
      {
        event: null,
        errors: [
          { field: 'matchId', message: 'Missing required field: match_id' },
        ],
        isValid: false,
      },
      {
        event: {
          eventId: 'event-3',
          matchId: 'match-1',
          eventType: 'corner',
          timestamp: '2024-01-15T10:35:00.000Z',
          teamId: 'team-2',
          metadata: {},
        },
        errors: [],
        isValid: true,
      },
    ];

    const validEvents = getValidEvents(results);

    expect(validEvents).toHaveLength(2);
    expect(validEvents[0].eventId).toBe('event-1');
    expect(validEvents[1].eventId).toBe('event-3');
  });

  it('should return empty array when no valid events', () => {
    const results: NormalizedResult[] = [
      {
        event: null,
        errors: [
          { field: 'matchId', message: 'Missing required field: match_id' },
        ],
        isValid: false,
      },
    ];

    const validEvents = getValidEvents(results);
    expect(validEvents).toHaveLength(0);
  });

  it('should handle empty results array', () => {
    const validEvents = getValidEvents([]);
    expect(validEvents).toHaveLength(0);
  });
});
