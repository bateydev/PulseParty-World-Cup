# WebSocket Connection Management

This module implements WebSocket connection management with automatic reconnection and exponential backoff for the PulseParty frontend.

## Requirements

- **Requirement 7.6**: Maintain user session state for the duration of the match experience
- **Requirement 7.7**: When a user's WebSocket_Connection is interrupted, THE PulseParty_System SHALL attempt automatic reconnection with exponential backoff up to 5 attempts

## Components

### WebSocketConnectionManager

Core class that manages WebSocket connections with automatic reconnection logic.

**Features:**
- Automatic reconnection with exponential backoff (1s, 2s, 4s, 8s, 16s)
- Maximum 5 reconnection attempts (configurable)
- Session state restoration on reconnection
- Connection lifecycle callbacks (onOpen, onClose, onMessage, onError)
- Reconnection status callbacks (onReconnecting, onReconnectFailed)

**Usage:**

```typescript
import { WebSocketConnectionManager } from './connectionManager';

const manager = new WebSocketConnectionManager({
  url: 'wss://example.com/ws',
  userId: 'user-123',
  roomId: 'room-456',
  locale: 'en',
  maxReconnectAttempts: 5,
  
  onOpen: () => {
    console.log('Connected');
  },
  
  onClose: () => {
    console.log('Disconnected');
  },
  
  onMessage: (data) => {
    console.log('Received:', data);
  },
  
  onReconnecting: (attempt) => {
    console.log(`Reconnecting... attempt ${attempt}/5`);
  },
  
  onReconnectFailed: () => {
    console.error('Failed to reconnect');
  },
});

// Connect
manager.connect();

// Send message
manager.send({ action: 'submitPrediction', payload: { choice: 'A' } });

// Update session state (for reconnection)
manager.updateSessionState({ roomId: 'room-789' });

// Disconnect
manager.disconnect();
```

### useWebSocket Hook

React hook that integrates WebSocketConnectionManager with Zustand store.

**Features:**
- Automatic connection on mount
- Automatic disconnection on unmount
- Session state synchronization with store
- Message routing to store actions
- Connection status management

**Usage:**

```typescript
import { useWebSocket } from './useWebSocket';

function MyComponent() {
  const { sendMessage, isConnected } = useWebSocket('wss://example.com/ws');
  
  const handleSubmit = () => {
    sendMessage({
      action: 'submitPrediction',
      payload: { windowId: '123', choice: 'A' }
    });
  };
  
  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
```

## Exponential Backoff Strategy

The reconnection logic uses exponential backoff to avoid overwhelming the server:

| Attempt | Delay |
|---------|-------|
| 1       | 1s    |
| 2       | 2s    |
| 3       | 4s    |
| 4       | 8s    |
| 5       | 16s   |

After 5 failed attempts, the `onReconnectFailed` callback is triggered and reconnection stops.

## Session State Restoration

When a connection is re-established, the manager automatically includes the current session state in the connection URL:

```
wss://example.com/ws?userId=user-123&roomId=room-456&locale=en
```

This allows the backend to restore the user's room state and send the current match state.

## Message Types

The WebSocket client handles the following message types:

- `roomState`: Initial room state on connection (room, participants, leaderboard, score)
- `matchEvent`: New match event
- `predictionWindow`: New prediction window
- `predictionClosed`: Prediction window closed
- `leaderboardUpdate`: Leaderboard updated
- `participantUpdate`: Participant joined or left
- `scoreUpdate`: Match score updated

## Testing

Unit tests are provided in `connectionManager.test.ts` covering:

- Connection establishment
- Disconnection
- Message handling
- Exponential backoff reconnection
- Session state restoration

Run tests:

```bash
npm test -- connectionManager.test.ts
```

## Implementation Notes

- The connection manager uses browser's native WebSocket API
- Reconnection is only attempted for abnormal closures (not intentional disconnects)
- Reconnection counter resets on successful connection
- Session state can be updated at any time and will be used on next reconnection
- All callbacks are optional
