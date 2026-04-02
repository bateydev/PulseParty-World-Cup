import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandInput,
} from '@aws-sdk/client-eventbridge';
import { MatchEvent } from '../types';

/**
 * EventBridge Publisher
 * Publishes normalized match events to EventBridge with match ID routing attribute
 * Includes retry logic with exponential backoff
 *
 * Requirements:
 * - 2.3: Publish normalized event to EventBridge within 100ms
 * - 12.1: Publish event to EventBridge with match ID as routing attribute
 * - 12.5: Include event metadata (event type, priority, timestamp) in EventBridge message
 */

const eventBridgeClient = new EventBridgeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'PulsePartyEventBus';
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 100;

export interface PublishResult {
  success: boolean;
  eventId?: string;
  error?: Error;
  attempts: number;
}

/**
 * Calculate exponential backoff delay
 * @param attempt - Current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
function calculateBackoff(attempt: number): number {
  return INITIAL_BACKOFF_MS * Math.pow(2, attempt);
}

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine event priority based on event type
 * @param eventType - Type of match event
 * @returns Priority level (high, medium, low)
 */
function getEventPriority(
  eventType: MatchEvent['eventType']
): 'high' | 'medium' | 'low' {
  const highPriorityEvents: MatchEvent['eventType'][] = [
    'goal',
    'red_card',
    'assist',
  ];
  const mediumPriorityEvents: MatchEvent['eventType'][] = [
    'yellow_card',
    'substitution',
    'corner',
  ];

  if (highPriorityEvents.includes(eventType)) {
    return 'high';
  } else if (mediumPriorityEvents.includes(eventType)) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Publish a normalized match event to EventBridge with retry logic
 *
 * Implements exponential backoff retry strategy:
 * - Attempt 1: Immediate
 * - Attempt 2: 100ms delay
 * - Attempt 3: 200ms delay
 *
 * @param event - Normalized match event to publish
 * @returns PublishResult with success status and metadata
 */
export async function publishToEventBridge(
  event: MatchEvent
): Promise<PublishResult> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // Add backoff delay for retry attempts (not on first attempt)
      if (attempt > 0) {
        const backoffDelay = calculateBackoff(attempt - 1);
        console.log(
          `Retry attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS} after ${backoffDelay}ms backoff`
        );
        await sleep(backoffDelay);
      }

      // Determine event priority
      const priority = getEventPriority(event.eventType);

      // Construct EventBridge event with metadata
      // Requirements: 12.1 (match ID routing), 12.5 (event metadata)
      const putEventsInput: PutEventsCommandInput = {
        Entries: [
          {
            Source: 'pulseparty.ingestion',
            DetailType: 'MatchEvent',
            Detail: JSON.stringify({
              ...event,
              // Event metadata (Requirement 12.5)
              metadata: {
                ...event.metadata,
                priority,
                publishedAt: new Date().toISOString(),
              },
            }),
            EventBusName: EVENT_BUS_NAME,
            // Match ID as routing attribute (Requirement 12.1)
            Resources: [`match:${event.matchId}`],
          },
        ],
      };

      // Publish to EventBridge
      const command = new PutEventsCommand(putEventsInput);
      const response = await eventBridgeClient.send(command);

      // Check for failures in the response
      if (response.FailedEntryCount && response.FailedEntryCount > 0) {
        const failedEntry = response.Entries?.[0];
        throw new Error(
          `EventBridge publish failed: ${failedEntry?.ErrorCode} - ${failedEntry?.ErrorMessage}`
        );
      }

      // Success - return result with event ID
      const eventId = response.Entries?.[0]?.EventId;
      console.log(
        `Successfully published event ${event.eventId} to EventBridge (EventBridge ID: ${eventId}) on attempt ${attempt + 1}`
      );

      return {
        success: true,
        eventId,
        attempts: attempt + 1,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `EventBridge publish attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS} failed:`,
        {
          error: lastError.message,
          eventId: event.eventId,
          matchId: event.matchId,
        }
      );

      // If this was the last attempt, we'll return the error below
      if (attempt === MAX_RETRY_ATTEMPTS - 1) {
        console.error(
          `All ${MAX_RETRY_ATTEMPTS} publish attempts failed for event ${event.eventId}`
        );
      }
    }
  }

  // All retry attempts exhausted
  return {
    success: false,
    error: lastError,
    attempts: MAX_RETRY_ATTEMPTS,
  };
}

/**
 * Batch publish multiple events to EventBridge
 * EventBridge supports up to 10 events per PutEvents call
 *
 * @param events - Array of normalized match events
 * @returns Array of publish results
 */
export async function publishEventsToEventBridge(
  events: MatchEvent[]
): Promise<PublishResult[]> {
  const results: PublishResult[] = [];

  // Process events in batches of 10 (EventBridge limit)
  const BATCH_SIZE = 10;
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);

    // Publish each event in the batch (with individual retry logic)
    const batchResults = await Promise.all(
      batch.map((event) => publishToEventBridge(event))
    );

    results.push(...batchResults);
  }

  return results;
}
