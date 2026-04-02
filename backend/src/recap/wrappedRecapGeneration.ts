/**
 * Wrapped Recap Generation Module
 * Generates personalized match summaries for users
 *
 * Requirements:
 * - 5.2: Generate personalized wrapped recap for each user
 * - 5.3: Include total points, final rank, accuracy, longest streak, clutch moments
 * - 5.5: Provide shareable link for social media distribution
 * - 5.6: Store wrapped recap data in DynamoDB
 */

import { getItem, putItem, queryItems } from '../utils/dynamodb';
import { WrappedRecap, UserScore, Prediction } from '../types';
import { v4 as uuidv4 } from 'uuid';

const TABLE_NAME = process.env.TABLE_NAME || 'PulsePartyTable';
const BASE_SHARE_URL =
  process.env.BASE_SHARE_URL || 'https://pulseparty.app/recap';

/**
 * Calculate prediction accuracy percentage
 *
 * @param correctPredictions - Number of correct predictions
 * @param totalPredictions - Total number of predictions made
 * @returns Accuracy as a percentage (0-100)
 */
function calculateAccuracy(
  correctPredictions: number,
  totalPredictions: number
): number {
  if (totalPredictions === 0) {
    return 0;
  }
  return Math.round((correctPredictions / totalPredictions) * 100);
}

/**
 * Calculate longest streak from user's predictions
 *
 * @param predictions - Array of user predictions sorted by submission time
 * @returns Longest consecutive correct prediction streak
 */
function calculateLongestStreak(predictions: Prediction[]): number {
  let longestStreak = 0;
  let currentStreak = 0;

  for (const prediction of predictions) {
    if (prediction.isCorrect) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return longestStreak;
}

/**
 * Count clutch moments from user's predictions
 * A clutch moment is a correct prediction submitted in the final 10 seconds
 *
 * @param predictions - Array of user predictions
 * @returns Count of clutch moments
 */
async function countClutchMoments(predictions: Prediction[]): Promise<number> {
  let clutchCount = 0;

  for (const prediction of predictions) {
    if (!prediction.isCorrect) {
      continue;
    }

    // Get the prediction window to check expiration time
    const window = await getItem<{ expiresAt: string }>({
      TableName: TABLE_NAME,
      Key: {
        PK: `WINDOW#${prediction.windowId}`,
        SK: 'METADATA',
      },
    });

    if (!window) {
      continue;
    }

    const submittedTime = new Date(prediction.submittedAt).getTime();
    const expiresTime = new Date(window.expiresAt).getTime();
    const timeRemaining = expiresTime - submittedTime;

    // Check if submitted in final 10 seconds (10000 milliseconds)
    if (timeRemaining <= 10000 && timeRemaining >= 0) {
      clutchCount++;
    }
  }

  return clutchCount;
}

/**
 * Generate shareable URL for wrapped recap
 *
 * @param userId - User identifier
 * @param matchId - Match identifier
 * @param roomId - Room identifier
 * @returns Shareable URL
 */
function generateShareableUrl(
  userId: string,
  matchId: string,
  roomId: string
): string {
  const recapId = uuidv4();
  return `${BASE_SHARE_URL}/${recapId}?user=${userId}&match=${matchId}&room=${roomId}`;
}

/**
 * Generate wrapped recap for a user
 * Calculates user statistics from their predictions and scores
 *
 * @param userId - User identifier
 * @param roomId - Room identifier
 * @param matchId - Match identifier
 * @returns Generated wrapped recap
 *
 * Validates: Requirements 5.2, 5.3, 5.5, 5.6
 */
export async function generateWrappedRecap(
  userId: string,
  roomId: string,
  matchId: string
): Promise<WrappedRecap> {
  // Get user's final score from leaderboard
  const scoreData = await getItem<UserScore & { PK: string; SK: string }>({
    TableName: TABLE_NAME,
    Key: {
      PK: `ROOM#${roomId}`,
      SK: `SCORE#${userId}`,
    },
  });

  if (!scoreData) {
    throw new Error(`Score not found for user ${userId} in room ${roomId}`);
  }

  // Get all user's predictions for this room
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

  // Filter predictions for this user and sort by submission time
  const userPredictions = predictions
    .filter((p) => p.userId === userId)
    .sort(
      (a, b) =>
        new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    );

  // Calculate statistics
  const totalPoints = scoreData.totalPoints;
  const finalRank = scoreData.rank;
  const accuracy = calculateAccuracy(
    scoreData.correctPredictions,
    scoreData.totalPredictions
  );
  const longestStreak = calculateLongestStreak(userPredictions);
  const clutchMoments = await countClutchMoments(userPredictions);

  // Generate shareable URL
  const shareableUrl = generateShareableUrl(userId, matchId, roomId);

  // Create wrapped recap object
  const wrappedRecap: WrappedRecap = {
    userId,
    roomId,
    matchId,
    totalPoints,
    finalRank,
    accuracy,
    longestStreak,
    clutchMoments,
    shareableUrl,
  };

  // Store wrapped recap in DynamoDB
  await putItem({
    TableName: TABLE_NAME,
    Item: {
      PK: `USER#${userId}`,
      SK: `RECAP#${matchId}#${roomId}`,
      ...wrappedRecap,
      createdAt: new Date().toISOString(),
    },
  });

  return wrappedRecap;
}

/**
 * Retrieve user's historical wrapped recaps
 *
 * @param userId - User identifier
 * @returns Array of wrapped recaps sorted by creation date (newest first)
 */
export async function getUserRecaps(userId: string): Promise<WrappedRecap[]> {
  const recaps = await queryItems<
    WrappedRecap & { PK: string; SK: string; createdAt: string }
  >({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': 'RECAP#',
    },
  });

  // Sort by creation date (newest first) and remove DynamoDB keys
  return recaps
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ PK, SK, createdAt, ...recap }) => recap as WrappedRecap
    );
}
