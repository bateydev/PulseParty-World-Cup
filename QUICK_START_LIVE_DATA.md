# Quick Start: Live Match Data Integration

This guide will get you up and running with live match data in under 10 minutes.

## Option 1: Start with Simulator Mode (Recommended for Testing)

This is the fastest way to see events flowing through your system.

### Step 1: Build Backend

```bash
cd backend
npm install
npm run build
```

### Step 2: Deploy with Simulator Mode

```bash
cd ../infrastructure
export SIMULATOR_MODE=true
npx cdk deploy --require-approval never
```

### Step 3: Test It

The Ingestion Lambda will automatically trigger every 30 seconds and generate simulated events.

**Watch the logs:**
```bash
aws logs tail /aws/lambda/PulseParty-Ingestion --follow
```

You should see:
```
Starting simulator mode...
Replaying event 1/24: goal at 2026-06-15T14:23:45.000Z
Successfully published event sim_event_006 to EventBridge
```

**Test manually:**
```bash
aws lambda invoke \
  --function-name PulseParty-Ingestion \
  --payload '{}' \
  response.json && cat response.json
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

### Step 4: See Events in Frontend

1. Open http://localhost:3000
2. Create a room
3. Watch for match events to appear in real-time!

Events will be tagged with "⚠ Demo Mode: Using simulated match data"

---

## Option 2: Use Live API-Football Data

### Step 1: Get API Key

1. Go to https://www.api-football.com/
2. Sign up for free account (100 requests/day)
3. Get your API key from the dashboard

### Step 2: Build Backend

```bash
cd backend
npm install
npm run build
```

### Step 3: Deploy with API Key

```bash
cd ../infrastructure
export API_FOOTBALL_KEY="your-api-key-here"
export SIMULATOR_MODE=false
npx cdk deploy --require-approval never
```

### Step 4: Test It

**Check if there are live matches:**
```bash
aws lambda invoke \
  --function-name PulseParty-Ingestion \
  --payload '{}' \
  response.json && cat response.json
```

If there are live matches:
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

If no live matches:
```json
{
  "success": true,
  "mode": "live",
  "eventsFetched": 0,
  "eventsNormalized": 0,
  "eventsPublished": 0,
  "errors": []
}
```

**Watch the logs:**
```bash
aws logs tail /aws/lambda/PulseParty-Ingestion --follow
```

### Step 5: See Live Events in Frontend

1. Open http://localhost:3000
2. Create a room
3. Select a match that's currently live
4. Watch for real match events to appear!

---

## Switching Between Modes

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

---

## Adjusting Polling Frequency

The default is every 30 seconds. To change it:

### Every 60 seconds (saves API quota)

Edit `infrastructure/lib/pulseparty-stack.ts`:

```typescript
schedule: events.Schedule.rate(cdk.Duration.seconds(60)),
```

### Only during match hours (18:00-22:00 UTC)

```typescript
schedule: events.Schedule.expression('cron(0/30 18-22 * * ? *)'),
```

### Disable automatic polling

```typescript
enabled: false,
```

Then redeploy:
```bash
cd infrastructure
npx cdk deploy
```

---

## Troubleshooting

### "No events fetched"

- **Simulator mode**: Check logs for errors
- **Live mode**: No matches are currently live. Check https://www.api-football.com/ for live fixtures

### "API key error"

```bash
# Verify API key is set
aws lambda get-function-configuration --function-name PulseParty-Ingestion | grep API_FOOTBALL_KEY
```

### "Events not appearing in frontend"

1. Check Ingestion Lambda logs: `aws logs tail /aws/lambda/PulseParty-Ingestion --follow`
2. Check RoomState Lambda logs: `aws logs tail /aws/lambda/PulseParty-RoomState --follow`
3. Verify WebSocket connection in browser console
4. Check that room matchId matches the events being published

---

## What's Next?

Once events are flowing:

1. **Update RoomState Lambda** to distribute events to rooms (currently placeholder)
2. **Update MomentEngine Lambda** to generate prediction windows (currently placeholder)
3. **Update Scoring Lambda** to calculate points (currently placeholder)
4. **Test the full flow** from API → EventBridge → Lambdas → WebSocket → Frontend

See `LIVE_MATCH_DATA_INTEGRATION.md` for detailed documentation.

---

## Cost Monitoring

Check your current costs:

```bash
# Lambda invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=PulseParty-Ingestion \
  --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum

# EventBridge events
aws cloudwatch get-metric-statistics \
  --namespace AWS/Events \
  --metric-name Invocations \
  --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum
```

Expected costs: ~$1/month (well within $50 budget)
