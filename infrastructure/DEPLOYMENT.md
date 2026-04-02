# PulseParty Infrastructure Deployment Guide

This guide walks through deploying the DynamoDB table infrastructure for PulseParty Rooms.

## Prerequisites

1. **AWS Account**: You need an AWS account with appropriate permissions
2. **AWS CLI**: Install and configure with your credentials
   ```bash
   aws configure
   ```
3. **Node.js**: Version 18.0.0 or higher
4. **AWS CDK CLI**: Install globally
   ```bash
   npm install -g aws-cdk
   ```

## Installation

1. Navigate to the infrastructure directory:
   ```bash
   cd infrastructure
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Bootstrap CDK (First Time Only)

If this is your first time using CDK in your AWS account/region, you need to bootstrap:

```bash
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

Example:
```bash
cdk bootstrap aws://123456789012/us-east-1
```

## Deployment Steps

### 1. Build the TypeScript Code

```bash
npm run build
```

### 2. Synthesize CloudFormation Template

This generates the CloudFormation template without deploying:

```bash
npm run synth
```

Review the generated template in `cdk.out/PulsePartyStack.template.json`

### 3. Preview Changes

See what changes will be made to your AWS account:

```bash
npm run diff
```

### 4. Deploy to AWS

Deploy the stack to your AWS account:

```bash
npm run deploy
```

You'll be prompted to confirm the deployment. Type `y` and press Enter.

### 5. Verify Deployment

After deployment completes, you should see outputs:

```
Outputs:
PulsePartyStack.TableName = PulsePartyTable
PulsePartyStack.TableArn = arn:aws:dynamodb:REGION:ACCOUNT:table/PulsePartyTable
PulsePartyStack.GSI1Name = GSI1
```

Verify the table exists in AWS Console:
1. Go to AWS Console → DynamoDB → Tables
2. Find `PulsePartyTable`
3. Check the table has:
   - Primary key: PK (String), SK (String)
   - GSI: GSI1 with GSI1PK (String), GSI1SK (String)
   - TTL enabled on `ttl` attribute

## Environment-Specific Deployments

### Development Environment

For development, you might want to use `DESTROY` removal policy:

Edit `lib/pulseparty-stack.ts`:
```typescript
removalPolicy: cdk.RemovalPolicy.DESTROY,
```

Then deploy:
```bash
cdk deploy --context environment=dev
```

### Production Environment

For production, use `RETAIN` removal policy (default):
```typescript
removalPolicy: cdk.RemovalPolicy.RETAIN,
```

Deploy:
```bash
cdk deploy --context environment=prod
```

## Updating the Stack

If you make changes to the infrastructure code:

1. Build the changes:
   ```bash
   npm run build
   ```

2. Preview the changes:
   ```bash
   npm run diff
   ```

3. Deploy the updates:
   ```bash
   npm run deploy
   ```

## Destroying the Stack

To remove all resources (use with caution):

```bash
npm run destroy
```

**Note**: If `removalPolicy` is set to `RETAIN`, the DynamoDB table will not be deleted and must be removed manually.

## Troubleshooting

### Error: "Unable to resolve AWS account to use"

**Solution**: Configure AWS CLI credentials:
```bash
aws configure
```

### Error: "Need to perform AWS calls for account XXX, but no credentials found"

**Solution**: Set AWS credentials as environment variables:
```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
```

### Error: "This stack uses assets, so the toolkit stack must be deployed"

**Solution**: Bootstrap CDK:
```bash
cdk bootstrap
```

### Error: "Resource handler returned message: 'Table already exists'"

**Solution**: The table already exists. Either:
1. Use a different table name in the code
2. Delete the existing table manually
3. Import the existing table into CDK

## Cost Estimation

The DynamoDB table uses on-demand billing:

- **Storage**: $0.25 per GB-month
- **Read requests**: $0.25 per million requests
- **Write requests**: $1.25 per million requests

For a typical hackathon demo with 10 rooms and 100 users:
- Estimated storage: < 1 GB
- Estimated requests: < 1 million
- **Estimated cost**: < $2 per month

## Next Steps

After successful deployment:

1. Note the table name from the outputs
2. Use the table name in Lambda function environment variables
3. Proceed to Task 2.2: Define EventBridge event bus
4. Proceed to Task 2.3: Define API Gateway WebSocket API

## Support

For issues or questions:
- Check AWS CloudFormation console for stack events
- Review CDK documentation: https://docs.aws.amazon.com/cdk/
- Check DynamoDB console for table status
