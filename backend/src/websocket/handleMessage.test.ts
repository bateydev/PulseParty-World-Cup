import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './handleMessage';
import * as dynamodb from '../utils/dynamodb';
import * as roomManagement from '../roomState/roomManagement';
import * as predictionSubmission from '../momentEngine/predictionSubmission';

// Mock dependencies
jest.mock('../utils/dynamodb');
jest.mock('../roomState/roomManagement');
jest.mock('../momentEngine/predictionSubmission');

const mockGetItem = dynamodb.getItem as jest.MockedFunction<
  typeof dynamodb.getItem
>;
const mockPutItem = dynamodb.putItem as jest.MockedFunction<
  typeof dynamodb.putItem
>;
const mockUpdateItem = dynamodb.updateItem as jest.MockedFunction<
  typeof dynamodb.updateItem
>;
const mockCreateRoom = roomManagement.createRoom as jest.MockedFunction<
  typeof roomManagement.createRoom
>;
const mockGetRoomByCode = roomManagement.getRoomByCode as jest.MockedFunction<
  typeof roomManagement.getRoomByCode
>;
const mockSubmitPrediction = predictionSubmission.submitPrediction as jest.MockedFunction<typeof predictionSubmission.submitPrediction>;

describe('handleMessage', () => {
  const mockConnectionId = 'test-connection-123';
  const mockUserId = 'user-123';
  const mockRoomId = 'room-123';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'TestTable';

    // Default mock for connection entity
    mockGetItem.mockResolvedValue({
      PK: `CONNECTION#${mockConnectionId}`,
      SK: 'METADATA',
      userId: mockUserId,
      roomId: mockRoomId,
      connectedAt: '2024-01-01T00:00:00Z',
      lastHeartbeat: '2024-01-01T00:00:00Z',
      messageCount: 0,
      lastMessageWindow: 0,
    });

    // Default mock for update operations
    mockUpdateItem.mockResolvedValue(null);

    // Default mock for prediction submission
    mockSubmitPrediction.mockResolvedValue({
      userId: mockUserId,
      roomId: mockRoomId,
      windowId: 'window-123',
      choice: 'Player A',
      predictionType: 'next_goal_scorer',
      submittedAt: new Date().toISOString(),
    });
  });

  const createMockEvent = (body: any): APIGatewayProxyEvent =>
    ({
      body: JSON.stringify(body),
      requestContext: {
        connectionId: mockConnectionId,
      } as any,
    }) as APIGatewayProxyEvent;

  describe('Message validation', () => {
    it('should return 400 if connectionId is missing', async () => {
      const event = {
        body: JSON.stringify({ action: 'heartbeat', payload: {} }),
        requestContext: {} as any,
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toBe('Missing connectionId');
    });

    it('should return 400 if message body is missing', async () => {
      const event = {
        body: null,
        requestContext: {
          connectionId: mockConnectionId,
        } as any,
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toBe('Missing message body');
    });

    it('should return 400 if message body is invalid JSON', async () => {
      const event = {
        body: 'invalid json',
        requestContext: {
          connectionId: mockConnectionId,
        } as any,
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toBe(
        'Invalid JSON in message body'
      );
    });

    it('should return 400 if action field is missing', async () => {
      const event = createMockEvent({ payload: {} });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toContain('action and payload');
    });

    it('should return 400 if payload field is missing', async () => {
      const event = createMockEvent({ action: 'heartbeat' });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toContain('action and payload');
    });

    it('should return 400 for unknown action', async () => {
      const event = createMockEvent({
        action: 'unknownAction',
        payload: {},
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toContain('Unknown action');
    });
  });

  describe('Rate limiting', () => {
    it('should allow messages within rate limit', async () => {
      const currentWindow = Math.floor(Date.now() / 1000);
      mockGetItem.mockResolvedValue({
        PK: `CONNECTION#${mockConnectionId}`,
        SK: 'METADATA',
        userId: mockUserId,
        connectedAt: '2024-01-01T00:00:00Z',
        lastHeartbeat: '2024-01-01T00:00:00Z',
        messageCount: 50,
        lastMessageWindow: currentWindow,
      });

      const event = createMockEvent({ action: 'heartbeat', payload: {} });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: expect.stringContaining('messageCount + :one'),
        })
      );
    });

    it('should reject messages exceeding rate limit', async () => {
      const currentWindow = Math.floor(Date.now() / 1000);
      mockGetItem.mockResolvedValue({
        PK: `CONNECTION#${mockConnectionId}`,
        SK: 'METADATA',
        userId: mockUserId,
        connectedAt: '2024-01-01T00:00:00Z',
        lastHeartbeat: '2024-01-01T00:00:00Z',
        messageCount: 100, // At limit
        lastMessageWindow: currentWindow,
      });

      const event = createMockEvent({ action: 'heartbeat', payload: {} });

      const result = await handler(event);

      expect(result.statusCode).toBe(429);
      expect(JSON.parse(result.body).error).toBe('Rate limit exceeded');
      expect(JSON.parse(result.body).retryAfter).toBe(1);
    });

    it('should reset counter in new time window', async () => {
      const oldWindow = Math.floor(Date.now() / 1000) - 2;
      mockGetItem.mockResolvedValue({
        PK: `CONNECTION#${mockConnectionId}`,
        SK: 'METADATA',
        userId: mockUserId,
        connectedAt: '2024-01-01T00:00:00Z',
        lastHeartbeat: '2024-01-01T00:00:00Z',
        messageCount: 100,
        lastMessageWindow: oldWindow,
      });

      const event = createMockEvent({ action: 'heartbeat', payload: {} });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: expect.stringContaining('messageCount = :one'),
        })
      );
    });
  });

  describe('createRoom action', () => {
    it('should create room with valid theme and matchId', async () => {
      const mockRoom = {
        roomId: 'room-456',
        roomCode: 'ABC123',
        matchId: 'match-789',
        theme: 'Country' as const,
        participants: [],
        createdAt: '2024-01-01T00:00:00Z',
        ttl: 1234567890,
      };

      mockCreateRoom.mockResolvedValue(mockRoom);
      mockGetItem
        .mockResolvedValueOnce({
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
          userId: mockUserId,
          connectedAt: '2024-01-01T00:00:00Z',
          lastHeartbeat: '2024-01-01T00:00:00Z',
          messageCount: 0,
          lastMessageWindow: 0,
        })
        .mockResolvedValueOnce({
          PK: `ROOM#room-456`,
          SK: 'METADATA',
          roomCode: 'ABC123',
          matchId: 'match-789',
          theme: 'Country',
          participants: [],
          createdAt: '2024-01-01T00:00:00Z',
          ttl: 1234567890,
        });

      const event = createMockEvent({
        action: 'createRoom',
        payload: { matchId: 'match-789', theme: 'Country' },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.type).toBe('roomCreated');
      expect(body.room.roomCode).toBe('ABC123');
      expect(mockCreateRoom).toHaveBeenCalledWith('match-789', 'Country');
    });

    it('should reject createRoom without matchId', async () => {
      const event = createMockEvent({
        action: 'createRoom',
        payload: { theme: 'Country' },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(mockCreateRoom).not.toHaveBeenCalled();
    });

    it('should reject createRoom with invalid theme', async () => {
      const event = createMockEvent({
        action: 'createRoom',
        payload: { matchId: 'match-789', theme: 'InvalidTheme' },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(mockCreateRoom).not.toHaveBeenCalled();
    });
  });

  describe('joinRoom action', () => {
    it('should join room with valid room code', async () => {
      const mockRoom = {
        roomId: 'room-456',
        roomCode: 'ABC123',
        matchId: 'match-789',
        theme: 'Club' as const,
        participants: [],
        createdAt: '2024-01-01T00:00:00Z',
        ttl: 1234567890,
      };

      mockGetRoomByCode.mockResolvedValue(mockRoom);
      mockGetItem
        .mockResolvedValueOnce({
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
          userId: mockUserId,
          connectedAt: '2024-01-01T00:00:00Z',
          lastHeartbeat: '2024-01-01T00:00:00Z',
          messageCount: 0,
          lastMessageWindow: 0,
        })
        .mockResolvedValueOnce({
          PK: `ROOM#room-456`,
          SK: 'METADATA',
          roomCode: 'ABC123',
          matchId: 'match-789',
          theme: 'Club',
          participants: [],
          createdAt: '2024-01-01T00:00:00Z',
          ttl: 1234567890,
        });

      const event = createMockEvent({
        action: 'joinRoom',
        payload: { roomCode: 'ABC123' },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.type).toBe('roomJoined');
      expect(body.room.roomCode).toBe('ABC123');
      expect(mockGetRoomByCode).toHaveBeenCalledWith('ABC123');
    });

    it('should reject joinRoom with invalid room code', async () => {
      mockGetRoomByCode.mockResolvedValue(null);

      const event = createMockEvent({
        action: 'joinRoom',
        payload: { roomCode: 'INVALID' },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(mockGetRoomByCode).toHaveBeenCalledWith('INVALID');
    });

    it('should reject joinRoom without room code', async () => {
      const event = createMockEvent({
        action: 'joinRoom',
        payload: {},
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(mockGetRoomByCode).not.toHaveBeenCalled();
    });
  });

  describe('submitPrediction action', () => {
    it('should submit prediction with valid windowId and choice', async () => {
      mockGetItem
        .mockResolvedValueOnce({
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
          userId: mockUserId,
          connectedAt: '2024-01-01T00:00:00Z',
          lastHeartbeat: '2024-01-01T00:00:00Z',
          messageCount: 0,
          lastMessageWindow: 0,
        })
        .mockResolvedValueOnce({
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
          userId: mockUserId,
          roomId: mockRoomId,
          connectedAt: '2024-01-01T00:00:00Z',
          lastHeartbeat: '2024-01-01T00:00:00Z',
        });

      const event = createMockEvent({
        action: 'submitPrediction',
        payload: {
          windowId: 'window-123',
          choice: 'Player A',
          predictionType: 'next_goal_scorer',
        },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.type).toBe('predictionSubmitted');
      expect(body.windowId).toBe('window-123');
      expect(body.choice).toBe('Player A');
      expect(mockSubmitPrediction).toHaveBeenCalledWith(
        mockUserId,
        mockRoomId,
        'window-123',
        'Player A',
        'next_goal_scorer'
      );
    });

    it('should reject submitPrediction without windowId', async () => {
      const event = createMockEvent({
        action: 'submitPrediction',
        payload: { choice: 'Player A' },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(mockPutItem).not.toHaveBeenCalled();
    });

    it('should reject submitPrediction when not in a room', async () => {
      mockGetItem
        .mockResolvedValueOnce({
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
          userId: mockUserId,
          connectedAt: '2024-01-01T00:00:00Z',
          lastHeartbeat: '2024-01-01T00:00:00Z',
          messageCount: 0,
          lastMessageWindow: 0,
        })
        .mockResolvedValueOnce({
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
          userId: mockUserId,
          // No roomId
          connectedAt: '2024-01-01T00:00:00Z',
          lastHeartbeat: '2024-01-01T00:00:00Z',
        });

      const event = createMockEvent({
        action: 'submitPrediction',
        payload: { windowId: 'window-123', choice: 'Player A' },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(mockPutItem).not.toHaveBeenCalled();
    });
  });

  describe('leaveRoom action', () => {
    it('should leave room successfully', async () => {
      // Mock for rate limiting check
      mockGetItem.mockResolvedValueOnce({
        PK: `CONNECTION#${mockConnectionId}`,
        SK: 'METADATA',
        userId: mockUserId,
        connectedAt: '2024-01-01T00:00:00Z',
        lastHeartbeat: '2024-01-01T00:00:00Z',
        messageCount: 0,
        lastMessageWindow: 0,
      });

      // Mock for handleLeaveRoom connection lookup
      mockGetItem.mockResolvedValueOnce({
        PK: `CONNECTION#${mockConnectionId}`,
        SK: 'METADATA',
        userId: mockUserId,
        roomId: mockRoomId,
        connectedAt: '2024-01-01T00:00:00Z',
        lastHeartbeat: '2024-01-01T00:00:00Z',
      });

      // Mock for removeConnectionFromRoom room lookup
      mockGetItem.mockResolvedValueOnce({
        PK: `ROOM#${mockRoomId}`,
        SK: 'METADATA',
        roomCode: 'ABC123',
        matchId: 'match-789',
        theme: 'Country' as const,
        participants: [mockConnectionId],
        createdAt: '2024-01-01T00:00:00Z',
        ttl: 1234567890,
      });

      const event = createMockEvent({
        action: 'leaveRoom',
        payload: {},
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.type).toBe('leftRoom');
      expect(body.roomId).toBe(mockRoomId);
      expect(mockUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: 'REMOVE roomId',
        })
      );
    });

    it('should handle leaveRoom when not in a room', async () => {
      mockGetItem
        .mockResolvedValueOnce({
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
          userId: mockUserId,
          connectedAt: '2024-01-01T00:00:00Z',
          lastHeartbeat: '2024-01-01T00:00:00Z',
          messageCount: 0,
          lastMessageWindow: 0,
        })
        .mockResolvedValueOnce({
          PK: `CONNECTION#${mockConnectionId}`,
          SK: 'METADATA',
          userId: mockUserId,
          // No roomId
          connectedAt: '2024-01-01T00:00:00Z',
          lastHeartbeat: '2024-01-01T00:00:00Z',
        });

      const event = createMockEvent({
        action: 'leaveRoom',
        payload: {},
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.type).toBe('leftRoom');
      expect(body.message).toBe('Not in a room');
    });
  });

  describe('heartbeat action', () => {
    it('should update last heartbeat timestamp', async () => {
      const event = createMockEvent({
        action: 'heartbeat',
        payload: {},
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.type).toBe('heartbeatAck');
      expect(body.timestamp).toBeDefined();
      expect(mockUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: 'SET lastHeartbeat = :timestamp',
        })
      );
    });
  });
});
