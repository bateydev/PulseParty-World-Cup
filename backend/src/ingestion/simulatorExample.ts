/**
 * Example: Simulator Mode Integration
 *
 * This example demonstrates how to integrate the simulator mode with the ingestion pipeline
 * to provide a fallback mechanism when the live event feed is unavailable.
 */

import { createSimulator } from './simulator';
import { normalizeEvent } from './normalizer';
import { publishToEventBridge } from './eventBridgePublisher';
import { MatchEvent } from '../types';

/**
 * Ingestion pipeline with simulator mode fallback
 *
 * This function demonstrates the complete flow:
 * 1. Check if simulator mode is enabled (via environment variable)
 * 2. If enabled, use simulator to replay recorded events
 * 3. Normalize each event
 * 4. Publish to EventBridge
 *
 * Requirements:
 * - 2.7: When event feed is unavailable, activate simulator mode
 * - 2.8: Indicate to users that simulated data is being used
 * - 13.8: Seamlessly operate in simulator mode without user intervention
 */
export async function runIngestionWithSimulator(): Promise<void> {
  console.log('=== Ingestion Pipeline with Simulator Mode ===\n');

  // Create simulator instance (automatically detects SIMULATOR_MODE env var)
  const simulator = createSimulator({
    speedMultiplier: 10.0, // 10x speed for demo purposes
    loop: false, // Don't loop events
  });

  if (!simulator.isEnabled()) {
    console.log(
      'Simulator mode is disabled. Would connect to live event feed.'
    );
    console.log('Set SIMULATOR_MODE=true to enable simulator mode.\n');
    return;
  }

  console.log('✓ Simulator mode is ENABLED');
  console.log('✓ Using recorded match events for demonstration');
  console.log(
    '✓ Speed multiplier: 10x (events replay 10x faster than real-time)\n'
  );

  // Track statistics
  let eventsProcessed = 0;
  let eventsPublished = 0;
  let eventsFailed = 0;

  // Start simulator with event handler
  simulator.start(async (event: MatchEvent) => {
    try {
      // Step 1: Event is already parsed (from simulator)
      console.log(
        `\n[${eventsProcessed + 1}] Processing event: ${event.eventType}`
      );

      // Step 2: Normalize event (validate required fields)
      const normalizeResult = normalizeEvent(event);

      if (!normalizeResult.isValid) {
        console.error('  ✗ Normalization failed:', normalizeResult.errors);
        eventsFailed++;
        return;
      }

      console.log('  ✓ Event normalized successfully');

      // Step 3: Publish to EventBridge
      const publishResult = await publishToEventBridge(normalizeResult.event!);

      if (publishResult.success) {
        console.log(
          `  ✓ Published to EventBridge (ID: ${publishResult.eventId})`
        );
        eventsPublished++;
      } else {
        console.error(
          '  ✗ EventBridge publish failed:',
          publishResult.error?.message
        );
        eventsFailed++;
      }

      eventsProcessed++;

      // Indicate simulated data to users (Requirement 2.8)
      if (event.metadata.simulated) {
        console.log('  ℹ Using simulated match data');
      }
    } catch (error) {
      console.error('  ✗ Error processing event:', error);
      eventsFailed++;
    }
  });

  // Wait for simulator to complete (in real scenario, this would run indefinitely)
  await new Promise<void>((resolve) => {
    const checkInterval = setInterval(() => {
      if (!simulator.isActive()) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });

  // Print summary
  console.log('\n=== Ingestion Summary ===');
  console.log(`Total events processed: ${eventsProcessed}`);
  console.log(`Successfully published: ${eventsPublished}`);
  console.log(`Failed: ${eventsFailed}`);
  console.log(
    `Success rate: ${((eventsPublished / eventsProcessed) * 100).toFixed(1)}%\n`
  );
}

/**
 * Example: Conditional simulator activation
 *
 * This function demonstrates how to activate simulator mode only when
 * the live event feed is unavailable.
 */
export async function runIngestionWithFallback(
  liveEventFeedAvailable: boolean
): Promise<void> {
  console.log('=== Ingestion with Fallback Logic ===\n');

  if (liveEventFeedAvailable) {
    console.log('✓ Live event feed is available');
    console.log('✓ Connecting to live XML feed...');
    console.log('✓ Processing real-time match events\n');

    // In real implementation:
    // - Connect to live event feed
    // - Parse XML events
    // - Normalize and publish to EventBridge
  } else {
    console.log('⚠ Live event feed is UNAVAILABLE');
    console.log('✓ Activating simulator mode as fallback');
    console.log('✓ Replaying recorded match events\n');

    // Activate simulator mode
    const simulator = createSimulator({
      enabled: true, // Force enable regardless of env var
      speedMultiplier: 5.0,
      loop: false,
    });

    simulator.start(async (event: MatchEvent) => {
      console.log(`[Simulator] ${event.eventType} at ${event.timestamp}`);

      // Process event through normal pipeline
      const normalizeResult = normalizeEvent(event);
      if (normalizeResult.isValid) {
        await publishToEventBridge(normalizeResult.event!);
      }
    });

    // In real implementation, simulator would run until live feed becomes available
    console.log('✓ Simulator is running');
    console.log('✓ Will switch back to live feed when available\n');
  }
}

/**
 * Example: User notification for simulator mode
 *
 * This function demonstrates how to notify users that simulated data is being used
 * (Requirement 2.8)
 */
export function getUserNotification(isSimulatorMode: boolean): string {
  if (isSimulatorMode) {
    return '⚠ Demo Mode: Using simulated match data for demonstration purposes';
  } else {
    return '✓ Live Mode: Receiving real-time match events';
  }
}

// Run example if executed directly
if (require.main === module) {
  // Set simulator mode for demo
  process.env.SIMULATOR_MODE = 'true';

  runIngestionWithSimulator()
    .then(() => {
      console.log('Example completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Example failed:', error);
      process.exit(1);
    });
}
