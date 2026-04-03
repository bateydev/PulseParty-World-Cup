# Frontend-Backend Alignment Report

## Overview
This document verifies that the frontend implementation aligns with the backend capabilities and is ready for WebSocket integration.

## ✅ Alignment Status: COMPLETE

All frontend changes have been aligned with backend capabilities. The application is ready for WebSocket integration.

---

## Backend Capabilities Analysis

### Room Management (backend/src/roomState/roomManagement.ts)

**Functions Available:**
1. ✅ `generateRoomCode()` - Generates 6-character alphanumeric codes
2. ✅ `createRoom(matchId, theme, ttlDays)` - Creates room with matchId and theme
3. ✅ `getRoomByCode(roomCode)` - Retrieves room by 6-char code
4. ✅ `getActiveRoomsByMatch(matchId, theme)` - Discovers rooms by match and theme
5. ✅ `validateTheme(theme)` - Validates Country/Club/Private themes
6. ✅ `discoverRooms(matchId)` - Returns public rooms (Country and Club only)
7. ✅ `broadcastToRoom(roomId, message)` - Broadcasts to all room participants

**Room Entity Structure:**
```typescript
interface Room {
  roomId: string;
  roomCode: string;        // 6 characters
  matchId: string;         // e.g., "match-123"
  theme: 'Country' | 'Club' | 'Private';
  participants: string[];  // connection IDs
  createdAt: string;
  ttl: number;
}
```

### WebSocket Message Handler (backend/src/websocket/handleMessage.ts)

**Supported Actions:**
1. ✅ `createRoom` - Creates new room
2. ✅ `joinRoom` - Joins existing room by code
3. ✅ `submitPrediction` - Submits prediction for active window
4. ✅ `leaveRoom` - Leaves current room
5. ✅ `heartbeat` - Connection health check

**Message Structure:**
```typescript
interface WebSocketMessage {
  action: 'createRoom' | 'joinRoom' | 'submitPrediction' | 'leaveRoom' | 'heartbeat';
  payload: Record<string, unknown>;
}
```

**Create Room Payload:**
```typescript
{
  matchId: string;  // Required
  theme: string;    // Required: 'Country' | 'Club' | 'Private'
}
```

**Join Room Payload:**
```typescript
{
  roomCode: string;  // Required: 6-character code
}
```

---

## Frontend Implementation Analysis

### Room Creation Flow (frontend/src/components/RoomLobby.tsx)

**Implementation:**
1. ✅ 3-step flow: Theme → Match → Create
2. ✅ Theme selection: Country/Club/Private
3. ✅ Match selection filtered by theme
4. ✅ Match objects include `id` and `name` fields
5. ✅ Room code generation: 6 characters (matches backend)
6. ✅ Character set: ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (excludes I/1, O/0)

**Match ID Structure:**
```typescript
// Country matches
{ id: 'match-country-1', name: 'Germany vs France', league: 'UEFA Nations League' }
{ id: 'match-country-2', name: 'Brazil vs Argentina', league: 'CONMEBOL' }
{ id: 'match-country-3', name: 'England vs Spain', league: 'International Friendly' }
{ id: 'match-country-4', name: 'Portugal vs Italy', league: 'UEFA Nations League' }

// Club matches
{ id: 'match-club-1', name: 'Bayern Munich vs Borussia Dortmund', league: 'Bundesliga' }
{ id: 'match-club-2', name: 'Real Madrid vs Barcelona', league: 'La Liga' }
{ id: 'match-club-3', name: 'Manchester City vs Liverpool', league: 'Premier League' }
{ id: 'match-club-4', name: 'PSG vs Marseille', league: 'Ligue 1' }

// Private matches
{ id: 'match-private-1', name: 'Custom Match 1', league: 'Private League' }
{ id: 'match-private-2', name: 'Custom Match 2', league: 'Private League' }
```

**State Management:**
```typescript
const [selectedTheme, setSelectedTheme] = useState<'Country' | 'Club' | 'Private' | null>(null);
const [selectedMatch, setSelectedMatch] = useState<{ id: string; name: string } | null>(null);
```

**Room Code Generation:**
```typescript
const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Matches backend
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};
```

### App State (frontend/src/App.tsx)

**Current Match Info:**
```typescript
const [currentMatchInfo, setCurrentMatchInfo] = useState<{
  match: string;    // Match name
  code: string;     // Room code (6 chars)
  theme: string;    // Country/Club/Private
  matchId: string;  // Match ID for backend
} | null>(null);
```

---

## Changes Made for Alignment

### 1. Room Code Format ✅
**Before:** 7 characters with dash (ABC-123)
**After:** 6 characters without dash (ABC123)
**Reason:** Match backend `generateRoomCode()` format

**Files Changed:**
- `frontend/src/components/RoomLobby.tsx` - Updated generation logic
- `frontend/src/components/RoomLobby.tsx` - Updated input placeholder and maxLength

### 2. Match ID Support ✅
**Before:** Only match name stored
**After:** Full match object with `id` and `name`
**Reason:** Backend requires `matchId` for room creation

**Files Changed:**
- `frontend/src/components/RoomLobby.tsx` - Updated state type
- `frontend/src/components/RoomLobby.tsx` - Updated match selection handler
- `frontend/src/App.tsx` - Added matchId to currentMatchInfo

### 3. Match ID Structure ✅
**Before:** Simple numeric IDs (1, 2, 3...)
**After:** Descriptive IDs (match-country-1, match-club-1...)
**Reason:** Better organization and backend compatibility

**Files Changed:**
- `frontend/src/components/RoomLobby.tsx` - Updated matchesByTheme data

### 4. WebSocket Integration Points ✅
**Added:** TODO comments with exact message structure
**Reason:** Clear integration points for backend connection

**Example:**
```typescript
// TODO: When connecting to backend, send WebSocket message:
// {
//   action: 'createRoom',
//   payload: {
//     matchId: selectedMatch.id,
//     theme: selectedTheme
//   }
// }
```

### 5. Mock Data Updates ✅
**Before:** Room codes with dashes (BAY-MUN, GER-FRA)
**After:** Room codes without dashes (BAYMUN, GERFRA)
**Reason:** Match backend format

**Files Changed:**
- `frontend/src/components/RoomLobby.tsx` - Updated mockRooms

---

## WebSocket Integration Checklist

### Ready for Integration ✅
- [x] Room code format matches backend (6 chars)
- [x] Match IDs properly structured
- [x] Theme validation matches backend
- [x] State includes all required fields (matchId, theme, code)
- [x] TODO comments mark integration points
- [x] Message structure documented

### Next Steps for Backend Connection
1. [ ] Implement WebSocket connection in `useAppStore`
2. [ ] Replace demo `generateRoomCode()` with backend response
3. [ ] Send `createRoom` message with `{ matchId, theme }`
4. [ ] Handle `roomCreated` response from backend
5. [ ] Send `joinRoom` message with `{ roomCode }`
6. [ ] Handle `roomJoined` response from backend
7. [ ] Implement error handling for failed operations
8. [ ] Add loading states during WebSocket operations
9. [ ] Implement reconnection logic
10. [ ] Sync prediction submissions with backend

---

## Data Flow Comparison

### Frontend Flow (Current - Demo Mode)
```
User selects theme
  ↓
Matches filtered by theme
  ↓
User selects match (stores { id, name })
  ↓
User clicks Create
  ↓
Frontend generates room code (6 chars)
  ↓
Modal displays code
  ↓
Navigate to match view
  ↓
Display match info with code
```

### Backend Flow (Target - WebSocket Mode)
```
User selects theme
  ↓
Matches filtered by theme
  ↓
User selects match (stores { id, name })
  ↓
User clicks Create
  ↓
Frontend sends: { action: 'createRoom', payload: { matchId, theme } }
  ↓
Backend creates room in DynamoDB
  ↓
Backend generates room code (6 chars)
  ↓
Backend responds: { type: 'roomCreated', room: { roomId, roomCode, matchId, theme } }
  ↓
Frontend receives response
  ↓
Modal displays code
  ↓
Navigate to match view
  ↓
Display match info with code
  ↓
WebSocket connection established for room
  ↓
Real-time updates begin
```

---

## Type Definitions Alignment

### Backend Types (backend/src/types/index.ts)
```typescript
export interface Room {
  roomId: string;
  roomCode: string;
  matchId: string;
  theme: 'Country' | 'Club' | 'Private';
  participants: string[];
  createdAt: string;
  ttl: number;
}

export interface WebSocketMessage {
  action: 'createRoom' | 'joinRoom' | 'submitPrediction' | 'leaveRoom' | 'heartbeat';
  payload: Record<string, unknown>;
}
```

### Frontend Types (frontend/src/components/RoomLobby.tsx)
```typescript
interface RoomLobbyProps {
  onJoinRoom: (matchInfo?: {
    match: string;    // Match name for display
    code: string;     // Room code (6 chars)
    theme: string;    // Country/Club/Private
    matchId: string;  // Match ID for backend
  }) => void;
}
```

**Status:** ✅ Aligned - Frontend includes all backend required fields

---

## Testing Recommendations

### Demo Mode Testing (Current)
1. ✅ Test theme selection (Country/Club/Private)
2. ✅ Verify matches filter by theme
3. ✅ Test room code generation (6 chars, no dash)
4. ✅ Verify match info displays correctly
5. ✅ Test join room with 6-character code
6. ✅ Test discover rooms functionality

### Backend Integration Testing (Future)
1. [ ] Test WebSocket connection establishment
2. [ ] Test createRoom message sending
3. [ ] Verify backend response handling
4. [ ] Test joinRoom with valid code
5. [ ] Test joinRoom with invalid code (error handling)
6. [ ] Test room discovery with real data
7. [ ] Test prediction submission
8. [ ] Test leaderboard updates
9. [ ] Test reconnection after disconnect
10. [ ] Test rate limiting (100 messages/second)

---

## Documentation Updates

### Created/Updated Files
1. ✅ `frontend/ROOM_CREATION_FLOW.md` - Complete flow documentation
2. ✅ `frontend/BACKEND_ALIGNMENT.md` - This file
3. ✅ `COMMIT_MESSAGES.md` - Commit message templates

### Documentation Includes
- WebSocket message examples
- Backend integration points
- Match ID structure
- Room code format
- Data flow diagrams
- Type definitions
- Testing checklist

---

## Conclusion

### Summary
The frontend has been successfully aligned with backend capabilities:

✅ **Room Code Format:** 6 characters, no dash (ABC123)
✅ **Match IDs:** Properly structured (match-{theme}-{n})
✅ **Theme Validation:** Country/Club/Private matches backend
✅ **State Management:** Includes all required fields
✅ **WebSocket Structure:** Documented and ready
✅ **Integration Points:** Marked with TODO comments

### Current Status
- **Demo Mode:** Fully functional with static data
- **Backend Ready:** All alignment complete
- **Integration:** Clear path forward with documented steps

### Next Milestone
Connect WebSocket and replace demo data with real-time backend communication.

---

## Contact Points for Backend Integration

### Key Files to Modify
1. `frontend/src/store/index.ts` - Add WebSocket connection logic
2. `frontend/src/components/RoomLobby.tsx` - Replace demo handlers with WebSocket calls
3. `frontend/src/components/PredictionWidget.tsx` - Connect prediction submission
4. `frontend/src/App.tsx` - Handle WebSocket events and state updates

### Backend Endpoints
- WebSocket URL: `wss://{API_GATEWAY_URL}`
- Actions: createRoom, joinRoom, submitPrediction, leaveRoom, heartbeat
- Rate Limit: 100 messages/second per connection

### Environment Variables Needed
```env
VITE_WEBSOCKET_URL=wss://your-api-gateway-url
VITE_API_ENDPOINT=https://your-api-endpoint
```
