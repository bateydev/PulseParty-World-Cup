import { getItem, updateItem, queryItems } from '../utils/dynamodb';
import { PredictionWindow, Prediction, MatchEvent } from '../types';
import { broadcastToRoom } from '../roomState/roomManagement';

const TABLE_NAME = process.env.TABLE_NAME || 'PulsePartyTable';

/**
 * Prediction Evaluation Handler
 * Resolves predictions when outcome occurs and determines correct predictions
 *
 * Requirements:
 * - 3.7: Evaluate all predictions and award points to correct predictions
 */

/**
 * Determine the outcome based on a match event
 * Maps match events to prediction outcomes
 *
 * @param event - Match event that resolves the prediction
 * @param predictionType - Type of prediction to resolve
 * @returns Outcome string or null if event doesn't resolve this prediction type
 */
export function determineOutcome(
  event: MatchEvent,
  predictionType: PredictionWindow['predictionType']
): string | null {
  switch (predictionType) {
    case 'next_goal_scorer':
      if (event.eventType === 'goal') {
        // Determine which team scored
        return event.teamId === 'home' ? 'Home Team' : 'Away Team';
      }
      return null;

    case 'next_corner':
      if (event.eventType === 'corner') {
        return event.teamId === 'home' ? 'Home Team' : 'Away Team';
      }
      return null;

    case 'next_card':
      if (event.eventType === 'yellow_card' || event.eventType === 'red_card') {
        return event.teamId === 'home' ? 'Home Team' : 'Away Team';
      }
      return null;

    case 'match_outcome':
      // Match outcome is typically resolved at match end
      // This would need match score to determine winner
      return null;

    default:
      return null;
  }
}

/**
 * Close a prediction window and mark it as resolved
 *
 * @param windowId - Prediction window ID
 * @param outcome - The actual outcome that occurred
 * @returns Updated prediction window
 */
export async function closePredictionWindow(
  windowId: string,
  outcome: string
): Promise<PredictionWindow | null> {
  const updated = await updateItem<
    PredictionWindow & { PK: string; SK: string }
  >({
    TableName: TABLE_NAME,
    Key: {
      PK: `WINDOW#${windowId}`,
      SK: 'METADATA',
    },
    UpdateExpression: 'SET outcome = :outcome, closedAt = :closedAt',
    ExpressionAttributeValues: {
      ':outcome': outcome,
      ':closedAt': new Date().toISOString(),
    },
    ReturnValues: 'ALL_NEW',
  });

  if (!updated) {
    return null;
  }

  // Remove DynamoDB keys
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, ...window } = updated;
  return window as PredictionWindow;
}

/**
 * Evaluate all predictions for a window and determine which are correct
 *
 * @param windowId - Prediction window ID
 * @param roomId - Room ID
 * @param outcome - The actual outcome that occurred
 * @returns Array of evaluated predictions with correctness marked
 */
export async function evaluatePredictionsForWindow(
  windowId: string,
  roomId: string,
  outcome: string
): Promise<Prediction[]> {
  // Get all predictions for this window
  const predictions = await queryItems<Prediction & { PK: string; SK: string }>(
    {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `ROOM#${roomId}`,
        ':sk': `PREDICTION#${windowId}#`,
      },
    }
  );

  // Evaluate each prediction
  const evaluatedPredictions: Prediction[] = [];

  for (const prediction of predictions) {
    const isCorrect = prediction.choice === outcome;

    // Update prediction with result
    await updateItem({
      TableName: TABLE_NAME,
      Key: {
        PK: `ROOM#${roomId}`,
        SK: `PREDICTION#${windowId}#${prediction.userId}`,
      },
      UpdateExpression: 'SET isCorrect = :isCorrect',
      ExpressionAttributeValues: {
        ':isCorrect': isCorrect,
      },
    });

    // Remove DynamoDB keys
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { PK, SK, ...pred } = prediction;
    evaluatedPredictions.push({
      ...pred,
      isCorrect,
    } as Prediction);
  }

  return evaluatedPredictions;
}

/**
 * Evaluate predictions when outcome occurs
 * Main entry point for prediction evaluation
 *
 * @param event - Match event that resolves the prediction
 * @param windowId - Prediction window ID
 * @param roomId - Room ID
 * @returns Evaluated predictions or null if window not found or event doesn't resolve prediction
 */
export async function evaluatePredictions(
  event: MatchEvent,
  windowId: string,
  roomId: string
): Promise<Prediction[] | null> {
  // Get prediction window
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

  // Determine outcome from event
  const outcome = determineOutcome(event, window.predictionType);

  if (!outcome) {
    // Event doesn't resolve this prediction type
    return null;
  }

  // Close the prediction window
  await closePredictionWindow(windowId, outcome);

  // Evaluate all predictions
  const evaluatedPredictions = await evaluatePredictionsForWindow(
    windowId,
    roomId,
    outcome
  );

  // Broadcast evaluation results to room
  await broadcastEvaluationResults(
    roomId,
    windowId,
    outcome,
    evaluatedPredictions
  );

  return evaluatedPredictions;
}

/**
 * Broadcast prediction evaluation results to all room participants
 *
 * @param roomId - Room ID
 * @param windowId - Prediction window ID
 * @param outcome - The actual outcome
 * @param predictions - Evaluated predictions
 * @returns Object containing success count and failed connection IDs
 */
export async function broadcastEvaluationResults(
  roomId: string,
  windowId: string,
  outcome: string,
  predictions: Prediction[]
): Promise<{ successCount: number; failedConnections: string[] }> {
  const correctCount = predictions.filter((p) => p.isCorrect).length;
  const totalCount = predictions.length;

  const message = {
    type: 'predictionEvaluation',
    data: {
      windowId,
      outcome,
      correctCount,
      totalCount,
    },
  };

  return await broadcastToRoom(roomId, message);
}
