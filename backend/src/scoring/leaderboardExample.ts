/**
 * Example usage of leaderboard management
 * This demonstrates how the updateLeaderboard function would be called
 * after a user's score changes
 */

import { updateLeaderboard } from './leaderboardManagement';

/**
 * Example: Update leaderboard after a prediction is scored
 *
 * This would typically be called from the Scoring Lambda after:
 * 1. A prediction is evaluated
 * 2. Points are calculated and awarded
 * 3. User's score record is updated in DynamoDB
 *
 * The updateLeaderboard function will:
 * - Query all scores for the room
 * - Sort by total points
 * - Recalculate ranks
 * - Update DynamoDB with new ranks
 * - Broadcast updated leaderboard to all room participants via WebSocket
 */
async function exampleUpdateLeaderboardAfterScoring(roomId: string) {
  try {
    // Update leaderboard and get ranked scores
    const leaderboard = await updateLeaderboard(roomId);

    console.log('Leaderboard updated successfully:');
    leaderboard.forEach((score, index) => {
      console.log(
        `${index + 1}. User ${score.userId}: ${score.totalPoints} points (Rank: ${score.rank}, Streak: ${score.streak})`
      );
    });

    return leaderboard;
  } catch (error) {
    console.error('Failed to update leaderboard:', error);
    throw error;
  }
}

// Example usage
if (require.main === module) {
  const roomId = 'room-123';
  exampleUpdateLeaderboardAfterScoring(roomId)
    .then(() => console.log('Done'))
    .catch((error) => console.error('Error:', error));
}

export { exampleUpdateLeaderboardAfterScoring };
