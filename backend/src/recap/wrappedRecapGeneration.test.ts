/**
 * Unit tests for Wrapped Recap Generation
 */

import {generateWrappedRecap, getUserRecaps} from './wrappedRecapGeneration';
import * as dynamodb from '../utils/dynamodb';
import { UserScore, Prediction, WrappedRecap } from '../types';

// Mock the dynamodb utilities
jest.mock('../utils/dynamodb');

const mockGetItem = dynamodb.getItem as jest.MockedFunction<typeof dynamodb.getItem>;
const mockPutItem = dynamodb.putItem as jest.MockedFunction<typeof dynamodb.putItem>;
const mockQueryItems = dynamodb.queryItems as jest.MockedFunction<typeof dynamodb.queryItems>;

describe('Wrapped Recap Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'PulsePartyTable';
    process.env.BASE_SHARE_URL = 'https://pulseparty.app/recap';
  });

  describe('generateWrappedRecap', () => {
    it('should generate wrapped recap with correct statistics', async () => {
      const userId = 'user-123';
      const roomId = 'room-456';
      const matchId = 'match-789';

      // Mock user score
      const mockScore: UserScore & { PK: string; SK: string } = {
        PK: `ROOM#${roomId}`,
        SK: `SCORE#${userId}`,
        userId,
        roomId,
        totalPoints: 150,
        streak: 3,
        clutchMoments: 2,
        correctPredictions: 5,
        totalPredictions: 8,
        rank: 2,
      };

      // Mock predictions
      const mockPredictions: Array<Prediction & { PK: string; SK: string }> = [
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#window1#${userId}`,
          userId,
          roomId,
          windowId: 'window1',
          predictionType: 'next_goal_scorer',
          choice: 'Home Team',
          submittedAt: '2024-01-15T10:00:00Z',
          isCorrect: true,
          pointsAwarded: 25,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#window2#${userId}`,
          userId,
          roomId,
          windowId: 'window2',
          predictionType: 'next_corner',
          choice: 'Away Team',
          submittedAt: '2024-01-15T10:15:00Z',
          isCorrect: true,
          pointsAwarded: 25,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#window3#${userId}`,
          userId,
          roomId,
          windowId: 'window3',
          predictionType: 'next_card',
          choice: 'Home Team',
          submittedAt: '2024-01-15T10:30:00Z',
          isCorrect: false,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#window4#${userId}`,
          userId,
          roomId,
          windowId: 'window4',
          predictionType: 'next_goal_scorer',
          choice: 'Home Team',
          submittedAt: '2024-01-15T10:45:00Z',
          isCorrect: true,
          pointsAwarded: 25,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#window5#${userId}`,
          userId,
          roomId,
          windowId: 'window5',
          predictionType: 'next_corner',
          choice: 'Home Team',
          submittedAt: '2024-01-15T11:00:00Z',
          isCorrect: true,
          pointsAwarded: 25,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#window6#${userId}`,
          userId,
          roomId,
          windowId: 'window6',
          predictionType: 'next_goal_scorer',
          choice: 'Away Team',
          submittedAt: '2024-01-15T11:15:00Z',
          isCorrect: true,
          pointsAwarded: 25,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#window7#${userId}`,
          userId,
          roomId,
          windowId: 'window7',
          predictionType: 'next_card',
          choice: 'Home Team',
          submittedAt: '2024-01-15T11:30:00Z',
          isCorrect: false,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#window8#${userId}`,
          userId,
          roomId,
          windowId: 'window8',
          predictionType: 'next_corner',
          choice: 'Away Team',
          submittedAt: '2024-01-15T11:45:00Z',
          isCorrect: false,
        },
      ];

      // Mock prediction windows for clutch calculation
      mockGetItem
        .mockResolvedValueOnce(mockScore) // First call for score
        .mockResolvedValueOnce({ expiresAt: '2024-01-15T10:00:30Z' }) // window1 - not clutch (30s remaining)
        .mockResolvedValueOnce({ expiresAt: '2024-01-15T10:15:08Z' }) // window2 - clutch (8s remaining)
        .mockResolvedValueOnce({ expiresAt: '2024-01-15T10:45:05Z' }) // window4 - clutch (5s remaining)
        .mockResolvedValueOnce({ expiresAt: '2024-01-15T11:00:20Z' }) // window5 - not clutch (20s remaining)
        .mockResolvedValueOnce({ expiresAt: '2024-01-15T11:15:15Z' }); // window6 - not clutch (15s remaining)

      mockQueryItems.mockResolvedValueOnce(mockPredictions);

      const result = await generateWrappedRecap(userId, roomId, matchId);

      // Verify the result
      expect(result.userId).toBe(userId);
      expect(result.roomId).toBe(roomId);
      expect(result.matchId).toBe(matchId);
      expect(result.totalPoints).toBe(150);
      expect(result.finalRank).toBe(2);
      expect(result.accuracy).toBe(63); // 5/8 = 62.5% rounded to 63%
      expect(result.longestStreak).toBe(3); // Predictions 4, 5, 6 are consecutive correct
      expect(result.clutchMoments).toBe(2); // window2 and window4
      expect(result.shareableUrl).toContain('https://pulseparty.app/recap/');
      expect(result.shareableUrl).toContain(`user=${userId}`);
      expect(result.shareableUrl).toContain(`match=${matchId}`);
      expect(result.shareableUrl).toContain(`room=${roomId}`);

      // Verify DynamoDB calls
      expect(mockGetItem).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        Key: {
          PK: `ROOM#${roomId}`,
          SK: `SCORE#${userId}`,
        },
      });

      expect(mockQueryItems).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `ROOM#${roomId}`,
          ':sk': 'PREDICTION#',
        },
      });

      expect(mockPutItem).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        Item: expect.objectContaining({
          PK: `USER#${userId}`,
          SK: `RECAP#${matchId}#${roomId}`,
          userId,
          roomId,
          matchId,
          totalPoints: 150,
          finalRank: 2,
          accuracy: 63,
          longestStreak: 3,
          clutchMoments: 2,
          createdAt: expect.any(String),
        }),
      });
    });

    it('should handle user with no predictions', async () => {
      const userId = 'user-123';
      const roomId = 'room-456';
      const matchId = 'match-789';

      const mockScore: UserScore & { PK: string; SK: string } = {
        PK: `ROOM#${roomId}`,
        SK: `SCORE#${userId}`,
        userId,
        roomId,
        totalPoints: 0,
        streak: 0,
        clutchMoments: 0,
        correctPredictions: 0,
        totalPredictions: 0,
        rank: 10,
      };

      mockGetItem.mockResolvedValueOnce(mockScore);
      mockQueryItems.mockResolvedValueOnce([]);

      const result = await generateWrappedRecap(userId, roomId, matchId);

      expect(result.totalPoints).toBe(0);
      expect(result.finalRank).toBe(10);
      expect(result.accuracy).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.clutchMoments).toBe(0);
    });

    it('should calculate 100% accuracy for all correct predictions', async () => {
      const userId = 'user-123';
      const roomId = 'room-456';
      const matchId = 'match-789';

      const mockScore: UserScore & { PK: string; SK: string } = {
        PK: `ROOM#${roomId}`,
        SK: `SCORE#${userId}`,
        userId,
        roomId,
        totalPoints: 100,
        streak: 4,
        clutchMoments: 0,
        correctPredictions: 4,
        totalPredictions: 4,
        rank: 1,
      };

      const mockPredictions: Array<Prediction & { PK: string; SK: string }> = [
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#window1#${userId}`,
          userId,
          roomId,
          windowId: 'window1',
          predictionType: 'next_goal_scorer',
          choice: 'Home Team',
          submittedAt: '2024-01-15T10:00:00Z',
          isCorrect: true,
          pointsAwarded: 25,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#window2#${userId}`,
          userId,
          roomId,
          windowId: 'window2',
          predictionType: 'next_corner',
          choice: 'Away Team',
          submittedAt: '2024-01-15T10:15:00Z',
          isCorrect: true,
          pointsAwarded: 25,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#window3#${userId}`,
          userId,
          roomId,
          windowId: 'window3',
          predictionType: 'next_card',
          choice: 'Home Team',
          submittedAt: '2024-01-15T10:30:00Z',
          isCorrect: true,
          pointsAwarded: 25,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#window4#${userId}`,
          userId,
          roomId,
          windowId: 'window4',
          predictionType: 'next_goal_scorer',
          choice: 'Home Team',
          submittedAt: '2024-01-15T10:45:00Z',
          isCorrect: true,
          pointsAwarded: 25,
        },
      ];

      mockGetItem.mockResolvedValueOnce(mockScore);
      mockQueryItems.mockResolvedValueOnce(mockPredictions);

      // Mock windows for clutch calculation (none are clutch)
      mockGetItem
        .mockResolvedValueOnce({ expiresAt: '2024-01-15T10:00:30Z' })
        .mockResolvedValueOnce({ expiresAt: '2024-01-15T10:15:30Z' })
        .mockResolvedValueOnce({ expiresAt: '2024-01-15T10:30:30Z' })
        .mockResolvedValueOnce({ expiresAt: '2024-01-15T10:45:30Z' });

      const result = await generateWrappedRecap(userId, roomId, matchId);

      expect(result.accuracy).toBe(100);
      expect(result.longestStreak).toBe(4);
    });

    it('should throw error if user score not found', async () => {
      const userId = 'user-123';
      const roomId = 'room-456';
      const matchId = 'match-789';

      mockGetItem.mockResolvedValueOnce(null);

      await expect(generateWrappedRecap(userId, roomId, matchId)).rejects.toThrow(
        `Score not found for user ${userId} in room ${roomId}`
      );
    });
  });

  describe('getUserRecaps', () => {
    it('should retrieve and sort user recaps by creation date', async () => {
      const userId = 'user-123';

      const mockRecaps: Array<WrappedRecap & { PK: string; SK: string; createdAt: string }> = [
        {
          PK: `USER#${userId}`,
          SK: 'RECAP#match1#room1',
          userId,
          roomId: 'room1',
          matchId: 'match1',
          totalPoints: 100,
          finalRank: 1,
          accuracy: 80,
          longestStreak: 5,
          clutchMoments: 2,
          shareableUrl: 'https://pulseparty.app/recap/1',
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          PK: `USER#${userId}`,
          SK: 'RECAP#match2#room2',
          userId,
          roomId: 'room2',
          matchId: 'match2',
          totalPoints: 150,
          finalRank: 2,
          accuracy: 90,
          longestStreak: 6,
          clutchMoments: 3,
          shareableUrl: 'https://pulseparty.app/recap/2',
          createdAt: '2024-01-16T10:00:00Z',
        },
        {
          PK: `USER#${userId}`,
          SK: 'RECAP#match3#room3',
          userId,
          roomId: 'room3',
          matchId: 'match3',
          totalPoints: 120,
          finalRank: 3,
          accuracy: 75,
          longestStreak: 4,
          clutchMoments: 1,
          shareableUrl: 'https://pulseparty.app/recap/3',
          createdAt: '2024-01-14T10:00:00Z',
        },
      ];

      mockQueryItems.mockResolvedValueOnce(mockRecaps);

      const result = await getUserRecaps(userId);

      // Should be sorted by creation date (newest first)
      expect(result).toHaveLength(3);
      expect(result[0].matchId).toBe('match2'); // 2024-01-16
      expect(result[1].matchId).toBe('match1'); // 2024-01-15
      expect(result[2].matchId).toBe('match3'); // 2024-01-14

      // Should not include DynamoDB keys
      expect(result[0]).not.toHaveProperty('PK');
      expect(result[0]).not.toHaveProperty('SK');
      expect(result[0]).not.toHaveProperty('createdAt');

      expect(mockQueryItems).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'RECAP#',
        },
      });
    });

    it('should return empty array if user has no recaps', async () => {
      const userId = 'user-123';

      mockQueryItems.mockResolvedValueOnce([]);

      const result = await getUserRecaps(userId);

      expect(result).toEqual([]);
    });
  });
});
