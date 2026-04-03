# Live Match Data Integration - Summary

## What I Built

I've created a complete live match data integration system for PulseParty that can fetch real-time match events from API-Football or use simulated data for testing.

## Key Components

### 1. API-Football Integration (`backend/src/ingestion/apiFootball.ts`)
- Fetches live fixtures and match events from API-Football API
- Transforms API data to your internal MatchEvent format
- Supports goals, yellow/red cards, and substitutions
- Includes event deduplication to prevent duplicates

### 2. Ingestion Lambda Handler (`backend/src/ingestion/handler.ts`)
- Orchestrates the complete ingestion pipeline
- Fetches data from API-Football OR uses simulator as fallback
- Normalizes events using your existing normalizer
- Publishes to EventBridge using your existing publisher
- Returns detailed metrics (events fetched, normalized, published)

### 3. Scheduled Polling
- EventBridge rule triggers Lambda every 30 seconds
- Automatically polls for new match events
- Configurable schedule (can adjust to save API quota)

### 4. Dual Mode Operation
- **Live Mode**: Fetches real match data from API-Football
- **Simulator Mode**: Uses 24 pre-recorded events for demos
- Automatic fallback if API fails

## How to Deploy

### Option 1: Quick Deploy with Script (Recommended)

```bash
./deploy-with-live-data.sh
```

The script will:
1. Ask if you want simulator or live mode
2. Build the backend
3. Deploy to AWS
4. Show you next steps

### Option 2: Manual Deploy

**Simulator Mode (Testing)**:
```bash
cd backend && npm install && npm run build && cd ..
cd infrastructure
export SIMULATOR_MODE=true
npx cdk deploy --require-approval never
```

**Live Mode (with API key)**:
```bash
cd backend && npm install && npm run build && cd ..
cd infrastructure
export API_FOOTBALL_KEY="your-key-here"
export SIMULATOR_MODE=false
npx cdk deploy --require-approval never
```

## API-Football Setup (for Live Mode)

1. Go to https://www.api-football.com/
2. Sign up for free account (100 requests/day)
3. Get your API key from dashboard
4. Use it in deployment

## Testing

### Test Ingestion Lambda

```bash
# Invoke manually
aws lambda invoke \
  --function-name PulseParty-Ingestion \
  --payload '{}' \
  response.json && cat response.json
```

**Expected Response (Simulator Mode)**:
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

**Expected Response (Live Mode with matches)**:
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

### Watch Logs

```bash
aws logs tail /aws/lambda/PulseParty-Ingestion --follow
```

## Data Flow

```
┌─────────────────┐
│  API-Football   │  (or Simulator)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Ingestion Lambda│  ← Triggered every 30s
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Normalize     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  EventBridge    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Room State      │  (TODO: needs real implementation)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   WebSocket     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Frontend     │
└─────────────────┘
```

## What Works Now

✅ Fetching live match data from API-Football
✅ Transforming to internal MatchEvent format
✅ Normalizing events
✅ Publishing to EventBridge
✅ Scheduled polling every 30 seconds
✅ Simulator mode fallback
✅ Event deduplication

## What Still Needs Work

❌ **Room State Lambda** - Currently placeholder, needs to:
   - Receive events from EventBridge
   - Find rooms watching that match
   - Broadcast events to room participants via WebSocket

❌ **Moment Engine Lambda** - Currently placeholder, needs to:
   - Generate prediction windows from events
   - Store windows in DynamoDB
   - Broadcast to rooms

❌ **Scoring Lambda** - Currently placeholder, needs to:
   - Calculate points from predictions
   - Update leaderboards
   - Broadcast score updates

## Cost

**API-Football**: Free (100 requests/day)

**AWS Additional Cost**: ~$1/month
- Lambda: $0 (within free tier)
- EventBridge: $0.43/month
- DynamoDB: $0.54/month

**Total**: Still well within $50 budget!

## Switching Modes

### Enable Simulator Mode
```bash
aws lambda update-function-configuration \
  --function-name PulseParty-Ingestion \
  --environment "Variables={TABLE_NAME=PulsePartyTable-v2,EVENT_BUS_NAME=PulsePartyEventBus,API_FOOTBALL_KEY=,SIMULATOR_MODE=true}"
```

### Enable Live Mode
```bash
aws lambda update-function-configuration \
  --function-name PulseParty-Ingestion \
  --environment "Variables={TABLE_NAME=PulsePartyTable-v2,EVENT_BUS_NAME=PulsePartyEventBus,API_FOOTBALL_KEY=your-key,SIMULATOR_MODE=false}"
```

## Adjusting Polling Frequency

Edit `infrastructure/lib/pulseparty-stack.ts`:

**Every 60 seconds** (saves API quota):
```typescript
schedule: events.Schedule.rate(cdk.Duration.seconds(60)),
```

**Only during match hours** (18:00-22:00 UTC):
```typescript
schedule: events.Schedule.expression('cron(0/30 18-22 * * ? *)'),
```

**Disable automatic polling**:
```typescript
enabled: false,
```

Then redeploy: `cd infrastructure && npx cdk deploy`

## Documentation

- **Quick Start**: `QUICK_START_LIVE_DATA.md` (10-minute guide)
- **Full Guide**: `LIVE_MATCH_DATA_INTEGRATION.md` (comprehensive)
- **Deployment Script**: `./deploy-with-live-data.sh` (automated)

## Recommended Next Steps

1. **Deploy with Simulator Mode** to test the integration
2. **Verify events are flowing** through CloudWatch logs
3. **Update Room State Lambda** to distribute events to rooms
4. **Test in frontend** - create a room and watch for events
5. **Sign up for API-Football** when ready for live data
6. **Switch to Live Mode** and test with real matches

## Questions?

- How does event deduplication work? → Tracks processed event IDs in memory
- What if API-Football is down? → Automatic fallback to simulator mode
- How do I save API quota? → Adjust polling schedule or disable automatic polling
- Can I use a different API? → Yes, adapt the transformation logic in `apiFootball.ts`

---

**You're all set!** The live match data integration is ready to deploy. Start with simulator mode to test, then switch to live mode when you're ready.
