# Live Match Data Integration Guide

## Overview

This guide explains how to integrate live match data into PulseParty using API-Football. The system supports two modes:

1. **Live Mode**: Fetches real-time match data from API-Football
2. **Simulator Mode**: Uses pre-recorded match events for demos/testing

## API-Football Setup

### 1. Sign Up for API-Football

1. Go to https://www.api-football.com/
2. Click "Get Started" or "Pricing"
3. Select the **Free Plan** (100 requests/day)
4. Create an account and verify your email
5. Go to your dashboard to get your API key

### 2. API Key Configuration

The API key is stored as an environment variable in the Ingestion Lambda.

**Option A: Update via AWS Console**

```bash
# Go to Lambda console
aws lambda update-function-configuration \
  --function-name PulseParty-Ingestion \
  --environment "Variables={TABLE_NAME=PulsePartyTable-v2,EVENT_BUS_NAME=PulsePartyEventBus,API_FOOTBALL_KEY=your-api-key-here,SIMULATOR_MODE=false}"
```

**Option B: Update via CDK (Recommended)**

Edit `infrastructure/lib/pulseparty-stack.ts`:

```typescript
this.ingestionFunction = new lambda.Function(this, 'IngestionFunction', {
  // ... other config
  environment: {
    TABLE_NAME: this.table.tableName,
    EVENT_BUS_NAME: this.eventBus.eventBusName,
    API_FOOTBALL_KEY: 'your-api-key-here', // Add your API key
    SIMULATOR_MODE: 'false', // Set to 'true' to force simulator mode
  },
});
```

Then redeploy:

```bash
cd infrastructure
npx cdk deploy
```

## How It Works

### Data Flow

```
API-Football (Live Match Data)
    ↓
Ingestion Lambda (polls every 30s)
    ↓
Transform to MatchEvent format
    ↓
Normalize & Validate
    ↓
Publish to EventBridge
    ↓
Room State Lambda (distribute to rooms)
    ↓
WebSocket (send to connected users)
    ↓
Frontend (update UI in real-time)
```

### Ingestion Lambda Trigger

The Ingestion Lambda is triggered by an EventBridge scheduled rule:

- **Schedule**: Every 30 seconds during match hours (configurable)
- **Purpose**: Poll API-Football for new match events
- **Deduplication**: Tracks processed events to avoid duplicates

### Event Transformation

API-Football events are transformed to internal `MatchEvent` format:

**API-Football Event:**
```json
{
  "time": { "elapsed": 23 },
  "team": { "id": 123, "name": "Germany" },
  "player": { "id": 456, "name": "Mueller" },
  "type": "Goal",
  "detail": "Normal Goal",
  "assist": { "id": 789, "name": "Kroos" }
}
```

**Internal MatchEvent:**
```json
{
  "eventId": "evt-12345-23-Goal-456",
  "matchId": "match-12345",
  "eventType": "goal",
  "timestamp": "2026-04-04T14:23:45.000Z",
  "teamId": "team-123",
  "playerId": "player-456",
  "metadata": {
    "minute": 23,
    "half": 1,
    "description": "Normal Goal - Mueller",
    "assistBy": "player-789",
    "assistName": "Kroos",
    "score": { "home": 1, "away": 0 }
  }
}
```

### Supported Event Types

| API-Football Type | Internal Type | Description |
|-------------------|---------------|-------------|
| Goal | `goal` | Goal scored |
| Card (Yellow) | `yellow_card` | Yellow card issued |
| Card (Red) | `red_card` | Red card issued |
| Subst | `substitution` | Player substitution |

Additional event types (corners, shots, possession) can be added by extending the transformation logic.

## Simulator Mode

### When to Use Simulator Mode

- **No API Key**: When API-Football key is not configured
- **Demo/Testing**: When you want predictable, repeatable events
- **Development**: When you don't want to consume API quota
- **API Failure**: Automatic fallback when API-Football is unavailable

### Enabling Simulator Mode

**Option 1: Environment Variable**

```bash
aws lambda update-function-configuration \
  --function-name PulseParty-Ingestion \
  --environment "Variables={SIMULATOR_MODE=true,...}"
```

**Option 2: No API Key**

Simply don't set `API_FOOTBALL_KEY` - the system will automatically use simulator mode.

### Simulator Features

- **24 Pre-recorded Events**: Realistic Germany vs France match
- **Event Types**: Goals, cards, corners, shots, substitutions, possession
- **Realistic Timing**: Events spaced with actual match timing
- **10x Speed**: Compressed for demos (configurable)
- **User Notification**: Events tagged with `simulated: true` in metadata

## Deployment

### Step 1: Build Backend

```bash
cd backend
npm install
npm run build
```

This compiles TypeScript to JavaScript in `backend/dist/`.

### Step 2: Update Infrastructure

Edit `infrastructure/lib/pulseparty-stack.ts` to use the real handler:

```typescript
this.ingestionFunction = new lambda.Function(this, 'IngestionFunction', {
  functionName: 'PulseParty-Ingestion',
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'ingestion/handler.handler', // Updated handler path
  code: lambda.Code.fromAsset('../backend/dist'), // Use compiled code
  role: lambdaExecutionRole,
  environment: {
    TABLE_NAME: this.table.tableName,
    EVENT_BUS_NAME: this.eventBus.eventBusName,
    API_FOOTBALL_KEY: process.env.API_FOOTBALL_KEY || '', // From env or CDK context
    SIMULATOR_MODE: 'false',
  },
  timeout: cdk.Duration.seconds(30),
  memorySize: 512,
  description: 'Ingestion Lambda - Fetch live match data and publish to EventBridge',
  deadLetterQueue: this.deadLetterQueue,
});
```

### Step 3: Add Scheduled Trigger

Add an EventBridge rule to trigger the Ingestion Lambda every 30 seconds:

```typescript
// EventBridge rule to trigger ingestion every 30 seconds
const ingestionRule = new events.Rule(this, 'IngestionScheduleRule', {
  ruleName: 'PulseParty-IngestionSchedule',
  description: 'Trigger ingestion Lambda every 30 seconds during match hours',
  schedule: events.Schedule.rate(cdk.Duration.seconds(30)),
  enabled: true, // Set to false to disable polling
});

// Add Ingestion Lambda as target
ingestionRule.addTarget(new targets.LambdaFunction(this.ingestionFunction));
```

### Step 4: Deploy

```bash
cd infrastructure
export API_FOOTBALL_KEY="your-api-key-here"
npx cdk deploy
```

## Testing

### Test Simulator Mode

```bash
# Invoke Lambda with simulator mode
aws lambda invoke \
  --function-name PulseParty-Ingestion \
  --payload '{}' \
  response.json

# Check response
cat response.json
```

Expected output:
```json
{
  "success": true,
  "mode": "simulator",
  "eventsFetched": 3,
  "eventsNormalized": 3,
  "eventsPublished": 3,
  "errors": []
}
```

### Test Live Mode

```bash
# Set API key
aws lambda update-function-configuration \
  --function-name PulseParty-Ingestion \
  --environment "Variables={API_FOOTBALL_KEY=your-key,SIMULATOR_MODE=false,...}"

# Invoke Lambda
aws lambda invoke \
  --function-name PulseParty-Ingestion \
  --payload '{}' \
  response.json

# Check response
cat response.json
```

Expected output (when live matches are available):
```json
{
  "success": true,
  "mode": "live",
  "eventsFetched": 5,
  "eventsNormalized": 5,
  "eventsPublished": 5,
  "errors": []
}
```

### Monitor CloudWatch Logs

```bash
# Watch ingestion logs
aws logs tail /aws/lambda/PulseParty-Ingestion --follow

# Filter for errors
aws logs tail /aws/lambda/PulseParty-Ingestion --follow --filter-pattern "ERROR"
```

## API Quota Management

### Free Tier Limits

- **100 requests/day**
- **1 request per second**

### Optimization Strategies

1. **Scheduled Polling**: Only poll during match hours (e.g., 12:00-22:00 UTC)
2. **Adaptive Polling**: Poll every 30s during live matches, every 5 minutes otherwise
3. **Event Deduplication**: Track processed events to avoid re-processing
4. **Batch Requests**: Fetch all live fixtures in one request

### Request Budget

With 100 requests/day:

- **Every 30 seconds**: 2 requests/minute = 120 requests/hour = **50 minutes of polling**
- **Every 60 seconds**: 1 request/minute = 60 requests/hour = **100 minutes of polling**

**Recommendation**: Poll every 30 seconds only during active match hours (e.g., 18:00-22:00 UTC = 4 hours = 480 requests). Use simulator mode outside these hours.

### Conditional Polling

Update the EventBridge rule to only trigger during match hours:

```typescript
const ingestionRule = new events.Rule(this, 'IngestionScheduleRule', {
  ruleName: 'PulseParty-IngestionSchedule',
  description: 'Trigger ingestion every 30 seconds during match hours (18:00-22:00 UTC)',
  schedule: events.Schedule.expression('cron(0/30 18-22 * * ? *)'), // Every 30s, 18:00-22:00 UTC
  enabled: true,
});
```

## Troubleshooting

### No Events Fetched

**Symptom**: `eventsFetched: 0` in response

**Possible Causes**:
1. No live matches currently happening
2. API key not configured
3. API quota exceeded
4. API-Football service issue

**Solution**:
- Check if there are live matches: https://www.api-football.com/
- Verify API key is set correctly
- Check API quota in your dashboard
- Enable simulator mode as fallback

### API Key Error

**Symptom**: `API_FOOTBALL_KEY environment variable is required`

**Solution**:
```bash
aws lambda update-function-configuration \
  --function-name PulseParty-Ingestion \
  --environment "Variables={API_FOOTBALL_KEY=your-key,...}"
```

### Normalization Errors

**Symptom**: `eventsNormalized < eventsFetched`

**Possible Causes**:
- Invalid timestamp format
- Missing required fields
- Unsupported event type

**Solution**:
- Check CloudWatch logs for specific validation errors
- Update transformation logic if needed

### Publish Errors

**Symptom**: `eventsPublished < eventsNormalized`

**Possible Causes**:
- EventBridge permissions issue
- EventBridge service issue
- Network timeout

**Solution**:
- Check Lambda IAM role has `events:PutEvents` permission
- Check CloudWatch logs for specific errors
- Events will be retried with exponential backoff

## Cost Estimate

### API-Football

- **Free Tier**: $0/month (100 requests/day)
- **Basic Plan**: $10/month (3,000 requests/day) - if you need more

### AWS Resources

With live data integration:

- **Lambda Invocations**: 2,880/day (every 30s for 24h) = ~86,400/month
  - First 1M free, then $0.20 per 1M
  - **Cost**: $0 (within free tier)

- **Lambda Duration**: ~1s per invocation = 86,400s/month
  - First 400,000 GB-seconds free (512MB = 0.5GB)
  - 86,400s × 0.5GB = 43,200 GB-seconds
  - **Cost**: $0 (within free tier)

- **EventBridge Events**: ~5 events per invocation = 432,000/month
  - $1.00 per million events
  - **Cost**: $0.43/month

- **DynamoDB Writes**: ~5 writes per invocation = 432,000/month
  - $1.25 per million writes
  - **Cost**: $0.54/month

**Total Additional Cost**: ~$1/month (with free tier Lambda)

**Still well within $50 sandbox budget!**

## Next Steps

1. **Sign up for API-Football** and get your API key
2. **Update infrastructure** with API key and real handler
3. **Deploy to AWS** with `npx cdk deploy`
4. **Test the integration** with simulator mode first
5. **Enable live mode** when ready
6. **Monitor CloudWatch logs** to verify events are flowing
7. **Test in frontend** - create a room and watch for live events

## Alternative APIs

If API-Football doesn't meet your needs, consider:

1. **Football-Data.org** (https://www.football-data.org/)
   - Free tier: 10 requests/minute
   - Limited to major leagues
   - Similar REST API

2. **TheSportsDB** (https://www.thesportsdb.com/)
   - Free tier: 2 requests/second
   - Broader sports coverage
   - Less detailed live data

3. **LiveScore API** (https://www.livescore.com/)
   - Commercial only
   - Very comprehensive
   - Higher cost

The integration code can be adapted for any of these APIs by updating the transformation logic in `backend/src/ingestion/apiFootball.ts`.
