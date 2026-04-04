# Match API Implementation

## Overview

The Match API provides a REST endpoint for the frontend to fetch available matches. It uses a caching strategy to minimize API-Football quota usage.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Match Data Flow                          │
└─────────────────────────────────────────────────────────────┘

API-Football
     │
     │ (Every 15 minutes)
     ▼
Cache Refresh Lambda ──────► DynamoDB (Match Cache)
                                    │
                                    │ (On demand)
                                    ▼
Frontend ──────► Match API Lambda ──┘
```

## Components Created

### 1. Match Cache Service (`backend/src/matches/matchCache.ts`)

**Functions:**
- `refreshMatchCache()` - Fetches matches from API-Football and stores in DynamoDB
- `getCachedMatches()` - Retrieves cached matches from DynamoDB
- `categorizeMatches()` - Groups matches by theme (Country/Club/Private)

**Data Model:**
```typescript
{
  PK: 'MATCH_CACHE',
  SK: 'match-{fixtureId}',
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  league: string,
  startTime: string,
  status: 'scheduled' | 'live' | 'finished',
  homeScore?: number,
  awayScore?: number,
  cachedAt: string,
  ttl: number  // 24 hours
}
```

### 2. Match API Handler (`backend/src/matches/handler.ts`)

**Endpoints:**

**GET /matches**
- Returns available matches grouped by theme
- Response format:
```json
{
  "Country": [
    {
      "matchId": "match-12345",
      "homeTeam": "Germany",
      "awayTeam": "France",
      "league": "International Friendly",
      "startTime": "2026-04-04T18:00:00Z",
      "status": "live",
      "homeScore": 1,
      "awayScore": 0
    }
  ],
  "Club": [...],
  "Private": []
}
```

**POST /matches/refresh** (Optional)
- Manually triggers cache refresh
- Useful for testing or admin purposes

### 3. Cache Refresh Handler (`backend/src/matches/cacheRefreshHandler.ts`)

- Scheduled Lambda that runs every 15 minutes
- Fetches live fixtures from API-Football
- Updates DynamoDB cache
- Returns success status and error count

## API Quota Usage

### Without Caching (Old Approach)
- **Per user request**: 1 API call
- **100 users/day**: 100 API calls ❌ Quota exhausted

### With Caching (New Approach)
- **Every 15 minutes**: 1 API call
- **Per day**: 96 API calls ✅ Within quota
- **Unlimited users**: 0 additional API calls ✅

## Deployment Steps

### 1. Add to Infrastructure

You need to add these to `infrastructure/lib/pulseparty-stack.ts`:

1. **HTTP API Gateway** for REST endpoints
2. **Match API Lambda** function
3. **Cache Refresh Lambda** function  
4. **EventBridge Schedule** to trigger cache refresh every 15 minutes

### 2. Build Backend

```bash
cd backend
npm run build
```

### 3. Deploy

```bash
cd infrastructure
npx cdk deploy
```

### 4. Update Frontend

The frontend needs to call the Match API instead of using hardcoded matches.

## Frontend Integration

### Before (Hardcoded):
```typescript
const matchesByTheme = {
  Country: [
    { id: 'match-1', name: 'Germany vs France', league: 'Friendly' }
  ],
  // ...
};
```

### After (API):
```typescript
const [matches, setMatches] = useState({ Country: [], Club: [], Private: [] });

useEffect(() => {
  fetch('https://your-api-url/matches')
    .then(res => res.json())
    .then(data => setMatches(data));
}, []);
```

## Testing

### Test Cache Refresh
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

### Test Match API
```bash
curl https://your-api-url/matches
```

Expected output:
```json
{
  "Country": [...],
  "Club": [...],
  "Private": []
}
```

## Match Categorization Logic

**Country Matches** (International):
- World Cup
- UEFA Nations League
- International Friendly
- Euro Championship
- Copa America
- African Cup of Nations

**Club Matches** (League/Club):
- Premier League
- La Liga
- Bundesliga
- Serie A
- Ligue 1
- Champions League
- etc.

**Private Matches**:
- Currently empty (for future custom matches)

## Cost Impact

**API-Football**:
- 96 requests/day (every 15 minutes)
- Still within 100 requests/day free tier ✅

**AWS**:
- Lambda invocations: 96/day (cache refresh) + user requests
- DynamoDB: ~100 writes/day, unlimited reads
- API Gateway: User requests
- **Additional cost**: ~$0.50/month

## Next Steps

1. ✅ Match cache service created
2. ✅ Match API handler created
3. ✅ Cache refresh handler created
4. ⏳ Add to infrastructure (CDK)
5. ⏳ Deploy to AWS
6. ⏳ Update frontend to use API
7. ⏳ Test end-to-end

## Troubleshooting

### No matches returned
- Check if cache refresh Lambda is running
- Check CloudWatch logs for errors
- Manually trigger refresh: `POST /matches/refresh`

### Old matches showing
- TTL is 24 hours
- Matches auto-expire after 24 hours
- Cache refreshes every 15 minutes with latest data

### API quota exceeded
- Reduce refresh frequency (e.g., every 30 minutes)
- Only refresh during match hours
- Upgrade to paid API plan

## Future Enhancements

1. **Upcoming Matches**: Fetch matches for next 7 days
2. **Match Details**: Add more fixture information
3. **Search/Filter**: Allow filtering by league, team, date
4. **Favorites**: Let users save favorite teams/leagues
5. **Notifications**: Alert when favorite team's match starts
