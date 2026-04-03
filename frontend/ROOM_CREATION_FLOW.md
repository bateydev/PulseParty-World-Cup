# Room Creation Flow

## Overview
The room creation flow has been implemented as a 3-step process that allows users to select a theme, choose a match, and create a room. The implementation is designed to align with the backend WebSocket API.

## User Flow

### Step 1: Select Theme
Users choose from three room themes:
- **Country** 🌍 - International matches (UEFA Nations League, CONMEBOL, etc.)
- **Club** ⚽ - Club matches (Bundesliga, La Liga, Premier League, etc.)
- **Private** 🔒 - Custom/private matches

### Step 2: Select Match
Based on the selected theme, users see a filtered list of available matches:

**Country Matches:**
- Germany vs France (match-country-1)
- Brazil vs Argentina (match-country-2)
- England vs Spain (match-country-3)
- Portugal vs Italy (match-country-4)

**Club Matches:**
- Bayern Munich vs Borussia Dortmund (match-club-1)
- Real Madrid vs Barcelona (match-club-2)
- Manchester City vs Liverpool (match-club-3)
- PSG vs Marseille (match-club-4)

**Private Matches:**
- Custom Match 1 (match-private-1)
- Custom Match 2 (match-private-2)

### Step 3: Confirm and Create
- Users see a summary of their selections (theme + match + matchId)
- Can go back to change the match selection
- Click "Create Room" to generate a room code
- Modal displays the generated room code (format: ABC123 - 6 characters, no dash)
- After 3 seconds, automatically redirects to the live match view

## Backend Integration

### Room Code Format
- **Frontend**: Generates 6-character codes (e.g., "ABC123")
- **Backend**: Expects 6-character codes (e.g., "ABC123")
- **Character Set**: ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (excludes I/1, O/0 for clarity)

### WebSocket Messages

**Create Room:**
```json
{
  "action": "createRoom",
  "payload": {
    "matchId": "match-club-1",
    "theme": "Club"
  }
}
```

**Backend Response:**
```json
{
  "type": "roomCreated",
  "room": {
    "roomId": "room-123",
    "roomCode": "ABC123",
    "matchId": "match-club-1",
    "theme": "Club"
  }
}
```

**Join Room:**
```json
{
  "action": "joinRoom",
  "payload": {
    "roomCode": "ABC123"
  }
}
```

**Backend Response:**
```json
{
  "type": "roomJoined",
  "room": {
    "roomId": "room-123",
    "roomCode": "ABC123",
    "matchId": "match-club-1",
    "theme": "Club"
  }
}
```

## Match View Features
Once in the match view, users see:
- **Match Info Header** with:
  - Live indicator (🔴 LIVE)
  - Theme badge (Country/Club/Private)
  - Match name (e.g., "Bayern Munich vs Borussia Dortmund")
  - Match ID (e.g., "match-club-1")
  - Room code with copy button
- **Live Pitch** with animated players and ball
- **Prediction Widget** (collapsible on mobile)
- **Match Timeline** with events
- **Leaderboard** access

## Join Room Flow
Users can join existing rooms by:
1. Getting a 6-character room code from a friend who created a room
2. Entering the code in the "Join" tab (format: ABC123)
3. Clicking "Join Room" to connect
4. Backend validates the code and returns room details

## Discover Rooms Flow
Users can browse and join public rooms:
1. View list of live matches with player counts
2. See match details in a modal
3. Click "Join" to enter the room
4. Backend uses the room code to join

## Technical Implementation

### Components
- `RoomLobby.tsx` - Handles the 3-step creation flow
- `App.tsx` - Manages navigation and displays match info

### State Management
- `selectedTheme` - Tracks the chosen theme (Country/Club/Private)
- `selectedMatch` - Tracks the chosen match object { id, name }
- `currentMatchInfo` - Stores match details (name, code, theme, matchId) for display

### Room Code Generation
- Format: 6 uppercase alphanumeric characters (e.g., "ABC123")
- Character set excludes similar-looking characters (I/1, O/0)
- Matches backend `generateRoomCode()` function

### Match ID Structure
- Country matches: `match-country-{n}`
- Club matches: `match-club-{n}`
- Private matches: `match-private-{n}`
- Aligns with backend `matchId` field in Room entity

## Demo Mode vs Backend Mode

### Current (Demo Mode)
- Room codes generated client-side
- No WebSocket connection
- Static demo data
- All features functional for testing

### Backend Mode (TODO)
When connecting to backend:
1. Replace `generateRoomCode()` with backend response
2. Send WebSocket messages for createRoom/joinRoom
3. Handle backend responses and errors
4. Update UI based on real-time data
5. Implement reconnection logic

## Data Flow

```
User selects theme → Filters matches by theme
User selects match → Stores { id, name }
User clicks Create → Sends { matchId, theme } to backend
Backend creates room → Returns { roomId, roomCode, matchId, theme }
Frontend navigates → Displays match with room info
```

## Alignment with Backend

### Backend Capabilities (from roomManagement.ts)
✅ `createRoom(matchId, theme)` - Creates room with matchId and theme
✅ `generateRoomCode()` - Generates 6-character code
✅ `getRoomByCode(roomCode)` - Retrieves room by code
✅ `getActiveRoomsByMatch(matchId, theme)` - Discovers rooms
✅ `validateTheme(theme)` - Validates Country/Club/Private

### Frontend Implementation
✅ 3-step flow: Theme → Match → Create
✅ Match IDs in format: match-{theme}-{n}
✅ Room codes: 6 characters, no dash
✅ WebSocket message structure documented
✅ TODO comments for backend integration points

## Next Steps
To connect to the backend:
1. Implement WebSocket connection in `useAppStore`
2. Replace demo room code generation with backend response
3. Add error handling for failed room creation/join
4. Implement room discovery API calls
5. Add loading states during WebSocket operations
6. Handle disconnection and reconnection
7. Sync prediction submissions with backend
