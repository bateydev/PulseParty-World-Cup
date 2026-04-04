/**
 * Match Cache Service
 * Fetches and caches available matches from API-Football
 * Stores in DynamoDB to reduce API calls
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  fetchLiveFixtures,
  ApiFootballFixture,
} from '../ingestion/apiFootball';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'PulsePartyTable-v2';
const CACHE_TTL_HOURS = 24; // Matches expire after 24 hours

export interface CachedMatch {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startTime: string;
  status: 'scheduled' | 'live' | 'finished';
  homeScore?: number;
  awayScore?: number;
}

/**
 * Transform API-Football fixture to cached match format
 */
function transformFixture(fixture: ApiFootballFixture): CachedMatch {
  return {
    matchId: `match-${fixture.fixture.id}`,
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    league: fixture.league?.name || 'Unknown League',
    startTime: fixture.fixture.date,
    status:
      fixture.fixture.status.short === 'LIVE'
        ? 'live'
        : fixture.fixture.status.short === 'FT'
          ? 'finished'
          : 'scheduled',
    homeScore: fixture.goals.home ?? undefined,
    awayScore: fixture.goals.away ?? undefined,
  };
}

/**
 * Fetch matches from API-Football and cache in DynamoDB
 * Called by scheduled Lambda every 15 minutes
 */
export async function refreshMatchCache(): Promise<{
  cached: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let cached = 0;

  try {
    console.log('Fetching live and upcoming fixtures from API-Football...');

    // Fetch live fixtures
    const liveFixtures = await fetchLiveFixtures();
    console.log(`Found ${liveFixtures.length} live fixtures`);

    // TODO: Also fetch upcoming fixtures (next 7 days)
    // For now, we'll just cache live fixtures

    const ttl = Math.floor(Date.now() / 1000) + CACHE_TTL_HOURS * 3600;

    for (const fixture of liveFixtures) {
      try {
        const match = transformFixture(fixture);

        await docClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              PK: 'MATCH_CACHE',
              SK: match.matchId,
              ...match,
              cachedAt: new Date().toISOString(),
              ttl,
            },
          })
        );

        cached++;
      } catch (error) {
        const errorMsg = `Failed to cache match ${fixture.fixture.id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`Successfully cached ${cached} matches`);
    return { cached, errors };
  } catch (error) {
    const errorMsg = `Failed to refresh match cache: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return { cached, errors };
  }
}

/**
 * Get cached matches from DynamoDB
 * Called by API endpoint when frontend requests matches
 */
export async function getCachedMatches(): Promise<CachedMatch[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'MATCH_CACHE',
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      console.log('No cached matches found');
      return [];
    }

    // Filter out expired items (DynamoDB TTL might not have deleted them yet)
    const now = Math.floor(Date.now() / 1000);
    const validMatches = result.Items.filter(
      (item) => !item.ttl || item.ttl > now
    );

    console.log(`Retrieved ${validMatches.length} cached matches`);
    return validMatches as CachedMatch[];
  } catch (error) {
    console.error('Failed to get cached matches:', error);
    throw error;
  }
}

/**
 * Get matches grouped by theme (Country/Club/Private)
 * This is a simple categorization based on league names
 */
export function categorizeMatches(matches: CachedMatch[]): {
  Country: CachedMatch[];
  Club: CachedMatch[];
  Private: CachedMatch[];
} {
  const categories = {
    Country: [] as CachedMatch[],
    Club: [] as CachedMatch[],
    Private: [] as CachedMatch[],
  };

  const internationalLeagues = [
    'World Cup',
    'UEFA Nations League',
    'International Friendly',
    'Euro Championship',
    'Copa America',
    'African Cup of Nations',
  ];

  for (const match of matches) {
    // Check if it's an international match
    const isInternational = internationalLeagues.some((league) =>
      match.league.toLowerCase().includes(league.toLowerCase())
    );

    if (isInternational) {
      categories.Country.push(match);
    } else {
      categories.Club.push(match);
    }
  }

  return categories;
}
