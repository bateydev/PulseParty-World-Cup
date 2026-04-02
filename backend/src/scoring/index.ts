/**
 * Scoring Module
 * Exports scoring-related functions for calculating points, applying multipliers, and managing leaderboards
 */

export {
  calculatePoints,
  applyStreakMultiplier,
  applyClutchBonus,
  type Difficulty,
} from './pointsCalculation';

export { updateLeaderboard } from './leaderboardManagement';
