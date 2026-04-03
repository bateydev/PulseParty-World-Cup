/**
 * Ingestion Module Entry Point
 * Exports the Lambda handler and all ingestion utilities
 */

export { handler } from './handler';
export { fetchLiveMatchEvents, fetchLiveFixtures, fetchFixtureEvents } from './apiFootball';
export { createSimulator } from './simulator';
export { normalizeEvent, normalizeEvents, getValidEvents } from './normalizer';
export { publishToEventBridge, publishEventsToEventBridge } from './eventBridgePublisher';
