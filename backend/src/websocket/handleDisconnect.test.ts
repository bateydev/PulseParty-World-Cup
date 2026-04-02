import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './handleDisconnect';
import * as dynamodb from '../utils/dynamodb';
import { ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi';

// Mock dependencies
jest.mock('../utils/dynamodb');
jest.mock('@aws-sdk/client-apigatewaymanagementapi');

const mockGetItem = dynamodb.getItem as jest.MockedFunction<
  typeof dynamodb.getItem
>;
const mockDeleteItem = dynamodb.deleteItem as jest.MockedFunction<
  typeof dynamodb.deleteItem
>;
const mockPutItem = dynamodb.putItem as jest.MockedFunction<
  typeof dynamodb.putItem
>;

describe('handleDisconnect', () => {
  const mockConnectionId = 'test-connection-123';
  const mockUserId = 'user-456';
  const mockRoomId = 'room-789';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
    process.env.WEBSOCKET_API_ENDPOINT =
      'https://test.execute-api.region.amazonaws.com/prod';
  });

  const createMockEvent = (
    connectionId: string
  ): Partial<APIGatewayProxyEvent> => ({
    requestContext: {
      connectionId,
    } as any,
  });

  describe('connection removal', () => {
    it('should remove connection from DynamoDB', async () => {
      const event = createMockEvent(mockConnectionId);

      mockGetItem.mockResolvedValueOnce({
        PK: `CONNECTION#${mockConnectionId}`,
        SK: 'METADATA',
        userId: mockUserId,
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
      });

      mockDeleteItem.mockResolvedValueOnce(undefined);

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockDeleteItem).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
        },
      });
    });

    it('should handle missing connectionId gracefully', async () => {
      const event = {
        requestContext: {},
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Missing connectionId',
      });
    });

    it('should handle connection not found in database', async () => {
      const event = createMockEvent(mockConnectionId);

      mockGetItem.mockResolvedValueOnce(null);

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockDeleteItem).not.toHaveBeenCalled();
    });
  });

  describe('room participant updates', () => {
    it('should remove connection from room participants', async () => {
      const event = createMockEvent(mockConnectionId);
      const otherConnectionId = 'other-connection-456';

      // Mock connection with room
      mockGetItem
        .mockResolvedValueOnce({
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
          userId: mockUserId,
          roomId: mockRoomId,
          connectedAt: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
        })
        // Mock room entity
        .mockResolvedValueOnce({
          PK: `ROOM#${mockRoomId}`,
          SK: 'METADATA',
          roomCode: 'ABC123',
          matchId: 'match-1',
          theme: 'Country',
          participants: [mockConnectionId, otherConnectionId],
          createdAt: new Date().toISOString(),
          ttl: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });

      mockDeleteItem.mockResolvedValueOnce(undefined);
      mockPutItem.mockResolvedValueOnce(undefined);

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockPutItem).toHaveBeenCalledWith({
        TableName: 'test-table',
        Item: expect.objectContaining({
          participants: [otherConnectionId],
        }),
      });
    });

    it('should handle room not found when removing connection', async () => {
      const event = createMockEvent(mockConnectionId);

      mockGetItem
        .mockResolvedValueOnce({
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
          userId: mockUserId,
          roomId: mockRoomId,
          connectedAt: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
        })
        .mockResolvedValueOnce(null); // Room not found

      mockDeleteItem.mockResolvedValueOnce(undefined);

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockPutItem).not.toHaveBeenCalled();
    });
  });

  describe('participant broadcast', () => {
    it('should broadcast updated participant list to remaining users', async () => {
      const event = createMockEvent(mockConnectionId);
      const otherConnectionId = 'other-connection-456';
      const otherUserId = 'user-789';

      const mockSend = jest.fn().mockResolvedValue({});
      (ApiGatewayManagementApiClient as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      mockGetItem
        // Get disconnecting connection
        .mockResolvedValueOnce({
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
          userId: mockUserId,
          roomId: mockRoomId,
          connectedAt: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
        })
        // Get room for removal
        .mockResolvedValueOnce({
          PK: `ROOM#${mockRoomId}`,
          SK: 'METADATA',
          roomCode: 'ABC123',
          matchId: 'match-1',
          theme: 'Country',
          participants: [mockConnectionId, otherConnectionId],
          createdAt: new Date().toISOString(),
          ttl: Date.now() + 7 * 24 * 60 * 60 * 1000,
        })
        // Get room for broadcast
        .mockResolvedValueOnce({
          PK: `ROOM#${mockRoomId}`,
          SK: 'METADATA',
          roomCode: 'ABC123',
          matchId: 'match-1',
          theme: 'Country',
          participants: [otherConnectionId],
          createdAt: new Date().toISOString(),
          ttl: Date.now() + 7 * 24 * 60 * 60 * 1000,
        })
        // Get remaining connection
        .mockResolvedValueOnce({
          PK: `CONNECTION#${otherConnectionId}`,
          SK: 'METADATA',
          userId: otherUserId,
          roomId: mockRoomId,
          connectedAt: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
        });

      mockDeleteItem.mockResolvedValueOnce(undefined);
      mockPutItem.mockResolvedValueOnce(undefined);

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle stale connections during broadcast', async () => {
      const event = createMockEvent(mockConnectionId);
      const staleConnectionId = 'stale-connection-456';

      const mockSend = jest.fn().mockRejectedValue({
        statusCode: 410,
        message: 'Gone',
      });
      (ApiGatewayManagementApiClient as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      mockGetItem
        .mockResolvedValueOnce({
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
          userId: mockUserId,
          roomId: mockRoomId,
          connectedAt: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
        })
        .mockResolvedValueOnce({
          PK: `ROOM#${mockRoomId}`,
          SK: 'METADATA',
          roomCode: 'ABC123',
          matchId: 'match-1',
          theme: 'Country',
          participants: [mockConnectionId, staleConnectionId],
          createdAt: new Date().toISOString(),
          ttl: Date.now() + 7 * 24 * 60 * 60 * 1000,
        })
        .mockResolvedValueOnce({
          PK: `ROOM#${mockRoomId}`,
          SK: 'METADATA',
          roomCode: 'ABC123',
          matchId: 'match-1',
          theme: 'Country',
          participants: [staleConnectionId],
          createdAt: new Date().toISOString(),
          ttl: Date.now() + 7 * 24 * 60 * 60 * 1000,
        })
        .mockResolvedValueOnce({
          PK: `CONNECTION#${staleConnectionId}`,
          SK: 'METADATA',
          userId: 'stale-user',
          roomId: mockRoomId,
          connectedAt: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
        });

      mockDeleteItem.mockResolvedValueOnce(undefined);
      mockPutItem.mockResolvedValueOnce(undefined);

      const result = await handler(event as APIGatewayProxyEvent);

      // Should still succeed even if broadcast fails
      expect(result.statusCode).toBe(200);
    });
  });

  describe('error handling', () => {
    it('should return success even on database errors', async () => {
      const event = createMockEvent(mockConnectionId);

      mockGetItem.mockRejectedValueOnce(new Error('Database error'));

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
    });

    it('should handle connection without room', async () => {
      const event = createMockEvent(mockConnectionId);

      mockGetItem.mockResolvedValueOnce({
        PK: `CONNECTION#${mockConnectionId}`,
        SK: 'METADATA',
        userId: mockUserId,
        // No roomId
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
      });

      mockDeleteItem.mockResolvedValueOnce(undefined);

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockPutItem).not.toHaveBeenCalled();
    });
  });
});
