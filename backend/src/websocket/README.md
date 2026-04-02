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

### handleDisconnect.ts

**Route**: `$disconnect`

**Purpose**: Handles WebSocket disconnections

**Functionality**:
- Removes connection ID from DynamoDB
- Removes connection from room participants list
- Broadcasts updated participant list to all remaining users in the room

**DynamoDB Operations**:
- Deletes connection entity: `PK=CONNECTION#{connectionId}`, `SK=METADATA`
- Updates room entity to remove connection from participants array

**Broadcast Message**:
```json
{
  "type": "participantUpdate",
  "payload": {
    "roomId": "room-456",
    "participants": [{ "userId": "user-789", "connectionId": "conn-2" }],
    "action": "leave",
    "disconnectedConnectionId": "conn-1"
  }
}
```

**Requirements**: 9.5, 9.7

**Error Handling**:
- Always returns 200 OK (disconnection should always succeed)
- Handles missing connection gracefully (might already be cleaned up)
- Handles room not found (connection might not have been in a room)
- Handles stale connections during broadcast (410 Gone, 403 Forbidden)
- Logs errors but doesn't fail the disconnection

**Example Usage**:
```typescript
// Client disconnects
ws.close();

// Server removes connection and broadcasts to remaining users
// Remaining users receive participantUpdate message
```

## Testing

Unit tests are located in their respective `.test.ts` files and cover:

### handleConnect.test.ts
- Connection storage with various query parameters
- Room state retrieval and sending
- Error handling for DynamoDB and WebSocket failures
- Leaderboard sorting

### handleDisconnect.test.ts
- Connection removal from DynamoDB
- Room participant list updates
- Participant broadcast to remaining users
- Stale connection handling during broadcast
- Error handling for various failure scenarios

Run tests:
```bash
npm test -- handleConnect.test.ts
npm test -- handleDisconnect.test.ts
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

None - all core handlers are implemented.


### handleMessage.ts

**Route**: `$default`

**Purpose**: Routes incoming WebSocket messages to appropriate action handlers with rate limiting

**Functionality**:
- Parses and validates incoming message structure
- Enforces rate limiting (100 messages per second per connection)
- Routes messages to action-specific handlers
- Returns appropriate success or error responses

**Supported Actions**:
- `createRoom`: Create a new match room with theme (Country/Club/Private)
- `joinRoom`: Join an existing room by room code
- `submitPrediction`: Submit a prediction for an active prediction window
- `leaveRoom`: Leave the current room
- `heartbeat`: Update connection health status

**Rate Limiting**: 100 messages per second per connection (sliding window)

**Requirements**: 9.8

**Message Format**:
All messages must follow this structure:
```json
{
  "action": "createRoom" | "joinRoom" | "submitPrediction" | "leaveRoom" | "heartbeat",
  "payload": {
    // Action-specific data
  }
}
```

**Action Examples**:

**Create Room**:
```json
{
  "action": "createRoom",
  "payload": {
    "matchId": "match-123",
    "theme": "Country"
  }
}
```
Response:
```json
{
  "type": "roomCreated",
  "room": {
    "roomId": "room-456",
    "roomCode": "ABC123",
    "matchId": "match-123",
    "theme": "Country"
  }
}
```

**Join Room**:
```json
{
  "action": "joinRoom",
  "payload": {
    "roomCode": "ABC123"
  }
}
```
Response:
```json
{
  "type": "roomJoined",
  "room": {
    "roomId": "room-456",
    "roomCode": "ABC123",
    "matchId": "match-123",
    "theme": "Country"
  }
}
```

**Submit Prediction**:
```json
{
  "action": "submitPrediction",
  "payload": {
    "windowId": "window-789",
    "choice": "Player A",
    "predictionType": "next_goal_scorer"
  }
}
```
Response:
```json
{
  "type": "predictionSubmitted",
  "windowId": "window-789",
  "choice": "Player A",
  "submittedAt": "2024-01-15T10:30:00Z"
}
```

**Leave Room**:
```json
{
  "action": "leaveRoom",
  "payload": {}
}
```
Response:
```json
{
  "type": "leftRoom",
  "roomId": "room-456"
}
```

**Heartbeat**:
```json
{
  "action": "heartbeat",
  "payload": {}
}
```
Response:
```json
{
  "type": "heartbeatAck",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid message format, missing fields, unknown action
- `429 Too Many Requests`: Rate limit exceeded (includes `retryAfter` field)
- `500 Internal Server Error`: Server-side error during processing

**Example Error**:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 1
}
```

**Testing**:
```bash
npm test -- handleMessage.test.ts
```

Test coverage includes:
- Message validation (missing fields, invalid JSON, unknown actions)
- Rate limiting enforcement (within limit, exceeding limit, window reset)
- All action handlers with valid and invalid inputs
- Error handling for various failure scenarios
