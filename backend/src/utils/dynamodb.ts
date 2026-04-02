import {
  DynamoDBClient,
  ConditionalCheckFailedException,
  ProvisionedThroughputExceededException,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  PutCommandInput,
  GetCommandInput,
  QueryCommandInput,
  UpdateCommandInput,
  DeleteCommandInput,
} from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

// Configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 100;
const MAX_DELAY_MS = 5000;

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(attempt: number): number {
  const exponentialDelay = Math.min(
    BASE_DELAY_MS * Math.pow(2, attempt),
    MAX_DELAY_MS
  );
  // Add jitter (random value between 0 and delay)
  return Math.floor(Math.random() * exponentialDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof ProvisionedThroughputExceededException) {
    return true;
  }
  
  // Check for transient errors
  if (error instanceof Error) {
    const errorName = error.name;
    return (
      errorName === 'ServiceUnavailable' ||
      errorName === 'InternalServerError' ||
      errorName === 'RequestTimeout' ||
      errorName === 'ThrottlingException'
    );
  }
  
  return false;
}

/**
 * Execute operation with retry logic
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry non-retryable errors
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === MAX_RETRIES - 1) {
        break;
      }
      
      const delay = calculateBackoffDelay(attempt);
      console.warn(
        `${operationName} failed (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms`,
        error
      );
      
      await sleep(delay);
    }
  }
  
  console.error(`${operationName} failed after ${MAX_RETRIES} attempts`, lastError);
  throw lastError;
}

/**
 * Put item into DynamoDB with strong consistency
 * Implements retry logic with exponential backoff for throttling
 */
export async function putItem(
  params: Omit<PutCommandInput, 'ReturnValues'>
): Promise<void> {
  await executeWithRetry(async () => {
    const command = new PutCommand(params);
    await docClient.send(command);
  }, 'putItem');
}

/**
 * Get item from DynamoDB
 * Uses eventual consistency by default for non-critical queries (Requirement 10.6)
 * Set ConsistentRead: true for strong consistency (Requirement 10.7)
 */
export async function getItem<T = Record<string, unknown>>(
  params: GetCommandInput
): Promise<T | null> {
  return executeWithRetry(async () => {
    const command = new GetCommand(params);
    const result = await docClient.send(command);
    return (result.Item as T) || null;
  }, 'getItem');
}

/**
 * Query items from DynamoDB
 * Uses eventual consistency by default for non-critical queries (Requirement 10.6)
 * Set ConsistentRead: true for strong consistency
 */
export async function queryItems<T = Record<string, unknown>>(
  params: QueryCommandInput
): Promise<T[]> {
  return executeWithRetry(async () => {
    const command = new QueryCommand(params);
    const result = await docClient.send(command);
    return (result.Items as T[]) || [];
  }, 'queryItems');
}

/**
 * Query items with pagination support
 * Returns items and LastEvaluatedKey for pagination
 */
export async function queryItemsWithPagination<T = Record<string, unknown>>(
  params: QueryCommandInput
): Promise<{ items: T[]; lastEvaluatedKey?: Record<string, unknown> }> {
  return executeWithRetry(async () => {
    const command = new QueryCommand(params);
    const result = await docClient.send(command);
    return {
      items: (result.Items as T[]) || [],
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }, 'queryItemsWithPagination');
}

/**
 * Update item in DynamoDB with strong consistency
 * Implements retry logic with exponential backoff for throttling
 */
export async function updateItem<T = Record<string, unknown>>(
  params: UpdateCommandInput
): Promise<T | null> {
  return executeWithRetry(async () => {
    const command = new UpdateCommand(params);
    const result = await docClient.send(command);
    return (result.Attributes as T) || null;
  }, 'updateItem');
}

/**
 * Delete item from DynamoDB
 */
export async function deleteItem(
  params: DeleteCommandInput
): Promise<void> {
  await executeWithRetry(async () => {
    const command = new DeleteCommand(params);
    await docClient.send(command);
  }, 'deleteItem');
}

/**
 * Batch get items (up to 100 items)
 * Note: BatchGet uses eventual consistency
 */
export async function batchGetItems<T = Record<string, unknown>>(
  tableName: string,
  keys: Record<string, unknown>[]
): Promise<T[]> {
  if (keys.length === 0) {
    return [];
  }
  
  if (keys.length > 100) {
    throw new Error('BatchGet supports maximum 100 items');
  }
  
  return executeWithRetry(async () => {
    const { BatchGetCommand } = await import('@aws-sdk/lib-dynamodb');
    const command = new BatchGetCommand({
      RequestItems: {
        [tableName]: {
          Keys: keys,
        },
      },
    });
    
    const result = await docClient.send(command);
    return (result.Responses?.[tableName] as T[]) || [];
  }, 'batchGetItems');
}

/**
 * Batch write items (up to 25 items)
 * Supports both Put and Delete operations
 */
export async function batchWriteItems(
  tableName: string,
  items: Array<{ type: 'put' | 'delete'; item: Record<string, unknown> }>
): Promise<void> {
  if (items.length === 0) {
    return;
  }
  
  if (items.length > 25) {
    throw new Error('BatchWrite supports maximum 25 items');
  }
  
  await executeWithRetry(async () => {
    const { BatchWriteCommand } = await import('@aws-sdk/lib-dynamodb');
    const command = new BatchWriteCommand({
      RequestItems: {
        [tableName]: items.map((item) => {
          if (item.type === 'put') {
            return { PutRequest: { Item: item.item } };
          } else {
            return { DeleteRequest: { Key: item.item } };
          }
        }),
      },
    });
    
    await docClient.send(command);
  }, 'batchWriteItems');
}

/**
 * Transactional write (up to 100 items)
 * All operations succeed or all fail
 */
export async function transactWrite(
  items: Array<{
    type: 'put' | 'update' | 'delete' | 'conditionCheck';
    params: any;
  }>
): Promise<void> {
  if (items.length === 0) {
    return;
  }
  
  if (items.length > 100) {
    throw new Error('TransactWrite supports maximum 100 items');
  }
  
  await executeWithRetry(async () => {
    const { TransactWriteCommand } = await import('@aws-sdk/lib-dynamodb');
    const transactItems = items.map((item) => {
      switch (item.type) {
        case 'put':
          return { Put: item.params };
        case 'update':
          return { Update: item.params };
        case 'delete':
          return { Delete: item.params };
        case 'conditionCheck':
          return { ConditionCheck: item.params };
        default:
          throw new Error(`Unknown transaction type: ${item.type}`);
      }
    });
    
    const command = new TransactWriteCommand({
      TransactItems: transactItems as any,
    });
    
    await docClient.send(command);
  }, 'transactWrite');
}

// Export error types for consumers
export {
  ConditionalCheckFailedException,
  ProvisionedThroughputExceededException,
  ResourceNotFoundException,
};
