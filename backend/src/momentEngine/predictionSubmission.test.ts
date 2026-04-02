import {
  submitPrediction,
  getSubmissionCount,
  broadcastSubmissionCount,
  hasUserSubmitted,
  getPredictionsForWindow,
} from './predictionSubmission';
import * as dynamodb from '../utils/dynamodb';
import * as roomManagement from '../roomState/roomManagement';
import { PredictionWindow, Prediction } from '../types';

// Mock dependencies
jest.mock('../utils/dynamodb');
jest.mock('../roomState/roomManagement');

const mockGetItem = dynamodb.getItem as jest.MockedFunction<
  typeof dynamodb.getItem
>;
const mockPutItem = dynamodb.putItem as jest.MockedFunction<
  typeof dynamodb.putItem
>;
const mockQueryItems = dynamodb.queryItems as jest.MockedFunction<
  typeof dynamodb.queryItems
>;
const mockBroadcastToRoom =
  roomManagement.broadcastToRoom as jest.MockedFunction<
    typeof roomManagement.broadcastToRoom
  >;

describe('Prediction Submission Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitPrediction', () => {
    const userId = 'user-123';
    const roomId = 'room-456';
    const windowId = 'window-789';
    const choice = 'Home Team';
    const predictionType = 'next_goal_scorer';

    const mockWindow: PredictionWindow & { PK: string; SK: string } = {
      PK: `WINDOW#${windowId}`,
      SK: 'METADATA',
      windowId,
      roomId,
      matchId: 'match-123',
      predictionType: 'next_goal_scorer',
      options: ['Home Team', 'Away Team', 'No Goal in Next 10 Minutes'],
      expiresAt: new Date(Date.now() + 30000).toISOString(), // 30 seconds from now
      createdAt: new Date().toISOString(),
    };

    it('should successfully submit a prediction before window expiration', async () => {
      mockGetItem.mockResolvedValue(mockWindow);
      mockPutItem.mockResolvedValue();
      mockQueryItems.mockResolvedValue([]);
      mockBroadcastToRoom.mockResolvedValue({
        successCount: 2,
        failedConnections: [],
      });

      const result = await submitPrediction(
        userId,
        roomId,
        windowId,
        choice,
        predictionType
      );

      // Verify prediction structure
      expect(result).toMatchObject({
        userId,
        roomId,
        windowId,
        predictionType,
        choice,
      });
      expect(result.submittedAt).toBeDefined();
      expect(new Date(result.submittedAt).getTime()).toBeLessThanOrEqual(
        Date.now()
      );

      // Verify DynamoDB storage
      expect(mockPutItem).toHaveBeenCalledWith({
        TableName: expect.any(String),
        Item: {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#${windowId}#${userId}`,
          userId,
          roomId,
          windowId,
          predictionType,
          choice,
          submittedAt: expect.any(String),
        },
      });

      // Verify submission count broadcast
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(roomId, {
        type: 'predictionSubmissionCount',
        data: {
          windowId,
          submissionCount: 0,
        },
      });
    });

    it('should reject prediction if window has expired', async () => {
      const expiredWindow = {
        ...mockWindow,
        expiresAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      };

      mockGetItem.mockResolvedValue(expiredWindow);

      await expect(
        submitPrediction(userId, roomId, windowId, choice, predictionType)
      ).rejects.toThrow('Prediction window has expired');

      // Verify no storage or broadcast occurred
      expect(mockPutItem).not.toHaveBeenCalled();
      expect(mockBroadcastToRoom).not.toHaveBeenCalled();
    });

    it('should reject prediction if window not found', async () => {
      mockGetItem.mockResolvedValue(null);

      await expect(
        submitPrediction(userId, roomId, windowId, choice, predictionType)
      ).rejects.toThrow('Prediction window not found');

      expect(mockPutItem).not.toHaveBeenCalled();
      expect(mockBroadcastToRoom).not.toHaveBeenCalled();
    });

    it('should reject prediction if choice is not in available options', async () => {
      mockGetItem.mockResolvedValue(mockWindow);

      await expect(
        submitPrediction(
          userId,
          roomId,
          windowId,
          'Invalid Choice',
          predictionType
        )
      ).rejects.toThrow('Invalid choice');

      expect(mockPutItem).not.toHaveBeenCalled();
      expect(mockBroadcastToRoom).not.toHaveBeenCalled();
    });

    it('should handle window expiring at exact moment of submission', async () => {
      const exactExpiryWindow = {
        ...mockWindow,
        expiresAt: new Date(Date.now()).toISOString(), // Expires now
      };

      mockGetItem.mockResolvedValue(exactExpiryWindow);

      await expect(
        submitPrediction(userId, roomId, windowId, choice, predictionType)
      ).rejects.toThrow('Prediction window has expired');
    });

    it('should record timestamp with prediction', async () => {
      const beforeSubmit = Date.now();
      mockGetItem.mockResolvedValue(mockWindow);
      mockPutItem.mockResolvedValue();
      mockQueryItems.mockResolvedValue([]);
      mockBroadcastToRoom.mockResolvedValue({
        successCount: 1,
        failedConnections: [],
      });

      const result = await submitPrediction(
        userId,
        roomId,
        windowId,
        choice,
        predictionType
      );
      const afterSubmit = Date.now();

      const submittedTime = new Date(result.submittedAt).getTime();
      expect(submittedTime).toBeGreaterThanOrEqual(beforeSubmit);
      expect(submittedTime).toBeLessThanOrEqual(afterSubmit);
    });
  });

  describe('getSubmissionCount', () => {
    const roomId = 'room-456';
    const windowId = 'window-789';

    it('should return correct submission count', async () => {
      const mockPredictions = [
        { PK: `ROOM#${roomId}`, SK: 'PREDICTION#window-789#user-1' },
        { PK: `ROOM#${roomId}`, SK: 'PREDICTION#window-789#user-2' },
        { PK: `ROOM#${roomId}`, SK: 'PREDICTION#window-789#user-3' },
      ];

      mockQueryItems.mockResolvedValue(mockPredictions);

      const count = await getSubmissionCount(roomId, windowId);

      expect(count).toBe(3);
      expect(mockQueryItems).toHaveBeenCalledWith({
        TableName: expect.any(String),
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `ROOM#${roomId}`,
          ':sk': `PREDICTION#${windowId}#`,
        },
      });
    });

    it('should return 0 for window with no submissions', async () => {
      mockQueryItems.mockResolvedValue([]);

      const count = await getSubmissionCount(roomId, windowId);

      expect(count).toBe(0);
    });
  });

  describe('broadcastSubmissionCount', () => {
    const roomId = 'room-456';
    const windowId = 'window-789';

    it('should broadcast submission count without revealing individual predictions', async () => {
      mockQueryItems.mockResolvedValue([
        { PK: `ROOM#${roomId}`, SK: 'PREDICTION#window-789#user-1' },
        { PK: `ROOM#${roomId}`, SK: 'PREDICTION#window-789#user-2' },
      ]);
      mockBroadcastToRoom.mockResolvedValue({
        successCount: 5,
        failedConnections: [],
      });

      const result = await broadcastSubmissionCount(roomId, windowId);

      expect(result.successCount).toBe(5);
      expect(result.failedConnections).toEqual([]);

      // Verify broadcast message format
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(roomId, {
        type: 'predictionSubmissionCount',
        data: {
          windowId,
          submissionCount: 2,
        },
      });

      // Verify individual predictions are NOT included in broadcast
      const broadcastCall = mockBroadcastToRoom.mock.calls[0][1] as any;
      expect(broadcastCall.data).not.toHaveProperty('predictions');
      expect(broadcastCall.data).not.toHaveProperty('choices');
      expect(broadcastCall.data).not.toHaveProperty('users');
    });

    it('should handle broadcast failures', async () => {
      mockQueryItems.mockResolvedValue([
        { PK: `ROOM#${roomId}`, SK: 'PREDICTION#window-789#user-1' },
      ]);
      mockBroadcastToRoom.mockResolvedValue({
        successCount: 2,
        failedConnections: ['conn-1', 'conn-2'],
      });

      const result = await broadcastSubmissionCount(roomId, windowId);

      expect(result.successCount).toBe(2);
      expect(result.failedConnections).toEqual(['conn-1', 'conn-2']);
    });
  });

  describe('hasUserSubmitted', () => {
    const userId = 'user-123';
    const roomId = 'room-456';
    const windowId = 'window-789';

    it('should return true if user has submitted', async () => {
      mockGetItem.mockResolvedValue({
        PK: `ROOM#${roomId}`,
        SK: `PREDICTION#${windowId}#${userId}`,
        userId,
        roomId,
        windowId,
        choice: 'Home Team',
      });

      const result = await hasUserSubmitted(userId, roomId, windowId);

      expect(result).toBe(true);
      expect(mockGetItem).toHaveBeenCalledWith({
        TableName: expect.any(String),
        Key: {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#${windowId}#${userId}`,
        },
      });
    });

    it('should return false if user has not submitted', async () => {
      mockGetItem.mockResolvedValue(null);

      const result = await hasUserSubmitted(userId, roomId, windowId);

      expect(result).toBe(false);
    });
  });

  describe('getPredictionsForWindow', () => {
    const roomId = 'room-456';
    const windowId = 'window-789';

    it('should return all predictions for a window', async () => {
      const mockPredictions: Array<Prediction & { PK: string; SK: string }> = [
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#${windowId}#user-1`,
          userId: 'user-1',
          roomId,
          windowId,
          predictionType: 'next_goal_scorer',
          choice: 'Home Team',
          submittedAt: '2024-01-15T10:00:00Z',
        },
        {
          PK: `ROOM#${roomId}`,
          SK: `PREDICTION#${windowId}#user-2`,
          userId: 'user-2',
          roomId,
          windowId,
          predictionType: 'next_goal_scorer',
          choice: 'Away Team',
          submittedAt: '2024-01-15T10:00:05Z',
        },
      ];

      mockQueryItems.mockResolvedValue(mockPredictions);

      const result = await getPredictionsForWindow(roomId, windowId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        userId: 'user-1',
        choice: 'Home Team',
      });
      expect(result[1]).toMatchObject({
        userId: 'user-2',
        choice: 'Away Team',
      });

      // Verify DynamoDB keys are removed
      expect(result[0]).not.toHaveProperty('PK');
      expect(result[0]).not.toHaveProperty('SK');
    });

    it('should return empty array for window with no predictions', async () => {
      mockQueryItems.mockResolvedValue([]);

      const result = await getPredictionsForWindow(roomId, windowId);

      expect(result).toEqual([]);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple users submitting predictions', async () => {
      const roomId = 'room-456';
      const windowId = 'window-789';
      const mockWindow: PredictionWindow & { PK: string; SK: string } = {
        PK: `WINDOW#${windowId}`,
        SK: 'METADATA',
        windowId,
        roomId,
        matchId: 'match-123',
        predictionType: 'next_goal_scorer',
        options: ['Home Team', 'Away Team'],
        expiresAt: new Date(Date.now() + 30000).toISOString(),
        createdAt: new Date().toISOString(),
      };

      mockGetItem.mockResolvedValue(mockWindow);
      mockPutItem.mockResolvedValue();
      mockBroadcastToRoom.mockResolvedValue({
        successCount: 3,
        failedConnections: [],
      });

      // First user submits
      mockQueryItems.mockResolvedValueOnce([]);
      await submitPrediction(
        'user-1',
        roomId,
        windowId,
        'Home Team',
        'next_goal_scorer'
      );

      // Second user submits
      mockQueryItems.mockResolvedValueOnce([
        { SK: 'PREDICTION#window-789#user-1' },
      ]);
      await submitPrediction(
        'user-2',
        roomId,
        windowId,
        'Away Team',
        'next_goal_scorer'
      );

      // Verify both submissions were stored
      expect(mockPutItem).toHaveBeenCalledTimes(2);
      expect(mockBroadcastToRoom).toHaveBeenCalledTimes(2);
    });

    it('should handle submission at last second before expiration', async () => {
      const roomId = 'room-456';
      const windowId = 'window-789';
      const expiresAt = new Date(Date.now() + 100); // 100ms from now

      const mockWindow: PredictionWindow & { PK: string; SK: string } = {
        PK: `WINDOW#${windowId}`,
        SK: 'METADATA',
        windowId,
        roomId,
        matchId: 'match-123',
        predictionType: 'next_goal_scorer',
        options: ['Home Team'],
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      };

      mockGetItem.mockResolvedValue(mockWindow);
      mockPutItem.mockResolvedValue();
      mockQueryItems.mockResolvedValue([]);
      mockBroadcastToRoom.mockResolvedValue({
        successCount: 1,
        failedConnections: [],
      });

      // Submit just before expiration
      const result = await submitPrediction(
        'user-1',
        roomId,
        windowId,
        'Home Team',
        'next_goal_scorer'
      );

      expect(result).toBeDefined();
      expect(mockPutItem).toHaveBeenCalled();
    });
  });
});
