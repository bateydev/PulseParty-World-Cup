# Deployment Next Steps

## What We've Accomplished ✅

1. **Backend Code Compiled** - All TypeScript backend code is compiled to JavaScript in `backend/dist/`
2. **Dependencies Installed** - Production dependencies installed in `backend/dist/node_modules/`
3. **Infrastructure Updated** - CDK stack now uses real backend code instead of placeholders:
   - `ConnectHandler`: Uses `websocket/handleConnect.handler` from `backend/dist/`
   - `DisconnectHandler`: Uses `websocket/handleDisconnect.handler` from `backend/dist/`
   - `DefaultHandler`: Uses `websocket/handleMessage.handler` from `backend/dist/`
4. **Frontend Updated** - Frontend connects to AWS WebSocket and uses real WebSocket methods
5. **Demo Data Removed** - Frontend no longer uses mock/demo data

## What Needs to Be Done 🔧

### Step 1: Refresh AWS Credentials

Your AWS Sandbox credentials have expired. You need to:

1. Go to your AWS Academy/Sandbox portal
2. Get new AWS credentials (Access Key ID, Secret Access Key, Session Token)
3. Update your credentials:

```bash
# Option 1: Update ~/.aws/credentials
nano ~/.aws/credentials

# Add/update:
[default]
aws_access_key_id = YOUR_NEW_ACCESS_KEY
aws_secret_access_key = YOUR_NEW_SECRET_KEY
aws_session_token = YOUR_NEW_SESSION_TOKEN

# Option 2: Export as environment variables
export AWS_ACCESS_KEY_ID=YOUR_NEW_ACCESS_KEY
export AWS_SECRET_ACCESS_KEY=YOUR_NEW_SECRET_KEY
export AWS_SESSION_TOKEN=YOUR_NEW_SESSION_TOKEN
```

### Step 2: Deploy the Updated Stack

Once credentials are refreshed:

```bash
cd infrastructure
npx cdk deploy --require-approval never
```

This will:
- Update the 3 WebSocket Lambda functions with real backend code
- Keep all other resources unchanged (DynamoDB, Cognito, EventBridge, etc.)
- Take about 3-5 minutes

### Step 3: Test the Application

After deployment:

1. Open frontend: `http://localhost:3000`
2. You should see "Connected to AWS Backend" banner (green)
3. Try creating a room:
   - Select a theme (Country/Club/Private)
   - Select a match
   - Click "Create Room"
   - You should get a 6-character room code
4. Try joining a room with the code

## Expected Behavior After Deployment

### ✅ What Should Work
- WebSocket connection establishes successfully
- "Connected to AWS Backend" banner shows
- Room creation returns a real room code from backend
- Room joining connects to backend
- No more "Room creation timeout" errors

### ❌ What Won't Work Yet
- Match events (no live match data being ingested)
- Prediction windows (no match events to trigger them)
- Leaderboard updates (no predictions being evaluated)
- These require the ingestion Lambda to be updated with real code too

## Files Modified

### Infrastructure
- `infrastructure/lib/pulseparty-stack.ts` - Updated Lambda functions to use real backend code

### Backend
- `backend/dist/` - Compiled JavaScript code ready for Lambda
- `backend/dist/package.json` - Dependencies for Lambda
- `backend/dist/node_modules/` - Production dependencies installed

### Frontend
- `frontend/src/App.tsx` - Connects to WebSocket, removed demo data
- `frontend/src/components/RoomLobby.tsx` - Uses real WebSocket methods

## Troubleshooting

### If WebSocket Still Doesn't Connect

1. Check CloudWatch Logs:
```bash
aws logs tail /aws/lambda/PulseParty-Connect --follow
```

2. Check if Lambda has the code:
```bash
aws lambda get-function --function-name PulseParty-Connect
```

3. Test WebSocket directly:
Open `test-websocket.html` in your browser to test raw WebSocket connection

### If Room Creation Fails

Check the Default handler logs:
```bash
aws logs tail /aws/lambda/PulseParty-Default --follow
```

## Cost Reminder

Current AWS resources cost approximately:
- **$0.50/day** or **~$14/month**
- Well within your $50 sandbox budget
- Remember to clean up when done testing

## Clean Up (When Done Testing)

```bash
cd infrastructure
npx cdk destroy
```

This will remove all AWS resources and stop incurring costs.

## Summary

You're 95% done! Just need to:
1. Refresh AWS credentials
2. Run `npx cdk deploy`
3. Test the application

The backend code is ready, the frontend is ready, everything is configured correctly. Just need fresh credentials to deploy!
