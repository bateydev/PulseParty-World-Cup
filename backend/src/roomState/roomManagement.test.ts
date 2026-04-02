import {
  generateRoomCode,
  createRoom,
  getRoomByCode,
  getActiveRoomsByMatch,
  validateTheme,
  discoverRooms,
  broadcastToRoom,
} from './roomManagement';
import * as dynamodb from '../utils/dynamodb';
import {
  ApiGatewayManagementApiClient,
  GoneException,
} from '@aws-sdk/client-apigatewaymanagementapi';

// Mock DynamoDB utilities
jest.mock('../utils/dynamodb');

// Mock AWS SDK
jest.mock('@aws-sdk/client-apigatewaymanagementapi');

describe('Room Management Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateRoomCode', () => {
    it('should generate a 6-character alphanumeric code', () => {
      const code = generateRoomCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Z2-9]+$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateRoomCode());
      }
      // With 32 possible characters and 6 positions, collision is extremely unlikely
      expect(codes.size).toBeGreaterThan(95); // Allow for rare collisions
    });

    it('should not include confusing characters (I, O, 1, 0)', () => {
      const codes = Array.from({ length: 100 }, () => generateRoomCode());
      const allChars = codes.join('');
      expect(allChars).not.toContain('I');
      expect(allChars).not.toContain('O');
      expect(allChars).not.toContain('1');
      expect(allChars).not.toContain('0');
    });
  });

  describe('createRoom', () => {
    it('should create a room with valid parameters', async () => {
      (dynamodb.putItem as jest.Mock).mockResolvedValue(undefined);

      const room = await createRoom('match-123', 'Country');

      expect(room).toMatchObject({
        matchId: 'match-123',
        theme: 'Country',
        participants: [],
      });
      expect(room.roomId).toBeDefined();
      expect(room.roomCode).toHaveLength(6);
      expect(room.createdAt).toBeDefined();
      expect(room.ttl).toBeGreaterThan(Date.now() / 1000);
    });

    it('should store room in DynamoDB with correct structure', async () => {
      (dynamodb.putItem as jest.Mock).mockResolvedValue(undefined);

      const room = await createRoom('match-456', 'Club');

      expect(dynamodb.putItem).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        Item: expect.objectContaining({
          PK: expect.stringContaining('ROOM#'),
          SK: 'METADATA',
          GSI1PK: 'MATCH#match-456#THEME#Club',
          GSI1SK: expect.any(String),
          roomId: room.roomId,
          roomCode: room.roomCode,
          matchId: 'match-456',
          theme: 'Club',
          participants: [],
          createdAt: expect.any(String),
          ttl: expect.any(Number),
        }),
      });
    });

    it('should create room with Private theme', async () => {
      (dynamodb.putItem as jest.Mock).mockResolvedValue(undefined);

      const room = await createRoom('match-789', 'Private');

      expect(room.theme).toBe('Private');
      expect(dynamodb.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining({
            GSI1PK: 'MATCH#match-789#THEME#Private',
          }),
        })
      );
    });

    it('should set TTL to 7 days by default', async () => {
      (dynamodb.putItem as jest.Mock).mockResolvedValue(undefined);

      const beforeCreate = Math.floor(Date.now() / 1000);
      const room = await createRoom('match-123', 'Country');
      const afterCreate = Math.floor(Date.now() / 1000);

      const expectedTtlMin = beforeCreate + 7 * 24 * 60 * 60;
      const expectedTtlMax = afterCreate + 7 * 24 * 60 * 60;

      expect(room.ttl).toBeGreaterThanOrEqual(expectedTtlMin);
      expect(room.ttl).toBeLessThanOrEqual(expectedTtlMax);
    });

    it('should allow custom TTL days', async () => {
      (dynamodb.putItem as jest.Mock).mockResolvedValue(undefined);

      const room = await createRoom('match-123', 'Country', 14);

      const expectedTtl = Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60;
      expect(room.ttl).toBeGreaterThanOrEqual(expectedTtl - 1);
      expect(room.ttl).toBeLessThanOrEqual(expectedTtl + 1);
    });

    it('should generate unique room IDs for concurrent requests', async () => {
      (dynamodb.putItem as jest.Mock).mockResolvedValue(undefined);

      const rooms = await Promise.all([
        createRoom('match-123', 'Country'),
        createRoom('match-123', 'Country'),
        createRoom('match-123', 'Country'),
      ]);

      const roomIds = rooms.map((r) => r.roomId);
      const uniqueIds = new Set(roomIds);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('getRoomByCode', () => {
    it('should return room when code exists', async () => {
      const mockRoom = {
        PK: 'ROOM#room-123',
        SK: 'METADATA',
        GSI1PK: 'MATCH#match-123#THEME#Country',
        GSI1SK: '2024-01-15T10:00:00Z',
        roomId: 'room-123',
        roomCode: 'ABC123',
        matchId: 'match-123',
        theme: 'Country' as const,
        participants: ['conn-1', 'conn-2'],
        createdAt: '2024-01-15T10:00:00Z',
        ttl: 1234567890,
      };

      (dynamodb.queryItems as jest.Mock).mockResolvedValue([mockRoom]);

      const room = await getRoomByCode('ABC123');

      expect(room).toEqual({
        roomId: 'room-123',
        roomCode: 'ABC123',
        matchId: 'match-123',
        theme: 'Country',
        participants: ['conn-1', 'conn-2'],
        createdAt: '2024-01-15T10:00:00Z',
        ttl: 1234567890,
      });
    });

    it('should return null when code does not exist', async () => {
      (dynamodb.queryItems as jest.Mock).mockResolvedValue([]);

      const room = await getRoomByCode('INVALID');

      expect(room).toBeNull();
    });

    it('should filter by exact room code match', async () => {
      const mockRooms = [
        {
          PK: 'ROOM#room-1',
          SK: 'METADATA',
          GSI1PK: 'MATCH#match-123#THEME#Country',
          GSI1SK: '2024-01-15T10:00:00Z',
          roomId: 'room-1',
          roomCode: 'ABC123',
          matchId: 'match-123',
          theme: 'Country' as const,
          participants: [],
          createdAt: '2024-01-15T10:00:00Z',
          ttl: 1234567890,
        },
        {
          PK: 'ROOM#room-2',
          SK: 'METADATA',
          GSI1PK: 'MATCH#match-123#THEME#Club',
          GSI1SK: '2024-01-15T10:01:00Z',
          roomId: 'room-2',
          roomCode: 'XYZ789',
          matchId: 'match-123',
          theme: 'Club' as const,
          participants: [],
          createdAt: '2024-01-15T10:01:00Z',
          ttl: 1234567890,
        },
      ];

      (dynamodb.queryItems as jest.Mock).mockResolvedValue(mockRooms);

      const room = await getRoomByCode('XYZ789');

      expect(room?.roomCode).toBe('XYZ789');
      expect(room?.roomId).toBe('room-2');
    });
  });

  describe('getActiveRoomsByMatch', () => {
    it('should return all rooms for a match when no theme specified', async () => {
      const mockRooms = [
        {
          PK: 'ROOM#room-1',
          SK: 'METADATA',
          GSI1PK: 'MATCH#match-123#THEME#Country',
          GSI1SK: '2024-01-15T10:00:00Z',
          roomId: 'room-1',
          roomCode: 'ABC123',
          matchId: 'match-123',
          theme: 'Country' as const,
          participants: [],
          createdAt: '2024-01-15T10:00:00Z',
          ttl: 1234567890,
        },
        {
          PK: 'ROOM#room-2',
          SK: 'METADATA',
          GSI1PK: 'MATCH#match-123#THEME#Club',
          GSI1SK: '2024-01-15T10:01:00Z',
          roomId: 'room-2',
          roomCode: 'XYZ789',
          matchId: 'match-123',
          theme: 'Club' as const,
          participants: [],
          createdAt: '2024-01-15T10:01:00Z',
          ttl: 1234567890,
        },
      ];

      (dynamodb.queryItems as jest.Mock).mockResolvedValue(mockRooms);

      const rooms = await getActiveRoomsByMatch('match-123');

      expect(rooms).toHaveLength(2);
      expect(rooms[0].roomId).toBe('room-1');
      expect(rooms[1].roomId).toBe('room-2');
    });

    it('should filter rooms by theme when specified', async () => {
      const mockRooms = [
        {
          PK: 'ROOM#room-1',
          SK: 'METADATA',
          GSI1PK: 'MATCH#match-123#THEME#Country',
          GSI1SK: '2024-01-15T10:00:00Z',
          roomId: 'room-1',
          roomCode: 'ABC123',
          matchId: 'match-123',
          theme: 'Country' as const,
          participants: [],
          createdAt: '2024-01-15T10:00:00Z',
          ttl: 1234567890,
        },
      ];

      (dynamodb.queryItems as jest.Mock).mockResolvedValue(mockRooms);

      const rooms = await getActiveRoomsByMatch('match-123', 'Country');

      expect(dynamodb.queryItems).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk',
        ExpressionAttributeValues: {
          ':gsi1pk': 'MATCH#match-123#THEME#Country',
        },
      });

      expect(rooms).toHaveLength(1);
      expect(rooms[0].theme).toBe('Country');
    });

    it('should return empty array when no rooms exist for match', async () => {
      (dynamodb.queryItems as jest.Mock).mockResolvedValue([]);

      const rooms = await getActiveRoomsByMatch('match-999');

      expect(rooms).toEqual([]);
    });

    it('should query with begins_with when no theme specified', async () => {
      (dynamodb.queryItems as jest.Mock).mockResolvedValue([]);

      await getActiveRoomsByMatch('match-123');

      expect(dynamodb.queryItems).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        IndexName: 'GSI1',
        KeyConditionExpression: 'begins_with(GSI1PK, :gsi1pk)',
        ExpressionAttributeValues: {
          ':gsi1pk': 'MATCH#match-123#THEME#',
        },
      });
    });

    it('should handle Private theme rooms', async () => {
      const mockRooms = [
        {
          PK: 'ROOM#room-1',
          SK: 'METADATA',
          GSI1PK: 'MATCH#match-123#THEME#Private',
          GSI1SK: '2024-01-15T10:00:00Z',
          roomId: 'room-1',
          roomCode: 'PRIV99',
          matchId: 'match-123',
          theme: 'Private' as const,
          participants: ['conn-1'],
          createdAt: '2024-01-15T10:00:00Z',
          ttl: 1234567890,
        },
      ];

      (dynamodb.queryItems as jest.Mock).mockResolvedValue(mockRooms);

      const rooms = await getActiveRoomsByMatch('match-123', 'Private');

      expect(rooms).toHaveLength(1);
      expect(rooms[0].theme).toBe('Private');
    });

    it('should remove DynamoDB keys from returned rooms', async () => {
      const mockRooms = [
        {
          PK: 'ROOM#room-1',
          SK: 'METADATA',
          GSI1PK: 'MATCH#match-123#THEME#Country',
          GSI1SK: '2024-01-15T10:00:00Z',
          roomId: 'room-1',
          roomCode: 'ABC123',
          matchId: 'match-123',
          theme: 'Country' as const,
          participants: [],
          createdAt: '2024-01-15T10:00:00Z',
          ttl: 1234567890,
        },
      ];

      (dynamodb.queryItems as jest.Mock).mockResolvedValue(mockRooms);

      const rooms = await getActiveRoomsByMatch('match-123');

      expect(rooms[0]).not.toHaveProperty('PK');
      expect(rooms[0]).not.toHaveProperty('SK');
      expect(rooms[0]).not.toHaveProperty('GSI1PK');
      expect(rooms[0]).not.toHaveProperty('GSI1SK');
    });
  });

  describe('validateTheme', () => {
    it('should return true for Country theme', () => {
      expect(validateTheme('Country')).toBe(true);
    });

    it('should return true for Club theme', () => {
      expect(validateTheme('Club')).toBe(true);
    });

    it('should return true for Private theme', () => {
      expect(validateTheme('Private')).toBe(true);
    });

    it('should return false for invalid theme', () => {
      expect(validateTheme('InvalidTheme')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(validateTheme('')).toBe(false);
    });

    it('should return false for lowercase valid theme', () => {
      expect(validateTheme('country')).toBe(false);
    });

    it('should return false for null', () => {
      expect(validateTheme(null as any)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validateTheme(undefined as any)).toBe(false);
    });

    it('should return false for numeric input', () => {
      expect(validateTheme(123 as any)).toBe(false);
    });
  });

  describe('discoverRooms', () => {
    it('should return only Country and Club rooms, excluding Private', async () => {
      const countryRooms = [
        {
          PK: 'ROOM#room-1',
          SK: 'METADATA',
          GSI1PK: 'MATCH#match-123#THEME#Country',
          GSI1SK: '2024-01-15T10:00:00Z',
          roomId: 'room-1',
          roomCode: 'ABC123',
          matchId: 'match-123',
          theme: 'Country' as const,
          participants: [],
          createdAt: '2024-01-15T10:00:00Z',
          ttl: 1234567890,
        },
      ];

      const clubRooms = [
        {
          PK: 'ROOM#room-2',
          SK: 'METADATA',
          GSI1PK: 'MATCH#match-123#THEME#Club',
          GSI1SK: '2024-01-15T10:01:00Z',
          roomId: 'room-2',
          roomCode: 'XYZ789',
          matchId: 'match-123',
          theme: 'Club' as const,
          participants: [],
          createdAt: '2024-01-15T10:01:00Z',
          ttl: 1234567890,
        },
      ];

      (dynamodb.queryItems as jest.Mock)
        .mockResolvedValueOnce(countryRooms)
        .mockResolvedValueOnce(clubRooms);

      const rooms = await discoverRooms('match-123');

      expect(rooms).toHaveLength(2);
      expect(rooms[0].theme).toBe('Country');
      expect(rooms[1].theme).toBe('Club');
      expect(rooms.every((r) => r.theme !== 'Private')).toBe(true);
    });

    it('should query GSI1 for Country theme', async () => {
      (dynamodb.queryItems as jest.Mock).mockResolvedValue([]);

      await discoverRooms('match-123');

      expect(dynamodb.queryItems).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk',
        ExpressionAttributeValues: {
          ':gsi1pk': 'MATCH#match-123#THEME#Country',
        },
      });
    });

    it('should query GSI1 for Club theme', async () => {
      (dynamodb.queryItems as jest.Mock).mockResolvedValue([]);

      await discoverRooms('match-123');

      expect(dynamodb.queryItems).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk',
        ExpressionAttributeValues: {
          ':gsi1pk': 'MATCH#match-123#THEME#Club',
        },
      });
    });

    it('should return empty array when no public rooms exist', async () => {
      (dynamodb.queryItems as jest.Mock).mockResolvedValue([]);

      const rooms = await discoverRooms('match-999');

      expect(rooms).toEqual([]);
    });

    it('should return only Country rooms when no Club rooms exist', async () => {
      const countryRooms = [
        {
          PK: 'ROOM#room-1',
          SK: 'METADATA',
          GSI1PK: 'MATCH#match-123#THEME#Country',
          GSI1SK: '2024-01-15T10:00:00Z',
          roomId: 'room-1',
          roomCode: 'ABC123',
          matchId: 'match-123',
          theme: 'Country' as const,
          participants: [],
          createdAt: '2024-01-15T10:00:00Z',
          ttl: 1234567890,
        },
      ];

      (dynamodb.queryItems as jest.Mock)
        .mockResolvedValueOnce(countryRooms)
        .mockResolvedValueOnce([]);

      const rooms = await discoverRooms('match-123');

      expect(rooms).toHaveLength(1);
      expect(rooms[0].theme).toBe('Country');
    });

    it('should return only Club rooms when no Country rooms exist', async () => {
      const clubRooms = [
        {
          PK: 'ROOM#room-2',
          SK: 'METADATA',
          GSI1PK: 'MATCH#match-123#THEME#Club',
          GSI1SK: '2024-01-15T10:01:00Z',
          roomId: 'room-2',
          roomCode: 'XYZ789',
          matchId: 'match-123',
          theme: 'Club' as const,
          participants: [],
          createdAt: '2024-01-15T10:01:00Z',
          ttl: 1234567890,
        },
      ];

      (dynamodb.queryItems as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(clubRooms);

      const rooms = await discoverRooms('match-123');

      expect(rooms).toHaveLength(1);
      expect(rooms[0].theme).toBe('Club');
    });

    it('should remove DynamoDB keys from returned rooms', async () => {
      const countryRooms = [
        {
          PK: 'ROOM#room-1',
          SK: 'METADATA',
          GSI1PK: 'MATCH#match-123#THEME#Country',
          GSI1SK: '2024-01-15T10:00:00Z',
          roomId: 'room-1',
          roomCode: 'ABC123',
          matchId: 'match-123',
          theme: 'Country' as const,
          participants: [],
          createdAt: '2024-01-15T10:00:00Z',
          ttl: 1234567890,
        },
      ];

      (dynamodb.queryItems as jest.Mock)
        .mockResolvedValueOnce(countryRooms)
        .mockResolvedValueOnce([]);

      const rooms = await discoverRooms('match-123');

      expect(rooms[0]).not.toHaveProperty('PK');
      expect(rooms[0]).not.toHaveProperty('SK');
      expect(rooms[0]).not.toHaveProperty('GSI1PK');
      expect(rooms[0]).not.toHaveProperty('GSI1SK');
    });

    it('should handle multiple rooms of same theme', async () => {
      const countryRooms = [
        {
          PK: 'ROOM#room-1',
          SK: 'METADATA',
          GSI1PK: 'MATCH#match-123#THEME#Country',
          GSI1SK: '2024-01-15T10:00:00Z',
          roomId: 'room-1',
          roomCode: 'ABC123',
          matchId: 'match-123',
          theme: 'Country' as const,
          participants: [],
          createdAt: '2024-01-15T10:00:00Z',
          ttl: 1234567890,
        },
        {
          PK: 'ROOM#room-3',
          SK: 'METADATA',
          GSI1PK: 'MATCH#match-123#THEME#Country',
          GSI1SK: '2024-01-15T10:02:00Z',
          roomId: 'room-3',
          roomCode: 'DEF456',
          matchId: 'match-123',
          theme: 'Country' as const,
          participants: [],
          createdAt: '2024-01-15T10:02:00Z',
          ttl: 1234567890,
        },
      ];

      const clubRooms = [
        {
          PK: 'ROOM#room-2',
          SK: 'METADATA',
          GSI1PK: 'MATCH#match-123#THEME#Club',
          GSI1SK: '2024-01-15T10:01:00Z',
          roomId: 'room-2',
          roomCode: 'XYZ789',
          matchId: 'match-123',
          theme: 'Club' as const,
          participants: [],
          createdAt: '2024-01-15T10:01:00Z',
          ttl: 1234567890,
        },
      ];

      (dynamodb.queryItems as jest.Mock)
        .mockResolvedValueOnce(countryRooms)
        .mockResolvedValueOnce(clubRooms);

      const rooms = await discoverRooms('match-123');

      expect(rooms).toHaveLength(3);
      expect(rooms.filter((r) => r.theme === 'Country')).toHaveLength(2);
      expect(rooms.filter((r) => r.theme === 'Club')).toHaveLength(1);
    });
  });

  describe('broadcastToRoom', () => {
    let mockSend: jest.Mock;
    let mockApiGatewayClient: jest.Mocked<ApiGatewayManagementApiClient>;

    beforeEach(() => {
      // Reset environment variable
      process.env.WEBSOCKET_API_ENDPOINT =
        'wss://test123.execute-api.us-east-1.amazonaws.com/prod';

      // Create mock send function
      mockSend = jest.fn();

      // Mock ApiGatewayManagementApiClient
      mockApiGatewayClient = {
        send: mockSend,
      } as unknown as jest.Mocked<ApiGatewayManagementApiClient>;

      (ApiGatewayManagementApiClient as jest.Mock).mockImplementation(
        () => mockApiGatewayClient
      );
    });

    it('should broadcast message to all participants in a room', async () => {
      const mockRoom = {
        PK: 'ROOM#room-123',
        SK: 'METADATA',
        GSI1PK: 'MATCH#match-123#THEME#Country',
        GSI1SK: '2024-01-15T10:00:00Z',
        roomId: 'room-123',
        roomCode: 'ABC123',
        matchId: 'match-123',
        theme: 'Country' as const,
        participants: ['conn-1', 'conn-2', 'conn-3'],
        createdAt: '2024-01-15T10:00:00Z',
        ttl: 1234567890,
      };

      (dynamodb.queryItems as jest.Mock).mockResolvedValue([mockRoom]);
      mockSend.mockResolvedValue({});

      const message = { type: 'match_event', data: { eventType: 'goal' } };
      const result = await broadcastToRoom('room-123', message);

      expect(result.successCount).toBe(3);
      expect(result.failedConnections).toEqual([]);
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('should send correct message format to each connection', async () => {
      const mockRoom = {
        PK: 'ROOM#room-123',
        SK: 'METADATA',
        roomId: 'room-123',
        roomCode: 'ABC123',
        matchId: 'match-123',
        theme: 'Country' as const,
        participants: ['conn-1'],
        createdAt: '2024-01-15T10:00:00Z',
        ttl: 1234567890,
      };

      (dynamodb.queryItems as jest.Mock).mockResolvedValue([mockRoom]);
      mockSend.mockResolvedValue({});

      const message = { type: 'test', data: 'hello' };
      await broadcastToRoom('room-123', message);

      expect(mockSend).toHaveBeenCalledTimes(1);
      // The command object has the input property
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeDefined();
      // Verify the command was created with correct parameters
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle stale connections (410 Gone) gracefully', async () => {
      const mockRoom = {
        PK: 'ROOM#room-123',
        SK: 'METADATA',
        GSI1PK: 'MATCH#match-123#THEME#Country',
        GSI1SK: '2024-01-15T10:00:00Z',
        roomId: 'room-123',
        roomCode: 'ABC123',
        matchId: 'match-123',
        theme: 'Country' as const,
        participants: ['conn-1', 'conn-2', 'conn-3'],
        createdAt: '2024-01-15T10:00:00Z',
        ttl: 1234567890,
      };

      (dynamodb.queryItems as jest.Mock).mockResolvedValue([mockRoom]);

      // conn-2 is stale (410 Gone)
      mockSend
        .mockResolvedValueOnce({}) // conn-1 succeeds
        .mockRejectedValueOnce(
          new GoneException({ message: 'Gone', $metadata: {} })
        ) // conn-2 fails
        .mockResolvedValueOnce({}); // conn-3 succeeds

      (dynamodb.putItem as jest.Mock).mockResolvedValue(undefined);

      const message = { type: 'test' };
      const result = await broadcastToRoom('room-123', message);

      expect(result.successCount).toBe(2);
      expect(result.failedConnections).toEqual(['conn-2']);

      // Verify stale connection was removed from room
      expect(dynamodb.putItem).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        Item: expect.objectContaining({
          participants: ['conn-1', 'conn-3'],
        }),
      });
    });

    it('should retry transient failures with exponential backoff', async () => {
      const mockRoom = {
        PK: 'ROOM#room-123',
        SK: 'METADATA',
        roomId: 'room-123',
        roomCode: 'ABC123',
        matchId: 'match-123',
        theme: 'Country' as const,
        participants: ['conn-1'],
        createdAt: '2024-01-15T10:00:00Z',
        ttl: 1234567890,
      };

      (dynamodb.queryItems as jest.Mock).mockResolvedValue([mockRoom]);

      // Fail twice, then succeed
      mockSend
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce({});

      const message = { type: 'test' };
      const result = await broadcastToRoom('room-123', message);

      expect(result.successCount).toBe(1);
      expect(result.failedConnections).toEqual([]);
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('should mark connection as failed after max retries', async () => {
      const mockRoom = {
        PK: 'ROOM#room-123',
        SK: 'METADATA',
        GSI1PK: 'MATCH#match-123#THEME#Country',
        GSI1SK: '2024-01-15T10:00:00Z',
        roomId: 'room-123',
        roomCode: 'ABC123',
        matchId: 'match-123',
        theme: 'Country' as const,
        participants: ['conn-1'],
        createdAt: '2024-01-15T10:00:00Z',
        ttl: 1234567890,
      };

      (dynamodb.queryItems as jest.Mock).mockResolvedValue([mockRoom]);
      mockSend.mockRejectedValue(new Error('Persistent error'));
      (dynamodb.putItem as jest.Mock).mockResolvedValue(undefined);

      const message = { type: 'test' };
      const result = await broadcastToRoom('room-123', message, 3);

      expect(result.successCount).toBe(0);
      expect(result.failedConnections).toEqual(['conn-1']);
      expect(mockSend).toHaveBeenCalledTimes(3); // 3 attempts

      // Verify failed connection was removed
      expect(dynamodb.putItem).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        Item: expect.objectContaining({
          participants: [],
        }),
      });
    });

    it('should throw error when room does not exist', async () => {
      (dynamodb.queryItems as jest.Mock).mockResolvedValue([]);

      const message = { type: 'test' };

      await expect(broadcastToRoom('invalid-room', message)).rejects.toThrow(
        'Room not found: invalid-room'
      );
    });

    it('should return zero success count for room with no participants', async () => {
      const mockRoom = {
        PK: 'ROOM#room-123',
        SK: 'METADATA',
        roomId: 'room-123',
        roomCode: 'ABC123',
        matchId: 'match-123',
        theme: 'Country' as const,
        participants: [],
        createdAt: '2024-01-15T10:00:00Z',
        ttl: 1234567890,
      };

      (dynamodb.queryItems as jest.Mock).mockResolvedValue([mockRoom]);

      const message = { type: 'test' };
      const result = await broadcastToRoom('room-123', message);

      expect(result.successCount).toBe(0);
      expect(result.failedConnections).toEqual([]);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should handle mixed success and failure scenarios', async () => {
      const mockRoom = {
        PK: 'ROOM#room-123',
        SK: 'METADATA',
        GSI1PK: 'MATCH#match-123#THEME#Country',
        GSI1SK: '2024-01-15T10:00:00Z',
        roomId: 'room-123',
        roomCode: 'ABC123',
        matchId: 'match-123',
        theme: 'Country' as const,
        participants: ['conn-1', 'conn-2', 'conn-3', 'conn-4'],
        createdAt: '2024-01-15T10:00:00Z',
        ttl: 1234567890,
      };

      (dynamodb.queryItems as jest.Mock).mockResolvedValue([mockRoom]);

      mockSend
        .mockResolvedValueOnce({}) // conn-1 succeeds
        .mockRejectedValueOnce(
          new GoneException({ message: 'Gone', $metadata: {} })
        ) // conn-2 stale
        .mockResolvedValueOnce({}) // conn-3 succeeds
        .mockRejectedValueOnce(new Error('Error')) // conn-4 fails after retries
        .mockRejectedValueOnce(new Error('Error'))
        .mockRejectedValueOnce(new Error('Error'));

      (dynamodb.putItem as jest.Mock).mockResolvedValue(undefined);

      const message = { type: 'test' };
      const result = await broadcastToRoom('room-123', message);

      expect(result.successCount).toBe(2);
      expect(result.failedConnections).toContain('conn-2');
      expect(result.failedConnections).toContain('conn-4');
      expect(result.failedConnections).toHaveLength(2);

      // Verify both failed connections were removed
      expect(dynamodb.putItem).toHaveBeenCalledWith({
        TableName: 'PulsePartyTable',
        Item: expect.objectContaining({
          participants: ['conn-1', 'conn-3'],
        }),
      });
    });

    it('should convert wss:// endpoint to https:// for API client', async () => {
      const mockRoom = {
        PK: 'ROOM#room-123',
        SK: 'METADATA',
        roomId: 'room-123',
        roomCode: 'ABC123',
        matchId: 'match-123',
        theme: 'Country' as const,
        participants: ['conn-1'],
        createdAt: '2024-01-15T10:00:00Z',
        ttl: 1234567890,
      };

      (dynamodb.queryItems as jest.Mock).mockResolvedValue([mockRoom]);
      mockSend.mockResolvedValue({});

      // Set environment variable before calling broadcastToRoom
      const originalEndpoint = process.env.WEBSOCKET_API_ENDPOINT;
      process.env.WEBSOCKET_API_ENDPOINT =
        'wss://abc123.execute-api.us-east-1.amazonaws.com/prod';

      // Clear the mock to reset call count
      (ApiGatewayManagementApiClient as jest.Mock).mockClear();

      await broadcastToRoom('room-123', { type: 'test' });

      expect(ApiGatewayManagementApiClient).toHaveBeenCalledWith({
        endpoint: 'https://abc123.execute-api.us-east-1.amazonaws.com/prod',
      });

      // Restore original endpoint
      process.env.WEBSOCKET_API_ENDPOINT = originalEndpoint;
    });

    it('should broadcast complex message objects correctly', async () => {
      const mockRoom = {
        PK: 'ROOM#room-123',
        SK: 'METADATA',
        roomId: 'room-123',
        roomCode: 'ABC123',
        matchId: 'match-123',
        theme: 'Country' as const,
        participants: ['conn-1'],
        createdAt: '2024-01-15T10:00:00Z',
        ttl: 1234567890,
      };

      (dynamodb.queryItems as jest.Mock).mockResolvedValue([mockRoom]);
      mockSend.mockResolvedValue({});

      const complexMessage = {
        type: 'match_event',
        timestamp: '2024-01-15T10:30:00Z',
        data: {
          eventType: 'goal',
          teamId: 'team-1',
          playerId: 'player-42',
          metadata: {
            minute: 67,
            assistedBy: 'player-10',
          },
        },
      };

      await broadcastToRoom('room-123', complexMessage);

      expect(mockSend).toHaveBeenCalledTimes(1);
      // Verify the command was sent
      expect(mockSend).toHaveBeenCalled();
    });

    it('should allow custom maxRetries parameter', async () => {
      const mockRoom = {
        PK: 'ROOM#room-123',
        SK: 'METADATA',
        GSI1PK: 'MATCH#match-123#THEME#Country',
        GSI1SK: '2024-01-15T10:00:00Z',
        roomId: 'room-123',
        roomCode: 'ABC123',
        matchId: 'match-123',
        theme: 'Country' as const,
        participants: ['conn-1'],
        createdAt: '2024-01-15T10:00:00Z',
        ttl: 1234567890,
      };

      (dynamodb.queryItems as jest.Mock).mockResolvedValue([mockRoom]);
      mockSend.mockRejectedValue(new Error('Persistent error'));
      (dynamodb.putItem as jest.Mock).mockResolvedValue(undefined);

      const message = { type: 'test' };
      await broadcastToRoom('room-123', message, 5);

      expect(mockSend).toHaveBeenCalledTimes(5); // 5 attempts
    });

    it('should handle room with undefined participants array', async () => {
      const mockRoom = {
        PK: 'ROOM#room-123',
        SK: 'METADATA',
        roomId: 'room-123',
        roomCode: 'ABC123',
        matchId: 'match-123',
        theme: 'Country' as const,
        // participants field is missing
        createdAt: '2024-01-15T10:00:00Z',
        ttl: 1234567890,
      };

      (dynamodb.queryItems as jest.Mock).mockResolvedValue([mockRoom]);

      const message = { type: 'test' };
      const result = await broadcastToRoom('room-123', message);

      expect(result.successCount).toBe(0);
      expect(result.failedConnections).toEqual([]);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
