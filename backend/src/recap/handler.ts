/**
 * Recap Lambda Handler
 * Handles match end events and generates recaps for users and rooms
 *
 * Requirements:
 * - 5.1: Generate room recap summarizing collective room activity
 * - 5.2: Generate personalized wrapped recap for each user
 * - 5.7: Broadcast recaps to room participants on match conclusion
 */

import { EventBridgeEvent } from 'aws-lambda';
import { generateWrappedRecap } from './wrappedRecapGeneration';
import { generateRoomRecap } from './roomRecapGeneration';
import { getActiveRoomsByMatch } from '../roomState/roomManagement';
import { broadcastToRoom } from '../roomState/roomManagement';
import { queryItems } from '../utils/dynamodb';
import { UserScore } from '../types';

const TABLE_NAME = process.env.TABLE_NAME || 'PulsePartyTable';

interface MatchEndEvent {
  eventId: string;
  matchId: string;
  eventType: 'match_end';
  timestamp: string;
  metadata: Record<string, unknown>;
}

/**
 * Broadcast recaps to all participants in a room
 * Sends both room recap and individual wrapped recaps
 *
 * @param roomId - Room identifier
 * @param matchId - Match identifier
 * @param roomRecap - Generated room recap
 * @param wrappedRecaps - Map of userId to wrapped recap
 */
async function broadcastRecapsToRoom(
  roomId: string,
  matchId: string,
  roomRecap: unknown,
  wrappedRecaps: Map<string, unknown>
): Promise<void> {
  // Broadcast room recap to all participants
  await broadcastToRoom(roomId, {
    type: 'roomRecap',
    matchId,
    roomId,
    data: roomRecap,
  });

  // Broadcast individual wrapped recaps to each user
  // Note: In a real implementation, we'd need to map connection IDs to user IDs
  // For now, we broadcast all wrapped recaps and let clients filter by userId
  for (const [userId, wrappedRecap] of wrappedRecaps.entries()) {
    await broadcastToRoom(roomId, {
      type: 'wrappedRecap',
      matchId,
      roomId,
      userId,
      data: wrappedRecap,
    });
  }
}

/**
 * Lambda handler for match end events
 * Generates recaps and broadcasts them to room participants
 *
 * @param event - EventBridge event containing match end data
 * @returns Response indicating success or failure
 *
 * Validates: Requirements 5.1, 5.2, 5.7
 */
export async function handler(
  event: EventBridgeEvent<'MatchEvent', MatchEndEvent>
): Promise<{ statusCode: number; body: string }> {
  console.log('Recap Lambda invoked with event:', JSON.stringify(event));

  try {
    const matchEvent = event.detail;
    const matchId = matchEvent.matchId;

    console.log(`Processing match end for match: ${matchId}`);

    // Get all active rooms for this match
    const rooms = await getActiveRoomsByMatch(matchId);

    if (rooms.length === 0) {
      console.log(`No active rooms found for match: ${matchId}`);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No active rooms for match' }),
      };
    }

    console.log(`Found ${rooms.length} active rooms for match: ${matchId}`);

    // Process each room
    for (const room of rooms) {
      const roomId = room.roomId;

      try {
        console.log(`Generating recaps for room: ${roomId}`);

        // Generate room recap
        const roomRecap = await generateRoomRecap(roomId, matchId);
        console.log(`Room recap generated for room: ${roomId}`);

        // Get all users in the room (from scores)
        const scores = await queryItems<UserScore & { PK: string; SK: string }>(
          {
            TableName: TABLE_NAME,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
              ':pk': `ROOM#${roomId}`,
              ':sk': 'SCORE#',
            },
          }
        );

        // Generate wrapped recap for each user
        const wrappedRecaps = new Map<string, unknown>();

        for (const scoreData of scores) {
          const userId = scoreData.userId;

          try {
            const wrappedRecap = await generateWrappedRecap(
              userId,
              roomId,
              matchId
            );
            wrappedRecaps.set(userId, wrappedRecap);
            console.log(`Wrapped recap generated for user: ${userId}`);
          } catch (error) {
            console.error(
              `Failed to generate wrapped recap for user ${userId}:`,
              error
            );
            // Continue processing other users
          }
        }

        // Broadcast recaps to room participants
        await broadcastRecapsToRoom(roomId, matchId, roomRecap, wrappedRecaps);
        console.log(`Recaps broadcast to room: ${roomId}`);
      } catch (error) {
        console.error(`Failed to process room ${roomId}:`, error);
        // Continue processing other rooms
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Recaps generated and broadcast successfully',
        matchId,
        roomsProcessed: rooms.length,
      }),
    };
  } catch (error) {
    console.error('Error processing match end event:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to process match end event',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}
