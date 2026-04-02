# Scoring Module

This module handles all scoring logic for the PulseParty Rooms application, including base points calculation, streak multipliers, clutch bonuses, and leaderboard management.

## Overview

The scoring system rewards users for making correct predictions with a sophisticated points calculation that considers:
- **Difficulty**: Base points vary by prediction difficulty (easy/medium/hard)
- **Streaks**: Consecutive correct predictions earn multiplier bonuses
- **Clutch timing**: Last-second predictions earn additional bonuses
- **Leaderboard**: Real-time rank calculation and broadcasting to room participants

## Functions

### Points Calculation

#### `calculatePoints(difficulty: Difficulty): number`

Calculates base points based on prediction difficulty.

**Parameters:**
- `difficulty`: 'easy' | 'medium' | 'hard'

**Returns:**
- `10` for easy predictions
- `25` for medium predictions
- `50` for hard predictions

**Example:**
```typescript
const points = calculatePoints('hard'); // 50
```

**Validates:** Requirements 4.1

---

### `applyStreakMultiplier(basePoints: number, streak: number): number`

Applies a streak multiplier to base points for consecutive correct predictions.

**Formula:** `multiplier = min(1.0 + (0.1 × streak), 2.0)`

**Parameters:**
- `basePoints`: The base points before multiplier
- `streak`: Number of consecutive correct predictions

**Returns:**
- Points after applying streak multiplier (rounded to nearest integer)

**Examples:**
```typescript
applyStreakMultiplier(10, 0);  // 10  (1.0× multiplier)
applyStreakMultiplier(10, 3);  // 13  (1.3× multiplier)
applyStreakMultiplier(10, 10); // 20  (2.0× multiplier, capped)
```

**Validates:** Requirements 4.2

---

### `applyClutchBonus(basePoints: number, submittedAt: string, expiresAt: string): number`

Applies a clutch bonus if the prediction was submitted in the final 10 seconds of the prediction window.

**Bonus:** `1.5×` multiplier if submitted within 10 seconds of expiry

**Parameters:**
- `basePoints`: The base points before bonus
- `submittedAt`: ISO 8601 timestamp when prediction was submitted
- `expiresAt`: ISO 8601 timestamp when prediction window expires

**Returns:**
- Points after applying clutch bonus (rounded to nearest integer)
- Original points if not submitted in final 10 seconds

**Examples:**
```typescript
const expiresAt = '2024-01-15T10:30:00.000Z';

// Clutch submission (5 seconds before expiry)
applyClutchBonus(10, '2024-01-15T10:29:55.000Z', expiresAt); // 15

// Early submission (30 seconds before expiry)
applyClutchBonus(10, '2024-01-15T10:29:30.000Z', expiresAt); // 10
```

**Validates:** Requirements 4.3

---

### Leaderboard Management

#### `updateLeaderboard(roomId: string): Promise<UserScore[]>`

Updates the leaderboard for a room by recalculating ranks and broadcasting to all participants.

**Process:**
1. Queries all scores for the room from DynamoDB
2. Sorts by total points (descending)
3. Recalculates ranks (users with same points get same rank)
4. Updates each score record with new rank in DynamoDB
5. Broadcasts updated leaderboard to all room participants via WebSocket

**Parameters:**
- `roomId`: The room identifier

**Returns:**
- Array of `UserScore` objects with updated ranks

**Example:**
```typescript
import { updateLeaderboard } from './scoring';

// After a user's score changes, update the leaderboard
const leaderboard = await updateLeaderboard('room-123');

// leaderboard = [
//   { userId: 'user1', totalPoints: 150, rank: 1, streak: 3, ... },
//   { userId: 'user2', totalPoints: 100, rank: 2, streak: 1, ... },
//   { userId: 'user3', totalPoints: 100, rank: 2, streak: 2, ... }, // Same rank as user2
//   { userId: 'user4', totalPoints: 50, rank: 4, streak: 0, ... }
// ]
```

**Validates:** Requirements 4.4, 4.5, 4.6, 4.7

---

## Complete Scoring Example

Here's how to calculate the final score for a prediction:

```typescript
import { calculatePoints, applyStreakMultiplier, applyClutchBonus } from './scoring';

// 1. Calculate base points from difficulty
const basePoints = calculatePoints('hard'); // 50

// 2. Apply streak multiplier
const withStreak = applyStreakMultiplier(basePoints, 3); // 50 * 1.3 = 65

// 3. Apply clutch bonus if applicable
const submittedAt = '2024-01-15T10:29:55.000Z';
const expiresAt = '2024-01-15T10:30:00.000Z';
const finalPoints = applyClutchBonus(withStreak, submittedAt, expiresAt); // 65 * 1.5 = 98

console.log(finalPoints); // 98
```

## Testing

The module includes comprehensive unit tests covering:
- Base points calculation for all difficulty levels
- Streak multiplier application with various streak counts
- Multiplier capping at 2.0×
- Clutch bonus timing edge cases
- Combined scoring scenarios
- Rounding behavior
- Leaderboard rank calculation with different scores
- Leaderboard rank calculation with tied scores
- Leaderboard sorting and persistence
- Leaderboard broadcasting to room participants

Run tests with:
```bash
npm test -- pointsCalculation.test.ts
npm test -- leaderboardManagement.test.ts
```

## Requirements Validation

This module validates the following requirements:
- **4.1**: Award base points according to prediction difficulty
- **4.2**: Apply streak multiplier to consecutive correct predictions
- **4.3**: Apply clutch bonus for predictions in final 10 seconds
- **4.4**: Update leaderboard when user's score changes
- **4.5**: Broadcast updated rankings to all users in the room
- **4.6**: Display leaderboard with rank, username, total points, and streak status
- **4.7**: Maintain real-time leaderboard state in DynamoDB

## Related Modules

- **Moment Engine** (`../momentEngine`): Generates prediction windows and evaluates predictions
- **Room State** (`../roomState`): Manages room state and broadcasts leaderboard updates
- **Types** (`../types`): Defines shared type interfaces including `Prediction` and `UserScore`
