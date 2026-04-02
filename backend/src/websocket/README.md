# WebSocket Handlers

This directory contains AWS Lambda handlers for WebSocket API Gateway routes.

## Overview

The WebSocket handlers manage real-time bidirectional communication between clients and the PulseParty backend. They handle connection lifecycle events and message routing.

## Handlers

### handleConnect.ts

**Route**: `$connect`

**Purpose**: Handles new WebSocket connections

**Functionality**:
- Stores connection ID in DynamoDB with user and room information
- Sends current room state to the client if joining an existing room
- Adds connection to room participants list

**Query Parameters**:
- `userId` (optional): User identifier. If not provided, generates a guest user ID
- `roomId` (optional): Room identifier. If provided, sends current room state

**DynamoDB Entities Created**:
- Connection entity: `PK=CONNECTION#{connectionId}`, `SK=METADATA`

**Room State Sent**:
- Room details (roomId, roomCode, matchId, theme)
- Active participants list
- Current leaderboard (sorted by total points)
- Current match score

**Requirements**: 9.1, 9.2

**Example Usage**:
```typescript
// Client connects with userId and roomId
const ws = new WebSocket('wss://api.example.com/prod?userId=user-123&roomId=room-456');

// Server responds with room state
{
  "type": "roomState",
  "payload": {
    "room": { "roomId": "room-456", "roomCode": "ABC123", ... },
    "participants": [{ "userId": "user-123", "connectionId": "conn-1" }],
    "leaderboard": [{ "userId": "user-123", "totalPoints": 100, ... }],
    "currentScore": { "home": 2, "away": 1 }
  }
}
```

## Testing

Unit tests are located in `handleConnect.test.ts` and cover:
- Connection storage with various query parameters
- Room state retrieval and sending
- Error handling for DynamoDB and WebSocket failures
- Leaderboard sorting

Run tests:
```bash
npm test -- handleConnect.test.ts
```

## Error Handling

- **Missing connectionId**: Returns 400 Bad Request
- **DynamoDB errors**: Returns 500 Internal Server Error
- **Room not found**: Stores connection but doesn't send room state
- **WebSocket send errors**: Logs error but doesn't fail the connection (connection might be stale)

## Environment Variables

- `TABLE_NAME`: DynamoDB table name for storing connection and room data
- `WEBSOCKET_API_ENDPOINT`: WebSocket API Gateway endpoint URL (e.g., `wss://api.example.com/prod`)

## Future Handlers

- `handleDisconnect.ts`: Removes connection from DynamoDB and broadcasts participant list update
- `handleMessage.ts`: Routes messages by action type (createRoom, joinRoom, submitPrediction, leaveRoom, heartbeat)
