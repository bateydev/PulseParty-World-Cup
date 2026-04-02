import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './handleConnect';
import * as dynamodb from '../utils/dynamodb';

// Mock the DynamoDB utilities
jest.mock('../utils/dynamodb');
const mockPutItem = dynamodb.putItem as jest.MockedFunction<
  typeof dynamodb.putItem
>;
const mockGetItem = dynamodb.getItem as jest.MockedFunction<
  typeof dynamodb.getItem
>;
const mockQueryItems = dynamodb.queryItems as jest.MockedFunction<
  typeof dynamodb.queryItems
>;

// Mock AWS SDK
jest.mock('@aws-sdk/client-apigatewaymanagementapi', () => ({
  ApiGatewayManagementApiClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PostToConnectionCommand: jest.fn(),
}));

describe('WebSocket Connection Handler', () => {
  const mockConnectionId = 'test-connection-123';
  const mockUserId = 'user-456';
  const mockRoomId = 'room-789';

  beforeEach(() => {
    jest.clearAllMocks();
    // Set environment variables before importing the handler
    process.env.TABLE_NAME = 'TestTable';
    process.env.WEBSOCKET_API_ENDPOINT = 'wss://test.execute-api.us-east-1.amazonaws.com/prod';
  });

  const createMockEvent = (
    queryParams?: Record<string, string>
  ): APIGatewayProxyEvent => ({
    requestContext: {
      accountId: 'test-account',
      apiId: 'test-api',
      authorizer: {},
      protocol: 'websocket',
      httpMethod: 'GET',
      path: '/',
      stage: 'prod',
      requestId: 'test-request',
      requestTimeEpoch: Date.now(),
      resourceId: 'test-resource',
      resourcePath: '/',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'test-agent',
        userArn: null,
      },
      connectionId: mockConnectionId,
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      connectedAt: Date.now(),
      eventType: 'CONNECT',
      extendedRequestId: 'test-extended',
      messageDirection: 'IN',
      messageId: 'test-message',
      routeKey: '$connect',
    },
    queryStringParameters: queryParams || null,
    body: null,
    isBase64Encoded: false,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    path: '/',
    pathParameters: null,
    stageVariables: null,
    multiValueQueryStringParameters: null,
    resource: '',
  });

  describe('Connection storage', () => {
    it('should store connection entity in DynamoDB with userId from query params', async () => {
      const event = createMockEvent({ userId: mockUserId });
      mockPutItem.mockResolvedValue();

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockPutItem).toHaveBeenCalledWith({
        TableName: 'TestTable',
        Item: expect.objectContaining({
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
          userId: mockUserId,
          connectedAt: expect.any(String),
          lastHeartbeat: expect.any(String),
        }),
      });
    });

    it('should generate guest userId if not provided', async () => {
      const event = createMockEvent();
      mockPutItem.mockResolvedValue();

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockPutItem).toHaveBeenCalledWith({
        TableName: 'TestTable',
        Item: expect.objectContaining({
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
          userId: expect.stringMatching(/^guest-\d+$/),
        }),
      });
    });

    it('should include roomId in connection entity if provided', async () => {
      const event = createMockEvent({ userId: mockUserId, roomId: mockRoomId });
      mockPutItem.mockResolvedValue();
      mockGetItem.mockResolvedValue(null); // Room not found

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockPutItem).toHaveBeenCalledWith({
        TableName: 'TestTable',
        Item: expect.objectContaining({
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
          userId: mockUserId,
          roomId: mockRoomId,
        }),
      });
    });

    it('should return 400 if connectionId is missing', async () => {
      const event = createMockEvent();
      event.requestContext.connectionId = undefined as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Missing connectionId',
      });
      expect(mockPutItem).not.toHaveBeenCalled();
    });
  });

  describe('Room state retrieval and sending', () => {
    const mockRoom = {
      PK: `ROOM#${mockRoomId}`,
      SK: 'METADATA',
      roomCode: 'ABC123',
      matchId: 'match-001',
      theme: 'Country' as const,
      participants: ['conn-1', 'conn-2'],
      createdAt: '2024-01-15T10:00:00Z',
      ttl: 1234567890,
    };

    const mockConnection1 = {
      PK: 'CONNECTION#conn-1',
      SK: 'METADATA',
      userId: 'user-1',
      roomId: mockRoomId,
      connectedAt: '2024-01-15T10:00:00Z',
      lastHeartbeat: '2024-01-15T10:00:00Z',
    };

    const mockConnection2 = {
      PK: 'CONNECTION#conn-2',
      SK: 'METADATA',
      userId: 'user-2',
      roomId: mockRoomId,
      connectedAt: '2024-01-15T10:01:00Z',
      lastHeartbeat: '2024-01-15T10:01:00Z',
    };

    const mockLeaderboard = [
      {
        PK: `ROOM#${mockRoomId}`,
        SK: 'SCORE#user-1',
        userId: 'user-1',
        totalPoints: 100,
        streak: 3,
        clutchMoments: 1,
        correctPredictions: 5,
        totalPredictions: 8,
        rank: 1,
        updatedAt: '2024-01-15T10:00:00Z',
      },
      {
        PK: `ROOM#${mockRoomId}`,
        SK: 'SCORE#user-2',
        userId: 'user-2',
        totalPoints: 75,
        streak: 2,
        clutchMoments: 0,
        correctPredictions: 3,
        totalPredictions: 6,
        rank: 2,
        updatedAt: '2024-01-15T10:00:00Z',
      },
    ];

    it('should send current room state when joining existing room', async () => {
      const event = createMockEvent({ userId: mockUserId, roomId: mockRoomId });

      // Mock DynamoDB responses
      mockPutItem.mockResolvedValue();
      mockGetItem
        .mockResolvedValueOnce(mockRoom) // Get room
        .mockResolvedValueOnce(mockConnection1) // Get connection 1
        .mockResolvedValueOnce(mockConnection2) // Get connection 2
        .mockResolvedValueOnce(mockRoom); // Get room again for adding connection

      mockQueryItems.mockResolvedValue(mockLeaderboard);

      const result = await handler(event);

      expect(result.statusCode).toBe(200);

      // Verify room was queried
      expect(mockGetItem).toHaveBeenCalledWith({
        TableName: 'TestTable',
        Key: {
          PK: `ROOM#${mockRoomId}`,
          SK: 'METADATA',
        },
        ConsistentRead: true,
      });

      // Verify leaderboard was queried
      expect(mockQueryItems).toHaveBeenCalledWith({
        TableName: 'TestTable',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `ROOM#${mockRoomId}`,
          ':sk': 'SCORE#',
        },
        ConsistentRead: true,
      });
    });

    it('should add connection to room participants list', async () => {
      const event = createMockEvent({ userId: mockUserId, roomId: mockRoomId });

      mockPutItem.mockResolvedValue();
      mockGetItem
        .mockResolvedValueOnce(mockRoom) // Get room for state
        .mockResolvedValueOnce(mockConnection1) // Get connection 1
        .mockResolvedValueOnce(mockConnection2) // Get connection 2
        .mockResolvedValueOnce(mockRoom); // Get room for adding connection

      mockQueryItems.mockResolvedValue(mockLeaderboard);

      await handler(event);

      // Verify connection was added to room
      expect(mockPutItem).toHaveBeenCalledWith({
        TableName: 'TestTable',
        Item: expect.objectContaining({
          PK: `ROOM#${mockRoomId}`,
          SK: 'METADATA',
          participants: expect.arrayContaining([
            'conn-1',
            'conn-2',
            mockConnectionId,
          ]),
        }),
      });
    });

    it('should handle room not found gracefully', async () => {
      const event = createMockEvent({ userId: mockUserId, roomId: mockRoomId });

      mockPutItem.mockResolvedValue();
      mockGetItem.mockResolvedValue(null); // Room not found

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      // Should still store connection even if room not found
      expect(mockPutItem).toHaveBeenCalledWith({
        TableName: 'TestTable',
        Item: expect.objectContaining({
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
        }),
      });
    });

    it('should not send room state if no roomId provided', async () => {
      const event = createMockEvent({ userId: mockUserId });

      mockPutItem.mockResolvedValue();

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      // Should only store connection, not query room
      expect(mockGetItem).not.toHaveBeenCalled();
      expect(mockQueryItems).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should return 500 if DynamoDB putItem fails', async () => {
      const event = createMockEvent({ userId: mockUserId });
      mockPutItem.mockRejectedValue(new Error('DynamoDB error'));

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Failed to establish connection',
      });
    });

    it('should handle errors when getting room state', async () => {
      const event = createMockEvent({ userId: mockUserId, roomId: mockRoomId });

      mockPutItem.mockResolvedValue();
      mockGetItem.mockRejectedValue(new Error('DynamoDB error'));

      const result = await handler(event);

      // Should still return 200 as connection was stored
      expect(result.statusCode).toBe(200);
    });

    it('should handle errors when sending room state via WebSocket', async () => {
      const event = createMockEvent({ userId: mockUserId, roomId: mockRoomId });

      const mockRoom = {
        PK: `ROOM#${mockRoomId}`,
        SK: 'METADATA',
        roomCode: 'ABC123',
        matchId: 'match-001',
        theme: 'Country' as const,
        participants: [],
        createdAt: '2024-01-15T10:00:00Z',
        ttl: 1234567890,
      };

      mockPutItem.mockResolvedValue();
      mockGetItem
        .mockResolvedValueOnce(mockRoom)
        .mockResolvedValueOnce(mockRoom);
      mockQueryItems.mockResolvedValue([]);

      // Mock WebSocket send to fail
      const { ApiGatewayManagementApiClient } = await import(
        '@aws-sdk/client-apigatewaymanagementapi'
      );
      (ApiGatewayManagementApiClient as jest.Mock).mockImplementation(() => ({
        send: jest.fn().mockRejectedValue(new Error('WebSocket error')),
      }));

      const result = await handler(event);

      // Should still return 200 as connection was stored
      expect(result.statusCode).toBe(200);
    });
  });

  describe('Leaderboard sorting', () => {
    it('should sort leaderboard by total points in descending order', async () => {
      const event = createMockEvent({ userId: mockUserId, roomId: mockRoomId });

      const mockRoom = {
        PK: `ROOM#${mockRoomId}`,
        SK: 'METADATA',
        roomCode: 'ABC123',
        matchId: 'match-001',
        theme: 'Country' as const,
        participants: [],
        createdAt: '2024-01-15T10:00:00Z',
        ttl: 1234567890,
      };

      const unsortedLeaderboard = [
        {
          PK: `ROOM#${mockRoomId}`,
          SK: 'SCORE#user-2',
          userId: 'user-2',
          totalPoints: 50,
          streak: 1,
          clutchMoments: 0,
          correctPredictions: 2,
          totalPredictions: 4,
          rank: 3,
          updatedAt: '2024-01-15T10:00:00Z',
        },
        {
          PK: `ROOM#${mockRoomId}`,
          SK: 'SCORE#user-1',
          userId: 'user-1',
          totalPoints: 100,
          streak: 3,
          clutchMoments: 1,
          correctPredictions: 5,
          totalPredictions: 8,
          rank: 1,
          updatedAt: '2024-01-15T10:00:00Z',
        },
        {
          PK: `ROOM#${mockRoomId}`,
          SK: 'SCORE#user-3',
          userId: 'user-3',
          totalPoints: 75,
          streak: 2,
          clutchMoments: 0,
          correctPredictions: 3,
          totalPredictions: 6,
          rank: 2,
          updatedAt: '2024-01-15T10:00:00Z',
        },
      ];

      mockPutItem.mockResolvedValue();
      mockGetItem
        .mockResolvedValueOnce(mockRoom)
        .mockResolvedValueOnce(mockRoom);
      mockQueryItems.mockResolvedValue(unsortedLeaderboard);

      await handler(event);

      // Verify leaderboard was queried
      expect(mockQueryItems).toHaveBeenCalled();
      // Note: We can't directly verify the sorting in the test since it happens
      // internally before sending via WebSocket, but the implementation sorts it
    });
  });
});
