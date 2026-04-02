import {
  evaluatePredictions,
  closePredictionWindow,
  evaluatePredictionsForWindow,
  determineOutcome,
  broadcastEvaluationResults,
} from './predictionEvaluation';
import { getItem, updateItem, queryItems } from '../utils/dynamodb';
import { broadcastToRoom } from '../roomState/roomManagement';
import { MatchEvent, PredictionWindow, Prediction } from '../types';

// Mock dependencies
jest.mock('../utils/dynamodb');
jest.mock('../roomState/roomManagement');

const mockGetItem = getItem as jest.MockedFunction<typeof getItem>;
const mockUpdateItem = updateItem as jest.MockedFunction<typeof updateItem>;
const mockQueryItems = queryItems as jest.MockedFunction<typeof queryItems>;
const mockBroadcastToRoom = broadcastToRoom as jest.MockedFunction<
  typeof broadcastToRoom
>;

describe('Prediction Evaluation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('determineOutcome', () => {
    it('should determine outcome for next_goal_scorer prediction with home team goal', () => {
      const event: MatchEvent = {
        eventId: 'evt1',
        matchId: 'match1',
        eventType: 'goal',
        timestamp: '2024-01-01T12:00:00Z',
        teamId: 'home',
        playerId: 'player1',
        metadata: {},
      };

      const outcome = determineOutcome(event, 'next_goal_scorer');
      expect(outcome).toBe('Home Team');
    });

    it('should determine outcome for next_goal_scorer prediction with away team goal', () => {
      const event: MatchEvent = {
        eventId: 'evt1',
        matchId: 'match1',
        eventType: 'goal',
        timestamp: '2024-01-01T12:00:00Z',
        teamId: 'away',
        playerId: 'player1',
        metadata: {},
      };

      const outcome = determineOutcome(event, 'next_goal_scorer');
      expect(outcome).toBe('Away Team');
    });

    it('should determine outcome for next_corner prediction', () => {
      const event: MatchEvent = {
        eventId: 'evt1',
        matchId: 'match1',
        eventType: 'corner',
        timestamp: '2024-01-01T12:00:00Z',
        teamId: 'home',
        metadata: {},
      };

      const outcome = determineOutcome(event, 'next_corner');
      expect(outcome).toBe('Home Team');
    });

    it('should determine outcome for next_card prediction with yellow card', () => {
      const event: MatchEvent = {
        eventId: 'evt1',
        matchId: 'match1',
        eventType: 'yellow_card',
        timestamp: '2024-01-01T12:00:00Z',
        teamId: 'away',
        playerId: 'player1',
        metadata: {},
      };

      const outcome = determineOutcome(event, 'next_card');
      expect(outcome).toBe('Away Team');
    });

    it('should determine outcome for next_card prediction with red card', () => {
      const event: MatchEvent = {
        eventId: 'evt1',
        matchId: 'match1',
        eventType: 'red_card',
        timestamp: '2024-01-01T12:00:00Z',
        teamId: 'home',
        playerId: 'player1',
        metadata: {},
      };

      const outcome = determineOutcome(event, 'next_card');
      expect(outcome).toBe('Home Team');
    });

    it('should return null when event does not match prediction type', () => {
      const event: MatchEvent = {
        eventId: 'evt1',
        matchId: 'match1',
        eventType: 'substitution',
        timestamp: '2024-01-01T12:00:00Z',
        teamId: 'home',
        metadata: {},
      };

      const outcome = determineOutcome(event, 'next_goal_scorer');
      expect(outcome).toBeNull();
    });

    it('should return null for match_outcome prediction type', () => {
      const event: MatchEvent = {
        eventId: 'evt1',
        matchId: 'match1',
        eventType: 'goal',
        timestamp: '2024-01-01T12:00:00Z',
        teamId: 'home',
        metadata: {},
      };

      const outcome = determineOutcome(event, 'match_outcome');
      expect(outcome).toBeNull();
    });
  });

  describe('closePredictionWindow', () => {
    it('should close prediction window with outcome', async () => {
      const windowId = 'window1';
      const outcome = 'Home Team';

      const mockWindow: PredictionWindow & { PK: string; SK: string } = {
        PK: `WINDOW#${windowId}`,
        SK: 'METADATA',
        windowId,
        roomId: 'room1',
        matchId: 'match1',
        predictionType: 'next_goal_scorer',
        options: ['Home Team', 'Away Team', 'No Goal in Next 10 Minutes'],
        expiresAt: '2024-01-01T12:01:00Z',
        createdAt: '2024-01-01T12:00:00Z',
      };

      mockUpdateItem.mockResolvedValue(mockWindow);

      const result = await closePredictionWindow(windowId, outcome);

      expect(mockUpdateItem).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        Key: {
          PK: `WINDOW#${windowId}`,
          SK: 'METADATA',
        },
        UpdateExpression: 'SET outcome = :outcome, closedAt = :closedAt',
        ExpressionAttributeValues: {
          ':outcome': outcome,
          ':closedAt': expect.any(String),
        },
        ReturnValues: 'ALL_NEW',
      });

      expect(result).toEqual({
        windowId,
        roomId: 'room1',
        matchId: 'match1',
        predictionType: 'next_goal_scorer',
        options: ['Home Team', 'Away Team', 'No Goal in Next 10 Minutes'],
        expiresAt: '2024-01-01T12:01:00Z',
        createdAt: '2024-01-01T12:00:00Z',
      });
    });

    it('should return null if window not found', async () => {
      mockUpdateItem.mockResolvedValue(null);

      const result = await closePredictionWindow('nonexistent', 'Home Team');

      expect(result).toBeNull();
    });
  });

  describe('evaluatePredictionsForWindow', () => {
    it('should evaluate all predictions and mark correct ones', async () => {
      const windowId = 'window1';
      const roomId = 'room1';
      const outcome = 'Home Team';

      const mockPredictions = [
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#${windowId}#user1`,
          userId: 'user1',
          roomId,
          windowId,
          predictionType: 'next_goal_scorer' as const,
          choice: 'Home Team',
          submittedAt: '2024-01-01T12:00:10Z',
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#${windowId}#user2`,
          userId: 'user2',
          roomId,
          windowId,
          predictionType: 'next_goal_scorer' as const,
          choice: 'Away Team',
          submittedAt: '2024-01-01T12:00:15Z',
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#${windowId}#user3`,
          userId: 'user3',
          roomId,
          windowId,
          predictionType: 'next_goal_scorer' as const,
          choice: 'Home Team',
          submittedAt: '2024-01-01T12:00:20Z',
        },
      ];

      mockQueryItems.mockResolvedValue(mockPredictions);
      mockUpdateItem.mockResolvedValue({});

      const result = await evaluatePredictionsForWindow(
        windowId,
        roomId,
        outcome
      );

      expect(mockQueryItems).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `ROOM#${roomId}`,
          ':sk': `PREDICTION#${windowId}#`,
        },
      });

      expect(mockUpdateItem).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
      expect(result[0].isCorrect).toBe(true);
      expect(result[1].isCorrect).toBe(false);
      expect(result[2].isCorrect).toBe(true);
    });

    it('should handle empty predictions list', async () => {
      mockQueryItems.mockResolvedValue([]);

      const result = await evaluatePredictionsForWindow(
        'window1',
        'room1',
        'Home Team'
      );

      expect(result).toEqual([]);
      expect(mockUpdateItem).not.toHaveBeenCalled();
    });
  });

  describe('broadcastEvaluationResults', () => {
    it('should broadcast evaluation results with correct count', async () => {
      const roomId = 'room1';
      const windowId = 'window1';
      const outcome = 'Home Team';
      const predictions: Prediction[] = [
        {
          userId: 'user1',
          roomId,
          windowId,
          predictionType: 'next_goal_scorer',
          choice: 'Home Team',
          submittedAt: '2024-01-01T12:00:10Z',
          isCorrect: true,
        },
        {
          userId: 'user2',
          roomId,
          windowId,
          predictionType: 'next_goal_scorer',
          choice: 'Away Team',
          submittedAt: '2024-01-01T12:00:15Z',
          isCorrect: false,
        },
      ];

      mockBroadcastToRoom.mockResolvedValue({
        successCount: 2,
        failedConnections: [],
      });

      const result = await broadcastEvaluationResults(
        roomId,
        windowId,
        outcome,
        predictions
      );

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(roomId, {
        type: 'predictionEvaluation',
        data: {
          windowId,
          outcome,
          correctCount: 1,
          totalCount: 2,
        },
      });

      expect(result).toEqual({
        successCount: 2,
        failedConnections: [],
      });
    });

    it('should handle all correct predictions', async () => {
      const predictions: Prediction[] = [
        {
          userId: 'user1',
          roomId: 'room1',
          windowId: 'window1',
          predictionType: 'next_goal_scorer',
          choice: 'Home Team',
          submittedAt: '2024-01-01T12:00:10Z',
          isCorrect: true,
        },
        {
          userId: 'user2',
          roomId: 'room1',
          windowId: 'window1',
          predictionType: 'next_goal_scorer',
          choice: 'Home Team',
          submittedAt: '2024-01-01T12:00:15Z',
          isCorrect: true,
        },
      ];

      mockBroadcastToRoom.mockResolvedValue({
        successCount: 2,
        failedConnections: [],
      });

      await broadcastEvaluationResults(
        'room1',
        'window1',
        'Home Team',
        predictions
      );

      expect(mockBroadcastToRoom).toHaveBeenCalledWith('room1', {
        type: 'predictionEvaluation',
        data: {
          windowId: 'window1',
          outcome: 'Home Team',
          correctCount: 2,
          totalCount: 2,
        },
      });
    });
  });

  describe('evaluatePredictions', () => {
    it('should evaluate predictions when event resolves prediction window', async () => {
      const windowId = 'window1';
      const roomId = 'room1';
      const event: MatchEvent = {
        eventId: 'evt1',
        matchId: 'match1',
        eventType: 'goal',
        timestamp: '2024-01-01T12:01:00Z',
        teamId: 'home',
        playerId: 'player1',
        metadata: {},
      };

      const mockWindow: PredictionWindow & { PK: string; SK: string } = {
        PK: `WINDOW#${windowId}`,
        SK: 'METADATA',
        windowId,
        roomId,
        matchId: 'match1',
        predictionType: 'next_goal_scorer',
        options: ['Home Team', 'Away Team', 'No Goal in Next 10 Minutes'],
        expiresAt: '2024-01-01T12:01:00Z',
        createdAt: '2024-01-01T12:00:00Z',
      };

      const mockPredictions = [
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#${windowId}#user1`,
          userId: 'user1',
          roomId,
          windowId,
          predictionType: 'next_goal_scorer' as const,
          choice: 'Home Team',
          submittedAt: '2024-01-01T12:00:10Z',
        },
      ];

      mockGetItem.mockResolvedValue(mockWindow);
      mockUpdateItem.mockResolvedValue(mockWindow);
      mockQueryItems.mockResolvedValue(mockPredictions);
      mockBroadcastToRoom.mockResolvedValue({
        successCount: 1,
        failedConnections: [],
      });

      const result = await evaluatePredictions(event, windowId, roomId);

      expect(mockGetItem).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        Key: {
          PK: `WINDOW#${windowId}`,
          SK: 'METADATA',
        },
      });

      expect(result).toHaveLength(1);
      expect(result![0].isCorrect).toBe(true);
      expect(mockBroadcastToRoom).toHaveBeenCalled();
    });

    it('should return null when event does not resolve prediction type', async () => {
      const windowId = 'window1';
      const roomId = 'room1';
      const event: MatchEvent = {
        eventId: 'evt1',
        matchId: 'match1',
        eventType: 'substitution',
        timestamp: '2024-01-01T12:01:00Z',
        teamId: 'home',
        metadata: {},
      };

      const mockWindow: PredictionWindow & { PK: string; SK: string } = {
        PK: `WINDOW#${windowId}`,
        SK: 'METADATA',
        windowId,
        roomId,
        matchId: 'match1',
        predictionType: 'next_goal_scorer',
        options: ['Home Team', 'Away Team', 'No Goal in Next 10 Minutes'],
        expiresAt: '2024-01-01T12:01:00Z',
        createdAt: '2024-01-01T12:00:00Z',
      };

      mockGetItem.mockResolvedValue(mockWindow);

      const result = await evaluatePredictions(event, windowId, roomId);

      expect(result).toBeNull();
      expect(mockUpdateItem).not.toHaveBeenCalled();
      expect(mockQueryItems).not.toHaveBeenCalled();
    });

    it('should throw error when prediction window not found', async () => {
      const event: MatchEvent = {
        eventId: 'evt1',
        matchId: 'match1',
        eventType: 'goal',
        timestamp: '2024-01-01T12:01:00Z',
        teamId: 'home',
        metadata: {},
      };

      mockGetItem.mockResolvedValue(null);

      await expect(
        evaluatePredictions(event, 'nonexistent', 'room1')
      ).rejects.toThrow('Prediction window not found: nonexistent');
    });

    it('should handle multiple predictions with mixed results', async () => {
      const windowId = 'window1';
      const roomId = 'room1';
      const event: MatchEvent = {
        eventId: 'evt1',
        matchId: 'match1',
        eventType: 'corner',
        timestamp: '2024-01-01T12:01:00Z',
        teamId: 'away',
        metadata: {},
      };

      const mockWindow: PredictionWindow & { PK: string; SK: string } = {
        PK: `WINDOW#${windowId}`,
        SK: 'METADATA',
        windowId,
        roomId,
        matchId: 'match1',
        predictionType: 'next_corner',
        options: ['Home Team', 'Away Team', 'No Corner in Next 5 Minutes'],
        expiresAt: '2024-01-01T12:01:00Z',
        createdAt: '2024-01-01T12:00:00Z',
      };

      const mockPredictions = [
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#${windowId}#user1`,
          userId: 'user1',
          roomId,
          windowId,
          predictionType: 'next_corner' as const,
          choice: 'Away Team',
          submittedAt: '2024-01-01T12:00:10Z',
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#${windowId}#user2`,
          userId: 'user2',
          roomId,
          windowId,
          predictionType: 'next_corner' as const,
          choice: 'Home Team',
          submittedAt: '2024-01-01T12:00:15Z',
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#${windowId}#user3`,
          userId: 'user3',
          roomId,
          windowId,
          predictionType: 'next_corner' as const,
          choice: 'No Corner in Next 5 Minutes',
          submittedAt: '2024-01-01T12:00:20Z',
        },
      ];

      mockGetItem.mockResolvedValue(mockWindow);
      mockUpdateItem.mockResolvedValue(mockWindow);
      mockQueryItems.mockResolvedValue(mockPredictions);
      mockBroadcastToRoom.mockResolvedValue({
        successCount: 3,
        failedConnections: [],
      });

      const result = await evaluatePredictions(event, windowId, roomId);

      expect(result).toHaveLength(3);
      expect(result![0].isCorrect).toBe(true); // user1 predicted Away Team
      expect(result![1].isCorrect).toBe(false); // user2 predicted Home Team
      expect(result![2].isCorrect).toBe(false); // user3 predicted No Corner
    });
  });
});
