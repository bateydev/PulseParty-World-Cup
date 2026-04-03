/**
 * Unit tests for Room Recap Generation
 */

import { generateRoomRecap } from './roomRecapGeneration';
import * as dynamodb from '../utils/dynamodb';
import { UserScore, Prediction } from '../types';

// Mock the dynamodb utilities
jest.mock('../utils/dynamodb');

const mockQueryItems = dynamodb.queryItems as jest.MockedFunction<
  typeof dynamodb.queryItems
>;
const mockPutItem = dynamodb.putItem as jest.MockedFunction<
  typeof dynamodb.putItem
>;

describe('Room Recap Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'PulsePartyTable';
  });

  describe('generateRoomRecap', () => {
    it('should generate room recap with correct aggregated statistics', async () => {
      const roomId = 'room-456';
      const matchId = 'match-789';

      // Mock user scores (3 users)
      const mockScores: Array<UserScore & { PK: string; SK: string }> = [
        {
          PK: `ROOM#${roomId}`,
          SK: 'SCORE#user1',
          userId: 'user1',
          roomId,
          totalPoints: 150,
          streak: 3,
          clutchMoments: 2,
          correctPredictions: 6,
          totalPredictions: 8,
          rank: 1,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: 'SCORE#user2',
          userId: 'user2',
          roomId,
          totalPoints: 100,
          streak: 2,
          clutchMoments: 1,
          correctPredictions: 4,
          totalPredictions: 6,
          rank: 2,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: 'SCORE#user3',
          userId: 'user3',
          roomId,
          totalPoints: 75,
          streak: 1,
          clutchMoments: 0,
          correctPredictions: 3,
          totalPredictions: 5,
          rank: 3,
        },
      ];

      // Mock predictions from all users
      const mockPredictions: Array<Prediction & { PK: string; SK: string }> = [
        // User 1 predictions
        {
          PK: `ROOM#${roomId}`,
          SK: 'PREDICTION#window1#user1',
          userId: 'user1',
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
          SK: 'PREDICTION#window2#user1',
          userId: 'user1',
          roomId,
          windowId: 'window2',
          predictionType: 'next_corner',
          choice: 'Home Team',
          submittedAt: '2024-01-15T10:15:00Z',
          isCorrect: true,
          pointsAwarded: 25,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: 'PREDICTION#window3#user1',
          userId: 'user1',
          roomId,
          windowId: 'window3',
          predictionType: 'next_card',
          choice: 'Away Team',
          submittedAt: '2024-01-15T10:30:00Z',
          isCorrect: false,
        },
        // User 2 predictions
        {
          PK: `ROOM#${roomId}`,
          SK: 'PREDICTION#window1#user2',
          userId: 'user2',
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
          SK: 'PREDICTION#window2#user2',
          userId: 'user2',
          roomId,
          windowId: 'window2',
          predictionType: 'next_corner',
          choice: 'Home Team',
          submittedAt: '2024-01-15T10:15:00Z',
          isCorrect: true,
          pointsAwarded: 25,
        },
        // User 3 predictions
        {
          PK: `ROOM#${roomId}`,
          SK: 'PREDICTION#window1#user3',
          userId: 'user3',
          roomId,
          windowId: 'window1',
          predictionType: 'next_goal_scorer',
          choice: 'Away Team',
          submittedAt: '2024-01-15T10:00:00Z',
          isCorrect: false,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: 'PREDICTION#window2#user3',
          userId: 'user3',
          roomId,
          windowId: 'window2',
          predictionType: 'next_corner',
          choice: 'Home Team',
          submittedAt: '2024-01-15T10:15:00Z',
          isCorrect: true,
          pointsAwarded: 25,
        },
      ];

      mockQueryItems
        .mockResolvedValueOnce(mockScores) // First call for scores
        .mockResolvedValueOnce(mockPredictions); // Second call for predictions

      const result = await generateRoomRecap(roomId, matchId);

      // Verify the result
      expect(result.roomId).toBe(roomId);
      expect(result.matchId).toBe(matchId);
      expect(result.totalParticipants).toBe(3);

      // Verify top 3 performers (sorted by rank)
      expect(result.topPerformers).toHaveLength(3);
      expect(result.topPerformers[0].userId).toBe('user1');
      expect(result.topPerformers[0].rank).toBe(1);
      expect(result.topPerformers[0].totalPoints).toBe(150);
      expect(result.topPerformers[1].userId).toBe('user2');
      expect(result.topPerformers[1].rank).toBe(2);
      expect(result.topPerformers[2].userId).toBe('user3');
      expect(result.topPerformers[2].rank).toBe(3);

      // Verify most predicted event (Home Team appears 5 times)
      expect(result.mostPredictedEvent).toBe('Home Team');

      // Verify engagement metrics
      expect(result.engagementMetrics.totalPredictions).toBe(7);
      expect(result.engagementMetrics.correctPredictions).toBe(5);
      expect(result.engagementMetrics.totalClutchMoments).toBe(3); // 2 + 1 + 0
      expect(result.engagementMetrics.averageAccuracy).toBe(68); // 13/19 = 68.4% rounded to 68%

      // Verify DynamoDB calls
      expect(mockQueryItems).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `ROOM#${roomId}`,
          ':sk': 'SCORE#',
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
          PK: `ROOM#${roomId}`,
          SK: `RECAP#${matchId}`,
          roomId,
          matchId,
          totalParticipants: 3,
          createdAt: expect.any(String),
        }),
      });
    });

    it('should handle room with only top 2 performers', async () => {
      const roomId = 'room-456';
      const matchId = 'match-789';

      const mockScores: Array<UserScore & { PK: string; SK: string }> = [
        {
          PK: `ROOM#${roomId}`,
          SK: 'SCORE#user1',
          userId: 'user1',
          roomId,
          totalPoints: 100,
          streak: 2,
          clutchMoments: 1,
          correctPredictions: 4,
          totalPredictions: 5,
          rank: 1,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: 'SCORE#user2',
          userId: 'user2',
          roomId,
          totalPoints: 75,
          streak: 1,
          clutchMoments: 0,
          correctPredictions: 3,
          totalPredictions: 4,
          rank: 2,
        },
      ];

      const mockPredictions: Array<Prediction & { PK: string; SK: string }> = [
        {
          PK: `ROOM#${roomId}`,
          SK: 'PREDICTION#window1#user1',
          userId: 'user1',
          roomId,
          windowId: 'window1',
          predictionType: 'next_goal_scorer',
          choice: 'Home Team',
          submittedAt: '2024-01-15T10:00:00Z',
          isCorrect: true,
          pointsAwarded: 25,
        },
      ];

      mockQueryItems
        .mockResolvedValueOnce(mockScores)
        .mockResolvedValueOnce(mockPredictions);

      const result = await generateRoomRecap(roomId, matchId);

      expect(result.totalParticipants).toBe(2);
      expect(result.topPerformers).toHaveLength(2);
    });

    it('should handle room with no predictions', async () => {
      const roomId = 'room-456';
      const matchId = 'match-789';

      const mockScores: Array<UserScore & { PK: string; SK: string }> = [
        {
          PK: `ROOM#${roomId}`,
          SK: 'SCORE#user1',
          userId: 'user1',
          roomId,
          totalPoints: 0,
          streak: 0,
          clutchMoments: 0,
          correctPredictions: 0,
          totalPredictions: 0,
          rank: 1,
        },
      ];

      mockQueryItems
        .mockResolvedValueOnce(mockScores)
        .mockResolvedValueOnce([]); // No predictions

      const result = await generateRoomRecap(roomId, matchId);

      expect(result.totalParticipants).toBe(1);
      expect(result.mostPredictedEvent).toBe('N/A');
      expect(result.engagementMetrics.totalPredictions).toBe(0);
      expect(result.engagementMetrics.correctPredictions).toBe(0);
      expect(result.engagementMetrics.averageAccuracy).toBe(0);
    });

    it('should correctly identify most predicted event with ties', async () => {
      const roomId = 'room-456';
      const matchId = 'match-789';

      const mockScores: Array<UserScore & { PK: string; SK: string }> = [
        {
          PK: `ROOM#${roomId}`,
          SK: 'SCORE#user1',
          userId: 'user1',
          roomId,
          totalPoints: 100,
          streak: 2,
          clutchMoments: 1,
          correctPredictions: 3,
          totalPredictions: 4,
          rank: 1,
        },
      ];

      // Two choices with equal counts
      const mockPredictions: Array<Prediction & { PK: string; SK: string }> = [
        {
          PK: `ROOM#${roomId}`,
          SK: 'PREDICTION#window1#user1',
          userId: 'user1',
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
          SK: 'PREDICTION#window2#user1',
          userId: 'user1',
          roomId,
          windowId: 'window2',
          predictionType: 'next_corner',
          choice: 'Home Team',
          submittedAt: '2024-01-15T10:15:00Z',
          isCorrect: true,
          pointsAwarded: 25,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: 'PREDICTION#window3#user1',
          userId: 'user1',
          roomId,
          windowId: 'window3',
          predictionType: 'next_card',
          choice: 'Away Team',
          submittedAt: '2024-01-15T10:30:00Z',
          isCorrect: false,
        },
      ];

      mockQueryItems
        .mockResolvedValueOnce(mockScores)
        .mockResolvedValueOnce(mockPredictions);

      const result = await generateRoomRecap(roomId, matchId);

      // Home Team appears twice, Away Team once
      expect(result.mostPredictedEvent).toBe('Home Team');
    });

    it('should calculate engagement metrics correctly with mixed results', async () => {
      const roomId = 'room-456';
      const matchId = 'match-789';

      const mockScores: Array<UserScore & { PK: string; SK: string }> = [
        {
          PK: `ROOM#${roomId}`,
          SK: 'SCORE#user1',
          userId: 'user1',
          roomId,
          totalPoints: 50,
          streak: 1,
          clutchMoments: 2,
          correctPredictions: 2,
          totalPredictions: 4,
          rank: 1,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: 'SCORE#user2',
          userId: 'user2',
          roomId,
          totalPoints: 25,
          streak: 0,
          clutchMoments: 1,
          correctPredictions: 1,
          totalPredictions: 3,
          rank: 2,
        },
      ];

      const mockPredictions: Array<Prediction & { PK: string; SK: string }> = [
        {
          PK: `ROOM#${roomId}`,
          SK: 'PREDICTION#window1#user1',
          userId: 'user1',
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
          SK: 'PREDICTION#window2#user1',
          userId: 'user1',
          roomId,
          windowId: 'window2',
          predictionType: 'next_corner',
          choice: 'Away Team',
          submittedAt: '2024-01-15T10:15:00Z',
          isCorrect: false,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: 'PREDICTION#window3#user2',
          userId: 'user2',
          roomId,
          windowId: 'window3',
          predictionType: 'next_card',
          choice: 'Home Team',
          submittedAt: '2024-01-15T10:30:00Z',
          isCorrect: true,
          pointsAwarded: 25,
        },
      ];

      mockQueryItems
        .mockResolvedValueOnce(mockScores)
        .mockResolvedValueOnce(mockPredictions);

      const result = await generateRoomRecap(roomId, matchId);

      expect(result.engagementMetrics.totalPredictions).toBe(3);
      expect(result.engagementMetrics.correctPredictions).toBe(2);
      expect(result.engagementMetrics.totalClutchMoments).toBe(3); // 2 + 1
      expect(result.engagementMetrics.averageAccuracy).toBe(43); // 3/7 = 42.8% rounded to 43%
    });
  });
});
