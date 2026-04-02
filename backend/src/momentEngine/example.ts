/**
 * Example usage of Moment Engine functions
 * Demonstrates how to generate, store, and broadcast prediction windows
 */

import {
  generatePredictionWindow,
  generateTimeBasedPredictionWindow,
  storeAndBroadcastPredictionWindow,
} from './index';
import { MatchEvent } from '../types';

/**
 * Example: Handle a goal event and create a prediction window
 */
export async function handleGoalEvent(
  event: MatchEvent,
  roomId: string
): Promise<void> {
  console.log(`Processing goal event: ${event.eventId}`);

  // Generate prediction window from the goal event
  const predictionWindow = generatePredictionWindow(event, roomId);

  if (!predictionWindow) {
    console.log('No prediction window generated for this event type');
    return;
  }

  console.log(
    `Generated prediction window: ${predictionWindow.windowId} (${predictionWindow.predictionType})`
  );

  // Store in DynamoDB and broadcast to all room participants
  const result = await storeAndBroadcastPredictionWindow(predictionWindow);

  console.log(
    `Broadcast complete: ${result.successCount} successful, ${result.failedConnections.length} failed`
  );

  if (result.failedConnections.length > 0) {
    console.warn(
      `Failed connections removed: ${result.failedConnections.join(', ')}`
    );
  }
}

/**
 * Example: Generate a time-based prediction window
 */
export async function handleTimeBasedPrediction(
  matchId: string,
  roomId: string
): Promise<void> {
  console.log('Generating time-based prediction window (10-minute interval)');

  // Generate time-based prediction window
  const predictionWindow = generateTimeBasedPredictionWindow(matchId, roomId);

  console.log(
    `Generated prediction window: ${predictionWindow.windowId} (${predictionWindow.predictionType})`
  );

  // Store and broadcast
  const result = await storeAndBroadcastPredictionWindow(predictionWindow);

  console.log(
    `Broadcast complete: ${result.successCount} successful, ${result.failedConnections.length} failed`
  );
}

/**
 * Example: Process match event and handle prediction window generation
 */
export async function processMatchEvent(
  event: MatchEvent,
  roomId: string
): Promise<void> {
  console.log(
    `Processing match event: ${event.eventType} at ${event.timestamp}`
  );

  // Generate prediction window if event type triggers one
  const predictionWindow = generatePredictionWindow(event, roomId);

  if (predictionWindow) {
    console.log(
      `Event triggered prediction window: ${predictionWindow.predictionType}`
    );
    console.log(`Options: ${predictionWindow.options.join(', ')}`);
    console.log(`Expires at: ${predictionWindow.expiresAt}`);

    // Store and broadcast
    const result = await storeAndBroadcastPredictionWindow(predictionWindow);

    console.log(
      `Successfully broadcast to ${result.successCount} participants`
    );
  } else {
    console.log('Event did not trigger a prediction window');
  }
}

/**
 * Example: Lambda handler for EventBridge events
 */
export async function momentEngineLambdaHandler(event: {
  detail: MatchEvent;
  roomId?: string;
}): Promise<{ statusCode: number; body: string }> {
  try {
    const matchEvent: MatchEvent = event.detail;
    const roomId = event.roomId || 'default-room';

    console.log(`Moment Engine processing event: ${matchEvent.eventId}`);

    // Generate prediction window
    const predictionWindow = generatePredictionWindow(matchEvent, roomId);

    if (!predictionWindow) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Event processed, no prediction window generated',
        }),
      };
    }

    // Store and broadcast
    const result = await storeAndBroadcastPredictionWindow(predictionWindow);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Prediction window created and broadcast',
        windowId: predictionWindow.windowId,
        successCount: result.successCount,
        failedConnections: result.failedConnections.length,
      }),
    };
  } catch (error) {
    console.error('Error in Moment Engine Lambda:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing event',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}
