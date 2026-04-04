/**
 * Unit tests for Recap Lambda Handler
 */

import { handler } from './handler';
import { generateWrappedRecap } from './wrappedRecapGeneration';
import { generateRoomRecap } from './roomRecapGeneration';
import {
  getActiveRoomsByMatch,
  broadcastToRoom,
} from '../roomState/roomManagement';
import { queryItems } from '../utils/dynamodb';
import { EventBridgeEvent } from 'aws-lambda';

// Mock dependencies
jest.mock('./wrappedRecapGeneration');
jest.mock('./roomRecapGeneration');
jest.mock('../roomState/roomManagement');
jest.mock('../utils/dynamodb');

const mockGenerateWrappedRecap = generateWrappedRecap as jest.MockedFunction<
  typeof generateWrappedRecap
>;
const mockGenerateRoomRecap = generateRoomRecap as jest.MockedFunction<
  typeof generateRoomRecap
>;
const mockGetActiveRoomsByMatch = getActiveRoomsByMatch as jest.MockedFunction<
  typeof getActiveRoomsByMatch
>;
const mockBroadcastToRoom = broadcastToRoom as jest.MockedFunction<
  typeof broadcastToRoom
>;
const mockQueryItems = queryItems as jest.MockedFunction<typeof queryItems>;

describe('Recap Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMatchEndEvent = (
    matchId: string
  ): EventBridgeEvent<'MatchEvent', any> => ({
    version: '0',
    id: 'event-123',
    'detail-type': 'MatchEvent',
    source: 'pulseparty.ingestion',
    account: '123456789012',
    time: '2024-01-01T12:00:00Z',
    region: 'us-east-1',
    resources: [],
    detail: {
      eventId: 'evt-123',
      matchId,
      eventType: 'match_end',
      timestamp: '2024-01-01T12:00:00Z',
      metadata: {},
    },
  });

  describe('handler', () => {
    it('should generate and broadcast recaps for all rooms', async () => {
      const matchId = 'match-123';
      const roomId = 'room-456';

      // Mock room discovery
      mockGetActiveRoomsByMatch.mockResolvedValue([
        {
          roomId,
          roomCode: 'ABC123',
          matchId,
          theme: 'Country',
          participants: ['conn-1', 'conn-2'],
          createdAt: '2024-01-01T10:00:00Z',
          ttl: 1234567890,
        },
      ]);

      // Mock room recap generation
      const mockRoomRecap = {
        roomId,
        matchId,
        totalParticipants: 2,
        topPerformers: [],
        mostPredictedEvent: 'Home Team',
        engagementMetrics: {
          totalPredictions: 10,
          correctPredictions: 5,
          totalClutchMoments: 2,
          averageAccuracy: 50,
        },
      };
      mockGenerateRoomRecap.mockResolvedValue(mockRoomRecap);

      // Mock user scores query
      mockQueryItems.mockResolvedValue([
        {
          PK: `ROOM#${roomId}`,
          SK: 'SCORE#user-1',
          userId: 'user-1',
          roomId,
          totalPoints: 100,
          streak: 3,
          clutchMoments: 1,
          correctPredictions: 5,
          totalPredictions: 10,
          rank: 1,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: 'SCORE#user-2',
          userId: 'user-2',
          roomId,
          totalPoints: 75,
          streak: 2,
          clutchMoments: 1,
          correctPredictions: 3,
          totalPredictions: 8,
          rank: 2,
        },
      ]);

      // Mock wrapped recap generation
      mockGenerateWrappedRecap.mockResolvedValue({
        userId: 'user-1',
        roomId,
        matchId,
        totalPoints: 100,
        finalRank: 1,
        accuracy: 50,
        longestStreak: 3,
        clutchMoments: 1,
        shareableUrl: 'https://example.com/recap/1',
      });

      // Mock broadcast
      mockBroadcastToRoom.mockResolvedValue({
        successCount: 2,
        failedConnections: [],
      });

      const event = createMatchEndEvent(matchId);
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        message: 'Recaps generated and broadcast successfully',
        matchId,
        roomsProcessed: 1,
      });

      // Verify room recap was generated
      expect(mockGenerateRoomRecap).toHaveBeenCalledWith(roomId, matchId);

      // Verify wrapped recaps were generated for both users
      expect(mockGenerateWrappedRecap).toHaveBeenCalledTimes(2);
      expect(mockGenerateWrappedRecap).toHaveBeenCalledWith(
        'user-1',
        roomId,
        matchId
      );
      expect(mockGenerateWrappedRecap).toHaveBeenCalledWith(
        'user-2',
        roomId,
        matchId
      );

      // Verify broadcasts were sent (1 room recap + 2 wrapped recaps)
      expect(mockBroadcastToRoom).toHaveBeenCalledTimes(3);
    });

    it('should handle no active rooms gracefully', async () => {
      const matchId = 'match-123';

      mockGetActiveRoomsByMatch.mockResolvedValue([]);

      const event = createMatchEndEvent(matchId);
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        message: 'No active rooms for match',
      });

      expect(mockGenerateRoomRecap).not.toHaveBeenCalled();
      expect(mockGenerateWrappedRecap).not.toHaveBeenCalled();
      expect(mockBroadcastToRoom).not.toHaveBeenCalled();
    });

    it('should continue processing other rooms if one fails', async () => {
      const matchId = 'match-123';
      const room1Id = 'room-1';
      const room2Id = 'room-2';

      mockGetActiveRoomsByMatch.mockResolvedValue([
        {
          roomId: room1Id,
          roomCode: 'ABC123',
          matchId,
          theme: 'Country',
          participants: ['conn-1'],
          createdAt: '2024-01-01T10:00:00Z',
          ttl: 1234567890,
        },
        {
          roomId: room2Id,
          roomCode: 'DEF456',
          matchId,
          theme: 'Club',
          participants: ['conn-2'],
          createdAt: '2024-01-01T10:00:00Z',
          ttl: 1234567890,
        },
      ]);

      // First room fails
      mockGenerateRoomRecap.mockRejectedValueOnce(
        new Error('Room recap failed')
      );

      // Second room succeeds
      mockGenerateRoomRecap.mockResolvedValueOnce({
        roomId: room2Id,
        matchId,
        totalParticipants: 1,
        topPerformers: [],
        mostPredictedEvent: 'Away Team',
        engagementMetrics: {
          totalPredictions: 5,
          correctPredictions: 3,
          totalClutchMoments: 1,
          averageAccuracy: 60,
        },
      });

      mockQueryItems.mockResolvedValue([
        {
          PK: `ROOM#${room2Id}`,
          SK: 'SCORE#user-1',
          userId: 'user-1',
          roomId: room2Id,
          totalPoints: 50,
          streak: 1,
          clutchMoments: 1,
          correctPredictions: 3,
          totalPredictions: 5,
          rank: 1,
        },
      ]);

      mockGenerateWrappedRecap.mockResolvedValue({
        userId: 'user-1',
        roomId: room2Id,
        matchId,
        totalPoints: 50,
        finalRank: 1,
        accuracy: 60,
        longestStreak: 1,
        clutchMoments: 1,
        shareableUrl: 'https://example.com/recap/1',
      });

      mockBroadcastToRoom.mockResolvedValue({
        successCount: 1,
        failedConnections: [],
      });

      const event = createMatchEndEvent(matchId);
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).roomsProcessed).toBe(2);

      // Verify second room was still processed
      expect(mockGenerateRoomRecap).toHaveBeenCalledWith(room2Id, matchId);
    });

    it('should continue processing other users if one wrapped recap fails', async () => {
      const matchId = 'match-123';
      const roomId = 'room-456';

      mockGetActiveRoomsByMatch.mockResolvedValue([
        {
          roomId,
          roomCode: 'ABC123',
          matchId,
          theme: 'Country',
          participants: ['conn-1', 'conn-2'],
          createdAt: '2024-01-01T10:00:00Z',
          ttl: 1234567890,
        },
      ]);

      mockGenerateRoomRecap.mockResolvedValue({
        roomId,
        matchId,
        totalParticipants: 2,
        topPerformers: [],
        mostPredictedEvent: 'Home Team',
        engagementMetrics: {
          totalPredictions: 10,
          correctPredictions: 5,
          totalClutchMoments: 2,
          averageAccuracy: 50,
        },
      });

      mockQueryItems.mockResolvedValue([
        {
          PK: `ROOM#${roomId}`,
          SK: 'SCORE#user-1',
          userId: 'user-1',
          roomId,
          totalPoints: 100,
          streak: 3,
          clutchMoments: 1,
          correctPredictions: 5,
          totalPredictions: 10,
          rank: 1,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: 'SCORE#user-2',
          userId: 'user-2',
          roomId,
          totalPoints: 75,
          streak: 2,
          clutchMoments: 1,
          correctPredictions: 3,
          totalPredictions: 8,
          rank: 2,
        },
      ]);

      // First user fails, second succeeds
      mockGenerateWrappedRecap
        .mockRejectedValueOnce(new Error('Wrapped recap failed'))
        .mockResolvedValueOnce({
          userId: 'user-2',
          roomId,
          matchId,
          totalPoints: 75,
          finalRank: 2,
          accuracy: 37.5,
          longestStreak: 2,
          clutchMoments: 1,
          shareableUrl: 'https://example.com/recap/2',
        });

      mockBroadcastToRoom.mockResolvedValue({
        successCount: 2,
        failedConnections: [],
      });

      const event = createMatchEndEvent(matchId);
      const response = await handler(event);

      expect(response.statusCode).toBe(200);

      // Verify both users were attempted
      expect(mockGenerateWrappedRecap).toHaveBeenCalledTimes(2);

      // Verify broadcasts still happened (room recap + 1 successful wrapped recap)
      expect(mockBroadcastToRoom).toHaveBeenCalledTimes(2);
    });

    it('should return error response if event processing fails', async () => {
      const matchId = 'match-123';

      mockGetActiveRoomsByMatch.mockRejectedValue(new Error('Database error'));

      const event = createMatchEndEvent(matchId);
      const response = await handler(event);

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({
        message: 'Failed to process match end event',
        error: 'Database error',
      });
    });
  });
});
