import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getItem, putItem, updateItem } from '../utils/dynamodb';
import { WebSocketMessage } from '../types';
import { createRoom, getRoomByCode } from '../roomState/roomManagement';
import { submitPrediction as submitPredictionToEngine } from '../momentEngine/predictionSubmission';

const getTableName = () => process.env.TABLE_NAME || '';

interface ConnectionEntity {
  PK: string; // CONNECTION#{connectionId}
  SK: string; // METADATA
  userId: string;
  roomId?: string;
  connectedAt: string;
  lastHeartbeat: string;
  messageCount?: number;
  lastMessageWindow?: number; // Unix timestamp in seconds
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

// Rate limiting: 100 messages per second per connection
const MAX_MESSAGES_PER_SECOND = 100;

/**
 * WebSocket message handler
 * Routes incoming messages to appropriate action handlers
 * Implements rate limiting (100 messages/second per connection)
 * Requirements: 9.8
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

  try {
    // Parse message body
    const body = event.body;
    if (!body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing message body' }),
      };
    }

    let message: WebSocketMessage;
    try {
      message = JSON.parse(body);
    } catch (error) {
      console.error('Failed to parse message body:', error);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in message body' }),
      };
    }

    // Validate message structure
    if (!message.action || !message.payload) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Message must contain action and payload fields',
        }),
      };
    }

    // Check rate limiting
    const rateLimitResult = await checkRateLimit(connectionId);
    if (!rateLimitResult.allowed) {
      console.warn('Rate limit exceeded for connection:', connectionId);
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        }),
      };
    }

    // Route to appropriate action handler
    console.log('Processing message:', {
      connectionId,
      action: message.action,
    });

    let result: {
      type: string;
      [key: string]: unknown;
    };

    switch (message.action) {
      case 'createRoom':
        result = await handleCreateRoom(connectionId, message.payload);
        break;

      case 'joinRoom':
        result = await handleJoinRoom(connectionId, message.payload);
        break;

      case 'submitPrediction':
        result = await handleSubmitPrediction(connectionId, message.payload);
        break;

      case 'leaveRoom':
        result = await handleLeaveRoom(connectionId);
        break;

      case 'heartbeat':
        result = await handleHeartbeat(connectionId);
        break;

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: `Unknown action: ${message.action}`,
          }),
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error handling message:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

/**
 * Check rate limiting for a connection
 * Implements sliding window rate limiting: 100 messages per second
 * Requirements: 9.8
 */
async function checkRateLimit(
  connectionId: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    // Get connection entity
    const connection = await getItem<ConnectionEntity>({
      TableName: getTableName(),
      Key: {
        PK: `CONNECTION#${connectionId}`,
        SK: 'METADATA',
      },
    });

    if (!connection) {
      // Connection not found - allow but log warning
      console.warn('Connection not found for rate limiting:', connectionId);
      return { allowed: true };
    }

    const currentWindow = Math.floor(Date.now() / 1000); // Current second
    const lastWindow = connection.lastMessageWindow || 0;
    const messageCount = connection.messageCount || 0;

    // If we're in a new time window, reset the counter
    if (currentWindow > lastWindow) {
      await updateItem({
        TableName: getTableName(),
        Key: {
          PK: `CONNECTION#${connectionId}`,
          SK: 'METADATA',
        },
        UpdateExpression:
          'SET messageCount = :one, lastMessageWindow = :currentWindow',
        ExpressionAttributeValues: {
          ':one': 1,
          ':currentWindow': currentWindow,
        },
      });

      return { allowed: true };
    }

    // Same time window - check if limit exceeded
    if (messageCount >= MAX_MESSAGES_PER_SECOND) {
      return {
        allowed: false,
        retryAfter: 1, // Retry after 1 second
      };
    }

    // Increment message count
    await updateItem({
      TableName: getTableName(),
      Key: {
        PK: `CONNECTION#${connectionId}`,
        SK: 'METADATA',
      },
      UpdateExpression: 'SET messageCount = messageCount + :one',
      ExpressionAttributeValues: {
        ':one': 1,
      },
    });

    return { allowed: true };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // On error, allow the message to avoid blocking legitimate traffic
    return { allowed: true };
  }
}

/**
 * Handle createRoom action
 * Creates a new room with specified theme and match ID
 */
async function handleCreateRoom(
  connectionId: string,
  payload: Record<string, unknown>
): Promise<{ type: string; room: Record<string, unknown> }> {
  const { matchId, theme } = payload;

  if (!matchId || !theme) {
    throw new Error('matchId and theme are required');
  }

  // Type assertions after validation
  const validMatchId = matchId as string;
  const validTheme = theme as string;

  if (!['Country', 'Club', 'Private'].includes(validTheme)) {
    throw new Error('Invalid theme. Must be Country, Club, or Private');
  }

  // Create room
  const room = await createRoom(
    validMatchId,
    validTheme as 'Country' | 'Club' | 'Private'
  );

  // Update connection with room ID
  await updateItem({
    TableName: getTableName(),
    Key: {
      PK: `CONNECTION#${connectionId}`,
      SK: 'METADATA',
    },
    UpdateExpression: 'SET roomId = :roomId',
    ExpressionAttributeValues: {
      ':roomId': room.roomId,
    },
  });

  // Add connection to room participants
  await addConnectionToRoom(room.roomId, connectionId);

  return {
    type: 'roomCreated',
    room: {
      roomId: room.roomId,
      roomCode: room.roomCode,
      matchId: room.matchId,
      theme: room.theme,
    },
  };
}

/**
 * Handle joinRoom action
 * Adds user to an existing room by room code
 */
async function handleJoinRoom(
  connectionId: string,
  payload: Record<string, unknown>
): Promise<{ type: string; room: Record<string, unknown> }> {
  const { roomCode } = payload;

  if (!roomCode) {
    throw new Error('roomCode is required');
  }

  // Type assertion after validation
  const validRoomCode = roomCode as string;

  // Get room by code
  const room = await getRoomByCode(validRoomCode);

  if (!room) {
    throw new Error('Room not found');
  }

  // Update connection with room ID
  await updateItem({
    TableName: getTableName(),
    Key: {
      PK: `CONNECTION#${connectionId}`,
      SK: 'METADATA',
    },
    UpdateExpression: 'SET roomId = :roomId',
    ExpressionAttributeValues: {
      ':roomId': room.roomId,
    },
  });

  // Add connection to room participants
  await addConnectionToRoom(room.roomId, connectionId);

  return {
    type: 'roomJoined',
    room: {
      roomId: room.roomId,
      roomCode: room.roomCode,
      matchId: room.matchId,
      theme: room.theme,
    },
  };
}

/**
 * Handle submitPrediction action
 * Records user's prediction for an active prediction window
 * Validates prediction is submitted before window expiration
 * Broadcasts submission count without revealing individual predictions
 * Requirements: 3.5, 3.6, 9.4
 */
async function handleSubmitPrediction(
  connectionId: string,
  payload: Record<string, unknown>
): Promise<{
  type: string;
  windowId: string;
  choice: string;
  submittedAt: string;
}> {
  const { windowId, choice, predictionType } = payload;

  if (!windowId || !choice || !predictionType) {
    throw new Error('windowId, choice, and predictionType are required');
  }

  // Type assertions after validation
  const validWindowId = windowId as string;
  const validChoice = choice as string;
  const validPredictionType = predictionType as
    | 'next_goal_scorer'
    | 'next_card'
    | 'next_corner'
    | 'match_outcome';

  // Get connection to find user ID and room ID
  const connection = await getItem<ConnectionEntity>({
    TableName: getTableName(),
    Key: {
      PK: `CONNECTION#${connectionId}`,
      SK: 'METADATA',
    },
  });

  if (!connection) {
    throw new Error('Connection not found');
  }

  if (!connection.roomId) {
    throw new Error('Not in a room');
  }

  const { userId, roomId } = connection;

  // Use the moment engine submission handler
  // This validates expiration and broadcasts submission count
  const prediction = await submitPredictionToEngine(
    userId,
    roomId,
    validWindowId,
    validChoice,
    validPredictionType
  );

  return {
    type: 'predictionSubmitted',
    windowId: validWindowId,
    choice: validChoice,
    submittedAt: prediction.submittedAt,
  };
}

/**
 * Handle leaveRoom action
 * Removes user from current room
 */
async function handleLeaveRoom(
  connectionId: string
): Promise<{ type: string; roomId?: string; message?: string }> {
  // Get connection to find room ID
  const connection = await getItem<ConnectionEntity>({
    TableName: getTableName(),
    Key: {
      PK: `CONNECTION#${connectionId}`,
      SK: 'METADATA',
    },
  });

  if (!connection) {
    throw new Error('Connection not found');
  }

  if (!connection.roomId) {
    return {
      type: 'leftRoom',
      message: 'Not in a room',
    };
  }

  const roomId = connection.roomId;

  // Remove connection from room participants
  await removeConnectionFromRoom(roomId, connectionId);

  // Clear room ID from connection
  await updateItem({
    TableName: getTableName(),
    Key: {
      PK: `CONNECTION#${connectionId}`,
      SK: 'METADATA',
    },
    UpdateExpression: 'REMOVE roomId',
  });

  return {
    type: 'leftRoom',
    roomId,
  };
}

/**
 * Handle heartbeat action
 * Updates last heartbeat timestamp for connection health monitoring
 */
async function handleHeartbeat(
  connectionId: string
): Promise<{ type: string; timestamp: string }> {
  // Update last heartbeat timestamp
  await updateItem({
    TableName: getTableName(),
    Key: {
      PK: `CONNECTION#${connectionId}`,
      SK: 'METADATA',
    },
    UpdateExpression: 'SET lastHeartbeat = :timestamp',
    ExpressionAttributeValues: {
      ':timestamp': new Date().toISOString(),
    },
  });

  return {
    type: 'heartbeatAck',
    timestamp: new Date().toISOString(),
  };
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
      throw new Error(`Room not found: ${roomId}`);
    }

    // Initialize participants array if it doesn't exist
    const participants = room.participants || [];

    // Add connection if not already in participants
    if (!participants.includes(connectionId)) {
      await putItem({
        TableName: getTableName(),
        Item: {
          ...room,
          participants: [...participants, connectionId],
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
