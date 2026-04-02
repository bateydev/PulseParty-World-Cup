import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getItem, deleteItem, putItem } from '../utils/dynamodb';

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

/**
 * WebSocket $disconnect handler
 * Removes connection from DynamoDB and broadcasts updated participant list to room
 * Requirements: 9.5, 9.7
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

  console.log('WebSocket disconnection request:', { connectionId });

  try {
    // Get connection entity to find associated room
    const connection = await getItem<ConnectionEntity>({
      TableName: getTableName(),
      Key: {
        PK: `CONNECTION#${connectionId}`,
        SK: 'METADATA',
      },
    });

    if (!connection) {
      console.warn('Connection not found in database:', connectionId);
      // Still return success - connection might have already been cleaned up
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Disconnected' }),
      };
    }

    const { roomId, userId } = connection;

    // Remove connection from DynamoDB
    await deleteItem({
      TableName: getTableName(),
      Key: {
        PK: `CONNECTION#${connectionId}`,
        SK: 'METADATA',
      },
    });

    console.log('Connection removed from database:', { connectionId, userId });

    // If connection was in a room, update room participants and broadcast
    if (roomId) {
      await removeConnectionFromRoom(roomId, connectionId);
      await broadcastParticipantUpdate(roomId, connectionId);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Disconnected' }),
    };
  } catch (error) {
    console.error('Error handling disconnection:', error);
    // Return success even on error - disconnection should always succeed
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Disconnected' }),
    };
  }
}

/**
 * Remove connection from room participants list
 */
async function removeConnectionFromRoom(
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
      console.warn('Room not found when removing connection:', roomId);
      return;
    }

    // Remove connection from participants
    const updatedParticipants = room.participants.filter(
      (id) => id !== connectionId
    );

    // Update room with new participants list
    await putItem({
      TableName: getTableName(),
      Item: {
        ...room,
        participants: updatedParticipants,
      },
    });

    console.log('Connection removed from room:', {
      roomId,
      connectionId,
      remainingParticipants: updatedParticipants.length,
    });
  } catch (error) {
    console.error('Error removing connection from room:', error);
    throw error;
  }
}

/**
 * Broadcast updated participant list to all remaining users in the room
 * Requirement 9.5: Broadcast updated participant list when user leaves
 */
async function broadcastParticipantUpdate(
  roomId: string,
  disconnectedConnectionId: string
): Promise<void> {
  try {
    // Get updated room state
    const room = await getItem<RoomEntity>({
      TableName: getTableName(),
      Key: {
        PK: `ROOM#${roomId}`,
        SK: 'METADATA',
      },
    });

    if (!room) {
      console.warn('Room not found for participant broadcast:', roomId);
      return;
    }

    // Get all remaining connections with user info
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

    // Prepare broadcast message
    const message = {
      type: 'participantUpdate',
      payload: {
        roomId: room.PK.replace('ROOM#', ''),
        participants,
        action: 'leave',
        disconnectedConnectionId,
      },
    };

    // Broadcast to all remaining participants
    await broadcastToConnections(room.participants, message);

    console.log('Participant update broadcast sent:', {
      roomId,
      remainingParticipants: participants.length,
    });
  } catch (error) {
    console.error('Error broadcasting participant update:', error);
    // Don't throw - disconnection should succeed even if broadcast fails
  }
}

/**
 * Broadcast message to multiple WebSocket connections
 */
async function broadcastToConnections(
  connectionIds: string[],
  message: unknown
): Promise<void> {
  if (connectionIds.length === 0) {
    return;
  }

  try {
    const { ApiGatewayManagementApiClient, PostToConnectionCommand } =
      await import('@aws-sdk/client-apigatewaymanagementapi');

    const endpoint = getWebSocketEndpoint().replace('wss://', 'https://') || '';

    if (!endpoint) {
      console.error('WEBSOCKET_API_ENDPOINT not configured');
      return;
    }

    const client = new ApiGatewayManagementApiClient({
      endpoint,
    });

    const messageData = Buffer.from(JSON.stringify(message));

    // Send to all connections in parallel
    const sendPromises = connectionIds.map(async (connectionId) => {
      try {
        const command = new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: messageData,
        });

        await client.send(command);
        console.log('Message sent to connection:', connectionId);
      } catch (error: any) {
        // Handle stale connections (410 Gone or 403 Forbidden)
        if (error.statusCode === 410 || error.statusCode === 403) {
          console.warn('Stale connection detected, will be cleaned up:', {
            connectionId,
            statusCode: error.statusCode,
          });
          // Note: Connection cleanup will happen on next heartbeat timeout
        } else {
          console.error('Error sending to connection:', {
            connectionId,
            error,
          });
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (error) {
    console.error('Error broadcasting to connections:', error);
  }
}
