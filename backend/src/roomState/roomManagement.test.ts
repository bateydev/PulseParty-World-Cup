import {
  generateRoomCode,
  createRoom,
  getRoomByCode,
  getActiveRoomsByMatch,
  validateTheme,
  discoverRooms,
} from './roomManagement';
import * as dynamodb from '../utils/dynamodb';

// Mock DynamoDB utilities
jest.mock('../utils/dynamodb');

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
});
