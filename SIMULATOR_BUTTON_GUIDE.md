# Simulator Button Guide

## What Was Added

I've added a "Dev Tools" button to the frontend that allows you to generate simulated match data with one click!

## How to Use

1. **Deploy the updated backend** (with simulator support):
   ```bash
   cd backend && npm run build && cd ../infrastructure
   npx cdk deploy --require-approval never
   ```

2. **Start your frontend** (if not already running):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Look for the purple "🎮 Dev Tools" button** in the bottom-right corner of the screen

4. **Click it** to open the Simulator Panel

5. **Click "🚀 Start Simulator"** to generate 5 simulated matches

6. **Wait 2 seconds** - the page will automatically refresh and show the new matches!

## What It Does

When you click "Start Simulator", it:
1. Calls the Match API refresh endpoint (`POST /matches/refresh`)
2. The backend checks if `SIMULATOR_MODE=true` is set
3. Generates 5 realistic simulated matches:
   - Manchester United vs Liverpool (Premier League, LIVE)
   - Real Madrid vs Barcelona (La Liga, Scheduled)
   - Brazil vs Argentina (International Friendly, Scheduled)
   - Bayern Munich vs Borussia Dortmund (Bundesliga, LIVE)
   - France vs Germany (UEFA Nations League, Scheduled)
4. Caches them in DynamoDB
5. Refreshes the page to show the new matches

## Simulated Matches

The simulator generates matches with:
- Realistic team names
- Different leagues (Premier League, La Liga, Bundesliga, International)
- Mix of live and scheduled matches
- Live matches have scores
- Scheduled matches show start times (1-3 hours from now)

## Benefits

- No API quota usage
- Instant match data
- Perfect for testing the full app flow
- Can be used anytime, no need to wait for real matches

## Technical Details

### Frontend Component
- `frontend/src/components/SimulatorPanel.tsx` - The UI component
- Floating button in bottom-right corner
- Expands to show panel with "Start Simulator" button
- Shows success/error messages
- Auto-refreshes page after success

### Backend Changes
- `backend/src/matches/matchCache.ts` - Updated `refreshMatchCache()` function
- Checks `process.env.SIMULATOR_MODE === 'true'`
- If true, generates simulated matches instead of calling API-Football
- Caches simulated matches in DynamoDB with same structure as real matches

### Infrastructure
- No changes needed to infrastructure
- Simulator mode is controlled by `SIMULATOR_MODE` environment variable
- Currently set to `false` by default (uses real API)

## Enabling Simulator Mode Permanently

If you want the backend to always use simulator mode (not just when clicking the button):

1. Update `infrastructure/lib/pulseparty-stack.ts`:
   ```typescript
   environment: {
     TABLE_NAME: this.table.tableName,
     API_FOOTBALL_KEY: process.env.API_FOOTBALL_KEY || '',
     SIMULATOR_MODE: 'true', // ← Change to 'true'
   }
   ```

2. Redeploy:
   ```bash
   cd infrastructure
   npx cdk deploy
   ```

Now all match cache refreshes will use simulated data.

## Disabling the Button

If you want to hide the Dev Tools button in production:

1. Add an environment variable check in `frontend/src/App.tsx`:
   ```typescript
   {/* Simulator Panel - Dev Tools (only in development) */}
   {import.meta.env.DEV && <SimulatorPanel matchApiUrl={config.matchApiUrl} />}
   ```

This will only show the button when running `npm run dev`, not in production builds.

## Troubleshooting

### Button doesn't appear
- Make sure you restarted the frontend after adding the component
- Check browser console for errors

### "Start Simulator" doesn't work
- Check that the backend is deployed with the updated `matchCache.ts`
- Check Lambda logs: `aws logs tail /aws/lambda/PulseParty-MatchApi --follow`
- Verify the Match API URL is correct in `frontend/.env.local`

### Matches don't appear after clicking
- Wait for the automatic page refresh (2 seconds)
- If it doesn't refresh, manually refresh the browser
- Check browser console for errors
- Check Network tab to see if the API call succeeded

### Still seeing "No matches available"
- The simulator might not be enabled in the backend
- Check Lambda environment variables in AWS Console
- Try manually setting `SIMULATOR_MODE=true` in infrastructure and redeploying

## Next Steps

Now that you have simulated matches:
1. Create a room with one of the simulated matches
2. Test the full app flow (predictions, leaderboard, etc.)
3. Invite friends to join your room
4. See how the app works with live match events

Enjoy testing! 🎉
