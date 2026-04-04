# Fix: Matches Not Fetching

## The Problem

Your frontend is showing "Failed to load matches" because `frontend/.env.local` has a placeholder URL:

```
VITE_MATCH_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/matches
                           ^^^^^^^^^^^
                           This needs to be the real HTTP API Gateway ID
```

## The Solution (3 Options)

### Option 1: Automatic Fix (Recommended) ⚡

Run this script to automatically fetch and update the URL:

```bash
bash quick-fix-match-api.sh
```

This will:
1. Fetch the real Match API URL from your deployed CloudFormation stack
2. Update `frontend/.env.local` automatically
3. Test the API to verify it's working
4. Show you what data is available

**Then restart your frontend:**
```bash
cd frontend
npm run dev
```

---

### Option 2: Manual Fix via AWS Console 🖱️

If the script doesn't work (no AWS CLI or credentials):

1. **Go to AWS Console → API Gateway**
2. **Find "PulsePartyHttpApi"** (NOT the WebSocket API)
3. **Copy the API ID** (looks like: `abc123xyz`)
4. **Update `frontend/.env.local`:**
   ```
   VITE_MATCH_API_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/matches
   ```
5. **Restart frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

---

### Option 3: Manual Fix via CloudFormation Outputs 📋

1. **Go to AWS Console → CloudFormation**
2. **Select "PulsePartyStack"**
3. **Go to "Outputs" tab**
4. **Find "MatchApiUrl"** and copy the full URL
5. **Update `frontend/.env.local`:**
   ```
   VITE_MATCH_API_URL=<paste the URL here>
   ```
6. **Restart frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

---

## What Will Happen After the Fix?

### Scenario A: You Have Cached Data ✅
If the Match Cache Refresh Lambda ran before the API quota was exhausted, you'll see real matches from API-Football.

**Check if you have cached data:**
```bash
bash check-cached-data.sh
```

### Scenario B: No Cached Data ⚠️
The Match API will return empty arrays, and the frontend will automatically fall back to demo matches:
- Demo Match 1 (Country theme)
- Demo Match 2 (Club theme)

This is expected and working as designed!

---

## Why Did This Happen?

1. **Infrastructure was deployed** with HTTP API Gateway
2. **CloudFormation created** a unique API ID (e.g., `xyz789abc`)
3. **Frontend `.env.local` was never updated** with this real ID
4. **Frontend kept using** the placeholder URL `https://your-api-id.execute-api...`

The WebSocket URL was updated correctly (`fpdd170hf8`), but the HTTP API URL was missed.

---

## About the API Quota Issue

**Separate issue**: Your API-Football quota was exhausted (1,536 calls vs 100/day limit).

**Already fixed**: Both EventBridge schedules are now disabled in the infrastructure:
- `IngestionScheduleRule`: `enabled: false` ✅
- `MatchCacheRefreshRule`: `enabled: false` ✅

This prevents further API calls. The schedules will stay disabled until you manually enable them.

---

## Testing After the Fix

### Test 1: Check Browser Console
Open DevTools (F12) and look for:
```
Fetching matches from: https://xyz789abc.execute-api.us-east-1.amazonaws.com/prod/matches
Matches loaded: { Country: [...], Club: [...], Private: [...] }
```

### Test 2: Check Network Tab
1. Open DevTools → Network tab
2. Refresh the page
3. Look for request to `/matches`
4. Should see HTTP 200 OK with JSON response

### Test 3: Try Creating a Room
1. Click "Create Room"
2. Select a theme (Country/Club/Private)
3. You should see matches listed (either real cached matches or demo matches)

---

## Quick Reference

| Script | Purpose |
|--------|---------|
| `quick-fix-match-api.sh` | Automatically fix the Match API URL issue |
| `get-api-urls.sh` | Get all API URLs and update `.env.local` |
| `check-cached-data.sh` | Check if you have cached matches in DynamoDB |

---

## Need More Help?

See `MATCH_API_TROUBLESHOOTING.md` for:
- Detailed debugging steps
- Common issues and fixes
- Manual cache refresh instructions
- Alternative solutions (simulator mode)

---

## Summary

**Run this now:**
```bash
bash quick-fix-match-api.sh
cd frontend && npm run dev
```

**Expected result:** Frontend will fetch from the correct URL and show matches (cached or demo).

**If it still doesn't work:** Check `MATCH_API_TROUBLESHOOTING.md` for detailed debugging steps.
