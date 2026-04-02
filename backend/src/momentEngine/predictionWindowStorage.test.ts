import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  storePredictionWindow,
  broadcastPredictionWindow,
  storeAndBroadcastPredictionWindow,
} from './predictionWindowStorage';
import { PredictionWindow } from '../types';
import * as dynamodb from '../utils/dynamodb';
import * as roomManagement from '../roomState/roomManagement';

// Mock dependencies
jest.mock('../utils/dynamodb');
jest.mock('../roomState/roomManagement');

describe('Prediction Window Storage', () => {
  const mockWindow: PredictionWindow = {
    windowId: 'window-123',
    roomId: 'room-456',
    matchId: 'match-789',
    predictionType: 'next_goal_scorer',
    options: ['Home Team', 'Away Team', 'No Goal in Next 10 Minutes'],
    expiresAt: '2024-01-15T10:35:00Z',
    createdAt: '2024-01-15T10:30:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storePredictionWindow', () => {
    it('should store prediction window in DynamoDB with correct structure', async () => {
      const putItemMock = jest
        .spyOn(dynamodb, 'putItem')
        .mockResolvedValue(undefined);

      await storePredictionWindow(mockWindow);

      expect(putItemMock).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        Item: {
          PK: 'WINDOW#window-123',
          SK: 'METADATA',
          windowId: 'window-123',
          roomId: 'room-456',
          matchId: 'match-789',
          predictionType: 'next_goal_scorer',
          options: ['Home Team', 'Away Team', 'No Goal in Next 10 Minutes'],
          expiresAt: '2024-01-15T10:35:00Z',
          createdAt: '2024-01-15T10:30:00Z',
        },
      });
    });

    it('should handle DynamoDB errors', async () => {
      const error = new Error('DynamoDB error');
      jest.spyOn(dynamodb, 'putItem').mockRejectedValue(error);

      await expect(storePredictionWindow(mockWindow)).rejects.toThrow(
        'DynamoDB error'
      );
    });

    it('should store window with all prediction types', async () => {
      const putItemMock = jest
        .spyOn(dynamodb, 'putItem')
        .mockResolvedValue(undefined);

      const predictionTypes: PredictionWindow['predictionType'][] = [
        'next_goal_scorer',
        'next_card',
        'next_corner',
        'match_outcome',
      ];

      for (const predictionType of predictionTypes) {
        const window = { ...mockWindow, predictionType };
        await storePredictionWindow(window);

        expect(putItemMock).toHaveBeenCalledWith(
          expect.objectContaining({
            Item: expect.objectContaining({
              predictionType,
            }),
          })
        );
      }
    });
  });

  describe('broadcastPredictionWindow', () => {
    it('should broadcast prediction window to all room participants', async () => {
      const broadcastMock = jest
        .spyOn(roomManagement, 'broadcastToRoom')
        .mockResolvedValue({ successCount: 3, failedConnections: [] });

      const result = await broadcastPredictionWindow(mockWindow);

      expect(broadcastMock).toHaveBeenCalledWith('room-456', {
        type: 'predictionWindow',
        data: mockWindow,
      });
      expect(result).toEqual({ successCount: 3, failedConnections: [] });
    });

    it('should return failed connections when broadcast fails', async () => {
      jest.spyOn(roomManagement, 'broadcastToRoom').mockResolvedValue({
        successCount: 2,
        failedConnections: ['conn-1', 'conn-2'],
      });

      const result = await broadcastPredictionWindow(mockWindow);

      expect(result).toEqual({
        successCount: 2,
        failedConnections: ['conn-1', 'conn-2'],
      });
    });

    it('should handle broadcast errors', async () => {
      const error = new Error('Broadcast error');
      jest.spyOn(roomManagement, 'broadcastToRoom').mockRejectedValue(error);

      await expect(broadcastPredictionWindow(mockWindow)).rejects.toThrow(
        'Broadcast error'
      );
    });

    it('should broadcast with correct message structure', async () => {
      const broadcastMock = jest
        .spyOn(roomManagement, 'broadcastToRoom')
        .mockResolvedValue({ successCount: 1, failedConnections: [] });

      await broadcastPredictionWindow(mockWindow);

      const call = broadcastMock.mock.calls[0];
      expect(call[0]).toBe('room-456');
      expect(call[1]).toEqual({
        type: 'predictionWindow',
        data: expect.objectContaining({
          windowId: 'window-123',
          predictionType: 'next_goal_scorer',
          options: expect.any(Array),
          expiresAt: expect.any(String),
        }),
      });
    });
  });

  describe('storeAndBroadcastPredictionWindow', () => {
    it('should store and broadcast prediction window', async () => {
      const putItemMock = jest
        .spyOn(dynamodb, 'putItem')
        .mockResolvedValue(undefined);
      const broadcastMock = jest
        .spyOn(roomManagement, 'broadcastToRoom')
        .mockResolvedValue({ successCount: 3, failedConnections: [] });

      const result = await storeAndBroadcastPredictionWindow(mockWindow);

      expect(putItemMock).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining({
            PK: 'WINDOW#window-123',
            SK: 'METADATA',
          }),
        })
      );
      expect(broadcastMock).toHaveBeenCalledWith('room-456', {
        type: 'predictionWindow',
        data: mockWindow,
      });
      expect(result).toEqual({ successCount: 3, failedConnections: [] });
    });

    it('should store before broadcasting', async () => {
      const callOrder: string[] = [];

      jest.spyOn(dynamodb, 'putItem').mockImplementation(async () => {
        callOrder.push('store');
      });

      jest
        .spyOn(roomManagement, 'broadcastToRoom')
        .mockImplementation(async () => {
          callOrder.push('broadcast');
          return { successCount: 1, failedConnections: [] };
        });

      await storeAndBroadcastPredictionWindow(mockWindow);

      expect(callOrder).toEqual(['store', 'broadcast']);
    });

    it('should not broadcast if storage fails', async () => {
      const error = new Error('Storage failed');
      jest.spyOn(dynamodb, 'putItem').mockRejectedValue(error);
      const broadcastSpy = jest.spyOn(roomManagement, 'broadcastToRoom');

      await expect(
        storeAndBroadcastPredictionWindow(mockWindow)
      ).rejects.toThrow('Storage failed');

      expect(broadcastSpy).not.toHaveBeenCalled();
    });

    it('should return broadcast result even if some connections fail', async () => {
      jest.spyOn(dynamodb, 'putItem').mockResolvedValue(undefined);
      jest.spyOn(roomManagement, 'broadcastToRoom').mockResolvedValue({
        successCount: 2,
        failedConnections: ['conn-stale'],
      });

      const result = await storeAndBroadcastPredictionWindow(mockWindow);

      expect(result).toEqual({
        successCount: 2,
        failedConnections: ['conn-stale'],
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle empty room (no participants)', async () => {
      jest.spyOn(dynamodb, 'putItem').mockResolvedValue(undefined);
      jest.spyOn(roomManagement, 'broadcastToRoom').mockResolvedValue({
        successCount: 0,
        failedConnections: [],
      });

      const result = await storeAndBroadcastPredictionWindow(mockWindow);

      expect(result.successCount).toBe(0);
      expect(result.failedConnections).toEqual([]);
    });

    it('should handle window with expiration timestamp', async () => {
      const putItemMock = jest
        .spyOn(dynamodb, 'putItem')
        .mockResolvedValue(undefined);
      jest.spyOn(roomManagement, 'broadcastToRoom').mockResolvedValue({
        successCount: 1,
        failedConnections: [],
      });

      const windowWithExpiry = {
        ...mockWindow,
        expiresAt: new Date(Date.now() + 30000).toISOString(),
      };

      await storeAndBroadcastPredictionWindow(windowWithExpiry);

      expect(putItemMock).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining({
            expiresAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          }),
        })
      );
    });

    it('should handle different prediction types correctly', async () => {
      jest.spyOn(dynamodb, 'putItem').mockResolvedValue(undefined);
      const broadcastMock = jest
        .spyOn(roomManagement, 'broadcastToRoom')
        .mockResolvedValue({ successCount: 1, failedConnections: [] });

      const cornerWindow: PredictionWindow = {
        ...mockWindow,
        predictionType: 'next_corner',
        options: ['Home Team', 'Away Team', 'No Corner in Next 5 Minutes'],
      };

      await storeAndBroadcastPredictionWindow(cornerWindow);

      expect(broadcastMock).toHaveBeenCalledWith(
        'room-456',
        expect.objectContaining({
          data: expect.objectContaining({
            predictionType: 'next_corner',
            options: ['Home Team', 'Away Team', 'No Corner in Next 5 Minutes'],
          }),
        })
      );
    });
  });
});
