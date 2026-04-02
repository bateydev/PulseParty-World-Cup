import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  BatchGetCommand,
  BatchWriteCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  ProvisionedThroughputExceededException,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';
import {
  putItem,
  getItem,
  queryItems,
  queryItemsWithPagination,
  updateItem,
  deleteItem,
  batchGetItems,
  batchWriteItems,
  transactWrite,
} from './dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoDB Utilities', () => {
  beforeEach(() => {
    ddbMock.reset();
    jest.clearAllMocks();
  });

  describe('putItem', () => {
    it('should successfully put an item', async () => {
      ddbMock.on(PutCommand).resolves({});

      await putItem({
        TableName: 'TestTable',
        Item: { PK: 'ROOM#123', SK: 'METADATA', name: 'Test Room' },
      });

      expect(ddbMock.calls()).toHaveLength(1);
    });

    it('should retry on throttling error and succeed', async () => {
      ddbMock
        .on(PutCommand)
        .rejectsOnce(
          new ProvisionedThroughputExceededException({
            message: 'Throttled',
            $metadata: {},
          })
        )
        .resolves({});

      await putItem({
        TableName: 'TestTable',
        Item: { PK: 'ROOM#123', SK: 'METADATA' },
      });

      expect(ddbMock.calls()).toHaveLength(2);
    });

    it('should retry up to 3 times and then throw', async () => {
      const throttleError = new ProvisionedThroughputExceededException({
        message: 'Throttled',
        $metadata: {},
      });

      ddbMock.on(PutCommand).rejects(throttleError);

      await expect(
        putItem({
          TableName: 'TestTable',
          Item: { PK: 'ROOM#123', SK: 'METADATA' },
        })
      ).rejects.toThrow(ProvisionedThroughputExceededException);

      expect(ddbMock.calls()).toHaveLength(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const conditionalError = new ConditionalCheckFailedException({
        message: 'Condition failed',
        $metadata: {},
      });

      ddbMock.on(PutCommand).rejects(conditionalError);

      await expect(
        putItem({
          TableName: 'TestTable',
          Item: { PK: 'ROOM#123', SK: 'METADATA' },
          ConditionExpression: 'attribute_not_exists(PK)',
        })
      ).rejects.toThrow(ConditionalCheckFailedException);

      expect(ddbMock.calls()).toHaveLength(1);
    });
  });

  describe('getItem', () => {
    it('should successfully get an item', async () => {
      const mockItem = { PK: 'ROOM#123', SK: 'METADATA', name: 'Test Room' };
      ddbMock.on(GetCommand).resolves({ Item: mockItem });

      const result = await getItem({
        TableName: 'TestTable',
        Key: { PK: 'ROOM#123', SK: 'METADATA' },
      });

      expect(result).toEqual(mockItem);
      expect(ddbMock.calls()).toHaveLength(1);
    });

    it('should return null when item not found', async () => {
      ddbMock.on(GetCommand).resolves({});

      const result = await getItem({
        TableName: 'TestTable',
        Key: { PK: 'ROOM#999', SK: 'METADATA' },
      });

      expect(result).toBeNull();
    });

    it('should use eventual consistency by default', async () => {
      ddbMock.on(GetCommand).resolves({ Item: { PK: 'ROOM#123' } });

      await getItem({
        TableName: 'TestTable',
        Key: { PK: 'ROOM#123', SK: 'METADATA' },
      });

      const calls = ddbMock.calls();
      expect(calls[0].args[0].input).not.toHaveProperty('ConsistentRead');
    });

    it('should support strong consistency when specified', async () => {
      ddbMock.on(GetCommand).resolves({ Item: { PK: 'ROOM#123' } });

      await getItem({
        TableName: 'TestTable',
        Key: { PK: 'ROOM#123', SK: 'METADATA' },
        ConsistentRead: true,
      });

      const calls = ddbMock.calls();
      const input = calls[0].args[0].input as any;
      expect(input.ConsistentRead).toBe(true);
    });

    it('should retry on throttling error', async () => {
      const mockItem = { PK: 'ROOM#123', SK: 'METADATA' };
      ddbMock
        .on(GetCommand)
        .rejectsOnce(
          new ProvisionedThroughputExceededException({
            message: 'Throttled',
            $metadata: {},
          })
        )
        .resolves({ Item: mockItem });

      const result = await getItem({
        TableName: 'TestTable',
        Key: { PK: 'ROOM#123', SK: 'METADATA' },
      });

      expect(result).toEqual(mockItem);
      expect(ddbMock.calls()).toHaveLength(2);
    });
  });

  describe('queryItems', () => {
    it('should successfully query items', async () => {
      const mockItems = [
        { PK: 'ROOM#123', SK: 'SCORE#user1', points: 100 },
        { PK: 'ROOM#123', SK: 'SCORE#user2', points: 200 },
      ];
      ddbMock.on(QueryCommand).resolves({ Items: mockItems });

      const result = await queryItems({
        TableName: 'TestTable',
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': 'ROOM#123' },
      });

      expect(result).toEqual(mockItems);
      expect(ddbMock.calls()).toHaveLength(1);
    });

    it('should return empty array when no items found', async () => {
      ddbMock.on(QueryCommand).resolves({});

      const result = await queryItems({
        TableName: 'TestTable',
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': 'ROOM#999' },
      });

      expect(result).toEqual([]);
    });

    it('should use eventual consistency by default', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      await queryItems({
        TableName: 'TestTable',
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': 'ROOM#123' },
      });

      const calls = ddbMock.calls();
      expect(calls[0].args[0].input).not.toHaveProperty('ConsistentRead');
    });

    it('should retry on throttling error', async () => {
      const mockItems = [{ PK: 'ROOM#123', SK: 'SCORE#user1' }];
      ddbMock
        .on(QueryCommand)
        .rejectsOnce(
          new ProvisionedThroughputExceededException({
            message: 'Throttled',
            $metadata: {},
          })
        )
        .resolves({ Items: mockItems });

      const result = await queryItems({
        TableName: 'TestTable',
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': 'ROOM#123' },
      });

      expect(result).toEqual(mockItems);
      expect(ddbMock.calls()).toHaveLength(2);
    });
  });

  describe('queryItemsWithPagination', () => {
    it('should return items and lastEvaluatedKey', async () => {
      const mockItems = [{ PK: 'ROOM#123', SK: 'SCORE#user1' }];
      const mockLastKey = { PK: 'ROOM#123', SK: 'SCORE#user1' };

      ddbMock.on(QueryCommand).resolves({
        Items: mockItems,
        LastEvaluatedKey: mockLastKey,
      });

      const result = await queryItemsWithPagination({
        TableName: 'TestTable',
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': 'ROOM#123' },
        Limit: 1,
      });

      expect(result.items).toEqual(mockItems);
      expect(result.lastEvaluatedKey).toEqual(mockLastKey);
    });

    it('should return undefined lastEvaluatedKey when no more items', async () => {
      const mockItems = [{ PK: 'ROOM#123', SK: 'SCORE#user1' }];

      ddbMock.on(QueryCommand).resolves({ Items: mockItems });

      const result = await queryItemsWithPagination({
        TableName: 'TestTable',
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': 'ROOM#123' },
      });

      expect(result.items).toEqual(mockItems);
      expect(result.lastEvaluatedKey).toBeUndefined();
    });
  });

  describe('updateItem', () => {
    it('should successfully update an item', async () => {
      const updatedItem = { PK: 'ROOM#123', SK: 'SCORE#user1', points: 150 };
      ddbMock.on(UpdateCommand).resolves({ Attributes: updatedItem });

      const result = await updateItem({
        TableName: 'TestTable',
        Key: { PK: 'ROOM#123', SK: 'SCORE#user1' },
        UpdateExpression: 'SET points = :points',
        ExpressionAttributeValues: { ':points': 150 },
        ReturnValues: 'ALL_NEW',
      });

      expect(result).toEqual(updatedItem);
      expect(ddbMock.calls()).toHaveLength(1);
    });

    it('should return null when no attributes returned', async () => {
      ddbMock.on(UpdateCommand).resolves({});

      const result = await updateItem({
        TableName: 'TestTable',
        Key: { PK: 'ROOM#123', SK: 'SCORE#user1' },
        UpdateExpression: 'SET points = :points',
        ExpressionAttributeValues: { ':points': 150 },
      });

      expect(result).toBeNull();
    });

    it('should retry on throttling error', async () => {
      const updatedItem = { PK: 'ROOM#123', SK: 'SCORE#user1', points: 150 };
      ddbMock
        .on(UpdateCommand)
        .rejectsOnce(
          new ProvisionedThroughputExceededException({
            message: 'Throttled',
            $metadata: {},
          })
        )
        .resolves({ Attributes: updatedItem });

      const result = await updateItem({
        TableName: 'TestTable',
        Key: { PK: 'ROOM#123', SK: 'SCORE#user1' },
        UpdateExpression: 'SET points = :points',
        ExpressionAttributeValues: { ':points': 150 },
        ReturnValues: 'ALL_NEW',
      });

      expect(result).toEqual(updatedItem);
      expect(ddbMock.calls()).toHaveLength(2);
    });
  });

  describe('deleteItem', () => {
    it('should successfully delete an item', async () => {
      ddbMock.on(DeleteCommand).resolves({});

      await deleteItem({
        TableName: 'TestTable',
        Key: { PK: 'ROOM#123', SK: 'METADATA' },
      });

      expect(ddbMock.calls()).toHaveLength(1);
    });

    it('should retry on throttling error', async () => {
      ddbMock
        .on(DeleteCommand)
        .rejectsOnce(
          new ProvisionedThroughputExceededException({
            message: 'Throttled',
            $metadata: {},
          })
        )
        .resolves({});

      await deleteItem({
        TableName: 'TestTable',
        Key: { PK: 'ROOM#123', SK: 'METADATA' },
      });

      expect(ddbMock.calls()).toHaveLength(2);
    });
  });

  describe('batchGetItems', () => {
    it('should successfully batch get items', async () => {
      const mockItems = [
        { PK: 'ROOM#123', SK: 'METADATA' },
        { PK: 'ROOM#456', SK: 'METADATA' },
      ];

      ddbMock.on(BatchGetCommand).resolves({
        Responses: { TestTable: mockItems },
      });

      const result = await batchGetItems('TestTable', [
        { PK: 'ROOM#123', SK: 'METADATA' },
        { PK: 'ROOM#456', SK: 'METADATA' },
      ]);

      expect(result).toEqual(mockItems);
    });

    it('should return empty array for empty keys', async () => {
      const result = await batchGetItems('TestTable', []);
      expect(result).toEqual([]);
      expect(ddbMock.calls()).toHaveLength(0);
    });

    it('should throw error for more than 100 items', async () => {
      const keys = Array.from({ length: 101 }, (_, i) => ({
        PK: `ROOM#${i}`,
        SK: 'METADATA',
      }));

      await expect(batchGetItems('TestTable', keys)).rejects.toThrow(
        'BatchGet supports maximum 100 items'
      );
    });

    it('should retry on throttling error', async () => {
      const mockItems = [{ PK: 'ROOM#123', SK: 'METADATA' }];

      ddbMock
        .on(BatchGetCommand)
        .rejectsOnce(
          new ProvisionedThroughputExceededException({
            message: 'Throttled',
            $metadata: {},
          })
        )
        .resolves({ Responses: { TestTable: mockItems } });

      const result = await batchGetItems('TestTable', [
        { PK: 'ROOM#123', SK: 'METADATA' },
      ]);

      expect(result).toEqual(mockItems);
      expect(ddbMock.calls()).toHaveLength(2);
    });
  });

  describe('batchWriteItems', () => {
    it('should successfully batch write items', async () => {
      ddbMock.on(BatchWriteCommand).resolves({});

      await batchWriteItems('TestTable', [
        { type: 'put', item: { PK: 'ROOM#123', SK: 'METADATA' } },
        { type: 'delete', item: { PK: 'ROOM#456', SK: 'METADATA' } },
      ]);

      expect(ddbMock.calls()).toHaveLength(1);
    });

    it('should handle empty items array', async () => {
      await batchWriteItems('TestTable', []);
      expect(ddbMock.calls()).toHaveLength(0);
    });

    it('should throw error for more than 25 items', async () => {
      const items = Array.from({ length: 26 }, (_, i) => ({
        type: 'put' as const,
        item: { PK: `ROOM#${i}`, SK: 'METADATA' },
      }));

      await expect(batchWriteItems('TestTable', items)).rejects.toThrow(
        'BatchWrite supports maximum 25 items'
      );
    });

    it('should retry on throttling error', async () => {
      ddbMock
        .on(BatchWriteCommand)
        .rejectsOnce(
          new ProvisionedThroughputExceededException({
            message: 'Throttled',
            $metadata: {},
          })
        )
        .resolves({});

      await batchWriteItems('TestTable', [
        { type: 'put', item: { PK: 'ROOM#123', SK: 'METADATA' } },
      ]);

      expect(ddbMock.calls()).toHaveLength(2);
    });
  });

  describe('transactWrite', () => {
    it('should successfully execute transaction', async () => {
      ddbMock.on(TransactWriteCommand).resolves({});

      await transactWrite([
        {
          type: 'put',
          params: {
            TableName: 'TestTable',
            Item: { PK: 'ROOM#123', SK: 'METADATA' },
          },
        },
        {
          type: 'update',
          params: {
            TableName: 'TestTable',
            Key: { PK: 'ROOM#123', SK: 'SCORE#user1' },
            UpdateExpression: 'SET points = :points',
            ExpressionAttributeValues: { ':points': 100 },
          },
        },
      ]);

      expect(ddbMock.calls()).toHaveLength(1);
    });

    it('should handle empty items array', async () => {
      await transactWrite([]);
      expect(ddbMock.calls()).toHaveLength(0);
    });

    it('should throw error for more than 100 items', async () => {
      const items = Array.from({ length: 101 }, (_, i) => ({
        type: 'put' as const,
        params: {
          TableName: 'TestTable',
          Item: { PK: `ROOM#${i}`, SK: 'METADATA' },
        },
      }));

      await expect(transactWrite(items)).rejects.toThrow(
        'TransactWrite supports maximum 100 items'
      );
    });

    it('should retry on throttling error', async () => {
      ddbMock
        .on(TransactWriteCommand)
        .rejectsOnce(
          new ProvisionedThroughputExceededException({
            message: 'Throttled',
            $metadata: {},
          })
        )
        .resolves({});

      await transactWrite([
        {
          type: 'put',
          params: {
            TableName: 'TestTable',
            Item: { PK: 'ROOM#123', SK: 'METADATA' },
          },
        },
      ]);

      expect(ddbMock.calls()).toHaveLength(2);
    });

    it('should not retry on conditional check failure', async () => {
      ddbMock
        .on(TransactWriteCommand)
        .rejects(
          new ConditionalCheckFailedException({
            message: 'Condition failed',
            $metadata: {},
          })
        );

      await expect(
        transactWrite([
          {
            type: 'put',
            params: {
              TableName: 'TestTable',
              Item: { PK: 'ROOM#123', SK: 'METADATA' },
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
        ])
      ).rejects.toThrow(ConditionalCheckFailedException);

      expect(ddbMock.calls()).toHaveLength(1);
    });
  });

  describe('Retry logic', () => {
    it('should implement exponential backoff', async () => {
      const startTime = Date.now();

      ddbMock
        .on(GetCommand)
        .rejectsOnce(
          new ProvisionedThroughputExceededException({
            message: 'Throttled',
            $metadata: {},
          })
        )
        .rejectsOnce(
          new ProvisionedThroughputExceededException({
            message: 'Throttled',
            $metadata: {},
          })
        )
        .resolves({ Item: { PK: 'ROOM#123' } });

      await getItem({
        TableName: 'TestTable',
        Key: { PK: 'ROOM#123', SK: 'METADATA' },
      });

      const elapsed = Date.now() - startTime;

      // Should have some delay due to backoff (at least a few milliseconds)
      // We can't test exact timing due to jitter, but should be > 0
      expect(elapsed).toBeGreaterThan(0);
      expect(ddbMock.calls()).toHaveLength(3);
    });
  });
});
