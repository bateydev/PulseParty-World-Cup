/**
 * Unit tests for leaderboard management
 */

import { updateLeaderboard } from './leaderboardManagement';
import * as dynamodb from '../utils/dynamodb';
import * as roomManagement from '../roomState/roomManagement';

// Mock dependencies
jest.mock('../utils/dynamodb');
jest.mock('../roomState/roomManagement');

const mockQueryItems = dynamodb.queryItems as jest.MockedFunction<
  typeof dynamodb.queryItems
>;
const mockPutItem = dynamodb.putItem as jest.MockedFunction<
  typeof dynamodb.putItem
>;
const mockBroadcastToRoom =
  roomManagement.broadcastToRoom as jest.MockedFunction<
    typeof roomManagement.broadcastToRoom
  >;

describe('updateLeaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when no scores exist', async () => {
    mockQueryItems.mockResolvedValue([]);
    const result = await updateLeaderboard('room-123');
    expect(result).toEqual([]);
    expect(mockPutItem).not.toHaveBeenCalled();
    expect(mockBroadcastToRoom).not.toHaveBeenCalled();
  });

  it('should calculate ranks correctly', async () => {
    const mockScores = [
      {
        PK: 'ROOM#room-123',
        SK: 'SCORE#user1',
        userId: 'user1',
        roomId: 'room-123',
        totalPoints: 100,
        streak: 2,
        clutchMoments: 1,
        correctPredictions: 5,
        totalPredictions: 8,
        rank: 0,
      },
    ];
    mockQueryItems.mockResolvedValue(mockScores);
    mockPutItem.mockResolvedValue();
    mockBroadcastToRoom.mockResolvedValue({
      successCount: 1,
      failedConnections: [],
    });
    const result = await updateLeaderboard('room-123');
    expect(result[0].rank).toBe(1);
  });
});
