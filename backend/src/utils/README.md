# DynamoDB Utilities

This module provides helper functions for interacting with DynamoDB, implementing best practices for error handling and retry logic.

## Features

- **Automatic Retry Logic**: Implements exponential backoff with jitter for throttling and transient errors
- **Strong Consistency Support**: Configurable consistency levels for reads (Requirements 10.6, 10.7)
- **Error Handling**: Distinguishes between retryable and non-retryable errors
- **Type Safety**: Full TypeScript support with generic types
- **Batch Operations**: Support for batch get, batch write, and transactional writes

## Configuration

- **MAX_RETRIES**: 3 attempts
- **BASE_DELAY_MS**: 100ms initial delay
- **MAX_DELAY_MS**: 5000ms maximum delay
- **Backoff Strategy**: Exponential with random jitter

## Functions

### putItem

Put an item into DynamoDB with strong consistency.

```typescript
await putItem({
  TableName: 'PulsePartyTable',
  Item: { PK: 'ROOM#123', SK: 'METADATA', name: 'Test Room' },
});
```

### getItem

Get an item from DynamoDB. Uses eventual consistency by default (Requirement 10.6).

```typescript
// Eventual consistency (default)
const item = await getItem({
  TableName: 'PulsePartyTable',
  Key: { PK: 'ROOM#123', SK: 'METADATA' },
});

// Strong consistency (Requirement 10.7)
const item = await getItem({
  TableName: 'PulsePartyTable',
  Key: { PK: 'ROOM#123', SK: 'METADATA' },
  ConsistentRead: true,
});
```

### queryItems

Query items from DynamoDB. Uses eventual consistency by default.

```typescript
const scores = await queryItems({
  TableName: 'PulsePartyTable',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': 'ROOM#123',
    ':sk': 'SCORE#',
  },
});
```

### queryItemsWithPagination

Query items with pagination support.

```typescript
const { items, lastEvaluatedKey } = await queryItemsWithPagination({
  TableName: 'PulsePartyTable',
  KeyConditionExpression: 'PK = :pk',
  ExpressionAttributeValues: { ':pk': 'ROOM#123' },
  Limit: 10,
  ExclusiveStartKey: previousLastKey,
});
```

### updateItem

Update an item in DynamoDB with strong consistency.

```typescript
const updated = await updateItem({
  TableName: 'PulsePartyTable',
  Key: { PK: 'ROOM#123', SK: 'SCORE#user1' },
  UpdateExpression: 'SET points = points + :inc',
  ExpressionAttributeValues: { ':inc': 10 },
  ReturnValues: 'ALL_NEW',
});
```

### deleteItem

Delete an item from DynamoDB.

```typescript
await deleteItem({
  TableName: 'PulsePartyTable',
  Key: { PK: 'ROOM#123', SK: 'METADATA' },
});
```

### batchGetItems

Batch get up to 100 items (uses eventual consistency).

```typescript
const items = await batchGetItems('PulsePartyTable', [
  { PK: 'ROOM#123', SK: 'METADATA' },
  { PK: 'ROOM#456', SK: 'METADATA' },
]);
```

### batchWriteItems

Batch write up to 25 items (put or delete operations).

```typescript
await batchWriteItems('PulsePartyTable', [
  { type: 'put', item: { PK: 'ROOM#123', SK: 'METADATA', name: 'Room 1' } },
  { type: 'delete', item: { PK: 'ROOM#456', SK: 'METADATA' } },
]);
```

### transactWrite

Execute transactional writes (up to 100 items). All operations succeed or all fail.

```typescript
await transactWrite([
  {
    type: 'put',
    params: {
      TableName: 'PulsePartyTable',
      Item: { PK: 'ROOM#123', SK: 'METADATA' },
    },
  },
  {
    type: 'update',
    params: {
      TableName: 'PulsePartyTable',
      Key: { PK: 'ROOM#123', SK: 'SCORE#user1' },
      UpdateExpression: 'SET points = :points',
      ExpressionAttributeValues: { ':points': 100 },
    },
  },
]);
```

## Error Handling

### Retryable Errors

The following errors trigger automatic retry with exponential backoff:

- `ProvisionedThroughputExceededException`
- `ServiceUnavailable`
- `InternalServerError`
- `RequestTimeout`
- `ThrottlingException`

### Non-Retryable Errors

The following errors fail immediately without retry:

- `ConditionalCheckFailedException`
- `ResourceNotFoundException`
- `ValidationException`
- Other client errors

## Retry Behavior

1. **First attempt**: Immediate execution
2. **Retry 1**: Wait 0-100ms (random jitter)
3. **Retry 2**: Wait 0-200ms (random jitter)
4. **Retry 3**: Wait 0-400ms (random jitter)
5. **After 3 attempts**: Throw the last error

The jitter prevents thundering herd problems when multiple clients retry simultaneously.

## Requirements Validation

- **Requirement 10.6**: Eventual consistency for non-critical queries ✓
- **Requirement 10.7**: Strong consistency for score updates and predictions ✓
- Exponential backoff retry logic for throttling ✓
- Comprehensive error handling ✓

## Testing

Run the test suite:

```bash
npm test -- dynamodb.test.ts
```

The test suite includes:
- Unit tests for all functions
- Retry logic validation
- Error handling scenarios
- Consistency level verification
- Batch operation limits
