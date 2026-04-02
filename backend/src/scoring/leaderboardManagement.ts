/**
 * Leaderboard Management Module
 * Handles leaderboard updates, rank calculation, and broadcasting
 *
 * Requirements:
 * - 4.4: Update leaderboard when user's score changes
 * - 4.5: Broadcast updated rankings to all users in the room
 * - 4.6: Display leaderboard with rank, username, total points, and streak status
 * - 4.7: Maintain real-time leaderboard state in DynamoDB
 */

import { queryItems, putItem } from '../utils/dynamodb';
import { broadcastToRoom } from '../roomState/roomManagement';
import { UserScore } from '../types';

const TABLE_NAME = process.env.TABLE_NAME || 'PulsePartyTable';

/**
 * Update leaderboard for a room by recalculating ranks and broadcasting to participants
 *
 * This function:
 * 1. Queries all scores for the room from DynamoDB
 * 2. Sorts by total points (descending)
 * 3. Recalculates ranks
 * 4. Updates each score record with new rank
 * 5. Broadcasts updated leaderboard to all room participants
 *
 * @param roomId - The room identifier
 * @returns Array of updated user scores with ranks
 *
 * Validates: Requirements 4.4, 4.5, 4.6, 4.7
 */
export async function updateLeaderboard(roomId: string): Promise<UserScore[]> {
  // Query all scores for the room
  // PK: ROOM#{roomId}, SK: SCORE#{userId}
  const scores = await queryItems<UserScore & { PK: string; SK: string }>({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `ROOM#${roomId}`,
      ':sk': 'SCORE#',
    },
  });

  // If no scores exist, return empty array
  if (scores.length === 0) {
    return [];
  }

  // Sort by total points (descending)
  const sortedScores = scores.sort((a, b) => b.totalPoints - a.totalPoints);

  // Recalculate ranks
  // Users with same points get the same rank
  const rankedScores: UserScore[] = [];
  let currentRank = 1;

  for (let i = 0; i < sortedScores.length; i++) {
    const score = sortedScores[i];

    // If not the first user and points are different from previous, update rank
    if (i > 0 && score.totalPoints !== sortedScores[i - 1].totalPoints) {
      currentRank = i + 1;
    }

    const updatedScore: UserScore = {
      userId: score.userId,
      roomId: score.roomId,
      totalPoints: score.totalPoints,
      streak: score.streak,
      clutchMoments: score.clutchMoments,
      correctPredictions: score.correctPredictions,
      totalPredictions: score.totalPredictions,
      rank: currentRank,
    };

    rankedScores.push(updatedScore);

    // Update rank in DynamoDB
    await putItem({
      TableName: TABLE_NAME,
      Item: {
        PK: `ROOM#${roomId}`,
        SK: `SCORE#${score.userId}`,
        ...updatedScore,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  // Broadcast updated leaderboard to all room participants
  await broadcastToRoom(roomId, {
    type: 'leaderboard_update',
    leaderboard: rankedScores,
  });

  return rankedScores;
}
