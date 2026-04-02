import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { putItem, getItem, queryItems } from '../utils/dynamodb';

const getTableName = () => process.env.TABLE_NAME || '';
const getWebSocketEndpoint = () => process.env.WEBSOCKET_API_ENDPOINT || '';

interface ConnectionEntity {
  PK: string; // CONNECTION#{connectionId}
  SK: string; // METADATA
  userId: string;
  roomId?: string;
  connectedAt: string;
  lastHeartbeat: string;
}

interface RoomEntity {
  PK: string; // ROOM#{roomId}
  SK: string; // METADATA
  roomCode: string;
  matchId: string;
  theme: 'Country' | 'Club' | 'Private';
  participants: string[]; // connection IDs
  createdAt: string;
  ttl: number;
}

interface ScoreEntity {
  PK: string; // ROOM#{roomId}
  SK: string; // SCORE#{userId}
  userId: string;
  totalPoints: number;
  streak: number;
  clutchMoments: number;
  correctPredictions: number;
  totalPredictions: number;
  rank: number;
  updatedAt: string;
}

interface RoomState {
  room: RoomEntity;
  participants: Array<{ userId: string; connectionId: string }>;
  leaderboard: ScoreEntity[];
  currentScore: { home: number; away: number };
}

/**
 * WebSocket $connect handler
 * Stores connection ID in DynamoDB and sends current room state if joining existing room
 * Requirements: 9.1, 9.2
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const connectionId = event.requestContext.connectionId;

  if (!connectionId) {
    console.error('No connectionId in event context');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing connectionId' }),
    };
  }

  console.log('WebSocket connection request:', {
    connectionId,
    queryParams: event.queryStringParameters,
  });

  try {
    // Extract query parameters
    const userId =
      event.queryStringParameters?.userId || `guest-${Date.now()}`;
    const roomId = event.queryStringParameters?.roomId;

    // Store connection entity in DynamoDB
    const connectionEntity: ConnectionEntity = {
      PK: `CONNECTION#${connectionId}`,
      SK: 'METADATA',
      userId,
      roomId,
      connectedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
    };

    await putItem({
      TableName: getTableName(),
      Item: connectionEntity,
    });

    console.log('Connection stored:', connectionEntity);

    // If joining existing room, send current room state
    if (roomId) {
      const roomState = await getCurrentRoomState(roomId);

      if (roomState) {
        // Add connection to room participants
        await addConnectionToRoom(roomId, connectionId);

        // Send room state to the new connection
        await sendRoomState(connectionId, roomState);

        console.log('Room state sent to connection:', {
          connectionId,
          roomId,
        });
      } else {
        console.warn('Room not found:', roomId);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Connected', connectionId }),
    };
  } catch (error) {
    console.error('Error handling connection:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to establish connection' }),
    };
  }
}

/**
 * Get current room state including active users, current score, and leaderboard
 */
async function getCurrentRoomState(
  roomId: string
): Promise<RoomState | null> {
  try {
    // Get room entity
    const room = await getItem<RoomEntity>({
      TableName: getTableName(),
      Key: {
        PK: `ROOM#${roomId}`,
        SK: 'METADATA',
      },
      ConsistentRead: true, // Strong consistency for room state
    });

    if (!room) {
      return null;
    }

    // Get all connections for participants
    const participants: Array<{ userId: string; connectionId: string }> = [];
    for (const connectionId of room.participants) {
      const connection = await getItem<ConnectionEntity>({
        TableName: getTableName(),
        Key: {
          PK: `CONNECTION#${connectionId}`,
          SK: 'METADATA',
        },
      });

      if (connection) {
        participants.push({
          userId: connection.userId,
          connectionId,
        });
      }
    }

    // Get leaderboard (all scores for the room)
    const leaderboard = await queryItems<ScoreEntity>({
      TableName: getTableName(),
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `ROOM#${roomId}`,
        ':sk': 'SCORE#',
      },
      ConsistentRead: true, // Strong consistency for leaderboard
    });

    // Sort leaderboard by total points (descending)
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    // Get current match score (placeholder - will be implemented with match state)
    const currentScore = { home: 0, away: 0 };

    return {
      room,
      participants,
      leaderboard,
      currentScore,
    };
  } catch (error) {
    console.error('Error getting room state:', error);
    return null;
  }
}

/**
 * Add connection to room participants list
 */
async function addConnectionToRoom(
  roomId: string,
  connectionId: string
): Promise<void> {
  try {
    // Get current room
    const room = await getItem<RoomEntity>({
      TableName: getTableName(),
      Key: {
        PK: `ROOM#${roomId}`,
        SK: 'METADATA',
      },
      ConsistentRead: true,
    });

    if (!room) {
      console.warn('Room not found when adding connection:', roomId);
      return;
    }

    // Add connection if not already in participants
    if (!room.participants.includes(connectionId)) {
      await putItem({
        TableName: getTableName(),
        Item: {
          ...room,
          participants: [...room.participants, connectionId],
        },
      });

      console.log('Connection added to room:', { roomId, connectionId });
    }
  } catch (error) {
    console.error('Error adding connection to room:', error);
    throw error;
  }
}

/**
 * Send room state to connection via WebSocket
 */
async function sendRoomState(
  connectionId: string,
  roomState: RoomState
): Promise<void> {
  try {
    const { ApiGatewayManagementApiClient, PostToConnectionCommand } =
      await import('@aws-sdk/client-apigatewaymanagementapi');

    // Extract WebSocket endpoint from environment or construct it
    const endpoint = getWebSocketEndpoint().replace('wss://', 'https://') || '';

    if (!endpoint) {
      console.error('WEBSOCKET_API_ENDPOINT not configured');
      return;
    }

    const client = new ApiGatewayManagementApiClient({
      endpoint,
    });

    const message = {
      type: 'roomState',
      payload: {
        room: {
          roomId: roomState.room.PK.replace('ROOM#', ''),
          roomCode: roomState.room.roomCode,
          matchId: roomState.room.matchId,
          theme: roomState.room.theme,
        },
        participants: roomState.participants,
        leaderboard: roomState.leaderboard.map((score) => ({
          userId: score.userId,
          totalPoints: score.totalPoints,
          streak: score.streak,
          clutchMoments: score.clutchMoments,
          correctPredictions: score.correctPredictions,
          totalPredictions: score.totalPredictions,
          rank: score.rank,
        })),
        currentScore: roomState.currentScore,
      },
    };

    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(message)),
    });

    await client.send(command);

    console.log('Room state sent successfully:', { connectionId });
  } catch (error) {
    console.error('Error sending room state:', error);
    // Don't throw - connection might be stale, will be cleaned up later
  }
}
