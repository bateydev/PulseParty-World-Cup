# Recap Module

This module handles the generation and retrieval of personalized match summaries (wrapped recaps) and room-level summaries (room recaps).

## Overview

The Recap module provides functionality to:
- Generate personalized wrapped recaps with user statistics
- Generate room recaps with aggregated room statistics
- Calculate accuracy, longest streak, and clutch moments
- Create shareable URLs for social media distribution
- Store and retrieve historical recaps from DynamoDB

## Components

### Lambda Handler (`handler.ts`)

AWS Lambda handler that processes match end events and orchestrates recap generation and broadcasting.

**Key Functions:**

- `handler(event)`: Main Lambda handler for match end events
  - Receives EventBridge match end event
  - Queries all active rooms for the match
  - Generates room recap for each room
  - Generates wrapped recap for each user in each room
  - Broadcasts recaps to all room participants via WebSocket
  - Handles errors gracefully, continuing to process other rooms/users

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

### Room Recap Generation (`roomRecapGeneration.ts`)

Generates room-level match summaries aggregating statistics across all participants.

**Key Functions:**

- `generateRoomRecap(roomId, matchId)`: Generates a room recap
  - Queries all user scores in the room
  - Queries all predictions made in the room
  - Identifies top 3 performers
  - Finds most predicted event
  - Calculates engagement metrics
  - Stores recap in DynamoDB

## Data Flow

### Match End Event Flow
```
Match End Event (EventBridge)
    ↓
Recap Lambda Handler
    ↓
Query Active Rooms for Match
    ↓
For Each Room:
    ↓
    Generate Room Recap
    ↓
    Query User Scores
    ↓
    For Each User:
        ↓
        Generate Wrapped Recap
    ↓
    Broadcast Room Recap (WebSocket)
    ↓
    Broadcast Wrapped Recaps (WebSocket)
```

### Wrapped Recap Flow
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

### Room Recap Flow
```
Match End Event
    ↓
Generate Room Recap
    ↓
Query All Scores (DynamoDB)
    ↓
Query All Predictions (DynamoDB)
    ↓
Identify Top Performers
    ↓
Find Most Predicted Event
    ↓
Calculate Engagement Metrics
    ↓
Store Recap (DynamoDB)
    ↓
Return Room Recap
```

## Statistics Calculation

### Wrapped Recap Statistics

#### Accuracy
- Formula: `(correctPredictions / totalPredictions) * 100`
- Rounded to nearest integer
- Returns 0 if no predictions made

#### Longest Streak
- Counts consecutive correct predictions
- Resets to 0 on incorrect prediction
- Returns maximum streak achieved

#### Clutch Moments
- Counts correct predictions submitted in final 10 seconds
- Requires querying prediction window expiration times
- Only counts predictions that were correct

### Room Recap Statistics

#### Total Participants
- Count of unique users with scores in the room

#### Top Performers
- Top 3 users sorted by rank
- Includes full UserScore data for each performer

#### Most Predicted Event
- Finds the choice that was predicted most frequently
- Returns 'N/A' if no predictions were made

#### Engagement Metrics
- `totalPredictions`: Total number of predictions made in the room
- `correctPredictions`: Number of correct predictions
- `totalClutchMoments`: Sum of clutch moments across all users
- `averageAccuracy`: Average prediction accuracy across all users (percentage)

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

### Room Recap Entity
```
PK: ROOM#{roomId}
SK: RECAP#{matchId}

Attributes:
- roomId: string
- matchId: string
- totalParticipants: number
- topPerformers: UserScore[] (top 3)
- mostPredictedEvent: string
- engagementMetrics: {
    totalPredictions: number
    correctPredictions: number
    totalClutchMoments: number
    averageAccuracy: number
  }
- createdAt: string (ISO 8601)
```

## Usage Example

```typescript
import { handler } from './recap';
import { generateWrappedRecap, getUserRecaps, generateRoomRecap } from './recap';

// Lambda handler processes match end events automatically
// Invoked by EventBridge when match_end event occurs

// Manual usage for testing:

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

// Generate room recap after match ends
const roomRecap = await generateRoomRecap('room-456', 'match-789');

console.log(roomRecap);
// {
//   roomId: 'room-456',
//   matchId: 'match-789',
//   totalParticipants: 10,
//   topPerformers: [
//     { userId: 'user-123', totalPoints: 150, rank: 1, ... },
//     { userId: 'user-456', totalPoints: 125, rank: 2, ... },
//     { userId: 'user-789', totalPoints: 100, rank: 3, ... }
//   ],
//   mostPredictedEvent: 'Home Team',
//   engagementMetrics: {
//     totalPredictions: 45,
//     correctPredictions: 30,
//     totalClutchMoments: 8,
//     averageAccuracy: 67
//   }
// }

// Retrieve user's historical recaps
const recaps = await getUserRecaps('user-123');
console.log(recaps); // Array of wrapped recaps, sorted by date
```

## Requirements Validation

This module validates the following requirements:

- **5.1**: Generate room recap summarizing collective room activity
- **5.2**: Generate personalized wrapped recap for each user within 5 seconds
- **5.3**: Include total points, final rank, accuracy, longest streak, clutch moments
- **5.4**: Include total participants, top 3 performers, most predicted event, engagement metrics
- **5.5**: Provide shareable link for social media distribution
- **5.6**: Store wrapped recap data in DynamoDB for future retrieval
- **5.7**: Broadcast recaps to room participants on match conclusion

## Testing

Unit tests are provided for all modules:

### Lambda Handler Tests (`handler.test.ts`)
- Test recap generation and broadcasting for all rooms
- Test handling of no active rooms
- Test error handling when room processing fails
- Test error handling when user recap generation fails
- Test overall error handling for database failures

### Wrapped Recap Tests (`wrappedRecapGeneration.test.ts`)
- Test wrapped recap generation with various user statistics
- Test accuracy calculation (0%, 100%, partial)
- Test longest streak calculation
- Test clutch moments counting
- Test shareable URL generation
- Test recap retrieval and sorting
- Test error handling for missing data

### Room Recap Tests (`roomRecapGeneration.test.ts`)
- Test room recap generation with multiple users
- Test top performers identification
- Test most predicted event calculation
- Test engagement metrics calculation
- Test handling of rooms with few participants
- Test handling of rooms with no predictions

Run tests:
```bash
npm test -- recap/
```

## Environment Variables

- `TABLE_NAME`: DynamoDB table name (default: 'PulsePartyTable')
- `BASE_SHARE_URL`: Base URL for shareable links (default: 'https://pulseparty.app/recap')

## Future Enhancements

- Add recap image generation for social media sharing
- Implement recap comparison between users
- Add seasonal/tournament aggregate recaps
- Support custom recap themes and branding
- Add room recap sharing functionality
