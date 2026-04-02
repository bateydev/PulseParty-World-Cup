import { putItem, getItem, queryItems } from '../utils/dynamodb';
import { Prediction, PredictionWindow } from '../types';
import { broadcastToRoom } from '../roomState/roomManagement';

const TABLE_NAME = process.env.TABLE_NAME || 'PulsePartyTable';

/**
 * Prediction Submission Handler
 * Records user predictions with timestamp validation
 * Broadcasts submission count without revealing individual predictions
 *
 * Requirements:
 * - 3.5: Record user prediction with timestamp
 * - 3.6: Validate prediction is submitted before window expiration
 * - 9.4: Broadcast submission count without revealing individual predictions
 */

/**
 * Submit a prediction for an active prediction window
 *
 * @param userId - User ID submitting the prediction
 * @param roomId - Room ID where the prediction is being made
 * @param windowId - Prediction window ID
 * @param choice - User's prediction choice
 * @param predictionType - Type of prediction
 * @returns Submitted prediction object
 * @throws Error if window is expired or not found
 */
export async function submitPrediction(
  userId: string,
  roomId: string,
  windowId: string,
  choice: string,
  predictionType:
    | 'next_goal_scorer'
    | 'next_card'
    | 'next_corner'
    | 'match_outcome'
): Promise<Prediction> {
  // Get prediction window to validate expiration
  const window = await getItem<PredictionWindow & { PK: string; SK: string }>({
    TableName: TABLE_NAME,
    Key: {
      PK: `WINDOW#${windowId}`,
      SK: 'METADATA',
    },
  });

  if (!window) {
    throw new Error(`Prediction window not found: ${windowId}`);
  }

  // Validate window has not expired (Requirement 3.6)
  const now = new Date();
  const expiresAt = new Date(window.expiresAt);

  if (now >= expiresAt) {
    throw new Error(
      `Prediction window has expired. Expired at: ${window.expiresAt}`
    );
  }

  // Validate choice is one of the available options
  if (!window.options.includes(choice)) {
    throw new Error(
      `Invalid choice. Must be one of: ${window.options.join(', ')}`
    );
  }

  // Create prediction record (Requirement 3.5)
  const submittedAt = now.toISOString();
  const prediction: Prediction = {
    userId,
    roomId,
    windowId,
    predictionType,
    choice,
    submittedAt,
  };

  // Store prediction in DynamoDB
  await putItem({
    TableName: TABLE_NAME,
    Item: {
      PK: `ROOM#${roomId}`,
      SK: `PREDICTION#${windowId}#${userId}`,
      ...prediction,
    },
  });

  // Broadcast submission count without revealing individual predictions (Requirement 9.4)
  await broadcastSubmissionCount(roomId, windowId);

  return prediction;
}

/**
 * Get submission count for a prediction window
 *
 * @param roomId - Room ID
 * @param windowId - Prediction window ID
 * @returns Number of submissions for the window
 */
export async function getSubmissionCount(
  roomId: string,
  windowId: string
): Promise<number> {
  const predictions = await queryItems({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `ROOM#${roomId}`,
      ':sk': `PREDICTION#${windowId}#`,
    },
  });

  return predictions.length;
}

/**
 * Broadcast submission count to all room participants
 * Does not reveal individual predictions (Requirement 9.4)
 *
 * @param roomId - Room ID
 * @param windowId - Prediction window ID
 * @returns Object containing success count and failed connection IDs
 */
export async function broadcastSubmissionCount(
  roomId: string,
  windowId: string
): Promise<{ successCount: number; failedConnections: string[] }> {
  const submissionCount = await getSubmissionCount(roomId, windowId);

  const message = {
    type: 'predictionSubmissionCount',
    data: {
      windowId,
      submissionCount,
    },
  };

  return await broadcastToRoom(roomId, message);
}

/**
 * Check if a user has already submitted a prediction for a window
 *
 * @param userId - User ID
 * @param roomId - Room ID
 * @param windowId - Prediction window ID
 * @returns true if user has already submitted a prediction
 */
export async function hasUserSubmitted(
  userId: string,
  roomId: string,
  windowId: string
): Promise<boolean> {
  const prediction = await getItem({
    TableName: TABLE_NAME,
    Key: {
      PK: `ROOM#${roomId}`,
      SK: `PREDICTION#${windowId}#${userId}`,
    },
  });

  return prediction !== null;
}

/**
 * Get all predictions for a prediction window
 * Used for evaluation after window closes
 *
 * @param roomId - Room ID
 * @param windowId - Prediction window ID
 * @returns Array of predictions
 */
export async function getPredictionsForWindow(
  roomId: string,
  windowId: string
): Promise<Prediction[]> {
  const items = await queryItems<Prediction & { PK: string; SK: string }>({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `ROOM#${roomId}`,
      ':sk': `PREDICTION#${windowId}#`,
    },
  });

  // Remove DynamoDB keys from results
  return items.map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { PK, SK, ...prediction } = item;
    return prediction as Prediction;
  });
}
