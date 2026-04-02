import { XMLParser } from 'fast-xml-parser';
import { MatchEvent } from '../types';

/**
 * XML Parser for match event feed
 * Extracts event data from XML format and converts to MatchEvent interface
 *
 * Requirements:
 * - 2.1: Parse XML data and extract event type, timestamp, team, player within 200ms
 * - 11.1: Parse XML structure and extract all MatchEvent nodes
 * - 11.2: Extract event type, timestamp, team identifier, player identifier, and metadata
 * - 11.3: Log errors with malformed XML snippet and continue processing
 */

export interface XMLParseError {
  message: string;
  xmlSnippet: string;
  timestamp: string;
}

export interface ParseResult {
  events: MatchEvent[];
  errors: XMLParseError[];
}

/**
 * Parse XML event feed and extract match events
 * @param xml - XML string containing match event data
 * @returns ParseResult with successfully parsed events and any errors encountered
 */
export function parseXMLEvent(xml: string): ParseResult {
  const errors: XMLParseError[] = [];
  const events: MatchEvent[] = [];

  try {
    // Configure XML parser
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      trimValues: true,
    });

    // Parse XML
    const parsed = parser.parse(xml);

    // Extract events from parsed structure
    // Support both single event and multiple events
    const eventNodes = extractEventNodes(parsed);

    for (const eventNode of eventNodes) {
      try {
        const matchEvent = parseEventNode(eventNode);
        events.push(matchEvent);
      } catch (error) {
        // Log error with XML snippet and continue processing (Requirement 11.3)
        const xmlSnippet = xml.substring(0, 200); // First 200 chars as snippet
        const parseError: XMLParseError = {
          message:
            error instanceof Error ? error.message : 'Unknown parsing error',
          xmlSnippet,
          timestamp: new Date().toISOString(),
        };
        errors.push(parseError);

        // Log to console for CloudWatch
        console.error('XML parsing error:', {
          error: parseError.message,
          snippet: parseError.xmlSnippet,
          timestamp: parseError.timestamp,
        });
      }
    }
  } catch (error) {
    // Handle complete XML parsing failure
    const xmlSnippet = xml.substring(0, 200);
    const parseError: XMLParseError = {
      message: error instanceof Error ? error.message : 'Failed to parse XML',
      xmlSnippet,
      timestamp: new Date().toISOString(),
    };
    errors.push(parseError);

    console.error('Critical XML parsing error:', {
      error: parseError.message,
      snippet: parseError.xmlSnippet,
      timestamp: parseError.timestamp,
    });
  }

  return { events, errors };
}

/**
 * Extract event nodes from parsed XML structure
 * Handles various XML structures (single event, multiple events, nested structures)
 */
function extractEventNodes(parsed: any): any[] {
  // Handle different possible XML structures
  if (!parsed) {
    return [];
  }

  // Check for common root elements
  if (parsed.events?.event) {
    // <events><event>...</event><event>...</event></events>
    return Array.isArray(parsed.events.event)
      ? parsed.events.event
      : [parsed.events.event];
  }

  if (parsed.matchEvents?.matchEvent) {
    // <matchEvents><matchEvent>...</matchEvent></matchEvents>
    return Array.isArray(parsed.matchEvents.matchEvent)
      ? parsed.matchEvents.matchEvent
      : [parsed.matchEvents.matchEvent];
  }

  if (parsed.event) {
    // <event>...</event>
    return Array.isArray(parsed.event) ? parsed.event : [parsed.event];
  }

  if (parsed.matchEvent) {
    // <matchEvent>...</matchEvent>
    return Array.isArray(parsed.matchEvent)
      ? parsed.matchEvent
      : [parsed.matchEvent];
  }

  // If no recognized structure, return empty array
  return [];
}

/**
 * Parse a single event node into a MatchEvent
 * Extracts required fields and validates data
 */
function parseEventNode(eventNode: any): MatchEvent {
  // Extract event type (required)
  const eventType = extractEventType(eventNode);
  if (!eventType) {
    throw new Error('Missing required field: eventType');
  }

  // Extract timestamp (required)
  const timestamp = extractTimestamp(eventNode);
  if (!timestamp) {
    throw new Error('Missing required field: timestamp');
  }

  // Extract match ID (required)
  const matchId = extractMatchId(eventNode);
  if (!matchId) {
    throw new Error('Missing required field: matchId');
  }

  // Extract team ID (required)
  const teamId = extractTeamId(eventNode);
  if (!teamId) {
    throw new Error('Missing required field: teamId');
  }

  // Extract event ID (generate if not present)
  const eventId = extractEventId(eventNode);

  // Extract player ID (optional)
  const playerId = extractPlayerId(eventNode);

  // Extract additional metadata
  const metadata = extractMetadata(eventNode);

  return {
    eventId,
    matchId,
    eventType,
    timestamp,
    teamId,
    playerId,
    metadata,
  };
}

/**
 * Extract and normalize event type from event node
 */
function extractEventType(node: any): MatchEvent['eventType'] | null {
  const rawType =
    node.eventType || node.type || node['@_type'] || node.event_type;

  if (!rawType) {
    return null;
  }

  // Normalize to lowercase and map to valid event types
  const normalized = String(rawType).toLowerCase().trim();

  const typeMap: Record<string, MatchEvent['eventType']> = {
    goal: 'goal',
    assist: 'assist',
    yellow_card: 'yellow_card',
    yellowcard: 'yellow_card',
    yellow: 'yellow_card',
    red_card: 'red_card',
    redcard: 'red_card',
    red: 'red_card',
    substitution: 'substitution',
    sub: 'substitution',
    corner: 'corner',
    shot: 'shot',
    possession: 'possession',
  };

  return typeMap[normalized] || null;
}

/**
 * Extract and normalize timestamp from event node
 */
function extractTimestamp(node: any): string | null {
  const rawTimestamp =
    node.timestamp || node.time || node['@_timestamp'] || node.event_time;

  if (!rawTimestamp) {
    return null;
  }

  // Convert to ISO 8601 format if not already
  try {
    const date = new Date(rawTimestamp);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Extract match ID from event node
 */
function extractMatchId(node: any): string | null {
  return (
    node.matchId || node.match_id || node['@_matchId'] || node.match || null
  );
}

/**
 * Extract team ID from event node
 */
function extractTeamId(node: any): string | null {
  return node.teamId || node.team_id || node['@_teamId'] || node.team || null;
}

/**
 * Extract or generate event ID
 */
function extractEventId(node: any): string {
  const id = node.eventId || node.event_id || node['@_eventId'] || node.id;

  if (id) {
    return String(id);
  }

  // Generate a unique ID if not present
  return `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extract player ID from event node (optional)
 */
function extractPlayerId(node: any): string | undefined {
  const playerId =
    node.playerId || node.player_id || node['@_playerId'] || node.player;
  return playerId ? String(playerId) : undefined;
}

/**
 * Extract additional metadata from event node
 */
function extractMetadata(node: any): Record<string, any> {
  const metadata: Record<string, any> = {};

  // List of known fields to exclude from metadata
  const knownFields = new Set([
    'eventId',
    'event_id',
    'id',
    'matchId',
    'match_id',
    'match',
    'eventType',
    'type',
    'event_type',
    'timestamp',
    'time',
    'event_time',
    'teamId',
    'team_id',
    'team',
    'playerId',
    'player_id',
    'player',
    '@_eventId',
    '@_matchId',
    '@_type',
    '@_timestamp',
    '@_teamId',
    '@_playerId',
  ]);

  // Extract any additional fields as metadata
  for (const [key, value] of Object.entries(node)) {
    if (!knownFields.has(key) && value !== undefined && value !== null) {
      metadata[key] = value;
    }
  }

  return metadata;
}
