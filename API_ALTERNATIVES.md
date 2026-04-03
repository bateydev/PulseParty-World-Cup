# Football API Alternatives Comparison

## Overview

This document compares different free football APIs you can use with PulseParty. The integration code is designed for API-Football but can be adapted for any of these alternatives.

## Comparison Table

| API | Free Tier | Rate Limit | Live Events | Coverage | Ease of Use | Best For |
|-----|-----------|------------|-------------|----------|-------------|----------|
| **API-Football** | 100 req/day | 1 req/sec | ✅ Excellent | 500+ leagues | ⭐⭐⭐⭐⭐ | Production |
| **Football-Data.org** | 10 req/min | 10 req/min | ✅ Good | Major leagues | ⭐⭐⭐⭐ | Testing |
| **TheSportsDB** | Unlimited | 2 req/sec | ⚠️ Limited | All sports | ⭐⭐⭐ | Demos |
| **LiveScore API** | ❌ Paid only | N/A | ✅ Excellent | Comprehensive | ⭐⭐⭐⭐⭐ | Enterprise |

---

## 1. API-Football (Recommended) ⭐

**Website**: https://www.api-football.com/

### Pros
- ✅ Comprehensive live match data
- ✅ Real-time events (goals, cards, substitutions, corners, shots)
- ✅ Detailed player and team information
- ✅ 500+ leagues and competitions
- ✅ Excellent documentation
- ✅ Reliable uptime

### Cons
- ❌ Limited free tier (100 requests/day)
- ❌ Requires API key registration

### Free Tier
- **Requests**: 100/day
- **Rate Limit**: 1 request/second
- **Cost**: $0/month

### Paid Plans
- **Basic**: $10/month (3,000 requests/day)
- **Pro**: $25/month (10,000 requests/day)
- **Ultra**: $50/month (30,000 requests/day)

### Integration Status
✅ **Already integrated** - Ready to use!

### Example Response
```json
{
  "fixture": {
    "id": 12345,
    "date": "2026-04-04T18:00:00+00:00",
    "status": { "short": "LIVE", "elapsed": 23 }
  },
  "teams": {
    "home": { "id": 25, "name": "Germany" },
    "away": { "id": 2, "name": "France" }
  },
  "events": [
    {
      "time": { "elapsed": 23 },
      "team": { "id": 25, "name": "Germany" },
      "player": { "id": 456, "name": "Mueller" },
      "type": "Goal",
      "detail": "Normal Goal"
    }
  ]
}
```

---

## 2. Football-Data.org

**Website**: https://www.football-data.org/

### Pros
- ✅ Free tier with decent limits
- ✅ Good coverage of major leagues
- ✅ Clean REST API
- ✅ No credit card required

### Cons
- ❌ Limited to major European leagues
- ❌ Less detailed event data
- ❌ Slower update frequency

### Free Tier
- **Requests**: 10/minute
- **Rate Limit**: 10 requests/minute
- **Coverage**: 10 competitions (Premier League, La Liga, etc.)
- **Cost**: $0/month

### Paid Plans
- **Tier One**: €18/month (unlimited requests, all competitions)

### Integration Effort
⚠️ **Requires adaptation** - Similar structure to API-Football

### Example Response
```json
{
  "match": {
    "id": 12345,
    "utcDate": "2026-04-04T18:00:00Z",
    "status": "IN_PLAY",
    "minute": 23,
    "score": {
      "fullTime": { "home": 1, "away": 0 }
    }
  },
  "homeTeam": { "id": 5, "name": "Germany" },
  "awayTeam": { "id": 81, "name": "France" }
}
```

### Adaptation Notes
- Event structure is different (less detailed)
- Need to poll match endpoint for score updates
- Limited event-by-event data (goals, cards only)

---

## 3. TheSportsDB

**Website**: https://www.thesportsdb.com/

### Pros
- ✅ Completely free (with Patreon support)
- ✅ Unlimited requests
- ✅ Covers all sports (not just football)
- ✅ Good for demos and testing

### Cons
- ❌ Limited live event detail
- ❌ Slower updates (5-10 minute delay)
- ❌ Less reliable for production
- ❌ Event data is basic

### Free Tier
- **Requests**: Unlimited (with 2 req/sec limit)
- **Rate Limit**: 2 requests/second
- **Cost**: $0/month (Patreon support encouraged)

### Patreon Tier
- **$3/month**: Priority support, faster updates

### Integration Effort
⚠️ **Requires significant adaptation** - Different data model

### Example Response
```json
{
  "events": [
    {
      "idEvent": "12345",
      "strEvent": "Germany vs France",
      "dateEvent": "2026-04-04",
      "strTime": "18:00:00",
      "intHomeScore": "1",
      "intAwayScore": "0",
      "strProgress": "23'"
    }
  ]
}
```

### Adaptation Notes
- No detailed event-by-event data
- Need to poll for score changes
- Best for basic score updates only
- Not suitable for real-time prediction windows

---

## 4. LiveScore API

**Website**: https://www.livescore.com/

### Pros
- ✅ Most comprehensive data
- ✅ Real-time updates (< 1 second delay)
- ✅ Detailed event data
- ✅ Professional-grade reliability

### Cons
- ❌ No free tier
- ❌ Expensive ($500+/month)
- ❌ Requires business verification

### Pricing
- **Contact for quote** (typically $500-2000/month)

### Integration Effort
⚠️ **Requires adaptation** - Enterprise-grade API

### Best For
- Production applications with budget
- High-traffic applications
- Professional sports platforms

---

## Recommendation by Use Case

### For Testing/Development
**Use**: API-Football (Simulator Mode)
- No API key needed
- Predictable events
- Free
- Perfect for development

### For Demo/Prototype
**Use**: API-Football (Free Tier) or TheSportsDB
- API-Football: Better data, limited requests
- TheSportsDB: Unlimited requests, basic data

### For Production (Low Traffic)
**Use**: API-Football (Basic Plan - $10/month)
- 3,000 requests/day
- Reliable and comprehensive
- Good value for money

### For Production (High Traffic)
**Use**: API-Football (Pro/Ultra) or LiveScore API
- Depends on budget and requirements
- Consider caching and optimization

---

## How to Switch APIs

The integration code is in `backend/src/ingestion/apiFootball.ts`. To use a different API:

### Step 1: Create New API Service

```typescript
// backend/src/ingestion/footballData.ts
export async function fetchLiveFixtures(): Promise<Fixture[]> {
  const response = await fetch('https://api.football-data.org/v4/matches', {
    headers: {
      'X-Auth-Token': process.env.FOOTBALL_DATA_KEY,
    },
  });
  return response.json();
}

export function transformFootballDataEvent(event: any): MatchEvent {
  // Transform to internal format
  return {
    eventId: `evt-${event.id}`,
    matchId: `match-${event.match.id}`,
    eventType: mapEventType(event.type),
    timestamp: new Date().toISOString(),
    teamId: `team-${event.team.id}`,
    metadata: { /* ... */ },
  };
}
```

### Step 2: Update Handler

```typescript
// backend/src/ingestion/handler.ts
import { fetchLiveMatchEvents } from './footballData'; // Changed import

// Rest of the code stays the same!
```

### Step 3: Update Environment Variables

```typescript
// infrastructure/lib/pulseparty-stack.ts
environment: {
  FOOTBALL_DATA_KEY: process.env.FOOTBALL_DATA_KEY, // Changed variable
  // ...
}
```

### Step 4: Redeploy

```bash
cd backend && npm run build && cd ..
cd infrastructure
export FOOTBALL_DATA_KEY="your-key"
npx cdk deploy
```

---

## Cost Comparison (Monthly)

### Scenario: Polling every 30 seconds, 24/7

**Requests per day**: 2,880 (2 per minute × 60 minutes × 24 hours)

| API | Free Tier Sufficient? | Monthly Cost |
|-----|----------------------|--------------|
| API-Football | ❌ No (need 2,880/day, have 100/day) | $10 (Basic plan) |
| Football-Data.org | ✅ Yes (10/min = 14,400/day) | $0 |
| TheSportsDB | ✅ Yes (unlimited) | $0 (optional $3 Patreon) |
| LiveScore API | ❌ No free tier | $500+ |

### Scenario: Polling only during match hours (4 hours/day)

**Requests per day**: 480 (2 per minute × 60 minutes × 4 hours)

| API | Free Tier Sufficient? | Monthly Cost |
|-----|----------------------|--------------|
| API-Football | ❌ No (need 480/day, have 100/day) | $10 (Basic plan) |
| Football-Data.org | ✅ Yes | $0 |
| TheSportsDB | ✅ Yes | $0 |

### Scenario: Manual triggering only (no scheduled polling)

**Requests per day**: ~50 (user-triggered only)

| API | Free Tier Sufficient? | Monthly Cost |
|-----|----------------------|--------------|
| API-Football | ✅ Yes | $0 |
| Football-Data.org | ✅ Yes | $0 |
| TheSportsDB | ✅ Yes | $0 |

---

## Optimization Strategies

### 1. Conditional Polling
Only poll during match hours (e.g., 18:00-22:00 UTC):

```typescript
// infrastructure/lib/pulseparty-stack.ts
schedule: events.Schedule.expression('cron(0/30 18-22 * * ? *)'),
```

**Savings**: 83% reduction in requests (4 hours vs 24 hours)

### 2. Adaptive Polling
Poll frequently during live matches, slowly otherwise:

```typescript
// Check if any matches are live
const liveMatches = await fetchLiveFixtures();
const pollInterval = liveMatches.length > 0 ? 30 : 300; // 30s or 5min
```

**Savings**: 50-80% reduction depending on match schedule

### 3. Event Caching
Cache events for 10 seconds to handle multiple requests:

```typescript
const cache = new Map();
const CACHE_TTL = 10000; // 10 seconds

export async function fetchLiveMatchEvents() {
  const cached = cache.get('events');
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchFromAPI();
  cache.set('events', { data, timestamp: Date.now() });
  return data;
}
```

**Savings**: Depends on traffic, can be significant

### 4. Webhook Integration
Some APIs support webhooks (push instead of pull):

- No polling needed
- Instant updates
- Minimal API requests

**Note**: API-Football doesn't support webhooks in free tier

---

## Final Recommendation

**For PulseParty**:

1. **Start with**: API-Football Simulator Mode (free, no API key)
2. **Test with**: API-Football Free Tier (100 req/day)
3. **Optimize**: Use conditional polling (match hours only)
4. **Scale to**: API-Football Basic Plan ($10/month) if needed

**Alternative**: If budget is $0, use Football-Data.org with conditional polling

---

## Questions?

- **Which API is best for my use case?** → See "Recommendation by Use Case" above
- **How do I switch APIs?** → See "How to Switch APIs" section
- **Can I use multiple APIs?** → Yes, implement fallback logic
- **What about webhooks?** → Not available in free tiers, requires paid plans

---

**Need help integrating a different API?** The transformation logic in `apiFootball.ts` can be adapted for any REST API that provides match events.
