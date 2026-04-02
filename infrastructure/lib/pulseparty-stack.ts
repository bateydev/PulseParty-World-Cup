import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class PulsePartyStack extends cdk.Stack {
  public readonly table: dynamodb.Table;
  public readonly eventBus: events.EventBus;
  public readonly deadLetterQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB single-table design with GSI for match+theme discovery
    // Requirements: 10.1, 10.2, 10.9
    this.table = new dynamodb.Table(this, 'PulsePartyTable', {
      tableName: 'PulsePartyTable',

      // Primary key: PK (partition key), SK (sort key)
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },

      // On-demand billing mode for variable load
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,

      // TTL attribute for automatic cleanup (7 days after match completion)
      timeToLiveAttribute: 'ttl',

      // Point-in-time recovery for data protection
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },

      // Removal policy - use RETAIN for production, DESTROY for dev/test
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Global Secondary Index 1 (GSI1) for room discovery by match ID and theme
    // Enables queries like: "Find all Country-themed rooms for match X"
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: {
        name: 'GSI1PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI1SK',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Output the table name for use in Lambda functions
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'DynamoDB table name for PulseParty',
      exportName: 'PulsePartyTableName',
    });

    // Output the table ARN
    new cdk.CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      description: 'DynamoDB table ARN for PulseParty',
      exportName: 'PulsePartyTableArn',
    });

    // Output the GSI name
    new cdk.CfnOutput(this, 'GSI1Name', {
      value: 'GSI1',
      description: 'GSI for match+theme discovery',
      exportName: 'PulsePartyGSI1Name',
    });

    // Dead-letter queue for failed event processing
    // Requirements: 12.7
    this.deadLetterQueue = new sqs.Queue(this, 'PulsePartyDLQ', {
      queueName: 'PulsePartyDLQ',
      // Retain messages for 14 days for debugging
      retentionPeriod: cdk.Duration.days(14),
      // Enable encryption at rest
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    // Custom EventBridge event bus for match events
    // Requirements: 12.1, 12.2
    this.eventBus = new events.EventBus(this, 'PulsePartyEventBus', {
      eventBusName: 'PulsePartyEventBus',
    });

    // Archive all events for replay and debugging (optional but recommended)
    new events.Archive(this, 'PulsePartyEventArchive', {
      sourceEventBus: this.eventBus,
      archiveName: 'PulsePartyEventArchive',
      description: 'Archive of all match events for replay and debugging',
      retention: cdk.Duration.days(7),
      eventPattern: {
        source: ['pulseparty.ingestion'],
      },
    });

    // Note: Event rules will be added when Lambda functions are created in Task 2.4
    // Rules will route events by match ID to:
    // - Room State Lambda (all events)
    // - Moment Engine Lambda (goal, corner, free kick events + time-based)
    // - Scoring Lambda (prediction evaluation events)
    // - Recap Lambda (match end events)

    // Output the event bus name for use in Lambda functions
    new cdk.CfnOutput(this, 'EventBusName', {
      value: this.eventBus.eventBusName,
      description: 'EventBridge event bus name for match events',
      exportName: 'PulsePartyEventBusName',
    });

    // Output the event bus ARN
    new cdk.CfnOutput(this, 'EventBusArn', {
      value: this.eventBus.eventBusArn,
      description: 'EventBridge event bus ARN',
      exportName: 'PulsePartyEventBusArn',
    });

    // Output the DLQ name
    new cdk.CfnOutput(this, 'DLQName', {
      value: this.deadLetterQueue.queueName,
      description: 'Dead-letter queue name for failed events',
      exportName: 'PulsePartyDLQName',
    });

    // Output the DLQ ARN
    new cdk.CfnOutput(this, 'DLQArn', {
      value: this.deadLetterQueue.queueArn,
      description: 'Dead-letter queue ARN',
      exportName: 'PulsePartyDLQArn',
    });

    // Output the DLQ URL
    new cdk.CfnOutput(this, 'DLQUrl', {
      value: this.deadLetterQueue.queueUrl,
      description: 'Dead-letter queue URL',
      exportName: 'PulsePartyDLQUrl',
    });
  }
}
