import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { mockClient } from 'aws-sdk-client-mock';
import {
  publishToEventBridge,
  publishEventsToEventBridge,
} from './eventBridgePublisher';
import { MatchEvent } from '../types';

// Mock the EventBridge client
const eventBridgeMock = mockClient(EventBridgeClient);

describe('EventBridge Publisher', () => {
  beforeEach(() => {
    // Reset mocks before each test
    eventBridgeMock.reset();
    jest.clearAllMocks();
  });

  describe('publishToEventBridge', () => {
    const mockEvent: MatchEvent = {
      eventId: 'evt-123',
      matchId: 'match-456',
      eventType: 'goal',
      timestamp: '2024-01-15T10:30:00.000Z',
      teamId: 'team-789',
      playerId: 'player-101',
      metadata: {
        minute: 45,
        score: '1-0',
      },
    };

    it('should successfully publish event to EventBridge on first attempt', async () => {
      // Mock successful EventBridge response
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'eb-event-123' }],
      });

      const result = await publishToEventBridge(mockEvent);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe('eb-event-123');
      expect(result.attempts).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it('should include match ID as routing attribute', async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'eb-event-123' }],
      });

      await publishToEventBridge(mockEvent);

      // Verify the command was called with correct parameters
      const calls = eventBridgeMock.commandCalls(PutEventsCommand);
      expect(calls.length).toBe(1);

      const input = calls[0].args[0].input;
      expect(input.Entries?.[0]?.Resources).toEqual(['match:match-456']);
    });

    it('should include event metadata with priority and timestamp', async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'eb-event-123' }],
      });

      await publishToEventBridge(mockEvent);

      const calls = eventBridgeMock.commandCalls(PutEventsCommand);
      const detail = JSON.parse(
        calls[0].args[0].input.Entries?.[0]?.Detail || '{}'
      );

      expect(detail.metadata.priority).toBe('high'); // goal is high priority
      expect(detail.metadata.publishedAt).toBeDefined();
      expect(detail.metadata.minute).toBe(45); // original metadata preserved
    });

    it('should set high priority for goal events', async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'eb-event-123' }],
      });

      const goalEvent: MatchEvent = { ...mockEvent, eventType: 'goal' };
      await publishToEventBridge(goalEvent);

      const calls = eventBridgeMock.commandCalls(PutEventsCommand);
      const detail = JSON.parse(
        calls[0].args[0].input.Entries?.[0]?.Detail || '{}'
      );
      expect(detail.metadata.priority).toBe('high');
    });

    it('should set high priority for red card events', async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'eb-event-123' }],
      });

      const redCardEvent: MatchEvent = { ...mockEvent, eventType: 'red_card' };
      await publishToEventBridge(redCardEvent);

      const calls = eventBridgeMock.commandCalls(PutEventsCommand);
      const detail = JSON.parse(
        calls[0].args[0].input.Entries?.[0]?.Detail || '{}'
      );
      expect(detail.metadata.priority).toBe('high');
    });

    it('should set medium priority for yellow card events', async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'eb-event-123' }],
      });

      const yellowCardEvent: MatchEvent = {
        ...mockEvent,
        eventType: 'yellow_card',
      };
      await publishToEventBridge(yellowCardEvent);

      const calls = eventBridgeMock.commandCalls(PutEventsCommand);
      const detail = JSON.parse(
        calls[0].args[0].input.Entries?.[0]?.Detail || '{}'
      );
      expect(detail.metadata.priority).toBe('medium');
    });

    it('should set low priority for possession events', async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'eb-event-123' }],
      });

      const possessionEvent: MatchEvent = {
        ...mockEvent,
        eventType: 'possession',
      };
      await publishToEventBridge(possessionEvent);

      const calls = eventBridgeMock.commandCalls(PutEventsCommand);
      const detail = JSON.parse(
        calls[0].args[0].input.Entries?.[0]?.Detail || '{}'
      );
      expect(detail.metadata.priority).toBe('low');
    });

    it('should retry with exponential backoff on failure', async () => {
      // Mock first two attempts to fail, third to succeed
      eventBridgeMock
        .on(PutEventsCommand)
        .rejectsOnce(new Error('Network error'))
        .rejectsOnce(new Error('Network error'))
        .resolvesOnce({
          FailedEntryCount: 0,
          Entries: [{ EventId: 'eb-event-123' }],
        });

      const startTime = Date.now();
      const result = await publishToEventBridge(mockEvent);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      // Should have backoff delays: 100ms + 200ms = 300ms minimum
      expect(duration).toBeGreaterThanOrEqual(300);
    });

    it('should return error after 3 failed attempts', async () => {
      // Mock all attempts to fail
      eventBridgeMock
        .on(PutEventsCommand)
        .rejects(new Error('Persistent network error'));

      const result = await publishToEventBridge(mockEvent);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Persistent network error');
      expect(result.eventId).toBeUndefined();
    });

    it('should handle EventBridge FailedEntryCount response', async () => {
      // Mock EventBridge returning a failed entry
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 1,
        Entries: [
          {
            ErrorCode: 'InternalException',
            ErrorMessage: 'Internal service error',
          },
        ],
      });

      const result = await publishToEventBridge(mockEvent);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3); // Should retry all 3 times
      expect(result.error?.message).toContain('InternalException');
    });

    it('should use correct EventBridge source and detail type', async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'eb-event-123' }],
      });

      await publishToEventBridge(mockEvent);

      const calls = eventBridgeMock.commandCalls(PutEventsCommand);
      const entry = calls[0].args[0].input.Entries?.[0];

      expect(entry?.Source).toBe('pulseparty.ingestion');
      expect(entry?.DetailType).toBe('MatchEvent');
    });

    it('should preserve all original event fields in detail', async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'eb-event-123' }],
      });

      await publishToEventBridge(mockEvent);

      const calls = eventBridgeMock.commandCalls(PutEventsCommand);
      const detail = JSON.parse(
        calls[0].args[0].input.Entries?.[0]?.Detail || '{}'
      );

      expect(detail.eventId).toBe('evt-123');
      expect(detail.matchId).toBe('match-456');
      expect(detail.eventType).toBe('goal');
      expect(detail.timestamp).toBe('2024-01-15T10:30:00.000Z');
      expect(detail.teamId).toBe('team-789');
      expect(detail.playerId).toBe('player-101');
    });
  });

  describe('publishEventsToEventBridge', () => {
    it('should publish multiple events successfully', async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'eb-event-123' }],
      });

      const events: MatchEvent[] = [
        {
          eventId: 'evt-1',
          matchId: 'match-1',
          eventType: 'goal',
          timestamp: '2024-01-15T10:30:00.000Z',
          teamId: 'team-1',
          metadata: {},
        },
        {
          eventId: 'evt-2',
          matchId: 'match-1',
          eventType: 'corner',
          timestamp: '2024-01-15T10:31:00.000Z',
          teamId: 'team-2',
          metadata: {},
        },
      ];

      const results = await publishEventsToEventBridge(events);

      expect(results.length).toBe(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle batch processing for more than 10 events', async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'eb-event-123' }],
      });

      // Create 15 events (should be processed in 2 batches)
      const events: MatchEvent[] = Array.from({ length: 15 }, (_, i) => ({
        eventId: `evt-${i}`,
        matchId: 'match-1',
        eventType: 'shot' as const,
        timestamp: '2024-01-15T10:30:00.000Z',
        teamId: 'team-1',
        metadata: {},
      }));

      const results = await publishEventsToEventBridge(events);

      expect(results.length).toBe(15);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should return mixed results when some events fail', async () => {
      // Mock alternating success and failure
      eventBridgeMock
        .on(PutEventsCommand)
        .resolvesOnce({
          FailedEntryCount: 0,
          Entries: [{ EventId: 'eb-event-1' }],
        })
        .rejects(new Error('Network error'));

      const events: MatchEvent[] = [
        {
          eventId: 'evt-1',
          matchId: 'match-1',
          eventType: 'goal',
          timestamp: '2024-01-15T10:30:00.000Z',
          teamId: 'team-1',
          metadata: {},
        },
        {
          eventId: 'evt-2',
          matchId: 'match-1',
          eventType: 'corner',
          timestamp: '2024-01-15T10:31:00.000Z',
          teamId: 'team-2',
          metadata: {},
        },
      ];

      const results = await publishEventsToEventBridge(events);

      expect(results.length).toBe(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('should handle empty array', async () => {
      const results = await publishEventsToEventBridge([]);
      expect(results.length).toBe(0);
    });
  });
});
