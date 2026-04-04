/**
 * Match API Lambda Handler
 * Provides REST API endpoints for fetching available matches
 */

import { APIGatewayProxyResult } from 'aws-lambda';
import {
  getCachedMatches,
  categorizeMatches,
  refreshMatchCache,
} from './matchCache';

/**
 * GET /matches - Get available matches grouped by theme
 */
export async function handler(
  event: any
): Promise<APIGatewayProxyResult> {
  console.log('Match API request:', JSON.stringify(event));

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
  };

  // HTTP API Gateway v2 uses different event structure
  const httpMethod = event.requestContext?.http?.method || event.httpMethod;
  const path = event.requestContext?.http?.path || event.path || event.rawPath;

  console.log('Parsed request:', { httpMethod, path });

  // Handle OPTIONS request for CORS
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Handle GET /matches (support both /matches and /prod/matches paths)
  const isGetMatches = httpMethod === 'GET' && 
    (path === '/matches' || path === '/prod/matches' || path?.endsWith('/matches'));
  
  if (isGetMatches) {
    try {
      // Get cached matches from DynamoDB
      const matches = await getCachedMatches();

      // If no matches cached, try to refresh cache
      if (matches.length === 0) {
        console.log('No cached matches, attempting to refresh...');
        await refreshMatchCache();
        const refreshedMatches = await getCachedMatches();

        if (refreshedMatches.length === 0) {
          // Still no matches, return empty response
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              Country: [],
              Club: [],
              Private: [],
              message: 'No matches available. Try again later.',
            }),
          };
        }

        const categorized = categorizeMatches(refreshedMatches);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(categorized),
        };
      }

      // Categorize matches by theme
      const categorized = categorizeMatches(matches);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(categorized),
      };
    } catch (error) {
      console.error('Error fetching matches:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to fetch matches',
          message: error instanceof Error ? error.message : String(error),
        }),
      };
    }
  }

  // Handle POST /matches/refresh (manual cache refresh)
  const isRefreshMatches = httpMethod === 'POST' && 
    (path === '/matches/refresh' || path === '/prod/matches/refresh' || path?.endsWith('/matches/refresh'));
  
  if (isRefreshMatches) {
    try {
      const result = await refreshMatchCache();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          cached: result.cached,
          errors: result.errors,
        }),
      };
    } catch (error) {
      console.error('Error refreshing match cache:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to refresh match cache',
          message: error instanceof Error ? error.message : String(error),
        }),
      };
    }
  }

  // Unknown route
  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({
      error: 'Not found',
      message: `Route ${httpMethod} ${path} not found`,
    }),
  };
}
