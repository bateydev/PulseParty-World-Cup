# Room State Management

This module provides core room management functionality for the PulseParty Rooms system.

## Overview

The room management functions handle the creation, retrieval, and discovery of match rooms. Rooms are stored in DynamoDB using a single-table design with a Global Secondary Index (GSI1) for efficient discovery by match ID and theme.

## Functions

### `generateRoomCode()`

Generates a unique 6-character alphanumeric room code for easy sharing.

**Features:**
- Uses uppercase letters and numbers only
- Excludes confusing characters (I/1, O/0) for better readability
- Cryptographically random generation using Node.js `crypto.randomBytes()`

**Returns:** `string` - A 6-character room code (e.g., "ABC123")

### `createRoom(matchId, theme, ttlDays?)`

Creates a new room with a unique room code and stores it in DynamoDB.

**Parameters:**
- `matchId` (string) - The match identifier from the event feed
- `theme` ('Country' | 'Club' | 'Private') - Room theme for discovery
- `ttlDays` (number, optional) - Days until room expires (default: 7)

**Returns:** `Promise<Room>` - The created room object

**DynamoDB Structure:**
```
PK: ROOM#{roomId}
SK: METADATA
GSI1PK: MATCH#{matchId}#THEME#{theme}
GSI1SK: {createdAt}
```

**Requirements:** 1.1, 1.3, 1.4, 12.3

### `getRoomByCode(roomCode)`

Retrieves a room by its unique room code.

**Parameters:**
- `roomCode` (string) - The 6-character room code

**Returns:** `Promise<Room | null>` - The room object or null if not found

**Note:** Current implementation queries all rooms and filters by code. For production, add GSI2 with roomCode as partition key for better performance.

**Requirements:** 1.4, 1.5

### `getActiveRoomsByMatch(matchId, theme?)`

Retrieves all active rooms for a specific match, optionally filtered by theme.

**Parameters:**
- `matchId` (string) - The match identifier
- `theme` ('Country' | 'Club' | 'Private', optional) - Filter by theme

**Returns:** `Promise<Room[]>` - Array of active rooms

**Query Patterns:**
- Without theme: Returns all rooms for the match (Country, Club, and Private)
- With theme: Returns only rooms matching the specified theme

**Requirements:** 1.3, 12.3

## Room Entity Structure

```typescript
interface Room {
  roomId: string;           // Unique room identifier
  roomCode: string;         // 6-character shareable code
  matchId: string;          // Associated match ID
  theme: 'Country' | 'Club' | 'Private';  // Room theme
  participants: string[];   // Array of connection IDs
  createdAt: string;        // ISO 8601 timestamp
  ttl: number;              // Unix timestamp for DynamoDB TTL
}
```

## DynamoDB Access Patterns

1. **Create Room**: Put item with PK=ROOM#{roomId}, SK=METADATA
2. **Get Room by Code**: Query GSI1 with filter on roomCode (temporary implementation)
3. **Discover Rooms by Match+Theme**: Query GSI1 with GSI1PK=MATCH#{matchId}#THEME#{theme}
4. **Get All Rooms for Match**: Query GSI1 with begins_with(GSI1PK, MATCH#{matchId}#THEME#)

## Testing

Comprehensive unit tests are provided in `roomManagement.test.ts`:

- Room code generation (uniqueness, format, character exclusion)
- Room creation (all themes, TTL configuration, concurrent requests)
- Room retrieval by code (found, not found, filtering)
- Room discovery by match (with/without theme filter, empty results)

Run tests:
```bash
npm test -- roomManagement.test.ts
```

## Future Improvements

1. **Add GSI2 for Room Code Lookup**: Create a GSI with roomCode as partition key for O(1) lookup instead of scanning all rooms
2. **Add Room Capacity Limits**: Enforce maximum participants per room
3. **Add Room Status**: Track room state (active, ended, archived)
4. **Add Room Metadata**: Store additional room settings (language, notifications, etc.)
