import { putItem, queryItems } from '../utils/dynamodb';
import { Room } from '../types';
import { randomBytes } from 'crypto';

const TABLE_NAME = process.env.TABLE_NAME || 'PulsePartyTable';

/**
 * Generate a unique 6-character alphanumeric room code
 * Uses uppercase letters and numbers for easy readability
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars (I/1, O/0)
  const bytes = randomBytes(6);
  let code = '';

  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }

  return code;
}

/**
 * Create a new room with unique room code
 * Requirements: 1.1, 1.3, 1.4, 12.3
 *
 * @param matchId - The match identifier from the event feed
 * @param theme - Room theme: Country, Club, or Private
 * @param ttlDays - Days until room expires (default: 7)
 * @returns Created room object
 */
export async function createRoom(
  matchId: string,
  theme: 'Country' | 'Club' | 'Private',
  ttlDays: number = 7
): Promise<Room> {
  // Generate unique room ID and code
  const roomId = `room-${Date.now()}-${randomBytes(4).toString('hex')}`;
  const roomCode = generateRoomCode();
  const createdAt = new Date().toISOString();

  // Calculate TTL (7 days from now by default)
  const ttl = Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60;

  const room: Room = {
    roomId,
    roomCode,
    matchId,
    theme,
    participants: [],
    createdAt,
    ttl,
  };

  // Store room in DynamoDB
  // PK: ROOM#{roomId}, SK: METADATA
  // GSI1PK: MATCH#{matchId}#THEME#{theme}, GSI1SK: createdAt
  await putItem({
    TableName: TABLE_NAME,
    Item: {
      PK: `ROOM#${roomId}`,
      SK: 'METADATA',
      GSI1PK: `MATCH#${matchId}#THEME#${theme}`,
      GSI1SK: createdAt,
      ...room,
    },
  });

  return room;
}

/**
 * Get room by room code
 * Requirements: 1.4, 1.5
 *
 * @param roomCode - The unique room code
 * @returns Room object or null if not found
 */
export async function getRoomByCode(roomCode: string): Promise<Room | null> {
  // Since we don't have a GSI on roomCode, we need to scan or maintain a separate index
  // For now, we'll use a query pattern with a GSI2 (to be added) or scan
  // In production, add GSI2 with roomCode as partition key

  // Temporary implementation: Query all rooms and filter by code
  // This is inefficient but works for hackathon scope
  // TODO: Add GSI2 on roomCode for production

  const items = await queryItems<Room & { PK: string; SK: string }>({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'begins_with(GSI1PK, :prefix)',
    ExpressionAttributeValues: {
      ':prefix': 'MATCH#',
    },
  });

  // Filter by room code
  const room = items.find((item) => item.roomCode === roomCode);

  if (!room) {
    return null;
  }

  // Return room without DynamoDB keys
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, GSI1PK, GSI1SK, ...roomData } = room as Room & {
    PK: string;
    SK: string;
    GSI1PK: string;
    GSI1SK: string;
  };
  return roomData as Room;
}

/**
 * Get all active rooms for a specific match
 * Requirements: 1.3, 12.3
 *
 * @param matchId - The match identifier
 * @param theme - Optional theme filter
 * @returns Array of active rooms
 */
export async function getActiveRoomsByMatch(
  matchId: string,
  theme?: 'Country' | 'Club' | 'Private'
): Promise<Room[]> {
  let gsi1pk: string;

  if (theme) {
    // Query specific theme
    gsi1pk = `MATCH#${matchId}#THEME#${theme}`;
  } else {
    // Query all themes for this match
    gsi1pk = `MATCH#${matchId}#THEME#`;
  }

  const items = await queryItems<Room & { PK: string; SK: string }>({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: theme
      ? 'GSI1PK = :gsi1pk'
      : 'begins_with(GSI1PK, :gsi1pk)',
    ExpressionAttributeValues: {
      ':gsi1pk': gsi1pk,
    },
  });

  // Remove DynamoDB keys from results
  return items.map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { PK, SK, GSI1PK, GSI1SK, ...roomData } = item as Room & {
      PK: string;
      SK: string;
      GSI1PK: string;
      GSI1SK: string;
    };
    return roomData as Room;
  });
}

/**
 * Validate that a theme is one of the allowed values
 * Requirements: 1.2
 *
 * @param theme - The theme to validate
 * @returns true if valid, false otherwise
 */
export function validateTheme(theme: string): theme is 'Country' | 'Club' | 'Private' {
  return theme === 'Country' || theme === 'Club' || theme === 'Private';
}

/**
 * Discover public rooms for a specific match
 * Returns only Country and Club themed rooms (excludes Private rooms)
 * Requirements: 1.7, 1.8
 *
 * @param matchId - The match identifier
 * @returns Array of public rooms (Country and Club themes only)
 */
export async function discoverRooms(matchId: string): Promise<Room[]> {
  // Query for Country rooms
  const countryRooms = await queryItems<Room & { PK: string; SK: string }>({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: {
      ':gsi1pk': `MATCH#${matchId}#THEME#Country`,
    },
  });

  // Query for Club rooms
  const clubRooms = await queryItems<Room & { PK: string; SK: string }>({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: {
      ':gsi1pk': `MATCH#${matchId}#THEME#Club`,
    },
  });

  // Combine results and remove DynamoDB keys
  const allPublicRooms = [...countryRooms, ...clubRooms];

  return allPublicRooms.map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { PK, SK, GSI1PK, GSI1SK, ...roomData } = item as Room & {
      PK: string;
      SK: string;
      GSI1PK: string;
      GSI1SK: string;
    };
    return roomData as Room;
  });
}
