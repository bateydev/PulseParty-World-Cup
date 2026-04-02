import { putItem } from '../utils/dynamodb';
import { PredictionWindow } from '../types';
import { broadcastToRoom } from '../roomState/roomManagement';

const TABLE_NAME = process.env.TABLE_NAME || 'PulsePartyTable';

/**
 * Store prediction window in DynamoDB
 * Requirements: 3.3, 3.4
 *
 * @param window - Prediction window to store
 */
export async function storePredictionWindow(
  window: PredictionWindow
): Promise<void> {
  await putItem({
    TableName: TABLE_NAME,
    Item: {
      PK: `WINDOW#${window.windowId}`,
      SK: 'METADATA',
      ...window,
    },
  });
}

/**
 * Broadcast prediction window to all room participants
 * Requirements: 3.3, 3.4
 *
 * @param window - Prediction window to broadcast
 * @returns Object containing success count and failed connection IDs
 */
export async function broadcastPredictionWindow(
  window: PredictionWindow
): Promise<{ successCount: number; failedConnections: string[] }> {
  const message = {
    type: 'predictionWindow',
    data: window,
  };

  return await broadcastToRoom(window.roomId, message);
}

/**
 * Store and broadcast prediction window
 * Combines storage and broadcast operations
 * Requirements: 3.3, 3.4
 *
 * @param window - Prediction window to store and broadcast
 * @returns Object containing success count and failed connection IDs
 */
export async function storeAndBroadcastPredictionWindow(
  window: PredictionWindow
): Promise<{ successCount: number; failedConnections: string[] }> {
  // Store window in DynamoDB
  await storePredictionWindow(window);

  // Broadcast to all room participants
  return await broadcastPredictionWindow(window);
}
