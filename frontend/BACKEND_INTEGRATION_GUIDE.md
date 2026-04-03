# Backend Integration Guide

## Overview

This guide explains how to connect the PulseParty frontend to the backend WebSocket API and configure the integration for development, staging, and production environments.

## Architecture

```
Frontend (React) ←→ WebSocket Connection ←→ API Gateway ←→ Lambda Functions
                                                ↓
                                            DynamoDB
                                                ↓
                                            EventBridge
```

## WebSocket Message Protocol

### Client → Server Messages

All messages follow this format:
```json
{
  "action": "actionName",
  "payload": { /* action-specific data */ }
}
```

#### Supported Actions:

**1. Create Room**
```json
{
  "action": "createRoom",
  "payload": {
    "theme": "Country" | "Club" | "Private",
    "matchId": "match-country-1"
  }
}
```

**2. Join Room**
```json
{
  "action": "joinRoom",
  "payload": {
    "roomCode": "ABC123"
  }
}
```

**3. Leave Room**
```json
{
  "action": "leaveRoom",
  "payload": {
    "roomId": "room-uuid"
  }
}
```

**4. Submit Prediction**
```json
{
  "action": "submitPrediction",
  "payload": {
    "windowId": "window-uuid",
    "choice": "Player Name"
  }
}
```

**5. Heartbeat (Keep-Alive)**
```json
{
  "action": "heartbeat",
  "payload": {}
}
```

### Server → Client Messages

All messages follow this format:
```json
{
  "type": "messageType",
  "payload": { /* message-specific data */ }
}
```

#### Message Types:

**1. Room Created**
```json
{
  "type": "roomCreated",
  "payload": {
    "room": {
      "roomId": "room-uuid",
      "roomCode": "ABC123",
      "matchId": "match-country-1",
      "theme": "Country"
    }
  }
}
```

**2. Room Joined / Room State**
```json
{
  "type": "roomJoined",
  "payload": {
    "room": { /* room object */ },
    "participants": [
      {
        "userId": "user-uuid",
        "displayName": "Player Name",
        "isGuest": true
      }
    ],
    "leaderboard": [
      {
        "userId": "user-uuid",
        "displayName": "Player Name",
        "totalPoints": 150,
        "streak": 3,
        "rank": 1
      }
    ],
    "score": {
      "home": 2,
      "away": 1
    }
  }
}
```

**3. Match Event**
```json
{
  "type": "matchEvent",
  "payload": {
    "eventId": "event-uuid",
    "matchId": "match-country-1",
    "eventType": "goal" | "yellow_card" | "red_card" | "corner" | "shot" | "possession",
    "timestamp": "2024-01-15T14:30:00Z",
    "teamId": "team-home" | "team-away",
    "playerId": "player-uuid",
    "metadata": {
      "playerName": "Player Name",
      "teamName": "Team Name",
      /* event-specific fields */
    }
  }
}
```

**4. Prediction Window**
```json
{
  "type": "predictionWindow",
  "payload": {
    "windowId": "window-uuid",
    "roomId": "room-uuid",
    "matchId": "match-country-1",
    "predictionType": "next_goal_scorer" | "next_card" | "next_corner" | "match_outcome",
    "options": ["Player 1", "Player 2", "Player 3", "Player 4"],
    "expiresAt": "2024-01-15T14:31:00Z",
    "createdAt": "2024-01-15T14:30:00Z"
  }
}
```

**5. Prediction Closed**
```json
{
  "type": "predictionClosed",
  "payload": {
    "windowId": "window-uuid",
    "correctAnswer": "Player 1",
    "results": [
      {
        "userId": "user-uuid",
        "choice": "Player 1",
        "isCorrect": true,
        "pointsAwarded": 25
      }
    ]
  }
}
```

**6. Leaderboard Update**
```json
{
  "type": "leaderboardUpdate",
  "payload": {
    "leaderboard": [
      {
        "userId": "user-uuid",
        "displayName": "Player Name",
        "totalPoints": 175,
        "streak": 4,
        "rank": 1
      }
    ]
  }
}
```

**7. Participant Update**
```json
{
  "type": "participantUpdate",
  "payload": {
    "participants": [
      {
        "userId": "user-uuid",
        "displayName": "Player Name",
        "isGuest": true
      }
    ]
  }
}
```

**8. Score Update**
```json
{
  "type": "scoreUpdate",
  "payload": {
    "score": {
      "home": 3,
      "away": 1
    }
  }
}
```

**9. Error**
```json
{
  "type": "error",
  "payload": {
    "action": "createRoom",
    "message": "Invalid theme",
    "code": "INVALID_THEME"
  }
}
```

## Environment Configuration

### Development Setup

1. **Create `.env.local` file:**
```bash
cd frontend
cp .env.example .env.local
```

2. **Configure for local development:**
```env
VITE_WEBSOCKET_URL=ws://localhost:3001
VITE_API_URL=http://localhost:3001
```

3. **Start local backend (if available):**
```bash
cd backend
npm run dev
```

4. **Start frontend:**
```bash
cd frontend
npm run dev
```

### Staging/Production Setup

1. **Deploy backend infrastructure:**
```bash
cd infrastructure
npm run deploy:staging  # or deploy:prod
```

2. **Get API Gateway WebSocket URL:**
```bash
aws apigatewayv2 get-apis --query "Items[?Name=='PulsePartyWebSocket'].ApiEndpoint" --output text
```

3. **Update environment variables:**
```env
VITE_WEBSOCKET_URL=wss://abc123.execute-api.us-east-1.amazonaws.com/prod
VITE_API_URL=https://abc123.execute-api.us-east-1.amazonaws.com/prod
```

4. **Build and deploy frontend:**
```bash
cd frontend
npm run build
# Deploy dist/ to S3 + CloudFront
```

## Connection Flow

### 1. Initial Connection

```typescript
import { useAppStore } from './store';
import { config } from './config/environment';

// In your component or app initialization
const { connectWebSocket } = useAppStore();

// Connect to WebSocket
connectWebSocket(config.websocketUrl);
```

### 2. Create Room

```typescript
const { createRoom } = useAppStore();

try {
  const roomCode = await createRoom('Country', 'match-country-1');
  console.log('Room created:', roomCode);
} catch (error) {
  console.error('Failed to create room:', error);
}
```

### 3. Join Room

```typescript
const { joinRoom } = useAppStore();

try {
  await joinRoom('ABC123');
  console.log('Joined room successfully');
} catch (error) {
  console.error('Failed to join room:', error);
}
```

### 4. Submit Prediction

```typescript
const { submitPrediction } = useAppStore();

try {
  await submitPrediction('window-uuid', 'Player Name');
  console.log('Prediction submitted');
} catch (error) {
  console.error('Failed to submit prediction:', error);
}
```

### 5. Leave Room

```typescript
const { leaveRoom } = useAppStore();

leaveRoom();
```

## State Management

The Zustand store automatically handles:
- WebSocket connection state
- Reconnection with exponential backoff (5 attempts)
- Message routing to appropriate state updates
- Session persistence (user, locale, current room)

### Accessing State

```typescript
import { useAppStore } from './store';

function MyComponent() {
  const {
    wsConnected,
    reconnecting,
    currentRoom,
    matchEvents,
    activePredictionWindow,
    leaderboard,
  } = useAppStore();

  return (
    <div>
      {wsConnected ? 'Connected' : 'Disconnected'}
      {reconnecting && 'Reconnecting...'}
    </div>
  );
}
```

## Error Handling

### Connection Errors

```typescript
const { wsConnected, reconnecting } = useAppStore();

if (!wsConnected && !reconnecting) {
  // Show error message to user
  // Offer manual reconnect button
}
```

### Action Errors

```typescript
try {
  await createRoom('Country', 'match-1');
} catch (error) {
  if (error.message === 'WebSocket not connected') {
    // Show connection error
  } else if (error.message === 'Room creation timeout') {
    // Show timeout error
  } else {
    // Show generic error
  }
}
```

## Testing

### Manual Testing with wscat

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:3001

# Send messages
> {"action":"createRoom","payload":{"theme":"Country","matchId":"match-1"}}
< {"type":"roomCreated","payload":{"room":{...}}}
```

### Integration Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from './store';

test('creates room successfully', async () => {
  const { result } = renderHook(() => useAppStore());

  // Connect to mock WebSocket
  act(() => {
    result.current.connectWebSocket('ws://localhost:3001');
  });

  // Create room
  await act(async () => {
    const roomCode = await result.current.createRoom('Country', 'match-1');
    expect(roomCode).toBe('ABC123');
  });
});
```

## Troubleshooting

### WebSocket Connection Fails

1. **Check URL format:**
   - Development: `ws://localhost:3001`
   - Production: `wss://your-api-gateway.amazonaws.com/prod`

2. **Verify backend is running:**
   ```bash
   curl http://localhost:3001/health
   ```

3. **Check browser console for errors**

4. **Verify CORS configuration** (if using API Gateway)

### Messages Not Received

1. **Check message format** matches protocol
2. **Verify WebSocket is connected:** `wsConnected === true`
3. **Check browser DevTools → Network → WS tab**
4. **Enable debug logs:** Set `enableDebugLogs: true` in config

### Reconnection Issues

1. **Check max reconnect attempts** (default: 5)
2. **Verify exponential backoff delays:** 1s, 2s, 4s, 8s, 16s
3. **Check if backend is available**
4. **Review connection logs in console**

## Security Considerations

### Authentication

For authenticated users (non-guest):
1. Obtain JWT token from AWS Cognito
2. Include token in WebSocket connection URL:
   ```typescript
   const url = `${config.websocketUrl}?token=${jwtToken}`;
   connectWebSocket(url);
   ```

### Rate Limiting

Backend enforces rate limiting:
- 100 messages per second per connection
- Exceeded limit results in connection closure

### Data Validation

All messages are validated on the backend:
- Required fields must be present
- Field types must match schema
- Invalid messages return error response

## Monitoring

### Client-Side Metrics

Track these metrics for monitoring:
- Connection success rate
- Reconnection attempts
- Message send/receive counts
- Average latency
- Error rates by type

### Logging

Enable structured logging:
```typescript
if (config.enableDebugLogs) {
  console.log('[WebSocket]', event, data);
}
```

## Next Steps

1. **Deploy backend infrastructure** (see `infrastructure/DEPLOYMENT.md`)
2. **Configure environment variables** for your environment
3. **Test WebSocket connection** with backend
4. **Implement error handling** in UI components
5. **Add monitoring and analytics**

## References

- Backend WebSocket Handler: `backend/src/websocket/handleMessage.ts`
- Frontend Store: `frontend/src/store/index.ts`
- Connection Manager: `frontend/src/websocket/connectionManager.ts`
- Backend Types: `backend/src/types/index.ts`
