# Moment Engine

The Moment Engine is responsible for generating prediction windows that allow users to make micro-predictions during live matches.

## Overview

Prediction windows are generated in two ways:
1. **Event-triggered**: When specific match events occur (goals, corners)
2. **Time-based**: At regular 10-minute intervals when no match events occur

## Components

### predictionWindowGenerator.ts

Core logic for generating prediction windows.

**Key Functions:**

- `generatePredictionWindow(event, roomId)`: Generates a prediction window from a match event
- `generateTimeBasedPredictionWindow(matchId, roomId)`: Generates a time-based prediction window
- `shouldTriggerPrediction(eventType)`: Checks if an event type should trigger a prediction
- `getRemainingTime(window)`: Calculates remaining time in a prediction window
- `isWindowExpired(window)`: Checks if a prediction window has expired

### predictionWindowStorage.ts

Handles storage and broadcasting of prediction windows.

**Key Functions:**

- `storePredictionWindow(window)`: Stores a prediction window in DynamoDB
- `broadcastPredictionWindow(window)`: Broadcasts a prediction window to all room participants via WebSocket
- `storeAndBroadcastPredictionWindow(window)`: Combines storage and broadcast operations

## Prediction Types

The system supports four prediction types:

1. **next_goal_scorer**: Predict which team will score the next goal
   - Triggered by: Goal events
   - Options: Home Team, Away Team, No Goal in Next 10 Minutes
   - Duration: 30 seconds

2. **next_corner**: Predict which team will get the next corner
   - Triggered by: Corner events
   - Options: Home Team, Away Team, No Corner in Next 5 Minutes
   - Duration: 25 seconds

3. **next_card**: Predict which team will receive the next card
   - Triggered by: Card events (future implementation)
   - Options: Home Team, Away Team, No Card in Next 10 Minutes
   - Duration: 30 seconds

4. **match_outcome**: Predict the final match outcome
   - Triggered by: 10-minute time intervals
   - Options: Home Win, Draw, Away Win
   - Duration: 45 seconds

## Usage Example

```typescript
import {
  generatePredictionWindow,
  shouldTriggerPrediction,
  storeAndBroadcastPredictionWindow,
} from './momentEngine';

// Check if event should trigger a prediction
if (shouldTriggerPrediction(event.eventType)) {
  // Generate prediction window
  const window = generatePredictionWindow(event, roomId);
  
  if (window) {
    // Store in DynamoDB and broadcast to all room participants
    const result = await storeAndBroadcastPredictionWindow(window);
    
    console.log(`Broadcast to ${result.successCount} participants`);
    if (result.failedConnections.length > 0) {
      console.warn(`Failed connections: ${result.failedConnections.join(', ')}`);
    }
  }
}
```

## Data Storage

Prediction windows are stored in DynamoDB with the following structure:

```
PK: WINDOW#{windowId}
SK: METADATA
Attributes:
  - windowId: string
  - roomId: string
  - matchId: string
  - predictionType: string
  - options: string[]
  - expiresAt: string (ISO 8601)
  - createdAt: string (ISO 8601)
```

## WebSocket Broadcasting

When a prediction window is broadcast, all participants in the room receive a message with the following structure:

```json
{
  "type": "predictionWindow",
  "data": {
    "windowId": "window-123",
    "roomId": "room-456",
    "matchId": "match-789",
    "predictionType": "next_goal_scorer",
    "options": ["Home Team", "Away Team", "No Goal in Next 10 Minutes"],
    "expiresAt": "2024-01-15T10:35:00Z",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

## Requirements Satisfied

- **3.1**: Generate prediction windows when specific match events occur (goal, corner, free kick)
- **3.2**: Generate time-based prediction windows at 10-minute intervals
- **3.3**: Broadcast prediction window to all room participants via WebSocket
- **3.4**: Include expiration timestamp with each prediction window
- **3.8**: Define prediction types: next_goal_scorer, next_card, next_corner, match_outcome

## Testing

Run tests with:
```bash
npm test -- predictionWindowGenerator.test.ts
npm test -- predictionWindowStorage.test.ts
```

## Future Enhancements

- Add support for free kick events triggering predictions
- Implement dynamic prediction options based on match context (e.g., actual player names)
- Add difficulty scoring for different prediction types
- Support custom prediction window durations per room
