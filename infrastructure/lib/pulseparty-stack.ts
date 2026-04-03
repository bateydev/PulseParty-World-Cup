import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class PulsePartyStack extends cdk.Stack {
  public readonly table: dynamodb.Table;
  public readonly eventBus: events.EventBus;
  public readonly deadLetterQueue: sqs.Queue;
  public readonly webSocketApi: apigatewayv2.CfnApi;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly connectFunction: lambda.Function;
  public readonly disconnectFunction: lambda.Function;
  public readonly defaultFunction: lambda.Function;
  public readonly ingestionFunction: lambda.Function;
  public readonly roomStateFunction: lambda.Function;
  public readonly momentEngineFunction: lambda.Function;
  public readonly scoringFunction: lambda.Function;
  public readonly recapFunction: lambda.Function;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB single-table design with GSI for match+theme discovery
    // Requirements: 10.1, 10.2, 10.9
    this.table = new dynamodb.Table(this, 'PulsePartyTable', {
      tableName: 'PulsePartyTable-v2',

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

    // ========================================
    // AWS Cognito User Pool and Identity Pool
    // Requirements: 7.3, 7.4
    // ========================================

    // Create Cognito User Pool for authenticated users
    this.userPool = new cognito.UserPool(this, 'PulsePartyUserPool', {
      userPoolName: 'PulsePartyUserPool',
      // Self-service sign-up enabled
      selfSignUpEnabled: true,
      // Sign-in with email or username
      signInAliases: {
        email: true,
        username: true,
      },
      // Auto-verify email addresses
      autoVerify: {
        email: true,
      },
      // Standard attributes
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        preferredUsername: {
          required: false,
          mutable: true,
        },
      },
      // Custom attributes for display name and locale
      customAttributes: {
        displayName: new cognito.StringAttribute({ minLen: 1, maxLen: 50, mutable: true }),
        locale: new cognito.StringAttribute({ minLen: 2, maxLen: 5, mutable: true }),
      },
      // Password policy
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      // Account recovery
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      // Removal policy - use RETAIN for production
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Create User Pool Client for frontend application
    this.userPoolClient = new cognito.UserPoolClient(this, 'PulsePartyUserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'PulsePartyWebClient',
      // OAuth flows
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: false,
      },
      // Token validity
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      // Prevent client secret (for public web clients)
      generateSecret: false,
      // Enable token revocation
      enableTokenRevocation: true,
    });
    // Create Identity Pool for AWS credentials (optional, for future use)
    this.identityPool = new cognito.CfnIdentityPool(this, 'PulsePartyIdentityPool', {
      identityPoolName: 'PulsePartyIdentityPool',
      allowUnauthenticatedIdentities: true, // Allow guest users
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    // Create IAM roles for authenticated and unauthenticated users
    const authenticatedRole = new iam.Role(this, 'CognitoAuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      description: 'Role for authenticated Cognito users',
    });

    const unauthenticatedRole = new iam.Role(this, 'CognitoUnauthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'unauthenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      description: 'Role for unauthenticated (guest) users',
    });

    // Attach roles to Identity Pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
        unauthenticated: unauthenticatedRole.roleArn,
      },
    });

    // Output Cognito details
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'PulsePartyUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
      exportName: 'PulsePartyUserPoolArn',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'PulsePartyUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPool.ref,
      description: 'Cognito Identity Pool ID',
      exportName: 'PulsePartyIdentityPoolId',
    });

    new cdk.CfnOutput(this, 'CognitoRegion', {
      value: this.region,
      description: 'AWS Region for Cognito',
      exportName: 'PulsePartyCognitoRegion',
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

    // ========================================
    // Lambda Functions for Event Processing
    // Requirements: All backend requirements
    // ========================================

    // Common Lambda execution role with DynamoDB, EventBridge, and API Gateway permissions
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for PulseParty Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
      ],
    });

    // Grant DynamoDB permissions
    this.table.grantReadWriteData(lambdaExecutionRole);

    // Grant EventBridge permissions
    this.eventBus.grantPutEventsTo(lambdaExecutionRole);

    // Grant API Gateway management permissions for WebSocket broadcasting
    lambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['execute-api:ManageConnections'],
        resources: ['*'], // Will be scoped after API Gateway creation
      })
    );

    // Grant SQS permissions for DLQ
    this.deadLetterQueue.grantSendMessages(lambdaExecutionRole);

    // 1. Ingestion Lambda - Fetch live match data, normalize events, publish to EventBridge
    // Requirements: 2.1, 2.2, 2.3, 11.1-11.8
    this.ingestionFunction = new lambda.Function(this, 'IngestionFunction', {
      functionName: 'PulseParty-Ingestion',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'ingestion/handler.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      role: lambdaExecutionRole,
      environment: {
        TABLE_NAME: this.table.tableName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
        API_FOOTBALL_KEY: process.env.API_FOOTBALL_KEY || '', // Set via environment or leave empty for simulator mode
        SIMULATOR_MODE: process.env.SIMULATOR_MODE || 'true', // Default to simulator mode
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      description:
        'Ingestion Lambda - Fetch live match data from API-Football and publish to EventBridge',
      deadLetterQueue: this.deadLetterQueue,
    });

    // 2. Room State Lambda - Distribute events to rooms, manage room state
    // Requirements: 1.1-1.8, 2.4, 2.5, 12.3, 12.4
    this.roomStateFunction = new lambda.Function(this, 'RoomStateFunction', {
      functionName: 'PulseParty-RoomState',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Room State event:', JSON.stringify(event));
          // TODO: Implement room management functions (Task 6.1)
          // TODO: Implement room theme validation and discovery (Task 6.3)
          // TODO: Implement event distribution to rooms (Task 6.5)
          return { statusCode: 200, body: 'Event distributed' };
        };
      `),
      role: lambdaExecutionRole,
      environment: {
        TABLE_NAME: this.table.tableName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
        WEBSOCKET_API_ENDPOINT: '', // Will be set after WebSocket API creation
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      description:
        'Room State Lambda - Distribute events to rooms and manage room state',
      deadLetterQueue: this.deadLetterQueue,
    });

    // 3. Moment Engine Lambda - Generate prediction windows, evaluate predictions
    // Requirements: 3.1-3.8
    this.momentEngineFunction = new lambda.Function(
      this,
      'MomentEngineFunction',
      {
        functionName: 'PulseParty-MomentEngine',
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Moment Engine event:', JSON.stringify(event));
          // TODO: Implement prediction window generation (Task 9.1)
          // TODO: Implement prediction window storage and broadcast (Task 9.3)
          // TODO: Implement prediction submission handler (Task 9.4)
          // TODO: Implement prediction evaluation (Task 9.6)
          return { statusCode: 200, body: 'Prediction window processed' };
        };
      `),
        role: lambdaExecutionRole,
        environment: {
          TABLE_NAME: this.table.tableName,
          EVENT_BUS_NAME: this.eventBus.eventBusName,
          WEBSOCKET_API_ENDPOINT: '', // Will be set after WebSocket API creation
        },
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        description:
          'Moment Engine Lambda - Generate prediction windows and evaluate predictions',
        deadLetterQueue: this.deadLetterQueue,
      }
    );

    // 4. Scoring Lambda - Calculate points, apply multipliers, update leaderboards
    // Requirements: 4.1-4.7
    this.scoringFunction = new lambda.Function(this, 'ScoringFunction', {
      functionName: 'PulseParty-Scoring',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Scoring event:', JSON.stringify(event));
          // TODO: Implement points calculation (Task 10.1)
          // TODO: Implement leaderboard management (Task 10.3)
          return { statusCode: 200, body: 'Score updated' };
        };
      `),
      role: lambdaExecutionRole,
      environment: {
        TABLE_NAME: this.table.tableName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
        WEBSOCKET_API_ENDPOINT: '', // Will be set after WebSocket API creation
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      description: 'Scoring Lambda - Calculate points and update leaderboards',
      deadLetterQueue: this.deadLetterQueue,
    });

    // 5. Recap Lambda - Generate wrapped and room recaps
    // Requirements: 5.1-5.7
    this.recapFunction = new lambda.Function(this, 'RecapFunction', {
      functionName: 'PulseParty-Recap',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Recap event:', JSON.stringify(event));
          // TODO: Implement wrapped recap generation (Task 12.1)
          // TODO: Implement room recap generation (Task 12.3)
          // TODO: Implement recap retrieval (Task 12.5)
          return { statusCode: 200, body: 'Recap generated' };
        };
      `),
      role: lambdaExecutionRole,
      environment: {
        TABLE_NAME: this.table.tableName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
        WEBSOCKET_API_ENDPOINT: '', // Will be set after WebSocket API creation
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      description: 'Recap Lambda - Generate wrapped and room recaps',
      deadLetterQueue: this.deadLetterQueue,
    });

    // Output Lambda function ARNs
    new cdk.CfnOutput(this, 'IngestionFunctionArn', {
      value: this.ingestionFunction.functionArn,
      description: 'Ingestion Lambda function ARN',
      exportName: 'PulsePartyIngestionFunctionArn',
    });

    new cdk.CfnOutput(this, 'RoomStateFunctionArn', {
      value: this.roomStateFunction.functionArn,
      description: 'Room State Lambda function ARN',
      exportName: 'PulsePartyRoomStateFunctionArn',
    });

    new cdk.CfnOutput(this, 'MomentEngineFunctionArn', {
      value: this.momentEngineFunction.functionArn,
      description: 'Moment Engine Lambda function ARN',
      exportName: 'PulsePartyMomentEngineFunctionArn',
    });

    new cdk.CfnOutput(this, 'ScoringFunctionArn', {
      value: this.scoringFunction.functionArn,
      description: 'Scoring Lambda function ARN',
      exportName: 'PulsePartyScoringFunctionArn',
    });

    new cdk.CfnOutput(this, 'RecapFunctionArn', {
      value: this.recapFunction.functionArn,
      description: 'Recap Lambda function ARN',
      exportName: 'PulsePartyRecapFunctionArn',
    });

    // ========================================
    // EventBridge Rules for Event Routing
    // Requirements: 12.1, 12.2, 12.6
    // ========================================

    // Rule 1: Route all match events to Room State Lambda
    const roomStateRule = new events.Rule(this, 'RoomStateRule', {
      eventBus: this.eventBus,
      ruleName: 'PulseParty-RouteToRoomState',
      description: 'Route all match events to Room State Lambda',
      eventPattern: {
        source: ['pulseparty.ingestion'],
        detailType: ['MatchEvent'],
      },
    });
    roomStateRule.addTarget(
      new targets.LambdaFunction(this.roomStateFunction, {
        deadLetterQueue: this.deadLetterQueue,
        retryAttempts: 3,
      })
    );

    // Rule 2: Route prediction trigger events to Moment Engine Lambda
    const momentEngineRule = new events.Rule(this, 'MomentEngineRule', {
      eventBus: this.eventBus,
      ruleName: 'PulseParty-RouteToMomentEngine',
      description:
        'Route goal, corner, and free kick events to Moment Engine Lambda',
      eventPattern: {
        source: ['pulseparty.ingestion'],
        detailType: ['MatchEvent'],
        detail: {
          eventType: ['goal', 'corner', 'free_kick'],
        },
      },
    });
    momentEngineRule.addTarget(
      new targets.LambdaFunction(this.momentEngineFunction, {
        deadLetterQueue: this.deadLetterQueue,
        retryAttempts: 3,
      })
    );

    // Rule 3: Route prediction evaluation events to Scoring Lambda
    const scoringRule = new events.Rule(this, 'ScoringRule', {
      eventBus: this.eventBus,
      ruleName: 'PulseParty-RouteToScoring',
      description: 'Route prediction evaluation events to Scoring Lambda',
      eventPattern: {
        source: ['pulseparty.momentengine'],
        detailType: ['PredictionEvaluated'],
      },
    });
    scoringRule.addTarget(
      new targets.LambdaFunction(this.scoringFunction, {
        deadLetterQueue: this.deadLetterQueue,
        retryAttempts: 3,
      })
    );

    // Rule 4: Route match end events to Recap Lambda
    const recapRule = new events.Rule(this, 'RecapRule', {
      eventBus: this.eventBus,
      ruleName: 'PulseParty-RouteToRecap',
      description: 'Route match end events to Recap Lambda',
      eventPattern: {
        source: ['pulseparty.ingestion'],
        detailType: ['MatchEvent'],
        detail: {
          eventType: ['match_end'],
        },
      },
    });
    recapRule.addTarget(
      new targets.LambdaFunction(this.recapFunction, {
        deadLetterQueue: this.deadLetterQueue,
        retryAttempts: 3,
      })
    );

    // ========================================
    // Scheduled Rule for Ingestion Lambda
    // Polls API-Football every 30 seconds for live match data
    // ========================================

    // Rule 5: Trigger Ingestion Lambda every 30 seconds
    // Note: You can disable this rule or adjust the schedule to save API quota
    const ingestionScheduleRule = new events.Rule(this, 'IngestionScheduleRule', {
      ruleName: 'PulseParty-IngestionSchedule',
      description: 'Trigger Ingestion Lambda every 30 seconds to fetch live match data',
      // Poll every 30 seconds (2 requests/minute = 120 requests/hour)
      // For production, consider polling only during match hours to save API quota
      schedule: events.Schedule.rate(cdk.Duration.seconds(30)),
      enabled: true, // Set to false to disable automatic polling
    });
    ingestionScheduleRule.addTarget(
      new targets.LambdaFunction(this.ingestionFunction, {
        deadLetterQueue: this.deadLetterQueue,
        retryAttempts: 2,
      })
    );

    // Output EventBridge rule ARNs
    new cdk.CfnOutput(this, 'RoomStateRuleArn', {
      value: roomStateRule.ruleArn,
      description: 'Room State EventBridge rule ARN',
      exportName: 'PulsePartyRoomStateRuleArn',
    });

    new cdk.CfnOutput(this, 'MomentEngineRuleArn', {
      value: momentEngineRule.ruleArn,
      description: 'Moment Engine EventBridge rule ARN',
      exportName: 'PulsePartyMomentEngineRuleArn',
    });

    new cdk.CfnOutput(this, 'ScoringRuleArn', {
      value: scoringRule.ruleArn,
      description: 'Scoring EventBridge rule ARN',
      exportName: 'PulsePartyScoringRuleArn',
    });

    new cdk.CfnOutput(this, 'RecapRuleArn', {
      value: recapRule.ruleArn,
      description: 'Recap EventBridge rule ARN',
      exportName: 'PulsePartyRecapRuleArn',
    });

    new cdk.CfnOutput(this, 'IngestionScheduleRuleArn', {
      value: ingestionScheduleRule.ruleArn,
      description: 'Ingestion Schedule EventBridge rule ARN',
      exportName: 'PulsePartyIngestionScheduleRuleArn',
    });


    // ========================================
    // WebSocket API Gateway
    // Requirements: 9.1
    // ========================================

    // Create placeholder Lambda functions for WebSocket routes
    // These will be implemented in later tasks (Task 7)

    // $connect handler - stores connection ID in DynamoDB
    this.connectFunction = new lambda.Function(this, 'ConnectHandler', {
      functionName: 'PulseParty-Connect',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'websocket/handleConnect.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      role: lambdaExecutionRole,
      environment: {
        TABLE_NAME: this.table.tableName,
        USER_POOL_ID: this.userPool.userPoolId,
        USER_POOL_CLIENT_ID: this.userPoolClient.userPoolClientId,
        REGION: this.region,
      },
      timeout: cdk.Duration.seconds(10),
      description: 'WebSocket $connect handler - stores connection ID',
    });

    // $disconnect handler - removes connection from DynamoDB
    this.disconnectFunction = new lambda.Function(this, 'DisconnectHandler', {
      functionName: 'PulseParty-Disconnect',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'websocket/handleDisconnect.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      role: lambdaExecutionRole,
      environment: {
        TABLE_NAME: this.table.tableName,
      },
      timeout: cdk.Duration.seconds(10),
      description: 'WebSocket $disconnect handler - cleans up connection',
    });

    // $default handler - routes messages based on action type
    this.defaultFunction = new lambda.Function(this, 'DefaultHandler', {
      functionName: 'PulseParty-Default',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'websocket/handleMessage.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      role: lambdaExecutionRole,
      environment: {
        TABLE_NAME: this.table.tableName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
      },
      timeout: cdk.Duration.seconds(10),
      description: 'WebSocket $default handler - routes messages by action',
    });

    // Grant API Gateway management permissions to Lambda functions for broadcasting
    const apiGatewayPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['execute-api:ManageConnections'],
      resources: ['*'], // Will be scoped to specific API after creation
    });

    this.connectFunction.addToRolePolicy(apiGatewayPolicy);
    this.disconnectFunction.addToRolePolicy(apiGatewayPolicy);
    this.defaultFunction.addToRolePolicy(apiGatewayPolicy);

    // Create WebSocket API
    this.webSocketApi = new apigatewayv2.CfnApi(this, 'WebSocketApi', {
      name: 'PulsePartyWebSocketApi',
      protocolType: 'WEBSOCKET',
      routeSelectionExpression: '$request.body.action',
      description: 'WebSocket API for real-time PulseParty communication',
    });

    // Create CloudWatch Log Group for WebSocket API
    const wsLogGroup = new logs.LogGroup(this, 'WebSocketApiLogGroup', {
      logGroupName: `/aws/apigateway/PulsePartyWebSocketApi`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create integrations for each Lambda function
    const connectIntegration = new apigatewayv2.CfnIntegration(
      this,
      'ConnectIntegration',
      {
        apiId: this.webSocketApi.ref,
        integrationType: 'AWS_PROXY',
        integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${this.connectFunction.functionArn}/invocations`,
        integrationMethod: 'POST',
      }
    );

    const disconnectIntegration = new apigatewayv2.CfnIntegration(
      this,
      'DisconnectIntegration',
      {
        apiId: this.webSocketApi.ref,
        integrationType: 'AWS_PROXY',
        integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${this.disconnectFunction.functionArn}/invocations`,
        integrationMethod: 'POST',
      }
    );

    const defaultIntegration = new apigatewayv2.CfnIntegration(
      this,
      'DefaultIntegration',
      {
        apiId: this.webSocketApi.ref,
        integrationType: 'AWS_PROXY',
        integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${this.defaultFunction.functionArn}/invocations`,
        integrationMethod: 'POST',
      }
    );

    // Create routes
    const connectRoute = new apigatewayv2.CfnRoute(this, 'ConnectRoute', {
      apiId: this.webSocketApi.ref,
      routeKey: '$connect',
      authorizationType: 'NONE',
      target: `integrations/${connectIntegration.ref}`,
    });

    const disconnectRoute = new apigatewayv2.CfnRoute(this, 'DisconnectRoute', {
      apiId: this.webSocketApi.ref,
      routeKey: '$disconnect',
      target: `integrations/${disconnectIntegration.ref}`,
    });

    const defaultRoute = new apigatewayv2.CfnRoute(this, 'DefaultRoute', {
      apiId: this.webSocketApi.ref,
      routeKey: '$default',
      target: `integrations/${defaultIntegration.ref}`,
    });

    // Create deployment
    const deployment = new apigatewayv2.CfnDeployment(
      this,
      'WebSocketDeployment',
      {
        apiId: this.webSocketApi.ref,
      }
    );

    // Ensure routes are created before deployment
    deployment.addDependency(connectRoute);
    deployment.addDependency(disconnectRoute);
    deployment.addDependency(defaultRoute);

    // Create stage without CloudWatch logging (for AWS sandbox compatibility)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const stage = new apigatewayv2.CfnStage(this, 'WebSocketStage', {
      apiId: this.webSocketApi.ref,
      stageName: 'prod',
      deploymentId: deployment.ref,
      description: 'Production stage for PulseParty WebSocket API',
      // Logging disabled for AWS sandbox compatibility
      // Lambda function logs will still be available in CloudWatch
    });

    // Grant API Gateway permission to invoke Lambda functions
    this.connectFunction.addPermission('ApiGatewayInvokeConnect', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.webSocketApi.ref}/*/$connect`,
    });

    this.disconnectFunction.addPermission('ApiGatewayInvokeDisconnect', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.webSocketApi.ref}/*/$disconnect`,
    });

    this.defaultFunction.addPermission('ApiGatewayInvokeDefault', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.webSocketApi.ref}/*/$default`,
    });

    // Output WebSocket API details
    new cdk.CfnOutput(this, 'WebSocketApiId', {
      value: this.webSocketApi.ref,
      description: 'WebSocket API ID',
      exportName: 'PulsePartyWebSocketApiId',
    });

    new cdk.CfnOutput(this, 'WebSocketApiEndpoint', {
      value: `wss://${this.webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/prod`,
      description: 'WebSocket API endpoint URL',
      exportName: 'PulsePartyWebSocketApiEndpoint',
    });

    new cdk.CfnOutput(this, 'ConnectFunctionArn', {
      value: this.connectFunction.functionArn,
      description: 'Connect handler Lambda function ARN',
      exportName: 'PulsePartyConnectFunctionArn',
    });

    new cdk.CfnOutput(this, 'DisconnectFunctionArn', {
      value: this.disconnectFunction.functionArn,
      description: 'Disconnect handler Lambda function ARN',
      exportName: 'PulsePartyDisconnectFunctionArn',
    });

    new cdk.CfnOutput(this, 'DefaultFunctionArn', {
      value: this.defaultFunction.functionArn,
      description: 'Default handler Lambda function ARN',
      exportName: 'PulsePartyDefaultFunctionArn',
    });

    // Update Lambda environment variables with WebSocket API endpoint
    const wsEndpoint = `wss://${this.webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/prod`;

    // Add to WebSocket handlers
    this.connectFunction.addEnvironment('WEBSOCKET_API_ENDPOINT', wsEndpoint);
    this.disconnectFunction.addEnvironment('WEBSOCKET_API_ENDPOINT', wsEndpoint);
    this.defaultFunction.addEnvironment('WEBSOCKET_API_ENDPOINT', wsEndpoint);

    // Add to event processing functions
    this.roomStateFunction.addEnvironment('WEBSOCKET_API_ENDPOINT', wsEndpoint);
    this.momentEngineFunction.addEnvironment(
      'WEBSOCKET_API_ENDPOINT',
      wsEndpoint
    );
    this.scoringFunction.addEnvironment('WEBSOCKET_API_ENDPOINT', wsEndpoint);
    this.recapFunction.addEnvironment('WEBSOCKET_API_ENDPOINT', wsEndpoint);
  }
}
