# Task 2.4 Summary: Lambda Functions with IAM Roles

## Overview

This task defined 5 core Lambda functions for the PulseParty backend with proper IAM roles and EventBridge routing rules. The WebSocket handlers were already created in Task 2.3.

## Lambda Functions Created

### 1. Ingestion Lambda (`PulseParty-Ingestion`)
- **Purpose**: Parse XML match events, normalize to JSON, publish to EventBridge
- **Runtime**: Node.js 20.x
- **Timeout**: 30 seconds
- **Memory**: 512 MB
- **Environment Variables**:
  - `TABLE_NAME`: DynamoDB table name
  - `EVENT_BUS_NAME`: EventBridge event bus name
  - `SIMULATOR_MODE`: Toggle for demo mode (default: false)
- **Requirements**: 2.1, 2.2, 2.3, 11.1-11.8
- **Implementation Tasks**: 4.1, 4.3, 4.5, 4.7

### 2. Room State Lambda (`PulseParty-RoomState`)
- **Purpose**: Distribute events to rooms, manage room state
- **Runtime**: Node.js 20.x
- **Timeout**: 30 seconds
- **Memory**: 512 MB
- **Environment Variables**:
  - `TABLE_NAME`: DynamoDB table name
  - `EVENT_BUS_NAME`: EventBridge event bus name
  - `WEBSOCKET_API_ENDPOINT`: WebSocket API endpoint URL
- **Requirements**: 1.1-1.8, 2.4, 2.5, 12.3, 12.4
- **Implementation Tasks**: 6.1, 6.3, 6.5

### 3. Moment Engine Lambda (`PulseParty-MomentEngine`)
- **Purpose**: Generate prediction windows, evaluate predictions
- **Runtime**: Node.js 20.x
- **Timeout**: 30 seconds
- **Memory**: 512 MB
- **Environment Variables**:
  - `TABLE_NAME`: DynamoDB table name
  - `EVENT_BUS_NAME`: EventBridge event bus name
  - `WEBSOCKET_API_ENDPOINT`: WebSocket API endpoint URL
- **Requirements**: 3.1-3.8
- **Implementation Tasks**: 9.1, 9.3, 9.4, 9.6

### 4. Scoring Lambda (`PulseParty-Scoring`)
- **Purpose**: Calculate points, apply multipliers, update leaderboards
- **Runtime**: Node.js 20.x
- **Timeout**: 30 seconds
- **Memory**: 512 MB
- **Environment Variables**:
  - `TABLE_NAME`: DynamoDB table name
  - `EVENT_BUS_NAME`: EventBridge event bus name
  - `WEBSOCKET_API_ENDPOINT`: WebSocket API endpoint URL
- **Requirements**: 4.1-4.7
- **Implementation Tasks**: 10.1, 10.3

### 5. Recap Lambda (`PulseParty-Recap`)
- **Purpose**: Generate wrapped and room recaps
- **Runtime**: Node.js 20.x
- **Timeout**: 30 seconds
- **Memory**: 512 MB
- **Environment Variables**:
  - `TABLE_NAME`: DynamoDB table name
  - `EVENT_BUS_NAME`: EventBridge event bus name
  - `WEBSOCKET_API_ENDPOINT`: WebSocket API endpoint URL
- **Requirements**: 5.1-5.7
- **Implementation Tasks**: 12.1, 12.3, 12.5

## IAM Role Configuration

### Lambda Execution Role
A single shared execution role (`LambdaExecutionRole`) was created with least-privilege permissions:

**Managed Policies**:
- `AWSLambdaBasicExecutionRole` - CloudWatch Logs access

**Inline Policies**:
- **DynamoDB**: Read/write access to PulsePartyTable
- **EventBridge**: PutEvents permission to PulsePartyEventBus
- **API Gateway**: ManageConnections permission for WebSocket broadcasting
- **SQS**: SendMessage permission to dead-letter queue

This role is shared across all Lambda functions to simplify management while maintaining security.

## EventBridge Routing Rules

### Rule 1: Room State Rule (`PulseParty-RouteToRoomState`)
- **Source**: `pulseparty.ingestion`
- **Detail Type**: `MatchEvent`
- **Target**: Room State Lambda
- **Purpose**: Route all match events to Room State for distribution to rooms
- **Retry**: 3 attempts with DLQ

### Rule 2: Moment Engine Rule (`PulseParty-RouteToMomentEngine`)
- **Source**: `pulseparty.ingestion`
- **Detail Type**: `MatchEvent`
- **Event Types**: `goal`, `corner`, `free_kick`
- **Target**: Moment Engine Lambda
- **Purpose**: Trigger prediction window generation on specific events
- **Retry**: 3 attempts with DLQ

### Rule 3: Scoring Rule (`PulseParty-RouteToScoring`)
- **Source**: `pulseparty.momentengine`
- **Detail Type**: `PredictionEvaluated`
- **Target**: Scoring Lambda
- **Purpose**: Calculate points when predictions are evaluated
- **Retry**: 3 attempts with DLQ

### Rule 4: Recap Rule (`PulseParty-RouteToRecap`)
- **Source**: `pulseparty.ingestion`
- **Detail Type**: `MatchEvent`
- **Event Type**: `match_end`
- **Target**: Recap Lambda
- **Purpose**: Generate recaps when match concludes
- **Retry**: 3 attempts with DLQ

## CloudFormation Outputs

The following outputs were added for reference:

**Lambda Functions**:
- `IngestionFunctionArn`
- `RoomStateFunctionArn`
- `MomentEngineFunctionArn`
- `ScoringFunctionArn`
- `RecapFunctionArn`

**EventBridge Rules**:
- `RoomStateRuleArn`
- `MomentEngineRuleArn`
- `ScoringRuleArn`
- `RecapRuleArn`

## Error Handling

All Lambda functions are configured with:
- **Dead-letter queue**: Failed events sent to `PulsePartyDLQ` after 3 retry attempts
- **Timeout**: 30 seconds to prevent long-running executions
- **CloudWatch Logs**: Automatic logging via `AWSLambdaBasicExecutionRole`

## WebSocket Integration

After the WebSocket API is created, the `WEBSOCKET_API_ENDPOINT` environment variable is automatically updated for all Lambda functions that need to broadcast messages:
- Room State Lambda
- Moment Engine Lambda
- Scoring Lambda
- Recap Lambda

The endpoint format is: `wss://{api-id}.execute-api.{region}.amazonaws.com/prod`

## Next Steps

The Lambda functions are now defined with placeholder implementations. The actual business logic will be implemented in subsequent tasks:

- **Task 4**: Implement Ingestion Lambda (XML parsing, normalization, EventBridge publishing)
- **Task 6**: Implement Room State Lambda (room management, event distribution)
- **Task 9**: Implement Moment Engine Lambda (prediction generation, evaluation)
- **Task 10**: Implement Scoring Lambda (points calculation, leaderboard updates)
- **Task 12**: Implement Recap Lambda (wrapped and room recap generation)

## Validation

The CDK stack was validated with:
- ✅ TypeScript compilation (`npm run build`)
- ✅ CDK synthesis (`npm run synth`)
- ✅ No TypeScript diagnostics
- ✅ Prettier formatting applied

The infrastructure is ready for deployment and implementation of the Lambda function business logic.
