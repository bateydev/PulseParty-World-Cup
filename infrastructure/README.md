# PulseParty Infrastructure

AWS CDK infrastructure for PulseParty Rooms platform.

## Overview

This directory contains the AWS CDK infrastructure definitions for the PulseParty Rooms system. The infrastructure follows a serverless architecture with DynamoDB as the primary data store.

## Components

### DynamoDB Table

**Table Name**: `PulsePartyTable`

**Design Pattern**: Single-table design with Global Secondary Index (GSI)

**Primary Key**:
- **PK** (Partition Key): Entity type + ID (e.g., `ROOM#{roomId}`, `USER#{userId}`)
- **SK** (Sort Key): Related entity or timestamp (e.g., `METADATA`, `PREDICTION#{windowId}#{userId}`)

**Global Secondary Index (GSI1)**:
- **GSI1PK** (Partition Key): Match ID + Theme (e.g., `MATCH#{matchId}#THEME#{theme}`)
- **GSI1SK** (Sort Key): Creation timestamp
- **Purpose**: Room discovery by match and theme

**TTL Attribute**: `ttl`
- Automatically deletes room records 7 days after match completion
- Automatically deletes guest user sessions 24 hours after last activity

**Billing Mode**: On-demand (PAY_PER_REQUEST)
- Scales automatically with variable load
- No capacity planning required

## Prerequisites

- Node.js >= 18.0.0
- AWS CLI configured with credentials
- AWS CDK CLI installed globally: `npm install -g aws-cdk`

## Installation

```bash
cd infrastructure
npm install
```

## Usage

### Synthesize CloudFormation Template

```bash
npm run synth
```

### Deploy to AWS

```bash
npm run deploy
```

### View Differences

```bash
npm run diff
```

### Destroy Stack

```bash
npm run destroy
```

## Entity Patterns

### Room Entity
```
PK: ROOM#{roomId}
SK: METADATA
GSI1PK: MATCH#{matchId}#THEME#{theme}
GSI1SK: {createdAt}
Attributes: roomCode, matchId, theme, participants[], createdAt, ttl
```

### Connection Entity
```
PK: CONNECTION#{connectionId}
SK: METADATA
Attributes: userId, roomId, connectedAt, lastHeartbeat
```

### User Entity
```
PK: USER#{userId}
SK: METADATA
Attributes: displayName, isGuest, cognitoId?, locale, createdAt
```

### Prediction Entity
```
PK: ROOM#{roomId}
SK: PREDICTION#{windowId}#{userId}
Attributes: windowId, userId, predictionType, choice, submittedAt, isCorrect?, pointsAwarded?
```

### Score Entity
```
PK: ROOM#{roomId}
SK: SCORE#{userId}
Attributes: userId, totalPoints, streak, clutchMoments, correctPredictions, totalPredictions, rank, updatedAt
```

### Wrapped Recap Entity
```
PK: USER#{userId}
SK: RECAP#{matchId}#{roomId}
Attributes: matchId, roomId, totalPoints, finalRank, accuracy, longestStreak, clutchMoments, shareableUrl, createdAt
```

## Access Patterns

1. **Create Room**: `PutItem` with `PK=ROOM#{roomId}`, `SK=METADATA`
2. **Get Room by Code**: `Scan` with filter on `roomCode` attribute
3. **Discover Rooms by Match+Theme**: `Query GSI1` with `GSI1PK=MATCH#{matchId}#THEME#{theme}`
4. **Get Room Participants**: `GetItem` with `PK=ROOM#{roomId}`, `SK=METADATA`
5. **Store Prediction**: `PutItem` with `PK=ROOM#{roomId}`, `SK=PREDICTION#{windowId}#{userId}`
6. **Get User Predictions for Window**: `Query` with `PK=ROOM#{roomId}`, `SK` begins with `PREDICTION#{windowId}`
7. **Update Score**: `UpdateItem` with `PK=ROOM#{roomId}`, `SK=SCORE#{userId}`
8. **Get Leaderboard**: `Query` with `PK=ROOM#{roomId}`, `SK` begins with `SCORE#`, sort by `totalPoints`
9. **Store Wrapped Recap**: `PutItem` with `PK=USER#{userId}`, `SK=RECAP#{matchId}#{roomId}`
10. **Get User Recaps**: `Query` with `PK=USER#{userId}`, `SK` begins with `RECAP#`

## Outputs

After deployment, the stack exports:

- **PulsePartyTableName**: DynamoDB table name
- **PulsePartyTableArn**: DynamoDB table ARN
- **PulsePartyGSI1Name**: GSI name for match+theme discovery

These outputs can be referenced by Lambda functions and other AWS resources.

## Requirements Validation

This infrastructure satisfies the following requirements:

- **10.1**: Single-table design in DynamoDB for all entity types ✓
- **10.2**: Global Secondary Index (GSI) on match identifier and theme ✓
- **10.9**: Time-To-Live (TTL) on room records (7 days after match completion) ✓

## Next Steps

After deploying the DynamoDB table, proceed to:

1. Task 2.2: Define EventBridge event bus and routing rules
2. Task 2.3: Define API Gateway WebSocket API
3. Task 2.4: Define Lambda functions with IAM roles
