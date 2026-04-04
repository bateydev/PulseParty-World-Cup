/**
 * Match Cache Refresh Lambda Handler
 * Scheduled to run every 15 minutes to keep match cache fresh
 */

import { refreshMatchCache } from './matchCache';

export async function handler(): Promise<{
  success: boolean;
  cached: number;
  errors: string[];
}> {
  console.log('Starting scheduled match cache refresh...');

  try {
    const result = await refreshMatchCache();

    console.log(
      `Match cache refresh complete: ${result.cached} matches cached`
    );

    if (result.errors.length > 0) {
      console.error(
        `Encountered ${result.errors.length} errors during refresh`
      );
    }

    return {
      success: result.cached > 0 || result.errors.length === 0,
      cached: result.cached,
      errors: result.errors,
    };
  } catch (error) {
    console.error('Match cache refresh failed:', error);
    return {
      success: false,
      cached: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
