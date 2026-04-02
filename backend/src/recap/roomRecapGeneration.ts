/**
 * Room Recap Generation Module
 * Generates room-level match summaries
 *
 * Requirements:
 * - 5.1: Generate room recap summarizing collective room activity
 * - 5.4: Include total participants, top 3 performers, most predicted event, engagement metrics
 */

import { queryItems, putItem } from '../utils/dynamodb';
import { RoomRecap, UserScore, Prediction } from '../types';

const TABLE_NAME = process.env.TABLE_NAME || 'PulsePartyTable';

/**
 * Find the most predicted event from all predictions in a room
 *
 * @param predictions - Array of all predictions in the room
 * @returns The most frequently predicted choice, or 'N/A' if no predictions
 */
function findMostPredictedEvent(predictions: Prediction[]): string {
  if (predictions.length === 0) {
    return 'N/A';
  }

  // Count occurrences of each choice
  const choiceCounts = new Map<string, number>();

  for (const prediction of predictions) {
    const count = choiceCounts.get(prediction.choice) || 0;
    choiceCounts.set(prediction.choice, count + 1);
  }

  // Find the choice with the highest count
  let mostPredicted = 'N/A';
  let maxCount = 0;

  for (const [choice, count] of choiceCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostPredicted = choice;
    }
  }

  return mostPredicted;
}

/**
 * Calculate engagement metrics for the room
 *
 * @param predictions - Array of all predictions in the room
 * @param scores - Array of all user scores in the room
 * @returns Engagement metrics object
 */
function calculateEngagementMetrics(
  predictions: Prediction[],
  scores: UserScore[]
): Record<string, number> {
  const totalPredictions = predictions.length;
  const correctPredictions = predictions.filter((p) => p.isCorrect).length;
  const totalClutchMoments = scores.reduce(
    (sum, score) => sum + score.clutchMoments,
    0
  );

  // Calculate average accuracy across all users
  const totalUserPredictions = scores.reduce(
    (sum, score) => sum + score.totalPredictions,
    0
  );
  const totalCorrectUserPredictions = scores.reduce(
    (sum, score) => sum + score.correctPredictions,
    0
  );
  const averageAccuracy =
    totalUserPredictions > 0
      ? Math.round((totalCorrectUserPredictions / totalUserPredictions) * 100)
      : 0;

  return {
    totalPredictions,
    correctPredictions,
    totalClutchMoments,
    averageAccuracy,
  };
}

/**
 * Generate room recap for a completed match
 * Aggregates statistics across all users in the room
 *
 * @param roomId - Room identifier
 * @param matchId - Match identifier
 * @returns Generated room recap
 *
 * Validates: Requirements 5.1, 5.4
 */
export async function generateRoomRecap(
  roomId: string,
  matchId: string
): Promise<RoomRecap> {
  // Query all scores for the room
  const scores = await queryItems<UserScore & { PK: string; SK: string }>({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `ROOM#${roomId}`,
      ':sk': 'SCORE#',
    },
  });

  // Query all predictions for the room
  const predictions = await queryItems<Prediction & { PK: string; SK: string }>(
    {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `ROOM#${roomId}`,
        ':sk': 'PREDICTION#',
      },
    }
  );

  // Calculate total participants (unique users with scores)
  const totalParticipants = scores.length;

  // Get top 3 performers (already sorted by rank)
  const sortedScores = scores
    .map(({ PK, SK, ...score }) => score as UserScore)
    .sort((a, b) => a.rank - b.rank);
  const topPerformers = sortedScores.slice(0, 3);

  // Find most predicted event
  const mostPredictedEvent = findMostPredictedEvent(
    predictions.map(({ PK, SK, ...pred }) => pred as Prediction)
  );

  // Calculate engagement metrics
  const engagementMetrics = calculateEngagementMetrics(
    predictions.map(({ PK, SK, ...pred }) => pred as Prediction),
    sortedScores
  );

  // Create room recap object
  const roomRecap: RoomRecap = {
    roomId,
    matchId,
    totalParticipants,
    topPerformers,
    mostPredictedEvent,
    engagementMetrics,
  };

  // Store room recap in DynamoDB
  await putItem({
    TableName: TABLE_NAME,
    Item: {
      PK: `ROOM#${roomId}`,
      SK: `RECAP#${matchId}`,
      ...roomRecap,
      createdAt: new Date().toISOString(),
    },
  });

  return roomRecap;
}
