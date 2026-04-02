# Recap Module

This module handles the generation and retrieval of personalized match summaries (wrapped recaps) for users.

## Overview

The Recap module provides functionality to:
- Generate personalized wrapped recaps with user statistics
- Calculate accuracy, longest streak, and clutch moments
- Create shareable URLs for social media distribution
- Store and retrieve historical recaps from DynamoDB

## Components

### Wrapped Recap Generation (`wrappedRecapGeneration.ts`)

Generates personalized match summaries for users after a match concludes.

**Key Functions:**

- `generateWrappedRecap(userId, roomId, matchId)`: Generates a wrapped recap for a user
  - Retrieves user's final score from leaderboard
  - Fetches all user predictions for the match
  - Calculates statistics: accuracy, longest streak, clutch moments
  - Generates shareable URL
  - Stores recap in DynamoDB

- `getUserRecaps(userId)`: Retrieves all historical recaps for a user
  - Queries DynamoDB for user's recaps
  - Returns sorted by creation date (newest first)

## Data Flow

```
Match End Event
    ↓
Generate Wrapped Recap
    ↓
Query User Score (DynamoDB)
    ↓
Query User Predictions (DynamoDB)
    ↓
Calculate Statistics
    ↓
Generate Shareable URL
    ↓
Store Recap (DynamoDB)
    ↓
Return Wrapped Recap
```

## Statistics Calculation

### Accuracy
- Formula: `(correctPredictions / totalPredictions) * 100`
- Rounded to nearest integer
- Returns 0 if no predictions made

### Longest Streak
- Counts consecutive correct predictions
- Resets to 0 on incorrect prediction
- Returns maximum streak achieved

### Clutch Moments
- Counts correct predictions submitted in final 10 seconds
- Requires querying prediction window expiration times
- Only counts predictions that were correct

## DynamoDB Schema

### Wrapped Recap Entity
```
PK: USER#{userId}
SK: RECAP#{matchId}#{roomId}

Attributes:
- userId: string
- roomId: string
- matchId: string
- totalPoints: number
- finalRank: number
- accuracy: number (percentage)
- longestStreak: number
- clutchMoments: number
- shareableUrl: string
- createdAt: string (ISO 8601)
```

## Usage Example

```typescript
import { generateWrappedRecap, getUserRecaps } from './recap';

// Generate wrapped recap after match ends
const recap = await generateWrappedRecap('user-123', 'room-456', 'match-789');

console.log(recap);
// {
//   userId: 'user-123',
//   roomId: 'room-456',
//   matchId: 'match-789',
//   totalPoints: 150,
//   finalRank: 2,
//   accuracy: 75,
//   longestStreak: 5,
//   clutchMoments: 2,
//   shareableUrl: 'https://pulseparty.app/recap/abc-123-def-456?user=user-123&match=match-789&room=room-456'
// }

// Retrieve user's historical recaps
const recaps = await getUserRecaps('user-123');
console.log(recaps); // Array of wrapped recaps, sorted by date
```

## Requirements Validation

This module validates the following requirements:

- **5.2**: Generate personalized wrapped recap for each user within 5 seconds
- **5.3**: Include total points, final rank, accuracy, longest streak, clutch moments
- **5.5**: Provide shareable link for social media distribution
- **5.6**: Store wrapped recap data in DynamoDB for future retrieval

## Testing

Unit tests are provided in `wrappedRecapGeneration.test.ts`:

- Test wrapped recap generation with various user statistics
- Test accuracy calculation (0%, 100%, partial)
- Test longest streak calculation
- Test clutch moments counting
- Test shareable URL generation
- Test recap retrieval and sorting
- Test error handling for missing data

Run tests:
```bash
npm test -- wrappedRecapGeneration.test.ts
```

## Environment Variables

- `TABLE_NAME`: DynamoDB table name (default: 'PulsePartyTable')
- `BASE_SHARE_URL`: Base URL for shareable links (default: 'https://pulseparty.app/recap')

## Future Enhancements

- Add recap image generation for social media sharing
- Implement recap comparison between users
- Add seasonal/tournament aggregate recaps
- Support custom recap themes and branding
