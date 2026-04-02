import { MatchEvent } from '../types';

/**
 * Event Normalizer
 * Converts parsed XML data to standardized JSON schema and validates required fields
 *
 * Requirements:
 * - 2.2: Normalize event data into standardized internal format
 * - 11.4: Normalize to standardized JSON schema with consistent field names and data types
 * - 11.5: Validate that each normalized event contains required fields (event_type, timestamp, match_id)
 */

export interface NormalizationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface NormalizedResult {
  event: MatchEvent | null;
  errors: NormalizationError[];
  isValid: boolean;
}

/**
 * Normalize and validate a match event
 * Ensures the event conforms to the standardized JSON schema with all required fields
 *
 * @param event - Parsed match event data
 * @returns NormalizedResult with validated event or errors
 */
export function normalizeEvent(event: Partial<MatchEvent>): NormalizedResult {
  const errors: NormalizationError[] = [];

  // Validate required field: event_type (eventType)
  if (!event.eventType) {
    errors.push({
      field: 'eventType',
      message: 'Missing required field: event_type',
      value: event.eventType,
    });
  }

  // Validate required field: timestamp
  if (!event.timestamp) {
    errors.push({
      field: 'timestamp',
      message: 'Missing required field: timestamp',
      value: event.timestamp,
    });
  } else if (!isValidISO8601(event.timestamp)) {
    errors.push({
      field: 'timestamp',
      message: 'Invalid timestamp format: must be ISO 8601',
      value: event.timestamp,
    });
  }

  // Validate required field: match_id (matchId)
  if (!event.matchId) {
    errors.push({
      field: 'matchId',
      message: 'Missing required field: match_id',
      value: event.matchId,
    });
  }

  // Validate required field: teamId
  if (!event.teamId) {
    errors.push({
      field: 'teamId',
      message: 'Missing required field: teamId',
      value: event.teamId,
    });
  }

  // Validate required field: eventId
  if (!event.eventId) {
    errors.push({
      field: 'eventId',
      message: 'Missing required field: eventId',
      value: event.eventId,
    });
  }

  // If there are validation errors, return invalid result
  if (errors.length > 0) {
    console.error('Event normalization failed:', {
      errors,
      event,
      timestamp: new Date().toISOString(),
    });

    return {
      event: null,
      errors,
      isValid: false,
    };
  }

  // All required fields are present and valid
  // Return the normalized event with standardized field names
  const normalizedEvent: MatchEvent = {
    eventId: event.eventId!,
    matchId: event.matchId!,
    eventType: event.eventType!,
    timestamp: event.timestamp!,
    teamId: event.teamId!,
    playerId: event.playerId,
    metadata: event.metadata || {},
  };

  return {
    event: normalizedEvent,
    errors: [],
    isValid: true,
  };
}

/**
 * Validate ISO 8601 timestamp format
 * @param timestamp - Timestamp string to validate
 * @returns true if valid ISO 8601 format
 */
function isValidISO8601(timestamp: string): boolean {
  try {
    const date = new Date(timestamp);
    // Check if date is valid and the ISO string matches the input
    return !isNaN(date.getTime()) && date.toISOString() === timestamp;
  } catch {
    return false;
  }
}

/**
 * Batch normalize multiple events
 * Useful for processing multiple events from a feed
 *
 * @param events - Array of parsed match events
 * @returns Array of normalized results
 */
export function normalizeEvents(
  events: Partial<MatchEvent>[]
): NormalizedResult[] {
  return events.map((event) => normalizeEvent(event));
}

/**
 * Filter valid events from normalization results
 * @param results - Array of normalization results
 * @returns Array of valid MatchEvent objects
 */
export function getValidEvents(results: NormalizedResult[]): MatchEvent[] {
  return results.filter((result) => result.isValid).map((result) => result.event!);
}
