/**
 * Points Calculation Module
 * Handles scoring logic for predictions including base points, streak multipliers, and clutch bonuses
 *
 * Requirements:
 * - 4.1: Award base points according to prediction difficulty
 * - 4.2: Apply streak multiplier to consecutive correct predictions
 * - 4.3: Apply clutch bonus for predictions in final 10 seconds
 */

/**
 * Difficulty levels for predictions
 */
export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Calculate base points based on prediction difficulty
 *
 * @param difficulty - The difficulty level of the prediction
 * @returns Base points: 10 for easy, 25 for medium, 50 for hard
 *
 * Validates: Requirements 4.1
 */
export function calculatePoints(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
      return 10;
    case 'medium':
      return 25;
    case 'hard':
      return 50;
    default:
      throw new Error(`Invalid difficulty: ${difficulty}`);
  }
}

/**
 * Apply streak multiplier to base points
 * Multiplier formula: 1.0 + (0.1 × streak), capped at 2.0
 *
 * @param basePoints - The base points before multiplier
 * @param streak - Number of consecutive correct predictions
 * @returns Points after applying streak multiplier
 *
 * Validates: Requirements 4.2
 */
export function applyStreakMultiplier(
  basePoints: number,
  streak: number
): number {
  // Calculate multiplier: 1.0 + (0.1 × streak)
  const multiplier = Math.min(1.0 + 0.1 * streak, 2.0);
  return Math.round(basePoints * multiplier);
}

/**
 * Apply clutch bonus if prediction was submitted in final 10 seconds
 * Clutch bonus: 1.5× multiplier
 *
 * @param basePoints - The base points before bonus
 * @param submittedAt - ISO 8601 timestamp when prediction was submitted
 * @param expiresAt - ISO 8601 timestamp when prediction window expires
 * @returns Points after applying clutch bonus (1.5× if in final 10 seconds, otherwise unchanged)
 *
 * Validates: Requirements 4.3
 */
export function applyClutchBonus(
  basePoints: number,
  submittedAt: string,
  expiresAt: string
): number {
  const submittedTime = new Date(submittedAt).getTime();
  const expiresTime = new Date(expiresAt).getTime();

  // Calculate time remaining in milliseconds
  const timeRemaining = expiresTime - submittedTime;

  // Check if submitted in final 10 seconds (10000 milliseconds)
  const isClutch = timeRemaining <= 10000 && timeRemaining >= 0;

  if (isClutch) {
    return Math.round(basePoints * 1.5);
  }

  return basePoints;
}
