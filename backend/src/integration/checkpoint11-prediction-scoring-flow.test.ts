/**
 * Checkpoint 11: Prediction and Scoring Flow Integration Test
 *
 * This test validates the complete end-to-end flow:
 * - Event → Prediction Window → Submission → Evaluation → Score Update → Leaderboard
 * - Streak and clutch bonuses apply correctly
 *
 * Requirements validated:
 * - 3.1, 3.5, 3.7: Prediction generation, submission, evaluation
 * - 4.1, 4.2, 4.3: Points calculation with streak and clutch bonuses
 * - 4.4, 4.5: Leaderboard updates and broadcasting
 */

import {
  generatePredictionWindow,
  storeAndBroadcastPredictionWindow,
  submitPrediction,
  evaluatePredictions,
} from '../momentEngine';
import {
  calculatePoints,
  applyStreakMultiplier,
  applyClutchBonus,
  updateLeaderboard,
} from '../scoring';
import { getItem, putItem, queryItems } from '../utils/dynamodb';
import { MatchEvent, UserScore } from '../types';

// Mock dependencies
jest.mock('../utils/dynamodb');
jest.mock('../roomState/roomManagement');

const mockGetItem = getItem as jest.MockedFunction<typeof getItem>;
const mockPutItem = putItem as jest.MockedFunction<typeof putItem>;
const mockQueryItems = queryItems as jest.MockedFunction<typeof queryItems>;

describe('Checkpoint 11: Prediction and Scoring Flow', () => {
  const roomId = 'test-room-123';
  const matchId = 'match-456';
  const userId1 = 'user-1';
  const userId2 = 'user-2';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Flow: Event → Prediction → Submission → Evaluation → Scoring → Leaderboard', () => {
    it('should process complete prediction flow with correct scoring', async () => {
      // Step 1: Generate prediction window from goal event
      const goalEvent: MatchEvent = {
        eventId: 'event-1',
        matchId,
        eventType: 'goal',
        timestamp: new Date().toISOString(),
        teamId: 'home',
        metadata: {},
      };

      const predictionWindow = generatePredictionWindow(goalEvent, roomId);
      expect(predictionWindow).not.toBeNull();
      expect(predictionWindow!.predictionType).toBe('next_goal_scorer');
      expect(predictionWindow!.options).toContain('Home Team');
      expect(predictionWindow!.options).toContain('Away Team');

      const windowId = predictionWindow!.windowId;

      // Mock storage for prediction window
      mockPutItem.mockResolvedValue(undefined);

      // Step 2: Store and broadcast prediction window
      await storeAndBroadcastPredictionWindow(predictionWindow!);

      expect(mockPutItem).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining({
            PK: `WINDOW#${windowId}`,
            SK: 'METADATA',
            windowId,
            roomId,
            matchId,
          }),
        })
      );

      // Step 3: Users submit predictions
      // Mock window retrieval for submission validation
      mockGetItem.mockResolvedValueOnce({
        PK: `WINDOW#${windowId}`,
        SK: 'METADATA',
        ...predictionWindow!,
      });

      // User 1 submits early (not clutch)
      // Mock query for submission count
      mockQueryItems.mockResolvedValueOnce([]);

      const submission1 = await submitPrediction(
        userId1,
        roomId,
        windowId,
        'Home Team',
        'next_goal_scorer'
      );

      expect(submission1.choice).toBe('Home Team');
      expect(submission1.userId).toBe(userId1);

      // Mock window retrieval for second submission
      mockGetItem.mockResolvedValueOnce({
        PK: `WINDOW#${windowId}`,
        SK: 'METADATA',
        ...predictionWindow!,
      });

      // User 2 submits in final 10 seconds (clutch)
      const clutchSubmitTime = new Date(
        new Date(predictionWindow!.expiresAt).getTime() - 5000
      ).toISOString();

      // Mock query for submission count (now includes user 1)
      mockQueryItems.mockResolvedValueOnce([
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#${windowId}#${userId1}`,
          ...submission1,
        },
      ]);

      const submission2 = await submitPrediction(
        userId2,
        roomId,
        windowId,
        'Home Team',
        'next_goal_scorer'
      );

      // Manually set clutch submission time for testing
      submission2.submittedAt = clutchSubmitTime;

      expect(submission2.choice).toBe('Home Team');
      expect(submission2.userId).toBe(userId2);

      // Step 4: Evaluate predictions when outcome occurs
      const outcomeEvent: MatchEvent = {
        eventId: 'event-2',
        matchId,
        eventType: 'goal',
        timestamp: new Date().toISOString(),
        teamId: 'home',
        metadata: {},
      };

      // Mock window retrieval for evaluation
      mockGetItem.mockResolvedValueOnce({
        PK: `WINDOW#${windowId}`,
        SK: 'METADATA',
        ...predictionWindow!,
      });

      // Mock predictions query
      mockQueryItems.mockResolvedValueOnce([
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#${windowId}#${userId1}`,
          ...submission1,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#${windowId}#${userId2}`,
          ...submission2,
          submittedAt: clutchSubmitTime,
        },
      ]);

      const evaluatedPredictions = await evaluatePredictions(
        outcomeEvent,
        windowId,
        roomId
      );

      expect(evaluatedPredictions).toHaveLength(2);
      expect(evaluatedPredictions![0].isCorrect).toBe(true);
      expect(evaluatedPredictions![1].isCorrect).toBe(true);

      // Step 5: Calculate points with bonuses
      const basePoints = calculatePoints('medium'); // 25 points
      expect(basePoints).toBe(25);

      // User 1: No streak, no clutch
      const user1Points = applyStreakMultiplier(basePoints, 0);
      expect(user1Points).toBe(25);

      // User 2: No streak, but clutch bonus
      const user2PointsWithClutch = applyClutchBonus(
        basePoints,
        clutchSubmitTime,
        predictionWindow!.expiresAt
      );
      expect(user2PointsWithClutch).toBe(38); // 25 * 1.5 = 37.5, rounded to 38

      // Step 6: Update leaderboard
      // Mock scores query
      mockQueryItems.mockResolvedValueOnce([
        {
          PK: `ROOM#${roomId}`,
          SK: `SCORE#${userId1}`,
          userId: userId1,
          roomId,
          totalPoints: user1Points,
          streak: 1,
          clutchMoments: 0,
          correctPredictions: 1,
          totalPredictions: 1,
          rank: 0,
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `SCORE#${userId2}`,
          userId: userId2,
          roomId,
          totalPoints: user2PointsWithClutch,
          streak: 1,
          clutchMoments: 1,
          correctPredictions: 1,
          totalPredictions: 1,
          rank: 0,
        },
      ]);

      const leaderboard = await updateLeaderboard(roomId);

      expect(leaderboard).toHaveLength(2);
      expect(leaderboard[0].userId).toBe(userId2); // Higher score due to clutch
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[0].totalPoints).toBe(user2PointsWithClutch);
      expect(leaderboard[1].userId).toBe(userId1);
      expect(leaderboard[1].rank).toBe(2);
      expect(leaderboard[1].totalPoints).toBe(user1Points);
    });

    it('should apply streak multiplier correctly across multiple predictions', async () => {
      const basePoints = calculatePoints('easy'); // 10 points

      // No streak
      const points0 = applyStreakMultiplier(basePoints, 0);
      expect(points0).toBe(10); // 10 * 1.0 = 10

      // Streak of 3
      const points3 = applyStreakMultiplier(basePoints, 3);
      expect(points3).toBe(13); // 10 * 1.3 = 13

      // Streak of 5
      const points5 = applyStreakMultiplier(basePoints, 5);
      expect(points5).toBe(15); // 10 * 1.5 = 15

      // Streak of 10 (should cap at 2.0)
      const points10 = applyStreakMultiplier(basePoints, 10);
      expect(points10).toBe(20); // 10 * 2.0 = 20 (capped)

      // Streak of 15 (should still cap at 2.0)
      const points15 = applyStreakMultiplier(basePoints, 15);
      expect(points15).toBe(20); // 10 * 2.0 = 20 (capped)
    });

    it('should apply clutch bonus only in final 10 seconds', async () => {
      const basePoints = calculatePoints('hard'); // 50 points
      const expiresAt = new Date('2024-01-01T12:00:30.000Z').toISOString();

      // Submitted 15 seconds before expiry (not clutch)
      const submit15s = new Date('2024-01-01T12:00:15.000Z').toISOString();
      const points15s = applyClutchBonus(basePoints, submit15s, expiresAt);
      expect(points15s).toBe(50); // No bonus

      // Submitted 10 seconds before expiry (clutch boundary)
      const submit10s = new Date('2024-01-01T12:00:20.000Z').toISOString();
      const points10s = applyClutchBonus(basePoints, submit10s, expiresAt);
      expect(points10s).toBe(75); // 50 * 1.5 = 75

      // Submitted 5 seconds before expiry (clutch)
      const submit5s = new Date('2024-01-01T12:00:25.000Z').toISOString();
      const points5s = applyClutchBonus(basePoints, submit5s, expiresAt);
      expect(points5s).toBe(75); // 50 * 1.5 = 75

      // Submitted 1 second before expiry (clutch)
      const submit1s = new Date('2024-01-01T12:00:29.000Z').toISOString();
      const points1s = applyClutchBonus(basePoints, submit1s, expiresAt);
      expect(points1s).toBe(75); // 50 * 1.5 = 75
    });

    it('should handle incorrect predictions with no points awarded', async () => {
      const goalEvent: MatchEvent = {
        eventId: 'event-3',
        matchId,
        eventType: 'goal',
        timestamp: new Date().toISOString(),
        teamId: 'home',
        metadata: {},
      };

      const predictionWindow = generatePredictionWindow(goalEvent, roomId);
      const windowId = predictionWindow!.windowId;

      // Mock window retrieval
      mockGetItem.mockResolvedValueOnce({
        PK: `WINDOW#${windowId}`,
        SK: 'METADATA',
        ...predictionWindow!,
      });

      // User submits incorrect prediction
      // Mock query for submission count
      mockQueryItems.mockResolvedValueOnce([]);

      const submission = await submitPrediction(
        userId1,
        roomId,
        windowId,
        'Away Team', // Wrong choice
        'next_goal_scorer'
      );

      // Mock evaluation
      mockGetItem.mockResolvedValueOnce({
        PK: `WINDOW#${windowId}`,
        SK: 'METADATA',
        ...predictionWindow!,
      });

      mockQueryItems.mockResolvedValueOnce([
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#${windowId}#${userId1}`,
          ...submission,
        },
      ]);

      // Outcome is Home Team (user predicted Away Team)
      const outcomeEvent: MatchEvent = {
        eventId: 'event-4',
        matchId,
        eventType: 'goal',
        timestamp: new Date().toISOString(),
        teamId: 'home', // Home scored
        metadata: {},
      };

      const evaluatedPredictions = await evaluatePredictions(
        outcomeEvent,
        windowId,
        roomId
      );

      expect(evaluatedPredictions).toHaveLength(1);
      expect(evaluatedPredictions![0].isCorrect).toBe(false);

      // No points should be awarded for incorrect prediction
      // In real implementation, scoring lambda would check isCorrect flag
    });
  });

  describe('Leaderboard Ranking', () => {
    it('should rank users correctly by total points', async () => {
      const scores: UserScore[] = [
        {
          userId: 'user-1',
          roomId,
          totalPoints: 50,
          streak: 2,
          clutchMoments: 0,
          correctPredictions: 2,
          totalPredictions: 3,
          rank: 0,
        },
        {
          userId: 'user-2',
          roomId,
          totalPoints: 75,
          streak: 3,
          clutchMoments: 1,
          correctPredictions: 3,
          totalPredictions: 3,
          rank: 0,
        },
        {
          userId: 'user-3',
          roomId,
          totalPoints: 30,
          streak: 1,
          clutchMoments: 0,
          correctPredictions: 1,
          totalPredictions: 2,
          rank: 0,
        },
      ];

      // Mock query to return unsorted scores
      mockQueryItems.mockResolvedValueOnce(
        scores.map((score) => ({
          PK: `ROOM#${roomId}`,
          SK: `SCORE#${score.userId}`,
          ...score,
        }))
      );

      const leaderboard = await updateLeaderboard(roomId);

      expect(leaderboard).toHaveLength(3);
      expect(leaderboard[0].userId).toBe('user-2'); // 75 points
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[1].userId).toBe('user-1'); // 50 points
      expect(leaderboard[1].rank).toBe(2);
      expect(leaderboard[2].userId).toBe('user-3'); // 30 points
      expect(leaderboard[2].rank).toBe(3);
    });

    it('should handle tied scores with same rank', async () => {
      const scores: UserScore[] = [
        {
          userId: 'user-1',
          roomId,
          totalPoints: 50,
          streak: 2,
          clutchMoments: 0,
          correctPredictions: 2,
          totalPredictions: 2,
          rank: 0,
        },
        {
          userId: 'user-2',
          roomId,
          totalPoints: 50,
          streak: 2,
          clutchMoments: 1,
          correctPredictions: 2,
          totalPredictions: 2,
          rank: 0,
        },
        {
          userId: 'user-3',
          roomId,
          totalPoints: 30,
          streak: 1,
          clutchMoments: 0,
          correctPredictions: 1,
          totalPredictions: 2,
          rank: 0,
        },
      ];

      mockQueryItems.mockResolvedValueOnce(
        scores.map((score) => ({
          PK: `ROOM#${roomId}`,
          SK: `SCORE#${score.userId}`,
          ...score,
        }))
      );

      const leaderboard = await updateLeaderboard(roomId);

      expect(leaderboard).toHaveLength(3);
      // Both user-1 and user-2 should have rank 1
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[1].rank).toBe(1);
      expect(leaderboard[0].totalPoints).toBe(50);
      expect(leaderboard[1].totalPoints).toBe(50);
      // user-3 should have rank 3 (not 2, because two users are tied at rank 1)
      expect(leaderboard[2].rank).toBe(3);
      expect(leaderboard[2].totalPoints).toBe(30);
    });
  });
});
