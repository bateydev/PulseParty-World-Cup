# Match API Troubleshooting Guide

## Current Issue: Matches Not Fetching

### Problem Summary
The frontend is showing "Failed to load matches" because:
1. `frontend/.env.local` has a placeholder URL: `https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/matches`
2. Frontend is trying to fetch from this invalid URL instead of the real AWS API Gateway URL
3. API-Football quota was exhausted (1,536 calls vs 100/day limit)

### Root Cause
The Match API URL needs to be retrieved from the deployed CloudFormation stack and updated in `frontend/.env.local`.

---

## Solution Steps

### Step 1: Get the Real Match API URL

Run this script to automatically fetch and update the API URLs:

```bash
bash get-api-urls.sh
```

This script will:
- Fetch all API URLs from your deployed CloudFormation stack
- Automatically update `frontend/.env.local` with the correct URLs
- Test the Match API to verify it's working

**If you don't have AWS CLI or the script fails**, manually construct the URL:

The HTTP API Gateway URL follows this pattern:
```
https://{api-id}.execute-api.{region}.amazonaws.com/prod/matches
```

You need to find the `{api-id}` from your AWS Console:
1. Go to AWS Console → API Gateway
2. Find "PulsePartyHttpApi"
3. Copy the API ID (looks like: `abc123xyz`)
4. Update `frontend/.env.local`:
   ```
   VITE_MATCH_API_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/matches
   ```

### Step 2: Restart Frontend Dev Server

After updating `.env.local`, restart your frontend:

```bash
cd frontend
npm run dev
```

The frontend will now fetch from the correct URL.

---

## What Data Will You See?

### Scenario A: Cached Data Exists ✅
If the Match Cache Refresh Lambda ran successfully before the quota was exhausted, you'll see real matches from API-Football that were cached in DynamoDB.

**Check if you have cached data:**
```bash
bash check-cached-data.sh
```

### Scenario B: No Cached Data ⚠️
If no data was cached, the Match API will return an empty response:
```json
{
  "Country": [],
  "Club": [],
  "Private": [],
  "message": "No matches available. Try again later."
}
```

The frontend will show demo matches as fallback.

### Scenario C: Demo Matches (Fallback)
If the API fails, the frontend automatically falls back to demo matches:
- Demo Match 1 (Country theme)
- Demo Match 2 (Club theme)

---

## API Quota Status

### Current Situation
- **API-Football Free Tier**: 100 requests/day
- **Quota Status**: EXHAUSTED (1,536 calls made)
- **Why**: Both Ingestion Lambda (every 1 min) and Match Cache Refresh (every 15 min) were polling

### Schedules Disabled ✅
Both EventBridge schedules are now disabled in the infrastructure:
- `IngestionScheduleRule`: `enabled: false`
- `MatchCacheRefreshRule`: `enabled: false`

This prevents further API calls and saves your quota.

### When Quota Resets
API-Football quota resets at midnight UTC. After reset:
1. You can manually trigger a cache refresh
2. Or temporarily enable the Match Cache Refresh schedule

---

## Manual Cache Refresh (After Quota Reset)

### Option 1: Invoke Lambda Directly
```bash
aws lambda invoke \
  --function-name PulseParty-MatchCacheRefresh \
  --payload '{}' \
  response.json && cat response.json
```

### Option 2: Call Match API Refresh Endpoint
```bash
curl -X POST https://{api-id}.execute-api.us-east-1.amazonaws.com/prod/matches/refresh
```

### Option 3: Temporarily Enable Schedule
Update `infrastructure/lib/pulseparty-stack.ts`:
```typescript
const matchCacheRefreshRule = new events.Rule(
  this,
  'MatchCacheRefreshRule',
  {
    ruleName: 'PulseParty-MatchCacheRefresh',
    description: 'Trigger match cache refresh every 15 minutes',
    schedule: events.Schedule.rate(cdk.Duration.minutes(15)),
    enabled: true, // ← Change to true
  }
);
```

Then redeploy:
```bash
cd infrastructure
npx cdk deploy
```

**Remember to disable it again after caching some matches!**

---

## Testing the Match API

### Test 1: Check if API is Reachable
```bash
curl https://{api-id}.execute-api.us-east-1.amazonaws.com/prod/matches
```

Expected responses:
- **Success with data**: JSON with Country/Club/Private arrays containing matches
- **Success without data**: JSON with empty arrays and message
- **Error**: 404 or 500 error (check Lambda logs)

### Test 2: Check Lambda Logs
```bash
aws logs tail /aws/lambda/PulseParty-MatchApi --follow
```

Look for:
- "No cached matches" → Cache is empty
- "Matches loaded" → Cache has data
- Errors → Something went wrong

### Test 3: Check DynamoDB Cache
```bash
bash check-cached-data.sh
```

This shows how many matches are cached in DynamoDB.

---

## Frontend Debugging

### Check Browser Console
Open browser DevTools (F12) and look for:

```javascript
// Should see:
Fetching matches from: https://{api-id}.execute-api.us-east-1.amazonaws.com/prod/matches

// If successful:
Matches loaded: { Country: [...], Club: [...], Private: [...] }

// If failed:
Error fetching matches: Failed to fetch matches: ...
```

### Check Network Tab
1. Open DevTools → Network tab
2. Refresh the page
3. Look for request to `/matches`
4. Check:
   - **Request URL**: Should be the real API Gateway URL, not localhost
   - **Status**: Should be 200 OK
   - **Response**: Should contain match data or empty arrays

---

## Common Issues & Fixes

### Issue 1: "Failed to fetch" Error
**Cause**: Frontend is using placeholder URL or wrong URL

**Fix**: Run `bash get-api-urls.sh` to update `.env.local`, then restart frontend

### Issue 2: CORS Error
**Cause**: API Gateway CORS not configured properly

**Fix**: Check `infrastructure/lib/pulseparty-stack.ts` - CORS is already configured:
```typescript
corsConfiguration: {
  allowOrigins: ['*'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 300,
}
```

If still seeing CORS errors, redeploy infrastructure.

### Issue 3: Empty Match Arrays
**Cause**: No cached data in DynamoDB

**Fix**: 
1. Wait for API quota to reset (midnight UTC)
2. Manually invoke Match Cache Refresh Lambda
3. Or use demo matches (already working as fallback)

### Issue 4: 403 Forbidden
**Cause**: Lambda doesn't have permission to access DynamoDB

**Fix**: Check IAM role permissions in infrastructure (already configured correctly)

---

## Next Steps

1. **Immediate**: Run `bash get-api-urls.sh` to fix the URL issue
2. **Short-term**: Wait for API quota reset, then manually cache some matches
3. **Long-term**: Consider using simulator mode or upgrading API-Football plan

---

## Alternative: Use Simulator Mode

If you want to test without waiting for API quota:

1. Update `infrastructure/lib/pulseparty-stack.ts`:
   ```typescript
   environment: {
     TABLE_NAME: this.table.tableName,
     API_FOOTBALL_KEY: process.env.API_FOOTBALL_KEY || '',
     SIMULATOR_MODE: 'true', // ← Enable simulator
   }
   ```

2. Redeploy:
   ```bash
   cd infrastructure
   npx cdk deploy
   ```

3. Manually invoke Ingestion Lambda to generate simulated matches:
   ```bash
   aws lambda invoke \
     --function-name PulseParty-Ingestion \
     --payload '{}' \
     response.json
   ```

The simulator will generate realistic match events without using API quota.

---

## Summary

**The main issue**: Frontend has wrong Match API URL in `.env.local`

**Quick fix**: 
```bash
bash get-api-urls.sh
cd frontend && npm run dev
```

**Expected result**: Frontend will fetch from correct URL and show either cached matches or demo matches as fallback.
