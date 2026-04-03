/**
 * Ingestion Lambda Handler
 * Orchestrates the complete ingestion pipeline:
 * 1. Fetch live match data from API-Football (or use simulator as fallback)
 * 2. Transform to internal MatchEvent format
 * 3. Normalize events
 * 4. Publish to EventBridge
 *
 * Triggered by: EventBridge scheduled rule (every 30 seconds during match hours)
 */

import { fetchLiveMatchEvents, filterNewEvents } from './apiFootball';
import { createSimulator } from './simulator';
import { normalizeEvents, getValidEvents } from './normalizer';
import { publishEventsToEventBridge } from './eventBridgePublisher';

export interface IngestionResult {
  success: boolean;
  mode: 'live' | 'simulator';
  eventsFetched: number;
  eventsNormalized: number;
  eventsPublished: number;
  errors: string[];
}

/**
 * Main Lambda handler for ingestion pipeline
 */
export async function handler(event: unknown): Promise<IngestionResult> {
  console.log('Ingestion Lambda triggered:', JSON.stringify(event));

  const errors: string[] = [];
  let mode: 'live' | 'simulator' = 'live';
  let eventsFetched = 0;
  let eventsNormalized = 0;
  let eventsPublished = 0;

  try {
    // Check if API key is configured
    const apiKey = process.env.API_FOOTBALL_KEY;
    const simulatorMode = process.env.SIMULATOR_MODE === 'true';

    let matchEvents: Awaited<ReturnType<typeof fetchLiveMatchEvents>> = [];

    // Try to fetch live data if API key is configured and simulator is not forced
    if (apiKey && !simulatorMode) {
      try {
        console.log('Fetching live match data from API-Football...');
        const allEvents = await fetchLiveMatchEvents();

        // Filter out already processed events to avoid duplicates
        matchEvents = filterNewEvents(allEvents);

        eventsFetched = matchEvents.length;
        console.log(`Fetched ${eventsFetched} new events from API-Football`);
      } catch (error) {
        const errorMsg = `Failed to fetch live data: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        errors.push(errorMsg);

        // Fall back to simulator mode
        console.log('Falling back to simulator mode...');
        mode = 'simulator';
      }
    } else {
      // Use simulator mode
      console.log('Using simulator mode (API key not configured or simulator forced)');
      mode = 'simulator';
    }

    // If in simulator mode, use recorded events
    if (mode === 'simulator') {
      matchEvents = await runSimulator();
      eventsFetched = matchEvents.length;
    }

    // If no events, return early
    if (matchEvents.length === 0) {
      console.log('No events to process');
      return {
        success: true,
        mode,
        eventsFetched: 0,
        eventsNormalized: 0,
        eventsPublished: 0,
        errors,
      };
    }

    // Normalize events
    console.log(`Normalizing ${matchEvents.length} events...`);
    const normalizeResults = normalizeEvents(matchEvents);
    const validEvents = getValidEvents(normalizeResults);
    eventsNormalized = validEvents.length;

    // Log normalization errors
    normalizeResults.forEach((result, index) => {
      if (!result.isValid) {
        const errorMsg = `Event ${index} normalization failed: ${result.errors.map((e) => e.message).join(', ')}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    });

    console.log(`Normalized ${eventsNormalized}/${matchEvents.length} events`);

    // Publish to EventBridge
    if (validEvents.length > 0) {
      console.log(`Publishing ${validEvents.length} events to EventBridge...`);
      const publishResults = await publishEventsToEventBridge(validEvents);

      // Count successful publishes
      eventsPublished = publishResults.filter((r) => r.success).length;

      // Log publish errors
      publishResults.forEach((result, index) => {
        if (!result.success) {
          const errorMsg = `Event ${validEvents[index].eventId} publish failed: ${result.error?.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      });

      console.log(`Published ${eventsPublished}/${validEvents.length} events`);
    }

    // Return result
    const result: IngestionResult = {
      success: eventsPublished > 0 || (eventsFetched === 0 && errors.length === 0),
      mode,
      eventsFetched,
      eventsNormalized,
      eventsPublished,
      errors,
    };

    console.log('Ingestion complete:', JSON.stringify(result));
    return result;
  } catch (error) {
    const errorMsg = `Ingestion pipeline failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    errors.push(errorMsg);

    return {
      success: false,
      mode,
      eventsFetched,
      eventsNormalized,
      eventsPublished,
      errors,
    };
  }
}

/**
 * Run simulator and return a batch of events
 * In simulator mode, we return a few events per invocation to simulate real-time flow
 */
async function runSimulator(): Promise<Awaited<ReturnType<typeof fetchLiveMatchEvents>>> {
  return new Promise((resolve) => {
    const simulator = createSimulator({
      enabled: true,
      speedMultiplier: 10.0, // 10x speed for demo
      loop: false,
    });

    const events: Awaited<ReturnType<typeof fetchLiveMatchEvents>> = [];

    simulator.start((event) => {
      events.push(event);

      // Return first 3 events per invocation to simulate real-time flow
      if (events.length >= 3) {
        simulator.stop();
        resolve(events);
      }
    });

    // If simulator completes before 3 events, return what we have
    setTimeout(() => {
      if (!simulator.isActive()) {
        resolve(events);
      }
    }, 5000);
  });
}
