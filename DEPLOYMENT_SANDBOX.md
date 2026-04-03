# AWS Sandbox Deployment Guide

## Prerequisites

Before deploying to AWS, you need:

### 1. Install AWS CLI

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Verify installation:**
```bash
aws --version
```

### 2. Configure AWS Credentials

You need AWS credentials with appropriate permissions. Configure them:

```bash
aws configure
```

You'll be prompted for:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `us-east-1`)
- Default output format (e.g., `json`)

**Alternative:** Set environment variables:
```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
```

### 3. Verify AWS Access

```bash
aws sts get-caller-identity
```

This should return your AWS account ID and user ARN.

## Deployment Steps

### Step 1: Build Infrastructure Code

```bash
cd infrastructure
npm install
npm run build
```

### Step 2: Bootstrap CDK (First Time Only)

If this is your first time using CDK in this AWS account/region:

```bash
npx cdk bootstrap
```

This creates the necessary S3 bucket and IAM roles for CDK deployments.

### Step 3: Review What Will Be Deployed

```bash
npm run synth
```

This generates the CloudFormation template. Review it in `cdk.out/PulsePartyStack.template.json`.

### Step 4: Preview Changes

```bash
npm run diff
```

### Step 5: Deploy to AWS

```bash
npm run deploy
```

You'll be prompted to approve IAM changes and security group changes. Type `y` to proceed.

## What Gets Deployed

The CDK stack creates:

1. **DynamoDB Table** (`PulsePartyTable`)
   - Single table design with GSI for room discovery
   - On-demand billing
   - TTL enabled for automatic cleanup

2. **EventBridge Event Bus** (`PulsePartyEventBus`)
   - Custom event bus for match events
   - Routing rules by match ID
   - Dead-letter queue for failed events

3. **API Gateway WebSocket API**
   - Routes: $connect, $disconnect, $default
   - Lambda integrations
   - CloudWatch logging

4. **Lambda Functions** (6 functions)
   - Ingestion Lambda (XML parsing, EventBridge publishing)
   - Room State Lambda (room management, event distribution)
   - Moment Engine Lambda (prediction windows, evaluation)
   - Scoring Lambda (points calculation, leaderboard)
   - Recap Lambda (wrapped recap, room recap)
   - WebSocket Handlers (connect, disconnect, message routing)

5. **Cognito User Pool**
   - User authentication
   - Identity pool for AWS credentials
   - Guest user support

6. **IAM Roles and Policies**
   - Least-privilege permissions for each Lambda
   - DynamoDB access policies
   - EventBridge publish permissions
   - WebSocket API execute permissions

## Post-Deployment

After successful deployment, you'll see outputs:

```
Outputs:
PulsePartyStack.WebSocketURL = wss://xxxxx.execute-api.us-east-1.amazonaws.com/prod
PulsePartyStack.TableName = PulsePartyTable
PulsePartyStack.EventBusName = PulsePartyEventBus
PulsePartyStack.UserPoolId = us-east-1_xxxxx
PulsePartyStack.UserPoolClientId = xxxxx
```

### Update Frontend Configuration

1. Create `frontend/.env.local`:

```env
VITE_WEBSOCKET_URL=wss://xxxxx.execute-api.us-east-1.amazonaws.com/prod
VITE_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/prod
VITE_USER_POOL_ID=us-east-1_xxxxx
VITE_USER_POOL_CLIENT_ID=xxxxx
VITE_REGION=us-east-1
```

2. Build and deploy frontend:

```bash
cd frontend
npm run build
```

3. Deploy to S3 + CloudFront (or test locally):

```bash
npm run dev
```

## Testing the Deployment

### 1. Test WebSocket Connection

```bash
# Install wscat for WebSocket testing
npm install -g wscat

# Connect to WebSocket API
wscat -c "wss://xxxxx.execute-api.us-east-1.amazonaws.com/prod"

# Send a test message
{"action": "createRoom", "theme": "Country", "matchId": "match-demo-1"}
```

### 2. Test DynamoDB Access

```bash
# List tables
aws dynamodb list-tables

# Scan the PulseParty table
aws dynamodb scan --table-name PulsePartyTable --limit 10
```

### 3. Test Lambda Functions

```bash
# List functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `PulseParty`)].FunctionName'

# Invoke a function
aws lambda invoke \
  --function-name PulsePartyStack-IngestionLambda-xxxxx \
  --payload '{"test": true}' \
  response.json
```

## Monitoring

### CloudWatch Logs

```bash
# List log groups
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/PulseParty

# Tail logs for a function
aws logs tail /aws/lambda/PulsePartyStack-IngestionLambda-xxxxx --follow
```

### CloudWatch Metrics

View metrics in AWS Console:
- Lambda → Functions → Select function → Monitoring
- DynamoDB → Tables → PulsePartyTable → Metrics
- API Gateway → WebSocket API → Monitoring

## Troubleshooting

### Error: "Unable to resolve AWS account"

**Solution:** Configure AWS credentials:
```bash
aws configure
```

### Error: "Need to perform AWS calls but no credentials found"

**Solution:** Set environment variables or use AWS CLI configure.

### Error: "This stack uses assets, so the toolkit stack must be deployed"

**Solution:** Bootstrap CDK:
```bash
npx cdk bootstrap
```

### Error: "User is not authorized to perform: iam:CreateRole"

**Solution:** Your AWS user needs IAM permissions. Contact your AWS administrator or use an account with admin access for sandbox testing.

## Cost Estimation

For sandbox/demo usage:

- **DynamoDB**: On-demand, ~$0.25 per million reads, $1.25 per million writes
- **Lambda**: 1M free requests/month, then $0.20 per million
- **API Gateway WebSocket**: $1.00 per million messages
- **EventBridge**: $1.00 per million events
- **Cognito**: 50,000 MAU free tier

**Estimated sandbox cost**: < $5/month for light testing

## Cleanup

To remove all resources and stop incurring charges:

```bash
cd infrastructure
npm run destroy
```

**Warning:** This deletes all data. Export any important data first.

## Next Steps

1. Install AWS CLI and configure credentials
2. Run deployment commands above
3. Update frontend environment variables
4. Test WebSocket connection
5. Run end-to-end integration tests

## Support

- AWS CDK Documentation: https://docs.aws.amazon.com/cdk/
- AWS CLI Documentation: https://docs.aws.amazon.com/cli/
- Troubleshooting: Check CloudWatch Logs for detailed error messages
