# PulseParty DynamoDB Table Structure

## Table Overview

**Table Name**: `PulsePartyTable`

**Design Pattern**: Single-table design with one Global Secondary Index (GSI)

**Billing Mode**: On-demand (PAY_PER_REQUEST)

**TTL**: Enabled on `ttl` attribute (Unix timestamp)

**Point-in-Time Recovery**: Enabled

## Key Schema

### Primary Key

| Attribute | Type   | Key Type       | Description                                    |
|-----------|--------|----------------|------------------------------------------------|
| PK        | String | Partition Key  | Entity type + ID (e.g., `ROOM#{roomId}`)      |
| SK        | String | Sort Key       | Related entity or timestamp                    |

### Global Secondary Index (GSI1)

| Attribute | Type   | Key Type       | Description                                    |
|-----------|--------|----------------|------------------------------------------------|
| GSI1PK    | String | Partition Key  | Match ID + Theme (e.g., `MATCH#{matchId}#THEME#{theme}`) |
| GSI1SK    | String | Sort Key       | Creation timestamp (ISO 8601)                  |

**Projection Type**: ALL (all attributes projected)

## Entity Patterns

### 1. Room Entity

**Purpose**: Store room metadata and participant list

```
PK: ROOM#{roomId}
SK: METADATA
GSI1PK: MATCH#{matchId}#THEME#{theme}
GSI1SK: 2024-01-15T10:30:00Z
```

**Attributes**:
- `roomCode` (String): Unique 6-character alphanumeric code
- `matchId` (String): Match identifier from event feed
- `theme` (String): One of "Country", "Club", "Private"
- `participants` (String[]): Array of connection IDs
- `createdAt` (String): ISO 8601 timestamp
- `ttl` (Number): Unix timestamp (7 days after match end)

**Access Patterns**:
- Get room by ID: `GetItem(PK=ROOM#{roomId}, SK=METADATA)`
- Discover rooms by match+theme: `Query GSI1(GSI1PK=MATCH#{matchId}#THEME#{theme})`

---

### 2. Connection Entity

**Purpose**: Track active WebSocket connections

```
PK: CONNECTION#{connectionId}
SK: METADATA
```

**Attributes**:
- `userId` (String): User identifier
- `roomId` (String): Room identifier
- `connectedAt` (String): ISO 8601 timestamp
- `lastHeartbeat` (String): ISO 8601 timestamp

**Access Patterns**:
- Get connection: `GetItem(PK=CONNECTION#{connectionId}, SK=METADATA)`
- Delete connection: `DeleteItem(PK=CONNECTION#{connectionId}, SK=METADATA)`

---

### 3. User Entity

**Purpose**: Store user profile information

```
PK: USER#{userId}
SK: METADATA
```

**Attributes**:
- `displayName` (String): User's display name
- `isGuest` (Boolean): True for guest users
- `cognitoId` (String, optional): Cognito user ID for authenticated users
- `locale` (String): Language preference (EN, FR, DE, SW)
- `createdAt` (String): ISO 8601 timestamp

**Access Patterns**:
- Get user: `GetItem(PK=USER#{userId}, SK=METADATA)`
- Update user: `UpdateItem(PK=USER#{userId}, SK=METADATA)`

---

### 4. Prediction Entity

**Purpose**: Store user predictions for prediction windows

```
PK: ROOM#{roomId}
SK: PREDICTION#{windowId}#{userId}
```

**Attributes**:
- `windowId` (String): Prediction window identifier
- `userId` (String): User identifier
- `predictionType` (String): Type of prediction (e.g., "next_goal_scorer")
- `choice` (String): User's prediction choice
- `submittedAt` (String): ISO 8601 timestamp
- `isCorrect` (Boolean, optional): Set after evaluation
- `pointsAwarded` (Number, optional): Points earned

**Access Patterns**:
- Store prediction: `PutItem(PK=ROOM#{roomId}, SK=PREDICTION#{windowId}#{userId})`
- Get predictions for window: `Query(PK=ROOM#{roomId}, SK begins_with PREDICTION#{windowId})`
- Get user predictions: `Query(PK=ROOM#{roomId}, SK begins_with PREDICTION#, filter userId)`

---

### 5. Prediction Window Entity

**Purpose**: Store prediction window metadata

```
PK: WINDOW#{windowId}
SK: METADATA
```

**Attributes**:
- `roomId` (String): Room identifier
- `matchId` (String): Match identifier
- `predictionType` (String): Type of prediction
- `options` (String[]): Available choices
- `expiresAt` (String): ISO 8601 timestamp
- `outcome` (String, optional): Correct answer (set after resolution)
- `createdAt` (String): ISO 8601 timestamp

**Access Patterns**:
- Get window: `GetItem(PK=WINDOW#{windowId}, SK=METADATA)`
- Update window: `UpdateItem(PK=WINDOW#{windowId}, SK=METADATA)`

---

### 6. Score Entity

**Purpose**: Store user scores and leaderboard data

```
PK: ROOM#{roomId}
SK: SCORE#{userId}
```

**Attributes**:
- `userId` (String): User identifier
- `totalPoints` (Number): Total points earned
- `streak` (Number): Current correct prediction streak
- `clutchMoments` (Number): Count of clutch predictions
- `correctPredictions` (Number): Total correct predictions
- `totalPredictions` (Number): Total predictions made
- `rank` (Number): Current rank in room
- `updatedAt` (String): ISO 8601 timestamp

**Access Patterns**:
- Get user score: `GetItem(PK=ROOM#{roomId}, SK=SCORE#{userId})`
- Update score: `UpdateItem(PK=ROOM#{roomId}, SK=SCORE#{userId})`
- Get leaderboard: `Query(PK=ROOM#{roomId}, SK begins_with SCORE#)` + sort by totalPoints

---

### 7. Wrapped Recap Entity

**Purpose**: Store personalized match summaries

```
PK: USER#{userId}
SK: RECAP#{matchId}#{roomId}
```

**Attributes**:
- `matchId` (String): Match identifier
- `roomId` (String): Room identifier
- `totalPoints` (Number): Total points earned
- `finalRank` (Number): Final rank in room
- `accuracy` (Number): Prediction accuracy percentage
- `longestStreak` (Number): Longest correct prediction streak
- `clutchMoments` (Number): Count of clutch predictions
- `shareableUrl` (String): URL for sharing recap
- `createdAt` (String): ISO 8601 timestamp

**Access Patterns**:
- Store recap: `PutItem(PK=USER#{userId}, SK=RECAP#{matchId}#{roomId})`
- Get user recaps: `Query(PK=USER#{userId}, SK begins_with RECAP#)`
- Get specific recap: `GetItem(PK=USER#{userId}, SK=RECAP#{matchId}#{roomId})`

---

### 8. Room Recap Entity

**Purpose**: Store room-level match summaries

```
PK: ROOM#{roomId}
SK: RECAP#{matchId}
```

**Attributes**:
- `matchId` (String): Match identifier
- `totalParticipants` (Number): Total users in room
- `topPerformers` (Object[]): Top 3 users with scores
- `mostPredictedEvent` (String): Most popular prediction
- `engagementMetrics` (Object): Room engagement statistics
- `createdAt` (String): ISO 8601 timestamp

**Access Patterns**:
- Store recap: `PutItem(PK=ROOM#{roomId}, SK=RECAP#{matchId})`
- Get room recap: `GetItem(PK=ROOM#{roomId}, SK=RECAP#{matchId})`

---

## TTL Configuration

The `ttl` attribute is a Unix timestamp (seconds since epoch) that determines when DynamoDB automatically deletes the item.

### TTL Values by Entity Type

| Entity Type | TTL Duration | Example Calculation |
|-------------|--------------|---------------------|
| Room        | 7 days after match end | `matchEndTime + (7 * 24 * 60 * 60)` |
| Connection  | 1 hour after disconnect | `disconnectTime + (60 * 60)` |
| Guest User  | 24 hours after last activity | `lastActivityTime + (24 * 60 * 60)` |
| Prediction  | Inherited from Room | Same as room's TTL |
| Score       | Inherited from Room | Same as room's TTL |
| Recap       | Never (no TTL) | Permanent storage |

### Setting TTL in Code

```typescript
// Example: Set TTL for 7 days from now
const ttl = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);

await dynamodb.put({
  TableName: 'PulsePartyTable',
  Item: {
    PK: `ROOM#${roomId}`,
    SK: 'METADATA',
    roomCode: 'ABC123',
    ttl: ttl, // Unix timestamp
    // ... other attributes
  }
});
```

## Consistency Requirements

### Strong Consistency (use `ConsistentRead: true`)

- Score updates (prevent race conditions)
- Prediction submissions (ensure uniqueness)
- Connection management (accurate participant counts)

### Eventual Consistency (default)

- Room discovery (acceptable slight delay)
- Leaderboard reads (acceptable slight delay)
- Recap retrieval (not time-critical)

## Query Examples

### 1. Discover Public Rooms for a Match

```typescript
const params = {
  TableName: 'PulsePartyTable',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :gsi1pk',
  ExpressionAttributeValues: {
    ':gsi1pk': `MATCH#${matchId}#THEME#Country`
  }
};
```

### 2. Get Room Leaderboard

```typescript
const params = {
  TableName: 'PulsePartyTable',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': `ROOM#${roomId}`,
    ':sk': 'SCORE#'
  }
};
// Sort results by totalPoints in application code
```

### 3. Get User's Historical Recaps

```typescript
const params = {
  TableName: 'PulsePartyTable',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': `USER#${userId}`,
    ':sk': 'RECAP#'
  }
};
```

## Capacity Planning

### On-Demand Billing

The table uses on-demand billing, which automatically scales to handle traffic without capacity planning.

**Pricing** (as of 2024):
- Read requests: $0.25 per million requests
- Write requests: $1.25 per million requests
- Storage: $0.25 per GB-month

### Estimated Costs for Hackathon Demo

**Assumptions**:
- 10 concurrent rooms
- 100 total users
- 1 match (90 minutes)
- 20 predictions per user
- 100 match events

**Estimated Operations**:
- Writes: ~5,000 (room creation, predictions, scores, recaps)
- Reads: ~50,000 (leaderboard queries, room discovery, event broadcasts)
- Storage: < 1 MB

**Estimated Cost**: < $0.10 for entire demo

## Monitoring

### CloudWatch Metrics to Monitor

- `ConsumedReadCapacityUnits`: Track read usage
- `ConsumedWriteCapacityUnits`: Track write usage
- `UserErrors`: Track client-side errors (e.g., validation failures)
- `SystemErrors`: Track server-side errors (e.g., throttling)
- `ThrottledRequests`: Should be 0 with on-demand billing

### Alarms to Set

- `ThrottledRequests > 0`: Alert if throttling occurs (shouldn't happen with on-demand)
- `UserErrors > 100 in 5 minutes`: Alert on high error rate
- `SystemErrors > 10 in 5 minutes`: Alert on DynamoDB issues

## Best Practices

1. **Use Batch Operations**: Use `BatchGetItem` and `BatchWriteItem` for multiple items
2. **Implement Exponential Backoff**: Retry failed requests with exponential backoff
3. **Use Projection Expressions**: Only retrieve needed attributes to reduce data transfer
4. **Cache Frequently Accessed Data**: Cache room metadata and user profiles
5. **Monitor TTL Deletes**: Track TTL deletions in CloudWatch to ensure cleanup works
6. **Use Transactions**: Use `TransactWriteItems` for atomic multi-item updates
7. **Avoid Hot Partitions**: Distribute writes across different partition keys

## Next Steps

After deploying the table:

1. Create DynamoDB helper utilities in `backend/src/utils/dynamodb.ts`
2. Implement entity-specific data access functions
3. Add unit tests for DynamoDB operations
4. Configure IAM roles for Lambda functions to access the table
5. Set up CloudWatch alarms for monitoring
