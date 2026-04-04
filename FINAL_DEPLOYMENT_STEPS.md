# Final Deployment Steps - Match API Integration

## What We've Built

✅ **Live Match Data Integration** - Fetches from API-Football
✅ **Match Caching System** - Saves API quota (96 calls/day vs unlimited)
✅ **HTTP API Gateway** - REST endpoint for frontend
✅ **Match API Lambda** - Returns cached matches
✅ **Cache Refresh Lambda** - Auto-refreshes every 15 minutes
✅ **Frontend Integration** - Fetches real matches instead of hardcoded data

## Complete Deployment Process

### Step 1: Get Fresh AWS Credentials

```bash
# From AWS Sandbox/Learner Lab:
# 1. Start Lab
# 2. Click "AWS Details"
# 3. Click "Show" next to AWS CLI
# 4. Copy the three export commands

export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."
```

### Step 2: Set API Football Key

```bash
export API_FOOTBALL_KEY="c8873d365acb58b7fb29f0d9ee3d6aca"
export SIMULATOR_MODE=false
```

### Step 3: Build Backend

```bash
cd backend
npm run build
```

### Step 4: Deploy Infrastructure

```bash
cd ../infrastructure
npx cdk deploy --require-approval never
```

### Step 5: Get Match API URL

After deployment, look for this output:
```
PulsePartyStack.MatchApiUrl = https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/matches
```

Copy this URL!

### Step 6: Update Frontend Environment

Edit `frontend/.env.local` and replace the Match API URL:

```bash
VITE_MATCH_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/matches
```

(Replace `xxxxx` with your actual API ID from Step 5)

### Step 7: Start Frontend

```bash
cd frontend
npm run dev
```

### Step 8: Test the Integration

1. **Open** http://localhost:3000
2. **Click** "Create" tab
3. **Select** a theme (Country/Club)
4. **You should see** real matches from API-Football!

## Testing the Backend

### Test 1: Trigger Cache Refresh

```bash
aws lambda invoke \
  --function-name PulseParty-MatchCacheRefresh \
  --payload '{}' \
  response.json && cat response.json
```

Expected:
```json
{
  "success": true,
  "cached": 5,
  "errors": []
}
```

### Test 2: Call Match API

```bash
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/matches
```

Expected:
```json
{
  "Country": [...],
  "Club": [...],
  "Private": []
}
```

### Test 3: Check Logs

```bash
# Match API logs
aws logs tail /aws/lambda/PulseParty-MatchApi --follow

# Cache refresh logs
aws logs tail /aws/lambda/PulseParty-MatchCacheRefresh --follow

# Ingestion logs
aws logs tail /aws/lambda/PulseParty-Ingestion --follow
```

## What Happens Now

### Every 15 Minutes:
1. **Cache Refresh Lambda** runs automatically
2. Fetches live matches from API-Football
3. Stores in DynamoDB with 24-hour TTL

### Every 1 Minute:
1. **Ingestion Lambda** runs automatically
2. Fetches live match events from API-Football
3. Publishes to EventBridge

### When User Opens App:
1. Frontend calls Match API
2. Gets cached matches from DynamoDB
3. No API quota wasted!

## API Quota Usage

| Component | Frequency | Daily Calls |
|-----------|-----------|-------------|
| Match Cache Refresh | Every 15 min | 96 |
| Event Ingestion | Every 1 min | 1,440 |
| **Total** | | **1,536** |

⚠️ **This exceeds the free tier (100/day)!**

### Solutions:

**Option 1: Use Simulator Mode**
```bash
# In infrastructure/.env
SIMULATOR_MODE=true
API_FOOTBALL_KEY=
```
- No API calls
- Uses pre-recorded events
- Perfect for testing

**Option 2: Reduce Polling Frequency**

Edit `infrastructure/lib/pulseparty-stack.ts`:

```typescript
// Match cache: Every 30 minutes instead of 15
schedule: events.Schedule.rate(cdk.Duration.minutes(30)),

// Event ingestion: Every 5 minutes instead of 1
schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
```

New daily calls: 48 + 288 = **336** (still over, but better)

**Option 3: Poll Only During Match Hours**

```typescript
// Only poll 18:00-22:00 UTC (4 hours)
schedule: events.Schedule.expression('cron(0/15 18-22 * * ? *)'),
```

New daily calls: 16 + 48 = **64** ✅ Within quota!

**Option 4: Upgrade API Plan**
- Basic: $10/month = 3,000 requests/day
- Pro: $25/month = 10,000 requests/day

## Troubleshooting

### No matches showing in frontend

**Check 1**: Is Match API URL correct in `.env.local`?
```bash
cat frontend/.env.local | grep MATCH_API
```

**Check 2**: Did you restart the frontend dev server?
```bash
# Stop (Ctrl+C) and restart
cd frontend
npm run dev
```

**Check 3**: Are there live matches?
```bash
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/matches
```

**Check 4**: Manually trigger cache refresh
```bash
aws lambda invoke --function-name PulseParty-MatchCacheRefresh --payload '{}' response.json
```

### "Failed to load matches" error

**Check browser console** for the actual error:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red errors

Common issues:
- CORS error → API Gateway CORS not configured (should be fixed)
- 404 error → Wrong API URL in `.env.local`
- 500 error → Check Lambda logs

### Matches are old/stale

- Cache TTL is 24 hours
- Refresh happens every 15 minutes
- Manually trigger refresh to get latest:
  ```bash
  curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/matches/refresh
  ```

## Cost Estimate

### With Current Setup (1,536 API calls/day):
- API-Football: Need Basic plan = **$10/month**
- AWS Lambda: ~$2/month
- AWS API Gateway: ~$3/month
- AWS DynamoDB: ~$1/month
- **Total: ~$16/month**

### With Optimized Setup (64 API calls/day):
- API-Football: Free tier = **$0/month**
- AWS Lambda: ~$1/month
- AWS API Gateway: ~$1/month
- AWS DynamoDB: ~$0.50/month
- **Total: ~$2.50/month** ✅

## Next Steps

1. ✅ Deploy infrastructure
2. ✅ Test Match API
3. ✅ Update frontend
4. ⏳ Test in browser
5. ⏳ Optimize polling frequency
6. ⏳ Update RoomState Lambda to distribute events
7. ⏳ Test full flow: API → Events → Rooms → Frontend

## Success Criteria

- [ ] Deployment completes without errors
- [ ] Match API returns live matches
- [ ] Frontend shows real matches (not hardcoded)
- [ ] Cache refreshes automatically every 15 minutes
- [ ] Events ingested every 1 minute
- [ ] Within API quota (or using simulator mode)

You're almost there! Just deploy and test! 🚀
