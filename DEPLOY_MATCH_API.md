# Deploy Match API - Step by Step Guide

## What We Just Added

✅ **HTTP API Gateway** - REST API for frontend to call
✅ **Match API Lambda** - Returns cached matches
✅ **Match Cache Refresh Lambda** - Fetches from API-Football every 15 minutes
✅ **EventBridge Schedule** - Triggers cache refresh automatically

## Deployment Steps

### Step 1: Set AWS Credentials

```bash
# Get fresh credentials from AWS Sandbox
# Then export them:
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_SESSION_TOKEN="your-session-token"
```

### Step 2: Set API Football Key

```bash
export API_FOOTBALL_KEY="c8873d365acb58b7fb29f0d9ee3d6aca"
```

### Step 3: Deploy

```bash
cd infrastructure
npx cdk deploy --require-approval never
```

### Step 4: Get the API URL

After deployment, look for this output:
```
PulsePartyStack.MatchApiUrl = https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/matches
```

Copy this URL - you'll need it for the frontend!

## Testing the Match API

### Test 1: Manually Trigger Cache Refresh

```bash
aws lambda invoke \
  --function-name PulseParty-MatchCacheRefresh \
  --payload '{}' \
  response.json && cat response.json
```

Expected output:
```json
{
  "success": true,
  "cached": 5,
  "errors": []
}
```

### Test 2: Call the Match API

```bash
# Replace with your actual API URL from deployment output
curl https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/matches
```

Expected output:
```json
{
  "Country": [
    {
      "matchId": "match-12345",
      "homeTeam": "Germany",
      "awayTeam": "France",
      "league": "International Friendly",
      "startTime": "2026-04-04T18:00:00Z",
      "status": "live"
    }
  ],
  "Club": [...],
  "Private": []
}
```

### Test 3: Check CloudWatch Logs

```bash
# Match API logs
aws logs tail /aws/lambda/PulseParty-MatchApi --follow

# Cache refresh logs
aws logs tail /aws/lambda/PulseParty-MatchCacheRefresh --follow
```

## What Happens After Deployment

1. **Cache Refresh Lambda** runs every 15 minutes automatically
2. **Fetches live matches** from API-Football
3. **Stores in DynamoDB** with 24-hour TTL
4. **Frontend calls Match API** to get cached matches
5. **No API quota wasted** on user requests!

## API Quota Usage

- **Before**: Every user request = 1 API call ❌
- **After**: Every 15 minutes = 1 API call ✅
- **Daily**: 96 API calls (within 100 free tier limit)

## Troubleshooting

### No matches returned

**Problem**: API returns empty arrays

**Solution**:
1. Check if there are live matches on API-Football
2. Manually trigger cache refresh:
   ```bash
   aws lambda invoke --function-name PulseParty-MatchCacheRefresh --payload '{}' response.json
   ```
3. Check CloudWatch logs for errors

### API returns error

**Problem**: 500 Internal Server Error

**Solution**:
1. Check Lambda logs:
   ```bash
   aws logs tail /aws/lambda/PulseParty-MatchApi --follow
   ```
2. Verify API key is set correctly
3. Check DynamoDB table exists

### Cache not refreshing

**Problem**: Old matches showing

**Solution**:
1. Check EventBridge rule is enabled:
   ```bash
   aws events describe-rule --name PulseParty-MatchCacheRefresh
   ```
2. Check Lambda has correct permissions
3. Manually trigger to test

## Next Step: Update Frontend

After deployment succeeds, update the frontend to use the Match API instead of hardcoded matches.

See the next section for frontend integration!
