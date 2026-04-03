/**
 * API-Football Integration
 * Fetches live match data from API-Football and transforms it to internal MatchEvent format
 *
 * API Documentation: https://www.api-football.com/documentation-v3
 * Free Tier: 100 requests/day
 */

import { MatchEvent } from '../types';

export interface ApiFootballConfig {
  apiKey: string;
  baseUrl: string;
}

export interface ApiFootballFixture {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string; // 'NS', 'LIVE', 'FT', 'HT', etc.
      elapsed: number | null;
    };
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
}

export interface ApiFootballEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string };
  player: { id: number; name: string };
  assist: { id: number | null; name: string | null };
  type: string; // 'Goal', 'Card', 'subst', 'Var'
  detail: string; // 'Normal Goal', 'Yellow Card', 'Red Card', 'Substitution 1', etc.
  comments: string | null;
}

const DEFAULT_CONFIG: ApiFootballConfig = {
  apiKey: process.env.API_FOOTBALL_KEY || '',
  baseUrl: 'https://v3.football.api-sports.io',
};

/**
 * Fetch live fixtures from API-Football
 * @param config - API configuration
 * @returns Array of live fixtures
 */
export async function fetchLiveFixtures(
  config: ApiFootballConfig = DEFAULT_CONFIG
): Promise<ApiFootballFixture[]> {
  if (!config.apiKey) {
    throw new Error('API_FOOTBALL_KEY environment variable is required');
  }

  const url = `${config.baseUrl}/fixtures?live=all`;

  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': config.apiKey,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  if (!response.ok) {
    throw new Error(
      `API-Football request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    errors?: Record<string, unknown>;
    response?: ApiFootballFixture[];
  };

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API-Football error: ${JSON.stringify(data.errors)}`);
  }

  return data.response || [];
}

/**
 * Fetch events for a specific fixture
 * @param fixtureId - Fixture ID
 * @param config - API configuration
 * @returns Array of match events
 */
export async function fetchFixtureEvents(
  fixtureId: number,
  config: ApiFootballConfig = DEFAULT_CONFIG
): Promise<ApiFootballEvent[]> {
  if (!config.apiKey) {
    throw new Error('API_FOOTBALL_KEY environment variable is required');
  }

  const url = `${config.baseUrl}/fixtures/events?fixture=${fixtureId}`;

  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': config.apiKey,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  if (!response.ok) {
    throw new Error(
      `API-Football request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    errors?: Record<string, unknown>;
    response?: ApiFootballEvent[];
  };

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API-Football error: ${JSON.stringify(data.errors)}`);
  }

  return data.response || [];
}

/**
 * Transform API-Football event to internal MatchEvent format
 * @param apiEvent - API-Football event
 * @param fixture - Fixture information
 * @returns Internal MatchEvent
 */
export function transformApiFootballEvent(
  apiEvent: ApiFootballEvent,
  fixture: ApiFootballFixture
): MatchEvent | null {
  const matchId = `match-${fixture.fixture.id}`;
  const teamId = `team-${apiEvent.team.id}`;
  const playerId = apiEvent.player?.id ? `player-${apiEvent.player.id}` : undefined;
  const timestamp = new Date().toISOString();

  // Determine event type based on API-Football type and detail
  let eventType: MatchEvent['eventType'];
  const apiType = apiEvent.type.toLowerCase();
  const apiDetail = apiEvent.detail.toLowerCase();

  if (apiType === 'goal') {
    eventType = 'goal';
  } else if (apiType === 'card') {
    if (apiDetail.includes('yellow')) {
      eventType = 'yellow_card';
    } else if (apiDetail.includes('red')) {
      eventType = 'red_card';
    } else {
      return null; // Unknown card type
    }
  } else if (apiType === 'subst') {
    eventType = 'substitution';
  } else {
    // Unsupported event type
    return null;
  }

  // Build metadata
  const metadata: Record<string, unknown> = {
    minute: apiEvent.time.elapsed,
    half: apiEvent.time.elapsed <= 45 ? 1 : 2,
    description: `${apiEvent.detail} - ${apiEvent.player.name}`,
    apiFootballId: fixture.fixture.id,
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
  };

  // Add goal-specific metadata
  if (eventType === 'goal') {
    metadata.score = {
      home: fixture.goals.home,
      away: fixture.goals.away,
    };
    if (apiEvent.assist?.id) {
      metadata.assistBy = `player-${apiEvent.assist.id}`;
      metadata.assistName = apiEvent.assist.name;
    }
  }

  // Add card-specific metadata
  if (eventType === 'yellow_card' || eventType === 'red_card') {
    metadata.reason = apiEvent.comments || apiEvent.detail;
  }

  // Add substitution-specific metadata
  if (eventType === 'substitution') {
    metadata.playerIn = apiEvent.player.name;
    if (apiEvent.assist?.name) {
      metadata.playerOut = apiEvent.assist.name;
    }
  }

  // Generate unique event ID
  const eventId = `evt-${fixture.fixture.id}-${apiEvent.time.elapsed}-${apiEvent.type}-${apiEvent.player.id}`;

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
 * Fetch and transform all events for live fixtures
 * @param config - API configuration
 * @returns Array of internal MatchEvents
 */
export async function fetchLiveMatchEvents(
  config: ApiFootballConfig = DEFAULT_CONFIG
): Promise<MatchEvent[]> {
  console.log('Fetching live fixtures from API-Football...');

  // Fetch all live fixtures
  const fixtures = await fetchLiveFixtures(config);

  if (fixtures.length === 0) {
    console.log('No live fixtures found');
    return [];
  }

  console.log(`Found ${fixtures.length} live fixtures`);

  // Fetch events for each fixture
  const allEvents: MatchEvent[] = [];

  for (const fixture of fixtures) {
    try {
      console.log(
        `Fetching events for fixture ${fixture.fixture.id}: ${fixture.teams.home.name} vs ${fixture.teams.away.name}`
      );

      const apiEvents = await fetchFixtureEvents(fixture.fixture.id, config);

      // Transform each event
      for (const apiEvent of apiEvents) {
        const matchEvent = transformApiFootballEvent(apiEvent, fixture);
        if (matchEvent) {
          allEvents.push(matchEvent);
        }
      }

      console.log(
        `Transformed ${apiEvents.length} events for fixture ${fixture.fixture.id}`
      );
    } catch (error) {
      console.error(
        `Error fetching events for fixture ${fixture.fixture.id}:`,
        error
      );
      // Continue with other fixtures
    }
  }

  console.log(`Total events fetched: ${allEvents.length}`);
  return allEvents;
}

/**
 * Track processed events to avoid duplicates
 * In production, this should use DynamoDB or Redis
 */
const processedEventIds = new Set<string>();

/**
 * Filter out already processed events
 * @param events - Array of match events
 * @returns Array of new events only
 */
export function filterNewEvents(events: MatchEvent[]): MatchEvent[] {
  const newEvents = events.filter((event) => !processedEventIds.has(event.eventId));

  // Mark new events as processed
  newEvents.forEach((event) => processedEventIds.add(event.eventId));

  return newEvents;
}

/**
 * Clear processed events cache (for testing)
 */
export function clearProcessedEvents(): void {
  processedEventIds.clear();
}
