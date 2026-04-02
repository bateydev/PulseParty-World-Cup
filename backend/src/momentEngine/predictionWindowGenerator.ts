import { MatchEvent, PredictionWindow } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Prediction Window Generator
 * Generates prediction windows triggered by match events or time intervals
 *
 * Requirements:
 * - 3.1: Generate prediction windows when specific match events occur (goal, corner, free kick)
 * - 3.2: Generate time-based prediction windows at 10-minute intervals
 * - 3.8: Define prediction types: next_goal_scorer, next_card, next_corner, match_outcome
 */

/**
 * Event types that trigger prediction window generation
 */
export const TRIGGER_EVENT_TYPES = ['goal', 'corner'] as const;

/**
 * Time interval for generating time-based predictions (in milliseconds)
 */
export const TIME_BASED_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Default prediction window duration (in seconds)
 */
export const DEFAULT_WINDOW_DURATION_SECONDS = 30;

/**
 * Prediction window configuration for different event types
 */
interface PredictionConfig {
  predictionType: PredictionWindow['predictionType'];
  options: string[];
  durationSeconds: number;
}

/**
 * Get prediction configuration based on event type
 */
function getPredictionConfigForEvent(
  eventType: MatchEvent['eventType']
): PredictionConfig | null {
  switch (eventType) {
    case 'goal':
      return {
        predictionType: 'next_goal_scorer',
        options: ['Home Team', 'Away Team', 'No Goal in Next 10 Minutes'],
        durationSeconds: 30,
      };

    case 'corner':
      return {
        predictionType: 'next_corner',
        options: ['Home Team', 'Away Team', 'No Corner in Next 5 Minutes'],
        durationSeconds: 25,
      };

    default:
      return null;
  }
}

/**
 * Get prediction configuration for time-based predictions
 */
function getTimeBasedPredictionConfig(): PredictionConfig {
  return {
    predictionType: 'match_outcome',
    options: ['Home Win', 'Draw', 'Away Win'],
    durationSeconds: 45,
  };
}

/**
 * Generate a prediction window from a match event
 *
 * @param event - Match event that triggers the prediction window
 * @param roomId - Room ID where the prediction window will be active
 * @returns PredictionWindow or null if event doesn't trigger a prediction
 */
export function generatePredictionWindow(
  event: MatchEvent,
  roomId: string
): PredictionWindow | null {
  // Check if this event type triggers a prediction window
  const config = getPredictionConfigForEvent(event.eventType);

  if (!config) {
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.durationSeconds * 1000);

  const predictionWindow: PredictionWindow = {
    windowId: uuidv4(),
    roomId,
    matchId: event.matchId,
    predictionType: config.predictionType,
    options: config.options,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  };

  return predictionWindow;
}

/**
 * Generate a time-based prediction window
 * Called at regular intervals (10 minutes) when no match events occur
 *
 * @param matchId - Match ID for the prediction window
 * @param roomId - Room ID where the prediction window will be active
 * @returns PredictionWindow
 */
export function generateTimeBasedPredictionWindow(
  matchId: string,
  roomId: string
): PredictionWindow {
  const config = getTimeBasedPredictionConfig();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.durationSeconds * 1000);

  const predictionWindow: PredictionWindow = {
    windowId: uuidv4(),
    roomId,
    matchId,
    predictionType: config.predictionType,
    options: config.options,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  };

  return predictionWindow;
}

/**
 * Check if an event type should trigger a prediction window
 *
 * @param eventType - Match event type
 * @returns true if the event should trigger a prediction window
 */
export function shouldTriggerPrediction(
  eventType: MatchEvent['eventType']
): boolean {
  return TRIGGER_EVENT_TYPES.includes(eventType as any);
}

/**
 * Calculate remaining time in a prediction window
 *
 * @param window - Prediction window
 * @returns Remaining time in seconds, or 0 if expired
 */
export function getRemainingTime(window: PredictionWindow): number {
  const now = new Date();
  const expiresAt = new Date(window.expiresAt);
  const remainingMs = expiresAt.getTime() - now.getTime();

  return Math.max(0, Math.floor(remainingMs / 1000));
}

/**
 * Check if a prediction window has expired
 *
 * @param window - Prediction window
 * @returns true if the window has expired
 */
export function isWindowExpired(window: PredictionWindow): boolean {
  return getRemainingTime(window) === 0;
}
